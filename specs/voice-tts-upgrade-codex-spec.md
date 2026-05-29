# Voice TTS Upgrade · Codex Implementation Spec

**Status:** Draft for Codex execution
**Date:** 2026-05-24
**Companion to:** `specs/reading-buddy-v1-codex-spec.md` (v1 chassis, where the TTS interface was defined), `specs/voice-data-flywheel-codex-spec.md` (voice consent + retention), `specs/data-flywheel-foundation-codex-spec.md` (ModelDecision instrumentation — used for cost tracking here)

---

## 1. Overview

Swap the browser `SpeechSynthesis` API used in `lib/voice/tts.ts` for **OpenAI TTS** as the production TTS provider. Browser speech synthesis is robotic, varies by OS, and is the single biggest perceived-quality gap in Reading Buddy v1. OpenAI TTS provides warm, child-friendly voices for fractions of a cent per playback.

Keep the existing `TTSProvider` interface so future provider swaps (ElevenLabs, Cartesia) are interface-level changes only — components calling TTS do not change.

Instrument every TTS call as a `ModelDecision` (now possible since data flywheel foundation has shipped). This captures cost, latency, and per-voice usage data that will inform later provider-comparison decisions.

This is the first concrete payoff of the data flywheel foundation: TTS_GENERATION rows will start accumulating cost data on day one, and the model comparison admin panel will show OpenAI vs browser fallback usage immediately.

---

## 2. In Scope / Out of Scope

### In scope

- OpenAI TTS provider implementation conforming to the existing `TTSProvider` interface.
- Voice selection: default to `"shimmer"` for kid-friendly warmth across K-8 (validated as the best general-purpose OpenAI voice for this audience).
- Audio response cache keyed by stable hash of `(text, voice, model)` so repeat playbacks don't re-bill. 24-hour TTL initially.
- Server-side proxy route so the OpenAI API key stays off the client.
- `ModelDecision` instrumentation per TTS call (`decisionType: "TTS_GENERATION"`), per AGENTS.md instrumentation guidance.
- Provider configuration via env var: `TTS_PROVIDER` with values `"OPENAI"` (default in production) or `"BROWSER"` (fallback for dev/testing).
- Best-effort fallback to `BrowserTtsProvider` if the OpenAI call fails. Never block the kid's playback waiting on a failed API.
- Per-student-per-day playback cost cap, configurable, default ~100 playbacks (~$0.15/kid/day at typical text lengths). Cap enforced via lookup against `ModelDecision`.
- Wrapped-vs-unwrapped equality fixture per AGENTS.md LLM Instrumentation Guidance.

### Out of scope (deferred)

- **ElevenLabs / Cartesia / PlayHT integration.** Future spec, evaluated after we have retention data showing OpenAI TTS is or isn't sufficient.
- **Voice cloning / custom Buddy voice.** Year 2+ work.
- **Multi-language TTS** (Spanish, etc.). Separate spec when dialect onboarding actually carries non-English settings.
- **Personalization** (different voices per grade, age, preference). Defer until retention data justifies it.
- **Real-time barge-in via Pipecat or LiveKit.** Separate UX spec.
- **TTS effectiveness model training.** Future flywheel.

---

## 3. Database Schema Changes

None for v1 of this spec. Use the existing `ModelDecision` model from the data flywheel foundation. The `decisionType` `"TTS_GENERATION"` is a new value but not a new enum (per the spec, decision types are string constants in `lib/decisions/decisionTypes.ts`).

Add to `lib/decisions/decisionTypes.ts`:

```ts
TTS_GENERATION: "TTS_GENERATION",
```

---

## 4. New Files

### `lib/voice/providers/openai-tts.ts`

OpenAI TTS provider implementation conforming to the `TTSProvider` interface defined in `lib/voice/tts.ts`. Internally calls the server proxy route, never the OpenAI API directly from the browser.

