import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildItemEcSkillMatchReport,
  buildMcqPassageSpecificityReport,
  buildPssaPassageQualityReport,
  hasBlockingPassageSpecificityFailure,
  hasBlockingPassageQualityFailure,
  singleAnswerChoiceGroups,
  type McqAuditInput,
  type StructuredChoice,
} from "./audit/pssa-audit-detectors";
import { assertPssaItemTypeMockContract } from "./audit/pssa-item-type-contract";
import { assertGrade3EbsrContract } from "./content/author-pssa-grade3-ebsr";
import { assertGrade3TeiContract } from "./content/author-pssa-grade3-tei";
import { assertGrade3MatchingGridDragDropContract } from "./content/author-pssa-grade3-matching-grid-drag-drop";
import { assertGrade3ConventionsContract } from "./content/author-pssa-grade3-conventions";
import { assertGrade3ShortAnswerContract } from "./content/author-pssa-grade3-short-answer";
import {
  PSSA_CONTENT_QUALITY_GATE_IDS,
  buildPlan,
  evaluatePssaItemEcGenreMatch,
  evaluatePssaItemIntraChoiceDuplicate,
  evaluatePssaPassageMultipointEvidenceOverlap,
  evaluatePssaShortAnswerBandsNonempty,
  evaluatePssaVocabKeyConstruct,
} from "./content/lib/pssa-import-plan";
import {
  buildPssaPairedSectionMap,
  computePssaPassageGroupContentHash,
  evaluatePssaPairedGroupStaminaMetadata,
  evaluatePssaPairedMultipointEvidenceOverlap,
  evaluatePssaPairedSectionLookbackBalance,
  evaluatePssaRequiredEvidenceSlots,
  pairedEvidenceKey,
  pssaPassageGroupContentHashInput,
  verifyPssaPassageGroupMemberSnapshots,
  type PairedPassageGroupInput,
} from "./content/lib/pssa-paired-passage-gates";
import { projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import {
  buildPssaDramaLineMap,
  buildPssaStaminaSectionMap,
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaItemFootnoteGiveaway,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaSectionLookbackBalance,
  evaluatePssaStaminaGates,
  evaluatePssaTextFeatureIntegrity,
  evaluatePssaTextFeatureItemLink,
  pssaDramaEvidenceKey,
} from "./content/lib/pssa-stamina-gates";

assertPssaItemTypeMockContract();
assertGrade3EbsrContract();
assertGrade3TeiContract();
assertGrade3MatchingGridDragDropContract();
assertGrade3ConventionsContract();
assertGrade3ShortAnswerContract();

const staminaConventionsFixture = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json", "utf8"));
const staminaConventionItems = staminaConventionsFixture.items as any[];
const expectedStaminaConventions = [
  {
    id: "conv_01",
    ec: "E03.D.1.1.1",
    correctIndex: 1,
    choices: ["quiet", "quietly", "quieter", "quietness"],
  },
  {
    id: "conv_02",
    ec: "E03.D.1.1.2",
    correctIndex: 0,
    choices: ["The children carried three boxes.", "The childs carried three boxs.", "The children carried three boxs.", "The childs carried three boxes."],
  },
  {
    id: "conv_03",
    ec: "E03.D.1.1.5",
    correctIndex: 2,
    choices: ["Yesterday we visited the farm.", "We visit the farm each week.", "Tomorrow we will visit the farm.", "We are visiting the farm right now."],
  },
  {
    id: "conv_04",
    ec: "E03.D.1.1.6",
    correctIndex: 0,
    choices: ["The dogs bark at the mail truck.", "The dogs barks at the mail truck.", "The dog bark at the mail truck.", "The dog barking at the mail truck."],
  },
  {
    id: "conv_05",
    ec: "E03.D.1.1.7",
    correctIndex: 3,
    choices: ["heaviest", "more heavy", "heavy", "heavier"],
  },
  {
    id: "conv_06",
    ec: "E03.D.1.2.1",
    correctIndex: 1,
    choices: ["grandma's summer garden", "Grandma's Summer Garden", "Grandma's summer garden", "Grandma's Summer garden"],
  },
  {
    id: "conv_07",
    ec: "E03.D.1.2.2",
    correctIndex: 2,
    choices: ["Mail the letter to 18 Pine Street Erie, Pennsylvania.", "Mail the letter to 18 Pine Street, Erie Pennsylvania.", "Mail the letter to 18 Pine Street, Erie, Pennsylvania.", "Mail the letter to, 18 Pine Street Erie Pennsylvania."],
  },
  {
    id: "conv_08",
    ec: "E03.D.1.2.3",
    correctIndex: 3,
    choices: ["Maria said, I found my missing shoes.", "Maria said, \"I found my missing shoes.", "\"Maria said,\" I found my missing shoes.", "Maria said, \"I found my missing shoes.\""],
  },
  {
    id: "conv_09",
    ec: "E03.D.1.2.5",
    correctIndex: 0,
    choices: ["The weather was sunny on Friday.", "The weathr was sunny on Friday.", "The weather was suny on Friday.", "The weathr was suny on Friday."],
  },
];
assert.equal(staminaConventionItems.length, 9, "stamina conventions fixture must contain exactly 9 standalone MCQs");
assert.deepEqual(
  staminaConventionItems.map((item) => ({
    id: item.itemId ?? item.id,
    ec: item.eligibleContent,
    correctIndex: item.correctIndex,
    choices: item.answerChoicesJson,
  })),
  expectedStaminaConventions,
  "stamina conventions MCQ text, option order, EC, and correctIndex must match the signed-off block",
);
const staminaConventionAnswerCounts = [0, 0, 0, 0];
for (const item of staminaConventionItems) {
  staminaConventionAnswerCounts[item.correctIndex] += 1;
  assert.equal(item.passageId, null, `${item.itemId} must be standalone`);
  assert.equal(item.interactionType, "MCQ", `${item.itemId} must be MCQ`);
  assert.equal(item.itemType, "MCQ", `${item.itemId} must carry MCQ itemType`);
  assert.equal(item.pointValue, 1, `${item.itemId} must be one point`);
  assert.equal(item.reviewStatus, "PENDING", `${item.itemId} must stay fixture-pending`);
  assert.equal(item.itemStatus, "candidate", `${item.itemId} must stay candidate-only`);
  assert.equal(item.reportingCategory, "D", `${item.itemId} must be reporting category D`);
  assert.equal(item.structuredChoicesJson.length, 4, `${item.itemId} must expose four structured choices`);
  assert.deepEqual(item.structuredChoicesJson.map((choice: any) => choice.text), item.answerChoicesJson, `${item.itemId} structured choices must mirror answerChoicesJson`);
  assert.equal(item.structuredChoicesJson.filter((choice: any) => choice.isCorrect).length, 1, `${item.itemId} must have exactly one correct structured choice`);
  assert.equal(item.structuredChoicesJson[item.correctIndex].isCorrect, true, `${item.itemId} correctIndex must point to the correct choice`);
  for (const [index, choice] of item.structuredChoicesJson.entries()) {
    if (index === item.correctIndex) {
      assert.equal(choice.distractorRole, null, `${item.itemId} correct choice must not carry a distractorRole`);
    } else {
      assert.equal(typeof choice.distractorRole, "string", `${item.itemId} wrong choice ${index} must carry distractorRole`);
      assert.equal(String(choice.rationale ?? "").trim().length > 0, true, `${item.itemId} wrong choice ${index} must carry rationale`);
    }
  }
  for (const [index, choice] of item.choices.entries()) {
    assert.equal(choice.isCorrect, index === item.correctIndex, `${item.itemId} choices[] correctness must mirror correctIndex`);
    if (index === item.correctIndex) {
      assert.equal(choice.distractorRole, null, `${item.itemId} correct choices[] entry must not carry a distractorRole`);
    } else {
      assert.equal(typeof choice.distractorRole, "string", `${item.itemId} wrong choices[] entry ${index} must carry distractorRole`);
      assert.equal(String(choice.rationale ?? "").trim().length > 0, true, `${item.itemId} wrong choices[] entry ${index} must carry rationale`);
    }
  }
}
assert.deepEqual(staminaConventionAnswerCounts, [3, 2, 2, 2], "stamina conventions answer positions must be A=3/B=2/C=2/D=2");
assert.equal(Math.max(...staminaConventionAnswerCounts) / staminaConventionItems.length <= 0.4, true, "standalone conventions block must not be dominated by one answer position");
assert.equal(buildMcqPassageSpecificityReport(staminaConventionItems, []).length, 0, "standalone conventions MCQs must be excluded from passage-specificity concreteness");
for (const itemId of ["conv_06", "conv_07", "conv_08"]) {
  assert.equal(evaluatePssaItemIntraChoiceDuplicate(staminaConventionItems.find((item) => (item.itemId ?? item.id) === itemId)), "PASS", `${itemId} must preserve case/punctuation distinctions in duplicate detection`);
}
for (const itemId of ["conv_01", "conv_02", "conv_03", "conv_04", "conv_05", "conv_09"]) {
  assert.equal(evaluatePssaItemIntraChoiceDuplicate(staminaConventionItems.find((item) => (item.itemId ?? item.id) === itemId)), "PASS", `${itemId} must remain clean under the normal duplicate detector path`);
}
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  interactionType: "MCQ",
  eligibleContent: "E03.A-K.1.1.1",
  answerChoicesJson: ["The Dog ran home.", "The Dog ran home.", "The cat slept.", "The bird sang."],
}), "FAIL", "reading MCQ exact duplicate choices must still fail");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  interactionType: "MCQ",
  eligibleContent: "E03.A-K.1.1.1",
  answerChoicesJson: ["The Dog ran home.", "the dog ran home.", "The cat slept.", "The bird sang."],
}), "FAIL", "reading MCQ case-only duplicate choices must still fail");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  interactionType: "MCQ",
  eligibleContent: "E03.D.1.2.5",
  answerChoicesJson: ["The Weather was sunny.", "The weather was sunny.", "The weathr was sunny.", "The wether was sunny."],
}), "FAIL", "spelling conventions MCQ case-only duplicate choices must still fail");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  interactionType: "MCQ",
  eligibleContent: "E03.D.1.2.1",
  answerChoicesJson: ["The Moon Over Maple Street", "The Moon Over Maple Street", "The moon over Maple Street", "The Moon Over Maple street"],
}), "FAIL", "raw-mode capitalization MCQ byte-identical duplicate choices must still fail");

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
  id: "distractor-synthesis-does-not-skip",
  answerChoicesJson: [
    "Beavers reshape streams by building dams that help water, soil, and wildlife.",
    "The quiet library display helped visitors compare several drawings.",
    "Branches and mud matter because they help beavers block stream flow.",
    "Soil settles because beaver ponds hold water in place.",
  ],
  structuredChoicesJson: (readingItem() as any).structuredChoicesJson.map((choice: any, index: number) => index === 1
    ? { ...choice, text: "The quiet library display helped visitors compare several drawings.", evidenceLinks: [{ evidenceKind: "paragraph_synthesis", sectionId: "paragraph_02" }] }
    : choice),
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "FAIL"), true, "synthesis skip must be driven by correct-choice evidence only");

