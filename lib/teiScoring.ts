export type StudentResponse = {
  itemId: string;
  itemType: string;
  rawResponse: any;
  isCorrect: boolean;
  partialCreditEarned: number;
  totalPoints: number;
  feedback: string;
  distractorFeedback?: string;
};

export type ScoreResult = {
  isCorrect: boolean;
  partialCredit: number;
  totalPoints: number;
  feedback: string;
  distractorFeedback?: string;
};

export function scoreItem(item: any, rawResponse: any): ScoreResult {
  const type = item?.type;
  if (type === "mc") return scoreMultipleChoice(item, rawResponse);
  if (type === "inline-dropdown") return scoreInlineDropdown(item, rawResponse);
  if (type === "hot-text-word") return scoreHotTextWord(item, rawResponse);
  if (type === "hot-text-phrase") return scoreHotTextPhrase(item, rawResponse);
  if (type === "hot-text-sentence") return scoreHotTextSentence(item, rawResponse);
  if (type === "drag-drop-table") return scoreDragDropTable(item, rawResponse);
  if (type === "drag-drop-order") return scoreDragDropOrder(item, rawResponse);
  if (type === "evidence-mapping") return scoreEvidenceMapping(item, rawResponse);
  if (type === "multi-select") return scoreMultiSelect(item, rawResponse);
  if (type === "two-part-ebsr") return scoreTwoPartEbsr(item, rawResponse);
  return result(false, 0, item?.rightAnswerRationale || "This item type is not supported yet.");
}

export function itemKey(item: any, index = 0) {
  return String(item?.id || item?.itemId || `${item?.type || "item"}-${index}-${hashText(item?.question || item?.sentence || item?.paragraph || "")}`);
}

export function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function asArray<T = string>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function arraysEqualIgnoreOrder(a: unknown[], b: unknown[]) {
  const left = a.map(normalizeText).sort();
  const right = b.map(normalizeText).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function correctMappingRecord(mapping: any): Record<string, string> {
  if (!mapping) return {};
  if (Array.isArray(mapping)) {
    return Object.fromEntries(mapping.map((entry) => [String(entry.item || ""), String(entry.column || "")]).filter(([item]) => item));
  }
  return Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key, String(value || "")]));
}

export function evidenceMappingRecord(mapping: any): Record<string, string[]> {
  if (!mapping) return {};
  if (Array.isArray(mapping)) {
    return Object.fromEntries(mapping.map((entry) => [String(entry.claim || ""), asArray<string>(entry.evidenceItems)]).filter(([claim]) => claim));
  }
  return Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key, asArray<string>(value)]));
}

export function correctFeedback(item: any) {
  return item?.rightAnswerRationale || "Correct. Your answer matches the evidence and the skill focus.";
}

function scoreMultipleChoice(item: any, rawResponse: any) {
  const selected = String(rawResponse?.selected || rawResponse || "");
  const correct = same(selected, item.correctAnswer);
  return result(correct, correct ? 1 : 0, correctFeedback(item), correct ? undefined : wrongChoiceFeedback(item, selected));
}

function scoreInlineDropdown(item: any, rawResponse: any) {
  const selected = String(rawResponse?.selectedOption || rawResponse?.selectedOptions?.[0] || rawResponse || "");
  const correct = same(selected, item.correctOption);
  return result(correct, correct ? 1 : 0, correctFeedback(item), correct ? undefined : wrongOptionFeedback(item, selected));
}

function scoreHotTextWord(item: any, rawResponse: any) {
  const selections = asArray<string>(rawResponse?.selections);
  const pairs = asArray<any>(item.bracketPairs);
  const correctCount = pairs.filter((pair, index) => same(selections[index], pair.correct)).length;
  const partial = pairs.length ? correctCount / pairs.length : 0;
  return result(partial === 1, partial, correctFeedback(item));
}

function scoreHotTextPhrase(item: any, rawResponse: any) {
  const selected = asArray<string>(rawResponse?.selectedPhrases);
  const correctPhrases = asArray<string>(item.correctPhrases);
  const correctSelections = selected.filter((phrase) => correctPhrases.some((correct) => same(correct, phrase))).length;
  const incorrectSelections = selected.length - correctSelections;
  const partial = correctPhrases.length ? Math.max(0, (correctSelections - incorrectSelections) / correctPhrases.length) : 0;
  return result(arraysEqualIgnoreOrder(selected, correctPhrases), clamp(partial), correctFeedback(item));
}

function scoreHotTextSentence(item: any, rawResponse: any) {
  const selected = Number(rawResponse?.selectedSentenceNumber || rawResponse);
  const correct = selected === Number(item.correctSentenceNumber);
  return result(correct, correct ? 1 : 0, correctFeedback(item));
}

