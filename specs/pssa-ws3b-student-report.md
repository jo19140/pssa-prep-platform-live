# WS3-B — PSSA Student Insight Report Data Layer

## Goal

Build a pure teacher-facing student report assembly layer on top of WS3-A. The report consumes existing scoring/response data and WS3-A insights, then returns deterministic data objects for later UI/report work.

This is not a UI, scoring, delivery, schema, or content PR.

## Scope

Only these changes are in scope:

- `lib/content/pssaStudentReport.ts`
- tests for report assembly, clustering, bands, traceability, determinism, and banned copy
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

`lib/content/pssaStudentReport.ts` must export:

- `REPORT_VERSION`
- `clusterOf(item)`
- `bandFor(score, maxScore, completionStatus)`
- `buildStudentReport(attempt, form, scoring, insights, opts)`

## Inputs And Data Rules

WS3-B builds on WS3-A:

- `lib/content/pssaInsightMapping.ts`
- `deriveStudentInsights`
- `MAPPING_VERSION`

`likelyPatterns` must come from WS3-A. Do not re-derive WS3-A confidence rules in WS3-B. Do not create new misconception logic.

Use existing scoring/response data only. Do not re-score items. Cluster point fields may use existing `PssaFormResponse.pointsEarned` and `maxPoints`; item counts must always be present.

## Clusters

Every diagnostic item must resolve to exactly one of:

- `Key Ideas & Evidence`
- `Craft & Structure`
- `Vocabulary`
- `Conventions`

Cluster mapping:

- `reportingCategory == "D"` -> `Conventions`
- otherwise parse eligibleContent strand:
  - `K` -> `Key Ideas & Evidence`
  - `C` -> `Craft & Structure`
  - `V` -> `Vocabulary`

If an item cannot be clustered, fail a test. Add a fake unclusterable item to prove the audit fails.

## Bands

Use Sý Learning formative practice bands only:

- `Strong` = 36-45 points, >= 80%
- `Developing` = 27-35 points, 60-79%
- `Needs support` = 0-26 points, < 60%
- incomplete attempts = `Incomplete`

Never emit official PSSA labels:

- `Below Basic`
- `Basic`
- `Proficient`
- `Advanced`

Bands use only the comparable operational score. Analytics-only items must not affect the band.

## Provisional And Incomplete Scoring

If `pendingHumanPoints > 0`:

- `pendingHumanScore = true`
- `scoreStatus = "provisional"`
- do not present the score as final in generated fields

If the attempt is incomplete:

- `scoreStatus = "incomplete"`
- `band = "Incomplete"`
- do not compute a readiness band

## Cluster Results

Cluster results must always include item counts.

Preferred shape:

- `earnedPoints` / `maxPoints` if already available from existing scoring details
- `itemsCorrect` / `itemsTotal` always
- `signal`

Thin clusters:

- fewer than 3 usable items -> `limited_evidence`
- `limited_evidence` clusters cannot be `strongestCluster` or `priorityCluster`

Tie-breakers:

- `priorityCluster` = lowest-performing non-limited cluster by percent
- `strongestCluster` = highest-performing non-limited cluster by percent
- ties break by larger item count, then fixed cluster order:
  1. `Key Ideas & Evidence`
  2. `Craft & Structure`
  3. `Vocabulary`
  4. `Conventions`
- if there are no non-limited clusters or the attempt is incomplete, `priorityCluster`, `strongestCluster`, and `recommendedNextStep` are `null`

## Missed Review

MCQ missed rows may use WS3-A / `mapDistractor` output for:

- hedged `responseSignal`
- `teacherMove`

Non-MCQ, TE, SA, and EBSR rows:

- may include `itemId`, `cluster`, `itemType`, and score fields if available
- must have empty `responseSignal`
- must have empty `teacherMove`
- must not generate misconception claims
- must not be omitted from `missedReview`
- must never crash

## Recommended Next Step

Use the teacher move tied to the dominant WS3-A role family in the priority cluster. If none exists, use a generic cluster-level fallback. If the attempt is correct-only or all-strong, recommend continued grade-level practice or enrichment.

Do not invent a misconception.

## Banned Copy

Generated report text must never emit:

- `the student believes`
- `the student cannot`
- `definitely`
- `guessed`
- `Below Basic`
- `Basic`
- `Proficient`
- `Advanced`

The lint must check generated report text, not just static strings.

Do not add timing, rushing, guessing, or low-confidence-response signals. That is WS3-E.

## Traceability

Every report must include:

- `benchmarkSeason`
- `formId`
- `formVersion`, if available
- `MAPPING_VERSION`
- `REPORT_VERSION`
- evidence item IDs through WS3-A `likelyPatterns` / `missedReview` where applicable

## Determinism

Same attempt + form + scoring + insights + `MAPPING_VERSION` + `REPORT_VERSION` must produce identical output.

## Acceptance Criteria

Use synthetic students only. Never commit real student-level data.

1. Every diagnostic item resolves to exactly one cluster.
2. Fake unclusterable item fails the cluster audit.
3. Cluster results always include item counts.
4. Fewer than 3 usable items gives `limited_evidence`.
5. `limited_evidence` clusters are never chosen as `priorityCluster` or `strongestCluster`.
6. Band thresholds match 80/60 cuts on the 45-point operational score.
7. Incomplete attempt gets band `Incomplete`, not a readiness band.
8. `pendingHumanPoints > 0` sets `pendingHumanScore` and provisional status.
9. `likelyPatterns` are consumed from WS3-A, not re-derived.
10. MCQ missed rows include hedged signal and teacher move.
11. TE/SA/EBSR/non-MCQ rows exist with empty signal/move, produce no misconception claim, and do not crash.
12. Correct-only attempt has zero likelyPatterns and zero misconception rows; band still computed if complete.
13. Cluster point fields come from existing `PssaFormResponse` data only; counts always present.
14. `scoreStatus` is final/provisional/incomplete per the rules.
15. Priority/strongest tie-breaking is deterministic; null when no non-limited clusters or incomplete.
16. `recommendedNextStep` uses WS3-A move when available else a generic cluster fallback; never invents a misconception; null when no priority cluster.
17. Banned-phrase lint passes over generated report text.
18. Output is deterministic.
19. Traceability fields are present.
20. No student-facing output, scoring/schema/DTO/UI/content changes.
21. Tests use synthetic-only data.

## Commands

Run:

```text
npx tsc --noEmit
npm run test:pssa-content
npm run test:pssa-db6
npm run test:pssa-pr-b
```

## Stop Conditions

Stop and report if:

- this spec is missing
- any item cannot be clustered
- any scoring/schema/DTO/UI/content change appears necessary
- cluster point totals require scoring changes
- non-MCQ handling would require new schema or scoring behavior

## Stop Report

Include:

- branch
- commit SHA
- files changed
- confirmation changed files are limited to new report module, tests, and spec
- cluster coverage proof for every item
- fake unclusterable failure proof
- band table used and incomplete-attempt proof
- provisional-score proof
- thin-cluster `limited_evidence` proof
- non-MCQ rows present-but-claim-free proof
- correct-only proof
- tie-breaker determinism proof
- banned-phrase lint result over generated text
- determinism proof
- traceability proof
- tsc result
- PSSA suite results
- confirmation of no schema/migration/scoring/DTO/UI/content changes
- confirmation tests use synthetic-only data
