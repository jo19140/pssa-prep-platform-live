# PSSA ELA Item-Type Mock Reviewer Preview



Mock-only original toy content with keys, scoring, and gate outcomes for reviewer sign-off.



### pssa_mock_mcq_01
- itemType: selected_response
- interactionType: MCQ
- interactionSubtype: passage_based
- eligibleContent: E03.A-K.1.1.1
- correctResponse: `{"correctIndex":0}`
- scoring: `{"totalPoints":1,"fullCredit":"Select the single supported answer."}`
- gateResult: PASS
- notes: PASS
- rationale: Only the keyed choice captures the lesson supported by the toy passage.

### pssa_mock_ebsr_01
- itemType: evidence_based_selected_response
- interactionType: EBSR
- interactionSubtype: two_point
- eligibleContent: E03.A-K.1.1.3
- correctResponse: `{"partA":{"correctIndex":0},"partB":{"correctIndices":[0,1]}}`
- scoring: `{"totalPoints":2,"partialCredit":[{"points":2,"rule":"Part A correct and both Part B evidence choices correct."},{"points":1,"rule":"Part A correct with one correct evidence choice, or both evidence choices correct with Part A incorrect."},{"points":0,"rule":"Unsupported or missing response."}]}`
- gateResult: PASS
- notes: PASS
- rationale: Both evidence spans are verbatim and jointly support the safety reason in Part A.

### pssa_mock_multi_select_01
- itemType: technology_enhanced
- interactionType: MULTI_SELECT
- interactionSubtype: choose_n_evidence
- eligibleContent: E04.B-K.1.1.2
- correctResponse: `{"correctIndices":[0,1]}`
- scoring: `{"totalPoints":1,"partialCredit":[{"points":1,"rule":"Both correct and no extra selections."},{"points":0,"rule":"Any other response."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_inline_dropdown_01
- itemType: technology_enhanced
- interactionType: INLINE_DROPDOWN
- interactionSubtype: multi_blank
- eligibleContent: E03.D.1.1.1
- correctResponse: `{"selections":{"blank_1":1,"blank_2":1}}`
- scoring: `{"totalPoints":1,"partialCredit":[{"points":1,"rule":"Both blanks correct."},{"points":0,"rule":"One or more blanks incorrect."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_matching_grid_01
- itemType: technology_enhanced
- interactionType: MATCHING_GRID
- interactionSubtype: one_per_row
- eligibleContent: E05.B-C.2.1.2
- correctResponse: `{"cells":[{"row":0,"column":0},{"row":1,"column":1},{"row":2,"column":0}]}`
- scoring: `{"totalPoints":1,"partialCredit":[{"points":1,"rule":"All rows matched."},{"points":0,"rule":"Any row missing or mismatched."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_hot_text_01
- itemType: technology_enhanced
- interactionType: HOT_TEXT
- interactionSubtype: sentence_select
- eligibleContent: E04.B-K.1.1.1
- correctResponse: `{"correctSpanIds":["s1","s2"]}`
- scoring: `{"totalPoints":1,"partialCredit":[{"points":1,"rule":"Both correct spans and no extras."},{"points":0,"rule":"Any other response."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_drag_drop_01
- itemType: technology_enhanced
- interactionType: DRAG_DROP
- interactionSubtype: category_chart
- eligibleContent: E05.B-C.2.1.1
- correctResponse: `{"assignments":[{"tokenId":"t1","targetId":"cause"},{"tokenId":"t2","targetId":"effect"},{"tokenId":"t3","targetId":"comparison"}]}`
- scoring: `{"totalPoints":1,"partialCredit":[{"points":1,"rule":"All tokens placed correctly."},{"points":0,"rule":"Any missing or incorrect placement."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_short_answer_01
- itemType: constructed_response
- interactionType: SHORT_ANSWER
- interactionSubtype: 
- eligibleContent: E03.A-K.1.1.1
- correctResponse: `{"rubricReference":"3-point short-answer rubric","copiedTextCap":"A response made only of copied passage text earns no more than 1 point unless it explains the evidence."}`
- scoring: `{"totalPoints":3,"scoreBands":[{"score":3,"descriptor":"Complete answer with accurate explanation and relevant text support.","toyResponse":"The barrel helps because it stores rainwater for dry days. The class can water the lettuce later instead of wasting the rain."},{"score":2,"descriptor":"Mostly correct answer with some support.","toyResponse":"It saves rainwater so the plants can get water later."},{"score":1,"descriptor":"Limited answer or copied detail with little explanation.","toyResponse":"The barrel was beside the garden."},{"score":0,"descriptor":"Incorrect, unrelated, or blank.","toyResponse":"The garden has a sign."}]}`
- gateResult: PASS
- notes: PASS

### pssa_mock_tda_01
- itemType: constructed_response
- interactionType: TDA
- interactionSubtype: 
- eligibleContent: E05.E.1.1.1
- correctResponse: `{"rubricReference":"4-point TDA analytic rubric","expectedOutline":["claim about Lena's confidence","evidence from early hesitation","evidence from later action","analysis connecting both moments"]}`
- scoring: `{"totalPoints":4,"weightMultiplier":4,"scoreBands":[{"score":4,"descriptor":"Clear analysis, relevant evidence, strong organization and conventions.","toyResponse":"Outline: claim, two supported moments, explanation of change."},{"score":3,"descriptor":"Adequate analysis with relevant evidence and generally clear organization.","toyResponse":"Outline: claim and evidence with some explanation."},{"score":2,"descriptor":"Partial analysis with limited evidence or explanation.","toyResponse":"Outline: mostly summary with one explained detail."},{"score":1,"descriptor":"Minimal response with weak evidence or mostly summary.","toyResponse":"Outline: names a character trait with little support."},{"score":0,"descriptor":"Insufficient, unrelated, copied, or blank.","toyResponse":"No relevant analysis."}]}`
- gateResult: PASS
- notes: PASS