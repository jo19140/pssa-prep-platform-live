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
  const assessment = await db.assessment.create({ data: { title: body.title || "PSSA ELA Practice Test 1", subject: "ELA", state: "PA", grade: 6, isAdaptive: true } });
  const assignment = await db.assignment.create({ data: { assessmentId: assessment.id, classRoomId: body.classRoomId, assignedById: (session.user as any).id, dueDate: body.dueDate ? new Date(body.dueDate) : null, standards: body.standards || [], assignmentType: body.assignmentType || "FULL", status: "ASSIGNED" } });
  return NextResponse.json({ assignment });
}
