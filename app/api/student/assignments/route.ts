import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { applyStudentLessonReviewGate } from "@/lib/learningLessonPersistence";
import { mergeCanonicalAndLegacyLessonAssignments } from "@/lib/assignments/studentAssignmentDto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const student = await db.studentProfile.findUnique({ where: { userId: (session.user as any).id }, include: { enrollments: { include: { classRoom: true } } } });
  if (!student) return NextResponse.json({ assignments: [], latestLearningPath: null });
  const classIds = student.enrollments.map((e) => e.classRoomId);
  if (!classIds.length) return NextResponse.json({ assignments: [], latestLearningPath: null });
  const assignments = (await db.assignment.findMany({ where: { classRoomId: { in: classIds }, status: "ASSIGNED" }, include: { assessment: true }, orderBy: { createdAt: "desc" } }))
    .filter((assignment) => assignment.assignmentType !== "DIAGNOSTIC" || assignment.assessment.grade === student.grade);
  const readingCoachAssignments = await db.readingCoachAssignment.findMany({
    where: { classRoomId: { in: classIds }, status: "ASSIGNED" },
    include: { attempts: { where: { userId: (session.user as any).id }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const sessions = await db.testSession.findMany({ where: { userId: (session.user as any).id, assessmentId: { in: assignments.map((a) => a.assessmentId) } }, include: { report: true }, orderBy: { startedAt: "desc" } });
  const latestLearningPath = await db.learningPath.findFirst({
    where: { session: { is: { userId: (session.user as any).id, submittedAt: { not: null } } } },
    include: {
      items: { orderBy: { order: "asc" } },
      lessons: {
        orderBy: { priority: "asc" },
        include: {
          progress: { where: { userId: (session.user as any).id } },
          questAttempts: { where: { userId: (session.user as any).id }, orderBy: { createdAt: "desc" }, take: 3 },
          items: { orderBy: { order: "asc" } },
          steps: { orderBy: { order: "asc" } },
          heroResourceLink: { select: { title: true, url: true, provider: true, description: true, tier: true, belowGradeLevel: true, aboveGradeLevel: true } },
        },
      },
      session: { include: { assessment: { select: { title: true, grade: true } }, responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const assignedLessonProgress = await db.studentLessonProgress.findMany({
    where: { userId: (session.user as any).id },
    include: {
      lesson: {
        include: {
          progress: { where: { userId: (session.user as any).id } },
          questAttempts: { where: { userId: (session.user as any).id }, orderBy: { createdAt: "desc" }, take: 3 },
          items: { orderBy: { order: "asc" } },
          steps: { orderBy: { order: "asc" } },
          heroResourceLink: { select: { title: true, url: true, provider: true, description: true, tier: true, belowGradeLevel: true, aboveGradeLevel: true } },
          learningPath: { select: { session: { select: { userId: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const canonicalLessonRecipients = await db.assignmentRecipient.findMany({
    where: {
      studentProfileId: student.id,
      assignment: { assignmentType: "LESSON" },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      startedAt: true,
      submittedAt: true,
      completedAt: true,
      assignment: {
        select: {
          id: true,
          title: true,
          assignmentType: true,
          gradeLevel: true,
          dueDate: true,
          lessonId: true,
          createdAt: true,
        },
      },
      gradeRecord: {
        select: {
          status: true,
          pointsEarned: true,
          pointsPossible: true,
          finalizedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const lessonAssignments = mergeCanonicalAndLegacyLessonAssignments(canonicalLessonRecipients, assignedLessonProgress);
  const libraryLessons = assignedLessonProgress
    .map((progress) => progress.lesson)
    .filter((lesson) => lesson.learningPath.session.userId !== (session.user as any).id);
  const safeLatestLearningPath = latestLearningPath ? await applyStudentLessonReviewGate(latestLearningPath, (session.user as any).id) : null;
  const mergedLearningPath = safeLatestLearningPath
    ? {
        ...safeLatestLearningPath,
        lessons: mergeLessons(safeLatestLearningPath.lessons, libraryLessons),
      }
    : libraryLessons.length
      ? {
          id: "assigned-library-lessons",
          items: [],
          lessons: libraryLessons,
          generatedBy: "LESSON_LIBRARY",
          aiStatus: "COMPLETED",
          aiSummary: "Teacher-assigned lesson library items.",
          session: null,
        }
      : null;
  return NextResponse.json({
    studentGrade: student.grade,
    assignments: [
      ...assignments.map((a) => {
        const existing = sessions.find((s) => s.assessmentId === a.assessmentId);
        const statusLabel = existing?.submittedAt ? "Completed" : existing ? "In Progress" : "Not Started";
        return {
          assignmentId: a.id,
          assessmentId: a.assessmentId,
          title: a.assessment.title,
          assignmentType: a.assignmentType,
          gradeLevel: a.assessment.grade,
          studentGrade: student.grade,
          isCurrentGrade: a.assessment.grade === student.grade,
          statusLabel,
          assignedAt: a.createdAt,
          dueDate: a.dueDate,
          submittedAt: existing?.submittedAt ?? null,
          scorePercent: existing?.scorePercent ?? null,
          earnedPoints: existing?.earnedPoints ?? null,
          totalPoints: existing?.totalPoints ?? null,
          proficiencyBand: existing?.proficiencyBand ?? null,
          sessionId: existing?.id ?? null,
        };
      }),
      ...lessonAssignments,
    ],
    readingCoachAssignments: readingCoachAssignments.map((assignment) => ({
      assignmentId: assignment.id,
      title: assignment.title,
      gradeLevel: assignment.gradeLevel,
      activityType: assignment.activityType,
      expectedText: assignment.expectedText,
      assignedAt: assignment.createdAt,
      dueDate: assignment.dueDate,
      statusLabel: assignment.attempts.length ? "Completed" : "Not Started",
      scorePercent: assignment.attempts[0]?.accuracy ?? null,
      submittedAt: assignment.attempts[0]?.createdAt ?? null,
      latestAttempt: assignment.attempts[0] || null,
    })),
    latestLearningPath: withCrossGradeResources(mergedLearningPath),
  });
}

function withCrossGradeResources(learningPath: any) {
  if (!learningPath?.lessons?.length) return learningPath;
  return {
    ...learningPath,
    lessons: learningPath.lessons.map((lesson: any) => {
      const sourcePayload = lesson.sourcePayload && typeof lesson.sourcePayload === "object" ? lesson.sourcePayload : {};
      const crossGradeResources = (sourcePayload as any).crossGradeResources && typeof (sourcePayload as any).crossGradeResources === "object"
        ? (sourcePayload as any).crossGradeResources
        : {};
      return {
        ...lesson,
        scaffoldResources: lesson.scaffoldResources || crossGradeResources.scaffold || [],
        stretchResources: lesson.stretchResources || crossGradeResources.stretch || [],
      };
    }),
  };
}

function mergeLessons(primaryLessons: any[], libraryLessons: any[]) {
  const seen = new Set(primaryLessons.map((lesson) => lesson.id));
  return [
    ...primaryLessons,
    ...libraryLessons.filter((lesson) => {
      if (seen.has(lesson.id)) return false;
      seen.add(lesson.id);
      return true;
    }),
  ];
}
