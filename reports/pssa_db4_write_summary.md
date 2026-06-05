# PSSA DB-4 Write Summary

- DB target: postgresql://(user):(redacted)@127.0.0.1:5433/pssa_dev
- Import run id: cmq0vwgi100012wpyyl82lm1l
- Crosswalk rows: 241
- Crosswalk join rows: 936
- Passages: 7
- Items: 103
- Active candidate items: 91
- Deprecated items: 12
- Batches: 8
- Supersessions: 12
- EC resolved: 103/103
- Approved items: 0
- Pilot-ready items: 0
- Student-ready items: 0
- Untouched existing app table rows: Assessment=0, AssessmentQuestion=0, AssessmentPassage=0, DiagnosticItem=0, User=0, TeacherProfile=0, StudentProfile=0, Assignment=0
- DB-3 plan gate failures: 0
- Source scan failures: 0
- Hash stability: PASS

## Batch Membership

| Batch | Items |
|---|---:|
| reading_mcq_grade3 | 40 |
| ebsr_grade3 | 7 |
| multi_select_grade3 | 7 |
| hot_text_grade3 | 7 |
| matching_grid_grade3 | 7 |
| drag_drop_grade3 | 7 |
| conventions_grade3 | 9 |
| short_answer_grade3_pool | 7 |

## Content Mutations

| Table | Inserts | Updates | Deletes | Noops | Drift |
|---|---:|---:|---:|---:|---:|
| PssaPassage | 0 | 0 | 0 | 7 | 0 |
| PssaItemBatch | 0 | 0 | 0 | 8 | 0 |
| PssaItem | 0 | 0 | 0 | 103 | 0 |
| PssaItemPassageLink | 0 | 0 | 0 | 82 | 0 |
| PssaItemSupersession | 0 | 0 | 0 | 12 | 0 |

## Guardrails

- Import did not approve content.
- Import did not build student-facing selection.
- Import did not build form assembly.
- No governed content deletions are implemented in DB-4.
