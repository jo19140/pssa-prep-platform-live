import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const response = await db.responseRecord.create({ data: { sessionId: body.sessionId, questionId: body.questionId, skill: body.skill, standardCode: body.standardCode, standardLabel: body.standardLabel, questionType: body.questionType, difficulty: body.difficulty, isCorrect: body.isCorrect, scorePointsEarned: body.scorePointsEarned, maxPoints: body.maxPoints, errorPattern: body.errorPattern, timeSpentSec: body.timeSpentSec, answerPayload: body.answerPayload } });
  await db.testSession.update({ where: { id: body.sessionId }, data: { currentQuestionNo: { increment: 1 } } });
  return NextResponse.json({ ok: true, responseId: response.id });
}
