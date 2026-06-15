export type RuleResult = "PASS" | "FAIL" | "SKIP";

export type McqAuditInput = {
  id?: string;
  itemId?: string;
  itemType?: string;
  questionType?: string;
  correctIndex?: number | null;
  choices?: string[];
  answerChoicesJson?: string[];
  structuredChoicesJson?: StructuredChoice[] | null;
  studentFacingPrompt?: string;
  passageId?: string | null;
  eligibleContent?: string;
  gradeLevel?: number;
  reportingCategory?: string;
  comprehensionKind?: "literal_detail" | "inference" | "interpretation" | "synthesis" | string | null;
  comprehensionKindRationale?: string | null;
};

export type EcCatalogEntry = {
  eligibleContent: string;
  eligibleContentText: string;
  reportingCategory?: string;
  assessmentAnchor?: string;
  anchorDescriptor?: string;
};

export type PssaPassageAuditInput = {
  id: string;
  title?: string;
  text: string;
  gradeLevel?: number;
  topicDomain?: string;
  crossDuplicateClusterId?: string | null;
  skeletonHash?: string | null;
  topicCoherenceScore?: number | null;
  concretenessRatio?: number | null;
  passageQualityResult?: RuleResult | "WARN" | null;
};

export type EvidenceLink = {
  evidenceKind?: "section_synthesis" | string;
  sectionId?: string;
  sceneId?: string;
  lineIndex?: number;
  speaker?: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  quotedSpan?: string;
  startChar?: number;
  endChar?: number;
};

export type DistractorRole =
  | "too_narrow"
  | "wrong_emphasis"
  | "plausible_misreading"
  | "unsupported_inference"
  | "opposite_claim"
  | "wrong_section";

export type StructuredChoice = {
  text: string;
  isCorrect: boolean;
  rationale?: string;
  evidenceLinks?: EvidenceLink[];
  distractorRole?: DistractorRole | null;
};

export type PassageSpecificityRuleId =
  | "PSSA_MCQ_GENERIC_TEST_TAKING_LANGUAGE"
  | "PSSA_MCQ_GENERIC_STEM_LANGUAGE"
  | "PSSA_MCQ_TEMPLATE_LANGUAGE_REUSE"
  | "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES"
  | "PSSA_MCQ_COMPREHENSION_KIND_RATIONALE_REQUIRED"
  | "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED"
  | "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND"
  | "PSSA_MCQ_EVIDENCE_SPAN_REUSED"
  | "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED"
  | "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER"
  | "PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES";

export type PassageSpecificityRow = {
  itemId: string;
  passageId: string;
  gradeLevel: number | string;
  eligibleContent: string;
  ruleId: PassageSpecificityRuleId;
  result: RuleResult;
  severity: "INFO" | "WARNING" | "BLOCKER";
  evidence: string;
  failedChoiceIndices: number[];
  notes: string;
};

export type PassageQualityRuleId =
  | "PSSA_PASSAGE_CROSS_DUPLICATE"
  | "PSSA_PASSAGE_TEMPLATE_SKELETON"
  | "PSSA_PASSAGE_TOPIC_COHERENCE"
  | "PSSA_PASSAGE_CONCRETENESS";

export type PassageQualityRow = {
  passageId: string;
  gradeLevel: number | string;
  title: string;
  topicDomain: string;
  ruleId: PassageQualityRuleId;
  result: RuleResult;
  severity: "INFO" | "WARNING" | "BLOCKER";
  clusterId: string;
  score: number | string;
  evidence: string;
  notes: string;
};

