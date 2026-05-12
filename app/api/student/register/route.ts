import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/classCodes";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const studentRegisterSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  joinCode: z.string().trim().min(1).max(32),
});

export async function POST(req: Request) {
  const ipLimit = await consumeRateLimit({ key: `student-register:ip:${getClientIp(req)}`, capacity: 20, refillIntervalMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } });
  }

  const parsed = studentRegisterSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const joinCode = normalizeJoinCode(parsed.data.joinCode);

  if (!joinCode) return NextResponse.json({ error: "Class code is required." }, { status: 400 });

  const classRoom = await db.classRoom.findUnique({
    where: { joinCode },
    include: { teacher: true, school: true },
  });
  if (!classRoom || !classRoom.joinEnabled) {
    return NextResponse.json({ error: "That class code is not active. Check the code with your teacher." }, { status: 404 });
  }

  const existingUser = await db.user.findUnique({ where: { email }, include: { studentProfile: true } });
  if (existingUser) {
    return NextResponse.json({ error: "This email already has an account. Sign in, then join with the class code." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({ data: { email, name, passwordHash, role: "STUDENT" } });

  const studentProfile = await db.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      grade: classRoom.grade,
      schoolId: classRoom.schoolId,
      schoolName: classRoom.school?.name || "PSSA Prep Class",
      teacherId: classRoom.teacherId,
    },
    create: {
      userId: user.id,
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

  return NextResponse.json({
    student: { id: user.id, name: user.name, email: user.email },
    classRoom: { id: classRoom.id, name: classRoom.name, grade: classRoom.grade },
  });
}
