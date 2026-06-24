# PR-0C · Two-word demo-pair primitive + TappableItemPractice extraction · Codex spec (v2, B-lite — post-Jonathan/Pro review pass 1)

**Date:** 2026-06-24 · Verified against `origin/main` (post-PR-0B `6919cbd`). Stepper plumbing chain ([[project_coach_mode_stepper_redesign]]); architecture: `specs/coach-mode-stepper-architecture-spec.md` (PR-0C). **Behavior-frozen extraction + additive pure builder. NOT activated in the scrolling player; no stepper.**
**Sequencing:** on fresh `main` after PR-0B. **Prerequisite (do first):** re-read `ConceptPart` (`StudentPracticeSession.tsx:384`), `PowerWordsPart` (`:683`), `TappableItemPractice` (`:727`), the `TappableItem` type (`:720`), and `formatCopy` (`:1413`). If any shape differs from below, **STOP and report.**

## Decision (LOCKED): B-lite
Extract the generic `TappableItemPractice` (it has **immediate** reuse — `ConceptPart` + `PowerWordsPart` already consume it, so this is not dead code) and ship the **pure two-item builder** returning the **real shared `TappableItem`** type. **Do NOT** add a rendered `DemoPairPractice` wrapper (it would be unused until PR-C and prematurely fixes stepper layout). **Do NOT** activate two-word behavior in `ConceptPart`. PR-C composes the extracted component + builder inside the real stepper card.

## ⚠️ This PR does NOT yet fix Q2 for users
It **encodes and tests** the future two-control contract (each word voiced as its own tap). The **visible** Q2 fix ("cap **turns into** cape", both words voiced separately) lands in **PR-C**, when the stepper renders `buildDemoPairItems(...)` through the extracted `TappableItemPractice`. Do not claim a user-facing fix here.

## Grounded reality (verified)
- `TappableItem` (`:720`) = `{ id; label; helper; utterance }`, file-local.
- `TappableItemPractice` (`:727`), file-local, **two consumers**: `ConceptPart` (`:420`, one item per pair, `utterance: "${before}. ${after}."`) and `PowerWordsPart` (`:708`, one item per word, `utterance: "${word}."`). Owns `heard: Record<id, boolean>`; `hearItem` sets heard + `await onSpeak(item.utterance)`; gates completion on `allHeard`; `onComplete(heardCount)`.
- `formatCopy` (`:1413`) is a **trivial pure** helper `(template, values) => Object.entries(values).reduce(... .replace(/\{key\}/g, value) ...)`, used by **7** call sites (`:581,669,773,1022,1135,1284,1370`). `TappableItemPractice` uses it once (`:773`, heard counter).

