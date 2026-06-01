# PSSA PR #2.5 — Anchor/Eligible-Content Crosswalk Infrastructure (+ schema-drift check)

## Why this PR
After PR #2, **zero** PSSA content can become student-ready: 1,344 items are blocked on missing `assessmentAnchor`/`eligibleContent`, and items are flagged `alignmentStatus = NEEDS_CROSSWALK`. A perfect generator (PR #3) and a perfect exemplar (PR #4) still produce zero approvable items until the PA Assessment Anchor / Eligible Content (EC) crosswalk exists. This PR builds the crosswalk infrastructure so alignment can be resolved.

## Hard rule on data provenance
**Do not generate, infer, or hallucinate Eligible Content codes, Assessment Anchor codes, descriptors, or CC↔EC mappings.** All crosswalk data comes from a human-vetted seed file sourced from PDE's official Assessment Anchors & Eligible Content documents. Codex builds the table, importer, validation, and wiring — not the data. Ship with a small SAMPLE seed only; the full seed is supplied separately.

## What this PR is NOT
- NOT a content-regeneration or generator-fix PR
- NOT a student-UI PR
- It does not auto-approve any content. It only enables alignment so items *can* later be approved.

---

## Step 0 — Investigate live-schema drift (read-only, report first)
PR #2 flagged that `prisma migrate diff` surfaced pre-existing destructive drift between `schema.prisma` and the live DB, unrelated to PSSA work. Before any further migration is applied:
- Run a read-only diff of the live database against `schema.prisma`.
- Produce `pssa_schema_drift_report.md`: what objects differ, whether the drift is additive or destructive, likely origin, and whether applying the PR #2 governed-PSSA migration is safe on top of it.
- Do **not** "fix" the drift in this PR. Report only. If applying the PR #2 migration is unsafe until drift is resolved, say so and stop.

---

## Schema additions (additive migration, `--create-only` / hand-written SQL, do NOT auto-apply)

Add a crosswalk model the governance layer can join against:

`PssaStandardsCrosswalk`
- `id`
- `subject` (e.g. ELA)
- `gradeLevel` (3–8)
- `reportingCategory` (code + title)
- `assessmentAnchor` (code, e.g. the anchor identifier)
- `anchorDescriptor` (code + text)
- `eligibleContent` (code — the most specific level)
- `eligibleContentText` (descriptor)
- `dokCeiling` (nullable — typical DOK if PDE specifies)
- `paCoreStandardCodes` (relation/array — the CC.* codes that map to this EC; many-to-many)
- `sourceDocument` (e.g. "PDE 2014 Grade 3 ELA AA&EC")
- `sourceVersionYear`
- `active`
- `createdAt`, `updatedAt`

Add a join/lookup the other direction so an item tagged with a `standardCode` (CC.*) OR an `eligibleContent` code resolves to its full chain. Unique constraint on `(subject, gradeLevel, eligibleContent, sourceVersionYear)`. Index `(subject, gradeLevel)` and `(eligibleContent)`.

Migration must be additive only — no drops, no mutation of existing tables. Generate reviewable SQL; do not auto-apply.

---

## Importer
`scripts/content/import-pa-pssa-anchor-ec-crosswalk.ts` (replace the existing stub):
- Reads a structured seed file: `data/pssa/anchor_ec_crosswalk.csv` (and/or `.json`).
- Seed columns: `subject, gradeLevel, reportingCategory, reportingCategoryTitle, assessmentAnchor, anchorDescriptor, anchorDescriptorText, eligibleContent, eligibleContentText, dokCeiling, paCoreStandardCodes (pipe-separated), sourceDocument, sourceVersionYear`.
- Upserts by the unique key; idempotent; never deletes existing rows unless `--replace-version` is passed for a specific `sourceVersionYear`.
- Ship a SAMPLE seed of ~5 real-format rows clearly marked `SAMPLE — REPLACE WITH VETTED FULL SEED`. Do not fabricate beyond placeholder structure.

## Validation (fail the import on bad data)
- Every `eligibleContent` matches the official EC code shape. Use a documented regex (confirm against PDE docs before trusting it), e.g. `^E0[3-8]\.[A-Z](-[A-Z]+)?(\.\d+){2,3}$`, and **report**, don't silently pass, anything that doesn't match.
- Every row has subject, gradeLevel (3–8), reportingCategory, assessmentAnchor, eligibleContent, eligibleContentText, sourceDocument.
- No duplicate EC codes within a (subject, grade, version).
- Every `paCoreStandardCodes` value is non-empty OR explicitly marked `NO_CC_MAPPING` (don't let blanks pass silently).
- Emit `pssa_crosswalk_validation_report.csv`: `rowRef, field, issue, severity`.

---

## Governance wiring
- When a `PssaItem`/`PssaLesson` has a `standardCode` and/or `eligibleContent`, the governance layer resolves the chain from `PssaStandardsCrosswalk` and can populate `assessmentAnchor`, `reportingCategory`, `eligibleContent` (if derivable), and `dokLevel` ceiling.
- Flip `alignmentStatus` from `NEEDS_CROSSWALK` to `ALIGNED` only when a confident EC match exists; use `NEEDS_REVIEW` when only a broad CC match exists with no single EC.
- The approval guards from PR #2 stay as-is — this PR just lets items legitimately satisfy the anchor/EC requirement.
- Do **not** mass-update legacy `AssessmentQuestion` rows. Resolution applies to governed `PssaItem` rows only.

## Reports
- `pssa_schema_drift_report.md`
- `pssa_crosswalk_validation_report.csv`
- `pssa_crosswalk_coverage_report.csv` — per subject/grade: # reporting categories, # anchors, # EC codes loaded; and **how many existing governed items would flip out of NEEDS_CROSSWALK** once a real seed is loaded (run against current data, even if that's 0 governed items today).

## Tests
1. Importer upserts the sample seed idempotently (re-run = no change).
2. A malformed EC code in the seed fails validation and does not import.
3. A blank `paCoreStandardCodes` without `NO_CC_MAPPING` fails validation.
4. An item with a resolvable EC flips `alignmentStatus` to `ALIGNED`; an item with only a broad CC match goes `NEEDS_REVIEW`, not `ALIGNED`.
5. Crosswalk resolution never touches legacy `AssessmentQuestion` rows.
6. Migration is additive — existing tables unchanged.

## Verification
```
npx prisma validate
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```

## Out of scope (stubs only)
No generator fixes, no content generation, no UI, no drift remediation, no full seed authoring.

## Final output required from Codex
1. Schema-drift report + verdict on whether the PR #2 migration is safe to apply.
2. New `PssaStandardsCrosswalk` model + additive migration SQL (not applied).
3. Importer + validation implementation.
4. Governance wiring summary (how alignmentStatus resolves).
5. Sample-seed coverage report.
6. Test output.
7. Explicit note that the FULL vetted seed is a human deliverable and the system is blocked on it.
```
