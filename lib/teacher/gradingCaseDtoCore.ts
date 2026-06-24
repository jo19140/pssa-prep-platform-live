import { validateInstructionalProfile, type WritingProfileArea } from "@/lib/content/pssaWritingGrading";

export type GradingCaseStatus = "PENDING" | "DRAFTED" | "FAILED" | "FINALIZED" | "NON_SCORABLE";

export type GradingCaseResult = {
  score: number | null;
  nonScorableReason: string | null;
  rationale: string | null;
  instructionalProfile: WritingProfileArea[] | null;
  gapToNextLevel: string | null;
  reviewedAt: string | null;
};

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
    instructionalProfile: WritingProfileArea[] | null;
    gapToNextLevel: string | null;
  } | null;
  officialResult: GradingCaseResult | null;
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
      currentFinalAttempt?: {
        inputHash: string;
        score: number | null;
        nonScorableReason: string | null;
        rationale: string | null;
        instructionalProfileJson: unknown;
        reviewedAt: Date | string | null;
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
  const final = evaluation?.currentFinalAttempt && evaluation.currentFinalAttempt.inputHash === evaluation.currentInputHash
    ? evaluation.currentFinalAttempt
    : null;
  const interactionType = input.response.formItem.item.interactionType;
  const profileAreaIds = interactionType === "TDA"
    ? ["task_and_controlling_idea", "text_evidence", "analysis_and_explanation", "organization_and_cohesion", "language_and_conventions"]
    : ["completeness", "accuracy", "text_support", "explanation_clarity"];
  const text = responseText(input.response.responsePayloadJson);
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
          instructionalProfile: normalizeInstructionalProfile(draft.instructionalProfileJson, text, profileAreaIds),
          gapToNextLevel: null,
        }
      : null,
    officialResult: final && (evaluation?.status === "FINALIZED" || evaluation?.status === "NON_SCORABLE")
      ? {
          score: final.score,
          nonScorableReason: final.nonScorableReason,
          rationale: final.rationale,
          instructionalProfile: normalizeInstructionalProfile(final.instructionalProfileJson, text, profileAreaIds),
          gapToNextLevel: null,
          reviewedAt: final.reviewedAt ? new Date(final.reviewedAt).toISOString() : null,
        }
      : null,
  };
}

export function assertNoBannedGradingCaseKeys(value: unknown) {
  const banned = new Set([
    "id",
    "responseId",
    "responsePayloadJson",
    "currentInputHash",
    "currentDraftAttemptId",
    "currentFinalAttemptId",
    "currentDraftAttempt",
    "currentFinalAttempt",
    "attemptId",
    "attemptNumber",
    "attemptIdempotencyKey",
    "inputHash",
    "responseHash",
    "reviewedByUserId",
    "reviewedByUser",
    "scorerVersion",
    "promptKey",
    "modelId",
    "anchorSetVersion",
    "overrideReason",
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

function normalizeInstructionalProfile(value: unknown, responseTextValue: string, areaIds: string[]) {
  if (value == null) return null;
  return validateInstructionalProfile(value, responseTextValue, areaIds) as WritingProfileArea[];
}
