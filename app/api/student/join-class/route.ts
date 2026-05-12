import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/classCodes";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const joinClassSchema = z.object({
  joinCode: z.string().trim().min(1).max(32),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ipLimit = await consumeRateLimit({ key: `join-class:ip:${getClientIp(req)}`, capacity: 20, refillIntervalMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many class-code attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } });
  }

  const parsed = joinClassSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const joinCode = normalizeJoinCode(parsed.data.joinCode);
  if (!joinCode) return NextResponse.json({ error: "Class code is required." }, { status: 400 });

  const classRoom = await db.classRoom.findUnique({
    where: { joinCode },
    include: { school: true },
  });
  if (!classRoom || !classRoom.joinEnabled) {
    return NextResponse.json({ error: "That class code is not active. Check the code with your teacher." }, { status: 404 });
  }

  const studentProfile = await db.studentProfile.upsert({
    where: { userId: (session.user as any).id },
    update: {
      grade: classRoom.grade,
      schoolId: classRoom.schoolId,
      schoolName: classRoom.school?.name || "PSSA Prep Class",
      teacherId: classRoom.teacherId,
    },
    create: {
      userId: (session.user as any).id,
      grade: classRoom.grade,
      schoolId: classRoom.schoolId,
      schoolName: classRoom.school?.name || "PSSA Prep Class",
      teacherId: classRoom.teacherId,
    },
  });

  await db.enrollment.upsert({
    where: { classRoomId_studentProfileId: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } },
    update: {},
    create: { classRoomId: classRoom.id, studentProfileId: studentProfile.id },
  });

  return NextResponse.json({ classRoom: { id: classRoom.id, name: classRoom.name, grade: classRoom.grade } });
}
