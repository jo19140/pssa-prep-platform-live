import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMoyP3Items, buildMoyP3Packet, buildMoyP3PassageGroup } from "./content/author-pssa-moy-p3";
import { buildItemEcSkillMatchReport, singleAnswerChoiceGroups } from "./audit/pssa-audit-detectors";
import { evaluatePssaDomainFactCheckRequired } from "./content/lib/pssa-stamina-gates";
import { mappingRegistry } from "../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { scorePssaItem } from "../lib/content/pssaScoring";

const packetPath = "exemplars/pssa_grade3_moy_p3/backend.json";
const packet = fs.existsSync(packetPath) ? JSON.parse(fs.readFileSync(packetPath, "utf8")) : buildMoyP3Packet();
const group = packet.passageGroups?.[0] ?? buildMoyP3PassageGroup();
const passages = packet.passages ?? group.members.map((member: any) => member.passage);
const items = packet.items ?? buildMoyP3Items();
const byId = new Map<string, any>(items.map((item: any) => [item.itemId ?? item.id, item]));
const byPassage = new Map<string, any>(passages.map((passage: any) => [passage.id, passage]));
const text1 = byPassage.get("pssa_psg_g3_moy_p3_letter_travels").text;
const text2 = byPassage.get("pssa_psg_g3_moy_p3_carrier_day").text;

assert.equal(packet.noDbWrite, true, "MOY P3 backend must be file-only noDbWrite");
assert.equal(packet.productionImportReady, false, "MOY P3 backend must not be production import ready");
assert.equal(packet.passageGroups.length, 1, "MOY P3 must author exactly one passage group");
assert.equal(packet.passages.length, 2, "MOY P3 must author exactly two member passages");
assert.equal(items.length, 9, "MOY P3 must author exactly nine items");

assert.equal(group.id, "pssa_pg_g3_moy_p3_mail_paired");
assert.equal(group.groupType, "paired_informational");
assert.equal(group.genre, "paired_informational");
assert.equal(group.staminaBand, "released_length");
assert.equal(group.domainVocabularyLoad, "medium");
assert.equal(group.wordCount, 796);
assert.deepEqual(group.members.map((member: any) => [member.slot, member.position, member.passageId]), [
  ["passage_1", 1, "pssa_psg_g3_moy_p3_letter_travels"],
  ["passage_2", 2, "pssa_psg_g3_moy_p3_carrier_day"],
]);

for (const passage of passages) {
  assert.equal(passage.genre, "informational", `${passage.id} member genre`);
  assert.equal(passage.staminaBand, undefined, `${passage.id} member must not carry staminaBand`);
  assert.equal((passage.textFeaturesJson ?? []).filter((feature: any) => feature.type === "figure").length, 0, `${passage.id} must not carry a figure`);
  assert.equal(passage.reviewStatus, "PENDING", `${passage.id} reviewStatus`);
  assert.equal(passage.itemStatus, "candidate", `${passage.id} itemStatus`);
  assert.equal(evaluatePssaDomainFactCheckRequired(passage), "PASS", `${passage.id} fact-check gate`);
}
assert.equal(byPassage.get("pssa_psg_g3_moy_p3_letter_travels").wordCount, 436);
assert.equal(byPassage.get("pssa_psg_g3_moy_p3_carrier_day").wordCount, 360);

assert.deepEqual(
  items.map((item: any) => [item.itemId, item.eligibleContent, item.interactionType, item.pointValue]),
  [
    ["pssa_item_g3_moy_p3_mcq_bk112_t1", "E03.B-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p3_mcq_bk112_t2", "E03.B-K.1.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p3_mcq_bk113_t1", "E03.B-K.1.1.3", "MCQ", 1],
    ["pssa_item_g3_moy_p3_mcq_bc311_t1", "E03.B-C.3.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p3_mcq_bc312", "E03.B-C.3.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p3_ebsr_bc312", "E03.B-C.3.1.2", "EBSR", 2],
    ["pssa_item_g3_moy_p3_mcq_bv412_ao1", "E03.B-V.4.1.2", "MCQ", 1],
    ["pssa_item_g3_moy_p3_mcq_bc211_ao3", "E03.B-C.2.1.1", "MCQ", 1],
    ["pssa_item_g3_moy_p3_ebsr_bc311_ao4", "E03.B-C.3.1.1", "EBSR", 2],
  ],
);
assert.deepEqual(items.filter((item: any) => item.interactionType === "MCQ").map((item: any) => item.correctIndex), [2, 0, 3, 1, 2, 3, 1], "MOY P3 MCQ keys must be C/A/D/B/C/D/B");
assert.deepEqual(items.filter((item: any) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1, 0], "MOY P3 EBSR Part A keys must be B/A");
const operationalGroups = singleAnswerChoiceGroups(items.slice(0, 5));
const operationalCounts = [0, 0, 0, 0];
for (const row of operationalGroups) operationalCounts[row.correctIndex] += 1;
assert.deepEqual(operationalCounts, [1, 1, 2, 1], "MOY P3 operational MCQ distribution must be A1/B1/C2/D1");

