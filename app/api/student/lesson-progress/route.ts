import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scorePracticeResponses } from "@/lib/serverScoring";

const progressSchema = z.object({
  lessonId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "MASTERED"]),
  guidedResponses: z.unknown().optional(),
  independentResponses: z.unknown().optional(),
  exitTicketResponses: z.unknown().optional(),
  masteryResponses: z.unknown().optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = progressSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const lesson = await db.learningLesson.findFirst({
    where: { id: body.lessonId, learningPath: { session: { userId: (session.user as any).id } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const masteryPayload = normalizeMasteryResponses(body.masteryResponses);
  const masteryResult = masteryPayload ? scorePracticeResponses(masteryPayload, lesson.masteryCheck) : null;
  const masteryScore = masteryResult?.score;
  const nextStatus = masteryScore != null
    ? masteryScore >= 80 ? "MASTERED" : "COMPLETED"
    : body.status === "MASTERED" ? "COMPLETED" : body.status;
  const now = new Date();

  const progress = await db.studentLessonProgress.upsert({
    where: { lessonId_userId: { lessonId: body.lessonId, userId: (session.user as any).id } },
    update: {
      status: nextStatus,
      guidedResponses: body.guidedResponses === undefined ? undefined : body.guidedResponses as Prisma.InputJsonValue,
      independentResponses: body.independentResponses === undefined ? undefined : body.independentResponses as Prisma.InputJsonValue,
      exitTicketResponses: body.exitTicketResponses === undefined ? undefined : body.exitTicketResponses as Prisma.InputJsonValue,
      masteryScore,
      masteryStatus: nextStatus,
      startedAt: nextStatus === "IN_PROGRESS" ? now : undefined,
      completedAt: nextStatus === "COMPLETED" || nextStatus === "MASTERED" ? now : undefined,
      masteredAt: nextStatus === "MASTERED" ? now : undefined,
    },
    create: {
      lessonId: body.lessonId,
      userId: (session.user as any).id,
      status: nextStatus,
      guidedResponses: body.guidedResponses === undefined ? undefined : body.guidedResponses as Prisma.InputJsonValue,
      independentResponses: body.independentResponses === undefined ? undefined : body.independentResponses as Prisma.InputJsonValue,
      exitTicketResponses: body.exitTicketResponses === undefined ? undefined : body.exitTicketResponses as Prisma.InputJsonValue,
      masteryScore,
      masteryStatus: nextStatus,
      startedAt: nextStatus === "IN_PROGRESS" ? now : undefined,
      completedAt: nextStatus === "COMPLETED" || nextStatus === "MASTERED" ? now : undefined,
      masteredAt: nextStatus === "MASTERED" ? now : undefined,
    },
  });

  return NextResponse.json({ progress });
}

function normalizeMasteryResponses(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, any>;
  if (payload.answers && Array.isArray(payload.answers)) {
    return Object.fromEntries(payload.answers.map((answer: Record<string, unknown>, index: number) => [String(index), answer?.selected || ""]));
  }
  return payload;
}
