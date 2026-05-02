import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const testSession = await db.testSession.findUnique({ where: { id: body.sessionId } });
  if (!testSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (role !== "ADMIN" && testSession.userId !== (session.user as any).id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (testSession.submittedAt) return NextResponse.json({ error: "Session already submitted" }, { status: 409 });
  const timeSpentSec = Math.max(1, Math.min(Number(body.timeSpentSec) || 1, 3600));

  const response = await db.$transaction(async (tx) => {
    const existing = await tx.responseRecord.findFirst({ where: { sessionId: body.sessionId, questionId: body.questionId } });
    const data = { sessionId: body.sessionId, questionId: body.questionId, skill: body.skill, standardCode: body.standardCode, standardLabel: body.standardLabel, questionType: body.questionType, difficulty: body.difficulty, isCorrect: body.isCorrect, scorePointsEarned: body.scorePointsEarned, maxPoints: body.maxPoints, errorPattern: body.errorPattern, timeSpentSec, answerPayload: body.answerPayload };
    const saved = existing ? await tx.responseRecord.update({ where: { id: existing.id }, data }) : await tx.responseRecord.create({ data });
    await tx.testSession.update({ where: { id: body.sessionId }, data: { currentQuestionNo: Math.max(1, Number(body.currentQuestionNo) || testSession.currentQuestionNo || 1) } });
    return saved;
  });

  return NextResponse.json({ ok: true, responseId: response.id });
}
