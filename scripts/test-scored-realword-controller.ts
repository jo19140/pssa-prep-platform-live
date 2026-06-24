import assert from "node:assert/strict";
import {
  ScoredRealWordController,
  entryKey,
  normalizeScoredRealWordTranscript,
  type ScoredRealWordControllerDeps,
  type ScoredRealWordEntry,
  type ScoredRealWordEventInput,
  type ScoredRealWordResolvedOutcome,
  type ScoredRealWordState,
} from "../lib/literacy/scoredRealWordController";

const copy = {
  readWord: "Read {word}.",
  listeningStop: "Tap when done.",
  technicalRetry: "I had trouble hearing that. Let's try once more.",
  rateLimitHarper: "Let's take a quick pause. I'll be ready in a moment.",
  rateLimitChip: "Pause a moment.",
  correct: "Nice reading — that was {word}!",
  retryPrompt: "Read that one more time for me.",
  assisted: "Listen: {word}. Now you try.",
  adultSupportDone: "Thanks for reading with help.",
};

const entryA: ScoredRealWordEntry = { word: "cake", lineNumber: 1, lineRole: "target_real_words", index: 0 };
const entryB: ScoredRealWordEntry = { word: "make", lineNumber: 2, lineRole: "contrastive_target_vs_review", index: 1 };
const entryC: ScoredRealWordEntry = { word: "make", lineNumber: 3, lineRole: "cumulative_review", index: 2 };

type QueuedFetch =
  | { type: "ok"; transcript: string; confidenceProxy?: number | null; uncertaintyScore?: number | null; model?: string; latencyMs?: number | null }
  | { type: "blank" }
  | { type: "non_ok"; status?: number }
  | { type: "thrown" }
  | { type: "rate_limited"; retryAfter: string | null };

function createHarness() {
  const events: ScoredRealWordEventInput[] = [];
  const resolved: ScoredRealWordResolvedOutcome[] = [];
  const busy: boolean[] = [];
  const buddyStates: string[] = [];
  const harperMessages: string[] = [];
  const spoken: string[] = [];
  const stateSnapshots: ScoredRealWordState[] = [];
  const calls: string[] = [];
  const fetches: Array<{ url: string; method: string; model: unknown; expectedText: unknown; hasAudio: boolean; timeoutMs: number | null }> = [];
  const queue: QueuedFetch[] = [];
  const chunks: Blob[] = [];
  let now = 1_000;
  let latestTimeoutMs: number | null = null;

  const deps: ScoredRealWordControllerDeps = {
    startAudioCapture: async (onChunk) => {
      calls.push("startAudioCapture");
      for (const chunk of chunks.splice(0)) onChunk(chunk);
      return { live: true };
    },
    stopAudioCapture: () => {
      calls.push("stopAudioCapture");
    },
    fetch: async (url, init) => {
      calls.push("fetch");
      const form = init?.body as FormData;
      fetches.push({
        url: String(url),
        method: String(init?.method || ""),
        model: form.get("model"),
        expectedText: form.get("expectedText"),
        hasAudio: Boolean(form.get("audio")),
        timeoutMs: latestTimeoutMs,
      });
      const next = queue.shift();
      if (!next) throw new Error("missing fake fetch response");
      if (next.type === "thrown") throw new Error("network down");
      if (next.type === "rate_limited") {
        return fakeResponse(429, {}, next.retryAfter);
      }
      if (next.type === "non_ok") {
        return fakeResponse(next.status ?? 500, {});
      }
      if (next.type === "blank") {
        return fakeResponse(200, { transcript: "" });
      }
      return fakeResponse(200, {
        transcript: next.transcript,
        confidenceProxy: next.confidenceProxy ?? null,
        uncertaintyScore: next.uncertaintyScore ?? null,
        model: next.model ?? "gpt-4o-transcribe",
        latencyMs: next.latencyMs ?? null,
      });
    },
    now: () => now,
    setTimeout: () => {
      throw new Error("setTimeout not initialized");
    },
    clearTimeout: () => undefined,
    wait: async (delayMs) => {
      calls.push(`wait:${delayMs}`);
      now += delayMs;
    },
    createBlob: (parts, type) => new Blob(parts, { type }),
    createFile: (blob, name, type) => {
      const file = new Blob([blob], { type }) as Blob & { name: string };
      file.name = name;
      return file;
    },
    createFormData: () => new FormData(),
    createAbortController: () => ({ signal: { aborted: false }, abort: () => undefined }) as AbortController,
  };

  deps.setTimeout = (callback, delayMs) => {
    calls.push(`setTimeout:${delayMs}`);
    latestTimeoutMs = delayMs;
    return { callback, delayMs };
  };

  const controller = new ScoredRealWordController(
    {
      copy,
      reteachTemplate: "The e at the end helps a say its name. Try again: {word}.",
      onHarperMessage: (message) => harperMessages.push(message),
      onBuddyState: (state) => buddyStates.push(state),
      onSpeak: async (message) => {
        spoken.push(message);
        now += 250;
      },
      onVoiceEvent: (event) => events.push(event),
      onWordResolved: (outcome) => resolved.push(outcome),
      onBusyChange: (value) => busy.push(value),
    },
    deps,
  );
  controller.subscribe((state) => stateSnapshots.push(cloneState(state)));

  async function read(entry: ScoredRealWordEntry, response: QueuedFetch, capture: "audio" | "empty" = "audio") {
    if (capture === "audio") chunks.push(new Blob(["sound"], { type: "audio/webm" }));
    queue.push(response);
    await controller.beginRecording(entry, false);
    await controller.stopAndScore(entry);
  }

  return { controller, deps, read, events, resolved, busy, buddyStates, harperMessages, spoken, stateSnapshots, calls, fetches, queue, chunks };
}

