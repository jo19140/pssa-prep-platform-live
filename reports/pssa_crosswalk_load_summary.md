# PSSA Crosswalk Load Summary

- Mode: write
- Env: dev
- Wrote to DB: yes
- Canonical crosswalk rows: 241
- Canonical CC join rows: 936
- Anomaly rows: 6

## Per Grade

| Grade | Rows |
|---:|---:|
| 3 | 33 |
| 4 | 37 |
| 5 | 40 |
| 6 | 41 |
| 7 | 43 |
| 8 | 47 |

## DB Reconcile Counts

- Crosswalk inserts: 0
- Crosswalk updates: 0
- Crosswalk noops: 241
- CC join inserts: 0
- CC join removes: 0
- CC join noops: 936

## Validation Gates

| Gate | Status | Notes |
|---|---|---|
| PSSA_XWALK_ROWCOUNT | PASS | Passed |
| PSSA_XWALK_COLUMNS_VALID | PASS | Passed |
| PSSA_XWALK_EC_FORMAT | PASS | Passed |
| PSSA_XWALK_NATURAL_KEY_UNIQUE | PASS | Passed |
| PSSA_XWALK_CC_FORMAT | PASS | Passed |
| PSSA_XWALK_ANOMALY_PRESERVED | PASS | Passed |
| PSSA_XWALK_NO_INVENTION | PASS | Passed |
| PSSA_XWALK_IDEMPOTENT | PASS | Passed |

## Traceability

- Zero invented EC, anchor, descriptor, or CC values: validation gate `PSSA_XWALK_NO_INVENTION` passed.
- File-only idempotency proves deterministic canonical output for the unchanged CSV.
- DB-aware idempotency: PASS (Post-write reconcile plan is a no-op for unchanged CSV.)

## Anomaly Raw Values

- E08.E.1.1.1: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
- E08.E.1.1.2: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
- E08.E.1.1.3: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
- E08.E.1.1.4: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
- E08.E.1.1.5: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
- E08.E.1.1.6: {"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency","humanConfirmed":false}
