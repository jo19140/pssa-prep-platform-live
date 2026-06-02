import {
  Prisma,
  PssaAlignmentStatus,
  PssaAuditResultStatus,
  PssaInteractionType,
  PssaItemStatus,
  PssaLicenseStatus,
  PssaReviewStatus,
  PssaSourceType,
  PssaStudentReadyBlockedReason,
  TestPrepModule,
} from "@prisma/client";

const pssaItemCreateInput: Prisma.PssaItemCreateInput = {
  module: TestPrepModule.PSSA,
  subject: "ELA",
  gradeLevel: 3,
  standardCode: "PA.3.CS",
  itemType: "selected_response",
  skill: "reading_comprehension",
  interactionType: PssaInteractionType.MCQ,
  responseSpecJson: { interactionType: "MCQ", choices: [] },
  correctResponseJson: { choiceId: "a" },
  scoringJson: { pointValue: 1 },
  pointValue: 1,
  sourceType: PssaSourceType.internal_original,
  licenseStatus: PssaLicenseStatus.unresolved,
  commercialUseAllowed: false,
  needsLegalReview: true,
  reviewStatus: PssaReviewStatus.PENDING,
  itemStatus: PssaItemStatus.candidate,
  alignmentStatus: PssaAlignmentStatus.NEEDS_CROSSWALK,
  approvalEligible: false,
  responseSpecVersion: "pssa-response-spec-v1",
  auditContractVersion: "pssa-audit-v1",
  sourceScanVersion: "pssa-source-scan-v1",
  contentHash: "sha256:placeholder",
  latestAuditResult: PssaAuditResultStatus.PASS,
  studentReadyBlockedReason: PssaStudentReadyBlockedReason.PENDING_REVIEW,
  provenanceJson: { smoke: true },
};

const requiredDb1Fields = {
  interactionType: pssaItemCreateInput.interactionType,
  responseSpecJson: pssaItemCreateInput.responseSpecJson,
  correctResponseJson: pssaItemCreateInput.correctResponseJson,
  contentHash: pssaItemCreateInput.contentHash,
  batch: pssaItemCreateInput.batch,
  studentReadyBlockedReason: pssaItemCreateInput.studentReadyBlockedReason,
};

void requiredDb1Fields;
