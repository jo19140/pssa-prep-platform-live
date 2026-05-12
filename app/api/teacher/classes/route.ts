import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUniqueClassJoinCode, ensureClassJoinCode } from "@/lib/classCodes";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: {
      classes: {
        include: { enrollments: true, school: true },
        orderBy: [{ grade: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

  await Promise.all(teacher.classes.filter((classRoom) => !classRoom.joinCode).map((classRoom) => ensureClassJoinCode(classRoom.id)));
  const classes = await db.classRoom.findMany({
    where: { teacherId: teacher.id },
    include: { enrollments: true, school: true },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ classes: classes.map(serializeClassRoom) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const grade = Number(body.grade);
  if (!name) return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  if (!Number.isInteger(grade) || grade < 3 || grade > 8) return NextResponse.json({ error: "Choose a grade from 3 to 8." }, { status: 400 });

  const teacher = await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });

  const classRoom = await db.classRoom.create({
    data: {
      name,
      grade,
      teacherId: teacher.id,
      schoolId: teacher.schoolId,
      joinCode: await createUniqueClassJoinCode(),
      joinEnabled: true,
    },
    include: { enrollments: true, school: true },
  });

  return NextResponse.json({ classRoom: serializeClassRoom(classRoom) });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const classRoomId = String(body.classRoomId || "");
  const action = String(body.action || "");
  if (!classRoomId) return NextResponse.json({ error: "Class id is required." }, { status: 400 });

  const teacher = await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!teacher) return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  const classRoom = await db.classRoom.findFirst({ where: { id: classRoomId, teacherId: teacher.id } });
  if (!classRoom) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const data =
    action === "regenerate"
      ? { joinCode: await createUniqueClassJoinCode(), joinEnabled: true }
      : action === "enable"
        ? { joinEnabled: true }
        : action === "disable"
          ? { joinEnabled: false }
          : null;

  if (!data) return NextResponse.json({ error: "Unknown class code action." }, { status: 400 });

  const updated = await db.classRoom.update({
    where: { id: classRoom.id },
    data,
    include: { enrollments: true, school: true },
  });
  return NextResponse.json({ classRoom: serializeClassRoom(updated) });
}

function serializeClassRoom(classRoom: any) {
  return {
    id: classRoom.id,
    name: classRoom.name,
    grade: classRoom.grade,
    schoolName: classRoom.school?.name || null,
    joinCode: classRoom.joinCode,
    joinEnabled: classRoom.joinEnabled,
    studentCount: classRoom.enrollments?.length || 0,
  };
}
