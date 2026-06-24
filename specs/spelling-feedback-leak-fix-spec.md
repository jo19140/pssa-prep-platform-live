# SpellingPart feedback-leak fix · Codex spec (v2, post-Jonathan review)

**Date:** 2026-06-24 · Verified against `origin/main`. Component: `SpellingPart` in `components/literacy/StudentPracticeSession.tsx` (~lines 1492-1557). Copy: `lib/literacy/presentationCopy.ts`.
**Sequencing:** land **AFTER PR-0A merges.** Both edit `StudentPracticeSession.tsx`; sending this first forces the behavior-sensitive PR-0A branch through another rebase + audit. Do not start until PR-0A is on `origin/main`.
**Prerequisite (do first):** after PR-0A lands, **re-read `SpellingPart` on current `origin/main` before coding.** If its state/handlers differ from the grounded description below, **STOP and report** — do not code against this snapshot.
**Bug (real):** correct/retry feedback renders **live as the student taps tiles**, before "Check spelling" is pressed — the answer is affirmed before the check, defeating the assessment. Affects **all bands** (shared scrolling player). BAND_7_8 also gets a correctly-built spell card later in the stepper (PR-C); this fixes K-3/4-6.

## Current behavior (the leak)
`isCorrect = normalize(answer) === normalize(target)` is computed live, and the feedback block renders whenever `answer` is non-empty using that **live** `isCorrect`. `check()` records the result and **immediately advances** on every press. So simply hiding the feedback would advance with no result shown — the flow must change, not just visibility.

## Required behavior — two-step reveal (one word at a time)
1. While the student builds the answer (typing or tapping tiles): **no correctness feedback at all.**
2. First "Check spelling" press → **reveal** the result for the current word and record it; **do NOT advance.** Button relabels to **Next word** (or **Done** on the last word).
3. Second press (after reveal) → advance to the next word (clear answer + hide feedback) or, on the last word, fire `onComplete`.
4. If the student **edits** the answer after a reveal (input change / tile tap / Clear): **hide the revealed result** so it must be re-checked (no stale "That matches." persisting after an edit).

## Copy keys — REQUIRED (confirmed missing today)
`PresentationCopy.spelling` has `checkButton` only — no next/done label. Add to the type and both themes.

Type (`PresentationCopy.spelling`): add
```ts
nextButton: string;
doneButton: string;
```
`K3_COPY.spelling`:
```ts
nextButton: "Next word",
doneButton: "Done spelling",
```
Coach copy (`...K3_COPY.spelling` spread) — inherit `nextButton: "Next word"`, but **explicitly override**:
```ts
doneButton: "Finish spelling",
```
`scripts/test-presentation-copy.ts`: extend `expectedK3Copy.spelling` with the two new keys (`"Next word"`, `"Done spelling"`); add/extend Coach spelling assertions asserting `nextButton === "Next word"` and `doneButton === "Finish spelling"`. Keep all other copy assertions untouched.

## State model — one unified flow state in `spellingFlow.ts`
**Factor ALL transition + display logic into a pure, exported module `lib/literacy/spellingFlow.ts`** that `SpellingPart` consumes. The component holds **only** the unified flow state below — there is **no** separate `revealedResult` / `isCorrect` / `answer` component `useState`. Creating duplicate state alongside `SpellingFlowState` is a spec violation. The component holds no transition or feedback-decision logic the test can't reach — the regression test exercises the **real** helper, not a hand-built mirror.

`spellingFlow.ts` also exports **`createInitialSpellingFlowState()`** (the seed). It **must NOT import `presentationCopy`** — selectors return copy *keys* only; the actual K-3/Coach label values are asserted in `test-presentation-copy.ts`, while `test-spelling-flow.ts` asserts only that the selector returns `"checkButton"` / `"nextButton"` / `"doneButton"`.

Unified flow state:
```ts
type SpellingFlowState = {
  index: number;
  answer: string;
  results: Record<string, boolean>;   // keyed by TARGET TEXT (see below)
  revealedResult: boolean | null;     // null = editing/unchecked
  completed: boolean;
};
```
Actions — **all** mutations belong to the helper, including answer/letter assembly:
```ts
type SpellingFlowAction =
  | { type: "set_answer"; answer: string }   // input onChange
  | { type: "append_letter"; letter: string } // tile tap (helper does answer + letter)
  | { type: "clear" }                          // Clear button
  | { type: "primary" };                       // Check / Next / Done button
```
Pure transition returning an **optional completion effect** — it must **NOT** call `onComplete`:
```ts
transitionSpellingFlow(
  state: SpellingFlowState,
  action: SpellingFlowAction,
  context,                // { words: string[] }  (provides target + isLastWord + total)
): { state: SpellingFlowState; completion?: { spellingCorrect: number; spellingTotal: number } };
```
- The component applies the returned `state` and calls `onComplete(completion)` **only when `completion` is present.**
- `completed: true` (set when the last-word advance produces a completion) makes a subsequent `primary` a no-op returning **no completion** → **`onComplete` cannot fire twice.**

