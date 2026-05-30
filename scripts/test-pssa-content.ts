import assert from "node:assert/strict";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildMcqPassageSpecificityReport,
  hasBlockingPassageSpecificityFailure,
  type McqAuditInput,
  type StructuredChoice,
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

const passage = {
  id: "p1",
  title: "The Animal That Builds Its Own Wetland",
  text: [
    "Beavers are often called ecosystem engineers. Using branches, mud, and stones, a beaver blocks the flow of a stream until the water backs up and forms a pond.",
    "It holds water in place, lets the soil settle, and releases the water slowly over days or weeks.",
    "Frogs, fish, insects, and birds gather where the water is calm and steady.",
  ].join("\n\n"),
};

function link(paragraphIndex: number, sentenceIndex: number, quotedSpan: string) {
  const startChar = passage.text.indexOf(quotedSpan);
  assert.notEqual(startChar, -1);
  return { paragraphIndex, sentenceIndex, quotedSpan, startChar, endChar: startChar + quotedSpan.length };
}

function readingItem(overrides: Partial<McqAuditInput> = {}): McqAuditInput {
  const structuredChoicesJson: StructuredChoice[] = [
    {
      text: "Beavers reshape streams by building dams that help water, soil, and wildlife.",
      isCorrect: true,
      rationale: "This central idea matches the passage evidence and the EC skill for determining a central idea from details.",
      evidenceLinks: [link(0, 1, "Using branches, mud, and stones, a beaver blocks the flow of a stream until the water backs up and forms a pond.")],
      distractorRole: null,
    },
    {
      text: "Frogs and fish gather near calm beaver pond water.",
      isCorrect: false,
      rationale: "This is a real detail, but it is too narrow to state the whole central idea.",
      evidenceLinks: [link(2, 0, "Frogs, fish, insects, and birds gather where the water is calm and steady.")],
      distractorRole: "too_narrow",
    },
    {
      text: "Branches and mud matter because they help beavers block stream flow.",
      isCorrect: false,
      rationale: "This detail explains how the dam is made, but it misses the broader effects on water, soil, and wildlife.",
      evidenceLinks: [link(0, 1, "Using branches, mud, and stones, a beaver blocks the flow of a stream until the water backs up and forms a pond.")],
      distractorRole: "wrong_section",
    },
    {
      text: "Soil settles because beaver ponds hold water in place.",
      isCorrect: false,
      rationale: "This evidence is accurate, but it names only one result of the beaver dam.",
      evidenceLinks: [link(1, 0, "It holds water in place, lets the soil settle, and releases the water slowly over days or weeks.")],
      distractorRole: "too_narrow",
    },
  ];
  return {
    id: "reading-pass",
    itemType: "MCQ",
    passageId: "p1",
    reportingCategory: "B",
    gradeLevel: 6,
    eligibleContent: "E06.B-K.1.1.2",
    studentFacingPrompt: "Which sentence best states the central idea of the beaver passage?",
    correctIndex: 0,
    answerChoicesJson: structuredChoicesJson.map((choice) => choice.text),
    structuredChoicesJson,
    ...overrides,
  };
}

assert.equal(hasBlockingPassageSpecificityFailure(buildMcqPassageSpecificityReport([readingItem()], [passage])), false);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "generic-choice",
  answerChoicesJson: [
    "The opening detail gives useful background.",
    "Frogs and fish gather near calm beaver pond water.",
    "Branches and mud matter because they help beavers block stream flow.",
    "Soil settles because beaver ponds hold water in place.",
  ],
  structuredChoicesJson: null,
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_GENERIC_TEST_TAKING_LANGUAGE" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport(Array.from({ length: 3 }, (_, index) => readingItem({ id: `reuse-${index}` })), [passage])
  .some((row) => row.ruleId === "PSSA_MCQ_TEMPLATE_LANGUAGE_REUSE" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "zero-overlap",
  answerChoicesJson: [
    "Beavers reshape streams by building dams that help water, soil, and wildlife.",
    "The quiet library display helped visitors compare several drawings.",
    "Branches and mud matter because they help beavers block stream flow.",
    "Soil settles because beaver ponds hold water in place.",
  ],
  structuredChoicesJson: null,
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "missing-evidence",
  structuredChoicesJson: [{ text: "Beavers reshape streams by building dams that help water, soil, and wildlife.", isCorrect: true, distractorRole: null }],
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "missing-role",
  structuredChoicesJson: (readingItem() as any).structuredChoicesJson.map((choice: any, index: number) => index === 1 ? { ...choice, distractorRole: null } : choice),
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "fabricated-span",
  structuredChoicesJson: (readingItem() as any).structuredChoicesJson.map((choice: any, index: number) => index === 0
    ? { ...choice, evidenceLinks: [{ paragraphIndex: 0, sentenceIndex: 0, quotedSpan: "students planned a garden", startChar: 0, endChar: 25 }] }
    : choice),
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([
  readingItem({ id: "dupe-a", eligibleContent: "E06.B-K.1.1.1" }),
  readingItem({ id: "dupe-b", eligibleContent: "E06.B-K.1.1.2" }),
], [passage]).some((row) => row.ruleId === "PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES" && row.result === "FAIL"), true);

assert.equal(buildMcqPassageSpecificityReport([{
  id: "conventions",
  itemType: "MCQ",
  passageId: null,
  reportingCategory: "D",
  correctIndex: 0,
  answerChoicesJson: ["A clear sentence.", "A fragment.", "A comma splice.", "A run-on sentence."],
}], [passage]).length, 0);

console.log("PSSA content audit detector tests passed.");
