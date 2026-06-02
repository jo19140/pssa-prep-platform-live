# PSSA Import Dry-Run Summary

- Mode: file-only-dry-run
- 0 records written (DB-3 is dry-run only)
- Passages: 5 / expected 5
- Active items: 67 / expected 67
- Deprecated items: 12 / expected 12
- Supersessions: 12 / expected 12
- Batches: 8 / expected 8
- EC resolved: 79/79
- Approved or pilot_ready would-import records: 0
- Preview leak failures: 0
- Source scan failures: 0
- Hash stability: PASS
- Gate code: reused exported family audit functions and pure shared PSSA audit detectors; did not import top-level report-writing audit bundle.

## Manifest

| Record | Expected | Actual | Match |
|---|---:|---:|---|
| passage | 5 | 5 | PASS |
| item | 67 | 67 | PASS |
| deprecated | 12 | 12 | PASS |
| supersession | 12 | 12 | PASS |
| batch | 8 | 8 | PASS |

## Gate Tallies

| Gate | PASS | FAIL |
|---|---:|---:|
| PSSA_CONVENTIONS_FAMILY_AND_BATCH | 9 | 0 |
| PSSA_DRAG_DROP_FAMILY_AND_BATCH | 5 | 0 |
| PSSA_EBSR_FAMILY_AND_BATCH | 5 | 0 |
| PSSA_HOT_TEXT_FAMILY_AND_BATCH | 5 | 0 |
| PSSA_IMPORT_DEPRECATION_VALID | 12 | 0 |
| PSSA_IMPORT_EC_RESOLVES | 79 | 0 |
| PSSA_IMPORT_FAILCLOSED_DEFAULTS | 79 | 0 |
| PSSA_IMPORT_HASH_STABLE | 1 | 0 |
| PSSA_IMPORT_MANIFEST_VALID | 1 | 0 |
| PSSA_IMPORT_NO_LEAK | 79 | 0 |
| PSSA_IMPORT_RESPONSE_SHAPE_VALID | 79 | 0 |
| PSSA_IMPORT_SOURCE_COMPLIANCE | 1 | 0 |
| PSSA_ITEM_EC_SKILL_MATCH | 28 | 0 |
| PSSA_MATCHING_GRID_FAMILY_AND_BATCH | 5 | 0 |
| PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | 28 | 0 |
| PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | 28 | 0 |
| PSSA_MCQ_CORRECT_IS_LONGEST | 28 | 0 |
| PSSA_MCQ_PASSAGE_SPECIFICITY | 28 | 0 |
| PSSA_MCQ_PASSAGE_SPECIFICITY_BATCH | 1 | 0 |
| PSSA_MULTI_SELECT_FAMILY_AND_BATCH | 5 | 0 |
| PSSA_PASSAGE_QUALITY | 1 | 0 |
| PSSA_SHORT_ANSWER_FAMILY | 5 | 0 |
