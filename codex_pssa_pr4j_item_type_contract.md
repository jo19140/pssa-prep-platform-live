# PSSA PR #4j — Complete ELA Item-Type Contract + Mock Pack

**Goal:** create the complete PSSA ELA item-type / response-surface contract before writing any production TEI, Short Answer, or TDA items. Later Codex PRs author against stable schemas and gates instead of inventing formats one at a time.

**This PR is MOCK-ONLY.** No real assessment-item authoring. No passage regeneration. No Grade 3 production item-count changes. No Grades 4–8 work. No approvals. No imports. No DB writes. File-only. Commit.

## Why this PR
Prior work proved passage quality, MCQ grounding, distractor quality, answer-position balance, and EC skill-match — but only for single-answer reading MCQs. The live PSSA ELA surface (confirmed from DRC INSIGHT screenshots and the PDE/DRC test design) is larger: MCQ, EBSR, multiple-select, inline drop-down, matching/grid, hot-text, drag-and-drop, plus the constructed-response types Short Answer (Grade 3) and TDA (Grades 4–8). This PR defines every response type once so production PRs (#4k onward) author against a fixed contract.

## Source / license guardrails
Use as **format/rubric reference only**: the DRC INSIGHT screenshots (`reference/pssa-item-catalog/`), the PDE/DRC source inventory (`reference/pssa-test-design/official_source_inventory.md`), the test design (`reference/pssa-test-design/pssa_ela_test_design_2025.pdf`), and the constructed-response rubrics (`reference/pssa-test-design/constructed_response_scoring.md`). **Do NOT copy** DRC screenshot item text, released sampler passages, released stems, released answer choices, released student responses, or annotated anchor-paper wording. **Use original toy content for every mock.**

## Taxonomy to lock — separate interaction surface from scoring family
**Top-level `interactionType` enum (9):** `MCQ`, `EBSR`, `MULTI_SELECT`, `INLINE_DROPDOWN`, `MATCHING_GRID`, `HOT_TEXT`, `DRAG_DROP`, `SHORT_ANSWER`, `TDA`.

**`interactionSubtype` (nullable) inside a family — sub-variants do NOT become top-level types:**
- HOT_TEXT: `sentence_select`, `phrase_select`, `word_select`
- DRAG_DROP: `category_chart`, `order`, `token_placement` (also note `table_cell_replace` = MC-via-drag)
- INLINE_DROPDOWN: `single_blank`, `multi_blank`, `spelling`, `grammar_usage`, `punctuation_capitalization`, `reading_phrase`
- MULTI_SELECT: `choose_n_evidence`, `choose_n_traits`, `choose_n_notes`
- MATCHING_GRID: `one_per_row`, `multi_per_column`; `both_column` flag explicit
- EBSR: `two_point`, `three_point`
- MCQ: `passage_based`, `standalone_conventions`
- SHORT_ANSWER: Grade 3 only, 3-pt, text-supported
- TDA: Grades 4–8 only, 4-pt analytic, weighted ×4

(Mirrors the locked subtype inventory in `exemplars/pssa_item_type_mocks/tei_item_type_mockups.html`, which is the visual sign-off reference. All #4j mock artifacts live under `exemplars/pssa_item_type_mocks/` — never under `exemplars/pssa_grade3_pilot/`, so mock-only fixtures cannot be confused with Grade 3 production content.)

## Schema — discriminated `responseSpec` union
Every item carries: `itemId`, `gradeLevel`, `subject`, `eligibleContent`, `itemType`, `interactionType`, `interactionSubtype` (nullable), `passageId` (nullable), `prompt`/`stem`, `responseSpec`, `correctResponse`, `scoring`, `reviewStatus`, `itemStatus`, `sourceType`, license metadata, audit metadata. `responseSpec` is a discriminated union keyed on `interactionType`; `correctResponse` shape matches it (indices / spans / cells / assignments / rubric).

## Required mock fixtures — one ORIGINAL toy mock per top-level type
1. **MCQ** — four-option single-answer.
2. **EBSR** — Part A four-option MC (one correct) + Part B evidence-select (≥2 correct evidence choices), partial-credit metadata, toy passage.
3. **MULTI_SELECT** — "choose two/three"; correct count matches instruction; plausible incorrect options.
4. **INLINE_DROPDOWN** — sentence/short paragraph with two blanks, each with its own option list + correct option; conventions/editing toy.
5. **MATCHING_GRID** — rows × columns; ≥1 "Both" row if schema allows; one-per-row vs many-per-row behavior explicit.
6. **HOT_TEXT** — toy passage with selectable sentences/phrases; "choose two"; correct spans are exact selectable spans.
7. **DRAG_DROP** — draggable tokens into chart/category buckets; target-capacity rules + correct assignments.
8. **SHORT_ANSWER** — prompt; expected-answer components; text-support requirement; 3/2/1/0 rubric fields; copied-text cap rule; synthetic toy responses for each score level.
9. **TDA** — analytic prompt; passage reference; expected analysis dimensions; 4-point analytic rubric fields; ×4 weight metadata; Writer's-Checklist preview scaffold; synthetic toy responses/outlines for score bands.

All student responses in mocks must be original toy text written for this PR.

**Constructed-response scope (SHORT_ANSWER, TDA):** this PR validates rubric metadata, expected-response components, score-band examples, scoring fields, and preview/rendering only. It does **not** claim production automated scoring or calibrated essay scoring — automated scoring / rubric calibration is a later PR.

## General item-type gates (all blockers)
1. `PSSA_ITEM_RESPONSE_SPEC_VALID` — required fields exist for the `interactionType`.
2. `PSSA_ITEM_CORRECT_RESPONSE_VALID` — correct indices/spans/cells/assignments point to real options.
3. `PSSA_ITEM_INSTRUCTION_MATCHES_RESPONSE` — instruction matches response shape ("choose two" ⇒ exactly two correct; two dropdown blanks ⇒ two blank specs; one-per-row grid ⇒ one valid cell/row; drag target capacity matches assignments).
4. `PSSA_ITEM_SCORING_VALID` — total points, partial-credit rules, score bands explicit and internally consistent.
5. `PSSA_ITEM_PREVIEW_RENDERABLE` — student + reviewer previews render each interaction type.
6. `PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY` — mock content is original toy content; no DRC screenshot text, sampler passages, released stems, released choices, or released student responses appear.
7. `PSSA_ITEM_GRADE_TYPE_COMPATIBLE` — grade/type compatibility is executable: `SHORT_ANSWER` allowed for Grade 3 only (unless the test design explicitly says otherwise); `TDA` allowed for Grades 4–8 only. Incompatible grade/type combinations are a BLOCKER. (Prevents future content from putting TDA into Grade 3 or Short Answer into Grades 4–8 by accident.)
8. `PSSA_ITEM_TYPE_INTERACTION_CONSISTENT` — `itemType` and `interactionType` must map coherently and may not contradict the `responseSpec` shape: e.g. `interactionType: TDA` cannot have `itemType: selected_response`; `interactionType: MCQ` cannot carry a constructed-response scoring rubric.

## Family-specific gates
**MCQ:** `PSSA_MCQ_SINGLE_DEFENSIBLE` + existing distractor/length/position/generic-language gates.
**EBSR:** `PSSA_EBSR_SCHEMA_VALID`, `_PART_A_SINGLE_DEFENSIBLE`, `_PART_B_VERBATIM_EVIDENCE`, `_PART_B_SUPPORTS_PART_A`, `_CORRECT_COUNT_MATCHES_INSTRUCTION`, `_PARTIAL_CREDIT_VALID`.
**MULTI_SELECT:** `_CORRECT_COUNT_MATCHES_INSTRUCTION`, `_NO_EXTRA_CORRECT_OPTIONS`, `_PARTIAL_CREDIT_VALID`, `_DISTRACTOR_PLAUSIBILITY`.
**INLINE_DROPDOWN:** `_EACH_BLANK_VALID`, `_ONE_CORRECT_PER_BLANK`, `_CONTEXT_FIT`, `_DISTRACTORS_ARE_PLAUSIBLE_ERRORS`.
**MATCHING_GRID:** `_ROWS_COLUMNS_VALID`, `_SELECTION_RULE_VALID`, `_CORRECT_CELLS_VALID`, `_NO_AMBIGUOUS_ALT_CELL`, `_BOTH_COLUMN_EXPLICIT`.
**HOT_TEXT:** `_SELECTABLE_SPANS_VALID`, `_CORRECT_SPANS_EXIST`, `_CORRECT_COUNT_MATCHES_INSTRUCTION`, `_NO_INCORRECT_SPAN_EQUALLY_VALID`.
**DRAG_DROP:** `_TOKENS_TARGETS_VALID`, `_ASSIGNMENTS_VALID`, `_TARGET_CAPACITY_VALID`, `_NO_DISTRACTOR_TOKEN_EQUALLY_VALID`, `_ORDER_VALID` (where subtype = `order`).
**SHORT_ANSWER:** `PSSA_SA_RUBRIC_VALID`, `_PROMPT_REQUIRES_TEXT_SUPPORT`, `_EXPECTED_RESPONSE_COMPONENTS_VALID`, `_COPIED_TEXT_CAP_ENCODED`, `_SCORE_BAND_EXAMPLES_RENDERABLE`.
**TDA:** `PSSA_TDA_RUBRIC_VALID`, `_ANALYTIC_PROMPT_VALID`, `_NOT_SUMMARY_OR_OPINION_ONLY`, `_TEXT_EVIDENCE_REQUIREMENT_VALID`, `_STRUCTURE_AND_ANALYSIS_DIMENSIONS_VALID`, `_WRITERS_CHECKLIST_PREVIEW_VALID`.

## Reports & previews
- `reference/pssa/ela_item_type_surface_inventory.md` — screenshot-backed summary of observed response surfaces + source-backed Short-Answer/TDA rubric requirements; no copied item text.
- `exemplars/pssa_item_type_mocks/student_preview.md` — all nine mock types; no keys, rationales, or internal metadata.
- `exemplars/pssa_item_type_mocks/reviewer_preview.md` — all nine mock types; correct responses, scoring rules, rationales, gate results.
- `reports/pssa_item_type_mock_audit.csv` — columns: itemId, itemType, interactionType, interactionSubtype, hasValidResponseSpec, hasValidCorrectResponse, instructionMatchesResponse, scoringValid, sourceCompliance, studentPreviewRenderable, reviewerPreviewRenderable, finalResult, notes.

## Acceptance
- All nine top-level families represented, one original toy mock each: MCQ, EBSR, MULTI_SELECT, INLINE_DROPDOWN, MATCHING_GRID, HOT_TEXT, DRAG_DROP, SHORT_ANSWER, TDA.
- Missing TE sub-variants represented at least in the subtype inventory: word-level hot-text, sentence-level hot-text, multi-blank dropdown, punctuation/token drag, drag-to-order, drag-to-category/chart.
- Student preview renders all mocks; reviewer preview renders all mocks; mock audit report generated.
- **9/9 mocks PASS** response-spec, correct-response, instruction-match, scoring, source-compliance, and preview-render gates.
- No real production items authored. No DRC/PDE/sampler text copied. No released student responses copied. No passages changed. No Grade 3 production item-count changed. No Grades 4–8 work. No approvals/imports/DB writes.

## Tests — negative fixtures required (keeps this detector-first, not preview-only)
For **each** `interactionType`, add at least one NEGATIVE fixture proving the family-specific gate fails the intended defect (passing mocks alone are not enough):
- MULTI_SELECT says "Choose two" but has three `correctIndices` → FAIL `_CORRECT_COUNT_MATCHES_INSTRUCTION`.
- INLINE_DROPDOWN has two blanks but one blank spec → FAIL `_EACH_BLANK_VALID`.
- MATCHING_GRID one-per-row item has two correct cells in one row → FAIL `_SELECTION_RULE_VALID`/`_NO_AMBIGUOUS_ALT_CELL`.
- HOT_TEXT `correctSpanId` not present in `selectableSpans` → FAIL `_CORRECT_SPANS_EXIST`.
- DRAG_DROP assignment points to a nonexistent target → FAIL `_ASSIGNMENTS_VALID`.
- EBSR Part B evidence not verbatim / does not support Part A → FAIL the corresponding EBSR gate.
- SHORT_ANSWER rubric omits the copied-text cap → FAIL `_COPIED_TEXT_CAP_ENCODED`.
- TDA prompt asks for summary/opinion only → FAIL `_NOT_SUMMARY_OR_OPINION_ONLY`.
- Grade/type: `SHORT_ANSWER` tagged Grade 5, or `TDA` tagged Grade 3 → FAIL `PSSA_ITEM_GRADE_TYPE_COMPATIBLE`.
- `interactionType: TDA` with `itemType: selected_response` → FAIL `PSSA_ITEM_TYPE_INTERACTION_CONSISTENT`.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit: schema/type updates; mock fixtures; preview renderer updates; audit logic; tests; reports; item-type inventory document. Do not leave untracked files.

## Stop — report
itemType/interactionType enum values added; mock item IDs; subtype inventory; student preview path; reviewer preview path; audit report path; PASS/FAIL table for all nine mocks; confirmation no production items authored; confirmation no official/released/DRC text copied; confirmation no passages changed; confirmation no approvals/imports/DB writes. **Do not proceed to Grade 3 EBSR production authoring in this PR — that is #4k.**

## Roadmap (after #4j merges)
`#4k` Grade 3 EBSR production · `#4l` Grade 3 multiple-select + hot-text · `#4m` matching-grid + drag-drop · `#4n` inline drop-down + conventions rebuild · `#4o` Short Answer / TDA production gates + first constructed-response tranche.

---

## Safeguard inheritance for production TEI / constructed-response items (governs #4k onward — NOT this mock PR)
This mock PR proves format-level safeguards only. The new item types must NOT get a lighter standard than the MCQs. Every production item type authored after #4j MUST inherit the existing PSSA quality gates wherever applicable. This section is the binding precondition for #4k and every later production PR; it is recorded here so the standard is fixed alongside the contract.

**1. Passage precondition.** For any passage-based item, the assigned passage must PASS `PSSA_PASSAGE_CROSS_DUPLICATE`, `PSSA_PASSAGE_TEMPLATE_SKELETON`, `PSSA_PASSAGE_TOPIC_COHERENCE`, `PSSA_PASSAGE_CONCRETENESS`. No TEI, Short Answer, or TDA item may be authored on a passage that fails passage-quality gates.

**2. Universal item safeguards.** Every production item must pass: source/license compliance; `reviewStatus=PENDING` / `itemStatus=candidate`; no copied PDE/DRC/released/sampler text; `eligibleContent` validity; `PSSA_ITEM_EC_SKILL_MISMATCH`; clean student preview; reviewer preview with scoring/rationales/gate results.

**3. Passage-grounding safeguards.** For passage-based items: answerable only from the assigned passage; no general-knowledge shortcut; no title-only shortcut; all quoted evidence spans appear verbatim in the assigned passage; no old-templated-passage evidence.

**4. MCQ-style subpart safeguards.** Any single-answer selected-response component — including EBSR Part A — inherits the Grade 3 MCQ gates: exactly one defensible correct answer; plausible passage-specific distractors; distractor roles; no generic distractors; no copied-choice shortcut; no duplicate/near-duplicate stem; no giveaway absolutes; no length shortcut; answer-position distribution reported.

**5. Multi-response / TEI safeguards.** For EBSR Part B, multiple-select, hot-text, matching/grid, and drag/drop: instruction matches correct-response count; no unmarked option/span/cell/token is equally correct; no correct option is unsupported; partial-credit rules explicit; scoring never awards full credit for unsupported evidence; every selected evidence span is verbatim and specific enough to support the answer; every distractor span/token/cell is plausible but wrong. (Note: "answer-position balance" doesn't transfer to hot-text/drag — the equivalent safeguard is "no equally-valid unmarked option.")

**6. Constructed-response safeguards.** SHORT_ANSWER: prompt requires text-based support; expected-answer components explicit; 3/2/1/0 rubric encoded; copied-text cap encoded. TDA: prompt is analytic (not summary/opinion-only); text-evidence requirement explicit; structure/analysis dimensions encoded; Writer's-Checklist preview renders; no claim of automated essay scoring unless separately built and calibrated.

**7. EC skill-match per surface** (the #4h lesson — a well-written, grounded item can still test the wrong skill for its EC tag): EBSR Part A tests the assigned EC skill and Part B evidence supports that same claim; multiple-select selects things matching the EC skill; hot-text asks for spans matching the EC skill; drag/drop and matching categorize by the EC skill; dropdown conventions items test the actual grammar/spelling/usage EC; Short Answer and TDA prompts match their rubric/standard. Fix the item to match the EC; never retag the EC to match the item.

**Acceptance for production PRs:** a production TEI/SA/TDA item cannot pass only because its response surface is valid. It must pass response-surface gates **and** passage gates (where applicable) **and** grounding gates **and** source-compliance gates **and** EC skill-match gates.
