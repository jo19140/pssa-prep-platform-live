import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { PSSA_STUDENT_DTO_BANNED_KEYS, assertNoBannedKeys } from "@/lib/content/pssaStudentDto";
import {
  answerPssaSessionItem,
  endPssaSessionSection,
  getPssaSessionItem,
  getPssaSessionState,
  launchPssaFormSession,
  submitPssaSession,
  summarizePssaResponseBuckets,
  type PssaRouteUser,
} from "@/lib/content/pssaFormSession";
import {
  assembleDiagnosticFormFromPool,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

const student: PssaRouteUser = { id: "student_eoy_release", role: "STUDENT" };
const admin: PssaRouteUser = { id: "admin_eoy_release", role: "ADMIN" };

const EXPECTED_PENDING_HUMAN_IDS = [
  "pssa_item_g3_eoy_p1_sa_bk113",
  "pssa_item_g3_eoy_p2_sa_ak112",
].sort();
const BACKEND_PATHS = [
  "exemplars/pssa_grade3_eoy_p1/backend.json",
  "exemplars/pssa_grade3_eoy_p2/backend.json",
  "exemplars/pssa_grade3_eoy_p3/backend.json",
  "exemplars/pssa_grade3_eoy_p4/backend.json",
  "exemplars/pssa_grade3_eoy_conventions/backend.json",
];

type EoyPool = {
  items: PssaAssemblyItem[];
  passages: PssaAssemblyPassage[];
};

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
    batchId: "eoy-release-batch",
    batch: {
      id: "eoy-release-batch",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-eoy-release-corpus",
      batchAuditResult: "PASS",
    },
    passages: Array.isArray(raw.passageLinks)
      ? raw.passageLinks.map((link: any) => ({
          passageId: link.passageId,
          passage: passageMap.get(link.passageId),
          role: link.role ?? "primary",
          sortOrder: link.sortOrder ?? 0,
        } as any))
      : passageId ? [{ passageId, passage: passageMap.get(passageId), role: "primary", sortOrder: 0 } as any] : [],
    passageGroupId: raw.passageGroupId,
    passageGroup: group,
    structuredChoicesJson,
    acceptableSupportEvidenceLinks,
  };
}

function eoyPool(): EoyPool {
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

function assembleEoy(pool: EoyPool) {
  const result = assembleDiagnosticFormFromPool({
    seed: "g3-eoy-release",
    blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: pool.items,
    allItems: pool.items,
  });
  assert.equal(result.ok, true, result.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));
  assert.equal(result.items.length, 45, "EOY release form must deliver 45 items");
  return result;
}

function materializeForm(pool: EoyPool) {
  const assembled = assembleEoy(pool);
  const itemsById = new Map(pool.items.map((item) => [item.id, item]));
  const passagesById = new Map(pool.passages.map((passage) => [passage.id, passage]));
  return {
    id: "eoy_form_1",
    formStatus: "assembled",
    contentHash: assembled.contentHash,
    gradeLevel: 3,
    subject: "ELA",
    hasSections: true,
    sections: assembled.sections?.map((section) => ({ id: `section_${section.sectionIndex}`, formId: "eoy_form_1", ...section })) ?? [],
    items: assembled.items.map((row) => {
      const item = itemsById.get(row.itemId);
      assert(item, `missing source item ${row.itemId}`);
      return {
        id: `form_item_${row.position}`,
        formId: "eoy_form_1",
        itemId: row.itemId,
        position: row.position,
        pointValue: row.pointValue,
        scoringBucket: row.scoringBucket,
        sectionIndex: row.sectionIndex,
        approvedContentHashSnapshot: row.approvedContentHashSnapshot,
        passageIdSnapshot: row.passageId,
        item: {
          ...item,
          pointValue: row.pointValue,
        },
      };
    }),
    passages: assembled.passages.map((row) => {
      const passage = passagesById.get(row.passageId);
      assert(passage, `missing source passage ${row.passageId}`);
      return {
        id: `form_passage_${row.position}`,
        formId: "eoy_form_1",
        passageId: row.passageId,
        position: row.position,
        sectionIndex: row.sectionIndex,
        approvedPassageContentHashSnapshot: row.approvedPassageContentHashSnapshot,
        passage,
      };
    }),
    assembled,
  };
}

class FixtureDb {
  form: any;
  sessions = new Map<string, any>();
  responses = new Map<string, any>();
  nextSession = 1;
  nextResponse = 1;

  constructor(form: any) {
    this.form = form;
  }

