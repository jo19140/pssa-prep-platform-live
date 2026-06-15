# PSSA Stamina Content-Quality Battery Report

Report mode: this file lists PASS/FAIL/SKIP findings for the 37-item encoded stamina diagnostic packet. It does not enforce all-pass yet.

## Functions Reused

- PSSA_CONTENT_QUALITY_GATE_IDS evaluators: intra-choice duplicate, vocab key construct, SA bands nonempty, EC genre match, passage multipoint evidence overlap.
- buildMcqPassageSpecificityReport, buildItemEcSkillMatchReport, buildMcqCorrectIsLongestReport, buildMcqAbsoluteLanguageDistractorReport.
- buildPssaPassageQualityReport.
- evaluatePssaStaminaGates and paired passageSlot variants for released-length, drama, and paired fixtures.
- singleAnswerChoiceGroups report-only shortcut extractor for MCQ plus EBSR Part A.

## Packet Counts

- Items: 37 total = 29 MCQ (20 reading + 9 conventions) + 4 EBSR + 4 SHORT_ANSWER.
- Passages: 5 encoded stamina passages across 1 paired group.

## #47 Visible Skip Set

| itemId | evidence |
| --- | --- |
| pssa_stamina_item_g3_boat_05 | SKIP_INFERENCE_INTERPRETATION:inference |
| pssa_stamina_item_g3_rabbit_03 | SKIP_INFERENCE_INTERPRETATION:inference |
| pssa_stamina_item_g3_rabbit_04 | SKIP_INFERENCE_INTERPRETATION:interpretation |
| pssa_stamina_item_g3_rabbit_06 | SKIP_INFERENCE_INTERPRETATION:inference |

## Correct-Is-Longest Detail

