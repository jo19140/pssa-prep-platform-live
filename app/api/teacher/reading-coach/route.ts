import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_READING_TEXT = "Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const teacher = await db.teacherProfile.findUnique({
      where: { userId: (session.user as any).id },
      include: { classes: { select: { id: true } } },
    });
    if (!teacher) return NextResponse.json({ assignments: [] });

    const classIds = teacher.classes.map((classRoom) => classRoom.id);
    const assignments = await db.readingCoachAssignment.findMany({
      where: { classRoomId: { in: classIds } },
      include: { classRoom: true, _count: { select: { attempts: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        classRoomId: assignment.classRoomId,
        className: assignment.classRoom.name,
        gradeLevel: assignment.gradeLevel,
        activityType: assignment.activityType,
        expectedText: assignment.expectedText,
        status: assignment.status,
        dueDate: assignment.dueDate,
        attemptCount: assignment._count.attempts,
        createdAt: assignment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Failed to load Reading Coach assignments", error);
    return NextResponse.json({ error: "Failed to load Reading Coach assignments." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const classRoomId = String(body.classRoomId || "");
    const title = String(body.title || "Reading Coach Fluency Practice").trim();
    const expectedText = String(body.expectedText || DEFAULT_READING_TEXT).trim();
    const activityType = String(body.activityType || "READ_ALOUD").trim();
    const gradeLevel = Number.parseInt(String(body.gradeLevel || "6"), 10) || 6;

    if (!classRoomId) return NextResponse.json({ error: "Class is required." }, { status: 400 });
    if (!expectedText) return NextResponse.json({ error: "Reading passage is required." }, { status: 400 });

    const classRoom = await db.classRoom.findFirst({
      where: { id: classRoomId, teacher: { userId: (session.user as any).id } },
      select: { id: true },
    });
    if (!classRoom) return NextResponse.json({ error: "You can only assign Reading Coach practice to your own classes." }, { status: 403 });

    const assignment = await db.readingCoachAssignment.create({
      data: {
        classRoomId,
        assignedById: (session.user as any).id,
        title,
        gradeLevel,
        activityType,
        expectedText,
        status: "ASSIGNED",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Failed to assign Reading Coach practice", error);
    return NextResponse.json({ error: "Failed to assign Reading Coach practice. Please try again." }, { status: 500 });
  }
}
