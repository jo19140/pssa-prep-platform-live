import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildDeterministicLearningLessons } from "@/lib/learningLessons";
import { loadResourcesByStandard } from "@/lib/learningLessonPersistence";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const review = await db.lessonReview.findUnique({
    where: { id },
    include: {
      lessonCache: true,
      lesson: { include: { learningPath: { include: { items: true, session: { include: { assessment: true, responses: true } } } } } },
      editInstructions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  let deterministicFallback = null;
  const path = review.lesson?.learningPath;
  if (path && review.lessonCache) {
    const resources = await loadResourcesByStandard(review.lessonCache.gradeLevel, path.items);
    deterministicFallback = buildDeterministicLearningLessons({
      gradeLevel: review.lessonCache.gradeLevel,
      pathItems: path.items.map((item) => ({ ...item, sourcePayload: item.sourcePayload as Record<string, unknown> })),
      responses: path.session.responses,
      resourcesByStandard: resources,
    }).find((lesson) => lesson.standardCode === review.lessonCache?.standardCode && lesson.skill === review.lessonCache?.skill) || null;
  }

  return NextResponse.json({
    review,
    deterministicFallback,
  });
}
