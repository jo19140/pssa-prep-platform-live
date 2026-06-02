# PSSA DB-4 Write Summary

- DB target: postgresql://(user):(redacted)@localhost:5433/pssa_dev
- Import run id: cmpx0pxa80001bjqhqownbsp3
- Crosswalk rows: 241
- Crosswalk join rows: 936
- Passages: 5
- Items: 79
- Active candidate items: 67
- Deprecated items: 12
- Batches: 8
- Supersessions: 12
- EC resolved: 79/79
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
| reading_mcq_grade3 | 28 |
| ebsr_grade3 | 5 |
| multi_select_grade3 | 5 |
| hot_text_grade3 | 5 |
| matching_grid_grade3 | 5 |
| drag_drop_grade3 | 5 |
| conventions_grade3 | 9 |
| short_answer_grade3_pool | 5 |

## Content Mutations

| Table | Inserts | Updates | Deletes | Noops | Drift |
|---|---:|---:|---:|---:|---:|
| PssaPassage | 0 | 0 | 0 | 5 | 0 |
| PssaItemBatch | 0 | 0 | 0 | 8 | 0 |
| PssaItem | 0 | 0 | 0 | 79 | 0 |
| PssaItemPassageLink | 0 | 0 | 0 | 58 | 0 |
| PssaItemSupersession | 0 | 0 | 0 | 12 | 0 |

## Guardrails

- Import did not approve content.
- Import did not build student-facing selection.
- Import did not build form assembly.
- No governed content deletions are implemented in DB-4.
