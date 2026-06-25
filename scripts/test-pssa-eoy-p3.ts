import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { buildItemEcSkillMatchReport, buildMcqPassageSpecificityReport, hasBlockingPassageSpecificityFailure } from "./audit/pssa-audit-detectors";
import { buildEoyP3Items, buildEoyP3Packet, buildEoyP3PassageGroup } from "./content/author-pssa-eoy-p3";
import { evaluatePssaDomainFactCheckRequired, evaluatePssaPassageStaminaMetadata } from "./content/lib/pssa-stamina-gates";
import { computePssaPassageGroupContentHash } from "./content/lib/pssa-paired-passage-gates";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_eoy_p3/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildEoyP3Packet();
const group = packet.passageGroups?.[0] ?? buildEoyP3PassageGroup();
const passages = packet.passages ?? group.members.map((member: any) => member.passage);
const items = packet.items ?? buildEoyP3Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));
const byPassage = new Map<string, any>(passages.map((passage: any) => [passage.id, passage]));
const text1 = byPassage.get("pssa_psg_g3_eoy_p3_school_long_ago").text;
const text2 = byPassage.get("pssa_psg_g3_eoy_p3_school_today").text;

function stableHash(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

assert.equal(packet.noDbWrite, true, "EOY P3 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "EOY P3 backend must not be production import ready");
assert.equal(packet.passageGroups.length, 1, "EOY P3 must author one passage group");
assert.equal(packet.passages.length, 2, "EOY P3 must author two member passages");
assert.equal(items.length, 10, "EOY P3 must author ten items");

assert.equal(group.id, "pssa_pg_g3_eoy_p3_school_paired");
assert.equal(group.groupType, "paired_informational");
assert.equal(group.genre, "paired_informational");
assert.equal(group.staminaBand, "released_length");
assert.equal(group.domainVocabularyLoad, "medium");
assert.equal(group.wordCount, 850);
assert.equal(group.contentHash, computePssaPassageGroupContentHash(group), "EOY P3 group hash must recompute");
assert.deepEqual(group.members.map((member: any) => [member.slot, member.position, member.passageId]), [
  ["passage_1", 1, "pssa_psg_g3_eoy_p3_school_long_ago"],
  ["passage_2", 2, "pssa_psg_g3_eoy_p3_school_today"],
]);
assert.deepEqual(
  group.textFeaturesJson,
  [
    { type: "paired_member", slot: "passage_1", title: "School Long Ago" },
    { type: "paired_member", slot: "passage_2", title: "School Today" },
  ],
);

for (const member of group.members) {
  assert.equal(member.passageContentHashSnapshot, member.passage.contentHash, `${member.slot} snapshot must match member hash`);
}
for (const passage of passages) {
  assert.equal(passage.passageType, "informational", `${passage.id} passageType`);
  assert.equal(passage.genre, "informational", `${passage.id} genre`);
  assert.equal(passage.staminaBand, undefined, `${passage.id} member must not carry staminaBand`);
  assert.equal(passage.domainVocabularyLoad, "medium", `${passage.id} vocabulary load`);
  assert.deepEqual(passage.textFeaturesJson, [], `${passage.id} must not carry features/figures`);
  assert.equal(passage.factCheckRequired, true, `${passage.id} factCheckRequired`);
  assert.equal(passage.factCheckNotesJson.length, 8, `${passage.id} must carry eight fact-check records`);
  assert.equal(evaluatePssaDomainFactCheckRequired(passage), "PASS", `${passage.id} fact-check gate`);
  assert.equal(evaluatePssaPassageStaminaMetadata(passage), "SKIP", `${passage.id} member stamina metadata`);
  assert.equal(passage.contentHash, stableHash({ id: passage.id, title: passage.title, gradeLevel: 3, subject: "ELA", passageType: "informational", genre: "informational", text: passage.text }), `${passage.id} content hash`);
  for (const note of passage.factCheckNotesJson) {
    for (const key of ["claimId", "claim", "sourceTitle", "organization", "sourceUrl", "claimSupported", "dateAccessed", "passageSlot"]) assert.notEqual(note[key], undefined, `${note.claimId} ${key}`);
    assert.equal(note.claimSupported, true, `${note.claimId} supported`);
    assert.equal(String(note.sourceUrl).startsWith("https://"), true, `${note.claimId} https`);
    assert.equal(note.dateAccessed, "2026-06-24", `${note.claimId} date`);
  }
}
assert.equal(byPassage.get("pssa_psg_g3_eoy_p3_school_long_ago").wordCount, 425);
assert.equal(byPassage.get("pssa_psg_g3_eoy_p3_school_today").wordCount, 425);
assert.equal(byPassage.get("pssa_psg_g3_eoy_p3_school_long_ago").factCheckNotesJson.every((note: any) => note.passageSlot === "passage_1" && note.sourceUrl.includes("loc.gov")), true);
assert.equal(byPassage.get("pssa_psg_g3_eoy_p3_school_today").factCheckNotesJson.every((note: any) => note.passageSlot === "passage_2" && note.sourceUrl.includes("nces.ed.gov")), true);

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_eoy_p3_mcq_bk112", "E03.B-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_mcq_bc211", "E03.B-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_mcq_bv412", "E03.B-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_mcq_bk113", "E03.B-K.1.1.3", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_mcq_bc312", "E03.B-C.3.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_ebsr_bc312", "E03.B-C.3.1.2", "EBSR", 2],
    ["pssa_item_g3_eoy_p3_mcq_bc211_ao1", "E03.B-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_mcq_bv412_ao4", "E03.B-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_eoy_p3_ebsr_bk111_ao7", "E03.B-K.1.1.1", "EBSR", 2],
    ["pssa_item_g3_eoy_p3_ebsr_bc311_ao8", "E03.B-C.3.1.1", "EBSR", 2],
  ],
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [1, 3, 0, 2, 1, 0, 2], "EOY P3 MCQ keys must be B/D/A/C/B/A/C");
assert.deepEqual(items.filter((item: any) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1, 0, 2], "EOY P3 EBSR Part A keys must be B/A/C");