const literalDetailFailureRows = buildMcqPassageSpecificityReport([readingItem({
  id: "literal-detail-generic-choices",
  answerChoicesJson: [
    "The quiet library display helped visitors compare several drawings.",
    "The bright kitchen timer helped cooks plan several lunches.",
    "The small garden marker helped neighbors label several flowers.",
    "The local music poster helped families choose several concerts.",
  ],
  structuredChoicesJson: null,
  comprehensionKind: "literal_detail",
})], [passage]);
assert.deepEqual(
  literalDetailFailureRows
    .filter((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.severity, row.evidence, row.notes]),
  [["FAIL", "BLOCKER", "concreteChoices=0/4", "Each choice needs at least two passage-specific content words, and at least three choices need concrete passage details."]],
  "literal-detail generic-choice MCQs must still fail the byte-identical concreteness rule",
);

const inferenceWithoutRationaleRows = buildMcqPassageSpecificityReport([readingItem({
  id: "inference-without-rationale",
  answerChoicesJson: [
    "The quiet library display helped visitors compare several drawings.",
    "The bright kitchen timer helped cooks plan several lunches.",
    "The small garden marker helped neighbors label several flowers.",
    "The local music poster helped families choose several concerts.",
  ],
  structuredChoicesJson: null,
  comprehensionKind: "inference",
  comprehensionKindRationale: " ",
})], [passage]);
assert.equal(
  inferenceWithoutRationaleRows.some((row) => row.ruleId === "PSSA_MCQ_COMPREHENSION_KIND_RATIONALE_REQUIRED" && row.result === "FAIL" && row.severity === "BLOCKER"),
  true,
  "inference/interpretation labels cannot skip without a non-empty rationale",
);
assert.equal(
  inferenceWithoutRationaleRows.some((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "SKIP"),
  false,
  "missing rationale must prevent the inference/interpretation skip",
);

const mislabeledInferenceRows = buildMcqPassageSpecificityReport([readingItem({
  id: "literal-mislabeled-inference-visible",
  answerChoicesJson: [
    "The quiet library display helped visitors compare several drawings.",
    "The bright kitchen timer helped cooks plan several lunches.",
    "The small garden marker helped neighbors label several flowers.",
    "The local music poster helped families choose several concerts.",
  ],
  structuredChoicesJson: null,
  comprehensionKind: "inference",
  comprehensionKindRationale: "Reviewer claims this is inferential; visible skip row makes that judgment auditable.",
})], [passage]);
assert.deepEqual(
  mislabeledInferenceRows
    .filter((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "SKIP_INFERENCE_INTERPRETATION:inference"]],
  "mislabeled inference items with rationale must be visibly skipped rather than silently clean",
);
assert.equal(
  mislabeledInferenceRows.some((row) => row.ruleId === "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED" && row.result === "FAIL"),
  true,
  "the visible inference skip must not bypass the other MCQ evidence blockers",
);

assert.equal(buildMcqPassageSpecificityReport([readingItem({
  id: "synthesis-label-does-not-skip",
  answerChoicesJson: [
    "The quiet library display helped visitors compare several drawings.",
    "The bright kitchen timer helped cooks plan several lunches.",
    "The small garden marker helped neighbors label several flowers.",
    "The local music poster helped families choose several concerts.",
  ],
  structuredChoicesJson: null,
  comprehensionKind: "synthesis",
  comprehensionKindRationale: "This label alone must not control the concreteness skip.",
})], [passage]).some((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "FAIL"), true, "synthesis labels without synthesis evidence must run the normal concreteness gate");

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

const ecCatalog = {
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 3 reading and content.",
  "E03.A-V.4.1.2": "Demonstrate understanding of word relationships and nuances in word meanings.",
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a text, referring explicitly to the text as the basis for the answers.",
  "E03.A-K.1.1.2": "Recount stories, including fables, folktales, and myths; determine the central message, lesson, or moral.",
  "E03.A-K.1.1.3": "Describe characters in a story and explain how their actions contribute to the sequence of events.",
  "E03.A-C.2.1.1": "Explain the point of view from which a story is narrated, including the difference between first- and third-person narrations.",
};

function vocabItem(overrides: Partial<McqAuditInput> = {}): McqAuditInput {
  const structuredChoicesJson: StructuredChoice[] = [
    {
      text: "weak and hard to see",
      isCorrect: true,
      rationale: "The context says the glow faded, so faint means weak.",
      evidenceLinks: [link(1, 0, "It holds water in place, lets the soil settle, and releases the water slowly over days or weeks.")],
      distractorRole: null,
    },
    {
      text: "bright and flashing",
      isCorrect: false,
      rationale: "This is the opposite of faint in context.",
      evidenceLinks: [link(0, 0, "Beavers are often called ecosystem engineers.")],
      distractorRole: "opposite_claim",
    },
    {
      text: "muddy and heavy",
      isCorrect: false,
      rationale: "This misreads the surrounding water details.",
      evidenceLinks: [link(0, 1, "Using branches, mud, and stones, a beaver blocks the flow of a stream until the water backs up and forms a pond.")],
      distractorRole: "plausible_misreading",
    },
    {
      text: "calm and steady",
      isCorrect: false,
      rationale: "This is a real detail but not the word meaning.",
      evidenceLinks: [link(2, 0, "Frogs, fish, insects, and birds gather where the water is calm and steady.")],
      distractorRole: "wrong_section",
    },
  ];
  return {
    id: "vocab-pass",
    itemType: "MCQ",
    passageId: "p1",
    reportingCategory: "A",
    gradeLevel: 3,
    eligibleContent: "E03.A-V.4.1.1",
    studentFacingPrompt: "What does place mean as it is used in the passage?",
    correctIndex: 0,
    answerChoicesJson: structuredChoicesJson.map((choice) => choice.text),
    structuredChoicesJson,
    ...overrides,
  };
}

assert.equal(buildItemEcSkillMatchReport([vocabItem()], [passage], ecCatalog)[0].skillMatchResult, "PASS");
assert.equal(buildItemEcSkillMatchReport([vocabItem({
  id: "vocab-inference-fail",
  studentFacingPrompt: "What does Maya's Friday visit show about what she learned?",
})], [passage], ecCatalog)[0].skillMatchResult, "FAIL");
assert.equal(buildItemEcSkillMatchReport([vocabItem({
  id: "vocab-main-idea-fail",
  studentFacingPrompt: "What is the main reason people spent longer near the bench?",
})], [passage], ecCatalog)[0].skillMatchResult, "FAIL");
assert.equal(buildItemEcSkillMatchReport([vocabItem({
  id: "vocab-no-target-fail",
  studentFacingPrompt: "Which evidence best supports the class plan?",
})], [passage], ecCatalog)[0].skillMatchResult, "FAIL");
assert.equal(buildItemEcSkillMatchReport([vocabItem({
  id: "vocab-evidence-missing-target-fail",
  studentFacingPrompt: "What does place mean as it is used in the passage?",
  structuredChoicesJson: (vocabItem() as any).structuredChoicesJson.map((choice: any, index: number) => index === 0
    ? { ...choice, evidenceLinks: [link(0, 0, "Beavers are often called ecosystem engineers.")] }
    : choice),
})], [passage], ecCatalog)[0].skillMatchResult, "FAIL");
assert.equal(buildItemEcSkillMatchReport([readingItem({
  id: "key-ideas-pass",
  gradeLevel: 3,
  eligibleContent: "E03.A-K.1.1.1",
  reportingCategory: "A",
})], [passage], ecCatalog)[0].skillMatchResult, "PASS");
assert.equal(buildItemEcSkillMatchReport([readingItem({
  id: "craft-recall-fail",
  gradeLevel: 3,
  eligibleContent: "E03.A-C.2.1.1",
  reportingCategory: "A",
  studentFacingPrompt: "What color were the rail lines on the old map?",
})], [passage], ecCatalog)[0].skillMatchResult, "FAIL");
assert.equal(buildItemEcSkillMatchReport([vocabItem({
  id: "vocab-ambiguous-warn",
  studentFacingPrompt: "What does the narrator mean by \"ecosystem engineers\"?",
  structuredChoicesJson: (vocabItem() as any).structuredChoicesJson.map((choice: any, index: number) => index === 0
    ? { ...choice, text: "animals that reshape land and water", evidenceLinks: [link(0, 0, "Beavers are often called ecosystem engineers.")] }
    : choice),
  answerChoicesJson: [
    "animals that reshape land and water",
    "people who build apartment houses",
    "machines that remove river mud",
    "birds that gather by ponds",
  ],
})], [passage], ecCatalog)[0].skillMatchResult, "WARN");

assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  itemType: "EBSR",
  interactionType: "EBSR",
  partA: { choices: [{ text: "same answer" }, { text: "same answer" }, { text: "other" }, { text: "another" }] },
  partB: { choices: [{ text: "one" }, { text: "two" }, { text: "three" }, { text: "four" }] },
}), "FAIL", "duplicate EBSR Part A choices must fail");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  itemType: "INLINE_DROPDOWN",
  interactionType: "INLINE_DROPDOWN",
  blanks: [{ options: [{ text: "May" }, { text: "may" }] }],
}), "PASS", "inline dropdown raw case-only options must remain allowed");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  itemType: "DRAG_DROP",
  interactionType: "DRAG_DROP",
  tokens: [{ text: "same" }, { text: "same" }],
}), "PASS", "drag-drop token pools are exempt from intra-choice duplicate gate");
assert.equal(evaluatePssaItemIntraChoiceDuplicate({
  itemType: "HOT_TEXT",
  interactionType: "HOT_TEXT",
  selectableSpans: [{ text: "same" }, { text: "same" }],
}), "PASS", "hot-text token-kind spans are exempt from intra-choice duplicate gate");

