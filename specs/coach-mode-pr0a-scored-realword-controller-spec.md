# Coach Mode PR-0A — extract the stable scored real-word controller · Codex spec (v2, post-Pro confirm)

**Date:** 2026-06-16 · Verified against `origin/main` (post-PR1). Architecture: `specs/coach-mode-stepper-architecture-spec.md` (v3). **No visual stepper, no pseudoword changes.**
**Goal:** extract the **scored real-word attempt state machine** out of the file-local `Part3LiveLoop` (`components/literacy/StudentPracticeSession.tsx`) into a **framework-independent, stable-lifetime controller**, and make the **existing scrolling Part 3 consume it** with **byte-identical observable behavior**. Expose `onWordResolved` + `onBusyChange` for later stepper reuse.

## Shape — framework-independent core + thin React adapter (required)
- `lib/literacy/scoredRealWordController.ts` — the **pure/imperative state machine + exported types + the transport/request logic**, with **injected dependencies**: capture (`startAudioCapture`/`stopAudioCapture`), transcription (fetch), clock/timers, speech (`onSpeak`), Harper messages, Buddy state, event emission. **ALL core/transition/transport logic lives in this one module — no additional sibling module** (the implementation file set is exactly the 5 listed in Scope; do not add a 6th).
- `components/literacy/useScoredRealWordController.ts` — a **thin React state/effect adapter** wrapping the core for `StudentPracticeSession`.
- **The characterization test exercises the framework-independent core directly.** Do NOT add Jest/Vitest/jsdom/React-Testing-Library or source-string assertions.

## What MOVES into the controller vs STAYS in `Part3LiveLoop`
**Moves (controller):** `attempts`, `technicalFailures`, statuses, `wordFeedback`, `showFallback`, `recording`/`thinking`/rate-limit state, `captureRef`/`chunksRef`, recording/request in-flight guards, `beginRecording`, `stopAndScore`, the score decision, assisted advance, technical-failure handling, adult-support resolution.
**Stays (scrolling player, caller-owned):** `realEntries` derivation, `currentIndex` + progression, `allRealWordsComplete`, the pseudoword transition, the Part-3 final completion button + its gating, and **all JSX/markup**. (Progression stays caller-owned so the future stepper reuses the controller without touching pseudoword or part-completion behavior.)

## Preserve current state-key quirks EXACTLY (do not "fix")
- status / chip feedback → keyed by structural **`entryKey`** (lineNumber+index+word, `:1659`).
- `attempts` / `technicalFailures` → keyed by **word text** (`attempts[entry.word]` `:635`, `technicalFailures[entry.word]` `:742`).
Do NOT normalize all maps to structural IDs; do NOT "fix" duplicate-word sharing. Moving to structural attempt keys is a separate behavior-change PR.

## Exact scoring decision table (hardcode; verified at `:649,667`)
- attempt 1 mismatch → retry.
- attempt 2 mismatch, normal confidence → rule reteach + miscue event.
- attempt 3+ mismatch, normal confidence → assisted advance.
- **any attempt with `lowConfidence === true` → retry** (never reteach/assist/resolve). `lowConfidence = confidenceProxy !== null && confidenceProxy < 0.55` (`:639`).
- exact match **with** `lowConfidence === true` → retry, NOT correct (`:649` requires `&& !lowConfidence`).
- technical failure does NOT increment the scored attempt count; **second** technical failure exposes fallback.
- 429 does NOT increment the scored attempt count or resolve the word.

## Exact audio / request contract (verified)
- `startAudioCapture` remains the real-word audio source (`:536`); stopping waits the existing **80 ms** recorder flush (`waitForRecorderFlush` `:1673`); empty blob → technical failure.
- POST remains `/api/voice/transcribe` (`:574`); form includes `model="gpt-4o-transcribe"` (`:570`) and `expectedText = current word`; request timeout remains **20000 ms** (`:573`).
- 429 uses `Retry-After` (`:579`) and emits `transcribe_rate_limited`; non-OK / thrown request / blank transcript route to technical retry.
- **No real-word audio is sent to the pseudoword capture/storage route.**

## `onWordResolved(outcome)` — terminal callback, once per entry
Fires **exactly once** per terminally-resolved entry, **only** on: correct read · assisted advance · adult-support/unscored advance. **Never** for: retry · reteach · rate limit · technical retry.
Ordering (preserve current):
- correct: emit `VOICE_WORD_READ`/`CORRECT`, then `onWordResolved`.
- assisted: emit `VOICE_WORD_READ`/`INCORRECT`, await assisted TTS, then `onWordResolved`.
- adult support: emit `VOICE_WORD_READ`/`SKIPPED`, then `onWordResolved`.
The scrolling consumer advances `currentIndex` from `onWordResolved` (replacing the old `advanceFrom` at the same logical point).
**Sanitized output (no transcripts):**
```ts
type ScoredRealWordResolvedOutcome = {
  status: "correct" | "assisted" | "unscored";
  attemptCount: number; wordId: string; word: string;
  lineNumber: number; lineRole: string; index: number;
  assisted: boolean; unscored: boolean;
};
```

