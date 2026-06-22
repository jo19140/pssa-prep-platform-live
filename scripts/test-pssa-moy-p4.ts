import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMoyP4Items, buildMoyP4Packet, buildMoyP4Passage } from "./content/author-pssa-moy-p4";
import { buildItemEcSkillMatchReport, singleAnswerChoiceGroups } from "./audit/pssa-audit-detectors";
import { evaluatePssaDomainFactCheckRequired } from "./content/lib/pssa-stamina-gates";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_moy_p4/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildMoyP4Packet();
const passage = packet.passages?.[0] ?? buildMoyP4Passage();
const items = packet.items ?? buildMoyP4Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));

assert.equal(packet.noDbWrite, true, "MOY P4 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "MOY P4 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "MOY P4 must author exactly one passage");
assert.equal(items.length, 7, "MOY P4 must author exactly seven items");

assert.equal(passage.id, "pssa_psg_g3_moy_p4_last_rehearsal");
assert.equal(passage.title, "The Last Rehearsal");
assert.equal(passage.wordCount, 1086);
assert.equal(passage.genre, "drama");
assert.equal(passage.passageType, "literary");
assert.equal(passage.staminaBand, "released_length");
assert.equal(passage.factCheckRequired, false);
assert.equal(passage.factCheckNotesJson, undefined, "MOY P4 fictional drama must omit factCheckNotesJson");
assert.equal((passage.textFeaturesJson ?? []).filter((feature: any) => feature.type === "figure").length, 0, "MOY P4 must not carry a figure");
assert.equal(evaluatePssaDomainFactCheckRequired(passage), "SKIP", "MOY P4 fictional drama must not require fact-check records");
assert.equal(passage.reviewStatus, "PENDING");
assert.equal(passage.itemStatus, "candidate");

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_moy_p4_mcq_ak111", "E03.A-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p4_mcq_ak112", "E03.A-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p4_mcq_ak113", "E03.A-K.1.1.3", "MCQ", 1],
    ["pssa_item_g3_moy_p4_mcq_av411", "E03.A-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p4_mcq_av412", "E03.A-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p4_ebsr_ak113", "E03.A-K.1.1.3", "EBSR", 2],
    ["pssa_item_g3_moy_p4_mcq_av412_ao2", "E03.A-V.4.1.2", "MCQ", 1],
  ],
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [3, 0, 1, 2, 3, 0], "MOY P4 MCQ keys must be D/A/B/C/D/A");
assert.deepEqual(items.filter((item: any) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1], "MOY P4 EBSR Part A key must be B");

const operationalMcqGroups = singleAnswerChoiceGroups(items.slice(0, 5));
const operationalCounts = [0, 0, 0, 0];
for (const group of operationalMcqGroups) operationalCounts[group.correctIndex] += 1;
assert.deepEqual(operationalCounts, [1, 1, 1, 2], "MOY P4 operational MCQ distribution must be A1/B1/C1/D2");
assert.equal(Math.max(...operationalCounts) / operationalMcqGroups.length <= 0.4, true, "MOY P4 operational MCQ distribution must meet max-share cap");

