# PR-C2b-0 · Extract the VAD listen-for-attempt primitive (behavior-frozen) · Codex spec (v3, Jonathan + Pro hardened — send to Codex STOP-0)

**Date:** 2026-06-29 · Verified against `origin/main` (post-PR-C2a `6ff7a4b`). [[project_coach_mode_stepper_redesign]]; [[feedback_run_voice_invariant_gates]]; [[project_capture_flywheel_built]].
**This is the plumbing slice of PR-C2b** (Jonathan's lock 2026-06-29): extract first, wire later. **C2b-1 wires the stepper warmup/nonsense cards; this PR does NO `LessonStepper` work.**

## Goal
Pull the VAD listen-for-attempt + consent-gated capture lifecycle out of the file-local `ListenForReadingAttempt` (`components/literacy/StudentPracticeSession.tsx`) into a **framework-free controller + Strict-Mode-safe hook**, then refactor `ListenForReadingAttempt` to consume it. **Scrolling player behavior must be byte-identical** (warmup + pseudoword). This mirrors PR-0A (`scoredRealWordController` + `useScoredRealWordController`) exactly — same extraction shape, same Strict-Mode adapter discipline.

## Why (sets up C2b-1)
The stepper drives **one word per screen**, and nonsense capture must (a) share **one `PseudowordCaptureCoordinator`** across all nonsense screens (the grouping invariant — one `voiceSessionId` per Part-3 block) and (b) use **`payload.wordIndex` from PR-A**, not `words.indexOf(word)` (which is always 0 for a one-word array). Extracting the lifecycle into a word-centric controller is the only clean way to reuse the exact VAD/capture behavior without copy-pasting it into `LessonStepper` (the architecture rule). **This PR only extracts + proves-unchanged; it does not change any index/consent/grouping semantics.**

## What extracts → `lib/voice/vadListenController.ts` (framework-free class)
The full per-word lifecycle currently in `ListenForReadingAttempt` (`StudentPracticeSession.tsx:732-1010`):
- **State:** `statuses` (`idle|listening|heard|tryAgain|fallback`), `attempts`, `messageByWord`, `fallbackAccepted`, `micUnavailable`.
- **Lifecycle methods:** `handleWordTap` (start / tap-to-stop), `stopEarly`, `completeHeard`, `markTryAgain`, `showFallback`, `acceptFallback`, `stopActiveListening`. (`finish` stays caller-owned — see below.)
- **Internals:** the `voiceActivity`/`clipRecorder`/`listenStartedAt`/`coordinator`/`pollTimer`/`timeout`/`starting`/`speakPromise`/`completing` refs; the `cooldownAfterSpeech` 250ms; the `VOICE_ACTIVITY_MAX_LISTEN_MS` (6000) poll/timeout loop; the 3-attempts→fallback rule; the mic-unavailable path.
- **Capture (preserve EXACTLY):** clip recording starts only when `captureEnabled === true && surface === "pseudoword"`; on `completeHeard`, the blob → `coordinator.enqueue({ blob, lessonTargetCode, expectedText: word, wordIndex, speakerAgeBand: undefined, clipDurationMs })`. **`wordIndex` becomes an explicit per-word input to the controller** (the caller supplies it) — in this PR the consumer passes today's value `words.indexOf(word)`, so behavior is unchanged; C2b-1 will pass `payload.wordIndex`. This is the ONLY API-shaping change, and it is behavior-preserving here.

### Injectable deps (for tests, mirror `scoredRealWordController`)
Constructor takes a `deps` object: `{ startVoiceActivity, stopVoiceActivity, startClipRecorder, now, setTimeout, clearTimeout, setInterval, clearInterval, cooldown }`. The hook supplies the real implementations (`@/lib/voice/voiceActivity`, `@/lib/voice/captureRecorder`, `window.*`). Tests inject fakes (synchronous timers, a fake VAD handle whose `heardSpeech()` is scriptable, a fake clip recorder, a spy coordinator).

### Coordinator ownership seam (PR-0B — MUST survive extraction)
The controller accepts an **optional `captureCoordinator`** in options.
- If supplied → it uses that coordinator (C2b-1: one shared coordinator above all `nonsense_word` screens, injected through).
- If omitted → it creates **ONE stable coordinator per controller setup** (`?? new PseudowordCaptureCoordinator()`) — this is the current scrolling `ListenForReadingAttempt` ownership (one per mounted block). **The controller MUST NOT create a fresh coordinator per word.**
- **C2b-0 preserves current scrolling ownership** (omitted → one-per-block). **C2b-1 creates one coordinator above all `nonsense_word` screens and passes it in.** The seam is the whole reason PR-0B added coordinator injection — do not lose it.

### Callbacks (options, latest-ref-forwarded)
`{ surface, copy, captureEnabled, lessonTargetCode, captureCoordinator?, speakEncouragement, onHarperMessage, onBuddyState, onSpeak, onStateChange }`. `onStateChange(snapshot)` drives React re-render (like the scored controller's `subscribe`). The controller does NOT own `words`/`intro`/`prompt` rendering — it operates on a word + per-word context passed by the caller.

### Snapshot shape (lock exactly; preserve current keying)
```ts
type VadListenSnapshot = {
  statuses: Record<string, "idle" | "listening" | "heard" | "tryAgain" | "fallback">;
  attempts: Record<string, number>;
  messageByWord: Record<string, string>;
  fallbackAccepted: Record<string, boolean>;
  micUnavailable: boolean;     // GLOBAL — see below
  activeWord: string | null;   // the one word currently listening (was activeWordRef)
  interactionBusy: boolean;    // learner-interaction busy — see "Busy split" below
};
```
**Preserve the current state-keying from `ListenForReadingAttempt` EXACTLY: keyed by word text** (`statuses`/`attempts`/`messageByWord`/`fallbackAccepted`). Do NOT switch to structural step ids in this extraction. (C2b-1 decides whether a one-word stepper adapter needs a structural-key seam; C2b-0 must not change scrolling semantics.)
- **`activeWord`** replaces the render's `activeWordRef.current` read (`StudentPracticeSession.tsx:985` disables every other word while one is listening) — the snapshot must expose it so the extracted render preserves "disable other words while one is listening." The component still derives `doneWords`/`allDone`/`vadConfirmedWords`/`fallbackWords` from `statuses`+`fallbackAccepted`+`words` for its caller-owned `finish()`.
- **`micUnavailable` is GLOBAL** for the mounted block/controller: it is NOT keyed by word, NOT reset by changing words. Verified in source — `setMicUnavailable` is only ever called with `true` (sticky). It resets **only when the controller instance is recreated** for a new mounted block. (Patch 1)
- **Word-text duplicate collapse is preserved** (duplicate words in a block share status/attempt/fallback) — frozen, not fixed. (Patch 9/keying)

### Busy split — `interactionBusy` ≠ coordinator pending (Patch 4)
`interactionBusy` includes: active VAD/listening, encouragement/TTS sequencing, active stop/cleanup, and mic-start-in-flight. It **does NOT** include `coordinator.hasPending()`, `coordinator.whenIdle()`, or any background upload-queue state. **C2b-1 will use `interactionBusy` for Back/Next; it must NEVER use coordinator pending.** In C2b-0 the scrolling consumer does not read `interactionBusy` (its grid-disable logic uses `activeWord`/`done`), so adding it is additive and behavior-neutral — it only sets up C2b-1. (Preserves PR-0B's "background pending ≠ learner busy.")

### One active attempt at a time (Patch 2)
Only one active listening attempt may exist at a time. Starting/tapping a different word while one is actively listening must first stop/cleanup the active attempt or no-op **exactly as today** (`handleWordTap` guards `if (voiceActivityRef.current) return;` and tap-to-stop on the active word). **Never two VAD handles or two clip recorders simultaneously.**

## Thin hook → `components/literacy/useVadListenController.ts`
Mirror `useScoredRealWordController` exactly so the PR-0A disposed-controller bug cannot recur:
- The controller is created **inside an Effect setup**.
- Cleanup unsubscribes/stops timers/**disposes that controller and clears the ref ONLY if it still points to that controller** (`if (controllerRef.current === created) controllerRef.current = null`).
- Returned commands **dereference `controllerRef.current` at invocation time** — they never close over a stale controller or options object.
- Options/callbacks update via **latest refs**.
Returns `{ state, handleWordTap, stopEarly, acceptFallback, dispose }` (names final at impl). `createVadListenControllerLifecycle` exported for tests.

**Latest-ref callbacks (Patch 5 — the PR-0A stale-callback class of bug):** the long-lived controller must invoke the **latest** `onSpeak`/`onHarperMessage`/`onBuddyState`/`onStateChange` — never the ones captured at setup. Options update through latest refs. Test: setup with callbacks A → update options to callbacks B without recreating the controller → the next encouragement/state path invokes B only.

**`dispose` is terminal (Patch 3):** after `dispose`, all commands (`handleWordTap`/`stopEarly`/`acceptFallback`) no-op and no state/callback emissions occur. The hook creates a **fresh** controller on Strict-Mode remount rather than reusing a disposed one. Test: dispose → commands no-op; setup A → cleanup disposes A → setup B creates B ≠ A and forwarding commands hit B.

## Consumer refactor → `ListenForReadingAttempt` (behavior byte-identical)
`ListenForReadingAttempt` keeps its **entire render** (intro + heard-counter, word grid, tap-to-read/stop, status colors, per-word message, adult-support fallback button, gated `finish` button) and its **own** `words`/`allDone`/`doneWords`/`finish()` ownership. It delegates the per-word lifecycle to `useVadListenController`:
- reads `statuses/attempts/messageByWord/fallbackAccepted/micUnavailable` from `state`;
- `onClick` → controller `handleWordTap(word, { wordIndex: words.indexOf(word) })`;
- adult-support button → controller `acceptFallback(word)`;
- `finish` stays in the component (it computes `vadConfirmedWords/fallbackWords/totalWords` from `state` + `words` and calls `onComplete`), because completion is array-scoped (whole warmup/pseudoword block) — the stepper will own its own per-screen completion in C2b-1.
- `intro/prompt/encourage/labels` stay component props passed into controller options where needed (prompt/encourage for Harper messages).

**No other call sites change.** The warmup wrapper (`:371`) and the pseudoword section (`:651`) keep their exact props.

## Behavior-freeze guarantees (assert in review)
- Scrolling warmup: tap→listening→heard, timeout→tryAgain, 3 misses→adult-support fallback, mic-unavailable→fallback, **no capture** (warmup never passes `captureEnabled`).
- Scrolling pseudoword: same + capture on heard when `trainingCaptureEnabled`; one coordinator for the block; `wordIndex = words.indexOf(word)` unchanged; grouping (one `voiceSessionId`) unchanged.
- Same timings (250ms cooldown, 6000ms max listen, 100ms poll), same 3-attempt threshold, same copy keys, same buddy/Harper messages, same disabled/active rules in the grid.

### Capture gate — EXACT condition (test oracle, not just prose)
- Clip recorder starts **only when `captureEnabled === true` AND `surface === "pseudoword"`**.
- `coordinator.enqueue` happens **only when `blob` exists AND `lessonTargetCode` is nonempty**.
- `surface === "warmup"` **never** starts a clip recorder and **never** enqueues.
- **`coordinator.enqueue` is fire-and-forget** — the controller must NOT `await` it, and a non-empty coordinator pending state must NOT disable Next/`finish` or make the learner wait on a background upload (preserve PR-0B's "background pending ≠ learner busy" rule).

### Fallback / adult-support completion semantics (Patch 6)
`acceptFallback(word)`:
- marks `fallbackAccepted`/heard-equivalent status **exactly as today**;
- contributes to `fallbackWords` in the caller's `finish` payload;
- does **NOT** call `startClipRecorder`, does **NOT** enqueue capture, does **NOT** count as `vadConfirmedWords`.
Holds for **both** `warmup` and `pseudoword` surfaces. (Capture is only ever the `heardSpeech`-confirmed path.)

### Capture duration source (Patch 7)
`clipDurationMs` is derived from the **same `listenStartedAt`/`now` delta as today** (`StudentPracticeSession.tsx:857`), via the injectable `now()`. Computed **only** for the `heardSpeech` path — NOT for timeout/fallback/adult-support. Test with fake `now()`: `listenStartedAt=1000`, `completeHeard` at `now=2300` → `clipDurationMs === 1300`.

### Lifecycle cleanup — explicit
- `dispose`/cleanup **stops active VAD, stops any active clip recorder safely, clears poll/timeout timers, and settles state without throwing.**
- `stopActiveListening` **does NOT enqueue capture.**
- `completeHeard` enqueues capture **only after a `heardSpeech`-confirmed path.**

## Tests → `scripts/test-vad-listen-controller.ts`
Drive the controller with injected fakes:
- tap → `listening`; fake `heardSpeech()` true → `heard` + `onHarperMessage(encourage)`; timeout → `tryAgain`; 3 attempts → `fallback`; `acceptFallback` → `heard`.
- **Capture gate oracle (exact):** `captureEnabled=false` OR `surface="warmup"` → clip recorder never started, coordinator never enqueued. `captureEnabled=true && surface="pseudoword"` → on heard, `coordinator.enqueue` called **once** with the supplied `wordIndex`, `expectedText`, `clipDurationMs`. Missing/empty `lessonTargetCode` → no enqueue even when heard. Enqueue is not awaited (controller resolves the heard path without waiting on the coordinator).
- **Grouping seam:** two words enqueued through one injected coordinator → coordinator receives both in order with correct `wordIndex` (the one-`voiceSessionId` pinning is the coordinator's own job, covered by `test:pseudoword-capture-coordinator`). Also: omitting the coordinator → the controller creates exactly ONE coordinator for the setup (not one per word).
- mic-unavailable (startVoiceActivity throws) → `micUnavailable` + fallback, no enqueue.
- **Cleanup/unmount while listening:** `dispose` mid-listen → poll/timeout timers cleared, VAD stopped, any active clip recorder stopped, **no enqueue** (because no heard-completion happened), no throw.
- **Strict-Mode setup/dispose + terminal dispose (Patch 3):** setup A → cleanup disposes A → setup B creates B ≠ A; forwarding commands invoke B; A remains disposed; only one active subscription/timer set. After `dispose`, `handleWordTap`/`stopEarly`/`acceptFallback` no-op with no emissions.
- **micUnavailable global (Patch 1):** `startVoiceActivity` throws on word A → `micUnavailable` true; tapping word B does **not** clear it.
- **One active attempt (Patch 2):** tap A starts one VAD handle; tap B before A completes does **not** create a second VAD handle or second clip recorder.
- **Latest-ref callbacks (Patch 5):** setup with callbacks A → update options to B without recreating → next encouragement/state path invokes B only.
- **Fallback no-capture (Patch 6):** `acceptFallback` on both `warmup` and `pseudoword` → status fallbackAccepted/heard-equivalent, contributes to caller `fallbackWords`, **no `startClipRecorder`, no enqueue, not `vadConfirmedWords`.**
- **clipDurationMs (Patch 7):** fake `now()` — `listenStartedAt=1000`, heard at `2300` → `clipDurationMs===1300`; timeout/fallback paths compute none.
- **Busy split (Patch 4):** `interactionBusy` true during listening/encouragement/cleanup/mic-start; a coordinator with pending uploads (`hasPending()===true`) does **not** make `interactionBusy` true.

## `test:voice-capture-layer2` MUST be updated to follow the moved code (NOT relaxed)
The current `scripts/test-voice-capture-layer2.ts` asserts capture-path strings **inside `StudentPracticeSession.tsx`** (`player.includes("startClipRecorder(handle.stream)")`, `"coordinator.enqueue"`, `'trainingCaptureEnabled === true && surface === "pseudoword"'`, `"blob = await clipRecorder.stop()"`, `"PseudowordCaptureCoordinator"`). After extraction those strings live in `lib/voice/vadListenController.ts`, so the test WILL fail for the wrong reason unless its assertions follow the move. **This is the same maintenance PR-0B did for `capturePseudowordClip` — follow the real path, do NOT weaken the invariant.** Required edits to the test:
**Controller/hook (NEW positive path) — assert these are present in `vadListenController.ts` (or `useVadListenController.ts`):**
- `startVoiceActivity`
- `startClipRecorder(handle.stream)`
- `captureEnabled === true && surface === "pseudoword"` (the gate)
- `coordinator.enqueue`
- `blob = await clipRecorder.stop()`

**`StudentPracticeSession.tsx` (`player`) — assert (Patch 8):**
- imports/uses `useVadListenController` (consumer wired to the extracted primitive);
- **no longer directly contains** `startClipRecorder(handle.stream)`;
- **no longer directly contains** `coordinator.enqueue`;
- still **does not** contain `capturePseudowordClip`, `voiceSessionIdRef`, `VoiceSession`;
- still **passes** `trainingCaptureEnabled`/`surface`/`lessonTargetCode` into the hook/controller path.

**Keep byte-identical (no weakening):** ALL route (`app/api/voice/capture/pseudoword/route.ts`), storage (`lib/voice/storage.ts`), recorder, client, and consent assertions (`trainingCorpusOptedIn` on the practice/target pages, same-origin, auth, no-transcribe, private-storage, delete-on-failure).

## Gates (run exactly these; do NOT run `test:p4a-voice-smoke`)
```bash
npm run test:vad-listen-controller        # new
npm run test:pseudoword-capture-coordinator
npm run test:voice-capture-layer2         # updated to follow moved path
npx tsx scripts/test-voice-activity.ts
npm run test:scored-realword-controller   # untouched — proves no collateral
npm run test:presentation-copy
npx tsc --noEmit
npm run build
```
`test:voice-capture-layer2` + `test-voice-activity` are the voice-invariant gates — REQUIRED because this PR touches the capture/VAD path ([[feedback_run_voice_invariant_gates]]).

**Manual (scrolling-player VAD regression only — NOT the stepper, which is unchanged here):**
- Use a **scrolling profile ONLY: K-3 or BAND_4_6.** **Do NOT use the `grade7-voice-smoke` account** — grade 7 routes through the stepper and C2b-0 does not wire stepper capture. (Patch 9)
- The scrolling lesson still runs warm-up VAD (listen → heard → try-again → adult-support) identical to today.
- Pseudoword VAD behavior unchanged in any scrolling path where `trainingCaptureEnabled` is available.
- **If no consent-enabled scrolling account exists, mark the real-capture smoke PENDING — do NOT fake it.** Unit tests carry most of C2b-0; the real end-to-end stepper capture smoke belongs to C2b-1.

## Scope (files)
```
lib/voice/vadListenController.ts                 (NEW — framework-free lifecycle)
components/literacy/useVadListenController.ts     (NEW — Strict-Mode hook adapter)
components/literacy/StudentPracticeSession.tsx    (ListenForReadingAttempt consumes the hook; render unchanged; NO other change)
scripts/test-vad-listen-controller.ts             (NEW)
scripts/test-voice-capture-layer2.ts              (UPDATE assertions to follow moved code — NOT relax; see section above)
package.json                                      (add test:vad-listen-controller script)
```
**Explicitly UNCHANGED:** `LessonStepper.tsx`, `coachStepperState.ts`, `aggregateCoachPartOutcome.ts`, `pseudowordCaptureCoordinator.ts`, `captureRecorder.ts`, `voiceActivity.ts`, `scoredRealWordController.ts`, the capture route/storage/consent. STOP and report if scope must widen.

## STOP-1
```bash
git --no-pager diff --name-only origin/main...HEAD
# ONLY: vadListenController.ts, useVadListenController.ts, StudentPracticeSession.tsx, test-vad-listen-controller.ts, test-voice-capture-layer2.ts, package.json, the tracked spec

git diff --exit-code origin/main...HEAD -- components/literacy/LessonStepper.tsx   # EMPTY — no stepper work in C2b-0
git diff --exit-code origin/main...HEAD -- lib/literacy/coachStepperState.ts lib/literacy/aggregateCoachPartOutcome.ts lib/voice/pseudowordCaptureCoordinator.ts lib/voice/captureRecorder.ts lib/voice/voiceActivity.ts   # ALL untouched

# prove the VAD/capture lifecycle MOVED, not duplicated
git grep -n "startClipRecorder\|VOICE_ACTIVITY_MAX_LISTEN_MS" -- components/literacy/StudentPracticeSession.tsx || true   # ZERO (moved into the controller)
git grep -n "new PseudowordCaptureCoordinator\|coordinator.enqueue" -- components/literacy/StudentPracticeSession.tsx || true  # ZERO (moved into the controller)
git grep -n "capturePseudowordClip" -- components/literacy/StudentPracticeSession.tsx || true   # ZERO (was already zero; coordinator owns it)

# capture gate/coordinator path still present in the NEW real path
git grep -n "surface === \"pseudoword\"\|trainingCaptureEnabled\|captureEnabled\|PseudowordCaptureCoordinator" -- lib/voice/vadListenController.ts   # PRESENT
git grep -n "useVadListenController" -- components/literacy/StudentPracticeSession.tsx   # PRESENT (consumer wired)

git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/LessonStepper.tsx components/literacy/BuddyCharacter.tsx || true   # still ZERO
```
+ the gate set above. Manually confirm the `test:voice-capture-layer2` edits **followed** the moved code and did not relax any route/storage/consent assertion.

## Guardrails
Behavior byte-identical for the scrolling player — never duplicate VAD/capture logic, MOVE it. Capture stays pseudoword-only + consent-gated (`captureEnabled === true && surface === "pseudoword"`); no new persistence, no consent changes. Strict-Mode recreate-per-setup (no reused-instance dispose). No `LessonStepper`/stepper-state/aggregate changes. `wordIndex` semantics unchanged in this PR (consumer still passes `words.indexOf(word)`).

## ✅ Decisions — RESOLVED (Jonathan, 2026-06-29)
1. **Controller home** = `lib/voice/vadListenController.ts` (framework-free core, with the other voice primitives it depends on); React hook in `components/literacy/useVadListenController.ts`. CONFIRMED.
2. **`wordIndex` explicit now** — C2b-0 consumer passes `words.indexOf(word)` (frozen); C2b-1 passes `payload.wordIndex` (PR-A). CONFIRMED.
3. **`finish`/block completion stays caller-owned** — controller is per-word/per-attempt only; block completion lives in `ListenForReadingAttempt` (C2b-0) and `LessonStepper` (C2b-1). CONFIRMED.
4. **Encouragement/TTS serialization stays inside the controller** — speak-before-next-listen preserved (VAD must not start while Harper is speaking); expose busy state later, but never make the learner wait on background uploads. CONFIRMED.

**Jonathan verdict:** proceed after these hardenings (folded into v2). Run past Pro, then send to Codex — riskiest remaining audio/consent slice, so the extra pass is worth it.

**Pro verdict (v3): "Patch those nine and then send to Codex STOP-0."** Nine patches folded into v3 (all verified against source): (1) `micUnavailable` global/sticky, never reset on word change; (2) one active attempt — never two VAD handles/recorders; (3) `dispose` terminal; (4) `interactionBusy` ≠ coordinator pending (snapshot split); (5) latest-ref callbacks (`onSpeak`/`onHarperMessage`/`onBuddyState`/`onStateChange`); (6) fallback/adult-support never captures; (7) `clipDurationMs` = `listenStartedAt`/`now` delta, heard-path only; (8) layer-2 test positive-on-controller / negative-on-player assertion split; (9) manual smoke excludes the `grade7-voice-smoke` account (scrolling K-3/BAND_4_6 only). Snapshot gained `activeWord` (replaces the render's `activeWordRef` read) + `interactionBusy`.
