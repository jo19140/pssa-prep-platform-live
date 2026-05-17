import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";

const suggestionSchema = z.object({
  url: z.string().trim().url().max(2048),
  title: z.string().trim().min(1).max(160),
  provider: z.string().trim().min(1).max(120),
  gradeLevel: z.union([z.coerce.number().int().min(3).max(8), z.literal(""), z.null()]).optional(),
  standardCode: z.string().trim().max(80).optional().nullable(),
  skill: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  rationale: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = String((session.user as any).id);
  const hourly = await consumeRateLimit({ key: `resource-suggest:hour:${userId}`, capacity: 5, refillIntervalMs: 60 * 60 * 1000 });
  const daily = await consumeRateLimit({ key: `resource-suggest:day:${userId}`, capacity: 20, refillIntervalMs: 24 * 60 * 60 * 1000 });
  if (!hourly.allowed || !daily.allowed) {
    return NextResponse.json({ error: "Too many resource suggestions. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(hourly.retryAfterSec, daily.retryAfterSec)) } });
  }

  const parsed = suggestionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;

  const suggestion = await db.resourceSuggestion.create({
    data: {
      teacherUserId: userId,
      url: body.url,
      title: body.title,
      provider: body.provider,
      gradeLevel: body.gradeLevel ? Number(body.gradeLevel) : null,
      standardCode: body.standardCode || null,
      skill: body.skill || null,
      description: body.description || null,
      rationale: body.rationale,
    },
  });

  return NextResponse.json({ suggestion });
}
