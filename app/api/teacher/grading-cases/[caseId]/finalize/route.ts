import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { DiagnosticWritingFinalizeError, finalizeDiagnosticWritingCase, type FinalizeWritingInput } from "@/lib/teacher/diagnosticWritingFinalize";

const decisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SCORE"), score: z.number().int() }),
  z.object({ kind: z.literal("NON_SCORABLE"), reason: z.enum(["BLANK", "REFUSAL", "OFF_TOPIC", "COPIED", "OTHER"]) }),
]);

const bodySchema = z.object({
  classRoomId: z.string().trim().min(1).max(128),
  formId: z.string().trim().min(1).max(128),
  expectedConcurrencyToken: z.string().trim().min(1).max(256),
  decision: decisionSchema,
  overrideReason: z.string().trim().max(1000).optional(),
  teacherNote: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
});

export async function POST(req: Request, context: { params: Promise<{ caseId: string }> }) {
  const auth = await requireUser(["TEACHER"]);
  if ("error" in auth) return withNoStore(auth.error);
  const params = await context.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request", issues: parsed.error.flatten().fieldErrors }, 400);
  try {
    const body = parsed.data as z.infer<typeof bodySchema>;
    return json(await finalizeDiagnosticWritingCase({
      teacherUserId: auth.user.id,
      caseId: params.caseId,
      ...body,
    } as FinalizeWritingInput), 200);
  } catch (error) {
    if (error instanceof DiagnosticWritingFinalizeError) return json({ error: error.code }, error.status);
    throw error;
  }
}

function json(body: unknown, status: number) {
  return withNoStore(NextResponse.json(body, { status }));
}

function withNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
