# Codex spec — order-30 -er/-est comparative CONTENT (content + seed + tests only, NO engine)

Final morphology rung. Adds `morph_compare_no_change` (order 30): no-change comparative/superlative -er/-est. All engine prerequisites are MERGED on main — do NOT reimplement or modify any `lib/literacy/*`:
- compare rule + comparativeStems whitelist + variant-tolerant pron verification + rControlledViolations ER-exemption (6fd2c59).
- compare no-pseudoword generator exemption: `canonicalPseudowordsForTargetPatterns(..., { allowNoPseudowords })` returns `[]` for compare with empty seed+patterns (3ffc20c).

Main at 3ffc20c (29 targets). Worked exemplar (signed off): `specs/phase4-er-est-comparative-content-WORKED.md` (v2). This PR = content + seed + tests ONLY. **Zero `lib/literacy/` changes** (byte-diff 0). If anything seems to need an engine change, STOP and report — do not patch the engine here.

## Scope / files

- `lib/content/phase3EntrySeed.ts` — new `PHASE_4_MORPHOLOGY_COMPARE_TARGETS` array + spread into `CONTENT_V3_DAILY_TARGETS`.
- `lib/content/phase3EntryLessonContent.ts` — new `morph_compare_no_change` entry in `LESSON_CONTENT_BY_DAILY_TARGET`.
- `scripts/test-content-v3-phase4-morphology-compare.ts` — NEW producer-path test (modeled on `test-content-v3-phase4-morphology-y-to-i.ts`).
- `package.json` — wire the new test into `test:content-v3`.
- `scripts/test-content-v3-phase4-morphology-y-to-i.ts` and `scripts/test-content-v3-compare-generator-exemption.ts` — UPDATE the count/invariance assertions broken by the 30th target (test-only, no weakening; see "Cross-test ripple").
- NO student route, NO DB seed wiring, NO `lib/literacy/*`.

## Seed (phase3EntrySeed.ts)

Add after `PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS`, then spread into `CONTENT_V3_DAILY_TARGETS` (append last):

```ts
export const PHASE_4_MORPHOLOGY_COMPARE_TARGETS: DailyTargetSeed[] = [
  {
    code: "morph_compare_no_change",
    kidVisibleLabel: "add -er and -est",
    tutorLabel: "comparative rule: fast → faster → fastest",
    description: "Phase 4 Morphology target for adding -er (comparative) and -est (superlative) with no change to the base.",
    introductionOrder: 30,
    targetPatternsJson: {
      patterns: ["closed_short_a", "closed_short_e", "closed_short_i", "closed_short_o", "team_ow"],
      pseudowordPatterns: [],
      graphemes: ["er", "est"],
      sound: "morph_compare_no_change",
      morphologyJson: {
        rule: "compare",
        stemPatterns: ["closed_short_a", "closed_short_e", "closed_short_i", "closed_short_o", "team_ow"],
        comparativeStems: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
        suffixes: ["er", "est"],
      },
    },
    allowedPatternCodes: ["closed_short_u", "a_e", "i_e", "o_e", "u_e", "e_e"],
    blockedPatternCodes: [
      "team_ai", "team_ay", "team_ee", "team_ea", "team_oa", "team_igh", "team_ew", "team_ue",
      "team_ie_long_i", "team_ie_long_e", "team_oo_long", "team_oo_short", "team_au", "team_aw",
      "diph_oi", "diph_oy", "diph_ou", "diph_ow", "r_ar", "r_or", "r_er", "r_ir", "r_ur",
    ],
    exampleWords: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
    exampleNonwords: [],
  },
];
```

Notes: `team_ow` is a TARGET stem pattern (slow), so it is NOT in blocked (unlike the y_to_i seed). `exampleNonwords: []` + `pseudowordPatterns: []` are intentional — the merged generator exemption handles them. `exampleWords` first 5 (fast, tall, slow, soft, fresh) become Part 3 line 1 (bare stems) via `ctx.targetWords`.

## Content (phase3EntryLessonContent.ts)

Add to `LESSON_CONTENT_BY_DAILY_TARGET`:

```ts
morph_compare_no_change: {
  demoMode: "transformation_pairs",
  morphologyJson: {
    rule: "compare",
    stemPatterns: ["closed_short_a", "closed_short_e", "closed_short_i", "closed_short_o", "team_ow"],
    comparativeStems: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
    suffixes: ["er", "est"],
  },
  reviewWords: ["lake", "home", "bike", "cube", "gate", "five"],
  demonstrationPairs: [
    { base: "fast", target: "faster" },
    { base: "soft", target: "softer" },
    { base: "thick", target: "thicker" },
    { base: "slow", target: "slowest" },
    { base: "tall", target: "tallest" },
  ],
  contrastiveLine2: ["fast", "faster", "soft", "softer", "thick", "thicker", "slow", "slowest"],
  contrastiveLine3: ["tall", "taller", "fresh", "fresher", "rich", "richer"],
  sentences: [
    "The cat can run faster than the pup.",
    "The pup naps on the softer mat.",
    "The pond mud is thicker.",
    "The slug is the slowest bug.",
    "Sam has the fresher snack.",
    "That hill is the tallest.",
  ],
  dictatedWords: ["faster", "softer", "thicker", "slower", "fastest", "softest"],
  dictatedSentences: ["The cat can run faster.", "That hill is the tallest."],
  comprehensionQuestions: [
    { question: "How can you tell the cat is faster than the pup?", questionType: "inference" },
    { question: "What does the cat nap on?", questionType: "literal" },
    { question: "Tell me how Sam's pets are different.", questionType: "retell" },
    { question: "What pet would you like?", questionType: "personal_connection" },
  ],
  heartWordsPreviewedThisLesson: sharedHeartWordsPreviewedThisLesson,
  heartWordsAssumedKnown: sharedHeartWordsAssumedKnown,
  vocabulary: ["slug", "pond"],
  mockPassageText: `Sam has a cat and a pup. The pup can run fast. The cat can run faster. The cat is fastest. The pup sits on a soft mat. The cat naps on a softer mat. The softest mat is a hit.`,
  mockPassageTitle: "Sam and His Pets",
  fullAuditPassageText: `Sam has a cat and a pup. The pup can run fast. The cat can run faster. The cat is fastest. The pup sits on a soft mat. The cat naps on a softer mat. The softest mat is a hit. Sam spots a slug. The slug is slow. It gets slower. It is the slowest. Sam digs in thick mud. The pond mud is thicker. The thickest mud is a mess. At lunch, Sam has fresh ham. The next snack is fresher. Sam grins and naps in the sun.`,
  fullAuditPassageTitle: "Sam and His Pets",
},
```

Reuse the existing `sharedHeartWordsPreviewedThisLesson` / `sharedHeartWordsAssumedKnown` constants (same as y_to_i). Do NOT introduce new heart-word sets.

## NEW producer-path test (scripts/test-content-v3-phase4-morphology-compare.ts)

Model on `test-content-v3-phase4-morphology-y-to-i.ts`, with these REQUIRED differences:

1. **Route pseudowords through the REAL resolver — NOT `dailyTarget.exampleNonwords` raw.** The y_to_i helper at line ~225 sets `pseudowords: dailyTarget.exampleNonwords`; that bypass would hide the zero-pseudoword path. The compare test's context helper MUST call `canonicalPseudowordsForTargetPatterns(dailyTarget.code, dailyTarget.exampleNonwords, targetPatterns, "content-v3 lesson seed", pseudowordPatterns, { allowNoPseudowords: morphology?.rule === "compare" })` and assert it returns `[]`. This is the honesty requirement that drove the engine-fix PR.
2. **phasePositionFor** must recognize the compare target (`PHASE_4_MORPHOLOGY_COMPARE_TARGETS`) → id `"phase-4-morphology-compare"`, phaseNumber 4, label `"Phase 4 Morphology Compare"`.
3. Drive the real generator: `generateLessonDraft(ctx, …)` → `auditGeneratedLessonDraft(draft)` → `auditPassage(content.fullAuditPassageText, …)` and `auditPassage(content.mockPassageText, …)`.