### `app/api/voice/tts/route.ts`

Server-side proxy. POST with `{ text, voice, model }`, returns audio bytes (`audio/mp3`). Authenticated; rate-limited per user. Logs a `ModelDecision` per call with cost/latency. Honors the per-student-per-day cost cap.

### `lib/voice/tts-cache.ts`

Cache keyed by stable hash of `(text, voice, model)`. In-memory LRU for v1 (simpler than Redis; persistent cache deferred). 24-hour TTL. Cache hits do not produce a new `ModelDecision` (no inference happened).

### `lib/voice/tts-cost-cap.ts`

Per-student-per-day playback counter. Reads from `ModelDecision` where `decisionType = "TTS_GENERATION"` and `studentEventId.studentUserId = X` and `occurredAt > startOfToday`. Returns `{ allowed: boolean, used: number, cap: number }`.

### `lib/voice/providers/openai-tts.equality.test.ts`

The mandated wrapped-vs-unwrapped equality fixture per AGENTS.md. Uses a deterministic fake OpenAI response to assert that the wrapped TTS call returns the same audio bytes as the unwrapped call, including when the `recordModelDecision` persistence fails.

---

## 5. Updated Files

### `lib/voice/tts.ts`

Refactor to a factory pattern:

```ts
export interface TTSProvider {
  speak(text: string, options?: { rate?: number; voice?: string }): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}

export function getTtsProvider(): TTSProvider {
  const provider = process.env.NEXT_PUBLIC_TTS_PROVIDER ?? process.env.TTS_PROVIDER ?? "OPENAI";
  switch (provider) {
    case "OPENAI": return new OpenAiTtsProvider();
    case "BROWSER": return new BrowserTtsProvider();
    default: return new BrowserTtsProvider();
  }
}
```

`BrowserTtsProvider` stays exactly as it is in v1 — no behavior change.

### `lib/decisions/decisionTypes.ts`

Add `TTS_GENERATION: "TTS_GENERATION"` constant.

### `.env.example`

Add:

```
# TTS provider: "OPENAI" (default) or "BROWSER" (dev fallback)
TTS_PROVIDER=OPENAI
# OpenAI API key (server-side only — never expose to client)
OPENAI_API_KEY=sk-...
# Per-student-per-day TTS playback cap (number of generated playbacks; cache hits do not count)
TTS_PER_STUDENT_DAILY_CAP=100
```

### Components using `lib/voice/tts.ts`

`BuddyCharacter` and any other components consuming the `TTSProvider` interface must not need changes — they call the abstraction. If Codex finds a component that holds a direct reference to `BrowserTtsProvider` rather than `getTtsProvider()`, fix it to use the factory.

---

## 6. Implementation Order

1. Add `TTS_GENERATION` to `lib/decisions/decisionTypes.ts`.
2. Implement `OpenAiTtsProvider` (client-side wrapper that hits the proxy route).
3. Implement `app/api/voice/tts/route.ts` proxy with auth, rate limit, `ModelDecision` logging.
4. Implement `lib/voice/tts-cache.ts` (in-memory LRU).
5. Implement `lib/voice/tts-cost-cap.ts`.
6. Refactor `lib/voice/tts.ts` to factory pattern; keep `BrowserTtsProvider` intact.
7. Update `.env.example` and any deployment docs.
8. Write the wrapped-vs-unwrapped equality fixture (per AGENTS.md).
9. Tests: unit on cache, cost-cap, fallback path. Integration on proxy route auth + rate limit + cost cap. End-to-end: a kid in `/student/practice/voice` hears OpenAI TTS, second playback of the same passage within 24 hours hits cache.
10. Manual QA: blind comparison with 3 parents/kids of OpenAI "shimmer" vs browser TTS. Confirm preference.

Total estimated effort: 4-6 days of focused engineering.

---

## 7. Acceptance Criteria

### Behavior

