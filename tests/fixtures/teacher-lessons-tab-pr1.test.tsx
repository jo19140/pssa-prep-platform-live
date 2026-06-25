import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildPrebuiltLessonSeeds } from "../../lib/prebuiltLessonLibrary";
import {
  auditGradeThreeLessonSeeds,
  buildTeacherLessonLibraryList,
  buildTeacherLessonPreview,
  TeacherLessonLibraryIntegrityError,
  type TeacherLessonDbRowInput,
  type TeacherLessonSeedInput,
} from "../../lib/teacher/teacherLessonLibraryCore";

const root = process.cwd();
const seeds = buildPrebuiltLessonSeeds();
const gradeThreeSeeds = seeds.filter((seed) => seed.gradeLevel === 3);

const audit = auditGradeThreeLessonSeeds(seeds);
assert.equal(audit.total, 27, "Grade 3 source audit must cover all 27 seeds");
assert.deepEqual(
  audit.counts,
  {
    key_ideas_evidence: 8,
    craft_structure: 5,
    vocabulary: 5,
    conventions: 3,
    writing_tda: 3,
    foundational_support: 1,
    exclude_from_grade3_bridge: 2,
  },
  "Grade 3 top-level bridge counts must match the PR1 audit target",
);
assert.equal(audit.visibleMax, 24, "Grade 3 max visible library should be 21 core plus 3 writing lessons");

const gradeThreeRows = gradeThreeSeeds.map(rowForSeed);
const gradeThreeList = buildTeacherLessonLibraryList(gradeThreeRows, seeds);
assert.equal(gradeThreeList.lessons.length, 24, "all approved Grade 3 rows should expose the visible 24");
assert.equal(
  gradeThreeList.lessons.filter((lesson) => lesson.category === "writing").length,
  3,
  "Grade 3 should expose three supplemental writing lessons",
);
assert.doesNotMatch(
  JSON.stringify(gradeThreeList.lessons),
  /TDA Evidence and Explanation/,
  "raw Grade 3 TDA join key must not appear in list metadata",
);

const firstLesson = gradeThreeList.lessons[0];
assert.ok(firstLesson, "fixture should produce at least one visible lesson");
assert.deepEqual(Object.keys(firstLesson).sort(), [
  "approvalStatus",
  "category",
  "categoryLabel",
  "domain",
  "gradeLevel",
  "id",
  "placement",
  "skill",
  "standardCodes",
  "title",
].sort(), "list items must stay metadata-only");
assert.equal("lessonExplanation" in firstLesson, false, "list must not include lesson body content");
assert.equal("pssaBridgeTags" in firstLesson, false, "list must not expose raw bridge tags");

const firstPreview = buildTeacherLessonPreview(firstLesson.id, gradeThreeRows, seeds).preview;
assert.ok(firstPreview, "visible approved lesson should preview");
assert.ok(firstPreview.lessonExplanation.length > 0, "preview must include lesson explanation");
assert.ok(firstPreview.guidedPractice[0]?.choices.length, "preview must include teacher-visible choices");
assert.ok(firstPreview.guidedPractice[0]?.correctAnswer, "preview must include teacher-visible answer key");
assert.ok(firstPreview.guidedPractice[0]?.explanation, "preview must include teacher-visible explanation");

const shortResponseRow = gradeThreeRows.find((row) => row.skill === "TDA Evidence and Explanation");
assert.ok(shortResponseRow, "Grade 3 short-response fixture row should preserve the internal join key");
const shortResponseListItem = gradeThreeList.lessons.find((lesson) => lesson.id === shortResponseRow.id);
assert.ok(shortResponseListItem, "Grade 3 short-response writing lesson should be visible");
assert.equal(shortResponseListItem.title, "Text Evidence and Explanation in a Short Response");
assert.equal(shortResponseListItem.skill, "Text Evidence and Explanation", "teacher-facing DTO must map the raw key to a clean display skill");
assert.equal(shortResponseListItem.categoryLabel, "Writing & Short Answer");
const shortResponsePreview = buildTeacherLessonPreview(shortResponseRow.id, gradeThreeRows, seeds).preview;
assert.ok(shortResponsePreview, "direct preview of corrected Grade 3 short-response seed should be visible");
assert.equal(shortResponsePreview.skill, "Text Evidence and Explanation");
assert.equal(shortResponsePreview.standardLabel, "Use text evidence and explanation in a short written response");
assert.equal(shortResponsePreview.standardCodes[0], "CC.1.4.3.S");
assert.equal(shortResponsePreview.teacherNote, "Grade 3 short-response practice; not an official TDA task.");
assertNoTdaExceptTeacherNote(shortResponsePreview);
assertBalancedAnswerPositions(shortResponsePreview);
assertDistinctQuestions(shortResponsePreview);
assertNoRepeatPadding(shortResponsePreview);

