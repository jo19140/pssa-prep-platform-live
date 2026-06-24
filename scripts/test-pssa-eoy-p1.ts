import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildEoyP1Items,
  buildEoyP1Packet,
  buildEoyP1Passage,
  eoyP1FigureAltText,
  eoyP1ProcessStructuredData,
  extractEoyP1PassageText,
  wordCount,
} from "./content/author-pssa-eoy-p1";
import { buildItemEcSkillMatchReport } from "./audit/pssa-audit-detectors";
import { validatePssaFigureFeatureShared, generatePssaFigureLongDescription } from "../lib/content/pssaFigureFeature";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { scorePssaItem } from "../lib/content/pssaScoring";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { validatePssaFigureAssetNode } from "./content/lib/pssa-figure-feature-node";
import { buildPssaStaminaSectionMap, evaluatePssaDomainFactCheckRequired, evaluatePssaTextFeatureIntegrity } from "./content/lib/pssa-stamina-gates";

const packetPath = "exemplars/pssa_grade3_eoy_p1/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildEoyP1Packet();
const passage = packet.passages?.[0] ?? buildEoyP1Passage();
const items = packet.items ?? buildEoyP1Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));

assert.equal(packet.noDbWrite, true, "EOY P1 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "EOY P1 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "EOY P1 must author exactly one passage");
assert.equal(items.length, 11, "EOY P1 must author exactly eleven items");
assert.equal(passage.id, "pssa_psg_g3_eoy_p1_crayons");
assert.equal(passage.wordCount, 712, "EOY P1 passage must be 712 words");
assert.equal(wordCount(passage.text), 712, "EOY P1 passage text must count to 712 via repo helper");
assert.equal(wordCount(extractEoyP1PassageText()), 712, "EOY P1 source package extraction must count to 712");
assert.equal(passage.genre, "informational_description");
assert.equal(passage.staminaBand, "released_length");
assert.equal(passage.factCheckRequired, true);
assert.equal(passage.reviewStatus, "PENDING");
assert.equal(passage.itemStatus, "candidate");

for (const stale of ["block of wax", "Hard wax", "misshapen", "uneven shapes", "trained workers", "sent to stores"]) {
  assert.equal(passage.text.includes(stale), false, `EOY P1 passage must not contain stale wording: ${stale}`);
}

