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
import {
  buildPssaStaminaSectionMap,
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaItemFootnoteGiveaway,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaSectionLookbackBalance,
  evaluatePssaStaminaGates,
  evaluatePssaTextFeatureIntegrity,
  evaluatePssaTextFeatureItemLink,
} from "./content/lib/pssa-stamina-gates";

assertPssaItemTypeMockContract();
assertGrade3EbsrContract();
assertGrade3TeiContract();
assertGrade3MatchingGridDragDropContract();
assertGrade3ConventionsContract();
assertGrade3ShortAnswerContract();

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
assert.deepEqual(syrupSpecificityFailures, [], "stamina syrup fixture must pass existing MCQ specificity detectors");
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
    .filter((row) => row.itemId === "pssa_stamina_item_g3_boat_04" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES")
    .map((row) => [row.result, row.evidence]),
  [["SKIP", "vocabulary-in-context item"]],
  "V-family figurative-language MCQs must remain scoped to vocab gates",
);
assert.equal(
  boatSpecificityRows.some((row) => row.itemId === "pssa_stamina_item_g3_boat_05" && row.ruleId === "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES" && row.result === "FAIL"),
  false,
  "concrete literary detail MCQs must still run through passage-specificity rather than being skipped",
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
assert.equal(evaluatePssaSectionLookbackBalance({
  id: "drama-lookback-deferred",
  text: "Scene one.\n\nScene two.",
  staminaBand: "released_length",
  genre: "drama",
}, []), "SKIP", "drama lookback balance is explicitly deferred");

const grade3Plan = buildPlan(3);
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
