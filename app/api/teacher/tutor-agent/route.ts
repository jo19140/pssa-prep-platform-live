import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeTdaEssay } from "@/lib/essayGrader";
import { buildLearnerSummaryFromData, runTutorAgent } from "@/lib/tutorAgent";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const teacherTutorSchema = z.object({
  message: z.string().trim().min(2).max(8000),
  prompt: z.string().trim().max(2000).optional(),
  gradeLevel: z.coerce.number().int().min(3).max(8).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id;
  const memory = await getOrCreateTeacherMemory(userId);
  const messages = await db.tutorAgentMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 });
  return NextResponse.json({ memory, messages: messages.reverse() });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id;
  const userLimit = await consumeRateLimit({ key: `teacher-tutor:user:${userId}`, capacity: 30, refillIntervalMs: 60 * 60 * 1000 });
  const ipLimit = await consumeRateLimit({ key: `teacher-tutor:ip:${getClientIp(req)}`, capacity: 90, refillIntervalMs: 60 * 60 * 1000 });
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many teacher tutor requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } });
  }

  const parsed = teacherTutorSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { message, prompt, gradeLevel } = parsed.data;
  const cleanMessage = message;

  const memory = await getOrCreateTeacherMemory(userId);
  const teacher = await db.teacherProfile.findUnique({ where: { userId }, include: { user: true, classes: true } });
  const standards = await db.assessmentQuestion.findMany({
    select: { standardCode: true, skill: true },
    distinct: ["standardCode"],
    take: 30,
  });
  const allowedStandards = standards.map((standard) => standard.standardCode);
  const result = await runTutorAgent({
    message: cleanMessage,
    context: {
      role: "TEACHER",
      studentName: teacher?.user.name || "Teacher",
      gradeLevel: Number(gradeLevel || teacher?.classes[0]?.grade || memory.gradeLevel || 6),
      learnerSummary: memory.learnerSummary,
      weakStandards: (memory.weakStandards as any[]) || [],
      masteredSkills: (memory.masteredSkills as any[]) || [],
      preferredSupports: (memory.preferredSupports as any[]) || [],
      recentLessons: [],
      recentReports: [],
      allowedStandards,
    },
  });

  const lower = cleanMessage.toLowerCase();
  const shouldGradeTda = lower.includes("tda") || lower.includes("essay") || lower.includes("score") || lower.includes("grade");
  const essayGrade = shouldGradeTda
    ? await gradeTdaEssay({
        essay: cleanMessage,
        prompt: String(prompt || "Teacher requested PSSA-style TDA rubric review."),
        gradeLevel: Number(gradeLevel || teacher?.classes[0]?.grade || memory.gradeLevel || 6),
        rubric: "Pennsylvania PSSA Text-Dependent Analysis 4-point rubric: analysis, text evidence, explanation of evidence, organization, and language/conventions.",
      })
    : null;

  const artifacts = {
    ...result.artifacts,
    tdaFeedback: essayGrade ? {
      score: essayGrade.score,
      performanceBand: essayGrade.performanceBand,
      strengths: essayGrade.strengths,
      areasForGrowth: essayGrade.areasForGrowth,
      feedback: essayGrade.feedback,
      nextSteps: essayGrade.nextSteps,
      rubricBreakdown: essayGrade.rubricBreakdown,
      gradingProvider: essayGrade.gradingProvider,
    } : result.artifacts.tdaFeedback,
    provider: result.provider,
  };

  const updatedMemory = await db.tutorAgentMemory.update({
    where: { userId },
    data: {
      gradeLevel: Number(gradeLevel || teacher?.classes[0]?.grade || memory.gradeLevel || 6),
      learnerSummary: result.memoryUpdate.learnerSummary,
      preferredSupports: result.memoryUpdate.preferredSupports as Prisma.InputJsonValue,
      lastInteractionAt: new Date(),
    },
  });
  const savedMessage = await db.tutorAgentMessage.create({
    data: {
      userId,
      role: "TEACHER",
      intent: result.intent,
      message: cleanMessage,
      response: essayGrade ? "I reviewed this TDA using the PSSA-style 4-point rubric. Treat this as a scoring aid; the teacher can adjust the final score." : result.response,
      artifacts: artifacts as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ result: { ...result, artifacts }, memory: updatedMemory, message: savedMessage });
}

async function getOrCreateTeacherMemory(userId: string) {
  const existing = await db.tutorAgentMemory.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.tutorAgentMemory.create({
    data: {
      userId,
      learnerSummary: buildLearnerSummaryFromData({ weakStandards: [], masteredSkills: [] }),
      weakStandards: [] as Prisma.InputJsonValue,
      masteredSkills: [] as Prisma.InputJsonValue,
      preferredSupports: ["PSSA TDA rubric review", "standards-aligned mini-lessons"] as Prisma.InputJsonValue,
    },
  });
}
