# PSSA PR #4o Grade 3 Short Answer Summary

## Inheritance / Scope

- #4j-#4n inherited gates reused.
- Short Answer is passage-based reading constructed response and inherits passage-quality, passage-grounding, EC validity, source-compliance, preview-leak, and item-type compatibility checks.
- Position/order shortcut gates do not apply to Short Answer; copied-text cap is the SA-equivalent anti-shortcut.
- This PR validates rubric structure and previews only. It makes no automated-scoring claim.
- No DB writes/imports/approvals. No Grades 4-8. No prior passages or items rewritten.

## Pre-Authoring Inventory

| existing SA | active old SA | deprecated/quarantined SA | EC distribution | result | notes |
|---:|---:|---:|---|---|---|
| 0 | 0 | 0 | none | PASS | No active old Grade 3 Short Answer items found. |

## Pool Accounting

| pool count | live draw | points/item | active form SA points | pool SA points | result |
|---:|---:|---:|---:|---:|---|
| 5 | 2 | 3 | 6 | 15 | PASS |

## Item Table

| itemId | passage | EC | supports | final |
|---|---|---|---:|---|
| pssa_sa_g3_creek_main_idea_01 | The Night the Creek Glowed | E03.B-K.1.1.2 | 3 | PASS |
| pssa_sa_g3_map_evidence_01 | A Map Under the Bench | E03.B-C.3.1.3 | 3 | PASS |
| pssa_sa_g3_lunch_sequence_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | 4 | PASS |
| pssa_sa_g3_mural_character_01 | Blue Paint for Saturday | E03.A-K.1.1.3 | 4 | PASS |
| pssa_sa_g3_cart_connection_01 | The Cart That Would Not Turn | E03.B-C.3.1.1 | 4 | PASS |

## Grade 3 Item-Type Completeness

| item type | status | count/draw | notes |
|---|---|---|---|
| MCQ | PRESENT | 28 reading MCQs | Existing Grade 3 reading MCQ stream. |
| EBSR | PRESENT | 5 pool items | Existing #4k stream. |
| Multiple Select | PRESENT | 5 pool items | Existing #4l stream. |
| Hot Text | PRESENT | 5 pool items | Existing #4l stream. |
| Matching Grid | PRESENT | 5 pool items | Existing #4m stream. |
| Drag Drop | PRESENT | 5 pool items | Existing #4m stream. |
| Inline Dropdown / Conventions | PRESENT | 9 points | Existing #4n stream; 12 old conventions MCQs remain deprecated. |
| Short Answer | PRESENT | 5 pool items; draw 2 | Added by #4o. |
| TDA | N/A | 0 | N/A for Grade 3; production deferred to Grades 4-8. |

## Source Scan Summary

- Source-compliance failures: 0
- Fields scanned: 83

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
| grade3_9_pr4n_conventions_items | 9 | 6c44301b852dad7a8759e3512e8f1b8c4b746767a1d93a799e4d5a67f5d06c71 | 6c44301b852dad7a8759e3512e8f1b8c4b746767a1d93a799e4d5a67f5d06c71 | YES |
| grade3_12_deprecated_conventions_mcqs | 12 | 248a0ce184da643cf2a04cff1ae86c7eb2cfb218738b8ad3b1152bebb9317cb2 | 248a0ce184da643cf2a04cff1ae86c7eb2cfb218738b8ad3b1152bebb9317cb2 | YES |

## Final Short Answer Audit Table

| itemId | EC | quote spans | rubric | prompt support | copied cap | examples | support sufficiency | skill | grounding | source | preview | final |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| pssa_sa_g3_creek_main_idea_01 | E03.B-K.1.1.2 | 3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_sa_g3_map_evidence_01 | E03.B-C.3.1.3 | 3 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_sa_g3_lunch_sequence_01 | E03.B-K.1.1.3 | 4 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_sa_g3_mural_character_01 | E03.A-K.1.1.3 | 4 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_sa_g3_cart_connection_01 | E03.B-C.3.1.1 | 4 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
