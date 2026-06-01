# PSSA PR #4 — Governed Content Authoring (First Tranche, Review-Gated)

## What this is
Author a SMALL first tranche of original, governed PSSA Grade 6 items that match the approved exemplar exactly, export them as an audit packet, and STOP for human review. This is not the full pilot batch. Do not scale to other grades or to ~40 items/grade until this tranche is approved.

## Canonical reference (the quality bar)
The approved exemplar is the template. Every generated item must match its structure and clear its checklist:
- `exemplars/pssa_grade6/pssa_grade6_exemplar_student_preview.md`
- `exemplars/pssa_grade6/pssa_grade6_exemplar_backend.json`
- `exemplars/pssa_grade6/pssa_grade6_exemplar_answer_key_and_rubric.md`
- `exemplars/pssa_grade6/pssa_grade6_exemplar_audit_report.md`

## Hard rules
- Do NOT use the legacy `diagnosticGenerator.ts` / `buildToTarget()` path. It is quarantined (padding + answer-A bias). Author fresh original content into the governed `PssaItem` / `PssaPassage` shape.
- Do NOT write to the database in this PR. Produce review files only (same 4-file packet format as the exemplar). DB import happens later, after approval and after the migrations are applied.
- Everything is authored at `reviewStatus = PENDING`, `itemStatus = candidate`, `sourceType = internal_original`, `licenseStatus = cleared_internal_original`, `commercialUseAllowed = true`, `needsLegalReview = false`.
- Alignment must be by exact `eligibleContent` code drawn from `data/pssa/anchor_ec_crosswalk.csv` (Grade 6 rows only). No invented EC codes; no broad-CC guessing. Resolve `assessmentAnchor` / `reportingCategory` / `paCoreStandardCodes` from the crosswalk row.
- No fabricated attributed quotes. Any vivid comparison must be author-created, not attributed to a real person/source. Set `provenanceJson.containsAttributedQuotes = false`.

## Tranche contents (Grade 6 only)
Author exactly:
- 3 original passages: 2 informational + 1 literary, each 300–450 words, grade-6 reading level, repetition-clean (unique-sentence ratio ≥ 0.95, 0 repeated paragraphs, 0 repeated 3-grams).
- Per passage: 3 selected-response MCQs, each aligned to a DISTINCT Grade 6 reading EC (category A or B), plus 1 TDA aligned to an `E06.E.1.1.x` EC.
- 4 standalone conventions MCQs aligned to distinct `E06.D` ECs (no passage required).
- Total: 3 passages, 9 reading MCQs, 3 TDA, 4 conventions MCQs = 16 items.

## Per-item quality checklist (every item must pass)
MCQ:
- exactly one defensible correct answer
- distractors are passage-specific (or skill-specific for conventions): use a background detail, a too-narrow supporting detail, a tempting wrong-emphasis misreading, or a detail from the wrong part of the text
- NO generic test-taking choices ("the reader should guess", "only the title matters")
- NO absolute-language distractors ("never", "always", "only") as the obvious-wrong option
- answer-choice lengths balanced — the correct answer must NOT be consistently the longest or most academic-sounding option
- `correctIndex` assigned so the tranche's answer-position distribution is balanced (no position > 40% overall; not all A; not all the same)
- distractor rationales present for all four options

TDA:
- prompt requires analysis of how the author develops a specific idea, grounded in the passage
- item-specific rubric: expected claim, acceptable evidence (quoted/anchored to the passage), explanation criteria, common weak responses, copied-text handling, off-topic handling
- NOT generic ("rubric-scored essay", "answers will vary", "use evidence from the text")

## Required output (mirror the exemplar packet, per tranche)
Write to `exemplars/pssa_grade6_tranche1/`:
1. `tranche1_student_preview.md` — every passage + every item's student-facing view (stem + choices / TDA prompt). No keys, indices, or rubrics.
2. `tranche1_backend.json` — array of governed `PssaPassage` and `PssaItem` objects with all governance + alignment + validation + linter metadata (same fields as the exemplar backend).
3. `tranche1_answer_key_and_rubric.md` — MCQ keys + correctIndex + distractor rationales; TDA expected claim/evidence/rubric.
4. `tranche1_audit_report.md` — run the same 8 checks per item/passage, plus a tranche-level answer-position distribution table (count by index A/B/C/D) and a per-EC coverage table.

## Self-audit gates (report results; fail loudly)
- passage repetition / padding (per passage)
- exact-duplicate item detection within the tranche
- source/license completeness
- crosswalk resolution (every item ALIGNED by exact EC)
- answer-position distribution (no position > 40%)
- student-preview answer-leak check (no key/rubric in the student file)
- generic-distractor / absolute-language / choice-length-bias checks
- TDA rubric completeness
- student-ready helper dry check: every item must currently be EXCLUDED (because PENDING) but otherwise blocker-free

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
```
(No DB writes; no migration required for this PR.)

## STOP
After writing the four tranche files, stop and report:
- counts (passages, MCQ, TDA, conventions)
- answer-position distribution
- per-EC coverage
- any item that failed a gate (and why)
Do not generate additional grades or scale to ~40/grade until a human approves this tranche. The approved tranche becomes the proof that the full pilot batch can proceed.
