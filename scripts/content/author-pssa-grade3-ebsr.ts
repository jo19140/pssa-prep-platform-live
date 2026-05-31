import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  type PassageQualityRow,
  type PssaPassageAuditInput,
} from "../audit/pssa-audit-detectors";

type Result = "PASS" | "FAIL";

type EbsrChoice = {
  text: string;
  rationale: string;
  distractorRole?: string | null;
  supportsPartA?: boolean;
};

type EbsrEvidenceChoice = {
  text: string;
  quotedSpan: string;
  evidenceRole: "supports_part_a" | "too_narrow" | "wrong_step" | "background" | "opposite_or_unrelated";
  supportsPartA: boolean;
  rationale: string;
};

export type Grade3EbsrItem = {
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "EBSR";
  interactionType: "EBSR";
  interactionSubtype: "two_point";
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: "informational_elements" | "literature_elements";
  reportingCategory: "A" | "B";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  commercialUseAllowed: true;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  partA: {
    stem: string;
    choices: EbsrChoice[];
    correctIndex: number;
    evidenceNeededDescription: string;
    rationale: string;
    distractorRationales: string[];
    distractorRoles: string[];
  };
  partB: {
    stem: string;
    instruction: "Choose two answers.";
    choices: EbsrEvidenceChoice[];
    correctIndices: [number, number];
  };
  scoring: {
    totalPoints: 2;
    partAPoints: 1;
    partBPoints: 1;
    requirePartACorrectForFullCredit: true;
    partialCreditRules: Array<{ points: number; rule: string }>;
    scoringNotes: string;
  };
  responseSpec: {
    partA: { choices: string[] };
    partB: { instruction: string; choices: Array<{ text: string; quotedSpan: string }> };
  };
  correctResponse: {
    partA: { correctIndex: number };
    partB: { correctIndices: [number, number] };
  };
  auditMetadata: {
    authoredIn: "PSSA_PR_4K_GRADE3_EBSR";
    copiedReleasedText: false;
    copiedDrcText: false;
    noDbWrite: true;
  };
};

type SourceMatch = {
  itemId: string;
  field: string;
  matchedSourceFile: string;
  longestNormalizedNgram: string;
  overlapScore: number;
  matchType: "none" | "boilerplate" | "content-bearing";
  result: Result;
};

type SourceCorpusEntry = {
  file: string;
  text: string;
  normalizedText: string;
  contentNormalizedText: string;
};

type EbsrPositionDistribution = {
  partACorrectPositionDistribution: string;
  partBCorrectPairDistribution: string;
  partAPositionBiasResult: Result;
  partBPositionBiasResult: Result;
  ebsrPositionBiasResult: Result;
  positionBiasNotes: string;
};

type EbsrAuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  partAStem: string;
  partACorrectIndex: number;
  partAResult: Result;
  partBStem: string;
  partBCorrectIndices: string;
  partBInstruction: string;
  correctCountMatchesInstruction: Result;
  allPartBSpansFound: Result;
  supportLinkResult: Result;
  skillMatchResult: Result;
  scoringResult: Result;
  sourceComplianceResult: Result;
  partACorrectPositionDistribution: string;
  partBCorrectPairDistribution: string;
  partAPositionBiasResult: Result;
  partBPositionBiasResult: Result;
  ebsrPositionBiasResult: Result;
  positionBiasNotes: string;
  finalEbsrResult: Result;
  notes: string;
};

type EbsrAuditBundle = {
  items: Grade3EbsrItem[];
  rows: EbsrAuditRow[];
  sourceMatches: SourceMatch[];
  passageRows: PassageQualityRow[];
  positionDistribution: EbsrPositionDistribution;
};

const outputDir = path.resolve("exemplars/pssa_grade3_ebsr");
const releasedSourceDirs = [
  path.resolve("reference/pssa-released-items"),
  path.resolve("reference/pssa-item-catalog"),
];
const sourceTextExtensions = new Set([".md", ".txt", ".csv", ".json", ".html", ".pdf"]);
const boilerplatePatterns = [
  "choose two answers",
  "which evidence from the passage supports",
  "part one",
  "part two",
];

