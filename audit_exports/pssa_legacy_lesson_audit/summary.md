# PSSA Legacy Lesson Audit

Generated: 2026-06-01T06:07:19.101Z

## Scope Guardrails

- Audit-only: no legacy lessons activated, imported, approved, rewritten, or written to the database.
- Every inventoried legacy lesson remains `QUARANTINED`.
- Current #4j-#4o detectors and contracts govern; archive generator or governance output does not override them.

## Inventory

- Sources inventoried: 8
- Lessons inventoried: 677
- Practice/check items normalized for audit: 8190
- Passage-quality detector rows: 16636
- MCQ passage-specificity detector rows: 2792
- Blocker findings: 80432
- Warning findings: 8113

## Recommendation Counts

- REAUTHOR_AGAINST_CANONICAL_CONTRACTS: 677

## Source Counts

- archive-readable-v2-samples: 10
- archive-token-budget-json-samples: 5
- archive-db-exported-lesson-bundles:audit_exports/pssa_audit_bundle_2026-05-30: 210
- archive-db-exported-lesson-bundles:audit_exports/pssa_audit_bundle_G4: 32
- archive-db-exported-lesson-bundles:audit_exports/pssa_audit_bundle_PR1: 210
- archive-db-exported-lesson-bundles:audit_exports/pssa_audit_bundle_TEST: 210

## Missing Sources

- state-track-v2-json-samples: state-track/pssa-v2-lessons-and-tei-player | origin/state-track/pssa-v2-lessons-and-tei-player audit/v2-samples/*.json -> Named state-track branch/ref and audit/v2-samples/*.json were not accessible from the local repository or fetched origin refs.

## Readout

The accessible legacy lesson corpus is useful as design/reference material, but the audited records are not student-ready under the canonical contracts. The dominant blockers are missing canonical `responseSpec` / scoring shapes and backend-answer leakage in legacy lesson exports. Passage and item detectors also surface repair work where passages or choices are generic, repetitive, or insufficiently evidence-linked.

Reports:

- `source_inventory.csv`
- `lesson_inventory.csv`
- `gate_findings.csv`
- `practice_item_findings.csv`
- `passage_quality_report.csv`
- `mcq_passage_specificity_report.csv`
- `ec_skill_match_report.csv`
- `surface_shortcut_report.csv`
- `absolute_language_report.csv`

