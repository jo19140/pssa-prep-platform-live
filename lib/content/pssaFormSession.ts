import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { pssaNoStoreHeaders } from "@/lib/content/pssaItemReview";
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

type LoadedSession = {
  id: string;
  userId: string;
  formId: string;
  formContentHashAtStart: string;
  status: string;
  currentPosition: number;
  startedAt: Date | string;
  submittedAt?: Date | string | null;
  totalPoints?: number | null;
  earnedPoints?: number | null;
  pendingHumanPoints?: number | null;
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
  items: LoadedFormItem[];
  passages: Array<{
    passageId: string;
    approvedPassageContentHashSnapshot: string;
    passage: any;
  }>;
};

type LoadedFormItem = {
  id: string;
  formId: string;
  itemId: string;
  position: number;
  pointValue: number;
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
    const created = await db.pssaFormSession.create({
      data: {
        userId: input.userId,
        formId: input.formId,
        formContentHashAtStart: form.contentHash,
        status: ACTIVE_STATUS,
        currentPosition: 1,
      },
    });
    return { sessionId: created.id, formId: input.formId, status: ACTIVE_STATUS, currentPosition: 1 };
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
  const dto = projectPssaStudentItem({
    ...formItem.item,
    pointValue: formItem.pointValue,
  });
  return {
    sessionId: session.id,
    formId: session.formId,
    position: formItem.position,
    currentPosition: session.currentPosition,
    totalPositions: session.form.items.length,
    progress: progressDto(session),
    item: dto,
  };
}

export async function answerPssaSessionItem(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; position: number; responsePayload: unknown }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  const formItem = formItemAt(session, input.position);
  await assertSessionDeliverable(db, session, { formItem });

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
    isComplete: session.form.items.every((item) => answeredPositions.has(item.position)),
  };
}

export async function submitPssaSession(db: PssaDb, input: { auth: PssaRouteUser; sessionId: string; allowIncomplete?: boolean }) {
  const session = await loadSession(db, input.sessionId);
  assertOwner(session, input.auth);
  assertInProgress(session);
  await assertSessionDeliverable(db, session);

  const answeredPositions = new Set(session.responses.map((response) => response.positionSnapshot));
  const missing = session.form.items.filter((item) => !answeredPositions.has(item.position));
  if (missing.length && !input.allowIncomplete) throw new PssaSessionError(409, "incomplete_session");

  let earnedPoints = 0;
  let pendingHumanPoints = 0;
  for (const response of session.responses) {
    const formItem = session.form.items.find((item) => item.id === response.formItemId);
    if (!formItem) throw new PssaSessionError(409, "response_form_item_missing");
    if (response.maxPoints !== formItem.pointValue) throw new PssaSessionError(409, "response_point_snapshot_mismatch");
    if (response.scoreStatus === "pending_human_scoring") pendingHumanPoints += response.maxPoints;
    else if (response.scoreStatus === "scored") earnedPoints += response.pointsEarned ?? 0;
  }
  const totalPoints = session.form.items.reduce((sum, item) => sum + item.pointValue, 0);
  await db.pssaFormSession.update({
    where: { id: session.id },
    data: {
      status: SUBMITTED_STATUS,
      submittedAt: new Date(),
      totalPoints,
      earnedPoints,
      pendingHumanPoints,
    },
  });
  const refreshed = await loadSession(db, input.sessionId);
  return sessionStateDto(refreshed);
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

export function pssaErrorResponse(error: unknown) {
  if (error instanceof PssaSessionError) return pssaRouteJson({ error: error.code, detail: error.detail }, { status: error.status });
  return pssaRouteJson({ error: "pssa_session_error" }, { status: 500 });
}

async function assertFormDeliverableForLaunch(db: PssaDb, form: LoadedForm) {
  const session = { id: "launch", userId: "", formId: form.id, formContentHashAtStart: form.contentHash, status: ACTIVE_STATUS, currentPosition: 1, startedAt: new Date(), form, responses: [] };
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
    items: { include: { item: { include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } } }, orderBy: { position: "asc" } },
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
    if (!response) return { position: item.position, scoreStatus: session.status === SUBMITTED_STATUS ? "unanswered" : "unanswered" };
    const base: Record<string, unknown> = { position: item.position, scoreStatus: response.scoreStatus };
    if (session.status === SUBMITTED_STATUS) base.pointsEarned = response.pointsEarned;
    return base;
  });
  return {
    sessionId: session.id,
    formId: session.formId,
    status: session.status,
    currentPosition: session.currentPosition,
    totalPositions: session.form.items.length,
    startedAt: session.startedAt,
    submittedAt: session.submittedAt ?? null,
    invalidatedReason: session.status === INVALIDATED_STATUS ? session.invalidatedReason ?? null : undefined,
    totalPoints: session.status === SUBMITTED_STATUS ? session.totalPoints : undefined,
    earnedPoints: session.status === SUBMITTED_STATUS ? session.earnedPoints : undefined,
    pendingHumanPoints: session.status === SUBMITTED_STATUS ? session.pendingHumanPoints : undefined,
    positions,
  };
}

function progressDto(session: LoadedSession) {
  return {
    answered: new Set(session.responses.map((response) => response.positionSnapshot)).size,
    total: session.form.items.length,
  };
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
