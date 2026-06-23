export type GradingCaseStatus = "PENDING" | "DRAFTED" | "FAILED" | "FINALIZED" | "NON_SCORABLE";

export type GradingCase = {
  caseId: string;
  source: "DIAGNOSTIC";
  studentName: string;
  classRoomId: string;
  formId: string;
  concurrencyToken: string;
  prompt: string;
  responseText: string;
  rubricId: string;
  scale: { min: number; max: number };
  status: GradingCaseStatus;
  aiDraft: {
    score: number;
    rationale: string;
    instructionalProfile: unknown;
  } | null;
  finalScore: number | null;
};

export function buildDiagnosticGradingCase(input: {
  response: {
    id: string;
    responsePayloadJson: unknown;
    maxPoints: number;
    session: { formId: string; user: { name: string } };
    formItem: {
      item: { id: string; interactionType: string; responseSpecJson: unknown };
    };
    writingEvaluation?: {
      status: GradingCaseStatus;
      currentInputHash: string;
      currentDraftAttempt?: {
        inputHash: string;
        score: number | null;
        rationale: string | null;
        instructionalProfileJson: unknown;
      } | null;
    } | null;
  };
  classRoomId: string;
  concurrencyToken: string;
}): GradingCase {
  const evaluation = input.response.writingEvaluation ?? null;
  const draft = evaluation?.currentDraftAttempt && evaluation.currentDraftAttempt.inputHash === evaluation.currentInputHash
    ? evaluation.currentDraftAttempt
    : null;
  const interactionType = input.response.formItem.item.interactionType;
  return {
    caseId: `diagnostic:${input.response.id}`,
    source: "DIAGNOSTIC",
    studentName: input.response.session.user.name,
    classRoomId: input.classRoomId,
    formId: input.response.session.formId,
    concurrencyToken: input.concurrencyToken,
    prompt: promptText(input.response.formItem.item.responseSpecJson),
    responseText: responseText(input.response.responsePayloadJson),
    rubricId: input.response.formItem.item.id,
    scale: interactionType === "TDA" ? { min: 1, max: 4 } : { min: 0, max: input.response.maxPoints },
    status: evaluation?.status ?? "PENDING",
    aiDraft: draft && draft.score != null
      ? {
          score: draft.score,
          rationale: draft.rationale ?? "",
          instructionalProfile: draft.instructionalProfileJson ?? null,
        }
      : null,
    finalScore: null,
  };
}

export function assertNoBannedGradingCaseKeys(value: unknown) {
  const banned = new Set([
    "id",
    "responseId",
    "responsePayloadJson",
    "currentInputHash",
    "currentDraftAttemptId",
    "attemptIdempotencyKey",
    "studentProfileId",
    "userId",
    "email",
    "teacherId",
    "teacherName",
    "classRoomName",
  ]);
  scan(value, banned);
}

function scan(value: unknown, banned: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((item) => scan(item, banned));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (banned.has(key)) throw new Error(`banned key ${key}`);
    scan(child, banned);
  }
}

function promptText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return [row.stem, row.instructionText].filter((part): part is string => typeof part === "string").join("\n\n");
}

function responseText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return typeof row.shortResponse === "string" ? row.shortResponse : typeof row.essay === "string" ? row.essay : "";
}
