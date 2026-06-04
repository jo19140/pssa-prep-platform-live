import assert from "node:assert/strict";

import { scorePssaItem, type PssaScorableItem, type PssaScoreResult } from "@/lib/content/pssaScoring";
import { scoreAssessmentQuestion } from "@/lib/serverScoring";
import { buildPlan } from "./content/lib/pssa-import-plan";

const plan = buildPlan(3);
const bank = [...plan.activeItems, ...plan.deprecatedItems].map((item) => ({
  itemId: item.itemId,
  id: item.itemId,
  interactionType: item.interactionType,
  correctResponseJson: item.correctResponseJson,
  scoringJson: item.scoringJson,
  responseSpecJson: item.responseSpecJson,
}));

const syntheticHotTextAllOrNothing: PssaScorableItem = {
  itemId: "synthetic_hot_text_aon",
  interactionType: "HOT_TEXT",
  correctResponseJson: { correctSpanIds: ["ht_a", "ht_b"] },
  scoringJson: { totalPoints: 1 },
  responseSpecJson: { selectableSpans: [{ spanId: "ht_a" }, { spanId: "ht_b" }, { spanId: "ht_c" }] },
};

const syntheticDragDropAllOrNothing: PssaScorableItem = {
  itemId: "synthetic_drag_drop_aon",
  interactionType: "DRAG_DROP",
  correctResponseJson: { correctAssignments: [{ tokenId: "dd_a", targetId: "target_1" }, { tokenId: "dd_b", targetId: "target_2" }] },
  scoringJson: { totalPoints: 1 },
  responseSpecJson: { tokens: [{ tokenId: "dd_a" }, { tokenId: "dd_b" }], targets: [{ targetId: "target_1" }, { targetId: "target_2" }] },
};

const details = new Set([
  "mcq_correct", "mcq_wrong", "mcq_invalid_response",
  "ebsr_full_credit", "ebsr_partA_plus_one_evidence", "ebsr_evidence_only", "ebsr_zero", "ebsr_invalid_response",
  "multi_select_full_credit", "multi_select_partial_subset", "multi_select_zero", "multi_select_invalid_response",
  "hot_text_full_credit", "hot_text_partial_subset", "hot_text_zero", "hot_text_invalid_response",
  "matching_grid_full_credit", "matching_grid_partial", "matching_grid_zero", "matching_grid_invalid_response",
  "drag_drop_full_credit", "drag_drop_partial", "drag_drop_zero", "drag_drop_invalid_response",
  "inline_dropdown_full_credit", "inline_dropdown_zero", "inline_dropdown_invalid_response",
  "short_answer_rubric", "tda_rubric",
]);

const observedResults: Array<{ result: PssaScoreResult; item: PssaScorableItem }> = [];

function score(item: PssaScorableItem, response: unknown) {
  const result = scorePssaItem(item, response);
  observedResults.push({ result, item });
  return result;
}

function item(type: string, predicate: (item: PssaScorableItem) => boolean = () => true) {
  const found = bank.find((row) => row.interactionType === type && predicate(row));
  assert.ok(found, `missing ${type} fixture`);
  return found;
}

function assertScored(result: PssaScoreResult, points: number, detail?: string) {
  assert.equal(result.status, "scored");
  assert.equal(result.pointsEarned, points);
  if (detail) assert.equal(result.detail, detail);
}

function assertInvalid(result: PssaScoreResult, detail: string) {
  assert.equal(result.status, "invalid_response");
  assert.equal(result.pointsEarned, 0);
  assert.equal(result.detail, detail);
}

function cr<T = any>(item: PssaScorableItem): T {
  return item.correctResponseJson as T;
}

function rs<T = any>(item: PssaScorableItem): T {
  return item.responseSpecJson as T;
}

function sj(item: PssaScorableItem) {
  return item.scoringJson as { totalPoints: number };
}

