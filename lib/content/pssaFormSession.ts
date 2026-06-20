import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";
import { isPssaFigureFeature, projectPssaFigureFeatureForStudent } from "@/lib/content/pssaFigureFeature";
import { projectPssaStudentItem } from "@/lib/content/pssaStudentDto";
import { scorePssaItem, type PssaScoreResult } from "@/lib/content/pssaScoring";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { getStudentReadyPssaItems } from "@/scripts/content/lib/pssa-student-ready-selector";
import { verifyPssaFormSnapshots } from "@/scripts/content/lib/pssa-form-assembly";

export type PssaRouteUser = { id: string; role: string };
export type PssaDb = any;

const ACTIVE_STATUS = "in_progress";
const SUBMITTED_STATUS = "submitted";
const INVALIDATED_STATUS = "invalidated_midflight";
const ITEM_INTEGRITY_REASON = "item_integrity_failure";
const SECTION_STATUSES = ["not_started", "in_progress", "review", "completed_locked"] as const;

type SectionStatus = typeof SECTION_STATUSES[number];

type LoadedSession = {
  id: string;
  userId: string;
  formId: string;
  formContentHashAtStart: string;
  status: string;
  currentPosition: number;
  currentSectionIndex?: number | null;
  sectionStatusesJson?: unknown;
  startedAt: Date | string;
  submittedAt?: Date | string | null;
  totalPoints?: number | null;
  earnedPoints?: number | null;
  pendingHumanPoints?: number | null;
  analyticsTotalPoints?: number | null;
  analyticsEarnedPoints?: number | null;
  analyticsPendingHumanPoints?: number | null;
  invalidatedReason?: string | null;
  form: LoadedForm;
  responses: LoadedResponse[];
};

type LoadedForm = {
  id: string;
  formStatus: string;
  contentHash: string;
  gradeLevel: number;
  subject: string;
  hasSections?: boolean;
  sections?: LoadedFormSection[];
  items: LoadedFormItem[];
  passages: Array<{
    passageId: string;
    sectionIndex?: number | null;
    approvedPassageContentHashSnapshot: string;
    passage: any;
  }>;
};

type LoadedFormSection = {
  id?: string;
  sectionIndex: number;
  sectionType: string;
  label: string;
  estimatedMinutes: number;
};

type LoadedFormItem = {
  id: string;
  formId: string;
  itemId: string;
  position: number;
  pointValue: number;
  scoringBucket?: "operational" | "analytics_only";
  sectionIndex?: number | null;
  approvedContentHashSnapshot: string;
  passageIdSnapshot: string | null;
  item: any;
};

type LoadedResponse = {
  id: string;
  sessionId: string;
  formItemId: string;
  positionSnapshot: number;
  itemId: string;
  responsePayloadJson: unknown;
  scoreStatus: string;
  pointsEarned: number | null;
  maxPoints: number;
  detail: string;
  formItem?: LoadedFormItem;
};

export class PssaSessionError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

export function summarizePssaResponseBuckets(session: {
  form: { items: Array<{ id: string; pointValue: number; scoringBucket?: "operational" | "analytics_only" | string | null }> };
  responses: Array<{ formItemId: string; maxPoints: number; scoreStatus: string; pointsEarned: number | null }>;
}) {
  let earnedPoints = 0;
  let pendingHumanPoints = 0;
  let analyticsEarnedPoints = 0;
  let analyticsPendingHumanPoints = 0;
  for (const response of session.responses) {
    const formItem = session.form.items.find((item) => item.id === response.formItemId);
    if (!formItem) throw new PssaSessionError(409, "response_form_item_missing");
    if (response.maxPoints !== formItem.pointValue) throw new PssaSessionError(409, "response_point_snapshot_mismatch");
    const operational = scoringBucketOf(formItem) === "operational";
    if (response.scoreStatus === "pending_human_scoring") {
      if (operational) pendingHumanPoints += response.maxPoints;
      else analyticsPendingHumanPoints += response.maxPoints;
    } else if (response.scoreStatus === "scored") {
      if (operational) earnedPoints += response.pointsEarned ?? 0;
      else analyticsEarnedPoints += response.pointsEarned ?? 0;
    }
  }
  const totalPoints = session.form.items.filter((item) => scoringBucketOf(item) === "operational").reduce((sum, item) => sum + item.pointValue, 0);
  const analyticsTotalPoints = session.form.items.filter((item) => scoringBucketOf(item) === "analytics_only").reduce((sum, item) => sum + item.pointValue, 0);
  return {
    totalPoints,
    earnedPoints,
    pendingHumanPoints,
    analyticsTotalPoints,
    analyticsEarnedPoints,
    analyticsPendingHumanPoints,
  };
}

