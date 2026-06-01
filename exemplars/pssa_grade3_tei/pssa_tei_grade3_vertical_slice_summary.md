# PSSA PR #4l Grade 3 Multiple-Select + Hot-Text Vertical Slice Summary

## Inheritance

- #4j item-type contract and production safeguard inheritance reused.
- #4k-fix EBSR tranche unchanged; batch shortcut and hardened source scan patterns carried forward.
- Existing Grade 3 MCQs unchanged: 28.
- Existing Grade 3 EBSRs unchanged: 5.
- New MULTI_SELECT items: 5.
- New HOT_TEXT items: 5.
- DB writes/imports/approvals: none.

## Item IDs

- MULTI_SELECT: pssa_ms_g3_creek_01, pssa_ms_g3_map_01, pssa_ms_g3_lunch_01, pssa_ms_g3_mural_01, pssa_ms_g3_cart_01
- HOT_TEXT: pssa_ht_g3_creek_01, pssa_ht_g3_map_01, pssa_ht_g3_lunch_01, pssa_ht_g3_mural_01, pssa_ht_g3_cart_01

## EC Distribution

- E03.A-K.1.1.2: 2
- E03.B-K.1.1.2: 4
- E03.B-K.1.1.3: 4

## Surface Shortcut Summary

| tranche | interactionType | itemCount | correctPositionPatterns | correctSpanLocationPatterns | result | notes |
|---|---|---:|---|---|---|---|
| grade3_pr4l_multi_select | MULTI_SELECT | 5 | 0,1:1 0,2:1 1,2:1 1,3:1 2,3:1 |  | PASS | PSSA_MULTI_SELECT_POSITION_DISTRIBUTION passed. |
| grade3_pr4l_hot_text | HOT_TEXT | 5 | firstTwo:0 | p1-s1+p1-s2:1 p2-s0+p2-s4:1 p2-s1+p2-s2:1 p2-s3+p4-s3:1 p3-s0+p3-s2:1 | PASS | PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION passed. |

## MULTI_SELECT Audit Table

| itemId | passage | EC | correctIndices | count | grounding | no extra | distractors | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pssa_ms_g3_creek_01 | The Night the Creek Glowed | E03.B-K.1.1.2 | 0,2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ms_g3_map_01 | A Map Under the Bench | E03.B-K.1.1.2 | 1,3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ms_g3_lunch_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | 0,1 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ms_g3_mural_01 | Blue Paint for Saturday | E03.A-K.1.1.2 | 2,3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ms_g3_cart_01 | The Cart That Would Not Turn | E03.B-K.1.1.3 | 1,2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

## HOT_TEXT Audit Table

| itemId | passage | EC | correct locations | spans | count | no extra | supports | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pssa_ht_g3_creek_01 | The Night the Creek Glowed | E03.B-K.1.1.2 | pssa_ht_g3_creek_01_span_2:p2s0|pssa_ht_g3_creek_01_span_3:p2s4 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ht_g3_map_01 | A Map Under the Bench | E03.B-K.1.1.2 | pssa_ht_g3_map_01_span_3:p3s0|pssa_ht_g3_map_01_span_4:p3s2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ht_g3_lunch_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | pssa_ht_g3_lunch_01_span_2:p2s1|pssa_ht_g3_lunch_01_span_3:p2s2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ht_g3_mural_01 | Blue Paint for Saturday | E03.A-K.1.1.2 | pssa_ht_g3_mural_01_span_3:p2s3|pssa_ht_g3_mural_01_span_4:p4s3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ht_g3_cart_01 | The Cart That Would Not Turn | E03.B-K.1.1.3 | pssa_ht_g3_cart_01_span_2:p1s1|pssa_ht_g3_cart_01_span_3:p1s2 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

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

- Source scan fields include stems/prompts, instructions, choices, selectable spans, rationales, reviewer-facing notes, and assigned passage text.
- Content-bearing source-scan failures: 0
- All 10 new items PASS source compliance.