function correctResponse(item: PssaScorableItem) {
  if (item.interactionType === "MCQ") return { selectedIndex: cr(item).correctIndex };
  if (item.interactionType === "EBSR") return { partAIndex: cr(item).partA.correctIndex, partBIndices: [...cr(item).partB.correctIndices] };
  if (item.interactionType === "MULTI_SELECT") return { selectedIndices: [...cr(item).correctIndices] };
  if (item.interactionType === "HOT_TEXT") return { selectedSpanIds: [...cr(item).correctSpanIds] };
  if (item.interactionType === "MATCHING_GRID") return { rowSelections: Object.fromEntries(cr(item).correctCells.map((cell: any) => [cell.rowId, cell.columnId])) };
  if (item.interactionType === "DRAG_DROP") return { assignments: Object.fromEntries(cr(item).correctAssignments.map((row: any) => [row.tokenId, row.targetId ?? row.slotId])) };
  if (item.interactionType === "INLINE_DROPDOWN") return { blankSelections: Object.fromEntries(cr(item).blanks.map((blank: any) => [blank.blankId, blank.correctIndex])) };
  if (item.interactionType === "SHORT_ANSWER") return { shortResponse: "The answer needs a human rubric." };
  throw new Error(`missing correct builder: ${item.interactionType}`);
}

function wrongResponse(item: PssaScorableItem) {
  if (item.interactionType === "MCQ") return { selectedIndex: (cr(item).correctIndex + 1) % rs(item).choices.length };
  if (item.interactionType === "EBSR") return { partAIndex: cr(item).partA.correctIndex, partBIndices: [] };
  if (item.interactionType === "MULTI_SELECT") return { selectedIndices: [] };
  if (item.interactionType === "HOT_TEXT") return { selectedSpanIds: [] };
  if (item.interactionType === "MATCHING_GRID") return { rowSelections: {} };
  if (item.interactionType === "DRAG_DROP") return { assignments: {} };
  if (item.interactionType === "INLINE_DROPDOWN") return { blankSelections: {} };
  if (item.interactionType === "SHORT_ANSWER") return { shortResponse: "Still pending." };
  throw new Error(`missing wrong builder: ${item.interactionType}`);
}