export function pssaRouteJson(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: pssaNoStoreHeaders(init.headers as Record<string, string> | undefined) });
}

export function requirePssaPostGuards(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    return { ok: false, response: pssaRouteJson({ error: "Content-Type must be application/json." }, { status: 415 }) };
  }
  const origin = requireSameOrigin(req);
  if (origin.ok === false) return { ok: false, response: pssaRouteJson({ error: origin.error }, { status: 403 }) };
  return { ok: true };
}

export async function consumePssaRouteRateLimit(req: Request, user: PssaRouteUser, routeName: string) {
  const ip = getClientIp(req);
  const limit = await consumeRateLimit({
    key: `pssa-session-${routeName}:${user.id}:${ip}`,
    capacity: 120,
    refillIntervalMs: 60_000,
  });
  if (!limit.allowed) {
    return pssaRouteJson({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }
  return null;
}

export async function launchPssaFormSession(db: PssaDb, input: { auth: PssaRouteUser; userId: string; formId: string }) {
  if (input.auth.role === "STUDENT") throw new PssaSessionError(403, "student_launch_forbidden");
  if (input.auth.role === "TEACHER") {
    if (!(await canTeacherLaunchForStudent(db, input.auth.id, input.userId))) throw new PssaSessionError(403, "teacher_student_launch_forbidden");
  } else if (input.auth.role !== "ADMIN") {
    throw new PssaSessionError(403, "launch_forbidden");
  }

  const form = await loadForm(db, input.formId);
  if (!form) throw new PssaSessionError(404, "form_not_found");
  await assertFormDeliverableForLaunch(db, form);

  const existing = await db.pssaFormSession.findFirst({
    where: { userId: input.userId, formId: input.formId, status: ACTIVE_STATUS },
    select: { id: true },
  });
  if (existing) throw new PssaSessionError(409, "active_session_exists", existing.id);

  try {
    const sectionStatuses = initialSectionStatuses(form);
    const created = await db.pssaFormSession.create({
      data: {
        userId: input.userId,
        formId: input.formId,
        formContentHashAtStart: form.contentHash,
        status: ACTIVE_STATUS,
        currentPosition: 1,
        currentSectionIndex: sectionStatuses[0]?.sectionIndex ?? 1,
        sectionStatusesJson: json(sectionStatuses),
      },
    });
    return { sessionId: created.id, formId: input.formId, status: ACTIVE_STATUS, currentPosition: 1, currentSectionIndex: created.currentSectionIndex ?? 1 };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const raced = await db.pssaFormSession.findFirst({
        where: { userId: input.userId, formId: input.formId, status: ACTIVE_STATUS },
        select: { id: true },
      });
      throw new PssaSessionError(409, "active_session_exists", raced?.id || "active_session_exists");
    }
    throw error;
  }
}

export async function getPssaSessionState(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  if (session.status === ACTIVE_STATUS) await assertSessionDeliverable(db, session);
  return sessionStateDto(session);
}

export async function getPssaSessionItem(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; position: number }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  const formItem = formItemAt(session, input.position);
  await assertSessionDeliverable(db, session, { formItem });
  assertSectionItemAccess(session, formItem, "read");
  const dto = projectPssaStudentItem({
    ...formItem.item,
    pointValue: formItem.pointValue,
  });
  const sectionIndex = sectionIndexForItem(session, formItem);
  return {
    sessionId: session.id,
    formId: session.formId,
    position: formItem.position,
    currentPosition: session.currentPosition,
    currentSectionIndex: currentSectionIndex(session),
    sectionIndex,
    totalPositions: session.form.items.length,
    progress: progressDto(session),
    sections: sectionsDto(session),
    passages: passageDtosForItem(session, formItem),
    item: dto,
  };
}

