import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { loadTeacherAssignmentsForUser } from "@/lib/teacher/teacherAssignmentsLoader";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const auth = await requireUser(["TEACHER"]);
  if ("error" in auth) return withNoStore(auth.error);
  const result = await loadTeacherAssignmentsForUser(auth.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(result, { headers: NO_STORE });
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
