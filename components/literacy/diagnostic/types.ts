import type { StudentDiagnosticItemDTO } from "@/lib/literacy/diagnosticItemDTO";

export type DiagnosticAttemptPayload = {
  itemId: string;
  attemptType?: "response" | "no_attempt" | "audio_problem";
  responseJson?: Record<string, unknown>;
  responseTimeMs?: number;
  latency_ms?: number;
  audioConfidence?: number;
  reason?: "frontend_silence_timeout";
  silenceDurationMs?: number;
  clientIssue?: "could_not_hear" | "mic_problem" | "tts_failed";
};

export type DiagnosticItemViewProps = {
  item: StudentDiagnosticItemDTO;
  disabled: boolean;
  onSubmit: (payload: Omit<DiagnosticAttemptPayload, "itemId">) => void;
};

export type PromptJson = {
  kidPrompt?: string;
  readyPrompt?: string;
  displayText?: string;
  choices?: string[];
  passageText?: string;
};

export type StimulusJson = {
  audioScript?: string;
  passageText?: string;
};