const foundationalRow = gradeThreeRows.find((row) => row.skill === "Short and Long Vowel Patterns");
assert.ok(foundationalRow, "foundational fixture row should exist");
assert.equal(
  buildTeacherLessonPreview(foundationalRow.id, gradeThreeRows, seeds).preview,
  null,
  "direct preview of foundational support should 404 at the route layer",
);

const unmatchedResult = buildTeacherLessonLibraryList(
  [{ ...rowForSeed(gradeThreeSeeds[0]), id: "unmatched", skill: "Not in seeds" }],
  seeds,
);
assert.equal(unmatchedResult.lessons.length, 0, "unmatched approved rows should be excluded");
assert.equal(unmatchedResult.auditWarnings[0]?.code, "approved_row_unmatched_seed", "unmatched rows should warn");

const missingNonGradeThreeSeed = {
  ...gradeFourTdaSeed(),
  pssaBridgeTags: undefined,
};
const missingNonGradeThree = buildTeacherLessonLibraryList(
  [rowForSeed(missingNonGradeThreeSeed)],
  [missingNonGradeThreeSeed],
);
assert.equal(missingNonGradeThree.lessons.length, 0, "non-Grade 3 missing metadata should be excluded, not guessed");
assert.equal(missingNonGradeThree.auditWarnings[0]?.code, "approved_row_missing_metadata", "missing metadata should warn");

const taggedGradeFourTda = {
  ...gradeFourTdaSeed(),
  pssaBridgeTags: ["writing_tda", "text_dependent_analysis", "writing"],
} satisfies TeacherLessonSeedInput;
const gradeFourTdaList = buildTeacherLessonLibraryList([rowForSeed(taggedGradeFourTda)], [taggedGradeFourTda]);
assert.equal(gradeFourTdaList.lessons.length, 1, "tagged Grade 4 TDA should not be hidden");
assert.equal(gradeFourTdaList.lessons[0]?.categoryLabel, "Writing & TDA", "upper-grade TDA label should remain intact");
assert.match(JSON.stringify(taggedGradeFourTda), /\bTDA\b/, "Grade 4 TDA lesson must still contain TDA language");
const gradeEightTdaSeed = seeds.find((candidate) => candidate.gradeLevel === 8 && candidate.skill === "TDA Evidence and Explanation");
assert.ok(gradeEightTdaSeed, "Grade 8 TDA seed should exist");
assert.match(JSON.stringify(gradeEightTdaSeed), /\bTDA\b/, "Grade 8 TDA lesson must still contain TDA language");

assert.throws(
  () => buildTeacherLessonLibraryList([rowForSeed(gradeThreeSeeds[0])], [gradeThreeSeeds[0], { ...gradeThreeSeeds[0] }]),
  TeacherLessonLibraryIntegrityError,
  "duplicate seed keys should fail integrity",
);
assert.throws(
  () => buildTeacherLessonLibraryList([rowForSeed(gradeThreeSeeds[0]), { ...rowForSeed(gradeThreeSeeds[0]), id: "dupe-row" }], seeds),
  TeacherLessonLibraryIntegrityError,
  "duplicate approved database keys should fail integrity",
);
assert.throws(
  () => buildTeacherLessonLibraryList([rowForSeed({ ...gradeThreeSeeds[0], pssaBridgeTags: ["key_ideas_evidence", "vocabulary"] })], [{ ...gradeThreeSeeds[0], pssaBridgeTags: ["key_ideas_evidence", "vocabulary"] }]),
  TeacherLessonLibraryIntegrityError,
  "multiple recognized top-level tags should fail integrity",
);

