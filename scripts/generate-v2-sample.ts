import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { generateLessonV2, type GenerateLessonV2Input } from "@/lib/lessonGeneratorV2";
import { allPracticeQuestions, type LessonV2 } from "@/lib/lessonV2Schema";

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "audit", "v2-samples");

const lessonRequests: GenerateLessonV2Input[] = [
  { gradeLevel: 3, standardCode: "CC.1.2.3.A", standardLabel: "Main idea and supporting details", skill: "Main Idea and Supporting Details" },
  { gradeLevel: 3, standardCode: "CC.1.4.3.F", standardLabel: "Conventions of standard English", skill: "Verb Tense" },
  { gradeLevel: 4, standardCode: "CC.1.3.4.C", standardLabel: "Describe characters, setting, or events", skill: "Character Analysis" },
  { gradeLevel: 4, standardCode: "CC.1.4.4.C", standardLabel: "Organization and transitions", skill: "Organizing Ideas with Transitions" },
  { gradeLevel: 5, standardCode: "CC.1.2.5.F", standardLabel: "Vocabulary in context", skill: "Vocabulary in Context" },
  { gradeLevel: 5, standardCode: "CC.1.2.5.E", standardLabel: "Text structure", skill: "Text Structure and Signal Words" },
  { gradeLevel: 6, standardCode: "CC.1.3.6.B", standardLabel: "Citing textual evidence", skill: "Inference and Text Evidence" },
  { gradeLevel: 6, standardCode: "CC.1.4.6.F", standardLabel: "Conventions of standard English", skill: "Subject-Verb Agreement" },
  { gradeLevel: 7, standardCode: "CC.1.2.7.B", standardLabel: "Cite evidence from informational text", skill: "Evidence Selection" },
  { gradeLevel: 8, standardCode: "CC.1.3.8.A", standardLabel: "Theme or central idea", skill: "Theme Development" },
];

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for V2 sample generation.");
  const limit = readLimitArg();
  const outputDir = readOutputDirArg();
  const requests = limit ? lessonRequests.slice(0, limit) : lessonRequests;
  mkdirSync(outputDir, { recursive: true });
  const lessons: LessonV2[] = [];
  for (const [index, request] of requests.entries()) {
    console.log(`\nGenerating V2 sample ${index + 1}/${requests.length}: grade ${request.gradeLevel} ${request.standardCode} ${request.skill}`);
    const result = await generateLessonV2({
      ...request,
      commonError: "Students need targeted practice with PSSA-style reasoning, evidence use, and technology-enhanced item formats.",
    });
    const filename = `sample-${String(index + 1).padStart(2, "0")}-g${request.gradeLevel}-${slug(request.skill)}.json`;
    writeFileSync(path.join(outputDir, filename), `${JSON.stringify(result, null, 2)}\n`);
    lessons.push(result.lesson);
    console.log(`  quality=${result.lesson.qualityScore} iterations=${result.iterations} tei=${result.lesson.teiTypesUsed.join(", ") || "none"} issues=${result.lesson.qualityIssues.length}`);
    if (index < requests.length - 1) await sleep(8000);
  }

  const averageQuality = lessons.reduce((sum, lesson) => sum + lesson.qualityScore, 0) / lessons.length;
  const teiTypes = Array.from(new Set(lessons.flatMap((lesson) => lesson.teiTypesUsed))).sort();
  const duplicatePairs = findDuplicatePassages(lessons);
  const summary = {
    generatedAt: new Date().toISOString(),
    lessonCount: lessons.length,
    averageQuality,
    teiTypes,
    duplicatePairs,
    lessons: lessons.map((lesson) => ({
      title: lesson.title,
      gradeLevel: lesson.gradeLevel,
      standardCode: lesson.standardCode,
      skill: lesson.skill,
      qualityScore: lesson.qualityScore,
      qualityIssues: lesson.qualityIssues,
      teiTypesUsed: lesson.teiTypesUsed,
      heroResourceLinkId: lesson.heroResourceLinkId,
      resourceTitle: lesson.resourceTitle,
      resourceUrl: lesson.resourceUrl,
      resourceProvider: lesson.resourceProvider,
    })),
  };
  writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log("\n=== V2 sample summary ===");
  console.log(`Lessons generated: ${lessons.length}`);
  console.log(`Average qualityScore: ${averageQuality.toFixed(1)}`);
  console.log(`Distinct TEI types (${teiTypes.length}): ${teiTypes.join(", ")}`);
  console.log(`Duplicate passage pairs: ${duplicatePairs.length}`);
  if (averageQuality < 85) throw new Error(`Average qualityScore ${averageQuality.toFixed(1)} is below 85.`);
  if (!limit && teiTypes.length < 6) throw new Error(`Expected at least 6 TEI types across samples, found ${teiTypes.length}.`);
  if (duplicatePairs.length) throw new Error("Duplicate passages detected across generated samples.");
}

function readLimitArg() {
  const arg = process.argv.find((value) => value.startsWith("--limit="));
  if (!arg) return null;
  const value = Number(arg.split("=")[1]);
  if (!Number.isInteger(value) || value < 1) throw new Error("--limit must be a positive integer.");
  return Math.min(value, lessonRequests.length);
}

function readOutputDirArg() {
  const arg = process.argv.find((value) => value.startsWith("--output-dir="));
  if (!arg) return DEFAULT_OUTPUT_DIR;
  return path.resolve(arg.split("=")[1]);
}

function findDuplicatePassages(lessons: LessonV2[]) {
  const seen = new Set<string>();
  const passages = lessons.flatMap((lesson) => allPracticeQuestions(lesson)
    .map((question) => question.passage)
    .filter((passage): passage is string => Boolean(passage && passage.length > 100))
    .map((passage) => ({ lesson: lesson.title, passage })))
    .filter((entry) => {
      const key = entry.passage.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const duplicates: Array<{ a: string; b: string; similarity: number }> = [];
  for (let a = 0; a < passages.length; a += 1) {
    for (let b = a + 1; b < passages.length; b += 1) {
      const similarity = jaccard(passages[a].passage, passages[b].passage);
      if (similarity > 0.92) duplicates.push({ a: passages[a].lesson, b: passages[b].lesson, similarity });
    }
  }
  return duplicates;
}

function jaccard(a: string, b: string) {
  const aTokens = new Set(tokens(a));
  const bTokens = new Set(tokens(b));
  const intersection = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size || 1;
  return intersection / union;
}

function tokens(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 3);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
