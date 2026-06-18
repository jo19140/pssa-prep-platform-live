import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStandardSupportGroups } from "@/lib/teacherStandardsGrouping";
import { buildStandardsRecommendations } from "@/lib/standardsRecommendations";
import { buildClassGrowthSummary, buildStandardsGrowthAggregate } from "@/lib/classGrowth";

type TeacherDashboardStage =
  | "classes"
  | "sessions"
  | "reports"
  | "growth"
  | "standards"
  | "lessonProgress"
  | "actionInsights";

type TeacherDashboardHandlerOptions = {
  database?: any;
  getSession?: () => Promise<any>;
  requestIdFactory?: () => string;
  logger?: (message: string, meta: Record<string, unknown>) => void;
};

type StageTracker = {
  current: TeacherDashboardStage;
  set(stage: TeacherDashboardStage): void;
};

export async function handleTeacherDashboardRequest(req: Request, options: TeacherDashboardHandlerOptions = {}) {
  const getSession = options.getSession || (() => getServerSession(authOptions));
  const database = options.database || db;
  const requestIdFactory = options.requestIdFactory || randomUUID;
  const logger = options.logger || ((message, meta) => console.error(message, meta));

  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestId = requestIdFactory();
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const userId = (session.user as any).id;
  const stage: StageTracker = {
    current: "classes",
    set(nextStage) {
      this.current = nextStage;
    },
  };

  try {
    stage.set("classes");
    const teacher = await database.teacherProfile.findUnique({
      where: { userId },
      include: {
        school: true,
        classes: {
          include: {
            school: true,
            enrollments: { include: { studentProfile: { include: { user: true } } } },
          },
        },
      },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

    const allowedClasses = classId ? teacher.classes.filter((classRoom: any) => classRoom.id === classId) : teacher.classes;
    const classStudentMap = new Map<string, any>();
    for (const classRoom of allowedClasses) {
      for (const enrollment of classRoom.enrollments) {
        const student = enrollment.studentProfile;
        const existing = classStudentMap.get(student.userId);
        if (existing) {
          existing.classNames.push(classRoom.name);
          existing.classIds.push(classRoom.id);
        } else {
          classStudentMap.set(student.userId, {
            studentId: student.userId,
            studentProfileId: student.id,
            studentName: student.user.name,
            gradeLevel: student.grade,
            classNames: [classRoom.name],
            classIds: [classRoom.id],
          });
        }
      }
    }
    const classStudents = Array.from(classStudentMap.values());
    const studentUserIds = classStudents.map((student) => student.studentId);

    stage.set("sessions");
    const where: any = { userId: { in: studentUserIds } };
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.startedAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    const sessions = await database.testSession.findMany({
      where,
      include: { user: true, report: true, responses: true, assessment: true },
      orderBy: { startedAt: "desc" },
    });
    const assignments = await database.assignment.findMany({
      where: { classRoomId: { in: allowedClasses.map((classRoom: any) => classRoom.id) }, status: "ASSIGNED" },
      include: { assessment: true, classRoom: true },
      orderBy: { createdAt: "desc" },
    });
    const reports = sessions.filter((testSession: any) => testSession.report);
    const avgScore = averageSessionScore(reports);
    const activeAssignmentByAssessment = new Map<string, any>(assignments.map((assignment: any) => [assignment.assessmentId, assignment]));
    const activeAssignmentSessions = sessions.filter((testSession: any) => activeAssignmentByAssessment.has(testSession.assessmentId));
    const latestActiveSessions = latestSessionsByStudentAssessment(activeAssignmentSessions);
    const latestActiveReports = latestActiveSessions.filter((testSession) => testSession.report);
    const latestDiagnosticSessions = latestActiveSessions.filter((testSession) => activeAssignmentByAssessment.get(testSession.assessmentId)?.assignmentType === "DIAGNOSTIC");
    const latestDiagnosticReports = latestDiagnosticSessions.filter((testSession) => testSession.report);
    const latestPracticeSessions = latestActiveSessions.filter((testSession) => activeAssignmentByAssessment.get(testSession.assessmentId)?.assignmentType !== "DIAGNOSTIC");
    const latestPracticeReports = latestPracticeSessions.filter((testSession) => testSession.report);

    stage.set("reports");
    const studentRows = sessions.map((testSession: any) => {
      const summaryPayload = (testSession.report?.summaryPayload as any) || {};
      return {
        sessionId: testSession.id,
        studentName: testSession.user.name,
        assessmentTitle: testSession.assessment.title,
        scorePercent: testSession.report?.percentScore ?? null,
        performanceBand: testSession.report?.performanceBand ?? null,
        strongestSkill: summaryPayload.strongestSkill ?? null,
        weakestSkill: summaryPayload.weakestSkill ?? null,
        growth: summaryPayload.growth ?? null,
        submittedAt: testSession.submittedAt,
      };
    });
    const standardProfiles = sessions.filter((testSession: any) => testSession.report).map((testSession: any) => {
      const summaryPayload = (testSession.report?.summaryPayload as any) || {};
      return {
        studentId: testSession.user.id,
        studentName: testSession.user.name,
        sessionId: testSession.id,
        standardsMastery: summaryPayload.standardsMastery || [],
      };
    });

    stage.set("standards");
    const standardGroups = buildStandardSupportGroups(standardProfiles);
    const sortedStandardGroups = [...standardGroups].sort((a, b) => b.students.length - a.students.length);
    const standardRecommendations = buildStandardsRecommendations(sortedStandardGroups);

    stage.set("growth");
    const growthRows = sessions.filter((testSession: any) => testSession.report).map((testSession: any) => {
      const growth = ((testSession.report?.summaryPayload as any) || {}).growth || null;
      return {
        studentId: testSession.user.id,
        studentName: testSession.user.name,
        previousScore: growth?.previousScore ?? null,
        currentScore: testSession.report?.percentScore ?? 0,
        growthPoints: growth?.growthPoints ?? null,
        previousBand: growth?.previousBand ?? null,
        currentBand: testSession.report?.performanceBand ?? "Below Basic",
      };
    });
    const classGrowth = buildClassGrowthSummary(growthRows);
    const standardsGrowthProfiles = sessions.filter((testSession: any) => testSession.report).map((testSession: any) => {
      const summaryPayload = (testSession.report?.summaryPayload as any) || {};
      return { studentId: testSession.user.id, studentName: testSession.user.name, standardsGrowth: summaryPayload.standardsGrowth || [] };
    });
    const standardsGrowthSummary = buildStandardsGrowthAggregate(standardsGrowthProfiles);
    const groupedByStudent = new Map<string, any>();
    for (const testSession of sessions) {
      if (testSession.report?.percentScore == null) continue;
      if (!groupedByStudent.has(testSession.user.id)) {
        groupedByStudent.set(testSession.user.id, { studentId: testSession.user.id, studentName: testSession.user.name, trend: [] });
      }
      groupedByStudent.get(testSession.user.id).trend.push({
        dateMs: new Date(testSession.startedAt).getTime(),
        label: new Date(testSession.startedAt).toLocaleDateString(),
        score: testSession.report.percentScore,
      });
    }
    const studentTrendLines = Array.from(groupedByStudent.values()).map((row) => ({
      ...row,
      trend: row.trend.sort((a: any, b: any) => a.dateMs - b.dateMs).map(({ label, score }: any) => ({ label, score })),
    }));

    stage.set("actionInsights");
    const actionInsights = await buildTeacherActionInsights({
      database,
      assignments,
      classStudents,
      sessions,
      sortedStandardGroups,
      standardRecommendations,
      studentUserIds,
      stage,
    });

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        role,
        schoolId: teacher.schoolId,
        schoolName: teacher.school?.name || teacher.schoolName,
        gradeBand: teacher.gradeBand,
        classCount: teacher.classes.length,
        studentCount: studentUserIds.length,
      },
      classes: teacher.classes.map((classRoom: any) => ({
        id: classRoom.id,
        name: classRoom.name,
        grade: classRoom.grade,
        schoolId: classRoom.schoolId,
        schoolName: classRoom.school?.name || teacher.schoolName,
      })),
      overview: {
        sessionCount: latestActiveSessions.length,
        completedReportCount: latestActiveReports.length,
        averageScore: averageSessionScore(latestActiveReports),
        diagnosticSessionCount: latestDiagnosticSessions.length,
        diagnosticCompletedReportCount: latestDiagnosticReports.length,
        diagnosticAverageScore: averageSessionScore(latestDiagnosticReports),
        practiceSessionCount: latestPracticeSessions.length,
        practiceCompletedReportCount: latestPracticeReports.length,
        practiceAverageScore: averageSessionScore(latestPracticeReports),
        historicalSessionCount: sessions.length,
        historicalCompletedReportCount: reports.length,
        historicalAverageScore: avgScore,
        studentCount: studentUserIds.length,
        scoreSources: {
          diagnostics: buildOverviewSourceRows(latestDiagnosticReports, activeAssignmentByAssessment),
          practice: buildOverviewSourceRows(latestPracticeReports, activeAssignmentByAssessment),
        },
      },
      students: studentRows,
      standardGroups: sortedStandardGroups,
      standardRecommendations,
      actionInsights,
      classGrowth,
      standardsGrowthSummary,
      studentTrendLines,
    });
  } catch (error) {
    logger("teacher_dashboard_build_failed", {
      requestId,
      userId,
      classId,
      stage: stage.current,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "teacher_dashboard_build_failed", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function buildOverviewSourceRows(sessions: any[], assignmentByAssessment: Map<string, any>) {
  return sessions
    .map((testSession) => {
      const assignment = assignmentByAssessment.get(testSession.assessmentId);
      return {
        sessionId: testSession.id,
        studentName: testSession.user.name,
        assessmentTitle: testSession.assessment.title,
        className: assignment?.classRoom?.name || null,
        assignmentType: assignment?.assignmentType || "Assessment",
        scorePercent: testSession.report?.percentScore ?? null,
        submittedAt: testSession.submittedAt,
      };
    })
    .sort((a, b) => Number(b.scorePercent || 0) - Number(a.scorePercent || 0));
}

function latestSessionsByStudentAssessment(sessions: any[]) {
  const latestSessionByStudentAssessment = new Map<string, any>();
  for (const testSession of sessions) {
    const key = `${testSession.userId}:${testSession.assessmentId}`;
    if (!latestSessionByStudentAssessment.has(key)) latestSessionByStudentAssessment.set(key, testSession);
  }
  return Array.from(latestSessionByStudentAssessment.values());
}

function averageSessionScore(sessions: any[]) {
  const scoredSessions = sessions.filter((testSession) => testSession.report?.percentScore != null);
  return scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, testSession) => sum + Number(testSession.report.percentScore), 0) / scoredSessions.length)
    : 0;
}