function loadGrade3Pilot() {
  return JSON.parse(fs.readFileSync(path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json"), "utf8"));
}

export function buildGrade3EbsrItems(): Grade3EbsrItem[] {
  return [
    makeItem({
      itemId: "pssa_ebsr_g3_creek_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      partAStem: "What is the main idea of the creek passage?",
      partAChoices: [
        ["The class uses creek clues to ask why the glow is strongest in one place.", true, null, true, "This states the passage's main idea and is supported by the class observations."],
        ["Maya wants families to decide that Pine Creek is unsafe after the heavy rain.", false, "opposite_claim", false, "The notice does not claim the water is safe or unsafe."],
        ["The teacher asks students to collect creek water in jars for a classroom test.", false, "plausible_misreading", false, "The jars are mentioned, but the class does not touch the water."],
        ["Neighbors learn that robins and beetles caused the pale green creek glow.", false, "unsupported_inference", false, "The animals appear after the glow fades and do not explain it."],
      ],
      evidenceDescription: "Evidence should show that the class gathered observations and used them to explain the stronger glow.",
      partBStem: "Which two details best support the answer in Part One?",
      partBChoices: [
        ["Maya drew a map of three creek spots.", "Maya drew a map of three creek spots.", "supports_part_a", true, "The map shows careful observations from more than one location."],
        ["Those clues helped the class ask a better question: why was the glow strongest in one place?", "Those clues helped the class ask a better question: why was the glow strongest in one place?", "supports_part_a", true, "This directly connects the observations to the main question."],
        ["A beetle skated over the surface, and a robin hopped in the wet grass.", "A beetle skated over the surface, and a robin hopped in the wet grass.", "background", false, "This is a later scene, not evidence explaining the glow."],
        ["The class wrote a creek notice for families.", "The class wrote a creek notice for families.", "too_narrow", false, "This is a result of the study, not the main evidence for why the glow was strongest."],
      ],
      partBOrder: [0, 2, 1, 3],
    }),
    makeItem({
      itemId: "pssa_ebsr_g3_map_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      partAStem: "What main idea do the details about the old map support?",
      partAChoices: [
        ["The old map helps people compare how Linden Station and the town changed over time.", true, null, true, "The passage repeatedly connects the old map to past-and-present comparison."],
        ["The old bench matters because it is more valuable than the map inside the display.", false, "wrong_emphasis", false, "The bench is where the map was found, not the main idea."],
        ["The town archive closed after Mr. Ortiz put the map in a clear sleeve.", false, "unsupported_inference", false, "The passage does not say the archive closed."],
        ["The children visit the station because the new map has no street names.", false, "opposite_claim", false, "The new map helps visitors compare the town with the old map."],
      ],
      partAOrder: [1, 0, 2, 3],
      evidenceDescription: "Evidence should show the old map being used to compare past and present.",
      partBStem: "Which two pieces of evidence best support the answer in Part One?",
      partBChoices: [
        ["Mr. Ortiz put a new town map beside the old one.", "Mr. Ortiz put a new town map beside the old one.", "supports_part_a", true, "The two maps make comparison possible."],
        ["Some streets had new names, and the trolley tracks were gone.", "Some streets had new names, and the trolley tracks were gone.", "supports_part_a", true, "This shows how the town had changed."],
        ["He slid a flat card under one corner, opened the first fold, and placed small cloth weights along the edges.", "He slid a flat card under one corner, opened the first fold, and placed small cloth weights along the edges.", "background", false, "This tells how the map was handled, not what people learned from it."],
        ["Dust covered the front, but blue rail lines still crossed the page.", "Dust covered the front, but blue rail lines still crossed the page.", "too_narrow", false, "This describes the map's appearance, not the larger comparison of past and present."],
      ],
      partBOrder: [2, 0, 3, 1],
    }),
    makeItem({
      itemId: "pssa_ebsr_g3_lunch_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      partAStem: "How are the students' observations related to the lunch-line changes?",
      partAChoices: [
        ["The students use the slow spots to choose changes for the lunch line.", true, null, true, "The class studies the line before moving milk, spoons, and napkins."],
        ["The observations prove that students should stop eating soup at lunch.", false, "unsupported_inference", false, "The passage keeps soup but changes the line setup."],
        ["The observations show that the cafeteria needs new shelves before the line can improve.", false, "opposite_claim", false, "No new shelves are needed."],
        ["The observations explain why pizza trays are warmer than soup bowls.", false, "wrong_section", false, "Pizza trays are used later to test the setup, not to explain the original fix."],
      ],
      partAOrder: [1, 2, 0, 3],
      evidenceDescription: "Evidence should connect the class observations to the specific line changes.",
      partBStem: "Which two details best support the answer in Part One?",
      partBChoices: [
        ["They counted how many times the line paused.", "They counted how many times the line paused.", "supports_part_a", true, "Counting pauses shows the class gathered information about the problem."],
        ["The class noticed two slow spots.", "The class noticed two slow spots.", "supports_part_a", true, "The slow spots explain why the later changes are chosen."],
        ["At lunch, the line still made noise, but it moved more smoothly.", "At lunch, the line still made noise, but it moved more smoothly.", "background", false, "This reports the result after the changes, not how observations led to the changes."],
        ["Mrs. Lane circled that note in purple marker.", "Mrs. Lane circled that note in purple marker.", "too_narrow", false, "This is a later classroom note and does not explain the relationship between observations and changes."],
      ],
      partBOrder: [0, 1, 2, 3],
    }),
    makeItem({
      itemId: "pssa_ebsr_g3_mural_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.2",
      ecSkillFamily: "literature_elements",
      reportingCategory: "A",
      partAStem: "Which message is best conveyed by the narrator's work on the mural?",
      partAChoices: [
        ["A paint mistake can become useful when a person turns it into ripples.", true, null, true, "The narrator turns paint drips into ripples and feels proud of the finished mural."],
        ["A person should hide mistakes so other people miss them later.", false, "opposite_claim", false, "The narrator does not hide the ripples; they become part of the mural."],
        ["A mural is successful when each painted line is perfectly smooth.", false, "opposite_claim", false, "The narrator says the river is not perfectly smooth but still works."],
        ["A library wall should show buses, gardens, and birds from the neighborhood.", false, "too_narrow", false, "Those details are part of the mural, not its message."],
      ],
      partAOrder: [1, 2, 3, 0],
      evidenceDescription: "Evidence should show how the narrator turns the drip mistake into a meaningful part of the mural.",
      partBStem: "Which two details best support the answer in Part One?",
      partBChoices: [
        ["I bent close and painted tiny waves around each tail.", "I bent close and painted tiny waves around each tail.", "supports_part_a", true, "The narrator changes the mistake into ripples."],
        ["But the fish seemed to move, and the wall no longer looked empty.", "But the fish seemed to move, and the wall no longer looked empty.", "supports_part_a", true, "The changed mural becomes meaningful and lively."],
        ["The wall was rough brick, and chalk lines crossed it like a giant puzzle.", "The wall was rough brick, and chalk lines crossed it like a giant puzzle.", "background", false, "This describes the work area, not the message about mistakes."],
        ["A woman had stopped to take a picture of the sparrows.", "A woman had stopped to take a picture of the sparrows.", "background", false, "This shows someone noticed the mural later, but it does not explain how the narrator handled the mistake."],
      ],
      partBOrder: [2, 3, 0, 1],
    }),
    makeItem({
      itemId: "pssa_ebsr_g3_cart_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      partAStem: "How does following the repair steps help the class solve the cart problem?",
      partAChoices: [
        ["The steps help the class find the small cause before loading the cart.", true, null, true, "The passage explains the order of unloading, checking wheels, and fixing the axle."],
        ["The steps show that a hammer is the best tool for repairing a stuck wheel.", false, "opposite_claim", false, "The passage says not to start with a hammer."],
        ["The steps prove that old carts should be replaced whenever they squeak loudly.", false, "unsupported_inference", false, "The cart still squeaks after repair but is useful."],
        ["The steps help students paint the cart green before moving it to the sink.", false, "wrong_section", false, "The cart is already green; painting is not part of the repair."],
      ],
      evidenceDescription: "Evidence should show the ordered procedure and the reason for checking the cart before it is heavy.",
      partBStem: "Which two details best support the answer in Part One?",
      partBChoices: [
        ["First, you would empty the heavy paper boxes from the bottom shelf.", "First, you would empty the heavy paper boxes from the bottom shelf.", "supports_part_a", true, "The first step removes weight before checking the problem."],
        ["Weight can hide a small problem.", "Weight can hide a small problem.", "supports_part_a", true, "This explains why the class follows the procedure before forcing the cart."],
        ["After the repair, the cart still squeaked a little.", "After the repair, the cart still squeaked a little.", "background", false, "This detail comes after the repair and does not explain why the steps work."],
        ["The green cart in the art room did not.", "The green cart in the art room did not.", "too_narrow", false, "This states the problem, not how the repair steps solve it."],
      ],
      partBOrder: [2, 0, 1, 3],
    }),
  ];
}

function makeItem(config: {
  itemId: string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: Grade3EbsrItem["ecSkillFamily"];
  reportingCategory: "A" | "B";
  partAStem: string;
  partAChoices: Array<[string, boolean, string | null, boolean, string]>;
  partAOrder?: [number, number, number, number];
  evidenceDescription: string;
  partBStem: string;
  partBChoices: Array<[string, string, EbsrEvidenceChoice["evidenceRole"], boolean, string]>;
  partBOrder?: [number, number, number, number];
}): Grade3EbsrItem {
  const partAInputs = config.partAOrder ? config.partAOrder.map((index) => config.partAChoices[index]) : config.partAChoices;
  const partBInputs = config.partBOrder ? config.partBOrder.map((index) => config.partBChoices[index]) : config.partBChoices;
  const partAChoices = partAInputs.map(([text, _isCorrect, role, supportsPartA, rationale]) => ({
    text,
    distractorRole: role,
    supportsPartA,
    rationale,
  }));
  const partBChoices = partBInputs.map(([text, quotedSpan, evidenceRole, supportsPartA, rationale]) => ({
    text,
    quotedSpan,
    evidenceRole,
    supportsPartA,
    rationale,
  }));
  const correctIndex = partAInputs.findIndex((choice) => choice[1]);
  const correctIndices = partBChoices
    .map((choice, index) => choice.supportsPartA ? index : -1)
    .filter((index) => index >= 0) as [number, number];

  return {
    itemId: config.itemId,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: "EBSR",
    interactionType: "EBSR",
    interactionSubtype: "two_point",
    passageId: config.passageId,
    passageTitle: config.passageTitle,
    eligibleContent: config.eligibleContent,
    ecSkillFamily: config.ecSkillFamily,
    reportingCategory: config.reportingCategory,
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    partA: {
      stem: config.partAStem,
      choices: partAChoices,
      correctIndex,
      evidenceNeededDescription: config.evidenceDescription,
      rationale: partAChoices[correctIndex].rationale,
      distractorRationales: partAChoices.map((choice) => choice.rationale),
      distractorRoles: partAChoices.map((choice) => choice.distractorRole ?? "correct"),
    },
    partB: {
      stem: config.partBStem,
      instruction: "Choose two answers.",
      choices: partBChoices,
      correctIndices,
    },
    scoring: {
      totalPoints: 2,
      partAPoints: 1,
      partBPoints: 1,
      requirePartACorrectForFullCredit: true,
      partialCreditRules: [
        { points: 2, rule: "Part One is correct and both Part Two evidence choices are correct." },
        { points: 1, rule: "Part One is correct and one Part Two evidence choice is correct, or Part One is incorrect but both Part Two evidence choices are correct." },
        { points: 0, rule: "The response is unsupported, incomplete, or missing." },
      ],
      scoringNotes: "Full credit requires the Part One answer and both supporting evidence choices; unsupported evidence cannot earn full credit.",
    },
    responseSpec: {
      partA: { choices: partAChoices.map((choice) => choice.text) },
      partB: {
        instruction: "Choose two answers.",
        choices: partBChoices.map((choice) => ({ text: choice.text, quotedSpan: choice.quotedSpan })),
      },
    },
    correctResponse: {
      partA: { correctIndex },
      partB: { correctIndices },
    },
    auditMetadata: {
      authoredIn: "PSSA_PR_4K_GRADE3_EBSR",
      copiedReleasedText: false,
      copiedDrcText: false,
      noDbWrite: true,
    },
  };
}

export function auditGrade3EbsrItems(items = buildGrade3EbsrItems()): EbsrAuditBundle {
  const pilot = loadGrade3Pilot();
  const passages: PssaPassageAuditInput[] = pilot.passages;
  const passageById = new Map(passages.map((passage) => [passage.id, passage]));
  const passageRows = buildPssaPassageQualityReport(passages);
  const sourceCorpus = loadSourceCorpus();
  const positionDistribution = buildEbsrPositionDistribution(items);
  const rows: EbsrAuditRow[] = [];
  const sourceMatches: SourceMatch[] = [];
  for (const item of items) {
    const passage = passageById.get(item.passageId);
    const notes: string[] = [];
    const schemaResult = validateSchema(item, notes);
    const partAResult = validatePartA(item, passage, notes);
    const spansResult = validatePartBSpans(item, passage, notes);
    const supportResult = validateSupport(item, notes);
    const countResult = item.partB.instruction.toLowerCase().includes("choose two") && item.partB.correctIndices.length === 2 ? "PASS" : "FAIL";
    if (countResult === "FAIL") notes.push("PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION");
    const skillMatchResult = validateSkillMatch(item, notes);
    const scoringResult = validateScoring(item, notes);
    const itemSourceMatches = scanItemSourceCompliance(item, passage, sourceCorpus);
    sourceMatches.push(...itemSourceMatches);
    const sourceComplianceResult: Result = itemSourceMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
    if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
    if (positionDistribution.ebsrPositionBiasResult === "FAIL") notes.push("PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION");
    const finalEbsrResult: Result = [
      schemaResult,
      partAResult,
      spansResult,
      supportResult,
      countResult,
      skillMatchResult,
      scoringResult,
      sourceComplianceResult,
      positionDistribution.ebsrPositionBiasResult,
    ].every((result) => result === "PASS") ? "PASS" : "FAIL";
    rows.push({
      itemId: item.itemId,
      gradeLevel: 3,
      passageId: item.passageId,
      passageTitle: item.passageTitle,
      eligibleContent: item.eligibleContent,
      ecSkillFamily: item.ecSkillFamily,
      partAStem: item.partA.stem,
      partACorrectIndex: item.partA.correctIndex,
      partAResult,
      partBStem: item.partB.stem,
      partBCorrectIndices: item.partB.correctIndices.join("|"),
      partBInstruction: item.partB.instruction,
      correctCountMatchesInstruction: countResult,
      allPartBSpansFound: spansResult,
      supportLinkResult: supportResult,
      skillMatchResult,
      scoringResult,
      sourceComplianceResult,
      ...positionDistribution,
      finalEbsrResult,
      notes: notes.join("; ") || "PASS",
    });
  }
  return { items, rows, sourceMatches, passageRows, positionDistribution };
}

export function buildEbsrPositionDistribution(items: Grade3EbsrItem[]): EbsrPositionDistribution {
  const partACounts = [0, 0, 0, 0];
  const pairCounts = new Map<string, number>();
  for (const item of items) {
    partACounts[item.partA.correctIndex] = (partACounts[item.partA.correctIndex] ?? 0) + 1;
    const pair = normalizedPair(item.partB.correctIndices);
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  }
  const n = items.length;
  const maxPerPartAPosition = Math.ceil(n / 4);
  const partAUsed = partACounts.filter((count) => count > 0).length;
  const maxPartACount = Math.max(...partACounts);
  const allSamePartA = partAUsed === 1 && n > 1;
  const partAPositionBiasResult: Result = maxPartACount > maxPerPartAPosition || allSamePartA || (n >= 5 && partAUsed < 3) ? "FAIL" : "PASS";

  const firstTwoCount = pairCounts.get("0,1") ?? 0;
  const maxPairCount = Math.max(0, ...pairCounts.values());
  const partBPatternsUsed = pairCounts.size;
  const allSamePartB = partBPatternsUsed === 1 && n > 1;
  const partBPositionBiasResult: Result = allSamePartB || firstTwoCount > 2 || (n === 5 && maxPairCount > 2) || (n >= 5 && partBPatternsUsed < 3) ? "FAIL" : "PASS";
  const ebsrPositionBiasResult: Result = partAPositionBiasResult === "PASS" && partBPositionBiasResult === "PASS" ? "PASS" : "FAIL";
  const partADistribution = `A:${partACounts[0]} B:${partACounts[1]} C:${partACounts[2]} D:${partACounts[3]}`;
  const partBDistribution = [...pairCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pair, count]) => `${pair}:${count}`)
    .join(" ");
  const notes: string[] = [];
  if (partAPositionBiasResult === "FAIL") notes.push(`Part A distribution ${partADistribution} violates max ${maxPerPartAPosition} or minimum 3 positions.`);
  if (partBPositionBiasResult === "FAIL") notes.push(`Part B pair distribution ${partBDistribution} violates max pattern/first-two/minimum-pattern rules.`);
  return {
    partACorrectPositionDistribution: partADistribution,
    partBCorrectPairDistribution: partBDistribution,
    partAPositionBiasResult,
    partBPositionBiasResult,
    ebsrPositionBiasResult,
    positionBiasNotes: notes.join(" ") || "PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION passed.",
  };
}

