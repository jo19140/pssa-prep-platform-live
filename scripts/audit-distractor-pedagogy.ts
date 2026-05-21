import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { validateDistractorPedagogy } from "@/lib/lessonV2Validators";
import type { LessonV2 } from "@/lib/lessonV2Schema";

const OUTPUT_PATH = path.join(process.cwd(), "audit", "distractor-pedagogy-audit.json");

type LessonRow = {
  id: string;
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  title: string;
  whyAssigned: string;
  guidedPractice: unknown;
  independentPractice: unknown;
  exitTicket: unknown;
  masteryCheck: unknown;
  sourcePayload: unknown;
  qualityScore: number | null;
  qualityIssues: unknown;
  exemplarsUsed: string[];
  teiTypesUsed: string[];
  heroResourceLinkId: string | null;
};

async function main() {
  const rows = await db.learningLesson.findMany({
    where: {
      generatedBy: "PREBUILT_AI_LIBRARY",
      generatorVersion: "V2",
    },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
    select: {
      id: true,
      gradeLevel: true,
      standardCode: true,
      standardLabel: true,
      skill: true,
      title: true,
      whyAssigned: true,
      guidedPractice: true,
      independentPractice: true,
      exitTicket: true,
      masteryCheck: true,
      sourcePayload: true,
      qualityScore: true,
      qualityIssues: true,
      exemplarsUsed: true,
      teiTypesUsed: true,
      heroResourceLinkId: true,
    },
  });

  const offenders = rows
    .map((row) => {
      const lesson = toLessonV2(row);
      const issues = validateDistractorPedagogy(lesson);
      return {
        lessonId: row.id,
        gradeLevel: row.gradeLevel,
        standardCode: row.standardCode,
        skill: row.skill,
        title: row.title,
        qualityScore: row.qualityScore,
        issueCount: issues.length,
        issues,
      };
    })
    .filter((entry) => entry.issueCount > 0);

  const perGrade = new Map<number, { scanned: number; lessonsWithIssues: number; totalIssues: number }>();
  for (const row of rows) {
    const current = perGrade.get(row.gradeLevel) || { scanned: 0, lessonsWithIssues: 0, totalIssues: 0 };
    current.scanned += 1;
    perGrade.set(row.gradeLevel, current);
  }
  for (const offender of offenders) {
    const current = perGrade.get(offender.gradeLevel) || { scanned: 0, lessonsWithIssues: 0, totalIssues: 0 };
    current.lessonsWithIssues += 1;
    current.totalIssues += offender.issueCount;
    perGrade.set(offender.gradeLevel, current);
  }

  const worstOffenders = offenders
    .sort((a, b) => b.issueCount - a.issueCount || a.gradeLevel - b.gradeLevel || a.skill.localeCompare(b.skill))
    .slice(0, 20);

  const report = {
    generatedAt: new Date().toISOString(),
    totalLessonsScanned: rows.length,
    lessonsWithAtLeastOneDistractorIssue: offenders.length,
    totalDistractorIssues: offenders.reduce((sum, entry) => sum + entry.issueCount, 0),
    perGradeBreakdown: Array.from(perGrade.entries())
      .sort(([a], [b]) => a - b)
      .map(([gradeLevel, value]) => ({ gradeLevel, ...value })),
    worstOffenders,
    examples: offenders.flatMap((entry) =>
      entry.issues.slice(0, 3).map((issue) => ({
        lessonId: entry.lessonId,
        gradeLevel: entry.gradeLevel,
        standardCode: entry.standardCode,
        skill: entry.skill,
        issue,
      })),
    ).slice(0, 40),
  };

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Scanned ${report.totalLessonsScanned} V2 PREBUILT_AI_LIBRARY lessons.`);
  console.log(`Lessons with >=1 distractor issue: ${report.lessonsWithAtLeastOneDistractorIssue}`);
  console.log(`Total distractor issues: ${report.totalDistractorIssues}`);
  console.table(report.perGradeBreakdown);
  console.log("\nTop 20 worst offenders:");
  console.table(worstOffenders.map((entry) => ({
    lessonId: entry.lessonId,
    grade: entry.gradeLevel,
    standard: entry.standardCode,
    skill: entry.skill,
    issues: entry.issueCount,
    firstIssue: entry.issues[0],
  })));
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

function toLessonV2(row: LessonRow): LessonV2 {
  const fullLesson = (row.sourcePayload as any)?.fullLesson || {};
  return {
    ...fullLesson,
    gradeLevel: row.gradeLevel,
    standardCode: row.standardCode,
    standardLabel: row.standardLabel,
    skill: row.skill,
    title: row.title,
    whyAssigned: row.whyAssigned,
    guidedPractice: row.guidedPractice as LessonV2["guidedPractice"],
    independentPractice: row.independentPractice as LessonV2["independentPractice"],
    exitTicket: row.exitTicket as LessonV2["exitTicket"],
    masteryCheck: row.masteryCheck as LessonV2["masteryCheck"],
    heroResourceLinkId: row.heroResourceLinkId,
    resourceTitle: fullLesson.resourceTitle || null,
    resourceUrl: fullLesson.resourceUrl || null,
    resourceProvider: fullLesson.resourceProvider || null,
    resourceDescription: fullLesson.resourceDescription || null,
    exemplarsUsed: row.exemplarsUsed || [],
    teiTypesUsed: row.teiTypesUsed || [],
    generatorVersion: "V2",
    qualityScore: row.qualityScore || fullLesson.qualityScore || 0,
    qualityIssues: Array.isArray(row.qualityIssues) ? row.qualityIssues as string[] : fullLesson.qualityIssues || [],
  } as LessonV2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