function testRuleTables() {
  const mcq = item("MCQ");
  assertScored(score(mcq, correctResponse(mcq)), 1, "mcq_correct");
  assertScored(score(mcq, wrongResponse(mcq)), 0, "mcq_wrong");
  assertInvalid(score(mcq, {}), "mcq_invalid_response");
  assertInvalid(score(mcq, { selectedIndex: rs(mcq).choices.length }), "mcq_invalid_response");

  const ebsr = item("EBSR");
  const e = cr(ebsr);
  assertScored(score(ebsr, correctResponse(ebsr)), 2, "ebsr_full_credit");
  assertScored(score(ebsr, { partAIndex: e.partA.correctIndex, partBIndices: [e.partB.correctIndices[0]] }), 1, "ebsr_partA_plus_one_evidence");
  assertScored(score(ebsr, { partAIndex: (e.partA.correctIndex + 1) % rs(ebsr).partA.choices.length, partBIndices: [...e.partB.correctIndices] }), 1, "ebsr_evidence_only");
  assertScored(score(ebsr, { partAIndex: e.partA.correctIndex, partBIndices: [] }), 0, "ebsr_zero");
  assertInvalid(score(ebsr, { partAIndex: e.partA.correctIndex, partBIndices: [e.partB.correctIndices[0], e.partB.correctIndices[0]] }), "ebsr_invalid_response");

  const ms = item("MULTI_SELECT");
  const msWrong = firstWrongIndex(rs(ms).choices.length, cr(ms).correctIndices);
  assertScored(score(ms, correctResponse(ms)), sj(ms).totalPoints, "multi_select_full_credit");
  assertScored(score(ms, { selectedIndices: [cr(ms).correctIndices[0]] }), 1, "multi_select_partial_subset");
  assertScored(score(ms, { selectedIndices: [cr(ms).correctIndices[0], msWrong] }), 0, "multi_select_zero");
  assertInvalid(score(ms, { selectedIndices: [cr(ms).correctIndices[0], cr(ms).correctIndices[0]] }), "multi_select_invalid_response");

  const htGraded = item("HOT_TEXT", (row) => sj(row).totalPoints === cr(row).correctSpanIds.length && cr(row).correctSpanIds.length > 1);
  const htAon = syntheticHotTextAllOrNothing;
  const htWrong = firstWrongString(rs(htGraded).selectableSpans.map((span: any) => span.spanId), cr(htGraded).correctSpanIds);
  assertScored(score(htGraded, correctResponse(htGraded)), sj(htGraded).totalPoints, "hot_text_full_credit");
  assertScored(score(htGraded, { selectedSpanIds: [cr(htGraded).correctSpanIds[0]] }), 1, "hot_text_partial_subset");
  assertScored(score(htGraded, { selectedSpanIds: [cr(htGraded).correctSpanIds[0], htWrong] }), 0, "hot_text_zero");
  assertScored(score(htAon, correctResponse(htAon)), 1, "hot_text_full_credit");
  assertScored(score(htAon, { selectedSpanIds: [cr(htAon).correctSpanIds[0]] }), 0, "hot_text_zero");

  const grid = item("MATCHING_GRID");
  const oneGridRow = cr(grid).correctCells[0];
  assertScored(score(grid, correctResponse(grid)), sj(grid).totalPoints, "matching_grid_full_credit");
  assertScored(score(grid, { rowSelections: { [oneGridRow.rowId]: oneGridRow.columnId } }), 1, "matching_grid_partial");
  assertScored(score(grid, { rowSelections: {} }), 0, "matching_grid_zero");
  assertInvalid(score(grid, { rowSelections: { unknown: oneGridRow.columnId } }), "matching_grid_invalid_response");

  const ddGraded = item("DRAG_DROP", (row) => sj(row).totalPoints === cr(row).correctAssignments.length);
  const ddAon = syntheticDragDropAllOrNothing;
  const oneDd = cr(ddGraded).correctAssignments[0];
  assertScored(score(ddGraded, correctResponse(ddGraded)), sj(ddGraded).totalPoints, "drag_drop_full_credit");
  assertScored(score(ddGraded, { assignments: { [oneDd.tokenId]: oneDd.targetId } }), 1, "drag_drop_partial");
  assertScored(score(ddAon, correctResponse(ddAon)), 1, "drag_drop_full_credit");
  assertScored(score(ddAon, { assignments: { [cr(ddAon).correctAssignments[0].tokenId]: cr(ddAon).correctAssignments[0].targetId } }), 0, "drag_drop_zero");
  assertInvalid(score(ddGraded, { assignments: { unknown: oneDd.targetId } }), "drag_drop_invalid_response");

  const dropdown = item("INLINE_DROPDOWN");
  assertScored(score(dropdown, correctResponse(dropdown)), 1, "inline_dropdown_full_credit");
  assertScored(score(dropdown, { blankSelections: {} }), 0, "inline_dropdown_zero");
  assertInvalid(score(dropdown, { blankSelections: { unknown: 0 } }), "inline_dropdown_invalid_response");

  const sa = item("SHORT_ANSWER");
  const saResult = score(sa, correctResponse(sa));
  assert.equal(saResult.status, "pending_human_scoring");
  assert.equal(saResult.detail, "short_answer_rubric");
}

