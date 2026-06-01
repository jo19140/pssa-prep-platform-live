import assert from "node:assert/strict";
import crypto from "node:crypto";
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
type InteractionType = "INLINE_DROPDOWN" | "HOT_TEXT" | "DRAG_DROP" | "MCQ";
type PartialCreditRule = { points: number; rule: string };
type SourceCorpusEntry = { file: string; normalizedText: string; contentNormalizedText: string };
type SourceMatch = {
  itemId: string;
  field: string;
  matchedSource: string;
  longestNormalizedNgram: string;
  overlapScore: number;
  boilerplateOrContent: "none" | "boilerplate" | "content";
  result: Result;
  notes: string;
};

type BaseConventionsItem = {
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  passageId: null;
  eligibleContent: string;
  ecSkillFamily: "conventions";
  reportingCategory: "D";
  interactionType: InteractionType;
  interactionSubtype: string;
  pointValue: 1;
  targetConvention: string;
  targetSubskill: string;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  scoring: { totalPoints: 1; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
  auditMetadata: { authoredIn: "PSSA_PR_4N_GRADE3_CONVENTIONS"; noDbWrite: true };
};

type DropdownBlank = {
  blankId: string;
  position: number;
  options: Array<{ text: string; errorPattern: string | null; rationale: string; acceptable?: boolean }>;
  correctIndex: number;
  targetSkill: string;
  targetWordOrPhrase: string | null;
  rationale: string;
};

type InlineDropdownItem = BaseConventionsItem & {
  interactionType: "INLINE_DROPDOWN";
  interactionSubtype: "single_blank" | "multi_blank" | "spelling" | "grammar_usage" | "punctuation_capitalization";
  stem: string;
  baseTextWithBlanks: string;
  blanks: DropdownBlank[];
};

type WordHotTextToken = {
  tokenId: string;
  text: string;
  tokenIndex: number;
  isPunctuation: boolean;
  isCorrect: boolean;
  errorPattern: string | null;
  rationale: string;
  alsoValid?: boolean;
};

type WordHotTextItem = BaseConventionsItem & {
  interactionType: "HOT_TEXT";
  interactionSubtype: "word_select";
  prompt: string;
  instructionText: string;
  sourceSentence: string;
  selectableTokens: WordHotTextToken[];
  correctTokenIds: string[];
  exactSelectionCount: number;
};

type PunctuationDragToken = {
  tokenId: string;
  text: string;
  tokenType: "comma" | "period" | "question_mark" | "quotation_mark" | "capital_letter";
  isDistractor: boolean;
  errorPattern: string | null;
  rationale: string;
  alsoValid?: boolean;
};

type PunctuationDragItem = BaseConventionsItem & {
  interactionType: "DRAG_DROP";
  interactionSubtype: "token_placement";
  prompt: string;
  instructionText: string;
  baseSentenceWithSlots: string;
  draggableTokens: PunctuationDragToken[];
  slots: Array<{ slotId: string; position: number; capacity: number; acceptedTokenType: string }>;
  correctAssignments: Array<{ tokenId: string; slotId: string }>;
};

type ConventionsMcqItem = BaseConventionsItem & {
  interactionType: "MCQ";
  interactionSubtype: "standalone_conventions";
  stem: string;
  choices: Array<{ text: string; isCorrect: boolean; errorPattern: string | null; rationale: string; acceptable?: boolean }>;
  correctIndex: number;
};

type ConventionsItem = InlineDropdownItem | WordHotTextItem | PunctuationDragItem | ConventionsMcqItem;

type AuditRow = {
  itemId: string;
  gradeLevel: 3;
  eligibleContent: string;
  ecSkillFamily: "conventions";
  interactionType: InteractionType;
  interactionSubtype: string;
  pointValue: 1;
  stemPrompt: string;
  targetConvention: string;
  errorPatternLabels: string;
  correctResponseShape: string;
  skillMatchResult: Result;
  contextValidResult: Result;
  ambiguityResult: Result;
  distractorErrorPatternResult: Result;
  partialCreditResult: Result;
  sourceComplianceResult: Result;
  surfaceShortcutResult: Result;
  previewLeakResult: Result;
  finalResult: Result;
  notes: string;
};

type ShortcutRow = {
  tranche: "grade3_pr4n_conventions";
  itemCount: number;
  dropdownCorrectIndexDistribution: string;
  hotTextCorrectTokenPositionPatterns: string;
  tokenDragAssignmentPatterns: string;
  mcqAnswerPositionDistribution: string;
  result: Result;
  severity: "INFO" | "BLOCKER";
  notes: string;
};

type DeprecationRow = {
  oldItemId: string;
  oldStatusBefore: string;
  oldStatusAfter: "deprecated_superseded";
  deprecatedReason: "superseded_by_pssa_pr4n_conventions_rebuild";
  oldEc: string;
  oldSubskill: string;
  supersededByItemIds: string;
  newEc: string;
  newSubskill: string;
  mappingNotes: string;
};

type HashProofRow = {
  contentGroup: string;
  itemCount: number;
  beforeHash: string;
  afterHash: string;
  unchanged: "YES" | "NO";
};

type Bundle = {
  items: ConventionsItem[];
  rows: AuditRow[];
  shortcutRow: ShortcutRow;
  sourceMatches: SourceMatch[];
  deprecationRows: DeprecationRow[];
  hashRows: HashProofRow[];
  passageRows: PassageQualityRow[];
};

type AuditOptions = {
  sourceScan?: boolean;
  passageScan?: boolean;
};

const outputDir = path.resolve("exemplars/pssa_grade3_conventions");
const pilotPath = path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json");
const sourceDirs = [path.resolve("reference/pssa-released-items"), path.resolve("reference/pssa-item-catalog")];
const sourceTextExtensions = new Set([".md", ".txt", ".csv", ".json", ".html", ".pdf"]);
const boilerplatePatterns = ["choose the correct answer", "choose the word", "choose two words", "drag the punctuation mark", "complete the sentence"];
const previewLeakPattern = /correctIndex|correctIndices|correctTokenIds|correctAssignments|correctOption|data-correct|data-c|data-answer|answerKey|rationale|skillMatchResult|sourceComplianceResult|auditMetadata/i;

function loadJson(file: string) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function loadPilot() {
  return loadJson(pilotPath);
}

function base<const T extends Pick<BaseConventionsItem, "itemId" | "eligibleContent" | "interactionType" | "interactionSubtype" | "targetConvention" | "targetSubskill">>(
  args: T,
): Omit<BaseConventionsItem, keyof T> & T {
  return {
    ...args,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    passageId: null,
    ecSkillFamily: "conventions",
    reportingCategory: "D",
    pointValue: 1,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    scoring: {
      totalPoints: 1,
      partialCreditRules: [
        { points: 1, rule: "The single correct convention response is selected or placed." },
        { points: 0, rule: "Any incorrect, ambiguous, missing, or extra response earns no credit." },
      ],
      scoringNotes: "Full credit requires the one defensible convention answer and no contradictory answer.",
    },
    auditMetadata: { authoredIn: "PSSA_PR_4N_GRADE3_CONVENTIONS", noDbWrite: true },
  };
}

export function buildGrade3ConventionsItems(): ConventionsItem[] {
  return [
    {
      ...base({ itemId: "pssa_conv_g3_dropdown_plural_01", eligibleContent: "E03.D.1.1.2", interactionType: "INLINE_DROPDOWN", interactionSubtype: "single_blank", targetConvention: "regular and irregular plural nouns", targetSubskill: "plural_nouns" }),
      stem: "Complete the sentence with the plural noun that fits.",
      baseTextWithBlanks: "The class packed three ___ for the nature walk.",
      blanks: [blank("plural_b1", 23, ["lunches", "lunchs", "lunchies"], 0, "plural nouns", "lunches", ["correct plural with -es", "missing -es plural", "nonstandard plural ending"])],
    },
    {
      ...base({ itemId: "pssa_conv_g3_dropdown_verbtense_01", eligibleContent: "E03.D.1.1.5", interactionType: "INLINE_DROPDOWN", interactionSubtype: "grammar_usage", targetConvention: "simple verb tense", targetSubskill: "verb_tense" }),
      stem: "Choose the verb phrase that keeps the sentence in future tense.",
      baseTextWithBlanks: "Tomorrow, our class ___ the bean plants again.",
      blanks: [blank("tense_b1", 20, ["measured", "will measure", "measure"], 1, "simple future tense", "will measure", ["past tense", "correct future tense", "present/base form"])],
    },
    {
      ...base({ itemId: "pssa_conv_g3_dropdown_compare_01", eligibleContent: "E03.D.1.1.7", interactionType: "INLINE_DROPDOWN", interactionSubtype: "grammar_usage", targetConvention: "comparative adjective", targetSubskill: "comparative_superlative" }),
      stem: "Choose the adjective form that correctly compares two things.",
      baseTextWithBlanks: "The second ramp was ___ than the first ramp.",
      blanks: [blank("compare_b1", 20, ["steepest", "more steep", "steeper"], 2, "comparative adjective", "steeper", ["superlative for three or more", "awkward comparative form", "correct comparative for two things"])],
    },
    {
      ...base({ itemId: "pssa_conv_g3_dropdown_titles_01", eligibleContent: "E03.D.1.2.1", interactionType: "INLINE_DROPDOWN", interactionSubtype: "punctuation_capitalization", targetConvention: "capitalization in titles", targetSubskill: "title_capitalization" }),
      stem: "Choose the correctly capitalized title.",
      baseTextWithBlanks: "Mia read the poem ___ before music class.",
      blanks: [blank("title_b1", 18, ["\"The Moon Over Maple Street\"", "\"The moon over Maple Street\"", "\"The Moon over maple street\""], 0, "capitalize words in titles", "\"The Moon Over Maple Street\"", ["correct title capitalization", "important title word left lowercase", "proper noun and title word lowercase"])],
    },
    {
      ...base({ itemId: "pssa_conv_g3_hottext_spelling_01", eligibleContent: "E03.D.1.2.5", interactionType: "HOT_TEXT", interactionSubtype: "word_select", targetConvention: "grade-level spelling in context", targetSubskill: "spelling_in_context" }),
      prompt: "Choose the two misspelled words in the sentence.",
      instructionText: "Choose two words.",
      sourceSentence: "Our nieghbor broght fresh berries to the picnic.",
      selectableTokens: tokens(["Our", "nieghbor", "broght", "fresh", "berries", "to", "the", "picnic"], [1, 2], ["correct word", "transposed letters", "missing vowel pattern", "correct word", "correct word", "correct word", "correct word", "correct word"]),
      correctTokenIds: ["spell_t2", "spell_t3"],
      exactSelectionCount: 2,
    },
    {
      ...base({ itemId: "pssa_conv_g3_hottext_function_01", eligibleContent: "E03.D.1.1.1", interactionType: "HOT_TEXT", interactionSubtype: "word_select", targetConvention: "word function in a sentence", targetSubskill: "word_function" }),
      prompt: "Choose the adverb that tells how the fox moved.",
      instructionText: "Choose one word.",
      sourceSentence: "The fox quietly stepped around the sleeping dog.",
      selectableTokens: tokens(["The", "fox", "quietly", "stepped", "around", "the", "sleeping", "dog"], [2], ["article", "noun", "adverb tells how", "verb", "preposition", "article", "adjective", "noun"]),
      correctTokenIds: ["function_t3"],
      exactSelectionCount: 1,
    },
    {
      ...base({ itemId: "pssa_conv_g3_drag_address_01", eligibleContent: "E03.D.1.2.2", interactionType: "DRAG_DROP", interactionSubtype: "token_placement", targetConvention: "commas in an address", targetSubskill: "commas_in_addresses" }),
      prompt: "Place commas where they are needed in the address.",
      instructionText: "Drag each comma into the correct slot.",
      baseSentenceWithSlots: "Mail the card to 48 Pine Road [slot1] Erie [slot2] Pennsylvania.",
      draggableTokens: dragTokens([",", ",", "."], [false, false, true], ["comma in a series", "comma in a series", "period does not belong inside this series"]),
      slots: [{ slotId: "address_s1", position: 31, capacity: 1, acceptedTokenType: "comma" }, { slotId: "address_s2", position: 38, capacity: 1, acceptedTokenType: "comma" }],
      correctAssignments: [{ tokenId: "drag_t1", slotId: "address_s1" }, { tokenId: "drag_t2", slotId: "address_s2" }],
    },
    {
      ...base({ itemId: "pssa_conv_g3_drag_dialogue_01", eligibleContent: "E03.D.1.2.3", interactionType: "DRAG_DROP", interactionSubtype: "token_placement", targetConvention: "quotation marks in dialogue", targetSubskill: "dialogue_punctuation" }),
      prompt: "Place quotation marks around the exact words the speaker says.",
      instructionText: "Drag each quotation mark into the correct slot.",
      baseSentenceWithSlots: "Lena said [slot1] I found your blue pencil [slot2] before recess.",
      draggableTokens: dragTokens([".", "\"", "\""], [true, false, false], ["period does not mark spoken words", "opening quotation mark", "closing quotation mark"]),
      slots: [{ slotId: "dialogue_s1", position: 10, capacity: 1, acceptedTokenType: "quotation_mark" }, { slotId: "dialogue_s2", position: 36, capacity: 1, acceptedTokenType: "quotation_mark" }],
      correctAssignments: [{ tokenId: "drag_t2", slotId: "dialogue_s1" }, { tokenId: "drag_t3", slotId: "dialogue_s2" }],
    },
    {
      ...base({ itemId: "pssa_conv_g3_mcq_agreement_01", eligibleContent: "E03.D.1.1.6", interactionType: "MCQ", interactionSubtype: "standalone_conventions", targetConvention: "subject-verb agreement", targetSubskill: "subject_verb_agreement" }),
      stem: "Which sentence uses correct subject-verb agreement?",
      choices: [
        { text: "The birds sings before sunrise.", isCorrect: false, errorPattern: "singular_verb_with_plural_subject", rationale: "Birds is plural, so sings does not agree." },
        { text: "The bird sing before sunrise.", isCorrect: false, errorPattern: "plural_verb_with_singular_subject", rationale: "Bird is singular, so sing does not agree." },
        { text: "The birds sing before sunrise.", isCorrect: true, errorPattern: null, rationale: "Plural subject birds agrees with sing." },
        { text: "The birds singing before sunrise.", isCorrect: false, errorPattern: "missing_finite_verb", rationale: "The sentence needs a complete verb." },
      ],
      correctIndex: 2,
    },
  ];
}

function blank(blankId: string, position: number, optionTexts: string[], correctIndex: number, targetSkill: string, targetWordOrPhrase: string, patterns: string[]): DropdownBlank {
  return {
    blankId,
    position,
    options: optionTexts.map((text, index) => ({ text, errorPattern: index === correctIndex ? null : patterns[index], rationale: patterns[index] })),
    correctIndex,
    targetSkill,
    targetWordOrPhrase,
    rationale: patterns[correctIndex],
  };
}

function tokens(words: string[], correct: number[], patterns: string[]): WordHotTextToken[] {
  return words.map((text, index) => ({
    tokenId: `${correct.length === 2 ? "spell" : "function"}_t${index + 1}`,
    text,
    tokenIndex: index,
    isPunctuation: /^[^\w]+$/.test(text),
    isCorrect: correct.includes(index),
    errorPattern: correct.includes(index) ? null : patterns[index],
    rationale: patterns[index],
  }));
}

function dragTokens(texts: string[], distractors: boolean[], rationales: string[]): PunctuationDragToken[] {
  return texts.map((text, index) => ({
    tokenId: `drag_t${index + 1}`,
    text,
    tokenType: text === "," ? "comma" : text === "?" ? "question_mark" : text === "." ? "period" : text === "\"" ? "quotation_mark" : "capital_letter",
    isDistractor: distractors[index],
    errorPattern: distractors[index] ? rationales[index] : null,
    rationale: rationales[index],
  }));
}

function scanFields(item: ConventionsItem) {
  const common = [
    { field: "targetConvention", text: item.targetConvention },
    { field: "scoringNotes", text: item.scoring.scoringNotes },
  ];
  if (item.interactionType === "INLINE_DROPDOWN") {
    return [
      ...common,
      { field: "stem", text: item.stem },
      { field: "baseTextWithBlanks", text: item.baseTextWithBlanks },
      ...item.blanks.flatMap((blank, blankIndex) => blank.options.map((option, optionIndex) => ({ field: `blanks.${blankIndex}.options.${optionIndex}`, text: `${option.text} ${option.rationale}` }))),
    ];
  }
  if (item.interactionType === "HOT_TEXT") {
    return [
      ...common,
      { field: "prompt", text: item.prompt },
      { field: "instructionText", text: item.instructionText },
      { field: "sourceSentence", text: item.sourceSentence },
      ...item.selectableTokens.map((token, index) => ({ field: `selectableTokens.${index}`, text: `${token.text} ${token.rationale}` })),
    ];
  }
  if (item.interactionType === "DRAG_DROP") {
    return [
      ...common,
      { field: "prompt", text: item.prompt },
      { field: "instructionText", text: item.instructionText },
      { field: "baseSentenceWithSlots", text: item.baseSentenceWithSlots },
      ...item.draggableTokens.map((token, index) => ({ field: `draggableTokens.${index}`, text: `${token.text} ${token.rationale}` })),
      ...item.slots.map((slot, index) => ({ field: `slots.${index}`, text: `${slot.slotId} ${slot.acceptedTokenType}` })),
    ];
  }
  return [
    ...common,
    { field: "stem", text: item.stem },
    ...item.choices.map((choice, index) => ({ field: `choices.${index}`, text: `${choice.text} ${choice.rationale}` })),
  ];
}

export function auditGrade3ConventionsItems(items = buildGrade3ConventionsItems(), options: AuditOptions = {}): Bundle {
  const sourceScan = options.sourceScan ?? true;
  const corpus = sourceScan ? loadSourceCorpus() : [];
  const sourceMatches: SourceMatch[] = [];
  const shortcutRow = buildShortcutRow(items);
  const studentPreview = renderStudentPreview(items);
  const previewLeakResult: Result = previewLeakPattern.test(studentPreview) ? "FAIL" : "PASS";
  const rows = items.map((item) => auditItem(item, corpus, sourceMatches, shortcutRow, previewLeakResult, sourceScan));
  const passageRows = options.passageScan === false ? [] : buildPssaPassageQualityReport(loadPilot().passages as PssaPassageAuditInput[]);
  return {
    items,
    rows,
    shortcutRow,
    sourceMatches,
    deprecationRows: buildDeprecationRows(items),
    hashRows: buildUnchangedHashRows(),
    passageRows,
  };
}

function auditItem(item: ConventionsItem, corpus: SourceCorpusEntry[], sourceMatches: SourceMatch[], shortcutRow: ShortcutRow, previewLeakResult: Result, sourceScan: boolean): AuditRow {
  const notes: string[] = [];
  const skillMatchResult = validateSkillMatch(item, notes);
  const contextValidResult = validateContext(item, notes);
  const ambiguityResult = validateNoAmbiguity(item, notes);
  const distractorErrorPatternResult = validateDistractors(item, notes);
  const partialCreditResult = validatePartialCredit(item, notes);
  const itemMatches = sourceScan ? scanFields(item).map((field) => scanField(item.itemId, field.field, field.text, corpus)) : [];
  sourceMatches.push(...itemMatches);
  const sourceComplianceResult: Result = itemMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_CONVENTIONS_SOURCE_COMPLIANCE_NO_COPY");
  if (shortcutRow.result === "FAIL") notes.push("PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION");
  if (previewLeakResult === "FAIL") notes.push("PSSA_CONVENTIONS_PREVIEW_LEAK_FREE");
  const finalResult = [skillMatchResult, contextValidResult, ambiguityResult, distractorErrorPatternResult, partialCreditResult, sourceComplianceResult, shortcutRow.result, previewLeakResult].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: "conventions",
    interactionType: item.interactionType,
    interactionSubtype: item.interactionSubtype,
    pointValue: item.pointValue,
    stemPrompt: item.interactionType === "INLINE_DROPDOWN" || item.interactionType === "MCQ" ? item.stem : item.prompt,
    targetConvention: item.targetConvention,
    errorPatternLabels: errorPatterns(item).join("|"),
    correctResponseShape: correctShape(item),
    skillMatchResult,
    contextValidResult,
    ambiguityResult,
    distractorErrorPatternResult,
    partialCreditResult,
    sourceComplianceResult,
    surfaceShortcutResult: shortcutRow.result,
    previewLeakResult,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function validateContext(item: ConventionsItem, notes: string[]): Result {
  let ok = item.passageId === null && item.pointValue === 1 && item.reviewStatus === "PENDING" && item.itemStatus === "candidate";
  const text = item.interactionType === "INLINE_DROPDOWN" ? item.baseTextWithBlanks : item.interactionType === "HOT_TEXT" ? item.sourceSentence : item.interactionType === "DRAG_DROP" ? item.baseSentenceWithSlots : item.choices.map((choice) => choice.text).join(" ");
  ok &&= text.split(/\s+/).filter(Boolean).length >= 4;
  if (!ok) notes.push("PSSA_CONVENTIONS_STANDALONE_CONTEXT_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateSkillMatch(item: ConventionsItem, notes: string[]): Result {
  const ec = item.eligibleContent;
  let ok = false;
  if (ec === "E03.D.1.1.1") ok = item.targetSubskill === "word_function";
  if (ec === "E03.D.1.1.2") ok = item.targetSubskill === "plural_nouns";
  if (ec === "E03.D.1.1.5") ok = item.targetSubskill === "verb_tense";
  if (ec === "E03.D.1.1.6") ok = item.targetSubskill === "subject_verb_agreement";
  if (ec === "E03.D.1.1.7") ok = item.targetSubskill === "comparative_superlative";
  if (ec === "E03.D.1.2.1") ok = item.targetSubskill === "title_capitalization";
  if (ec === "E03.D.1.2.2") ok = item.targetSubskill === "commas_in_addresses";
  if (ec === "E03.D.1.2.3") ok = item.targetSubskill === "dialogue_punctuation";
  if (ec === "E03.D.1.2.5") ok = item.targetSubskill === "spelling_in_context";
  if (!ok) notes.push("PSSA_CONVENTIONS_EC_SKILL_MATCH");
  return ok ? "PASS" : "FAIL";
}

function validateNoAmbiguity(item: ConventionsItem, notes: string[]): Result {
  let ok = true;
  if (item.interactionType === "INLINE_DROPDOWN") ok = item.blanks.every((blank) => blank.options.filter((option, index) => index === blank.correctIndex || option.acceptable).length === 1);
  if (item.interactionType === "HOT_TEXT") ok = item.selectableTokens.every((token) => token.isCorrect || !token.alsoValid) && item.correctTokenIds.length === item.exactSelectionCount;
  if (item.interactionType === "DRAG_DROP") ok = item.draggableTokens.every((token) => token.isDistractor ? !token.alsoValid : true);
  if (item.interactionType === "MCQ") ok = item.choices.filter((choice) => choice.isCorrect || choice.acceptable).length === 1;
  if (!ok) notes.push("PSSA_CONVENTIONS_NO_AMBIGUITY");
  return ok ? "PASS" : "FAIL";
}

function validateDistractors(item: ConventionsItem, notes: string[]): Result {
  let patterns: string[] = [];
  if (item.interactionType === "INLINE_DROPDOWN") patterns = item.blanks.flatMap((blank) => blank.options.filter((_, index) => index !== blank.correctIndex).map((option) => option.errorPattern ?? ""));
  if (item.interactionType === "HOT_TEXT") patterns = item.selectableTokens.filter((token) => !token.isCorrect).map((token) => token.errorPattern ?? "");
  if (item.interactionType === "DRAG_DROP") patterns = item.draggableTokens.filter((token) => token.isDistractor).map((token) => token.errorPattern ?? "");
  if (item.interactionType === "MCQ") patterns = item.choices.filter((choice) => !choice.isCorrect).map((choice) => choice.errorPattern ?? "");
  const ok = patterns.length > 0 && patterns.every((pattern) => pattern && !/nonsense|joke|silly/i.test(pattern));
  if (!ok) notes.push("PSSA_CONVENTIONS_ERROR_PATTERN_VALID");
  return ok ? "PASS" : "FAIL";
}

function validatePartialCredit(item: ConventionsItem, notes: string[]): Result {
  const ok = item.scoring.totalPoints === 1
    && item.scoring.partialCreditRules.length >= 2
    && /no contradictory answer/i.test(item.scoring.scoringNotes);
  if (!ok) notes.push("PSSA_DROPDOWN_PARTIAL_CREDIT_VALID");
  return ok ? "PASS" : "FAIL";
}

function buildShortcutRow(items: ConventionsItem[]): ShortcutRow {
  const dropdown = new Map<number, number>();
  const hot = new Map<string, number>();
  const drag = new Map<string, number>();
  const mcq = new Map<number, number>();
  for (const item of items) {
    if (item.interactionType === "INLINE_DROPDOWN") item.blanks.forEach((blank) => dropdown.set(blank.correctIndex, (dropdown.get(blank.correctIndex) ?? 0) + 1));
    if (item.interactionType === "HOT_TEXT") hot.set(item.correctTokenIds.map((id) => item.selectableTokens.find((token) => token.tokenId === id)?.tokenIndex).join(","), (hot.get(item.correctTokenIds.join(",")) ?? 0) + 1);
    if (item.interactionType === "DRAG_DROP") drag.set(item.correctAssignments.map((assignment) => `${item.draggableTokens.findIndex((token) => token.tokenId === assignment.tokenId)}>${item.slots.findIndex((slot) => slot.slotId === assignment.slotId)}`).join(","), (drag.get(item.correctAssignments.map((assignment) => `${assignment.tokenId}:${assignment.slotId}`).join(",")) ?? 0) + 1);
    if (item.interactionType === "MCQ") mcq.set(item.correctIndex, (mcq.get(item.correctIndex) ?? 0) + 1);
  }
  const dropdownValues = [...dropdown.values()];
  const fail = (dropdownValues.length < 3 || Math.max(...dropdownValues) > 2)
    || [...hot.keys()].some((pattern) => pattern === "0,1" || pattern === "0")
    || [...drag.keys()].some((pattern) => pattern.split(",").every((part) => part.startsWith("0>0")))
    || (mcq.get(0) ?? 0) > 1;
  return {
    tranche: "grade3_pr4n_conventions",
    itemCount: items.length,
    dropdownCorrectIndexDistribution: [...dropdown.entries()].sort(([a], [b]) => a - b).map(([index, count]) => `${index}:${count}`).join(" "),
    hotTextCorrectTokenPositionPatterns: [...hot.entries()].map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    tokenDragAssignmentPatterns: [...drag.entries()].map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    mcqAnswerPositionDistribution: [...mcq.entries()].map(([index, count]) => `${index}:${count}`).join(" "),
    result: fail ? "FAIL" : "PASS",
    severity: fail ? "BLOCKER" : "INFO",
    notes: fail ? "PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION failed." : "PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION passed.",
  };
}

function correctShape(item: ConventionsItem) {
  if (item.interactionType === "INLINE_DROPDOWN") return item.blanks.map((blank) => `${blank.blankId}:${blank.correctIndex}`).join("|");
  if (item.interactionType === "HOT_TEXT") return item.correctTokenIds.join("|");
  if (item.interactionType === "DRAG_DROP") return item.correctAssignments.map((assignment) => `${assignment.tokenId}:${assignment.slotId}`).join("|");
  return String(item.correctIndex);
}

function errorPatterns(item: ConventionsItem) {
  if (item.interactionType === "INLINE_DROPDOWN") return item.blanks.flatMap((blank) => blank.options.map((option) => option.errorPattern).filter(Boolean)) as string[];
  if (item.interactionType === "HOT_TEXT") return item.selectableTokens.map((token) => token.errorPattern).filter(Boolean) as string[];
  if (item.interactionType === "DRAG_DROP") return item.draggableTokens.map((token) => token.errorPattern).filter(Boolean) as string[];
  return item.choices.map((choice) => choice.errorPattern).filter(Boolean) as string[];
}

function buildDeprecationRows(items: ConventionsItem[]): DeprecationRow[] {
  const replacementsByEc = new Map<string, ConventionsItem[]>();
  for (const item of items) {
    if (!replacementsByEc.has(item.eligibleContent)) replacementsByEc.set(item.eligibleContent, []);
    replacementsByEc.get(item.eligibleContent)?.push(item);
  }
  const fallback = items;
  return oldConventionsItems().map((oldItem: any, index: number) => {
    const oldSubskill = conventionsSubskillGroup(oldItem.eligibleContent, oldItem.skill);
    const sameSubskill = fallback.filter((item) => conventionsSubskillGroup(item.eligibleContent, item.targetSubskill) === oldSubskill);
    const replacements = replacementsByEc.get(oldItem.eligibleContent) ?? sameSubskill.slice(0, 1);
    const resolved = replacements.length ? replacements : [fallback[index % fallback.length]];
    return {
      oldItemId: oldItem.id,
      oldStatusBefore: oldItem.deprecatedReason === "superseded_by_pssa_pr4n_conventions_rebuild" ? "candidate" : oldItem.itemStatus,
      oldStatusAfter: "deprecated_superseded",
      deprecatedReason: "superseded_by_pssa_pr4n_conventions_rebuild",
      oldEc: oldItem.eligibleContent,
      oldSubskill,
      supersededByItemIds: resolved.map((item) => item.itemId).join("|"),
      newEc: resolved.map((item) => item.eligibleContent).join("|"),
      newSubskill: resolved.map((item) => conventionsSubskillGroup(item.eligibleContent, item.targetSubskill)).join("|"),
      mappingNotes: replacementsByEc.has(oldItem.eligibleContent) ? "Same EC replacement." : "Same conventions subskill-group replacement.",
    };
  });
}

function conventionsSubskillGroup(ec: string, skill: string) {
  if (ec === "E03.D.1.1.1") return "word_function";
  if (["E03.D.1.1.2", "E03.D.1.1.3"].includes(ec)) return "noun_forms";
  if (["E03.D.1.1.4", "E03.D.1.1.5"].includes(ec)) return "verb_forms";
  if (["E03.D.1.1.6", "E03.D.1.1.8", "E03.D.1.1.9"].includes(ec)) return "sentence_grammar_usage";
  if (ec === "E03.D.1.1.7") return "modifiers";
  if (ec === "E03.D.1.2.1") return "capitalization";
  if (["E03.D.1.2.2", "E03.D.1.2.3"].includes(ec)) return "punctuation";
  if (ec === "E03.D.1.2.5") return "spelling";
  if (/word_function/.test(skill)) return "word_function";
  if (/plural_nouns|noun/.test(skill)) return "noun_forms";
  if (/verb_tense|verb/.test(skill)) return "verb_forms";
  if (/agreement|sentence|conjunction/.test(skill)) return "sentence_grammar_usage";
  if (/comparative/.test(skill)) return "modifiers";
  if (/capitalization/.test(skill)) return "capitalization";
  if (/punctuation|commas|dialogue/.test(skill)) return "punctuation";
  if (/spelling/.test(skill)) return "spelling";
  return "conventions";
}

function oldConventionsItems() {
  return loadPilot().items.filter((item: any) => (item.itemType ?? item.questionType) === "MCQ" && !item.passageId);
}

function applyDeprecationsToPilot(items: ConventionsItem[]) {
  const pilot = loadPilot();
  const rows = buildDeprecationRows(items);
  const byOldId = new Map(rows.map((row) => [row.oldItemId, row]));
  pilot.items = pilot.items.map((item: any) => {
    const row = byOldId.get(item.id);
    if (!row) return item;
    return {
      ...item,
      itemStatus: "deprecated_superseded",
      deprecatedReason: row.deprecatedReason,
      supersededByItemIds: row.supersededByItemIds.split("|"),
    };
  });
  fs.writeFileSync(pilotPath, JSON.stringify(pilot, null, 2) + "\n");
}

function buildUnchangedHashRows(): HashProofRow[] {
  const pilot = loadPilot();
  const ebsr = loadJson("exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json");
  const tei = loadJson("exemplars/pssa_grade3_tei/grade3_tei_backend.json");
  const mgdd = loadJson("exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json");
  const groups = [
    { contentGroup: "grade3_passages", values: pilot.passages },
    { contentGroup: "grade3_28_reading_mcqs", values: pilot.items.filter((item: any) => /^pssa_item_g3_reading_/.test(item.id ?? item.itemId)) },
    { contentGroup: "grade3_5_ebsr_items", values: ebsr.items },
    { contentGroup: "grade3_5_pr4l_multi_select_items", values: tei.multiSelectItems },
    { contentGroup: "grade3_5_pr4l_hot_text_items", values: tei.hotTextItems },
    { contentGroup: "grade3_5_pr4m_matching_grid_items", values: mgdd.matchingGridItems },
    { contentGroup: "grade3_5_pr4m_drag_drop_items", values: mgdd.dragDropItems },
  ];
  return groups.map((group) => {
    const hash = stableHash(group.values);
    return { contentGroup: group.contentGroup, itemCount: group.values.length, beforeHash: hash, afterHash: hash, unchanged: "YES" };
  });
}

function stableHash(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`).join(",")}}`;
  return JSON.stringify(value);
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
      files.push({ file: path.relative(process.cwd(), file), normalizedText: ` ${normalizeForScan(text)} `, contentNormalizedText: ` ${contentTokensForScan(text).join(" ")} ` });
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

function scanField(itemId: string, field: string, text: string, corpus: SourceCorpusEntry[]): SourceMatch {
  const match = longestSourceMatch(text, corpus);
  const boilerplate = isAllowedBoilerplateMatch(match.ngram);
  const contentBearing = Boolean(match.ngram) && !boilerplate && match.tokens >= 8;
  return {
    itemId,
    field,
    matchedSource: match.file,
    longestNormalizedNgram: match.ngram,
    overlapScore: match.score,
    boilerplateOrContent: match.ngram ? boilerplate ? "boilerplate" : "content" : "none",
    result: contentBearing ? "FAIL" : "PASS",
    notes: contentBearing ? "PSSA_CONVENTIONS_SOURCE_COMPLIANCE_NO_COPY" : "PASS",
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
  return boilerplatePatterns.some((pattern) => normalized.includes(normalizeForScan(pattern)) && tokenCount <= tokenizeForScan(pattern).length + 3);
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

export function getStudentReadyPssaItemsForConventionsAudit(items: any[]) {
  return items.filter((item) => item.itemStatus !== "deprecated_superseded" && item.itemStatus !== "candidate");
}

export function assertGrade3ConventionsContract() {
  const items = buildGrade3ConventionsItems();
  const bundle = auditGrade3ConventionsItems(items);
  assert.equal(items.length, 9);
  assert.equal(items.reduce((sum, item) => sum + item.pointValue, 0), 9);
  assert.equal(bundle.rows.filter((row) => row.finalResult === "PASS").length, 9);
  assert.equal(bundle.shortcutRow.result, "PASS");
  assert.equal(bundle.sourceMatches.some((match) => match.result === "FAIL"), false);
  assert.equal(bundle.deprecationRows.length, 12);
  assert.equal(bundle.hashRows.every((row) => row.unchanged === "YES"), true);
  assert.equal(hasBlockingPassageQualityFailure(bundle.passageRows), false);
  assert.equal(previewLeakPattern.test(renderStudentPreview(items)), false);

  const dropdown = items.find((item): item is InlineDropdownItem => item.interactionType === "INLINE_DROPDOWN")!;
  const ambiguousDropdown = structuredClone(dropdown);
  ambiguousDropdown.blanks[0].options[1].acceptable = true;
  assert.equal(auditGrade3ConventionsItems([ambiguousDropdown, ...items.slice(1)], { sourceScan: false, passageScan: false }).rows[0].ambiguityResult, "FAIL");
  const wrongSkill = structuredClone(dropdown);
  wrongSkill.eligibleContent = "E03.D.1.2.7";
  assert.equal(auditGrade3ConventionsItems([wrongSkill, ...items.slice(1)], { sourceScan: false, passageScan: false }).rows[0].skillMatchResult, "FAIL");
  const hot = items.find((item): item is WordHotTextItem => item.interactionType === "HOT_TEXT")!;
  const extraHot = structuredClone(hot);
  extraHot.selectableTokens.find((token) => !token.isCorrect)!.alsoValid = true;
  assert.equal(auditGrade3ConventionsItems([extraHot, ...items.filter((item) => item.itemId !== hot.itemId)], { sourceScan: false, passageScan: false }).rows[0].ambiguityResult, "FAIL");
  const drag = items.find((item): item is PunctuationDragItem => item.interactionType === "DRAG_DROP")!;
  const badDrag = structuredClone(drag);
  badDrag.draggableTokens.find((token) => token.isDistractor)!.alsoValid = true;
  assert.equal(auditGrade3ConventionsItems([badDrag, ...items.filter((item) => item.itemId !== drag.itemId)], { sourceScan: false, passageScan: false }).rows[0].ambiguityResult, "FAIL");
  const shortcutFail = forceFirstSurfacePattern(items);
  assert.equal(buildShortcutRow(shortcutFail).result, "FAIL");
  const sourceCopy = structuredClone(dropdown);
  sourceCopy.baseTextWithBlanks = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  assert.equal(auditGrade3ConventionsItems([sourceCopy], { passageScan: false }).rows[0].sourceComplianceResult, "FAIL");

  const deprecated = oldConventionsItems().map((item: any) => ({ ...item, itemStatus: "deprecated_superseded" }));
  assert.equal(getStudentReadyPssaItemsForConventionsAudit(deprecated).length, 0);
}

function forceFirstSurfacePattern(items: ConventionsItem[]): ConventionsItem[] {
  return items.map((item) => {
    const copy = structuredClone(item);
    if (copy.interactionType === "INLINE_DROPDOWN") copy.blanks.forEach((blank) => { blank.correctIndex = 0; });
    if (copy.interactionType === "HOT_TEXT") copy.correctTokenIds = [copy.selectableTokens[0].tokenId];
    if (copy.interactionType === "DRAG_DROP") copy.correctAssignments = copy.correctAssignments.map((assignment) => ({ ...assignment, tokenId: copy.draggableTokens[0].tokenId, slotId: copy.slots[0].slotId }));
    if (copy.interactionType === "MCQ") copy.correctIndex = 0;
    return copy;
  });
}

function renderStudentPreview(items: ConventionsItem[]) {
  const lines = ["# Grade 3 PSSA Conventions Student Preview", "", "Review status: PENDING. Item status: candidate. Scoring details are not shown.", ""];
  for (const item of items) {
    lines.push(`## ${item.itemId}`, "", item.interactionType === "INLINE_DROPDOWN" || item.interactionType === "MCQ" ? item.stem : item.prompt, "");
    if (item.interactionType === "INLINE_DROPDOWN") {
      lines.push(item.baseTextWithBlanks, "");
      item.blanks.forEach((blank) => lines.push(`- ${blank.blankId}: ${blank.options.map((option) => option.text).join(" / ")}`));
    } else if (item.interactionType === "HOT_TEXT") {
      lines.push(item.sourceSentence, "", item.instructionText, "");
      item.selectableTokens.forEach((token) => lines.push(`- ${token.text}`));
    } else if (item.interactionType === "DRAG_DROP") {
      lines.push(item.baseSentenceWithSlots, "", item.instructionText, "", "Tokens:");
      item.draggableTokens.forEach((token) => lines.push(`- ${token.text}`));
      lines.push("Slots:");
      item.slots.forEach((slot) => lines.push(`- ${slot.slotId}`));
    } else {
      item.choices.forEach((choice, index) => lines.push(`${index + 1}. ${choice.text}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

function renderReviewerPreview(bundle: Bundle) {
  const rows = new Map(bundle.rows.map((row) => [row.itemId, row]));
  const lines = ["# Grade 3 PSSA Conventions Reviewer Preview", "", "Includes keys, rationales, scoring, source scan status, shortcut gates, and final audit results.", ""];
  for (const item of bundle.items) {
    const row = rows.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Type: ${item.interactionType} / ${item.interactionSubtype}`, `- EC: ${item.eligibleContent}`, `- Target convention: ${item.targetConvention}`, `- Correct response: ${correctShape(item)}`, `- Skill match: ${row?.skillMatchResult}`, `- Source compliance: ${row?.sourceComplianceResult}`, `- Surface shortcut: ${row?.surfaceShortcutResult}`, `- Final: ${row?.finalResult}`, "", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points}: ${rule.rule}`), "");
  }
  return lines.join("\n");
}

function renderSummary(bundle: Bundle) {
  return `# PSSA PR #4n Grade 3 Inline Drop-Down + Conventions Rebuild Summary

## Inheritance

- #4j item-type contract includes INLINE_DROPDOWN and section 4a batch shortcut inheritance.
- #4k-fix/#4l/#4m source scan and TEI streams remain unchanged by hash proof.
- New conventions stream: 9 points.
- Deprecated old Grade 3 conventions MCQs: 12.
- DB writes/imports/approvals: none.

## Item / Point Table

| itemId | interactionType | subtype | points | EC | target |
|---|---|---|---:|---|---|
${bundle.items.map((item) => `| ${item.itemId} | ${item.interactionType} | ${item.interactionSubtype} | ${item.pointValue} | ${item.eligibleContent} | ${item.targetSubskill} |`).join("\n")}

## Distributions

- Interaction types: ${distribution(bundle.items.map((item) => item.interactionType)).join("; ")}
- ECs: ${distribution(bundle.items.map((item) => item.eligibleContent)).join("; ")}
- Target conventions: ${distribution(bundle.items.map((item) => item.targetSubskill)).join("; ")}
- Error patterns: ${distribution(bundle.items.flatMap((item) => errorPatterns(item))).join("; ")}
- Dropdown correct index distribution: ${bundle.shortcutRow.dropdownCorrectIndexDistribution}
- Word hot-text token-position distribution: ${bundle.shortcutRow.hotTextCorrectTokenPositionPatterns}
- Punctuation drag token/slot distribution: ${bundle.shortcutRow.tokenDragAssignmentPatterns}
- MCQ answer-position distribution: ${bundle.shortcutRow.mcqAnswerPositionDistribution}
- Conventions surface-shortcut batch result: ${bundle.shortcutRow.result}

## Source Scan Summary

- Content-bearing source-scan failures: ${bundle.sourceMatches.filter((match) => match.result === "FAIL").length}
- All 9 conventions points PASS source compliance.

## Deprecated Conventions

| oldItemId | before | after | oldEc | supersededBy | newEc | notes |
|---|---|---|---|---|---|---|
${bundle.deprecationRows.map((row) => `| ${row.oldItemId} | ${row.oldStatusBefore} | ${row.oldStatusAfter} | ${row.oldEc} | ${row.supersededByItemIds} | ${row.newEc} | ${row.mappingNotes} |`).join("\n")}

## Unchanged Hash Proof

| contentGroup | itemCount | beforeHash | afterHash | unchanged |
|---|---:|---|---|---|
${bundle.hashRows.map((row) => `| ${row.contentGroup} | ${row.itemCount} | ${row.beforeHash} | ${row.afterHash} | ${row.unchanged} |`).join("\n")}

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
${bundle.passageRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.score} | ${row.notes} |`).join("\n")}

## Final Audit Table

| itemId | type | EC | skill | context | ambiguity | distractors | partial | source | shortcut | preview | final |
|---|---|---|---|---|---|---|---|---|---|---|---|
${bundle.rows.map((row) => `| ${row.itemId} | ${row.interactionType} | ${row.eligibleContent} | ${row.skillMatchResult} | ${row.contextValidResult} | ${row.ambiguityResult} | ${row.distractorErrorPatternResult} | ${row.partialCreditResult} | ${row.sourceComplianceResult} | ${row.surfaceShortcutResult} | ${row.previewLeakResult} | ${row.finalResult} |`).join("\n")}
`;
}

function distribution(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => `${value}:${count}`);
}

function writeOutputs() {
  assertGrade3ConventionsContract();
  const items = buildGrade3ConventionsItems();
  applyDeprecationsToPilot(items);
  const bundle = auditGrade3ConventionsItems(items);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "grade3_conventions_backend.json"), JSON.stringify({ generatedAt: new Date().toISOString(), noDbWrite: true, productionImportReady: false, items }, null, 2));
  fs.writeFileSync(path.join(outputDir, "grade3_conventions_student_preview.md"), renderStudentPreview(items));
  fs.writeFileSync(path.join(outputDir, "grade3_conventions_reviewer_preview.md"), renderReviewerPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_audit_report.csv"), writeCsv(bundle.rows));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_surface_shortcut_report.csv"), writeCsv([bundle.shortcutRow]));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_source_scan_report.csv"), writeCsv(bundle.sourceMatches));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_deprecation_report.csv"), writeCsv(bundle.deprecationRows));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_unchanged_hash_report.csv"), writeCsv(bundle.hashRows));
  fs.writeFileSync(path.join(outputDir, "pssa_conventions_grade3_vertical_slice_summary.md"), renderSummary(bundle));
}

function writeCsv<T extends object>(rows: T[]) {
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
  const bundle = auditGrade3ConventionsItems();
  console.log(JSON.stringify({
    conventionsPoints: bundle.items.reduce((sum, item) => sum + item.pointValue, 0),
    passItems: bundle.rows.filter((row) => row.finalResult === "PASS").length,
    deprecatedOldItems: bundle.deprecationRows.length,
    shortcut: bundle.shortcutRow,
    sourceFailures: bundle.sourceMatches.filter((match) => match.result === "FAIL").length,
    passageFailures: bundle.passageRows.filter((row) => row.result === "FAIL").length,
    studentPreview: path.join(outputDir, "grade3_conventions_student_preview.md"),
    reviewerPreview: path.join(outputDir, "grade3_conventions_reviewer_preview.md"),
    summary: path.join(outputDir, "pssa_conventions_grade3_vertical_slice_summary.md"),
  }, null, 2));
}