for (const item of items) {
  assert.equal(item.passageGroupId, "pssa_pg_g3_eoy_p3_school_paired", `${item.itemId} passageGroupId`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  projectPssaStudentItem(item);
}

function linkKeys(link: any) {
  return Object.keys(link).sort();
}
for (const item of items) {
  if (["pssa_item_g3_eoy_p3_mcq_bc312", "pssa_item_g3_eoy_p3_ebsr_bc312"].includes(item.itemId)) {
    assert.equal(item.isCrossText, true, `${item.itemId} must be cross-text`);
    assert.deepEqual(item.requiredEvidenceSlotsJson, ["passage_1", "passage_2"], `${item.itemId} required slots`);
    assert.deepEqual(item.passageLinks.map((link: any) => link.passageId).sort(), [passage1Id(), passage2Id()].sort(), `${item.itemId} links both members`);
  } else {
    assert.equal(item.isCrossText, false, `${item.itemId} must be single-text`);
    assert.equal(item.requiredEvidenceSlotsJson, undefined, `${item.itemId} must omit requiredEvidenceSlotsJson`);
    assert.equal(item.passageLinks.length, 1, `${item.itemId} single link`);
  }
  for (const link of item.passageLinks) assert.equal(link.role, "primary", `${item.itemId} link role`);
  if (item.interactionType === "EBSR") for (const link of item.passageLinks) assert.deepEqual(linkKeys(link), ["passageId", "role"], `${item.itemId} EBSR links omit sortOrder`);
  else for (const link of item.passageLinks) assert.deepEqual(linkKeys(link), ["passageId", "role", "sortOrder"], `${item.itemId} MCQ links include sortOrder`);
}

function passage1Id() { return "pssa_psg_g3_eoy_p3_school_long_ago"; }
function passage2Id() { return "pssa_psg_g3_eoy_p3_school_today"; }

for (const id of ["pssa_item_g3_eoy_p3_mcq_bk112", "pssa_item_g3_eoy_p3_mcq_bc211", "pssa_item_g3_eoy_p3_mcq_bc211_ao1"]) {
  assert.equal(byId.get(id).evidenceBinding.evidenceKind, "whole_passage_synthesis", `${id} synthesis`);
  assert.equal(byId.get(id).evidenceBinding.quotedSpan, undefined, `${id} must not fabricate quotedSpan`);
}
assert.equal(byId.get("pssa_item_g3_eoy_p3_mcq_bk112").comprehensionKind, "synthesis", "item 8 main idea uses synthesis");
assert.equal(byId.get("pssa_item_g3_eoy_p3_mcq_bc211").comprehensionKind, "interpretation", "item 9 viewpoint uses interpretation");
assert.equal(byId.get("pssa_item_g3_eoy_p3_mcq_bc211").comprehensionKindRationale.length > 20, true);
assert.equal(byId.get("pssa_item_g3_eoy_p3_mcq_bc211_ao1").comprehensionKind, "interpretation", "AO-1 viewpoint uses interpretation");
assert.equal(byId.get("pssa_item_g3_eoy_p3_mcq_bc211_ao1").comprehensionKindRationale.length > 20, true);
assert.notEqual(byId.get("pssa_item_g3_eoy_p3_mcq_bk112").structuredChoicesJson[byId.get("pssa_item_g3_eoy_p3_mcq_bk112").correctIndex].text, byId.get("pssa_item_g3_eoy_p3_mcq_bc211").structuredChoicesJson[byId.get("pssa_item_g3_eoy_p3_mcq_bc211").correctIndex].text);

function sourceForSlot(slot: "passage_1" | "passage_2") {
  return slot === "passage_1" ? text1 : text2;
}
const mcqAnchorSpans = new Set<string>();
for (const item of items.filter((item: any) => item.interactionType === "MCQ")) {
  const choices = item.structuredChoicesJson;
  const roles = choices.filter((_choice: any, index: number) => index !== item.correctIndex).map((choice: any) => choice.distractorRole);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const [index, choice] of choices.entries()) {
    assert.equal(typeof choice.isCorrect, "boolean", `${item.itemId} choice ${index} isCorrect`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} choice ${index} rationale`);
    if (index === item.correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct role null`);
    else assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} registered role ${choice.distractorRole}`);
    assert.equal(choice.evidenceLinks.length > 0, true, `${item.itemId} choice ${index} evidence links`);
    for (const link of choice.evidenceLinks) {
      if (link.evidenceKind === "quoted_span") {
        assert.equal(sourceForSlot(link.passageSlot).slice(link.startChar, link.endChar), link.quotedSpan, `${item.itemId} slice matches quotedSpan`);
        assert.equal(Number.isInteger(link.paragraphIndex), true, `${item.itemId} paragraphIndex`);
        assert.equal(Number.isInteger(link.sentenceIndex), true, `${item.itemId} sentenceIndex`);
        mcqAnchorSpans.add(link.quotedSpan);
      } else {
        assert.equal(link.quotedSpan, undefined, `${item.itemId} synthesis link has no quotedSpan`);
      }
    }
  }
}

const passageSpecificRows = buildMcqPassageSpecificityReport(items.filter((item: any) => item.interactionType === "MCQ"), passages);
assert.equal(hasBlockingPassageSpecificityFailure(passageSpecificRows), false, `EOY P3 MCQ passage-specificity must not block: ${JSON.stringify(passageSpecificRows.filter((row) => row.result === "FAIL"))}`);

const ecCatalog = {
  "E03.B-K.1.1.1": "Ask and answer questions to demonstrate understanding of key details in an informational text.",
  "E03.B-K.1.1.2": "Determine the main idea of an informational text and explain how key details support it.",
  "E03.B-K.1.1.3": "Describe the relationship between a series of events, ideas, concepts, or steps in an informational text using language that pertains to time, sequence, and cause/effect.",
  "E03.B-C.2.1.1": "Distinguish the author's point of view from that of others in an informational text.",
  "E03.B-C.3.1.1": "Describe the logical connection between particular sentences and paragraphs in an informational text.",
  "E03.B-C.3.1.2": "Compare and contrast the most important points and key details presented in two texts on the same topic.",
  "E03.B-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in informational text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), passages, ecCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `EOY P3 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