| itemId | source | result | correctWords | maxDistractorWords | gap | uniquelyLongest | notes |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| pssa_stamina_item_g3_syrup_01 | MCQ | FAIL | 12 | 10 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 34% chars. |
| pssa_stamina_item_g3_syrup_02 | MCQ | PASS | 2 | 8 | -6 | false | Correct choice length is within threshold. |
| pssa_stamina_item_g3_syrup_03 | MCQ | FAIL | 13 | 11 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 32% chars. |
| pssa_stamina_item_g3_syrup_04 | MCQ | PASS | 11 | 11 | 0 | true | Correct choice length is within threshold. |
| pssa_stamina_item_g3_syrup_ebsr_01::partA | EBSR_PART_A | FAIL | 14 | 12 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 20% chars. |
| pssa_stamina_item_g3_boat_01 | MCQ | FAIL | 14 | 10 | 4 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 4 words and 74% chars. |
| pssa_stamina_item_g3_boat_02 | MCQ | PASS | 14 | 15 | -1 | false | Correct choice length is within threshold. |
| pssa_stamina_item_g3_boat_03 | MCQ | PASS | 7 | 7 | 0 | false | Correct choice length is within threshold. |
| pssa_stamina_item_g3_boat_04 | MCQ | FAIL | 12 | 10 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 26% chars. |
| pssa_stamina_item_g3_boat_05 | MCQ | FAIL | 19 | 9 | 10 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 10 words and 140% chars. |
| pssa_stamina_item_g3_boat_ebsr_01::partA | EBSR_PART_A | FAIL | 10 | 9 | 1 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 1 words and 41% chars. |
| pssa_stamina_item_g3_owls_01 | MCQ | FAIL | 9 | 7 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 11% chars. |
| pssa_stamina_item_g3_owls_02 | MCQ | PASS | 7 | 7 | 0 | true | Correct choice length is within threshold. |
| pssa_stamina_item_g3_owls_03 | MCQ | FAIL | 10 | 8 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 23% chars. |
| pssa_stamina_item_g3_owls_04 | MCQ | FAIL | 8 | 8 | 0 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 0 words and 21% chars. |
| pssa_stamina_item_g3_owls_05 | MCQ | PASS | 16 | 18 | -2 | true | Correct choice length is within threshold. |
| pssa_stamina_item_g3_owls_ebsr_01::partA | EBSR_PART_A | FAIL | 13 | 10 | 3 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 3 words and 9% chars. |
| pssa_stamina_item_g3_rabbit_01 | MCQ | FAIL | 11 | 11 | 0 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 0 words and 17% chars. |
| pssa_stamina_item_g3_rabbit_02 | MCQ | FAIL | 16 | 11 | 5 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 5 words and 24% chars. |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PASS | 7 | 8 | -1 | true | Correct choice length is within threshold. |
| pssa_stamina_item_g3_rabbit_04 | MCQ | FAIL | 10 | 8 | 2 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 2 words and 32% chars. |
| pssa_stamina_item_g3_rabbit_05 | MCQ | FAIL | 6 | 6 | 0 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 0 words and 24% chars. |
| pssa_stamina_item_g3_rabbit_06 | MCQ | FAIL | 9 | 8 | 1 | true | PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by 1 words and 21% chars. |
| pssa_stamina_item_g3_rabbit_ebsr_01::partA | EBSR_PART_A | PASS | 10 | 11 | -1 | true | Correct choice length is within threshold. |
| conv_01 | MCQ | PASS | 1 | 1 | 0 | false | Correct choice length is within threshold. |
| conv_02 | MCQ | PASS | 5 | 5 | 0 | true | Correct choice length is within threshold. |
| conv_03 | MCQ | PASS | 6 | 7 | -1 | false | Correct choice length is within threshold. |
| conv_04 | MCQ | PASS | 7 | 7 | 0 | false | Correct choice length is within threshold. |
| conv_05 | MCQ | PASS | 1 | 2 | -1 | false | Correct choice length is within threshold. |
| conv_06 | MCQ | PASS | 5 | 5 | 0 | false | Correct choice length is within threshold. |
| conv_07 | MCQ | PASS | 9 | 9 | 0 | true | Correct choice length is within threshold. |
| conv_08 | MCQ | PASS | 7 | 7 | 0 | false | Correct choice length is within threshold. |
| conv_09 | MCQ | PASS | 6 | 6 | 0 | true | Correct choice length is within threshold. |

## Foundation EBSR Part A Impact (Report-Only)

| itemId | result | correctWords | maxDistractorWords | gap | uniquelyLongest |
| --- | --- | ---: | ---: | ---: | --- |
| pssa_ebsr_g3_creek_01::partA | PASS | 15 | 14 | 1 | true |
| pssa_ebsr_g3_map_01::partA | PASS | 15 | 15 | 0 | true |
| pssa_ebsr_g3_lunch_01::partA | PASS | 13 | 14 | -1 | false |
| pssa_ebsr_g3_mural_01::partA | PASS | 13 | 12 | 1 | true |
| pssa_ebsr_g3_cart_01::partA | PASS | 13 | 15 | -2 | false |
| pssa_ebsr_g3_lantern_01::partA | PASS | 9 | 12 | -3 | false |
| pssa_ebsr_g3_bell_01::partA | PASS | 9 | 13 | -4 | false |

## FAIL List

