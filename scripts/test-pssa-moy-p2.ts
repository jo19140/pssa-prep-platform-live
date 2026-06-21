import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMoyP2Items, buildMoyP2Packet, buildMoyP2Passage } from "./content/author-pssa-moy-p2";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";
import { buildItemEcSkillMatchReport, singleAnswerChoiceGroups } from "./audit/pssa-audit-detectors";

const packetPath = "exemplars/pssa_grade3_moy_p2/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildMoyP2Packet();
const passage = packet.passages?.[0] ?? buildMoyP2Passage();
const items = packet.items ?? buildMoyP2Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));

assert.equal(packet.noDbWrite, true, "MOY P2 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "MOY P2 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "MOY P2 must author exactly one passage");
assert.equal(items.length, 7, "MOY P2 must author exactly seven items");
assert.equal(passage.id, "pssa_psg_g3_moy_p2_stubborn_dough", "MOY P2 passage id is pinned");
assert.equal(passage.wordCount, 884, "MOY P2 passage must remain 884 words");
assert.equal(passage.reviewStatus, "PENDING", "MOY P2 passage reviewStatus must be PENDING");
assert.equal(passage.itemStatus, "candidate", "MOY P2 passage itemStatus must be candidate");
assert.equal(passage.staminaBand, "released_length", "MOY P2 passage must use existing released_length stamina band");
assert.equal((passage.textFeaturesJson ?? []).filter((feature: any) => feature.type === "figure").length, 0, "MOY P2 passage must not carry a figure feature");
assert.equal(passage.text.includes("a dull, heavy thud"), true, "MOY P2 passage must preserve dull-heavy-thud wording");
assert.equal(passage.text.includes("light, hollow sound"), true, "MOY P2 passage must preserve light-hollow-sound wording");
assert.equal(passage.text.includes("smelled like a warm hug"), true, "MOY P2 passage must preserve figurative phrase");

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_moy_p2_mcq_ak111", "E03.A-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p2_mcq_ak112", "E03.A-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p2_mcq_ac211", "E03.A-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p2_mcq_av411", "E03.A-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p2_mcq_av412", "E03.A-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p2_te_ak113", "E03.A-K.1.1.3", "MATCHING_GRID", 3],
    ["pssa_item_g3_moy_p2_sa_ak112", "E03.A-K.1.1.2", "SHORT_ANSWER", 3],
  ],
  "MOY P2 item EC/type/points table must match spec",
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [1, 3, 0, 2, 1], "MOY P2 MCQ keys must be B/D/A/C/B");

const mcqGroups = singleAnswerChoiceGroups(items.filter((item: any) => item.interactionType === "MCQ"));
const counts = [0, 0, 0, 0];
for (const group of mcqGroups) counts[group.correctIndex] += 1;
assert.deepEqual(counts, [1, 2, 1, 1], "MOY P2 MCQ answer distribution must be A1/B2/C1/D1");
assert.equal(Math.max(...counts) / mcqGroups.length <= 0.4, true, "MOY P2 MCQ answer distribution must meet max share");

for (const item of items) {
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  assert.equal(item.sourceType, "internal_original", `${item.itemId} sourceType`);
  assert.equal(item.licenseStatus, "cleared_internal_original", `${item.itemId} licenseStatus`);
  assert.equal(item.commercialUseAllowed, true, `${item.itemId} commercialUseAllowed`);
  assert.equal(item.needsLegalReview, false, `${item.itemId} needsLegalReview`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set bank scoringBucket`);
  projectPssaStudentItem(item);
}

const roleRationaleChecks: Record<string, RegExp> = {
  unsupported_inference: /does not say|passage does not|never says|unsupported/i,
  wrong_section: /later|nearby|different|successful|section|detail/i,
  opposite_claim: /reverse|reverses|opposite|instead|did add|positive/i,
  plausible_misreading: /misread|literal|may seem|plausible|but/i,
  wrong_emphasis: /true|focuses|nearby|emphasizes|not the meaning|not the narrator/i,
  too_narrow: /small|one story detail|larger lesson|too narrow/i,
};

for (const item of items.filter((row: any) => row.interactionType === "MCQ")) {
  const distractors = item.structuredChoicesJson.filter((choice: any, index: number) => index !== item.correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(distractors.length, 3, `${item.itemId} must have exactly 3 distractors`);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const choice of distractors) {
    assert.equal(typeof choice.distractorRole, "string", `${item.itemId} distractor must carry distractorRole`);
    assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} distractor rationale must be nonblank and specific`);
    const pattern = roleRationaleChecks[String(choice.distractorRole)];
    if (pattern) assert(pattern.test(choice.rationale), `${item.itemId} ${choice.distractorRole} rationale must align with role: ${choice.rationale}`);
  }
}

const item1 = byId.get("pssa_item_g3_moy_p2_mcq_ak111");
assert.equal(item1.studentFacingPrompt, "Why did Nadia's first loaf turn out flat and hard?", "item 1 stem is pinned");
assert.equal(item1.structuredChoicesJson[item1.correctIndex].text.includes("twenty minutes"), true, "item 1 correct answer must name twenty-minute rush");
for (const [index, choice] of item1.structuredChoicesJson.entries()) {
  if (index !== item1.correctIndex) assert.equal(/not wait long enough|had not risen|before it rose/i.test(choice.text), false, "item 1 distractors must not duplicate the correct cause");
}

const item2 = byId.get("pssa_item_g3_moy_p2_mcq_ak112");
assert.equal(item2.evidenceBinding.task, "identify_message_only", "item 2 must be identify-message-only");
assert.equal(/Which sentence best states the central message/.test(item2.studentFacingPrompt), true, "item 2 must identify the message");
assert.equal(/explain how|two details/i.test(item2.studentFacingPrompt), false, "item 2 must not become the SA explanation task");