assert.equal(passage.factCheckNotesJson.length, 9, "EOY P1 must carry nine fact-check records");
const factKeys = ["claimId", "claim", "sourceTitle", "organization", "sourceUrl", "claimSupported", "dateAccessed"];
const domains = new Set<string>();
for (const row of passage.factCheckNotesJson) {
  assert.deepEqual(Object.keys(row).sort(), [...factKeys].sort(), `${row.claimId} fact-check record must have exactly seven keys`);
  assert.equal(row.claimSupported, true, `${row.claimId} must be supported`);
  assert.match(row.sourceUrl, /^https:\/\//, `${row.claimId} must use HTTPS`);
  const host = new URL(row.sourceUrl).hostname.replace(/^www\./, "");
  domains.add(host);
}
assert.deepEqual([...domains].sort(), ["crayola.com", "madehow.com"]);
assert.equal(evaluatePssaDomainFactCheckRequired(passage), "PASS");

const features = passage.textFeaturesJson.filter((feature: any) => feature.type === "figure");
assert.equal(features.length, 1, "EOY P1 passage must carry one process figure");
const figure = features[0];
assert.equal(figure.figureKind, "process");
assert.equal(figure.featureId, "eoy_p1_crayon_process");
assert.equal(figure.title, "How a Crayon Is Made");
assert.equal(figure.sectionId, "section_0_intro");
assert.equal(figure.assetPath, "/pssa/figures/g3_eoy_p1_crayon_process.svg");
assert.match(figure.assetSha256, /^sha256:[0-9a-f]{64}$/);
assert.equal(figure.altText, eoyP1FigureAltText);
assert.deepEqual(figure.structuredData, eoyP1ProcessStructuredData);
assert.deepEqual(figure.structuredData.stages.map((stage: any) => stage.order), [1, 2, 3, 4, 5]);
assert.deepEqual(figure.structuredData.stages.map((stage: any) => stage.targetId), ["stage_melt", "stage_color", "stage_mold", "stage_check", "stage_pack"]);
assert.equal(figure.longDescription, generatePssaFigureLongDescription(figure.structuredData));
assert.equal(
  figure.longDescription,
  "This diagram shows 5 steps in order. Step 1: Melt the wax. Paraffin wax is heated or kept warm until it is liquid. Step 2: Add the color. Powdered pigment is blended in to give the wax its color. Step 3: Fill the mold. The colored wax is poured into crayon-shaped holes and cooled. Step 4: Push out and check. Hardened crayons are pushed out; broken or chipped ones are removed. Step 5: Wrap and pack. Each crayon gets a paper label, then crayons are sorted and boxed.",
);
assert.equal(validatePssaFigureFeatureShared(figure, buildPssaStaminaSectionMap(passage).map((row) => row.sectionId)), true);
assert.equal(validatePssaFigureAssetNode(figure).assetSha256, figure.assetSha256);
assert.equal(evaluatePssaTextFeatureIntegrity(passage, items), "PASS");

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_eoy_p1_mcq_bk111", "E03.B-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_mcq_bc212", "E03.B-C.2.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_mcq_bc311", "E03.B-C.3.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_mcq_bv411", "E03.B-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_mcq_bc313", "E03.B-C.3.1.3", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_te_bk112", "E03.B-K.1.1.2", "MATCHING_GRID", 3],
    ["pssa_item_g3_eoy_p1_sa_bk113", "E03.B-K.1.1.3", "SHORT_ANSWER", 3],
    ["pssa_item_g3_eoy_p1_mcq_bc212_ao2", "E03.B-C.2.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_mcq_bv411_ao3", "E03.B-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p1_te_bc313_ao9", "E03.B-C.3.1.3", "MATCHING_GRID", 3],
    ["pssa_item_g3_eoy_p1_te_bv411_ao10", "E03.B-V.4.1.1", "MATCHING_GRID", 3],
  ],
  "EOY P1 item EC/type/points table must match spec",
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [2, 0, 3, 1, 2, 0, 3], "EOY P1 MCQ keys must be C/A/D/B/C/A/D");

