# PSSA PR #4n Grade 3 Inline Drop-Down + Conventions Rebuild Summary

## Inheritance

- #4j item-type contract includes INLINE_DROPDOWN and section 4a batch shortcut inheritance.
- #4k-fix/#4l/#4m source scan and TEI streams remain unchanged by hash proof.
- New conventions stream: 9 points.
- Deprecated old Grade 3 conventions MCQs: 12.
- DB writes/imports/approvals: none.

## Item / Point Table

| itemId | interactionType | subtype | points | EC | target |
|---|---|---|---:|---|---|
| pssa_conv_g3_dropdown_plural_01 | INLINE_DROPDOWN | single_blank | 1 | E03.D.1.1.2 | plural_nouns |
| pssa_conv_g3_dropdown_verbtense_01 | INLINE_DROPDOWN | grammar_usage | 1 | E03.D.1.1.5 | verb_tense |
| pssa_conv_g3_dropdown_compare_01 | INLINE_DROPDOWN | grammar_usage | 1 | E03.D.1.1.7 | comparative_superlative |
| pssa_conv_g3_dropdown_titles_01 | INLINE_DROPDOWN | punctuation_capitalization | 1 | E03.D.1.2.1 | title_capitalization |
| pssa_conv_g3_hottext_spelling_01 | HOT_TEXT | word_select | 1 | E03.D.1.2.5 | spelling_in_context |
| pssa_conv_g3_hottext_function_01 | HOT_TEXT | word_select | 1 | E03.D.1.1.1 | word_function |
| pssa_conv_g3_drag_address_01 | DRAG_DROP | token_placement | 1 | E03.D.1.2.2 | commas_in_addresses |
| pssa_conv_g3_drag_dialogue_01 | DRAG_DROP | token_placement | 1 | E03.D.1.2.3 | dialogue_punctuation |
| pssa_conv_g3_mcq_agreement_01 | MCQ | standalone_conventions | 1 | E03.D.1.1.6 | subject_verb_agreement |

## Distributions

- Interaction types: DRAG_DROP:2; HOT_TEXT:2; INLINE_DROPDOWN:4; MCQ:1
- ECs: E03.D.1.1.1:1; E03.D.1.1.2:1; E03.D.1.1.5:1; E03.D.1.1.6:1; E03.D.1.1.7:1; E03.D.1.2.1:1; E03.D.1.2.2:1; E03.D.1.2.3:1; E03.D.1.2.5:1
- Target conventions: commas_in_addresses:1; comparative_superlative:1; dialogue_punctuation:1; plural_nouns:1; spelling_in_context:1; subject_verb_agreement:1; title_capitalization:1; verb_tense:1; word_function:1
- Error patterns: adjective:1; article:2; awkward comparative form:1; correct word:6; important title word left lowercase:1; missing -es plural:1; missing_finite_verb:1; nonstandard plural ending:1; noun:2; past tense:1; period does not belong inside this series:1; period does not mark spoken words:1; plural_verb_with_singular_subject:1; preposition:1; present/base form:1; proper noun and title word lowercase:1; singular_verb_with_plural_subject:1; superlative for three or more:1; verb:1
- Dropdown correct index distribution: 0:2 1:1 2:1
- Word hot-text token-position distribution: 1,2:1 2:1
- Punctuation drag token/slot distribution: 0>0,1>1:1 1>0,2>1:1
- MCQ answer-position distribution: 2:1
- Conventions surface-shortcut batch result: PASS

## Source Scan Summary

- Content-bearing source-scan failures: 0
- All 9 conventions points PASS source compliance.

## Deprecated Conventions