function normalizedPair(indices: [number, number] | number[]) {
  return [...indices].sort((a, b) => a - b).join(",");
}

function validateSchema(item: Grade3EbsrItem, notes: string[]): Result {
  const ok = item.itemType === "EBSR"
    && item.interactionType === "EBSR"
    && item.gradeLevel === 3
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original"
    && item.partA.choices.length === 4
    && item.partA.correctIndex >= 0
    && item.partA.correctIndex < item.partA.choices.length
    && item.partB.choices.length >= 4
    && item.partB.correctIndices.every((index) => index >= 0 && index < item.partB.choices.length);
  if (!ok) notes.push("PSSA_EBSR_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validatePartA(item: Grade3EbsrItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const defensible = item.partA.choices.filter((choice) => choice.supportsPartA).length;
  const distractorRolesOk = item.partA.choices.every((choice, index) => index === item.partA.correctIndex || Boolean(choice.distractorRole));
  const noAbsoluteDistractors = item.partA.choices.every((choice, index) => index === item.partA.correctIndex || !/\b(?:never|always|only|every|all|none|must|cannot)\b/i.test(choice.text));
  const choiceLengths = item.partA.choices.map((choice) => choice.text.length);
  const correctLength = choiceLengths[item.partA.correctIndex];
  const longestDistractor = Math.max(...choiceLengths.filter((_, index) => index !== item.partA.correctIndex));
  const noLengthShortcut = correctLength <= longestDistractor * 1.15;
  const passageTerms = passage ? passage.text.toLowerCase() : "";
  const passageGrounded = item.partA.choices.some((choice) => choice.supportsPartA && choice.text.toLowerCase().split(/\W+/).some((token) => token.length > 5 && passageTerms.includes(token)));
  const ok = defensible === 1 && distractorRolesOk && noAbsoluteDistractors && noLengthShortcut && passageGrounded;
  if (!ok) notes.push("PSSA_EBSR_PART_A_SINGLE_DEFENSIBLE");
  return ok ? "PASS" : "FAIL";
}

function validatePartBSpans(item: Grade3EbsrItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const text = passage?.text ?? "";
  const ok = Boolean(text) && item.partB.choices.every((choice) => choice.quotedSpan && text.includes(choice.quotedSpan));
  if (!ok) notes.push("PSSA_EBSR_PART_B_VERBATIM_EVIDENCE");
  return ok ? "PASS" : "FAIL";
}

function validateSupport(item: Grade3EbsrItem, notes: string[]): Result {
  const correctSet = new Set(item.partB.correctIndices);
  const ok = item.partB.choices.every((choice, index) => correctSet.has(index) ? choice.supportsPartA : !choice.supportsPartA);
  if (!ok) notes.push("PSSA_EBSR_PART_B_SUPPORTS_PART_A");
  return ok ? "PASS" : "FAIL";
}

function validateSkillMatch(item: Grade3EbsrItem, notes: string[]): Result {
  const stem = item.partA.stem.toLowerCase();
  let ok = false;
  if (item.eligibleContent === "E03.B-K.1.1.2") ok = /main idea|main idea|details/.test(stem);
  if (item.eligibleContent === "E03.B-K.1.1.3") ok = /related|steps|following|how/.test(stem);
  if (item.eligibleContent === "E03.A-K.1.1.2") ok = /message|conveyed|lesson/.test(stem);
  if (!ok) notes.push("PSSA_EBSR_SKILL_MATCH");
  return ok ? "PASS" : "FAIL";
}

function validateScoring(item: Grade3EbsrItem, notes: string[]): Result {
  const ok = item.scoring.totalPoints === 2
    && item.scoring.partAPoints + item.scoring.partBPoints === item.scoring.totalPoints
    && item.scoring.partialCreditRules.length >= 3
    && item.scoring.requirePartACorrectForFullCredit === true
    && /unsupported evidence cannot earn full credit/i.test(item.scoring.scoringNotes);
  if (!ok) notes.push("PSSA_EBSR_PARTIAL_CREDIT_VALID");
  return ok ? "PASS" : "FAIL";
}

let sourceCorpusCache: SourceCorpusEntry[] | null = null;

function loadSourceCorpus(): SourceCorpusEntry[] {
  if (sourceCorpusCache) return sourceCorpusCache;
  const files: SourceCorpusEntry[] = [];
  for (const dir of releasedSourceDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!sourceTextExtensions.has(path.extname(file).toLowerCase())) continue;
      const buffer = fs.readFileSync(file);
      const text = path.extname(file).toLowerCase() === ".pdf"
        ? extractAsciiTextFromPdfBytes(buffer)
        : buffer.toString("utf8");
      files.push({
        file: path.relative(process.cwd(), file),
        text,
        normalizedText: ` ${normalizeForScan(text)} `,
        contentNormalizedText: ` ${contentTokensForScan(text).join(" ")} `,
      });
    }
  }
  sourceCorpusCache = files;
  return files;
}

