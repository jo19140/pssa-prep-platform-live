import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMoyP1Items, buildMoyP1Packet, buildMoyP1Passage } from "./content/author-pssa-moy-p1";
import { validatePssaFigureFeatureShared } from "../lib/content/pssaFigureFeature";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";
import { buildItemEcSkillMatchReport, singleAnswerChoiceGroups } from "./audit/pssa-audit-detectors";
import { buildPssaStaminaSectionMap } from "./content/lib/pssa-stamina-gates";

const packetPath = "exemplars/pssa_grade3_moy_p1/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildMoyP1Packet();
const passage = packet.passages?.[0] ?? buildMoyP1Passage();
const items = packet.items ?? buildMoyP1Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));

assert.equal(packet.noDbWrite, true, "MOY P1 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "MOY P1 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "MOY P1 must author exactly one passage");
assert.equal(items.length, 8, "MOY P1 must author exactly eight items");
assert.equal(passage.wordCount, 687, "MOY P1 passage must remain 687 words");
assert.equal(passage.reviewStatus, "PENDING", "MOY P1 passage reviewStatus must be PENDING");
assert.equal(passage.itemStatus, "candidate", "MOY P1 passage itemStatus must be candidate");
assert.equal(passage.staminaBand, "released_length", "MOY P1 passage must use existing released_length stamina band");

const figureFeatures = passage.textFeaturesJson.filter((feature: any) => feature.type === "figure");
assert.equal(figureFeatures.length, 1, "MOY P1 passage must contain exactly one figure feature");
assert.equal(figureFeatures[0].assetPath, "/pssa/figures/g3_moy_p1_museum_map.svg");
assert.equal(figureFeatures[0].assetSha256, "sha256:430318638b57236332e3c68a6f3620358a24cd912d35c2bef664c91d49811502");
assert.equal(validatePssaFigureFeatureShared(figureFeatures[0], buildPssaStaminaSectionMap(passage).map((row) => row.sectionId)), true, "MOY P1 figure validates against passage sections");

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_moy_p1_mcq_bk111", "E03.B-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p1_mcq_bc211", "E03.B-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p1_mcq_bc313", "E03.B-C.3.1.3", "MCQ", 1],
    ["pssa_item_g3_moy_p1_mcq_bv411", "E03.B-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p1_mcq_bc212", "E03.B-C.2.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p1_te_bk112", "E03.B-K.1.1.2", "MATCHING_GRID", 3],
    ["pssa_item_g3_moy_p1_sa_bk113", "E03.B-K.1.1.3", "SHORT_ANSWER", 3],
    ["pssa_item_g3_moy_p1_ao5_dd_bc313", "E03.B-C.3.1.3", "DRAG_DROP", 3],
  ],
  "MOY P1 item EC/type/points table must match spec",
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [0, 1, 2, 3, 0], "MOY P1 MCQ keys must be A/B/C/D/A");

const mcqGroups = singleAnswerChoiceGroups(items.filter((item: any) => item.interactionType === "MCQ"));
const counts = [0, 0, 0, 0];
for (const group of mcqGroups) counts[group.correctIndex] += 1;
assert.deepEqual(counts, [2, 1, 1, 1], "MOY P1 MCQ answer distribution must be A2/B1/C1/D1");
assert.equal(Math.max(...counts) / mcqGroups.length <= 0.4, true, "MOY P1 MCQ answer distribution must meet max share");

for (const item of items) {
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  assert.equal(item.sourceType, "internal_original", `${item.itemId} sourceType`);
  assert.equal(item.licenseStatus, "cleared_internal_original", `${item.itemId} licenseStatus`);
  assert.equal(item.commercialUseAllowed, true, `${item.itemId} commercialUseAllowed`);
  assert.equal(item.needsLegalReview, false, `${item.itemId} needsLegalReview`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set bank scoringBucket`);
  projectPssaStudentItem(item);
  for (const choice of item.structuredChoicesJson ?? []) {
    if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} uses registered role ${choice.distractorRole}`);
  }
  for (const target of item.targets ?? []) {
    if (target.distractorRole) assert(mappingRegistry[target.distractorRole as keyof typeof mappingRegistry], `${item.itemId} target uses registered role ${target.distractorRole}`);
  }
}