- With `TTS_PROVIDER=OPENAI` (default), `/student/practice/voice` and `/student/diagnostic/voice` play warm, human-sounding voice instead of robotic browser TTS.
- With `TTS_PROVIDER=BROWSER`, behavior reverts exactly to v1 browser `SpeechSynthesis`. No behavior change vs pre-spec baseline.
- A failing OpenAI API call falls back to `BrowserTtsProvider` gracefully — the kid still hears something; the failure is logged but not user-visible.

### Caching

- The same `(text, voice, model)` playback within 24 hours hits the cache. No new OpenAI API call. No new `ModelDecision` row.
- Cache evicts after 24-hour TTL.

### Instrumentation

- Every OpenAI TTS API call produces a `ModelDecision` row with:
  - `decisionType = "TTS_GENERATION"`
  - `modelProvider = "OPENAI"`
  - `modelName = "tts-1"` (or whatever model is configured)
  - `inputContextJson` containing `{ textLength, voice, model, cacheKey }` — never the raw text (text is the student-facing passage and may be PII-adjacent)
  - `costUsd` populated based on character count × current OpenAI TTS pricing
  - `inferenceMs` populated

### Cost cap

- Per-student-per-day cost cap enforced. When the cap is reached, the proxy returns HTTP 429 with `{ error: "tts_cap_reached", capUsed: N, capTotal: M }`.
- Cache hits do not count against the cap.

### Privacy & security

- The OpenAI API key is never exposed client-side.
- The proxy route requires authentication and applies rate limiting.
- No raw audio bytes are stored in `ModelDecision` rows — only cache keys.

### Equality fixture (per AGENTS.md)

- The wrapped-vs-unwrapped equality fixture runs both the wrapped path (with `recordModelDecision`) and the unwrapped path with a deterministic fake OpenAI response. Asserts deep equality of returned audio bytes. Also asserts equality when `recordModelDecision` persistence is forced to fail (capture must be non-blocking).

---

## 8. What Codex Should NOT Do

1. **Do not introduce ElevenLabs, Cartesia, PlayHT, or any third-party TTS beyond OpenAI** in this spec. Those are future specs.
2. **Do not store raw audio bytes in `ModelDecision.inputContextJson` or `decisionJson`.** Use cache keys and metadata only.
3. **Do not change the `TTSProvider` interface.** It's load-bearing for the factory pattern and for future provider swaps.
4. **Do not expose `OPENAI_API_KEY` to the client.** All OpenAI calls go through the proxy route.
5. **Do not auto-detect kid age and pick a voice.** Default to `"shimmer"` for everyone in v1. Personalization is a future spec.
6. **Do not store the raw passage text in instrumentation payloads.** Use character count and cache key only.
7. **Do not skip the equality fixture.** It is mandatory per AGENTS.md LLM Instrumentation Guidance.

---

## 9. Open Questions for Jonathan (resolve before Codex starts)

1. **Cache storage.** In-memory LRU for v1, or stand up Redis from day one? *Recommend: in-memory + per-process LRU for v1; persistent cache when we have multi-instance deployment.*
2. **Cost cap threshold.** Default 100 plays/student/day (~$0.15) — is that the right place to start? *Recommend: yes, start there and tune from telemetry after first 100 kids.*
3. **Voice selection.** Default to `"shimmer"` for everyone? *Recommend: yes for v1. Personalization deferred.*
4. **Rate limit on the proxy route.** Use existing `lib/rateLimit.ts` patterns or new TTS-specific limit? *Recommend: existing patterns; the cost cap is the real protection, rate limit is secondary.*

---

**End of Voice TTS Upgrade v1 spec.**

Companion specs in the voice infrastructure backlog: voice-vendor-evaluation (SoapBox vs Whisper for STT, once labeling has produced ~500+ segments), voice-realtime-barge-in (Pipecat integration), voice-fine-tuning (custom acoustic model, year 2+).