## The `formatCopy` seam (the one extraction dependency — clean, narrow)
`TappableItemPractice.tsx` cannot import `formatCopy` back from `StudentPracticeSession` (circular). Resolve by **moving `formatCopy` to a shared util** `lib/literacy/formatCopy.ts` (verbatim — it's a pure 2-line function with no file-local deps). `StudentPracticeSession` then imports it; **all 7 call sites stay byte-identical** (only the local definition is removed and one import added). `TappableItemPractice.tsx` imports the same. **No counter-format callback, no inline duplication, no refactor of the call sites.** If extracting `formatCopy`/`TappableItemPractice` cleanly turns out to require touching anything beyond a definition-move + imports, **STOP and report.**

## Extraction (behavior-frozen — exact move, no logic change)
1. **`lib/literacy/formatCopy.ts`** (NEW): export `formatCopy` verbatim from `:1413-1415`.
2. **`lib/literacy/tappableItem.ts`** (NEW): export the `TappableItem` type (verbatim from `:720`) **and** `buildDemoPairItems` (below).
3. **`components/literacy/TappableItemPractice.tsx`** (NEW): the **exact** `TappableItemPractice` function moved from `:727-785`, unchanged. Must start with `"use client"` (it uses `useState`). Imports `TappableItem` from `lib/literacy/tappableItem`, `formatCopy` from `lib/literacy/formatCopy`, and existing shared types (`PresentationCopy`, `PresentationTheme`). **Preserve exactly:**
   - `theme?: PresentationTheme` stays **optional**; the completion button keeps `theme?.cards.primaryAction ?? "<amber fallback classes>"`. `ConceptPart` still passes `theme`; `PowerWordsPart` still **omits** it (relying on the fallback action classes).
   - `hearItem` calls `setHeard((s)=>({...s,[id]:true}))` **before** `await onSpeak(item.utterance)` (mark-then-speak order).
   - heard items remain **replayable**: re-tapping a heard item re-speaks via `onSpeak` and does **not** increase `heardCount` (id already `true` in the `Record`).
   - heard-state keyed by `item.id`; completion gated on **every** supplied item heard; `onComplete(heardCount)`.
4. **`StudentPracticeSession.tsx`**: remove the local `TappableItem` type, the local `TappableItemPractice` function, and the local `formatCopy` definition; add imports for all three. **`ConceptPart` and `PowerWordsPart` call sites + item construction stay byte-unchanged.**

## The pure builder — `buildDemoPairItems` in `lib/literacy/tappableItem.ts`
Returns the **real** `TappableItem[]` (no parallel type):
```ts
export function buildDemoPairItems(
  pair: { before: string; after: string; pairIndex: number },
  helpers: { beforeHelper: string; afterHelper: string },
): TappableItem[];
```
Exactly **two** items, each voiced **separately** (one word per utterance):
- `{ id: \`demo:${pairIndex}:before\`, label: before, helper: helpers.beforeHelper, utterance: \`${before}.\` }`
- `{ id: \`demo:${pairIndex}:after\`,  label: after,  helper: helpers.afterHelper,  utterance: \`${after}.\` }`
Pure (no React/`onSpeak`/`presentationCopy` import). **Throw** on empty or whitespace-only `before`/`after`. Structural ids keyed by `pairIndex` (distinct across pairs even for repeated words). Must not mutate its inputs. The array order is `before` then `after` — this is **display order only; PR-0C does not enforce tap order** (sequencing whether the student must tap before-then-after is PR-C presentation behavior).

## Behavior-freeze contract (scrolling player exactly as today)
- `ConceptPart`: one tappable item per pair; one tap speaks `"before. after."`; completion still counts heard pairs (`heardPairs`).
- `PowerWordsPart`: one tappable item per word; same heard-state; same `heardWords` completion count.
- Only the **future stepper** uses `buildDemoPairItems(...)` → before item + after item, both must be heard. Not rendered anywhere in PR-0C.

## Tests — `scripts/test-coach-demo-pair.ts`, `test:coach-demo-pair`
Pure unit tests against `buildDemoPairItems`:
- returns exactly two items, **before then after**;
- each `utterance` is the **single** word + `"."` (before voiced separately from after);
- `label`s are `before`/`after`; `helper`s are the passed-in strings;
- ids `demo:${pairIndex}:before` / `:after`, **distinct across pairIndex** (e.g. same word at pairIndex 0 and 1 → different ids);
- **throws** on empty and on whitespace-only `before`/`after`;
- does **not** mutate the input `pair`/`helpers` objects.

`formatCopy` checks (same test file is fine — it serves several player paths now):
- multiple keys all substituted (`"{a}-{b}"` → both replaced);
- a **repeated** placeholder substituted everywhere (`"{x} {x}"` → both occurrences);
- an **unknown** placeholder with no provided value remains unchanged (`"{z}"` stays literal).

## Gates (extraction touches `StudentPracticeSession.tsx` → full player set)
```bash
npm run test:coach-demo-pair
npm run test:pseudoword-capture-coordinator
npm run test:scored-realword-controller
npm run test:spelling-flow
npm run test:voice-capture-layer2
npx tsx scripts/test-voice-activity.ts
npm run test:presentation-copy
npx tsc --noEmit
npm run build
git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx || true   # expect empty
```
If any static test asserts the presence of `formatCopy`/`TappableItemPractice`/`TappableItem` **inside** `StudentPracticeSession.tsx`, STOP and report (they moved legitimately).

**Audit guards (before opening the PR):**
```bash
git grep -n "buildDemoPairItems" -- components/literacy/StudentPracticeSession.tsx || true
#   expect ZERO — builder is NOT activated in the scrolling player

git grep -n "function TappableItemPractice\|type TappableItem\|function formatCopy" -- components/literacy/StudentPracticeSession.tsx
#   expect ZERO — old local definitions removed

git --no-pager diff origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx
#   imports + local-definition removals only
```

**Required player diff** (`git diff origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx`) shows ONLY:
- new imports (`formatCopy`, `TappableItem`, `TappableItemPractice`);
- removal of the local `formatCopy` definition;
- removal of the local `TappableItem` type;
- removal of the local `TappableItemPractice` function;
- `ConceptPart` and `PowerWordsPart` call sites/item construction **unchanged**.

**Manual regression (both K-3 and BAND_7_8):**
- Part 2: **one tap** still speaks **both** pair words (`"before. after."`); **repeated taps replay** without increasing the heard count; completion still waits for **every** pair to be heard.
- Part 4 (power words): **one word per tap**, same replay behavior, same completion gating (all words heard).

## Scope (files)
```
lib/literacy/formatCopy.ts                       (NEW — move formatCopy verbatim)
lib/literacy/tappableItem.ts                     (NEW — TappableItem type + buildDemoPairItems)
components/literacy/TappableItemPractice.tsx      (NEW — exact extraction)
components/literacy/StudentPracticeSession.tsx    (remove 3 locals + add imports; call sites unchanged)
scripts/test-coach-demo-pair.ts                  (NEW)
package.json                                     (test:coach-demo-pair alias only)
```
Plus this tracked spec in the full PR diff. No other files → STOP and report.

## Guardrails
Behavior-frozen extraction (no logic change; `ConceptPart`/`PowerWordsPart` byte-identical behavior). No duplication of tap/heard/speak logic. Builder returns the real `TappableItem` (no parallel type). No `DemoPairPractice` wrapper, no `ConceptPart` activation, no stepper, no `BAND_7_8` branch, no new colors.
