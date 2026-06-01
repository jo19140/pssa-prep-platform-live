import assert from "node:assert/strict";
import {
  buildAnswerPositionDistribution,
  buildDuplicateItemReport,
  buildManifestValidationReport,
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildPassageRepetitionReport,
} from "./audit/pssa-audit-detectors";
import {
  canApprovePssaItem,
  isPssaItemStudentReady,
} from "../lib/pssaGovernance";
import fs from "fs";
import path from "path";

function item(id: string, correctIndex: number, overrides: Record<string, unknown> = {}) {
  return {
    source: "fixture",
    subject: "ELA",
    grade: 4,
    itemId: id,
    standardCode: "CC.1.2.4.A",
    questionType: "MCQ",
    passageId: "fixture-passage",
    item: {
      id,
      type: "MCQ",
      question: "Which detail best supports the main idea?",
      choices: ["A", "B", "C", "D"],
      correctIndex,
      ...overrides,
    },
  };
}

const biased = Array.from({ length: 20 }, (_, index) => item(`biased-${index}`, index < 18 ? 0 : 1));
const distribution = buildAnswerPositionDistribution(biased);
assert.equal(distribution.find((row) => row.groupKey === "overall")?.result, "FAIL");
assert.equal(
  distribution.find((row) => row.groupKey.includes("standardCode=CC.1.2.4.A"))?.result,
  "FAIL",
);

const small = Array.from({ length: 10 }, (_, index) => item(`small-${index}`, 0, { question: `Small subgroup question ${index}` }));
const smallDistribution = buildAnswerPositionDistribution(small);
assert.equal(
  smallDistribution.find((row) => row.groupKey.includes("standardCode=CC.1.2.4.A"))?.result,
  "SKIP",
);

function mcqFixture(id: string, correctIndex: number, choices: string[]) {
  return {
    id,
    itemType: "MCQ",
    gradeLevel: 6,
    subject: "ELA",
    standardCode: "E06.B-K.1.1.2",
    studentFacingPrompt: `Question ${id}`,
    answerChoicesJson: choices,
    correctIndex,
  };
}

const longestBiasedBatch = Array.from({ length: 10 }, (_, index) => mcqFixture(`long-biased-${index}`, 0, [
  "This correct answer has many extra precise words",
  "Brief wrong option",
  "Short wrong option",
  "Small wrong option",
]));
assert.equal(buildMcqCorrectIsLongestReport(longestBiasedBatch).find((row) => row.scope === "batch")?.result, "FAIL");

const longestBalancedBatch = [
  ...Array.from({ length: 3 }, (_, index) => mcqFixture(`long-ok-${index}`, 0, [
    "This correct answer has many extra precise words",
    "Brief wrong option",
    "Short wrong option",
    "Small wrong option",
  ])),
  ...Array.from({ length: 7 }, (_, index) => mcqFixture(`long-not-${index}`, 1, [
    "This distractor has many extra precise words",
    "A clear answer",
    "Short wrong option",
    "Small wrong option",
  ])),
];
assert.equal(buildMcqCorrectIsLongestReport(longestBalancedBatch).find((row) => row.scope === "batch")?.result, "PASS");

const itemLongestBlocker = buildMcqCorrectIsLongestReport([mcqFixture("long-blocker", 0, [
  "The correct answer is longest by several words",
  "Short wrong choice",
  "Brief wrong choice",
  "Small wrong choice",
])]).find((row) => row.scope === "item");
assert.equal(itemLongestBlocker?.result, "FAIL");
assert.equal(itemLongestBlocker?.severity, "BLOCKER");

const itemLongestWarning = buildMcqCorrectIsLongestReport([mcqFixture("long-warning", 0, [
  "This correct answer has seven total words",
  "This distractor has around six words",
  "Another option has around six words",
  "Final option has around six words",
])]).find((row) => row.scope === "item");
assert.equal(itemLongestWarning?.result, "PASS");
assert.equal(itemLongestWarning?.severity, "WARNING");

assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("abs-every", 0, [
  "Correct supported answer",
  "Every visitor returns seeds immediately",
  "A plausible wrong emphasis",
  "A partial reading of evidence",
])]).some((row) => row.result === "FAIL" && row.term === "every"), true);
assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("abs-never", 0, [
  "Correct supported answer",
  "The map is never useful for planning",
  "A plausible wrong emphasis",
  "A partial reading of evidence",
])]).some((row) => row.result === "FAIL" && row.term === "never"), true);
assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("abs-clean", 0, [
  "Correct supported answer",
  "The map helps with one part of planning",
  "A plausible wrong emphasis",
  "A partial reading of evidence",
])]).every((row) => row.result === "PASS"), true);
assert.equal(buildMcqAbsoluteLanguageDistractorReport([mcqFixture("abs-boundary", 0, [
  "Correct supported answer",
  "The alloy sample generally stayed cooler",
  "A plausible wrong emphasis",
  "A partial reading of evidence",
])]).every((row) => row.result === "PASS"), true);

