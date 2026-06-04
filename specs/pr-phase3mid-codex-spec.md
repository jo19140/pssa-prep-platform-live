# Content v3 — Phase 3 Mid (Mixed Silent-e Consolidation)

Add **Phase 3 Mid** as the next scope-and-sequence position: consolidation/application of the five Phase 3 Entry VCe patterns via **multi-pattern "mixed VCe" daily targets**. Adds a Phase 3 Mid PhasePosition + 3 mixed targets, their lesson content, the minimal multi-pattern audit/generator change, and runs the full gate stack + spec-conformance against the Mid targets. **No open syllables, affixes, -y, vowel teams, or morphology** — those need new classifier/validator support and are separate follow-up PRs. No new Prisma models. Branch from latest `main`. Commit.

> Companion sign-off artifact: `specs/pr-phase3mid-WORKED.md` — the validated per-target content (classifier + quality + per-pseudoword CMUdict-validated). Build the content from it verbatim.

## HARD PRECONDITION — PR #40 must be merged first

Phase 3 Mid builds on the content-module architecture from the content-parameterization PR (branch `codex/content-v3-lesson-parameterization`). **Verify on `main` before starting:** `lib/content/phase3EntryLessonContent.ts` exists, the part generators read from it (no hardcoded `DEMONSTRATION_PAIRS`/`SENTENCES`/`DICTATED_WORDS`/`QUESTIONS`), and `npm run content:audit-phase3-nonwords` passes (hardened validator + 8 nonwords/target). If any is false, **STOP** — merge the content-parameterization PR first. (Verify by content, not GitHub PR number.)

## 1. Multi-pattern support — thread `targetPatterns: string[]` (the only code change)

Phase 3 Entry targets practice one VCe pattern (a_e blocked i_e/o_e/u_e/e_e). Phase 3 Mid targets practice **two-plus** patterns at once, so the single `targetPattern: string` must become an array in the audit/generator path. Bounded change:

- **`buildLessonGeneratorContext` / `LessonDraft` / `LessonGeneratorContext`:** add `targetPatterns: string[]` derived from `dailyTarget.targetPatternsJson.patterns` (reuse `patternCodesFromDailyTarget` if it returns them). Keep `targetPattern: string` = `dailyTarget.code` for display/back-compat. **Entry-shape fallback:** if an Entry `DailyTarget` lacks `targetPatternsJson.patterns`, normalize `targetPatterns` to `[dailyTarget.code]` in `buildLessonGeneratorContext` rather than failing. Mid targets must carry explicit `targetPatternsJson.patterns`.
- **`lessonAudit.ts`:**
  - `LESSON_WARMUP_NO_TODAY_PATTERN`: warm-up word matches **none** of `targetPatterns` (was: not the single pattern).
  - `LESSON_DAILY_TARGET_NARROW`: **every** entry in `targetPatterns` is a VCe code (ends `_e`) — was `targetPattern.includes("_e")`.
  - `LESSON_PART2_TARGET_EXAMPLES`: each example matches **some** `targetPattern`.
  - `LESSON_PART2_DEMO_MINIMAL_PAIRS` (mixed-aware): each demo pair must be **closed-base → VCe target** where the target side matches **some** entry in `targetPatterns` and the closed-base side classifies as prerequisite. Do **not** require all pairs to share one VCe pattern (e.g. `vce_mix_ai` Part 2 includes both a_e and i_e pairs).
  - Part 3 pseudowords: for each pseudoword, **detect its VCe pattern** (`detectVcePattern`), assert it's in `targetPatterns` (new check `LESSON_PSEUDOWORDS_IN_TARGET_SET`), and `validatePseudowordCandidate(word, detectedPattern, { strictLexicon: true })`. The existing `LESSON_PSEUDOWORDS_TARGET_ONLY`/`_NOT_REAL_MISSPELLINGS` use the detected pattern per word.
- **`part5Sentences.ts`:** `targetPatternCodes: ctx.targetPatterns` (the classifier param is already an array).
- **`part3Decoding.ts`:** validate each pseudoword against its detected pattern (not a single `ctx.targetPattern`).
- **New helper `detectVcePattern(word: string): string | null`** in `pseudowordValidator.ts`: `word.match(/^[^aeiou]*([aeiou])[^aeiou]+e$/)` → `` `${vowel}_e` `` else `null`. **Guardrail — detection ≠ validity.** `detectVcePattern` only finds the vowel; it will return a pattern for r-controlled-looking strings (`zare`→`a_e`, `nore`→`o_e`). A pseudoword is only valid if it ALSO: (a) detects to a pattern in `targetPatterns`, (b) passes `validatePseudowordCandidate(..., { strictLexicon: true })`, AND (c) passes the Phase 3 no-r-controlled pseudoword rule (§ below). Add a negative test: `zare`/`nore` fail the Part 3 pseudoword gate even though `detectVcePattern` returns a VCe code.