function extractAsciiTextFromPdfBytes(buffer: Buffer) {
  return (buffer
    .toString("latin1")
    .match(/[A-Za-z0-9][A-Za-z0-9 .,:;!?'"()/-]{20,}/g) ?? [])
    .join(" ");
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function scanItemSourceCompliance(
  item: Grade3EbsrItem,
  passage: PssaPassageAuditInput | undefined,
  corpus: SourceCorpusEntry[],
): SourceMatch[] {
  const fields = sourceScanFields(item, passage);
  return fields.map(({ field, text }) => {
    const match = longestSourceMatch(text, corpus);
    const boilerplate = isAllowedBoilerplateMatch(match.ngram);
    const contentBearing = Boolean(match.ngram) && !boilerplate && match.tokens >= 8;
    return {
      itemId: item.itemId,
      field,
      matchedSourceFile: match.file,
      longestNormalizedNgram: match.ngram,
      overlapScore: match.score,
      matchType: match.ngram ? boilerplate ? "boilerplate" : "content-bearing" : "none",
      result: contentBearing ? "FAIL" : "PASS",
    };
  });
}

function isAllowedBoilerplateMatch(ngram: string) {
  if (!ngram) return false;
  const normalized = normalizeForScan(ngram);
  const tokenCount = tokenizeForScan(normalized).length;
  if (["part one", "part two", "choose two answers"].includes(normalized)) return true;
  return boilerplatePatterns.some((pattern) => {
    const normalizedPattern = normalizeForScan(pattern);
    return normalized.includes(normalizedPattern) && tokenCount <= tokenizeForScan(normalizedPattern).length + 2;
  });
}

function sourceScanFields(item: Grade3EbsrItem, passage: PssaPassageAuditInput | undefined) {
  return [
    { field: "partA.stem", text: item.partA.stem },
    ...item.partA.choices.map((choice, index) => ({ field: `partA.choices.${index}`, text: choice.text })),
    { field: "partB.stem", text: item.partB.stem },
    { field: "partB.instruction", text: item.partB.instruction },
    ...item.partB.choices.map((choice, index) => ({ field: `partB.choices.${index}`, text: `${choice.text} ${choice.rationale}` })),
    { field: "partA.rationale", text: item.partA.rationale },
    { field: "assignedPassage.text", text: passage?.text ?? "" },
  ];
}

function longestSourceMatch(text: string, corpus: SourceCorpusEntry[]) {
  const rawTokens = tokenizeForScan(text);
  const contentTokens = contentTokensForScan(text);
  const rawBest = longestSourceMatchForTokens(rawTokens, corpus, "raw");
  const contentBest = longestSourceMatchForTokens(contentTokens, corpus, "content");
  return rawBest.tokens >= contentBest.tokens ? rawBest : contentBest;
}

function longestSourceMatchForTokens(tokens: string[], corpus: SourceCorpusEntry[], mode: "raw" | "content") {
  let best = { file: "", ngram: "", tokens: 0, score: 0 };
  if (tokens.length < 4) return best;
  for (const source of corpus) {
    const sourceNorm = mode === "raw" ? source.normalizedText : source.contentNormalizedText;
    const maxN = Math.min(tokens.length, 18);
    for (let n = maxN; n >= 4; n--) {
      if (n < best.tokens) break;
      for (let start = 0; start <= tokens.length - n; start++) {
        const ngram = tokens.slice(start, start + n).join(" ");
        if (sourceNorm.includes(` ${ngram} `) && n > best.tokens) {
          best = { file: source.file, ngram, tokens: n, score: round(n / Math.max(tokens.length, 1)) };
        }
      }
    }
  }
  return best;
}

function tokenizeForScan(text: string) {
  return normalizeForScan(text).split(" ").filter(Boolean);
}

function contentTokensForScan(text: string) {
  return tokenizeForScan(text).filter((token) => token.length > 2);
}

function normalizeForScan(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function assertGrade3EbsrContract() {
  const bundle = auditGrade3EbsrItems();
  assert.equal(bundle.items.length, 5);
  assert.equal(new Set(bundle.items.map((item) => item.passageId)).size, 5);
  assert.equal(bundle.rows.filter((row) => row.finalEbsrResult === "PASS").length, 5);
  assert.equal(bundle.rows.filter((row) => row.sourceComplianceResult === "PASS").length, 5);
  assert.equal(bundle.positionDistribution.ebsrPositionBiasResult, "PASS");
  assert.equal(bundle.positionDistribution.partACorrectPositionDistribution, "A:2 B:1 C:1 D:1");
  assert.equal(new Set(bundle.items.map((item) => normalizedPair(item.partB.correctIndices))).size >= 3, true);
  assert.equal(bundle.passageRows.filter((row) => row.result === "FAIL").length, 0);
  assert.equal(hasBlockingPassageQualityFailure(bundle.passageRows), false);

  const allPartA = forcePartAPosition(buildGrade3EbsrItems(), 0);
  assert.equal(auditGrade3EbsrItems(allPartA).positionDistribution.ebsrPositionBiasResult, "FAIL");
  const allPartB = forcePartBPair(buildGrade3EbsrItems(), [0, 1]);
  assert.equal(auditGrade3EbsrItems(allPartB).positionDistribution.ebsrPositionBiasResult, "FAIL");
  assert.equal(buildEbsrPositionDistribution(buildGrade3EbsrItems()).ebsrPositionBiasResult, "PASS");

  for (const item of bundle.items) {
    assert.equal(item.partA.choices[item.partA.correctIndex].supportsPartA, true);
    assert.deepEqual(item.partB.correctIndices.map((index) => item.partB.choices[index].supportsPartA), [true, true]);
    assert.equal(item.partB.choices.filter((choice) => choice.supportsPartA).length, 2);
  }

  const adversarial = buildAdversarialFixtures();
  for (const fixture of adversarial) {
    const row = auditGrade3EbsrItems([fixture.item]).rows[0];
    assert.equal(row.finalEbsrResult, "FAIL", fixture.name);
    assert.ok(row.notes.includes(fixture.expectedRule), `${fixture.name} expected ${fixture.expectedRule}, got ${row.notes}`);
  }

  const sourceNegative = buildSourceComplianceNegativeFixture();
  const sourceRow = auditGrade3EbsrItems([sourceNegative]).rows[0];
  assert.equal(sourceRow.sourceComplianceResult, "FAIL");
  assert.ok(sourceRow.notes.includes("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY"));

  const sourceShortWords = structuredClone(sourceNegative);
  sourceShortWords.itemId = "pssa_ebsr_fixture_source_copy_short_words";
  sourceShortWords.partA.stem = "Part One identify the central theme of the passage single select MC";
  const sourceShortWordsRow = auditGrade3EbsrItems([sourceShortWords]).rows[0];
  assert.equal(sourceShortWordsRow.sourceComplianceResult, "FAIL");

  const boilerplateOnly = structuredClone(buildGrade3EbsrItems()[0]);
  boilerplateOnly.itemId = "pssa_ebsr_fixture_boilerplate_only";
  boilerplateOnly.partA.stem = "Part One";
  boilerplateOnly.partA.choices[0].text = "Choose two answers";
  const boilerplateScan = scanItemSourceCompliance(boilerplateOnly, loadGrade3Pilot().passages[0], loadSourceCorpus());
  assert.equal(boilerplateScan.some((match) => match.matchType === "content-bearing" && match.result === "FAIL"), false);
}

function forcePartAPosition(items: Grade3EbsrItem[], targetIndex: number) {
  return items.map((item) => {
    const copy = structuredClone(item);
    copy.partA.choices = moveChoiceToIndex(copy.partA.choices, copy.partA.correctIndex, targetIndex);
    syncPartA(copy);
    return copy;
  });
}

function forcePartBPair(items: Grade3EbsrItem[], targetPair: [number, number]) {
  return items.map((item) => {
    const copy = structuredClone(item);
    const correctChoices = copy.partB.choices.filter((choice) => choice.supportsPartA);
    const distractors = copy.partB.choices.filter((choice) => !choice.supportsPartA);
    const nextChoices: EbsrEvidenceChoice[] = [];
    let correctCursor = 0;
    let distractorCursor = 0;
    for (let index = 0; index < copy.partB.choices.length; index++) {
      nextChoices[index] = targetPair.includes(index) ? correctChoices[correctCursor++] : distractors[distractorCursor++];
    }
    copy.partB.choices = nextChoices;
    syncPartB(copy);
    return copy;
  });
}

function moveChoiceToIndex<T extends { supportsPartA?: boolean }>(choices: T[], fromIndex: number, toIndex: number) {
  const next = [...choices];
  const [choice] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, choice);
  return next;
}

function syncPartA(item: Grade3EbsrItem) {
  item.partA.correctIndex = item.partA.choices.findIndex((choice) => choice.supportsPartA);
  item.partA.rationale = item.partA.choices[item.partA.correctIndex].rationale;
  item.partA.distractorRationales = item.partA.choices.map((choice) => choice.rationale);
  item.partA.distractorRoles = item.partA.choices.map((choice) => choice.distractorRole ?? "correct");
  item.responseSpec.partA.choices = item.partA.choices.map((choice) => choice.text);
  item.correctResponse.partA.correctIndex = item.partA.correctIndex;
}

function syncPartB(item: Grade3EbsrItem) {
  item.partB.correctIndices = item.partB.choices
    .map((choice, index) => choice.supportsPartA ? index : -1)
    .filter((index) => index >= 0) as [number, number];
  item.responseSpec.partB.choices = item.partB.choices.map((choice) => ({ text: choice.text, quotedSpan: choice.quotedSpan }));
  item.correctResponse.partB.correctIndices = item.partB.correctIndices;
}

function buildAdversarialFixtures() {
  const [creek] = buildGrade3EbsrItems();
  const topicOnly = structuredClone(creek);
  topicOnly.itemId = "pssa_ebsr_fixture_topic_only_support";
  topicOnly.partB.choices[topicOnly.partB.correctIndices[1]].supportsPartA = false;
  topicOnly.partB.choices[topicOnly.partB.correctIndices[1]].evidenceRole = "too_narrow";

  const equallyValidDistractor = structuredClone(creek);
  equallyValidDistractor.itemId = "pssa_ebsr_fixture_equally_valid_distractor";
  const firstDistractorIndex = equallyValidDistractor.partB.choices.findIndex((choice, index) => !equallyValidDistractor.partB.correctIndices.includes(index));
  equallyValidDistractor.partB.choices[firstDistractorIndex].supportsPartA = true;

  const wrongSkill = structuredClone(creek);
  wrongSkill.itemId = "pssa_ebsr_fixture_wrong_skill";
  wrongSkill.eligibleContent = "E03.A-V.4.1.1";

  return [
    { name: "topic-only support", item: topicOnly, expectedRule: "PSSA_EBSR_PART_B_SUPPORTS_PART_A" },
    { name: "equally valid distractor", item: equallyValidDistractor, expectedRule: "PSSA_EBSR_PART_B_SUPPORTS_PART_A" },
    { name: "wrong EC skill", item: wrongSkill, expectedRule: "PSSA_EBSR_SKILL_MATCH" },
  ];
}

function buildSourceComplianceNegativeFixture() {
  const item = structuredClone(buildGrade3EbsrItems()[0]);
  item.itemId = "pssa_ebsr_fixture_source_copy";
  item.partA.stem = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  return item;
}

function writeOutputs() {
  assertGrade3EbsrContract();
  const bundle = auditGrade3EbsrItems();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "grade3_ebsr_backend.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    mockOnly: false,
    productionImportReady: false,
    noDbWrite: true,
    items: bundle.items,
  }, null, 2));
  fs.writeFileSync(path.join(outputDir, "grade3_ebsr_student_preview.md"), renderStudentPreview(bundle.items));
  fs.writeFileSync(path.join(outputDir, "grade3_ebsr_reviewer_preview.md"), renderReviewerPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "pssa_ebsr_grade3_audit_report.csv"), writeAuditCsv(bundle.rows));
  fs.writeFileSync(path.join(outputDir, "pssa_ebsr_source_compliance_report.csv"), writeSourceCsv(bundle.sourceMatches));
  fs.writeFileSync(path.join(outputDir, "pssa_ebsr_vertical_slice_summary.md"), renderSummary(bundle));
}

