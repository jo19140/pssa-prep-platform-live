# Coach Mode stepper — architecture spec (v3, post-Pro×2 · design, pre-Codex)

**Date:** 2026-06-16 · Verified against `origin/main` (post-PR1). Decision basis: [[project_coach_mode_stepper_redesign]]. Visual contract: `specs/mockups/coach-mode-stepper-full-flow-mock.html`.
**Goal:** rebuild **BAND_7_8 Coach Mode** as a **one-task-per-screen stepper** (one item per screen, progress, gated Next, Back, Harper per step). **K-3/BAND_4_6 keep the current scrolling player.** Palette = PR1 light theme (grey + indigo/purple), **no new colors**.

## The freeze is BEHAVIOR-frozen, not source-frozen
Interactions keep **identical observable behavior** (ASR/transcribe/retry/reteach/scoring, capture session continuity, events, advancement). A **characterization-tested adapter / module extraction is required**. If a per-item need forces an interaction *semantic* change, STOP and report.

## Module-boundary prerequisite (the real first job)
**Verified:** only `StudentPracticeSession` is exported (`:44`); `PartRenderer` (252), `WarmupPart`, `ConceptPart`, `Part3LiveLoop` (439), `PowerWordsPart`, `TappableItemPractice` (970), `ListenForReadingAttempt` (1036), `SentenceReadingPart`, `StoryReadingPart`, `SpellingPart`, `TalkPart` are **file-local functions** — a separate `LessonStepper` cannot import them. So:
- PR-0 **extracts reusable interaction primitives/controllers into dedicated modules**, then makes the **existing scrolling player consume those same extracted primitives**. Characterization tests + voice-invariant gates must prove the scrolling path's behavior is unchanged.
- **Do NOT copy/paste interaction implementations into `LessonStepper`.** If extraction would require maintaining **two copies** of scoring/VAD/capture logic, **STOP**.

## Grounded reality (verified — spec must respect)
- **Part 3 real words = scored loop**, not VAD: `startAudioCapture` (`:7,536`) + `POST /api/voice/transcribe` (574) + retry/reteach/scoring; completion is **block-level** (`disabled={!allRealWordsComplete || !pseudowordsConfirmed}` `:916`). No per-real-word completion callback today.
- **Pseudoword capture is fire-and-forget with async session-id set:** `void capturePseudowordClip({…})` (`:1178`) `.then(r => voiceSessionIdRef.current = r.voiceSessionId)` (`:1186-7`); `voiceSessionIdRef` (`:1080`) is component-owned + reused across nonsense words. A shared ref alone is insufficient — there's a **race** if the learner advances before the prior response sets the id.
- **Demo pair is ONE tappable item** (`utterance: \`${before}. ${after}.\`` `:400`); `DemoCard` (`:1620`) display-only. Two-control "both heard" is a **new** interaction, not behavior-identical extraction.
- **Weak completion signals:** sentence/story-read-on-own/spelling(Check even if wrong `:1315`)/Part-8(enabled with no entry) complete without verifying reading/correctness. Wording: *Next is gated until the existing task emits its current completion signal; for unscored/listen-and-encourage/open-response tasks that records engagement/acknowledgement, not verified correctness.* Do NOT strengthen these gates here.
- **`model LessonStep` exists** (schema.prisma:1193) → name the type **`CoachLessonStep`**.
- **No-raw-band regression:** tests assert ZERO `BAND_7_8` in `StudentPracticeSession.tsx`/`BuddyCharacter.tsx` → use `lessonPlayerModeFor(profile): "scroll"|"stepper"`, never a raw band branch.
- **Harper poses not grounded** (`BuddyCharacter` = one image + state labels) → PR-C/D only; PR-A/B use existing `BuddyCharacter`.
- **Passage Stop** = TTS-cancellation interaction change → separate later PR.

