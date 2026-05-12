import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDeterministicLearningPath } from "@/lib/learningPath";
import { buildDeterministicLearningLessons } from "@/lib/learningLessons";
import { enqueueAiJob, type AiJobType } from "@/lib/jobs";
import { loadResourcesByStandard, replaceLearningLessons, replaceLearningPathItems } from "@/lib/learningLessonPersistence";
import { recomputeReportForSession } from "@/lib/reportSummaryBuilder";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const submitTestSchema = z.object({
  sessionId: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = submitTestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { sessionId } = parsed.data;
  const userId = String((session.user as any).id || "unknown");
  const ip = getClientIp(req);
  const userLimit = await consumeRateLimit({ key: `test-submit:user:${userId}`, capacity: 5, refillIntervalMs: 60 * 60 * 1000 });
  const ipLimit = await consumeRateLimit({ key: `test-submit:ip:${ip}`, capacity: 20, refillIntervalMs: 60 * 60 * 1000 });
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many test submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } },
    );
  }

  const currentSession = await db.testSession.findUnique({ where: { id: sessionId }, include: { assessment: true, user: true } });
  if (!currentSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (role !== "ADMIN" && currentSession.userId !== (session.user as any).id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.responseRecord.updateMany({
    where: { sessionId, questionType: "TDA", essayEvaluation: null },
    data: { scorePointsEarned: 0, maxPoints: 4, isCorrect: false, errorPattern: "pending_essay_grading" },
  });

  const { responses, report, standardsMastery } = await recomputeReportForSession(sessionId);
  const deterministicPath = buildDeterministicLearningPath({ standardsMastery, responses });
  const learningPath = await db.learningPath.upsert({
    where: { sessionId },
    update: {
      generatedBy: "DETERMINISTIC",
      aiStatus: "PENDING",
      aiSummary: null,
    },
    create: {
      sessionId,
      generatedBy: "DETERMINISTIC",
      aiStatus: "PENDING",
      aiSummary: null,
    },
  });

  await replaceLearningPathItems(learningPath.id, deterministicPath.items);
  const gradeLevel = currentSession.assessment.grade || Number((responses[0]?.answerPayload as any)?.gradeLevel || 6);
  const resourcesByStandard = await loadResourcesByStandard(gradeLevel, deterministicPath.items);
  const deterministicLessons = buildDeterministicLearningLessons({
    gradeLevel,
    pathItems: deterministicPath.items,
    responses,
    resourcesByStandard,
  }).map((lesson) => ({ ...lesson, generatedBy: "DETERMINISTIC" as const, aiStatus: "PENDING" as const }));
  await replaceLearningLessons({ learningPathId: learningPath.id, userId: currentSession.userId, lessonBuilds: deterministicLessons });

  const pendingTdaResponses = responses.filter((response) => response.questionType === "TDA" && !response.essayEvaluation);
  const enqueuedJobs = [];
  for (const response of pendingTdaResponses) {
    enqueuedJobs.push(await enqueueAiJob({ sessionId, jobType: "ESSAY_GRADING", targetId: response.id }));
  }
  enqueuedJobs.push(await enqueueAiJob({ sessionId, jobType: "LESSON_ENRICHMENT" }));
  enqueuedJobs.push(await enqueueAiJob({ sessionId, jobType: "LEARNING_PATH_ENRICHMENT" }));

  const savedLearningPath = await db.learningPath.findUnique({
    where: { id: learningPath.id },
    include: {
      items: { orderBy: { order: "asc" } },
      lessons: { orderBy: { priority: "asc" }, include: { progress: { where: { userId: currentSession.userId } }, items: { orderBy: { order: "asc" } } } },
    },
  });
  const savedResponses = await db.responseRecord.findMany({ where: { sessionId }, include: { essayEvaluation: true }, orderBy: { createdAt: "asc" } });

  return NextResponse.json({
    ok: true,
    reportId: report.id,
    learningPath: savedLearningPath,
    responses: savedResponses,
    jobs: enqueuedJobs.map((job) => ({ jobType: job.jobType as AiJobType, status: job.status })),
  });
}