assert.equal(evaluatePssaVocabKeyConstruct(vocabItem({
  id: "vocab-circular",
  studentFacingPrompt: "What does faint mean as it is used in the passage?",
  answerChoicesJson: ["bright", "a faint stripe", "muddy", "quick"],
  correctIndex: 1,
}), { ...passage, text: `${passage.text}\n\nThe glow had faded to a faint stripe.` }), "FAIL", "vocab key cannot repeat the tested word");
assert.equal(evaluatePssaVocabKeyConstruct(vocabItem({
  id: "vocab-source-paraphrase",
  studentFacingPrompt: "What does traced mean as it is used in the passage?",
  answerChoicesJson: ["painted", "held", "looked", "kids followed the bus route in the air"],
  correctIndex: 3,
}), { ...passage, text: `${passage.text}\n\nTwo kids traced the bus route in the air.` }), "FAIL", "vocab key cannot near-paraphrase the source sentence");
assert.equal(evaluatePssaVocabKeyConstruct(vocabItem({
  id: "vocab-definition",
  studentFacingPrompt: "What does faint mean as it is used in the passage?",
  answerChoicesJson: ["bright", "muddy", "quick", "dim and pale"],
  correctIndex: 3,
}), { ...passage, text: `${passage.text}\n\nThe glow had faded to a faint stripe.` }), "PASS", "clean short definitions must not false-fail");

const shortAnswerBands = {
  interactionType: "SHORT_ANSWER",
  scoreBandExamples: [3, 2, 1, 0].map((band) => ({ band, response: `response for band ${band}`, why: `why band ${band}` })),
};
assert.equal(evaluatePssaShortAnswerBandsNonempty(shortAnswerBands), "PASS");
assert.equal(evaluatePssaShortAnswerBandsNonempty({ ...shortAnswerBands, scoreBandExamples: shortAnswerBands.scoreBandExamples.filter((row) => row.band !== 0) }), "FAIL");

assert.equal(evaluatePssaItemEcGenreMatch({ ...readingItem(), eligibleContent: "E03.A-K.1.1.1" }, { ...passage, passageType: "informational" } as any), "FAIL");
assert.equal(evaluatePssaItemEcGenreMatch({ ...readingItem(), eligibleContent: "E03.B-K.1.1.1" }, { ...passage, passageType: "informational" } as any), "PASS");

const overlapPassage = {
  id: "overlap",
  passageType: "informational",
  text: "First sentence shows one detail. Second sentence shows another detail. Third sentence shows a final detail.",
};
const overlapItems = [
  {
    itemId: "ebsr-overlap",
    interactionType: "EBSR",
    passageId: "overlap",
    partB: { correctIndices: [0, 1], choices: [{ quotedSpan: "First sentence shows one detail." }, { quotedSpan: "Second sentence shows another detail." }] },
  },
  {
    itemId: "ht-overlap",
    interactionType: "HOT_TEXT",
    passageId: "overlap",
    correctSpanIds: ["a", "b"],
    selectableSpans: [
      { spanId: "a", text: "First sentence shows one detail.", paragraphIndex: 0, sentenceIndex: 0 },
      { spanId: "b", text: "Second sentence shows another detail.", paragraphIndex: 0, sentenceIndex: 1 },
    ],
  },
];
assert.equal(evaluatePssaPassageMultipointEvidenceOverlap(overlapItems, [overlapPassage])["ebsr-overlap"], "FAIL");
const mismatchedHotTextIndex = structuredClone(overlapItems);
(mismatchedHotTextIndex[1] as any).selectableSpans = [
  { spanId: "a", text: "First sentence shows one detail.", paragraphIndex: 9, sentenceIndex: 9 },
  { spanId: "b", text: "Second sentence shows another detail.", paragraphIndex: 8, sentenceIndex: 8 },
];
assert.equal(
  evaluatePssaPassageMultipointEvidenceOverlap(mismatchedHotTextIndex, [overlapPassage])["ht-overlap"],
  "FAIL",
  "hot-text overlap must resolve through canonical sentence text, not authored paragraph/sentence indexes",
);
const compliantOverlap = structuredClone(overlapItems);
compliantOverlap[1].selectableSpans[1].sentenceIndex = 2;
compliantOverlap[1].selectableSpans[1].text = "Third sentence shows a final detail.";
assert.equal(evaluatePssaPassageMultipointEvidenceOverlap(compliantOverlap, [overlapPassage])["ebsr-overlap"], "PASS");

const duplicateOpeningPassages = [
  {
    id: "dup-a",
    title: "Creek Check",
    gradeLevel: 3,
    topicDomain: "science/nature",
    text: "The students began with a careful question about water testing after rain. They measured water near the creek and recorded mud, leaves, and puddles.",
  },
  {
    id: "dup-b",
    title: "Map Check",
    gradeLevel: 3,
    topicDomain: "history/social studies",
    text: "The students began with a careful question about water testing after rain. They studied an old map near the station and recorded dates, labels, and routes.",
  },
];
assert.equal(buildPssaPassageQualityReport(duplicateOpeningPassages)
  .some((row) => row.ruleId === "PSSA_PASSAGE_CROSS_DUPLICATE" && row.result === "FAIL"), true);

const skeletonPassages = Array.from({ length: 5 }, (_, index) => ({
  id: `skel-${index}`,
  title: `Topic ${index}`,
  gradeLevel: 3,
  topicDomain: "school/community",
  text: `The research team began with a question about topic ${index}. Their teacher asked them to collect details another group could check. The final proposal explained evidence and described two changes that could be tested.`,
}));
assert.equal(buildPssaPassageQualityReport(skeletonPassages)
  .filter((row) => row.ruleId === "PSSA_PASSAGE_TEMPLATE_SKELETON" && row.result === "FAIL").length, 5);

const incoherentWater = {
  id: "water-incoherent",
  title: "Creek Watchers",
  gradeLevel: 3,
  topicDomain: "science/nature",
  text: "The team asked how students could test stream water after heavy rain. The team interviewed people who used the space often. A design on paper may not match how people move, wait, or work. Their proposal made a plan stronger.",
};
assert.equal(buildPssaPassageQualityReport([incoherentWater])
  .some((row) => row.ruleId === "PSSA_PASSAGE_TOPIC_COHERENCE" && row.severity === "WARNING"), true);

const abstractProcess = {
  id: "abstract-process",
  title: "A Better Plan",
  gradeLevel: 4,
  topicDomain: "school/community",
  text: "The research team asked a question and collected details. The group organized evidence, discussed a proposal, revised the plan, and made the idea stronger. The final reflection separated a recommendation from an opinion.",
};
assert.equal(buildPssaPassageQualityReport([abstractProcess])
  .some((row) => row.ruleId === "PSSA_PASSAGE_CONCRETENESS" && row.result === "FAIL"), true);

const beaverPassage = {
  id: "beaver",
  title: "The Animal That Builds Its Own Wetland",
  gradeLevel: 6,
  topicDomain: "science/nature",
  text: "For most of the last century, beavers were rare across much of North America. Trappers had hunted them for their thick fur until, in some regions, almost none were left. Rivers that had once spread into marshes and ponds began to run straight and fast. Few people noticed that something important had disappeared along with the beavers.\n\nBeavers are often called \"ecosystem engineers,\" a term scientists use for animals that reshape the land around them. A beaver does this by building dams. Using branches, mud, and stones, it blocks the flow of a stream until the water backs up and forms a pond. The pond is not just a home for the beaver. It slows the movement of water across the whole landscape.\n\nThat slowing matters more than it might seem. When rain falls fast, water rushes downhill, carrying away soil and sometimes causing floods farther downstream. A beaver pond acts like a brake. It holds water in place, lets the soil settle, and releases the water slowly over days or weeks. During a dry summer, land near a beaver pond often stays green while nearby areas turn brown.\n\nThe ponds help other living things, too. Frogs, fish, insects, and birds gather where the water is calm and steady. Plants that need wet ground take root along the edges. In places where beavers have returned, scientists have counted far more kinds of animals than in similar streams without them. A single beaver pond can become like a crowded apartment building for wildlife.\n\nToday, some communities are inviting beavers back on purpose. Instead of removing the animals or their dams, they protect them, and in a few cases they even build simple \"starter dams\" to encourage beavers to settle. It is an unusual kind of repair: rather than sending in machines and workers, people step back and let an animal do the building. The beaver, it turns out, may be one of the most skilled water engineers of all—and it works for free.",
};
const beaverRows = buildPssaPassageQualityReport([beaverPassage]);
assert.equal(hasBlockingPassageQualityFailure(beaverRows), false);
assert.equal(beaverRows.some((row) => row.severity === "WARNING"), false);

const staminaFixture = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json", "utf8"));
const syrupPassage = staminaFixture.passages[0];
const syrupItems = staminaFixture.items;
const syrupSpecificityRows = buildMcqPassageSpecificityReport(syrupItems, [syrupPassage]);
const syrupSpecificityFailures = syrupSpecificityRows.filter((row) => row.result === "FAIL");
assert.deepEqual(
  syrupSpecificityFailures.map((row) => [row.itemId, row.ruleId, row.evidence]),
  [],
  "syrup fixture must pass existing MCQ specificity detectors after the syrup_04 choice-B wording fix",
);
assert.deepEqual(
  syrupSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_syrup_02" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "vocabulary-in-context item"]],
  "vocabulary-in-context MCQs must skip comprehension choice-specificity instead of using a relaxed threshold",
);
assert.equal(
  buildMcqCorrectIsLongestReport(syrupItems).some((row) => row.itemId === "pssa_stamina_item_g3_syrup_02" && row.result === "FAIL"),
  false,
  "passage-anchored scorch key must remain the shortest choice and not trip correct-is-longest",
);
const syrupVocabItem = syrupItems.find((item: any) => item.id === "pssa_stamina_item_g3_syrup_02");
assert.equal(evaluatePssaItemFootnoteGiveaway(syrupVocabItem, syrupPassage), "PASS", "scorch is not a footnoted giveaway");
const syrupMainIdeaCorrectLinks = syrupItems
  .find((item: any) => item.id === "pssa_stamina_item_g3_syrup_01")
  .structuredChoicesJson.find((choice: any) => choice.isCorrect).evidenceLinks;
assert.equal(
  syrupMainIdeaCorrectLinks.every((link: any) => link.evidenceKind === "section_synthesis" && link.sectionId && !("quotedSpan" in link) && !("paragraphIndex" in link) && !("sentenceIndex" in link) && !("startChar" in link) && !("endChar" in link)),
  true,
  "main-idea synthesis evidence must use section IDs only, with no fabricated offsets",
);
assert.equal(
  buildItemEcSkillMatchReport(syrupItems, [syrupPassage], ecCatalog).some((row) => row.skillMatchResult === "FAIL"),
  false,
  "stamina syrup fixture must pass existing EC skill-match detector",
);
assert.deepEqual(
  buildPssaStaminaSectionMap(syrupPassage).map((section) => section.sectionId),
  [
    "section_0_intro",
    "waiting_for_the_right_weather",
    "tapping_the_trees",
    "boiling_it_down",
    "from_tree_to_table",
    "section_sidebar",
    "section_footnotes",
  ],
  "stamina syrup fixture section map must be canonical and auditable",
);
const syrupStaminaRows = evaluatePssaStaminaGates(syrupPassage, syrupItems);
assert.equal(
  syrupStaminaRows.every((row) => row.status === "PASS"),
  true,
  `stamina syrup fixture must pass all six stamina gates: ${JSON.stringify(syrupStaminaRows.filter((row) => row.status === "FAIL"))}`,
);

