import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { assertNoBannedKeys, projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import {
  assembleDiagnosticFormFromPool,
  assembleEoyDiagnosticFormFromPoolForTest,
  computePssaFormContentHash,
  EOY_ANALYTICS_ITEM_IDS,
  EOY_DIAGNOSTIC_SECTION_ITEM_IDS,
  GRADE3_BLUEPRINT,
  GRADE3_DIAGNOSTIC_BLUEPRINT,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

const EXPECTED_IDS = EOY_DIAGNOSTIC_SECTION_ITEM_IDS.flatMap((ids) => [...ids]);
const DTO_PATH = path.join(process.env.TMPDIR ?? "/tmp", "eoy_student_dto.json");

function readBackend(name: string) {
  return JSON.parse(fs.readFileSync(`exemplars/pssa_grade3_eoy_${name}/backend.json`, "utf8"));
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
  const passageLinks = Array.isArray(raw.passageLinks)
    ? raw.passageLinks.map((link: any) => ({
        passageId: link.passageId,
        passage: passageMap.get(link.passageId),
        role: link.role ?? "primary",
        sortOrder: link.sortOrder ?? 0,
      }))
    : passageId
      ? [{ passageId, passage: passageMap.get(passageId), role: "primary", sortOrder: 0 } as any]
      : [];
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
    batchId: "eoy-batch",
    batch: {
      id: "eoy-batch",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-eoy-corpus",
      batchAuditResult: "PASS",
    },
    passages: passageLinks,
    passageGroupId: raw.passageGroupId,
    passageGroup: group,
    structuredChoicesJson,
    acceptableSupportEvidenceLinks,
  };
}

function eoyPool() {
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

function assemble(items = eoyPool().items) {
  return assembleDiagnosticFormFromPool({
    seed: "g3-eoy-001",
    blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: items,
    allItems: items,
  });
}

function assembleForTest(items = eoyPool().items, overrides = {}) {
  return assembleEoyDiagnosticFormFromPoolForTest({
    seed: "g3-eoy-001",
    blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: items,
    allItems: items,
  }, overrides);
}

function selectedSourceItems(resultItems: Array<{ itemId: string }>, pool: PssaAssemblyItem[]) {
  const byId = new Map(pool.map((item) => [item.id, item]));
  return resultItems.map((item) => byId.get(item.itemId)!);
}

function totals(rows: Array<{ itemId: string; slotType: string }>, pool: PssaAssemblyItem[]) {
  const sources = selectedSourceItems(rows, pool);
  return {
    readingMcq: sources.filter((item) => item.interactionType === "MCQ" && !String(item.eligibleContent).startsWith("E03.D")).length,
    conventions: rows.filter((item) => item.slotType === "conventions_1pt").length,
    ebsr: sources.filter((item) => item.interactionType === "EBSR").length,
    te: sources.filter((item) => ["MATCHING_GRID", "DRAG_DROP"].includes(String(item.interactionType))).length,
    shortAnswer: rows.filter((item) => item.slotType === "short_answer").length,
  };
}

function gate(result: ReturnType<typeof assemble>, gateName: string) {
  return result.gates.find((row) => row.gate === gateName);
}

function expectEoyRefusal(result: ReturnType<typeof assembleForTest>, gateName: string, message: string) {
  assert.equal(result.ok, false, message);
  assert.equal(result.gates.some((row) => row.gate === gateName && row.status === "FAIL"), true, `${message}: expected failing gate ${gateName}`);
}

const pool = eoyPool();
assert.equal(EXPECTED_IDS.length, 45, "EOY pinned roster must contain 45 item IDs");
assert.equal(new Set(EXPECTED_IDS).size, 45, "EOY pinned roster must be unique");
for (const id of EXPECTED_IDS) assert.equal(pool.items.some((item) => item.id === id), true, `EOY pinned item resolves from pool: ${id}`);

const positive = assemble(pool.items);
assert.equal(positive.ok, true, positive.gates.map((row) => `${row.gate}:${row.status}:${row.detail}`).join("\n"));

assert.deepEqual(positive.items.map((item) => item.itemId), EXPECTED_IDS, "EOY selected IDs must match the pinned 45-item roster");
assert.equal(new Set(positive.items.map((item) => item.itemId)).size, 45, "EOY selected IDs must be unique");
const operational = positive.items.filter((item) => item.scoringBucket !== "analytics_only");
const analytics = positive.items.filter((item) => item.scoringBucket === "analytics_only");
assert.deepEqual([operational.length, operational.reduce((sum, item) => sum + item.pointValue, 0)], [35, 45], "EOY operational totals must be 35/45");
assert.deepEqual([analytics.length, analytics.reduce((sum, item) => sum + item.pointValue, 0)], [10, 16], "EOY analytics totals must be 10/16");
assert.deepEqual(analytics.map((item) => item.itemId).sort(), [...EOY_ANALYTICS_ITEM_IDS].sort(), "EOY analytics IDs must match the pinned AO set");
assert.equal(positive.items.length, 45, "EOY delivers exactly 45 items");
assert.equal(positive.items.reduce((sum, item) => sum + item.pointValue, 0), 61, "EOY delivered possible points are informational 61");
assert.equal(positive.totalPoints, 45, "AssemblyResult totalPoints must be operational-only");
assert.deepEqual(positive.categoryPoints, { A: 18, B: 18, D: 9 }, "EOY operational category points must be score-basis only");

assert.deepEqual(totals(positive.items, pool.items), { readingMcq: 26, conventions: 9, ebsr: 4, te: 4, shortAnswer: 2 }, "delivered type totals");
assert.deepEqual(totals(operational, pool.items), { readingMcq: 20, conventions: 9, ebsr: 2, te: 2, shortAnswer: 2 }, "operational type totals");
assert.deepEqual(totals(analytics, pool.items), { readingMcq: 6, conventions: 0, ebsr: 2, te: 2, shortAnswer: 0 }, "analytics type totals");

assert.deepEqual([1, 2, 3].map((sectionIndex) => positive.items.filter((item) => item.sectionIndex === sectionIndex).length), [12, 18, 15], "section delivered counts must be 12/18/15");
assert.deepEqual([1, 2, 3].map((sectionIndex) => {
  const rows = positive.items.filter((item) => item.sectionIndex === sectionIndex);
  const op = rows.filter((item) => item.scoringBucket !== "analytics_only");
  const ao = rows.filter((item) => item.scoringBucket === "analytics_only");
  return [op.length, op.reduce((sum, item) => sum + item.pointValue, 0), ao.length, ao.reduce((sum, item) => sum + item.pointValue, 0)];
}), [[11, 12, 1, 1], [13, 18, 5, 7], [11, 15, 4, 8]], "section bucket totals must match the EOY pins");
assert.deepEqual(positive.sections?.map((section) => [section.sectionIndex, section.sectionType, section.label, section.estimatedMinutes]), [
  [1, "conventions_reading", "Section 1", 60],
  [2, "reading", "Section 2", 80],
  [3, "conventions_reading", "Section 3", 60],
], "EOY section metadata must match the pins");
assert.equal(positive.passages.length, 5, "EOY emits five raw passage rows");
assert.deepEqual([1, 2, 3].map((sectionIndex) => positive.passages.filter((passage) => passage.sectionIndex === sectionIndex).map((passage) => passage.passageId)), [
  ["pssa_psg_g3_eoy_p4_borrowed_bike"],
  ["pssa_psg_g3_eoy_p2_broken_vase", "pssa_psg_g3_eoy_p3_school_long_ago", "pssa_psg_g3_eoy_p3_school_today"],
  ["pssa_psg_g3_eoy_p1_crayons"],
], "EOY passage rows must be placed by section");
assert.equal(new Set(positive.passages.map((passage) => passage.passageUnitId)).size, 4, "P3 paired group counts as one passage unit");
assert.equal(positive.passages.filter((passage) => passage.passageUnitId === "pssa_pg_g3_eoy_p3_school_paired").length, 2, "P3 emits both member passage rows");
assert.equal(positive.items.filter((item) => item.passageUnitId === "pssa_pg_g3_eoy_p3_school_paired").every((item) => item.sectionIndex === 2), true, "P3 items stay atomic in S2");

const sectionIds = [1, 2, 3].map((sectionIndex) => positive.items.filter((item) => item.sectionIndex === sectionIndex).map((item) => item.itemId));
assert.deepEqual(sectionIds, EOY_DIAGNOSTIC_SECTION_ITEM_IDS.map((ids) => [...ids]), "student delivery order must match the pinned section order");
assert.deepEqual(sectionIds[0].slice(4, 7), ["pssa_item_g3_eoy_p4_mcq_ak112", "pssa_item_g3_eoy_p4_ebsr_ak113", "pssa_item_g3_eoy_p4_mcq_av412_ao6"], "AO-6 stays beside the P4 host items");
assert.deepEqual(sectionIds[1].slice(5, 8), ["pssa_item_g3_eoy_p2_te_ak113", "pssa_item_g3_eoy_p2_sa_ak112", "pssa_item_g3_eoy_p2_mcq_ac211_ao5"], "AO-5 stays beside the P2 host items");
assert.deepEqual(sectionIds[1].slice(14), ["pssa_item_g3_eoy_p3_mcq_bc211_ao1", "pssa_item_g3_eoy_p3_mcq_bv412_ao4", "pssa_item_g3_eoy_p3_ebsr_bk111_ao7", "pssa_item_g3_eoy_p3_ebsr_bc311_ao8"], "P3 analytics stay among P3 items");
assert.deepEqual(sectionIds[2].slice(7, 11), ["pssa_item_g3_eoy_p1_mcq_bc212_ao2", "pssa_item_g3_eoy_p1_mcq_bv411_ao3", "pssa_item_g3_eoy_p1_te_bc313_ao9", "pssa_item_g3_eoy_p1_te_bv411_ao10"], "P1 analytics stay beside P1 items before conventions");

const conventionSections = new Map(positive.items.filter((item) => item.slotType === "conventions_1pt").map((item) => [pool.items.find((source) => source.id === item.itemId)!.eligibleContent, item.sectionIndex]));
for (const ec of ["E03.D.1.1.2", "E03.D.1.1.3", "E03.D.1.1.6", "E03.D.1.1.7", "E03.D.1.1.9"]) assert.equal(conventionSections.get(ec), 1, `${ec} convention must be in S1`);
for (const ec of ["E03.D.1.2.2", "E03.D.1.2.3", "E03.D.1.2.4", "E03.D.1.2.6"]) assert.equal(conventionSections.get(ec), 3, `${ec} convention must be in S3`);

assert.equal(gate(positive, "answer_position_distribution")?.detail.includes("A=7 B=8 C=8 D=6"), true, "EOY operational answer-position distribution must be A7/B8/C8/D6");
assert.equal(gate(positive, "operational_ec_caps")?.detail.includes("opReadingMcqMax=2"), true, "operational reading-MCQ EC cap must be 2");
assert.equal(gate(positive, "delivered_ec_caps")?.detail.includes("E03.B-V.4.1.1"), true, "delivered EC triples include the AO-expanded B-V.4.1.1");
assert.equal(positive.gates.every((row) => row.status === "PASS"), true, "all EOY gates pass");

const rerun = assemble(pool.items);
assert.equal(rerun.contentHash, positive.contentHash, "same EOY inputs preserve contentHash");
assert.deepEqual(rerun.canonical, positive.canonical, "same EOY inputs preserve canonical JSON");
const bucketFlip = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, scoringBucket: "analytics_only" } : item),
};
assert.notEqual(computePssaFormContentHash(bucketFlip), positive.contentHash, "changing only scoringBucket changes the EOY contentHash");
assert.equal((positive.canonical as any).totalPoints, 45, "canonical totalPoints is operational-only");

