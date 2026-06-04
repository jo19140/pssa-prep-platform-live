export type PssaScorableItem = {
  itemId?: string;
  interactionType: string;
  correctResponseJson: unknown;
  scoringJson: unknown;
  responseSpecJson?: unknown;
};

export type PssaScoreResult =
  | { status: "scored"; pointsEarned: number; maxPoints: number; detail: PssaScoreDetail }
  | { status: "pending_human_scoring"; pointsEarned: null; maxPoints: number; detail: "short_answer_rubric" | "tda_rubric" }
  | { status: "invalid_response"; pointsEarned: 0; maxPoints: number; detail: PssaScoreDetail };

export type PssaScoreDetail =
  | "mcq_correct"
  | "mcq_wrong"
  | "mcq_invalid_response"
  | "ebsr_full_credit"
  | "ebsr_partA_plus_one_evidence"
  | "ebsr_evidence_only"
  | "ebsr_zero"
  | "ebsr_invalid_response"
  | "multi_select_full_credit"
  | "multi_select_partial_subset"
  | "multi_select_zero"
  | "multi_select_invalid_response"
  | "hot_text_full_credit"
  | "hot_text_partial_subset"
  | "hot_text_zero"
  | "hot_text_invalid_response"
  | "matching_grid_full_credit"
  | "matching_grid_partial"
  | "matching_grid_zero"
  | "matching_grid_invalid_response"
  | "drag_drop_full_credit"
  | "drag_drop_partial"
  | "drag_drop_zero"
  | "drag_drop_invalid_response"
  | "inline_dropdown_full_credit"
  | "inline_dropdown_zero"
  | "inline_dropdown_invalid_response";

type JsonObject = Record<string, any>;

type ResponseDomain =
  | { interactionType: "MCQ"; choiceCount: number }
  | { interactionType: "EBSR"; partAChoiceCount: number; partBChoiceCount: number }
  | { interactionType: "MULTI_SELECT"; choiceCount: number }
  | { interactionType: "HOT_TEXT"; spanIds: string[] }
  | { interactionType: "MATCHING_GRID"; rowIds: string[]; columnIds: string[] }
  | { interactionType: "DRAG_DROP"; tokenIds: string[]; targetIds: string[] }
  | { interactionType: "INLINE_DROPDOWN"; blankOptions: Map<string, number> };

type ValidStudentResponse =
  | { interactionType: "MCQ"; selectedIndex: number }
  | { interactionType: "EBSR"; partAIndex: number; partBIndices: number[] }
  | { interactionType: "MULTI_SELECT"; selectedIndices: number[] }
  | { interactionType: "HOT_TEXT"; selectedSpanIds: string[] }
  | { interactionType: "MATCHING_GRID"; rowSelections: Record<string, string> }
  | { interactionType: "DRAG_DROP"; assignments: Record<string, string> }
  | { interactionType: "INLINE_DROPDOWN"; blankSelections: Record<string, number> };

/**
 * Scores only certified PSSA item payloads after detector/approval gates have already run.
 * This module does not re-run audit gates and does not replace the legacy assessment scorer.
 */
export function scorePssaItem(item: PssaScorableItem, response: unknown): PssaScoreResult {
  const interactionType = canonicalInteractionType(item.interactionType);
  const maxPoints = totalPoints(item.scoringJson);
  if (interactionType === "SHORT_ANSWER") return { status: "pending_human_scoring", pointsEarned: null, maxPoints, detail: "short_answer_rubric" };
  if (interactionType === "TDA") return { status: "pending_human_scoring", pointsEarned: null, maxPoints, detail: "tda_rubric" };

  const domain = extractDomainFromResponseSpec(interactionType, item.responseSpecJson, item.itemId);
  validateCorrectResponseAgainstDomain(interactionType, item.correctResponseJson, domain);
  const validResponse = validateStudentResponseAgainstDomain(interactionType, response, domain);
  if (!validResponse) return invalid(maxPoints, invalidDetail(interactionType));
  return scoreInDomainResponse(interactionType, validResponse, item.correctResponseJson, item.scoringJson, maxPoints);
}

