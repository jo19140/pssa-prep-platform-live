import "server-only";

import { db } from "@/lib/db";
import { buildPrebuiltLessonSeeds } from "@/lib/prebuiltLessonLibrary";
import {
  buildTeacherLessonLibraryList,
  buildTeacherLessonPreview,
  TeacherLessonLibraryIntegrityError,
  type TeacherLessonAuditWarning,
  type TeacherLessonDbRowInput,
} from "@/lib/teacher/teacherLessonLibraryCore";

export { TeacherLessonLibraryIntegrityError };

export async function loadTeacherLessonLibraryList() {
  const rows = await loadApprovedRows();
  const result = buildTeacherLessonLibraryList(rows, buildPrebuiltLessonSeeds());
  logAuditWarnings(result.auditWarnings);
  return result;
}

export async function loadTeacherLessonPreview(lessonId: string) {
  const rows = await loadApprovedRows();
  const result = buildTeacherLessonPreview(lessonId, rows, buildPrebuiltLessonSeeds());
  logAuditWarnings(result.auditWarnings);
  return result;
}

async function loadApprovedRows(): Promise<TeacherLessonDbRowInput[]> {
  return db.learningLesson.findMany({
    where: { reviewStatus: "APPROVED" },
    select: {
      id: true,
      title: true,
      gradeLevel: true,
      standardCode: true,
      standardLabel: true,
      skill: true,
      reviewStatus: true,
    },
    orderBy: [{ gradeLevel: "asc" }, { skill: "asc" }, { title: "asc" }],
  });
}

function logAuditWarnings(warnings: TeacherLessonAuditWarning[]) {
  if (!warnings.length) return;
  console.warn("teacher_lesson_library_audit_warning", { warnings });
}
