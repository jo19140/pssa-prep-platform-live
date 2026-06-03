import assert from "node:assert/strict";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
} from "./content/lib/pssa-import-plan";
import {
  computeStudentReadyBlockedReason,
  explainPssaPassageStudentReadiness,
  type PssaReadyItem,
  type PssaReadyPassage,
} from "./content/lib/pssa-student-ready-selector";

function readyPassage(overrides: Partial<PssaReadyPassage> = {}): PssaReadyPassage {
  return {
    id: "passage-1",
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvedContentHash: "hash-passage",
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: "hash-passage",
    latestAuditContentHash: "hash-passage",
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
    ...overrides,
  };
}

function readyItem(overrides: Partial<PssaReadyItem> = {}): PssaReadyItem {
  return {
    id: "item-1",
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    approvedContentHash: "hash-item",
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: "hash-item",
    latestAuditContentHash: "hash-item",
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
    passages: [{ passage: readyPassage() }],
    ...overrides,
  };
}

function assertReason(label: string, item: PssaReadyItem, reason: string) {
  assert.equal(computeStudentReadyBlockedReason(item), reason, label);
}

assertReason("positive control returns NONE", readyItem(), "NONE");

const negativeCases: Array<[string, Partial<PssaReadyItem>, string]> = [
  ["PENDING/candidate", { reviewStatus: "PENDING", itemStatus: "candidate", studentReadyBlockedReason: "PENDING_REVIEW" }, "PENDING_REVIEW"],
  ["APPROVED but not pilot_ready", { itemStatus: "candidate" }, "PENDING_REVIEW"],
  ["pilot_ready but not APPROVED", { reviewStatus: "PENDING" }, "PENDING_REVIEW"],
  ["approvalEligible false", { approvalEligible: false }, "PENDING_REVIEW"],
  ["stored blocked reason not NONE", { studentReadyBlockedReason: "PENDING_REVIEW" }, "PENDING_REVIEW"],
  ["stale audit contract", { auditContractVersion: "old" }, "STALE_AUDIT_CONTRACT"],
  ["stale source scan", { sourceScanVersion: "old" }, "STALE_SOURCE_SCAN"],
  ["latest audit content hash mismatch", { latestAuditContentHash: "other" }, "CONTENT_HASH_DRIFT"],
  ["approved content hash mismatch", { approvedContentHash: "other" }, "CONTENT_HASH_DRIFT"],
  ["approved content hash null", { approvedContentHash: null }, "CONTENT_HASH_DRIFT"],
  ["latest audit FAIL", { latestAuditResult: "FAIL" }, "FAILED_LATEST_AUDIT"],
  ["latest audit WARN", { latestAuditResult: "WARN" }, "FAILED_LATEST_AUDIT"],
  ["deprecated", { itemStatus: "deprecated_superseded", deprecatedReason: "superseded" }, "DEPRECATED_SUPERSEDED"],
  ["retired", { itemStatus: "retired", retiredAt: new Date(0) }, "DEPRECATED_SUPERSEDED"],
  ["rejected", { reviewStatus: "REJECTED" }, "PENDING_REVIEW"],
  ["batch not PASS", { batch: { ...readyItem().batch!, batchAuditResult: "FAIL" } }, "FAILED_LATEST_AUDIT"],
  ["batch stale contract", { batch: { ...readyItem().batch!, auditContractVersion: "old" } }, "STALE_AUDIT_CONTRACT"],
  ["batch stale scan", { batch: { ...readyItem().batch!, sourceScanVersion: "old" } }, "STALE_SOURCE_SCAN"],
  ["source corpus hash null", { batch: { ...readyItem().batch!, sourceCorpusHash: null } }, "CONTENT_HASH_DRIFT"],
  ["license not cleared", { licenseStatus: "unresolved" }, "PENDING_REVIEW"],
  ["needs legal review", { needsLegalReview: true }, "PENDING_REVIEW"],
  ["commercial use blocked", { commercialUseAllowed: false }, "PENDING_REVIEW"],
  ["passage not approved", { passages: [{ passage: readyPassage({ reviewStatus: "PENDING", itemStatus: "candidate", studentReadyBlockedReason: "PENDING_REVIEW" }) }] }, "PENDING_REVIEW"],
  ["passage hash stale", { passages: [{ passage: readyPassage({ latestAuditContentHash: "other" }) }] }, "CONTENT_HASH_DRIFT"],
  ["passage license not cleared", { passages: [{ passage: readyPassage({ licenseStatus: "unresolved" }) }] }, "PENDING_REVIEW"],
];

for (const [label, overrides, reason] of negativeCases) {
  assertReason(label, readyItem(overrides), reason);
}

assert.equal(explainPssaPassageStudentReadiness(readyPassage()).reason, "NONE", "positive passage is ready");
assert.equal(explainPssaPassageStudentReadiness(readyPassage({ approvedContentHash: null })).reason, "CONTENT_HASH_DRIFT", "passage approved hash required");

console.log(`PSSA DB-5 selector tests passed (${negativeCases.length} negative cases + positive controls).`);
