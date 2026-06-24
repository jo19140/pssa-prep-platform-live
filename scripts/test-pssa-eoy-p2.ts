import assert from "node:assert/strict";
import fs from "node:fs";

import { buildEoyP2Items, buildEoyP2Packet, buildEoyP2Passage, wordCount } from "./content/author-pssa-eoy-p2";
import {
  buildItemEcSkillMatchReport,
  buildMcqPassageSpecificityReport,
  hasBlockingPassageSpecificityFailure,
} from "./audit/pssa-audit-detectors";
import {
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaSectionLookbackBalance,
  evaluatePssaTextFeatureIntegrity,
  evaluatePssaTextFeatureItemLink,
} from "./content/lib/pssa-stamina-gates";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { scorePssaItem } from "../lib/content/pssaScoring";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";

const packetPath = "exemplars/pssa_grade3_eoy_p2/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildEoyP2Packet();
const passage = packet.passages?.[0] ?? buildEoyP2Passage();
const items = packet.items ?? buildEoyP2Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));

assert.equal(packet.noDbWrite, true, "EOY P2 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "EOY P2 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "EOY P2 must author exactly one passage");
assert.equal(items.length, 8, "EOY P2 must author exactly eight items");
assert.equal(passage.id, "pssa_psg_g3_eoy_p2_broken_vase", "EOY P2 passage id is pinned");
assert.equal(wordCount(passage.text), 925, "EOY P2 passage text must count to 925 words");
assert.equal(passage.wordCount, 925, "EOY P2 passage wordCount must be 925");
assert.equal(passage.genre, "literary_narrative", "EOY P2 passage genre must be literary_narrative");
assert.equal(passage.pov, "third_person", "EOY P2 passage POV must be third_person");
assert.equal(passage.staminaBand, "released_length", "EOY P2 must use released_length stamina band");
assert.equal(passage.factCheckRequired, false, "EOY P2 is original fiction and must not require fact check");
assert.equal("factCheckNotesJson" in passage, false, "EOY P2 must not carry factCheckNotesJson");
assert.equal((passage.textFeaturesJson ?? []).filter((feature: any) => feature.type === "figure").length, 0, "EOY P2 must not carry a figure feature");
assert.deepEqual(
  passage.textFeaturesJson,
  [{
    type: "figurative_language",
    featureText: "his stomach tied in a knot",
    sectionId: "paragraph_05",
    mustUseInItem: true,
    linkedByItemIds: ["pssa_item_g3_eoy_p2_mcq_av412"],
  }],
  "EOY P2 must carry the single pinned figurative-language feature",
);

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_eoy_p2_mcq_ak111", "E03.A-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p2_mcq_ac211", "E03.A-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p2_mcq_av411", "E03.A-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p2_mcq_av412", "E03.A-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p2_mcq_ak112", "E03.A-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p2_te_ak113", "E03.A-K.1.1.3", "MATCHING_GRID", 3],
    ["pssa_item_g3_eoy_p2_sa_ak112", "E03.A-K.1.1.2", "SHORT_ANSWER", 3],
    ["pssa_item_g3_eoy_p2_mcq_ac211_ao5", "E03.A-C.2.1.1", "MCQ", 1],
  ],
  "EOY P2 item EC/type/points table must match spec",
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [0, 1, 2, 3, 1, 2], "EOY P2 MCQ keys must be A/B/C/D/B/C");

