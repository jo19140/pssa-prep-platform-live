# PR-C1 · Stepper non-voice card wiring · Codex spec (v4, LOCKED — sendable, post-review pass 3)

**Date:** 2026-06-26 · Verified against `origin/main` (post-PR-B `c169b33`). [[project_coach_mode_stepper_redesign]]; target = the signed-off experience mock. **First slice of PR-C** (the architecture's "non-voice first").
**Sequencing:** on fresh `main` after PR-B. **Prerequisite (do first):** re-read `LessonStepper.tsx` (the generic `StepCard`/`CompletionControl`/`CardContent`), `components/literacy/TappableItemPractice.tsx`, `lib/literacy/tappableItem.ts` (`buildDemoPairItems`), `lib/literacy/spellingFlow.ts`, and how `getTtsProvider().speak(text)` is used in `GeneratedLessonPlayer` (`StudentPracticeSession.tsx:113`). If shapes differ, **STOP and report.**

## Scope — wire ONLY the non-voice kinds with real interactions
**Replace the generic "Mark …" card for:** `demo_pair`, `power_word`, `spell_word`, `passage`, `reflect`. **Leave generic (still "Mark read", deferred to PR-C2):** `warmup_word`, `real_word`, `nonsense_word`, `sentence` (all voice/VAD/ASR — warm-up confirmed as VAD read-aloud, Jonathan 2026-06-26). `rule` unchanged (Next-immediate). The shell, state machine, progress, navigation, read-only review, and telemetry **event pipeline** from PR-B are unchanged — only the card *interactions* and the per-part *aggregate values* for these kinds become real.

## TTS reuse + busy handling (finally uses PR-B's reserved busy path)
`speak` in `GeneratedLessonPlayer` wraps the importable `getTtsProvider().speak(text)` + buddy state. **`LessonStepper` owns `ttsBusy`:** `speak(text)` sets `ttsBusy = true` + Buddy "speaking", `await getTtsProvider().speak(text)` (try/catch — TTS may be unavailable), then resets both in `finally`. Pass `speak` as `onSpeak`.
- **Back/Next are disabled while `ttsBusy`** (PR-B reserved this — now wired).
- **No overlapping TTS:** a second `speak` while `ttsBusy` is ignored / the triggering control disabled.
- **No Stop/cancel button in PR-C1.**
- Critical with `TappableItemPractice`: a tap must not let Next enable while audio is still playing — `onAllHeard` only fires after the final `onSpeak` settles (see extension), and Next is `ttsBusy`-disabled regardless. (Import `getTtsProvider` from where `GeneratedLessonPlayer` does — confirm at the re-read gate.)
- **Required shape — guard on a ref, not React state alone** (state isn't synchronous enough to block a double-call):
```ts
const ttsBusyRef = useRef(false);
async function speak(text: string) {
  if (ttsBusyRef.current) return;
  ttsBusyRef.current = true; setTtsBusy(true); setBuddyState("speaking");
  try { await getTtsProvider().speak(text); } catch { /* visible text is source of truth */ }
  finally { ttsBusyRef.current = false; setTtsBusy(false); setBuddyState("idle"); }
}
```

## `TappableItemPractice` additive extension (behavior-frozen; discriminated props)
Use a **discriminated prop shape** so the hidden-button stepper path has no dead `completeLabel`/`onComplete` props and the scrolling path is unchanged:
```ts
type TappableItemPracticeProps = { items; copy; theme?; onSpeak; interactionDisabled?: boolean } & (
  | { hideCompleteButton?: false; completeLabel: string; completeDisabledLabel: string; onComplete: (heardCount: number) => void; onAllHeard?: never }
  | { hideCompleteButton: true; onAllHeard: () => void; completeLabel?: never; completeDisabledLabel?: never; onComplete?: never }
);
```
**Contracts:**
- Default call sites (`ConceptPart`/`PowerWordsPart`) hit the first variant → behavior **byte-identical**.
- `hideCompleteButton: true` → internal complete button hidden; heard counter may stay; `onComplete` not used.
- **`onAllHeard` fires exactly once per item-id set, only after (a) all item ids heard AND (b) the final newly-heard item's `onSpeak` promise has settled.**
- **Synchronous double-tap guard (stepper path):** keep an internal **in-flight ref** — if `interactionDisabled` OR the in-flight guard is active, `hearItem` returns **before** `setHeard`/`onSpeak`. React state isn't synchronous enough to be the only overlap guard; the ref is. Default scrolling behavior unchanged.
- Re-tapping a heard item replays only if `interactionDisabled` is false and not in-flight; never re-fires `onAllHeard`. `items` change resets the one-shot guard.
- **Use refs (not only React state):** an **in-flight TTS ref** and a **fired-`onAllHeard` key ref**. The key = `itemSetKey` computed from the **ordered item ids**; when `itemSetKey` changes, reset heard state + the in-flight ref + the fired key.
**Test:** factor the heard-state transition into a tiny **pure helper** + unit-test it (all-heard detection, one-shot, items-change reset). A pure helper can't prove await ordering, so **add a component-level source/diff assertion (or test) that `onAllHeard` is called AFTER `await onSpeak`, not before.** Assert the component uses the helper. `test:coach-demo-pair` + invariants stay green.

## Per-kind wiring (in `LessonStepper`'s card layer)
- **demo_pair** → `buildDemoPairItems({ before, after, pairIndex }, { beforeHelper, afterHelper })` (PR-0C, two separately-voiced items) → `<TappableItemPractice items={pair} onSpeak={speak} hideCompleteButton onAllHeard={() => complete({ kind: "heard_marked" })} />`. Delivers the mock's two-tap "cap → cape, both voiced" (the visible Q2 fix). `beforeHelper`/`afterHelper` from `coachStepperCopy` (add keys).
- **power_word** → one `TappableItem` (`label: word`, `helper`: heart/vocab label, `utterance: "${word}."`) → `TappableItemPractice` (1 item, `hideCompleteButton`, `onAllHeard` → `heard_marked`). Single tap hears + marks.
- **spell_word** → reuse the **`spellingFlow` reducer** (`lib/literacy/spellingFlow.ts`) for the single word `words = [step.payload.word]`: Hear button (`speak(word)`), letter tiles from a **new exported `buildSpellingLetterTiles(word)`** (below), the two-press flow (Check reveals correct/retry, Done completes), feedback via `spellingFeedbackKind`. On the flow's completion effect → `{ kind: "checked_marked", correct: completion.spellingCorrect === 1 }`. **The card MUST use the same latest-state-ref dispatch shape as `SpellingPart`** (the transition returns a completion effect synchronously): read `flowStateRef.current`, update the ref before `setState`, fire completion only when the transition returns one — **no plain `useReducer` that hides the completion, no render-captured state, no Effect for completion.** Reuse the *reducer*, not `SpellingPart`'s JSX (`SpellingPart` stays file-local + unedited).
  - **NEW exported `buildSpellingLetterTiles(word: string): string[]` in `spellingFlow.ts`**, replicating the current file-local `letterTiles` (`StudentPracticeSession.tsx:1352`) **exactly**: unique lowercase a–z letters of the target + extras `["m","d","r","n"]`, sorted, non-letters stripped, duplicates removed. Tests: `cape` → `a,c,d,e,m,n,p,r`; non-letters stripped; duplicates removed. Do NOT edit `SpellingPart`'s file-local copy in PR-C1.
- **passage** → preserve the **`StoryReadingPart` policy** (verified `:1127`/`:1151`/Done `disabled={mode !== "reading" && !finished}`). Local card state `mode: "idle" | "listening-first" | "reading"`, `listenedOnce: boolean`:
  - **Listen first** — disabled while `ttsBusy`/review; `mode="listening-first"`; `await speak(text)`; `listenedOnce=true`; returns `mode="idle"`; **does NOT complete.**
  - **Read on my own** — disabled while `ttsBusy`/review; `mode="reading"`.
  - **Done reading** — enabled **only when `mode==="reading"`**; completes `{ kind:"read_marked", mode:"read_on_own" }`.
  - **Completed/review** — shows the stored `read_on_own` completion; all buttons disabled.
- **reflect** → editable `<textarea>` (remove `readOnly`); **"Mark answered" enabled when `text.trim().length > 0`** → `complete({ kind: "answered_marked", text })`. **Store the original (untrimmed) textarea string in the local `StepOutcome` for read-only review; `aggregateCoachPartOutcome` ignores it and emits only `responseCount`** — no free-response content in `extra`.

## Outcome union + aggregate table (locked)
```ts
type StepOutcome =
  | { kind: "acknowledged" }
  | { kind: "read_marked"; mode?: "read_on_own" }
  | { kind: "heard_marked" }
  | { kind: "checked_marked"; correct: boolean }
  | { kind: "answered_marked"; text?: string };
```
`aggregateCoachPartOutcome`:
```
P2 heardPairs    = real count of completed demo_pair heard_marked
P4 heardWords    = real count of completed power_word heard_marked
P6 spellingCorrect = count of checked_marked.correct === true ; spellingTotal = spell_word count   (REAL evidence)
P7 connectedTextMode = stored read_marked.mode when present (expected "read_on_own" after Done reading)
P8 responseCount = count of answered_marked              (NO text in extra)
P1 / P3 / P5     = unchanged PR-B placeholders (warm-up VAD, real/nonsense ASR+capture, sentence) until C2
```
**Evidence guard (updated):** P2/P4/P8 = engagement; **P6 = real spelling correctness evidence**; P7 = read-on-own engagement (not reading correctness); **P1/P3/P5 remain placeholder/fake until PR-C2.** Still **not pilot-ready** until C2 restores the voice evidence.

## Review = read-only (PR-B rule preserved)
Every completed step stays **read-only on Back** (no outcome mutation): demo/power tap controls disabled (`interactionDisabled`), spelling controls disabled, reflect text shown read-only, passage buttons disabled. Safe replay for tap-to-hear is a later polish PR. (PR-B already disables completion controls for completed/review steps; C1 keeps that.)
- **State-level guards (not just disabled props):** the spell card's `dispatchFlow` **no-ops when completed/review** (prevents keyboard/input edits if a `disabled` prop is missed on one element); the reflect textarea is rendered `readOnly` in review.

## Exact copy keys (literal in `coachStepperCopy.ts`, NOT `presentationCopy.ts`)
```ts
demoPair:  { beforeHelper: "Before", afterHelper: "After silent e" },
powerWord: { heartHelper: "High-utility word", vocabHelper: "Vocabulary word" },
spelling:  { hearButton: "Hear word", checkButton: "Check", doneButton: "Done", nextButton: "Next word", clearButton: "Clear", correctFeedback: "That matches.", retryFeedback: "Keep building the word you hear." },
passage:   { listenFirstButton: "Listen first", listeningButton: "Listening…", readOnOwnButton: "Read on my own", doneReadingButton: "Done reading" },
reflect:   { placeholder: "Type a quick note.", markAnswered: "Mark answered" },
```
(Wording is yours to adjust, but literal here — no Codex-invented strings. K-3 snapshot stays untouched since these live in `coachStepperCopy`.)

## Tests
- `TappableItemPractice`: `onAllHeard` fires once when all items heard, not before; `hideCompleteButton` hides the control; default (no new props) byte-identical behavior.
- `buildSpellingLetterTiles`: `cape` → `a,c,d,e,m,n,p,r`; non-letters stripped; duplicates removed.
- `aggregateCoachPartOutcome`: extend the table — P6 `spellingCorrect` reflects `checked_marked.correct` counts; P2/P4/P8 reflect real heard/answered counts. P1/P3/P5/P7 still placeholder shape.
- `coachStepperState`: `checked_marked` outcome stored; gating unchanged (demo/power/spell/reflect still gate-by-completion).
- **Voice-invariant gates** (StudentPracticeSession untouched here, but TappableItemPractice + LessonStepper change): `test:coach-demo-pair`, `test:coach-lesson-steps`, `test:coach-stepper-state`, `test:aggregate-coach-part-outcome`, `test:coach-stepper-copy`, `test:presentation-copy`, `test:spelling-flow`, `test:scored-realword-controller`, `test:voice-capture-layer2`, `test-voice-activity`, `tsc`, `build`.
- **Manual (DB up):** grade-7 `/student/practice` — Part 2 demo voices both words on tap and gates on both heard; Part 4 power word hears + advances; Part 6 spelling tiles + Check work and a correct spelling marks correct; Part 7 "Listen first" reads the passage aloud; Part 8 textarea is typable and "Mark answered" gates. Parts 1/3/5 still show generic "Mark read". K-3 unchanged.

## Scope (files)
```
components/literacy/TappableItemPractice.tsx     (additive onAllHeard + hideCompleteButton + interactionDisabled; default behavior unchanged)
components/literacy/LessonStepper.tsx             (wire demo/power/spell/passage/reflect cards; speak+ttsBusy via getTtsProvider)
lib/literacy/coachStepperState.ts                 (StepOutcome: read_marked.mode + checked_marked.correct)
lib/literacy/aggregateCoachPartOutcome.ts         (real P2/P4/P6/P8 + P7 mode)
lib/literacy/coachStepperCopy.ts                  (the exact new copy keys above)
lib/literacy/spellingFlow.ts                      (NEW exported buildSpellingLetterTiles — verbatim letterTiles semantics)
scripts/test-coach-demo-pair.ts, test-spelling-flow.ts, test-aggregate-coach-part-outcome.ts, test-coach-stepper-state.ts, test-coach-stepper-copy.ts  (extend; package.json only if an alias must change)
```
Plus this tracked spec. **Explicitly UNCHANGED:** `StudentPracticeSession.tsx`, `SpellingPart`, `ConceptPart`, `PowerWordsPart`, all voice/capture modules + routes. STOP and report if scope must widen (real_word/nonsense/sentence/warm-up wiring = PR-C2).

## STOP-1 (Codex, before any PR)
```bash
git --no-pager diff --name-only origin/main...HEAD
git --no-pager diff origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx   # EMPTY
git diff --exit-code origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx   # MUST exit 0 = untouched (hard machine check; SpellingPart/ConceptPart/PowerWordsPart are file-local inside it, so this covers all three)
git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx components/literacy/LessonStepper.tsx || true   # ZERO
git grep -n "capturePseudowordClip\|startVoiceActivity\|/api/voice/transcribe" -- components/literacy/LessonStepper.tsx components/literacy/TappableItemPractice.tsx || true   # ZERO (no voice in C1)
git grep -n "\.text\b\|text:" -- lib/literacy/aggregateCoachPartOutcome.ts || true   # ZERO — aggregator counts answered_marked but emits responseCount only, never the text (the unit test asserts P8 === { responseCount: N })
```
Gates:
```bash
npm run test:coach-demo-pair
npm run test:coach-lesson-steps
npm run test:coach-stepper-state
npm run test:aggregate-coach-part-outcome
npm run test:coach-stepper-copy
npm run test:presentation-copy
npm run test:spelling-flow
npm run test:scored-realword-controller
npm run test:voice-capture-layer2
npx tsx scripts/test-voice-activity.ts
npx tsc --noEmit
npm run build
```
**`test:p4a-voice-smoke` is NOT a C1 gate** (voice/capture is still generic until C2).

## Guardrails
BAND_7_8 only; K-3/4-6 byte-identical. Reuse extracted primitives — never duplicate tap/heard/speak or spelling logic. `TappableItemPractice` extension is additive + behavior-frozen for the scrolling player. No raw `BAND_7_8` in components (resolver/profile only). No voice/ASR/capture here (PR-C2). Still not pilot-ready. Per-step Harper poses remain PR-D (PR-C1 keeps the existing single `BuddyCharacter`).