const item3 = byId.get("pssa_item_g3_moy_p2_mcq_ac211");
assert.equal(/point of view/i.test(item3.studentFacingPrompt), true, "item 3 must test POV");
assert.equal(/author.*purpose|why did the author/i.test(item3.studentFacingPrompt), false, "item 3 must not be phrased as author purpose");

const item4 = byId.get("pssa_item_g3_moy_p2_mcq_av411");
assert.equal(item4.evidenceBinding.targetWordOrPhrase, "dull", "item 4 target word is pinned");
assert.equal(item4.studentFacingPrompt.includes("a dull, heavy thud"), true, "item 4 must use dull-heavy-thud context");
assert.equal(/yeast|knead|rise|stubborn/i.test(item4.studentFacingPrompt), false, "item 4 must not use defined or reserved words");

const item5 = byId.get("pssa_item_g3_moy_p2_mcq_av412");
assert.equal(item5.evidenceBinding.targetWordOrPhrase, "the whole house smelled like a warm hug", "item 5 target phrase is pinned");
assert.equal(item5.structuredChoicesJson[item5.correctIndex].text, "The bread smelled comforting and pleasant.", "item 5 correct meaning is pinned");

const matchingGrid = byId.get("pssa_item_g3_moy_p2_te_ak113");
assert.equal(matchingGrid.stem, "For each character, choose the action that best shows the character's trait or motivation.");
for (const row of matchingGrid.rows) {
  assert.equal(typeof row.rationale, "string", `${row.rowId} must carry a correct-placement rationale`);
  assert.equal(row.rationale.trim().length > 20, true, `${row.rowId} rationale must be specific`);
  assert.equal(typeof row.correctColumnId, "string", `${row.rowId} must carry canonical correctColumnId`);
  assert.equal(matchingGrid.correctResponseJson.correctCells.some((cell: any) => cell.rowId === row.rowId && cell.columnId === row.correctColumnId), true, `${row.rowId} correctColumnId must match correctCells`);
  const wrong = row.plausibleWrongRationales ?? {};
  assert.equal(Object.keys(wrong).length, matchingGrid.columns.length - 1, `${row.rowId} must carry plausibleWrongRationales for all wrong columns`);
  for (const [columnId, rationale] of Object.entries(wrong)) {
    assert.notEqual(columnId, row.correctColumnId, `${row.rowId} plausibleWrongRationales must only name wrong columns`);
    assert.equal(matchingGrid.columns.some((column: any) => column.columnId === columnId), true, `${row.rowId} plausible wrong column must exist`);
    assert.equal(String(rationale).trim().length > 20, true, `${row.rowId}/${columnId} wrong-placement rationale must be specific`);
  }
}

const shortAnswer = byId.get("pssa_item_g3_moy_p2_sa_ak112");
assert.equal(shortAnswer.evidenceBinding.task, "explain_message_development", "item 7 must be message-development explanation");
assert.equal(shortAnswer.evidenceBinding.requiredDetailCount >= 2, true, "item 7 must require at least two details");
assert.equal(shortAnswer.evidenceBinding.requiresReasoningConnection, true, "item 7 must require reasoning connecting evidence to message");
assert.deepEqual(shortAnswer.evidenceBinding.messageEvidenceThemes, ["rushed_loaf", "successful_loaf", "changed_behavior"], "item 7 binding must name the three message-development themes");
assert.equal(shortAnswer.acceptableTextSupport.some((support: any) => support.supportId === "rushed_loaf"), true, "item 7 must support rushed loaf evidence");
assert.equal(shortAnswer.acceptableTextSupport.some((support: any) => support.supportId === "successful_loaf"), true, "item 7 must support successful loaf evidence");
assert.equal(shortAnswer.acceptableTextSupport.some((support: any) => support.supportId === "changed_behavior"), true, "item 7 must support changed behavior evidence");
assert.equal(shortAnswer.scoreBandExamples.length, 4, "item 7 must include 3/2/1/0 sample responses");

const moyP2EcCatalog = {
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a literary text, referring explicitly to the text as the basis for the answers.",
  "E03.A-K.1.1.2": "Recount stories and determine the central message, lesson, or moral and explain how it is conveyed through key details in the text.",
  "E03.A-C.2.1.1": "Explain the point of view of the narrator or characters in a literary text.",
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases based on grade 3 literary reading and content.",
  "E03.A-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in literary text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, moyP2EcCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `MOY P2 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

assert.deepEqual(
  scorePssaItem(matchingGrid, {
    rowSelections: Object.fromEntries(matchingGrid.correctResponseJson.correctCells.map((cell: any) => [cell.rowId, cell.columnId])),
  }),
  { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "matching_grid_full_credit" },
  "MOY P2 matching grid must be machine-scoreable",
);
assert.deepEqual(
  scorePssaItem(shortAnswer, { shortResponse: "Nadia rushed first, then waited and succeeded." }),
  { status: "pending_human_scoring", pointsEarned: null, maxPoints: 3, detail: "short_answer_rubric" },
  "MOY P2 short answer must stay human-scored",
);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p2/student_preview.md", "utf8");
assert.equal(/correctIndex|correctResponseJson|distractorRole|rationale|answerKey|supportsPrompt/i.test(studentPreview), false, "MOY P2 student preview must be key-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p2/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "MOY P2 reviewer preview must include keys");

console.log("PSSA MOY P2 item tests passed.");
