import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMoyConventionsItems, buildMoyConventionsPacket } from "./content/author-pssa-moy-conventions";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_moy_conventions/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildMoyConventionsPacket();
const items = packet.items ?? buildMoyConventionsItems();

assert.equal(packet.noDbWrite, true, "MOY conventions backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "MOY conventions backend must not be production import ready");
assert.equal(items.length, 9, "MOY conventions must author exactly 9 items");

const expected = [
  ["pssa_item_g3_moy_conv_d111_word_function", "E03.D.1.1.1", "word function in a sentence", "word_function", 1],
  ["pssa_item_g3_moy_conv_d114_irregular_verb", "E03.D.1.1.4", "regular and irregular verbs", "regular_irregular_verbs", 3],
  ["pssa_item_g3_moy_conv_d115_verb_tense", "E03.D.1.1.5", "simple verb tense", "verb_tense", 0],
  ["pssa_item_g3_moy_conv_d116_agreement", "E03.D.1.1.6", "subject-verb agreement", "subject_verb_agreement", 2],
  ["pssa_item_g3_moy_conv_d118_conjunctions", "E03.D.1.1.8", "coordinating and subordinating conjunctions", "conjunctions", 0],
  ["pssa_item_g3_moy_conv_d121_title_caps", "E03.D.1.2.1", "capitalization in titles", "title_capitalization", 2],
  ["pssa_item_g3_moy_conv_d123_dialogue", "E03.D.1.2.3", "quotation marks and commas in dialogue", "dialogue_punctuation", 1],
  ["pssa_item_g3_moy_conv_d125_spelling", "E03.D.1.2.5", "grade-level spelling and suffixes", "spelling_in_context", 3],
  ["pssa_item_g3_moy_conv_d211_word_choice", "E03.D.2.1.1", "word or phrase choice for effect", "word_choice_for_effect", 0],
] as const;

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.targetConvention, item.targetSubskill, item.blanks[0].correctIndex]),
  expected,
  "MOY conventions EC/target/key table must match spec",
);
assert.equal(new Set(items.map((item: any) => item.eligibleContent)).size, 9, "MOY conventions ECs must not repeat");

const keyCounts = [0, 0, 0, 0];
for (const item of items) keyCounts[item.blanks[0].correctIndex] += 1;
assert.deepEqual(keyCounts, [3, 2, 2, 2], "MOY conventions key tally must be A3/B2/C2/D2");

for (const item of items) {
  assert.equal(item.interactionType, "INLINE_DROPDOWN", `${item.itemId} interactionType`);
  assert.equal(item.itemType, "INLINE_DROPDOWN", `${item.itemId} itemType`);
  assert.equal(item.interactionSubtype, "single_blank", `${item.itemId} interactionSubtype`);
  assert.equal(item.pointValue, 1, `${item.itemId} pointValue`);
  assert.equal(item.passageId, null, `${item.itemId} passageId`);
  assert.equal(item.ecSkillFamily, "conventions", `${item.itemId} ecSkillFamily`);
  assert.equal(item.reportingCategory, "D", `${item.itemId} reportingCategory`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  assert.equal(item.section, undefined, `${item.itemId} must not set section`);
  assert.equal(item.passageGroupId, undefined, `${item.itemId} must not set passageGroupId`);
  assert.equal(item.textFeaturesJson, undefined, `${item.itemId} must not set textFeaturesJson`);
  assert.equal(item.factCheckNotesJson, undefined, `${item.itemId} must not set factCheckNotesJson`);
  assert.equal(item.distractorRole, undefined, `${item.itemId} must not set item-level distractorRole`);
  const blank = item.blanks[0];
  assert.equal(item.blanks.length, 1, `${item.itemId} must have one blank`);
  assert.equal(blank.options.length, 4, `${item.itemId} must have four options`);
  assert.equal(blank.options[blank.correctIndex].errorPattern, null, `${item.itemId} correct option errorPattern`);
  assert.equal(new Set(blank.options.map((option: any) => option.text)).size, 4, `${item.itemId} option texts must be unique`);
  const distractorPatterns = blank.options.filter((_option: any, index: number) => index !== blank.correctIndex).map((option: any) => option.errorPattern);
  assert.equal(distractorPatterns.every((pattern: any) => typeof pattern === "string" && pattern.trim().length > 0), true, `${item.itemId} distractors must have non-null errorPattern`);
  assert.equal(new Set(distractorPatterns).size, 3, `${item.itemId} distractor errorPatterns must be distinct`);
  for (const option of blank.options) {
    assert.equal(option.distractorRole, undefined, `${item.itemId} option must not carry distractorRole`);
    assert.equal(String(option.rationale ?? "").trim().length > 20, true, `${item.itemId} option rationale must be specific`);
  }
  assertMeaningfulOptionOutliers(item);
  const dto = projectPssaStudentItem(item) as any;
  assert.equal(JSON.stringify(dto).includes("errorPattern"), false, `${item.itemId} student DTO must hide errorPattern`);
  assert.equal(JSON.stringify(dto).includes("rationale"), false, `${item.itemId} student DTO must hide rationale`);
  assert.deepEqual(
    scorePssaItem(item, { blankSelections: { [blank.blankId]: blank.correctIndex } }),
    { status: "scored", pointsEarned: 1, maxPoints: 1, detail: "inline_dropdown_full_credit" },
    `${item.itemId} must be scoreable`,
  );
}

assertNoReuseAgainstSources(items);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_moy_conventions/student_preview.md", "utf8");
assert.equal(/correctIndex|errorPattern|rationale|answerKey|distractorRole/i.test(studentPreview), false, "MOY conventions student preview must be leak-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_moy_conventions/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "MOY conventions reviewer preview must include keys");
assert.equal(reviewerPreview.includes("errorPattern"), false, "MOY conventions reviewer preview should show labels without leaking machine key name");
assert.equal(reviewerPreview.includes("adjective_used_where_adverb_needed"), true, "MOY conventions reviewer preview must include error pattern values");

function normalize(text: unknown) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function optionSet(options: any[]) {
  return options.map((option) => normalize(typeof option === "string" ? option : option.text)).sort().join("|");
}

function sourceRows() {
  const files = [
    "exemplars/pssa_grade3_conventions/grade3_conventions_backend.json",
    "exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json",
  ];
  const rows: Array<{ itemId: string; stem: string; target: string; options: string }> = [];
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of parsed.items ?? []) {
      const blanks = item.blanks ?? [];
      const blank = blanks[0];
      const rawOptions = blank?.options ?? item.answerChoicesJson ?? item.choices ?? item.structuredChoicesJson ?? [];
      const target = blank?.targetWordOrPhrase ?? item.correctAnswer ?? (Number.isInteger(item.correctIndex) ? rawOptions[item.correctIndex] : "");
      rows.push({
        itemId: item.itemId ?? item.id,
        stem: normalize(item.stem ?? item.studentFacingPrompt ?? item.baseTextWithBlanks),
        target: normalize(typeof target === "string" ? target : target?.text),
        options: optionSet(rawOptions),
      });
    }
  }
  return rows;
}