const boatFixture = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json", "utf8"));
const boatPassage = boatFixture.passages[0];
const boatItems = boatFixture.items;
const boatSectionIds = buildPssaStaminaSectionMap(boatPassage).map((section) => section.sectionId);
assert.equal(boatSectionIds.length, 19, "literary released-length passages must use paragraph-based section maps");
assert.deepEqual([boatSectionIds[0], boatSectionIds.at(-1)], ["paragraph_01", "paragraph_19"]);
const boatSpecificityRows = buildMcqPassageSpecificityReport(boatItems, [boatPassage]);
assert.deepEqual(
  boatSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_boat_01" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "synthesis evidence item"]],
  "literary theme synthesis MCQs must skip choice-concreteness by explicit correct-choice paragraph_synthesis evidence",
);
assert.deepEqual(
  boatSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_boat_05" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["PASS", "all passage-specificity gates clear"]],
  "boat_05 literal-detail revision must run and pass choice-concreteness instead of using the #47 skip",
);
assert.deepEqual(
  boatSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_boat_04" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "vocabulary-in-context item"]],
  "V-family figurative-language MCQs must remain scoped to vocab gates",
);
assert.deepEqual(boatSpecificityRows.filter((row) => row.result === "FAIL"), [], "boat literary fixture must pass existing MCQ specificity detectors");
assert.equal(
  buildItemEcSkillMatchReport(boatItems, [boatPassage], ecCatalog).some((row) => row.skillMatchResult === "FAIL"),
  false,
  "boat literary fixture must pass EC skill-match detector",
);
const boatStaminaRows = evaluatePssaStaminaGates(boatPassage, boatItems);
assert.equal(boatStaminaRows.find((row) => row.gateId === "PSSA_DOMAIN_FACT_CHECK_REQUIRED")?.status, "SKIP", "literary fiction must not require fact-check notes unless explicitly flagged");
assert.equal(boatStaminaRows.find((row) => row.gateId === "PSSA_TEXT_FEATURE_INTEGRITY")?.status, "PASS", "literary feature metadata must be validated by literary feature rules");
assert.equal(boatStaminaRows.find((row) => row.gateId === "PSSA_TEXT_FEATURE_ITEM_LINK")?.status, "SKIP", "literary text features do not require item linkage unless mustUseInItem is true");
assert.equal(boatStaminaRows.find((row) => row.gateId === "PSSA_PASSAGE_STAMINA_METADATA")?.status, "PASS", "literary released-length passages require genre, pov, word count, band, and feature metadata");
assert.equal(boatStaminaRows.find((row) => row.gateId === "PSSA_SECTION_LOOKBACK_BALANCE")?.status, "PASS", "literary lookback balance must use multiple paragraph groups");
assert.deepEqual(boatStaminaRows.filter((row) => row.status === "FAIL"), [], `boat literary fixture must not fail stamina gates: ${JSON.stringify(boatStaminaRows)}`);

const owlFixture = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json", "utf8"));
const owlGroup = owlFixture.passageGroups[0] as PairedPassageGroupInput;
const owlItems = owlFixture.items;
assert.equal(owlGroup.members.length, 2, "owl fixture must encode two real member passages");
assert.deepEqual(owlGroup.members.map((member) => [member.slot, member.passageId]), [
  ["passage_1", "pssa_stamina_psg_g3_owls_p1_night"],
  ["passage_2", "pssa_stamina_psg_g3_owls_p2_barn"],
]);
assert.equal(owlItems.every((item: any) => item.passageGroupId === owlGroup.id), true, "all owl items must carry passageGroupId");
assert.deepEqual(
  owlItems.find((item: any) => item.id === "pssa_stamina_item_g3_owls_05").passageLinks.map((link: any) => [link.passageId, link.role]),
  [["pssa_stamina_psg_g3_owls_p1_night", "primary"], ["pssa_stamina_psg_g3_owls_p2_barn", "primary"]],
  "cross-text MCQ must link both member passages as co-equal primary links without a new enum value",
);
assert.deepEqual(
  owlItems.find((item: any) => item.id === "pssa_stamina_item_g3_owls_06").passageLinks.map((link: any) => [link.passageId, link.role]),
  [["pssa_stamina_psg_g3_owls_p1_night", "primary"], ["pssa_stamina_psg_g3_owls_p2_barn", "primary"]],
  "cross-text SA must link both member passages as co-equal primary links",
);
assert.equal(evaluatePssaPairedGroupStaminaMetadata(owlGroup), "PASS", "paired_informational stamina metadata must evaluate at the group level");
assert.equal(evaluatePssaPassageStaminaMetadata(owlGroup.members[0].passage as any), "SKIP", "a paired member passage must not fail released-length metadata on its own");
assert.equal(owlGroup.members.every((member) => Array.isArray(member.passage.factCheckNotesJson) && member.passage.factCheckNotesJson.length >= 4), true, "both owl member passages must carry structured fact-check notes");
assert.equal(owlGroup.members.every((member) => (member.passage.factCheckNotesJson as any[]).every((note) => new URL(note.sourceUrl).protocol === "https:")), true, "owl fact-check source URLs must be full parseable https URLs");
assert.equal(computePssaPassageGroupContentHash(owlGroup), owlGroup.contentHash, "fixture group contentHash must match the derived group hash");
assert.equal(
  computePssaPassageGroupContentHash({ ...owlGroup, title: "Renamed Internal Admin Title" }),
  owlGroup.contentHash,
  "group contentHash must exclude title",
);
assert.equal(
  JSON.stringify(pssaPassageGroupContentHashInput(owlGroup)).includes("passageContentHashSnapshot"),
  true,
  "group contentHash input must include persisted passageContentHashSnapshot values",
);
assert.equal(verifyPssaPassageGroupMemberSnapshots(owlGroup).ok, true, "member live hashes must match persisted group snapshots");
assert.deepEqual(
  verifyPssaPassageGroupMemberSnapshots({
    ...owlGroup,
    members: owlGroup.members.map((member, index) => index === 0 ? { ...member, passage: { ...member.passage, contentHash: "sha256:changed-live-member" } } : member),
  }),
  { ok: false, detail: "group stale — recompose: passage_1" },
  "member drift must fail closed instead of silently changing group identity",
);
const owlSectionIds = buildPssaPairedSectionMap(owlGroup).map((section) => section.sectionId);
assert.deepEqual(owlSectionIds.slice(0, 4), ["passage_1.paragraph_01", "passage_1.paragraph_02", "passage_1.paragraph_03", "passage_1.paragraph_04"]);
assert.deepEqual(owlSectionIds.slice(-4), ["passage_2.paragraph_01", "passage_2.paragraph_02", "passage_2.paragraph_03", "passage_2.paragraph_04"]);
assert.equal(
  evaluatePssaPairedSectionLookbackBalance(owlGroup, owlItems).every((row) => row.status === "PASS"),
  true,
  "paired lookback must pass when cross-text evidence covers passage_1 and passage_2",
);
const crossMcq = owlItems.find((item: any) => item.id === "pssa_stamina_item_g3_owls_05");
const crossSa = owlItems.find((item: any) => item.id === "pssa_stamina_item_g3_owls_06");
assert.equal(evaluatePssaRequiredEvidenceSlots(crossMcq, owlGroup), "PASS", "cross-text MCQ slot coverage must come from correct-choice evidence");
assert.equal(evaluatePssaRequiredEvidenceSlots(crossSa, owlGroup), "PASS", "cross-text SA slot coverage must come from rubric/acceptable-support metadata, not a correct choice");
assert.equal(
  evaluatePssaRequiredEvidenceSlots({
    ...crossMcq,
    structuredChoicesJson: crossMcq.structuredChoicesJson.map((choice: any) => choice.isCorrect
      ? { ...choice, evidenceLinks: choice.evidenceLinks.filter((link: any) => link.passageSlot === "passage_1") }
      : choice),
  }, owlGroup),
  "FAIL",
  "cross-text item missing a required evidence slot must fail closed",
);
assert.equal(
  evaluatePssaRequiredEvidenceSlots({
    ...crossMcq,
    structuredChoicesJson: crossMcq.structuredChoicesJson.map((choice: any) => choice.isCorrect
      ? { ...choice, evidenceLinks: [{ evidenceKind: "whole_passage_synthesis", passageSlot: "passage_3", passageId: "unknown" }] }
      : choice),
  }, owlGroup),
  "FAIL",
  "unknown passageSlot must fail closed",
);
assert.equal(pairedEvidenceKey({ passageSlot: "passage_1", paragraphIndex: 0, sentenceIndex: 2 }), "passage_1:0:2");
assert.equal(pairedEvidenceKey({ passageSlot: "passage_2", paragraphIndex: 0, sentenceIndex: 2 }), "passage_2:0:2");
assert.deepEqual(
  evaluatePssaPairedMultipointEvidenceOverlap([
    { id: "p1-ms", interactionType: "MULTI_SELECT", acceptableSupportEvidenceLinks: [{ passageSlot: "passage_1", paragraphIndex: 0, sentenceIndex: 2 }, { passageSlot: "passage_1", paragraphIndex: 1, sentenceIndex: 1 }] },
    { id: "p2-ms", interactionType: "MULTI_SELECT", acceptableSupportEvidenceLinks: [{ passageSlot: "passage_2", paragraphIndex: 0, sentenceIndex: 2 }, { passageSlot: "passage_2", paragraphIndex: 1, sentenceIndex: 1 }] },
  ]),
  { "p1-ms": "PASS", "p2-ms": "PASS" },
  "paired overlap keys must not collide across passage_1 and passage_2 sentence IDs",
);
assert.deepEqual(
  evaluatePssaPairedMultipointEvidenceOverlap([
    { id: "a-ms", interactionType: "MULTI_SELECT", acceptableSupportEvidenceLinks: [{ passageSlot: "passage_1", paragraphIndex: 0, sentenceIndex: 2 }, { passageSlot: "passage_1", paragraphIndex: 1, sentenceIndex: 1 }] },
    { id: "b-ms", interactionType: "MULTI_SELECT", acceptableSupportEvidenceLinks: [{ passageSlot: "passage_1", paragraphIndex: 0, sentenceIndex: 2 }, { passageSlot: "passage_1", paragraphIndex: 1, sentenceIndex: 1 }] },
  ]),
  { "a-ms": "FAIL", "b-ms": "FAIL" },
  "paired overlap gate must still fail true same-passage multipoint evidence reuse",
);