| itemId | interactionType | gateId | detail |
| --- | --- | --- | --- |
| conv_06 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | foundation evaluator |
| conv_07 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | foundation evaluator |
| conv_08 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_syrup_01; correctWords=12; maxDistractorWords=10; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_syrup_03; correctWords=13; maxDistractorWords=11; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | choiceGroup=pssa_stamina_item_g3_syrup_ebsr_01::partA; correctWords=14; maxDistractorWords=12; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_boat_01; correctWords=14; maxDistractorWords=10; gap=4; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_boat_04; correctWords=12; maxDistractorWords=10; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_boat_05; correctWords=19; maxDistractorWords=9; gap=10; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | choiceGroup=pssa_stamina_item_g3_boat_ebsr_01::partA; correctWords=10; maxDistractorWords=9; gap=1; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_owls_01; correctWords=9; maxDistractorWords=7; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_owls_03; correctWords=10; maxDistractorWords=8; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_owls_04; correctWords=8; maxDistractorWords=8; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | choiceGroup=pssa_stamina_item_g3_owls_ebsr_01::partA; correctWords=13; maxDistractorWords=10; gap=3; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_rabbit_01; correctWords=11; maxDistractorWords=11; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_rabbit_02; correctWords=16; maxDistractorWords=11; gap=5; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_rabbit_04; correctWords=10; maxDistractorWords=8; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_rabbit_05; correctWords=6; maxDistractorWords=6; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | choiceGroup=pssa_stamina_item_g3_rabbit_06; correctWords=9; maxDistractorWords=8; gap=1; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | choiceGroup=pssa_stamina_item_g3_syrup_04 |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR_EBSR_PART_A_REPORT_ONLY | choiceGroup=pssa_stamina_item_g3_boat_ebsr_01::partA |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | choiceGroup=pssa_stamina_item_g3_rabbit_02 |
| conv_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | choiceGroup=conv_03 |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_06 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_07 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_08 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_09 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | A:3 B:1 C:0 D:0 maxShare=0.7500 |

## Per-Item Gate Matrix

