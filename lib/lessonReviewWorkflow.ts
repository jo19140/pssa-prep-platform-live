import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { lessonCacheKey } from "@/lib/learningLessons";
import { generateStepAudio } from "@/lib/lessonStepAudio";
import { learningLessonUpdateDataFromContent, lessonToReviewContent, normalizeReviewContent } from "@/lib/lessonReview";

export async function approveLessonReview(reviewId: string, userId: string) {
  const review = await db.lessonReview.findUnique({
    where: { id: reviewId },
    include: { lessonCache: true },
  });
  if (!review) throw new Error("Review not found.");
  if (!review.lessonCache) throw new Error("Review is missing lesson cache.");
  const content = normalizeReviewContent(review.currentContent || review.aiOriginalContent);
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.lessonCache.update({
      where: { id: review.lessonCache!.id },
      data: {
        payload: content as unknown as Prisma.InputJsonValue,
        reviewStatus: "APPROVED",
        approvedAt: now,
        approvedById: userId,
        rejectedAt: null,
        rejectedById: null,
        doNotRetryUntil: null,
      },
    });
    await tx.lessonReview.update({
      where: { id: review.id },
      data: { status: "APPROVED", reviewedById: userId, reviewedAt: now, reviewerNotes: null, currentContent: content as unknown as Prisma.InputJsonValue },
    });
  });

  await updateLessonsForCache(review.lessonCache.cacheKey, content, {
    reviewStatus: "APPROVED",
    approvedAt: now,
    approvedById: userId,
    rejectedAt: null,
    rejectedById: null,
  });

  return { reviewId: review.id, status: "APPROVED" };
}

export async function rejectLessonReview(reviewId: string, userId: string, reviewerNotes: string) {
  const review = await db.lessonReview.findUnique({ where: { id: reviewId }, include: { lessonCache: true } });
  if (!review) throw new Error("Review not found.");
  if (!review.lessonCache) throw new Error("Review is missing lesson cache.");
  const now = new Date();
  const cooldown = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.$transaction(async (tx) => {
    await tx.lessonCache.update({
      where: { id: review.lessonCache!.id },
      data: {
        reviewStatus: "REJECTED",
        rejectedAt: now,
        rejectedById: userId,
        doNotRetryUntil: cooldown,
      },
    });
    await tx.lessonReview.update({
      where: { id: review.id },
      data: { status: "REJECTED", reviewedById: userId, reviewedAt: now, reviewerNotes },
    });
  });
  await updateLessonsForCache(review.lessonCache.cacheKey, normalizeReviewContent(review.currentContent || review.aiOriginalContent), {
    reviewStatus: "REJECTED",
    rejectedAt: now,
    rejectedById: userId,
  });
  return { reviewId: review.id, status: "REJECTED" };
}

async function updateLessonsForCache(cacheKey: string, content: ReturnType<typeof normalizeReviewContent>, statusData: Record<string, unknown>) {
  const candidates = await db.learningLesson.findMany({
    where: { gradeLevel: content.gradeLevel, standardCode: content.standardCode, skill: content.skill },
    include: { learningPathItem: true, items: true, steps: { orderBy: { order: "asc" } }, heroResourceLink: true },
  });
  for (const lesson of candidates) {
    if (lessonCacheKey(lessonToReviewContent(lesson)) !== cacheKey) continue;
    const previousNarration = new Map((lesson.steps || []).map((step) => [step.order, step.narrationScript]));
    const updatedLesson = await db.learningLesson.update({
      where: { id: lesson.id },
      data: {
        ...learningLessonUpdateDataFromContent(content),
        ...statusData,
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    await Promise.allSettled(
      updatedLesson.steps
        .filter((step) => previousNarration.get(step.order) && previousNarration.get(step.order) !== step.narrationScript)
        .map(async (step) => {
          const audioUrl = await generateStepAudio({ stepId: step.id, narrationScript: step.narrationScript });
          if (audioUrl) await db.lessonStep.update({ where: { id: step.id }, data: { audioUrl } });
        }),
    );
  }
}