const footnotedPassage = {
  id: "footnote-def",
  text: "A spile¹ carries sap.\n\n¹ **spile** — a small spout",
  wordCount: 6,
  textFeaturesJson: [
    { type: "footnote", term: "spile", marker: "¹", bodyText: "¹ **spile** — a small spout", sectionId: "section_footnotes" },
  ],
};
assert.equal(evaluatePssaItemFootnoteGiveaway({
  id: "footnote-vocab",
  eligibleContent: "E03.B-V.4.1.1",
  studentFacingPrompt: "What does spile mean?",
  targetWordOrPhrase: "spile",
}, footnotedPassage), "FAIL", "vocab items cannot test visible footnote definitions");
assert.equal(evaluatePssaItemFootnoteGiveaway({
  id: "footnote-application",
  eligibleContent: "E03.B-V.4.1.1",
  studentFacingPrompt: "Which detail shows how a spile is used?",
  targetWordOrPhrase: "spile",
  testsApplicationNotDefinition: true,
}, footnotedPassage), "PASS", "application vocab items can use a footnoted term only when explicitly flagged");
assert.equal(evaluatePssaItemFootnoteGiveaway({
  id: "footnote-missing-target",
  eligibleContent: "E03.B-V.4.1.1",
  studentFacingPrompt: "What does the word mean?",
}, footnotedPassage), "FAIL", "footnoted-passage vocab items fail closed without targetWordOrPhrase");

assert.equal(evaluatePssaDomainFactCheckRequired({ id: "foundation-no-facts", text: "Short foundation text." }), "SKIP");
assert.equal(evaluatePssaDomainFactCheckRequired({
  id: "literary-explicit-fact-check",
  text: "A fictional character says a real bridge was built in 1901.",
  genre: "literary_narrative",
  factCheckRequired: true,
  factCheckNotesJson: null,
}), "FAIL", "explicit factCheckRequired must override literary default skip");
assert.equal(evaluatePssaDomainFactCheckRequired({
  ...syrupPassage,
  factCheckNotesJson: [{ claimId: "bad", claim: "Sap claim", sourceTitle: "Common knowledge", organization: "Someone", sourceUrl: "example.com/...", claimSupported: true, dateAccessed: "2026-06-09" }],
}), "FAIL", "stamina fact notes require full https source URLs and structured source metadata");

assert.equal(evaluatePssaTextFeatureIntegrity({
  id: "bad-feature",
  text: "### Empty Heading\n\n¹ **word** — not enough",
  textFeaturesJson: [
    { type: "heading", label: "Empty Heading", sectionId: "empty_heading", bodyText: "### Empty Heading" },
    { type: "footnote", term: "absent", marker: "¹", bodyText: "¹ **word** — not enough", sectionId: "section_footnotes" },
  ],
}), "FAIL", "meaningless headings and non-defining footnotes must fail text-feature integrity");
assert.equal(evaluatePssaTextFeatureIntegrity({
  id: "bad-literary-feature",
  text: "June smiled. The boat floated.",
  genre: "literary_narrative",
  staminaBand: "released_length",
  textFeaturesJson: [{ type: "figurative_language", featureText: "absent comparison" }],
}), "FAIL", "literary featureText must be non-empty and exact in the passage");
assert.equal(evaluatePssaTextFeatureItemLink({
  id: "unlinked-sidebar",
  text: "Body text.\n\n> **Did You Know?** Extra fact.",
  textFeaturesJson: [{ type: "sidebar", label: "Did You Know?", sectionId: "section_sidebar", bodyText: "> **Did You Know?** Extra fact." }],
}, []), "FAIL", "non-decorative text features require at least one linked item");
assert.equal(evaluatePssaTextFeatureItemLink({
  id: "literary-required-link",
  text: "June smiled. The boat floated.",
  genre: "literary_narrative",
  textFeaturesJson: [{ type: "figurative_language", featureText: "The boat floated.", mustUseInItem: true, sectionId: "paragraph_01" }],
}, []), "FAIL", "literary features require item linkage only when mustUseInItem is true");
assert.equal(evaluatePssaTextFeatureItemLink({
  id: "literary-required-link-ok",
  text: "June smiled.\n\nThe boat floated.",
  genre: "literary_narrative",
  textFeaturesJson: [{ type: "figurative_language", featureText: "The boat floated.", mustUseInItem: true, sectionId: "paragraph_02" }],
}, [{
  id: "linked-literary-item",
  passageId: "literary-required-link-ok",
  structuredChoicesJson: [{ text: "The boat floated.", evidenceLinks: [{ evidenceKind: "paragraph_synthesis", sectionId: "paragraph_02" }] }],
}]), "PASS", "mustUseInItem literary features may be satisfied by paragraph evidence links");

