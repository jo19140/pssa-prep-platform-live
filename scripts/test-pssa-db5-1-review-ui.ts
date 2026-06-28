import assert from "node:assert/strict";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
} from "./content/lib/pssa-import-plan";
import {
  itemQueueSelect,
  itemToQueueDto,
  passageToQueueDto,
  rejectPssaItem,
  validatePssaReviewDtoAllowlist,
} from "../lib/content/pssaItemReview";

const fakeItem: any = {
  id: "item-1",
  interactionType: "MCQ",
  interactionSubtype: null,
  eligibleContent: "E03.A-K.1.1.1",
  batchId: "ebsr_grade3",
  pointValue: 1,
  gradeLevel: 3,
  reviewStatus: "PENDING",
  itemStatus: "candidate",
  approvalEligible: false,
  studentReadyBlockedReason: "PENDING_REVIEW",
  studentPreviewJson: {
    prompt: "Which detail supports the answer?",
    interactionType: "MCQ",
    correctResponseJson: "should be stripped",
    rationale: "should be stripped",
  },
  correctResponseJson: { correctIndex: 2 },
  scoringJson: { totalPoints: 1, scoringNotes: "Reviewer only." },
  latestAuditResult: "PASS",
  auditContractVersion: AUDIT_CONTRACT_VERSION,
  sourceScanVersion: SOURCE_SCAN_VERSION,
  licenseStatus: "cleared",
  needsLegalReview: false,
  commercialUseAllowed: true,
  passages: [
    {
      passage: {
        id: "passage-1",
        title: "Passage",
        reviewStatus: "PENDING",
        itemStatus: "candidate",
        studentReadyBlockedReason: "PENDING_REVIEW",
      },
    },
  ],
};

const fakePassage: any = {
  id: "passage-1",
  title: "Passage",
  passageType: "literary",
  gradeLevel: 3,
  reviewStatus: "PENDING",
  itemStatus: "candidate",
  studentReadyBlockedReason: "PENDING_REVIEW",
  text: "A short passage for review.",
  wordCount: 6,
  latestAuditResult: "PASS",
  auditContractVersion: AUDIT_CONTRACT_VERSION,
  sourceScanVersion: SOURCE_SCAN_VERSION,
  licenseStatus: "cleared",
  needsLegalReview: false,
  commercialUseAllowed: true,
};

const itemDto = itemToQueueDto(fakeItem);
const passageDto = passageToQueueDto(fakePassage);
const payload = { counts: { pendingPassages: 1, pendingItems: 1, approved: 0, studentReady: 0 }, items: [itemDto], passages: [passageDto] };

assert.deepEqual(validatePssaReviewDtoAllowlist(payload), { ok: true, forbidden: [] });
assert.equal(JSON.stringify(itemDto.studentPreview).includes("correctIndex"), false, "studentPreview must not include answer key");
assert.equal(JSON.stringify(itemDto.studentPreview).includes("Reviewer only"), false, "studentPreview must not include scoring rationale");
assert.equal(JSON.stringify(itemDto.reviewer).includes("correctIndex"), true, "reviewer block carries answer key for admin route");

const shortAnswerDto = itemToQueueDto({
  ...fakeItem,
  interactionType: "SHORT_ANSWER",
  scoringJson: {
    totalPoints: 3,
    scoreBandExamples: [3, 2, 1, 0].map((band) => ({ band, response: `response for band ${band}`, why: `why band ${band}` })),
  },
});
assert.deepEqual(
  (shortAnswerDto.reviewer.scoring as any).scoreBandExamples.map((row: any) => row.band).sort(),
  [0, 1, 2, 3],
  "short-answer queue DTO must carry all four score-band examples for reviewer judgment",
);

// --- vocab-normalization fix: queue must fetch responseSpecJson for the domain gate ---
assert.equal(
  (itemQueueSelect as Record<string, unknown>).responseSpecJson,
  true,
  "itemQueueSelect must fetch responseSpecJson or every queue row computes MISSING_RESPONSE_DOMAIN",
);
assert.equal((itemQueueSelect as Record<string, unknown>).passageGroupId, true, "itemQueueSelect must fetch passageGroupId for paired readiness checks");
assert.equal((itemQueueSelect as Record<string, unknown>).requiredEvidenceSlotsJson, true, "itemQueueSelect must fetch requiredEvidenceSlotsJson for paired readiness checks");