| itemId | interactionType | gateId | status | detail |
| --- | --- | --- | --- | --- |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_01 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_01 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_01 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_01 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_01 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_02 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_02 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_02 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_02 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_02 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_03 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_03 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_03 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_03 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_03 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_04 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_04 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_04 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_04 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_04 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_05 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_05 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_05 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_05 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_05 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_06 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | FAIL | foundation evaluator |
| conv_06 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_06 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_06 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_06 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_07 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | FAIL | foundation evaluator |
| conv_07 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_07 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_07 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_07 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_08 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | FAIL | foundation evaluator |
| conv_08 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_08 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_08 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_08 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| conv_09 | MCQ | PSSA_ITEM_INTRA_CHOICE_DUPLICATE | PASS | foundation evaluator |
| conv_09 | MCQ | PSSA_VOCAB_KEY_CONSTRUCT | PASS | foundation evaluator |
| conv_09 | MCQ | PSSA_SA_BANDS_NONEMPTY | PASS | foundation evaluator |
| conv_09 | MCQ | PSSA_ITEM_EC_GENRE_MATCH | PASS | foundation evaluator |
| conv_09 | MCQ | PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP | PASS | foundation evaluator |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | PASS | 1 detector rows; failures=0 |
| conv_01 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_02 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_03 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_04 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_05 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_06 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_07 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_08 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| conv_09 | MCQ | PSSA_MCQ_PASSAGE_SPECIFICITY | SKIP | not passage-linked reading MCQ (standalone conventions or paired group variant) |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Vocabulary stem, target, evidence, and choices align. |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | WARN: Figurative phrase or word-choice-effect interpretation needs human review. |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | WARN: Figurative phrase or word-choice-effect interpretation needs human review. |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | PASS | PASS: Observed stem/evidence pattern is compatible with EC skill family. |
| conv_01 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_02 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_03 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_04 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_05 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_06 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_07 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_08 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| conv_09 | MCQ | PSSA_ITEM_EC_SKILL_MATCH | SKIP | not passage-linked reading MCQ |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_syrup_01; correctWords=12; maxDistractorWords=10; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_syrup_02; correctWords=2; maxDistractorWords=8; gap=-6; uniquelyLongest=false |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_syrup_03; correctWords=13; maxDistractorWords=11; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_syrup_04; correctWords=11; maxDistractorWords=11; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | FAIL | choiceGroup=pssa_stamina_item_g3_syrup_ebsr_01::partA; correctWords=14; maxDistractorWords=12; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_boat_01; correctWords=14; maxDistractorWords=10; gap=4; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_boat_02; correctWords=14; maxDistractorWords=15; gap=-1; uniquelyLongest=false |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_boat_03; correctWords=7; maxDistractorWords=7; gap=0; uniquelyLongest=false |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_boat_04; correctWords=12; maxDistractorWords=10; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_boat_05; correctWords=19; maxDistractorWords=9; gap=10; uniquelyLongest=true |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | FAIL | choiceGroup=pssa_stamina_item_g3_boat_ebsr_01::partA; correctWords=10; maxDistractorWords=9; gap=1; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_owls_01; correctWords=9; maxDistractorWords=7; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_owls_02; correctWords=7; maxDistractorWords=7; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_owls_03; correctWords=10; maxDistractorWords=8; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_owls_04; correctWords=8; maxDistractorWords=8; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_owls_05; correctWords=16; maxDistractorWords=18; gap=-2; uniquelyLongest=true |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | FAIL | choiceGroup=pssa_stamina_item_g3_owls_ebsr_01::partA; correctWords=13; maxDistractorWords=10; gap=3; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_01; correctWords=11; maxDistractorWords=11; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_02; correctWords=16; maxDistractorWords=11; gap=5; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_03; correctWords=7; maxDistractorWords=8; gap=-1; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_04; correctWords=10; maxDistractorWords=8; gap=2; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_05; correctWords=6; maxDistractorWords=6; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_06; correctWords=9; maxDistractorWords=8; gap=1; uniquelyLongest=true |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_MCQ_CORRECT_IS_LONGEST_EBSR_PART_A_REPORT_ONLY | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_ebsr_01::partA; correctWords=10; maxDistractorWords=11; gap=-1; uniquelyLongest=true |
| conv_01 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_01; correctWords=1; maxDistractorWords=1; gap=0; uniquelyLongest=false |
| conv_02 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_02; correctWords=5; maxDistractorWords=5; gap=0; uniquelyLongest=true |
| conv_03 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_03; correctWords=6; maxDistractorWords=7; gap=-1; uniquelyLongest=false |
| conv_04 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_04; correctWords=7; maxDistractorWords=7; gap=0; uniquelyLongest=false |
| conv_05 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_05; correctWords=1; maxDistractorWords=2; gap=-1; uniquelyLongest=false |
| conv_06 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_06; correctWords=5; maxDistractorWords=5; gap=0; uniquelyLongest=false |
| conv_07 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_07; correctWords=9; maxDistractorWords=9; gap=0; uniquelyLongest=true |
| conv_08 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_08; correctWords=7; maxDistractorWords=7; gap=0; uniquelyLongest=false |
| conv_09 | MCQ | PSSA_MCQ_CORRECT_IS_LONGEST | PASS | choiceGroup=conv_09; correctWords=6; maxDistractorWords=6; gap=0; uniquelyLongest=true |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_syrup_01 |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_syrup_02 |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_syrup_03 |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | FAIL | choiceGroup=pssa_stamina_item_g3_syrup_04 |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR_EBSR_PART_A_REPORT_ONLY | PASS | choiceGroup=pssa_stamina_item_g3_syrup_ebsr_01::partA |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_boat_01 |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_boat_02 |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_boat_03 |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_boat_04 |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_boat_05 |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR_EBSR_PART_A_REPORT_ONLY | FAIL | choiceGroup=pssa_stamina_item_g3_boat_ebsr_01::partA |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_owls_01 |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_owls_02 |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_owls_03 |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_owls_04 |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_owls_05 |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR_EBSR_PART_A_REPORT_ONLY | PASS | choiceGroup=pssa_stamina_item_g3_owls_ebsr_01::partA |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_01 |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | FAIL | choiceGroup=pssa_stamina_item_g3_rabbit_02 |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_03 |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_04 |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_05 |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_06 |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR_EBSR_PART_A_REPORT_ONLY | PASS | choiceGroup=pssa_stamina_item_g3_rabbit_ebsr_01::partA |
| conv_01 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_01 |
| conv_02 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_02 |
| conv_03 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | FAIL | choiceGroup=conv_03 |
| conv_04 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_04 |
| conv_05 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_05 |
| conv_06 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_06 |
| conv_07 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_07 |
| conv_08 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_08 |
| conv_09 | MCQ | PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR | PASS | choiceGroup=conv_09 |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_01 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_02 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_03 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_04 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_05 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_06 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_07 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_08 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| conv_09 | MCQ | PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION | FAIL | A:23 B:2 C:2 D:2 maxShare=0.7931 |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | FAIL | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | FAIL | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | FAIL | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY | FAIL | A:3 B:1 C:0 D:0 maxShare=0.7500 |
| pssa_stamina_item_g3_syrup_01 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_syrup_02 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_syrup_03 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_syrup_04 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_syrup_ebsr_01 | EBSR | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_syrup_sa_01 | SHORT_ANSWER | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_01 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_02 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_03 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_04 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_05 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_ebsr_01 | EBSR | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_boat_sa_01 | SHORT_ANSWER | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_01 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_02 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_03 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_04 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_05 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_06 | MCQ | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_ebsr_01 | EBSR | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_rabbit_sa_01 | SHORT_ANSWER | PSSA_ITEM_FOOTNOTE_GIVEAWAY | PASS | vocab targets must not be visible footnote definitions |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_SECTION_LOOKBACK_BALANCE | PASS | required evidence slots covered |
| pssa_stamina_item_g3_owls_01 | MCQ | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_02 | MCQ | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_03 | MCQ | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_04 | MCQ | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_05 | MCQ | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_06 | SHORT_ANSWER | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_PAIRED_MULTIPOINT_EVIDENCE_OVERLAP | PASS | paired passageSlot variant |
| pssa_stamina_item_g3_owls_ebsr_01 | EBSR | PSSA_REQUIRED_EVIDENCE_SLOTS | PASS | paired passageSlot variant |

