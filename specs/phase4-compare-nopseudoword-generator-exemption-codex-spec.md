# Codex spec — compare no-pseudoword generator exemption (engine/plumbing, NO content)

Decision (Jonathan + Pro + Claude, 2026-06-07): the -er/-est engine/design mini-PR (merged 6fd2c59) exempted compare's zero-pseudoword design in the AUDIT (`lessonAudit` Part 3, `pseudowords.length === 0`) and the SEED TEST (`scripts/test-content-v3-seed-nonwords.ts`), but NOT in the canonical pseudoword resolver on the real generator path. `buildLessonGeneratorContext` (lib/literacy/lessonGenerator.ts:106) calls `canonicalPseudowordsForTargetPatterns(...)`, which throws `"... has fewer than 8 valid pseudowords ..."` whenever it sees fewer than 8 (lines 283–292). A compare target carries `exampleNonwords: []`, so **real DB-backed generation throws for compare targets**. This was masked in the engine test (hand-built draft, never touched the context builder) — the recurring producer-path gap. Fix it as engine/plumbing BEFORE the order-30 content rung so that PR stays content-only.

Main at 6fd2c59 (29 targets, compare engine merged).

## Scope / boundary (locked)

Engine / generator-plumbing only. NO lesson content, NO seed target, NO student route, NO DB/schema, NO morphology rule changes, NO matcher/registry changes, NO change to the oracle. Files expected: `lib/literacy/lessonGenerator.ts` (the resolver + its call site), one new or extended engine test, `package.json` only if a new test file is added. Do NOT weaken the ≥8-pseudoword requirement for any normal phonics target. Fully opt-in: the exemption activates only for targets whose morphology rule is `compare`.

## The gap (read before implementing)

- `canonicalPseudowordsForTargetPatterns(dailyTargetCode, seedNonwords, targetPatterns, seedLabel, pseudowordPatterns)` returns the first 8 validated pseudowords or THROWS if fewer than 8 valid (lib/literacy/lessonGenerator.ts ~283–292).
- `buildLessonGeneratorContext` calls it at line 106 with `dailyTarget.exampleNonwords` → for a compare target that array is `[]` → throws.
- `part3Decoding` already handles `ctx.pseudowords === []` cleanly (empty pseudoword line); `lessonAudit` Part 3 already requires exactly 0 for compare. So the ONLY break on the real path is the canonical resolver throwing.
- `canonicalPseudowordsForTarget(code, seedNonwords)` (the other export, ~272) delegates to `canonicalPseudowordsForTargetPatterns(code, seedNonwords, [code], "Phase 3 Entry content")` and is used for Phase 3 Entry — must keep working unchanged.

## Change — compare exemption keyed on `rule === "compare"`

Key the exemption on the SAME signal the other two exemption sites use (`morphologyForDraft(draft)?.rule === "compare"` in lessonAudit; `morphologyJson.rule === "compare"` in the seed-nonwords test) — NOT on "empty pseudowordPatterns", which is a looser signal that would silently exempt a misconfigured target.

Preferred implementation (keeps the resolver's strict contract intact for everyone who has pseudowords):

1. Add an explicit opt-in param to the resolver, e.g. `canonicalPseudowordsForTargetPatterns(dailyTargetCode, seedNonwords, targetPatterns, seedLabel?, pseudowordPatterns?, options?: { allowNoPseudowords?: boolean })`. When `options.allowNoPseudowords === true` AND `seedNonwords.length === 0` AND `pseudowordPatterns.length === 0`, return `[]` (no throw). In every other case the existing logic is unchanged — fewer than 8 valid pseudowords still throws.
2. In `buildLessonGeneratorContext`, derive the rule with the shared parser already imported (`morphologyConfigFromTargetPatternsJson(dailyTarget.targetPatternsJson)`) and pass `allowNoPseudowords: morphology?.rule === "compare"` into the resolver call at line 106.
3. Do NOT change `canonicalPseudowordsForTarget` (Phase 3 Entry) — it never passes `allowNoPseudowords`, so its behavior is byte-identical.

Defensive: a compare target that wrongly declares NON-empty `pseudowordPatterns` or `exampleNonwords` must NOT be silently exempted — `allowNoPseudowords` only short-circuits when both are empty; a compare target with stray pseudowords falls through to the normal validation (and will fail, surfacing the misconfiguration).

## Tests (extend an existing engine test or add `scripts/test-content-v3-compare-generator-exemption.ts`, wire into `test:content-v3`)

1. **Compare exemption returns []:** `canonicalPseudowordsForTargetPatterns("morph_compare_no_change", [], ["closed_short_a","closed_short_e","closed_short_i","closed_short_o","team_ow"], "content-v3 lesson seed", [], { allowNoPseudowords: true })` === `[]` (no throw).
2. **Non-compare still throws (contract preserved):** the same call with `allowNoPseudowords: false` (or omitted) and `[]` seedNonwords THROWS; and a non-compare target with 1–7 valid pseudowords THROWS. Prove the exemption is opt-in, not a blanket "empty → []".
3. **allowNoPseudowords requires BOTH empty:** `allowNoPseudowords: true` with a non-empty `pseudowordPatterns` (or non-empty seedNonwords) does NOT short-circuit — it runs normal validation. (Defensive: a misconfigured compare target is not silently accepted.)
4. **Real-path smoke (no DB):** exercise the resolver exactly as `buildLessonGeneratorContext` line 106 would for a compare-shaped target (rule "compare", `exampleNonwords: []`, `pseudowordPatterns: []`) → resolves to `[]`; then confirm `part3Decoding` with `ctx.pseudowords: []` renders a 4-line Part 3 whose `target_pseudowords` line is empty and that `lessonAudit` `LESSON_PART3_PSEUDOWORD_COUNT` PASSES for the compare draft.
5. **Existing 29 targets unchanged:** every current target still resolves its pseudowords exactly as before (the 8-word path is untouched); full `test:content-v3` green.
6. **No content/seed/registry/matcher changes:** byte-diff shows only `lessonGenerator.ts` (+ the test + package.json wiring). Oracle untouched (no `|| validation.valid`, caveats unchanged).

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. the new/extended test) · `npm run content:audit-phase3-nonwords` (29 targets 8/8) · `npm run build`.

## Stop — report

Diff for `lessonGenerator.ts` (resolver signature + the call-site `allowNoPseudowords` derivation); new/extended test output showing: compare → `[]`, non-compare <8 → throws, allowNoPseudowords-requires-both-empty, the real-path smoke (Part 3 empty pseudoword line + LESSON_PART3_PSEUDOWORD_COUNT PASS), and 29-target invariance; the explicit line "≥8-pseudoword contract unchanged for all non-compare targets; canonicalPseudowordsForTarget (Phase 3 Entry) byte-identical"; byte-diff confirming no changes outside `lessonGenerator.ts` + the test + package.json. Do NOT add the compare content target, seed, or student route — those are the next (content) PR.

## After this lands

The order-30 content PR (`morph_compare_no_change`) adds seed + content + a producer-path test that routes pseudowords through the REAL `canonicalPseudowordsForTargetPatterns` resolver (NOT `dailyTarget.exampleNonwords` raw like the y→i helper at line 225) so the zero-pseudoword path is genuinely exercised, plus the adversarial fixtures (after/teacher → r-controlled FAIL; bigger/nicer → null/not-compare; faster/softer/slower/thicker/fresher + fastest/softest/slowest/thickest → compare evidence; bare stems → review only). Worked exemplar: `specs/phase4-er-est-comparative-content-WORKED.md` (v2, signed off pending this engine fix).