function scoreDragDropTable(item: any, rawResponse: any) {
  const submitted = rawResponse?.mapping || {};
  const expected = correctMappingRecord(item.correctMapping);
  const keys = Object.keys(expected);
  const correctCount = keys.filter((key) => same(submitted[key], expected[key])).length;
  const partial = keys.length ? correctCount / keys.length : 0;
  const wrongItems = keys.filter((key) => !same(submitted[key], expected[key]));
  return result(partial === 1, partial, correctFeedback(item), wrongItems.length ? `Check these placements: ${wrongItems.join(", ")}.` : undefined);
}

function scoreDragDropOrder(item: any, rawResponse: any) {
  const order = asArray<string>(rawResponse?.order);
  const correctOrder = asArray<string>(item.correctOrder);
  let prefix = 0;
  while (prefix < correctOrder.length && same(order[prefix], correctOrder[prefix])) prefix += 1;
  const partial = correctOrder.length ? prefix / correctOrder.length : 0;
  return result(partial === 1, partial, correctFeedback(item));
}

function scoreEvidenceMapping(item: any, rawResponse: any) {
  const submitted = rawResponse?.mapping || {};
  const expected = evidenceMappingRecord(item.correctMapping);
  const claims = Object.keys(expected);
  const scores = claims.map((claim) => f1Score(asArray<string>(submitted[claim]), expected[claim]));
  const partial = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  return result(partial === 1, partial, correctFeedback(item));
}

function scoreMultiSelect(item: any, rawResponse: any) {
  const selected = asArray<string>(rawResponse?.selectedAnswers);
  const correctAnswers = asArray<string>(item.correctAnswers);
  if (item.partialCreditRule === "all-or-nothing") {
    const correct = arraysEqualIgnoreOrder(selected, correctAnswers);
    return result(correct, correct ? 1 : 0, correctFeedback(item));
  }
  const correctSelections = selected.filter((choice) => correctAnswers.some((correct) => same(correct, choice))).length;
  const incorrectSelections = selected.length - correctSelections;
  const partial = correctAnswers.length ? Math.max(0, (correctSelections - incorrectSelections) / correctAnswers.length) : 0;
  return result(arraysEqualIgnoreOrder(selected, correctAnswers), clamp(partial), correctFeedback(item));
}

function scoreTwoPartEbsr(item: any, rawResponse: any) {
  const partACorrect = same(rawResponse?.partA, item.partA?.correctAnswer);
  const partBSelected = asArray<string>(rawResponse?.partB);
  const partBCorrect = arraysEqualIgnoreOrder(partBSelected, asArray<string>(item.partB?.correctAnswers));
  const partBScore = partBCorrect ? 1 : multiSelectPartial(partBSelected, asArray<string>(item.partB?.correctAnswers));
  const partial = item.scoringRule === "B-counts-only-if-A-correct"
    ? (partACorrect ? (1 + partBScore) / 2 : 0)
    : ((partACorrect ? 1 : 0) + partBScore) / 2;
  return result(partACorrect && partBCorrect, partial, correctFeedback(item), !partACorrect ? "Part B evidence only helps when Part A answers the question correctly." : undefined);
}

function multiSelectPartial(selected: string[], correctAnswers: string[]) {
  const correctSelections = selected.filter((choice) => correctAnswers.some((correct) => same(correct, choice))).length;
  const incorrectSelections = selected.length - correctSelections;
  return correctAnswers.length ? clamp(Math.max(0, (correctSelections - incorrectSelections) / correctAnswers.length)) : 0;
}

function f1Score(selected: string[], correctAnswers: string[]) {
  const truePositive = selected.filter((choice) => correctAnswers.some((correct) => same(correct, choice))).length;
  if (!selected.length && !correctAnswers.length) return 1;
  if (!selected.length || !correctAnswers.length || !truePositive) return 0;
  const precision = truePositive / selected.length;
  const recall = truePositive / correctAnswers.length;
  return (2 * precision * recall) / (precision + recall);
}

function same(a: unknown, b: unknown) {
  return normalizeText(a) === normalizeText(b);
}

function wrongChoiceFeedback(item: any, selected: string) {
  return asArray<any>(item.distractorRationale).find((entry) => same(entry.choice, selected))?.whyWrong;
}

function wrongOptionFeedback(item: any, selected: string) {
  return asArray<any>(item.distractorRationale).find((entry) => same(entry.option, selected))?.whyWrong;
}

function result(isCorrect: boolean, partialCredit: number, feedback: string, distractorFeedback?: string): ScoreResult {
  return { isCorrect, partialCredit: clamp(partialCredit), totalPoints: 1, feedback, distractorFeedback };
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
