# PR-A · Pure CoachLessonStep model (`buildCoachLessonSteps`) · Codex spec (v4, LOCKED — post-Jonathan/Pro review pass 3)

**Date:** 2026-06-24 · Verified against `origin/main` (post-PR-0C `6022893`). Stepper plumbing chain ([[project_coach_mode_stepper_redesign]]); architecture: `specs/coach-mode-stepper-architecture-spec.md` (PR-A). **Pure data model, NO player activation, NO stepper, NO player edit.** Last plumbing PR before **PR-B** (first visible single-card).
**Sequencing:** on fresh `main` after PR-0C. **Prerequisite (do first):** re-read `lessonPlayerData.ts` and the producer parts (`lib/literacy/lessonParts/part2Concept.ts`, `part6Encoding.ts`, `part8Comprehension.ts`) to confirm field names below. If any differs, **STOP and report.**

## Goal
`buildCoachLessonSteps(lesson: EnabledLessonPlayerData): CoachLessonStep[]` (NEW, pure, `lib/literacy/coachLessonSteps.ts`) — flattens the 8 lesson parts into an ordered one-item-per-screen step list for the stepper (PR-B). No rendering, React, or player wiring.

## RESOLVED rulings (Jonathan/Pro)
1. **Option B — strict PRIVATE parsers inside `coachLessonSteps.ts`.** Do NOT extract or reuse the player's lenient accessors (they silently coerce malformed data to ""/[] and filter invalid members, conflicting with the fail-loud contract). PR-A stays additive: `coachLessonSteps.ts` + test + `package.json` + spec. **No player edit, no voice-gate expansion.**
2. **Keep `questionType`** (it exists; `TalkPart` ignores it).
3. **Preserve producer order and assert it exactly. Never sort, never skip.**

## Strict private parsers (validate, do NOT silently coerce/filter/trim content)
```ts
requireNonEmptyString(value, where): string   // typeof === "string" && value.trim().length > 0; returns the ORIGINAL string unchanged (untrimmed)
requireStringArray(value, where): string[]    // Array.isArray; nonempty when required; EVERY member typeof "string" && trim().length>0; NEVER filter; returns original (untrimmed) members
requireRecordArray(value, where): Record<string,unknown>[]  // array of plain objects (throw on null/array/primitive members)
requireInteger(value, where): number          // typeof "number" && Number.isInteger
requireBoolean(value, where): boolean         // typeof "boolean" (NOT `value !== false` coercion)
```
Every read goes through these; a malformed field **throws** (with a `where` locator), never degrades. **Do NOT use `value !== false`-style coercion anywhere** — Part 7 flags must be parsed with `requireBoolean` (the producer emits both as actual `true`).

## Exact 8-part producer contract (deterministic generator) — partTypes HARDCODED (verified)
Require **exactly 8 parts**, `partNumber` exactly `1..8` in **source order** (no missing / duplicate / unexpected / reordered parts), each with its exact `partType` (verified against `lib/literacy/lessonParts/partN*.ts`):
```ts
const EXPECTED_PART_TYPES = [
  "CUMULATIVE_CODE_REVIEW",            // part 1
  "EXPLICIT_TARGET_INSTRUCTION",       // part 2
  "WORD_LEVEL_DECODING",               // part 3
  "HFW_VOCAB",                         // part 4
  "SENTENCE_READING",                  // part 5
  "ENCODING_SPELLING",                 // part 6
  "CONNECTED_TEXT_READING",            // part 7
  "COMPREHENSION_LANGUAGE_EXTENSION",  // part 8
] as const;
```
The builder requires `parts[i].partNumber === i+1` AND `parts[i].partType === EXPECTED_PART_TYPES[i]`. Do not sort; do not skip.

