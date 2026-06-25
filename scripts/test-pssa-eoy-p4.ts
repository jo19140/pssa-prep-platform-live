import assert from "node:assert/strict";
import fs from "node:fs";

import { buildItemEcSkillMatchReport, singleAnswerChoiceGroups } from "./audit/pssa-audit-detectors";
import { buildEoyP4Items, buildEoyP4Packet, buildEoyP4Passage } from "./content/author-pssa-eoy-p4";
import {
  buildPssaDramaLineMap,
  buildPssaStaminaSectionMap,
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaTextFeatureIntegrity,
} from "./content/lib/pssa-stamina-gates";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_eoy_p4/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildEoyP4Packet();
const passage = packet.passages?.[0] ?? buildEoyP4Passage();
const items = packet.items ?? buildEoyP4Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));
const lineMap = buildPssaDramaLineMap(passage);

assert.equal(packet.noDbWrite, true, "EOY P4 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "EOY P4 backend must not be production import ready");
assert.equal(packet.passages.length, 1, "EOY P4 must author one passage");
assert.equal(items.length, 7, "EOY P4 must author seven items");

assert.equal(passage.id, "pssa_psg_g3_eoy_p4_borrowed_bike");
assert.equal(passage.title, "The Borrowed Bike");
assert.equal(passage.wordCount, 1137);
assert.equal(passage.genre, "drama");
assert.equal(passage.passageType, "literary");
assert.equal(passage.staminaBand, "released_length");
assert.equal(passage.factCheckRequired, false);
assert.equal("factCheckNotesJson" in passage, false, "EOY P4 fictional drama must omit factCheckNotesJson");
assert.equal((passage.textFeaturesJson ?? []).filter((feature: any) => feature.type === "figure").length, 0, "EOY P4 must not carry a figure");
assert.equal(evaluatePssaDomainFactCheckRequired(passage), "SKIP", "EOY P4 fictional drama fact-check gate must skip");
assert.equal(evaluatePssaPassageStaminaMetadata(passage), "PASS", "EOY P4 drama metadata gate must pass");
assert.equal(evaluatePssaTextFeatureIntegrity(passage, items), "PASS", "EOY P4 drama feature integrity must pass");

const features = passage.textFeaturesJson ?? [];
assert.equal(features.filter((feature: any) => feature.type === "cast_list").length, 1, "EOY P4 must carry one cast list");
assert.equal(passage.text.includes(features.find((feature: any) => feature.type === "cast_list").featureText), true, "cast list featureText must be verbatim");
assert.deepEqual(features.filter((feature: any) => feature.type === "scene_marker").map((feature: any) => feature.sectionId), ["scene_01", "scene_02", "scene_03", "scene_04"]);
const sectionIds = new Set(buildPssaStaminaSectionMap(passage).map((section) => section.sectionId));
for (const id of ["scene_01", "scene_02", "scene_03", "scene_04"]) assert(sectionIds.has(id), `${id} must exist in stamina section map`);

const spokenLines = lineMap.filter((row) => row.evidenceKind === "spoken_line");
assert.deepEqual([...new Set(spokenLines.map((row) => row.speaker))].sort(), ["MAYA", "MR ALVAREZ", "TYLER"].sort(), "speaker set must be exact");
for (const raw of passage.text.split("\n").filter((line: string) => /^(MAYA|TYLER|MR ALVAREZ):/.test(line.trim()))) {
  assert(spokenLines.some((row) => row.text === raw.trim()), `speaker line must parse as spoken_line: ${raw}`);
}
assert.equal(passage.text.includes("MR. ALVAREZ:"), false, "dotted MR. ALVAREZ must be absent");

function findLine(span: string, speaker?: string) {
  const row = lineMap.find((row) => row.text.includes(span) && (!speaker || row.speaker === speaker));
  assert(row, `line-map row not found for ${span}`);
  return row;
}

assert.deepEqual(
  pickLine(findLine("I saved up two whole summers of chore money for it.", "MAYA")),
  { sceneId: "scene_01", lineIndex: 4, speaker: "MAYA", evidenceKind: "spoken_line" },
);
assert.deepEqual(
  pickLine(findLine("cold as ice", "MAYA")),
  { sceneId: "scene_02", lineIndex: 3, speaker: "MAYA", evidenceKind: "spoken_line" },
);
assert.deepEqual(
  pickLine(findLine("He swerved so fast that he scraped the whole side.", "MR ALVAREZ")),
  { sceneId: "scene_03", lineIndex: 5, speaker: "MR ALVAREZ", evidenceKind: "spoken_line" },
);
assert.deepEqual(
  pickLine(findLine("I jumped to conclusions.", "MAYA")),
  { sceneId: "scene_04", lineIndex: 5, speaker: "MAYA", evidenceKind: "spoken_line" },
);

function pickLine(row: any) {
  return { sceneId: row.sceneId, lineIndex: row.lineIndex, speaker: row.speaker, evidenceKind: row.evidenceKind };
}

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_eoy_p4_mcq_ak111", "E03.A-K.1.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p4_mcq_ak113", "E03.A-K.1.1.3", "MCQ", 1],
    ["pssa_item_g3_eoy_p4_mcq_av411", "E03.A-V.4.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p4_mcq_av412", "E03.A-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p4_mcq_ak112", "E03.A-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p4_ebsr_ak113", "E03.A-K.1.1.3", "EBSR", 2],
    ["pssa_item_g3_eoy_p4_mcq_av412_ao6", "E03.A-V.4.1.2", "MCQ", 1],
  ],
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [2, 0, 3, 1, 2, 1], "EOY P4 MCQ keys must be C/A/D/B/C/B");
assert.deepEqual(items.filter((item: any) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [0], "EOY P4 EBSR Part A key must be A");

const operationalCounts = [0, 0, 0, 0];
for (const group of singleAnswerChoiceGroups(items.filter((item: any) => item.interactionType === "MCQ").slice(0, 5))) operationalCounts[group.correctIndex] += 1;
assert.deepEqual(operationalCounts, [1, 1, 2, 1], "EOY P4 operational MCQ distribution must be A1/B1/C2/D1");

for (const item of items) {
  assert.equal(item.passageId, "pssa_psg_g3_eoy_p4_borrowed_bike", `${item.itemId} passageId`);
  assert.equal(item.passageGroupId, undefined, `${item.itemId} must not set passageGroupId`);
  assert.equal(item.passageLinks, undefined, `${item.itemId} must not set passageLinks`);
  assert.equal(item.isCrossText, undefined, `${item.itemId} must not set isCrossText`);
  assert.equal(item.requiredEvidenceSlotsJson, undefined, `${item.itemId} must not set requiredEvidenceSlotsJson`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  projectPssaStudentItem(item);
}

for (const item of items) {
  const choices = item.interactionType === "MCQ" ? item.structuredChoicesJson : item.partA?.choices;
  const correctIndex = item.interactionType === "MCQ" ? item.correctIndex : item.correctResponseJson.partA.correctIndex;
  const distractors = choices.filter((_choice: any, index: number) => index !== correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(distractors.length, 3, `${item.itemId} must have 3 distractors`);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const [index, choice] of choices.entries()) {
    if (index === correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct role must be null`);
    else assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} registered role ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} rationale`);
  }
  if (item.interactionType === "MCQ") {
    const lengths = choices.map((choice: any) => choice.text.length);
    assert.equal(lengths[item.correctIndex] < Math.max(...lengths), true, `${item.itemId} correct choice must not be the longest`);
  }
}

function assertDramaLiteralLink(link: any, label: string) {
  if (link.evidenceKind === "whole_play_synthesis") {
    assert.equal("quotedSpan" in link, false, `${label} synthesis no quotedSpan`);
    assert.equal("sceneId" in link, false, `${label} synthesis no sceneId`);
    assert.equal("lineIndex" in link, false, `${label} synthesis no lineIndex`);
    return;
  }
  assert.equal(typeof link.quotedSpan, "string", `${label} quotedSpan`);
  assert.equal(/^scene_\d{2}$/.test(link.sceneId), true, `${label} sceneId`);
  assert.equal(Number.isInteger(link.lineIndex), true, `${label} lineIndex`);
  assert.equal(passage.text.includes(link.quotedSpan), true, `${label} quotedSpan verbatim`);
  if (link.evidenceKind === "spoken_line") assert.equal(typeof link.speaker, "string", `${label} speaker`);
  if (link.evidenceKind === "stage_direction") assert.equal("speaker" in link, false, `${label} stage direction omits speaker`);
}
for (const item of items) {
  for (const choice of item.answerChoicesJson ?? []) for (const link of choice.evidenceLinks ?? []) assertDramaLiteralLink(link, `${item.itemId} choice`);
  for (const choice of item.partB?.choices ?? []) for (const link of choice.evidenceLinks ?? []) assertDramaLiteralLink(link, `${item.itemId} Part B`);
}

const swervedItem = byId.get("pssa_item_g3_eoy_p4_mcq_av411");
const swervedLink = swervedItem.structuredChoicesJson[swervedItem.correctIndex].evidenceLinks[0];
assert.deepEqual(pickLine(swervedLink), { sceneId: "scene_03", lineIndex: 5, speaker: "MR ALVAREZ", evidenceKind: "spoken_line" }, "swerved must resolve to MR ALVAREZ scene_03");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_ak112").evidenceBinding.evidenceKind, "whole_play_synthesis", "message item whole-play synthesis");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_ak112").comprehensionKind, "synthesis", "message item comprehensionKind");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_ak113").evidenceBinding.evidenceKind, "whole_play_synthesis", "sequence item whole-play synthesis");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_ak113").comprehensionKind, "synthesis", "sequence item comprehensionKind");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_av412").evidenceBinding.targetWordOrPhrase, "cold as ice");
assert.equal(byId.get("pssa_item_g3_eoy_p4_mcq_av412_ao6").evidenceBinding.targetWordOrPhrase, "jumped to conclusions");
assert.notEqual(byId.get("pssa_item_g3_eoy_p4_mcq_av412").evidenceBinding.quotedSpan, byId.get("pssa_item_g3_eoy_p4_mcq_av412_ao6").evidenceBinding.quotedSpan, "figurative items must use distinct phrases");

