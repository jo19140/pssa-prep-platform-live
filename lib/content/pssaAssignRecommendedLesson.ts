import type { BridgeLesson } from "@/lib/content/pssaLessonBridge";

export type BridgeLessonSeed = {
  gradeLevel: number;
  skill: string;
  standardCode: string;
  standardCodes?: string[];
  pssaBridgeTags?: string[];
};

export type BridgeLearningLessonRow = {
  id: string;
  title: string;
  skill: string;
  gradeLevel: number;
  standardCode: string;
  reviewStatus: string;
};

export type ExistingProgressRow = {
  userId: string;
  status: string;
  guidedResponses?: unknown;
  independentResponses?: unknown;
  exitTicketResponses?: unknown;
  masteryScore?: number | null;
  masteryStatus: string;
  completedAt?: Date | null;
  masteredAt?: Date | null;
};

export type AssignmentOutcome = {
  studentProfileId: string;
  userId: string;
  outcome: "created" | "updated";
};

export function isApprovedLearningLessonReviewStatus(reviewStatus: string) {
  return reviewStatus === "APPROVED";
}

export function assembleBridgeLessons(dbLessons: BridgeLearningLessonRow[], seeds: BridgeLessonSeed[]): BridgeLesson[] {
  const seedByKey = uniqueByGradeSkill(seeds, "seed");
  const dbByKey = uniqueByGradeSkill(dbLessons, "dbLesson");
  const lessons: BridgeLesson[] = [];
  for (const [key, dbLesson] of dbByKey) {
    const seed = seedByKey.get(key);
    if (!seed?.standardCodes || !seed.pssaBridgeTags) continue;
    lessons.push({
      lessonId: dbLesson.id,
      title: dbLesson.title,
      skill: dbLesson.skill,
      gradeLevel: dbLesson.gradeLevel,
      standardCode: dbLesson.standardCode,
      standardCodes: seed.standardCodes,
      pssaBridgeTags: seed.pssaBridgeTags,
      reviewStatus: dbLesson.reviewStatus,
    });
  }
  return lessons.sort((a, b) => a.gradeLevel - b.gradeLevel || a.skill.localeCompare(b.skill) || a.lessonId.localeCompare(b.lessonId));
}

export function parseSchoolDateUtcNoon(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function assertUniqueStudentProfileIds(studentProfileIds: string[]) {
  return new Set(studentProfileIds).size === studentProfileIds.length;
}

export function planAssignmentOutcomes(params: {
  requestedStudentProfileIds: string[];
  profileToUserId: Map<string, string>;
  existingProgressByUserId: Map<string, ExistingProgressRow>;
}): AssignmentOutcome[] {
  return params.requestedStudentProfileIds.map((studentProfileId) => {
    const userId = params.profileToUserId.get(studentProfileId);
    if (!userId) throw new Error(`missing_user_for_student_profile:${studentProfileId}`);
    return {
      studentProfileId,
      userId,
      outcome: params.existingProgressByUserId.has(userId) ? "updated" : "created",
    };
  });
}

function uniqueByGradeSkill<T extends { gradeLevel: number; skill: string }>(rows: T[], label: string) {
  const byKey = new Map<string, T>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const key = gradeSkillKey(row);
    if (byKey.has(key)) duplicates.add(key);
    else byKey.set(key, row);
  }
  if (duplicates.size) throw new Error(`ambiguous_bridge_${label}_grade_skill:${[...duplicates].sort().join(",")}`);
  return byKey;
}

function gradeSkillKey(row: { gradeLevel: number; skill: string }) {
  return `${row.gradeLevel}:${row.skill}`;
}