expectEoyRefusal(assemble(pool.items.map((item) => item.id === "pssa_item_g3_eoy_p4_mcq_av412_ao6" ? { ...item, scoringBucket: "operational" } : item)), "scoring_bucket_assignment", "AO item marked operational refuses");
expectEoyRefusal(assemble(pool.items.map((item) => item.id === "pssa_item_g3_eoy_p4_mcq_av412" ? { ...item, scoringBucket: "analytics_only" } : item)), "scoring_bucket_assignment", "non-AO item marked analytics refuses");
assert.match(assemble(pool.items.map((item) => item.id === "pssa_item_g3_eoy_p4_mcq_av412_ao6" ? { ...item, scoringBucket: null } as any : item)).refusedReason ?? "", /missing_or_invalid_scoring_bucket/, "explicit null scoringBucket refuses");
assert.match(assemble(pool.items.filter((item) => item.id !== "pssa_item_g3_eoy_p3_ebsr_bc311_ao8")).refusedReason ?? "", /PINNED_ITEMS_MISSING/, "missing analytics item refuses");
expectEoyRefusal(assembleForTest(pool.items, { sectionItemIds: [[...EOY_DIAGNOSTIC_SECTION_ITEM_IDS[0], "pssa_item_g3_eoy_p1_mcq_bk111"], EOY_DIAGNOSTIC_SECTION_ITEM_IDS[1], EOY_DIAGNOSTIC_SECTION_ITEM_IDS[2]] }), "delivered_count", "extra delivered item refuses");
expectEoyRefusal(assembleForTest(pool.items, { sectionItemIds: [
  EOY_DIAGNOSTIC_SECTION_ITEM_IDS[0].filter((id) => id !== "pssa_item_g3_eoy_conv_d119_sentence_formation"),
  EOY_DIAGNOSTIC_SECTION_ITEM_IDS[1],
  [...EOY_DIAGNOSTIC_SECTION_ITEM_IDS[2], "pssa_item_g3_eoy_conv_d119_sentence_formation"],
] }), "conventions_by_ec_section", "wrong convention section refuses");
expectEoyRefusal(assembleForTest(pool.items, { passageRows: [
  { position: 1, passageId: "pssa_psg_g3_eoy_p4_borrowed_bike", passageUnitId: "pssa_psg_g3_eoy_p4_borrowed_bike", sectionIndex: 1 },
  { position: 2, passageId: "pssa_psg_g3_eoy_p2_broken_vase", passageUnitId: "pssa_psg_g3_eoy_p2_broken_vase", sectionIndex: 2 },
  { position: 3, passageId: "pssa_psg_g3_eoy_p3_school_long_ago", passageUnitId: "pssa_pg_g3_eoy_p3_school_paired", sectionIndex: 2 },
  { position: 4, passageId: "pssa_psg_g3_eoy_p3_school_today", passageUnitId: "pssa_pg_g3_eoy_p3_school_paired", sectionIndex: 3 },
  { position: 5, passageId: "pssa_psg_g3_eoy_p1_crayons", passageUnitId: "pssa_psg_g3_eoy_p1_crayons", sectionIndex: 3 },
] }), "p3_group_integrity", "split P3 member passage refuses");

