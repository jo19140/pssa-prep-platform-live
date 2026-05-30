import { recordModelDecision, type ModelDecisionContext } from "@/lib/decisions/withModelDecisionLogging";
import { DELAYED_RESPONSE_MS, NO_ATTEMPT_RESPONSE_MS, SPEECH_LOW_CONFIDENCE_THRESHOLD } from "./diagnosticEvidenceFloors";

export type DiagnosticScoringInput = {
  item: {
    id: string;
    strand: string;
    itemType: string;
    responseMode?: string | null;
    expectedResponseJson: unknown;
    scoringRubricJson: unknown;
    isPracticeItem?: boolean | null;
  };
  responseJson?: unknown;
  responseTimeMs?: number | null;
  audioConfidence?: number | null;
  studentUserId?: string;
};

export type DiagnosticScore = {
  scored: boolean;
  correct: boolean | null;
  delayed: boolean;
  noAttempt: boolean;
  scoreConfidence: number | null;
  scorerReasoningJson: Record<string, unknown>;
};

type Recorder = <T>(ctx: ModelDecisionContext, fn: () => Promise<{ output: T; metadata?: { inferenceMs?: number } }>) => Promise<T>;

export async function scoreDiagnosticAttempt(input: DiagnosticScoringInput, recorder: Recorder = recordModelDecision) {
  return recorder(
    {
      decisionType: "MISCUE_CLASSIFICATION",
      modelProvider: "HEURISTIC",
      modelName: "content-v3-diagnostic-scorer",
      promptKey: "content-v3-diagnostic-scorer-v1",
      studentUserId: input.studentUserId,
      inputContext: {
        itemId: input.item.id,
        strand: input.item.strand,
        itemType: input.item.itemType,
        responseMode: input.item.responseMode,
        responseTimeMs: input.responseTimeMs ?? null,
        audioConfidence: input.audioConfidence ?? null,
      },
    },
    async () => ({ output: scoreDiagnosticAttemptCore(input), metadata: { inferenceMs: 0 } }),
  );
}

export function scoreDiagnosticAttemptCore(input: DiagnosticScoringInput): DiagnosticScore {
  const responseTimeMs = input.responseTimeMs ?? null;
  const delayed = responseTimeMs !== null && responseTimeMs >= DELAYED_RESPONSE_MS;
  const noAttempt = responseTimeMs !== null && responseTimeMs >= NO_ATTEMPT_RESPONSE_MS;
  if (noAttempt) {
    return {
      scored: true,
      correct: false,
      delayed,
      noAttempt: true,
      scoreConfidence: 1,
      scorerReasoningJson: { reasonCode: "NO_ATTEMPT_TIMEOUT", latencyRule: "10s scores no-attempt; 5s only flags delayed." },
    };
  }

  const expected = asRecord(input.item.expectedResponseJson);
  const scoring = asRecord(input.item.scoringRubricJson);
  const scoringMode = stringValue(scoring.scoring);
  const responseMode = input.item.responseMode || (scoringMode === "selected_choice" ? "selected_choice" : "speech_response");
  const transcript = normalize(stringValue(asRecord(input.responseJson).transcript) || stringValue(asRecord(input.responseJson).answer) || stringValue(input.responseJson));
  const confidence = typeof input.audioConfidence === "number" ? input.audioConfidence : null;

  if (responseMode === "speech_response" && confidence !== null && confidence < SPEECH_LOW_CONFIDENCE_THRESHOLD) {
    return {
      scored: false,
      correct: null,
      delayed,
      noAttempt: false,
      scoreConfidence: confidence,
      scorerReasoningJson: { reasonCode: "LOW_CONFIDENCE_SPEECH", threshold: SPEECH_LOW_CONFIDENCE_THRESHOLD },
    };
  }

  const canonical = normalize(stringValue(expected.canonical));
  const acceptedSemantic = stringArray(expected.acceptedSemanticResponses).map(normalize);
  const aliases = stringArray(expected.speechTranscriptAliases).map(normalize);
  const rejected = stringArray(expected.rejectedResponses).map(normalize);

  if (responseMode === "selected_choice") {
    const selected = normalize(stringValue(asRecord(input.responseJson).selectedChoice) || stringValue(asRecord(input.responseJson).answer) || stringValue(input.responseJson));
    const correct = Boolean(selected) && (selected === canonical || acceptedSemantic.includes(selected));
    return {
      scored: true,
      correct,
      delayed,
      noAttempt: false,
      scoreConfidence: 1,
      scorerReasoningJson: { reasonCode: correct ? "SELECTED_CHOICE_MATCH" : "SELECTED_CHOICE_MISMATCH", selected },
    };
  }

  if (!transcript) {
    return {
      scored: false,
      correct: null,
      delayed,
      noAttempt: false,
      scoreConfidence: confidence,
      scorerReasoningJson: { reasonCode: "EMPTY_TRANSCRIPT" },
    };
  }

  if (transcript === canonical || acceptedSemantic.includes(transcript)) {
    return {
      scored: true,
      correct: true,
      delayed,
      noAttempt: false,
      scoreConfidence: confidence ?? 1,
      scorerReasoningJson: { reasonCode: "SEMANTIC_RESPONSE_MATCH", transcript },
    };
  }
  if (aliases.includes(transcript)) {
    return {
      scored: true,
      correct: true,
      delayed,
      noAttempt: false,
      scoreConfidence: confidence ?? 1,
      scorerReasoningJson: { reasonCode: "ASR_ALIAS_MATCH", transcript, resolvedTo: canonical },
    };
  }
  if (rejected.includes(transcript)) {
    return {
      scored: true,
      correct: false,
      delayed,
      noAttempt: false,
      scoreConfidence: confidence ?? 1,
      scorerReasoningJson: { reasonCode: "EXPLICIT_REJECTED_RESPONSE", transcript },
    };
  }

  return {
    scored: false,
    correct: null,
    delayed,
    noAttempt: false,
    scoreConfidence: confidence,
    scorerReasoningJson: { reasonCode: "UNMATCHED_SPEECH_RESPONSE", transcript },
  };
}

function normalize(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
