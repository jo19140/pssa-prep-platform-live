import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { loadDiagnosticGradingCasesForTeacher } from "@/lib/teacher/gradingCaseDto";

const querySchema = z.object({
  classRoomId: z.string().trim().min(1).max(128),
  formId: z.string().trim().min(1).max(128),
});

export async function GET(req: Request) {
  const auth = await requireUser(["TEACHER"]);
  if (auth.error) return withNoStore(auth.error);
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    classRoomId: url.searchParams.get("classRoomId") ?? "",
    formId: url.searchParams.get("formId") ?? "",
  });
  if (!parsed.success) return withNoStore(NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten().fieldErrors }, { status: 400 }));
  const query = parsed.data as { classRoomId: string; formId: string };
  try {
    return withNoStore(NextResponse.json(await loadDiagnosticGradingCasesForTeacher(auth.user.id, query)));
  } catch (error) {
    if (error instanceof Error && error.message === "class_not_found") {
      return withNoStore(NextResponse.json({ error: "Class not found." }, { status: 404 }));
    }
    throw error;
  }
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
