import assert from "node:assert/strict";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
} from "./audit/pssa-audit-detectors";

function mcqFixture(id: string, correctIndex: number, choices: string[]) {
  return { id, itemType: "MCQ", correctIndex, answerChoicesJson: choices };
}

const biased = Array.from({ length: 10 }, (_, index) => mcqFixture(`biased-${index}`, index < 7 ? 0 : 1, [
  "Correct response includes many specific qualifying words",
  "Short plausible response",
  "Brief plausible response",
  "Small plausible response",
]));
assert.equal(buildMcqCorrectIsLongestReport(biased).find((row) => row.scope === "batch")?.result, "FAIL");

const balanced = [
  ...Array.from({ length: 3 }, (_, index) => mcqFixture(`balanced-long-${index}`, 0, [
    "Correct response includes many specific qualifying words",
    "Short plausible response",
    "Brief plausible response",
    "Small plausible response",
  ])),
  ...Array.from({ length: 7 }, (_, index) => mcqFixture(`balanced-other-${index}`, 1, [
    "Distractor response includes many specific qualifying words",
    "Clear response",
    "Brief plausible response",
    "Small plausible response",
  ])),
];
assert.equal(buildMcqCorrectIsLongestReport(balanced).find((row) => row.scope === "batch")?.result, "PASS");

const blocker = buildMcqCorrectIsLongestReport([mcqFixture("blocker", 0, [
  "Correct answer is longer by several useful words",
  "Short wrong choice",
  "Brief wrong choice",
  "Small wrong choice",
])]).find((row) => row.scope === "item");
assert.equal(blocker?.result, "FAIL");
assert.equal(blocker?.severity, "BLOCKER");

const warning = buildMcqCorrectIsLongestReport([mcqFixture("warning", 0, [
  "Correct response has seven total clear words",
  "Distractor response uses six sizable words",
  "Alternative response uses six sizable words",
  "Incorrect response uses six sizable words",
])]).find((row) => row.scope === "item");
assert.equal(warning?.result, "PASS");
assert.equal(warning?.severity, "WARNING");

assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("every", 0, [
  "Correct supported response",
  "Every visitor returns seed packets",
  "Plausible wrong emphasis",
  "Partial misunderstanding",
])]).some((row) => row.result === "FAIL" && row.term === "every"), true);

assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("never", 0, [
  "Correct supported response",
  "The map is never useful",
  "Plausible wrong emphasis",
  "Partial misunderstanding",
])]).some((row) => row.result === "FAIL" && row.term === "never"), true);

assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("clean", 0, [
  "Correct supported response",
  "The map helps with one part of planning",
  "Plausible wrong emphasis",
  "Partial misunderstanding",
])]).every((row) => row.result === "PASS"), true);

assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("boundary", 0, [
  "Correct supported response",
  "The alloy generally stayed cooler",
  "Plausible wrong emphasis",
  "Partial misunderstanding",
])]).every((row) => row.result === "PASS"), true);

console.log("PSSA content audit detector tests passed.");