function extractDomainFromResponseSpec(interactionType: string, responseSpecJson: unknown, itemId?: string): ResponseDomain {
  const spec = responseSpecObject(responseSpecJson, itemId);
  if (interactionType === "MCQ" || interactionType === "CONVENTIONS") return { interactionType: "MCQ", choiceCount: requiredArray(spec, "choices", itemId).length };
  if (interactionType === "EBSR") {
    return {
      interactionType: "EBSR",
      partAChoiceCount: requiredArray(objectField(spec.partA), "choices", itemId).length,
      partBChoiceCount: requiredArray(objectField(spec.partB), "choices", itemId).length,
    };
  }
  if (interactionType === "MULTI_SELECT") return { interactionType: "MULTI_SELECT", choiceCount: requiredArray(spec, "choices", itemId).length };
  if (interactionType === "HOT_TEXT") {
    return { interactionType: "HOT_TEXT", spanIds: requiredArray(spec, "selectableSpans", itemId).map((span) => stringField(objectField(span), "spanId")) };
  }
  if (interactionType === "MATCHING_GRID") {
    return {
      interactionType: "MATCHING_GRID",
      rowIds: requiredArray(spec, "rows", itemId).map((row) => stringField(objectField(row), "rowId")),
      columnIds: requiredArray(spec, "columns", itemId).map((column) => stringField(objectField(column), "columnId")),
    };
  }
  if (interactionType === "DRAG_DROP") {
    return {
      interactionType: "DRAG_DROP",
      tokenIds: requiredArray(spec, "tokens", itemId).map((token) => stringField(objectField(token), "tokenId")),
      targetIds: requiredArray(spec, "targets", itemId).map((target) => stringField(objectField(target), "targetId")),
    };
  }
  if (interactionType === "INLINE_DROPDOWN") {
    return {
      interactionType: "INLINE_DROPDOWN",
      blankOptions: new Map(requiredArray(spec, "blanks", itemId).map((blank) => {
        const obj = objectField(blank);
        return [stringField(obj, "blankId"), requiredArray(obj, "options", itemId).length] as const;
      })),
    };
  }
  throw new Error("unknown_interaction_type");
}

function validateCorrectResponseAgainstDomain(interactionType: string, correctResponseJson: unknown, domain: ResponseDomain): void {
  if ((interactionType === "MCQ" || interactionType === "CONVENTIONS") && domain.interactionType === "MCQ") {
    const correctIndex = integerField(objectField(correctResponseJson), "correctIndex");
    if (!inRange(correctIndex, domain.choiceCount)) malformed();
    return;
  }
  if (interactionType === "EBSR" && domain.interactionType === "EBSR") {
    const correct = objectField(correctResponseJson);
    const partAIndex = integerField(objectField(correct.partA), "correctIndex");
    const partBIndices = uniqueIntegerArray(objectField(correct.partB).correctIndices);
    if (!inRange(partAIndex, domain.partAChoiceCount) || !partBIndices.length || !partBIndices.every((index) => inRange(index, domain.partBChoiceCount))) malformed();
    return;
  }
  if (interactionType === "MULTI_SELECT" && domain.interactionType === "MULTI_SELECT") {
    const indices = uniqueIntegerArray(objectField(correctResponseJson).correctIndices);
    if (!indices.length || !indices.every((index) => inRange(index, domain.choiceCount))) malformed();
    return;
  }
  if (interactionType === "HOT_TEXT" && domain.interactionType === "HOT_TEXT") {
    const spanIds = uniqueStringArray(objectField(correctResponseJson).correctSpanIds);
    if (!spanIds.length || !spanIds.every((id) => domain.spanIds.includes(id))) malformed();
    return;
  }
  if (interactionType === "MATCHING_GRID" && domain.interactionType === "MATCHING_GRID") {
    const cells = gridCells(correctResponseJson);
    if (!cells.length || new Set(cells.map((cell) => cell.rowId)).size !== cells.length) malformed();
    if (!cells.every((cell) => domain.rowIds.includes(cell.rowId) && domain.columnIds.includes(cell.columnId))) malformed();
    return;
  }
  if (interactionType === "DRAG_DROP" && domain.interactionType === "DRAG_DROP") {
    const assignments = dragAssignments(correctResponseJson);
    if (!assignments.length || new Set(assignments.map((row) => row.tokenId)).size !== assignments.length) malformed();
    if (!assignments.every((row) => domain.tokenIds.includes(row.tokenId) && domain.targetIds.includes(row.targetId))) malformed();
    return;
  }
  if (interactionType === "INLINE_DROPDOWN" && domain.interactionType === "INLINE_DROPDOWN") {
    const blanks = inlineBlanks(correctResponseJson);
    if (blanks.length !== domain.blankOptions.size) malformed();
    if (!blanks.every((blank) => domain.blankOptions.has(blank.blankId) && inRange(blank.correctIndex, domain.blankOptions.get(blank.blankId)!))) malformed();
    return;
  }
  malformed();
}