## Completion-button ownership (conservative first contract)
Every task already renders its own completion control (`TappableItemPractice`, `SentenceReadingPart` Done, `StoryReadingPart` Done, `SpellingPart` Check, `TalkPart`, `ListenForReadingAttempt`). In the **first stepper release**: task-local completion controls stay unchanged; **shell Next is navigation-only**, enabled after the task fires `onComplete`. (Two sequential actions — complete, then Next — is acceptable v1.) Replacing/hiding task Done/Check so a single pinned Continue does both = new imperative completion API → **deferred** interaction-polish PR. Otherwise PR-0 silently expands to every component.

## The pure step model
`buildCoachLessonSteps(lesson): CoachLessonStep[]` (`lib/literacy/coachLessonSteps.ts`) — a discriminated union, pure from `lesson` (parts sorted by `partNumber` or assert pre-ordered):
```ts
type CoachLessonStep =
  | { kind: "warmup_word"; id; payload: { word; sourceIndex } }
  | { kind: "rule"; id; payload: { statement } }
  | { kind: "demo_pair"; id; payload: { before; after; pairIndex } }
  | { kind: "real_word"; id; payload: { word; lineNumber; role; wordIndex } }
  | { kind: "nonsense_word"; id; payload: { word; wordIndex } }
  | { kind: "power_word"; id; payload: { word; group: "heart"|"vocab"; index } }
  | { kind: "sentence"; id; payload: { text; index } }
  | { kind: "spell_word"; id; payload: { word; index } }
  | { kind: "passage"; id; payload: { title; text; listenFirstAllowed; readOnOwnAllowed } }
  | { kind: "reflect"; id; payload: { question; questionType; index } };
```
- **No `complete` step.** After the final `reflect` completes → emit Part-8 completion + `LESSON_COMPLETED` once → enter a **shell-owned summary state** (the done screen is shell UI, not a lesson step). Avoids an artificial 9th task / unclear Part-8 telemetry.
- Part-3 order via stable roles: `target_real_words`, `contrastive_target_vs_review`, `cumulative_review` (real), then `target_pseudowords` (nonsense).
- IDs = structural coordinates (`part3:line2:word4`, `part4:heart:1`, `part8:question:3`), not text. Preserve order + duplicates; **fail loudly** on missing required arrays; carry `partNumber` + part-local `index`/`total`.

## Stepper shell (BAND_7_8 only)
`LessonStepper` renders one `CoachLessonStep`, with shell-owned `CoachStepperState { currentStepIndex; completedStepIds:Set; outcomesByStepId; completedPartNumbers:Set }`.
- **Two-level progress:** top = **8-part strip (display-only, cannot skip forward)**; local label "Word 3 of 17"/"Sentence 2 of 6".
- **Next** = navigation-only, enabled on the task's `onComplete` (or stored completion when revisited). **Back** moves only to a previous step. **Back/Next disabled while busy** (recording/listening/scoring/TTS) via an `onBusyChange` adapter. **Rule step** = acknowledgment-only (Next may enable immediately).
- **Back into a completed scored/captured step = static read-only review** (stored outcome, NOT the live interaction) → no duplicate ASR/capture/segment/retry-reset; no "practice again" in v1. **Read-only review must never display raw ASR transcript text** (preserve the no-transcript-echo rule).
- Harper = existing `BuddyCharacter` in PR-A/B.

## Telemetry contract + part-outcome aggregator
Microstep completion = local state, NOT events. Implement and unit-test a pure **`aggregateCoachPartOutcome(partNumber, outcomes)`** that reconstructs **today's exact part-level `extra` payloads** from microstep outcomes, e.g.:
```
P1 { surface:"warmup", vadConfirmedWords, fallbackWords, totalWords }
P2 { listenedToRule:true, heardPairs }
P3 { realWordsComplete, pseudowordsConfirmed, pseudowordAttemptMeta }
P4 { heardWords }   P5 { listenAndEncourage:true, sentenceCount }
P6 { spellingCorrect, spellingTotal }   P7 { listenAndEncourage:true, connectedTextMode }
P8 { responseCount }
```
Emit `LESSON_STEP_COMPLETED` **exactly once per part** (final derived step of that part) with the **same `partNumber`, existing key names, and aggregate values** as the scrolling player; `LESSON_COMPLETED` once at the end; **no new/renamed event types**.

