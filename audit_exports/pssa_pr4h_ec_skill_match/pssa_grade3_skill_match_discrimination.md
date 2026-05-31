# PSSA PR #4h EC Skill-Match Discrimination

- Rule ID: PSSA_ITEM_EC_SKILL_MISMATCH
- Total Grade 3 items: 28
- PASS/WARN/FAIL: 21/2/5
- Deterministic FAIL rows are expected proof findings in PR #4h and are not waived to PASS.

## Fixed Fixture Check

| itemId | expected | actual | family |
|---|---|---|---|
| pssa_item_g3_reading_6 | PASS | PASS | vocabulary |
| pssa_item_g3_reading_7 | FAIL | FAIL | vocabulary |
| pssa_item_g3_reading_16 | FAIL | FAIL | vocabulary |
| pssa_item_g3_reading_17 | FAIL | FAIL | vocabulary |
| pssa_item_g3_reading_23 | FAIL | FAIL | vocabulary |
| pssa_item_g3_reading_24 | FAIL | FAIL | vocabulary |
| pssa_item_g3_reading_1 | PASS | PASS | literature_elements |
| pssa_item_g3_reading_14 | PASS | PASS | informational_elements |
| pssa_item_g3_reading_25 | PASS | PASS | informational_elements |

## Failed Items

| itemId | EC | stem | expected | observed | reason |
|---|---|---|---|---|---|
| pssa_item_g3_reading_7 | E03.A-V.4.1.2 | What is the main reason people spent longer near the station bench? | word_or_phrase_meaning_in_context | key_ideas_details | Vocabulary EC requires a specific target word or phrase from the passage. |
| pssa_item_g3_reading_16 | E03.B-V.4.1.1 | What does Maya's Friday visit show about what she learned at Pine Creek? | word_or_phrase_meaning_in_context | inference | Vocabulary EC requires a specific target word or phrase from the passage. |
| pssa_item_g3_reading_17 | E03.B-V.4.1.2 | Which evidence shows visitors could compare the town's past and present? | word_or_phrase_meaning_in_context | evidence_use | Vocabulary EC requires a specific target word or phrase from the passage. |
| pssa_item_g3_reading_23 | E03.A-V.4.1.1 | What did the class notice after watching the cafeteria counter? | word_or_phrase_meaning_in_context | informational_elements | Vocabulary EC requires a specific target word or phrase from the passage. |
| pssa_item_g3_reading_24 | E03.A-V.4.1.2 | Which event shows the narrator felt proud but quiet about her work? | word_or_phrase_meaning_in_context | inference | Vocabulary EC requires a specific target word or phrase from the passage. |

## Vocabulary-Tagged Items

| itemId | EC | result | targetWordOrPhrase | evidenceContainsTarget | stem |
|---|---|---|---|---|---|
| pssa_item_g3_reading_6 | E03.A-V.4.1.1 | PASS | faint | true | In the creek passage, what does faint mean when the glow became a faint stripe? |
| pssa_item_g3_reading_7 | E03.A-V.4.1.2 | FAIL | (none) | false | What is the main reason people spent longer near the station bench? |
| pssa_item_g3_reading_16 | E03.B-V.4.1.1 | FAIL | (none) | false | What does Maya's Friday visit show about what she learned at Pine Creek? |
| pssa_item_g3_reading_17 | E03.B-V.4.1.2 | FAIL | (none) | false | Which evidence shows visitors could compare the town's past and present? |
| pssa_item_g3_reading_23 | E03.A-V.4.1.1 | FAIL | (none) | false | What did the class notice after watching the cafeteria counter? |
| pssa_item_g3_reading_24 | E03.A-V.4.1.2 | FAIL | (none) | false | Which event shows the narrator felt proud but quiet about her work? |

## PASS/WARN/FAIL By Skill Family

| skillFamily | PASS | WARN | FAIL |
|---|---:|---:|---:|
| craft_structure | 6 | 1 | 0 |
| inference_evidence | 3 | 0 | 0 |
| informational_elements | 6 | 0 | 0 |
| literature_elements | 5 | 1 | 0 |
| vocabulary | 1 | 0 | 5 |

