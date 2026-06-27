import assert from "node:assert/strict";
import fs from "node:fs";

import { launchPssaFormSession } from "../lib/content/pssaFormSession";
import {
  assembleGrade3FormFromPool,
  parseArgs as parseAssembleArgs,
  resolveAllowedGrade3BlueprintVersion,
} from "./content/assemble-pssa-form";
import {
  assertDemoSeedAllowed,
  resolveDemoFormId,
  upsertDemoRoster,
} from "./seed-pssa-roster-demo";
import {
  assembleDiagnosticFormFromPool,
  GRADE3_BLUEPRINT,
  GRADE3_DIAGNOSTIC_BLUEPRINT,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

const PRE_PHASE4A_BOY_DIAGNOSTIC_CONTENT_HASH = "sha256:d881fd075f48f5226724c104f71b80552c1fe316adc9456c11e80d9607f951d8";

for (const blueprint of [
  GRADE3_BLUEPRINT.blueprintVersion,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
]) {
  assert.equal(resolveAllowedGrade3BlueprintVersion(blueprint), blueprint, `${blueprint} must be accepted`);
  assert.equal(parseAssembleArgs(["--grade", "3", "--blueprint", blueprint, "--seed", "seed"]).blueprint, blueprint, `${blueprint} must parse without DB writes`);
}
assert.throws(() => resolveAllowedGrade3BlueprintVersion("unknown-blueprint"), /--blueprint must be one of/);
assert.throws(() => parseAssembleArgs(["--grade", "3", "--blueprint", "unknown-blueprint", "--seed", "seed"]), /--blueprint must be one of/);

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

const passages = ["p1", "p2", "p3", "p4", "passage_1"].map(passage);

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

function readFixture(file: string) {
  return JSON.parse(fs.readFileSync(`exemplars/pssa_grade3_stamina_pilot/${file}`, "utf8"));
}

function readyPassageFromFixture(raw: any): PssaAssemblyPassage {
  return {
    ...raw,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvedContentHash: raw.contentHash ?? `hash-${raw.id}`,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: raw.contentHash ?? `hash-${raw.id}`,
    latestAuditContentHash: raw.contentHash ?? `hash-${raw.id}`,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
    gradeLevel: 3,
    subject: "ELA",
  };
}

function responseSpecForFixture(item: any) {
  if (item.responseSpecJson) return item.responseSpecJson;
  if (item.interactionType === "MCQ") return { choices: item.answerChoicesJson ?? item.choices?.map((choice: any) => choice.text) };
  if (item.interactionType === "SHORT_ANSWER") return { stem: item.stem, instructionText: item.instructionText, requiresTextSupport: true };
  if (item.interactionType === "MATCHING_GRID") return { rows: item.rows, columns: item.columns, selectionRule: item.selectionRule, stem: item.stem, instructionText: item.instructionText };
  if (item.interactionType === "DRAG_DROP") return { tokens: item.tokens, targets: item.targets, prompt: item.prompt, instructionText: item.instructionText, useAllTokens: item.useAllTokens };
  return item.responseSpecJson ?? {};
}

function correctResponseForFixture(item: any) {
  if (item.correctResponseJson) return item.correctResponseJson;
  if (item.interactionType === "MCQ") return { correctIndex: item.correctIndex };
  if (item.interactionType === "EBSR") return item.correctResponse ?? { partA: { correctIndex: item.partA?.correctIndex }, partB: { correctIndices: item.partB?.correctIndices } };
  return item.correctResponseJson ?? item.correctResponse ?? {};
}

function pointValueForFixture(item: any) {
  return item.pointValue ?? item.scoringJson?.totalPoints ?? item.scoring?.totalPoints ?? (item.interactionType === "MCQ" ? 1 : 0);
}

function readyItemFromFixture(raw: any, passageMap: Map<string, PssaAssemblyPassage>, groupById: Map<string, any>): PssaAssemblyItem {
  const id = raw.itemId ?? raw.id;
  const contentHash = raw.contentHash ?? `hash-${id}`;
  const passageId = raw.passageId ?? null;
  const groupId = raw.passageGroupId ?? null;
  const group = groupId ? groupById.get(groupId) : null;
  return {
    ...raw,
    id,
    itemId: id,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    pointValue: pointValueForFixture(raw),
    responseSpecJson: responseSpecForFixture(raw),
    correctResponseJson: correctResponseForFixture(raw),
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    approvedContentHash: contentHash,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash,
    latestAuditContentHash: contentHash,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    deprecatedReason: null,
    retiredAt: null,
    batchId: "stamina-batch",
    batch: {
      id: "stamina-batch",
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: "hash-stamina-corpus",
      batchAuditResult: "PASS",
    },
    passages: passageId ? [{ passage: passageMap.get(passageId), role: "primary", sortOrder: 0 } as any] : [],
    passageGroupId: groupId,
    passageGroup: group,
  };
}

function diagnosticPool() {
  const syrup = readFixture("syrup_released_length.json");
  const boat = readFixture("boat_literary_released_length.json");
  const owls = readFixture("owls_paired_released_length.json");
  const rabbit = readFixture("rabbit_drama_released_length.json");
  const conventions = readFixture("conventions_mc_block.json");
  const passageRows = [
    ...syrup.passages,
    ...boat.passages,
    ...rabbit.passages,
    ...owls.passageGroups[0].members.map((member: any) => member.passage),
  ].map(readyPassageFromFixture);
  const passageMap = new Map(passageRows.map((row) => [row.id, row]));
  const owlGroup = {
    ...owls.passageGroups[0],
    members: owls.passageGroups[0].members.map((member: any) => ({
      ...member,
      passage: passageMap.get(member.passageId),
    })),
  };
  const groupById = new Map([[owlGroup.id, owlGroup]]);
  return [
    ...syrup.items,
    ...boat.items,
    ...owls.items,
    ...rabbit.items,
    ...conventions.items,
  ].map((item: any) => readyItemFromFixture(item, passageMap, groupById));
}

const boy = assembleDiagnosticFormFromPool({
  seed: "g3-diagnostic-001",
  blueprintVersion: GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  readyItems: diagnosticPool(),
  allItems: diagnosticPool(),
});
assert.equal(boy.ok, true, boy.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));
assert.equal(boy.contentHash, PRE_PHASE4A_BOY_DIAGNOSTIC_CONTENT_HASH, "BOY diagnostic contentHash must stay byte-identical");
assert.equal(GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion, "pde-ela-diagnostic-stamina-2025-g3-v1", "BOY diagnostic blueprint version must remain unchanged");

