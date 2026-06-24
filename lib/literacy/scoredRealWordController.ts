export type ScoredRealWordEntry = {
  word: string;
  lineNumber: number;
  lineRole: string;
  index: number;
};

export type ScoredRealWordStatus = "pending" | "correct" | "retry" | "reteach" | "assisted" | "unscored";

export type ScoredRealWordResolvedOutcome = {
  status: "correct" | "assisted" | "unscored";
  attemptCount: number;
  wordId: string;
  word: string;
  lineNumber: number;
  lineRole: string;
  index: number;
  assisted: boolean;
  unscored: boolean;
};

export type ScoredRealWordEventInput = {
  eventType: "VOICE_WORD_READ" | "VOICE_MISCUE_DETECTED";
  partNumber: 3;
  immediateOutcome: string;
  extra?: Record<string, unknown>;
  response?: Record<string, unknown>;
  durationMs?: number;
};

export type ScoredRealWordAudioCapture = unknown;

export type ScoredRealWordCopy = {
  readWord: string;
  listeningStop: string;
  technicalRetry: string;
  rateLimitHarper: string;
  rateLimitChip: string;
  correct: string;
  retryPrompt: string;
  assisted: string;
  adultSupportDone: string;
};

export type ScoredRealWordState = {
  statuses: Record<string, ScoredRealWordStatus>;
  attempts: Record<string, number>;
  technicalFailures: Record<string, number>;
  wordFeedback: Record<string, string>;
  recording: boolean;
  thinking: boolean;
  recordingStartInFlight: boolean;
  requestInFlight: boolean;
  rateLimitedUntil: number | null;
  showFallback: boolean;
};

export type ScoredRealWordCallbacks = {
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: "idle" | "listening" | "speaking" | "confused") => void;
  onSpeak: (text: string) => Promise<void>;
  onVoiceEvent: (input: ScoredRealWordEventInput) => void;
  onWordResolved: (outcome: ScoredRealWordResolvedOutcome) => void;
  onBusyChange?: (busy: boolean) => void;
};

export type ScoredRealWordControllerOptions = ScoredRealWordCallbacks & {
  copy: ScoredRealWordCopy;
  reteachTemplate: string;
};

export type ScoredRealWordControllerDeps = {
  startAudioCapture: (onChunk: (chunk: Blob) => void) => Promise<ScoredRealWordAudioCapture>;
  stopAudioCapture: (capture: ScoredRealWordAudioCapture) => void;
  fetch: typeof fetch;
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (timer: unknown) => void;
  wait: (delayMs: number) => Promise<void>;
  createBlob: (chunks: Blob[], type: string) => Blob;
  createFile: (blob: Blob, name: string, type: string) => Blob;
  createFormData: () => FormData;
  createAbortController: () => AbortController;
};

export function entryKey(entry: ScoredRealWordEntry) {
  return `${entry.lineNumber}:${entry.index}:${entry.word}`;
}

