# PSSA PR #2 — Governed PSSA Content Layer (Step-0 Model Decision + Legacy Quarantine)

## Context
The PSSA audit showed the current PSSA bank is structurally unsafe as production content:
- answer choices are mechanically keyed — MCQs have `correctIndex` hardcoded to 0 (100% across every grade group)
- ~300 unique item groups out of 1,344 rows; the rest are duplicates
- 100 of 101 passages are padded/repeated (worst have an 8.5% unique-sentence ratio)
- grade coverage is lopsided (grade 6 = 72% of items)
- active PSSA rows (`AssessmentQuestion`) have **no** enforceable governance fields: no `itemStatus`, `reviewStatus`, `licenseStatus`, `sourceType`, or student-ready approval gate
- Assessment Anchor / Eligible Content mapping does not exist yet

## What this PR is NOT
- NOT a content-regeneration PR
- NOT a generator-rewrite PR (read-only investigation notes only)
- NOT a student-facing UI PR

This PR only:
1. Inspects existing models and recommends the correct governed PSSA model strategy.
2. Quarantines legacy PSSA content, fail-closed.
3. Adds/prepares the governed PSSA content schema.
4. Adds student-ready helpers and approval guards.
5. Adds reports/tests proving legacy content cannot leak to students.
6. Stops before generator repair or content regeneration.

Hard rules:
- Do not delete `AssessmentQuestion` or drop existing PSSA rows.
- Do not rewrite or regenerate PSSA items/passages/lessons.
- Do not run destructive migrations.
- **Do not guess when the model choice is ambiguous — stop and report.**

---

## Step 0 — Model decision BEFORE writing any migration

Inspect:
- `prisma/schema.prisma`, `AssessmentQuestion` and related PSSA tables
- `DiagnosticItem` / content-v3 literacy models
- any PSSA lesson/passage models
- student runtime routes serving PSSA content
- admin/review routes for PSSA content
- PSSA generator/import files
- content-v3 review helpers (student-ready helpers, approval guards)

Recommend ONE path:
- **Option A — Extend `AssessmentQuestion`** if it's the real PSSA production model and can be safely upgraded.
- **Option B — New governed `PssaItem` / `PssaPassage` / `PssaLesson` models** if `AssessmentQuestion` is too generic, polluted, or risky to mutate.
- **Option C — Reuse `DiagnosticItem`** ONLY if it is NOT coupled to PhasePosition / DailyTarget / phonics routing. If `DiagnosticItem` is literacy-specific, do not reuse it for PSSA.

Report before migration: recommended option + reasoning; whether `DiagnosticItem` is coupled to literacy phases/daily targets; whether `AssessmentQuestion` can be safely extended; which runtime routes must switch to the governed source; migration risk; rollback plan.

**Stopping here is a successful outcome.** If the model choice is ambiguous, STOP after this report and wait for human approval of the model direction before writing the migration. Do not proceed to 2B on a guessed model.

---

## PR scope: 2A + 2B only

Included: 2A (quarantine legacy bank), 2B (governed schema / helpers / guards).
Excluded — leave TODO stubs only, do not implement: 2C generator fix, 2D content regeneration, 2E student UI, 2F lesson rewrite, 2G passage generation.

---

## 2A — Fail-closed legacy quarantine

Quarantine must be **fail-closed (allowlist), not fail-open (blocklist).**
- Student runtime reads PSSA content **only** through the governed student-ready helper.
- Any legacy row not in the governed student-ready source is excluded by construction.
- Legacy `AssessmentQuestion` rows are preserved for audit/reference but are never student-ready unless migrated into the governed model and passing all gates.

The student-facing PSSA runtime must never query raw `AssessmentQuestion`, raw `reviewStatus = APPROVED`, raw generated/database pools, or legacy PSSA tables directly. It may only use the canonical helpers.

Treat legacy content as: `legacy_generated`, `not_student_ready`, `requires_regeneration_or_review`, source/license unresolved unless proven otherwise.

---

## 2B — Governed PSSA schema (after Step-0 decision)