## Assisted-path timing — preserve EXACTLY (verified `:708`)
Today `scoreTranscript` launches `void assistAndAdvance(...)` (NOT awaited); `stopAndScore`'s `finally` clears `requestInFlightRef`, clears `thinking`, and restores Buddy idle at that point; the assisted path independently awaits TTS before advancing. A refactor to `await assistAndAdvance(...)` would wrongly hold the request/thinking guards through TTS and change scrolling-player interactivity. Required:
- the assisted event is emitted; assisted TTS is awaited before `onWordResolved`;
- the existing `requestInFlight`/`thinking`/Buddy-idle cleanup happens at the **same logical point as today** and must NOT be extended through assisted TTS;
- the new informational `busy` signal MAY remain true through assisted TTS, but it must NOT feed or alter the scrolling player's existing `readDisabled`/tap behavior in PR-0A. (Existing interaction guards ≠ the new future-navigation busy signal — they are distinct state.)

## `onBusyChange(busy)` — informational only
`busy === true` during: recording startup · active recording · ASR request/scoring · assisted TTS before resolution. Emit only on boolean transitions; restore `false` on cleanup/unmount.
- It is NOT a replacement for the current word-chip disabled logic: **active recording must remain tappable** so the learner can stop-and-score exactly as today (the current `readDisabled` `:506` deliberately excludes `recording`). Preserve `readDisabled` + tap-to-stop unchanged.
- Rate-limit cooldown is exposed separately and is **not** part of `busy`.
- The scrolling player does NOT use `onBusyChange` to alter its UI in PR-0A; do not change `thinking` / Buddy-state / request-guard timing.

## Telemetry — sanitize ONLY the new callback (location-independent)
"No transcript echo" applies to `onWordResolved`, future stepper state, and review UI. The real invariant: **`rawTranscript`/`normalizedTranscript` remain in the existing `onVoiceEvent` response payloads, and never appear in `onWordResolved`.** The controller MAY own construction of those event payloads — if so, those fields legitimately move from the component into `scoredRealWordController.ts`. Do NOT require the telemetry builder to stay in the UI file; verify the invariant by content (fields present in event construction wherever it lives; absent from `onWordResolved`), proven in the test.