async function buildTeacherActionInsights({
  database,
  assignments,
  classStudents,
  sessions,
  sortedStandardGroups,
  standardRecommendations,
  studentUserIds,
  stage,
}: {
  database: any;
  assignments: any[];
  classStudents: any[];
  sessions: any[];
  sortedStandardGroups: any[];
  standardRecommendations: any[];
  studentUserIds: string[];
  stage: StageTracker;
}) {
  const latestSessionByStudentAssessment = new Map<string, any>();
  for (const testSession of sessions) {
    const key = `${testSession.userId}:${testSession.assessmentId}`;
    if (!latestSessionByStudentAssessment.has(key)) latestSessionByStudentAssessment.set(key, testSession);
  }

  const notStartedByStudent = new Map<string, any>();
  for (const assignment of assignments) {
    const assignedStudents = classStudents.filter((student) => student.classIds.includes(assignment.classRoomId));
    for (const student of assignedStudents) {
      const session = latestSessionByStudentAssessment.get(`${student.studentId}:${assignment.assessmentId}`);
      if (!session && !notStartedByStudent.has(student.studentId)) {
        notStartedByStudent.set(student.studentId, {
          studentId: student.studentId,
          studentName: student.studentName,
          className: assignment.classRoom.name,
          assignmentTitle: assignment.assessment.title,
          assignmentType: assignment.assignmentType,
          assignedAt: assignment.createdAt,
          dueDate: assignment.dueDate,
        });
      }
    }
  }

  const assignmentByAssessment = new Map<string, any>(assignments.map((assignment) => [assignment.assessmentId, assignment]));
  const activeTestRows = sessions
    .filter((testSession) => !testSession.submittedAt)
    .map((testSession) => {
      const assignment = assignmentByAssessment.get(testSession.assessmentId);
      return {
        studentId: testSession.userId,
        studentName: testSession.user.name,
        activityTitle: testSession.assessment.title,
        activityType: assignment?.assignmentType || "Assessment",
        startedAt: testSession.startedAt,
        detail: `On question ${testSession.currentQuestionNo}`,
      };
    });

  stage.set("lessonProgress");
  const lessonProgressRows = await database.studentLessonProgress.findMany({
    where: { userId: { in: studentUserIds }, status: "IN_PROGRESS" },
    include: { user: true, lesson: true },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });
  const activeLessonRows = lessonProgressRows.map((progress: any) => ({
    studentId: progress.userId,
    studentName: progress.user?.name ?? "Student",
    activityTitle: progress.lesson?.title ?? "Lesson",
    activityType: "Learning Path Lesson",
    startedAt: progress.startedAt || progress.updatedAt,
    detail: progress.masteryScore == null ? "Lesson in progress" : `Mastery check ${progress.masteryScore}%`,
  }));
  stage.set("actionInsights");

  const reteachGroups = sortedStandardGroups.slice(0, 4).map((group) => ({
    standardCode: group.standardCode,
    standardLabel: group.standardLabel,
    studentCount: group.students.length,
    students: group.students
      .slice()
      .sort((a: any, b: any) => Number(a.percentScore || 0) - Number(b.percentScore || 0))
      .slice(0, 8),
  }));

  const nextLesson = standardRecommendations[0]
    ? {
        ...standardRecommendations[0],
        students: sortedStandardGroups[0]?.students?.slice(0, 8) || [],
      }
    : null;

  const notStartedRows = Array.from(notStartedByStudent.values());
  const stuckRows = [...activeTestRows, ...activeLessonRows].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return {
    summary: {
      notStartedCount: notStartedRows.length,
      stuckCount: stuckRows.length,
      reteachGroupCount: reteachGroups.length,
      nextLessonTitle: nextLesson?.title || null,
    },
    notStarted: {
      title: "Students who have not started",
      count: notStartedRows.length,
      students: notStartedRows.slice(0, 10),
    },
    stuck: {
      title: "Students who may be stuck",
      count: stuckRows.length,
      students: stuckRows.slice(0, 10),
    },
    reteaching: {
      title: "Small groups that need reteaching",
      count: reteachGroups.reduce((sum, group) => sum + group.studentCount, 0),
      groups: reteachGroups,
    },
    nextLesson,
  };
}