for (const item of items) {
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  assert.equal(item.sourceType, "internal_original", `${item.itemId} sourceType`);
  assert.equal(item.licenseStatus, "cleared_internal_original", `${item.itemId} licenseStatus`);
  assert.equal(item.commercialUseAllowed, true, `${item.itemId} commercialUseAllowed`);
  assert.equal(item.needsLegalReview, false, `${item.itemId} needsLegalReview`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  projectPssaStudentItem(item);
}

for (const item of items.filter((row: any) => row.interactionType === "MCQ")) {
  const distractors = item.structuredChoicesJson.filter((choice: any, index: number) => index !== item.correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(distractors.length, 3, `${item.itemId} must have exactly 3 distractors`);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  assert.equal(item.structuredChoicesJson[item.correctIndex].distractorRole, undefined, `${item.itemId} correct choice must not carry distractorRole`);
  for (const choice of distractors) {
    assert.equal(typeof choice.distractorRole, "string", `${item.itemId} distractor must carry distractorRole`);
    assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} distractor rationale must be specific`);
  }
}

const item5 = byId.get("pssa_item_g3_eoy_p1_mcq_bc313");
assert.equal(item5.evidenceBinding.quotedText, "Many crayons get a double layer of paper, which makes them stronger so they do not snap as easily.");
assert.equal(item5.evidenceBinding.figureTargetId, "stage_pack");
assert.equal(figure.structuredData.stages.find((stage: any) => stage.targetId === "stage_pack").caption.includes("double layer"), false, "item 5 must not be answerable from caption alone");

const gridIds = ["pssa_item_g3_eoy_p1_te_bk112", "pssa_item_g3_eoy_p1_te_bc313_ao9", "pssa_item_g3_eoy_p1_te_bv411_ao10"];
for (const id of gridIds) {
  const grid = byId.get(id);
  assert.equal(grid.scoringJson.totalPoints, 3, `${id} must be a 3-point grid`);
  assert.equal(grid.correctResponseJson.correctCells.length, 3, `${id} must have exactly 3 scored cells`);
  assert.equal(grid.rows.length, 3, `${id} must have exactly 3 scored rows`);
  for (const row of grid.rows) {
    assert.equal(typeof row.rationale, "string", `${id}/${row.rowId} must carry rationale`);
    assert.equal(String(row.rationale).trim().length > 20, true, `${id}/${row.rowId} rationale specific`);
    assert.equal(Object.keys(row.plausibleWrongRationales ?? {}).length > 0, true, `${id}/${row.rowId} must carry plausibleWrongRationales`);
  }
  const response = { rowSelections: Object.fromEntries(grid.correctResponseJson.correctCells.map((cell: any) => [cell.rowId, cell.columnId])) };
  assert.deepEqual(scorePssaItem(grid, response), { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "matching_grid_full_credit" }, `${id} must score full credit`);
}

const item6 = byId.get("pssa_item_g3_eoy_p1_te_bk112");
assert.deepEqual(item6.rows.map((row: any) => row.label), [
  "Crayons are made from wax and pigment in a few careful steps.",
  "Workers heat the wax in large metal tanks until it is liquid.",
  "Crayons solidify in about four to seven minutes.",
]);

const ao9 = byId.get("pssa_item_g3_eoy_p1_te_bc313_ao9");
assert.deepEqual(ao9.rows.map((row: any) => row.rowId), ["stage_melt", "stage_mold", "stage_pack"]);
const captions = figure.structuredData.stages.map((stage: any) => stage.caption.toLowerCase());
for (const column of ao9.columns) {
  const label = column.label.toLowerCase();
  assert.equal(captions.includes(label), false, "AO-9 statements must not be caption-verbatim");
}

const ao10 = byId.get("pssa_item_g3_eoy_p1_te_bv411_ao10");
assert.deepEqual(ao10.rows.map((row: any) => row.rowId), ["evenly", "runny", "recast"]);
assert.equal(ao10.rows.some((row: any) => ["harden", "batch"].includes(row.rowId)), false, "AO-10 vocab must be distinct from harden and batch");

const sa = byId.get("pssa_item_g3_eoy_p1_sa_bk113");
assert.equal(sa.scoringJson.totalPoints, 3);
assert.equal(sa.scoringJson.autoScoringClaim, false);
assert.equal(sa.auditMetadata.autoScoringClaim, false);
assert.deepEqual(sa.scoreBandExamples.map((row: any) => row.band), [3, 2, 1, 0]);
assert.equal(Array.isArray(sa.commonIncompletePatterns), true);
assert.deepEqual(scorePssaItem(sa, { shortResponse: "The wax is melted and then wrapped." }), { status: "pending_human_scoring", pointsEarned: null, maxPoints: 3, detail: "short_answer_rubric" });

const ecCatalog = {
  "E03.B-K.1.1.1": "Ask and answer questions to demonstrate understanding of an informational text.",
  "E03.B-K.1.1.2": "Determine the main idea of a text and recount key details.",
  "E03.B-K.1.1.3": "Describe the relationship between a series of steps in a technical procedure.",
  "E03.B-C.2.1.2": "Use text features and search tools to locate information.",
  "E03.B-C.3.1.1": "Describe the logical connection between sentences and paragraphs.",
  "E03.B-C.3.1.3": "Use information gained from illustrations and words to demonstrate understanding.",
  "E03.B-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, ecCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `EOY P1 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p1/student_preview.md", "utf8");
assert.equal(/correctIndex|correctResponseJson|distractorRole|rationale|answerKey|factCheckNotesJson|claimId/i.test(studentPreview), false, "EOY P1 student preview must be key-free and fact-check-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p1/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "EOY P1 reviewer preview must include keys");
assert.equal(reviewerPreview.includes("t1-wrap-pack"), true, "EOY P1 reviewer preview must include fact-check records");

console.log("PSSA EOY P1 item tests passed.");