**Dispatch via a latest-state ref adapter (NOT plain `useReducer`).** A normal `useReducer` dispatch returns `void`, so the component can't synchronously read the transition's `completion` effect — which would force a forbidden Effect, a duplicated transition, or stale render state. Use a ref-backed adapter so every dispatch reduces from the latest state and the completion is handled inline:
```ts
const [flowState, setFlowState] = useState(createInitialSpellingFlowState); // lazy init (pass the fn, don't call it)
const flowStateRef = useRef(flowState);

const dispatchFlow = useCallback((action: SpellingFlowAction) => {
  const result = transitionSpellingFlow(flowStateRef.current, action, { words });
  flowStateRef.current = result.state;   // update ref BEFORE onComplete
  setFlowState(result.state);
  if (result.completion) onComplete(result.completion);
}, [words, onComplete]);
```
Required behavior (covered by the regression where state-machine-observable, and by this adapter shape):
- `flowStateRef` is updated **before** `onComplete`.
- `completed: true` is **fully terminal** — `set_answer`, `append_letter`, `clear`, AND `primary` are all no-ops returning no completion once `completed`.
- two final `primary` dispatches invoke `onComplete` **once**.
- rapid `append_letter` dispatches **do not lose letters** (each reduces from `flowStateRef.current`, never render-captured `flowState`).

The component maps DOM events to actions only; it may **not** compute any of: `answer + letter`, correctness, revealed-feedback kind, or advance/completion decisions. That is what makes "all transition logic lives in `spellingFlow.ts`" actually true.

Centralize display in tested pure selectors (so the UI cannot branch on live `isCorrect`):
```ts
spellingFeedbackKind(state): "correct" | "retry" | null     // from revealedResult, never live
spellingPrimaryActionKey(state, isLastWord): "checkButton" | "nextButton" | "doneButton"
```
`SpellingPart` renders feedback from `spellingFeedbackKind` and the button label from `copy.spelling[spellingPrimaryActionKey(...)]` — no inline correctness checks.

**Result-key preservation:** `results` stays **keyed by target text** (`results[target]`), exactly as today. Do **NOT** switch to index-based keys in this bug fix — that would change duplicate-word scoring semantics and belongs in a separate PR.

**Normalization — preserve exact semantics.** Correctness moves into `spellingFlow.ts`, which exports `normalizeSpellingAnswer(value: string)` replicating the **current** file-local `normalize` (verified at `StudentPracticeSession.tsx:1414`) byte-for-byte:
```ts
value.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ")
```
Compare `normalizeSpellingAnswer(answer) === normalizeSpellingAnswer(target)`. Do **not** compare raw strings or invent a new normalization policy — that would silently change which spellings count as correct. Test cases: `" Cake! "` matches `"cake"`; case-insensitive; surrounding whitespace ignored; punctuation removed; repeated spaces collapse.

**Orphaned `normalize` (verified SpellingPart-only):** the file-local `normalize` (`StudentPracticeSession.tsx:1414`) is called **only** by SpellingPart (`:1259`, no other call sites in the file). After moving correctness into `spellingFlow`, **remove the orphaned file-local `normalize`** and import `normalizeSpellingAnswer`. This is the single permitted `StudentPracticeSession.tsx` edit outside the `SpellingPart` body — the diff-scope check below allows it.

Wiring (component dispatches actions; the reducer owns every decision):
- Button label = `copy.spelling[spellingPrimaryActionKey(state, isLastWord)]`; feedback = `spellingFeedbackKind(state)`.
- input `onChange` → `dispatch({ type: "set_answer", answer })`; tile tap → `dispatch({ type: "append_letter", letter })`; Clear → `dispatch({ type: "clear" })`. Each reduces `revealedResult` to `null`.
- Primary button → `dispatch({ type: "primary" })`; the reducer wrapper applies next state and, when the transition returns `completion`, invokes `onComplete(completion)` exactly once. (See completion handling note in Acceptance — do **not** route completion through an unguarded React Effect.)
  - First `primary` (revealedResult `null`): records `results[target]`, sets `revealedResult`, index unchanged, no completion.
  - `primary`, revealed, non-last: advances one word (`answer=""`, `revealedResult=null`).
  - `primary`, revealed, last word: returns `completion` once and sets `completed:true`; any further `primary` returns no completion.

## Scoring semantics — intentional change (state explicitly)
Today there is exactly one check per word (check records, then advances). The reveal→edit→recheck flow lets a later checked answer replace an earlier one. So:
> `spellingCorrect`/`spellingTotal` **key names and shape remain unchanged.** For each word, the counted result is the **most recent revealed check before advancing** (not the first). This intentionally allows correction and re-checking.