export async function answerPssaSessionItem(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; position: number; responsePayload: unknown }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  const formItem = formItemAt(session, input.position);
  await assertSessionDeliverable(db, session, { formItem });
  assertSectionItemAccess(session, formItem, "write");

  let scored: PssaScoreResult;
  try {
    scored = scorePssaItem({
      itemId: formItem.itemId,
      interactionType: formItem.item.interactionType,
      correctResponseJson: formItem.item.correctResponseJson,
      scoringJson: formItem.item.scoringJson,
      responseSpecJson: formItem.item.responseSpecJson,
    }, input.responsePayload);
  } catch {
    await invalidateSession(db, session.id, ITEM_INTEGRITY_REASON);
    throw new PssaSessionError(409, "item_integrity_failure");
  }
  if (scored.maxPoints !== formItem.pointValue) {
    await invalidateSession(db, session.id, "item_integrity_point_mismatch");
    throw new PssaSessionError(409, "item_integrity_point_mismatch");
  }

  const data = {
    responsePayloadJson: json(input.responsePayload),
    scoreStatus: scored.status,
    pointsEarned: scored.pointsEarned,
    maxPoints: scored.maxPoints,
    detail: scored.detail,
    positionSnapshot: formItem.position,
    itemId: formItem.itemId,
    formItemId: formItem.id,
    sessionId: session.id,
  };
  const existing = session.responses.find((response) => response.formItemId === formItem.id);
  if (existing) await db.pssaFormResponse.update({ where: { id: existing.id }, data });
  else await db.pssaFormResponse.create({ data });

  const refreshed = await loadSession(db, input.sessionId);
  const answeredPositions = new Set(refreshed.responses.map((response: LoadedResponse) => response.positionSnapshot));
  return {
    position: formItem.position,
    scoreStatus: scored.status,
    isComplete: sectionItems(session, sectionIndexForItem(session, formItem)).every((item) => answeredPositions.has(item.position)),
  };
}

export async function submitPssaSession(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; allowIncomplete?: boolean }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  await assertSessionDeliverable(db, session);
  if (isSectionedSession(session) && !allSectionsCompleted(session)) throw new PssaSessionError(409, "sections_not_completed");

  const answeredPositions = new Set(session.responses.map((response) => response.positionSnapshot));
  const missing = session.form.items.filter((item) => !answeredPositions.has(item.position));
  if (missing.length && !input.allowIncomplete && !isSectionedSession(session)) throw new PssaSessionError(409, "incomplete_session");

  const summary = summarizePssaResponseBuckets(session);
  await db.pssaFormSession.update({
    where: { id: session.id },
    data: {
      status: SUBMITTED_STATUS,
      submittedAt: new Date(),
      totalPoints: summary.totalPoints,
      earnedPoints: summary.earnedPoints,
      pendingHumanPoints: summary.pendingHumanPoints,
      analyticsTotalPoints: summary.analyticsTotalPoints,
      analyticsEarnedPoints: summary.analyticsEarnedPoints,
      analyticsPendingHumanPoints: summary.analyticsPendingHumanPoints,
    },
  });
  const refreshed = await loadSession(db, input.sessionId);
  return sessionStateDto(refreshed);
}

