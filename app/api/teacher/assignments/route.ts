import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();

  const teacher = await db.teacherProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { classes: true },
  });

  if (role === "TEACHER" && !teacher) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const classRoomId = body.classRoomId || teacher?.classes[0]?.id;
  if (!classRoomId) {
    return NextResponse.json({ error: "No class found to assign this test to." }, { status: 400 });
  }

  if (role === "TEACHER" && !teacher?.classes.some((classRoom) => classRoom.id === classRoomId)) {
    return NextResponse.json({ error: "Class does not belong to this teacher." }, { status: 403 });
  }

  const classRoom = await db.classRoom.findUnique({ where: { id: classRoomId } });
  if (!classRoom) return NextResponse.json({ error: "Class not found." }, { status: 404 });

  const grade = Number.parseInt(String(body.grade ?? body.gradeLevel ?? classRoom.grade), 10) || classRoom.grade || 6;
  const standards = Array.isArray(body.standards)
    ? body.standards.filter(Boolean).join(",")
    : String(body.standards || "");

  const assignment = await db.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        title: body.title || "PSSA ELA Practice Test",
        subject: "ELA",
        state: "PA",
        grade,
        isAdaptive: true,
      },
    });

    return tx.assignment.create({
      data: {
        assessmentId: assessment.id,
        classRoomId,
        assignedById: (session.user as any).id,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        standards,
        assignmentType: body.assignmentType || "FULL",
        status: "ASSIGNED",
      },
      include: { assessment: true },
    });
  });

  return NextResponse.json({ assignment });
}
