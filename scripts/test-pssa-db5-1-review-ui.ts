import assert from "node:assert/strict";

import {
  AUDIT_CONTRACT_VERSION,
  SOURCE_SCAN_VERSION,
} from "./content/lib/pssa-import-plan";
import {
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