### Independent r-controlled gate — `LESSON_PHASE3_NO_RCONTROLLED`
Generalize the current Part-5-only `LESSON_PART5_NO_RCONTROLLED` into a single gate covering **Phase 3 Entry AND Mid**, scanning **Parts 3, 5, 6, and 7** (the decodable practice surfaces — NOT Part 8 spoken questions, where "in your own words" is fine). It flags any token containing `ar/er/ir/or/ur` (regex `[aeiou]r`) plus high-risk exception words `are/for/here`. **This gate is classifier-independent:** a token classified as target/prerequisite/heart/vocabulary does NOT shield it (`are` matches the a_e regex and would otherwise pass). The Part 3 pseudoword path applies the same r-controlled rule (rejects `zare`/`nore`).

**Rule-code compatibility (avoid test drift):** `LESSON_PHASE3_NO_RCONTROLLED` is the canonical new gate. The existing spec-conformance test asserts the old `LESSON_PART5_NO_RCONTROLLED` ID — either preserve `LESSON_PART5_NO_RCONTROLLED` as a compatibility alias mapping to the same blocker, or update that test explicitly in this PR. Do **not** leave two gates with divergent logic.

**Back-compat invariant:** a single-element `targetPatterns` (the 5 Entry targets) must behave **identically** to today. Existing Entry tests, golden exemplar, and spec-conformance must pass unchanged. Add an assertion that Entry a_e output is unchanged. **`ctx.targetPattern` (now `dailyTarget.code`, e.g. `vce_mix_ai`) is DISPLAY/back-compat only** — it is NOT a real spelling pattern. Add a regression check (grep or test) that no matching/classification/pseudoword path calls `wordMatchesPattern(..., ctx.targetPattern)` or `validatePseudowordCandidate(..., ctx.targetPattern)`; all matching must use `ctx.targetPatterns` or the per-word `detectedPattern`.

## 2. Seed — Phase 3 Mid PhasePosition + 3 targets

In `lib/content/phase3EntrySeed.ts` (or a new `phase3MidSeed.ts` imported alongside), add:

- **`PHASE_3_MID`** PhasePosition: `phaseNumber: 3`, `subPosition: "MID"`, `label: "Phase 3 Mid"`, `prerequisites: ["PHASE_3_ENTRY"]`, tracks describing mixed-VCe consolidation.
- **`PHASE_3_MID_TARGETS`** — 3 DailyTargets. For each, `targetPatternsJson: { patterns: [...] }`, `allowedPatternCodes = closed_short_* + the VCe patterns NOT in patterns` (non-target VCe are **allowed review**), `blockedPatternCodes = ["ai","ay","oa","ow","oe","ee","ea","igh","ie","ue","ew","y_final"]` (non-VCe long-vowel teams only), plus `exampleWords` and the 8 `exampleNonwords` from the worked artifact:

| code | patterns | exampleNonwords |
|---|---|---|
| `vce_mix_ai` | `["a_e","i_e"]` | zake, pame, vade, sape, zibe, mide, fime, pive |
| `vce_mix_oue` | `["o_e","u_e","e_e"]` | zome, fope, bofe, mune, plute, vune, pheme, zede |
| `vce_mix_all` | `["a_e","i_e","o_e","u_e","e_e"]` | zake, pame, zibe, mide, zome, fope, mune, pheme |

`kidVisibleLabel`: `vce_mix_ai` = "a_e and i_e words", `vce_mix_oue` = "o_e, u_e, and e_e words", `vce_mix_all` = "silent-e review". **Resolved (no ambiguity):** "silent-e review" is allowed **only** as the exact `DailyTarget.kidVisibleLabel` for `vce_mix_all` (the lesson truly mixes all five). The §5.12 kid-view linter must allow this exact label only; single-pattern targets keep pattern-specific labels ("a_e words"), and "silent-e words" stays forbidden generally. Wire a `seed:phase3-mid` script (mirror `seed:phase3-entry`).

The seed validation must assert each target's `exampleNonwords` are 8, each detects to a pattern in the target's `patterns`, and each passes `validatePseudowordCandidate(..., { strictLexicon: true })`.

## 3. Content — extend the content map with the 3 Mid targets

