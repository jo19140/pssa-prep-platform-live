import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadPssaClassReportForTeacher } from "@/lib/content/pssaClassReportServerLoader";
import { pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";

const querySchema = z.object({
  classRoomId: z.string().trim().min(1).max(128),
  formId: z.string().trim().min(1).max(128),
  benchmarkSeason: z.string().trim().min(1).max(40).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return json({ error: "Unauthorized" }, 401);
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return json({ error: "Forbidden" }, 403);

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid query", issues: parsed.error.flatten().fieldErrors }, 400);
  const { classRoomId, formId } = parsed.data;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!teacher) return json({ error: "Teacher profile not found" }, 404);

  const loaded = await loadPssaClassReportForTeacher({
    db,
    classRoomId,
    formId,
    teacherId: teacher.id,
    benchmarkSeason: parsed.data.benchmarkSeason,
  });
  if ("error" in loaded) {
    if (loaded.error === "class_not_found") return json({ error: "Class not found" }, 404);
    if (loaded.error === "form_not_found") return json({ error: "Form not found" }, 404);
    return json({ error: "Forbidden" }, 403);
  }
  return json(loaded.report, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: pssaNoStoreHeaders() });
}