export async function reviewPssaSessionSection(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; sectionIndex: number }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  await assertSessionDeliverable(db, session);
  assertCurrentSection(session, input.sectionIndex);
  const updated = setSectionStatus(session, input.sectionIndex, "review");
  await db.pssaFormSession.update({
    where: { id: session.id },
    data: { sectionStatusesJson: json(updated) },
  });
  return sessionStateDto(await loadSession(db, input.sessionId));
}

export async function resumePssaSessionSection(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; sectionIndex: number }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  await assertSessionDeliverable(db, session);
  assertCurrentSection(session, input.sectionIndex);
  const updated = setSectionStatus(session, input.sectionIndex, "in_progress");
  await db.pssaFormSession.update({
    where: { id: session.id },
    data: { sectionStatusesJson: json(updated) },
  });
  return sessionStateDto(await loadSession(db, input.sessionId));
}

export async function endPssaSessionSection(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; sectionIndex: number }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  await assertSessionDeliverable(db, session);
  assertCurrentSection(session, input.sectionIndex);
  const sections = sectionRows(session);
  const next = sections.find((section) => section.sectionIndex > input.sectionIndex);
  let statuses = setSectionStatus(session, input.sectionIndex, "completed_locked", new Date().toISOString());
  let currentSection = input.sectionIndex;
  let currentPosition = session.currentPosition;
  if (next) {
    statuses = statuses.map((row) => row.sectionIndex === next.sectionIndex ? { ...row, status: "in_progress" as SectionStatus } : row);
    currentSection = next.sectionIndex;
    currentPosition = sectionItems(session, next.sectionIndex)[0]?.position ?? currentPosition;
  }
  await db.pssaFormSession.update({
    where: { id: session.id },
    data: {
      currentSectionIndex: currentSection,
      currentPosition,
      sectionStatusesJson: json(statuses),
    },
  });
  return sessionStateDto(await loadSession(db, input.sessionId));
}

export async function assertSessionDeliverable(db: PssaDb, session: LoadedSession, options: { formItem?: LoadedFormItem } = {}) {
  if (session.status === SUBMITTED_STATUS) return { ok: true };
  const failures = await deliverabilityFailures(db, session.form, session.formContentHashAtStart);
  if (options.formItem) {
    if (options.formItem.formId !== session.formId) failures.push(`foreign_form_item:${options.formItem.id}`);
    if (!session.form.items.some((item) => item.id === options.formItem!.id && item.position === options.formItem!.position)) failures.push(`form_item_not_in_session:${options.formItem.id}`);
  }
  if (failures.length) {
    if (session.status === ACTIVE_STATUS) await invalidateSession(db, session.id, failures.join("|"));
    throw new PssaSessionError(409, "session_invalidated", failures.join("|"));
  }
  return { ok: true };
}

export function validateLaunchBody(value: unknown) {
  return exactBody(value, ["userId", "formId"]);
}

export function validateStateQuery(url: URL) {
  return { sessionId: requiredSearch(url, "sessionId") };
}

export function validateItemQuery(url: URL) {
  return { sessionId: requiredSearch(url, "sessionId"), position: positiveInt(url.searchParams.get("position")) };
}

export function validateAnswerBody(value: unknown) {
  const body = exactBody(value, ["sessionId", "position", "responsePayload"]);
  return { sessionId: String(body.sessionId), position: positiveInt(body.position), responsePayload: body.responsePayload };
}

export function validateSubmitBody(value: unknown) {
  const body = exactBody(value, ["sessionId", "allowIncomplete"]);
  return { sessionId: String(body.sessionId), allowIncomplete: body.allowIncomplete === true };
}

export function validateSectionBody(value: unknown) {
  const body = exactBody(value, ["sessionId", "sectionIndex", "action"]);
  const action = String(body.action);
  if (!["review", "resume", "end"].includes(action)) throw new PssaSessionError(400, "invalid_section_action");
  return { sessionId: String(body.sessionId), sectionIndex: positiveInt(body.sectionIndex), action: action as "review" | "resume" | "end" };
}