export type McqCorrectIsLongestRow = {
  scope: "item" | "batch";
  itemId: string;
  totalMcq: number;
  correctLongestCount: number;
  correctLongestPct: number;
  correctIndex: number | string;
  correctWordLength: number | string;
  longestDistractorWordLength: number | string;
  correctCharLength: number | string;
  longestDistractorCharLength: number | string;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export type McqAbsoluteLanguageRow = {
  itemId: string;
  choiceIndex: number;
  term: string;
  isCorrectChoice: boolean;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export type EcSkillFamily =
  | "vocabulary"
  | "key_ideas_details"
  | "inference_evidence"
  | "craft_structure"
  | "literature_elements"
  | "informational_elements"
  | "unknown";

export type SkillMatchResult = "PASS" | "WARN" | "FAIL";

export type ItemEcSkillMatchRow = {
  itemId: string;
  gradeLevel: number | string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecDescription: string;
  ecSkillFamily: EcSkillFamily;
  questionType: string;
  stem: string;
  targetWordOrPhrase: string;
  observedSkillPattern: string;
  expectedSkillPattern: string;
  skillMatchResult: SkillMatchResult;
  skillMatchConfidence: number;
  mismatchReason: string;
  evidenceSpan: string;
  stemSkillSignals: string;
  notes: string;
};

export function buildMcqCorrectIsLongestReport(items: McqAuditInput[], batchThreshold = 0.35): McqCorrectIsLongestRow[] {
  const mcqs = items.map(toMcq).filter((item) => item.correctIndex !== null && item.choices.length === 4);
  const rows: McqCorrectIsLongestRow[] = [];
  for (const item of mcqs) {
    const lengths = item.choices.map((choice) => ({ words: wordCount(choice), chars: choice.length }));
    const correct = lengths[item.correctIndex as number];
    const distractors = lengths.filter((_, index) => index !== item.correctIndex);
    const longestDistractorWords = Math.max(...distractors.map((entry) => entry.words));
    const longestDistractorChars = Math.max(...distractors.map((entry) => entry.chars));
    const singleLongestWords = lengths.filter((entry) => entry.words >= correct.words).length === 1;
    const singleLongestChars = lengths.filter((entry) => entry.chars >= correct.chars).length === 1;
    const wordDelta = correct.words - longestDistractorWords;
    const charDeltaPct = longestDistractorChars ? (correct.chars - longestDistractorChars) / longestDistractorChars : 0;
    const blocker = (singleLongestWords && wordDelta >= 2) || (singleLongestChars && charDeltaPct >= 0.15);
    const warning = !blocker && singleLongestWords && wordDelta === 1;
    rows.push({
      scope: "item",
      itemId: item.itemId,
      totalMcq: 1,
      correctLongestCount: singleLongestWords || singleLongestChars ? 1 : 0,
      correctLongestPct: singleLongestWords || singleLongestChars ? 1 : 0,
      correctIndex: item.correctIndex as number,
      correctWordLength: correct.words,
      longestDistractorWordLength: longestDistractorWords,
      correctCharLength: correct.chars,
      longestDistractorCharLength: longestDistractorChars,
      severity: blocker ? "BLOCKER" : warning ? "WARNING" : "INFO",
      result: blocker ? "FAIL" : "PASS",
      notes: blocker
        ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by ${wordDelta} words and ${Math.round(charDeltaPct * 100)}% chars.`
        : warning
          ? "PSSA_MCQ_CORRECT_IS_LONGEST warning: correct choice is single longest by 1 word."
          : "Correct choice length is within threshold.",
    });
  }
  const correctLongestCount = rows.filter((row) => row.correctLongestCount > 0).length;
  const correctLongestPct = mcqs.length ? round(correctLongestCount / mcqs.length) : 0;
  rows.push({
    scope: "batch",
    itemId: "batch",
    totalMcq: mcqs.length,
    correctLongestCount,
    correctLongestPct,
    correctIndex: "",
    correctWordLength: "",
    longestDistractorWordLength: "",
    correctCharLength: "",
    longestDistractorCharLength: "",
    severity: correctLongestPct > batchThreshold ? "BLOCKER" : rows.some((row) => row.severity === "WARNING") ? "WARNING" : "INFO",
    result: correctLongestPct > batchThreshold ? "FAIL" : "PASS",
    notes: correctLongestPct > batchThreshold
      ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest in ${Math.round(correctLongestPct * 100)}% of MCQs.`
      : "Batch correct-longest rate within threshold.",
  });
  return rows;
}

export function buildMcqAbsoluteLanguageDistractorReport(items: McqAuditInput[]): McqAbsoluteLanguageRow[] {
  const rows: McqAbsoluteLanguageRow[] = [];
  for (const item of items.map(toMcq).filter((entry) => entry.correctIndex !== null && entry.choices.length === 4)) {
    item.choices.forEach((choice, choiceIndex) => {
      for (const term of absoluteTerms(choice)) {
        const isCorrectChoice = choiceIndex === item.correctIndex;
        rows.push({
          itemId: item.itemId,
          choiceIndex,
          term,
          isCorrectChoice,
          severity: isCorrectChoice ? "WARNING" : "BLOCKER",
          result: isCorrectChoice ? "PASS" : "FAIL",
          notes: isCorrectChoice
            ? `Correct answer contains absolute term "${term}"; human review required.`
            : `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: distractor contains "${term}".`,
        });
      }
    });
  }
  return rows.length ? rows : [{
    itemId: "batch",
    choiceIndex: -1,
    term: "",
    isCorrectChoice: false,
    severity: "INFO",
    result: "PASS",
    notes: "No absolute-language distractors found.",
  }];
}

export function buildItemEcSkillMatchReport(
  rawItems: McqAuditInput[],
  rawPassages: PssaPassageAuditInput[],
  ecCatalog: Record<string, EcCatalogEntry | string> = {},
): ItemEcSkillMatchRow[] {
  const passageById = new Map(rawPassages.map((passage) => [passage.id, passage]));
  return rawItems
    .filter(isPassageLinkedReadingMcq)
    .map((item) => auditItemEcSkillMatch(item, passageById.get(String(item.passageId ?? "")), ecCatalog));
}

export function deriveAnswerChoicesFromStructuredChoices(choices: StructuredChoice[] | null | undefined) {
  return Array.isArray(choices) ? choices.map((choice) => choice.text) : null;
}

export function buildMcqPassageSpecificityReport(
  rawItems: McqAuditInput[],
  rawPassages: PssaPassageAuditInput[],
): PassageSpecificityRow[] {
  const passageById = new Map(rawPassages.map((passage) => [passage.id, passage]));
  const readingMcqs = rawItems.filter(isPassageLinkedReadingMcq);
  const rows: PassageSpecificityRow[] = [];

  for (const item of readingMcqs) {
    const passage = passageById.get(String(item.passageId));
    const itemRows = auditPassageLinkedReadingMcq(item, passage);
    rows.push(...itemRows);
  }

  rows.push(...buildTemplateReuseRows(readingMcqs, "choice"));
  rows.push(...buildTemplateReuseRows(readingMcqs, "stem"));
  rows.push(...buildDuplicateReorderedChoiceRows(readingMcqs));
  return rows;
}

export function isPassageLinkedReadingMcq(item: McqAuditInput) {
  return (item.itemType ?? item.questionType) === "MCQ" && Boolean(item.passageId) && item.reportingCategory !== "D";
}

export function hasBlockingPassageSpecificityFailure(rows: PassageSpecificityRow[]) {
  return rows.some((row) => row.result === "FAIL" && row.severity === "BLOCKER");
}

export function buildPssaPassageQualityReport(passages: PssaPassageAuditInput[]): PassageQualityRow[] {
  const rows: PassageQualityRow[] = [];
  rows.push(...buildPassageCrossDuplicateRows(passages));
  rows.push(...buildPassageSkeletonRows(passages));
  rows.push(...buildPassageTopicCoherenceRows(passages));
  rows.push(...buildPassageConcretenessRows(passages));
  return rows;
}

export function hasBlockingPassageQualityFailure(rows: PassageQualityRow[]) {
  return rows.some((row) => row.result === "FAIL" && row.severity === "BLOCKER");
}

function toMcq(raw: McqAuditInput) {
  return {
    itemId: String(raw.itemId ?? raw.id ?? ""),
    correctIndex: typeof raw.correctIndex === "number" ? raw.correctIndex : null,
    choices: (deriveAnswerChoicesFromStructuredChoices(raw.structuredChoicesJson) ?? raw.answerChoicesJson ?? raw.choices ?? []).map(String),
  };
}

function auditItemEcSkillMatch(
  item: McqAuditInput,
  passage: PssaPassageAuditInput | undefined,
  ecCatalog: Record<string, EcCatalogEntry | string>,
): ItemEcSkillMatchRow {
  const itemId = String(item.id ?? item.itemId ?? "");
  const passageText = passage?.text ?? "";
  const eligibleContent = item.eligibleContent ?? "";
  const ecDescription = ecDescriptionFor(eligibleContent, ecCatalog);
  const ecSkillFamily = classifyEcSkillFamily(eligibleContent, ecDescription, item.reportingCategory);
  const stem = item.studentFacingPrompt ?? "";
  const correctChoice = correctStructuredChoice(item);
  const evidenceSpan = correctChoice?.evidenceLinks?.[0]?.quotedSpan ?? "";
  const targetWordOrPhrase = extractTargetWordOrPhrase(stem, passageText);
  const stemSignals = stemSkillSignals(stem);
  const observedSkillPattern = inferObservedSkillPattern(stem, targetWordOrPhrase, stemSignals);
  const expectedSkillPattern = expectedSkillPatternFor(ecSkillFamily);
  const base = {
    itemId,
    gradeLevel: item.gradeLevel ?? "",
    passageId: String(item.passageId ?? ""),
    passageTitle: passage?.title ?? "",
    eligibleContent,
    ecDescription,
    ecSkillFamily,
    questionType: item.questionType ?? item.itemType ?? "",
    stem,
    targetWordOrPhrase,
    observedSkillPattern,
    expectedSkillPattern,
    evidenceSpan,
    stemSkillSignals: stemSignals.join("|"),
  };

  if (ecSkillFamily === "vocabulary") {
    const vocabularyIntent = observedSkillPattern === "vocabulary_context";
    const targetInPassage = targetWordOrPhrase ? containsNormalized(passageText, targetWordOrPhrase) : false;
    const targetInEvidence = targetWordOrPhrase ? containsNormalized(evidenceSpan, targetWordOrPhrase) : false;
    const choicesLookLikeMeanings = choicesAreCandidateMeanings(item, targetWordOrPhrase);
    if (!targetWordOrPhrase) {
      return skillRow(base, "FAIL", 0.96, "Vocabulary EC requires a specific target word or phrase from the passage.", "No target word or phrase identified from stem.");
    }
    if (!vocabularyIntent) {
      return skillRow(base, "FAIL", 0.96, "Vocabulary EC stem asks a comprehension skill instead of word or phrase meaning.", "Observed stem signals are not vocabulary-intent signals.");
    }
    if (!targetInPassage) {
      return skillRow(base, "FAIL", 0.94, "Vocabulary target does not appear in assigned passage.", "Target must be passage text.");
    }
    if (!targetInEvidence) {
      return skillRow(base, "FAIL", 0.94, "Vocabulary target does not appear in the cited evidence span.", "Evidence span must contain the target.");
    }
    if (/\bmean\s+by\b/i.test(stem) || wordCount(targetWordOrPhrase) > 2) {
      return skillRow(base, "WARN", 0.64, "", "Figurative phrase or word-choice-effect interpretation needs human review.");
    }
    if (!choicesLookLikeMeanings) {
      return skillRow(base, "WARN", 0.62, "Vocabulary target is present, but choices may not be clean meaning candidates.", "Ambiguous vocabulary-choice shape; human review needed.");
    }
    return skillRow(base, "PASS", 0.93, "", "Vocabulary stem, target, evidence, and choices align.");
  }

  if (observedSkillPattern === "vocabulary_context") {
    return skillRow(base, "WARN", 0.66, "Non-vocabulary EC may be attached to a word-meaning or phrase-interpretation item.", "Observed skill is vocabulary-context; human review needed.");
  }
  if (ecSkillFamily === "craft_structure" && observedSkillPattern === "plain_recall" && obviousRecallStem(stem)) {
    return skillRow(base, "FAIL", 0.86, "Craft/structure EC is attached to a plain recall/detail item.", "Expected purpose, POV, organization, structure, or word-choice effect.");
  }
  if (ecSkillFamily === "inference_evidence" && observedSkillPattern === "plain_recall" && obviousRecallStem(stem)) {
    return skillRow(base, "FAIL", 0.82, "Inference/evidence EC is attached to a plain recall item.", "Expected inference, conclusion, or evidence-support relationship.");
  }
  if (ecSkillFamily === "literature_elements" && item.reportingCategory === "B") {
    return skillRow(base, "FAIL", 0.82, "Literature-elements EC is attached to an informational reporting category.", "Expected character, setting, plot, conflict, or literary event work.");
  }
  if (ecSkillFamily === "informational_elements" && literarySignals(stemSignals)) {
    return skillRow(base, "FAIL", 0.82, "Informational-elements EC is attached to a literary character/plot task.", "Expected informational details, process, reasons, examples, claims, or evidence.");
  }
  if (ecSkillFamily === "unknown") {
    return skillRow(base, "WARN", 0.45, "EC skill family could not be classified deterministically.", "Human review needed.");
  }
  return skillRow(base, "PASS", 0.78, "", "Observed stem/evidence pattern is compatible with EC skill family.");
}

function skillRow(
  base: Omit<ItemEcSkillMatchRow, "skillMatchResult" | "skillMatchConfidence" | "mismatchReason" | "notes">,
  skillMatchResult: SkillMatchResult,
  skillMatchConfidence: number,
  mismatchReason: string,
  notes: string,
): ItemEcSkillMatchRow {
  return {
    ...base,
    skillMatchResult,
    skillMatchConfidence,
    mismatchReason,
    notes,
  };
}

function ecDescriptionFor(eligibleContent: string, ecCatalog: Record<string, EcCatalogEntry | string>) {
  const entry = ecCatalog[eligibleContent];
  if (!entry) return "";
  return typeof entry === "string" ? entry : entry.eligibleContentText;
}

function classifyEcSkillFamily(eligibleContent: string, description: string, reportingCategory?: string): EcSkillFamily {
  const value = `${eligibleContent} ${description}`.toLowerCase();
  if (eligibleContent.includes("-V.") || /\bvocabulary\b|\bmeaning\b|\bword\b|\bphrase\b|figurative|context clue|multiple-meaning/.test(value)) return "vocabulary";
  if (/\binfer|\binference|conclude|evidence|support/.test(value)) return "inference_evidence";
  if (eligibleContent.includes("-C.2") || /craft|structure|point of view|purpose|text feature|organization|author/.test(value)) return "craft_structure";
  if (reportingCategory === "A" && (eligibleContent.includes("-K.") || /character|setting|plot|story|theme|central message|lesson|moral|literature/.test(value))) return "literature_elements";
  if (reportingCategory === "B" && (eligibleContent.includes("-K.") || /informational|main idea|details|process|reasons|claims/.test(value))) return "informational_elements";
  if (eligibleContent.includes("-K.")) return "key_ideas_details";
  if (eligibleContent.includes("-C.3") && reportingCategory === "B") return "informational_elements";
  if (eligibleContent.includes("-C.3") && reportingCategory === "A") return "literature_elements";
  return "unknown";
}

function expectedSkillPatternFor(family: EcSkillFamily) {
  switch (family) {
    case "vocabulary":
      return "word_or_phrase_meaning_in_context";
    case "key_ideas_details":
      return "central_idea_theme_summary_or_key_detail";
    case "inference_evidence":
      return "inference_conclusion_or_evidence_support";
    case "craft_structure":
      return "purpose_pov_structure_text_feature_or_word_choice_effect";
    case "literature_elements":
      return "character_setting_plot_conflict_or_literary_message";
    case "informational_elements":
      return "informational_detail_process_reason_connection_or_claim_evidence";
    default:
      return "unknown";
  }
}

function correctStructuredChoice(item: McqAuditInput) {
  if (Array.isArray(item.structuredChoicesJson)) {
    const marked = item.structuredChoicesJson.find((choice) => choice.isCorrect);
    if (marked) return marked;
    if (typeof item.correctIndex === "number") return item.structuredChoicesJson[item.correctIndex];
  }
  return null;
}

function extractTargetWordOrPhrase(stem: string, passageText: string) {
  const patterns = [
    /["“]([^"“”]+)["”"]/,
    /\bwhat\s+does\s+["“']?([^"“”'?]+?)["”']?\s+mean\b/i,
    /\bwhat\s+does\s+(.+?)\s+mean\s+as\s+it\s+is\s+used\b/i,
    /\bmeaning\s+of\s+["“']?([^"“”'?]+?)["”']?\b/i,
    /\bmost\s+nearly\s+means\b.*?["“']([^"“”]+)["”']/i,
    /\bword\s+["“']([^"“”]+)["”']/i,
    /\bphrase\s+["“']([^"“”]+)["”']/i,
  ];
  for (const pattern of patterns) {
    const match = stem.match(pattern);
    const candidate = cleanTarget(match?.[1] ?? "");
    if (candidate && containsNormalized(passageText, candidate)) return candidate;
  }
  return "";
}

function cleanTarget(value: string) {
  return value
    .replace(/\bas\s+it\s+is\s+used.*$/i, "")
    .replace(/\bwhen\b.*$/i, "")
    .replace(/\bin\s+the\s+(?:passage|text|story).*$/i, "")
    .replace(/[?.!,:;]+$/g, "")
    .replace(/^the\s+word\s+/i, "")
    .trim();
}

function stemSkillSignals(stem: string) {
  const normalized = normalizeText(stem);
  const signals: string[] = [];
  if (/\bmean|meaning|most nearly means|as used|context|word|phrase\b/i.test(stem)) signals.push("vocabulary");
  if (/\binfer|conclude|show about|shows?|suggest|learned|why\s+did|why\s+was\b/i.test(stem)) signals.push("inference");
  if (/\bevidence|supports?|best supports|which sentence\b/i.test(stem)) signals.push("evidence");
  if (/\bmain reason|central idea|main idea|lesson|message|summary|best states\b/i.test(stem)) signals.push("key_ideas");
  if (/\bwhy did|how did|what happened|what did|which event|what problem\b/i.test(stem)) signals.push("detail_event");
  if (/\bpoint of view|narrator|author|purpose|organized|structure|feature|sequence|compare|contrast|cause|effect\b/i.test(stem)) signals.push("craft_structure");
  if (/\bcharacter|setting|plot|conflict|felt|proud|quiet|story\b/i.test(stem)) signals.push("literary");
  if (/\bprocess|steps|notice|noticed|reason|claim|information\b/i.test(stem)) signals.push("informational");
  if (!signals.length && normalized) signals.push("plain_recall");
  return signals;
}

function inferObservedSkillPattern(stem: string, targetWordOrPhrase: string, signals: string[]) {
  if (signals.includes("vocabulary") && targetWordOrPhrase) return "vocabulary_context";
  if (signals.includes("evidence")) return "evidence_use";
  if (signals.includes("inference")) return "inference";
  if (signals.includes("craft_structure")) return "craft_structure";
  if (signals.includes("literary")) return "literature_elements";
  if (signals.includes("key_ideas")) return "key_ideas_details";
  if (signals.includes("informational")) return "informational_elements";
  if (signals.includes("detail_event")) return "plain_recall";
  return "plain_recall";
}

function choicesAreCandidateMeanings(item: McqAuditInput, targetWordOrPhrase: string) {
  const choices = toMcq(item).choices;
  if (!targetWordOrPhrase || choices.length !== 4) return false;
  const shortEnough = choices.filter((choice) => wordCount(choice) <= 12).length >= 3;
  const noTargetEcho = choices.filter((choice) => containsNormalized(choice, targetWordOrPhrase)).length === 0;
  return shortEnough && noTargetEcho;
}

function literarySignals(signals: string[]) {
  return signals.includes("literary");
}

function obviousRecallStem(stem: string) {
  return /\bwhat\s+(?:color|number|name)|\bhow\s+many\b|\bwho\s+(?:was|is|did)\b|\bwhere\s+(?:was|is|did)\b|\bwhen\s+(?:was|is|did)\b/i.test(stem);
}

function absoluteTerms(value: string) {
  return [...new Set((value.match(/\b(?:never|always|only|every|all|none|must|cannot)\b/gi) ?? []).map((match) => match.toLowerCase()))];
}

function wordCount(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) ?? []).length;
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

const genericExactPhrases = [
  "the opening detail",
  "one middle detail",
  "the ending reflection",
  "useful background",
  "the passage focus",
  "the main question being asked",
  "smaller part of the passage's idea",
  "best applies this",
  "addresses this reading focus",
  "the reader should guess",
  "only the title",
  "copied from one sentence",
];

const genericRegexPatterns = [
  /\b(opening|middle|ending|first|final|later)\s+(detail|reflection|sentence|paragraph|section)\b/i,
  /\b(passage|text)\s+(focus|main question|central point)\b/i,
  /\b(useful|supporting)\s+(evidence|detail)\b/i,
  /\breader\s+(should\s+)?(guess|infer)\b/i,
  /\b(applies|addresses)\s+this\s+(reading|vocabulary)\s+focus\b/i,
  /\bconnects\s+.+\s+details\s+with\s+a\s+careful\s+plan\b/i,
  /\bcopied\s+from\s+one\s+sentence\b/i,
  /\bonly\s+the\s+title\b/i,
  /\bwhich\s+(option|statement|answer)\s+best\s+(addresses|applies|uses)\b/i,
  /\bwhich\s+answer\s+uses\s+evidence\s+correctly\b/i,
];

const genericAcademicWords = new Set([
  "passage", "text", "detail", "details", "idea", "author", "reader", "statement", "answer", "focus",
  "main", "evidence", "paragraph", "section", "sentence", "sentences", "choice", "option", "question",
  "correctly", "skill", "reading", "central", "point", "support", "supports", "supporting",
]);

const stopwords = new Set([
  "about", "after", "again", "also", "because", "before", "being", "between", "could", "does", "down",
  "each", "from", "have", "into", "more", "most", "near", "only", "other", "over", "same", "some",
  "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "until",
  "very", "were", "what", "when", "where", "which", "while", "with", "without", "would", "your", "best",
]);

const validDistractorRoles = new Set<DistractorRole>([
  "too_narrow",
  "wrong_emphasis",
  "plausible_misreading",
  "unsupported_inference",
  "opposite_claim",
  "wrong_section",
]);

function auditPassageLinkedReadingMcq(item: McqAuditInput, passage: PssaPassageAuditInput | undefined) {
  const rows: PassageSpecificityRow[] = [];
  const itemId = String(item.id ?? item.itemId ?? "");
  const passageId = String(item.passageId ?? "");
  const choices = toMcq(item).choices;
  const structuredChoices = Array.isArray(item.structuredChoicesJson) ? item.structuredChoicesJson : null;
  const passageText = passage?.text ?? "";
  const passageWords = contentWords(passageText);
  const sentenceGrid = passage ? splitPassageSentences(passage.text) : [];
  const isVocabItem = /^E\d{2}\.[AB]-V\./.test(String(item.eligibleContent ?? ""));
  const isSynthesisItem = correctChoiceHasSynthesisEvidence(structuredChoices);
  const comprehensionKind = normalizeComprehensionKind(item.comprehensionKind);
  const isInferenceInterpretationItem = comprehensionKind === "inference" || comprehensionKind === "interpretation";

  const choiceGenericHits = choices.flatMap((choice, index) => genericLanguageHits(choice).map((hit) => ({ index, hit })));
  if (choiceGenericHits.length) {
    rows.push(row(item, "PSSA_MCQ_GENERIC_TEST_TAKING_LANGUAGE", "FAIL", "BLOCKER", choiceGenericHits.map((hit) => hit.hit).join("; "), choiceGenericHits.map((hit) => hit.index), "Choice text contains passage-agnostic template language."));
  }

  const stemHits = genericLanguageHits(item.studentFacingPrompt ?? "");
  if (stemHits.length) {
    rows.push(row(item, "PSSA_MCQ_GENERIC_STEM_LANGUAGE", "FAIL", "BLOCKER", stemHits.join("; "), [], "Stem uses generic test-taking language instead of a passage-specific question."));
  }

  if (isVocabItem) {
    rows.push(row(item, "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES", "SKIP", "INFO", "vocabulary-in-context item", [], "Vocabulary-in-context MCQs are scoped to vocab-specific gates, not comprehension choice-specificity."));
  } else if (isSynthesisItem) {
    rows.push(row(item, "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES", "SKIP", "INFO", "synthesis evidence item", [], "Whole-passage synthesis MCQs are scoped by explicit evidenceKind rather than choice concreteness."));
  } else if (isInferenceInterpretationItem && hasComprehensionKindRationale(item)) {
    rows.push(row(item, "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES", "SKIP", "INFO", `SKIP_INFERENCE_INTERPRETATION:${comprehensionKind}`, [], `Inference/interpretation MCQ carries comprehensionKindRationale: ${item.comprehensionKindRationale}`));
  } else if (isInferenceInterpretationItem) {
    rows.push(row(item, "PSSA_MCQ_COMPREHENSION_KIND_RATIONALE_REQUIRED", "FAIL", "BLOCKER", String(comprehensionKind), [], "Inference/interpretation comprehensionKind requires a non-empty comprehensionKindRationale before choice-concreteness can be skipped."));
  } else {
    const overlapFailures: number[] = [];
    let concreteChoiceCount = 0;
    choices.forEach((choice, index) => {
      const shared = [...contentWords(choice)].filter((word) => passageWords.has(word));
      if (shared.length < 2) overlapFailures.push(index);
      if (shared.length >= 2) concreteChoiceCount += 1;
    });
    if (overlapFailures.length || concreteChoiceCount < 3) {
      rows.push(row(item, "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES", "FAIL", "BLOCKER", `concreteChoices=${concreteChoiceCount}/4`, overlapFailures, "Each choice needs at least two passage-specific content words, and at least three choices need concrete passage details."));
    }
  }

  if (!structuredChoices || structuredChoices.length !== choices.length) {
    rows.push(row(item, "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED", "FAIL", "BLOCKER", "structuredChoicesJson missing or length mismatch", choices.map((_, index) => index), "Structured choices with rationale and evidenceLinks are required for passage-linked reading MCQs."));
  } else {
    const missingEvidence: number[] = [];
    const badEvidence: string[] = [];
    const citedSpans: string[] = [];
    const missingRole: number[] = [];
    structuredChoices.forEach((choice, index) => {
      if (!choice.rationale || !choice.evidenceLinks?.length) missingEvidence.push(index);
      if (choice.isCorrect && choice.distractorRole !== null) missingRole.push(index);
      if (!choice.isCorrect && !validDistractorRoles.has(choice.distractorRole as DistractorRole)) missingRole.push(index);
      for (const link of choice.evidenceLinks ?? []) {
        if (isSynthesisEvidenceKind(link.evidenceKind)) {
          if (link.evidenceKind === "scene_synthesis") {
            if (!link.sceneId) badEvidence.push(`choice ${index}: scene_synthesis evidence requires sceneId`);
            if ("quotedSpan" in link || "paragraphIndex" in link || "sentenceIndex" in link || "startChar" in link || "endChar" in link || "lineIndex" in link) {
              badEvidence.push(`choice ${index}: scene_synthesis evidence must not carry fabricated literal location fields`);
            }
          } else if (link.evidenceKind === "whole_play_synthesis" || link.evidenceKind === "whole_passage_synthesis") {
            if ("quotedSpan" in link || "paragraphIndex" in link || "sentenceIndex" in link || "startChar" in link || "endChar" in link || "lineIndex" in link || "sceneId" in link || "sectionId" in link) {
              badEvidence.push(`choice ${index}: ${link.evidenceKind} evidence must not carry fabricated literal location fields`);
            }
          } else if (!link.sectionId) {
            badEvidence.push(`choice ${index}: section_synthesis evidence requires sectionId`);
          }
          continue;
        }
        citedSpans.push(normalizeQuotesWhitespace(link.quotedSpan ?? ""));
        const validation = validateEvidenceLink(link, sentenceGrid, passageText);
        if (!validation.valid) badEvidence.push(`choice ${index}: ${validation.reason}`);
      }
    });
    if (missingEvidence.length) {
      rows.push(row(item, "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED", "FAIL", "BLOCKER", "missing rationale/evidenceLinks", missingEvidence, "Each structured choice needs a rationale and at least one evidence link."));
    }
    if (badEvidence.length) {
      rows.push(row(item, "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND", "FAIL", "BLOCKER", badEvidence.join("; "), [], "Every evidence quotedSpan must appear in the linked passage at the cited paragraph and sentence."));
    }
    if (citedSpans.length >= choices.length && new Set(citedSpans).size === 1) {
      rows.push(row(item, "PSSA_MCQ_EVIDENCE_SPAN_REUSED", "FAIL", "BLOCKER", citedSpans[0], [0, 1, 2, 3], "Choices cite the same single span instead of linking to the detail that makes each choice correct or wrong."));
    }
    if (missingRole.length) {
      rows.push(row(item, "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED", "FAIL", "BLOCKER", "invalid distractorRole/isCorrect pairing", missingRole, "Distractors need a valid role; the correct choice must have distractorRole null."));
    }
  }

  const correctChoices = structuredChoices ? structuredChoices.filter((choice) => choice.isCorrect).length : (typeof item.correctIndex === "number" ? 1 : 0);
  const nearDuplicatePairs = nearDuplicateChoicePairs(choices);
  if (correctChoices !== 1 || nearDuplicatePairs.length) {
    rows.push(row(item, "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER", "FAIL", nearDuplicatePairs.length ? "BLOCKER" : "BLOCKER", `correctChoices=${correctChoices}; duplicatePairs=${nearDuplicatePairs.join("|")}`, [], "A passage-linked MCQ needs exactly one correct answer and no near-identical choices."));
  }

  if (!rows.length) {
    rows.push(row(item, "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES", "PASS", "INFO", "all passage-specificity gates clear", [], "Passage-linked reading MCQ passed grounding gates."));
  }
  return rows;

  function row(
    raw: McqAuditInput,
    ruleId: PassageSpecificityRuleId,
    result: RuleResult,
    severity: "INFO" | "WARNING" | "BLOCKER",
    evidence: string,
    failedChoiceIndices: number[],
    notes: string,
  ): PassageSpecificityRow {
    return {
      itemId,
      passageId,
      gradeLevel: raw.gradeLevel ?? "",
      eligibleContent: raw.eligibleContent ?? "",
      ruleId,
      result,
      severity,
      evidence,
      failedChoiceIndices,
      notes,
    };
  }
}

function correctChoiceHasSynthesisEvidence(choices: StructuredChoice[] | null) {
  const correct = choices?.find((choice) => choice.isCorrect);
  return Boolean(correct?.evidenceLinks?.some((link) => isSynthesisEvidenceKind(link.evidenceKind)));
}

function normalizeComprehensionKind(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasComprehensionKindRationale(item: McqAuditInput) {
  return typeof item.comprehensionKindRationale === "string" && item.comprehensionKindRationale.trim().length > 0;
}

function isSynthesisEvidenceKind(evidenceKind: unknown) {
  return ["section_synthesis", "paragraph_synthesis", "whole_passage_synthesis", "scene_synthesis", "whole_play_synthesis"].includes(String(evidenceKind ?? ""));
}

function buildTemplateReuseRows(items: McqAuditInput[], scope: "choice" | "stem") {
  const buckets = new Map<string, McqAuditInput[]>();
  for (const item of items) {
    const values = scope === "choice"
      ? toMcq(item).choices.filter((_, index) => index !== item.correctIndex)
      : [maskStem(item.studentFacingPrompt ?? "")];
    for (const value of values) {
      const key = normalizeText(value);
      if (!key) continue;
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    }
  }
  const rows: PassageSpecificityRow[] = [];
  for (const [key, bucket] of buckets) {
    const uniqueItems = uniqueBy(bucket, (item) => String(item.id ?? item.itemId ?? ""));
    if (uniqueItems.length <= 2) continue;
    for (const item of uniqueItems) {
      rows.push({
        itemId: String(item.id ?? item.itemId ?? ""),
        passageId: String(item.passageId ?? ""),
        gradeLevel: item.gradeLevel ?? "",
        eligibleContent: item.eligibleContent ?? "",
        ruleId: "PSSA_MCQ_TEMPLATE_LANGUAGE_REUSE",
        result: "FAIL",
        severity: "BLOCKER",
        evidence: `${scope}:${key}`,
        failedChoiceIndices: scope === "choice" ? repeatedChoiceIndices(item, key) : [],
        notes: `${scope} template reused across ${uniqueItems.length} passage-linked reading MCQs.`,
      });
    }
  }
  return rows;
}

function buildDuplicateReorderedChoiceRows(items: McqAuditInput[]) {
  const buckets = new Map<string, McqAuditInput[]>();
  for (const item of items) {
    const choicesKey = toMcq(item).choices.map(normalizeText).sort().join("|");
    const key = `${item.passageId ?? ""}::${normalizeText(item.studentFacingPrompt ?? "")}::${choicesKey}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const rows: PassageSpecificityRow[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length <= 1) continue;
    for (const item of bucket) {
      rows.push({
        itemId: String(item.id ?? item.itemId ?? ""),
        passageId: String(item.passageId ?? ""),
        gradeLevel: item.gradeLevel ?? "",
        eligibleContent: item.eligibleContent ?? "",
        ruleId: "PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES",
        result: "FAIL",
        severity: "BLOCKER",
        evidence: key,
        failedChoiceIndices: [],
        notes: "Duplicate stem and normalized choice set found for the same passage, ignoring eligibleContent.",
      });
    }
  }
  return rows;
}

function repeatedChoiceIndices(item: McqAuditInput, normalizedChoice: string) {
  return toMcq(item).choices.flatMap((choice, index) => normalizeText(choice) === normalizedChoice ? [index] : []);
}

function genericLanguageHits(value: string) {
  const normalized = normalizeText(value);
  const exactHits = genericExactPhrases.filter((phrase) => new RegExp(`(^|\\W)${escapeRegExp(normalizeText(phrase))}(\\W|$)`, "i").test(normalized));
  const regexHits = genericRegexPatterns.filter((pattern) => pattern.test(value)).map((pattern) => pattern.source);
  return [...exactHits, ...regexHits];
}

function validateEvidenceLink(link: EvidenceLink, sentenceGrid: string[][], passageText: string) {
  if (link.evidenceKind === "spoken_line" || link.evidenceKind === "stage_direction") return validateDramaEvidenceLink(link, passageText);
  if (!link.quotedSpan) return { valid: false, reason: "quotedSpan is required for literal evidence links" };
  if (!Number.isInteger(link.paragraphIndex) || !Number.isInteger(link.sentenceIndex)) {
    return { valid: false, reason: "paragraphIndex and sentenceIndex must be integers" };
  }
  if (!Number.isInteger(link.startChar) || !Number.isInteger(link.endChar)) {
    return { valid: false, reason: "startChar and endChar must be integers" };
  }
  const paragraphIndex = link.paragraphIndex as number;
  const sentenceIndex = link.sentenceIndex as number;
  const startChar = link.startChar as number;
  const endChar = link.endChar as number;
  const sentence = sentenceGrid[paragraphIndex]?.[sentenceIndex];
  if (!sentence) return { valid: false, reason: `invalid paragraph/sentence index ${paragraphIndex}/${sentenceIndex}` };
  if (!containsNormalized(sentence, link.quotedSpan)) {
    return { valid: false, reason: `quotedSpan not found in cited sentence: ${link.quotedSpan}` };
  }
  if (!containsNormalized(passageText, link.quotedSpan)) {
    return { valid: false, reason: `quotedSpan not found in passage: ${link.quotedSpan}` };
  }
  if (passageText.slice(startChar, endChar) !== link.quotedSpan) {
    return { valid: false, reason: `char offsets do not point to quotedSpan: ${link.quotedSpan}` };
  }
  return { valid: true, reason: "" };
}

function validateDramaEvidenceLink(link: EvidenceLink, passageText: string) {
  if (!link.quotedSpan) return { valid: false, reason: "quotedSpan is required for drama literal evidence links" };
  if (!link.sceneId || !/^scene_\d{2}$/.test(link.sceneId)) return { valid: false, reason: "sceneId is required for drama evidence links" };
  if (!Number.isInteger(link.lineIndex)) return { valid: false, reason: "lineIndex must be an integer for drama evidence links" };
  if (link.evidenceKind === "spoken_line" && !String(link.speaker ?? "").trim()) return { valid: false, reason: "speaker is required for spoken_line evidence" };
  if (link.evidenceKind === "stage_direction" && "speaker" in link) return { valid: false, reason: "speaker must be omitted for stage_direction evidence" };
  if (!containsNormalized(passageText, link.quotedSpan)) {
    return { valid: false, reason: `quotedSpan not found in passage: ${link.quotedSpan}` };
  }
  return { valid: true, reason: "" };
}

function splitPassageSentences(text: string) {
  return text.split(/\n\s*\n/g).map((paragraph) => {
    const matches = paragraph.match(/[^.!?]+[.!?]+(?:["”])?/g);
    return (matches ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
  });
}

function containsNormalized(haystack: string, needle: string) {
  return normalizeQuotesWhitespace(haystack).includes(normalizeQuotesWhitespace(needle));
}

function normalizeQuotesWhitespace(value: string) {
  return value.replace(/[“”]/g, "\"").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function contentWords(value: string) {
  return new Set((value.match(/[A-Za-z][A-Za-z'-]+/g) ?? [])
    .map((word) => word.toLowerCase().replace(/'s$/, ""))
    .filter((word) => word.length >= 4 && !stopwords.has(word) && !genericAcademicWords.has(word)));
}

function nearDuplicateChoicePairs(choices: string[]) {
  const pairs: string[] = [];
  for (let i = 0; i < choices.length; i += 1) {
    for (let j = i + 1; j < choices.length; j += 1) {
      if (normalizeText(choices[i]) === normalizeText(choices[j])) pairs.push(`${i}-${j}`);
    }
  }
  return pairs;
}

function maskStem(value: string) {
  return normalizeText(value)
    .replace(/"[^"]+"/g, "\"<title>\"")
    .replace(/e0[3-8]\.[a-z]-[a-z]\.\d\.\d\.\d/gi, "<ec>")
    .replace(/ask and answer questions.+|determine.+|explain.+|analyze.+|cite.+|compare.+/i, "<ec-text>");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPassageCrossDuplicateRows(passages: PssaPassageAuditInput[]) {
  const pairs: Array<{ a: PssaPassageAuditInput; b: PssaPassageAuditInput; score: number; evidence: string }> = [];
  for (let i = 0; i < passages.length; i += 1) {
    for (let j = i + 1; j < passages.length; j += 1) {
      const a = passages[i];
      const b = passages[j];
      const identical = sharedLongSentence(a.text, b.text);
      const score = sentenceShingleJaccard(a.text, b.text);
      if (identical || score > 0.3) {
        pairs.push({ a, b, score, evidence: identical || `8-gram Jaccard ${round(score)}` });
      }
    }
  }
  const clusters = clusterPassagePairs(passages, pairs);
  const rows: PassageQualityRow[] = [];
  const failedIds = new Set(pairs.flatMap((pair) => [pair.a.id, pair.b.id]));
  for (const passage of passages) {
    if (!failedIds.has(passage.id)) {
      rows.push(passageQualityRow(passage, "PSSA_PASSAGE_CROSS_DUPLICATE", "PASS", "INFO", "", 0, "No cross-passage duplicate sentence or shingle overlap found.", "Unique against evaluated passages."));
      continue;
    }
    const relevant = pairs.filter((pair) => pair.a.id === passage.id || pair.b.id === passage.id);
    const best = relevant.sort((left, right) => right.score - left.score)[0];
    rows.push(passageQualityRow(
      passage,
      "PSSA_PASSAGE_CROSS_DUPLICATE",
      "FAIL",
      "BLOCKER",
      clusters.get(passage.id) ?? "",
      round(best.score),
      best.evidence,
      `Near-duplicate with ${best.a.id === passage.id ? best.b.id : best.a.id}.`,
    ));
  }
  return rows;
}

function buildPassageSkeletonRows(passages: PssaPassageAuditInput[]) {
  const buckets = new Map<string, PssaPassageAuditInput[]>();
  for (const passage of passages) {
    const skeleton = passageSkeleton(passage);
    buckets.set(skeleton, [...(buckets.get(skeleton) ?? []), passage]);
  }
  const rows: PassageQualityRow[] = [];
  for (const passage of passages) {
    const skeleton = passageSkeleton(passage);
    const bucket = buckets.get(skeleton) ?? [];
    const hash = skeletonHash(skeleton);
    if (bucket.length >= 2) {
      rows.push(passageQualityRow(passage, "PSSA_PASSAGE_TEMPLATE_SKELETON", "FAIL", "BLOCKER", `skeleton-${hash}`, bucket.length, skeleton.slice(0, 180), `Masked skeleton shared by ${bucket.length} passages.`));
    } else {
      rows.push(passageQualityRow(passage, "PSSA_PASSAGE_TEMPLATE_SKELETON", "PASS", "INFO", `skeleton-${hash}`, 1, skeleton.slice(0, 180), "No reused masked skeleton found."));
    }
  }
  return rows;
}

function buildPassageTopicCoherenceRows(passages: PssaPassageAuditInput[]) {
  return passages.map((passage) => {
    const sentences = flatSentences(passage.text);
    const topicTerms = passageTopicTerms(passage);
    const laterHits = sentences.slice(1).filter((sentence) => [...topicTerms].some((term) => normalizeText(sentence).includes(term))).length;
    const conflictTerms = topicConflictTerms(passage);
    const score = Math.min(5, Math.max(1, 1 + laterHits + (conflictTerms.length ? 0 : 1)));
    if (conflictTerms.length || laterHits < 3) {
      return passageQualityRow(
        passage,
        "PSSA_PASSAGE_TOPIC_COHERENCE",
        "FAIL",
        "WARNING",
        "",
        score,
        `topicTerms=${[...topicTerms].join("|")}; laterHits=${laterHits}; conflicts=${conflictTerms.join("|")}`,
        "Topic coherence needs human review; deterministic check found topic drift or too few later topic recurrences.",
      );
    }
    return passageQualityRow(passage, "PSSA_PASSAGE_TOPIC_COHERENCE", "PASS", "INFO", "", score, `topicTerms=${[...topicTerms].join("|")}; laterHits=${laterHits}`, "Topic terms recur through the body without deterministic conflict terms.");
  });
}

function buildPassageConcretenessRows(passages: PssaPassageAuditInput[]) {
  return passages.map((passage) => {
    const terms = passageConcreteAndGenericTerms(passage.text);
    const ratio = terms.concrete.length / Math.max(1, terms.concrete.length + terms.generic.length);
    const fails = ratio < 0.46;
    return passageQualityRow(
      passage,
      "PSSA_PASSAGE_CONCRETENESS",
      fails ? "FAIL" : "PASS",
      fails ? "BLOCKER" : "INFO",
      "",
      round(ratio),
      `concrete=${terms.concrete.slice(0, 20).join("|")}; generic=${terms.generic.slice(0, 20).join("|")}`,
      fails
        ? "Passage is dominated by generic process vocabulary and lacks enough concrete topic detail."
        : "Concrete topic detail ratio passes calibrated threshold.",
    );
  });
}

function passageQualityRow(
  passage: PssaPassageAuditInput,
  ruleId: PassageQualityRuleId,
  result: RuleResult,
  severity: "INFO" | "WARNING" | "BLOCKER",
  clusterId: string,
  score: number | string,
  evidence: string,
  notes: string,
): PassageQualityRow {
  return {
    passageId: passage.id,
    gradeLevel: passage.gradeLevel ?? "",
    title: passage.title ?? "",
    topicDomain: passage.topicDomain ?? "",
    ruleId,
    result,
    severity,
    clusterId,
    score,
    evidence,
    notes,
  };
}

function sharedLongSentence(a: string, b: string) {
  const bSentences = new Set(flatSentences(b).map(normalizeText));
  return flatSentences(a)
    .find((sentence) => wordCount(sentence) >= 8 && bSentences.has(normalizeText(sentence))) ?? "";
}

function sentenceShingleJaccard(a: string, b: string) {
  const aSet = shingleSet(normalizeText(a).split(" "), 8);
  const bSet = shingleSet(normalizeText(b).split(" "), 8);
  const intersection = [...aSet].filter((value) => bSet.has(value)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
}

function shingleSet(words: string[], size: number) {
  const shingles = new Set<string>();
  for (let index = 0; index <= words.length - size; index += 1) {
    shingles.add(words.slice(index, index + size).join(" "));
  }
  return shingles;
}

function clusterPassagePairs(passages: PssaPassageAuditInput[], pairs: Array<{ a: PssaPassageAuditInput; b: PssaPassageAuditInput }>) {
  const parent = new Map(passages.map((passage) => [passage.id, passage.id]));
  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  pairs.forEach((pair) => union(pair.a.id, pair.b.id));
  const roots = new Map<string, string>();
  let next = 1;
  const clusters = new Map<string, string>();
  for (const passage of passages) {
    const root = find(passage.id);
    if (!roots.has(root)) roots.set(root, `cluster-${next++}`);
    clusters.set(passage.id, roots.get(root) ?? "");
  }
  return clusters;
}

function passageSkeleton(passage: PssaPassageAuditInput) {
  const topicTerms = passageTopicTerms(passage);
  const words = normalizeText(passage.text).split(" ");
  return words.map((word) => {
    if (topicTerms.has(word)) return "<topic>";
    if (passageSkeletonKeepWords.has(word)) return word;
    if (passageGenericProcessWords.has(word)) return word;
    return "<x>";
  }).join(" ").replace(/(?:<x> ){2,}/g, "<x> ");
}

function skeletonHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash).toString(36);
}

function passageTopicTerms(passage: PssaPassageAuditInput) {
  const firstSentence = flatSentences(passage.text)[0] ?? "";
  const source = `${passage.title ?? ""} ${firstSentence}`;
  return contentWords(source);
}

function topicConflictTerms(passage: PssaPassageAuditInput) {
  const normalizedTitle = normalizeText(`${passage.title ?? ""} ${flatSentences(passage.text)[0] ?? ""}`);
  const normalizedBody = normalizeText(flatSentences(passage.text).slice(1).join(" "));
  const conflicts: string[] = [];
  if (/\b(stream|water|rain|creek)\b/.test(normalizedTitle) && /\bspace|design|move|wait|work\b/.test(normalizedBody)) {
    conflicts.push("space/design/move/wait/work in water-testing passage");
  }
  if (/\b(map|transit)\b/.test(normalizedTitle) && /\bbuilding|space|move|wait|work\b/.test(normalizedBody)) {
    conflicts.push("space/move/wait/work in transit-map passage");
  }
  if (/\bmural\b/.test(normalizedTitle) && /\bspace|design|move|wait|work\b/.test(normalizedBody)) {
    conflicts.push("space/design/move/wait/work in mural passage");
  }
  if (/\bcart\b/.test(normalizedTitle) && /\bspace|design|move|wait\b/.test(normalizedBody)) {
    conflicts.push("space/design/move/wait in supply-cart passage");
  }
  return conflicts;
}

function passageConcreteAndGenericTerms(text: string) {
  const words = (text.match(/[A-Za-z][A-Za-z'-]+/g) ?? []).map((word) => word.toLowerCase().replace(/'s$/, ""));
  const generic = words.filter((word) => passageGenericProcessWords.has(word));
  const concrete = words.filter((word) => word.length >= 4 && !stopwords.has(word) && !passageGenericProcessWords.has(word) && !genericAcademicWords.has(word));
  return { concrete, generic };
}

function flatSentences(text: string) {
  return splitPassageSentences(text).flat();
}

const passageGenericProcessWords = new Set([
  "research", "team", "teams", "question", "questions", "guesses", "collect", "details", "group", "check",
  "notebooks", "shared", "chart", "route", "gathering", "observations", "building", "notes", "student",
  "class", "decided", "sort", "place", "time", "cause", "structure", "problem", "solution", "evidence",
  "repeated", "location", "compared", "interviewed", "people", "used", "space", "design", "helpful",
  "paper", "match", "move", "wait", "work", "final", "proposal", "modest", "specific", "named",
  "explained", "described", "changes", "tested", "spending", "money", "promise", "perfect", "instead",
  "showed", "careful", "information", "plan", "stronger", "understood", "facts", "noticing", "relationships",
  "useful", "grows", "connect", "listen", "revise", "idea", "asking", "community", "trust", "saved",
  "actually", "wrote", "short", "reflection", "reliable", "needed", "look", "recommendation", "opinion",
  "fair", "begin", "began", "simple", "teacher", "asked", "avoid", "another", "monday", "afternoon",
]);

const passageSkeletonKeepWords = new Set([
  "the", "a", "an", "with", "by", "for", "to", "of", "and", "or", "in", "on", "at", "from", "after",
  "before", "during", "around", "into", "until", "while", "because", "that", "which", "who", "what",
  "how", "could", "would", "not", "but", "so", "their", "them", "they", "it", "its", "is", "was",
  "were", "had", "has", "have", "be", "been", "began", "asked", "decided", "helped", "came", "checked",
  "also", "did", "does", "do", "than", "more", "most", "same", "other", "some", "few", "many", "one",
  "two", "three", "first", "final", "next", "end", "week",
]);