// Ready-shaped slim row (passes every readiness check up to the domain gate;
// batchId without batch keeps it PENDING_REVIEW afterward — that's fine, we only
// care that the reason is NOT the domain reason when a healthy domain is present).
const readyShapedItem: any = {
  ...fakeItem,
  reviewStatus: "APPROVED",
  itemStatus: "pilot_ready",
  approvalEligible: true,
  studentReadyBlockedReason: "NONE",
  approvedContentHash: "hash-item",
  contentHash: "hash-item",
  latestAuditContentHash: "hash-item",
  responseSpecJson: { prompt: "Which detail supports the answer?", choices: ["a", "b", "c", "d"] },
};
const computedBlockedReason = (row: any) => (itemToQueueDto(row).reviewer.gateResults as any).computedBlockedReason;
assert.notEqual(
  computedBlockedReason(readyShapedItem),
  "MISSING_RESPONSE_DOMAIN",
  "healthy domain must not be flagged as missing in the queue DTO",
);
assert.equal(
  computedBlockedReason({ ...readyShapedItem, responseSpecJson: null }),
  "MISSING_RESPONSE_DOMAIN",
  "empty domain must surface as MISSING_RESPONSE_DOMAIN in the queue DTO",
);

const readyPassage = (id: string) => ({
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
});
const pendingPassage = { ...readyPassage("p2"), reviewStatus: "PENDING", studentReadyBlockedReason: "PENDING_REVIEW" };
const pairedReadyItem: any = {
  ...readyShapedItem,
  batchId: null,
  passageGroupId: "pg1",
  isCrossText: false,
  requiredEvidenceSlotsJson: null,
  crossTextSupportRuleJson: null,
  responseSpecJson: { prompt: "Which detail supports the answer?", choices: ["a", "b", "c", "d"] },
  passages: [{ passage: readyPassage("p1") }],
  passageGroup: { members: [{ slot: "passage_1", passage: readyPassage("p1") }, { slot: "passage_2", passage: pendingPassage }] },
};
assert.equal(
  computedBlockedReason(pairedReadyItem),
  "PENDING_REVIEW",
  "single-passage paired-set item must be blocked until all group member passages are approved",
);
assert.equal(
  computedBlockedReason({
    ...pairedReadyItem,
    isCrossText: true,
    requiredEvidenceSlotsJson: ["passage_1", "passage_2"],
    structuredChoicesJson: [{ isCorrect: true, evidenceLinks: [{ passageSlot: "passage_1" }, { passageSlot: "passage_2" }] }],
    passages: [{ passage: readyPassage("p1") }, { passage: pendingPassage }],
  }),
  "PENDING_REVIEW",
  "cross-text paired-set item must be blocked until all directly linked/member passages are approved",
);
// Evidence-link slot coverage is an authoring-time check: those links are not
// persisted to DB-backed review rows. Readiness now verifies the persisted
// passage-group/member/link structure instead.
assert.equal(
  (itemToQueueDto({
    ...pairedReadyItem,
    isCrossText: true,
    requiredEvidenceSlotsJson: ["passage_1", "passage_2"],
    structuredChoicesJson: [{ isCorrect: true, evidenceLinks: [{ passageSlot: "passage_1" }] }],
    passages: [{ passage: readyPassage("p1") }, { passage: readyPassage("p2") }],
    passageGroup: { members: [{ slot: "passage_1", passage: readyPassage("p1") }, { slot: "passage_2", passage: readyPassage("p2") }] },
  }).reviewer.gateResults as any).computedBlockedReason,
  "NONE",
  "cross-text paired-set item is ready when requiredEvidenceSlots are structurally covered",
);
assert.equal(
  (itemToQueueDto({
    ...pairedReadyItem,
    isCrossText: true,
    requiredEvidenceSlotsJson: ["passage_1", "passage_2"],
    structuredChoicesJson: [{ isCorrect: true, evidenceLinks: [{ passageSlot: "passage_1" }, { passageSlot: "passage_2" }] }],
    passages: [{ passage: readyPassage("p1") }],
    passageGroup: { members: [{ slot: "passage_1", passage: readyPassage("p1") }, { slot: "passage_2", passage: readyPassage("p2") }] },
  }).reviewer.gateResults as any).computedBlockedReason,
  "PENDING_REVIEW",
  "cross-text paired-set item must fail when a required member passage is not linked",
);
assert.equal(
  computedBlockedReason({
    ...pairedReadyItem,
    passageGroup: { members: [{ slot: "passage_1", passage: readyPassage("p1") }, { slot: "passage_2", passage: readyPassage("p2") }] },
  }),
  "NONE",
  "single-passage paired-set item becomes ready once all group member passages are approved",
);

async function main() {
  const fakeDb: any = {
    pssaItem: {
      findUnique: async () => ({
        ...fakeItem,
        reviewStatus: "APPROVED",
        itemStatus: "pilot_ready",
        approvedContentHash: "hash",
        passages: [],
      }),
    },
  };
  const rejectApproved = await rejectPssaItem(fakeDb, {
    id: "item-1",
    kind: "item",
    reviewerUserId: "admin-1",
    reason: "Not from web.",
  });
  assert.equal(rejectApproved.ok, false);
  assert.equal(rejectApproved.status, 422);
  assert.equal(rejectApproved.detail, "Use CLI revoke; web revoke is out of scope for DB-5.1.");
  console.log("PSSA DB-5.1 review UI safety tests passed.");
}

main();
