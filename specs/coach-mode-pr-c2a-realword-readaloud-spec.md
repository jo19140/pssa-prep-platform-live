# PR-C2a · Stepper real-word scored read-aloud (the tutoring loop) · Codex spec (v3, Pro lifecycle-hardened — send to Codex)

**Date:** 2026-06-26 · Verified against `origin/main` (post-PR-C1 `c0150d5`). [[project_coach_mode_stepper_redesign]]; target = the experience mock's read-aloud loop. **First voice slice of PR-C2** (real-word only).
**Sequencing:** on fresh `main` after PR-C1. **Prerequisite (do first):** re-read `Part3LiveLoop` (`StudentPracticeSession.tsx:453+`) — how it drives `useScoredRealWordController` (`{copy: part3 keys, reteachTemplate, onHarperMessage, onBuddyState, onSpeak, onVoiceEvent, onWordResolved}`, the entry shape `{word, lineNumber, lineRole, index}`, `beginRecording(entry, readDisabled)`/`stopAndScore(entry)`, `readDisabled`, `scoredEntryKey`, chip states) — and `useScoredRealWordController`'s return (`{state, beginRecording, stopAndScore, adultSupportAdvance}`) + `onWordResolved` outcome shape (transcript-free: `status, attemptCount, wordId, word, lineNumber, lineRole, index, assisted, unscored`). If shapes differ, **STOP and report.**

## Scope — wire ONLY `real_word`
Replace the generic "Mark read" card for `real_word` with the **real scored read-aloud loop**, reusing the already-extracted `useScoredRealWordController` (PR-0A). **Leave generic:** `warmup_word`, `nonsense_word`, `sentence` (warm-up VAD + nonsense capture = PR-C2b; sentence = PR-C3). No new extraction (controller already extracted). **No capture/consent** — real-word scoring is ASR-transcribe (no audio persisted); the pseudoword *capture* + consent is C2b. `StudentPracticeSession` scroll path untouched.

