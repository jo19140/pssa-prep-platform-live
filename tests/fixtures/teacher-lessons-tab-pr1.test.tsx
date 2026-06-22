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
assert.equal(audit.visibleMax, 23, "Grade 3 max visible library should be 21 core plus 2 writing lessons");

const gradeThreeRows = gradeThreeSeeds.map(rowForSeed);
const gradeThreeList = buildTeacherLessonLibraryList(gradeThreeRows, seeds);
assert.equal(gradeThreeList.lessons.length, 23, "all approved Grade 3 rows should expose only the visible 23");
assert.equal(
  gradeThreeList.lessons.filter((lesson) => lesson.category === "writing").length,
  2,
  "Grade 3 should expose only two supplemental writing lessons",
);
assert.doesNotMatch(
  JSON.stringify(gradeThreeList.lessons),
  /TDA Evidence and Explanation/,
  "hidden Grade 3 TDA lesson must not appear in list metadata",
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

const hiddenTdaRow = gradeThreeRows.find((row) => row.skill === "TDA Evidence and Explanation");
assert.ok(hiddenTdaRow, "hidden Grade 3 TDA fixture row should exist");
assert.equal(
  buildTeacherLessonPreview(hiddenTdaRow.id, gradeThreeRows, seeds).preview,
  null,
  "direct preview of hidden Grade 3 TDA seed should 404 at the route layer",
);

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
