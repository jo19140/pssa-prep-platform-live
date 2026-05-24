import type { Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { LITERACY_STRANDS, SYLLABLE_TYPES } from "@/lib/literacy/constants";

export async function ensureLiteracyProfile(studentUserId: string) {
  const profile = await db.literacyProfile.upsert({
    where: { studentUserId },
    update: {},
    create: {
      studentUserId,
      strandScores: {
        create: LITERACY_STRANDS.map((strand, index) => ({
          strand,
          score: 0,
          level: "UNTESTED",
          priorityRank: index + 1,
          evidenceCount: 0,
        })),
      },
      syllableTypeMastery: {
        create: SYLLABLE_TYPES.map((syllableType) => ({
          syllableType,
          level: "UNTESTED",
        })),
      },
    },
  });
  await ensurePhonogramMasteryRecords(profile.id);
  return profile;
}

export async function ensurePhonogramMasteryRecords(literacyProfileId: string) {
  const families = await db.phonogramFamily.findMany({ select: { id: true } });
  await Promise.all(
    families.map((family) =>
      db.phonogramMastery.upsert({
        where: { literacyProfileId_phonogramFamilyId: { literacyProfileId, phonogramFamilyId: family.id } },
        update: {},
        create: { literacyProfileId, phonogramFamilyId: family.id, level: "UNTESTED" },
      }),
    ),
  );
}

export async function getFullLiteracyProfile(studentUserId: string) {
  const profile = await ensureLiteracyProfile(studentUserId);
  return db.literacyProfile.findUnique({
    where: { id: profile.id },
    include: {
      student: { include: { studentProfile: true } },
      strandScores: { orderBy: { priorityRank: "asc" } },
      phonogramMastery: { include: { phonogramFamily: true } },
      syllableTypeMastery: true,
      dialectSettings: true,
      autopilotDecisions: { orderBy: { appliedAt: "desc" }, take: 10 },
      voiceSessions: { orderBy: { startedAt: "desc" }, take: 8 },
    },
  });
}

export async function canAccessStudent(currentUser: User | { id: string; role: string }, studentUserId: string) {
  if (currentUser.role === "ADMIN") return true;
  if (currentUser.role === "STUDENT") return currentUser.id === studentUserId;
  if (currentUser.role === "TEACHER") {
    const student = await db.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!student) return false;
    const teacher = await db.teacherProfile.findUnique({ where: { userId: currentUser.id } });
    if (!teacher) return false;
    if (student.teacherId === teacher.id) return true;
    const enrollment = await db.enrollment.findFirst({
      where: { studentProfileId: student.id, classRoom: { teacherId: teacher.id } },
    });
    return Boolean(enrollment);
  }
  if (currentUser.role === "PARENT") {
    const parent = await db.parentProfile.findUnique({ where: { userId: currentUser.id } });
    const student = await db.studentProfile.findUnique({ where: { userId: studentUserId } });
    if (!parent || !student) return false;
    const link = await db.parentStudentLink.findUnique({
      where: { parentProfileId_studentProfileId: { parentProfileId: parent.id, studentProfileId: student.id } },
    });
    return Boolean(link);
  }
  return false;
}

export function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
