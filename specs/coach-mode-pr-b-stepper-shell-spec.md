# PR-B · LessonStepper shell (first visible single-card) · Codex spec (v5, LOCKED — sendable)

**Date:** 2026-06-24 · Verified against `origin/main` (post-PR-A `e359527`). [[project_coach_mode_stepper_redesign]]; architecture: `specs/coach-mode-stepper-architecture-spec.md` (PR-B). First **visible** PR of the redesign.
**Design contracts (signed off):** `specs/mockups/coach-mode-pr-b-stepper-shell-mock.html` (shell) + `specs/mockups/coach-mode-pr-b-experience-mock.html` (target experience).
**Sequencing:** on fresh `main` after PR-A. **Prerequisite (do first):** re-read `app/student/practice/page.tsx` + `[target]/page.tsx` (both render `<StudentPracticeSession lesson presentationProfile>`), `StudentPracticeSession`'s top-level render, `BuddyCharacter`, and `lib/literacy/presentationProfile.ts`. If the mount shape differs, **STOP and report.**

## Scope boundary (READ FIRST — this is the spine of the PR)
PR-B ships the **shell**: the mode resolver, the `LessonStepper` component, the visual frame (two-zone layout, 8-part strip + task-local counter, prominent Harper using the **existing** `BuddyCharacter` single image, mode tags), stepper-owned state, the **friction-model** gated Next/Back, Back→read-only revisit, and the `aggregateCoachPartOutcome` telemetry. Cards render their **content + a generic completion control** — the **rich per-kind interactions are PR-C**, the **per-step/interaction-state Harper pose set is PR-D**, the **live read-aloud voice loop is PR-C**. K-3/BAND_4_6 keep the existing scrolling player byte-for-byte.

**What PR-B does NOT do:** no ASR/voice, no scored sentences, no pseudoword capture, no per-step pose swapping, no real spelling-tile/demo-tap interactions (those are PR-C). The experience mock shows the PR-C/D end state; PR-B is the walking skeleton that looks like its frame.

## Mode resolver + integration
- **NEW `lib/literacy/lessonPlayerMode.ts`:** `lessonPlayerModeFor(profile: PresentationProfile | undefined): "scroll" | "stepper"` — `BAND_7_8 → "stepper"`; `undefined`/`BAND_K_3`/`BAND_4_6 → "scroll"`. **The only place the `BAND_7_8` string maps to a mode** (keeps it out of components).
- **`StudentPracticeSession`** (exported entry, unchanged signature): at the top, `const mode = lessonPlayerModeFor(presentationProfile)`. If `mode === "stepper"` and `lesson.enabled`, render `<LessonStepper lesson={lesson} />`; else render the **existing** scrolling path unchanged. Branch on the **resolved mode string**, never the raw band. The regression test asserts ZERO `"BAND_7_8"` in `StudentPracticeSession.tsx`, `BuddyCharacter.tsx`, **and `LessonStepper.tsx`**.
- Both practice pages already pass `lesson` + `presentationProfile`; **no page change needed.**

## ⚠️ Pilot guard + the flip decision (surface to Jonathan)
On merge, `lessonPlayerModeFor("BAND_7_8") → "stepper"` routes real grade-7 users to the **generic-card** stepper — i.e., the 7-8 band temporarily loses the scrolling player's *real* reading interactions until PR-C. **No real 7-8 students exist yet** (only the synthetic `grade7-voice-smoke` profile; pilots are pre-launch), so flipping is low-risk and proves the integration end-to-end. **Spec guard — must appear in (a) this tracked PR-B spec and (b) a code/doc comment near `lessonPlayerModeFor` or in `LessonStepper`. Do NOT edit README in PR-B (out of scope):** *"PR-B is a shell / walking-skeleton PR. Do NOT run a real student pilot on PR-B alone. The Yohanna / real-mic pilot stays BLOCKED until PR-C restores the real read-aloud, capture, spelling, and tap-to-hear interactions."*
**DECISION (Jonathan 2026-06-25): flip live.** `lessonPlayerModeFor("BAND_7_8")` returns `"stepper"` in PR-B. **Do NOT add a preview flag in PR-B** unless a real 7-8 student account already exists in production (none does). PR-B is **not pilot-ready**; real student pilots and P4A real-mic evidence are **blocked until PR-C** restores real interactions. (A flag would add a second path that lets the real grade-7 route keep dodging the shell — the opposite of what PR-B is meant to prove.)