const studentDtos = selectedSourceItems(positive.items, pool.items).map((item) => projectPssaStudentItem({ ...item, scoringBucket: positive.items.find((row) => row.itemId === item.id)?.scoringBucket }));
assertNoBannedKeys(studentDtos);
fs.writeFileSync(DTO_PATH, JSON.stringify(studentDtos, null, 2));
const dtoText = fs.readFileSync(DTO_PATH, "utf8");
assert.equal(/scoringBucket|analytics_only|operational/i.test(dtoText), false, "student DTO artifact must not leak bucket labels");

const p1Before = fs.readFileSync("exemplars/pssa_grade3_eoy_p1/backend.json", "utf8");
assemble(pool.items);
assert.equal(fs.readFileSync("exemplars/pssa_grade3_eoy_p1/backend.json", "utf8"), p1Before, "assembly must not mutate bank backend JSON bytes");

const boyUnsupported = assembleDiagnosticFormFromPool({
  seed: "g3-eoy-001",
  blueprintVersion: GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  readyItems: [],
  allItems: [],
});
assert.equal(boyUnsupported.ok, false, "BOY branch remains available and independent");
assert.equal(GRADE3_BLUEPRINT.maxReadingEcRepeats, 2, "foundation flat blueprint remains capped at 2");
assert.equal(GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion, "pde-ela-diagnostic-stamina-2025-g3-moy-v1", "MOY diagnostic blueprint version remains unchanged");

console.log("PSSA EOY form assembly tests passed.");