for (const blueprint of [
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
]) {
  const routed = assembleGrade3FormFromPool({
    seed: "diagnostic-routing-proof",
    blueprintVersion: blueprint,
    readyItems: diagnosticPool(),
    allItems: diagnosticPool(),
  });
  assert.equal(typeof routed.ok, "boolean", `${blueprint} must route through diagnostic assembly instead of throwing`);
}

assert.throws(() => assertDemoSeedAllowed({ env: "prod", databaseUrl: "postgresql://localhost:5433/pssa_dev" }), /--env dev/);
assert.throws(() => assertDemoSeedAllowed({ env: "dev", databaseUrl: "postgresql://prod.example.com/app" }), /production-like/);
assert.doesNotThrow(() => assertDemoSeedAllowed({ env: "dev", databaseUrl: "postgresql://127.0.0.1:5433/pssa_dev" }));

class FixtureDb {
  users = new Map<string, any>();
  teacherProfiles = new Map<string, any>();
  studentProfiles = new Map<string, any>();
  classRooms = new Map<string, any>();
  enrollments = new Map<string, any>();
  sessions = new Map<string, any>();
  nextSession = 1;
  formItem = {
    id: "form_item_1",
    formId: "form_eoy",
    itemId: "item_1",
    position: 1,
    pointValue: 1,
    sectionIndex: null,
    approvedContentHashSnapshot: "hash-item_1",
    passageIdSnapshot: "passage_1",
    item: readyItem({ id: "item_1", ec: "E03.A-K.1.1.1", passageId: "passage_1" }),
  };
  form = {
    id: "form_eoy",
    formStatus: "assembled",
    contentHash: "hash-form",
    gradeLevel: 3,
    subject: "ELA",
    hasSections: false,
    sections: [],
    items: [this.formItem],
    passages: [{
      passageId: "passage_1",
      sectionIndex: null,
      approvedPassageContentHashSnapshot: "hash-passage_1",
      passage: passage("passage_1"),
    }],
  };