const ebsr13 = byId.get("pssa_item_g3_eoy_p3_ebsr_bc312");
assert.equal(ebsr13.isCrossText, true);
assert.deepEqual(ebsr13.correctResponseJson.partB.correctIndices, [0, 2]);
assert.deepEqual(ebsr13.responseSpecJson.partB.choices.map((choice: any) => choice.passageSlot), ["passage_1", "passage_1", "passage_2", "passage_2"]);
assert.equal(ebsr13.responseSpecJson.partB.choices.filter((choice: any, index: number) => ebsr13.correctResponseJson.partB.correctIndices.includes(index) && choice.passageSlot === "passage_1").length, 1);
assert.equal(ebsr13.responseSpecJson.partB.choices.filter((choice: any, index: number) => ebsr13.correctResponseJson.partB.correctIndices.includes(index) && choice.passageSlot === "passage_2").length, 1);

const ebsrAo7 = byId.get("pssa_item_g3_eoy_p3_ebsr_bk111_ao7");
assert.equal(ebsrAo7.isCrossText, false);
assert.deepEqual(ebsrAo7.correctResponseJson.partB.correctIndices, [0, 1]);
assert.equal(ebsrAo7.responseSpecJson.partB.choices.every((choice: any) => choice.passageSlot === "passage_1"), true);

