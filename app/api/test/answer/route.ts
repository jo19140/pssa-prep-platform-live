import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DECISION_TYPES } from "@/lib/decisions/decisionTypes";
import { persistModelDecision } from "@/lib/decisions/withModelDecisionLogging";
import { EVENT_TYPES } from "@/lib/events/eventTypes";
import { recordStudentEvent } from "@/lib/events/recordStudentEvent";
import { PROMPT_KEYS } from "@/lib/prompts/registry";
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
  const event = await recordStudentEvent({
    studentUserId: testSession.userId,
    eventType: EVENT_TYPES.ITEM_ANSWER_SUBMITTED,
    sessionId: body.sessionId,
    context: {
      assessmentId: testSession.assessmentId,
      testSessionId: body.sessionId,
      responseRecordId: response.id,
      questionId: canonicalQuestionId,
      questionType: canonicalQuestion.questionType,
      standardCode: canonicalQuestion.standardCode,
      skill: canonicalQuestion.skill,
      difficulty: canonicalQuestion.difficulty,
    },
    response: sanitizedAnswerResponse(body.answerPayload),
    durationMs: body.timeSpentSec * 1000,
    immediateOutcome: scored.isCorrect ? "CORRECT" : scored.scorePointsEarned > 0 ? "PARTIAL" : "INCORRECT",
  });
  if (typeof body.answerPayload.shortResponse === "string") {
    void persistModelDecision(
      {
        decisionType: DECISION_TYPES.GIST_GRADING,
        modelProvider: "HEURISTIC",
        modelName: "server-short-response-gist-v1",
        promptKey: PROMPT_KEYS.GIST_GRADING_HEURISTIC_V1,
        studentEventId: event?.id,
        studentUserId: testSession.userId,
        inputContext: {
          assessmentId: testSession.assessmentId,
          responseRecordId: response.id,
          questionId: canonicalQuestionId,
          standardCode: canonicalQuestion.standardCode,
          questionType: canonicalQuestion.questionType,
          responseWordCount: String(body.answerPayload.shortResponse).trim().split(/\s+/).filter(Boolean).length,
          hasSampleAnswer: typeof body.answerPayload.sampleAnswer === "string",
        },
      },
      scored,
      { inferenceMs: 0, costUsd: 0 },
    );
  }

  return NextResponse.json({ ok: true, responseId: response.id, scored });
}

function sanitizedAnswerResponse(answerPayload: Record<string, unknown>) {
  const response: Record<string, unknown> = {};
  for (const key of ["selectedIndex", "selectedIndices", "partAIndex", "partBIndices", "selectedSpanIndex", "mapping"]) {
    if (answerPayload[key] !== undefined) response[key] = answerPayload[key];
  }
  if (typeof answerPayload.shortResponse === "string") {
    response.shortResponseWordCount = answerPayload.shortResponse.trim().split(/\s+/).filter(Boolean).length;
  }
  return response;
}