If extending `AssessmentQuestion`: additive, reversible migration only.
If creating new models: `PssaItem`, `PssaPassage`, `PssaLesson`, `PssaGenerationBatch`, and a `PssaReviewLog` (or reuse an existing compatible review log).

**Keep audit/linter output OFF the content row.** Store derived audit results in a separate `PssaAuditResult` / `PssaLinterRun` table keyed by `(itemId, batchId, ruleId)`. Rationale: re-auditing must not mutate the content table or bump `updatedAt`, and you want historical audit runs (trend reports across batches), not just the latest. The student-ready helper joins the latest run to check "no open blockers." Do **not** denormalize `linterResultsJson`, `answerPositionAuditJson`, `validationMetadataJson`, or `duplicateGroupId` onto the item.

**Define `sourceType` as an explicit enum**, including at minimum: `internal_original`, `owned`, `open_license`, `PDE_SAMPLER`, `OFFICIAL_RELEASED_ITEM`, `legacy_generated`, `unknown`. The official-content approval guard checks against `PDE_SAMPLER` / `OFFICIAL_RELEASED_ITEM`.

Required PSSA item fields:
`id, module=PSSA, subject, gradeLevel, standardCode, assessmentAnchor, eligibleContent, reportingCategory, dokLevel, itemType, skill, difficultyBand, studentFacingPrompt, studentFacingStimulus, answerChoicesJson, correctAnswer, correctIndex, expectedResponseJson, scoringRubricJson, distractorRationalesJson, sourceType (enum), sourceName, sourceCitation, licenseStatus, commercialUseAllowed, needsLegalReview, reviewStatus, itemStatus, alignmentStatus, approvalEligible, approvedAt, reviewedBy, studentPreviewJson, generationBatchId, provenanceJson, retiredAt, createdAt, updatedAt`

Required PSSA passage fields:
`id, title, gradeLevel, subject, passageType, text, wordCount, sourceType (enum), sourceName, sourceCitation, licenseStatus, commercialUseAllowed, needsLegalReview, reviewStatus, itemStatus, approvedAt, reviewedBy, linkedItemIds (relation), provenanceJson, retiredAt, createdAt, updatedAt`

Required PSSA lesson fields:
`id, title, gradeLevel, subject, standardCode, assessmentAnchor, eligibleContent, objective, lessonPartsJson, practiceItemIds (relation), exitTicketItemIds (relation), sourceType (enum), licenseStatus, reviewStatus, itemStatus, approvedAt, reviewedBy, provenanceJson, retiredAt, createdAt, updatedAt`

---

## Assessment Anchor / Eligible Content dependency

Do not let the generator invent anchor/EC mappings.
- Approval guard blocks missing `assessmentAnchor` or `eligibleContent`.
- Do not expect items to become student-ready until the official PA crosswalk is loaded.
- Add a report counting records blocked solely because the crosswalk is missing.
- Add stub `scripts/content/import-pa-pssa-anchor-ec-crosswalk.ts`.
- If the crosswalk is not loaded, mark items `alignmentStatus = NEEDS_CROSSWALK`, `approvalEligible = false`. Never hallucinate anchor/EC codes.

---

## Student-ready helpers
Implement `getStudentReadyPssaItems()`, `countStudentReadyPssaItems()`, `getStudentReadyPssaPassages()`, `getStudentReadyPssaLessons()`.

An item is student-ready ONLY if: `reviewStatus = APPROVED`; `itemStatus` in {pilot_ready, active}; `retiredAt = null`; `sourceType` present; `licenseStatus` in {cleared_internal_original, cleared_owned, cleared_open_license}; `commercialUseAllowed = true`; `needsLegalReview = false`; `standardCode`, `assessmentAnchor`, `eligibleContent`, `itemType`, `skill` all present; answer key present; scoring rubric present when needed; `studentPreviewJson` present; latest audit run has no blocker (duplicate / passage-repetition / answer-position); `approvedAt` and `reviewedBy` present. The student runtime uses only these helpers.

---