## State machine = PURE TESTED MODULE (`lib/literacy/coachStepperState.ts`, NEW) — not trapped in the component
Core navigation/gating logic lives in a pure, importable module; `LessonStepper.tsx` only **renders state and dispatches actions** (prevents stale-React-state bugs, makes the contracts testable — same discipline as PR-0A's controller / `spellFlow`).
```ts
type CoachStepperState = {
  currentStepIndex: number;
  completedStepIds: Set<string>;
  outcomesByStepId: Record<string, StepOutcome>;
  completedPartNumbers: Set<number>;
};
createInitialCoachStepperState(steps): CoachStepperState
completeCurrentStep(state, steps, outcome): CoachStepperState     // records outcome by step id, marks completed
goNext(state, steps): CoachStepperState                           // advances ONLY if current is completed/auto
goBack(state): CoachStepperState                                  // never jumps forward
currentStepStatus(state, steps): "active" | "completed" | "review"
isNextEnabled(state, steps): boolean                             // rule=true at entry; others require completion
isReviewMode(state, steps): boolean                              // true when revisiting a completed step via Back
isSummaryState(state, steps): boolean                            // true after the final reflect completes
```
**Two hard contracts:**
- **`rule` auto-advance still records an outcome.** `rule` has no completion control and Next is enabled at entry, but `goNext` from an un-completed `rule` step must first record `{ kind: "acknowledged" }` (so P2 telemetry keeps `listenedToRule:true` — otherwise it silently drops). No step may advance without an outcome stored.
- **Immutable transitions.** `completedStepIds`/`completedPartNumbers` are `Set`s; every transition returns **fresh `Set`/object instances**, never mutates the input state in place. Test asserts the prior state object/Sets are unchanged after each transition (reference + deep check).

The shell component holds this via a latest-state ref/`useReducer`-style adapter (no logic the test can't reach). `LessonStepper.tsx` (`components/literacy/LessonStepper.tsx`, NEW, `"use client"`) builds `const steps = buildCoachLessonSteps(lesson)` (PR-A, pure) and consumes the module.
- **Two-level progress (locked model):** top = **8-part strip**, display-only, cannot skip forward; segment for the current `partNumber` fills proportionally `((partLocalIndex + (currentDone?1:0)) / partLocalTotal)`, completed parts full. Label = `Part {partNumber} of 8 · {kid part name}`. Local counter = the per-kind task label from `taskLocalIndex/taskLocalTotal` (`Warm-up word 3 of 15` … `Question 2 of 4`; rule + passage = no counter). **Overall index/74 stays internal (telemetry), never rendered.**
- **Next** = navigation-only, enabled when the current step's completion signal is set (or stored when revisited). **Back** moves to a previous step only. **Back/Next disabled while a step is busy** (reserved for PR-C voice/TTS via an `onBusyChange` hook; in PR-B nothing sets busy).
- **In PR-B, EVERY completed step is read-only review on Back** (deterministic, safe) — a completed generic card cannot mutate its outcome on revisit; no duplicate outcomes/events. (PR-C may selectively re-enable safe replay for tap-to-hear tasks; PR-B keeps it uniform.) Real_word/nonsense_word review **must never show raw ASR text** (none exists in PR-B, but the rule stands).
- After the final `reflect` completes → emit Part-8 completion + `LESSON_COMPLETED` once → **shell-owned summary screen** (terminal; NO restart — restart telemetry isn't designed).

## Completion-gating model (Jonathan ruling — supersedes the experience mock's "listen steps are free")
**Only `rule` auto-advances** (acknowledgment-only; Next enabled immediately). **Every other kind gates** — Next is disabled until the step emits its completion signal:
```
auto-advance (Next immediately):  rule
gated by a completion signal:     warmup_word · demo_pair · real_word · nonsense_word ·
                                  power_word · sentence · spell_word · passage · reflect
```
**Crucial: "gated" ≠ "correct."** The gate is the existing task's **engagement/acknowledgement** signal, not verified correctness (matches the architecture's weak-gate rule). Per kind, the signal is: warmup/real/nonsense/sentence/passage = **read** (or listen-choice for passage); demo_pair/power_word = **heard once** (this is why PR-0C extracted `TappableItemPractice` heard-state — they are real tap-to-hear interactions, not decoration); spell_word = **checked** (wrong/empty may still proceed after the check flow); reflect = **answered/acknowledged**.

**PR-B contract:** the shell defines this completion policy and owns the state; **task renderers are generic placeholders in PR-B**, but the completion model must already treat demo_pair and power_word as **gated-by-heard, not tap-through**. PR-C replaces the placeholders with the real extracted primitives without changing the policy.

## Cards (PR-B = generic, mode-tagged; per-kind richness = PR-C)
One `CoachLessonStep` per screen. Render a **mode tag** (`Listen` / `Read aloud` / `Build it` / `Think`) + the step's content + a **generic placeholder completion control** whose label matches the kind's signal (these are temporary PR-B shell controls; PR-C replaces them with the real extracted primitives):
```
rule        → Next enabled immediately (no control)
warmup_word, real_word, nonsense_word, sentence, passage → "Mark read"
demo_pair, power_word → "Mark heard"
spell_word  → "Mark checked"
reflect     → textarea; "Mark answered" (answered/acknowledged)
```
- real_word / nonsense_word: show the word; "Mark read" sets a completed outcome — **NO voice/ASR in PR-B**; PR-C wires the read-aloud loop via the PR-0A controller, and these completed steps become **read-only review** on Back.
- passage: title + text + the Listen-first / Read-on-my-own choice is the "read" signal.
Cards reuse the **PR1 light palette + the mode-tag treatment + the two-zone Harper layout** from the experience mock; no new colors. Do NOT build the real per-kind interactions (read-aloud loop, spelling tiles, two-tap demo, scored sentence) here — that's PR-C.

## Harper (PR-B = existing BuddyCharacter, prominent; pose set = PR-D)
Render the **existing** `BuddyCharacter` (single image + its existing state labels) in a prominent Harper zone per the experience-mock layout (two-zone on wide, stacked on narrow). **Do NOT** add the per-step/interaction-state pose swapping (mic/listening/thumbs-up/teaching) — that's **PR-D**. PR-B may pass `BuddyCharacter`'s existing `state` prop where it already supports it, but introduces no new pose assets.

## Outcomes + telemetry (exact, hardcoded, tested — NOT "simplified-but-shape-correct")
**Exact generic outcome union** (PR-B; PR-C adds the real evidence-bearing outcomes):
```ts
type StepOutcome =
  | { kind: "acknowledged" }       // rule
  | { kind: "read_marked" }        // warmup / real / nonsense / sentence / passage
  | { kind: "heard_marked" }       // demo_pair / power_word
  | { kind: "checked_marked" }     // spell_word
  | { kind: "answered_marked"; text?: string };  // reflect
```
`aggregateCoachPartOutcome(partNumber, outcomes): Record<string, unknown>` (`lib/literacy/aggregateCoachPartOutcome.ts`, NEW, pure) emits the **same event names + keys** as the scrolling player, with **explicit PR-B placeholder values (NO fake evidence** — evidence arrays empty, no invented scores):
```
P1 { surface:"warmup", vadConfirmedWords: [], fallbackWords: [], totalWords }
P2 { listenedToRule:true, heardPairs }
P3 { realWordsComplete:<all real steps marked>, pseudowordsConfirmed:<all nonsense marked>, pseudowordAttemptMeta: [] }
P4 { heardWords }
P5 { listenAndEncourage:true, sentenceCount }
P6 { spellingCorrect: 0, spellingTotal }            // 0 = PLACEHOLDER (not measured), NOT a score
P7 { listenAndEncourage:true, connectedTextMode }
P8 { responseCount }
```
`LESSON_STEP_COMPLETED` **exactly once per part** (final derived step) with same `partNumber`/keys; `LESSON_COMPLETED` once at the end. **No new/renamed event types.** **Hardcode these values; unit-test `aggregateCoachPartOutcome` against an explicit outcome→payload table** — Codex must not invent values.

**⚠️ EVIDENCE GUARD (in the aggregator's doc comment AND here):** PR-B generic-card outcomes are **engagement/acknowledgement placeholders, NOT reading evidence.** Empty `vadConfirmedWords`/`pseudowordAttemptMeta` and `spellingCorrect: 0` are placeholders — `0` is "not measured," not "all wrong." **Do not use PR-B telemetry to evaluate a student's reading.** PR-C restores real ASR/VAD/capture/spelling signals.

## Copy — Option B: separate Coach-stepper copy (K-3 snapshot stays literally untouched)
The stepper is BAND_7_8-only, so its copy lives in a **NEW `lib/literacy/coachStepperCopy.ts`** (a Coach-only constant + getter), **NOT** in the shared `PresentationCopy` — this keeps `expectedK3Copy`/`expectedCoachTheme` in `test-presentation-copy.ts` byte-untouched (the spec's earlier "K-3 copy untouched" was self-contradictory with adding `PresentationCopy` keys; Option B resolves it). No inline strings anywhere; warm/level/non-babyish per the mock. Exact shape:
```ts
export const COACH_STEPPER_COPY = {
  partNames: { 1:"Warm-up", 2:"The pattern", 3:"Read the words", 4:"High-utility words", 5:"Read sentences", 6:"Spell it", 7:"Read the passage", 8:"Talk about it" },
  modeTags: { listen:"Listen", readAloud:"Read aloud", buildIt:"Build it", think:"Think" },
  actions: { markRead:"Mark read", markHeard:"Mark heard", markChecked:"Mark checked", markAnswered:"Mark answered", next:"Next", back:"Back" },
  taskLabels: {
    warmup_word: "Warm-up word {n} of {t}",
    rule: "Pattern focus",
    demo_pair: "Example {n} of {t}",
    real_word: "Word {n} of {t}",
    nonsense_word: "Nonsense word {n} of {t}",
    power_word_heart: "High-utility word {n} of {t}",   // {n}=combined index, {t}=11
    power_word_vocab: "Vocabulary word {n} of {t}",      // keep heart/vocab distinction (mock-locked)
    sentence: "Sentence {n} of {t}",
    spell_word: "Spelling word {n} of {t}",
    passage: "Passage",
    reflect: "Question {n} of {t}",
  },
  summary: { title:"Coach session complete", message:"Nice work. You moved through every part of today's reading coach session." },
  review: { completedLabel:"Completed", readOnlyLabel:"Review" },
} as const;
```
(No ellipses/comments-as-copy — every visible string is literal here. The `{n}/{t}` are interpolated from `taskLocalIndex+1`/`taskLocalTotal`; `rule` and `passage` are singletons with no counter.)
Add `scripts/test-coach-stepper-copy.ts` (snapshot of `COACH_STEPPER_COPY`) — **do NOT touch `test-presentation-copy.ts`'s K-3 assertions.**

## Resolved decisions (Jonathan 2026-06-25)
1. **Form factor:** tablet/desktop **two-zone is primary**, phone-portrait single-column is the **responsive fallback** — **ONE responsive `LessonStepper`, never two separate players.** Two-zone = side zone (Harper + coach line + 8-part strip + part title / local task count) | main zone (one task card; read-only review when backing up) + pinned Back/Next footer. Phone = strip + "Part X of 8" on top → Harper coach bubble → task card → pinned footer. **Spec line (verbatim):** *"PR-B targets tablet/desktop two-zone as the primary layout, but must remain fully usable in phone portrait as a responsive fallback. The phone layout may stack the same zones vertically; it must not introduce a separate stepper implementation."*
2. **Gating:** only `rule` auto-advances; all other kinds gate by their completion signal (see Completion-gating model); `demo_pair` + `power_word` are **gated-by-heard**, not tap-through.
3. **PR-B = frame + generic cards on a real state model;** the rich per-kind interactions are PR-C.

## Tests
- **Mode resolver:** `lessonPlayerModeFor` table (undefined/K3/4-6 → scroll; 7-8 → stepper).
- **Pure state machine** (`test-coach-stepper-state.ts`, hits `coachStepperState.ts` directly with producer steps from `buildCoachLessonSteps(buildLessonPlayerData("a_e",{presentationProfile:"BAND_7_8"}))`): `rule` starts Next-enabled; all other kinds start gated; `completeCurrentStep` stores the outcome by step id; `goNext` advances only after completion; `goBack` never jumps forward; Back into a completed step is review mode (and any completed step is read-only); final `reflect` completion enters terminal summary; **no restart action exists**; progress math (`partLocalIndex/Total`, `taskLocalIndex/Total`); **`goNext` from an un-completed `rule` records `{acknowledged}`**; **transitions are immutable** (prior state object + `completedStepIds`/`completedPartNumbers` Sets unchanged after each call).
- **Telemetry:** `aggregateCoachPartOutcome` against the **explicit hardcoded outcome→payload table** above (empty evidence arrays, `spellingCorrect:0`); one `LESSON_STEP_COMPLETED` per part + one `LESSON_COMPLETED`, same names/shape as the scroll player.
- **Coach-stepper copy snapshot** (`test-coach-stepper-copy.ts`); `test-presentation-copy.ts` runs unchanged (Option B — K-3 untouched).
- **Regression:** K-3 (`grade3.student@example.com`) + BAND_4_6 render the existing scrolling player identically; `git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx components/literacy/LessonStepper.tsx` ZERO. **`LessonStepper` must consume `lesson.presentationProfile` / resolved mode+copy+theme, never a literal `"BAND_7_8"`.**
- **Voice-invariant gates** (StudentPracticeSession.tsx changes): `test:voice-capture-layer2`, `test-voice-activity`, `test:scored-realword-controller`, `test:spelling-flow`, `test:coach-demo-pair`, `test:coach-lesson-steps`, `test:presentation-copy`, `tsc`, `build`. (These are static/unit tests on the unchanged scroll-path source + pure modules — all still pass.)
- **`test:p4a-voice-smoke` is NOT a PR-B gate.** After the flip, the synthetic grade-7 account routes to generic cards and no longer exercises real mic capture until PR-C — **expected, not a regression.** Do not run it as a PR-B gate.
- **Manual:** BAND_7_8 `/student/practice` renders the stepper (frame + progress + Harper + cards), Next gating matches the friction model, Back shows read-only review, done screen terminal. K-3 unchanged.

## Scope (files)
```
lib/literacy/lessonPlayerMode.ts            (NEW resolver)
lib/literacy/coachStepperState.ts           (NEW pure state machine)
lib/literacy/aggregateCoachPartOutcome.ts   (NEW telemetry aggregator)
lib/literacy/coachStepperCopy.ts            (NEW Coach-stepper copy — NOT in PresentationCopy)
components/literacy/LessonStepper.tsx        (NEW shell: two-zone/phone layout + generic cards + Harper zone; consumes the modules)
components/literacy/StudentPracticeSession.tsx (resolver branch at top ONLY; scroll-path body byte-unchanged)
scripts/test-lesson-player-mode.ts, test-coach-stepper-state.ts, test-aggregate-coach-part-outcome.ts, test-coach-stepper-copy.ts (+ package aliases)
```
**`presentationCopy.ts` + `test-presentation-copy.ts` are UNTOUCHED (Option B).** Plus this tracked spec + the two signed-off mocks already tracked. STOP and report if scope must widen (extracting interaction primitives = PR-C).

## STOP-1 (Codex, before any PR)
```bash
git --no-pager diff --name-only origin/main...HEAD          # only PR-B scope files + tracked spec/mocks
git --no-pager diff origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx   # branch-at-top via lessonPlayerModeFor ONLY; scroll body unchanged
git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx components/literacy/LessonStepper.tsx || true   # ZERO (LessonStepper uses resolved mode/copy/theme, never the literal)
git grep -n "Start over\|Restart" -- components/literacy/LessonStepper.tsx || true          # ZERO (terminal summary)
git grep -n "Step .* of 74\|/74" -- components/literacy/LessonStepper.tsx || true            # ZERO (no visible overall counter)
git grep -n "not pilot-ready\|walking-skeleton\|blocked until PR-C\|PR-B is a shell" -- lib/literacy/lessonPlayerMode.ts components/literacy/LessonStepper.tsx specs/coach-mode-pr-b-stepper-shell-spec.md   # pilot guard present in code + spec
```
**Manual viewport check:** tablet/desktop two-zone works · phone portrait stacks into the one responsive layout · footer stays pinned/reachable · long passage stage scrolls without hiding Back/Next · K-3 still renders the scrolling player.

## Guardrails
BAND_7_8 only; K-3/4-6 byte-identical (scroll path untouched). No raw `BAND_7_8` in components (resolver owns it). No voice/ASR/capture, no real per-kind interactions, no pose set (PR-C/D). No new colors. Existing `BuddyCharacter`. `CoachLessonStep`/`CoachStepperState` (not `LessonStep`). Mock-before-Codex satisfied (both mocks signed off).
