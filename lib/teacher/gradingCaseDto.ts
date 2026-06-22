import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { assertNoBannedGradingCaseKeys, buildDiagnosticGradingCase, type GradingCase } from "@/lib/teacher/gradingCaseDtoCore";

export async function loadDiagnosticGradingCasesForTeacher(
  userId: string,
  input: { classRoomId: string; formId: string },
  database: PrismaClient = db,
): Promise<{ cases: GradingCase[] }> {
  const classRoom = await database.classRoom.findFirst({
    where: { id: input.classRoomId, teacher: { userId } },
    include: { enrollments: { include: { studentProfile: { select: { userId: true } } } } },
  });
  if (!classRoom) throw new Error("class_not_found");
  const enrolledUserIds = classRoom.enrollments.map((enrollment) => enrollment.studentProfile.userId);
  if (!enrolledUserIds.length) return { cases: [] };

  const responses = await database.pssaFormResponse.findMany({
    where: {
      scoreStatus: "pending_human_scoring",
      session: {
        formId: input.formId,
        submittedAt: { not: null },
        userId: { in: enrolledUserIds },
      },
      item: { interactionType: { in: ["SHORT_ANSWER", "TDA"] } },
    },
    include: {
      session: { include: { user: { select: { name: true } } } },
      formItem: { include: { item: true } },
      writingEvaluation: { include: { currentDraftAttempt: true } },
    },
    orderBy: [{ session: { user: { name: "asc" } } }, { positionSnapshot: "asc" }],
  });
  const cases = responses.map((response) => buildDiagnosticGradingCase({ response: response as any, classRoomId: input.classRoomId }));
  assertNoBannedGradingCaseKeys(cases);
  return { cases };
}