## Characterization tests (the load-bearing oracle — non-circular, TWO layers)
New permanent `scripts/test-scored-realword-controller.ts` (`tsx` + `node:assert`), `deepStrictEqual` against **hardcoded** expected objects (NOT built via production event-builder helpers). **Two layers in the same test:**
- **Layer A — state-machine characterization** (fake transcription/capture deps): the scenarios below, asserting event arrays (eventType, partNumber, immediateOutcome, durationMs where supplied, extra keys/values, response keys/values, order), `onBusyChange` toggles, no transcript in `onWordResolved`.
- **Layer B — production transport-adapter characterization** (injected fake `fetch`/timers, real adapter): assert the request the adapter actually builds — URL `/api/voice/transcribe`; POST FormData contains `audio`, `model="gpt-4o-transcribe"`, `expectedText`; timeout 20000 ms; `Retry-After` interpreted via the current policy; recorder flush delay 80 ms. (A fake-`transcribe()`-only test could pass with a wrong URL/fields — Layer B prevents that.)
Layer-A scenarios:
- confident match → CORRECT + resolve · first miss → retry, no resolve · second miss → reteach + miscue, no resolve · later miss → assisted, await speech, then resolve · 429 → rate-limit, no resolve · technical failures → fallback at 2, no scored-attempt increment · adult support → SKIPPED/unscored + resolve · lowConfidence always retries · exact-match+lowConfidence → retry not correct.
- assert `onBusyChange` toggles around recording/ASR/assisted-TTS; assert NO transcript text in `onWordResolved` output.
(`test:voice-capture-layer2` is a static pseudoword-capture invariant test — it does NOT validate this real-word ASR machine, so the new test is PR-0A's primary oracle.)

## Scope / diff guard
- New `lib/literacy/scoredRealWordController.ts` + `components/literacy/useScoredRealWordController.ts`; `StudentPracticeSession.tsx` minimal rewiring (replace local state/handler refs with controller outputs); the new test; `package.json` alias only: `"test:scored-realword-controller": "tsx scripts/test-scored-realword-controller.ts"`.
- The `Part3LiveLoop` **JSX return tree must remain unchanged** except swapping local state/handler references for controller outputs. **No** copy strings, class names, DOM structure, part-completion logic, pseudoword rendering, or final-button gating may change.
- **Reject if the PR touches:** pseudoword/VAD capture code · voice routes · `/api/voice/transcribe` route behavior · copy/theme/content · stepper UI · retry/fallback thresholds · event schemas.

## Gates (PR-0A)
```
npm run test:scored-realword-controller
npm run test:voice-capture-layer2
npx tsx scripts/test-voice-activity.ts
npm run test:presentation-copy
npx tsc --noEmit
npm run build
```
`test:presentation-copy` is included because this PR edits `StudentPracticeSession.tsx` — it protects the no-raw-band + Harper presentation invariants while the player file is rewired. **Do NOT require the P4A real-mic smoke for PR-0A** (it verifies the *pseudoword* path; gated on PR-0B/PR-C).

## Additional PR-0A contracts (adapter identity + exact timing)
- **Stable adapter identity:** the React adapter creates **one** controller instance per mounted real-word block (`useRef` or equivalent). Changing `currentEntry`, copy strings, `onVoiceEvent`/`onHarperMessage`/`onSpeak`/`onBuddyState`/`onWordResolved`/`onBusyChange` must update inputs/callback refs **without recreating or resetting** the core. Characterization must process ≥2 sequential entries through the SAME instance, **including duplicate word text at different structural entries** (e.g. "make" at entry A then "make" at entry B): structural statuses stay separate; attempt/technical-failure counts stay shared by word text (current mixed keying — do NOT "fix").
- **Terminal handoff ordering (verified `:775-777`):** `advanceFrom` clears `showFallback` then advances `currentIndex` (caller-owned). Preserve exactly: correct → status/msg → `VOICE_WORD_READ/CORRECT` → clear fallback → `onWordResolved`; assisted → status/msg → `VOICE_WORD_READ/INCORRECT` → await assisted TTS → clear fallback → `onWordResolved`; adult-support → status/msg → `VOICE_WORD_READ/SKIPPED` → clear fallback → `onWordResolved`. `onWordResolved` is **synchronous, never awaited**, fires exactly once per resolution; do not add broader event-dedup or change click semantics.
- **Idempotent disposal (preserve current cleanup only):** stop an active `AudioCaptureState` once; clear the rate-limit timer; release refs; emit `onBusyChange(false)` if busy. Do NOT add new unmount-driven ASR cancellation, event suppression, retry, or request semantics — the existing 20000 ms timeout stays the only request-abort policy.
- **No false busy pulse:** `onBusyChange` stays continuously `true` across recording-startup → active-recording → ASR-request/scoring (no brief `false` between phases). Assisted TTS may extend the informational busy signal but NOT the existing `requestInFlight`/`thinking` guards. Active recording stays tappable (stop-and-score) exactly as today.
- **Boundary tests required:** `confidenceProxy === 0.55` is NOT low confidence; `< 0.55` IS; exact-match + low-confidence retries (not CORRECT); attempt 3+ with low-confidence still retries (no assist/resolve); `normalize(...)` (case/whitespace/punctuation/repeated-spaces) exactly as current; state snapshots for retry/reteach/assisted/2nd-technical-fallback/terminal-fallback-clear/rate-limit-until policy. Transport layer asserts **call order**: `stopAudioCapture` → wait 80 ms → non-empty blob → POST `/api/voice/transcribe`, with method POST, `audio` field, `model="gpt-4o-transcribe"`, `expectedText`=current word, 20000 ms timeout, Retry-After behavior, and blank/non-OK/thrown → technical retry.

## Manual real-word smoke (required before merge — the adapter-wiring proof)
The core tests prove the state machine + transport contract, but NOT that the thin React adapter is wired correctly. Before merge, manually:
- Log in as a synthetic student → enter Part 3 real words.
- Tap the current word → recording starts AND the chip stays tappable.
- Tap again → recording stops and scoring runs.
- A confident result advances exactly one word; a retry result does NOT advance.
- No raw transcript is shown to the learner.
- After all real words, the existing pseudoword section appears unchanged.
(Active recording must stay tappable — the chip uses the second tap to stop-and-score; `recording` is intentionally NOT in the disabled rule.)

## STOP conditions
If exposing the callbacks or extracting the controller can't be done without changing ASR/retry/reteach/rate-limit/assisted **semantics**, the keying quirks, the audio/request constants, or without duplicating capture/scoring logic, STOP and report — do not adapt the interaction to fit.
