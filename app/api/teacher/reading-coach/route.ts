import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_READING_TEXT = "Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.";

const assignReadingCoachSchema = z.object({
  classRoomId: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(160).optional().default("Reading Coach Fluency Practice"),
  expectedText: z.string().trim().min(1).max(8000).optional().default(DEFAULT_READING_TEXT),
  activityType: z.string().trim().max(40).optional().default("READ_ALOUD"),
  gradeLevel: z.coerce.number().int().min(3).max(8).optional().default(6),
  dueDate: z.string().trim().max(80).optional().nullable(),
});

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

    const parsed = assignReadingCoachSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { classRoomId, title, expectedText, activityType, gradeLevel, dueDate } = parsed.data;

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
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Failed to assign Reading Coach practice", error);
    return NextResponse.json({ error: "Failed to assign Reading Coach practice. Please try again." }, { status: 500 });
  }
}
