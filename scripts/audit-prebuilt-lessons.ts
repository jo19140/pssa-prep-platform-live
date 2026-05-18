import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { db } from "../lib/db";

const OUTPUT_DIR = path.join(process.cwd(), "audit");

async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const lessons = await db.learningLesson.findMany({
    where: { generatedBy: "PREBUILT_AI_LIBRARY" },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { skill: "asc" }],
    include: { heroResourceLink: true },
  });

  console.log(`\nFound ${lessons.length} PREBUILT_AI_LIBRARY lessons\n`);

  // Slim down to assessment-relevant fields
  const slim = lessons.map((lesson) => ({
    id: lesson.id,
    gradeLevel: lesson.gradeLevel,
    standardCode: lesson.standardCode,
    standardLabel: lesson.standardLabel,
    skill: lesson.skill,
    title: lesson.title,
    reviewStatus: lesson.reviewStatus,
    hasHeroVideo: Boolean(lesson.heroResourceLinkId),
    heroVideoTitle: lesson.heroResourceLink?.title || null,
    heroVideoGrade: lesson.heroResourceLink?.gradeLevel || null,
    lessonExplanation: lesson.lessonExplanation,
    workedExample: lesson.workedExample,
    guidedPractice: lesson.guidedPractice,
    independentPractice: lesson.independentPractice,
    exitTicket: lesson.exitTicket,
    masteryCheck: lesson.masteryCheck,
    retestRecommendation: lesson.retestRecommendation,
  }));

  writeFileSync(path.join(OUTPUT_DIR, "prebuilt-lessons.json"), JSON.stringify(slim, null, 2));

  // Print summary table
  const byGrade = new Map<number, number>();
  const byStrand = new Map<string, number>();
  const withVideo = slim.filter((l) => l.hasHeroVideo).length;
  const byReviewStatus = new Map<string, number>();

  for (const lesson of slim) {
    byGrade.set(lesson.gradeLevel, (byGrade.get(lesson.gradeLevel) || 0) + 1);
    const strand = lesson.standardCode.slice(0, 6); // "CC.1.1", "CC.1.2", etc.
    byStrand.set(strand, (byStrand.get(strand) || 0) + 1);
    byReviewStatus.set(lesson.reviewStatus, (byReviewStatus.get(lesson.reviewStatus) || 0) + 1);
  }

  console.log("=== Grade distribution ===");
  Array.from(byGrade.entries()).sort().forEach(([g, c]) => console.log(`  Grade ${g}: ${c}`));

  console.log("\n=== Strand distribution ===");
  Array.from(byStrand.entries()).sort().forEach(([s, c]) => console.log(`  ${s}.x: ${c}`));

  console.log("\n=== Hero video coverage ===");
  console.log(`  With video: ${withVideo} / ${slim.length} (${Math.round((withVideo / slim.length) * 100)}%)`);

  console.log("\n=== Review status ===");
  Array.from(byReviewStatus.entries()).forEach(([s, c]) => console.log(`  ${s}: ${c}`));

  // Per-lesson sanity checks
  console.log("\n=== Per-lesson sanity flags ===");
  let shortExplanation = 0;
  let shortWorkedExample = 0;
  let lowQuestionCount = 0;
  let missingPassage = 0;
  let videoGradeMismatch = 0;

  for (const lesson of slim) {
    if ((lesson.lessonExplanation || "").length < 400) shortExplanation += 1;
    if ((lesson.workedExample || "").length < 200) shortWorkedExample += 1;
    const totalQs =
      (Array.isArray(lesson.guidedPractice) ? lesson.guidedPractice.length : 0) +
      (Array.isArray(lesson.independentPractice) ? lesson.independentPractice.length : 0) +
      (Array.isArray(lesson.exitTicket) ? lesson.exitTicket.length : 0) +
      (Array.isArray(lesson.masteryCheck) ? lesson.masteryCheck.length : 0);
    if (totalQs < 8) lowQuestionCount += 1;

    // Check if questions have passages for reading-comprehension standards
    const isReading = lesson.standardCode.startsWith("CC.1.2") || lesson.standardCode.startsWith("CC.1.3");
    if (isReading) {
      const allQs = [
        ...(Array.isArray(lesson.guidedPractice) ? lesson.guidedPractice : []),
        ...(Array.isArray(lesson.independentPractice) ? lesson.independentPractice : []),
      ] as any[];
      const withPassage = allQs.filter((q) => q.passage && q.passage.length > 100).length;
      if (withPassage === 0 && allQs.length > 0) missingPassage += 1;
    }

    if (lesson.heroVideoGrade && Math.abs(lesson.heroVideoGrade - lesson.gradeLevel) > 1) {
      videoGradeMismatch += 1;
    }
  }

  console.log(`  Short explanation (<400 chars): ${shortExplanation}`);
  console.log(`  Short worked example (<200 chars): ${shortWorkedExample}`);
  console.log(`  Low total question count (<8): ${lowQuestionCount}`);
  console.log(`  Reading lessons missing passages: ${missingPassage}`);
  console.log(`  Hero video grade mismatch (>1 off): ${videoGradeMismatch}`);

  console.log(`\nFull data written to: ${path.join(OUTPUT_DIR, "prebuilt-lessons.json")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