  teacherProfile = { findUnique: async () => null };
  studentProfile = { findUnique: async () => null };
  enrollment = { findFirst: async () => null };
  pssaItem = {
    findMany: async () => this.form.items.map((row: any) => row.item),
  };
  pssaForm = {
    findUnique: async ({ where }: any) => where.id === this.form.id ? this.form : null,
  };
  pssaFormSession = {
    findFirst: async ({ where }: any) => [...this.sessions.values()].find((session) => session.userId === where.userId && session.formId === where.formId && session.status === where.status) ?? null,
    findUnique: async ({ where }: any) => this.hydrateSession(this.sessions.get(where.id) ?? null),
    create: async ({ data }: any) => {
      const session = {
        id: `session_${this.nextSession++}`,
        startedAt: new Date("2026-01-01T00:00:00Z"),
        submittedAt: null,
        totalPoints: null,
        earnedPoints: null,
        pendingHumanPoints: null,
        analyticsTotalPoints: null,
        analyticsEarnedPoints: null,
        analyticsPendingHumanPoints: null,
        invalidatedReason: null,
        ...data,
      };
      this.sessions.set(session.id, session);
      return session;
    },
    update: async ({ where, data }: any) => {
      const session = this.sessions.get(where.id);
      Object.assign(session, data);
      this.sessions.set(where.id, session);
      return session;
    },
  };
  pssaFormResponse = {
    create: async ({ data }: any) => {
      const response = { id: `response_${this.nextResponse++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      this.responses.set(response.id, response);
      return response;
    },
    update: async ({ where, data }: any) => {
      const response = this.responses.get(where.id);
      Object.assign(response, data, { updatedAt: new Date() });
      this.responses.set(where.id, response);
      return response;
    },
  };

  hydrateSession(session: any) {
    if (!session) return null;
    return {
      ...session,
      form: this.form,
      responses: [...this.responses.values()]
        .filter((response) => response.sessionId === session.id)
        .map((response) => ({ ...response, formItem: this.form.items.find((item: any) => item.id === response.formItemId) }))
        .sort((a, b) => a.positionSnapshot - b.positionSnapshot),
    };
  }
}

function correctPayload(item: PssaAssemblyItem) {
  const correct: any = item.correctResponseJson ?? {};
  if (item.interactionType === "MCQ") return { selectedIndex: correct.correctIndex };
  if (item.interactionType === "EBSR") return { partAIndex: correct.partA.correctIndex, partBIndices: [...correct.partB.correctIndices] };
  if (item.interactionType === "MULTI_SELECT") return { selectedIndices: [...correct.correctIndices] };
  if (item.interactionType === "HOT_TEXT") return { selectedSpanIds: [...correct.correctSpanIds] };
  if (item.interactionType === "MATCHING_GRID") return { rowSelections: Object.fromEntries(correct.correctCells.map((cell: any) => [cell.rowId, cell.columnId])) };
  if (item.interactionType === "DRAG_DROP") return { assignments: Object.fromEntries(correct.correctAssignments.map((row: any) => [row.tokenId, row.targetId])) };
  if (item.interactionType === "INLINE_DROPDOWN") return { blankSelections: Object.fromEntries(correct.blanks.map((blank: any) => [blank.blankId, blank.correctIndex])) };
  if (item.interactionType === "SHORT_ANSWER") return { shortResponse: "The passage details support this answer." };
  throw new Error(`Unsupported interaction type in release harness: ${item.interactionType}`);
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) value.forEach((child) => collectKeys(child, keys));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function assertLeakFree(value: unknown) {
  assertNoBannedKeys(value);
  const serialized = JSON.stringify(value);
  assert.equal(/scoringBucket|analytics_only|operational/i.test(serialized), false, "student DTO must not expose scoring bucket labels");
  for (const key of collectKeys(value)) {
    assert.equal(PSSA_STUDENT_DTO_BANNED_KEYS.includes(key as any), false, `banned key ${key}`);
    assert.equal(/correct/i.test(key), false, `correct-like key ${key}`);
    assert.equal(/rationale/i.test(key), false, `rationale-like key ${key}`);
  }
}

function backendBytes() {
  return new Map(BACKEND_PATHS.map((file) => [file, fs.readFileSync(file, "utf8")]));
}

function assertBackendBytesUnchanged(before: Map<string, string>) {
  for (const [file, bytes] of before) assert.equal(fs.readFileSync(file, "utf8"), bytes, `${file} must not be mutated`);
}

async function answerSection(db: FixtureDb, form: any, sessionId: string, sectionIndex: number) {
  const rows = form.items.filter((item: any) => item.sectionIndex === sectionIndex).sort((a: any, b: any) => a.position - b.position);
  for (const formItem of rows) {
    const dto = await getPssaSessionItem(db, { auth: student, sessionId, position: formItem.position });
    assert.equal(dto.sectionIndex, sectionIndex);
    assertLeakFree(dto);
    const result = await answerPssaSessionItem(db, {
      auth: student,
      sessionId,
      position: formItem.position,
      responsePayload: correctPayload(formItem.item),
    });
    assert.deepEqual(Object.keys(result).sort(), ["isComplete", "position", "scoreStatus"].sort(), "answer mutation returns no score detail/key material");
    assert.equal(result.position, formItem.position);
    assert(["scored", "pending_human_scoring"].includes(result.scoreStatus), `unexpected score status ${result.scoreStatus}`);
  }
  await endPssaSessionSection(db, { auth: student, sessionId, sectionIndex });
}

async function main() {
  const before = backendBytes();
  const pool = eoyPool();
  const { assembled, ...form } = materializeForm(pool);
  assert.equal(assembled.ok, true);
  assert.equal(assembled.items.length, 45);
  assert.deepEqual([
    assembled.items.filter((item) => item.scoringBucket !== "analytics_only").length,
    assembled.items.filter((item) => item.scoringBucket !== "analytics_only").reduce((sum, item) => sum + item.pointValue, 0),
    assembled.items.filter((item) => item.scoringBucket === "analytics_only").length,
    assembled.items.filter((item) => item.scoringBucket === "analytics_only").reduce((sum, item) => sum + item.pointValue, 0),
  ], [35, 45, 10, 16], "assembled EOY operational/analytics totals");

  const db = new FixtureDb(form);
  await assert.rejects(() => launchPssaFormSession(db, { auth: student, userId: student.id, formId: form.id }), /student_launch_forbidden/);
  const launch = await launchPssaFormSession(db, { auth: admin, userId: student.id, formId: form.id });
  assert.equal(launch.sessionId, "session_1");
  assert.equal(db.sessions.get("session_1").formContentHashAtStart, form.contentHash, "launch snapshots form contentHash");
  await assert.rejects(() => answerPssaSessionItem(db, { auth: student, sessionId: "session_1", position: 999, responsePayload: { selectedIndex: 0 } }), /position_not_found/);

  for (const sectionIndex of [1, 2, 3]) await answerSection(db, form, "session_1", sectionIndex);
  const submitted = await submitPssaSession(db, { auth: student, sessionId: "session_1" });
  assert.equal(submitted.status, "submitted");
  assert.equal(submitted.totalPoints, 45, "operational total excludes analytics");
  assert.equal(submitted.earnedPoints, 39, "full auto-scored operational points exclude pending SAs");
  assert.equal(submitted.pendingHumanPoints, 6);
  assert.equal(submitted.analyticsTotalPoints, 16);
  assert.equal(submitted.analyticsEarnedPoints, 16);
  assert.equal(submitted.analyticsPendingHumanPoints, 0);
  assert.equal(submitted.positions.length, 45);

  const responses = [...db.responses.values()];
  const pendingHumanItemIds = responses
    .filter((response) => response.scoreStatus === "pending_human_scoring")
    .map((response) => response.itemId)
    .sort();
  assert.deepEqual(pendingHumanItemIds, EXPECTED_PENDING_HUMAN_IDS);
  const analyticsResponseItemIds = new Set(form.items.filter((item: any) => item.scoringBucket === "analytics_only").map((item: any) => item.itemId));
  assert.equal(responses.filter((response) => analyticsResponseItemIds.has(response.itemId)).every((response) => response.scoreStatus === "scored"), true, "all analytics items auto-score");
  assert.equal(responses.filter((response) => response.scoreStatus === "invalid_response").length, 0, "happy path has no invalid responses");

  const hydrated = db.hydrateSession(db.sessions.get("session_1"));
  assert.deepEqual(summarizePssaResponseBuckets(hydrated), {
    totalPoints: 45,
    earnedPoints: 39,
    pendingHumanPoints: 6,
    analyticsTotalPoints: 16,
    analyticsEarnedPoints: 16,
    analyticsPendingHumanPoints: 0,
  });

  db.form.contentHash = "post_submit_drift";
  const archived = await getPssaSessionState(db, { auth: student, sessionId: "session_1" });
  assert.equal(archived.status, "submitted");
  assert.equal(archived.totalPoints, 45);
  assert.equal(archived.earnedPoints, 39);
  assert.equal(archived.pendingHumanPoints, 6);
  assert.equal(archived.analyticsTotalPoints, 16);
  assert.equal(archived.analyticsEarnedPoints, 16);
  assert.equal(archived.analyticsPendingHumanPoints, 0);
  assertLeakFree(archived);

  assertBackendBytesUnchanged(before);
  console.log("PSSA EOY E2E release harness passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
