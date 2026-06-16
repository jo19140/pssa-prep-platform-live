import assert from "node:assert/strict";

import {
  assemblePssaFormFromPool,
  computePssaFormContentHash,
  decidePssaFormWrite,
  GRADE3_BLUEPRINT,
  GRADE3_DIAGNOSTIC_BLUEPRINT,
  verifyPssaFormSnapshots,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

function passage(id: string): PssaAssemblyPassage {
  return {
    id,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvedContentHash: `hash-${id}`,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: `hash-${id}`,
    latestAuditContentHash: `hash-${id}`,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
    gradeLevel: 3,
    subject: "ELA",
  };
}

const passages = ["p1", "p2", "p3", "p4"].map(passage);

function readyItem(input: {
  id: string;
  ec: string;
  reportingCategory?: string | null;
  interactionType?: string;
  pointValue?: number;
  passageId?: string | null;
  correctIndex?: number;
  pattern?: unknown;
}): PssaAssemblyItem {
  const p = input.passageId ? passages.find((row) => row.id === input.passageId)! : null;
  const pointValue = input.pointValue ?? 1;
  const interactionType = input.interactionType ?? "MCQ";
  return {
    id: input.id,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    standardCode: input.ec,
    eligibleContent: input.ec,
    reportingCategory: input.reportingCategory ?? input.ec.match(/^E03\.([ABD])/)?.[1] ?? null,
    interactionType,
    pointValue,
    responseSpecJson: responseSpecFor(interactionType),
    correctResponseJson: input.pattern ?? { correctIndex: input.correctIndex ?? 0 },
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    approvedContentHash: `hash-${input.id}`,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: `hash-${input.id}`,
    latestAuditContentHash: `hash-${input.id}`,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    deprecatedReason: null,
    retiredAt: null,
    batchId: "batch-1",
    batch: {
      id: "batch-1",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-corpus",
      batchAuditResult: "PASS",
    },
    passages: p ? [{ passage: p, role: "primary", sortOrder: 0 } as any] : [],
  };
}

function responseSpecFor(interactionType: string) {
  if (interactionType === "EBSR") return {
    partA: { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
    partB: { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] },
  };
  if (interactionType === "SHORT_ANSWER") return { stem: "Explain.", instructionText: "Use details.", requiresTextSupport: true };
  return { choices: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }] };
}

function validPool() {
  const items: PssaAssemblyItem[] = [];
  for (let i = 0; i < 9; i += 1) {
    items.push(readyItem({ id: `conv-${i}`, ec: `E03.D.${i}.1`, passageId: null, correctIndex: i % 4 }));
  }
  for (let i = 0; i < 10; i += 1) {
    items.push(readyItem({ id: `read-a-${i}`, ec: `E03.A.${i}.1`, passageId: i < 5 ? "p1" : "p2", correctIndex: i % 4 }));
  }
  for (let i = 0; i < 10; i += 1) {
    items.push(readyItem({ id: `read-b-${i}`, ec: `E03.B.${i}.1`, passageId: i < 5 ? "p3" : "p4", correctIndex: (i + 2) % 4 }));
  }
  items.push(readyItem({ id: "mp-a-2", ec: "E03.A.20.1", interactionType: "EBSR", pointValue: 2, passageId: "p1", correctIndex: 0, pattern: { partA: { correctIndex: 0 }, partB: { correctIndices: [1, 2] } } }));
  items.push(readyItem({ id: "mp-a-3", ec: "E03.A.21.1", interactionType: "EBSR", pointValue: 3, passageId: "p2", correctIndex: 1, pattern: { partA: { correctIndex: 1 }, partB: { correctIndices: [2, 3] } } }));
  items.push(readyItem({ id: "mp-b-2", ec: "E03.B.20.1", interactionType: "EBSR", pointValue: 2, passageId: "p3", correctIndex: 2, pattern: { partA: { correctIndex: 2 }, partB: { correctIndices: [0, 3] } } }));
  items.push(readyItem({ id: "mp-b-3", ec: "E03.B.21.1", interactionType: "EBSR", pointValue: 3, passageId: "p4", correctIndex: 3, pattern: { partA: { correctIndex: 3 }, partB: { correctIndices: [0, 1] } } }));
  items.push(readyItem({ id: "sa-a", ec: "E03.A.30.1", interactionType: "SHORT_ANSWER", pointValue: 3, passageId: "p1", pattern: { rubric: "3pt" } }));
  items.push(readyItem({ id: "sa-b", ec: "E03.B.30.1", interactionType: "SHORT_ANSWER", pointValue: 3, passageId: "p4", pattern: { rubric: "3pt" } }));
  return items;
}

function assemble(items: PssaAssemblyItem[]) {
  return assemblePssaFormFromPool({
    seed: "g3-form-001",
    blueprintVersion: GRADE3_BLUEPRINT.blueprintVersion,
    readyItems: items,
    allItems: items,
  });
}

const positive = assemble(validPool());
assert.equal(positive.ok, true, positive.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));
assert.equal(positive.totalPoints, 45);
assert.deepEqual(positive.categoryPoints, { A: 18, B: 18, D: 9 });
assert.equal(positive.passages.length, 4);
assert.equal(positive.items.filter((item) => item.slotType === "short_answer").length, 2);

