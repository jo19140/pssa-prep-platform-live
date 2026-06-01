import { db } from "@/lib/db";
import { evaluateLessonApprovalReadiness } from "./lessonAudit";

export async function canApproveLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      phasePosition: true,
      dailyTarget: true,
      parts: { orderBy: { partNumber: "asc" } },
    },
  });
  if (!lesson) return { approvable: false, blockers: ["LESSON_EXISTS: lesson not found"], warnings: [] };
  return evaluateLessonApprovalReadiness(lesson);
}
