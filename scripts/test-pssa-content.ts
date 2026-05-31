import assert from "node:assert/strict";
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

assertPssaItemTypeMockContract();
assertGrade3EbsrContract();

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

const ecCatalog = {
  "E03.A-V.4.1.1": "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 3 reading and content.",
  "E03.A-K.1.1.1": "Ask and answer questions to demonstrate understanding of a text, referring explicitly to the text as the basis for the answers.",
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

console.log("PSSA content audit detector tests passed.");