## Part → step mapping (verified)
- **Part 1 warmup** (`contentJson.warmupWords`) → `warmup_word` per word.
- **Part 2 concept**: **require `contentJson.demoMode === "minimal_pairs"`** (throw on `examples_only`/`transformation_pairs` — the union doesn't represent examples-only). One `rule` (`contentJson.kidRuleStatement`), then one `demo_pair` per `contentJson.demonstrationPairs` entry with **`before = requireNonEmptyString(pair.closed)`, `after = requireNonEmptyString(pair.target)`** (do NOT accept `base` as a minimal pair).
- **Part 3 words** (`contentJson.contrastiveLines`): require the **exact 4-line sequence** with line numbers `1,2,3,4`:
  `target_real_words`(1) → `contrastive_target_vs_review`(2) → `cumulative_review`(3) → `target_pseudowords`(4). Reject unknown/duplicate/missing/reordered roles or line numbers. Emit `real_word` per word for lines 1-3 (in order), then `nonsense_word` per word for line 4.
- **Part 4 power words**: `power_word` per word — `contentJson.heartWords` (group `"heart"`) then `contentJson.vocabularyWords` (`.word`, group `"vocab"`).
- **Part 5 sentences** (`contentJson.sentences`) → `sentence` per sentence.
- **Part 6 spelling** (`contentJson.dictatedWords`) → `spell_word` per word. **`dictatedSentences` is intentionally EXCLUDED** from the initial stepper model (Part 6 contains both; the union models words only).
- **Part 7 passage**: ONE `passage` — **require nonempty `kidVisibleCopy.title`** (NO fallback to presentation copy or `"Story"`; Part 7 supplies its generated title there), `text = requireNonEmptyString(contentJson.passageText)`, `listenFirstAllowed = requireBoolean(contentJson.listenFirstAllowed)`, `readOnOwnAllowed = requireBoolean(contentJson.readOnOwnAllowed)`.
- **Part 8 reflect** (`contentJson.questions` records): one `reflect` per question. Require nonempty `question.question` and **nonempty `question.questionType`**, and cross-check `contentJson.questionTypes[i] === contentJson.questions[i].questionType`.

## The discriminated union
Base carries BOTH whole-part and per-task-group progress (Part 3 has 25 part-steps but the label is "Word 3 of 17" / "Sound 3 of 8" — partLocal alone can't express that):
```ts
type CoachLessonStepBase = {
  id: string;
  partNumber: number;
  partLocalIndex: number;  partLocalTotal: number;  // whole-part sequencing
  taskLocalIndex: number;  taskLocalTotal: number;  // within the task group (real_word 0..16/17, nonsense 0..7/8, demo_pair 0..4/5)
};
type CoachLessonStep = CoachLessonStepBase & (
  | { kind: "warmup_word";  payload: { word: string; sourceIndex: number } }
  | { kind: "rule";         payload: { statement: string } }
  | { kind: "demo_pair";    payload: { before: string; after: string; pairIndex: number } }
  | { kind: "real_word";    payload: { word: string; lineNumber: number;
        role: "target_real_words" | "contrastive_target_vs_review" | "cumulative_review";
        lineWordIndex: number; realWordIndex: number } }   // realWordIndex = flattened block-wide index across lines 1-3 (matches the scored-real-word controller)
  | { kind: "nonsense_word";payload: { word: string; wordIndex: number } }   // source index within the pseudoword line
  | { kind: "power_word";   payload: { word: string; group: "heart" | "vocab"; index: number } }
  | { kind: "sentence";     payload: { text: string; index: number } }
  | { kind: "spell_word";   payload: { word: string; index: number } }
  | { kind: "passage";      payload: { title: string; text: string; listenFirstAllowed: boolean; readOnOwnAllowed: boolean } }
  | { kind: "reflect";      payload: { question: string; questionType: string; index: number } }
);
```
**No `complete` step** — the shell (PR-B) owns the summary; builder ends at the last `reflect`.

**Locked progress tables (PR-B must not re-derive):**
Task-local groups (one group per kind, in emit order):
```
warmup_word   group of 15   (taskLocalIndex 0..14)
rule          group of 1    (0..0)
demo_pair     group of 5    (0..4)
real_word     group of 17   (0..16, across lines 1-3)
nonsense_word group of 8    (0..7)
power_word    group of 11   (0..10, heart then vocab combined)
sentence      group of 6    (0..5)
spell_word    group of 6    (0..5)
passage       group of 1    (0..0)
reflect       group of 4    (0..3)
```
Part-local index ranges (within a partNumber):
```
Part 2: rule partLocalIndex 0 ; demo_pair partLocalIndex 1..5  (partLocalTotal 6)
Part 3: real_word partLocalIndex 0..16 ; nonsense_word partLocalIndex 17..24  (partLocalTotal 25)
(single-group parts: partLocalIndex == taskLocalIndex, partLocalTotal == taskLocalTotal)
```
Locked index semantics (payload `index` is per-sub-group; `taskLocalIndex` is the whole task group — they DIFFER for power_word):
```
power_word payload.index:  heart 0..7, vocab 0..2   (restarts per sub-group)
power_word taskLocalIndex: combined 0..10
real_word  taskLocalIndex = realWordIndex   (0..16)   ; payload.lineWordIndex is per-line
nonsense   taskLocalIndex = wordIndex       (0..7)
demo_pair  taskLocalIndex = pairIndex       (0..4)
```
**Production must derive all totals from the validated arrays** (`.length` of warmupWords, demonstrationPairs, etc.) — never hardcode `15/5/17/…`; those live only in the test oracle.

## IDs = structural coordinates
`part1:warmup:${i}` · `part2:rule` · `part2:demo:${pairIndex}` · **`part3:line${lineNumber}:word${lineWordIndex}`** · `part3:nonsense:${wordIndex}` · `part4:heart:${i}` · `part4:vocab:${i}` · `part5:sentence:${i}` · `part6:spell:${i}` · `part7:passage` · `part8:question:${i}`. Preserve order + duplicates (a repeated word is a distinct step).

## Test — `scripts/test-coach-lesson-steps.ts`, `test:coach-lesson-steps` (producer-path; FULL hardcoded payload oracle)
`const data = await buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" })` → assert `data.enabled` → `const steps = buildCoachLessonSteps(data)`.

**Full-object snapshot (catch payload AND metadata drift):**
```ts
assert.deepStrictEqual(steps, EXPECTED_AE_COACH_STEPS);   // FULL step objects: partNumber, partLocalIndex/Total, taskLocalIndex/Total, id, kind, payload
```
`EXPECTED_AE_COACH_STEPS` is a **fully hardcoded literal** — do NOT build it by re-running the production mapping over `data.parts`. **The implementation must commit a fully literal 74-object `EXPECTED_AE_COACH_STEPS` before STOP-1; no snapshot generation or producer-derived expected values at STOP-1.** STOP-1 reviews the committed literal against the real producer; on any mismatch, report the diff for Jonathan to adjudicate — do NOT silently sync the oracle to production. Authoritative content:
- **warmup_word (15):** `cat ran hand pin did fish top hot dog bug run cup pet red ten`
- **rule:** `Silent e changes the vowel to its long sound. When a short word adds silent e, the vowel says its name: cap turns into cape. The e stays silent.` (screenshot-verified)
- **demo_pair (5):** cap→cape, at→ate, man→mane, tap→tape, hat→hate
- **real_word (17):** line1 `target_real_words` (5): `cake game make same tape`; line2 `contrastive_target_vs_review` (6): `cap cape man mane hat hate`; line3 `cumulative_review` (6): `ran lake hand fast name desk`
- **nonsense_word (8):** zake mave pame vade sape nace gake tave
- **power_word (11):** heart `said was they I a the to he` (8) + vocab `brave pace gap` (3)
- **sentence (6):** "Jake ran his last race." / "He set a fast pace." / "Jake gave it his best." / "His pals gave a wave." / "Jake was brave." / "He made up the gap."
- **spell_word (6):** `cape made lake game gave brave`
- **passage:** title "Jake at the Race", flags both `true`, exact `text`:
  > Jake had his last race. He came in late. His face felt hot. "Did I mess up?" Jake said. But Jake did not stop. He set his pace. A pal said, "Jake, get set." Jake felt bad, but he ran on. He ran his best lap and did not fade. Jake ran fast in his lane. He made up the gap. At the end, Jake came in. His pals gave him a wave. Jake was brave. He gave his best.
- **reflect (4)** question / `questionType`: "Why did Jake feel he messed up at the start?" / `inference`; "How do you know Jake did not give up?" / `literal`; "Tell what happened at the end, in your own words." / `retell`; "Tell about a time you kept going after a setback." / `personal_connection`

Expected count snapshot (the `15/5/17/8/…` are **test-oracle values, NOT implementation constants** — production must derive every total from the validated arrays, never hardcode counts):
```
warmup_word 15 · rule 1 · demo_pair 5 · real_word 17 · nonsense_word 8 · power_word 11 · sentence 6 · spell_word 6 · passage 1 · reflect 4 · TOTAL 74
```
Also assert: `data.title === "Jake at the Race Lesson"`; `data.presentationProfile === "BAND_7_8"`; Part-3 role/line sequence exact; `questionType` sequence exact; `partLocalIndex` contiguous `0..partLocalTotal-1` per part with the locked Part-2/Part-3 ranges; `taskLocalIndex`/`taskLocalTotal` per the locked table; last step `part8:question:3`; no `complete` kind.

**Profile-agnostic check:** also `buildLessonPlayerData("a_e", { presentationProfile: "BAND_K_3" })` → assert `enabled` → `buildCoachLessonSteps(data)` **succeeds** (no throw). No full K-3 snapshot needed — this guards against the builder accidentally branching on `presentationProfile`.

**Malformed cases — deep-clone the real produced lesson and mutate it (NOT a hand-built fake):** missing Part 4 → throws; duplicate Part 4 → throws; reordered parts → throws; unexpected Part 9 → throws; wrong `partType` for a slot → throws; unknown/reordered/duplicate Part-3 role → throws; duplicate Part-3 line number → throws; **whitespace-only** required string → throws; **mixed string/null** array member → throws; **non-boolean** Part 7 flag → throws; **fractional/non-number** `lineNumber` → throws; missing `questionType` → throws; **`questionTypes` length/value mismatch** vs `questions[i].questionType` → throws; missing passage title → throws; unsupported `demoMode` (`examples_only`/`transformation_pairs`) → throws; empty required array → throws. **Deep-freeze** one real result and prove the builder does not mutate it. Add a duplicate word to a cloned real line and prove **both** structural steps remain.

## Scope (files)
```
lib/literacy/coachLessonSteps.ts          (NEW — union + buildCoachLessonSteps + strict private parsers)
scripts/test-coach-lesson-steps.ts        (NEW — producer-path test + malformed cases)
package.json                              (test:coach-lesson-steps alias only)
```
Plus this tracked spec **and** the reconciled `specs/coach-mode-stepper-architecture-spec.md` (shorthand update above). **No player edit.** No other files → STOP and report.

## Gates
```bash
npm run test:coach-lesson-steps
npx tsc --noEmit
npm run build
```

## Guardrails
Pure (no React/DOM/network/`onSpeak`). No player activation/edit, no stepper, no `BAND_7_8` component branch, no new colors. `CoachLessonStep` (not `LessonStep` — schema name clash). Strict fail-loud parsing; never silently coerce. Producer order asserted, never sorted.
- **Profile-agnostic:** `buildCoachLessonSteps` must NOT branch on `presentationProfile`. PR-B's `lessonPlayerModeFor` resolver owns BAND_7_8 activation; the PR-A test uses BAND_7_8 only because that's the current Coach producer path.
- **No runtime `lib → components` dependency:** use `import type { EnabledLessonPlayerData }` only (type-only, erased at compile).

## Architecture reconcile (in this PR's spec commit)
Update `specs/coach-mode-stepper-architecture-spec.md`'s `CoachLessonStep` shorthand so PR-B does not implement against stale shorthand: source order **required, never "sorted or assert pre-ordered"**; `real_word` uses `lineWordIndex` + `realWordIndex` (not one `wordIndex`); `reflect` keeps `questionType`; every step carries `partLocal*` + `taskLocal*`. Add: *"For PR-A, `specs/coach-mode-pr-a-coach-lesson-step-model-spec.md` supersedes the architecture's CoachLessonStep shorthand."*
