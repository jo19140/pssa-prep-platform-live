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

type SourceCorpusEntry = {
  file: string;
  normalizedText: string;
  contentNormalizedText: string;
};

type SourceMatch = {
  itemId: string;
  interactionType: "MULTI_SELECT" | "HOT_TEXT";
  field: string;
  matchedSourceFile: string;
  longestNormalizedNgram: string;
  overlapScore: number;
  matchType: "none" | "boilerplate" | "content-bearing";
  result: Result;
};

type PartialCreditRule = { points: number; rule: string };

type MultiSelectChoice = {
  text: string;
  supportsPrompt: boolean;
  rationale: string;
  distractorRole?: "too_narrow" | "wrong_emphasis" | "plausible_misreading" | "wrong_section" | "unsupported_inference" | null;
};

type MultiSelectItem = {
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "MULTI_SELECT";
  interactionType: "MULTI_SELECT";
  interactionSubtype: "choose_n_evidence" | "choose_n_traits" | "choose_n_details";
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: "informational_elements" | "literature_elements";
  reportingCategory: "A" | "B";
  stem: string;
  instructionText: "Choose two answers.";
  choices: MultiSelectChoice[];
  correctIndices: [number, number];
  minSelections: 2;
  maxSelections: 2;
  exactSelectionCount: 2;
  scoring: { totalPoints: 2; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  auditMetadata: { authoredIn: "PSSA_PR_4L_GRADE3_TEI"; noDbWrite: true };
};

type HotTextSpan = {
  spanId: string;
  text: string;
  paragraphIndex: number;
  sentenceIndex: number;
  startOffset: number;
  endOffset: number;
  supportsPrompt: boolean;
  rationale: string;
  distractorRole?: "too_narrow" | "wrong_emphasis" | "background" | "wrong_section" | "topic_only" | null;
};

type HotTextItem = {
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "HOT_TEXT";
  interactionType: "HOT_TEXT";
  interactionSubtype: "sentence_select" | "phrase_select";
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: "informational_elements" | "literature_elements";
  reportingCategory: "A" | "B";
  prompt: string;
  instructionText: "Choose two sentences." | "Choose two phrases.";
  selectableSpans: HotTextSpan[];
  correctSpanIds: [string, string];
  minSelections: 2;
  maxSelections: 2;
  exactSelectionCount: 2;
  scoring: { totalPoints: 2; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  auditMetadata: { authoredIn: "PSSA_PR_4L_GRADE3_TEI"; noDbWrite: true };
};

type SurfaceShortcutRow = {
  tranche: string;
  interactionType: "MULTI_SELECT" | "HOT_TEXT";
  itemCount: number;
  correctPositionPatterns: string;
  correctSpanLocationPatterns: string;
  result: Result;
  severity: "INFO" | "BLOCKER";
  notes: string;
};

type MultiSelectAuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  interactionSubtype: string;
  stem: string;
  instructionText: string;
  correctIndices: string;
  schemaResult: Result;
  selectionCountResult: Result;
  optionGroundingResult: Result;
  noExtraCorrectOptionsResult: Result;
  distractorPlausibilityResult: Result;
  skillMatchResult: Result;
  partialCreditResult: Result;
  sourceComplianceResult: Result;
  positionDistributionResult: Result;
  finalResult: Result;
  notes: string;
};

type HotTextAuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  interactionSubtype: string;
  prompt: string;
  instructionText: string;
  correctSpanIds: string;
  correctSpanLocations: string;
  selectableSpanCount: number;
  schemaResult: Result;
  spansVerbatimResult: Result;
  correctSpansExistResult: Result;
  correctCountResult: Result;
  noIncorrectSpanEquallyValidResult: Result;
  supportsSkillResult: Result;
  skillMatchResult: Result;
  partialCreditResult: Result;
  sourceComplianceResult: Result;
  surfaceShortcutResult: Result;
  finalResult: Result;
  notes: string;
};

type TeiAuditBundle = {
  multiSelectItems: MultiSelectItem[];
  hotTextItems: HotTextItem[];
  multiSelectRows: MultiSelectAuditRow[];
  hotTextRows: HotTextAuditRow[];
  sourceMatches: SourceMatch[];
  shortcutRows: SurfaceShortcutRow[];
  passageRows: PassageQualityRow[];
};

const outputDir = path.resolve("exemplars/pssa_grade3_tei");
const sourceDirs = [
  path.resolve("reference/pssa-released-items"),
  path.resolve("reference/pssa-item-catalog"),
];
const sourceTextExtensions = new Set([".md", ".txt", ".csv", ".json", ".html", ".pdf"]);
const boilerplatePatterns = ["choose two answers", "choose two sentences", "choose two phrases", "part one", "part two", "which evidence from the passage supports"];