const ebsrAo8 = byId.get("pssa_item_g3_eoy_p3_ebsr_bc311_ao8");
assert.equal(ebsrAo8.isCrossText, false);
assert.deepEqual(ebsrAo8.correctResponseJson.partB.correctIndices, [0, 2]);
assert.equal(ebsrAo8.responseSpecJson.partB.choices.every((choice: any) => choice.passageSlot === "passage_2"), true);

const correctPartBSpans = [ebsr13, ebsrAo7, ebsrAo8].flatMap((item: any) => item.correctResponseJson.partB.correctIndices.map((index: number) => item.responseSpecJson.partB.choices[index].text));
assert.equal(correctPartBSpans.length, 6, "EOY P3 must have six correct Part B spans");
assert.equal(new Set(correctPartBSpans).size, 6, "six EBSR correct spans must be pairwise distinct");
for (const span of correctPartBSpans) {
  assert.equal(mcqAnchorSpans.has(span), false, `EBSR span must be distinct from MCQ anchors: ${span}`);
}
for (const item of [ebsr13, ebsrAo7, ebsrAo8]) {
  for (const choice of item.responseSpecJson.partB.choices) assert.equal(sourceForSlot(choice.passageSlot).includes(choice.text), true, `${item.itemId} Part B verbatim`);
}

assert.deepEqual(scorePssaItem(ebsr13, { partAIndex: 1, partBIndices: [0, 2] }), { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" });
assert.deepEqual(scorePssaItem(ebsrAo7, { partAIndex: 0, partBIndices: [0, 1] }), { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" });
assert.deepEqual(scorePssaItem(ebsrAo8, { partAIndex: 2, partBIndices: [0, 2] }), { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" });

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p3/student_preview.md", "utf8");
assert.equal(/correctIndex|correctIndices|correctResponseJson|distractorRole|rationale|answerKey|factCheckNotesJson|claimId|sourceUrl|isCorrect|evidenceLinks|quotedSpan|comprehensionKind/i.test(studentPreview), false, "EOY P3 student preview must be key/fact-check free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_eoy_p3/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "EOY P3 reviewer preview must include keys");
assert.equal(reviewerPreview.includes("t1-one-room-all-ages"), true, "EOY P3 reviewer preview must include Text 1 fact-check records");
assert.equal(reviewerPreview.includes("t2-device-per-student"), true, "EOY P3 reviewer preview must include Text 2 fact-check records");

console.log("PSSA EOY P3 item tests passed.");