## Passage Quality Rows

| passageId | ruleId | result | severity | notes |
| --- | --- | --- | --- | --- |
| pssa_stamina_psg_g3_syrup_v4 | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | Unique against evaluated passages. |
| pssa_stamina_psg_g3_boat_literary | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | Unique against evaluated passages. |
| pssa_stamina_psg_g3_rabbit_drama | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | Unique against evaluated passages. |
| pssa_stamina_psg_g3_owls_p1_night | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | Unique against evaluated passages. |
| pssa_stamina_psg_g3_owls_p2_barn | PSSA_PASSAGE_CROSS_DUPLICATE | PASS | INFO | Unique against evaluated passages. |
| pssa_stamina_psg_g3_syrup_v4 | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | No reused masked skeleton found. |
| pssa_stamina_psg_g3_boat_literary | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | No reused masked skeleton found. |
| pssa_stamina_psg_g3_rabbit_drama | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | No reused masked skeleton found. |
| pssa_stamina_psg_g3_owls_p1_night | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | No reused masked skeleton found. |
| pssa_stamina_psg_g3_owls_p2_barn | PSSA_PASSAGE_TEMPLATE_SKELETON | PASS | INFO | No reused masked skeleton found. |
| pssa_stamina_psg_g3_syrup_v4 | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | Topic terms recur through the body without deterministic conflict terms. |
| pssa_stamina_psg_g3_boat_literary | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | Topic terms recur through the body without deterministic conflict terms. |
| pssa_stamina_psg_g3_rabbit_drama | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | Topic terms recur through the body without deterministic conflict terms. |
| pssa_stamina_psg_g3_owls_p1_night | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | Topic terms recur through the body without deterministic conflict terms. |
| pssa_stamina_psg_g3_owls_p2_barn | PSSA_PASSAGE_TOPIC_COHERENCE | PASS | INFO | Topic terms recur through the body without deterministic conflict terms. |
| pssa_stamina_psg_g3_syrup_v4 | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | Concrete topic detail ratio passes calibrated threshold. |
| pssa_stamina_psg_g3_boat_literary | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | Concrete topic detail ratio passes calibrated threshold. |
| pssa_stamina_psg_g3_rabbit_drama | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | Concrete topic detail ratio passes calibrated threshold. |
| pssa_stamina_psg_g3_owls_p1_night | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | Concrete topic detail ratio passes calibrated threshold. |
| pssa_stamina_psg_g3_owls_p2_barn | PSSA_PASSAGE_CONCRETENESS | PASS | INFO | Concrete topic detail ratio passes calibrated threshold. |