Assertions (Pro's 10-point checklist, all through the real path):
1. `draft.morphology` deepEquals the compare config (rule compare, comparativeStems = the 7, suffixes er/est).
2. Part 1 warmup words === `["lake","home","bike","cube","gate","five"]` (VCe override, no closed-short clash) and `LESSON_WARMUP_NO_TODAY_PATTERN` PASS.
3. Part 2: `generatePart2Concept(ctx).contentJson.morphologyJson` deepEquals `content.morphologyJson` (mirror through real producer path); demoMode transformation_pairs.
4. Part 3: `ctx.pseudowords === []`, the `target_pseudowords` line is empty, and `LESSON_PART3_PSEUDOWORD_COUNT` PASS.
5. Full passage table: decodability 1.000, unclassified 0, blocked 0, repeated trigrams 0, `passesAuditGate` TRUE; short passage classifies clean + quality gate PASS; `draftAudit.canPersist` TRUE.
6. `LESSON_MORPHOLOGY_TARGET_COVERAGE` PASS; the passage audits these as `rule: "compare"` target evidence: faster, fastest, softer, softest, slower, slowest, thicker, thickest, fresher (assert each present in the full-passage `auditPassage` words with morphology rule compare).
7. Bare stems fast/soft/slow/thick/fresh classify as review/base (NOT morphology rule compare; not coverage).
8. Part 7 renders `content.fullAuditPassageText`.
9. **Adversarial whitelist fixture:** inject `after` and `teacher` into a copy of the passage → `rControlledViolations`/`LESSON_PHASE3_NO_RCONTROLLED` FAIL (named), proving the whitelist protects the real generated lesson, not just the engine unit test. Also assert `decomposeInflectedWord("after", compareConfig)` and `decomposeInflectedWord("teacher", compareConfig)` === null.
10. **Adversarial deferred-rule fixture:** `decomposeInflectedWord("bigger", compareConfig)` === null and `decomposeInflectedWord("nicer", compareConfig)` === null (double/drop_e comparatives deferred — base bigg/nic not whitelisted); and injecting `bigger`/`nicer` into the passage → FAIL (they end in -er, don't decompose, so r-controlled flags them).
11. **Degenerate coverage:** a draft whose compare evidence is removed (e.g. Part 2/3/5/6/7 mutated to bare stems only) → `LESSON_MORPHOLOGY_TARGET_COVERAGE` FAIL (fail-closed).
12. Oracle integrity: conformance + validator sources contain no `|| validation.valid`; a_e (mave/nace) and r_controlled_ar (zarb/varn) caveats unchanged.

## Cross-test ripple (REQUIRED — the 30th target breaks two sibling count assertions)

Adding `morph_compare_no_change` to `CONTENT_V3_DAILY_TARGETS` (29 → 30) breaks:

- `scripts/test-content-v3-phase4-morphology-y-to-i.ts` `assertPriorTargetsUnchanged`: `priorTargets.length` 28 → **29**, and add a branch so the compare target asserts `draft.morphology?.rule === "compare"` (it currently falls into the `else` that asserts `morphology === undefined` and would fail).
- `scripts/test-content-v3-compare-generator-exemption.ts` `assertExistingTargetsUnchanged`: the loop asserts `morphology?.rule !== "compare"` for every target and `count === 29`. Update to 30 and handle the compare target: for it, assert the resolver returns `[]` (its `allowNoPseudowords` path) rather than asserting it is not compare; keep the `slice(0, 8)` invariant for all non-compare targets.

These are test-only edits that keep the assertions faithful (no weakening). Run the FULL `test:content-v3` suite; if any OTHER test hardcodes the target count or "no compare target", update it the same faithful way and report it.

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. the new compare test) · `npm run content:audit-phase3-nonwords` (compare exempt; others 8/8) · `npm run build`.

## Stop — report

The producer-path table for `morph_compare_no_change` (target | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage), each formatted like the y_to_i test output; the morphology-evidence list (faster…fresher → compare) and bare-stem review list; the resolver-returns-`[]` proof; the two adversarial fixtures (after/teacher FAIL + null; bigger/nicer null + FAIL); degenerate-coverage FAIL; Part 1 warmup VCe override; Part 2 morphologyJson mirror; oracle integrity. The diff for the two seed/content files and the new test, plus the cross-test edits with their before/after assertion values. A byte-diff line confirming **zero `lib/literacy/` changes**. Do NOT add a student route or DB seed wiring.
```

After this lands: 30 targets on main, Phase 4 morphology complete (drop_e, double, y→i, compare). That closes the morphology arc.
