import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { assertNoBannedKeys, projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import {
  assembleDiagnosticFormFromPool,
  assembleMoyDiagnosticFormFromPoolForTest,
  computePssaFormContentHash,
  GRADE3_BLUEPRINT,
  GRADE3_DIAGNOSTIC_BLUEPRINT,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT,
  MOY_DIAGNOSTIC_SECTION_ITEM_IDS,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

const ANALYTICS_IDS = new Set([
  "pssa_item_g3_moy_p1_ao5_dd_bc313",
  "pssa_item_g3_moy_p3_mcq_bv412_ao1",
  "pssa_item_g3_moy_p3_mcq_bc211_ao3",
  "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
  "pssa_item_g3_moy_p4_mcq_av412_ao2",
]);

const EXPECTED_IDS = MOY_DIAGNOSTIC_SECTION_ITEM_IDS.flatMap((ids) => [...ids]);
const DTO_PATH = path.join(process.env.TMPDIR ?? "/tmp", "moy_student_dto.json");

function readBackend(name: string) {
  return JSON.parse(fs.readFileSync(`exemplars/pssa_grade3_moy_${name}/backend.json`, "utf8"));
}

function readyPassage(raw: any): PssaAssemblyPassage {
  const hash = raw.contentHash ?? `hash-${raw.id}`;
  return {
    ...raw,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvedContentHash: hash,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: hash,
    latestAuditContentHash: hash,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
    gradeLevel: 3,
    subject: "ELA",
  };
}

function readyItem(raw: any, passageMap: Map<string, PssaAssemblyPassage>, groupById: Map<string, any>): PssaAssemblyItem {
  const id = raw.id ?? raw.itemId;
  const hash = raw.contentHash ?? `hash-${id}`;
  const passageId = raw.passageId ?? null;
  const group = raw.passageGroupId ? groupById.get(raw.passageGroupId) : null;
  const structuredChoicesJson = raw.interactionType === "MCQ" && Array.isArray(raw.structuredChoicesJson)
    ? raw.structuredChoicesJson.map((choice: any, index: number) => {
      const bindingLinks = raw.evidenceBinding?.passageSlots?.map((passageSlot: string) => ({
        passageSlot,
        evidenceKind: raw.evidenceBinding.evidenceKind ?? "whole_passage_synthesis",
      })) ?? [];
      const evidenceLinks = [...(choice.evidenceLinks ?? []), ...bindingLinks]
        .filter((link, linkIndex, links) => links.findIndex((candidate) => candidate.passageSlot === link.passageSlot && candidate.evidenceKind === link.evidenceKind) === linkIndex);
      return {
        ...choice,
        ...(index === raw.correctIndex ? { isCorrect: true, evidenceLinks } : {}),
      };
    })
    : raw.structuredChoicesJson;
  const acceptableSupportEvidenceLinks = raw.interactionType === "EBSR" && raw.isCrossText
    ? (raw.responseSpecJson?.partB?.choices ?? [])
      .filter((choice: any) => choice.isCorrect)
      .map((choice: any) => ({ passageSlot: choice.passageSlot, evidenceKind: "quoted_span", quotedSpan: choice.text }))
    : raw.acceptableSupportEvidenceLinks;
  return {
    ...raw,
    id,
    itemId: id,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    pointValue: raw.pointValue ?? raw.scoringJson?.totalPoints ?? raw.scoring?.totalPoints ?? 1,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    approvedContentHash: hash,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: hash,
    latestAuditContentHash: hash,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    deprecatedReason: null,
    retiredAt: null,
    batchId: "moy-batch",
    batch: {
      id: "moy-batch",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-moy-corpus",
      batchAuditResult: "PASS",
    },
    passages: passageId ? [{ passage: passageMap.get(passageId), role: "primary", sortOrder: 0 } as any] : [],
    passageGroupId: raw.passageGroupId,
    passageGroup: group,
    structuredChoicesJson,
    acceptableSupportEvidenceLinks,
  };
}

function moyPool() {
  const p1 = readBackend("p1");
  const p2 = readBackend("p2");
  const p3 = readBackend("p3");
  const p4 = readBackend("p4");
  const conventions = readBackend("conventions");
  const passages = [
    ...p1.passages,
    ...p2.passages,
    ...p3.passages,
    ...p4.passages,
  ].map(readyPassage);
  const passageMap = new Map(passages.map((passage) => [passage.id, passage]));
  const p3Group = {
    ...p3.passageGroups[0],
    members: p3.passageGroups[0].members.map((member: any) => ({
      ...member,
      passage: passageMap.get(member.passageId),
    })),
  };
  const groupById = new Map([[p3Group.id, p3Group]]);
  const items = [
    ...p1.items,
    ...p2.items,
    ...p3.items,
    ...p4.items,
    ...conventions.items,
  ].map((item: any) => readyItem(item, passageMap, groupById));
  return { items, passages };
}

function assemble(items = moyPool().items, overrides = {}) {
  return assembleDiagnosticFormFromPool({
    seed: "g3-moy-001",
    blueprintVersion: GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: items,
    allItems: items,
  });
}

function assembleForTest(items = moyPool().items, overrides = {}) {
  return assembleMoyDiagnosticFormFromPoolForTest({
    seed: "g3-moy-001",
    blueprintVersion: GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: items,
    allItems: items,
  }, overrides);
}

function selectedSourceItems(resultItems: Array<{ itemId: string }>, pool: PssaAssemblyItem[]) {
  const byId = new Map(pool.map((item) => [item.id, item]));
  return resultItems.map((item) => byId.get(item.itemId)!);
}

const pool = moyPool();
const positive = assemble(pool.items);
assert.equal(positive.ok, true, positive.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));

assert.deepEqual(positive.items.map((item) => item.itemId), EXPECTED_IDS, "MOY selected IDs must match the pinned 40-item roster");
assert.equal(new Set(positive.items.map((item) => item.itemId)).size, 40, "MOY selected IDs must be unique");
const operational = positive.items.filter((item) => item.scoringBucket !== "analytics_only");
const analytics = positive.items.filter((item) => item.scoringBucket === "analytics_only");
assert.deepEqual([operational.length, operational.reduce((sum, item) => sum + item.pointValue, 0)], [35, 45], "MOY operational totals must be 35/45");
assert.deepEqual([analytics.length, analytics.reduce((sum, item) => sum + item.pointValue, 0)], [5, 8], "MOY analytics totals must be 5/8");
assert.deepEqual(analytics.map((item) => item.itemId).sort(), [...ANALYTICS_IDS].sort(), "MOY analytics IDs must match the pinned AO set");
assert.equal(positive.items.length, 40, "MOY delivers exactly 40 items");
assert.equal(positive.items.reduce((sum, item) => sum + item.pointValue, 0), 53, "MOY delivered possible points are informational 53");
assert.equal(positive.totalPoints, 45, "AssemblyResult totalPoints must be operational-only");
assert.deepEqual(positive.categoryPoints, { A: 18, B: 18, D: 9 }, "MOY operational category points must be score-basis only");

function totals(rows: typeof positive.items) {
  const sources = selectedSourceItems(rows, pool.items);
  return {
    readingMcq: sources.filter((item) => item.interactionType === "MCQ" && !String(item.eligibleContent).startsWith("E03.D")).length,
    conventions: rows.filter((item) => item.slotType === "conventions_1pt").length,
    ebsr: sources.filter((item) => item.interactionType === "EBSR").length,
    te: sources.filter((item) => ["MATCHING_GRID", "DRAG_DROP"].includes(String(item.interactionType))).length,
    shortAnswer: rows.filter((item) => item.slotType === "short_answer").length,
  };
}
assert.deepEqual(totals(positive.items), { readingMcq: 23, conventions: 9, ebsr: 3, te: 3, shortAnswer: 2 }, "delivered type totals");
assert.deepEqual(totals(operational), { readingMcq: 20, conventions: 9, ebsr: 2, te: 2, shortAnswer: 2 }, "operational type totals");
assert.deepEqual(totals(analytics), { readingMcq: 3, conventions: 0, ebsr: 1, te: 1, shortAnswer: 0 }, "analytics type totals");

assert.deepEqual([1, 2, 3].map((sectionIndex) => positive.items.filter((item) => item.sectionIndex === sectionIndex).length), [12, 16, 12], "section delivered counts must be 12/16/12");
assert.deepEqual([1, 2, 3].map((sectionIndex) => {
  const rows = positive.items.filter((item) => item.sectionIndex === sectionIndex);
  const op = rows.filter((item) => item.scoringBucket !== "analytics_only");
  const ao = rows.filter((item) => item.scoringBucket === "analytics_only");
  return [op.length, op.reduce((sum, item) => sum + item.pointValue, 0), ao.length, ao.reduce((sum, item) => sum + item.pointValue, 0)];
}), [[11, 12, 1, 1], [13, 18, 3, 4], [11, 15, 1, 3]], "section bucket totals must match the MOY pins");
assert.deepEqual(positive.sections?.map((section) => [section.sectionIndex, section.sectionType, section.label, section.estimatedMinutes]), [
  [1, "conventions_reading", "Section 1", 55],
  [2, "reading", "Section 2", 70],
  [3, "conventions_reading", "Section 3", 50],
], "MOY section metadata must match the pins");
assert.equal(positive.passages.length, 5, "MOY emits five raw passage rows");
assert.deepEqual([1, 2, 3].map((sectionIndex) => positive.passages.filter((passage) => passage.sectionIndex === sectionIndex).map((passage) => passage.passageId)), [
  ["pssa_psg_g3_moy_p4_last_rehearsal"],
  ["pssa_psg_g3_moy_p2_stubborn_dough", "pssa_psg_g3_moy_p3_letter_travels", "pssa_psg_g3_moy_p3_carrier_day"],
  ["pssa_psg_g3_moy_p1_museum_map"],
], "MOY passage rows must be placed by section");
assert.equal(new Set(positive.passages.map((passage) => passage.passageUnitId)).size, 4, "P3 paired group counts as one passage unit");
assert.equal(positive.passages.filter((passage) => passage.passageUnitId === "pssa_pg_g3_moy_p3_mail_paired").length, 2, "P3 emits both member passage rows");
assert.equal(positive.items.filter((item) => item.passageUnitId === "pssa_pg_g3_moy_p3_mail_paired").every((item) => item.sectionIndex === 2), true, "P3 items stay atomic in S2");

const sectionIds = [1, 2, 3].map((sectionIndex) => positive.items.filter((item) => item.sectionIndex === sectionIndex).map((item) => item.itemId));
assert.deepEqual(sectionIds, MOY_DIAGNOSTIC_SECTION_ITEM_IDS.map((ids) => [...ids]), "student delivery order must match the pinned section order");
assert.deepEqual(sectionIds[0].slice(4, 7), ["pssa_item_g3_moy_p4_mcq_av412", "pssa_item_g3_moy_p4_mcq_av412_ao2", "pssa_item_g3_moy_p4_ebsr_ak113"], "AO-2 is adjacent to the P4 host item");
assert.deepEqual(sectionIds[1].slice(13), ["pssa_item_g3_moy_p3_mcq_bv412_ao1", "pssa_item_g3_moy_p3_mcq_bc211_ao3", "pssa_item_g3_moy_p3_ebsr_bc311_ao4"], "P3 analytics stay among P3 items");
assert.deepEqual(sectionIds[2].slice(6, 9), ["pssa_item_g3_moy_p1_sa_bk113", "pssa_item_g3_moy_p1_ao5_dd_bc313", "pssa_item_g3_moy_conv_d121_title_caps"], "AO-5 stays beside P1 items before conventions");

const conventionSections = new Map(positive.items.filter((item) => item.slotType === "conventions_1pt").map((item) => [pool.items.find((source) => source.id === item.itemId)!.eligibleContent, item.sectionIndex]));
for (const ec of ["E03.D.1.1.1", "E03.D.1.1.4", "E03.D.1.1.5", "E03.D.1.1.6", "E03.D.1.1.8"]) assert.equal(conventionSections.get(ec), 1, `${ec} convention must be in S1`);
for (const ec of ["E03.D.1.2.1", "E03.D.1.2.3", "E03.D.1.2.5", "E03.D.2.1.1"]) assert.equal(conventionSections.get(ec), 3, `${ec} convention must be in S3`);

assert.equal(positive.gates.find((gate) => gate.gate === "answer_position_distribution")?.detail.includes("A=8 B=7 C=7 D=7"), true, "MOY operational answer-position distribution must be A8/B7/C7/D7");
assert.equal(positive.gates.find((gate) => gate.gate === "operational_ec_caps")?.detail.includes("opReadingMcqMax=2"), true, "operational reading-MCQ EC cap must be 2");
assert.equal(positive.gates.find((gate) => gate.gate === "delivered_ec_caps")?.detail.includes("E03.A-V.4.1.2"), true, "delivered EC triples include the AO-expanded A-V.4.1.2");
assert.equal(positive.gates.every((gate) => gate.status === "PASS"), true, "all MOY gates pass");
assert.equal(positive.sections?.reduce((sum, section) => sum + ({ 1: 1086, 2: 1680, 3: 687 } as Record<number, number>)[section.sectionIndex], 0), 3453, "MOY word load total is 3,453");

const rerun = assemble(pool.items);
assert.equal(rerun.contentHash, positive.contentHash, "same MOY inputs preserve contentHash");
assert.deepEqual(rerun.canonical, positive.canonical, "same MOY inputs preserve canonical JSON");
const bucketFlip = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, scoringBucket: "analytics_only" } : item),
};
assert.notEqual(computePssaFormContentHash(bucketFlip), positive.contentHash, "changing only scoringBucket changes the MOY contentHash");
assert.equal((positive.canonical as any).totalPoints, 45, "canonical totalPoints is operational-only");