function validateStudentResponseAgainstDomain(interactionType: string, response: unknown, domain: ResponseDomain): ValidStudentResponse | null {
  if ((interactionType === "MCQ" || interactionType === "CONVENTIONS") && domain.interactionType === "MCQ") {
    const payload = exactObject(response, ["selectedIndex"]);
    if (!payload || !isInteger(payload.selectedIndex) || !inRange(payload.selectedIndex, domain.choiceCount)) return null;
    return { interactionType: "MCQ", selectedIndex: payload.selectedIndex };
  }
  if (interactionType === "EBSR" && domain.interactionType === "EBSR") {
    const payload = exactObject(response, ["partAIndex", "partBIndices"]);
    if (!payload || !isInteger(payload.partAIndex) || !inRange(payload.partAIndex, domain.partAChoiceCount)) return null;
    const partB = studentIntegerArray(payload.partBIndices, domain.partBChoiceCount);
    if (!partB.ok) return null;
    return { interactionType: "EBSR", partAIndex: payload.partAIndex, partBIndices: partB.values };
  }
  if (interactionType === "MULTI_SELECT" && domain.interactionType === "MULTI_SELECT") {
    const payload = exactObject(response, ["selectedIndices"]);
    if (!payload) return null;
    const selected = studentIntegerArray(payload.selectedIndices, domain.choiceCount);
    if (!selected.ok) return null;
    return { interactionType: "MULTI_SELECT", selectedIndices: selected.values };
  }
  if (interactionType === "HOT_TEXT" && domain.interactionType === "HOT_TEXT") {
    const payload = exactObject(response, ["selectedSpanIds"]);
    if (!payload) return null;
    const selected = studentStringArray(payload.selectedSpanIds, domain.spanIds);
    if (!selected.ok) return null;
    return { interactionType: "HOT_TEXT", selectedSpanIds: selected.values };
  }
  if (interactionType === "MATCHING_GRID" && domain.interactionType === "MATCHING_GRID") {
    const payload = exactObject(response, ["rowSelections"]);
    if (!payload) return null;
    const selections = studentStringMap(payload.rowSelections, domain.rowIds, domain.columnIds);
    if (!selections.ok) return null;
    return { interactionType: "MATCHING_GRID", rowSelections: selections.values };
  }
  if (interactionType === "DRAG_DROP" && domain.interactionType === "DRAG_DROP") {
    const payload = exactObject(response, ["assignments"]);
    if (!payload) return null;
    const assignments = studentStringMap(payload.assignments, domain.tokenIds, domain.targetIds);
    if (!assignments.ok) return null;
    return { interactionType: "DRAG_DROP", assignments: assignments.values };
  }
  if (interactionType === "INLINE_DROPDOWN" && domain.interactionType === "INLINE_DROPDOWN") {
    const payload = exactObject(response, ["blankSelections"]);
    if (!payload) return null;
    const selections = studentNumberMap(payload.blankSelections, domain.blankOptions);
    if (!selections.ok) return null;
    return { interactionType: "INLINE_DROPDOWN", blankSelections: selections.values };
  }
  return null;
}

