import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStandardsMastery } from "@/lib/standards";
import { buildGrowthSummary } from "@/lib/growth";
import { getPerformanceBand } from "@/lib/performance";
import { buildStandardsGrowth } from "@/lib/standardsGrowth";
import { buildDeterministicLearningPath, enrichLearningPathWithAi } from "@/lib/learningPath";
import { buildLearningLessons, resourceKey } from "@/lib/learningLessons";
import { gradeTdaEssay } from "@/lib/essayGrader";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sessionId } = await req.json();
  const currentSession = await db.testSession.findUnique({ where: { id: sessionId }, include: { assessment: true, user: true } });
  if (!currentSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (role !== "ADMIN" && currentSession.userId !== (session.user as any).id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const initialResponses = await db.responseRecord.findMany({ where: { sessionId }, include: { essayEvaluation: true } });
  for (const response of initialResponses.filter((item) => item.questionType === "TDA" && !item.essayEvaluation)) {
    const payload = response.answerPayload as any;
    const essayGrade = await gradeTdaEssay({
      essay: String(payload?.essay || ""),
      prompt: String(payload?.prompt || ""),
      gradeLevel: Number(payload?.gradeLevel || currentSession.assessment.grade || 6),
      rubric: String(payload?.rubric || ""),
    });
    await db.$transaction(async (tx) => {
      await tx.responseRecord.update({
        where: { id: response.id },
        data: {
          scorePointsEarned: essayGrade.score,
          maxPoints: essayGrade.maxScore,
          isCorrect: essayGrade.score >= 3,
          errorPattern: essayGrade.score >= 3 ? "tda_on_track" : "tda_needs_revision",
        },
      });
      await tx.essayEvaluation.upsert({
        where: { responseRecordId: response.id },
        update: {
          score: essayGrade.score,
          maxScore: essayGrade.maxScore,
          performanceBand: essayGrade.performanceBand,
          strengths: essayGrade.strengths as Prisma.InputJsonValue,
          areasForGrowth: essayGrade.areasForGrowth as Prisma.InputJsonValue,
          feedback: essayGrade.feedback,
          nextSteps: essayGrade.nextSteps as Prisma.InputJsonValue,
          rubricBreakdown: essayGrade.rubricBreakdown as Prisma.InputJsonValue,
          gradingProvider: essayGrade.gradingProvider,
        },
        create: {
          responseRecordId: response.id,
          score: essayGrade.score,
          maxScore: essayGrade.maxScore,
          performanceBand: essayGrade.performanceBand,
          strengths: essayGrade.strengths as Prisma.InputJsonValue,
          areasForGrowth: essayGrade.areasForGrowth as Prisma.InputJsonValue,
          feedback: essayGrade.feedback,
          nextSteps: essayGrade.nextSteps as Prisma.InputJsonValue,
          rubricBreakdown: essayGrade.rubricBreakdown as Prisma.InputJsonValue,
          gradingProvider: essayGrade.gradingProvider,
        },
      });
    });
  }

  const responses = await db.responseRecord.findMany({ where: { sessionId }, include: { essayEvaluation: true } });
  const totalPoints = responses.reduce((sum, r) => sum + r.maxPoints, 0);
  const earnedPoints = responses.reduce((sum, r) => sum + r.scorePointsEarned, 0);
  const percentScore = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const performanceBand = getPerformanceBand(percentScore);
  const previousSession = await db.testSession.findFirst({ where: { userId: currentSession.userId, assessmentId: currentSession.assessmentId, submittedAt: { not: null }, id: { not: sessionId } }, include: { report: true }, orderBy: { submittedAt: "desc" } });
  const previousScore = previousSession?.report?.percentScore ?? null;
  const previousBand = previousSession?.report?.performanceBand ?? null;
  const growth = buildGrowthSummary({ previousScore, currentScore: percentScore, previousBand, currentBand: performanceBand });
  const standardsMastery = buildStandardsMastery(responses);
  const previousStandards = ((previousSession?.report?.summaryPayload as any)?.standardsMastery) || [];
  const standardsGrowth = buildStandardsGrowth(standardsMastery, previousStandards);
  await db.testSession.update({ where: { id: sessionId }, data: { submittedAt: new Date(), earnedPoints, totalPoints, scorePercent: percentScore, proficiencyBand: performanceBand } });
  const essayEvaluations = responses.filter((response) => response.essayEvaluation).map((response) => response.essayEvaluation);
  const conventionsResponses = responses.filter((response) => response.questionType === "CONVENTIONS");
  const conventionsPerformance = conventionsResponses.length ? { earnedPoints: conventionsResponses.reduce((sum, response) => sum + response.scorePointsEarned, 0), totalPoints: conventionsResponses.reduce((sum, response) => sum + response.maxPoints, 0), questionCount: conventionsResponses.length } : null;
  const diagnosticPerformance = buildDiagnosticPerformance(responses);
  const report = await db.reportSummary.upsert({ where: { sessionId }, update: { percentScore, performanceBand, growthFromPrevious: growth.growthPoints, previousReportId: previousSession?.report?.id ?? null, summaryPayload: { earnedPoints, totalPoints, standardsMastery, standardsGrowth, growth, essayEvaluations, conventionsPerformance, diagnosticPerformance } }, create: { sessionId, percentScore, performanceBand, strongestSkill: null, weakestSkill: null, growthFromPrevious: growth.growthPoints, previousReportId: previousSession?.report?.id ?? null, summaryPayload: { earnedPoints, totalPoints, standardsMastery, standardsGrowth, growth, essayEvaluations, conventionsPerformance, diagnosticPerformance } } });

  const deterministicPath = buildDeterministicLearningPath({ standardsMastery, responses });
  const learningPathBuild = await enrichLearningPathWithAi({
    studentName: currentSession.user.name,
    assessmentTitle: currentSession.assessment.title,
    deterministicPath,
  });
  const learningPath = await db.learningPath.upsert({
    where: { sessionId },
    update: {
      generatedBy: learningPathBuild.generatedBy,
      aiStatus: learningPathBuild.aiStatus,
      aiSummary: learningPathBuild.aiSummary,
    },
    create: {
      sessionId,
      generatedBy: learningPathBuild.generatedBy,
      aiStatus: learningPathBuild.aiStatus,
      aiSummary: learningPathBuild.aiSummary,
    },
  });
  await db.learningPathItem.deleteMany({ where: { learningPathId: learningPath.id } });
  await db.learningPathItem.createMany({
    data: learningPathBuild.items.map((item) => ({ ...item, learningPathId: learningPath.id, sourcePayload: item.sourcePayload as Prisma.InputJsonValue })),
  });
  const savedPathItems = await db.learningPathItem.findMany({ where: { learningPathId: learningPath.id }, orderBy: { order: "asc" } });
  const gradeLevel = currentSession.assessment.grade || Number((responses[0]?.answerPayload as any)?.gradeLevel || 6);
  const resourceLinks = await db.resourceLink.findMany({
    where: {
      OR: [
        { gradeLevel, standardCode: { in: learningPathBuild.items.map((item) => item.standardCode) } },
        { gradeLevel: null, standardCode: { in: learningPathBuild.items.map((item) => item.standardCode) } },
      ],
    },
  });
  const resourcesByStandard = new Map(
    resourceLinks.flatMap((resource) => [
      [resourceKey(resource.gradeLevel || 0, resource.standardCode, resource.skill), resource],
      [resourceKey(resource.gradeLevel || 0, resource.standardCode, ""), resource],
    ]),
  );
  const lessonBuilds = await buildLearningLessons({
    gradeLevel,
    pathItems: learningPathBuild.items,
    responses,
    resourcesByStandard,
  });
  await db.learningLesson.deleteMany({ where: { learningPathId: learningPath.id } });
  for (const lessonBuild of lessonBuilds) {
    const matchingPathItem = savedPathItems.find((item) => item.order === lessonBuild.learningPathItemOrder);
    const lesson = await db.learningLesson.create({
      data: {
        learningPathId: learningPath.id,
        learningPathItemId: matchingPathItem?.id,
        gradeLevel: lessonBuild.gradeLevel,
        standardCode: lessonBuild.standardCode,
        standardLabel: lessonBuild.standardLabel,
        skill: lessonBuild.skill,
        priority: lessonBuild.priority,
        title: lessonBuild.title,
        whyAssigned: lessonBuild.whyAssigned,
        lessonExplanation: lessonBuild.lessonExplanation,
        workedExample: lessonBuild.workedExample,
        resourceTitle: lessonBuild.resourceTitle,
        resourceUrl: lessonBuild.resourceUrl,
        resourceProvider: lessonBuild.resourceProvider,
        resourceDescription: lessonBuild.resourceDescription,
        guidedPractice: lessonBuild.guidedPractice as Prisma.InputJsonValue,
        independentPractice: lessonBuild.independentPractice as Prisma.InputJsonValue,
        exitTicket: lessonBuild.exitTicket as Prisma.InputJsonValue,
        masteryCheck: lessonBuild.masteryCheck as Prisma.InputJsonValue,
        retestRecommendation: lessonBuild.retestRecommendation,
        generatedBy: lessonBuild.generatedBy,
        aiStatus: lessonBuild.aiStatus,
        sourcePayload: lessonBuild.sourcePayload as Prisma.InputJsonValue,
        items: {
          create: lessonBuild.items.map((item) => ({
            itemType: item.itemType,
            title: item.title,
            content: item.content as Prisma.InputJsonValue,
            order: item.order,
          })),
        },
      },
    });
    await db.studentLessonProgress.upsert({
      where: { lessonId_userId: { lessonId: lesson.id, userId: currentSession.userId } },
      update: {},
      create: { lessonId: lesson.id, userId: currentSession.userId },
    });
  }
  const savedLearningPath = await db.learningPath.findUnique({
    where: { id: learningPath.id },
    include: {
      items: { orderBy: { order: "asc" } },
      lessons: { orderBy: { priority: "asc" }, include: { progress: { where: { userId: currentSession.userId } }, items: { orderBy: { order: "asc" } } } },
    },
  });

  return NextResponse.json({ ok: true, reportId: report.id, learningPath: savedLearningPath, responses });
}

function buildDiagnosticPerformance(responses: any[]) {
  const groups: Record<string, { label: string; earnedPoints: number; totalPoints: number; questionCount: number }> = {
    literary: { label: "Literary Comprehension", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    informational: { label: "Informational Comprehension", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    paired: { label: "Paired Text Analysis", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    tda: { label: "TDA Writing", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
    conventions: { label: "Conventions", earnedPoints: 0, totalPoints: 0, questionCount: 0 },
  };
  responses.forEach((response) => {
    const payload = (response.answerPayload || {}) as any;
    const type = response.questionType === "TDA" ? "tda" : response.questionType === "CONVENTIONS" ? "conventions" : payload.passageType === "LITERARY" ? "literary" : payload.passageType === "PAIRED_TEXT" ? "paired" : "informational";
    groups[type].earnedPoints += response.scorePointsEarned || 0;
    groups[type].totalPoints += response.maxPoints || 0;
    groups[type].questionCount += 1;
  });
  return Object.values(groups).filter((group) => group.questionCount).map((group) => {
    const percentScore = group.totalPoints ? Math.round((group.earnedPoints / group.totalPoints) * 100) : 0;
    return { ...group, percentScore, performanceBand: getPerformanceBand(percentScore) };
  });
}
