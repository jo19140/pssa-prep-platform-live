import type { DiagnosticAttemptPayload, PromptJson, StimulusJson } from "./types";

export const SILENCE_TIMEOUT_MS = 10_000;

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function promptOf(value: unknown): PromptJson {
  return asRecord(value) as PromptJson;
}

export function stimulusOf(value: unknown): StimulusJson {
  return asRecord(value) as StimulusJson;
}

export function choicesFrom(value: unknown) {
  const choices = asRecord(value).choices;
  return Array.isArray(choices) ? choices.filter((choice): choice is string => typeof choice === "string") : [];
}

export function responsePayload(input: { itemId: string; responseJson: Record<string, unknown>; startedAt: number; audioConfidence?: number }): DiagnosticAttemptPayload {
  const latency = Math.max(0, Date.now() - input.startedAt);
  return {
    itemId: input.itemId,
    attemptType: "response",
    responseJson: input.responseJson,
    responseTimeMs: latency,
    latency_ms: latency,
    audioConfidence: input.audioConfidence,
  };
}

export function noAttemptPayload(input: { itemId: string; startedAt: number; silenceDurationMs?: number }): DiagnosticAttemptPayload {
  const latency = Math.max(0, Date.now() - input.startedAt);
  return {
    itemId: input.itemId,
    attemptType: "no_attempt",
    responseJson: { attemptType: "no_attempt", transcript: null, choice: null },
    responseTimeMs: latency,
    latency_ms: latency,
    silenceDurationMs: input.silenceDurationMs ?? SILENCE_TIMEOUT_MS,
    reason: "frontend_silence_timeout",
  };
}

export function audioProblemPayload(input: { itemId: string; startedAt: number; clientIssue: "could_not_hear" | "mic_problem" | "tts_failed" }): DiagnosticAttemptPayload {
  const latency = Math.max(0, Date.now() - input.startedAt);
  return {
    itemId: input.itemId,
    attemptType: "audio_problem",
    responseJson: { attemptType: "audio_problem", transcript: null, choice: null, clientIssue: input.clientIssue },
    responseTimeMs: latency,
    latency_ms: latency,
    clientIssue: input.clientIssue,
    audioConfidence: 0,
  };
}