function testRealBankCoverage() {
  const byType: Record<string, number> = {};
  let machineScored = 0;
  let pendingHuman = 0;
  for (const row of bank) {
    byType[row.interactionType] = (byType[row.interactionType] ?? 0) + 1;
    const correct = score(row, correctResponse(row));
    if (row.interactionType === "SHORT_ANSWER") {
      assert.equal(correct.status, "pending_human_scoring", row.id);
      pendingHuman += 1;
    } else {
      assertScored(correct, sj(row).totalPoints);
      machineScored += 1;
    }
    const wrong = score(row, wrongResponse(row));
    if (row.interactionType === "SHORT_ANSWER") {
      assert.equal(wrong.status, "pending_human_scoring", row.id);
    } else {
      assert.equal(wrong.status, "scored", row.id);
      assert.ok(wrong.pointsEarned >= 0 && wrong.pointsEarned <= wrong.maxPoints, row.id);
    }
  }
  assert.equal(bank.length, 79);
  assert.equal(machineScored, 74);
  assert.equal(pendingHuman, 5);
  console.log(`PSSA PR C real-bank coverage: ${machineScored}+${pendingHuman}=79 items`, byType);
}

function testAdversarialInputs() {
  const samples = ["MCQ", "EBSR", "MULTI_SELECT", "HOT_TEXT", "MATCHING_GRID", "DRAG_DROP", "INLINE_DROPDOWN"].map((type) => item(type));
  for (const row of samples) {
    for (const bad of [null, undefined, "x", {}, { ...correctResponse(row), extra: true }]) {
      assert.equal(score(row, bad).status, "invalid_response", `${row.interactionType} ${JSON.stringify(bad)}`);
    }
  }
  assertInvalid(score(item("EBSR"), { partAIndex: 0, partBIndices: [99] }), "ebsr_invalid_response");
  assertInvalid(score(item("MULTI_SELECT"), { selectedIndices: [99] }), "multi_select_invalid_response");
  assertInvalid(score(item("HOT_TEXT"), { selectedSpanIds: ["unknown"] }), "hot_text_invalid_response");
  assertInvalid(score(item("MATCHING_GRID"), { rowSelections: { [cr(item("MATCHING_GRID")).correctCells[0].rowId]: "unknown" } }), "matching_grid_invalid_response");
  assertInvalid(score(item("DRAG_DROP"), { assignments: { [cr(item("DRAG_DROP")).correctAssignments[0].tokenId]: "unknown" } }), "drag_drop_invalid_response");
  assertInvalid(score(item("INLINE_DROPDOWN"), { blankSelections: { [cr(item("INLINE_DROPDOWN")).blanks[0].blankId]: 99 } }), "inline_dropdown_invalid_response");
}

function testNormalizedConventionsItemsScoreAndValidateDomains() {
  const spelling = bank.find((row) => row.id === "pssa_conv_g3_hottext_spelling_01")!;
  const functionItem = bank.find((row) => row.id === "pssa_conv_g3_hottext_function_01")!;
  const address = bank.find((row) => row.id === "pssa_conv_g3_drag_address_01")!;
  const dialogue = bank.find((row) => row.id === "pssa_conv_g3_drag_dialogue_01")!;

  assertScored(score(spelling, correctResponse(spelling)), 1, "hot_text_full_credit");
  assertScored(score(spelling, { selectedSpanIds: ["spell_t1"] }), 0, "hot_text_zero");
  assertInvalid(score(spelling, { selectedSpanIds: ["unknown"] }), "hot_text_invalid_response");

  assertScored(score(functionItem, correctResponse(functionItem)), 1, "hot_text_full_credit");
  assertScored(score(functionItem, { selectedSpanIds: ["function_t1"] }), 0, "hot_text_zero");
  assertInvalid(score(functionItem, { selectedSpanIds: ["unknown"] }), "hot_text_invalid_response");

  assertScored(score(address, correctResponse(address)), 1, "drag_drop_full_credit");
  assertScored(score(address, { assignments: { drag_t1: "address_s2", drag_t2: "address_s1" } }), 0, "drag_drop_zero");
  assertInvalid(score(address, { assignments: { drag_t1: "unknown" } }), "drag_drop_invalid_response");

  assertScored(score(dialogue, correctResponse(dialogue)), 1, "drag_drop_full_credit");
  assertScored(score(dialogue, { assignments: { drag_t2: "dialogue_s2", drag_t3: "dialogue_s1" } }), 0, "drag_drop_zero");
  assertInvalid(score(dialogue, { assignments: { drag_t2: "unknown" } }), "drag_drop_invalid_response");
}

