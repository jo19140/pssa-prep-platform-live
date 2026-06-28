import assert from "node:assert/strict";
import fs from "node:fs";

import { buildPssaFormCreateData } from "./content/assemble-pssa-form";
import {
  assembleDiagnosticFormFromPool,
  EOY_ANALYTICS_ITEM_IDS,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  type AssemblyResult,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

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
    batchId: "eoy-section-test-batch",
    batch: {
      id: "eoy-section-test-batch",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-eoy-section-test-corpus",
      batchAuditResult: "PASS",
    },
    passages: passageLinks,
    passageGroupId: raw.passageGroupId,
    passageGroup: group,
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

function assembleEoy() {
  const pool = eoyPool();
  const result = assembleDiagnosticFormFromPool({
    seed: "g3-eoy-001",
    blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: pool.items,
    allItems: pool.items,
  });
  assert.equal(result.ok, true, result.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));
  return result;
}

const eoy = assembleEoy();
const eoyCreate = buildPssaFormCreateData(eoy, {
  blueprint: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  seed: "g3-eoy-001",
  assembledBy: "test",
}, "assembly-run-eoy-test") as any;

assert.equal(eoyCreate.hasSections, true, "EOY create payload must persist hasSections=true");
assert.deepEqual(eoyCreate.sections.create.map((section: any) => [section.sectionIndex, section.sectionType, section.label, section.estimatedMinutes]), [
  [1, "conventions_reading", "Section 1", 60],
  [2, "reading", "Section 2", 80],
  [3, "conventions_reading", "Section 3", 60],
], "EOY create payload must persist the three timed section rows");
assert.deepEqual([1, 2, 3].map((sectionIndex) => eoyCreate.items.create.filter((item: any) => item.sectionIndex === sectionIndex).length), [12, 18, 15], "EOY item create rows must keep 12/18/15 section split");
assert.deepEqual([1, 2, 3].map((sectionIndex) => eoyCreate.passages.create.filter((passage: any) => passage.sectionIndex === sectionIndex).map((passage: any) => passage.passageId)), [
  ["pssa_psg_g3_eoy_p4_borrowed_bike"],
  ["pssa_psg_g3_eoy_p2_broken_vase", "pssa_psg_g3_eoy_p3_school_long_ago", "pssa_psg_g3_eoy_p3_school_today"],
  ["pssa_psg_g3_eoy_p1_crayons"],
], "EOY passage create rows must keep section placement");
assert.equal(eoyCreate.items.create.filter((item: any) => item.itemId.startsWith("pssa_item_g3_eoy_p3_")).every((item: any) => item.sectionIndex === 2), true, "P3 paired items remain atomic in Section 2");
assert.deepEqual([
  eoyCreate.items.create.filter((item: any) => item.scoringBucket !== "analytics_only").length,
  eoyCreate.items.create.filter((item: any) => item.scoringBucket === "analytics_only").length,
], [35, 10], "EOY create payload must preserve operational/analytics bucket counts");
assert.deepEqual(
  eoyCreate.items.create.filter((item: any) => item.scoringBucket === "analytics_only").map((item: any) => item.itemId).sort(),
  [...EOY_ANALYTICS_ITEM_IDS].sort(),
  "EOY create payload must preserve pinned analytics item IDs",
);

const sectionless: AssemblyResult = {
  ok: true,
  refusedReason: null,
  contentHash: "sha256:sectionless",
  canonical: {},
  passages: [{
    position: 1,
    passageId: "passage_1",
    categoryPoints: { A: 1, B: 0, D: 0 },
    approvedPassageContentHashSnapshot: "hash-passage_1",
  }],
  items: [{
    position: 1,
    itemId: "item_1",
    slotType: "reading_1pt",
    pointValue: 1,
    category: "A",
    passageId: "passage_1",
    approvedContentHashSnapshot: "hash-item_1",
  }],
  categoryPoints: { A: 1, B: 0, D: 0 },
  totalPoints: 1,
  gates: [],
  deficits: [],
};
const sectionlessCreate = buildPssaFormCreateData(sectionless, {
  blueprint: "foundation-blueprint",
  seed: "foundation-seed",
  assembledBy: "test",
}, "assembly-run-sectionless-test") as any;

assert.equal(sectionlessCreate.hasSections, false, "sectionless create payload must persist hasSections=false");
assert.equal("sections" in sectionlessCreate, false, "sectionless create payload must omit nested sections");
assert.deepEqual(sectionlessCreate.items.create.map((item: any) => item.sectionIndex), [null], "sectionless item sectionIndex must be null");
assert.deepEqual(sectionlessCreate.passages.create.map((passage: any) => passage.sectionIndex), [null], "sectionless passage sectionIndex must be null");

console.log("PSSA form section persistence tests passed.");
