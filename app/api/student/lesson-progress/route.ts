import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const lessonId = String(body.lessonId || "");
  const status = normalizeStatus(body.status);
  if (!lessonId || !status) return NextResponse.json({ error: "Missing lessonId or valid status." }, { status: 400 });

  const lesson = await db.learningLesson.findFirst({
    where: { id: lessonId, learningPath: { session: { userId: (session.user as any).id } } },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const masteryScore = typeof body.masteryScore === "number" ? Math.max(0, Math.min(100, Math.round(body.masteryScore))) : undefined;
  const nextStatus = masteryScore != null && masteryScore >= 80 ? "MASTERED" : status;
  const now = new Date();

  const progress = await db.studentLessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId: (session.user as any).id } },
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
      lessonId,
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

function normalizeStatus(status: unknown) {
  const value = String(status || "").toUpperCase();
  return ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "MASTERED"].includes(value) ? value : null;
}