| oldItemId | before | after | oldEc | supersededBy | newEc | notes |
|---|---|---|---|---|---|---|
| pssa_item_g3_conv_29 | candidate | deprecated_superseded | E03.D.1.1.1 | pssa_conv_g3_hottext_function_01 | E03.D.1.1.1 | Same EC replacement. |
| pssa_item_g3_conv_30 | candidate | deprecated_superseded | E03.D.1.1.2 | pssa_conv_g3_dropdown_plural_01 | E03.D.1.1.2 | Same EC replacement. |
| pssa_item_g3_conv_31 | candidate | deprecated_superseded | E03.D.1.1.3 | pssa_conv_g3_dropdown_plural_01 | E03.D.1.1.2 | Same conventions subskill-group replacement. |
| pssa_item_g3_conv_32 | candidate | deprecated_superseded | E03.D.1.1.4 | pssa_conv_g3_dropdown_verbtense_01 | E03.D.1.1.5 | Same conventions subskill-group replacement. |
| pssa_item_g3_conv_33 | candidate | deprecated_superseded | E03.D.1.1.5 | pssa_conv_g3_dropdown_verbtense_01 | E03.D.1.1.5 | Same EC replacement. |
| pssa_item_g3_conv_34 | candidate | deprecated_superseded | E03.D.1.1.6 | pssa_conv_g3_mcq_agreement_01 | E03.D.1.1.6 | Same EC replacement. |
| pssa_item_g3_conv_35 | candidate | deprecated_superseded | E03.D.1.1.7 | pssa_conv_g3_dropdown_compare_01 | E03.D.1.1.7 | Same EC replacement. |
| pssa_item_g3_conv_36 | candidate | deprecated_superseded | E03.D.1.1.8 | pssa_conv_g3_mcq_agreement_01 | E03.D.1.1.6 | Same conventions subskill-group replacement. |
| pssa_item_g3_conv_37 | candidate | deprecated_superseded | E03.D.1.1.9 | pssa_conv_g3_mcq_agreement_01 | E03.D.1.1.6 | Same conventions subskill-group replacement. |
| pssa_item_g3_conv_38 | candidate | deprecated_superseded | E03.D.1.2.1 | pssa_conv_g3_dropdown_titles_01 | E03.D.1.2.1 | Same EC replacement. |
| pssa_item_g3_conv_39 | candidate | deprecated_superseded | E03.D.1.2.2 | pssa_conv_g3_drag_address_01 | E03.D.1.2.2 | Same EC replacement. |
| pssa_item_g3_conv_40 | candidate | deprecated_superseded | E03.D.1.2.3 | pssa_conv_g3_drag_dialogue_01 | E03.D.1.2.3 | Same EC replacement. |

## Unchanged Hash Proof