  user = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.users.get(where.email);
      const data = existing ? { ...existing, ...update } : { id: `user_${this.users.size + 1}`, ...create };
      this.users.set(where.email, data);
      return data;
    },
  };
  teacherProfile = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.teacherProfiles.get(where.userId);
      const data = existing ? { ...existing, ...update } : { id: `teacher_profile_${this.teacherProfiles.size + 1}`, ...create };
      this.teacherProfiles.set(where.userId, data);
      return data;
    },
    findUnique: async ({ where }: any) => this.teacherProfiles.get(where.userId) ? { id: this.teacherProfiles.get(where.userId).id } : null,
  };
  studentProfile = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.studentProfiles.get(where.userId);
      const data = existing ? { ...existing, ...update } : { id: `student_profile_${this.studentProfiles.size + 1}`, ...create };
      this.studentProfiles.set(where.userId, data);
      return data;
    },
    findUnique: async ({ where }: any) => {
      const profile = this.studentProfiles.get(where.userId);
      return profile ? { id: profile.id, teacherId: null } : null;
    },
  };
  classRoom = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.classRooms.get(where.id);
      const data = existing ? { ...existing, ...update } : { ...create };
      this.classRooms.set(where.id, data);
      return data;
    },
  };
  enrollment = {
    upsert: async ({ where, update, create }: any) => {
      const key = `${where.classRoomId_studentProfileId.classRoomId}:${where.classRoomId_studentProfileId.studentProfileId}`;
      const existing = this.enrollments.get(key);
      const data = existing ? { ...existing, ...update } : { id: `enrollment_${this.enrollments.size + 1}`, ...create };
      this.enrollments.set(key, data);
      return data;
    },
    findFirst: async ({ where }: any) => {
      return [...this.enrollments.values()].find((row) => {
        const room = this.classRooms.get(row.classRoomId);
        return row.studentProfileId === where.studentProfileId && room?.teacherId === where.classRoom.teacherId;
      }) ?? null;
    },
  };
  pssaForm = {
    findUnique: async ({ where }: any) => where.id === this.form.id ? this.form : null,
    findMany: async ({ where, take }: any) => {
      if (where?.blueprintVersion === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion && where?.formStatus === "assembled") return [this.form].slice(0, take);
      return [];
    },
  };
  pssaItem = {
    findMany: async () => [this.formItem.item],
  };
  pssaFormSession = {
    findFirst: async ({ where }: any) => [...this.sessions.values()].find((session) => session.userId === where.userId && session.formId === where.formId && session.status === where.status) ?? null,
    create: async ({ data }: any) => {
      const session = { id: `session_${this.nextSession++}`, startedAt: new Date("2026-01-01T00:00:00Z"), ...data };
      this.sessions.set(session.id, session);
      return session;
    },
  };
}

async function main() {
  const fixture = new FixtureDb();
  const explicitForm = await resolveDemoFormId(fixture, "form_eoy");
  assert.equal(explicitForm, "form_eoy", "explicit formId must be accepted");
  const fallbackForm = await resolveDemoFormId(fixture, null);
  assert.equal(fallbackForm, "form_eoy", "single assembled EOY form fallback must resolve");
  const roster = await upsertDemoRoster(fixture, { formId: fallbackForm, passwordHash: "hash" });
  assert.equal(roster.formId, "form_eoy");
  assert.equal(fixture.enrollments.size, 1, "roster seed must create exactly one enrollment");
  const launch = await launchPssaFormSession(fixture, { auth: { id: roster.teacherId, role: "TEACHER" }, userId: roster.studentId, formId: roster.formId });
  assert.equal(launch.status, "in_progress", "seeded roster must make teacher launch eligibility true");

  const multiFormDb = new FixtureDb();
  multiFormDb.pssaForm.findMany = async () => [{ id: "form_1" }, { id: "form_2" }] as any;
  await assert.rejects(() => resolveDemoFormId(multiFormDb, null), /Multiple assembled Grade 3 EOY PSSA forms/);

  console.log("PSSA go-live checks passed: blueprint allow-list, BOY hash, dev guard, roster launch eligibility");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