export function pssaErrorResponse(error: unknown) {
  if (error instanceof PssaSessionError) return pssaRouteJson({ error: error.code, detail: error.detail }, { status: error.status });
  return pssaRouteJson({ error: "pssa_session_error" }, { status: 500 });
}

async function assertFormDeliverableForLaunch(db: PssaDb, form: LoadedForm) {
  const session = { id: "launch", userId: "", formId: form.id, formContentHashAtStart: form.contentHash, status: ACTIVE_STATUS, currentPosition: 1, currentSectionIndex: 1, sectionStatusesJson: initialSectionStatuses(form), startedAt: new Date(), form, responses: [] };
  const failures = await deliverabilityFailures(db, form, session.formContentHashAtStart);
  if (failures.length) throw new PssaSessionError(409, "form_not_deliverable", failures.join("|"));
}

async function deliverabilityFailures(db: PssaDb, form: LoadedForm, contentHashAtStart: string) {
  const failures: string[] = [];
  if (form.formStatus !== "assembled") failures.push(`form_status:${form.formStatus}`);
  if (form.contentHash !== contentHashAtStart) failures.push("form_content_hash_drift");
  const liveReadyItems = await getStudentReadyPssaItems(db, { gradeLevel: form.gradeLevel, subject: form.subject }) as any[];
  const verification = verifyPssaFormSnapshots({ form, liveReadyItems });
  if (!verification.ok) failures.push(...verification.failures);
  failures.push(...sectionDeliverabilityFailures(form));
  return failures;
}

async function loadForm(db: PssaDb, formId: string): Promise<LoadedForm | null> {
  return db.pssaForm.findUnique({ where: { id: formId }, include: formInclude() });
}

async function loadSession(db: PssaDb, sessionId: string): Promise<LoadedSession> {
  const session = await db.pssaFormSession.findUnique({ where: { id: sessionId }, include: sessionInclude() });
  if (!session) throw new PssaSessionError(404, "session_not_found");
  return session;
}

function sessionInclude() {
  return {
    form: { include: formInclude() },
    responses: { include: { formItem: true }, orderBy: { positionSnapshot: "asc" } },
  };
}

function formInclude() {
  return {
    sections: { orderBy: { sectionIndex: "asc" } },
    items: { include: { item: { include: { batch: true, passageGroup: { include: { members: { include: { passage: true }, orderBy: { position: "asc" } } } }, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } } }, orderBy: { position: "asc" } },
    passages: { include: { passage: true }, orderBy: { position: "asc" } },
  };
}

function assertOwner(session: LoadedSession, auth: PssaRouteUser) {
  if (!["STUDENT", "ADMIN"].includes(auth.role)) throw new PssaSessionError(403, "forbidden");
  if (session.userId !== auth.id) throw new PssaSessionError(403, "session_owner_forbidden");
}

function assertInProgress(session: LoadedSession) {
  if (session.status === SUBMITTED_STATUS) throw new PssaSessionError(409, "session_submitted");
  if (session.status === INVALIDATED_STATUS) throw new PssaSessionError(409, "session_invalidated");
  if (session.status !== ACTIVE_STATUS) throw new PssaSessionError(409, "session_not_in_progress");
}

function formItemAt(session: LoadedSession, position: number) {
  const formItem = session.form.items.find((item) => item.position === position);
  if (!formItem) throw new PssaSessionError(404, "position_not_found");
  return formItem;
}

function isSectionedForm(form: LoadedForm) {
  return Boolean(form.hasSections && form.sections?.length);
}

function isSectionedSession(session: LoadedSession) {
  return isSectionedForm(session.form);
}

function sectionRows(session: LoadedSession): LoadedFormSection[] {
  if (!isSectionedSession(session)) {
    return [{ sectionIndex: 1, sectionType: "flat", label: "Section 1", estimatedMinutes: 0 }];
  }
  return [...(session.form.sections ?? [])].sort((a, b) => a.sectionIndex - b.sectionIndex);
}

