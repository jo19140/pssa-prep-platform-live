import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  stateCode: z.string().trim().length(2),
  email: z.string().email().optional(),
  requestNotes: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const stateCode = body.data.stateCode.toUpperCase();
  if (stateCode === "PA") {
    return NextResponse.json({ error: "Pennsylvania PSSA is already available." }, { status: 400 });
  }
  const request = await db.stateRequests.create({
    data: {
      userId: auth.user?.id,
      email: body.data.email || auth.user?.email,
      stateCode,
      requestNotes: body.data.requestNotes,
    },
  });
  return NextResponse.json({ request });
}