function scoreInDomainResponse(interactionType: string, response: ValidStudentResponse, correctResponseJson: unknown, scoringJson: unknown, maxPoints: number): PssaScoreResult {
  if ((interactionType === "MCQ" || interactionType === "CONVENTIONS") && response.interactionType === "MCQ") {
    if (maxPoints !== 1) malformed();
    const correctIndex = integerField(objectField(correctResponseJson), "correctIndex");
    return response.selectedIndex === correctIndex ? scored(1, maxPoints, "mcq_correct") : scored(0, maxPoints, "mcq_wrong");
  }
  if (interactionType === "EBSR" && response.interactionType === "EBSR") {
    if (maxPoints !== 2) malformed();
    const scoring = objectField(scoringJson);
    if (scoring.partAPoints !== 1 || scoring.partBPoints !== 1 || scoring.requirePartACorrectForFullCredit !== true) malformed();
    const correct = objectField(correctResponseJson);
    const partACorrectIndex = integerField(objectField(correct.partA), "correctIndex");
    const partBCorrectIndices = uniqueIntegerArray(objectField(correct.partB).correctIndices);
    const a = response.partAIndex === partACorrectIndex;
    const exactB = sameSet(response.partBIndices, partBCorrectIndices);
    const bHits = response.partBIndices.filter((index) => partBCorrectIndices.includes(index)).length;
    const hasIncorrectPick = response.partBIndices.some((index) => !partBCorrectIndices.includes(index));
    if (a && exactB) return scored(2, maxPoints, "ebsr_full_credit");
    if (a && bHits >= 1 && !hasIncorrectPick) return scored(1, maxPoints, "ebsr_partA_plus_one_evidence");
    if (!a && exactB) return scored(1, maxPoints, "ebsr_evidence_only");
    // Intentional PR C divergence: legacy scoreAssessmentQuestion awards 1 point for Part A alone;
    // canonical PSSA scoring gives 0 when evidence support is absent.
    return scored(0, maxPoints, "ebsr_zero");
  }
  if (interactionType === "MULTI_SELECT" && response.interactionType === "MULTI_SELECT") {
    const correct = uniqueIntegerArray(objectField(correctResponseJson).correctIndices);
    validateSetScoring(maxPoints, correct.length);
    return scoreSetSubset(response.selectedIndices, correct, maxPoints, "multi_select");
  }
  if (interactionType === "HOT_TEXT" && response.interactionType === "HOT_TEXT") {
    const correct = uniqueStringArray(objectField(correctResponseJson).correctSpanIds);
    validateSetScoring(maxPoints, correct.length);
    return scoreSetSubset(response.selectedSpanIds, correct, maxPoints, "hot_text");
  }
  if (interactionType === "MATCHING_GRID" && response.interactionType === "MATCHING_GRID") {
    const cells = gridCells(correctResponseJson);
    if (maxPoints !== cells.length) malformed();
    const points = cells.filter((cell) => response.rowSelections[cell.rowId] === cell.columnId).length;
    if (points === maxPoints) return scored(points, maxPoints, "matching_grid_full_credit");
    if (points > 0) return scored(points, maxPoints, "matching_grid_partial");
    return scored(0, maxPoints, "matching_grid_zero");
  }
  if (interactionType === "DRAG_DROP" && response.interactionType === "DRAG_DROP") {
    const assignments = dragAssignments(correctResponseJson);
    validateSetScoring(maxPoints, assignments.length);
    const correctCount = assignments.filter((row) => response.assignments[row.tokenId] === row.targetId).length;
    const points = maxPoints === 1 ? (correctCount === assignments.length ? 1 : 0) : correctCount;
    if (points === maxPoints) return scored(points, maxPoints, "drag_drop_full_credit");
    if (points > 0) return scored(points, maxPoints, "drag_drop_partial");
    return scored(0, maxPoints, "drag_drop_zero");
  }
  if (interactionType === "INLINE_DROPDOWN" && response.interactionType === "INLINE_DROPDOWN") {
    if (maxPoints !== 1) malformed();
    const correct = inlineBlanks(correctResponseJson);
    const allCorrect = correct.every((blank) => response.blankSelections[blank.blankId] === blank.correctIndex);
    return allCorrect ? scored(1, maxPoints, "inline_dropdown_full_credit") : scored(0, maxPoints, "inline_dropdown_zero");
  }
  malformed();
}

function invalidDetail(interactionType: string): PssaScoreDetail {
  if (interactionType === "MCQ" || interactionType === "CONVENTIONS") return "mcq_invalid_response";
  if (interactionType === "EBSR") return "ebsr_invalid_response";
  if (interactionType === "MULTI_SELECT") return "multi_select_invalid_response";
  if (interactionType === "HOT_TEXT") return "hot_text_invalid_response";
  if (interactionType === "MATCHING_GRID") return "matching_grid_invalid_response";
  if (interactionType === "DRAG_DROP") return "drag_drop_invalid_response";
  if (interactionType === "INLINE_DROPDOWN") return "inline_dropdown_invalid_response";
  throw new Error("unknown_interaction_type");
}

function responseSpecObject(value: unknown, itemId?: string): JsonObject {
  if (!isPlainObject(value)) missingDomain(itemId, "responseSpecJson");
  return value;
}

function requiredArray(parent: JsonObject, field: string, itemId?: string) {
  const value = parent[field];
  if (!Array.isArray(value) || value.length === 0) missingDomain(itemId, field);
  return value;
}

function gridCells(value: unknown) {
  return arrayField(objectField(value).correctCells).map((cell) => ({
    rowId: stringField(objectField(cell), "rowId"),
    columnId: stringField(objectField(cell), "columnId"),
  }));
}

function dragAssignments(value: unknown) {
  return arrayField(objectField(value).correctAssignments).map((row) => ({
    tokenId: stringField(objectField(row), "tokenId"),
    targetId: stringField(objectField(row), "targetId"),
  }));
}

function inlineBlanks(value: unknown) {
  return arrayField(objectField(value).blanks).map((blank) => ({
    blankId: stringField(objectField(blank), "blankId"),
    correctIndex: integerField(objectField(blank), "correctIndex"),
  }));
}

