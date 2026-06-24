import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { computeDiagnosticWritingConcurrencyToken, finalizeDiagnosticWritingCase } from "../../lib/teacher/diagnosticWritingFinalize";
import { loadDiagnosticGradingCasesForTeacher } from "../../lib/teacher/gradingCaseDto";

const db = new PrismaClient();
const prefix = `p36_2b_${crypto.randomUUID().replace(/-/g, "")}`;
const ids: string[] = [];

async function main() {
  try {
    const base = await seedBase();
    const row = await seedResponse(base);
    const actionableBefore = await loadDiagnosticGradingCasesForTeacher(row.teacherUserId, { classRoomId: row.classRoomId, formId: row.formId, statusScope: "actionable" }, db);
    assert.equal(actionableBefore.cases.length, 1, "pending writing response must be actionable");
    assert.equal(actionableBefore.cases[0]?.officialResult, null, "pending case has no official result");

    const first = await finalize(row, { kind: "SCORE", score: 2 }, uuid("first"), { teacherNote: "Teacher final rationale." });
    assert.equal(first.status, "finalized");
    const actionableAfter = await loadDiagnosticGradingCasesForTeacher(row.teacherUserId, { classRoomId: row.classRoomId, formId: row.formId }, db);
    assert.equal(actionableAfter.cases.length, 0, "default actionable scope excludes finalized responses");
    const allAfter = await loadDiagnosticGradingCasesForTeacher(row.teacherUserId, { classRoomId: row.classRoomId, formId: row.formId, statusScope: "all" }, db);
    assert.equal(allAfter.cases.length, 1, "all scope includes finalized responses");
    assert.equal(allAfter.cases[0]?.officialResult?.score, 2);
    assert.equal(allAfter.cases[0]?.officialResult?.rationale, "Teacher final rationale.");
    assert.equal(allAfter.cases[0]?.officialResult?.gapToNextLevel, null);
    assert.equal(allAfter.cases[0]?.aiDraft, null);

    const override = await finalize(row, { kind: "SCORE", score: 3 }, uuid("override"), { overrideReason: "Rubric review.", teacherNote: "Teacher override rationale." });
    assert.equal(override.status, "overridden");
    const allAfterOverride = await loadDiagnosticGradingCasesForTeacher(row.teacherUserId, { classRoomId: row.classRoomId, formId: row.formId, statusScope: "all" }, db);
    assert.equal(allAfterOverride.cases[0]?.officialResult?.score, 3);
    assert.equal(allAfterOverride.cases[0]?.officialResult?.rationale, "Teacher override rationale.");

    const otherTeacher = await db.user.create({ data: { email: `${prefix}_other_teacher@example.com`, name: "36-2b Other Teacher", role: "TEACHER" } });
    ids.push(otherTeacher.id);
    await db.teacherProfile.create({ data: { userId: otherTeacher.id, schoolName: "36-2b School" } });
    await assert.rejects(
      () => loadDiagnosticGradingCasesForTeacher(otherTeacher.id, { classRoomId: row.classRoomId, formId: row.formId, statusScope: "all" }, db),
      /class_not_found/,
      "other teacher cannot read the grading queue",
    );
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

async function finalize(row: ResponseSeed, decision: any, idempotencyKey: string, opts: { teacherNote?: string; overrideReason?: string } = {}) {
  return finalizeDiagnosticWritingCase({
    teacherUserId: row.teacherUserId,
    caseId: `diagnostic:${row.responseId}`,
    classRoomId: row.classRoomId,
    formId: row.formId,
    expectedConcurrencyToken: await token(row),
    decision,
    teacherNote: opts.teacherNote,
    overrideReason: opts.overrideReason,
    idempotencyKey,
  }, db);
}

async function token(row: ResponseSeed) {
  return computeDiagnosticWritingConcurrencyToken(db, {
    caseId: `diagnostic:${row.responseId}`,
    classRoomId: row.classRoomId,
    formId: row.formId,
    responseId: row.responseId,
  });
}

async function seedBase(): Promise<BaseSeed> {
  const teacher = await db.user.create({ data: { email: `${prefix}_teacher@example.com`, name: "36-2b Teacher", role: "TEACHER" } });
  ids.push(teacher.id);
  const student = await db.user.create({ data: { email: `${prefix}_student@example.com`, name: "36-2b Student", role: "STUDENT" } });
  ids.push(student.id);
  const teacherProfile = await db.teacherProfile.create({ data: { userId: teacher.id, schoolName: "36-2b School" } });
  const studentProfile = await db.studentProfile.create({ data: { userId: student.id, schoolName: "36-2b School", grade: 3 } });
  const classRoom = await db.classRoom.create({ data: { name: "36-2b Class", teacherId: teacherProfile.id, grade: 3 } });
  await db.enrollment.create({ data: { classRoomId: classRoom.id, studentProfileId: studentProfile.id } });
  const passageHash = `sha256:${prefix}:passage`;
  const itemHash = `sha256:${prefix}:item`;
  const passage = await db.pssaPassage.create({
    data: {
      title: "36-2b Passage",
      gradeLevel: 3,
      passageType: "literary",
      text: "The bell helped the family find the dog because they could hear it.",
      wordCount: 13,
      sourceType: "internal_original",
      licenseStatus: "cleared",
      commercialUseAllowed: true,
      needsLegalReview: false,
      reviewStatus: "APPROVED",
      itemStatus: "pilot_ready",
      provenanceJson: {},
      contentHash: passageHash,
      studentReadyBlockedReason: "NONE",
    },
  });
  const item = await db.pssaItem.create({
    data: {
      gradeLevel: 3,
      standardCode: "CC.1.2.3.B",
      itemType: "SHORT_ANSWER",
      skill: "Text evidence",
      interactionType: "SHORT_ANSWER",
      responseSpecJson: { stem: "Why did the bell help?", instructionText: "Use evidence.", requiredSupportCount: 1, requiresTextSupport: true },
      correctResponseJson: {},
      scoringJson: { totalPoints: 3, scoreBandExamples: { 0: "", 1: "", 2: "", 3: "" }, scoringNotes: "Fixture rubric." },
      pointValue: 3,
      sourceType: "internal_original",
      licenseStatus: "cleared",
      commercialUseAllowed: true,
      needsLegalReview: false,
      reviewStatus: "APPROVED",
      itemStatus: "pilot_ready",
      alignmentStatus: "ALIGNED",
      approvalEligible: true,
      responseSpecVersion: "fixture-v1",
      auditContractVersion: "fixture",
      sourceScanVersion: "fixture",
      contentHash: itemHash,
      studentReadyBlockedReason: "NONE",
      provenanceJson: {},
    },
  });
  await db.pssaItemPassageLink.create({ data: { itemId: item.id, passageId: passage.id, role: "primary", sortOrder: 1 } });
  return { teacherUserId: teacher.id, studentUserId: student.id, classRoomId: classRoom.id, passageId: passage.id, passageHash, itemId: item.id, itemHash };
}

async function seedResponse(base: BaseSeed): Promise<ResponseSeed> {
  const form = await db.pssaForm.create({
    data: {
      gradeLevel: 3,
      blueprintVersion: "36-2b",
      seed: prefix,
      formStatus: "assembled",
      totalPoints: 3,
      categoryPointsJson: {},
      contentHash: `sha256:${prefix}:form`,
      auditContractVersion: "fixture",
      sourceScanVersion: "fixture",
      assembledBy: "fixture",
      assemblyRunId: prefix,
      passages: { create: { passageId: base.passageId, position: 1, approvedPassageContentHashSnapshot: base.passageHash } },
      items: { create: { itemId: base.itemId, position: 1, pointValue: 3, slotType: "short_answer", scoringBucket: "operational", approvedContentHashSnapshot: base.itemHash, passageIdSnapshot: base.passageId } },
    },
    include: { items: true },
  });
  const session = await db.pssaFormSession.create({
    data: {
      userId: base.studentUserId,
      formId: form.id,
      formContentHashAtStart: form.contentHash,
      status: "submitted",
      submittedAt: new Date(),
      totalPoints: 3,
      earnedPoints: 0,
      pendingHumanPoints: 3,
    },
  });
  const response = await db.pssaFormResponse.create({
    data: {
      sessionId: session.id,
      formItemId: form.items[0].id,
      positionSnapshot: 1,
      itemId: base.itemId,
      responsePayloadJson: { shortResponse: "The bell helped because the family could hear it." },
      scoreStatus: "pending_human_scoring",
      pointsEarned: null,
      maxPoints: 3,
      detail: "short_answer_rubric",
    },
  });
  return { ...base, formId: form.id, responseId: response.id };
}

async function cleanup() {
  await db.pssaFormSession.deleteMany({ where: { userId: { in: ids } } });
  await db.pssaForm.deleteMany({ where: { contentHash: { contains: prefix } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.pssaItem.deleteMany({ where: { contentHash: `sha256:${prefix}:item` } });
  await db.pssaPassage.deleteMany({ where: { contentHash: `sha256:${prefix}:passage` } });
}

function uuid(label: string) {
  return crypto.createHash("sha256").update(`${prefix}:${label}`).digest("hex").replace(/^(.{8})(.{4})(.{3})(.{3})(.{12}).*$/, "$1-$2-4$3-8$4-$5");
}

type BaseSeed = {
  teacherUserId: string;
  studentUserId: string;
  classRoomId: string;
  passageId: string;
  passageHash: string;
  itemId: string;
  itemHash: string;
};

type ResponseSeed = BaseSeed & {
  formId: string;
  responseId: string;
};

main()
  .then(() => console.log("PSSA writing grading UI live #36-2b checks passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