for (const item of items) {
  assert.equal(item.passageId, "pssa_psg_g3_moy_p4_last_rehearsal", `${item.itemId} passageId`);
  assert.equal(item.passageGroupId, undefined, `${item.itemId} must not set passageGroupId`);
  assert.equal(item.passageLinks, undefined, `${item.itemId} must not set passageLinks`);
  assert.equal(item.isCrossText, undefined, `${item.itemId} must not set isCrossText`);
  assert.equal(item.requiredEvidenceSlotsJson, undefined, `${item.itemId} must not set requiredEvidenceSlotsJson`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  projectPssaStudentItem(item);
}

const roleRationaleChecks: Record<string, RegExp> = {
  unsupported_inference: /does not say|passage does not|unsupported|not say/i,
  wrong_section: /stage|section|detail|belongs|later|different/i,
  opposite_claim: /reverse|reverses|opposite|instead/i,
  plausible_misreading: /literal|misread|treats|plausible/i,
  wrong_emphasis: /focuses|true|detail|not the|first reaction/i,
  too_narrow: /one practical detail|too narrow|larger|central message/i,
};

for (const item of items) {
  const choices = item.interactionType === "MCQ" ? item.structuredChoicesJson : item.partA?.choices;
  const correctIndex = item.interactionType === "MCQ" ? item.correctIndex : item.correctResponseJson.partA.correctIndex;
  const distractors = choices.filter((_choice: any, index: number) => index !== correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(distractors.length, 3, `${item.itemId} must have exactly 3 distractors`);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const choice of distractors) {
    assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} rationale must be nonblank`);
    const pattern = roleRationaleChecks[String(choice.distractorRole)];
    if (pattern) assert(pattern.test(choice.rationale), `${item.itemId} ${choice.distractorRole} rationale must align: ${choice.rationale}`);
  }
}

function assertSpan(span: string, label: string) {
  assert.equal(passage.text.includes(span), true, `${label} must be verbatim in MOY P4 passage: ${span}`);
}
for (const item of items) {
  for (const choice of item.answerChoicesJson ?? []) for (const link of choice.evidenceLinks ?? []) if (link.quotedSpan) assertSpan(link.quotedSpan, `${item.itemId} evidence`);
}

const item3 = byId.get("pssa_item_g3_moy_p4_mcq_ak113");
const item6 = byId.get("pssa_item_g3_moy_p4_ebsr_ak113");
const item5 = byId.get("pssa_item_g3_moy_p4_mcq_av412");
const item7 = byId.get("pssa_item_g3_moy_p4_mcq_av412_ao2");

assert.equal(item3.evidenceBinding.quotedSpan, "I spent three weeks on this castle. Every stone, every window, I painted by hand.");
assert.equal(item6.evidenceBinding.evidenceKind, "section_synthesis");
assert.notEqual(item3.evidenceBinding.quotedSpan, item6.responseSpecJson.partB.choices[0].text, "item 3 motivation and item 6 turning point must not share correct evidence");
assert.equal(item5.evidenceBinding.targetWordOrPhrase, "butterflies in my stomach");
assert.equal(item7.evidenceBinding.targetWordOrPhrase, "back to square one");
assert.notEqual(item5.evidenceBinding.targetWordOrPhrase, item7.evidenceBinding.targetWordOrPhrase, "figurative items must test distinct phrases");

assert.deepEqual(item6.correctResponseJson.partA.correctIndex, 1);
assert.deepEqual(item6.correctResponseJson.partB.correctIndices, [0, 2]);
assert.equal(item6.responseSpecJson.partB.choices.length, 4);
assert.equal(item6.responseSpecJson.partB.requiredSelectionCount, 2);
assert.deepEqual(item6.responseSpecJson.partB.choices.map((choice: any) => choice.text), [
  "What if we don't copy the old one? What if we build something new — together?",
  "A torn castle on stage is worse than no play at all.",
  "...Okay. Show me what you mean.",
  "It won't look real. Mine looked real.",
]);
for (const choice of item6.responseSpecJson.partB.choices) {
  assert.equal(choice.passageSlot, undefined, "single-passage EBSR Part B must omit passageSlot");
  assertSpan(choice.text, "item 6 Part B");
}
assert.deepEqual(item6.scoringJson.totalPoints, 2);
assert.deepEqual(item6.scoringJson.partAPoints, 1);
assert.deepEqual(item6.scoringJson.partBPoints, 1);
assert.equal(item6.scoringJson.requirePartACorrectForFullCredit, true);
assert.equal(Array.isArray(item6.scoringJson.partialCreditRules), true);

const moyP4EcCatalog = {
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a literary text, referring explicitly to the text as the basis for the answers.",
  "E03.A-K.1.1.2": "Recount stories and determine the central message, lesson, or moral and explain how it is conveyed through key details in the text.",
  "E03.A-K.1.1.3": "Describe characters in a story and explain how their actions contribute to the sequence of events.",
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases based on grade 3 literary reading and content.",
  "E03.A-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in literary text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, moyP4EcCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `MOY P4 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

assert.deepEqual(
  scorePssaItem(item6, { partAIndex: 1, partBIndices: [0, 2] }),
  { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" },
  "MOY P4 EBSR must score full credit",
);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p4/student_preview.md", "utf8");
assert.equal(/correctIndex|correctIndices|correctResponseJson|distractorRole|rationale|answerKey|factCheckNotesJson|claimId|sourceUrl/i.test(studentPreview), false, "MOY P4 student preview must be key/fact-check free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p4/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "MOY P4 reviewer preview must include keys");
assert.equal(reviewerPreview.includes("What if we don't copy the old one?"), true, "MOY P4 reviewer preview must include EBSR evidence");

console.log("PSSA MOY P4 item tests passed.");