const listRoute = read("app/api/teacher/learning-lessons/route.ts");
assert.match(listRoute, /export async function GET/, "list route must expose GET");
assert.doesNotMatch(listRoute, /export async function (POST|PUT|PATCH|DELETE)/, "list route must not expose mutations");
assert.match(listRoute, /requireUser\(\["TEACHER", "ADMIN"\]\)/, "list route must deny non-teacher roles");
assert.match(listRoute, /Cache-Control": "no-store"/, "list route must be no-store");

const previewRoute = read("app/api/teacher/learning-lessons/[lessonId]/route.ts");
assert.match(previewRoute, /export async function GET/, "preview route must expose GET");
assert.doesNotMatch(previewRoute, /export async function (POST|PUT|PATCH|DELETE)/, "preview route must not expose mutations");
assert.match(previewRoute, /requireUser\(\["TEACHER", "ADMIN"\]\)/, "preview route must deny non-teacher roles");
assert.match(previewRoute, /status: 404/, "hidden or unmatched direct previews must return 404");
assert.match(previewRoute, /Cache-Control": "no-store"/, "preview route must be no-store");

const teacherPage = read("app/teacher/page.tsx");
assert.match(teacherPage, /activeTab === "lessons"[\s\S]*<TeacherLessonsTab \/>/, "Lessons tab must render inside /teacher frame");
assert.match(teacherPage, /<TeacherPssaInsightsClient \/>/, "Reports path must keep existing insights client");

const lessonsTab = read("components/teacher/TeacherLessonsTab.tsx");
assert.match(lessonsTab, /gradeOptions = useMemo/, "grades must be derived from visible approved data");
assert.match(lessonsTab, /lesson\.gradeLevel/, "grade filter must use lesson data");
assert.match(lessonsTab, /Assign lesson/, "Lessons tab may render the PR2C Assign lesson control");
assert.doesNotMatch(lessonsTab, /StudentLessonProgress|studentLessonProgress|method:\s*"PUT"|method:\s*"PATCH"|method:\s*"DELETE"/, "Lessons tab must not write student lesson progress or mutate PR1 routes directly");
assert.match(lessonsTab, /Supplemental writing practice/, "Grade 3 writing group should be presented as supplemental writing practice");

const previewDialog = read("components/teacher/TeacherLessonPreviewDialog.tsx");
assert.doesNotMatch(previewDialog, /dangerouslySetInnerHTML/, "preview must render text safely");
assert.doesNotMatch(previewDialog, /Assign/, "preview must not render Assign controls");
assert.match(previewDialog, /AbortController/, "preview fetch must abort stale requests");
assert.match(previewDialog, /Retry/, "preview must expose retry on load failure");

const newFiles = [
  "app/api/teacher/learning-lessons/route.ts",
  "app/api/teacher/learning-lessons/[lessonId]/route.ts",
  "components/teacher/TeacherLessonsTab.tsx",
  "components/teacher/TeacherLessonPreviewDialog.tsx",
  "lib/teacher/teacherLessonLibrary.ts",
  "lib/teacher/teacherLessonLibraryCore.ts",
].map(read).join("\n");
assert.doesNotMatch(newFiles, /StudentLessonProgress|studentLessonProgress/, "PR1 files must not write student lesson progress");

console.log("teacher Lessons tab PR1 checks passed");

function assertNoTdaExceptTeacherNote(preview: NonNullable<ReturnType<typeof buildTeacherLessonPreview>["preview"]>) {
  const allowed = "Grade 3 short-response practice; not an official TDA task.";
  const sanitized = JSON.stringify(preview).replace(allowed, "");
  assert.doesNotMatch(sanitized, /\bTDA\b/, "Grade 3 teacher-facing list/preview content must not render TDA outside the approved teacher note");
  assert.doesNotMatch(sanitized, /TDA Evidence and Explanation/, "raw internal join key must never leak into Grade 3 teacher-facing DTO");
}

function assertBalancedAnswerPositions(preview: NonNullable<ReturnType<typeof buildTeacherLessonPreview>["preview"]>) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  const questions = allQuestions(preview);
  assert.equal(questions.length, 12, "Grade 3 short-response lesson should expose exactly 12 authored practice items");
  for (const question of questions) {
    const index = question.choices.indexOf(question.correctAnswer);
    assert.ok(index >= 0, "correct answer must appear in choices");
    counts[["A", "B", "C", "D"][index] as keyof typeof counts] += 1;
  }
  assert.deepEqual(counts, { A: 3, B: 3, C: 3, D: 3 }, "Grade 3 correct answer positions must be balanced");
}

function assertDistinctQuestions(preview: NonNullable<ReturnType<typeof buildTeacherLessonPreview>["preview"]>) {
  const questions = allQuestions(preview).map((question) => question.question);
  assert.equal(new Set(questions).size, questions.length, "Grade 3 short-response items must be distinct");
}

function assertNoRepeatPadding(preview: NonNullable<ReturnType<typeof buildTeacherLessonPreview>["preview"]>) {
  assert.equal(preview.guidedPractice.length, 4, "guided practice should fill the minimum without padding repeats");
  assert.equal(preview.independentPractice.length, 5, "independent practice should fill the minimum without padding repeats");
  assert.equal(preview.exitTicket.length, 1, "exit ticket should remain one item");
  assert.equal(preview.masteryCheck.length, 2, "grade 3 mastery should fill the minimum without padding repeats");
  assert.doesNotMatch(JSON.stringify(allQuestions(preview)), /Guided 3:|Guided 4:|Independent 4:|Independent 5:/, "expanded repeat labels should not be generated for Grade 3 short-response items");
}

function allQuestions(preview: NonNullable<ReturnType<typeof buildTeacherLessonPreview>["preview"]>) {
  return [...preview.guidedPractice, ...preview.independentPractice, ...preview.exitTicket, ...preview.masteryCheck];
}

function rowForSeed(seed: TeacherLessonSeedInput): TeacherLessonDbRowInput {
  return {
    id: `${seed.gradeLevel}-${seed.skill.replace(/\W+/g, "-").toLowerCase()}`,
    title: seed.title,
    gradeLevel: seed.gradeLevel,
    standardCode: seed.standardCode,
    standardLabel: seed.standardLabel,
    skill: seed.skill,
    reviewStatus: "APPROVED",
  };
}

function gradeFourTdaSeed() {
  const seed = seeds.find((candidate) => candidate.gradeLevel === 4 && candidate.skill === "TDA Evidence and Explanation");
  assert.ok(seed, "Grade 4 TDA seed should exist");
  return seed;
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
