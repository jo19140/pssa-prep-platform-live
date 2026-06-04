# PSSA DB-6 Assembly Summary

- DB target: postgresql://(user):(redacted)@127.0.0.1:5433/pssa_dev
- Mode: refused
- Seed: g3-form-001
- Blueprint version: pde-ela-test-design-2025-g3-v1
- Result: REFUSED
- Refused reason: BLUEPRINT_UNSATISFIED
- Content hash: 
- Total points: 9
- Category points: A=2, B=6, D=1

## Passage Category Points

| Position | Passage | A | B | D | Approved hash snapshot |
|---:|---|---:|---:|---:|---|
| 1 | pssa_psg_g3_the_cart_that_would_not_turn | 0 | 2 | 0 | sha256:60761289b3028c4864e56330719cb7ba67f503d56f45c78e920e3077fb50b2ce |
| 2 | pssa_psg_g3_creek_watchers | 0 | 2 | 0 | sha256:ce172561d42802d333077a43df1d604217ef6d17442e87e786b257665859132c |
| 3 | pssa_psg_g3_a_cooler_lunch_line | 0 | 2 | 0 | sha256:547c58b558aee4d3843a6f2f307a27b27e5f8cd29ef9b7e4575d5c71d82de623 |
| 4 | pssa_psg_g3_the_mural_plan | 2 | 0 | 0 | sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb |

## Selection

| Position | Item | Slot type | Points | Category | Passage |
|---:|---|---|---:|---|---|
| 1 | pssa_ebsr_g3_cart_01 | multipoint | 2 | B | pssa_psg_g3_the_cart_that_would_not_turn |
| 2 | pssa_ebsr_g3_creek_01 | multipoint | 2 | B | pssa_psg_g3_creek_watchers |
| 3 | pssa_ebsr_g3_lunch_01 | multipoint | 2 | B | pssa_psg_g3_a_cooler_lunch_line |
| 4 | pssa_ebsr_g3_mural_01 | multipoint | 2 | A | pssa_psg_g3_the_mural_plan |
| 5 | pssa_conv_g3_drag_address_01 | conventions_1pt | 1 | D |  |

## Gates

| Gate | Status | Detail |
|---|---|---|
| classification | PASS | all selected-pool items classified |
| reading_1pt_available | FAIL | 0 available; requires 19-23 |
| conventions_1pt_available | FAIL | 1 available; requires 9 |
| short_answer_available | FAIL | 0 available; requires 2 |
| category_A_points | FAIL | 2 available; selected form must be 15-21 |
| category_B_points | FAIL | 8 available; selected form must be 15-21 |
| category_D_points | FAIL | 1 available; selected form must be 9-9 |
| live_selector_membership | PASS | all selected items must be live selector results |
| selected_item_readiness | PASS | all selected items must recompute to NONE |
| passage_count | PASS | 4/4 passages |
| passage_membership | PASS | all passage-based items use form passages |
| no_duplicate_items | PASS | none |
| no_deprecated_or_retired | PASS | selector should make this structural |
| reading_1pt_count | FAIL | 0 |
| conventions_count | FAIL | 1 |
| multipoint_count | PASS | 4 |
| multipoint_point_variety | FAIL | pssa_ebsr_g3_cart_01:2\|pssa_ebsr_g3_creek_01:2\|pssa_ebsr_g3_lunch_01:2\|pssa_ebsr_g3_mural_01:2 |
| multipoint_pattern_variety | PASS | 4 unique patterns |
| short_answer_count | FAIL | 0 |
| short_answer_points | PASS |  |
| total_points | FAIL | 9 |
| category_A_points | FAIL | 2 |
| category_B_points | FAIL | 6 |
| category_D_points | FAIL | 1 |
| answer_position_distribution | FAIL | maxShare=0.500 |
| reading_ec_variety | PASS | none |

## Reports

- Selection CSV: /Users/diaz/pssa-prep-platform-live/reports/pssa_db6_selection.csv
- Deficit CSV: /Users/diaz/pssa-prep-platform-live/reports/pssa_db6_deficit_report.csv
