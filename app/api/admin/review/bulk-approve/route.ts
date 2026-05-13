import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { approveLessonReview } from "@/lib/lessonReviewWorkflow";

const schema = z.object({ reviewIds: z.array(z.string().min(1).max(128)).min(1).max(100) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const results = [];
  for (const reviewId of parsed.data.reviewIds) {
    results.push(await approveLessonReview(reviewId, (session.user as any).id));
  }
  return NextResponse.json({ results });
}