const duplicates = buildDuplicateItemReport([
  item("dup-1", 0, { question: "What is the central idea?", choices: ["One", "Two", "Three", "Four"] }),
  item("dup-2", 0, { question: "What is the central idea?", choices: ["One", "Two", "Three", "Four"] }),
]);
assert.ok(duplicates.some((row) => row.ruleId === "PSSA_DUPLICATE_ITEM_EXACT"));

const repetition = buildPassageRepetitionReport([
  {
    passageId: "p1",
    title: "Repeated",
    grade: 4,
    content: "The same paragraph repeats. It repeats here.\n\nThe same paragraph repeats. It repeats here.",
  },
]);
assert.equal(repetition[0].result, "FAIL");
assert.equal(repetition[0].repeatedParagraphCount, 1);

const manifestRows = buildManifestValidationReport({
  manifest: { totalDiagnosticItems: 2, totalLessons: 0, totalPassages: 1, totalStandards: 99, totalStudentPreviewEntries: 2 },
  actual: { diagnosticItems: 2, lessons: 0, passages: 1, standards: 3, studentPreviewEntries: 2 },
});
assert.equal(manifestRows.find((row) => row.fileName === "pssa_standards_alignment.csv")?.result, "FAIL");

const baseGovernedItem = {
  reviewStatus: "APPROVED",
  itemStatus: "pilot_ready",
  retiredAt: null,
  sourceType: "internal_original",
  sourceName: "Internal fixture",
  sourceCitation: "Internal fixture",
  licenseStatus: "cleared_internal_original",
  commercialUseAllowed: true,
  needsLegalReview: false,
  standardCode: "CC.1.2.4.A",
  assessmentAnchor: "E04.A-K.1",
  eligibleContent: "E04.A-K.1.1.1",
  alignmentStatus: "ALIGNED",
  itemType: "MCQ",
  skill: "Main Idea",
  answerChoicesJson: ["A specific answer", "A distractor", "Another distractor", "Last distractor"],
  correctAnswer: "A specific answer",
  correctIndex: 0,
  scoringRubricJson: { scoring: "selected_choice" },
  studentPreviewJson: { question: "Which answer is best?", choices: ["A specific answer", "A distractor", "Another distractor", "Last distractor"] },
  approvedAt: new Date(),
  reviewedBy: "reviewer-id",
  approvalEligible: true,
  auditResults: [{ ruleId: "PSSA_DUPLICATE_ITEM_EXACT", result: "PASS", severity: "BLOCKER" }],
};

assert.equal(isPssaItemStudentReady({ ...baseGovernedItem, reviewStatus: "APPROVED" }), true);
assert.equal(isPssaItemStudentReady({ ...baseGovernedItem, licenseStatus: "review_required" }), false);
assert.ok(canApprovePssaItem({ ...baseGovernedItem, licenseStatus: "review_required" }).blockers.includes("PSSA_LICENSE_NOT_CLEARED"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, needsLegalReview: true }).blockers.includes("PSSA_NEEDS_LEGAL_REVIEW"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, assessmentAnchor: null }).blockers.includes("PSSA_ASSESSMENT_ANCHOR_MISSING"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, eligibleContent: null }).blockers.includes("PSSA_ELIGIBLE_CONTENT_MISSING"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, correctAnswer: null }).blockers.includes("PSSA_SELECTED_CHOICE_CORRECT_ANSWER_MISSING"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, correctIndex: null }).blockers.includes("PSSA_SELECTED_CHOICE_CORRECT_INDEX_MISSING"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, itemType: "TDA", scoringRubricJson: null }).blockers.includes("PSSA_SCORING_RUBRIC_MISSING"));
assert.equal(isPssaItemStudentReady({ ...baseGovernedItem, auditResults: [{ ruleId: "PSSA_DUPLICATE_ITEM_EXACT", result: "FAIL", severity: "BLOCKER" }] }), false);
assert.equal(isPssaItemStudentReady({ ...baseGovernedItem, auditResults: [{ ruleId: "PSSA_PASSAGE_REPEATED_PARAGRAPH", result: "FAIL", severity: "BLOCKER" }] }), false);
assert.ok(canApprovePssaItem({ ...baseGovernedItem, sourceType: "PDE_SAMPLER", sourceName: null }).blockers.includes("PSSA_OFFICIAL_SOURCE_REQUIRES_NAME_AND_CITATION"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, approvedAt: null }).blockers.includes("PSSA_APPROVED_AT_MISSING"));
assert.ok(canApprovePssaItem({ ...baseGovernedItem, reviewedBy: null }).blockers.includes("PSSA_REVIEWED_BY_MISSING"));
assert.equal(isPssaItemStudentReady({ ...baseGovernedItem, auditResults: [] }), false);

const sessionRoute = fs.readFileSync(path.join(process.cwd(), "app/api/student/session/route.ts"), "utf8");
assert.match(sessionRoute, /getStudentReadyPssaItems/);
assert.match(sessionRoute, /No student-ready Pennsylvania PSSA ELA content/);

const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
assert.match(schema, /model PssaItem/);
assert.match(schema, /model AssessmentQuestion/);
assert.doesNotMatch(schema, /DROP TABLE "AssessmentQuestion"/);

console.log("PSSA content audit detector tests passed.");