## Approval guards
Add `canApprovePssaItem(item)`, `canApprovePssaPassage(passage)`, `canApprovePssaLesson(lesson)`. Block approval if any: source/license not cleared; `needsLegalReview = true`; `commercialUseAllowed != true`; `assessmentAnchor` missing; `eligibleContent` missing; alignment too broad; answer key missing; `correctIndex` missing for selected-choice; scoring rubric missing for TDA/open-response; duplicate blocker; passage-repetition blocker; answer-position audit fails for the batch; student preview leaks correct answer; generic/boilerplate answer choices; `approvedAt`/`reviewedBy` missing; linter blockers; content is `PDE_SAMPLER`/`OFFICIAL_RELEASED_ITEM` but not properly flagged. Raw `reviewStatus = APPROVED` must never imply student-ready.

---

## Migration rules
Additive and reversible. Do not drop `AssessmentQuestion` or delete PSSA records. Do not migrate legacy content into active/student-ready status automatically. **Generate the migration with `prisma migrate dev --create-only` so the SQL is produced for human review and NOT auto-applied** — output the SQL and stop for confirmation before applying. Flag any change touching existing production tables.

---

## Reports to add
`pssa_model_decision_report.md`, `pssa_legacy_quarantine_report.csv`, `pssa_student_ready_report.csv`, `pssa_source_license_report.csv`, `pssa_standards_alignment_report.csv`, `pssa_approval_guard_report.csv`, `pssa_runtime_source_report.md`.
Show: total legacy PSSA rows; total governed PSSA items; total student-ready items; rows excluded from runtime; blocker reasons; source/license unresolved count; missing anchor/EC count; approved-but-not-student-ready count; any runtime routes still querying legacy tables.

---

## Tests
1. Student runtime does not query raw `AssessmentQuestion` for PSSA items.
2. `getStudentReadyPssaItems` excludes legacy rows by construction.
3. Raw `reviewStatus = APPROVED` is insufficient for student-ready.
4. `licenseStatus = review_required` blocks approval.
5. `needsLegalReview = true` blocks approval.
6. Missing `assessmentAnchor` blocks approval.
7. Missing `eligibleContent` blocks approval.
8. Missing `correctAnswer`/`correctIndex` blocks selected-choice approval.
9. Missing `scoringRubricJson` blocks TDA/open-response approval.
10. Duplicate blocker prevents student-ready.
11. Repeated-passage blocker prevents student-ready.
12. `PDE_SAMPLER`/`OFFICIAL_RELEASED_ITEM` content without proper flag blocks approval.
13. Approved item without `approvedAt`/`reviewedBy` fails consistency.
14. Legacy PSSA content is not served even if present in the DB.
15. Migration is additive and does not drop existing `AssessmentQuestion` records.

## Verification
```
npx prisma validate
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
If `test:pssa-content` or `content:audit-pssa` don't exist, add minimal scripts or report and create TODOs.

---

## Out of scope for PR #2 (stubs only)
Do NOT: fix `diagnosticGenerator.ts` (inspect/report only); regenerate the bank; generate new items; build student UI; rewrite passages/lessons; randomize answer choices; rebalance grades; load content into student-ready status.

## NEXT_STEPS.md stubs to leave
- **PR #3 — Generator root-cause fix:** correctIndex hardcoding, `buildToTarget()` padding/repetition, duplicate persistence, deterministic template reuse, grade imbalance; add post-generation answer-position rotation and pre-insert duplicate prevention.
- **PR #4 — Exemplar review gate (before regeneration):** produce ONE grade-6 PSSA ELA passage + one selected-choice item with passage-specific distractors + one TDA item, fully governed (anchor/EC, balanced non-A key, source/license, student preview, rubric). Stop for human review of the exemplar before generating the pilot batch.

---

## Final output required from Codex
1. Step-0 model recommendation + reasoning.
2. Whether `DiagnosticItem` is too coupled to literacy phases/daily targets.
3. Whether `AssessmentQuestion` was extended or a new PSSA model created.
4. Migration SQL (from `--create-only`, not applied).
5. Files changed.
6. Student-ready helper implementation.
7. Approval guard implementation.
8. Runtime routes changed to fail-closed.
9. Legacy quarantine report.
10. Source/license blocker count.
11. Anchor/EC blocker count.
12. Test output.
13. Any ambiguity needing a human decision.

If model direction is unclear, STOP after Step 0 and ask. Do not guess.
