# WS3-A — PSSA Diagnostic Insights Interpretation Mapping

## Goal

Build a pure teacher-facing interpretation layer for PSSA diagnostic results. The layer maps answer-choice distractor roles into cautious instructional insight objects. It must not render UI, score responses, change delivery, mutate content, or expose student-facing copy.

## Scope

Only these changes are in scope:

- `lib/content/pssaInsightMapping.ts`
- tests for mapping coverage, confidence rules, fallback behavior, banned copy, and determinism
- this committed spec file

Do not touch:

- `lib/content/pssaScoring.ts`
- `lib/content/pssaFormSession.ts`
- student DTOs
- Prisma schema or migrations
- item bank content
- UI components/pages
- delivery/session instrumentation

## Required Exports

`lib/content/pssaInsightMapping.ts` must export:

- `MAPPING_VERSION`
- the mapping registry
- `roleFamilyOf(role)`
- `mapDistractor(role)`
- `deriveStudentInsights(attempt, form, mapping)`

`deriveStudentInsights` returns typed teacher-facing insight objects. It renders nothing.

Each insight must include:

- confidence
- role family
- teacher-facing interpretation
- teacher move
- recommended skill or lesson reference where available
- evidence trace with item IDs behind the insight
- benchmark season
- formId
- form version, if available
- `MAPPING_VERSION`

## Bank-Role Coverage

Do not trust a hand-written role list. Enumerate every distinct `distractorRole` present in:

```text
exemplars/pssa_grade3_stamina_pilot/*.json
```

Every bank `distractorRole` must resolve to:

- role family
- mapping entry
- teacher-facing interpretation
- teacher move

Reading roles expected to map individually include:

- `unsupported_inference`
- `wrong_section`
- `opposite_claim`
- `plausible_misreading`
- `wrong_emphasis`
- `too_narrow`

Conventions roles are hyper-granular. Assign each conventions `distractorRole` to one of these role families:

- `spelling`
- `capitalization`
- `commas`
- `quotation_marks`
- `subject_verb_agreement`
- `verb_tense`
- `plurals`
- `comparatives_adverbs`
- `sentence_formation`

Hard rule: every bank `distractorRole` must be mapped. An unmapped role must fail a test. Add a fake injected role in a test to prove the audit fails.

## Confidence Ladder

- 1 missed MCQ of a role family = `possible`
- 2 missed MCQs of the same family in the same cluster = `likely`
- 3+ missed MCQs of the same family = `strong_pattern`
- Fewer than 3 usable items in a cluster = `limited_evidence`

The confidence ladder is unambiguous: `1 = possible`, `2 = likely`, `3+ = strong_pattern`. Multi-passage evidence can strengthen the explanation, but it does not lower the threshold for `strong_pattern`.

Measurement-honesty language:

- One item may produce only a possible explanation.
- A repeated pattern may produce a likely or strong-pattern need.
- Never infer certainty from one item.

## Item-Type Fallback

MCQ wrong choice produces a distractor-based insight.

EBSR, TE, and SHORT_ANSWER:

- may be included only through existing score/cluster data if already present
- must not generate distractor-based misconception claims in WS3-A
- must never crash `deriveStudentInsights`
- must not require scoring, schema, DTO, or content changes

Known non-MCQ/TE items include:

- `syrup_dd_01`
- `boat_mg_01`

## Banned Copy

Add lint/tests ensuring generated teacher-facing insight text never emits:

- `the student believes`
- `the student cannot`
- `definitely`
- `guessed`
- `Below Basic`
- `Basic`
- `Proficient`
- `Advanced`

The lint must check actually generated/interpolated teacher-facing output, not just static mapping strings.

Do not add timing, rushing, guessing, or low-confidence-response signals. That is WS3-E. Current data does not capture timing.

## Traceability

Every derived insight set must include:

- benchmark season
- formId
- form version, if available
- item IDs used as evidence
- `MAPPING_VERSION`

## Determinism

Same attempt + same form + same `MAPPING_VERSION` must produce identical output.

## Acceptance Criteria

Use synthetic students only. Never commit real student-level data.

1. All `distractorRole` values found in the Grade 3 bank are mapped.
2. A fake unmapped role fails the audit test.
3. Correct answers generate zero misconception insights.
4. TE/SA/EBSR-only attempts generate no misconception insight and do not crash.
5. Confidence ladder is proven with synthetic attempts:
   - 1 item -> `possible`
   - 2 same-family items -> `likely`
   - 3+ same-family items -> `strong_pattern`
6. Thin cluster behavior produces `limited_evidence`.
7. Banned-phrase lint passes over actually generated/interpolated teacher-facing copy.
8. Output is deterministic for same attempt + form + `MAPPING_VERSION`.
9. No class-level misconception aggregation is implemented in WS3-A; leave that for WS3-C.
10. Tests use synthetic-only student data.

## Commands

Run:

```text
npx tsc --noEmit
npm run test:pssa-content
npm run test:pssa-db6
npm run test:pssa-pr-b
```

Confirm:

- no schema or migration diff
- no scoring changes
- no DTO changes
- no UI changes
- no item-content edits

## Stop Conditions

Stop and report without improvising if:

- this spec is missing
- any bank role cannot be sensibly family-mapped
- any scoring, schema, DTO, or UI change appears necessary
- any item-bank content change appears necessary

## Stop Report

Include:

- branch name
- commit SHA
- files changed
- confirmation changed files are limited to new module, tests, and committed spec
- full role -> family coverage table for every bank role
- confidence-ladder proof
- correct-answer-no-insight proof
- TE/SA/EBSR fallback proof
- banned-phrase lint result
- determinism proof
- tsc result
- PSSA suite results
- confirmation of no schema/migration/scoring/DTO/UI changes
- confirmation tests use synthetic-only data