const rerun = assemble(validPool());
assert.equal(rerun.contentHash, positive.contentHash, "same seed + pool is byte-stable");
assert.deepEqual(rerun.items, positive.items, "same seed + pool preserves selection order");

const diagnosticSectionTotals = GRADE3_DIAGNOSTIC_BLUEPRINT.sections.reduce(
  (totals, section) => ({
    conventions: totals.conventions + section.conventionsCount,
    passages: totals.passages + section.readingPassages,
    shortAnswers: totals.shortAnswers + section.shortAnswers,
  }),
  { conventions: 0, passages: 0, shortAnswers: 0 },
);
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.hasSections, true, "diagnostic blueprint is explicitly sectioned");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.untimed, true, "diagnostic estimatedMinutes must remain scheduling-only");
assert.deepEqual(GRADE3_DIAGNOSTIC_BLUEPRINT.sections.map((section) => section.sectionIndex), [1, 2, 3], "diagnostic sections are ordered 1..3");
assert.deepEqual(diagnosticSectionTotals, { conventions: 9, passages: 4, shortAnswers: 2 }, "diagnostic section targets must sum to form-level targets");
assert.equal(diagnosticSectionTotals.conventions, GRADE3_DIAGNOSTIC_BLUEPRINT.conventionsOnePoint, "diagnostic conventions target sums to form target");
assert.equal(diagnosticSectionTotals.passages, GRADE3_DIAGNOSTIC_BLUEPRINT.passages, "diagnostic passage target sums to form target");
assert.equal(diagnosticSectionTotals.shortAnswers, GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerItems, "diagnostic short-answer target sums to form target");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerItems, GRADE3_BLUEPRINT.shortAnswerItems, "diagnostic preserves two short-answer form target");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerPointsEach, GRADE3_BLUEPRINT.shortAnswerPointsEach, "diagnostic preserves short-answer point value");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.totalPoints, GRADE3_BLUEPRINT.totalPoints, "diagnostic preserves 45-point total");
assert.deepEqual(GRADE3_DIAGNOSTIC_BLUEPRINT.categoryPointRanges, GRADE3_BLUEPRINT.categoryPointRanges, "diagnostic category ranges match foundation blueprint");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.maxCorrectPositionShare, GRADE3_BLUEPRINT.maxCorrectPositionShare, "diagnostic answer-position cap matches foundation blueprint");
assert.equal((GRADE3_BLUEPRINT as any).hasSections, undefined, "foundation blueprint remains flat and unchanged");

const flatCanonicalWithDbSectionColumns = {
  ...(positive.canonical as any),
  hasSections: false,
  sections: [],
  passages: (positive.canonical as any).passages.map((passage: any) => ({ ...passage, sectionIndex: null })),
  items: (positive.canonical as any).items.map((item: any) => ({ ...item, sectionIndex: null })),
};
const flatCanonicalStripped = {
  ...(positive.canonical as any),
  passages: flatCanonicalWithDbSectionColumns.passages.map(({ sectionIndex: _sectionIndex, ...passage }: any) => passage),
  items: flatCanonicalWithDbSectionColumns.items.map(({ sectionIndex: _sectionIndex, ...item }: any) => item),
};
delete (flatCanonicalStripped as any).hasSections;
delete (flatCanonicalStripped as any).sections;
assert.equal(computePssaFormContentHash(flatCanonicalStripped), positive.contentHash, "flat canonical hash ignores additive section DB columns when not present in canonical identity");

const empty = assemble([]);
assert.equal(empty.ok, false, "empty pool refuses");
assert.equal(empty.deficits.some((row) => row.deficit > 0), true, "empty pool emits deficits");

const noLiterary = assemble(validPool().filter((item) => !String(item.eligibleContent).startsWith("E03.A")));
assert.equal(noLiterary.ok, false, "missing category A refuses");
assert.equal(noLiterary.gates.some((gate) => gate.gate === "category_A_points" && gate.status === "FAIL"), true);

const staleStored = validPool();
staleStored[0] = { ...staleStored[0], studentReadyBlockedReason: "PENDING_REVIEW" };
const staleResult = assemble(staleStored);
assert.equal(staleResult.ok, false, "fixture with stale stored readiness refuses");

const categoryMismatch = validPool();
categoryMismatch[0] = { ...categoryMismatch[0], eligibleContent: "E03.B.99.1", reportingCategory: "A" };
const mismatchResult = assemble(categoryMismatch);
assert.equal(mismatchResult.ok, false, "category mismatch refuses");
assert.match(mismatchResult.refusedReason ?? "", /category_mismatch/);

const positionStacked = validPool().map((item) => ({ ...item, correctResponseJson: item.interactionType === "MCQ" || item.interactionType === "EBSR" ? { partA: { correctIndex: 0 }, correctIndex: 0 } : item.correctResponseJson }));
const stackedResult = assemble(positionStacked);
assert.equal(stackedResult.ok, false, "position stacking refuses");
assert.equal(stackedResult.gates.some((gate) => gate.gate === "answer_position_distribution" && gate.status === "FAIL"), true);