for (const item of items.filter((row: any) => row.interactionType === "MCQ")) {
  const distractors = item.structuredChoicesJson.filter((choice: any, index: number) => index !== item.correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(distractors.length, 3, `${item.itemId} must have exactly 3 distractors`);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const choice of distractors) {
    assert.equal(typeof choice.distractorRole, "string", `${item.itemId} distractor must carry distractorRole`);
    assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} distractor rationale must be nonblank and specific`);
    if (choice.distractorRole === "wrong_section") assert(/different|section|relationship|exhibit|area|later|earlier/i.test(choice.rationale), `${item.itemId} wrong_section rationale must explain the misplaced section/detail`);
    if (choice.distractorRole === "wrong_emphasis") assert(/not|does not|different|important/i.test(choice.rationale), `${item.itemId} wrong_emphasis rationale must explain the misplaced emphasis`);
    if (choice.distractorRole === "unsupported_inference") assert(/does not say|never says|unsupported|passage does not/i.test(choice.rationale), `${item.itemId} unsupported_inference rationale must explain absent support`);
    if (choice.distractorRole === "opposite_claim") assert(/reverse|reverses|opposite|not/i.test(choice.rationale), `${item.itemId} opposite_claim rationale must explain reversal`);
    if (choice.distractorRole === "plausible_misreading") assert(/misread|describes|discusses|but/i.test(choice.rationale), `${item.itemId} plausible_misreading rationale must explain the plausible misread`);
  }
}

const matchingGrid = byId.get("pssa_item_g3_moy_p1_te_bk112");
for (const row of matchingGrid.rows) {
  assert.equal(typeof row.rationale, "string", `${row.rowId} must carry a correct-placement rationale`);
  assert.equal(row.rationale.trim().length > 20, true, `${row.rowId} rationale must be specific`);
  assert.equal(typeof row.correctColumnId, "string", `${row.rowId} must carry canonical correctColumnId`);
  assert.equal(matchingGrid.correctResponseJson.correctCells.some((cell: any) => cell.rowId === row.rowId && cell.columnId === row.correctColumnId), true, `${row.rowId} correctColumnId must match correctCells`);
  const wrong = row.plausibleWrongRationales ?? {};
  assert.equal(Object.keys(wrong).length > 0, true, `${row.rowId} must carry plausibleWrongRationales`);
  for (const [columnId, rationale] of Object.entries(wrong)) {
    assert.notEqual(columnId, row.correctColumnId, `${row.rowId} plausibleWrongRationales must only name wrong columns`);
    assert.equal(matchingGrid.columns.some((column: any) => column.columnId === columnId), true, `${row.rowId} plausible wrong column must exist`);
    assert.equal(String(rationale).trim().length > 20, true, `${row.rowId}/${columnId} wrong-placement rationale must be specific`);
  }
}

function answerableWithFigureRemoved(item: any) {
  return item.evidenceBinding?.requiresFigure !== true;
}

function answerableWithQuotedTextRemoved(item: any) {
  const binding = item.evidenceBinding ?? {};
  if (binding.quotedText && item.studentFacingPrompt?.includes(binding.quotedText)) return false;
  if (Array.isArray(binding.dragTokenTexts) && binding.dragTokenTexts.some((text: string) => (item.responseSpecJson?.tokens ?? []).some((token: any) => token.text === text))) return false;
  return true;
}

assert.equal(answerableWithFigureRemoved(byId.get("pssa_item_g3_moy_p1_mcq_bc212")), false, "item 5 must fail if figure is removed");
for (const id of ["pssa_item_g3_moy_p1_mcq_bc313", "pssa_item_g3_moy_p1_ao5_dd_bc313"]) {
  assert.equal(answerableWithFigureRemoved(byId.get(id)), false, `${id} must fail if figure is removed`);
  assert.equal(answerableWithQuotedTextRemoved(byId.get(id)), false, `${id} must fail if quoted stem/drag-token text is removed`);
}
for (const id of [
  "pssa_item_g3_moy_p1_mcq_bk111",
  "pssa_item_g3_moy_p1_mcq_bc211",
  "pssa_item_g3_moy_p1_mcq_bv411",
  "pssa_item_g3_moy_p1_te_bk112",
  "pssa_item_g3_moy_p1_sa_bk113",
]) {
  assert.equal(answerableWithFigureRemoved(byId.get(id)), true, `${id} must remain answerable without the figure`);
}

assert.equal(byId.get("pssa_item_g3_moy_p1_mcq_bc211").studentFacingPrompt.includes("point of view"), true, "item 2 must test POV, not purpose");
assert.equal(/author write|purpose/i.test(byId.get("pssa_item_g3_moy_p1_mcq_bc211").studentFacingPrompt), false, "item 2 must not be phrased as author's purpose");
assert.equal(byId.get("pssa_item_g3_moy_p1_mcq_bc313").studentFacingPrompt.includes("The Quiet Corner, where families read and rest, was placed far from the noise."), true, "item 3 must quote the Quiet Corner sentence");

const moyP1EcCatalog = {
  "E03.B-K.1.1.1": "Ask and answer questions to demonstrate understanding of an informational text, referring explicitly to the text as the basis for the answers.",
  "E03.B-C.2.1.1": "Explain the author's point of view in an informational text.",
  "E03.B-C.3.1.3": "Use information gained from text features, maps, and words in an informational text to demonstrate understanding.",
  "E03.B-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases based on grade 3 informational reading and content.",
  "E03.B-C.2.1.2": "Use text features and search tools such as labels, maps, and legends to locate information.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, moyP1EcCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `MOY P1 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

assert.deepEqual(
  scorePssaItem(byId.get("pssa_item_g3_moy_p1_te_bk112"), {
    rowSelections: Object.fromEntries(byId.get("pssa_item_g3_moy_p1_te_bk112").correctResponseJson.correctCells.map((cell: any) => [cell.rowId, cell.columnId])),
  }),
  { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "matching_grid_full_credit" },
  "MOY P1 matching grid must be machine-scoreable",
);
assert.deepEqual(
  scorePssaItem(byId.get("pssa_item_g3_moy_p1_ao5_dd_bc313"), {
    assignments: Object.fromEntries(byId.get("pssa_item_g3_moy_p1_ao5_dd_bc313").correctResponseJson.correctAssignments.map((row: any) => [row.tokenId, row.targetId])),
  }),
  { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "drag_drop_full_credit" },
  "MOY P1 AO-5 drag-drop must be machine-scoreable",
);
assert.deepEqual(
  scorePssaItem(byId.get("pssa_item_g3_moy_p1_sa_bk113"), { shortResponse: "The workers test and revise the map." }),
  { status: "pending_human_scoring", pointsEarned: null, maxPoints: 3, detail: "short_answer_rubric" },
  "MOY P1 short answer must stay human-scored",
);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p1/student_preview.md", "utf8");
assert.equal(/correctIndex|correctResponseJson|distractorRole|rationale|answerKey|supportsPrompt/i.test(studentPreview), false, "MOY P1 student preview must be key-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p1/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "MOY P1 reviewer preview must include keys");

console.log("PSSA MOY P1 item tests passed.");
