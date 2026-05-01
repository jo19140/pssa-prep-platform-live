import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
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

    const classRoomId = body.classRoomId || teacher?.classes[0]?.id || null;
    if (role === "TEACHER" && classRoomId && !teacher?.classes.some((classRoom) => classRoom.id === classRoomId)) {
      return NextResponse.json({ error: "Class does not belong to this teacher." }, { status: 403 });
    }

    const classRoom = classRoomId ? await db.classRoom.findUnique({ where: { id: classRoomId } }) : null;
    const grade = Number.parseInt(String(body.grade ?? body.gradeLevel ?? classRoom?.grade ?? 6), 10) || 6;
    const standards = Array.isArray(body.standards)
      ? body.standards.filter(Boolean).join(",")
      : String(body.standards || "");

    const assessment = await db.assessment.create({
      data: {
        title: body.title || "PSSA ELA Practice Test",
        subject: body.subject || "ELA",
        state: body.state || "PA",
        grade,
        isAdaptive: body.isAdaptive ?? true,
      },
    });

    const assignment = classRoomId
      ? await db.assignment.create({
          data: {
            assessmentId: assessment.id,
            classRoomId,
            assignedById: (session.user as any).id,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            standards,
            assignmentType: body.assignmentType || "FULL",
            status: "ASSIGNED",
          },
        })
      : null;

    return NextResponse.json({ success: true, assessment, assignment });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create test" },
      { status: 500 }
    );
  }
}
