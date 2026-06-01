# PSSA PR #4m — Grade 3 Matching-Grid + Drag-Drop Production Items

Production TEI tranche after #4l. Grade 3 only. Matching-grid + drag-drop only. No passage regeneration. No MCQ/EBSR/multi-select/hot-text rewrites. No Grades 4–8. No approvals/imports/DB writes. File-only. Commit.

## Rule 0 — safeguard inheritance (binding)
Before authoring, re-read the #4j "Safeguard inheritance" section, **including section 4a** (the #4k lesson): displayed selectable-option surfaces must **enforce** shortcut-distribution safeguards, not merely report them — and this is enforced **batch-level** wherever the shortcut appears only across a tranche. **A valid response surface alone is NOT enough.** Every item in this PR inherits:
- passage-quality gates (where passage-based);
- passage-grounding gates;
- source/license compliance + the **hardened real no-copy source scan** (#4k-fix);
- `eligibleContent` validity;
- `PSSA_ITEM_EC_SKILL_MISMATCH` adapted to the surface;
- clean student preview; reviewer preview with scoring, rationales, gate results;
- **batch-level surface-shortcut gates** (extend the shared `PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION` to grid row/column and drag token/target patterns).

## Context
#4j = mock-only contract. #4k/#4k-fix = Grade 3 EBSR (position-bias fixed, batch gate added). #4l = Grade 3 multiple-select + hot-text (passed audit; inherited batch shortcut gates from day one). This PR adds the last two selected-response TEI surfaces before the conventions rebuild: **MATCHING_GRID** and **DRAG_DROP**.

## Preconditions (stop and report if any is missing)
Before authoring, confirm: #4j contract committed+pushed; #4j safeguard inheritance includes **enforced batch-level** surface-shortcut safeguards (section 4a); #4k-fix committed+pushed and its EBSRs pass independent audit; #4l committed+pushed and its MS/HT items pass independent audit; **current branch starts from latest `main`.** Do not author #4m from a stale branch.

## Scope & count
Create exactly **10** new Grade 3 TEI items: **5 MATCHING_GRID + 5 DRAG_DROP**, exactly 1 of each per approved Grade 3 passage (The Night the Creek Glowed; A Map Under the Bench; The Bell That Saved Lunch; Blue Paint for Saturday; The Cart That Would Not Turn). Do not modify passage text, the 28 MCQs, the 5 EBSRs, or the 10 #4l multi-select/hot-text items (except shared report compat if strictly required). Matching-grid and drag-drop are **separate item streams** — do NOT fold into any prior count. Final Grade 3 reading state: 5 passages · 28 MCQs · 5 EBSRs · 5 MS · 5 HT · 5 new MATCHING_GRID · 5 new DRAG_DROP.

**Passage mapping rule.** Each approved Grade 3 passage must be the **primary** passage for exactly 1 MATCHING_GRID item and exactly 1 DRAG_DROP item. If an item uses `secondaryPassageId`, report that pairing separately. A passage may appear as a secondary passage only if the pairing-coherence gate passes, and **no passage may be a secondary more than 2 times** unless explicitly justified.

**Unchanged-content proof (hashes).** Before authoring, compute and record hashes for: the five Grade 3 passage files; the 28 Grade 3 MCQ items; the 5 Grade 3 EBSR items; the 5 #4l multiple-select items; the 5 #4l hot-text items. After authoring, recompute and report. **Acceptance:** all of those hashes unchanged; only #4m MG/DD files, reports, previews, tests, and gate code changed.

## Passage gate rerun (required)
Before accepting any new item, rerun the four passage-quality gates (`PSSA_PASSAGE_CROSS_DUPLICATE`, `_TEMPLATE_SKELETON`, `_TOPIC_COHERENCE`, `_CONCRETENESS`) on the five assigned passages. Acceptance requires **5/5 PASS all four**; include the passage-gate table in the vertical-slice summary.

## Source-compliance scan (hardened, from #4k-fix)
Reuse the hardened scan (preserve short words in raw normalized n-gram matching; separate content-token stream for boilerplate; fail on content-bearing overlap ≥ threshold; allow generic boilerplate only as boilerplate). **Scan:** stems/prompts, instructions, row labels, column labels, cell content, draggable token text, target/bucket labels, rationales, reviewer-preview notes, assigned passage text. **Against:** `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, extracted sampler/corpus text. **Report per item:** matched source file, matched field, longest normalized n-gram, overlap score, boilerplate-vs-content. **Acceptance:** 10/10 PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; 0 content-bearing released/sampler/DRC text copied.

## MATCHING_GRID schema (`interactionType: MATCHING_GRID`)
Fields: itemId, gradeLevel, passageId (primary; `secondaryPassageId` when a two-text compare), eligibleContent, ecSkillFamily, interactionSubtype, stem, instructionText, rows[] (rowId, label), columns[] (columnId, label), selectionRule, bothColumnId (nullable; set when an explicit "Both" column exists), correctCells[] (rowId → columnId), scoring, partialCreditRules, rationale per correct cell, rationale per plausible-wrong cell, audit metadata. **For #4m production use ONLY `selectionRule` = `one_per_row` or `one_per_row_with_explicit_both_column`** (exactly one correct column per row; the "Both" case is still one column per row — the explicit Both column). **Do NOT use `multi_per_column` in #4m** — its semantics are not yet clarified/tested; if multi-answer rows are needed later, define a separate `many_per_row` rule with its own tests. (Two-text compare items use `secondaryPassageId` + an explicit `bothColumnId` and must pass the pairing-coherence gate.)

### MATCHING_GRID authoring
Each grid item: every row statement is grounded in the assigned passage(s); **each row has exactly one correct column** (no `multi_per_column` or multi-answer-row behavior in #4m); when a "Both" column exists it is **explicit** (represented by `bothColumnId`) and a row mapped to "Both" must be genuinely true in *each* referenced passage; single-passage-column rows must be true in that column's passage and false in the other; no row is ambiguous between columns; tests the assigned EC skill (e.g. compare two texts E03.B-C.3.1.2, or categorize details/sequence within a text). **Vary grid designs across the five** (two-text "X / Y / Both" compare; within-passage aspect categorization such as cause/effect or beginning/middle/end; stated-vs-not-stated) — do NOT make all five the same "Both"-column compare with the same frame.

## DRAG_DROP schema (`interactionType: DRAG_DROP`)
Fields: itemId, gradeLevel, passageId, eligibleContent, ecSkillFamily, interactionSubtype, prompt, instructionText, tokens[] (tokenId, text, isDistractor), targets[] (targetId, label, capacity), correctAssignments[] (tokenId → targetId; for `order`, targetId is an ordered position), useAllTokens (bool), scoring, partialCreditRules, rationale per correct assignment, rationale per distractor token, audit metadata. **Allowed subtypes:** `category_chart` (drag tokens into labeled buckets), `order` (sequence steps/events). (No `token_placement`/punctuation-token drag in this PR — that belongs with the conventions rebuild #4n.)

### DRAG_DROP authoring
**For #4m, DRAG_DROP items are single-passage only — do NOT use `secondaryPassageId`.** Cross-text drag/drop compare items may be added later only after the DRAG_DROP schema explicitly adds `secondaryPassageId`, `comparisonBasis`, and a pairing-coherence gate. (Matching-grid already carries the two-text compare risk in this PR; do not add it to drag/drop too.)

Each drag item: every token is grounded in the assigned passage; each target has an explicit `capacity`; `correctAssignments` respect capacity; distractor tokens (where `useAllTokens=false`) are plausible but belong in no target; no token is equally valid in two targets; for `order`, the correct sequence is uniquely determined by the passage and **must not equal the presented token order** (no pre-sorted shortcut); tests the assigned EC skill (sequence/process E03.B-K.1.1.3, cause/effect, or category integration). **Vary across the five** (at least 2 `category_chart` and at least 2 `order`); do not reuse one frame five times.

## New gates — MATCHING_GRID (all blockers)
1. `PSSA_MATCHING_GRID_SCHEMA_VALID` — rows/columns exist; selectionRule valid; correctCells reference real rows/columns; bothColumnId valid when present; scoring + partial-credit + status/license metadata present.
2. `PSSA_MATCHING_GRID_SELECTION_RULE_VALID` — `selectionRule` ∈ {`one_per_row`, `one_per_row_with_explicit_both_column`}; exactly one correct column per row (the Both column counts as that one column); instruction agrees with the rule; FAIL on any `multi_per_column` usage in #4m.
3. `PSSA_MATCHING_GRID_CORRECT_CELLS_VALID` — every correct cell is grounded; "Both"-mapped rows verified true in *each* referenced passage; single-column rows verified true in that passage and false in the other.
4. `PSSA_MATCHING_GRID_NO_AMBIGUOUS_ALT_CELL` — no row is defensibly correct in an unmarked column; distractor cells are plausible but wrong.
5. `PSSA_MATCHING_GRID_BOTH_COLUMN_EXPLICIT` — if a "Both" concept is used, it is a real explicit column (`bothColumnId` set), not implied; "Both" is not the correct answer for every row.
6. `PSSA_MATCHING_GRID_GROUNDING` — every row statement is passage-grounded; no general-knowledge-only row; no old-templated-passage text.
7. `PSSA_MATCHING_GRID_PARTIAL_CREDIT_VALID` — partial-credit rules explicit; totals valid; no full credit for incorrect cells.
8. `PSSA_MATCHING_GRID_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH`: the categorization task exercises the assigned EC skill (compare-two-texts EC ⇒ genuine cross-text distinction; within-text EC ⇒ genuine within-text categorization).
9. `PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION` — **batch-level**, with numeric thresholds across the 5-item MG tranche: **no single displayed column may hold >60% of all correct cells**; **"Both" may not exceed 40% of all correct cells** unless a `WARN_WITH_JUSTIFICATION` is emitted for human review; **no individual grid may map all rows to one column** unless the text genuinely requires it (emit `WARN_WITH_JUSTIFICATION`); **≥3 distinct correct-column patterns** across the 5 items where feasible. Report correct-column distribution per item and across the tranche; FAIL if a student could pass by always picking one column/"Both" without reading.
10. `PSSA_MATCHING_GRID_PAIRING_COHERENCE` — applies to MATCHING_GRID items using `secondaryPassageId` (DRAG_DROP is single-passage only in #4m, so no drag/drop pairing check exists in this PR): the two passages must have a **documented comparison basis** (`comparisonBasis`); the comparison must be answerable from both passages; "Both" rows/tokens must be genuinely true in **both** texts; single-text rows/tokens must be true in one and false in the other. **FAIL if** the two passages are only loosely related, the item asks students to compare generic traits not actually developed in both, or a "Both" answer rests on broad process language rather than concrete textual evidence. Report `primaryPassageId`, `secondaryPassageId`, `comparisonBasis`, `pairingCoherenceResult`, notes. (Do NOT pair unrelated passages just to satisfy the TEI format — if no natural pair exists, author a within-passage item instead. This prevents recreating the original "same-skeleton" failure as fake "Both" comparisons.)

## New gates — DRAG_DROP (all blockers)
1. `PSSA_DRAG_DROP_SCHEMA_VALID` — tokens/targets exist; capacities defined; correctAssignments reference real tokens/targets; useAllTokens consistent with distractors; scoring + partial-credit + status/license metadata present.
2. `PSSA_DRAG_DROP_ASSIGNMENTS_VALID` — every correctAssignment points to a real token and target; every required target is satisfied; no token assigned to a nonexistent target.
3. `PSSA_DRAG_DROP_TARGET_CAPACITY_VALID` — assignments never exceed any target's capacity; capacities match the intended design.
4. `PSSA_DRAG_DROP_NO_DISTRACTOR_TOKEN_EQUALLY_VALID` — no distractor token validly fits a target; no token is equally valid in two targets; correct tokens are uniquely placed.
5. `PSSA_DRAG_DROP_GROUNDING` — every token is passage-grounded; distractors are plausible passage-adjacent but wrong; no general-knowledge-only token; no old-templated-passage text.
6. `PSSA_DRAG_DROP_ORDER_VALID` — (subtype `order`) the correct sequence is uniquely determined by the passage AND **does not equal the presented token order** (no pre-sorted shortcut); sequence reflects real time/cause order.
7. `PSSA_DRAG_DROP_PARTIAL_CREDIT_VALID` — partial-credit rules explicit; totals valid; no full credit for wrong assignments or wrong order.
8. `PSSA_DRAG_DROP_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH`: the drag task exercises the assigned EC skill (sequence EC ⇒ genuine ordering; category EC ⇒ genuine categorization).
9. `PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION` — **batch-level**, with numeric thresholds across the 5-item DD tranche: **no `category_chart` item may have all correct tokens assigned to the first displayed bucket**; **no target/bucket may receive >60% of all correct assignments** across the tranche unless justified; for `order` items the correct order **may not equal the presented order** and **may not always be reverse-presented order**; **≥3 distinct assignment/order patterns** across the 5 items where feasible. Report assignment/order patterns per item and across the tranche; FAIL if a student could pass by dropping tokens in presented order or always into the first bucket without reading.

## Shared batch gate
Extend `PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION` with MATCHING_GRID (row/column-pattern) and DRAG_DROP (token/target-pattern, order-pattern) branches. Results reported as **batch** verdicts, not per-item 5/5.

## Tests — MATCHING_GRID
1. Valid one-per-row grid with grounded rows + explicit "Both" → PASS.
2. A row defensibly correct in an unmarked column → FAIL `_NO_AMBIGUOUS_ALT_CELL`.
3. "Both"-mapped row not true in one of the two passages → FAIL `_CORRECT_CELLS_VALID`.
4. `one_per_row` but a row has two marked correct columns → FAIL `_SELECTION_RULE_VALID`.
5. "Both" implied but no explicit column → FAIL `_BOTH_COLUMN_EXPLICIT`.
6. Row answerable from general knowledge only → FAIL `_GROUNDING`.
7. EC mismatch (compare-two-texts EC but rows are within-one-text categorization) → FAIL `_SKILL_MATCH`.
8. Five grids all correct-column = same single column → FAIL `_SHORTCUT_DISTRIBUTION`.
9. Five grids with varied correct-column distribution → PASS.

## Tests — DRAG_DROP
1. Valid category_chart with grounded tokens, capacities respected, plausible distractors → PASS.
2. Assignment points to nonexistent target → FAIL `_ASSIGNMENTS_VALID`.
3. Assignments exceed a target's capacity → FAIL `_TARGET_CAPACITY_VALID`.
4. A distractor token validly fits a target → FAIL `_NO_DISTRACTOR_TOKEN_EQUALLY_VALID`.
5. `order` item whose correct order equals the presented token order → FAIL `_ORDER_VALID`.
6. Token answerable from general knowledge only → FAIL `_GROUNDING`.
7. EC mismatch (sequence EC but task is categorization) → FAIL `_SKILL_MATCH`.
8. Five drag items all correct mapping = identity/first-bucket → FAIL `_SHORTCUT_DISTRIBUTION`.
9. Five drag items with varied mappings/orders → PASS.

## Tests — source compliance (prove the scan reaches every field)
1. MATCHING_GRID copied **row label** containing a content-bearing phrase copied from released/sampler text (incl. short words to/of/a/in/is) → FAIL `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`.
2. MATCHING_GRID copied **column label or cell statement** from released/sampler text → FAIL.
3. DRAG_DROP copied **draggable token** from released/sampler text → FAIL.
4. DRAG_DROP copied **target/bucket label** from released/sampler text → FAIL.
5. Boilerplate control: generic directions ("Drag the answers into the chart", "Complete the table") alone → NOT a fail.
6. Production control: the 10 authored #4m items report 0 content-bearing released/sampler/DRC overlap.

## Tests — partial credit (negative, prevent stub scoring gates)
MATCHING_GRID: missing `partialCreditRules` → FAIL `PSSA_MATCHING_GRID_PARTIAL_CREDIT_VALID`; full credit with an incorrect cell selected → FAIL; full credit when a required row is unanswered → FAIL; "Both"-column row scored correct when true in only one passage → FAIL.
DRAG_DROP: missing `partialCreditRules` → FAIL `PSSA_DRAG_DROP_PARTIAL_CREDIT_VALID`; full credit with one token in the wrong target → FAIL; full credit when target capacity is exceeded → FAIL; full credit for presented-order placement in an `order` item → FAIL.

## Adversarial validation (≥4 novel fixtures NOT used in authoring)
1. MATCHING_GRID, valid schema + grounded rows, but one row is also defensibly correct in an unmarked column → FAIL `_NO_AMBIGUOUS_ALT_CELL`.
2. MATCHING_GRID, varied columns but EC mismatch → FAIL `_SKILL_MATCH`.
3. DRAG_DROP `order`, all tokens verbatim/grounded, but presented order already equals correct order → FAIL `_ORDER_VALID`.
4. DRAG_DROP, valid surface but every item's correct mapping is identity/first-bucket across the batch → FAIL `_SHORTCUT_DISTRIBUTION`.
5. MATCHING_GRID pairing-coherence: two passages only loosely related, and a "Both" row based on generic process language rather than concrete evidence from both texts → FAIL `PSSA_MATCHING_GRID_PAIRING_COHERENCE`. (Directly targets the same-skeleton failure — generic similarity must not become fake compare/contrast evidence.)
Report these in test output.

## Reports
- `pssa_tei_grade3_matching_grid_audit_report.csv` — itemId, gradeLevel, passageId, secondaryPassageId, passageTitle, eligibleContent, ecSkillFamily, interactionSubtype, stem, instructionText, selectionRule, bothColumnId, comparisonBasis, correctCells, selectionRuleResult, correctCellsResult, noAmbiguousAltCellResult, bothColumnExplicitResult, pairingCoherenceResult, groundingResult, skillMatchResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_tei_grade3_drag_drop_audit_report.csv` — itemId, gradeLevel, passageId, passageTitle, eligibleContent, ecSkillFamily, interactionSubtype, prompt, instructionText, tokenCount, targetCount, useAllTokens, correctAssignments, assignmentsValidResult, targetCapacityResult, noDistractorEquallyValidResult, orderValidResult, groundingResult, skillMatchResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_tei_grade3_surface_shortcut_report.csv` — extend with matching_grid and drag_drop tranches: tranche, interactionType, itemCount, correctColumnPatterns / correctAssignmentPatterns / orderPatterns, result, severity, notes.
- Update the Grade 3 vertical-slice summary: passages, MCQs, EBSRs, MS, HT, matching-grid, drag-drop, all gate counts, source-scan summary, surface-shortcut summary.

## Previews
**Student preview:** five passages + 5 MG + 5 DD; no answer keys, correct cells/assignments, rationales, or internal metadata. **Strict source leak check** — the student-preview *source* (not just rendered view) must NOT contain any of: `correctCells`, `correctAssignments`, `correctIndices`, `correctSpanIds`, `data-correct`, `data-c`, `data-answer`, `supportsPrompt`, `supportsPartA`, `answerKey`, `rationale`, `skillMatchResult`, `sourceComplianceResult`, audit metadata, or any hidden reviewer metadata. If interactive behavior needs answer data, put it in a separate reviewer/debug preview — the student preview must be answer-key-free in both rendered view and source. (The mock HTML used hidden correctness markers for interactivity; production student previews must not.) **Reviewer preview:** per item — passage(s), interactionType, eligibleContent, correct cells/assignments, support rationale, distractor rationale, scoring + partial-credit rules, EC skill-match result, source-compliance result, surface-shortcut result, final audit result.

## Acceptance
- 10 new items (5 MG + 5 DD), exactly 1 of each per passage.
- 10/10 PASS source-compliance real scan.
- 5/5 MG items PASS all MG gates; the 5-item MG tranche PASSes `PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION` **as a batch**.
- 5/5 DD items PASS all DD gates; the 5-item DD tranche PASSes `PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION` **as a batch**.
- 5/5 assigned passages still PASS the four passage-quality gates.
- 28 MCQs, 5 EBSRs, 10 #4l items all unchanged — **proven by before/after hashes** (passages, MCQs, EBSRs, MS, HT all hash-identical; only #4m files changed).
- **Two-text compare matching-grid items are allowed ONLY when `PSSA_MATCHING_GRID_PAIRING_COHERENCE` PASSes.** If no natural pair exists for a passage, author a within-passage matching-grid item instead. (DRAG_DROP is single-passage only in #4m — no cross-text drag/drop pairing.)
- Each passage is the primary for exactly 1 MG + 1 DD; secondary-passage usage reported separately and ≤2 per passage unless justified.
- `selectionRule` is `one_per_row` or `one_per_row_with_explicit_both_column` only (no `multi_per_column`).
- 100% rows/tokens grounded in assigned passages; 0 old-templated-passage content; 0 released/sampler/DRC content-bearing text copied.
- No passage text changed; no Grades 4–8 changes; no approvals/imports/DB writes.
- Student preview leak-free (source + rendered); reviewer preview complete.

**WARN_WITH_JUSTIFICATION handling.** A `WARN_WITH_JUSTIFICATION` does NOT count as a clean PASS. Final #4m acceptance requires **zero FAIL and zero unresolved WARN**; any `WARN_WITH_JUSTIFICATION` must be listed in the Stop report and explicitly human-reviewed before proceeding. For this first Grade 3 production tranche, **prefer avoiding WARNs entirely** — if a design requires a WARN, explain why a different item shape was not possible.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: MG + DD production items; audit/gate updates; tests; reports; student + reviewer previews; vertical-slice summary. Do not leave untracked files.

## Stop — report
#4j contract/inheritance confirmation; #4l-unchanged confirmation; 10 new item IDs; passage→item mapping; EC distribution; MG correct-column distribution; DD assignment/order distribution; MG batch shortcut result; DD batch shortcut result; source-compliance scan summary; passage-gate rerun table; final MG audit table; final DD audit table; student + reviewer preview paths; confirmations (no passages changed, 28 MCQs / 5 EBSRs / 10 #4l items unchanged, no Grades 4–8, no approvals/imports/DB writes). **Do not proceed to #4n until #4m passes independent audit.**
