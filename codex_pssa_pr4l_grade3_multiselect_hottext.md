# PSSA PR #4l — Grade 3 Multiple-Select + Hot-Text Production Items

Production TEI tranche after #4k / #4k-fix. Grade 3 only. Multiple-select + hot-text only. No passage regeneration. No MCQ rewrites. No EBSR changes. No Grades 4–8. No approvals/imports/DB writes. File-only. Commit.

## Rule 0 — safeguard inheritance (binding)
Before authoring, re-read the #4j "Safeguard inheritance for production TEI / constructed-response items" section, **including the #4k-fix lesson** (section 4a): displayed selected-response / selectable-option surfaces must **enforce** shortcut-distribution safeguards, not merely report them. **A valid response surface alone is NOT enough.** Every production item in this PR must inherit:
- passage-quality gates (where passage-based);
- passage-grounding gates;
- source/license compliance + the **real no-copy source scan** (hardened version from #4k-fix);
- `eligibleContent` validity;
- `PSSA_ITEM_EC_SKILL_MISMATCH` adapted to the surface;
- clean student preview; reviewer preview with scoring, rationales, gate results;
- **batch-level position / surface-shortcut gates.**

## Context
#4j = mock-only item-type contract. #4k = first real Grade 3 EBSR tranche. #4k-fix = repaired EBSR position-bias blocker + added batch-level EBSR answer-position-distribution gate + hardened source scan. This PR adds two more real Grade 3 TEI surfaces: **MULTI_SELECT** and **HOT_TEXT**.

## Scope & count
Create exactly **10** new Grade 3 TEI items: **5 MULTI_SELECT + 5 HOT_TEXT**, exactly 1 of each per approved Grade 3 passage (The Night the Creek Glowed; A Map Under the Bench; The Bell That Saved Lunch; Blue Paint for Saturday; The Cart That Would Not Turn). Do not modify passage text, the 28 MCQs, or the 5 EBSRs (except shared report compat if strictly required). Multiple-select and hot-text are **separate item streams** — do NOT fold into the 28-MCQ or 5-EBSR counts. Final Grade 3 reading state: 5 passages · 28 MCQs unchanged · 5 EBSRs unchanged · 5 new MULTI_SELECT · 5 new HOT_TEXT.

## Passage gate rerun (required)
Before accepting any new item, rerun the four passage-quality gates (`PSSA_PASSAGE_CROSS_DUPLICATE`, `_TEMPLATE_SKELETON`, `_TOPIC_COHERENCE`, `_CONCRETENESS`) on the five assigned passages. Acceptance requires **5/5 PASS all four**; include the passage-gate table in the vertical-slice summary. (Good items cannot sit on bad passages.)

## Source-compliance scan (hardened, from #4k-fix)
Normalize case/punct/whitespace; **preserve short words in raw normalized n-gram matching**; keep content-token matching separate for boilerplate classification; scan both raw-normalized and content-token-normalized text; fail on content-bearing copied text above threshold; allow generic boilerplate only as boilerplate. **Scan:** stems, instructions, choices, selectable hot-text spans, rationales, reviewer-preview notes, assigned passage text. **Against:** `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, extracted sampler/corpus text. **Report per item:** matched source file, matched field, longest normalized n-gram, overlap score, boilerplate-vs-content classification. **Acceptance:** 10/10 PASS `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY`; 0 content-bearing released/sampler/DRC text copied.

## MULTI_SELECT schema (`interactionType: MULTI_SELECT`)
Fields: itemId, gradeLevel, passageId, eligibleContent, ecSkillFamily, interactionSubtype, stem, instructionText ("Choose two/three answers"), choices[], correctIndices[], minSelections, maxSelections, exactSelectionCount (where applicable), scoring, partialCreditRules, rationales[], distractorRoles[], audit metadata. **Allowed subtypes:** `choose_n_evidence`, `choose_n_traits`, `choose_n_details`. (No conventions multiple-select in this PR — that belongs to the later inline-dropdown / conventions rebuild.)

### MULTI_SELECT authoring
Each item: answerable only from its assigned passage; tests the assigned EC skill; exactly the stated number of correct options; plausible passage-specific incorrect options; no unmarked option equally correct; no correct option unsupported; rationales for every option; distractor roles for incorrect options; explicit partial-credit rules. **Vary item targets across the five** (evidence/details, character traits where literary, main-idea/key-detail support, sequence/process details, inference support) — do NOT make all five "choose two evidence details" with the same stem frame.

## HOT_TEXT schema (`interactionType: HOT_TEXT`)
Fields: itemId, gradeLevel, passageId, eligibleContent, ecSkillFamily, interactionSubtype, prompt, instructionText ("Choose two sentences"), sourceTextReference/passageId, selectableSpans[] (spanId, text, startOffset/endOffset where available, sentenceIndex/paragraphIndex where available), correctSpanIds[], minSelections, maxSelections, exactSelectionCount, scoring, partialCreditRules, rationale per correct span, rationale per distractor span, audit metadata. **Allowed subtypes:** `sentence_select`, `phrase_select`. (No word-level spelling/conventions hot-text in this PR.)

### HOT_TEXT authoring
Each item: selectable spans appear verbatim in the assigned passage; asks students to select evidence/sentences/phrases satisfying the assigned EC skill; exact number of correct spans per instruction; no unmarked span equally valid; no correct span only loosely topic-related; specific rationales for each correct span (why it satisfies the prompt) and each distractor (why it doesn't); spans clear enough for student selection. **Hot-text must not be a disguised MCQ** — the answer surface is selecting text, so the gate verifies span boundaries and support logic.

## New gates — MULTI_SELECT (all blockers)
1. `PSSA_MULTI_SELECT_SCHEMA_VALID` — choices exist; correctIndices valid; instructionText present; min/max/exact counts valid; scoring + partial-credit + status/license metadata present.
2. `PSSA_MULTI_SELECT_CORRECT_COUNT_MATCHES_INSTRUCTION` — "Choose two/three" ⇒ exactly that many correctIndices; min/max/exact agree with instruction and scoring.
3. `PSSA_MULTI_SELECT_NO_EXTRA_CORRECT_OPTIONS` — no unmarked choice equally correct; no distractor valid under the prompt; no ambiguous-enough-to-credit choice.
4. `PSSA_MULTI_SELECT_OPTION_GROUNDING` — every correct choice passage-supported; every distractor passage-specific but wrong; nothing answerable from general knowledge alone; no old-templated-passage text.
5. `PSSA_MULTI_SELECT_PARTIAL_CREDIT_VALID` — partial-credit rules explicit; totals valid; no full credit with unsupported/extra selections; extra incorrect choices handled explicitly.
6. `PSSA_MULTI_SELECT_DISTRACTOR_PLAUSIBILITY` — distractors are plausible passage-based misreadings; no generic distractors; distractor roles present and varied.
7. `PSSA_MULTI_SELECT_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH`: selected options test the assigned EC skill (key-ideas ⇒ key-detail/central-message support; literature ⇒ character/plot/theme evidence; inference/evidence ⇒ details supporting an inference; vocabulary only if the item genuinely asks word/phrase meaning).
8. `PSSA_MULTI_SELECT_POSITION_DISTRIBUTION` — **batch-level**: correct option positions vary; no "always first two/three"; no single correct-position pattern more than 2 times; ≥3 distinct patterns across 5 where feasible; first-k may not be the full correct set for more than 2 of 5; report per-item correctIndices + batch distribution.

## New gates — HOT_TEXT (all blockers)
1. `PSSA_HOT_TEXT_SCHEMA_VALID` — selectableSpans exist; correctSpanIds valid; instructionText present; counts valid; scoring + partial-credit + status/license metadata present.
2. `PSSA_HOT_TEXT_SELECTABLE_SPANS_VALID` — every span verbatim in the assigned passage; stable spanId; clean student-selectable boundaries; no span crosses unrelated sections unless intended.
3. `PSSA_HOT_TEXT_CORRECT_SPANS_EXIST` — every correctSpanId points to a real selectable span; every correct span verbatim; correct spans are selectable in the student preview.
4. `PSSA_HOT_TEXT_CORRECT_COUNT_MATCHES_INSTRUCTION` — "Choose two sentences" ⇒ exactly two correct spans; counts agree with instruction and scoring.
5. `PSSA_HOT_TEXT_NO_INCORRECT_SPAN_EQUALLY_VALID` — no unmarked span also satisfies the prompt; distractor spans plausible but wrong; correct spans specific, not merely topic-related.
6. `PSSA_HOT_TEXT_SUPPORTS_SKILL` — correct spans support the assigned EC skill (central message ⇒ spans reveal the lesson; evidence/inference ⇒ spans support the inference; structure/purpose ⇒ spans show the structure/purpose relationship).
7. `PSSA_HOT_TEXT_PARTIAL_CREDIT_VALID` — scoring explicit; partial credit only for valid supporting spans; no full credit for unsupported spans or extra selections.
8. `PSSA_HOT_TEXT_SKILL_MATCH` — extends `PSSA_ITEM_EC_SKILL_MISMATCH`: the selection task exercises the assigned EC skill, not merely carries a valid EC code.
9. `PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION` — **batch-level**: correct spans not always the first selectable spans; not always in the first paragraph; not always adjacent unless text structure requires and justifies it; ≥3 different location patterns across 5 where feasible; report sentence/paragraph indices for correct spans; FAIL if a student could guess by selecting first/top/earliest spans without reading.

## Shared batch gate
`PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION` — a shared batch-level rule supporting MULTI_SELECT choice-position, HOT_TEXT span-position (and later MATCHING_GRID row/column, DRAG_DROP token/target, INLINE_DROPDOWN option-order). For #4l, implement the MULTI_SELECT and HOT_TEXT branches. Results reported as **batch** verdicts, not fake per-item 5/5.

## Tests — MULTI_SELECT
1. Valid ("choose two", two supported correct, plausible wrong, explicit partial credit) → PASS.
2. "Choose two" but three correctIndices → FAIL `_CORRECT_COUNT_MATCHES_INSTRUCTION`.
3. Unmarked choice also supported → FAIL `_NO_EXTRA_CORRECT_OPTIONS`.
4. Marked correct choice unsupported → FAIL `_OPTION_GROUNDING`.
5. Vague non-passage distractor → FAIL `_DISTRACTOR_PLAUSIBILITY`.
6. Vocabulary EC but asks main-idea details → FAIL `_SKILL_MATCH`.
7. Five items all correctIndices `[0,1]` → FAIL `_POSITION_DISTRIBUTION`.
8. Five items with varied correct-position patterns → PASS.

## Tests — HOT_TEXT
1. Valid ("choose two sentences", two verbatim skill-supporting spans) → PASS.
2. correctSpanId not in selectableSpans → FAIL `_CORRECT_SPANS_EXIST`.
3. Span not verbatim in passage → FAIL `_SELECTABLE_SPANS_VALID`.
4. "Choose two" but one/three correct spans → FAIL `_CORRECT_COUNT_MATCHES_INSTRUCTION`.
5. Unmarked span also satisfies the prompt → FAIL `_NO_INCORRECT_SPAN_EQUALLY_VALID`.
6. Topic-related but unsupported span → FAIL `_SUPPORTS_SKILL`.
7. Craft/structure EC but asks only two factual details → FAIL `_SKILL_MATCH`.
8. Five items all use the first two selectable spans as correct → FAIL `_SURFACE_SHORTCUT_DISTRIBUTION`.
9. Five items with varied paragraph/sentence locations → PASS.

## Adversarial validation (≥4 novel fixtures NOT used in authoring)
1. MULTI_SELECT, valid schema + grounded choices, but one unmarked choice is also correct → FAIL `_NO_EXTRA_CORRECT_OPTIONS`.
2. MULTI_SELECT, varied positions but wrong EC skill → FAIL `_SKILL_MATCH`.
3. HOT_TEXT, all spans verbatim + correct count, but selected spans only topic-related → FAIL `_SUPPORTS_SKILL`.
4. HOT_TEXT, valid surface but all correct spans are first/top across the batch → FAIL `_SURFACE_SHORTCUT_DISTRIBUTION`.
Report these in test output.

## Reports
- `pssa_tei_grade3_multi_select_audit_report.csv` — itemId, gradeLevel, passageId, passageTitle, eligibleContent, ecSkillFamily, interactionSubtype, stem, instructionText, correctIndices, selectionCountResult, optionGroundingResult, noExtraCorrectOptionsResult, distractorPlausibilityResult, skillMatchResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_tei_grade3_hot_text_audit_report.csv` — itemId, gradeLevel, passageId, passageTitle, eligibleContent, ecSkillFamily, interactionSubtype, prompt, instructionText, correctSpanIds, correctSpanLocations, selectableSpanCount, spansVerbatimResult, correctCountResult, noIncorrectSpanEquallyValidResult, supportsSkillResult, skillMatchResult, partialCreditResult, sourceComplianceResult, finalResult, notes.
- `pssa_tei_grade3_surface_shortcut_report.csv` — tranche, interactionType, itemCount, correctPositionPatterns, correctSpanLocationPatterns, result, severity, notes.
- Update the Grade 3 vertical-slice summary: passages, MCQs, EBSRs, multiple-select, hot-text, all gate counts, source-scan summary, surface-shortcut summary.

## Previews
**Student preview:** five passages + 5 MS + 5 HT; no answer keys, rationales, correct indices, evidence labels, or internal metadata. **Reviewer preview:** per item — passage, interactionType, eligibleContent, correct responses, evidence/support rationale, distractor rationale, scoring + partial-credit rules, EC skill-match result, source-compliance result, surface-shortcut result, final audit result.

## Acceptance
- 10 new items (5 MS + 5 HT), exactly 1 of each per passage.
- 10/10 PASS source-compliance real scan.
- 5/5 MS items PASS all MS gates; the 5-item MS tranche PASSes `PSSA_MULTI_SELECT_POSITION_DISTRIBUTION` **as a batch**.
- 5/5 HT items PASS all HT gates; the 5-item HT tranche PASSes `PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION` **as a batch**.
- 5/5 assigned passages still PASS the four passage-quality gates.
- 5 EBSRs unchanged (still pass #4k-fix audit if rerun); 28 MCQs unchanged (still pass MCQ audit if rerun).
- 100% quoted/selectable evidence spans verbatim in assigned passages; 0 old-templated-passage evidence; 0 released/sampler/DRC content-bearing text copied.
- No passage text changed; no Grades 4–8 changes; no approvals/imports/DB writes.
- Student preview leak-free; reviewer preview complete.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: MS + HT production items; audit/gate updates; tests; reports; student + reviewer previews; vertical-slice summary. Do not leave untracked files.

## Stop — report
#4j contract/inheritance confirmation; #4k-fix EBSR-unchanged confirmation; 10 new item IDs; passage→item mapping; EC distribution; MS correct-position distribution; HT correct-span location distribution; MS batch shortcut result; HT batch shortcut result; source-compliance scan summary; passage-gate rerun table; final MS audit table; final HT audit table; student + reviewer preview paths; confirmations (no passages changed, 28 MCQs unchanged, 5 EBSRs unchanged, no Grades 4–8, no approvals/imports/DB writes). **Do not proceed to #4m until #4l passes independent audit.**
