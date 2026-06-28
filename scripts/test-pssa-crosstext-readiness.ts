import assert from "node:assert/strict";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
} from "./content/lib/pssa-import-plan";
import {
  computeStudentReadyBlockedReason,
  explainPssaItemStudentReadiness,
} from "./content/lib/pssa-student-ready-selector";

function readyPassage(id: string) {
  return {
    id,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    studentReadyBlockedReason: "NONE",
    approvedContentHash: `hash-${id}`,
    contentHash: `hash-${id}`,
    latestAuditContentHash: `hash-${id}`,
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditResult: "PASS",
    retiredAt: null,
    sourceType: "internal_original",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
  };
}

const passage1 = readyPassage("pssa_psg_g3_eoy_p3_school_long_ago");
const passage2 = readyPassage("pssa_psg_g3_eoy_p3_school_today");

function baseItem(interactionType: "MCQ" | "EBSR") {
  const id = interactionType === "MCQ"
    ? "pssa_item_g3_eoy_p3_mcq_bc312"
    : "pssa_item_g3_eoy_p3_ebsr_bc312";
  return {
    id,
    interactionType,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    studentReadyBlockedReason: "NONE",
    approvedContentHash: `hash-${id}`,
    contentHash: `hash-${id}`,
    latestAuditContentHash: `hash-${id}`,
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditResult: "PASS",
    sourceType: "internal_original",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    deprecatedReason: null,
    retiredAt: null,
    batchId: null,
    passageGroupId: "pssa_pg_g3_eoy_p3_school_paired",
    isCrossText: true,
    requiredEvidenceSlotsJson: ["passage_1", "passage_2"],
    crossTextSupportRuleJson: null,
    responseSpecJson: interactionType === "MCQ"
      ? { prompt: "Which idea is in both texts?", choices: ["A", "B", "C", "D"] }
      : {
          partA: { prompt: "Which idea is in both texts?", choices: ["A", "B", "C", "D"] },
          partB: { instruction: "Choose two details.", choices: ["A", "B", "C", "D"] },
        },
    passages: [
      { passageId: passage1.id, passage: passage1, role: "primary", sortOrder: 0 },
      { passageId: passage2.id, passage: passage2, role: "primary", sortOrder: 1 },
    ],
    passageGroup: {
      members: [
        { slot: "passage_1", passageId: passage1.id, passage: passage1 },
        { slot: "passage_2", passageId: passage2.id, passage: passage2 },
      ],
    },
  };
}

for (const type of ["MCQ", "EBSR"] as const) {
  const item = baseItem(type);
  assert.deepEqual(
    explainPssaItemStudentReadiness(item as any),
    { reason: "NONE", detail: "ready" },
    `${type} cross-text item must be ready when required slots are covered by persisted group/link structure`,
  );
}

assert.equal(
  computeStudentReadyBlockedReason({
    ...baseItem("MCQ"),
    requiredEvidenceSlotsJson: ["passage_1", "passage_3"],
  } as any),
  "PENDING_REVIEW",
  "required slot absent from passage-group member slots must block",
);

assert.equal(
  computeStudentReadyBlockedReason({
    ...baseItem("MCQ"),
    passageGroup: {
      members: [
        { slot: "passage_1", passageId: passage1.id, passage: passage1 },
        { slot: "", passageId: passage2.id, passage: passage2 },
      ],
    },
  } as any),
  "PENDING_REVIEW",
  "blank passage-group member slot must block",
);

assert.equal(
  computeStudentReadyBlockedReason({
    ...baseItem("EBSR"),
    passageGroup: {
      members: [
        { slot: "passage_1", passageId: passage1.id, passage: passage1 },
        {
          slot: "passage_2",
          passageId: passage2.id,
          passage: { ...passage2, reviewStatus: "PENDING", studentReadyBlockedReason: "PENDING_REVIEW" },
        },
      ],
    },
  } as any),
  "PENDING_REVIEW",
  "member passage that is not student-ready must block",
);

assert.equal(
  computeStudentReadyBlockedReason({
    ...baseItem("EBSR"),
    passages: [{ passageId: passage1.id, passage: passage1, role: "primary", sortOrder: 0 }],
  } as any),
  "PENDING_REVIEW",
  "item not linked to a required member passage must block",
);

assert.equal(
  computeStudentReadyBlockedReason({
    ...baseItem("MCQ"),
    passageGroup: null,
  } as any),
  "PENDING_REVIEW",
  "required slots with no passage group must block",
);

console.log("PSSA cross-text readiness structural coverage tests passed.");