## One shared controller — in an inner `RealWordControllerProvider`, NOT the shell
`useScoredRealWordController` is a hook. **Do NOT call it at `LessonStepper` top level and do NOT key the whole `LessonStepper` to reset it** — that would remount the shell and blow away stepper state. Instead put the hook in a **small always-mounted inner component** that owns ONLY the controller:
```tsx
<RealWordControllerProvider
  key={realWordBlockKey}          // resets ONLY the controller boundary, not the shell
  lesson={lesson}
  presentationCopy={presentationCopy}
  steps={steps}                   // forwarded; callbacks read latest via ref (see freshness)
  onResolve={handleWordResolved}  // latest-ref safe
  /* onHarperMessage / onBuddyState / onSpeak / onVoiceEvent / onBusyChange */
/>
```
- **`realWordBlockKey`** = a stable signature of the lesson's real-word block (e.g. `lesson.targetCode` + the ordered `real_word` step ids). When it changes, only this provider remounts → controller attempts/statuses reset; **shell stepper state resets only through the normal `createInitialCoachStepperState(steps)` path on lesson/`steps` identity change.** The two reset boundaries are independent.
- The provider must stay mounted while any `real_word` step is reachable (it's shared across all real-word cards). The active `real_word` card reads controller state for its entry; non-real-word steps simply don't drive it.

Options passed to the hook inside the provider:
- `copy`: **`presentationCopyFor(lesson.presentationProfile).part3`** (`readWord, listeningStop, technicalRetry, rateLimitHarper, rateLimitChip, correct, retryPrompt, assisted, adultSupportDone`) — reuse existing Coach copy, **no new keys.**
- `reteachTemplate`: **pinned source** — `const part3 = lesson.parts.find(p => p.partNumber === 3)` (STOP/throw if missing — PR-A guarantees it); `part3.contentJson.reteachPrompt` if nonempty, else `part3.kidVisibleCopy.reteachPrompt` if nonempty, else `presentationCopy.part3.defaultReteachPrompt`.
- `onHarperMessage` → Harper bubble line; `onBuddyState` → BuddyCharacter state; `onSpeak` → the C1 `speak` (`ttsBusyRef`).
- **`onVoiceEvent` → forward the controller's payload VERBATIM through `recordLessonPlayerEvent`** with **`partNumber: 3`** (the `emitLessonEvent` wrapper takes `partNumber: number | null` — pass `3`, NOT `null`) + `sessionId`/`targetCode` from the current lesson/session; preserve `eventType` (`VOICE_WORD_READ`/`VOICE_MISCUE_DETECTED`), `immediateOutcome`, `durationMs`, `response`, `extra` — **do NOT wrap into `LESSON_STEP_COMPLETED`, do NOT rename keys.** The part-level P3 aggregate is separate.
- `onBusyChange` → set `voiceBusy`; **Back/Next disabled while `voiceBusy`** (recording/thinking/in-flight), same reserved path as `ttsBusy`.
- **`onWordResolved(outcome)` → complete by STRUCTURAL STEP ID, never by current index.** Contract:
  - At `beginRecording`/`stopAndScore`, map `entryKey → stepId` in a ref.
  - On resolve: look up the mapped `stepId`; **complete it only if it is a `real_word` step and not already completed.** Do **not** require it to still be `currentStepIndex` — a legitimate late result for the word that initiated the request must still land. **Ignore** unknown `entryKey` or already-completed `stepId` (drops wrong-card / duplicate resolutions).
  - **Must NOT call `completeCurrentStep`** inside `onWordResolved`; use the new `completeStepById` helper (below).
  - **Auto-records the outcome and enables Next — does NOT call `goNext`** (user taps Next; Back/Next stay disabled while `voiceBusy`).
- **Callback freshness (PR-0A lesson):** the provider/controller is long-lived, so **every callback must read latest state via refs** — never close over render-captured `currentStepIndex`, `completedStepIds`, `steps`, `sessionId`, or `targetCode`. Add a source assertion/test that `onWordResolved` resolves `stepId` and reads state from a ref, not from a captured render snapshot.

## The `real_word` card
Each `real_word` step maps to a controller **entry**: `{ word: payload.word, lineNumber: payload.lineNumber, lineRole: payload.role, index: payload.realWordIndex }` (PR-A already supplies these; `realWordIndex` is the flattened index the controller keys on).
- **UI-state mapping** — read by entry key, show only safe messages:
  ```ts
  const entryKey = scoredEntryKey(entry);
  const status = controller.state.statuses[entryKey];   // default | listening | thinking | correct | retry | reteach | assisted | rate-limited | technical-retry
  const feedback = controller.state.wordFeedback[entryKey];
  ```
  Render the **word as the read chip** driven by that status (mirror `Part3LiveLoop`'s chip states). **No transcript fields in the UI, ever.**
- **Disabled / read-only matrix:**
  ```
  readDisabledForController = thinking || recordingStartInFlight || requestInFlight || isRateLimited || ttsBusy || voiceBusy || reviewMode || completed
  ```
  Tap (`handleTap(entry)`): **if `recording` for this entry → `stopAndScore(entry)`** (must NOT be blocked by `readDisabledForController` mid-recording, unless `requestInFlight`/`thinking`); **else → `beginRecording(entry, readDisabledForController)`**. Branch on `recording` first (same as `Part3LiveLoop`) so a stop is never blocked by the begin-guard. The full retry → reteach → assisted loop runs inside the controller for this one word until `onWordResolved` fires (terminal).
- Instruction/Harper line from `part3.currentInstruction*` (listening/thinking/rate-limited/default) — reuse existing copy.

## Read-only on revisit (no duplicate scoring)
A resolved `real_word` on Back is **read-only**: show the stored `status` (correct/assisted/unscored), **no re-record** (tap disabled), no transcript. `completeCurrentStep`/the controller must not re-score a resolved word (the step is in `completedStepIds`; the card disables the chip in review). This is the no-duplicate-capture/scoring rule.

## New pure state helper — `completeStepById` (coachStepperState.ts)
`completeCurrentStep` completes by index; C2a needs structural-id completion (async resolve vs navigation). Add:
```ts
export function completeStepById(
  state: CoachStepperState,
  steps: CoachLessonStep[],
  stepId: string,
  outcome: StepOutcome,
): CoachStepperState
```
Contracts (test directly):
- **no-op** if `stepId` is unknown to `steps`;
- **no-op** if `stepId` already in `completedStepIds`;
- records `outcome` for that step id (into `outcomesByStepId`);
- adds `stepId` to `completedStepIds`; updates `completedPartNumbers` when that step's whole part is complete (reuse the existing internal completion logic);
- **does NOT change `currentStepIndex`**; immutable like the other transitions (fresh `Set`s).

`onWordResolved` calls `completeStepById(state, steps, mappedStepId, readScoredOutcome)`.

## Outcome union + telemetry
```ts
| { kind: "read_scored"; status: ScoredRealWordResolvedOutcome["status"]; attemptCount: number; wordId: string; assisted: boolean; unscored?: boolean }
```
**`status` must be the TERMINAL type `ScoredRealWordResolvedOutcome["status"]` = `"correct" | "assisted" | "unscored"`** — NOT the broad `ScoredRealWordStatus` (which also has transient `pending`/`retry`/`reteach`). Do not store a transient chip state as a completed outcome. (There is **no** `adult_support` terminal status — `resolve()` only emits the three above; the adult-support scaffold resolves as `"unscored"`/`assisted`.) Transcript-free; `wordId`/`unscored` carried for review identity + telemetry debugging, NO raw/normalized transcript.
`aggregateCoachPartOutcome` P3: **`realWordsComplete` = every `real_word` step resolved (`read_scored`)** — now REAL (driven by the controller). **`pseudowordsConfirmed`/`pseudowordAttemptMeta` stay EXACTLY the PR-B/C1 placeholder semantics until C2b** (nonsense unchanged; `pseudowordAttemptMeta: []`). The per-word ASR scoring evidence flows separately via `onVoiceEvent` (verbatim `VOICE_WORD_READ`/`VOICE_MISCUE_DETECTED` events). **Evidence guard (updated):** real-word reading is now **real ASR evidence**; warm-up (P1) + nonsense (P3 pseudoword) remain placeholder until C2b. **Still not full-pilot-ready until C2b** (the full Part 3 needs nonsense capture too).

## Tests
- `coachStepperState` — **`completeStepById`** unit tests: completes a mapped non-current step by id; **no-op** on unknown id; **no-op** on already-completed id; `currentStepIndex` unchanged; `completedPartNumbers` updates when the part finishes; immutable. Plus: `read_scored` outcome stored; real_word gates on resolution (not tap-through).
- `aggregateCoachPartOutcome`: P3 `realWordsComplete` true only when all `real_word` resolved **via `read_scored`** (NOTE: today's impl checks `read_marked` at line 31 — change to `read_scored`); pseudoword fields (`pseudowordsConfirmed`, `pseudowordAttemptMeta: []`) **byte-identical to PR-C1**.
- Reuse the controller's existing tests (`test:scored-realword-controller`) unchanged — the controller itself is not modified.
- A stepper-level test driving a fake controller: `onWordResolved` → step completes + `read_scored` recorded; `onBusyChange(true)` disables Back/Next; resolved word on Back is read-only (no `beginRecording`).
- **Stale/late-resolution test:** (a) fire `onWordResolved` for an unknown/wrong `entryKey` → no mutation; (b) duplicate resolution for an already-completed step → no double-record; (c) **legitimate late result** — resolve the word that initiated the request **after** the user has moved on → the **mapped step id still completes** (via `completeStepById`), `currentStepIndex` untouched. Identity is the `entryKey → stepId` ref, never the current index.
- **Auto-record-not-advance test:** `onWordResolved` records the outcome and `isNextEnabled` flips true, but **`goNext` is NOT called** — index unchanged until the user taps Next.
- **Freshness test/assertion:** `onWordResolved` resolves `stepId` and reads state via a ref (not a render-captured snapshot) — covers the long-lived-controller stale-handler risk.
- **Gates:** `test:coach-stepper-state`, `test:aggregate-coach-part-outcome`, `test:coach-lesson-steps`, `test:coach-demo-pair`, `test:spelling-flow`, `test:scored-realword-controller`, `test:voice-capture-layer2`, `test-voice-activity`, `test:presentation-copy`, `tsc`, `build`. (No `test:p4a-voice-smoke` — that's nonsense capture, C2b.)
- **Manual (DB up, real mic):** grade-7 Part 3 real words — tap records, Harper "listening," a confident read scores correct (chip→correct, **Next enabled but NOT auto-advanced** — user taps Next); a miss triggers the reteach ("Listen: …, now you try") + retry; Back to a scored word is read-only; Back/Next disabled while recording/thinking; **no transcript shown.** K-3 unchanged.
- **Manual Next-after-resolution (explicit UX contract):** after a correct read resolves, **Next becomes enabled but the card does NOT auto-advance**; the student taps Next to move to the next `real_word`. Back to the just-resolved word shows it read-only.
- **Manual telemetry check:** a per-word read emits a **`VOICE_WORD_READ`/`VOICE_MISCUE_DETECTED`** event with **`partNumber: 3`** (verbatim `eventType`/`immediateOutcome`/`durationMs`, NO transcript), distinct from the part-level **`LESSON_STEP_COMPLETED` (Part 3)** which fires **only when the whole Part 3 finishes** — the two must not be conflated.

## Scope (files)
```
components/literacy/LessonStepper.tsx          (inner RealWordControllerProvider + real_word card; voiceBusy gating; voice events partNumber:3)
lib/literacy/coachStepperState.ts              (read_scored outcome + NEW completeStepById helper)
lib/literacy/aggregateCoachPartOutcome.ts      (real P3 realWordsComplete via read_scored; pseudoword byte-identical placeholder)
scripts/test-coach-stepper-state.ts            (+ completeStepById tests), test-aggregate-coach-part-outcome.ts (+ a stepper real_word drive test)
```
**Explicitly UNCHANGED:** `StudentPracticeSession.tsx`, `Part3LiveLoop`, `useScoredRealWordController`, `scoredRealWordController`, all capture modules. STOP and report if scope must widen (warm-up/nonsense/VAD extraction = C2b).

## STOP-1
```bash
git --no-pager diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx components/literacy/useScoredRealWordController.ts lib/literacy/scoredRealWordController.ts   # untouched
git grep -n "BAND_7_8" -- components/literacy/LessonStepper.tsx || true   # ZERO
git grep -n "capturePseudowordClip\|PseudowordCaptureCoordinator\|startClipRecorder" -- components/literacy/LessonStepper.tsx || true   # ZERO (no capture in C2a)
git grep -n "rawTranscript\|normalizedTranscript\|asrTranscript" -- components/literacy/LessonStepper.tsx lib/literacy/coachStepperState.ts lib/literacy/aggregateCoachPartOutcome.ts || true   # ZERO (no transcript echo anywhere in the stepper path)
git grep -n "trainingCorpusOptedIn\|consent" -- components/literacy/LessonStepper.tsx || true   # ZERO (no consent gate in C2a)
git grep -n "completeStepById" -- lib/literacy/coachStepperState.ts components/literacy/LessonStepper.tsx   # PRESENT in both (new helper + used by onWordResolved)
git grep -n "RealWordControllerProvider" -- components/literacy/LessonStepper.tsx   # PRESENT (inner provider, NOT shell-level hook)
# Manually confirm onWordResolved does NOT call completeCurrentStep (it must use completeStepById).
```
+ the gate set above. Do NOT run `test:p4a-voice-smoke`.

## Guardrails
BAND_7_8 only; K-3/4-6 byte-identical. Reuse `useScoredRealWordController` unmodified — never duplicate scoring/ASR logic. No capture/consent (C2b). No transcript ever rendered. No raw `BAND_7_8` in components. `read_scored` is transcript-free. Not full-pilot-ready until C2b. Per-step Harper poses still PR-D (existing single `BuddyCharacter`).

## ✅ Decisions — RESOLVED (Pro review, fold complete)
1. **One shared controller** at `LessonStepper` top (always mounted), **reset by lesson identity** — CONFIRMED.
2. **`read_scored` shape** = `{status, attemptCount, wordId, assisted, unscored?}`, transcript-free — CONFIRMED.
3. **`onVoiceEvent`** forwards the controller payload **verbatim** (`VOICE_WORD_READ`/`VOICE_MISCUE_DETECTED`, `immediateOutcome`, `durationMs`) via `recordLessonPlayerEvent`, NOT wrapped in `LESSON_STEP_COMPLETED` — CONFIRMED.
4. **No capture/consent in C2a** (ASR-transcribe only; pseudoword capture = C2b) — CONFIRMED.

**Pro verdict (round 2 — lifecycle hardening):** "Ready after these patches… The key change is: complete resolved words by structural step id, not by current index, and reset only the controller boundary, not the entire shell." Folded:
1. Inner `RealWordControllerProvider` keyed by `realWordBlockKey` — resets the controller boundary only, NOT the shell.
2/3. `onWordResolved` completes by structural step id via new `completeStepById` (accepts legitimate late results, ignores unknown/duplicate), never by current index; never calls `completeCurrentStep`.
4. Callback freshness — latest-ref safe, no render-captured `currentStepIndex`/`steps`/`sessionId`/`targetCode`.
5. `read_scored.status` = `ScoredRealWordResolvedOutcome["status"]` (terminal `correct|assisted|unscored` only). **Correction to Pro:** there is no `adult_support` terminal status — verified `resolve()` only emits the three terminals.
6. Voice events forward with `partNumber: 3` + sessionId/targetCode, payload verbatim.
7. Manual smoke includes the explicit Next-after-resolution step.

Implementation audit focus: controller-provider boundary, `completeStepById` purity, callback freshness, no auto-advance, no transcript echo, no capture imports, verbatim voice-event payloads.