function expectMoyRefusal(result: ReturnType<typeof assembleForTest>, gate: string, message: string) {
  assert.equal(result.ok, false, message);
  assert.equal(result.gates.some((row) => row.gate === gate && row.status === "FAIL"), true, `${message}: expected failing gate ${gate}`);
}

expectMoyRefusal(assemble(pool.items.map((item) => item.id === "pssa_item_g3_moy_p4_mcq_av412_ao2" ? { ...item, scoringBucket: "operational" } : item)), "scoring_bucket_assignment", "AO item marked operational refuses");
expectMoyRefusal(assemble(pool.items.map((item) => item.id === "pssa_item_g3_moy_p4_mcq_av412" ? { ...item, scoringBucket: "analytics_only" } : item)), "scoring_bucket_assignment", "non-AO item marked analytics refuses");
assert.match(assemble(pool.items.map((item) => item.id === "pssa_item_g3_moy_p4_mcq_av412_ao2" ? { ...item, scoringBucket: null } as any : item)).refusedReason ?? "", /missing_or_invalid_scoring_bucket/, "explicit null scoringBucket refuses");
assert.match(assemble(pool.items.filter((item) => item.id !== "pssa_item_g3_moy_p3_ebsr_bc311_ao4")).refusedReason ?? "", /PINNED_ITEMS_MISSING/, "missing analytics item refuses");
expectMoyRefusal(assembleForTest(pool.items, { sectionItemIds: [[...MOY_DIAGNOSTIC_SECTION_ITEM_IDS[0], "pssa_item_g3_moy_p1_mcq_bk111"], MOY_DIAGNOSTIC_SECTION_ITEM_IDS[1], MOY_DIAGNOSTIC_SECTION_ITEM_IDS[2]] }), "delivered_count", "extra delivered item refuses");
expectMoyRefusal(assembleForTest(pool.items, { sectionItemIds: [
  MOY_DIAGNOSTIC_SECTION_ITEM_IDS[0].filter((id) => id !== "pssa_item_g3_moy_conv_d118_conjunctions"),
  MOY_DIAGNOSTIC_SECTION_ITEM_IDS[1],
  [...MOY_DIAGNOSTIC_SECTION_ITEM_IDS[2], "pssa_item_g3_moy_conv_d118_conjunctions"],
] }), "conventions_by_ec_section", "wrong convention section refuses");
expectMoyRefusal(assembleForTest(pool.items, { passageRows: [
  { position: 1, passageId: "pssa_psg_g3_moy_p4_last_rehearsal", passageUnitId: "pssa_psg_g3_moy_p4_last_rehearsal", sectionIndex: 1 },
  { position: 2, passageId: "pssa_psg_g3_moy_p2_stubborn_dough", passageUnitId: "pssa_psg_g3_moy_p2_stubborn_dough", sectionIndex: 2 },
  { position: 3, passageId: "pssa_psg_g3_moy_p3_letter_travels", passageUnitId: "pssa_pg_g3_moy_p3_mail_paired", sectionIndex: 2 },
  { position: 4, passageId: "pssa_psg_g3_moy_p3_carrier_day", passageUnitId: "pssa_pg_g3_moy_p3_mail_paired", sectionIndex: 3 },
  { position: 5, passageId: "pssa_psg_g3_moy_p1_museum_map", passageUnitId: "pssa_psg_g3_moy_p1_museum_map", sectionIndex: 3 },
] }), "p3_group_integrity", "split P3 member passage refuses");