function initialSectionStatuses(form: LoadedForm) {
  const sections = isSectionedForm(form)
    ? [...(form.sections ?? [])].sort((a, b) => a.sectionIndex - b.sectionIndex)
    : [{ sectionIndex: 1 }];
  return sections.map((section, index) => ({
    sectionIndex: section.sectionIndex,
    status: (index === 0 ? "in_progress" : "not_started") as SectionStatus,
    completedAt: null as string | null,
  }));
}

function normalizedSectionStatuses(session: LoadedSession) {
  const raw = Array.isArray(session.sectionStatusesJson) ? session.sectionStatusesJson as any[] : [];
  const bySection = new Map(raw.map((row) => [Number(row?.sectionIndex), row]));
  return sectionRows(session).map((section, index) => {
    const existing = bySection.get(section.sectionIndex);
    const status = SECTION_STATUSES.includes(existing?.status) ? existing.status as SectionStatus : (index === 0 ? "in_progress" : "not_started");
    return {
      sectionIndex: section.sectionIndex,
      status,
      completedAt: typeof existing?.completedAt === "string" ? existing.completedAt : null,
    };
  });
}

function currentSectionIndex(session: LoadedSession) {
  if (!isSectionedSession(session)) return 1;
  const statuses = normalizedSectionStatuses(session);
  const active = statuses.find((row) => row.status === "in_progress" || row.status === "review");
  return Number(session.currentSectionIndex ?? active?.sectionIndex ?? statuses[0]?.sectionIndex ?? 1);
}

function sectionIndexForItem(session: LoadedSession, formItem: LoadedFormItem) {
  if (!isSectionedSession(session)) return 1;
  if (!Number.isInteger(formItem.sectionIndex) || Number(formItem.sectionIndex) < 1) throw new PssaSessionError(409, "missing_section_index", formItem.itemId);
  return Number(formItem.sectionIndex);
}

function sectionItems(session: LoadedSession, sectionIndex: number) {
  return session.form.items.filter((item) => sectionIndexForItem(session, item) === sectionIndex);
}

function assertCurrentSection(session: LoadedSession, sectionIndex: number) {
  if (!isSectionedSession(session)) return;
  const current = currentSectionIndex(session);
  if (sectionIndex !== current) throw new PssaSessionError(403, "section_not_current", `current=${current}; requested=${sectionIndex}`);
  const status = normalizedSectionStatuses(session).find((row) => row.sectionIndex === sectionIndex)?.status;
  if (status === "completed_locked") throw new PssaSessionError(409, "section_locked");
  if (!["in_progress", "review"].includes(String(status))) throw new PssaSessionError(403, "section_locked", String(status));
}

function assertSectionItemAccess(session: LoadedSession, formItem: LoadedFormItem, mode: "read" | "write") {
  if (!isSectionedSession(session)) return;
  const sectionIndex = sectionIndexForItem(session, formItem);
  const status = normalizedSectionStatuses(session).find((row) => row.sectionIndex === sectionIndex)?.status;
  if (status === "completed_locked") throw new PssaSessionError(409, "section_locked", formItem.itemId);
  assertCurrentSection(session, sectionIndex);
  if (mode === "write" && !["in_progress", "review"].includes(String(status))) throw new PssaSessionError(403, "section_locked", String(status));
}

function setSectionStatus(session: LoadedSession, sectionIndex: number, status: SectionStatus, completedAt: string | null = null) {
  return normalizedSectionStatuses(session).map((row) => row.sectionIndex === sectionIndex ? { ...row, status, completedAt } : row);
}

function allSectionsCompleted(session: LoadedSession) {
  return normalizedSectionStatuses(session).every((row) => row.status === "completed_locked");
}

