# PSSA PR #4i EC Skill-Match Repair

- Rule ID: PSSA_ITEM_EC_SKILL_MISMATCH
- Total Grade 3 items: 28
- PASS/WARN/FAIL: 28/0/0
- Former PR #4h FAIL/WARN rows are repaired in place; EC tags are preserved and no deterministic result is waived.

## Before/After Fixture Check

| itemId | PR4h expected | PR4i actual | family |
|---|---|---|---|
| pssa_item_g3_reading_6 | PASS | PASS | vocabulary |
| pssa_item_g3_reading_7 | FAIL | PASS | vocabulary |
| pssa_item_g3_reading_16 | FAIL | PASS | vocabulary |
| pssa_item_g3_reading_17 | FAIL | PASS | vocabulary |
| pssa_item_g3_reading_23 | FAIL | PASS | vocabulary |
| pssa_item_g3_reading_24 | FAIL | PASS | vocabulary |
| pssa_item_g3_reading_1 | PASS | PASS | literature_elements |
| pssa_item_g3_reading_14 | PASS | PASS | informational_elements |
| pssa_item_g3_reading_25 | PASS | PASS | informational_elements |

## Failed Items

| itemId | EC | stem | expected | observed | reason |
|---|---|---|---|---|---|
| none |  |  |  |  |  |

## Warning Items

| itemId | EC | stem | expected | observed | reason |
|---|---|---|---|---|---|
| none |  |  |  |  |  |

## Vocabulary-Tagged Items

| itemId | EC | result | targetWordOrPhrase | evidenceContainsTarget | stem |
|---|---|---|---|---|---|
| pssa_item_g3_reading_6 | E03.A-V.4.1.1 | PASS | faint | true | In the creek passage, what does faint mean when the glow became a faint stripe? |
| pssa_item_g3_reading_7 | E03.A-V.4.1.2 | PASS | creases | true | What does creases mean as it is used in the station passage? |
| pssa_item_g3_reading_16 | E03.B-V.4.1.1 | PASS | faded | true | What does faded mean as it is used in the creek passage? |
| pssa_item_g3_reading_17 | E03.B-V.4.1.2 | PASS | landmarks | true | What does landmarks mean as it is used in the station passage? |
| pssa_item_g3_reading_23 | E03.A-V.4.1.1 | PASS | tucked | true | What does tucked mean as it is used in the lunch passage? |
| pssa_item_g3_reading_24 | E03.A-V.4.1.2 | PASS | traced | true | What does traced mean as it is used in the mural passage? |

## PASS/WARN/FAIL By Skill Family

| skillFamily | PASS | WARN | FAIL |
|---|---:|---:|---:|
| craft_structure | 7 | 0 | 0 |
| inference_evidence | 3 | 0 | 0 |
| informational_elements | 6 | 0 | 0 |
| literature_elements | 6 | 0 | 0 |
| vocabulary | 6 | 0 | 0 |

