# PSSA PR #4k Grade 3 EBSR Vertical Slice Summary

## Reading State

- Approved Grade 3 passages used: 5
- Existing Grade 3 MCQ reading items unchanged: 28
- New Grade 3 EBSR items: 5
- EBSR is a separate stream and is not folded into the 28-MCQ count.
- Existing MCQ audit rerun status: PASS via `npm run content:audit-pssa`.
- DB writes/imports/approvals: none.

## EBSR Rule IDs

- PSSA_EBSR_SCHEMA_VALID
- PSSA_EBSR_PART_A_SINGLE_DEFENSIBLE
- PSSA_EBSR_PART_B_VERBATIM_EVIDENCE
- PSSA_EBSR_PART_B_SUPPORTS_PART_A
- PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION
- PSSA_EBSR_SKILL_MATCH
- PSSA_EBSR_PARTIAL_CREDIT_VALID
- PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY

## Item PASS Table

| itemId | passage | EC | Part B correct count | spans found | support | skill | scoring | source | final |
|---|---|---|---:|---|---|---|---|---|---|
| pssa_ebsr_g3_creek_01 | The Night the Creek Glowed | E03.B-K.1.1.2 | 2 | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ebsr_g3_map_01 | A Map Under the Bench | E03.B-K.1.1.2 | 2 | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ebsr_g3_lunch_01 | The Bell That Saved Lunch | E03.B-K.1.1.3 | 2 | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ebsr_g3_mural_01 | Blue Paint for Saturday | E03.A-K.1.1.2 | 2 | PASS | PASS | PASS | PASS | PASS | PASS |
| pssa_ebsr_g3_cart_01 | The Cart That Would Not Turn | E03.B-K.1.1.3 | 2 | PASS | PASS | PASS | PASS | PASS | PASS |

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

## Source-Compliance Scan Method

Case, punctuation, and whitespace are normalized. Item fields and assigned passage text are scanned against `reference/pssa-released-items/`, `reference/pssa-item-catalog/`, and extracted project source text where present. Content-bearing matches of 8+ normalized tokens are blockers. Generic directions such as "Choose two answers", "Part One", and "Part Two" are reported as boilerplate and do not block by themselves.

| itemId | matched source | field | longest n-gram | overlap | match type | result |
|---|---|---|---|---:|---|---|
| pssa_ebsr_g3_creek_01 | none | partA.stem |  | 0 | none | PASS |
| pssa_ebsr_g3_map_01 | none | partA.stem |  | 0 | none | PASS |
| pssa_ebsr_g3_lunch_01 | none | partA.stem |  | 0 | none | PASS |
| pssa_ebsr_g3_mural_01 | none | partA.stem |  | 0 | none | PASS |
| pssa_ebsr_g3_cart_01 | none | partA.stem |  | 0 | none | PASS |

## Adversarial Fixtures

| fixture | expected rule | actual result | notes |
|---|---|---|---|
| topic-only support | PSSA_EBSR_PART_B_SUPPORTS_PART_A | FAIL | PSSA_EBSR_PART_B_SUPPORTS_PART_A |
| equally valid distractor | PSSA_EBSR_PART_B_SUPPORTS_PART_A | FAIL | PSSA_EBSR_PART_B_SUPPORTS_PART_A |
| wrong EC skill | PSSA_EBSR_SKILL_MATCH | FAIL | PSSA_EBSR_SKILL_MATCH |