const eightConventions = assemble(validPool().filter((item) => item.id !== "conv-8"));
assert.equal(eightConventions.ok, false, "8 conventions refuses");

const oneShortAnswer = assemble(validPool().filter((item) => item.id !== "sa-b"));
assert.equal(oneShortAnswer.ok, false, "1 short answer refuses");

const allTwoPoint = validPool().map((item) => item.id === "mp-a-3" || item.id === "mp-b-3" ? { ...item, pointValue: 2, approvedContentHash: `${item.approvedContentHash}-2`, contentHash: `${item.contentHash}-2`, latestAuditContentHash: `${item.latestAuditContentHash}-2` } : item);
const allTwoPointResult = assemble(allTwoPoint);
assert.equal(allTwoPointResult.ok, false, "multipoint without three-point refuses");

const swapped = {
  ...(positive.canonical as any),
  items: [...((positive.canonical as any).items)].reverse(),
};
assert.notEqual(computePssaFormContentHash(swapped), positive.contentHash, "swapping item positions changes hash");

const passageReordered = {
  ...(positive.canonical as any),
  passages: [...((positive.canonical as any).passages)].reverse(),
};
assert.notEqual(computePssaFormContentHash(passageReordered), positive.contentHash, "changing passage order changes hash");

const slotChanged = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, slotType: "multipoint" } : item),
};
assert.notEqual(computePssaFormContentHash(slotChanged), positive.contentHash, "changing slotType changes hash");

const pointChanged = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, pointValue: item.pointValue + 1 } : item),
};
assert.notEqual(computePssaFormContentHash(pointChanged), positive.contentHash, "changing pointValue changes hash");

const itemHashChanged = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, approvedContentHashSnapshot: "other" } : item),
};
assert.notEqual(computePssaFormContentHash(itemHashChanged), positive.contentHash, "changing item hash snapshot changes hash");

assert.deepEqual(decidePssaFormWrite(null), { action: "create" }, "absent contentHash creates a new form");
assert.deepEqual(decidePssaFormWrite({ id: "f1", formStatus: "assembled" }), { action: "noop", formId: "f1" }, "assembled contentHash no-ops");
assert.deepEqual(decidePssaFormWrite({ id: "f1", formStatus: "invalidated" }), { action: "refuse_invalidated_collision", formId: "f1" }, "invalidated contentHash refuses");
assert.deepEqual(decidePssaFormWrite({ id: "f1", formStatus: "draft" }), { action: "refuse_invalidated_collision", formId: "f1" }, "draft contentHash refuses fail-closed");

const regrouped = {
  ...(positive.canonical as any),
  items: (positive.canonical as any).items.map((item: any, index: number) => index === 0 ? { ...item, passageId: (positive.canonical as any).passages[1].passageId } : item),
};
assert.notEqual(computePssaFormContentHash(regrouped), positive.contentHash, "changing item-to-passage grouping changes hash");

const passageHashChanged = {
  ...(positive.canonical as any),
  passages: (positive.canonical as any).passages.map((passage: any, index: number) => index === 0 ? { ...passage, approvedPassageContentHashSnapshot: "other" } : passage),
};
assert.notEqual(computePssaFormContentHash(passageHashChanged), positive.contentHash, "changing passage hash snapshot changes hash");

const formFixture = {
  id: "form-1",
  formStatus: "assembled",
  items: positive.items.map((item) => {
    const live = validPool().find((row) => row.id === item.itemId)!;
    return {
      itemId: item.itemId,
      approvedContentHashSnapshot: item.approvedContentHashSnapshot,
      passageIdSnapshot: item.passageId,
      item: live,
    };
  }),
  passages: positive.passages.map((row) => ({
    passageId: row.passageId,
    approvedPassageContentHashSnapshot: row.approvedPassageContentHashSnapshot,
    passage: passages.find((passage) => passage.id === row.passageId)!,
  })),
};
assert.equal(verifyPssaFormSnapshots({ form: formFixture, liveReadyItems: validPool() }).ok, true, "fresh form verifies");

const itemDrift = structuredClone(formFixture);
itemDrift.items[0].item.approvedContentHash = "drift";
assert.equal(verifyPssaFormSnapshots({ form: itemDrift, liveReadyItems: validPool() }).failures.some((failure) => failure.startsWith("item_hash_drift")), true);

const passageDrift = structuredClone(formFixture);
passageDrift.passages[0].passage.approvedContentHash = "drift";
assert.equal(verifyPssaFormSnapshots({ form: passageDrift, liveReadyItems: validPool() }).failures.some((failure) => failure.startsWith("passage_hash_drift")), true);

const linkDrift = structuredClone(formFixture);
linkDrift.items[0].item.passages = [{ passage: passages[3], role: "primary", sortOrder: 0 } as any];
assert.equal(verifyPssaFormSnapshots({ form: linkDrift, liveReadyItems: validPool() }).failures.some((failure) => failure.startsWith("item_primary_passage_drift")), true);

console.log("PSSA DB-6 form assembly tests passed.");
