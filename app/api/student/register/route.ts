import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/classCodes";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const joinCode = normalizeJoinCode(String(body.joinCode || ""));

  if (!name) return NextResponse.json({ error: "Student name is required." }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid student email is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
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