function sectionDeliverabilityFailures(form: LoadedForm) {
  if (!isSectionedForm(form)) return [];
  const failures: string[] = [];
  const sectionIndexes = new Set((form.sections ?? []).map((section) => section.sectionIndex));
  if (!sectionIndexes.size) failures.push("section_metadata_missing");
  for (const item of form.items) {
    if (!Number.isInteger(item.sectionIndex) || !sectionIndexes.has(Number(item.sectionIndex))) failures.push(`item_section_missing:${item.itemId}`);
  }
  for (const passage of form.passages ?? []) {
    if (!Number.isInteger(passage.sectionIndex) || !sectionIndexes.has(Number(passage.sectionIndex))) failures.push(`passage_section_missing:${passage.passageId}`);
  }
  const grouped = form.items.filter((item) => item.item?.passageGroupId);
  const groupSections = new Map<string, Set<number>>();
  for (const item of grouped) {
    const groupId = String(item.item.passageGroupId);
    if (!groupSections.has(groupId)) groupSections.set(groupId, new Set());
    groupSections.get(groupId)!.add(Number(item.sectionIndex));
  }
  for (const [groupId, indexes] of groupSections) if (indexes.size > 1) failures.push(`passage_group_split:${groupId}`);
  return failures;
}

async function invalidateSession(db: PssaDb, sessionId: string, reason: string) {
  await db.pssaFormSession.update({
    where: { id: sessionId },
    data: { status: INVALIDATED_STATUS, invalidatedReason: reason },
  });
}

function sessionStateDto(session: LoadedSession) {
  const responseByPosition = new Map(session.responses.map((response) => [response.positionSnapshot, response]));
  const positions = session.form.items.map((item) => {
    const response = responseByPosition.get(item.position);
    const sectionIndex = sectionIndexForItem(session, item);
    if (!response) return { position: item.position, sectionIndex, scoreStatus: session.status === SUBMITTED_STATUS ? "unanswered" : "unanswered" };
    const base: Record<string, unknown> = { position: item.position, sectionIndex, scoreStatus: response.scoreStatus };
    if (session.status === SUBMITTED_STATUS) base.pointsEarned = response.pointsEarned;
    return base;
  });
  return {
    sessionId: session.id,
    formId: session.formId,
    status: session.status,
    currentPosition: session.currentPosition,
    currentSectionIndex: currentSectionIndex(session),
    totalPositions: session.form.items.length,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt ?? null,
    invalidatedReason: session.status === INVALIDATED_STATUS ? session.invalidatedReason ?? null : undefined,
    totalPoints: session.status === SUBMITTED_STATUS ? session.totalPoints : undefined,
    earnedPoints: session.status === SUBMITTED_STATUS ? session.earnedPoints : undefined,
    pendingHumanPoints: session.status === SUBMITTED_STATUS ? session.pendingHumanPoints : undefined,
    analyticsTotalPoints: session.status === SUBMITTED_STATUS ? session.analyticsTotalPoints ?? 0 : undefined,
    analyticsEarnedPoints: session.status === SUBMITTED_STATUS ? session.analyticsEarnedPoints ?? 0 : undefined,
    analyticsPendingHumanPoints: session.status === SUBMITTED_STATUS ? session.analyticsPendingHumanPoints ?? 0 : undefined,
    sections: sectionsDto(session),
    positions,
  };
}

function scoringBucketOf(formItem: { scoringBucket?: "operational" | "analytics_only" | string | null }) {
  return formItem.scoringBucket === "analytics_only" ? "analytics_only" : "operational";
}

function progressDto(session: LoadedSession) {
  return {
    answered: new Set(session.responses.map((response) => response.positionSnapshot)).size,
    total: session.form.items.length,
  };
}