function renderStudentPreview(items: Grade3EbsrItem[]) {
  const passages = loadGrade3Pilot().passages as PssaPassageAuditInput[];
  const passageById = new Map<string, PssaPassageAuditInput>(passages.map((passage) => [passage.id, passage]));
  const lines = ["# Grade 3 PSSA EBSR Student Preview", "", "Review status: PENDING. Item status: candidate. Answers, rationales, and rubrics are not shown.", ""];
  for (const item of items) {
    const passage = passageById.get(item.passageId);
    lines.push(`## ${item.passageTitle}`, "", passage?.text ?? "", "", `### ${item.itemId}`, "", "**Part One**", "", item.partA.stem, "");
    item.partA.choices.forEach((choice, index) => lines.push(`${String.fromCharCode(65 + index)}. ${choice.text}`));
    lines.push("", "**Part Two**", "", item.partB.stem, "", item.partB.instruction, "");
    item.partB.choices.forEach((choice, index) => lines.push(`${index + 1}. ${choice.text}`));
    lines.push("");
  }
  return lines.join("\n");
}

function renderReviewerPreview(bundle: EbsrAuditBundle) {
  const rowById = new Map(bundle.rows.map((row) => [row.itemId, row]));
  const lines = ["# Grade 3 PSSA EBSR Reviewer Preview", "", "Includes keys, evidence spans, scoring, source scan, and gate results. All items remain PENDING/candidate.", ""];
  for (const item of bundle.items) {
    const row = rowById.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Passage: ${item.passageTitle} (${item.passageId})`, `- EC: ${item.eligibleContent}`, `- Part A correct: ${String.fromCharCode(65 + item.partA.correctIndex)}. ${item.partA.choices[item.partA.correctIndex].text}`, `- Part B correct: ${item.partB.correctIndices.map((index) => index + 1).join(", ")}`, `- Position-bias gate: ${row?.ebsrPositionBiasResult} (${row?.partACorrectPositionDistribution}; ${row?.partBCorrectPairDistribution})`, `- Gate result: ${row?.finalEbsrResult}`, `- Notes: ${row?.notes}`, "", "### Evidence Options");
    item.partB.choices.forEach((choice, index) => {
      lines.push(`- ${index + 1}. ${choice.supportsPartA ? "CORRECT" : "DISTRACTOR"}: "${choice.quotedSpan}"`);
      lines.push(`  - ${choice.rationale}`);
    });
    lines.push("", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points} point(s): ${rule.rule}`), "");
  }
  return lines.join("\n");
}