for (const item of items) {
  assert.equal(item.passageGroupId, "pssa_pg_g3_moy_p3_mail_paired", `${item.itemId} passageGroupId`);
  assert.equal(item.scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} reviewStatus`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} itemStatus`);
  projectPssaStudentItem(item);
}

function linkKeys(link: any) {
  return Object.keys(link).sort();
}

for (const item of items) {
  if (["pssa_item_g3_moy_p3_mcq_bc312", "pssa_item_g3_moy_p3_ebsr_bc312"].includes(item.itemId)) {
    assert.equal(item.isCrossText, true, `${item.itemId} must be cross-text`);
    assert.deepEqual(item.requiredEvidenceSlotsJson, ["passage_1", "passage_2"], `${item.itemId} slots`);
    assert.deepEqual(item.passageLinks.map((link: any) => link.passageId).sort(), ["pssa_psg_g3_moy_p3_carrier_day", "pssa_psg_g3_moy_p3_letter_travels"].sort());
  } else {
    assert.equal(Boolean(item.isCrossText), false, `${item.itemId} must be single-text`);
    assert.equal(item.requiredEvidenceSlotsJson, undefined, `${item.itemId} must omit requiredEvidenceSlotsJson`);
    assert.equal(item.passageLinks.length, 1, `${item.itemId} must link one passage`);
  }
  for (const link of item.passageLinks) assert.equal(link.role, "primary", `${item.itemId} link role`);
  if (item.interactionType === "EBSR") {
    for (const link of item.passageLinks) assert.deepEqual(linkKeys(link), ["passageId", "role"], `${item.itemId} EBSR links omit sortOrder`);
  } else {
    for (const link of item.passageLinks) assert.deepEqual(linkKeys(link), ["passageId", "role", "sortOrder"], `${item.itemId} MCQ links include sortOrder`);
  }
}

const expectedEvidenceKind: Record<string, string> = {
  pssa_item_g3_moy_p3_mcq_bk112_t1: "whole_passage_synthesis",
  pssa_item_g3_moy_p3_mcq_bk112_t2: "whole_passage_synthesis",
  pssa_item_g3_moy_p3_mcq_bc312: "whole_passage_synthesis",
  pssa_item_g3_moy_p3_ebsr_bc312: "whole_passage_synthesis",
};
for (const [id, evidenceKind] of Object.entries(expectedEvidenceKind)) {
  assert.equal(byId.get(id).evidenceBinding.evidenceKind, evidenceKind, `${id} evidenceKind`);
  assert.equal(byId.get(id).evidenceBinding.quotedSpan, undefined, `${id} whole-passage synthesis must not fabricate quotedSpan`);
}

const roleRationaleChecks: Record<string, RegExp> = {
  unsupported_inference: /does not say|never says|unsupported|not say/i,
  wrong_section: /Text 1|Text 2|different|belongs|section|detail/i,
  opposite_claim: /reverse|reverses|opposite|instead/i,
  plausible_misreading: /literal|misread|comparison|plausible/i,
  wrong_emphasis: /true|focuses|detail|not the focus|not why/i,
  too_narrow: /one detail|too narrow|not the main|not the shared/i,
};

