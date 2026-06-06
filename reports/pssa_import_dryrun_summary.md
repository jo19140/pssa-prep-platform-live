# PSSA Import Dry-Run Summary

- Mode: file-only-dry-run
- 0 records written (DB-3 is dry-run only)
- Passages: 7 / expected 7
- Active items: 91 / expected 91
- Deprecated items: 12 / expected 12
- Supersessions: 12 / expected 12
- Batches: 8 / expected 8
- EC resolved: 103/103
- Approved or pilot_ready would-import records: 0
- Preview leak failures: 0
- Source scan failures: 0
- Hash stability: PASS
- Gate code: reused exported family audit functions and pure shared PSSA audit detectors; did not import top-level report-writing audit bundle.

## Manifest

| Record | Expected | Actual | Match |
|---|---:|---:|---|
| passage | 7 | 7 | PASS |
| item | 91 | 91 | PASS |
| deprecated | 12 | 12 | PASS |
| supersession | 12 | 12 | PASS |
| batch | 8 | 8 | PASS |

## Gate Tallies

| Gate | PASS | FAIL |
|---|---:|---:|
| PSSA_CONVENTIONS_FAMILY_AND_BATCH | 9 | 0 |
| PSSA_DRAG_DROP_FAMILY_AND_BATCH | 7 | 0 |
| PSSA_EBSR_FAMILY_AND_BATCH | 7 | 0 |
| PSSA_HOT_TEXT_FAMILY_AND_BATCH | 7 | 0 |
| PSSA_IMPORT_DEPRECATION_VALID | 12 | 0 |
| PSSA_IMPORT_EC_RESOLVES | 103 | 0 |
| PSSA_IMPORT_FAILCLOSED_DEFAULTS | 103 | 0 |
| PSSA_IMPORT_HASH_STABLE | 1 | 0 |
| PSSA_IMPORT_MANIFEST_VALID | 1 | 0 |
| PSSA_IMPORT_NO_LEAK | 103 | 0 |
| PSSA_IMPORT_RESPONSE_SHAPE_VALID | 103 | 0 |
| PSSA_IMPORT_SOURCE_COMPLIANCE | 1 | 0 |
| PSSA_ITEM_EC_GENRE_MATCH | 103 | 0 |
| PSSA_ITEM_EC_SKILL_MATCH | 40 | 0 |
| PSSA_ITEM_INTRA_CHOICE_DUPLICATE | 103 | 0 |
| PSSA_MATCHING_GRID_FAMILY_AND_BATCH | 7 | 0 |
| PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | 40 | 0 |
| PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | 40 | 0 |
| PSSA_MCQ_CORRECT_IS_LONGEST | 40 | 0 |
| PSSA_MCQ_PASSAGE_SPECIFICITY | 40 | 0 |
| PSSA_MCQ_PASSAGE_SPECIFICITY_BATCH | 1 | 0 |
| PSSA_MULTI_SELECT_FAMILY_AND_BATCH | 7 | 0 |
| PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | 103 | 0 |
| PSSA_PASSAGE_QUALITY | 1 | 0 |
| PSSA_SA_BANDS_NONEMPTY | 103 | 0 |
| PSSA_SHORT_ANSWER_FAMILY | 7 | 0 |
| PSSA_VOCAB_KEY_CONSTRUCT | 103 | 0 |