async function main() {
  assert.equal(normalizeScoredRealWordTranscript("  Cake!!!  "), "cake");
  assert.equal(normalizeScoredRealWordTranscript("CAKE     tape."), "cake tape");

  {
    const h = createHarness();
    await h.read(entryA, { type: "ok", transcript: " Cake! ", confidenceProxy: 0.55, uncertaintyScore: 0.1, latencyMs: 41 });
    assert.deepEqual(h.events.map((event) => event.immediateOutcome), ["CORRECT"]);
    assert.deepEqual(h.events[0], {
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "CORRECT",
      durationMs: 0,
      extra: {
        lineRole: "target_real_words",
        lineNumber: 1,
        wordId: "1:0:cake",
        target: "cake",
        expectedText: "cake",
        attemptNumber: 1,
        asrVendor: "openai",
        partNumber: 3,
        PART3_SCORING_MODE: "harper_retry_only",
        confidenceProxy: 0.55,
        uncertaintyScore: 0.1,
        model: "gpt-4o-transcribe",
        latencyMs: 41,
      },
      response: {
        rawTranscript: " Cake! ",
        normalizedTranscript: "cake",
        scaffoldStep: "correct",
        scoringMode: "independent",
        independentScoreEligible: true,
      },
    });
    assert.deepEqual(h.resolved, [{
      status: "correct",
      attemptCount: 1,
      wordId: "1:0:cake",
      word: "cake",
      lineNumber: 1,
      lineRole: "target_real_words",
      index: 0,
      assisted: false,
      unscored: false,
    }]);
    assert.equal(JSON.stringify(h.resolved).includes("Cake"), false, "resolved callback must not include transcript text");
    assert.deepEqual(h.busy, [true, false]);
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "ok", transcript: "cap", confidenceProxy: 0.9 });
    assert.deepEqual(h.events.map((event) => event.immediateOutcome), ["retry_prompted"]);
    assert.equal(h.resolved.length, 0);
    assert.equal(h.controller.getSnapshot().statuses[entryKey(entryA)], "retry");

    await h.read(entryA, { type: "ok", transcript: "cap", confidenceProxy: 0.9 });
    assert.deepEqual(h.events.map((event) => event.eventType), ["VOICE_WORD_READ", "VOICE_WORD_READ", "VOICE_MISCUE_DETECTED"]);
    assert.equal(h.events[1].response?.scaffoldStep, "rule_reteach");
    assert.equal(h.events[2].immediateOutcome, "INCORRECT");
    assert.equal(h.resolved.length, 0);
    assert.equal(h.controller.getSnapshot().statuses[entryKey(entryA)], "reteach");

    await h.read(entryA, { type: "ok", transcript: "cap", confidenceProxy: 0.9 });
    assert.equal(h.events.at(-1)?.response?.scaffoldStep, "assisted_advance");
    assert.deepEqual(h.spoken, ["Listen: cake. Now you try."]);
    assert.deepEqual(h.resolved.map((outcome) => outcome.status), ["assisted"]);
    assert.deepEqual(h.busy, [true, false, true, false, true, false]);
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "ok", transcript: "cake", confidenceProxy: 0.54 });
    assert.equal(h.events[0].immediateOutcome, "retry_prompted");
    assert.equal(h.events[0].extra?.lowConfidence, true);
    assert.equal(h.resolved.length, 0);

    await h.read(entryA, { type: "ok", transcript: "cap", confidenceProxy: 0.54 });
    await h.read(entryA, { type: "ok", transcript: "cap", confidenceProxy: 0.54 });
    assert.deepEqual(h.events.map((event) => event.immediateOutcome), ["retry_prompted", "retry_prompted", "retry_prompted"]);
    assert.equal(h.resolved.length, 0);
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "rate_limited", retryAfter: "7" });
    assert.equal(h.events[0].immediateOutcome, "transcribe_rate_limited");
    assert.equal(h.events[0].extra?.attemptNumber, 0);
    assert.equal(h.events[0].extra?.retryAfterSeconds, 7);
    assert.equal(h.resolved.length, 0);
    assert.equal(h.controller.getSnapshot().rateLimitedUntil, 8_080);
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "blank" });
    await h.read(entryA, { type: "non_ok", status: 500 });
    assert.deepEqual(h.events.map((event) => event.immediateOutcome), ["transcribe_error_retry", "transcribe_error_retry"]);
    assert.deepEqual(h.events.map((event) => event.extra?.attemptNumber), [0, 0]);
    assert.equal(h.controller.getSnapshot().showFallback, true);
    h.controller.adultSupportAdvance(entryA);
    assert.equal(h.controller.getSnapshot().showFallback, false);
    assert.deepEqual(h.resolved.map((outcome) => outcome.status), ["unscored"]);
    assert.equal(h.events.at(-1)?.immediateOutcome, "SKIPPED");
  }

  {
    const h = createHarness();
    await h.read(entryB, { type: "ok", transcript: "made", confidenceProxy: 0.9 });
    await h.read(entryC, { type: "ok", transcript: "made", confidenceProxy: 0.9 });
    assert.equal(h.controller.getSnapshot().statuses[entryKey(entryB)], "retry");
    assert.equal(h.controller.getSnapshot().statuses[entryKey(entryC)], "reteach");
    assert.equal(h.controller.getSnapshot().attempts.make, 2, "duplicate word text keeps shared attempt count");
    assert.equal(h.resolved.length, 0);
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "ok", transcript: "cake", confidenceProxy: 0.9 });
    assert.deepEqual(h.calls.slice(0, 4), ["startAudioCapture", "stopAudioCapture", "wait:80", "setTimeout:20000"]);
    assert.equal(h.calls[4], "fetch");
    assert.deepEqual(h.fetches[0], {
      url: "/api/voice/transcribe",
      method: "POST",
      model: "gpt-4o-transcribe",
      expectedText: "cake",
      hasAudio: true,
      timeoutMs: 20000,
    });
  }

  {
    const h = createHarness();
    await h.read(entryA, { type: "ok", transcript: "cake" }, "empty");
    assert.equal(h.events[0].immediateOutcome, "transcribe_error_retry");
    assert.equal(h.fetches.length, 0, "empty blob must not POST");
  }

  console.log("scored real-word controller characterization passed");
}

function fakeResponse(status: number, body: Record<string, unknown>, retryAfter: string | null = null) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? retryAfter : null) },
    json: async () => body,
  } as Response;
}

function cloneState(state: ScoredRealWordState): ScoredRealWordState {
  return {
    statuses: { ...state.statuses },
    attempts: { ...state.attempts },
    technicalFailures: { ...state.technicalFailures },
    wordFeedback: { ...state.wordFeedback },
    recording: state.recording,
    thinking: state.thinking,
    recordingStartInFlight: state.recordingStartInFlight,
    requestInFlight: state.requestInFlight,
    rateLimitedUntil: state.rateLimitedUntil,
    showFallback: state.showFallback,
  };
}

void main();
