import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeJoinCode } from "@/lib/classCodes";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const joinCode = normalizeJoinCode(String(body.joinCode || ""));
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