## Mode boundary
`lessonPlayerModeFor(profile)` (undefined/`BAND_K_3`/`BAND_4_6` → `scroll`; `BAND_7_8` → `stepper`). Branch on resolved mode, never raw band. `LessonStepper` is a **separate top-level component** (cleanest K-3 boundary), selected via the resolver.

## Freeze proof / acceptance
- Characterization tests of current Part-3 / capture / demo behavior BEFORE extraction; adapters keep them green.
- `npm run test:voice-capture-layer2` + `npx tsx scripts/test-voice-activity.ts` pass unchanged (add to gate set).
- **Pseudoword coordinator test (deferred-promise):** two immediate one-word captures → **one reused VoiceSession id → two `LabeledVoiceSegment`s** (serialized; no second send until prior response supplies/reconfirms the id).
- **Producer-path step test:** `buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" })` → assert enabled → feed the returned lesson into `buildCoachLessonSteps` → assert exact ordered kinds, structural IDs, roles, counts, duplicate preservation, part-local indices. (NOT a hand-built lesson object.)
- After a stepper nonsense-word capture, `npm run test:p4a-voice-smoke` passes (real-mic path intact).
- K-3/BAND_4_6 render the existing player identically (regression). COACH_THEME palette reused, no color edits.

## PR decomposition (PR-0 split; start with PR-0A only)
- **PR-0A** — extract the **scored real-word attempt primitive**; expose **`onWordResolved`**/`onBusyChange` (per-word terminal callback; NOT `onComplete`); the **existing scrolling Part 3 consumes it**; behavior byte-identical (characterization + voice invariants + `test:presentation-copy`; **P4A is NOT a PR-0A gate — deferred to PR-0B/PR-C** where pseudoword capture is affected). No stepper. **Authoritative detail: `specs/coach-mode-pr0a-scored-realword-controller-spec.md` supersedes this line.**
- **PR-0B** — external **`PseudowordCaptureCoordinator`** (owns `voiceSessionId`, in-flight promise, busy state; **serialized** captures); existing scrolling pseudoword block consumes it; deferred-promise test.
- **PR-0C** — **additive** stepper-only **two-word demo-pair primitive** (reuse `TappableItemPractice` with two items); NOT activated in the scrolling player.
- **PR-A** — pure producer-driven `CoachLessonStep` model + order/count tests; no player activation.
- **PR-B** — shell + `lessonPlayerModeFor` + 8-part/local progress + stepper-owned state + Back/read-only review + `aggregateCoachPartOutcome` telemetry; K-3 on existing player.
- **PR-C** — per-kind wiring (non-voice first, then real-word ASR + nonsense capture via PR-0 primitives); voice invariants + P4A smoke.
- **PR-D** — polish: verified Harper pose assets, transitions, summary; separate TTS-Stop only if approved.

## Open-question answers (locked)
1. Warm-up/power words: one item per screen (locked) + part progress + local count.
2. Completion signals: wrappers suffice for warm-up/power/sentence/spell/story/reflect; NOT for Part-3 real words, pseudoword continuity, two-control demo → PR-0 adapters.
3. Back: completed scored/captured = read-only review (no transcript echo); no auto-redo.
4. Reload persistence: deferred (refresh may restart in v1).
5. Band boundary: separate `LessonStepper` via `lessonPlayerModeFor`.

## Out of scope (initial stepper)
Passage Stop (separate TTS-cancellation PR); strengthening weak completion gates; single-button combined complete+navigate; reload persistence; per-step Harper poses before PR-C; any K-3/BAND_4_6 change.

## Guardrails
BAND_7_8 only; K-3/BAND_4_6 byte-identical. Behavior-frozen (adapters only with characterization proof; never change ASR/capture/scoring/consent semantics; never duplicate that logic). No new colors. No raw `BAND_7_8` in components. `CoachLessonStep` (not `LessonStep`). No `complete` step kind. If any per-item need forces a semantic change to a frozen interaction, STOP and report.
