# PSSA Grade 6 ELA — Tranche 1 Audit Report

Batch: `pilot_g6_tranche1_review_0001` · Status: **PENDING human review** · itemStatus: **candidate**

No database rows were written. This packet is held for review and must not be scaled until approved.

## Counts

| Metric | Count |
|---|---:|
| Passages | 3 |
| Reading MCQ | 9 |
| TDA | 3 |
| Conventions MCQ | 4 |
| Total items | 16 |

## 1. Passage repetition / padding

| Passage | Words | Unique sentence ratio | Repeated paragraphs | Repeated 3-grams | Result |
|---|---:|---:|---:|---:|---|
| Mapping the Hot Spots | 304 | 1.00 | 0 | 0 | PASS |
| The Seed Library | 300 | 1.00 | 0 | 0 | PASS |
| The Long Way Around | 343 | 1.00 | 0 | 0 | PASS |

## 2. Duplicate check

All normalized stems + answer-choice sets are unique within the tranche. Result: **PASS**.

## 3. Source / license

All passages and items use `sourceType = internal_original`, `licenseStatus = cleared_internal_original`, `commercialUseAllowed = true`, `needsLegalReview = false`, and `provenanceJson.containsAttributedQuotes = false`. Result: **PASS**.

## 4. Standards / crosswalk resolution

| Item | Type | eligibleContent | Anchor | Category | Resolution |
|---|---|---|---|---|---|
| pssa_item_g6_t1_heat_mcq_01 | MCQ | E06.B-K.1.1.2 | E06.B-K.1 | B | ALIGNED exact EC |
| pssa_item_g6_t1_heat_mcq_02 | MCQ | E06.B-K.1.1.3 | E06.B-K.1 | B | ALIGNED exact EC |
| pssa_item_g6_t1_heat_mcq_03 | MCQ | E06.B-C.2.1.2 | E06.B-C.2 | B | ALIGNED exact EC |
| pssa_item_g6_t1_heat_tda_01 | TDA | E06.E.1.1.2 | E06.E.1 | E | ALIGNED exact EC |
| pssa_item_g6_t1_seed_mcq_01 | MCQ | E06.B-K.1.1.1 | E06.B-K.1 | B | ALIGNED exact EC |
| pssa_item_g6_t1_seed_mcq_02 | MCQ | E06.B-C.2.1.1 | E06.B-C.2 | B | ALIGNED exact EC |
| pssa_item_g6_t1_seed_mcq_03 | MCQ | E06.B-V.4.1.1 | E06.B-V.4 | B | ALIGNED exact EC |
| pssa_item_g6_t1_seed_tda_01 | TDA | E06.E.1.1.4 | E06.E.1 | E | ALIGNED exact EC |
| pssa_item_g6_t1_long_mcq_01 | MCQ | E06.A-K.1.1.1 | E06.A-K.1 | A | ALIGNED exact EC |
| pssa_item_g6_t1_long_mcq_02 | MCQ | E06.A-K.1.1.2 | E06.A-K.1 | A | ALIGNED exact EC |
| pssa_item_g6_t1_long_mcq_03 | MCQ | E06.A-C.2.1.2 | E06.A-C.2 | A | ALIGNED exact EC |
| pssa_item_g6_t1_long_tda_01 | TDA | E06.E.1.1.5 | E06.E.1 | E | ALIGNED exact EC |
| pssa_item_g6_t1_conv_mcq_01 | MCQ | E06.D.1.1.1 | E06.D.1 | D | ALIGNED exact EC |
| pssa_item_g6_t1_conv_mcq_02 | MCQ | E06.D.1.1.4 | E06.D.1 | D | ALIGNED exact EC |
| pssa_item_g6_t1_conv_mcq_03 | MCQ | E06.D.1.2.1 | E06.D.1 | D | ALIGNED exact EC |
| pssa_item_g6_t1_conv_mcq_04 | MCQ | E06.D.2.1.2 | E06.D.2 | D | ALIGNED exact EC |

## 5. Answer-position distribution

| Position | Count | Percent | Result |
|---|---:|---:|---|
| A (0) | 4 | 30.8% | PASS |
| B (1) | 2 | 15.4% | PASS |
| C (2) | 4 | 30.8% | PASS |
| D (3) | 3 | 23.1% | PASS |

## 5b. Correct-answer length bias

| Metric | Value | Result |
|---|---:|---|
| Correct answer single-longest rate | 7.7% | PASS |
| Per-item blockers | 0 | PASS |
| Per-item warnings | 1 | WARN |

## 5c. Absolute-language distractors

Absolute-language distractor blockers: **0**. Result: **PASS**.

## 6. Student-preview answer-leak check

`tranche1_student_preview.md` contains only passage text, stems, choices, and TDA prompts. No keys, indices, rationales, expected claims, or rubrics. Result: **PASS**.

## 7. Item-quality checks

All MCQs have exactly one defensible answer, passage- or skill-specific distractors, balanced answer-choice lengths, no generic test-taking choices, no obvious absolute-language distractors, and four rationales. All TDA items have item-specific rubrics with expected claim, evidence guidance, explanation criteria, common weak responses, copied-text handling, and off-topic handling. Result: **PASS**.

## 8. Student-ready helper dry check

Every item is intentionally **EXCLUDED** from student-ready delivery because `reviewStatus = PENDING`, `itemStatus = candidate`, `approvalEligible = false`, `approvedAt = null`, and `reviewedBy = null`. Ignoring those deliberate human-review gates, source/license, exact EC alignment, answer key/rubric, preview leak, duplicate, passage repetition, and answer-position checks pass.

## Failed gates

None.

