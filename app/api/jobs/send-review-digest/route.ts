import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const olderThan = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pending = await db.lessonReview.findMany({
    where: { status: "PENDING", createdAt: { lte: olderThan } },
    include: { lessonCache: true },
    orderBy: [{ lessonCache: { hitCount: "desc" } }, { createdAt: "asc" }],
    take: 10,
  });
  if (!pending.length) return NextResponse.json({ ok: true, sentCount: 0, pendingCount: 0 });

  const reviewers = await db.user.findMany({ where: { role: { in: ["ADMIN", "TEACHER"] } } });
  const summary = pending
    .slice(0, 5)
    .map((review) => `${review.lessonCache?.skill || "Lesson"} (${review.lessonCache?.standardCode || "standard"}, hits ${review.lessonCache?.hitCount || 0})`)
    .join("<br/>");
  let sentCount = 0;
  const results = [];
  for (const reviewer of reviewers) {
    try {
      await sendEmail({
        to: reviewer.email,
        subject: "Lessons awaiting review",
        html: `You have ${pending.length} lessons awaiting review.<br/><br/>Highest-priority items:<br/>${summary}<br/><br/><a href="${process.env.NEXTAUTH_URL || ""}/teacher/review">Open review queue</a>`,
      });
      sentCount++;
      results.push({ reviewerId: reviewer.id, status: "SENT" });
    } catch (error) {
      results.push({ reviewerId: reviewer.id, status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return NextResponse.json({ ok: true, pendingCount: pending.length, sentCount, results });
}