const studentDtos = selectedSourceItems(positive.items, pool.items).map((item) => projectPssaStudentItem({ ...item, scoringBucket: positive.items.find((row) => row.itemId === item.id)?.scoringBucket }));
assertNoBannedKeys(studentDtos);
fs.writeFileSync(DTO_PATH, JSON.stringify(studentDtos, null, 2));
const dtoText = fs.readFileSync(DTO_PATH, "utf8");
assert.equal(/scoringBucket|analytics_only/i.test(dtoText), false, "student DTO artifact must not leak bucket labels");

const p1Before = fs.readFileSync("exemplars/pssa_grade3_moy_p1/backend.json", "utf8");
assemble(pool.items);
assert.equal(fs.readFileSync("exemplars/pssa_grade3_moy_p1/backend.json", "utf8"), p1Before, "assembly must not mutate bank backend JSON bytes");

const boyUnsupported = assembleDiagnosticFormFromPool({
  seed: "g3-moy-001",
  blueprintVersion: GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  readyItems: [],
  allItems: [],
});
assert.equal(boyUnsupported.ok, false, "BOY branch remains available and independent");
assert.equal(GRADE3_BLUEPRINT.maxReadingEcRepeats, 2, "foundation flat blueprint remains capped at 2");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion, "pde-ela-diagnostic-stamina-2025-g3-v1", "BOY diagnostic blueprint version remains unchanged");

console.log("PSSA MOY form assembly tests passed.");
