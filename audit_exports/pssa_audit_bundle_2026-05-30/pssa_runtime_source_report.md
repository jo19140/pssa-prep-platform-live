# PSSA Runtime Source Report

Runtime policy: fail-closed governed allowlist only.

- Legacy database AssessmentQuestion rows: 1026
- Governed PSSA items: 0
- Student-ready governed PSSA items: 0
- Rows excluded from PSSA student runtime by construction: 1026

app/api/student/session/route.ts uses getStudentReadyPssaItems() and getStudentReadyPssaPassages() for PA/ELA assignments and returns 409 when no governed content is ready.