assert.equal(evaluatePssaPassageStaminaMetadata({
  id: "stamina-missing-metadata",
  text: "Longer text without required metadata.",
  staminaBand: "released_length",
}), "FAIL", "released_length passages require stamina metadata");
assert.equal(evaluatePssaPassageStaminaMetadata({
  id: "literary-missing-pov",
  text: "June smiled at the boat.",
  staminaBand: "released_length",
  genre: "literary_narrative",
  wordCount: 5,
  textFeaturesJson: [{ type: "dialogue", featureText: "June smiled" }],
}), "FAIL", "literary released-length metadata must include pov");
assert.equal(evaluatePssaPassageStaminaMetadata({
  id: "foundation-null-metadata",
  text: "Short foundation passage without stamina metadata.",
  staminaBand: null,
}), "SKIP", "foundation/null passages must not fail stamina metadata checks");
assert.equal(evaluatePssaSectionLookbackBalance({
  ...syrupPassage,
  id: "one-section",
}, [{
  id: "one-section-item",
  passageId: "one-section",
  structuredChoicesJson: [{
    text: "same section",
    evidenceLinks: [{ sectionId: "waiting_for_the_right_weather", evidenceKind: "section_synthesis" }],
  }],
}]), "FAIL", "released_length itemsets citing only one section must fail lookback balance");
const rabbitFixture = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/rabbit_drama_released_length.json", "utf8"));
const rabbitPassage = rabbitFixture.passages[0];
const rabbitItems = rabbitFixture.items;
assert.equal(rabbitPassage.title, "Room for One More", "drama fixture must encode the signed-off Room for One More passage");
assert.equal(rabbitPassage.wordCount >= 1000 && rabbitPassage.wordCount <= 1050, true, "signed-off drama fixture must be released-length, not the short substitute");
assert.equal(rabbitPassage.text.includes("HEDGEHOG — slow, polite, and covered in prickles"), true, "signed-off drama cast must include Hedgehog");
assert.equal(rabbitPassage.text.includes("SETTING: A hollow log at the edge of the woods."), true, "signed-off drama setting must be the hollow log in an autumn storm");
assert.equal(/\bMOLE\b/.test(rabbitPassage.text), false, "wrong substitute cast member Mole must not appear");
assert.equal(/snowy burrow|snow taps|stacked the carrots/i.test(rabbitPassage.text), false, "wrong snowy-burrow substitute markers must not appear");
const rabbitSections = buildPssaStaminaSectionMap(rabbitPassage);
assert.deepEqual(
  rabbitSections.map((section) => section.sectionId),
  ["front_matter", "scene_01", "scene_02", "scene_03"],
  "drama scene map must be marker-derived with cast/setting front matter outside scenes",
);
assert.deepEqual(
  rabbitSections.filter((section) => section.sectionId !== "front_matter").map((section) => section.sectionId),
  ["scene_01", "scene_02", "scene_03"],
  "drama lookback sections must be explicit scene markers only",
);
const rabbitLineMap = buildPssaDramaLineMap(rabbitPassage);
assert.equal(rabbitLineMap.find((line) => line.sceneId === "scene_01" && line.lineIndex === 4)?.speaker, "SQUIRREL");
assert.equal(rabbitLineMap.find((line) => line.sceneId === "scene_03" && line.lineIndex === 4)?.speaker, "RABBIT");
assert.notEqual(
  pssaDramaEvidenceKey({ evidenceKind: "spoken_line", sceneId: "scene_01", lineIndex: 4, speaker: "SQUIRREL" }),
  pssaDramaEvidenceKey({ evidenceKind: "spoken_line", sceneId: "scene_03", lineIndex: 4, speaker: "RABBIT" }),
  "scene-scoped line keys must not collide across real Scene 1 line 4 and Scene 3 line 4",
);
assert.equal(
  pssaDramaEvidenceKey({ evidenceKind: "stage_direction", sceneId: "scene_03", lineIndex: 3 }),
  "scene_03:3",
  "stage directions use the same sceneId:lineIndex address space without speaker",
);
assert.equal(
  rabbitItems.find((item: any) => item.id === "pssa_stamina_item_g3_rabbit_01").structuredChoicesJson[0].evidenceLinks.every((link: any) =>
    (link.evidenceKind === "whole_play_synthesis" && !("quotedSpan" in link) && !("lineIndex" in link) && !("sceneId" in link))
    || (link.evidenceKind === "scene_synthesis" && link.sceneId && !("quotedSpan" in link) && !("lineIndex" in link))
  ),
  true,
  "drama theme synthesis uses whole_play_synthesis plus explicit scene_synthesis links without fabricated spans",
);
const rabbitSpecificityRows = buildMcqPassageSpecificityReport(rabbitItems, [rabbitPassage]);
assert.deepEqual(
  rabbitSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_rabbit_01" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "synthesis evidence item"]],
  "drama theme MCQs skip concreteness only through correct-choice whole_play/scene synthesis evidence",
);
assert.deepEqual(
  rabbitSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_rabbit_02" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "synthesis evidence item"]],
  "drama character-change MCQs skip concreteness only through explicit correct-choice scene_synthesis evidence",
);
assert.deepEqual(
  rabbitSpecificityRows
    .filter((row) => row.itemId === "pssa_stamina_item_g3_rabbit_05" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "vocabulary-in-context item"]],
  "drama V-family vocab items retain the anchored vocab skip",
);
assert.deepEqual(
  rabbitSpecificityRows
    .filter((row) => ["pssa_stamina_item_g3_rabbit_03", "pssa_stamina_item_g3_rabbit_04", "pssa_stamina_item_g3_rabbit_06"].includes(row.itemId) && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.itemId, row.result, row.evidence]),
  [
    ["pssa_stamina_item_g3_rabbit_03", "SKIP", "SKIP_INFERENCE_INTERPRETATION:inference"],
    ["pssa_stamina_item_g3_rabbit_04", "SKIP", "SKIP_INFERENCE_INTERPRETATION:interpretation"],
    ["pssa_stamina_item_g3_rabbit_06", "SKIP", "SKIP_INFERENCE_INTERPRETATION:interpretation"],
  ],
  "drama inference/interpretation MCQs visibly skip choice-concreteness only with explicit comprehensionKind rationales",
);
assert.equal(
  rabbitSpecificityRows.some((row) => row.itemId === "pssa_stamina_item_g3_rabbit_05" && row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_REUSED" && row.result === "FAIL"),
  false,
  "drama vocab distractors should not reuse one evidence span for every choice",
);
const rabbitStaminaRows = evaluatePssaStaminaGates(rabbitPassage, rabbitItems);
assert.equal(rabbitStaminaRows.find((row) => row.gateId === "PSSA_DOMAIN_FACT_CHECK_REQUIRED")?.status, "SKIP", "drama fiction must not require fact-check notes unless explicitly flagged");
assert.equal(rabbitStaminaRows.find((row) => row.gateId === "PSSA_TEXT_FEATURE_INTEGRITY")?.status, "PASS", "drama feature metadata must use cast_list/scene_marker/stage_direction records");
assert.equal(rabbitStaminaRows.find((row) => row.gateId === "PSSA_TEXT_FEATURE_ITEM_LINK")?.status, "SKIP", "drama features do not require item linkage");
assert.equal(rabbitStaminaRows.find((row) => row.gateId === "PSSA_PASSAGE_STAMINA_METADATA")?.status, "PASS", "drama released-length metadata requires genre, word count, band, and feature metadata");
assert.equal(rabbitStaminaRows.find((row) => row.gateId === "PSSA_SECTION_LOOKBACK_BALANCE")?.status, "PASS", "drama lookback balance must be satisfied by explicit scene_synthesis/spoken/stage evidence across scenes");
assert.deepEqual(rabbitStaminaRows.filter((row) => row.status === "FAIL"), [], `rabbit drama fixture must not fail stamina gates: ${JSON.stringify(rabbitStaminaRows)}`);
assert.equal(evaluatePssaTextFeatureIntegrity({
  ...rabbitPassage,
  textFeaturesJson: [{ type: "dialogue", featureText: "RABBIT:" }],
}), "FAIL", "dialogue is intentionally not a drama text feature type");
assert.equal(evaluatePssaSectionLookbackBalance({
  ...rabbitPassage,
  id: "drama-whole-play-only",
}, [{
  id: "whole-play-only-item",
  passageId: "drama-whole-play-only",
  structuredChoicesJson: [{
    text: "theme",
    evidenceLinks: [{ evidenceKind: "whole_play_synthesis" }],
  }],
}]), "FAIL", "whole_play_synthesis alone must not satisfy scene lookback balance");

const staminaCompletionSpecs = [
  {
    label: "maple",
    passage: syrupPassage,
    items: syrupItems,
    ebsrId: "pssa_stamina_item_g3_syrup_ebsr_01",
    saId: "pssa_stamina_item_g3_syrup_sa_01",
    correctPartA: 2,
    correctPartB: [0, 2],
  },
  {
    label: "boat",
    passage: boatPassage,
    items: boatItems,
    ebsrId: "pssa_stamina_item_g3_boat_ebsr_01",
    saId: "pssa_stamina_item_g3_boat_sa_01",
    correctPartA: 1,
    correctPartB: [1, 3],
  },
  {
    label: "rabbit",
    passage: rabbitPassage,
    items: rabbitItems,
    ebsrId: "pssa_stamina_item_g3_rabbit_ebsr_01",
    saId: "pssa_stamina_item_g3_rabbit_sa_01",
    correctPartA: 0,
    correctPartB: [0, 2],
  },
];

for (const spec of staminaCompletionSpecs) {
  const ebsr = spec.items.find((item: any) => (item.itemId ?? item.id) === spec.ebsrId);
  assert(ebsr, `${spec.label} completion EBSR must exist`);
  assert.equal(ebsr.interactionType, "EBSR");
  assert.deepEqual(ebsr.correctResponseJson, { partA: { correctIndex: spec.correctPartA }, partB: { correctIndices: spec.correctPartB } }, `${spec.label} EBSR must use PR-C partAIndex/partBIndices scoring source shape`);
  assert.equal(ebsr.responseSpecJson.partB.requiredSelectionCount, 2, `${spec.label} EBSR Part B requires two selections`);
  assert.equal(ebsr.scoringJson.totalPoints, 2, `${spec.label} EBSR is two points`);
  for (const choice of ebsr.partB.choices) {
    assert.equal(spec.passage.text.includes(choice.quotedSpan), true, `${spec.label} EBSR Part B span must be verbatim: ${choice.quotedSpan}`);
    for (const link of choice.evidenceLinks ?? []) {
      assert.equal(spec.passage.text.includes(link.quotedSpan), true, `${spec.label} EBSR evidence link span must be verbatim: ${link.quotedSpan}`);
    }
  }
  projectPssaStudentItem(ebsr);

  const sa = spec.items.find((item: any) => (item.itemId ?? item.id) === spec.saId);
  assert(sa, `${spec.label} completion SHORT_ANSWER must exist`);
  assert.equal(sa.interactionType, "SHORT_ANSWER");
  assert.equal(sa.scoringJson.scoreStatus, "pending_human_scoring", `${spec.label} SHORT_ANSWER must stay pending human scoring`);
  assert.equal(sa.scoringJson.totalPoints, 3, `${spec.label} SHORT_ANSWER is three points`);
  assert.equal(evaluatePssaShortAnswerBandsNonempty(sa), "PASS", `${spec.label} SHORT_ANSWER must have non-empty score bands`);
  for (const support of sa.acceptableTextSupport ?? []) {
    assert.equal(spec.passage.text.includes(support.quotedSpan), true, `${spec.label} SHORT_ANSWER support span must be verbatim: ${support.quotedSpan}`);
  }
  projectPssaStudentItem(sa);
}

const owlCompletionEbsr = owlItems.find((item: any) => (item.itemId ?? item.id) === "pssa_stamina_item_g3_owls_ebsr_01");
assert(owlCompletionEbsr, "owl cross-text completion EBSR must exist");
assert.equal(owlCompletionEbsr.interactionType, "EBSR");
assert.equal(owlCompletionEbsr.isCrossText, true, "owl EBSR must be marked cross-text");
assert.equal(owlCompletionEbsr.passageGroupId, owlGroup.id, "owl EBSR must point at the encoded paired group");
assert.deepEqual(owlCompletionEbsr.requiredEvidenceSlotsJson, ["passage_1", "passage_2"], "owl EBSR must require one support from each passage slot");
assert.deepEqual(owlCompletionEbsr.correctResponseJson, { partA: { correctIndex: 3 }, partB: { correctIndices: [0, 2] } }, "owl EBSR must use the expected scoring source shape");
const owlPassagesBySlot = new Map(owlGroup.members.map((member) => [member.slot, member.passage]));
for (const choice of owlCompletionEbsr.partB.choices) {
  const link = choice.evidenceLinks?.[0];
  assert(link?.passageSlot, `owl EBSR Part B span must carry passageSlot: ${choice.quotedSpan}`);
  const linkedPassage = owlPassagesBySlot.get(link.passageSlot);
  assert(linkedPassage, `owl EBSR passageSlot must exist in encoded group: ${link.passageSlot}`);
  assert.equal(linkedPassage.text.includes(choice.quotedSpan), true, `owl EBSR Part B span must be verbatim in encoded ${link.passageSlot}: ${choice.quotedSpan}`);
  assert.equal(linkedPassage.text.includes(link.quotedSpan), true, `owl EBSR evidence link span must be verbatim in encoded ${link.passageSlot}: ${link.quotedSpan}`);
}
assert.equal(JSON.stringify(owlCompletionEbsr).includes("Okafor"), false, "owl EBSR must not use stale Okafor draft wording");
assert.equal(JSON.stringify(owlCompletionEbsr).includes("thousand mice"), false, "owl EBSR must not use stale thousand-mice draft wording");
projectPssaStudentItem(owlCompletionEbsr);

const staminaShortAnswers = [
  { label: "maple", passage: syrupPassage, item: syrupItems.find((item: any) => (item.itemId ?? item.id) === "pssa_stamina_item_g3_syrup_sa_01"), expectedEc: "E03.B-K.1.1.3" },
  { label: "boat", passage: boatPassage, item: boatItems.find((item: any) => (item.itemId ?? item.id) === "pssa_stamina_item_g3_boat_sa_01"), expectedEc: "E03.A-K.1.1.3" },
  { label: "owl", passage: undefined, item: owlItems.find((item: any) => (item.itemId ?? item.id) === "pssa_stamina_item_g3_owls_06"), expectedEc: "E03.B-C.3.1.2" },
  { label: "rabbit", passage: rabbitPassage, item: rabbitItems.find((item: any) => (item.itemId ?? item.id) === "pssa_stamina_item_g3_rabbit_sa_01"), expectedEc: "E03.A-K.1.1.3" },
];
for (const spec of staminaShortAnswers) {
  assert(spec.item, `${spec.label} stamina SHORT_ANSWER must exist`);
  assert.equal(spec.item.interactionType, "SHORT_ANSWER", `${spec.label} item must remain SHORT_ANSWER`);
  assert.equal(spec.item.studentFacingPrompt, spec.item.stem, `${spec.label} SHORT_ANSWER must carry matching studentFacingPrompt and stem`);
  assert.equal(String(spec.item.studentFacingPrompt ?? "").trim().length > 0, true, `${spec.label} SHORT_ANSWER prompt must be non-empty`);
  assert.equal(spec.item.eligibleContent, spec.expectedEc, `${spec.label} SHORT_ANSWER EC must match the normalized metadata`);
  assert.deepEqual(spec.item.scoreBandExamples.map((row: any) => row.band), [3, 2, 1, 0], `${spec.label} SHORT_ANSWER must carry foundation-style 3/2/1/0 scoreBandExamples`);
  assert.equal(evaluatePssaShortAnswerBandsNonempty(spec.item), "PASS", `${spec.label} SHORT_ANSWER score bands must be non-empty`);
  assert.equal(spec.item.scoringJson.scoreStatus, "pending_human_scoring", `${spec.label} SHORT_ANSWER must stay pending human scoring`);
  assert.equal((projectPssaStudentItem(spec.item).responseSpec as { stem: string }).stem, spec.item.stem, `${spec.label} SHORT_ANSWER student DTO must read the non-empty stem`);
}
assert.equal(
  buildItemEcSkillMatchReport([staminaShortAnswers[0].item], [syrupPassage], ecCatalog).some((row) => row.skillMatchResult === "FAIL"),
  false,
  "maple process SHORT_ANSWER retagged to E03.B-K.1.1.3 must pass EC-skill-match",
);
const staminaReviewerDraft = fs.readFileSync("reports/pssa_stamina_item_set_completion_reviewer_draft.md", "utf8");
assert.equal(staminaReviewerDraft.includes("### pssa_stamina_item_g3_owls_06"), true, "reviewer draft must include the owl SHORT_ANSWER item");
assert.equal(staminaReviewerDraft.includes("Prompt: Use details from both passages to explain why owls can be helpful hunters."), true, "reviewer draft must render the owl SHORT_ANSWER prompt");
assert.equal(/\*\*\*\*/.test(staminaReviewerDraft), false, "reviewer draft must not contain blank **** prompt placeholders");
for (const band of [3, 2, 1, 0]) {
  assert.equal(staminaReviewerDraft.includes(`- ${band}:`), true, `reviewer draft must render score band ${band}`);
}

type BatteryStatus = "PASS" | "FAIL" | "SKIP";
type BatteryRow = {
  itemId: string;
  interactionType: string;
  gateId: string;
  status: BatteryStatus;
  detail: string;
  enforced?: boolean;
  reportOnly?: boolean;
};

function staminaItemId(item: any) {
  return String(item.itemId ?? item.id ?? "");
}

function staminaInteractionType(item: any) {
  return String(item.interactionType ?? item.itemType ?? "");
}

function staminaPassageIds(item: any) {
  const ids = [
    item.passageId,
    ...(Array.isArray(item.passageIds) ? item.passageIds : []),
    ...(Array.isArray(item.passageLinks) ? item.passageLinks.map((link: any) => link.passageId) : []),
  ].filter(Boolean).map(String);
  return [...new Set(ids)];
}

function reportRow(item: any, gateId: string, status: BatteryStatus, detail: string, options: { enforced?: boolean; reportOnly?: boolean } = {}): BatteryRow {
  return {
    itemId: staminaItemId(item),
    interactionType: staminaInteractionType(item),
    gateId,
    status,
    detail,
    ...options,
  };
}

function buildAnswerPositionRow(items: any[], label: string) {
  const counts = [0, 0, 0, 0];
  for (const item of items) if (typeof item.correctIndex === "number") counts[item.correctIndex] += 1;
  const maxShare = Math.max(...counts) / Math.max(items.length, 1);
  return {
    label,
    itemCount: items.length,
    counts,
    maxShare,
    status: maxShare <= 0.4 ? "PASS" as const : "FAIL" as const,
    detail: `A:${counts[0]} B:${counts[1]} C:${counts[2]} D:${counts[3]} maxShare=${maxShare.toFixed(4)}`,
  };
}

function firstPassageFor(item: any, passagesById: Map<string, any>) {
  return passagesById.get(staminaPassageIds(item)[0]);
}

function buildStaminaContentQualityBatteryReport() {
  const passageGroups = [owlGroup];
  const passages = [syrupPassage, boatPassage, rabbitPassage, ...owlGroup.members.map((member) => member.passage)];
  const passagesById = new Map(passages.map((passage: any) => [passage.id, passage]));
  const readingItems = [...syrupItems, ...boatItems, ...owlItems, ...rabbitItems];
  const allItems = [...readingItems, ...staminaConventionItems];
  const mcqItems = allItems.filter((item) => staminaInteractionType(item) === "MCQ");
  const ebsrItems = allItems.filter((item) => staminaInteractionType(item) === "EBSR");
  const shortAnswerItems = allItems.filter((item) => staminaInteractionType(item) === "SHORT_ANSWER");

  assert.equal(allItems.length, 37, "stamina diagnostic battery must cover the current encoded 37-item packet");
  assert.equal(mcqItems.length, 29, "stamina packet must include 20 reading MCQs plus 9 standalone conventions MCQs");
  assert.equal(ebsrItems.length, 4, "stamina packet must include 4 EBSR items");
  assert.equal(shortAnswerItems.length, 4, "stamina packet must include 4 SHORT_ANSWER items");

  const rows: BatteryRow[] = [];
  const overlap = evaluatePssaPassageMultipointEvidenceOverlap(readingItems, passages);
  for (const item of allItems) {
    const passage = firstPassageFor(item, passagesById);
    rows.push(reportRow(item, "PSSA_ITEM_INTRA_CHOICE_DUPLICATE", evaluatePssaItemIntraChoiceDuplicate(item), "foundation evaluator"));
    rows.push(reportRow(item, "PSSA_VOCAB_KEY_CONSTRUCT", evaluatePssaVocabKeyConstruct(item, passage), "foundation evaluator"));
    rows.push(reportRow(item, "PSSA_SA_BANDS_NONEMPTY", evaluatePssaShortAnswerBandsNonempty(item), "foundation evaluator"));
    rows.push(reportRow(item, "PSSA_ITEM_EC_GENRE_MATCH", evaluatePssaItemEcGenreMatch(item, passage), "foundation evaluator"));
    rows.push(reportRow(item, "PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP", overlap[staminaItemId(item)] ?? "PASS", "foundation evaluator"));
  }

  const passageQualityRows = buildPssaPassageQualityReport(passages);
  const passageSpecificityRows = buildMcqPassageSpecificityReport(readingItems as McqAuditInput[], passages);
  const passageSpecificityRowsByItem = new Map<string, typeof passageSpecificityRows>();
  for (const row of passageSpecificityRows) {
    if (!passageSpecificityRowsByItem.has(row.itemId)) passageSpecificityRowsByItem.set(row.itemId, []);
    passageSpecificityRowsByItem.get(row.itemId)?.push(row);
  }
  for (const item of mcqItems) {
    const itemRows = passageSpecificityRowsByItem.get(staminaItemId(item)) ?? [];
    if (itemRows.length) {
      const failed = itemRows.some((row) => row.result === "FAIL" && row.severity === "BLOCKER");
      rows.push(reportRow(item, "PSSA_MCQ_PASSAGE_SPECIFICITY", failed ? "FAIL" : "PASS", `${itemRows.length} detector rows; failures=${itemRows.filter((row) => row.result === "FAIL").length}`));
    } else {
      rows.push(reportRow(item, "PSSA_MCQ_PASSAGE_SPECIFICITY", "SKIP", "not passage-linked reading MCQ (standalone conventions or paired group variant)"));
    }
  }

  const skillRows = buildItemEcSkillMatchReport(readingItems as McqAuditInput[], passages, ecCatalog);
  const skillRowsByItem = new Map(skillRows.map((row) => [row.itemId, row]));
  for (const item of mcqItems) {
    const skill = skillRowsByItem.get(staminaItemId(item));
    rows.push(reportRow(
      item,
      "PSSA_ITEM_EC_SKILL_MATCH",
      skill ? (skill.skillMatchResult === "FAIL" ? "FAIL" : "PASS") : "SKIP",
      skill ? `${skill.skillMatchResult}: ${skill.notes}` : "not passage-linked reading MCQ",
    ));
  }

  const singleAnswerGroups = singleAnswerChoiceGroups(allItems, { includeEbsrPartA: true });
  const singleAnswerById = new Map(singleAnswerGroups.map((group) => [String(group.itemId), group]));
  const correctIsLongestRows = buildMcqCorrectIsLongestReport(singleAnswerGroups);
  const correctIsLongestById = new Map(correctIsLongestRows.filter((row) => row.scope === "item").map((row) => [row.itemId, row]));
  for (const group of singleAnswerGroups) {
    const source = allItems.find((item) => staminaItemId(item) === group.originalItemId) ?? group;
    const lengthRow = correctIsLongestById.get(String(group.itemId));
    rows.push(reportRow(
      source,
      `PSSA_MCQ_CORRECT_IS_LONGEST${group.sourceInteractionType === "EBSR_PART_A" ? "_EBSR_PART_A_REPORT_ONLY" : ""}`,
      lengthRow?.result ?? "FAIL",
      lengthRow
        ? `choiceGroup=${group.itemId}; correctWords=${lengthRow.correctWordLength}; maxDistractorWords=${lengthRow.longestDistractorWordLength}; gap=${lengthRow.wordLengthGap}; uniquelyLongest=${lengthRow.uniquelyLongest}`
        : `choiceGroup=${group.itemId}; missing length row`,
      group.sourceInteractionType === "EBSR_PART_A" ? { enforced: false, reportOnly: true } : {},
    ));
  }

  const absoluteRows = buildMcqAbsoluteLanguageDistractorReport(singleAnswerGroups);
  const absoluteFailuresById = new Set(absoluteRows.filter((row) => row.itemId !== "batch" && row.result === "FAIL").map((row) => row.itemId));
  for (const group of singleAnswerGroups) {
    const source = allItems.find((item) => staminaItemId(item) === group.originalItemId) ?? group;
    rows.push(reportRow(
      source,
      `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR${group.sourceInteractionType === "EBSR_PART_A" ? "_EBSR_PART_A_REPORT_ONLY" : ""}`,
      absoluteFailuresById.has(String(group.itemId)) ? "FAIL" : "PASS",
      `choiceGroup=${group.itemId}`,
      group.sourceInteractionType === "EBSR_PART_A" ? { enforced: false, reportOnly: true } : {},
    ));
  }

  const mcqPosition = buildAnswerPositionRow(singleAnswerGroups.filter((group) => group.sourceInteractionType === "MCQ"), "stamina MCQ");
  const ebsrPartAPosition = buildAnswerPositionRow(singleAnswerGroups.filter((group) => group.sourceInteractionType === "EBSR_PART_A"), "stamina EBSR Part A report-only");
  for (const item of mcqItems) rows.push(reportRow(item, "PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION", mcqPosition.status, mcqPosition.detail));
  for (const item of ebsrItems) rows.push(reportRow(item, "PSSA_EBSR_PART_A_ANSWER_POSITION_DISTRIBUTION_REPORT_ONLY", ebsrPartAPosition.status, ebsrPartAPosition.detail, { enforced: false, reportOnly: true }));

  for (const passage of [syrupPassage, boatPassage, rabbitPassage]) {
    const passageItems = readingItems.filter((item) => staminaPassageIds(item).includes(passage.id));
    for (const staminaRow of evaluatePssaStaminaGates(passage, passageItems)) {
      const targetItem = allItems.find((item) => staminaItemId(item) === staminaRow.targetId);
      if (targetItem) rows.push(reportRow(targetItem, staminaRow.gateId, staminaRow.status, staminaRow.detail));
    }
  }
  for (const group of passageGroups) {
    const pairedGroupRows = [
      { gateId: "PSSA_PAIRED_GROUP_STAMINA_METADATA", targetId: group.id, status: evaluatePssaPairedGroupStaminaMetadata(group), detail: "paired group metadata" },
      ...evaluatePssaPairedSectionLookbackBalance(group, owlItems),
    ] as Array<{ gateId: string; targetId: string; status: BatteryStatus; detail: string }>;
    for (const groupRow of pairedGroupRows) {
      const targetItem = allItems.find((item) => staminaItemId(item) === groupRow.targetId);
      if (targetItem) rows.push(reportRow(targetItem, groupRow.gateId, groupRow.status, groupRow.detail));
    }
    const pairedOverlap = evaluatePssaPairedMultipointEvidenceOverlap(owlItems);
    for (const item of owlItems) {
      if (pairedOverlap[staminaItemId(item)]) rows.push(reportRow(item, "PSSA_PAIRED_MULTIPOINT_EVIDENCE_OVERLAP", pairedOverlap[staminaItemId(item)], "paired passageSlot variant"));
      if (["MCQ", "EBSR", "SHORT_ANSWER"].includes(staminaInteractionType(item))) rows.push(reportRow(item, "PSSA_REQUIRED_EVIDENCE_SLOTS", evaluatePssaRequiredEvidenceSlots(item, group), "paired passageSlot variant"));
    }
  }

  const inferenceSkipRows = passageSpecificityRows
    .filter((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "SKIP" && row.evidence.startsWith("SKIP_INFERENCE_INTERPRETATION"))
    .map((row) => ({ itemId: row.itemId, evidence: row.evidence }));
  assert.deepEqual(
    inferenceSkipRows.map((row) => row.itemId).sort(),
    [
      "pssa_stamina_item_g3_rabbit_03",
      "pssa_stamina_item_g3_rabbit_04",
      "pssa_stamina_item_g3_rabbit_06",
    ],
    "#47 inference/interpretation skip set must be visible and limited to intended literary/drama items",
  );
  for (const itemId of inferenceSkipRows.map((row) => row.itemId)) {
    const itemRows = passageSpecificityRowsByItem.get(itemId) ?? [];
    assert.equal(itemRows.length > 0, true, `${itemId} must still enter the passage-specificity detector`);
    assert.equal(
      itemRows.some((row) => row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "SKIP"),
      true,
      `${itemId} must expose the scoped #47 SKIP row rather than disappearing from the detector`,
    );
    assert.equal(
      itemRows.some((row) => row.result === "FAIL" && ["PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED", "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED", "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER"].includes(row.ruleId)),
      false,
      `${itemId} must still be eligible for the other blocker gates; no hidden evidence/role/single-answer failure should be present`,
    );
  }

  const foundationPilot = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_pilot/pilot_backend.json", "utf8"));
  const foundationEbsr = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json", "utf8"));
  const literaryTopup = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_literary_topup/grade3_literary_topup_backend.json", "utf8"));
  const foundationSingleAnswerGroups = singleAnswerChoiceGroups([
    ...foundationPilot.items.filter((item: any) => item.itemType === "MCQ" && item.passageId && item.itemStatus !== "deprecated_superseded"),
    ...foundationEbsr.items,
    ...literaryTopup.items.filter((item: any) => ["MCQ", "EBSR"].includes(staminaInteractionType(item))),
  ], { includeEbsrPartA: true });
  const foundationPartALengthRows = buildMcqCorrectIsLongestReport(foundationSingleAnswerGroups)
    .filter((row) => row.scope === "item" && String(row.itemId).includes("::partA"));

  const failures = rows.filter((row) => row.status === "FAIL");
  const enforceableFailures = rows.filter((row) => row.status === "FAIL" && row.enforced !== false);
  const ebsrPartAInformationalRows = rows.filter((row) => row.reportOnly);
  assert.equal(rows.length > allItems.length * 8, true, "stamina battery report must include a broad per-item gate matrix, not spot checks");
  assert.deepEqual(enforceableFailures, [], "ENFORCED stamina battery must have zero rows where status is FAIL and enforced is not false");
  assert.equal(ebsrPartAInformationalRows.length, 12, "EBSR Part A shortcut rows must stay report-only and mechanically excluded from enforcement");
  assert.deepEqual(
    correctIsLongestRows
      .filter((row) => row.scope === "item" && row.result === "FAIL")
      .map((row) => row.itemId)
      .sort(),
    [],
    "Spec A wording/key redistribution must clear enforceable correct-is-longest blockers, including EBSR Part A report-only rows",
  );
  assert.equal(correctIsLongestRows.every((row) => row.scope === "batch" || (row.wordLengthGap !== "" && row.uniquelyLongest !== "")), true, "correct-is-longest report must expose word gap and uniquely-longest flag");

  const reportLines = [
    "# PSSA Stamina Content-Quality Battery Report",
    "",
    "Enforced mode: every row with status FAIL and enforced !== false fails test:pssa-content. EBSR Part A shortcut rows are report-only for this PR.",
    "",
    "## Functions Reused",
    "",
    "- PSSA_CONTENT_QUALITY_GATE_IDS evaluators: intra-choice duplicate, vocab key construct, SA bands nonempty, EC genre match, passage multipoint evidence overlap.",
    "- buildMcqPassageSpecificityReport, buildItemEcSkillMatchReport, buildMcqCorrectIsLongestReport, buildMcqAbsoluteLanguageDistractorReport.",
    "- buildPssaPassageQualityReport.",
    "- evaluatePssaStaminaGates and paired passageSlot variants for released-length, drama, and paired fixtures.",
    "- singleAnswerChoiceGroups report-only shortcut extractor for MCQ plus EBSR Part A.",
    "",
    "## Packet Counts",
    "",
    `- Items: ${allItems.length} total = ${mcqItems.length} MCQ (${mcqItems.length - staminaConventionItems.length} reading + ${staminaConventionItems.length} conventions) + ${ebsrItems.length} EBSR + ${shortAnswerItems.length} SHORT_ANSWER.`,
    `- Passages: ${passages.length} encoded stamina passages across ${passageGroups.length} paired group.`,
    "",
    "## #47 Visible Skip Set",
    "",
    "| itemId | evidence |",
    "| --- | --- |",
    ...inferenceSkipRows.map((row) => `| ${row.itemId} | ${row.evidence} |`),
    "",
    "## Correct-Is-Longest Detail",
    "",
    "| itemId | source | result | correctWords | maxDistractorWords | gap | uniquelyLongest | notes |",
    "| --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    ...correctIsLongestRows
      .filter((row) => row.scope === "item")
      .map((row) => {
        const group = singleAnswerById.get(row.itemId);
        return `| ${row.itemId} | ${group?.sourceInteractionType ?? "MCQ"} | ${row.result} | ${row.correctWordLength} | ${row.longestDistractorWordLength} | ${row.wordLengthGap} | ${row.uniquelyLongest} | ${row.notes} |`;
      }),
    "",
    "## Foundation EBSR Part A Impact (Report-Only)",
    "",
    "| itemId | result | correctWords | maxDistractorWords | gap | uniquelyLongest |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...foundationPartALengthRows.map((row) => `| ${row.itemId} | ${row.result} | ${row.correctWordLength} | ${row.longestDistractorWordLength} | ${row.wordLengthGap} | ${row.uniquelyLongest} |`),
    "",
    "## EBSR Part A Informational Rows (Not Enforced)",
    "",
    "| itemId | gateId | status | detail |",
    "| --- | --- | --- | --- |",
    ...ebsrPartAInformationalRows.map((row) => `| ${row.itemId} | ${row.gateId} | ${row.status} | ${row.detail.replace(/\|/g, "/")} |`),
    "",
    "## Enforceable FAIL List",
    "",
    "| itemId | interactionType | gateId | detail |",
    "| --- | --- | --- | --- |",
    ...enforceableFailures.map((row) => `| ${row.itemId} | ${row.interactionType} | ${row.gateId} | ${row.detail.replace(/\|/g, "/")} |`),
    "",
    "## Per-Item Gate Matrix",
    "",
    "| itemId | interactionType | gateId | status | enforced | detail |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.itemId} | ${row.interactionType} | ${row.gateId} | ${row.status} | ${row.enforced === false ? "false" : "true"} | ${row.detail.replace(/\|/g, "/")} |`),
    "",
    "## Passage Quality Rows",
    "",
    "| passageId | ruleId | result | severity | notes |",
    "| --- | --- | --- | --- | --- |",
    ...passageQualityRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.notes.replace(/\|/g, "/")} |`),
    "",
    "## Passage Specificity Raw Rows",
    "",
    "| itemId | ruleId | result | severity | evidence | notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...passageSpecificityRows.map((row) => `| ${row.itemId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.evidence.replace(/\|/g, "/")} | ${row.notes.replace(/\|/g, "/")} |`),
    "",
  ];
  fs.writeFileSync("reports/pssa_stamina_content_quality_battery.md", `${reportLines.join("\n")}\n`);
  return { rows, failures, enforceableFailures, ebsrPartAInformationalRows, passageQualityRows, passageSpecificityRows, correctIsLongestRows, foundationPartALengthRows };
}

const staminaBattery = buildStaminaContentQualityBatteryReport();
assert.equal(staminaBattery.foundationPartALengthRows.length > 0, true, "EBSR Part A foundation impact must be reported without enforcing it in buildPlan");
assert.deepEqual(staminaBattery.enforceableFailures, [], "test:pssa-content must enforce zero stamina battery failures");
assert.equal(staminaBattery.ebsrPartAInformationalRows.every((row) => row.enforced === false && row.reportOnly), true, "EBSR Part A rows must be incapable of failing test:pssa-content in this PR");

const grade3Plan = buildPlan(3);
assert.equal(grade3Plan.hashStable, true, "stamina fixture must keep foundation import hashes stable");
assert.deepEqual(grade3Plan.manifest.map((row) => [row.recordType, row.count, row.expectedCount]), [
  ["passage", 7, 7],
  ["item", 91, 91],
  ["deprecated", 12, 12],
  ["supersession", 12, 12],
  ["batch", 8, 8],
], "stamina fixture must not modify the Grade 3 import manifest");
for (const itemId of ["pssa_item_g3_reading_6", "pssa_item_g3_reading_7", "pssa_item_g3_reading_16", "pssa_item_g3_reading_17"]) {
  const item = grade3Plan.activeItems.find((row) => row.itemId === itemId);
  assert(item, `${itemId} must remain in the active foundation plan`);
  assert.deepEqual(item.blockedReasons, [], `${itemId} must still pass all import gates`);
}
for (const gateId of PSSA_CONTENT_QUALITY_GATE_IDS) {
  const tally = grade3Plan.gateTallies.get(gateId);
  assert.equal(tally?.fail ?? 0, 0, `${gateId} must have zero failures across the Grade 3 import plan`);
}

console.log("PSSA content audit detector tests passed.");