function scoreSetSubset(values: Array<number | string>, correct: Array<number | string>, maxPoints: number, prefix: "multi_select" | "hot_text"): PssaScoreResult {
  const hitCount = values.filter((value) => correct.includes(value)).length;
  const hasIncorrect = values.some((value) => !correct.includes(value));
  const exact = sameSet(values, correct);
  if (maxPoints === 1) return exact ? scored(1, maxPoints, `${prefix}_full_credit`) : scored(0, maxPoints, `${prefix}_zero`);
  if (hasIncorrect) return scored(0, maxPoints, `${prefix}_zero`);
  if (exact) return scored(maxPoints, maxPoints, `${prefix}_full_credit`);
  if (hitCount > 0) return scored(hitCount, maxPoints, `${prefix}_partial_subset`);
  return scored(0, maxPoints, `${prefix}_zero`);
}

function scored(pointsEarned: number, maxPoints: number, detail: PssaScoreDetail): PssaScoreResult {
  return { status: "scored", pointsEarned, maxPoints, detail };
}

function invalid(maxPoints: number, detail: PssaScoreDetail): PssaScoreResult {
  return { status: "invalid_response", pointsEarned: 0, maxPoints, detail };
}

function totalPoints(value: unknown) {
  const points = objectField(value).totalPoints;
  if (!isInteger(points) || points < 1) malformed();
  return points;
}

function exactObject(value: unknown, keys: string[]) {
  if (!isPlainObject(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key) => actual.includes(key))) return null;
  return value;
}

function studentIntegerArray(value: unknown, length: number) {
  if (!Array.isArray(value)) return { ok: false as const, values: [] };
  const values = value.filter(isInteger);
  if (values.length !== value.length || new Set(values).size !== values.length || !values.every((index) => inRange(index, length))) return { ok: false as const, values: [] };
  return { ok: true as const, values };
}

function studentStringArray(value: unknown, domain: string[]) {
  if (!Array.isArray(value)) return { ok: false as const, values: [] };
  const values = value.filter((item): item is string => typeof item === "string");
  if (values.length !== value.length || new Set(values).size !== values.length || !values.every((id) => domain.includes(id))) return { ok: false as const, values: [] };
  return { ok: true as const, values };
}

function studentStringMap(value: unknown, keyDomain: string[], valueDomain: string[]) {
  if (!isPlainObject(value)) return { ok: false as const, values: {} as Record<string, string> };
  const entries = Object.entries(value);
  if (!entries.every(([key, child]) => keyDomain.includes(key) && typeof child === "string" && valueDomain.includes(child))) return { ok: false as const, values: {} };
  return { ok: true as const, values: value as Record<string, string> };
}

function studentNumberMap(value: unknown, domain: Map<string, number>) {
  if (!isPlainObject(value)) return { ok: false as const, values: {} as Record<string, number> };
  const entries = Object.entries(value);
  if (!entries.every(([key, child]) => domain.has(key) && isInteger(child) && inRange(child, domain.get(key)!))) return { ok: false as const, values: {} };
  return { ok: true as const, values: value as Record<string, number> };
}

function objectField(value: unknown): JsonObject {
  if (!isPlainObject(value)) malformed();
  return value;
}

function arrayField(value: unknown): any[] {
  if (!Array.isArray(value)) malformed();
  return value;
}

function integerField(value: JsonObject, key: string) {
  const child = value[key];
  if (!isInteger(child)) malformed();
  return child;
}

function stringField(value: JsonObject, key: string) {
  const child = value[key];
  if (typeof child !== "string" || !child) malformed();
  return child;
}

function uniqueIntegerArray(value: unknown) {
  if (!Array.isArray(value) || !value.every(isInteger) || new Set(value).size !== value.length) malformed();
  return value as number[];
}

function uniqueStringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string") || new Set(value).size !== value.length) malformed();
  return value as string[];
}

function validateSetScoring(total: number, correctSize: number) {
  if (correctSize < 1) malformed();
  if (total !== correctSize && total !== 1) malformed();
}

function sameSet(left: Array<number | string>, right: Array<number | string>) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function inRange(index: number, length: number) {
  return index >= 0 && index < length;
}

function canonicalInteractionType(type: string) {
  return String(type || "").toUpperCase();
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function missingDomain(itemId: string | undefined, field: string): never {
  throw new Error(`malformed_item_scoring_data:${itemId ?? "unknown_item"}:${field}_missing`);
}

function malformed(): never {
  throw new Error("malformed_item_scoring_data");
}
