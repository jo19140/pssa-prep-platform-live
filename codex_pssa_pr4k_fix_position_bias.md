# PSSA PR #4k-fix — Repair Grade 3 EBSR Position Bias + Harden Source Scan

> Status: IMPLEMENTED by Codex in commit `cad9297` "Fix Grade 3 EBSR answer-position bias", and PASSED independent re-audit (Part A genuine 2/1/1/1; Part B 5 distinct correct-pair patterns; spans still verbatim; flags in sync; source scan hardened to catch short-word-interspersed copies). This file is the spec of record for that fix.

**Goal:** fix the Grade 3 EBSR production tranche (committed in #4k, `e1a83f3`) before accepting it. The five EBSR items are grounded and structurally valid, but the batch had a total answer-position shortcut:
- Part A `correctIndex = 0` for **all five** items.
- Part B `correctIndices` = the **first two** options for **all five** items.

This is a BLOCKER: a valid EBSR response surface and grounded evidence are not enough if the whole tranche can be gamed by position (a student scores 5/5 by always picking A + the first two, without reading). Caught by independent audit; the EBSR gate stack had no batch-level position check.

## Scope
Repair the existing five Grade 3 EBSR items only. **Do not** add new EBSR items; change passages; change the 28 Grade 3 MCQs; touch Grades 4–8; or approve/import/write to DB. File-only changes. Commit.

## Task 1 — Redistribute EBSR Part A correct positions
Reorder Part A choices across the five items so the correct-position distribution is balanced.
- With 5 items, distribution must be as even as possible; **no position correct more than 2 times**; **at least 3 different positions used**; preferred `2/1/1/1` across A/B/C/D.
- Reordering must preserve each choice's rationale and distractor role.
- Part A must still pass single-defensible and EC skill-match gates.

## Task 2 — Redistribute EBSR Part B correct evidence positions
Reorder Part B evidence choices so the correct pair is not always positions 0–1.
- Correct-pair pattern must vary; **no pattern more than 2 times**; **the first two options may be the correct pair for at most 2 of 5 items**; **at least 3 distinct correct-pair patterns** across the 5.
- Reordering must preserve `quotedSpan`, `evidenceRole`, support rationale, and keep `correctIndices` in sync.
- Every Part B `quotedSpan` must still appear verbatim in the assigned passage; every correct option still supports Part A; no incorrect option supports Part A.

## Task 3 — Add batch-level EBSR position-bias gate `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION`
Checks the tranche as a **batch** (per-item single-defensibility does NOT catch "all correct answers are A").

**Part A:** report count by correctIndex A/B/C/D. FAIL if any position appears more than `ceil(n/4)` times (unless an explicit small-n exception is documented); FAIL if all items share one correctIndex; WARN if fewer than 3 positions used in a tranche of 5+. **For n=5:** max per position = 2; acceptable = `2/1/1/1` or equivalent; `all-A`, `3/1/1/0`, `4/1/0/0`, and `5/0/0/0` all FAIL.

**Part B:** report each `correctIndices` pair pattern (e.g. 0,1 / 0,2 / 1,3). FAIL if all items share one pattern; FAIL if the first two options are correct for more than 2 of 5 items; FAIL if any pattern appears more than 2 times in a 5-item tranche; WARN if fewer than 3 patterns used.

**Add audit fields:** `partACorrectPositionDistribution`, `partBCorrectPairDistribution`, `partAPositionBiasResult`, `partBPositionBiasResult`, `ebsrPositionBiasResult`, `positionBiasNotes`. Update `pssa_ebsr_grade3_audit_report.csv`, the EBSR vertical-slice summary, and the reviewer preview if needed.

## Task 4 — Position-bias tests
- **A.** Five EBSR items all `partA.correctIndex = 0` → FAIL `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION`.
- **B.** Five EBSR items all `partB.correctIndices = [0,1]` → FAIL `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION`.
- **C.** Five items with Part A `2/1/1/1` and varied Part B pair patterns → PASS.
- **D.** Reordering preserves correct answer, distractor rationales, evidence roles, `quotedSpan` mapping, and support rationales.

## Task 5 — Harden the source-compliance scan
The scan is real but under-sensitive: it drops ≤2-char tokens from the query before matching against full text, so copied prose interspersed with short function words ("to", "of", "a", "in", "is") fragments below the 8-token blocker and can evade detection. (Independent audit: a 12-token content-word copy was caught, but a prose slice with short words matched only 4.)
- Normalize case, punctuation, whitespace.
- **Preserve short words in raw normalized n-gram matching** (match against raw normalized text, not the short-word-stripped token stream).
- Keep a separate content-token mode only for boilerplate classification if needed.
- Match against both raw-normalized text and content-token-normalized text; fail on content-bearing copied text above the documented threshold.
- Continue allowing generic boilerplate ("Choose two answers", "Part One", "Part Two", "Which evidence from the passage supports…") as boilerplate-only matches.

**Add tests:** (A) copied phrase with short words interspersed → FAIL `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; (B) generic EBSR boilerplate alone → NOT a fail; (C) content-bearing 8+ token copied stem/choice → FAIL; (D) the five Grade 3 EBSR items still report 0 content-bearing released/sampler overlap.

## Task 6 — Re-run all existing gates
Rerun on the repaired tranche: the seven EBSR gates (`SCHEMA_VALID`, `PART_A_SINGLE_DEFENSIBLE`, `PART_B_VERBATIM_EVIDENCE`, `PART_B_SUPPORTS_PART_A`, `CORRECT_COUNT_MATCHES_INSTRUCTION`, `SKILL_MATCH`, `PARTIAL_CREDIT_VALID`), the new `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION`, hardened `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`, and the four passage-quality gates on the five assigned passages.

## Acceptance
- 5/5 EBSR items remain grounded and PASS all original EBSR gates.
- The 5-item Grade 3 EBSR tranche PASSes `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION` **as a batch** (this is one batch verdict over the tranche, NOT a per-item 5/5 — do not implement a per-item position gate that passes each item while missing the batch pattern). Report Part A distribution, Part B correct-pair distribution, the batch result, and per-item positions for traceability. Part A distribution balanced (preferably 2/1/1/1); Part B correct-pair distribution varies (not all 0–1).
- 100% Part B spans still verbatim in the assigned passage; 0 incorrect Part B options support Part A.
- 5/5 PASS hardened `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`.
- Existing Grade 3 MCQ audit unchanged/passing; no passage text changed; no Grades 4–8 changes; no approvals/imports/DB writes.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit only: repaired EBSR ordering/data, the new position-bias gate, source-scan hardening, tests, reports, previews, summaries. Do not leave untracked files.

## Stop — report
Before/after Part A correct-position distribution; before/after Part B correct-pair distribution; `PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION` PASS result; hardened source-scan test results; final 5-item EBSR audit table; passage-gate rerun table; confirmation no passages changed; confirmation Grade 3 MCQs unchanged; confirmation no Grades 4–8 changes; confirmation no approvals/imports/DB writes. **Do not proceed to #4l until this fix passes independent audit.**