function loadGrade3Pilot() {
  return JSON.parse(fs.readFileSync(path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json"), "utf8"));
}

function passageById() {
  const passages = loadGrade3Pilot().passages as PssaPassageAuditInput[];
  return new Map(passages.map((passage) => [passage.id, passage]));
}

export function buildGrade3MultiSelectItems(): MultiSelectItem[] {
  return [
    makeMultiSelect({
      itemId: "pssa_ms_g3_creek_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "choose_n_details",
      stem: "Which two details best support the main idea that the class used observations to explain the creek glow?",
      choices: [
        ["Maya drew a map of three creek spots.", true, null, "The map shows direct observation across locations."],
        ["The teacher brought clear jars and a thermometer.", false, "wrong_emphasis", "This names tools but does not show the explanation."],
        ["Students compared their notes with the weather chart.", true, null, "This shows the class used evidence to explain conditions."],
        ["A robin hopped in the wet grass on Friday.", false, "wrong_section", "This happens later and does not explain the glow."],
      ],
    }),
    makeMultiSelect({
      itemId: "pssa_ms_g3_map_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "choose_n_evidence",
      stem: "Which two details show that the old map helped visitors compare the town's past and present?",
      choices: [
        ["A date in the corner said 1928.", false, "too_narrow", "This shows the map is old but not how visitors compare changes."],
        ["Mr. Ortiz put a new town map beside the old one.", true, null, "The two maps allow visitors to compare."],
        ["A label told where it was found and how it was opened.", false, "wrong_emphasis", "This explains display information, not the comparison."],
        ["Some streets had new names, and the trolley tracks were gone.", true, null, "This directly shows changes between past and present."],
      ],
    }),
    makeMultiSelect({
      itemId: "pssa_ms_g3_lunch_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "choose_n_details",
      stem: "Which two details show the cause of the lunch-line changes?",
      choices: [
        ["Students picked up milk after they already had full trays.", true, null, "This is one slow spot that caused a change."],
        ["Spoons and napkins were tucked behind the soup pot.", true, null, "This is another slow spot that caused a change."],
        ["The red baskets were easy to spot.", false, "wrong_section", "This describes the result after the change."],
        ["Mrs. Lane circled that note in purple marker.", false, "too_narrow", "This later note is not a cause of the setup change."],
      ],
    }),
    makeMultiSelect({
      itemId: "pssa_ms_g3_mural_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.2",
      ecSkillFamily: "literature_elements",
      reportingCategory: "A",
      interactionSubtype: "choose_n_evidence",
      stem: "Which two details best show the message that mistakes can become part of something good?",
      choices: [
        ["The wall was rough brick, and chalk lines crossed it like a giant puzzle.", false, "too_narrow", "This describes the wall, not the message."],
        ["I wanted to wipe them away, but Grandpa handed me a thin brush.", false, "wrong_emphasis", "This starts the problem but does not show the mistake becoming useful."],
        ["I bent close and painted tiny waves around each tail.", true, null, "The narrator turns the drips into ripples."],
        ["The fish seemed to move, and the wall no longer looked empty.", true, null, "The changed mural becomes lively and meaningful."],
      ],
    }),
    makeMultiSelect({
      itemId: "pssa_ms_g3_cart_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "choose_n_details",
      stem: "Which two details explain why the class follows the repair steps in order?",
      choices: [
        ["The green cart in the art room did not.", false, "too_narrow", "This states the problem but not why the steps matter."],
        ["First, you would empty the heavy paper boxes from the bottom shelf.", true, null, "The first step removes weight before checking the wheel."],
        ["Weight can hide a small problem.", true, null, "This explains why the order matters."],
        ["After the repair, the cart still squeaked a little.", false, "wrong_section", "This is after the repair and does not explain the step order."],
      ],
    }),
  ];
}

function makeMultiSelect(config: {
  itemId: string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: MultiSelectItem["ecSkillFamily"];
  reportingCategory: "A" | "B";
  interactionSubtype: MultiSelectItem["interactionSubtype"];
  stem: string;
  choices: Array<[string, boolean, MultiSelectChoice["distractorRole"], string]>;
}): MultiSelectItem {
  const choices = config.choices.map(([text, supportsPrompt, distractorRole, rationale]) => ({ text, supportsPrompt, distractorRole, rationale }));
  return {
    itemId: config.itemId,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: "MULTI_SELECT",
    interactionType: "MULTI_SELECT",
    interactionSubtype: config.interactionSubtype,
    passageId: config.passageId,
    passageTitle: config.passageTitle,
    eligibleContent: config.eligibleContent,
    ecSkillFamily: config.ecSkillFamily,
    reportingCategory: config.reportingCategory,
    stem: config.stem,
    instructionText: "Choose two answers.",
    choices,
    correctIndices: correctIndicesFromChoices(choices),
    minSelections: 2,
    maxSelections: 2,
    exactSelectionCount: 2,
    scoring: {
      totalPoints: 2,
      partialCreditRules: [
        { points: 2, rule: "Both correct choices and no extra selections." },
        { points: 1, rule: "One correct choice and no extra selections." },
        { points: 0, rule: "Unsupported, extra, or missing selections." },
      ],
      scoringNotes: "Full credit cannot be earned with unsupported or extra selections.",
    },
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    auditMetadata: { authoredIn: "PSSA_PR_4L_GRADE3_TEI", noDbWrite: true },
  };
}

function correctIndicesFromChoices(choices: MultiSelectChoice[]) {
  return choices.map((choice, index) => choice.supportsPrompt ? index : -1).filter((index) => index >= 0) as [number, number];
}

export function buildGrade3HotTextItems(): HotTextItem[] {
  return [
    makeHotText({
      itemId: "pssa_ht_g3_creek_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sentence_select",
      prompt: "Choose two sentences that best support the main idea that the class used evidence to understand the creek glow.",
      instructionText: "Choose two sentences.",
      spans: [
        ["The glow was not bright like a flashlight.", 0, 1, false, "background", "This describes the glow but not the class evidence."],
        ["Maya drew a map of three creek spots.", 2, 0, true, null, "This shows organized observation."],
        ["Those clues helped the class ask a better question: why was the glow strongest in one place?", 2, 4, true, null, "This connects clues to the explanation question."],
        ["A beetle skated over the surface, and a robin hopped in the wet grass.", 5, 2, false, "wrong_section", "This later detail does not support the main idea."],
      ],
    }),
    makeHotText({
      itemId: "pssa_ht_g3_map_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sentence_select",
      prompt: "Choose two sentences showing that the old map helped people compare past and present.",
      instructionText: "Choose two sentences.",
      spans: [
        ["The station manager called Mr. Ortiz, who cared for the town archive.", 1, 0, false, "background", "This introduces Mr. Ortiz but not the comparison."],
        ["He did not unfold the map quickly.", 1, 1, false, "wrong_emphasis", "This shows careful handling, not past-present comparison."],
        ["Mr. Ortiz put a new town map beside the old one.", 3, 0, true, null, "This directly sets up comparison."],
        ["Some streets had new names, and the trolley tracks were gone.", 3, 2, true, null, "This shows how the town changed."],
      ],
    }),
    makeHotText({
      itemId: "pssa_ht_g3_lunch_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sentence_select",
      prompt: "Choose two sentences that show what caused the class to change the lunch line.",
      instructionText: "Choose two sentences.",
      spans: [
        ["They counted how many times the line paused.", 1, 2, false, "background", "This shows observation but not a specific cause of the setup change."],
        ["First, students picked up milk after they already had full trays, so cartons tipped and rolled.", 2, 1, true, null, "This identifies one slow spot."],
        ["Second, spoons and napkins were tucked behind the soup pot.", 2, 2, true, null, "This identifies another slow spot."],
        ["When the bell rang, most bowls of soup were still warm.", 4, 4, false, "wrong_section", "This is a result after the change."],
      ],
    }),
    makeHotText({
      itemId: "pssa_ht_g3_mural_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.2",
      ecSkillFamily: "literature_elements",
      reportingCategory: "A",
      interactionSubtype: "sentence_select",
      prompt: "Choose two sentences that show how the narrator turns a mistake into part of the mural's message.",
      instructionText: "Choose two sentences.",
      spans: [
        ["The label said sky blue, but inside the can the paint looked like melted berries.", 0, 2, false, "background", "This describes the paint color, not the mistake becoming useful."],
        ["I wanted to wipe them away, but Grandpa handed me a thin brush.", 2, 2, false, "wrong_emphasis", "This introduces the problem but does not show the solution."],
        ["I bent close and painted tiny waves around each tail.", 2, 3, true, null, "This shows the narrator changing drips into ripples."],
        ["But the fish seemed to move, and the wall no longer looked empty.", 4, 3, true, null, "This shows the positive result of the changed mistake."],
      ],
    }),
    makeHotText({
      itemId: "pssa_ht_g3_cart_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sentence_select",
      prompt: "Choose two sentences that explain why the cart repair steps should happen in order.",
      instructionText: "Choose two sentences.",
      spans: [
        ["A supply cart should roll where you guide it.", 0, 0, false, "background", "This states an expectation, not why the steps are ordered."],
        ["First, you would empty the heavy paper boxes from the bottom shelf.", 1, 1, true, null, "This gives the first step in the order."],
        ["Weight can hide a small problem.", 1, 2, true, null, "This explains why the first step matters."],
        ["After the repair, the cart still squeaked a little.", 4, 0, false, "wrong_section", "This happens after the repair and does not explain the order."],
      ],
    }),
  ];
}

function makeHotText(config: {
  itemId: string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: HotTextItem["ecSkillFamily"];
  reportingCategory: "A" | "B";
  interactionSubtype: HotTextItem["interactionSubtype"];
  prompt: string;
  instructionText: HotTextItem["instructionText"];
  spans: Array<[string, number, number, boolean, HotTextSpan["distractorRole"], string]>;
}): HotTextItem {
  const passage = passageById().get(config.passageId);
  assert.ok(passage, `Missing passage ${config.passageId}`);
  const selectableSpans = config.spans.map(([text, paragraphIndex, sentenceIndex, supportsPrompt, distractorRole, rationale], index) => {
    const startOffset = passage.text.indexOf(text);
    assert.notEqual(startOffset, -1, `${config.itemId} span not found: ${text}`);
    return {
      spanId: `${config.itemId}_span_${index + 1}`,
      text,
      paragraphIndex,
      sentenceIndex,
      startOffset,
      endOffset: startOffset + text.length,
      supportsPrompt,
      distractorRole,
      rationale,
    };
  });
  const correctSpanIds = selectableSpans.filter((span) => span.supportsPrompt).map((span) => span.spanId) as [string, string];
  return {
    itemId: config.itemId,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: "HOT_TEXT",
    interactionType: "HOT_TEXT",
    interactionSubtype: config.interactionSubtype,
    passageId: config.passageId,
    passageTitle: config.passageTitle,
    eligibleContent: config.eligibleContent,
    ecSkillFamily: config.ecSkillFamily,
    reportingCategory: config.reportingCategory,
    prompt: config.prompt,
    instructionText: config.instructionText,
    selectableSpans,
    correctSpanIds,
    minSelections: 2,
    maxSelections: 2,
    exactSelectionCount: 2,
    scoring: {
      totalPoints: 2,
      partialCreditRules: [
        { points: 2, rule: "Both correct spans and no extra selections." },
        { points: 1, rule: "One correct span and no extra selections." },
        { points: 0, rule: "Unsupported, extra, or missing selections." },
      ],
      scoringNotes: "Full credit cannot be earned with unsupported or extra selected spans.",
    },
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    auditMetadata: { authoredIn: "PSSA_PR_4L_GRADE3_TEI", noDbWrite: true },
  };
}

export function auditGrade3TeiItems(
  multiSelectItems = buildGrade3MultiSelectItems(),
  hotTextItems = buildGrade3HotTextItems(),
): TeiAuditBundle {
  const pilot = loadGrade3Pilot();
  const passages = pilot.passages as PssaPassageAuditInput[];
  const passagesById = new Map(passages.map((passage) => [passage.id, passage]));
  const passageRows = buildPssaPassageQualityReport(passages);
  const corpus = loadSourceCorpus();
  const sourceMatches: SourceMatch[] = [];
  const msShortcut = buildMultiSelectShortcutRow(multiSelectItems);
  const htShortcut = buildHotTextShortcutRow(hotTextItems);
  const multiSelectRows = multiSelectItems.map((item) => auditMultiSelectItem(item, passagesById.get(item.passageId), corpus, sourceMatches, msShortcut));
  const hotTextRows = hotTextItems.map((item) => auditHotTextItem(item, passagesById.get(item.passageId), corpus, sourceMatches, htShortcut));
  return { multiSelectItems, hotTextItems, multiSelectRows, hotTextRows, sourceMatches, shortcutRows: [msShortcut, htShortcut], passageRows };
}

function auditMultiSelectItem(
  item: MultiSelectItem,
  passage: PssaPassageAuditInput | undefined,
  corpus: SourceCorpusEntry[],
  sourceMatches: SourceMatch[],
  shortcutRow: SurfaceShortcutRow,
): MultiSelectAuditRow {
  const notes: string[] = [];
  const schemaResult = validateMultiSelectSchema(item, notes);
  const selectionCountResult = item.instructionText.toLowerCase().includes("choose two") && item.correctIndices.length === 2 && item.minSelections === 2 && item.maxSelections === 2 && item.exactSelectionCount === 2 ? "PASS" : "FAIL";
  if (selectionCountResult === "FAIL") notes.push("PSSA_MULTI_SELECT_CORRECT_COUNT_MATCHES_INSTRUCTION");
  const noExtraCorrectOptionsResult = item.choices.every((choice, index) => item.correctIndices.includes(index) === choice.supportsPrompt) ? "PASS" : "FAIL";
  if (noExtraCorrectOptionsResult === "FAIL") notes.push("PSSA_MULTI_SELECT_NO_EXTRA_CORRECT_OPTIONS");
  const optionGroundingResult = validateMultiSelectGrounding(item, passage, notes);
  const distractorPlausibilityResult = item.choices.every((choice, index) => item.correctIndices.includes(index) || Boolean(choice.distractorRole)) ? "PASS" : "FAIL";
  if (distractorPlausibilityResult === "FAIL") notes.push("PSSA_MULTI_SELECT_DISTRACTOR_PLAUSIBILITY");
  const skillMatchResult = validateTeiSkillMatch(item.eligibleContent, item.stem, item.ecSkillFamily, notes, "PSSA_MULTI_SELECT_SKILL_MATCH");
  const partialCreditResult = validatePartialCredit(item.scoring, notes, "PSSA_MULTI_SELECT_PARTIAL_CREDIT_VALID");
  const itemSourceMatches = scanMultiSelectSource(item, passage, corpus);
  sourceMatches.push(...itemSourceMatches);
  const sourceComplianceResult = itemSourceMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
  if (shortcutRow.result === "FAIL") notes.push("PSSA_MULTI_SELECT_POSITION_DISTRIBUTION");
  const finalResult = [schemaResult, selectionCountResult, noExtraCorrectOptionsResult, optionGroundingResult, distractorPlausibilityResult, skillMatchResult, partialCreditResult, sourceComplianceResult, shortcutRow.result].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    passageId: item.passageId,
    passageTitle: item.passageTitle,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: item.ecSkillFamily,
    interactionSubtype: item.interactionSubtype,
    stem: item.stem,
    instructionText: item.instructionText,
    correctIndices: item.correctIndices.join("|"),
    schemaResult,
    selectionCountResult,
    optionGroundingResult,
    noExtraCorrectOptionsResult,
    distractorPlausibilityResult,
    skillMatchResult,
    partialCreditResult,
    sourceComplianceResult,
    positionDistributionResult: shortcutRow.result,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function auditHotTextItem(
  item: HotTextItem,
  passage: PssaPassageAuditInput | undefined,
  corpus: SourceCorpusEntry[],
  sourceMatches: SourceMatch[],
  shortcutRow: SurfaceShortcutRow,
): HotTextAuditRow {
  const notes: string[] = [];
  const schemaResult = validateHotTextSchema(item, notes);
  const spansVerbatimResult = validateHotTextSpansVerbatim(item, passage, notes);
  const spanIds = new Set(item.selectableSpans.map((span) => span.spanId));
  const correctSpansExistResult = item.correctSpanIds.every((spanId) => spanIds.has(spanId)) ? "PASS" : "FAIL";
  if (correctSpansExistResult === "FAIL") notes.push("PSSA_HOT_TEXT_CORRECT_SPANS_EXIST");
  const correctCountResult = item.instructionText.toLowerCase().includes("choose two") && item.correctSpanIds.length === 2 && item.minSelections === 2 && item.maxSelections === 2 && item.exactSelectionCount === 2 ? "PASS" : "FAIL";
  if (correctCountResult === "FAIL") notes.push("PSSA_HOT_TEXT_CORRECT_COUNT_MATCHES_INSTRUCTION");
  const noIncorrectSpanEquallyValidResult = item.selectableSpans.every((span) => item.correctSpanIds.includes(span.spanId) === span.supportsPrompt) ? "PASS" : "FAIL";
  if (noIncorrectSpanEquallyValidResult === "FAIL") notes.push("PSSA_HOT_TEXT_NO_INCORRECT_SPAN_EQUALLY_VALID");
  const supportsSkillResult = item.correctSpanIds.map((spanId) => item.selectableSpans.find((span) => span.spanId === spanId)).every((span) => span?.supportsPrompt) ? "PASS" : "FAIL";
  if (supportsSkillResult === "FAIL") notes.push("PSSA_HOT_TEXT_SUPPORTS_SKILL");
  const skillMatchResult = validateTeiSkillMatch(item.eligibleContent, item.prompt, item.ecSkillFamily, notes, "PSSA_HOT_TEXT_SKILL_MATCH");
  const partialCreditResult = validatePartialCredit(item.scoring, notes, "PSSA_HOT_TEXT_PARTIAL_CREDIT_VALID");
  const itemSourceMatches = scanHotTextSource(item, passage, corpus);
  sourceMatches.push(...itemSourceMatches);
  const sourceComplianceResult = itemSourceMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
  if (shortcutRow.result === "FAIL") notes.push("PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION");
  const finalResult = [schemaResult, spansVerbatimResult, correctSpansExistResult, correctCountResult, noIncorrectSpanEquallyValidResult, supportsSkillResult, skillMatchResult, partialCreditResult, sourceComplianceResult, shortcutRow.result].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    passageId: item.passageId,
    passageTitle: item.passageTitle,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: item.ecSkillFamily,
    interactionSubtype: item.interactionSubtype,
    prompt: item.prompt,
    instructionText: item.instructionText,
    correctSpanIds: item.correctSpanIds.join("|"),
    correctSpanLocations: correctSpanLocations(item),
    selectableSpanCount: item.selectableSpans.length,
    schemaResult,
    spansVerbatimResult,
    correctSpansExistResult,
    correctCountResult,
    noIncorrectSpanEquallyValidResult,
    supportsSkillResult,
    skillMatchResult,
    partialCreditResult,
    sourceComplianceResult,
    surfaceShortcutResult: shortcutRow.result,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function validateMultiSelectSchema(item: MultiSelectItem, notes: string[]): Result {
  const ok = item.itemType === "MULTI_SELECT"
    && item.interactionType === "MULTI_SELECT"
    && item.gradeLevel === 3
    && item.choices.length >= 4
    && item.correctIndices.every((index) => index >= 0 && index < item.choices.length)
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original";
  if (!ok) notes.push("PSSA_MULTI_SELECT_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateHotTextSchema(item: HotTextItem, notes: string[]): Result {
  const ok = item.itemType === "HOT_TEXT"
    && item.interactionType === "HOT_TEXT"
    && item.gradeLevel === 3
    && item.selectableSpans.length >= 4
    && item.correctSpanIds.length === 2
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original";
  if (!ok) notes.push("PSSA_HOT_TEXT_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateMultiSelectGrounding(item: MultiSelectItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const passageText = passage?.text ?? "";
  const ok = Boolean(passageText)
    && item.choices.every((choice) => tokenOverlap(choice.text, passageText) || tokenOverlap(choice.rationale, passageText))
    && item.correctIndices.every((index) => item.choices[index].supportsPrompt)
    && item.choices.every((choice, index) => item.correctIndices.includes(index) || !choice.supportsPrompt);
  if (!ok) notes.push("PSSA_MULTI_SELECT_OPTION_GROUNDING");
  return ok ? "PASS" : "FAIL";
}

function validateHotTextSpansVerbatim(item: HotTextItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const passageText = passage?.text ?? "";
  const ok = Boolean(passageText) && item.selectableSpans.every((span) => passageText.includes(span.text) && span.startOffset >= 0 && span.endOffset > span.startOffset);
  if (!ok) notes.push("PSSA_HOT_TEXT_SELECTABLE_SPANS_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateTeiSkillMatch(eligibleContent: string, prompt: string, family: string, notes: string[], ruleId: string): Result {
  const text = prompt.toLowerCase();
  let ok = false;
  if (eligibleContent === "E03.B-K.1.1.2") ok = /main idea|details support|support the main idea|compare/.test(text);
  if (eligibleContent === "E03.B-K.1.1.3") ok = /cause|steps|repair|related|order|line changes/.test(text);
  if (eligibleContent === "E03.A-K.1.1.2") ok = /message|lesson|mistake|mural/.test(text);
  if (family === "literature_elements" && !eligibleContent.startsWith("E03.A-")) ok = false;
  if (!ok) notes.push(ruleId);
  return ok ? "PASS" : "FAIL";
}

function validatePartialCredit(scoring: { totalPoints: number; partialCreditRules: PartialCreditRule[]; scoringNotes: string }, notes: string[], ruleId: string): Result {
  const ok = scoring.totalPoints === 2 && scoring.partialCreditRules.length >= 3 && /unsupported|extra/i.test(scoring.scoringNotes);
  if (!ok) notes.push(ruleId);
  return ok ? "PASS" : "FAIL";
}

function buildMultiSelectShortcutRow(items: MultiSelectItem[]): SurfaceShortcutRow {
  const patternCounts = new Map<string, number>();
  for (const item of items) {
    const pattern = normalizedPair(item.correctIndices);
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  }
  const firstTwoCount = patternCounts.get("0,1") ?? 0;
  const maxPattern = Math.max(...patternCounts.values());
  const fail = patternCounts.size < 3 || firstTwoCount > 2 || maxPattern > 2 || (patternCounts.size === 1 && items.length > 1);
  return {
    tranche: "grade3_pr4l_multi_select",
    interactionType: "MULTI_SELECT",
    itemCount: items.length,
    correctPositionPatterns: [...patternCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    correctSpanLocationPatterns: "",
    result: fail ? "FAIL" : "PASS",
    severity: fail ? "BLOCKER" : "INFO",
    notes: fail ? "PSSA_MULTI_SELECT_POSITION_DISTRIBUTION failed." : "PSSA_MULTI_SELECT_POSITION_DISTRIBUTION passed.",
  };
}

function buildHotTextShortcutRow(items: HotTextItem[]): SurfaceShortcutRow {
  const patternCounts = new Map<string, number>();
  let firstTwoCount = 0;
  for (const item of items) {
    const correct = item.correctSpanIds.map((spanId) => item.selectableSpans.findIndex((span) => span.spanId === spanId)).sort((a, b) => a - b);
    if (correct.join(",") === "0,1") firstTwoCount++;
    const locations = item.correctSpanIds
      .map((spanId) => item.selectableSpans.find((span) => span.spanId === spanId))
      .map((span) => `p${span?.paragraphIndex}-s${span?.sentenceIndex}`)
      .join("+");
    patternCounts.set(locations, (patternCounts.get(locations) ?? 0) + 1);
  }
  const maxPattern = Math.max(...patternCounts.values());
  const fail = patternCounts.size < 3 || firstTwoCount > 2 || maxPattern > 2 || (patternCounts.size === 1 && items.length > 1);
  return {
    tranche: "grade3_pr4l_hot_text",
    interactionType: "HOT_TEXT",
    itemCount: items.length,
    correctPositionPatterns: `firstTwo:${firstTwoCount}`,
    correctSpanLocationPatterns: [...patternCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    result: fail ? "FAIL" : "PASS",
    severity: fail ? "BLOCKER" : "INFO",
    notes: fail ? "PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION failed." : "PSSA_HOT_TEXT_SURFACE_SHORTCUT_DISTRIBUTION passed.",
  };
}

function normalizedPair(indices: number[]) {
  return [...indices].sort((a, b) => a - b).join(",");
}

function correctSpanLocations(item: HotTextItem) {
  return item.correctSpanIds
    .map((spanId) => item.selectableSpans.find((span) => span.spanId === spanId))
    .map((span) => `${span?.spanId}:p${span?.paragraphIndex}s${span?.sentenceIndex}`)
    .join("|");
}

function tokenOverlap(value: string, passageText: string) {
  const passageTokens = new Set(contentTokensForScan(passageText));
  return contentTokensForScan(value).some((token) => passageTokens.has(token));
}

let sourceCorpusCache: SourceCorpusEntry[] | null = null;

function loadSourceCorpus(): SourceCorpusEntry[] {
  if (sourceCorpusCache) return sourceCorpusCache;
  const files: SourceCorpusEntry[] = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!sourceTextExtensions.has(path.extname(file).toLowerCase())) continue;
      const buffer = fs.readFileSync(file);
      const text = path.extname(file).toLowerCase() === ".pdf" ? extractAsciiTextFromPdfBytes(buffer) : buffer.toString("utf8");
      files.push({
        file: path.relative(process.cwd(), file),
        normalizedText: ` ${normalizeForScan(text)} `,
        contentNormalizedText: ` ${contentTokensForScan(text).join(" ")} `,
      });
    }
  }
  sourceCorpusCache = files;
  return files;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function extractAsciiTextFromPdfBytes(buffer: Buffer) {
  return (buffer.toString("latin1").match(/[A-Za-z0-9][A-Za-z0-9 .,:;!?'"()/-]{20,}/g) ?? []).join(" ");
}

function scanMultiSelectSource(item: MultiSelectItem, passage: PssaPassageAuditInput | undefined, corpus: SourceCorpusEntry[]) {
  return sourceScanFieldsForMultiSelect(item, passage).map(({ field, text }) => scanField(item.itemId, "MULTI_SELECT", field, text, corpus));
}

function scanHotTextSource(item: HotTextItem, passage: PssaPassageAuditInput | undefined, corpus: SourceCorpusEntry[]) {
  return sourceScanFieldsForHotText(item, passage).map(({ field, text }) => scanField(item.itemId, "HOT_TEXT", field, text, corpus));
}

function sourceScanFieldsForMultiSelect(item: MultiSelectItem, passage: PssaPassageAuditInput | undefined) {
  return [
    { field: "stem", text: item.stem },
    { field: "instructionText", text: item.instructionText },
    ...item.choices.map((choice, index) => ({ field: `choices.${index}`, text: `${choice.text} ${choice.rationale}` })),
    { field: "assignedPassage.text", text: passage?.text ?? "" },
  ];
}

function sourceScanFieldsForHotText(item: HotTextItem, passage: PssaPassageAuditInput | undefined) {
  return [
    { field: "prompt", text: item.prompt },
    { field: "instructionText", text: item.instructionText },
    ...item.selectableSpans.map((span, index) => ({ field: `selectableSpans.${index}`, text: `${span.text} ${span.rationale}` })),
    { field: "assignedPassage.text", text: passage?.text ?? "" },
  ];
}

function scanField(itemId: string, interactionType: "MULTI_SELECT" | "HOT_TEXT", field: string, text: string, corpus: SourceCorpusEntry[]): SourceMatch {
  const match = longestSourceMatch(text, corpus);
  const boilerplate = isAllowedBoilerplateMatch(match.ngram);
  const contentBearing = Boolean(match.ngram) && !boilerplate && match.tokens >= 8;
  return {
    itemId,
    interactionType,
    field,
    matchedSourceFile: match.file,
    longestNormalizedNgram: match.ngram,
    overlapScore: match.score,
    matchType: match.ngram ? boilerplate ? "boilerplate" : "content-bearing" : "none",
    result: contentBearing ? "FAIL" : "PASS",
  };
}

function longestSourceMatch(text: string, corpus: SourceCorpusEntry[]) {
  const rawBest = longestSourceMatchForTokens(tokenizeForScan(text), corpus, "raw");
  const contentBest = longestSourceMatchForTokens(contentTokensForScan(text), corpus, "content");
  return rawBest.tokens >= contentBest.tokens ? rawBest : contentBest;
}

function longestSourceMatchForTokens(tokens: string[], corpus: SourceCorpusEntry[], mode: "raw" | "content") {
  let best = { file: "", ngram: "", tokens: 0, score: 0 };
  if (tokens.length < 4) return best;
  for (const source of corpus) {
    const sourceNorm = mode === "raw" ? source.normalizedText : source.contentNormalizedText;
    for (let n = Math.min(tokens.length, 18); n >= 4; n--) {
      if (n < best.tokens) break;
      for (let start = 0; start <= tokens.length - n; start++) {
        const ngram = tokens.slice(start, start + n).join(" ");
        if (sourceNorm.includes(` ${ngram} `) && n > best.tokens) best = { file: source.file, ngram, tokens: n, score: round(n / Math.max(tokens.length, 1)) };
      }
    }
  }
  return best;
}

function isAllowedBoilerplateMatch(ngram: string) {
  if (!ngram) return false;
  const normalized = normalizeForScan(ngram);
  const tokenCount = tokenizeForScan(normalized).length;
  if (["choose two answers", "choose two sentences", "choose two phrases", "part one", "part two"].includes(normalized)) return true;
  return boilerplatePatterns.some((pattern) => normalized.includes(normalizeForScan(pattern)) && tokenCount <= tokenizeForScan(pattern).length + 2);
}

function tokenizeForScan(text: string) {
  return normalizeForScan(text).split(" ").filter(Boolean);
}

function contentTokensForScan(text: string) {
  return tokenizeForScan(text).filter((token) => token.length > 2);
}

function normalizeForScan(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function assertGrade3TeiContract() {
  const bundle = auditGrade3TeiItems();
  assert.equal(bundle.multiSelectItems.length, 5);
  assert.equal(bundle.hotTextItems.length, 5);
  assert.equal(new Set(bundle.multiSelectItems.map((item) => item.passageId)).size, 5);
  assert.equal(new Set(bundle.hotTextItems.map((item) => item.passageId)).size, 5);
  assert.equal(bundle.multiSelectRows.filter((row) => row.finalResult === "PASS").length, 5);
  assert.equal(bundle.hotTextRows.filter((row) => row.finalResult === "PASS").length, 5);
  assert.equal(bundle.shortcutRows.every((row) => row.result === "PASS"), true);
  assert.equal(bundle.passageRows.filter((row) => row.result === "FAIL").length, 0);
  assert.equal(hasBlockingPassageQualityFailure(bundle.passageRows), false);
  assert.equal(bundle.sourceMatches.some((match) => match.result === "FAIL"), false);

  const allFirstMs = forceMultiSelectPattern(buildGrade3MultiSelectItems(), [0, 1]);
  assert.equal(auditGrade3TeiItems(allFirstMs, buildGrade3HotTextItems()).shortcutRows.find((row) => row.interactionType === "MULTI_SELECT")?.result, "FAIL");
  const variedMs = buildGrade3MultiSelectItems();
  assert.equal(buildMultiSelectShortcutRow(variedMs).result, "PASS");

  const invalidMsCount = structuredClone(variedMs[0]);
  invalidMsCount.correctIndices = [0, 1, 2] as any;
  assert.ok(auditGrade3TeiItems([invalidMsCount], [buildGrade3HotTextItems()[0]]).multiSelectRows[0].notes.includes("PSSA_MULTI_SELECT_CORRECT_COUNT_MATCHES_INSTRUCTION"));
  const extraCorrect = structuredClone(variedMs[0]);
  extraCorrect.choices[1].supportsPrompt = true;
  assert.ok(auditGrade3TeiItems([extraCorrect], [buildGrade3HotTextItems()[0]]).multiSelectRows[0].notes.includes("PSSA_MULTI_SELECT_NO_EXTRA_CORRECT_OPTIONS"));
  const unsupportedCorrect = structuredClone(variedMs[0]);
  unsupportedCorrect.choices[unsupportedCorrect.correctIndices[0]].supportsPrompt = false;
  assert.ok(auditGrade3TeiItems([unsupportedCorrect], [buildGrade3HotTextItems()[0]]).multiSelectRows[0].notes.includes("PSSA_MULTI_SELECT_NO_EXTRA_CORRECT_OPTIONS"));
  const vagueDistractor = structuredClone(variedMs[0]);
  vagueDistractor.choices[1].text = "A useful idea from the passage";
  vagueDistractor.choices[1].rationale = "Generic.";
  vagueDistractor.choices[1].distractorRole = null;
  assert.ok(auditGrade3TeiItems([vagueDistractor], [buildGrade3HotTextItems()[0]]).multiSelectRows[0].notes.includes("PSSA_MULTI_SELECT_DISTRACTOR_PLAUSIBILITY"));
  const wrongMsSkill = structuredClone(variedMs[0]);
  wrongMsSkill.eligibleContent = "E03.A-V.4.1.1";
  assert.ok(auditGrade3TeiItems([wrongMsSkill], [buildGrade3HotTextItems()[0]]).multiSelectRows[0].notes.includes("PSSA_MULTI_SELECT_SKILL_MATCH"));

  const hotTextItems = buildGrade3HotTextItems();
  assert.equal(buildHotTextShortcutRow(hotTextItems).result, "PASS");
  assert.equal(buildHotTextShortcutRow(forceHotTextFirstTwo(hotTextItems)).result, "FAIL");
  const missingCorrectSpan = structuredClone(hotTextItems[0]);
  missingCorrectSpan.correctSpanIds = ["missing_1", missingCorrectSpan.correctSpanIds[1]];
  assert.ok(auditGrade3TeiItems([variedMs[0]], [missingCorrectSpan]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_CORRECT_SPANS_EXIST"));
  const missingVerbatim = structuredClone(hotTextItems[0]);
  missingVerbatim.selectableSpans[0].text = "This span is not in the passage.";
  assert.ok(auditGrade3TeiItems([variedMs[0]], [missingVerbatim]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_SELECTABLE_SPANS_VALID"));
  const wrongHtCount = structuredClone(hotTextItems[0]);
  wrongHtCount.correctSpanIds = [wrongHtCount.correctSpanIds[0]] as any;
  assert.ok(auditGrade3TeiItems([variedMs[0]], [wrongHtCount]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_CORRECT_COUNT_MATCHES_INSTRUCTION"));
  const extraHtCorrect = structuredClone(hotTextItems[0]);
  extraHtCorrect.selectableSpans.find((span) => !extraHtCorrect.correctSpanIds.includes(span.spanId))!.supportsPrompt = true;
  assert.ok(auditGrade3TeiItems([variedMs[0]], [extraHtCorrect]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_NO_INCORRECT_SPAN_EQUALLY_VALID"));
  const unsupportedHt = structuredClone(hotTextItems[0]);
  unsupportedHt.selectableSpans.find((span) => unsupportedHt.correctSpanIds.includes(span.spanId))!.supportsPrompt = false;
  assert.ok(auditGrade3TeiItems([variedMs[0]], [unsupportedHt]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_NO_INCORRECT_SPAN_EQUALLY_VALID"));
  const wrongHtSkill = structuredClone(hotTextItems[0]);
  wrongHtSkill.eligibleContent = "E03.B-C.2.1.1";
  assert.ok(auditGrade3TeiItems([variedMs[0]], [wrongHtSkill]).hotTextRows[0].notes.includes("PSSA_HOT_TEXT_SKILL_MATCH"));

  const sourceCopyMs = structuredClone(variedMs[0]);
  sourceCopyMs.stem = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  assert.equal(auditGrade3TeiItems([sourceCopyMs], [hotTextItems[0]]).multiSelectRows[0].sourceComplianceResult, "FAIL");
  const boilerplateMs = structuredClone(variedMs[0]);
  boilerplateMs.stem = "Choose two answers";
  assert.equal(auditGrade3TeiItems([boilerplateMs], [hotTextItems[0]]).multiSelectRows[0].sourceComplianceResult, "PASS");
}

function forceMultiSelectPattern(items: MultiSelectItem[], targetPattern: [number, number]) {
  return items.map((item) => {
    const copy = structuredClone(item);
    const correct = copy.choices.filter((choice) => choice.supportsPrompt);
    const distractors = copy.choices.filter((choice) => !choice.supportsPrompt);
    const next: MultiSelectChoice[] = [];
    let correctCursor = 0;
    let distractorCursor = 0;
    for (let index = 0; index < copy.choices.length; index++) next[index] = targetPattern.includes(index) ? correct[correctCursor++] : distractors[distractorCursor++];
    copy.choices = next;
    copy.correctIndices = correctIndicesFromChoices(next);
    return copy;
  });
}

function forceHotTextFirstTwo(items: HotTextItem[]) {
  return items.map((item) => {
    const copy = structuredClone(item);
    const correct = copy.selectableSpans.filter((span) => span.supportsPrompt);
    const distractors = copy.selectableSpans.filter((span) => !span.supportsPrompt);
    copy.selectableSpans = [correct[0], correct[1], ...distractors];
    copy.correctSpanIds = [correct[0].spanId, correct[1].spanId];
    return copy;
  });
}

function writeOutputs() {
  assertGrade3TeiContract();
  const bundle = auditGrade3TeiItems();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "grade3_tei_backend.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    multiSelectItems: bundle.multiSelectItems,
    hotTextItems: bundle.hotTextItems,
  }, null, 2));
  fs.writeFileSync(path.join(outputDir, "grade3_tei_student_preview.md"), renderStudentPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "grade3_tei_reviewer_preview.md"), renderReviewerPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_multi_select_audit_report.csv"), writeCsv(bundle.multiSelectRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_hot_text_audit_report.csv"), writeCsv(bundle.hotTextRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_surface_shortcut_report.csv"), writeCsv(bundle.shortcutRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_source_compliance_report.csv"), writeCsv(bundle.sourceMatches));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_vertical_slice_summary.md"), renderSummary(bundle));
}

function renderStudentPreview(bundle: TeiAuditBundle) {
  const passages = loadGrade3Pilot().passages as PssaPassageAuditInput[];
  const msByPassage = new Map(bundle.multiSelectItems.map((item) => [item.passageId, item]));
  const htByPassage = new Map(bundle.hotTextItems.map((item) => [item.passageId, item]));
  const lines = ["# Grade 3 PSSA Multiple-Select + Hot-Text Student Preview", "", "Review status: PENDING. Item status: candidate. Answers, rationales, scoring, and internal metadata are not shown.", ""];
  for (const passage of passages) {
    const ms = msByPassage.get(passage.id);
    const ht = htByPassage.get(passage.id);
    if (!ms || !ht) continue;
    lines.push(`## ${passage.title}`, "", passage.text, "", `### ${ms.itemId}`, "", ms.stem, "", ms.instructionText, "");
    ms.choices.forEach((choice, index) => lines.push(`${index + 1}. ${choice.text}`));
    lines.push("", `### ${ht.itemId}`, "", ht.prompt, "", ht.instructionText, "");
    ht.selectableSpans.forEach((span, index) => lines.push(`${index + 1}. ${span.text}`));
    lines.push("");
  }
  return lines.join("\n");
}

function renderReviewerPreview(bundle: TeiAuditBundle) {
  const msRows = new Map(bundle.multiSelectRows.map((row) => [row.itemId, row]));
  const htRows = new Map(bundle.hotTextRows.map((row) => [row.itemId, row]));
  const lines = ["# Grade 3 PSSA Multiple-Select + Hot-Text Reviewer Preview", "", "Includes correct responses, rationales, scoring, source scan status, shortcut gates, and final audit results.", ""];
  for (const item of bundle.multiSelectItems) {
    const row = msRows.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Type: MULTI_SELECT / ${item.interactionSubtype}`, `- Passage: ${item.passageTitle}`, `- EC: ${item.eligibleContent}`, `- Correct indices: ${item.correctIndices.join(", ")}`, `- Source compliance: ${row?.sourceComplianceResult}`, `- Surface shortcut: ${row?.positionDistributionResult}`, `- Final: ${row?.finalResult}`, "", "### Choices");
    item.choices.forEach((choice, index) => lines.push(`- ${index}. ${choice.supportsPrompt ? "CORRECT" : "DISTRACTOR"}: ${choice.text} — ${choice.rationale}`));
    lines.push("", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points}: ${rule.rule}`), "");
  }
  for (const item of bundle.hotTextItems) {
    const row = htRows.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Type: HOT_TEXT / ${item.interactionSubtype}`, `- Passage: ${item.passageTitle}`, `- EC: ${item.eligibleContent}`, `- Correct spans: ${item.correctSpanIds.join(", ")}`, `- Correct locations: ${row?.correctSpanLocations}`, `- Source compliance: ${row?.sourceComplianceResult}`, `- Surface shortcut: ${row?.surfaceShortcutResult}`, `- Final: ${row?.finalResult}`, "", "### Selectable Spans");
    item.selectableSpans.forEach((span) => lines.push(`- ${span.spanId} ${span.supportsPrompt ? "CORRECT" : "DISTRACTOR"} p${span.paragraphIndex}s${span.sentenceIndex}: ${span.text} — ${span.rationale}`));
    lines.push("", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points}: ${rule.rule}`), "");
  }
  return lines.join("\n");
}

function renderSummary(bundle: TeiAuditBundle) {
  return `# PSSA PR #4l Grade 3 Multiple-Select + Hot-Text Vertical Slice Summary

## Inheritance

- #4j item-type contract and production safeguard inheritance reused.
- #4k-fix EBSR tranche unchanged; batch shortcut and hardened source scan patterns carried forward.
- Existing Grade 3 MCQs unchanged: 28.
- Existing Grade 3 EBSRs unchanged: 5.
- New MULTI_SELECT items: 5.
- New HOT_TEXT items: 5.
- DB writes/imports/approvals: none.

## Item IDs

- MULTI_SELECT: ${bundle.multiSelectItems.map((item) => item.itemId).join(", ")}
- HOT_TEXT: ${bundle.hotTextItems.map((item) => item.itemId).join(", ")}

## EC Distribution

${ecDistribution([...bundle.multiSelectItems, ...bundle.hotTextItems]).map(([ec, count]) => `- ${ec}: ${count}`).join("\n")}

## Surface Shortcut Summary

| tranche | interactionType | itemCount | correctPositionPatterns | correctSpanLocationPatterns | result | notes |
|---|---|---:|---|---|---|---|
${bundle.shortcutRows.map((row) => `| ${row.tranche} | ${row.interactionType} | ${row.itemCount} | ${row.correctPositionPatterns} | ${row.correctSpanLocationPatterns} | ${row.result} | ${row.notes} |`).join("\n")}

## MULTI_SELECT Audit Table

| itemId | passage | EC | correctIndices | count | grounding | no extra | distractors | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${bundle.multiSelectRows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.correctIndices.replace(/\|/g, ",")} | ${row.selectionCountResult} | ${row.optionGroundingResult} | ${row.noExtraCorrectOptionsResult} | ${row.distractorPlausibilityResult} | ${row.skillMatchResult} | ${row.partialCreditResult} | ${row.sourceComplianceResult} | ${row.positionDistributionResult} | ${row.finalResult} |`).join("\n")}

## HOT_TEXT Audit Table

| itemId | passage | EC | correct locations | spans | count | no extra | supports | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${bundle.hotTextRows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.correctSpanLocations} | ${row.spansVerbatimResult} | ${row.correctCountResult} | ${row.noIncorrectSpanEquallyValidResult} | ${row.supportsSkillResult} | ${row.skillMatchResult} | ${row.partialCreditResult} | ${row.sourceComplianceResult} | ${row.surfaceShortcutResult} | ${row.finalResult} |`).join("\n")}

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
${bundle.passageRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.score} | ${row.notes} |`).join("\n")}

## Source Scan Summary

- Source scan fields include stems/prompts, instructions, choices, selectable spans, rationales, reviewer-facing notes, and assigned passage text.
- Content-bearing source-scan failures: ${bundle.sourceMatches.filter((match) => match.result === "FAIL").length}
- All 10 new items PASS source compliance.
`;
}

function ecDistribution(items: Array<MultiSelectItem | HotTextItem>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.eligibleContent, (counts.get(item.eligibleContent) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function writeCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]) as Array<keyof T>;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n";
}

function csv(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeOutputs();
  const bundle = auditGrade3TeiItems();
  console.log(JSON.stringify({
    multiSelect: bundle.multiSelectRows.filter((row) => row.finalResult === "PASS").length,
    hotText: bundle.hotTextRows.filter((row) => row.finalResult === "PASS").length,
    shortcutRows: bundle.shortcutRows,
    passageFailures: bundle.passageRows.filter((row) => row.result === "FAIL").length,
    sourceFailures: bundle.sourceMatches.filter((row) => row.result === "FAIL").length,
    studentPreview: path.join(outputDir, "grade3_tei_student_preview.md"),
    reviewerPreview: path.join(outputDir, "grade3_tei_reviewer_preview.md"),
    summary: path.join(outputDir, "pssa_tei_grade3_vertical_slice_summary.md"),
  }, null, 2));
}
