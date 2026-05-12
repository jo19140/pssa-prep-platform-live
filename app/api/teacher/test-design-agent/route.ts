import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { designAssessmentBlueprint } from "@/lib/testDesignAgent";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const testDesignSchema = z.object({
  classRoomId: z.string().max(128).optional(),
  grade: z.union([z.string().max(20), z.number()]).optional(),
  gradeLevel: z.union([z.string().max(20), z.number()]).optional(),
  purpose: z.enum(["RETEST", "BASELINE_DIAGNOSTIC", "TARGETED_PRACTICE"]).optional(),
  focusSkills: z.array(z.string().trim().max(80)).max(40).optional().default([]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = String((session.user as any).id || "unknown");
  const userLimit = await consumeRateLimit({ key: `teacher-test-design:user:${userId}`, capacity: 20, refillIntervalMs: 60 * 60 * 1000 });
  const ipLimit = await consumeRateLimit({ key: `teacher-test-design:ip:${getClientIp(req)}`, capacity: 60, refillIntervalMs: 60 * 60 * 1000 });
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many test-design requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } });
  }

  const parsed = testDesignSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;
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
    focusSkills: body.focusSkills,
  });

  return NextResponse.json({ blueprint });
}

function parseGrade(value: unknown) {
  const match = String(value || "6").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 6;
}
