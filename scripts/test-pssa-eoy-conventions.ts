import assert from "node:assert/strict";
import fs from "node:fs";

import { assertNoReuseAgainstSources, buildEoyConventionsItems, buildEoyConventionsPacket } from "./content/author-pssa-eoy-conventions";
import { buildMcqPassageSpecificityReport } from "./audit/pssa-audit-detectors";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_eoy_conventions/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildEoyConventionsPacket();
const items = packet.items ?? buildEoyConventionsItems();

assert.equal(packet.noDbWrite, true, "EOY conventions backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "EOY conventions backend must not be production import ready");
assert.equal(items.length, 9, "EOY conventions must author exactly 9 items");

const expected = [
  ["pssa_item_g3_eoy_conv_d112_plurals", "E03.D.1.1.2", "regular and irregular plural nouns", "irregular_plural_nouns", 0],
  ["pssa_item_g3_eoy_conv_d113_abstract_noun", "E03.D.1.1.3", "abstract nouns", "abstract_nouns", 1],
  ["pssa_item_g3_eoy_conv_d116_pronoun_agreement", "E03.D.1.1.6", "pronoun-antecedent agreement", "pronoun_antecedent_agreement", 0],
  ["pssa_item_g3_eoy_conv_d117_comparative", "E03.D.1.1.7", "comparative and superlative adjectives", "comparative_superlative", 2],
  ["pssa_item_g3_eoy_conv_d119_sentence_formation", "E03.D.1.1.9", "produce compound and complex sentences", "sentence_formation", 0],
  ["pssa_item_g3_eoy_conv_d122_address_commas", "E03.D.1.2.2", "commas in addresses", "commas_in_addresses", 3],
  ["pssa_item_g3_eoy_conv_d123_dialogue", "E03.D.1.2.3", "quotation marks and commas in dialogue", "dialogue_punctuation", 1],
  ["pssa_item_g3_eoy_conv_d124_possessives", "E03.D.1.2.4", "form and use possessives", "possessives", 2],
  ["pssa_item_g3_eoy_conv_d126_spelling", "E03.D.1.2.6", "spelling patterns and generalizations", "spelling_ending_rules", 3],
] as const;

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.targetConvention, item.targetSubskill, item.blanks[0].correctIndex]),
  expected,
  "EOY conventions EC/target/key table must match spec",
);
assert.equal(new Set(items.map((item: any) => item.eligibleContent)).size, 9, "EOY conventions ECs must not repeat");
assert.deepEqual(
  new Set(items.map((item: any) => item.eligibleContent)),
  new Set(["E03.D.1.1.2", "E03.D.1.1.3", "E03.D.1.1.6", "E03.D.1.1.7", "E03.D.1.1.9", "E03.D.1.2.2", "E03.D.1.2.3", "E03.D.1.2.4", "E03.D.1.2.6"]),
  "EOY conventions EC set must be exact",
);

const keyCounts = [0, 0, 0, 0];
for (const item of items) keyCounts[item.blanks[0].correctIndex] += 1;
assert.deepEqual(keyCounts, [3, 2, 2, 2], "EOY conventions key tally must be A3/B2/C2/D2");

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
  assert.equal(item.stem.length > 0, true, `${item.itemId} must carry an instructional stem`);
  const blank = item.blanks[0];
  assert.equal(item.blanks.length, 1, `${item.itemId} must have one blank`);
  assert.equal(item.baseTextWithBlanks.includes("___"), true, `${item.itemId} baseTextWithBlanks must contain blank`);
  assert.equal(blank.position, item.baseTextWithBlanks.indexOf("___"), `${item.itemId} blank position must match base sentence`);
  assert.equal(blank.options.length, 4, `${item.itemId} must have four options`);
  assert.equal(blank.options[blank.correctIndex].text, blank.targetWordOrPhrase, `${item.itemId} targetWordOrPhrase must match the correct option`);
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

assert.equal(buildMcqPassageSpecificityReport(items, []).length, 0, "standalone EOY conventions must be excluded from passage-specificity concreteness");
assertNoReuseAgainstSources(items);

const agreement = items.find((item: any) => item.itemId === "pssa_item_g3_eoy_conv_d116_pronoun_agreement");
assert.equal(agreement.targetSubskill, "pronoun_antecedent_agreement", "EOY D.1.1.6 must test pronoun agreement");
assert.equal(agreement.baseTextWithBlanks, "The two hikers packed ___ own water bottles.", "EOY D.1.1.6 must be the rotated pronoun facet");
assert.deepEqual(agreement.blanks[0].options.map((option: any) => option.text), ["their", "his", "they", "our"], "EOY D.1.1.6 options must differ from MOY subject-verb facet");

const dialogue = items.find((item: any) => item.itemId === "pssa_item_g3_eoy_conv_d123_dialogue");
assert.equal(dialogue.baseTextWithBlanks, "Lily smiled and said, ___", "EOY D.1.2.3 must be tag-first");
assert.equal(dialogue.blanks[0].targetWordOrPhrase, "\"Let's go to the park.\"", "EOY D.1.2.3 must target tag-first quote punctuation");

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_conventions/student_preview.md", "utf8");
assert.equal(/correctIndex|errorPattern|rationale|answerKey|distractorRole/i.test(studentPreview), false, "EOY conventions student preview must be leak-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_conventions/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "EOY conventions reviewer preview must include keys");
assert.equal(reviewerPreview.includes("errorPattern"), false, "EOY conventions reviewer preview should show labels without leaking machine key name");
assert.equal(reviewerPreview.includes("pronoun_antecedent_agreement"), true, "EOY conventions reviewer preview must include target subskill values");

function punctuationPattern(text: string) {
  return text.replace(/[A-Za-z0-9\s]/g, "");
}

function capitalizationPattern(text: string) {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (!letters) return "none";
  return letters.split("").map((char) => char === char.toUpperCase() ? "U" : "L").join("").replace(/L+/g, "L").replace(/U+/g, "U");
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
  const punctuationExempt = new Set(["E03.D.1.2.2", "E03.D.1.2.3", "E03.D.1.2.4"]);
  if (!punctuationExempt.has(item.eligibleContent)) {
    assert.equal(new Set(distractors.map(punctuationPattern)).has(punctuationPattern(correct)) || new Set(blank.options.map((option: any) => punctuationPattern(option.text))).size === 1, true, `${item.itemId} correct option must not be unique punctuation pattern outside punctuation item`);
  }
  if (item.eligibleContent !== "E03.D.1.2.3") {
    assert.equal(new Set(distractors.map(capitalizationPattern)).has(capitalizationPattern(correct)) || new Set(blank.options.map((option: any) => capitalizationPattern(option.text))).size === 1, true, `${item.itemId} correct option must not be unique capitalization pattern outside capitalization/dialogue item`);
  }
}

console.log("PSSA EOY conventions item tests passed.");
