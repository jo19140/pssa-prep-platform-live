import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreAssessmentQuestion } from "@/lib/serverScoring";

const answerSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.coerce.number().int().positive(),
  timeSpentSec: z.coerce.number().int().min(1).max(3600).optional().default(1),
  answerPayload: z.record(z.unknown()).default({}),
  currentQuestionNo: z.coerce.number().int().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = answerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const testSession = await db.testSession.findUnique({
    where: { id: body.sessionId },
    include: { assessment: { include: { questions: true } } },
  });
  if (!testSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (role !== "ADMIN" && testSession.userId !== (session.user as any).id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (testSession.submittedAt) return NextResponse.json({ error: "Session already submitted" }, { status: 409 });
  const canonicalQuestion = testSession.assessment.questions.find((question) => {
    const payload = question.questionPayload as Record<string, any>;
    return Number(payload?.id) === body.questionId || question.questionNo === body.questionId;
  });
  if (!canonicalQuestion) return NextResponse.json({ error: "Question not found for this session." }, { status: 404 });

  const questionPayload = canonicalQuestion.questionPayload as Record<string, any>;
  const scored = scoreAssessmentQuestion(questionPayload, body.answerPayload);
  const canonicalQuestionId = Number(questionPayload.id) || canonicalQuestion.questionNo;
  const answerPayload = {
    ...body.answerPayload,
    serverScoredAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;

  const response = await db.$transaction(async (tx) => {
    const existing = await tx.responseRecord.findFirst({ where: { sessionId: body.sessionId, questionId: canonicalQuestionId } });
    const data = {
      sessionId: body.sessionId,
      questionId: canonicalQuestionId,
      skill: canonicalQuestion.skill,
      standardCode: canonicalQuestion.standardCode,
      standardLabel: canonicalQuestion.standardLabel,
      questionType: canonicalQuestion.questionType,
      difficulty: canonicalQuestion.difficulty,
      isCorrect: scored.isCorrect,
      scorePointsEarned: scored.scorePointsEarned,
      maxPoints: scored.maxPoints,
      errorPattern: scored.errorPattern,
      timeSpentSec: body.timeSpentSec,
      answerPayload,
    };
    const saved = existing ? await tx.responseRecord.update({ where: { id: existing.id }, data }) : await tx.responseRecord.create({ data });
    await tx.testSession.update({ where: { id: body.sessionId }, data: { currentQuestionNo: body.currentQuestionNo || testSession.currentQuestionNo || 1 } });
    return saved;
  });

  return NextResponse.json({ ok: true, responseId: response.id, scored });
}
