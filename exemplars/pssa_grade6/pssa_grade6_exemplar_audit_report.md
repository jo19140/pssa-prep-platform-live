# PSSA Grade 6 ELA — Exemplar Audit Report

Batch: `pilot_g6_exemplar_0001` · Status: **PENDING human review** · itemStatus: **candidate**

This packet is one passage + two items, run through the same checks the PSSA linter applies to the bank. All content is held at `reviewStatus = PENDING`; nothing here is student-ready until a human approves it.

## 1. Passage repetition / padding
| Metric | Value | Result |
|---|---|---|
| Paragraphs | 5 (5 unique) | PASS |
| Sentences | 23 (23 unique) | PASS |
| Unique-sentence ratio | 1.00 | PASS |
| Repeated paragraphs | 0 | PASS |
| Repeated 3-grams | 0 | PASS |
| Word count | 333 | within grade-6 range |

`PSSA_PASSAGE_REPEATED_PARAGRAPH`, `PSSA_PASSAGE_REPEATED_SENTENCE`, `PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED` → all clear. (Contrast: legacy bank had 100/101 passages failing, worst at 8.5% unique-sentence ratio.)

**Provenance refinement (rev 2):** the "crowded apartment building for wildlife" line was rewritten from a fabricated researcher quotation into an author-created comparison. No quotes are attributed to real people or uncited sources. `provenanceJson.containsAttributedQuotes = false`.

## 2. Duplicate check
- Both items have unique normalized stems + choices; not present in the legacy or generated pools.
- `PSSA_DUPLICATE_ITEM_EXACT`, `PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES` → clear.

## 3. Source / license
| Field | Passage | MCQ | TDA |
|---|---|---|---|
| sourceType | internal_original | internal_original | internal_original |
| licenseStatus | cleared_internal_original | cleared_internal_original | cleared_internal_original |
| commercialUseAllowed | true | true | true |
| needsLegalReview | false | false | false |

No PDE sampler text reused. `PSSA_LICENSE_REVIEW_REQUIRED`, `PSSA_OFFICIAL_CONTENT_NOT_FLAGGED` → clear.

## 4. Standards / crosswalk resolution
| Item | eligibleContent | Anchor | Category | Resolution |
|---|---|---|---|---|
| MCQ | E06.B-K.1.1.2 | E06.B-K.1 | B | ALIGNED (exact EC in crosswalk) |
| TDA | E06.E.1.1.2 | E06.E.1 | E | ALIGNED (exact EC in crosswalk) |

Both resolve against `data/pssa/anchor_ec_crosswalk.csv` by exact `eligibleContent` match → `ALIGNED` (not the broad-CC `NEEDS_REVIEW` path). Anchor and reportingCategory auto-populated from the crosswalk row.

## 5. Answer-position check
- MCQ `correctIndex = 2` (choice C). Not position A.
- `PSSA_ANSWER_POSITION_BIAS` → OK at the item level. (Batch-level distribution to be re-checked once the pilot batch exists, N ≥ 20.)

## 6. Student-preview answer-leak check
- `pssa_grade6_exemplar_student_preview.md` contains the passage, MCQ stem + four choices, and the TDA prompt only.
- No correct answer, correctIndex, rationale, expected claim, or rubric appears in the student file.
- `studentPreviewJson.leaksAnswer = false` for both items. → PASS.

## 7. Item-quality checks
- MCQ: single defensible answer; distractors are passage-specific (background detail, too-narrow supporting detail, tempting wrong-emphasis misreading); no generic test-taking choices; no absolute-language ("never"/"only") distractors; answer-choice lengths balanced so the key is not the longest option. `PSSA_DISTRACTOR_IRRELEVANT` → clear.
- TDA: item-specific rubric with expected claim, acceptable evidence, explanation criteria, weak-response notes, and copied-text/off-topic handling. `PSSA_TDA_RUBRIC_GENERIC`, `PSSA_TDA_EXPECTED_CLAIM_MISSING`, `PSSA_TDA_EVIDENCE_GUIDANCE_MISSING` → clear.

## 8. Student-ready helper result
`getStudentReadyPssaItems()` would **exclude** both items right now, correctly, because `reviewStatus = PENDING` and `itemStatus = candidate`. Every other gate (license cleared, anchor/EC present, answer key/rubric present, no duplicate/padding/position blockers, no preview leak) already passes — so a single human approval (`reviewStatus → APPROVED`, set `approvedAt`/`reviewedBy`, `itemStatus → pilot_ready`) is the only remaining step to make this item student-ready.

## Bottom line
The exemplar clears every automated gate; the only thing standing between it and student-ready is the deliberate human approval gate. If this is the quality bar you want, it becomes the spec every generated pilot item must match.