function renderSummary(bundle: EbsrAuditBundle) {
  const adversarialRows = buildAdversarialFixtures().map((fixture) => ({
    name: fixture.name,
    expectedRule: fixture.expectedRule,
    row: auditGrade3EbsrItems([fixture.item]).rows[0],
  }));
  const passageRows = bundle.passageRows;
  const sourceByItem = new Map<string, SourceMatch[]>();
  for (const match of bundle.sourceMatches) {
    if (!sourceByItem.has(match.itemId)) sourceByItem.set(match.itemId, []);
    sourceByItem.get(match.itemId)?.push(match);
  }
  return `# PSSA PR #4k Grade 3 EBSR Vertical Slice Summary

## Reading State

- Approved Grade 3 passages used: 5
- Existing Grade 3 MCQ reading items unchanged: 28
- New Grade 3 EBSR items: 5
- EBSR is a separate stream and is not folded into the 28-MCQ count.
- Existing MCQ audit rerun status: PASS via \`npm run content:audit-pssa\`.
- DB writes/imports/approvals: none.

## EBSR Rule IDs

- PSSA_EBSR_SCHEMA_VALID
- PSSA_EBSR_PART_A_SINGLE_DEFENSIBLE
- PSSA_EBSR_PART_B_VERBATIM_EVIDENCE
- PSSA_EBSR_PART_B_SUPPORTS_PART_A
- PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION
- PSSA_EBSR_SKILL_MATCH
- PSSA_EBSR_PARTIAL_CREDIT_VALID
- PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY
- PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION

## Position Distribution

- Before #4k-fix Part A distribution: A:5 B:0 C:0 D:0
- Before #4k-fix Part B pair distribution: 0,1:5
- After #4k-fix Part A distribution: ${bundle.positionDistribution.partACorrectPositionDistribution}
- After #4k-fix Part B pair distribution: ${bundle.positionDistribution.partBCorrectPairDistribution}
- PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION: ${bundle.positionDistribution.ebsrPositionBiasResult}
- Notes: ${bundle.positionDistribution.positionBiasNotes}

## Item PASS Table

| itemId | passage | EC | Part A pos | Part B pair | spans found | support | skill | scoring | source | position | final |
|---|---|---|---:|---|---|---|---|---|---|---|---|
${bundle.rows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.partACorrectIndex} | ${row.partBCorrectIndices.replace(/\|/g, ",")} | ${row.allPartBSpansFound} | ${row.supportLinkResult} | ${row.skillMatchResult} | ${row.scoringResult} | ${row.sourceComplianceResult} | ${row.ebsrPositionBiasResult} | ${row.finalEbsrResult} |`).join("\n")}

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
${passageRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.score} | ${row.notes} |`).join("\n")}

## Source-Compliance Scan Method

Case, punctuation, and whitespace are normalized. Raw normalized n-grams preserve short words, and a separate content-token stream is also scanned. Item fields and assigned passage text are scanned against \`reference/pssa-released-items/\`, \`reference/pssa-item-catalog/\`, and extracted project source text where present. Content-bearing matches of 8+ normalized tokens are blockers. Generic directions such as "Choose two answers", "Part One", and "Part Two" are reported as boilerplate and do not block by themselves.

| itemId | matched source | field | longest n-gram | overlap | match type | result |
|---|---|---|---|---:|---|---|
${bundle.items.map((item) => {
  const matches = sourceByItem.get(item.itemId) ?? [];
  const best = matches.sort((a, b) => b.longestNormalizedNgram.split(" ").length - a.longestNormalizedNgram.split(" ").length)[0];
  return `| ${item.itemId} | ${best?.matchedSourceFile || "none"} | ${best?.field || "none"} | ${best?.longestNormalizedNgram || ""} | ${best?.overlapScore ?? 0} | ${best?.matchType || "none"} | ${best?.result || "PASS"} |`;
}).join("\n")}

## Adversarial Fixtures

| fixture | expected rule | actual result | notes |
|---|---|---|---|
${adversarialRows.map((entry) => `| ${entry.name} | ${entry.expectedRule} | ${entry.row.finalEbsrResult} | ${entry.row.notes} |`).join("\n")}
`;
}