Record into `results[target]` on **every** reveal press (overwrites), so the final `onComplete` tally reflects the latest revealed result per word.

## Guardrails
- **Non-blocking gate preserved:** an **empty answer remains checkable** (reveals `incorrect`), and the student **may still proceed** after a revealed incorrect result — advancement is never blocked on correctness (matches today's "Check even if wrong"). This fix changes *when/which* feedback shows, not *whether* you can advance.
- New visible strings live **only** in `presentationCopy.ts` behind the new keys — no inline hardcoded labels.
- No voice/scoring/capture logic touched. In `StudentPracticeSession.tsx`, the diff changes **only `SpellingPart`** (now imports + consumes `spellingFlow`) **plus the removal of the orphaned file-local `normalize`** (verified SpellingPart-only) — no Part 3 / controller / pseudoword / other-component edits.

## Scope (files)
```
components/literacy/StudentPracticeSession.tsx   (SpellingPart only — consume spellingFlow)
lib/literacy/presentationCopy.ts                 (spelling type + K3 nextButton/doneButton + Coach doneButton override)
lib/literacy/spellingFlow.ts                     (NEW — pure transition + selectors)
scripts/test-presentation-copy.ts                (extend K3 + Coach spelling assertions)
scripts/test-spelling-flow.ts                    (NEW — flow regression)
package.json                                     (add "test:spelling-flow" alias ONLY)
```
No other files. Anything else → STOP and report.

**Diff scope distinction (spec on its own branch):** the **implementation diff** is the six files above. The **full PR diff against `origin/main`** is those six files **plus this tracked spec** (`specs/spelling-feedback-leak-fix-spec.md`). No other files in either.
- **Raw-band grep (scoped to the two components — `BAND_7_8` legitimately appears elsewhere):**
```bash
git grep -n "BAND_7_8" -- \
  components/literacy/StudentPracticeSession.tsx \
  components/literacy/BuddyCharacter.tsx || true
# expect zero output
```

## Acceptance / tests
**Automated spelling-flow regression (required).** `scripts/test-spelling-flow.ts` against the pure `spellingFlow` module — NOT source-string assertions — covering every transition:
- editing → no feedback (`revealedResult` stays `null`)
- first Check → records + reveals, index unchanged
- editing after a reveal → feedback cleared (back to `null`)
- re-check → latest result **replaces** the prior recorded result for that word
- second press → advances exactly one word
- last-word revealed `primary` → the transition returns **exactly one** completion effect and sets `completed:true`; a subsequent `primary` returns **no** completion
- **dispatch-level guard:** applying two final `primary` actions consecutively yields **only one** completion effect across both
- **fully terminal:** after a completion (`completed:true`), each of `set_answer` / `append_letter` / `clear` / `primary` is a no-op returning no completion
- incorrect answer and empty answer may still proceed (non-blocking gate)
- final correct count uses the **latest revealed** result per word
- **duplicate-word semantics (intentional):** with the same target appearing twice in `words`, a later revealed check **overwrites** the earlier result for that target text, and `spellingTotal` still equals `words.length` (locks the current odd-but-intentional target-keyed behavior)
- **immutability:** `transitionSpellingFlow` does not mutate its input `state`, `state.results`, or `context.words` (returns new objects)
- normalization: `" Cake! "` matches `"cake"`; case/whitespace/punctuation/repeated-space cases above
- **selector keys only:** `spellingPrimaryActionKey` returns `"checkButton"`/`"nextButton"`/`"doneButton"` and `spellingFeedbackKind` returns `"correct"`/`"retry"`/`null` — `test-spelling-flow.ts` asserts the **keys**, never copy strings

**Completion handling:** the component invokes `onComplete` exactly once, synchronously, for the single returned `completion` effect (in the dispatch/click path). Do **NOT** route completion through an unguarded React Effect — Strict Mode could recreate the duplicate-lifecycle class of bug just fixed in PR-0A.

**Gates (this edits `StudentPracticeSession.tsx` post-PR-0A — voice-invariant set mandatory):**
```bash
npm run test:spelling-flow
npm run test:scored-realword-controller
npm run test:voice-capture-layer2
npx tsx scripts/test-voice-activity.ts
npm run test:presentation-copy
npx tsc --noEmit
npm run build
```
**Diff-scope check:** the `StudentPracticeSession.tsx` diff changes **only `SpellingPart`** — no Part 3 / controller / pseudoword / other-component edits. Confirm before opening the PR.

## Manual check
K-3 (`grade3.student@example.com`) and `grade7-voice-smoke@example.com`: build a correct spelling → **no** "That matches." until Check; press Check → result reveals, no jump; press again → next word; edit tiles after a reveal → result disappears until re-checked; last word shows "Done spelling" (K-3) / "Finish spelling" (Coach) and completes the part.