Add the 3 Mid targets to `lib/content/phase3EntryLessonContent.ts` (`PHASE_3_ENTRY_LESSON_CONTENT`, keyed by code — generators already resolve by `ctx.dailyTarget.code`). Use the worked-artifact §2 content **verbatim** (demonstrationPairs, contrastiveLine2/3, sentences, dictatedWords/Sentences, comprehensionQuestions, heart buckets, vocabulary, mockPassageText, mockPassageTitle). Note the content already mixes patterns and was validated; do not paraphrase. (If clearer, rename the map to `PHASE_3_LESSON_CONTENT` covering Entry+Mid and update the resolver — optional.)

`ensureMockApprovedPassage` already generalizes per target/code (idempotent reuse-before-insert + full `auditPassage` incl. quality gate) — confirm it seeds the 3 Mid mock passages too.

## 4. Run the gate stack against the 3 Mid targets

- **Pipeline test:** loop the Mid targets (in addition to Entry); assert `auditGeneratedLessonDraft(...).canPersist === true` for each.
- **Spec-conformance test:** run the independent oracles (classifier re-audit of Parts 1/3/5/7 with the target's `patterns` as `targetPatternCodes`; full-CMUdict pseudoword oracle per detected pattern; quality gate on Part 7) for the Mid targets. The Mid nonwords are CMUdict-absent → **no caveats** (a CMUdict hit is a real failure).
- **`content:audit-phase3-nonwords`:** extend to cover Phase 3 Mid targets (all Phase 3 targets, Entry + Mid).
- **Targeted negative/linter tests** (must fail before the fix, pass after):
  - `LESSON_PHASE3_NO_RCONTROLLED` FAILs on a Part 5/7 token containing `are`/`for`/`here` or any `ar/er/ir/or/ur` word, even when it classifies as target/heart (e.g. `are` in a vce_mix_all passage).
  - Part 3 pseudoword gate FAILs on `zare`/`nore` (r-controlled) even though `detectVcePattern` returns `a_e`/`o_e`.
  - `LESSON_PSEUDOWORDS_IN_TARGET_SET` FAILs when a pseudoword detects to a VCe pattern not in the target's `patterns` (e.g. an `o_e` nonword in `vce_mix_ai`).
  - `LESSON_PART2_DEMO_MINIMAL_PAIRS` PASSes a mixed pair set (a_e + i_e pairs together) and FAILs a non-minimal pair.
  - Kid-view linter: `"silent-e review"` PASSes as the `vce_mix_all` title; `"silent-e words"` FAILs for a single-pattern target; `"Phase 3 Mid"` FAILs in any kid-visible copy.
  - Back-compat: Entry single-pattern a_e generated output is byte-identical to pre-change; a grep/test asserts no matching path uses `ctx.targetPattern`.

## What Codex should NOT do
1. Do **not** introduce open syllables, affixes (un-/re-/-ful/...), long-vowel -y, vowel teams, or any morphology — separate PRs.
2. Do **not** block non-target VCe patterns in Mid lessons — they are allowed review (this is the consolidation model).
3. Do **not** change Phase 3 Entry content/behavior; single-pattern targets must be byte-identical (back-compat invariant).
4. Do **not** paraphrase the worked-artifact content; fix wiring, not validated content, if a gate fails.
5. Do **not** add CMUdict caveats for Mid nonwords; do **not** include r-controlled words (`are`/`for`/`here`), open-syllable function words, or inflected target words.

## Acceptance criteria
- `PHASE_3_MID` + 3 mixed targets seeded; `seed:phase3-mid` runs; seed validation green.
- Multi-pattern threading done; Entry single-pattern output unchanged (back-compat assertion passes).
- For all 3 Mid targets: `auditGeneratedLessonDraft().canPersist === true`; independent classifier re-audit clean (zero unclassified/blocked, decodability ≥ threshold); Part 7 passage passes the quality gate; CMUdict pseudoword oracle clean (no caveats).
- `LESSON_PHASE3_NO_RCONTROLLED` is wired (Parts 3/5/6/7, classifier-independent) and passes for all Entry + Mid content; the r-controlled negative tests, `LESSON_PART2_DEMO_MINIMAL_PAIRS` mixed-aware update, and the `vce_mix_all` "silent-e review" linter exception are all present and green.
- `--mock-model` lesson generation succeeds (idempotent) for each Mid target.
- `content:audit-phase3-nonwords` covers Entry + Mid, all PASS with ≥8 nonwords.
- Verify gates: `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords`, `npm run build`.
