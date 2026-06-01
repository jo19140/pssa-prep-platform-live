# PSSA PR #4m Grade 3 Matching Grid + Drag Drop Vertical Slice Summary

## Inheritance

- #4j item-type contract and section 4a batch-level shortcut inheritance reused.
- #4k-fix EBSR hardened source scan and batch shortcut pattern carried forward.
- #4l multiple-select and hot-text tranche present and unchanged by hash proof.
- Existing Grade 3 MCQs unchanged: 28.
- Existing Grade 3 EBSRs unchanged: 5.
- Existing #4l MULTI_SELECT/HOT_TEXT items unchanged: 10.
- New MATCHING_GRID items: 5.
- New DRAG_DROP items: 5.
- DB writes/imports/approvals: none.

## Item IDs

- MATCHING_GRID: pssa_mg_g3_creek_01, pssa_mg_g3_map_01, pssa_mg_g3_lunch_01, pssa_mg_g3_mural_01, pssa_mg_g3_cart_01
- DRAG_DROP: pssa_dd_g3_creek_01, pssa_dd_g3_map_01, pssa_dd_g3_lunch_01, pssa_dd_g3_mural_01, pssa_dd_g3_cart_01

## Passage Mapping

| passage | matchingGrid | dragDrop |
|---|---|---|
| The Night the Creek Glowed | pssa_mg_g3_creek_01 | pssa_dd_g3_creek_01 |
| A Map Under the Bench | pssa_mg_g3_map_01 | pssa_dd_g3_map_01 |
| The Bell That Saved Lunch | pssa_mg_g3_lunch_01 | pssa_dd_g3_lunch_01 |
| Blue Paint for Saturday | pssa_mg_g3_mural_01 | pssa_dd_g3_mural_01 |
| The Cart That Would Not Turn | pssa_mg_g3_cart_01 | pssa_dd_g3_cart_01 |

## EC Distribution

- E03.A-K.1.1.2: 2
- E03.B-K.1.1.2: 3
- E03.B-K.1.1.3: 5

## Surface Shortcut Summary

| tranche | interactionType | itemCount | correctColumnPatterns | correctAssignmentPatterns | orderPatterns | result | notes |
|---|---|---:|---|---|---|---|---|
| grade3_pr4m_matching_grid | MATCHING_GRID | 5 | 0,1,2:1 1,0,2:1 1,2,0:1 2,0,1:1 2,1,0:1 | col0:5 col1:5 col2:5 |  | PASS | PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION passed. |
| grade3_pr4m_drag_drop | DRAG_DROP | 5 |  | 0>0,1>1,3>1:1 0>0,3>0,1>1:1 | 1,2,0:2 2,1,0:1 | PASS | PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION passed. |

## Unchanged Hash Proof

| contentGroup | itemCount | beforeHash | afterHash | unchanged |
|---|---:|---|---|---|
| grade3_passages | 5 | 7ec3bed5d48895f5b2b116e6d13b68b7e1be77c7916250e5b370078624a7f662 | 7ec3bed5d48895f5b2b116e6d13b68b7e1be77c7916250e5b370078624a7f662 | YES |
| grade3_28_reading_mcqs | 28 | 987474994de1a35630bad928238ec76d39a3f8d765ca07416c984a4c33a6c200 | 987474994de1a35630bad928238ec76d39a3f8d765ca07416c984a4c33a6c200 | YES |
| grade3_5_ebsr_items | 5 | 4bb2eb6bc351b7cc7275a2b2f872010f8bff4638c1713bd170a7a5b3d80c9a2f | 4bb2eb6bc351b7cc7275a2b2f872010f8bff4638c1713bd170a7a5b3d80c9a2f | YES |
| grade3_5_pr4l_multi_select_items | 5 | 84a1fbef2c82bec76cd63cb7d1270461cf5d0ead266d466311ebcf63f520280e | 84a1fbef2c82bec76cd63cb7d1270461cf5d0ead266d466311ebcf63f520280e | YES |
| grade3_5_pr4l_hot_text_items | 5 | 469274f900116590e9f34dff979d2fcd4fd722ffdc8ced982b84f83f094806b8 | 469274f900116590e9f34dff979d2fcd4fd722ffdc8ced982b84f83f094806b8 | YES |

## MATCHING_GRID Audit Table

| itemId | passage | EC | correctCells | selection | cells | ambiguity | both | pairing | grounding | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pssa_mg_g3_creek_01 | The Night the Creek Glowed | E03.B-K.1.1.2 | creek_r1:observed_detail|creek_r2:explanation_clue|creek_r3:later_result | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_mg_g3_map_01 | A Map Under the Bench | E03.B-K.1.1.2 | map_r2:present_change|map_r1:old_map_detail|map_r3:lasting_landmark | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_mg_g3_lunch_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | lunch_r3:result|lunch_r1:problem|lunch_r2:change | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_mg_g3_mural_01 | Blue Paint for Saturday | E03.A-K.1.1.2 | mural_r2:mistake_response|mural_r3:lesson_result|mural_r1:setting_detail | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_mg_g3_cart_01 | The Cart That Would Not Turn | E03.B-K.1.1.3 | cart_r3:lesson|cart_r2:repair_step|cart_r1:problem | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## DRAG_DROP Audit Table

| itemId | passage | EC | subtype | correctAssignments | assignments | capacity | no extra valid | order | grounding | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pssa_dd_g3_creek_01 | The Night the Creek Glowed | E03.B-K.1.1.3 | order | creek_t2:order_1|creek_t3:order_2|creek_t1:order_3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_dd_g3_map_01 | A Map Under the Bench | E03.B-K.1.1.2 | category_chart | map_t1:changed|map_t4:changed|map_t2:same | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_dd_g3_lunch_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | order | lunch_t2:order_1|lunch_t3:order_2|lunch_t1:order_3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_dd_g3_mural_01 | Blue Paint for Saturday | E03.A-K.1.1.2 | category_chart | mural_t1:mistake_to_art|mural_t2:good_result|mural_t4:good_result | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_dd_g3_cart_01 | The Cart That Would Not Turn | E03.B-K.1.1.3 | order | cart_t3:order_1|cart_t2:order_2|cart_t1:order_3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

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

## Source Scan Summary

- Source scan fields include stems/prompts, instructions, row labels, column labels, correct-cell strings, token text, target labels, assignments, rationales, reviewer-facing notes, and assigned passage text.
- Content-bearing source-scan failures: 0
- All 10 new items PASS source compliance.
- Student preview leak check: PASS