function testNoKeyEcho() {
  for (const { result, item } of observedResults) {
    assertResultSafe(result, keyAtoms(item), JSON.stringify(item.correctResponseJson));
  }
  console.log(`PSSA PR C no-key-echo proof: ${observedResults.length} result objects checked.`);
}

function testLegacyDivergenceAndFailClosed() {
  const ebsr = item("EBSR");
  const response = { partAIndex: cr(ebsr).partA.correctIndex, partBIndices: [] };
  const canonical = score(ebsr, response);
  const legacy = scoreAssessmentQuestion({
    type: "EBSR",
    partACorrectIndex: cr(ebsr).partA.correctIndex,
    partBCorrectIndices: cr(ebsr).partB.correctIndices,
  }, response);
  assertScored(canonical, 0, "ebsr_zero");
  assert.equal(legacy.scorePointsEarned, 1);

  assert.throws(() => scorePssaItem({ interactionType: "UNKNOWN", correctResponseJson: {}, scoringJson: { totalPoints: 1 }, responseSpecJson: {} }, {}), /unknown_interaction_type/);
  const grid = structuredClone(item("MATCHING_GRID"));
  (grid.scoringJson as any).totalPoints = 99;
  assert.throws(() => scorePssaItem(grid, correctResponse(item("MATCHING_GRID"))), /malformed_item_scoring_data/);
  const mcq = structuredClone(item("MCQ"));
  delete (mcq as any).responseSpecJson;
  assert.throws(() => scorePssaItem(mcq, { selectedIndex: 0 }), /malformed_item_scoring_data/);
  const sa = structuredClone(item("SHORT_ANSWER"));
  delete (sa as any).responseSpecJson;
  assert.equal(scorePssaItem(sa, { shortResponse: "x" }).status, "pending_human_scoring");
}

function firstWrongIndex(length: number, correct: number[]) {
  for (let i = 0; i < length; i += 1) if (!correct.includes(i)) return i;
  return length - 1;
}

function firstWrongString(domain: string[], correct: string[]) {
  return domain.find((id) => !correct.includes(id)) ?? domain[0];
}

function assertResultSafe(result: unknown, atoms: Set<string>, correctJson: string) {
  assert.ok(details.has((result as any).detail), `unexpected detail ${(result as any).detail}`);
  walk(result, (key, value) => {
    assert.equal(/correct/i.test(key), false, `correct-like result key ${key}`);
    assert.notEqual(key, "answerKey");
    assert.notEqual(key, "rationale");
    assert.notEqual(key, "scoringJson");
    if (typeof value === "string") {
      assert.equal(atoms.has(value), false, `result string leaked key atom ${value}`);
    } else if (value && typeof value === "object") {
      assert.notEqual(JSON.stringify(value), correctJson, "result object/array echoes correct response");
    }
  });
}

function walk(value: unknown, visit: (key: string, value: unknown) => void, key = "$") {
  visit(key, value);
  if (Array.isArray(value)) value.forEach((child, index) => walk(child, visit, `${key}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) => walk(child, visit, childKey));
}

function keyAtoms(item: PssaScorableItem) {
  const atoms = new Set<string>();
  walk(item.correctResponseJson, (_key, value) => {
    if (typeof value === "string") atoms.add(value);
  });
  if (item.interactionType === "INLINE_DROPDOWN") {
    for (const blank of (cr(item).blanks ?? [])) if (typeof blank.correctOption === "string") atoms.add(blank.correctOption);
  }
  return atoms;
}

testRuleTables();
testRealBankCoverage();
testAdversarialInputs();
testNormalizedConventionsItemsScoreAndValidateDomains();
testLegacyDivergenceAndFailClosed();
testNoKeyEcho();

console.log("PSSA PR C scoring tests passed.");