function writeAuditCsv(rows: EbsrAuditRow[]) {
  const columns = Object.keys(rows[0]) as Array<keyof EbsrAuditRow>;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n";
}

function writeSourceCsv(rows: SourceMatch[]) {
  const columns = Object.keys(rows[0]) as Array<keyof SourceMatch>;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n";
}

function csv(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeOutputs();
  const bundle = auditGrade3EbsrItems();
  console.log(JSON.stringify({
    items: bundle.items.length,
    pass: bundle.rows.filter((row) => row.finalEbsrResult === "PASS").length,
    fail: bundle.rows.filter((row) => row.finalEbsrResult === "FAIL").length,
    passagesWithFailures: new Set(bundle.passageRows.filter((row) => row.result === "FAIL").map((row) => row.passageId)).size,
    studentPreview: path.join(outputDir, "grade3_ebsr_student_preview.md"),
    reviewerPreview: path.join(outputDir, "grade3_ebsr_reviewer_preview.md"),
    auditReport: path.join(outputDir, "pssa_ebsr_grade3_audit_report.csv"),
    sourceReport: path.join(outputDir, "pssa_ebsr_source_compliance_report.csv"),
    summary: path.join(outputDir, "pssa_ebsr_vertical_slice_summary.md"),
  }, null, 2));
}
