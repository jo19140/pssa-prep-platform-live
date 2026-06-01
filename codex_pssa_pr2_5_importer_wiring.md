# PSSA PR #2.5 — Crosswalk Importer Wiring (canonical seed ready)

Proceed with the PR #2.5 importer/wiring step. The vetted full crosswalk seed now exists:

```
data/pssa/anchor_ec_crosswalk.csv
```

This is the human-vetted PSSA ELA crosswalk for grades 3–8, transcribed from the official PDE Assessment Anchors & Eligible Content documents (April 2014, Updated 2017). It is the source of truth. Build the importer/validation/wiring around it; do not infer or regenerate any of its contents.

## Expected coverage (fail the import if these don't match)
```
Grade 3: 33 EC rows
Grade 4: 37 EC rows
Grade 5: 40 EC rows
Grade 6: 41 EC rows
Grade 7: 43 EC rows
Grade 8: 47 EC rows
Total:   241 EC rows
Columns: 19
```

## Seed policy (do not violate)
- The seed is authoritative for `eligibleContent`, `assessmentAnchor`, `anchorDescriptor`, `eligibleContentText`, `reportingCategory`, and `paCoreStandardCodes`.
- `primaryPaCoreStandardCode` must remain blank for now (human-curated only).
- `mappingGranularity` must remain `ANCHOR_BLOCK`.
- `mappingConfidence` must remain `SOURCE_ANCHOR_LEVEL`.
- Do not auto-infer `eligibleContent` from broad PA Core standards.
- Do not mass-update legacy `AssessmentQuestion` rows. Resolution applies only to governed `PssaItem` / `PssaLesson` rows.

## Alignment resolution rule
```
Exact eligibleContent match            -> ALIGNED
Broad CC-only match                    -> NEEDS_REVIEW (never ALIGNED)
No match                               -> NEEDS_CROSSWALK
```
A mapping carrying an unconfirmed anomaly (see below) must NOT resolve an item to `ALIGNED`.

## Source anomaly field (new — must be ingested, not dropped)
The seed includes a `sourceAnomalyJson` column. It is blank for all rows except the six Grade 8 TDA rows (`E08.E.1.1.1`–`E08.E.1.1.6`), which carry:
```json
{"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
```
Requirements:
- Parse and store `sourceAnomalyJson` on the `PssaStandardsCrosswalk` row (or its EC/CC join row). Do not discard it.
- A crosswalk row whose anomaly has `humanConfirmed=false` must never let a governed item resolve to `ALIGNED` (hold at `NEEDS_REVIEW`).
- Surface a count of crosswalk rows carrying an unconfirmed anomaly in the coverage report.

## Importer requirements
1. Parse the CSV strictly (RFC-4180 quoting; the seed contains quoted commas, parentheses, semicolons, and embedded JSON).
2. Validate all 241 rows before any write.
3. Fail import on any malformed EC code (must match the official `E0[3-8].<anchor>.<n>.<n>.<n>` pattern).
4. Fail import on duplicate `eligibleContent` within `subject + gradeLevel + sourceVersionYear`.
5. Fail import if `paCoreStandardCodes` is blank unless explicitly `NO_CC_MAPPING`.
6. Normalize pipe-separated `paCoreStandardCodes` into the `PssaCrosswalkPaCoreStandard` join table.
7. Upsert idempotently by `subject + gradeLevel + eligibleContent + sourceVersionYear`.
8. Do not delete existing rows unless `--replace-version` is explicitly passed.
9. Run a dry-run first (no writes) and print the planned changes.
10. Produce the reports below.

## Required reports
- `pssa_crosswalk_validation_report.csv`
- `pssa_crosswalk_coverage_report.csv`
- `pssa_alignment_resolution_report.csv`
- `pssa_crosswalk_import_log.md`

Coverage report must show: rows by grade; rows by reportingCategory; rows by assessmentAnchor; EC codes loaded; PA Core mappings created in the join table; rows carrying an unconfirmed `sourceAnomalyJson`; governed items resolving `NEEDS_CROSSWALK -> ALIGNED`; governed items resolving to `NEEDS_REVIEW` from broad CC-only matches; governed items remaining `NEEDS_CROSSWALK`.

## Verification
```
npx prisma validate
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```

## Expectation
This crosswalk supplies the official alignment spine; it does not make the legacy bank "ready." Items tagged only with broad PA Core standards (e.g., `CC.1.2.5.A`) should resolve to `NEEDS_REVIEW`, not `ALIGNED`. True `ALIGNED` status comes later from new/revised items authored directly against an EC code. Report dry-run output and the coverage + alignment-resolution reports before any `--replace-version` or write that changes item status.
