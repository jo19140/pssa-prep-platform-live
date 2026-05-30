import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { runDiagnosticPoolPreflight } from "@/lib/literacy/diagnosticPoolPreflight";
import { selectNextStudentItem } from "@/lib/literacy/diagnosticSessionService";

const schema = z.object({ studentUserId: z.string().optional() }).optional();

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const studentUserId = auth.user!.role === "ADMIN" && parsed.data?.studentUserId ? parsed.data.studentUserId : auth.user!.id;
  const preflight = await runDiagnosticPoolPreflight();
  if (preflight.ok === false) return NextResponse.json({ error: preflight.error, details: preflight.details }, { status: 503 });

  const session = await db.diagnosticSession.create({ data: { studentUserId } });
  const next = selectNextStudentItem({ attempts: [], pool: preflight.items });
  return NextResponse.json({ sessionId: session.id, ...next });
}