| contentGroup | itemCount | beforeHash | afterHash | unchanged |
|---|---:|---|---|---|
| grade3_passages | 5 | 7ec3bed5d48895f5b2b116e6d13b68b7e1be77c7916250e5b370078624a7f662 | 7ec3bed5d48895f5b2b116e6d13b68b7e1be77c7916250e5b370078624a7f662 | YES |
| grade3_28_reading_mcqs | 28 | 987474994de1a35630bad928238ec76d39a3f8d765ca07416c984a4c33a6c200 | 987474994de1a35630bad928238ec76d39a3f8d765ca07416c984a4c33a6c200 | YES |
| grade3_5_ebsr_items | 5 | 4bb2eb6bc351b7cc7275a2b2f872010f8bff4638c1713bd170a7a5b3d80c9a2f | 4bb2eb6bc351b7cc7275a2b2f872010f8bff4638c1713bd170a7a5b3d80c9a2f | YES |
| grade3_5_pr4l_multi_select_items | 5 | 84a1fbef2c82bec76cd63cb7d1270461cf5d0ead266d466311ebcf63f520280e | 84a1fbef2c82bec76cd63cb7d1270461cf5d0ead266d466311ebcf63f520280e | YES |
| grade3_5_pr4l_hot_text_items | 5 | 469274f900116590e9f34dff979d2fcd4fd722ffdc8ced982b84f83f094806b8 | 469274f900116590e9f34dff979d2fcd4fd722ffdc8ced982b84f83f094806b8 | YES |
| grade3_5_pr4m_matching_grid_items | 5 | 7d8b148407e4c47cd46fe7c6b2139928b741b92366247fc4b5b159f7d94291ee | 7d8b148407e4c47cd46fe7c6b2139928b741b92366247fc4b5b159f7d94291ee | YES |
| grade3_5_pr4m_drag_drop_items | 5 | 7a0e64c20592c936da6fb9afce2501d0fc14f0cdf4d0286110a8531c5181c8d9 | 7a0e64c20592c936da6fb9afce2501d0fc14f0cdf4d0286110a8531c5181c8d9 | YES |

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
| pssa_psg_g3_creek_watchers | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | 0 | Unique against evaluated passages. |
| pssa_psg_g3_the_map_in_the_station | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | 0 | Unique against evaluated passages. |
| pssa_psg_g3_a_cooler_lunch_line | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | 0 | Unique against evaluated passages. |
| pssa_psg_g3_the_mural_plan | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | 0 | Unique against evaluated passages. |
| pssa_psg_g3_the_cart_that_would_not_turn | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | 0 | Unique against evaluated passages. |
| pssa_psg_g3_creek_watchers | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | 1 | No reused masked skeleton found. |
| pssa_psg_g3_the_map_in_the_station | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | 1 | No reused masked skeleton found. |
| pssa_psg_g3_a_cooler_lunch_line | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | 1 | No reused masked skeleton found. |
| pssa_psg_g3_the_mural_plan | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | 1 | No reused masked skeleton found. |
| pssa_psg_g3_the_cart_that_would_not_turn | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | 1 | No reused masked skeleton found. |
| pssa_psg_g3_creek_watchers | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | 5 | Topic terms recur through the body without deterministic conflict terms. |
| pssa_psg_g3_the_map_in_the_station | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | 5 | Topic terms recur through the body without deterministic conflict terms. |
| pssa_psg_g3_a_cooler_lunch_line | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | 5 | Topic terms recur through the body without deterministic conflict terms. |
| pssa_psg_g3_the_mural_plan | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | 5 | Topic terms recur through the body without deterministic conflict terms. |
| pssa_psg_g3_the_cart_that_would_not_turn | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | 5 | Topic terms recur through the body without deterministic conflict terms. |
| pssa_psg_g3_creek_watchers | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | 0.8837 | Concrete topic detail ratio passes calibrated threshold. |
| pssa_psg_g3_the_map_in_the_station | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | 0.9351 | Concrete topic detail ratio passes calibrated threshold. |
| pssa_psg_g3_a_cooler_lunch_line | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | 0.8896 | Concrete topic detail ratio passes calibrated threshold. |
| pssa_psg_g3_the_mural_plan | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | 0.9686 | Concrete topic detail ratio passes calibrated threshold. |
| pssa_psg_g3_the_cart_that_would_not_turn | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | 0.902 | Concrete topic detail ratio passes calibrated threshold. |

## Final Audit Table

| itemId | type | EC | skill | context | ambiguity | distractors | partial | source | shortcut | preview | final |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pssa_conv_g3_dropdown_plural_01 | INLINE_DROPDOWN | E03.D.1.1.2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_dropdown_verbtense_01 | INLINE_DROPDOWN | E03.D.1.1.5 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_dropdown_compare_01 | INLINE_DROPDOWN | E03.D.1.1.7 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_dropdown_titles_01 | INLINE_DROPDOWN | E03.D.1.2.1 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_hottext_spelling_01 | HOT_TEXT | E03.D.1.2.5 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_hottext_function_01 | HOT_TEXT | E03.D.1.1.1 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_drag_address_01 | DRAG_DROP | E03.D.1.2.2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_drag_dialogue_01 | DRAG_DROP | E03.D.1.2.3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_conv_g3_mcq_agreement_01 | MCQ | E03.D.1.1.6 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