function sectionsDto(session: LoadedSession) {
  const answered = new Set(session.responses.map((response) => response.positionSnapshot));
  const statuses = new Map(normalizedSectionStatuses(session).map((row) => [row.sectionIndex, row]));
  const current = currentSectionIndex(session);
  return sectionRows(session).map((section) => {
    const items = sectionItems(session, section.sectionIndex);
    const status = statuses.get(section.sectionIndex)?.status ?? "not_started";
    return {
      sectionIndex: section.sectionIndex,
      sectionType: section.sectionType,
      label: section.label,
      estimatedMinutes: section.estimatedMinutes,
      status,
      locked: status === "completed_locked" || section.sectionIndex > current,
      current: section.sectionIndex === current,
      answered: items.filter((item) => answered.has(item.position)).length,
      total: items.length,
      points: items.reduce((sum, item) => sum + item.pointValue, 0),
      firstPosition: items[0]?.position ?? null,
      lastPosition: items.at(-1)?.position ?? null,
      completedAt: statuses.get(section.sectionIndex)?.completedAt ?? null,
    };
  });
}

function passageDtosForItem(session: LoadedSession, formItem: LoadedFormItem) {
  const sectionIndex = sectionIndexForItem(session, formItem);
  const groupedPassageIds = formItem.item?.passageGroup?.members?.map((member: any) => member.passageId).filter(Boolean) ?? [];
  const passageIds = groupedPassageIds.length ? new Set(groupedPassageIds) : new Set([formItem.passageIdSnapshot].filter(Boolean));
  return (session.form.passages ?? [])
    .filter((row) => row.sectionIndex === sectionIndex && passageIds.has(row.passageId))
    .map((row, index) => ({
      passageId: row.passageId,
      sectionIndex: row.sectionIndex ?? sectionIndex,
      label: groupedPassageIds.length ? `Passage ${index + 1}` : undefined,
      passage: {
        id: row.passage.id,
        title: row.passage.title,
        text: row.passage.text,
        passageType: row.passage.passageType,
        textFeaturesJson: safePassageTextFeatures(row.passage.textFeaturesJson),
      },
    }));
}

function safePassageTextFeatures(value: unknown) {
  return Array.isArray(value) ? value.filter(isPssaFigureFeature).map(projectPssaFigureFeatureForStudent) : [];
}

async function canTeacherLaunchForStudent(db: PssaDb, teacherUserId: string, studentUserId: string) {
  const [teacher, student] = await Promise.all([
    db.teacherProfile.findUnique({ where: { userId: teacherUserId }, select: { id: true } }),
    db.studentProfile.findUnique({ where: { userId: studentUserId }, select: { id: true, teacherId: true } }),
  ]);
  if (!teacher || !student) return false;
  if (student.teacherId === teacher.id) return true;
  const enrollment = await db.enrollment.findFirst({
    where: { studentProfileId: student.id, classRoom: { teacherId: teacher.id } },
    select: { id: true },
  });
  return Boolean(enrollment);
}

function requireSameOrigin(req: Request): { ok: true } | { ok: false; error: string } {
  const expected = new URL(req.url).origin;
  const origin = req.headers.get("origin");
  if (origin) return origin === expected ? { ok: true } : { ok: false, error: "Cross-origin mutation rejected." };
  const referer = req.headers.get("referer");
  if (!referer) return { ok: false, error: "Missing Origin/Referer for mutation." };
  return new URL(referer).origin === expected ? { ok: true } : { ok: false, error: "Cross-origin mutation rejected." };
}

function exactBody(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PssaSessionError(400, "invalid_body");
  const obj = value as Record<string, unknown>;
  const allowed = new Set(keys);
  for (const key of Object.keys(obj)) if (!allowed.has(key)) throw new PssaSessionError(400, "unexpected_field");
  for (const key of keys.filter((key) => key !== "allowIncomplete")) if (!(key in obj)) throw new PssaSessionError(400, "missing_field");
  return obj;
}

function requiredSearch(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value) throw new PssaSessionError(400, "missing_query");
  return value;
}

function positiveInt(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new PssaSessionError(400, "invalid_position");
  return parsed;
}

function isUniqueConstraint(error: unknown) {
  return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") || (typeof error === "object" && error !== null && (error as any).code === "P2002");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