for (const item of items) {
  const choices = item.interactionType === "MCQ" ? item.structuredChoicesJson : item.partA?.choices;
  const correctIndex = item.interactionType === "MCQ" ? item.correctIndex : item.correctResponseJson.partA.correctIndex;
  const distractors = choices.filter((_choice: any, index: number) => index !== correctIndex);
  const roles = distractors.map((choice: any) => choice.distractorRole);
  assert.equal(new Set(roles).size, 3, `${item.itemId} must have 3 distinct distractorRole values`);
  for (const choice of distractors) {
    assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
    assert.equal(String(choice.rationale ?? "").trim().length > 20, true, `${item.itemId} rationale must be nonblank`);
    const pattern = roleRationaleChecks[String(choice.distractorRole)];
    if (pattern) assert(pattern.test(choice.rationale), `${item.itemId} ${choice.distractorRole} rationale must align: ${choice.rationale}`);
  }
}

function assertSpan(slot: "passage_1" | "passage_2", span: string, id: string) {
  assert.equal((slot === "passage_1" ? text1 : text2).includes(span), true, `${id} span must be verbatim in ${slot}: ${span}`);
}
for (const item of items) {
  for (const choice of item.answerChoicesJson ?? []) {
    for (const link of choice.evidenceLinks ?? []) assertSpan(link.passageSlot, link.quotedSpan, item.itemId);
  }
  for (const choice of item.responseSpecJson?.partB?.choices ?? []) assertSpan(choice.passageSlot, choice.text, item.itemId);
}

const item4 = byId.get("pssa_item_g3_moy_p3_mcq_bc311_t1");
assert.equal(item4.evidenceBinding.quotedSpan, "Grouping letters by destination helps keep the mail organized.", "item 4 uses destination grouping only");
assert.equal(/barcode/i.test(item4.studentFacingPrompt), false, "item 4 must not test barcode reading");
assert.equal(/sorting center/i.test(item4.structuredChoicesJson[item4.correctIndex].text), false, "item 4 correct idea must not restate item 3");

const item6 = byId.get("pssa_item_g3_moy_p3_ebsr_bc312");
assert.equal(item6.isCrossText, true);
assert.deepEqual(item6.correctResponseJson.partB.correctIndices, [0, 2]);
assert.deepEqual(item6.responseSpecJson.partB.choices.map((choice: any) => choice.passageSlot), ["passage_1", "passage_1", "passage_2", "passage_2"]);
assert.equal(item6.responseSpecJson.partB.choices[0].text, "When the letters reach the local post office, carriers sort them one more time — now by street and by house number.");
assert.notEqual(item6.responseSpecJson.partB.choices[0].text, item4.evidenceBinding.quotedSpan, "item 6 passage_1 evidence must not reuse item 4 sentence");
assert.equal(item6.responseSpecJson.partB.choices.filter((choice: any, index: number) => item6.correctResponseJson.partB.correctIndices.includes(index) && choice.passageSlot === "passage_1").length, 1);
assert.equal(item6.responseSpecJson.partB.choices.filter((choice: any, index: number) => item6.correctResponseJson.partB.correctIndices.includes(index) && choice.passageSlot === "passage_2").length, 1);

const item9 = byId.get("pssa_item_g3_moy_p3_ebsr_bc311_ao4");
assert.equal(item9.isCrossText, false);
assert.deepEqual(item9.correctResponseJson.partB.correctIndices, [1, 3]);
assert.notDeepEqual(item9.correctResponseJson.partB.correctIndices, item6.correctResponseJson.partB.correctIndices);
assert.equal(item9.responseSpecJson.partB.choices.every((choice: any) => choice.passageSlot === "passage_2"), true);
for (const choice of item9.responseSpecJson.partB.choices) assert.equal(text1.includes(choice.text), false, "item 9 Part B must be entirely from Text 2");
const item6Text2Correct = item6.responseSpecJson.partB.choices[item6.correctResponseJson.partB.correctIndices.find((index: number) => item6.responseSpecJson.partB.choices[index].passageSlot === "passage_2")].text;
for (const index of item9.correctResponseJson.partB.correctIndices) assert.notEqual(item9.responseSpecJson.partB.choices[index].text, item6Text2Correct, "EBSRs must not share a Text-2 correct sentence");

assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bk112_t1").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_letter_travels");
assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bk113_t1").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_letter_travels");
assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bc311_t1").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_letter_travels");
assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bv412_ao1").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_letter_travels");
assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bk112_t2").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_carrier_day");
assert.equal(byId.get("pssa_item_g3_moy_p3_mcq_bc211_ao3").passageLinks[0].passageId, "pssa_psg_g3_moy_p3_carrier_day");

const moyP3EcCatalog = {
  "E03.B-K.1.1.2": "Determine the main idea of an informational text and explain how key details support it.",
  "E03.B-K.1.1.3": "Describe the relationship between a series of events, ideas, concepts, or steps in an informational text using language that pertains to time, sequence, and cause/effect.",
  "E03.B-C.3.1.1": "Describe the logical connection between particular sentences and paragraphs in an informational text.",
  "E03.B-C.3.1.2": "Compare and contrast the most important points and key details presented in two texts on the same topic.",
  "E03.B-V.4.1.2": "Demonstrate understanding of word relationships and nonliteral language in informational text.",
  "E03.B-C.2.1.1": "Distinguish the author's point of view from that of others in an informational text.",
};
const skillRows = buildItemEcSkillMatchReport(items.filter((item: any) => item.interactionType === "MCQ"), passages as any, moyP3EcCatalog);
assert.equal(skillRows.some((row) => row.skillMatchResult === "FAIL"), false, `MOY P3 MCQ EC-skill rows must pass: ${JSON.stringify(skillRows)}`);

for (const passage of passages) {
  const expectedPrefix = passage.id === "pssa_psg_g3_moy_p3_letter_travels" ? "t1-" : "t2-";
  assert.equal(passage.factCheckRequired, true, `${passage.id} factCheckRequired`);
  assert.equal(passage.factCheckNotesJson.length, 5, `${passage.id} must carry five fact-check notes`);
  for (const note of passage.factCheckNotesJson) {
    assert.equal(note.claimId.startsWith(expectedPrefix), true, `${note.claimId} prefix`);
    for (const key of ["claimId", "claim", "sourceTitle", "organization", "sourceUrl", "claimSupported", "dateAccessed"]) assert.notEqual(note[key], undefined, `${note.claimId} ${key}`);
    assert.equal(note.claimSupported, true);
    assert.equal(String(note.sourceUrl).startsWith("https:"), true);
    assert.equal(String(note.sourceUrl).includes("..."), false);
    assert.equal(note.dateAccessed, "2026-06-21");
  }
}

const ALLOWED_SLOTS = new Set(["passage_1", "passage_2"]);
const SLOT_KEYS = new Set(["slot", "passageSlot", "passageSlots", "requiredEvidenceSlotsJson"]);
const found = new Set<string>();
(function walk(node: unknown, parentKey?: string) {
  if (Array.isArray(node)) { for (const value of node) walk(value, parentKey); return; }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) walk(value, key);
    return;
  }
  if (typeof node === "string" && parentKey && SLOT_KEYS.has(parentKey)) found.add(node);
})(packet);
assert.deepEqual([...found].sort(), [...ALLOWED_SLOTS].sort(), "internal slot values must be exactly passage_1/passage_2");

assert.deepEqual(
  scorePssaItem(item6, { partAIndex: 1, partBIndices: [0, 2] }),
  { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" },
  "MOY P3 cross-text EBSR must score full credit",
);
assert.deepEqual(
  scorePssaItem(item9, { partAIndex: 0, partBIndices: [1, 3] }),
  { status: "scored", pointsEarned: 2, maxPoints: 2, detail: "ebsr_full_credit" },
  "MOY P3 AO-4 EBSR must score full credit",
);

const studentPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p3/student_preview.md", "utf8");
assert.equal(/correctIndex|correctIndices|correctResponseJson|distractorRole|rationale|answerKey|factCheckNotesJson|claimId|sourceUrl/i.test(studentPreview), false, "MOY P3 student preview must be key/fact-check free");
const reviewerPreview = fs.readFileSync("exemplars/pssa_grade3_moy_p3/reviewer_preview.md", "utf8");
assert.equal(reviewerPreview.includes("(KEY)"), true, "MOY P3 reviewer preview must include keys");
assert.equal(reviewerPreview.includes("t1-stamp-payment"), true, "MOY P3 reviewer preview must include fact-check notes");

console.log("PSSA MOY P3 item tests passed.");
