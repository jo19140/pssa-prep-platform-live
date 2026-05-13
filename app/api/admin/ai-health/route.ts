import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAiFailureCounters, getLastAiFailures } from "@/lib/aiTelemetry";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [pendingReviewCount, approvedTodayCount, rejectedTodayCount, reviewedRecent, editsRecent] = await Promise.all([
    db.lessonReview.count({ where: { status: "PENDING" } }),
    db.lessonReview.count({ where: { status: "APPROVED", reviewedAt: { gte: todayStart } } }),
    db.lessonReview.count({ where: { status: "REJECTED", reviewedAt: { gte: todayStart } } }),
    db.lessonReview.findMany({ where: { reviewedAt: { gte: sevenDaysAgo }, status: { in: ["APPROVED", "REJECTED"] } }, select: { createdAt: true, reviewedAt: true } }),
    db.aiEditInstruction.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { accepted: true } }),
  ]);
  const avgTimeToReviewHours = reviewedRecent.length
    ? Math.round((reviewedRecent.reduce((sum, review) => sum + ((review.reviewedAt?.getTime() || now.getTime()) - review.createdAt.getTime()), 0) / reviewedRecent.length / 3_600_000) * 10) / 10
    : null;
  const aiRevisionAcceptanceRate = editsRecent.length
    ? Math.round((editsRecent.filter((edit) => edit.accepted).length / editsRecent.length) * 1000) / 1000
    : null;

  return NextResponse.json({
    counters: getAiFailureCounters(),
    lastFailures: getLastAiFailures(),
    reviewQueue: {
      pendingReviewCount,
      approvedTodayCount,
      rejectedTodayCount,
      avgTimeToReviewHours,
      aiRevisionAcceptanceRate,
    },
  });
}
