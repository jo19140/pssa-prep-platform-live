import "server-only";

import { type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { buildTeacherAssignmentDto } from "@/lib/teacher/teacherAssignmentsLoaderCore";

export async function loadTeacherAssignmentsForUser(userId: string, database: PrismaClient = db) {
  const teacher = await database.teacherProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacher) return { error: "teacher_not_found" as const };

  const assignments = await database.learningAssignment.findMany({
    where: { classRoom: { teacherId: teacher.id } },
    orderBy: [{ createdAt: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      gradeLevel: true,
      audienceLabel: true,
      dueDate: true,
      status: true,
      assignmentType: true,
      recipients: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          studentProfile: { select: { user: { select: { name: true, email: true } } } },
          gradeRecord: { select: { status: true, pointsEarned: true, pointsPossible: true } },
        },
      },
    },
  });

  return { assignments: assignments.map(buildTeacherAssignmentDto) };
}
