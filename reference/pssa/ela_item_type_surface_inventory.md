# PSSA ELA Item-Type Surface Inventory

This inventory locks the PR #4j response-surface contract for Pennsylvania PSSA ELA while keeping all examples mock-only and original. It summarizes observed/required surfaces from the DRC INSIGHT screenshot catalog and PDE/DRC test-design references without copying official item text.

## Top-Level interactionType Enum

- `MCQ`
- `EBSR`
- `MULTI_SELECT`
- `INLINE_DROPDOWN`
- `MATCHING_GRID`
- `HOT_TEXT`
- `DRAG_DROP`
- `SHORT_ANSWER`
- `TDA`

## Subtype Inventory

- HOT_TEXT: `sentence_select`, `phrase_select`, `word_select`
- DRAG_DROP: `category_chart`, `order`, `token_placement`; `table_cell_replace` remains MC-via-drag
- INLINE_DROPDOWN: `single_blank`, `multi_blank`, `spelling`, `grammar_usage`, `punctuation_capitalization`, `reading_phrase`
- MULTI_SELECT: `choose_n_evidence`, `choose_n_traits`, `choose_n_notes`
- MATCHING_GRID: `one_per_row`, `multi_per_column`; `bothColumn` is explicit
- EBSR: `two_point`, `three_point`
- MCQ: `passage_based`, `standalone_conventions`
- SHORT_ANSWER: Grade 3 only, 3-point, text-supported
- TDA: Grades 4-8 only, 4-point analytic, weighted x4

## Mock Coverage

| itemId | itemType | interactionType | interactionSubtype | result |
|---|---|---|---|---|
| pssa_mock_mcq_01 | selected_response | MCQ | passage_based | PASS |
| pssa_mock_ebsr_01 | evidence_based_selected_response | EBSR | two_point | PASS |
| pssa_mock_multi_select_01 | technology_enhanced | MULTI_SELECT | choose_n_evidence | PASS |
| pssa_mock_inline_dropdown_01 | technology_enhanced | INLINE_DROPDOWN | multi_blank | PASS |
| pssa_mock_matching_grid_01 | technology_enhanced | MATCHING_GRID | one_per_row | PASS |
| pssa_mock_hot_text_01 | technology_enhanced | HOT_TEXT | sentence_select | PASS |
| pssa_mock_drag_drop_01 | technology_enhanced | DRAG_DROP | category_chart | PASS |
| pssa_mock_short_answer_01 | constructed_response | SHORT_ANSWER |  | PASS |
| pssa_mock_tda_01 | constructed_response | TDA |  | PASS |

## Source Compliance

Reference materials are used only to identify response surfaces and constructed-response scoring requirements. The mock item content, passages, choices, student responses, and rubrics/examples are original toy text for this repository. Production items must inherit response-surface gates plus passage-quality, source-compliance, grounding, and EC skill-match gates.