## Passage Specificity Raw Rows

| itemId | ruleId | result | severity | evidence | notes |
| --- | --- | --- | --- | --- | --- |
| pssa_stamina_item_g3_syrup_01 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | synthesis evidence item | Whole-passage synthesis MCQs are scoped by explicit evidenceKind rather than choice concreteness. |
| pssa_stamina_item_g3_syrup_02 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | vocabulary-in-context item | Vocabulary-in-context MCQs are scoped to vocab-specific gates, not comprehension choice-specificity. |
| pssa_stamina_item_g3_syrup_03 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | PASS | INFO | all passage-specificity gates clear | Passage-linked reading MCQ passed grounding gates. |
| pssa_stamina_item_g3_syrup_04 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | PASS | INFO | all passage-specificity gates clear | Passage-linked reading MCQ passed grounding gates. |
| pssa_stamina_item_g3_boat_01 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | synthesis evidence item | Whole-passage synthesis MCQs are scoped by explicit evidenceKind rather than choice concreteness. |
| pssa_stamina_item_g3_boat_02 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | PASS | INFO | all passage-specificity gates clear | Passage-linked reading MCQ passed grounding gates. |
| pssa_stamina_item_g3_boat_03 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | PASS | INFO | all passage-specificity gates clear | Passage-linked reading MCQ passed grounding gates. |
| pssa_stamina_item_g3_boat_04 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | vocabulary-in-context item | Vocabulary-in-context MCQs are scoped to vocab-specific gates, not comprehension choice-specificity. |
| pssa_stamina_item_g3_boat_05 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | SKIP_INFERENCE_INTERPRETATION:inference | Inference/interpretation MCQ carries comprehensionKindRationale: The item asks why June's boat survived by connecting her careful testing with the contrast against boats built mainly for appearance, rather than recalling one literal detail. |
| pssa_stamina_item_g3_rabbit_01 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | synthesis evidence item | Whole-passage synthesis MCQs are scoped by explicit evidenceKind rather than choice concreteness. |
| pssa_stamina_item_g3_rabbit_02 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | synthesis evidence item | Whole-passage synthesis MCQs are scoped by explicit evidenceKind rather than choice concreteness. |
| pssa_stamina_item_g3_rabbit_03 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | SKIP_INFERENCE_INTERPRETATION:inference | Inference/interpretation MCQ carries comprehensionKindRationale: The item asks students to infer the shared cause for Hedgehog and Mouse coming to the log from Scene 2 dialogue rather than matching a single quoted sentence. |
| pssa_stamina_item_g3_rabbit_04 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | SKIP_INFERENCE_INTERPRETATION:interpretation | Inference/interpretation MCQ carries comprehensionKindRationale: The item asks what a stage direction shows about Rabbit's internal change, so students interpret action and expression rather than recall a literal event. |
| pssa_stamina_item_g3_rabbit_05 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | vocabulary-in-context item | Vocabulary-in-context MCQs are scoped to vocab-specific gates, not comprehension choice-specificity. |
| pssa_stamina_item_g3_rabbit_06 | PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES | SKIP | INFO | SKIP_INFERENCE_INTERPRETATION:inference | Inference/interpretation MCQ carries comprehensionKindRationale: The item asks what motivates Rabbit's final decision by combining Mouse's condition, Rabbit's softening expression, and Rabbit's action. |