export function normalizeScoredRealWordTranscript(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function retryAfterSeconds(value: string | null, now = Date.now()) {
  if (!value) return 5;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(60, Math.ceil(seconds));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.min(60, Math.max(1, Math.ceil((date - now) / 1000)));
  return 5;
}

export function createBrowserScoredRealWordDeps(): ScoredRealWordControllerDeps {
  return {
    startAudioCapture: async () => {
      throw new Error("startAudioCapture dependency not configured");
    },
    stopAudioCapture: () => undefined,
    fetch: globalThis.fetch.bind(globalThis),
    now: () => Date.now(),
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (timer) => window.clearTimeout(timer as number),
    wait: (delayMs) => new Promise((resolve) => window.setTimeout(resolve, delayMs)),
    createBlob: (chunks, type) => new Blob(chunks, { type }),
    createFile: (blob, name, type) => new File([blob], name, { type }),
    createFormData: () => new FormData(),
    createAbortController: () => new AbortController(),
  };
}

export class ScoredRealWordController {
  private options: ScoredRealWordControllerOptions;
  private deps: ScoredRealWordControllerDeps;
  private state: ScoredRealWordState = {
    statuses: {},
    attempts: {},
    technicalFailures: {},
    wordFeedback: {},
    recording: false,
    thinking: false,
    recordingStartInFlight: false,
    requestInFlight: false,
    rateLimitedUntil: null,
    showFallback: false,
  };
  private listeners = new Set<(state: ScoredRealWordState) => void>();
  private capture: ScoredRealWordAudioCapture | null = null;
  private chunks: Blob[] = [];
  private rateLimitTimer: unknown = null;
  private busy = false;
  private disposed = false;

  constructor(options: ScoredRealWordControllerOptions, deps: ScoredRealWordControllerDeps) {
    this.options = options;
    this.deps = deps;
  }

  updateOptions(options: ScoredRealWordControllerOptions) {
    this.options = options;
  }

  updateDeps(deps: ScoredRealWordControllerDeps) {
    this.deps = deps;
  }

  getSnapshot() {
    return this.state;
  }

  subscribe(listener: (state: ScoredRealWordState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async beginRecording(entry: ScoredRealWordEntry, readDisabled: boolean) {
    if (this.disposed || readDisabled) return;
    this.setState({ recordingStartInFlight: true, showFallback: false });
    this.setBusy(true);
    this.chunks = [];
    const readMessage = formatCopy(this.options.copy.readWord, { word: entry.word });
    this.setChipFeedback(entry, this.options.copy.listeningStop);
    this.options.onHarperMessage(readMessage);
    this.options.onBuddyState("listening");
    try {
      this.capture = await this.deps.startAudioCapture((chunk) => {
        this.chunks.push(chunk);
      });
      this.setState({ recording: true });
    } catch {
      this.handleTechnicalFailure(entry, this.options.copy.technicalRetry, "transcribe_error_retry");
      this.setBusy(false);
    } finally {
      this.setState({ recordingStartInFlight: false });
    }
  }

  async stopAndScore(entry: ScoredRealWordEntry) {
    if (this.disposed || !this.state.recording || !this.capture || this.state.requestInFlight) return;
    this.setState({ requestInFlight: true, recording: false, thinking: true });
    this.options.onBuddyState("listening");
    const capture = this.capture;
    this.capture = null;
    this.deps.stopAudioCapture(capture);
    await this.deps.wait(80);
    const blob = this.deps.createBlob(this.chunks, this.chunks[0]?.type || "audio/webm");
    this.chunks = [];
    if (!blob.size) {
      this.setState({ requestInFlight: false, thinking: false });
      this.handleTechnicalFailure(entry, this.options.copy.technicalRetry, "transcribe_error_retry");
      this.setBusy(false);
      return;
    }

    const startedAt = this.deps.now();
    try {
      const result = await this.transcribe(entry, blob);
      const durationMs = this.deps.now() - startedAt;
      if (result.kind === "rate_limited") {
        this.handleRateLimit(entry, result.retrySeconds, durationMs);
        return;
      }
      if (result.kind === "technical_failure") {
        this.handleTechnicalFailure(entry, this.options.copy.technicalRetry, "transcribe_error_retry", durationMs);
        return;
      }
      this.scoreTranscript(entry, result.rawTranscript, durationMs, result.metadata);
    } catch {
      this.handleTechnicalFailure(entry, this.options.copy.technicalRetry, "transcribe_error_retry");
    } finally {
      this.setState({ requestInFlight: false, thinking: false });
      this.options.onBuddyState("idle");
      if (!this.pendingAssistedBusy()) this.setBusy(false);
    }
  }

  adultSupportAdvance(entry: ScoredRealWordEntry) {
    if (this.disposed) return;
    this.setStatus(entry, "unscored");
    this.setChipFeedback(entry, this.options.copy.adultSupportDone);
    this.options.onHarperMessage(this.options.copy.adultSupportDone);
    this.options.onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "SKIPPED",
      extra: this.voiceContext(entry, this.state.attempts[entry.word] || 0, { fallback: "adult_support" }),
      response: { scaffoldStep: "adult_support_fallback", scoringMode: "unscored", independentScoreEligible: false },
    });
    this.resolve(entry, "unscored", this.state.attempts[entry.word] || 0);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.capture) {
      this.deps.stopAudioCapture(this.capture);
      this.capture = null;
    }
    if (this.rateLimitTimer) {
      this.deps.clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = null;
    }
    this.chunks = [];
    this.setBusy(false);
  }

  private async transcribe(entry: ScoredRealWordEntry, blob: Blob): Promise<
    | { kind: "ok"; rawTranscript: string; metadata: { confidenceProxy: number | null; uncertaintyScore: number | null; model: string; latencyMs: number | null } }
    | { kind: "rate_limited"; retrySeconds: number }
    | { kind: "technical_failure" }
  > {
    const form = this.deps.createFormData();
    form.set("audio", this.deps.createFile(blob, `${entry.word}.webm`, blob.type || "audio/webm"));
    form.set("model", "gpt-4o-transcribe");
    form.set("expectedText", entry.word);
    const controller = this.deps.createAbortController();
    const timeout = this.deps.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await this.deps.fetch("/api/voice/transcribe", { method: "POST", body: form, signal: controller.signal });
      this.deps.clearTimeout(timeout);
      if (response.status === 429) {
        return { kind: "rate_limited", retrySeconds: retryAfterSeconds(response.headers.get("Retry-After"), this.deps.now()) };
      }
      if (!response.ok) return { kind: "technical_failure" };
      const json = (await response.json()) as {
        transcript?: unknown;
        confidenceProxy?: unknown;
        uncertaintyScore?: unknown;
        model?: unknown;
        latencyMs?: unknown;
      };
      const rawTranscript = stringValue(json.transcript);
      if (!rawTranscript.trim()) return { kind: "technical_failure" };
      return {
        kind: "ok",
        rawTranscript,
        metadata: {
          confidenceProxy: typeof json.confidenceProxy === "number" ? json.confidenceProxy : null,
          uncertaintyScore: typeof json.uncertaintyScore === "number" ? json.uncertaintyScore : null,
          model: stringValue(json.model) || "gpt-4o-transcribe",
          latencyMs: typeof json.latencyMs === "number" ? json.latencyMs : null,
        },
      };
    } catch {
      return { kind: "technical_failure" };
    } finally {
      this.deps.clearTimeout(timeout);
    }
  }

  private scoreTranscript(
    entry: ScoredRealWordEntry,
    rawTranscript: string,
    durationMs: number,
    metadata: { confidenceProxy: number | null; uncertaintyScore: number | null; model: string; latencyMs: number | null },
  ) {
    const attemptNumber = (this.state.attempts[entry.word] || 0) + 1;
    this.setState({ attempts: { ...this.state.attempts, [entry.word]: attemptNumber } });
    const normalizedTranscript = normalizeScoredRealWordTranscript(rawTranscript);
    const normalizedTarget = normalizeScoredRealWordTranscript(entry.word);
    const lowConfidence = metadata.confidenceProxy !== null && metadata.confidenceProxy < 0.55;
    const baseContext = this.voiceContext(entry, attemptNumber, metadata);
    const baseResponse = {
      rawTranscript,
      normalizedTranscript,
      scaffoldStep: "speech_match",
      scoringMode: "independent",
      independentScoreEligible: true,
    };

    if (normalizedTranscript === normalizedTarget && !lowConfidence) {
      const message = formatCopy(this.options.copy.correct, { word: entry.word });
      this.setStatus(entry, "correct");
      this.setChipFeedback(entry, message);
      this.options.onHarperMessage(message);
      this.options.onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "CORRECT",
        durationMs,
        extra: { ...baseContext, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "correct" },
      });
      this.resolve(entry, "correct", attemptNumber);
      return;
    }

    if (attemptNumber <= 1 || lowConfidence) {
      const message = this.options.copy.retryPrompt;
      this.setStatus(entry, "retry");
      this.setChipFeedback(entry, message);
      this.options.onHarperMessage(message);
      this.options.onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "retry_prompted",
        durationMs,
        extra: { ...baseContext, lowConfidence, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "retry_prompted" },
      });
      return;
    }

    if (attemptNumber === 2) {
      const message = this.options.reteachTemplate.replace(/\{word\}/g, entry.word);
      this.setStatus(entry, "reteach");
      this.setChipFeedback(entry, message);
      this.options.onHarperMessage(message);
      this.options.onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "retry_prompted",
        durationMs,
        extra: { ...baseContext, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "rule_reteach" },
      });
      this.options.onVoiceEvent({
        eventType: "VOICE_MISCUE_DETECTED",
        partNumber: 3,
        immediateOutcome: "INCORRECT",
        extra: { ...baseContext, expectedText: entry.word, feedbackBranch: "rule_reteach" },
        response: { rawTranscript, normalizedTranscript, scaffoldStep: "rule_reteach", scoringMode: "independent" },
      });
      return;
    }

    this.assistAndAdvance(entry, durationMs, baseContext, rawTranscript, normalizedTranscript, attemptNumber);
  }

  private async assistAndAdvance(
    entry: ScoredRealWordEntry,
    durationMs: number,
    context: Record<string, unknown>,
    rawTranscript: string,
    normalizedTranscript: string,
    attemptNumber: number,
  ) {
    this.assistedBusy = true;
    this.setBusy(true);
    const message = formatCopy(this.options.copy.assisted, { word: entry.word });
    this.setStatus(entry, "assisted");
    this.setChipFeedback(entry, message);
    this.options.onHarperMessage(message);
    this.options.onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "INCORRECT",
      durationMs,
      extra: { ...context, expectedText: entry.word, assisted: true },
      response: {
        rawTranscript,
        normalizedTranscript,
        scaffoldStep: "assisted_advance",
        scoringMode: "assisted",
        independentScoreEligible: false,
      },
    });
    try {
      await this.options.onSpeak(message);
    } finally {
      this.assistedBusy = false;
      this.resolve(entry, "assisted", attemptNumber);
      this.setBusy(false);
    }
  }

  private assistedBusy = false;

  private pendingAssistedBusy() {
    return this.assistedBusy;
  }

  private handleRateLimit(entry: ScoredRealWordEntry, retrySeconds: number, durationMs: number) {
    const retryUntil = this.deps.now() + retrySeconds * 1000;
    if (this.rateLimitTimer) this.deps.clearTimeout(this.rateLimitTimer);
    this.rateLimitTimer = this.deps.setTimeout(() => {
      this.rateLimitTimer = null;
      this.setState({ rateLimitedUntil: null });
    }, Math.max(0, retryUntil - this.deps.now()));
    this.setState({ rateLimitedUntil: retryUntil });
    this.setChipFeedback(entry, this.options.copy.rateLimitChip);
    this.options.onHarperMessage(this.options.copy.rateLimitHarper);
    this.options.onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "transcribe_rate_limited",
      durationMs,
      extra: this.voiceContext(entry, this.state.attempts[entry.word] || 0, { retryAfterSeconds: retrySeconds }),
      response: { scaffoldStep: "rate_limited", scoringMode: "unscored" },
    });
  }

  private handleTechnicalFailure(entry: ScoredRealWordEntry, message: string, immediateOutcome: string, durationMs?: number) {
    const nextFailures = (this.state.technicalFailures[entry.word] || 0) + 1;
    this.setState({ technicalFailures: { ...this.state.technicalFailures, [entry.word]: nextFailures } });
    this.setChipFeedback(entry, message);
    this.options.onHarperMessage(message);
    this.options.onBuddyState("idle");
    this.options.onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome,
      durationMs,
      extra: this.voiceContext(entry, this.state.attempts[entry.word] || 0, { technicalFailureCount: nextFailures }),
      response: { scaffoldStep: "technical_retry", scoringMode: "unscored" },
    });
    if (nextFailures >= 2) this.setState({ showFallback: true });
  }

  private resolve(entry: ScoredRealWordEntry, status: "correct" | "assisted" | "unscored", attemptCount: number) {
    this.setState({ showFallback: false });
    this.options.onWordResolved({
      status,
      attemptCount,
      wordId: entryKey(entry),
      word: entry.word,
      lineNumber: entry.lineNumber,
      lineRole: entry.lineRole,
      index: entry.index,
      assisted: status === "assisted",
      unscored: status === "unscored",
    });
  }

  private setStatus(entry: ScoredRealWordEntry, status: ScoredRealWordStatus) {
    this.setState({ statuses: { ...this.state.statuses, [entryKey(entry)]: status } });
  }

  private setChipFeedback(entry: ScoredRealWordEntry, message: string) {
    this.setState({ wordFeedback: { ...this.state.wordFeedback, [entryKey(entry)]: message } });
  }

  private setState(patch: Partial<ScoredRealWordState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private setBusy(next: boolean) {
    if (this.busy === next) return;
    this.busy = next;
    this.options.onBusyChange?.(next);
  }

  private voiceContext(entry: ScoredRealWordEntry, attemptNumber: number, extra?: Record<string, unknown>) {
    return {
      lineRole: entry.lineRole,
      lineNumber: entry.lineNumber,
      wordId: entryKey(entry),
      target: entry.word,
      expectedText: entry.word,
      attemptNumber,
      asrVendor: "openai",
      partNumber: 3,
      PART3_SCORING_MODE: "harper_retry_only",
      ...extra,
    };
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatCopy(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), value), template);
}