function assertNoReuseAgainstSources(moyItems: any[]) {
  const sources = sourceRows();
  for (const item of moyItems) {
    const blank = item.blanks[0];
    const current = {
      stem: normalize(item.stem ?? item.baseTextWithBlanks),
      target: normalize(blank.targetWordOrPhrase),
      options: optionSet(blank.options),
    };
    for (const source of sources) {
      assert.notEqual(current.stem, source.stem, `${item.itemId} stem reuses ${source.itemId}`);
      assert.notEqual(current.target, source.target, `${item.itemId} target/correct answer reuses ${source.itemId}`);
      assert.notEqual(current.options, source.options, `${item.itemId} option set reuses ${source.itemId}`);
    }
  }
}

function assertMeaningfulOptionOutliers(item: any) {
  const blank = item.blanks[0];
  const correct = blank.options[blank.correctIndex].text;
  const distractors = blank.options.filter((_option: any, index: number) => index !== blank.correctIndex).map((option: any) => option.text);
  assert.equal(correct.trim().split(/\s+/).length > 1 && distractors.every((text: string) => text.trim().split(/\s+/).length === 1), false, `${item.itemId} correct option must not be the only multiword option`);
  const correctLen = correct.length;
  const lens = distractors.map((text: string) => text.length);
  const soleLongestByMargin = lens.every((len: number) => correctLen > len * 1.35);
  const soleShortestByMargin = lens.every((len: number) => correctLen * 1.35 < len);
  assert.equal(soleLongestByMargin || soleShortestByMargin, false, `${item.itemId} correct option must not be substantial sole length outlier`);
  if (item.eligibleContent !== "E03.D.1.2.1") {
    const capPattern = (text: string) => text.replace(/[^A-Za-z]/g, "").split("").map((char) => char === char.toUpperCase() ? "U" : "L").join("");
    const capCategory = (text: string) => /[A-Z]/.test(text) ? capPattern(text).replace(/L+/g, "L").replace(/U+/g, "U") : "all_lower";
    assert.equal(new Set(distractors.map(capCategory)).has(capCategory(correct)) || new Set(blank.options.map((option: any) => capCategory(option.text))).size === 1, true, `${item.itemId} correct option must not be unique capitalization pattern outside capitalization item`);
  }
  if (item.eligibleContent !== "E03.D.1.2.3") {
    const punctPattern = (text: string) => text.replace(/[A-Za-z0-9\s]/g, "");
    assert.equal(new Set(distractors.map(punctPattern)).has(punctPattern(correct)) || new Set(blank.options.map((option: any) => punctPattern(option.text))).size === 1, true, `${item.itemId} correct option must not be unique punctuation pattern outside punctuation item`);
  }
}

console.log("PSSA MOY conventions item tests passed.");