const ao6Span = "I jumped to conclusions.";
let ao6UsageCount = 0;
for (const item of items) {
  for (const choice of item.answerChoicesJson ?? []) for (const link of choice.evidenceLinks ?? []) if (link.quotedSpan === ao6Span) ao6UsageCount += 1;
  for (const choice of item.partB?.choices ?? []) for (const link of choice.evidenceLinks ?? []) if (link.quotedSpan === ao6Span) ao6UsageCount += 1;
}
assert.equal(ao6UsageCount, 1, "AO-6 jumped-to-conclusions line must be reserved to AO-6 only");

const ebsr = byId.get("pssa_item_g3_eoy_p4_ebsr_ak113");
assert.equal(ebsr.scoringJson.totalPoints, 2);
assert.deepEqual(ebsr.correctResponseJson.partA.correctIndex, 0);
assert.deepEqual(ebsr.correctResponseJson.partB.correctIndices, [1, 2]);
assert.equal(ebsr.responseSpecJson.partB.requiredSelectionCount, 2);
const partBLinks = ebsr.responseSpecJson.partB.choices.map((choice: any) => choice.evidenceLinks[0]);
assert.deepEqual(pickLine(partBLinks[1]), { sceneId: "scene_02", lineIndex: 5, speaker: "MAYA", evidenceKind: "spoken_line" });
assert.deepEqual(pickLine(partBLinks[2]), { sceneId: "scene_02", lineIndex: 7, speaker: "MAYA", evidenceKind: "spoken_line" });
const correctEbsrSpans = ebsr.correctResponseJson.partB.correctIndices.map((index: number) => ebsr.responseSpecJson.partB.choices[index].text);
for (const item of items.filter((item: any) => item.interactionType === "MCQ")) {
  for (const choice of item.structuredChoicesJson) for (const link of choice.evidenceLinks ?? []) if (link.quotedSpan) assert.equal(correctEbsrSpans.includes(link.quotedSpan), false, `${item.itemId} must not reuse EBSR correct evidence`);
}
assert.deepEqual(scorePssaItem(ebsr, { partAIndex: 0, partBIndices: [1, 2] }), { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" });

const eoyP4EcCatalog = {
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a literary text, referring explicitly to the text as the basis for the answers.",
  "E03.A-K.1.1.2": "Recount stories and determine the central message, lesson, or moral and explain how it is conveyed through key details in the text.",
  "E03.A-K.1.1.3": "Describe characters in a story and explain how their actions contribute to the sequence of events.",
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown words and phrases based on grade 3 literary reading and content.",
  "E03.A-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in literary text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), [passage] as any, eoyP4EcCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `EOY P4 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p4/student_preview.md", "utf8");
assert.equal(/correctIndex|correctIndices|correctResponseJson|distractorRole|rationale|answerKey|factCheckNotesJson|claimId|sourceUrl/i.test(studentPreview), false, "EOY P4 student preview must be key/fact-check free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p4/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "EOY P4 reviewer preview must include keys");
assert.equal(reviewerPreview.includes("You were probably showing off"), true, "EOY P4 reviewer preview must include EBSR evidence");

console.log("PSSA EOY P4 item tests passed.");