for (const item of items) {
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set bank scoringBucket`);
  projectPssaStudentItem(item);
}

const allLiteralSpans = new Set<string>();
for (const item of items.filter((row: any) => row.interactionType === "MCQ")) {
  assert.equal(item.structuredChoicesJson.length, 4, `${item.itemId} must have four structured choices`);
  const distractors = item.structuredChoicesJson.filter((_: any, index: number) => index !== item.correctIndex);
  assert.equal(new Set(distractors.map((choice: any) => choice.distractorRole)).size, 3, `${item.itemId} must have three distinct distractor roles`);
  for (const [index, choice] of item.structuredChoicesJson.entries()) {
    assert.equal(choice.isCorrect, index === item.correctIndex, `${item.itemId} isCorrect must match correctIndex`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} choice ${index} rationale must be specific`);
    assert.equal(Array.isArray(choice.evidenceLinks) && choice.evidenceLinks.length > 0, true, `${item.itemId} choice ${index} needs evidenceLinks`);
    if (index === item.correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct choice must explicitly set distractorRole:null`);
    else assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    for (const link of choice.evidenceLinks) {
      if (link.evidenceKind === "whole_passage_synthesis") continue;
      assert.equal(Number.isInteger(link.paragraphIndex), true, `${item.itemId} literal link paragraphIndex`);
      assert.equal(Number.isInteger(link.sentenceIndex), true, `${item.itemId} literal link sentenceIndex`);
      assert.equal(Number.isInteger(link.startChar), true, `${item.itemId} literal link startChar`);
      assert.equal(Number.isInteger(link.endChar), true, `${item.itemId} literal link endChar`);
      assert.equal(passage.text.slice(link.startChar, link.endChar), link.quotedSpan, `${item.itemId} literal link offsets must match quotedSpan`);
      assert.equal(allLiteralSpans.has(link.quotedSpan), false, `literal span reused across selected response items: ${link.quotedSpan}`);
      allLiteralSpans.add(link.quotedSpan);
    }
  }
}

const item15 = byId.get("pssa_item_g3_eoy_p2_mcq_ac211");
const ao5 = byId.get("pssa_item_g3_eoy_p2_mcq_ac211_ao5");
const item17 = byId.get("pssa_item_g3_eoy_p2_mcq_av412");
const item18 = byId.get("pssa_item_g3_eoy_p2_mcq_ak112");
const item20 = byId.get("pssa_item_g3_eoy_p2_sa_ak112");

const item15CorrectSpan = item15.structuredChoicesJson[item15.correctIndex].evidenceLinks[0].quotedSpan;
const ao5CorrectSpan = ao5.structuredChoicesJson[ao5.correctIndex].evidenceLinks[0].quotedSpan;
const item17CorrectSpan = item17.structuredChoicesJson[item17.correctIndex].evidenceLinks[0].quotedSpan;
assert.notEqual(item15CorrectSpan, ao5CorrectSpan, "POV items must use distinct evidence spans");
assert.equal(ao5CorrectSpan, "reaching to dust the shelf and finding the empty spot bare", "AO-5 evidence span is pinned");
assert.notEqual(ao5CorrectSpan, item17CorrectSpan, "AO-5 must not reuse the stomach-knot span");
assert.equal(item20.acceptableTextSupport.some((support: any) => support.quotedSpan.includes(ao5CorrectSpan)), false, "AO-5 span must be absent from item 20 support");

assert.equal(item18.comprehensionKind, "inference", "item 18 must declare inference comprehensionKind");
assert.equal(String(item18.comprehensionKindRationale ?? "").length > 20, true, "item 18 must explain inference rationale");
assert.equal(item18.structuredChoicesJson[item18.correctIndex].evidenceLinks[0].evidenceKind, "whole_passage_synthesis", "item 18 correct choice must use whole_passage_synthesis");
for (const [index, choice] of item18.structuredChoicesJson.entries()) {
  if (index !== item18.correctIndex) assert.notEqual(choice.evidenceLinks[0].evidenceKind, "whole_passage_synthesis", "item 18 distractors must carry their own evidence links");
}

const grid = byId.get("pssa_item_g3_eoy_p2_te_ak113");
assert.equal(grid.scoringJson.totalPoints, 3, "item 19 grid must be 3 points");
assert.equal(grid.correctResponseJson.correctCells.length, 3, "item 19 must have exactly three scored cells");
assert.deepEqual(grid.rows.map((row: any) => row.label), [
  "Mateo plays ball indoors and breaks the vase.",
  "Mateo stops before touching the sharp piece and walks toward the kitchen.",
  "Mateo puts the ball away when Abuela tells him.",
]);
assert.deepEqual(grid.columns.map((column: any) => column.label), ["Starts the problem", "Marks the turning point", "Shows the consequence"]);
for (const row of grid.rows) {
  assert.equal(String(row.rationale ?? "").trim().length > 20, true, `${row.rowId} grid rationale`);
  assert.equal(Object.keys(row.plausibleWrongRationales ?? {}).length, 2, `${row.rowId} must carry two wrong-placement rationales`);
}
assert.deepEqual(
  scorePssaItem(grid, { rowSelections: Object.fromEntries(grid.correctResponseJson.correctCells.map((cell: any) => [cell.rowId, cell.columnId])) }),
  { status: "scored", pointsEarned: 3, maxPoints: 3, detail: "matching_grid_full_credit" },
  "EOY P2 matching grid must score full credit",
);

assert.equal(item20.scoringJson.totalPoints, 3);
assert.equal(item20.scoringJson.autoScoringClaim, false);
assert.equal(item20.auditMetadata.autoScoringClaim, false);
assert.deepEqual(item20.scoreBandExamples.map((row: any) => row.band), [3, 2, 1, 0]);
assert.equal(Array.isArray(item20.commonIncompletePatterns), true);
assert.equal(item20.acceptableTextSupport.some((support: any) => /Thank you for coming to find me|did not blame the cat/i.test(support.quotedSpan)), false, "item 20 support must avoid item 18 confession/Abuela anchor");
assert.deepEqual(scorePssaItem(item20, { shortResponse: "Mateo tells the truth and helps clean up." }), { status: "pending_human_scoring", pointsEarned: null, maxPoints: 3, detail: "short_answer_rubric" });

assert.equal(evaluatePssaPassageStaminaMetadata(passage), "PASS", "EOY P2 stamina metadata must pass");
assert.equal(evaluatePssaTextFeatureIntegrity(passage, items), "PASS", "EOY P2 text feature integrity must pass");
assert.equal(evaluatePssaTextFeatureItemLink(passage, items), "PASS", "EOY P2 text feature item link must pass");
assert.equal(evaluatePssaSectionLookbackBalance(passage, items), "PASS", "EOY P2 section lookback must pass");
assert.equal(evaluatePssaDomainFactCheckRequired(passage), "SKIP", "EOY P2 domain fact-check gate must skip");
const quotedMcqParagraphs = new Set(
  items
    .filter((item: any) => item.interactionType === "MCQ" && item.itemId !== "pssa_item_g3_eoy_p2_mcq_ak112")
    .flatMap((item: any) => item.structuredChoicesJson[item.correctIndex].evidenceLinks)
    .filter((link: any) => link.evidenceKind === "quoted_span")
    .map((link: any) => `paragraph_${String(link.paragraphIndex + 1).padStart(2, "0")}`),
);
assert.equal(quotedMcqParagraphs.size >= 2, true, "quoted-span MCQs excluding item 18 must cite at least two paragraph sections");

const passageSpecificityRows = buildMcqPassageSpecificityReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any);
assert.equal(hasBlockingPassageSpecificityFailure(passageSpecificityRows), false, `EOY P2 passage-specificity must pass: ${JSON.stringify(passageSpecificityRows.filter((row) => row.result === "FAIL"))}`);

const ecCatalog = {
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a literary text.",
  "E03.A-K.1.1.2": "Recount stories and determine the central message, lesson, or moral and explain how it is conveyed through key details in the text.",
  "E03.A-K.1.1.3": "Describe characters in a story and explain how their actions contribute to the sequence of events.",
  "E03.A-C.2.1.1": "Explain the point of view of the narrator or characters in a literary text.",
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases.",
  "E03.A-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in literary text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, ecCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `EOY P2 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p2/student_preview.md", "utf8");
assert.equal(/correctIndex|correctCells|isCorrect|distractorRole|rationale|comprehensionKind|rubric|scoreBandExamples|expectedAnswerCore|acceptableTextSupport|commonIncompletePatterns|auditMetadata|evidenceBinding|evidenceLinks|quotedSpan/i.test(studentPreview), false, "EOY P2 student preview must be key-free and evidence-free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p2/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "EOY P2 reviewer preview must include keys");

console.log("PSSA EOY P2 item tests passed.");
