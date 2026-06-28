import assert from "node:assert/strict";

import {
  benchmarkForBatchId,
  currentPlanSourceCorpusHash,
  pssaBatchDriftDetail,
} from "../lib/content/pssaItemReview";
import {
  AUDIT_CONTRACT_VERSION,
  GRADE3_EOY_IMPORT_MANIFEST,
  SOURCE_SCAN_VERSION,
  buildEoyPlan,
  buildPlan,
  stableStringify,
} from "./content/lib/pssa-import-plan";

function corpusHashForPlan(plan: ReturnType<typeof buildPlan>) {
  return stableStringify([
    ...plan.passages.map((row) => row.contentHash),
    ...plan.activeItems.map((row) => row.contentHash),
    ...plan.deprecatedItems.map((row) => row.contentHash),
  ].sort());
}

function mockClient(sourceCorpusHash: string | null, batchId = GRADE3_EOY_IMPORT_MANIFEST.batchIds.readingMcq) {
  return {
    pssaItemBatch: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        assert.equal(where.id, batchId);
        return {
          gradeLevel: 3,
          sourceCorpusHash,
          auditContractVersion: AUDIT_CONTRACT_VERSION,
          sourceScanVersion: SOURCE_SCAN_VERSION,
          batchAuditResult: "PASS",
        };
      },
    },
  } as any;
}

const foundationHash = corpusHashForPlan(buildPlan(3));
const eoyHash = corpusHashForPlan(buildEoyPlan());

assert.equal(currentPlanSourceCorpusHash(3), foundationHash, "default corpus hash must remain foundation");
assert.equal(currentPlanSourceCorpusHash(3, "foundation"), foundationHash, "explicit foundation hash must match default");
assert.equal(currentPlanSourceCorpusHash(3, "eoy"), eoyHash, "EOY corpus hash must match the EOY importer's stamped hash recipe");
assert.notEqual(eoyHash, foundationHash, "EOY and foundation corpus hashes should be distinct");

for (const batchId of Object.values(GRADE3_EOY_IMPORT_MANIFEST.batchIds).filter(Boolean)) {
  assert.equal(benchmarkForBatchId(batchId), "eoy", `${batchId} must resolve to eoy`);
}
assert.equal(benchmarkForBatchId("reading_mcq_grade3"), "foundation", "foundation batch id must resolve to foundation");
assert.equal(benchmarkForBatchId("unknown_batch"), "foundation", "unknown batch ids default to foundation");
assert.equal(benchmarkForBatchId(null), "foundation", "missing batch id defaults to foundation");

async function main() {
  assert.equal(
    await pssaBatchDriftDetail(mockClient(eoyHash), {
      target: "batch",
      action: "approve",
      batchId: GRADE3_EOY_IMPORT_MANIFEST.batchIds.readingMcq,
    }),
    null,
    "well-formed EOY batch must not drift against the EOY corpus hash",
  );
  assert.equal(
    await pssaBatchDriftDetail(mockClient("tampered-hash"), {
      target: "batch",
      action: "approve",
      batchId: GRADE3_EOY_IMPORT_MANIFEST.batchIds.readingMcq,
    }),
    "batch_source_corpus_hash_drift",
    "tampered EOY batch hash must still fail closed",
  );
  console.log("PSSA DB-5 benchmark drift tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
