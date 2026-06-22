import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const auth = await requireUser(["TEACHER"]);
  if ("error" in auth) return withNoStore(auth.error);
  const { assignmentId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: auth.user.id }, select: { id: true } });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);

  const assignment = await db.learningAssignment.findFirst({
    where: { id: assignmentId, classRoom: { teacherId: teacher.id } },
    select: { id: true, status: true },
  });
  if (!assignment) return json({ error: "Assignment not found" }, 404);
  if (assignment.status === "ARCHIVED") return json({ ok: true, status: "ARCHIVED" }, 200);
  if (assignment.status !== "CLOSED") return json({ error: "assignment_active" }, 409);

  const updated = await db.learningAssignment.update({
    where: { id: assignment.id },
    data: { status: "ARCHIVED" },
    select: { status: true },
  });
  return json({ ok: true, status: updated.status }, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
