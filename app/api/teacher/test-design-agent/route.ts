import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { designAssessmentBlueprint } from "@/lib/testDesignAgent";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const teacher = role === "TEACHER"
    ? await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id }, include: { classes: true } })
    : null;

  if (role === "TEACHER" && !teacher) return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 });
  if (body.classRoomId && role === "TEACHER" && !teacher?.classes.some((classRoom) => classRoom.id === body.classRoomId)) {
    return NextResponse.json({ error: "Class does not belong to this teacher." }, { status: 403 });
  }

  const gradeLevel = parseGrade(body.gradeLevel || body.grade || 6);
  const blueprint = designAssessmentBlueprint({
    gradeLevel,
    purpose: body.purpose || "BASELINE_DIAGNOSTIC",
    focusSkills: Array.isArray(body.focusSkills) ? body.focusSkills : [],
  });

  return NextResponse.json({ blueprint });
}

function parseGrade(value: unknown) {
  const match = String(value || "6").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 6;
}
