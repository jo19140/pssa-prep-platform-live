# PSSA PR #4b — Full Pilot Batch (grades 3–8, gated, grade-by-grade)

The Grade 6 tranche is approved. Its quality bar is now enforced by the linter gates, not just by authoring. Scale to a full pilot batch using the SAME governed authoring path and the SAME four-file packet format. Author review files only — no DB writes.

## Generate
~40 governed items per grade for grades 3, 4, 5, 6, 7, 8 (~240 total). Grade 6 already has its 16-item tranche — extend it to ~40 rather than regenerating.

### Per-grade composition
- Multiple original passages (mix of literary + informational), each 300–500 words, repetition-clean.
- Reading MCQs spread across DISTINCT ECs in categories A and B (don't reuse the same EC repeatedly).
- TDA items aligned to the `E0x.E.1.1.x` ECs — **grades 4–8 only**. Grade 3 has no Text-Dependent Analysis category; grade 3 = reading MCQ + conventions MCQ only.
- Standalone conventions MCQs across distinct `E0x.D` ECs.
- Keep counts roughly even (~40/grade). Do NOT overweight grade 6. The legacy bank's grade-6 dominance (72%) is a defect we are correcting.

### Alignment
Every item aligned by exact `eligibleContent` from `data/pssa/anchor_ec_crosswalk.csv` (matching grade). Resolve anchor / reportingCategory / paCoreStandardCodes from the crosswalk row. No invented EC codes, no broad-CC guessing.

### Governance
All passages and items: `reviewStatus = PENDING`, `itemStatus = candidate`, `sourceType = internal_original`, `licenseStatus = cleared_internal_original`, `commercialUseAllowed = true`, `needsLegalReview = false`. No fabricated attributed quotes (`provenanceJson.containsAttributedQuotes = false`).

## Hard gates (ALL blockers — fail the grade if any trips)
- `PSSA_ANSWER_POSITION_BIAS` — no answer position > 40% within a grade.
- `PSSA_MCQ_CORRECT_IS_LONGEST` — per item: blocker if correct is single longest by 2+ words or 15%+ chars; warning if by 1 word; per grade: blocker if correct is single longest in > 35% of MCQs.
- `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR` — no never/always/only/every/all/none/must/cannot in a distractor (word-boundary).
- `PSSA_PASSAGE_REPEATED_PARAGRAPH` / `_SENTENCE` / `_GENERATION_PADDING_SUSPECTED` — passages clean (unique-sentence ratio ≥ 0.95).
- `PSSA_DUPLICATE_ITEM_EXACT` / `_WITH_REORDERED_CHOICES` — no duplicate stems/choices within or across grades.
- exact EC alignment for every item.
- no answer/rationale/rubric leak in any student-preview file.
- TDA rubric completeness (expected claim, acceptable evidence, explanation criteria, weak responses, copied-text + off-topic handling).
- single defensible MCQ answer; passage-specific distractors; no generic test-taking choices.

## Run grade-by-grade with stop-on-failure
For each grade in order (3, 4, 5, 7, 8; grade 6 = extend existing):
1. Author the grade's items.
2. Run all gates.
3. If any blocker trips, STOP, report the failures, and do not proceed to the next grade.
4. If clean, export the grade's four packet files to `exemplars/pssa_grade<N>_pilot/`:
   - `pilot_student_preview.md`, `pilot_backend.json`, `pilot_answer_key_and_rubric.md`, `pilot_audit_report.md`

## Combined batch summary
After all grades pass, also write `exemplars/pssa_pilot_batch_summary.md` showing, per grade: item counts by type, distinct EC coverage, answer-position distribution, correct-is-longest rate, absolute-language count (expect 0), passage repetition results, and total student-ready-blocker count (expected: all items blocked only by `PENDING`).

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
No DB writes. No migration required for this PR.

## Additional requirements (rev 2)

### 1. Fact-check metadata (informational passages)
Every informational/nonfiction passage must include:
```
"factCheckStatus": "HUMAN_REVIEW_REQUIRED",
"factualClaimsReviewed": false
```
`internal_original` + license-cleared means copyright-safe, NOT automatically fact-checked. (After a human reviews factual claims, these become `CLEARED_BY_HUMAN_REVIEW` / `true`.) Literary fiction passages do not need this.

### 2. Topic diversity
Across each grade, vary passage topic domains: science/nature, history/social studies, school/community, arts/culture, everyday problem-solving, literary fiction. No single topic domain may cover more than 40% of a grade's passages. (The existing Grade 6 tranche is science/nature-heavy — diversify as it extends to ~40.)

### 3. EC coverage minimums (per grade)
- Use at least 20 distinct `eligibleContent` codes.
- Do not use any single EC more than 3 times.
- Include category A and B reading ECs, category D conventions ECs, and category E/TDA ECs where applicable.
- Grade 3 has no TDA/E category — do not fabricate one.

### 4. Conventions items (category D)
Standalone conventions MCQs must have: passage-free student previews, exactly one clear correct answer, plausible skill-specific distractors, no answer-length cue (same `PSSA_MCQ_CORRECT_IS_LONGEST` rule), no absolute-language distractors, and exact `E0x.D` EC alignment.

### 5. Reporting language
Because this PR writes files only and does not run the DB helper, report a **simulated student-ready blocker count**: every item should be blocked only by `reviewStatus = PENDING` / `itemStatus = candidate` — never by missing metadata, license, alignment, audit, duplicate, answer-position, answer-length, preview-leak, or rubric issues.

## Stop
After generation, report per-grade counts, EC coverage (distinct ECs + max-per-EC), topic-domain distribution, the gate results table, and the simulated student-ready blocker count. Do NOT import to the database or set anything to APPROVED. Human review of the per-grade audit summaries + spot-check is the next gate, followed by the dev-DB import once the migrations are applied.
