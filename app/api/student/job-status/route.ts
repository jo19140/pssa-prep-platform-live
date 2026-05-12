import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rateLimit";

const jobStatusQuerySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

type CachedStatus = {
  expiresAt: number;
  payload: unknown;
};

const statusCache = new Map<string, CachedStatus>();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = String((session.user as any).id || "unknown");
  const limit = await consumeRateLimit({ key: `job-status:user:${userId}`, capacity: 60, refillIntervalMs: 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many status checks." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const { searchParams } = new URL(req.url);
  const parsed = jobStatusQuerySchema.safeParse({ sessionId: searchParams.get("sessionId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { sessionId } = parsed.data;

  const testSession = await db.testSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!testSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (role !== "ADMIN" && testSession.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cacheKey = `${sessionId}:${userId}:${role}`;
  const cached = statusCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.payload);

  const [jobs, tdaCount, pendingTdaCount, lessons, learningPath] = await Promise.all([
    db.aiJob.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" }, select: { jobType: true, status: true, completedAt: true } }),
    db.responseRecord.count({ where: { sessionId, questionType: "TDA" } }),
    db.responseRecord.count({ where: { sessionId, questionType: "TDA", essayEvaluation: null } }),
    db.learningLesson.findMany({ where: { learningPath: { sessionId } }, select: { aiStatus: true } }),
    db.learningPath.findUnique({ where: { sessionId }, select: { generatedBy: true, aiStatus: true, aiSummary: true } }),
  ]);
  const payload = {
    jobs,
    essayGradingPending: tdaCount > 0 && pendingTdaCount > 0,
    lessonsEnrichedCount: lessons.filter((lesson) => lesson.aiStatus === "COMPLETED").length,
    totalLessons: lessons.length,
    pathEnriched: learningPath?.generatedBy === "AI_ENRICHED" || learningPath?.aiStatus === "COMPLETED",
  };
  statusCache.set(cacheKey, { expiresAt: Date.now() + 2000, payload });
  return NextResponse.json(payload);
}
