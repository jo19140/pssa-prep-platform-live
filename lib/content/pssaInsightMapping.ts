export const MAPPING_VERSION = "pssa-ws3a-insight-mapping-v1";

export type InsightConfidence = "possible" | "likely" | "strong_pattern" | "limited_evidence";

export type RoleFamily =
  | "unsupported_inference"
  | "wrong_section"
  | "opposite_claim"
  | "plausible_misreading"
  | "wrong_emphasis"
  | "too_narrow"
  | "spelling"
  | "capitalization"
  | "commas"
  | "quotation_marks"
  | "subject_verb_agreement"
  | "verb_tense"
  | "plurals"
  | "comparatives_adverbs"
  | "sentence_formation";

export type MappingEntry = {
  role: string;
  roleFamily: RoleFamily;
  interpretation: string;
  teacherMove: string;
  recommendedSkill?: string;
  lessonReference?: string;
};

export type PssaInsightEvidence = {
  itemId: string;
  distractorRole: string;
  roleFamily: RoleFamily;
  clusterId: string;
};

export type PssaStudentInsight = {
  mappingVersion: typeof MAPPING_VERSION;
  benchmarkSeason: string;
  formId: string;
  formVersion?: string;
  confidence: InsightConfidence;
  roleFamily: RoleFamily;
  interpretation: string;
  teacherMove: string;
  recommendedSkill?: string;
  lessonReference?: string;
  evidence: PssaInsightEvidence[];
};

export type PssaInsightAttempt = {
  benchmarkSeason?: string;
  responses?: PssaInsightResponse[];
};

export type PssaInsightResponse = {
  itemId: string;
  selectedIndex?: number | null;
  selectedChoiceIndex?: number | null;
  isCorrect?: boolean | null;
  interactionType?: string | null;
  scoreStatus?: string | null;
  clusterId?: string | null;
};

export type PssaInsightForm = {
  id?: string;
  formId?: string;
  version?: string;
  formVersion?: string;
  blueprintVersion?: string;
  contentHash?: string;
  items?: PssaInsightFormItem[];
};

export type PssaInsightFormItem = {
  id?: string;
  itemId?: string;
  interactionType?: string | null;
  correctIndex?: number | null;
  passageId?: string | null;
  passageIdSnapshot?: string | null;
  eligibleContent?: string | null;
  clusterId?: string | null;
  answerChoicesJson?: unknown;
  structuredChoicesJson?: unknown;
  choices?: unknown;
  item?: PssaInsightFormItem;
};

export const mappingRegistry = {
  unsupported_inference: readingEntry("unsupported_inference", "Evidence may need to be checked more directly before making an inference.", "Ask the learner to point to the exact words that support the answer before choosing.", "text-evidence inference check"),
  wrong_section: readingEntry("wrong_section", "The response may be drawing from a different part of the passage than the question targets.", "Have the learner reread the named section or nearby paragraph and separate useful details from nearby-but-not-relevant details.", "section targeting"),
  opposite_claim: readingEntry("opposite_claim", "The response may reverse an important claim or relationship from the text.", "Use a quick true-or-not-yet sort with two text details before returning to the question.", "claim checking"),
  plausible_misreading: readingEntry("plausible_misreading", "The response may follow a plausible but inaccurate reading of a detail.", "Ask for a slow reread of the sentence and one paraphrase in the learner's own words.", "close rereading"),
  wrong_emphasis: readingEntry("wrong_emphasis", "The response may focus on a true detail that is not the most important detail for the question.", "Have the learner rank two details by which one best answers the question.", "main detail selection"),
  too_narrow: readingEntry("too_narrow", "The response may focus on one small detail when the question asks for the larger idea.", "Ask the learner to connect the detail to the bigger lesson, main idea, or character change.", "big-idea connection"),

  adjective_not_adverb: conventionsEntry("adjective_not_adverb", "comparatives_adverbs", "The response may mix up describing a noun with describing an action.", "Practice choosing between adjective and adverb forms in short sentence pairs.", "adjectives and adverbs"),
  comparative_adjective: conventionsEntry("comparative_adjective", "comparatives_adverbs", "The response may use a comparison form where an adverb form is needed.", "Review how comparison words change depending on what they describe.", "comparison words"),
  noun: conventionsEntry("noun", "comparatives_adverbs", "The response may choose a naming word when the sentence needs a describing word.", "Use a quick part-of-speech check: name, action, or description.", "parts of speech"),
  base_form_no_comparison: conventionsEntry("base_form_no_comparison", "comparatives_adverbs", "The response may miss that the sentence is making a comparison.", "Circle the two things being compared before choosing the word form.", "comparison words"),
  incorrect_comparative_form: conventionsEntry("incorrect_comparative_form", "comparatives_adverbs", "The response may use a nonstandard comparison form.", "Practice common comparison forms in sentences.", "comparison words"),
  superlative_not_comparative: conventionsEntry("superlative_not_comparative", "comparatives_adverbs", "The response may choose a greatest/most form when only two things are compared.", "Contrast two-item comparisons with group comparisons.", "comparative and superlative forms"),

  both_plurals_wrong: conventionsEntry("both_plurals_wrong", "plurals", "The response may show uncertainty with regular and irregular plural forms.", "Sort plural examples into regular and irregular groups.", "plural nouns"),
  box_plural_wrong: conventionsEntry("box_plural_wrong", "plurals", "The response may miss the spelling change needed for a regular plural.", "Practice adding plural endings to words with similar endings.", "plural nouns"),
  child_plural_wrong: conventionsEntry("child_plural_wrong", "plurals", "The response may miss an irregular plural form.", "Review common irregular plurals in context.", "irregular plural nouns"),

  past_tense: conventionsEntry("past_tense", "verb_tense", "The response may choose a tense that does not match the sentence time.", "Underline the time clue, then choose the matching verb form.", "verb tense"),
  present_tense: conventionsEntry("present_tense", "verb_tense", "The response may choose a tense that does not match the sentence time.", "Underline the time clue, then choose the matching verb form.", "verb tense"),
  present_progressive: conventionsEntry("present_progressive", "verb_tense", "The response may choose an ongoing-action form when a different tense is needed.", "Compare simple tense and ongoing-action examples.", "verb tense"),

  plural_subject_singular_verb: conventionsEntry("plural_subject_singular_verb", "subject_verb_agreement", "The response may not match the verb to a plural subject.", "Find the subject first, then test whether the verb sounds right with it.", "subject-verb agreement"),
  singular_subject_plural_verb: conventionsEntry("singular_subject_plural_verb", "subject_verb_agreement", "The response may not match the verb to a singular subject.", "Find the subject first, then test whether the verb sounds right with it.", "subject-verb agreement"),
  no_complete_verb: conventionsEntry("no_complete_verb", "sentence_formation", "The response may leave the sentence without a complete verb.", "Ask whether the sentence tells a complete action or state.", "complete sentences"),

  no_capitalization: conventionsEntry("no_capitalization", "capitalization", "The response may miss capitalization needed in a title or name.", "Review which words in the sentence or title need capital letters.", "capitalization"),
  important_words_not_capitalized: conventionsEntry("important_words_not_capitalized", "capitalization", "The response may capitalize only some important words.", "Mark the important words first, then apply capitals.", "capitalization"),
  last_word_not_capitalized: conventionsEntry("last_word_not_capitalized", "capitalization", "The response may miss title capitalization at the end.", "Check the first, last, and important words in titles.", "title capitalization"),

  missing_comma_after_street: conventionsEntry("missing_comma_after_street", "commas", "The response may miss a comma in an address or place name.", "Read the address in chunks and place commas between chunks.", "commas in addresses"),
  missing_comma_after_city: conventionsEntry("missing_comma_after_city", "commas", "The response may miss a comma in an address or place name.", "Read the address in chunks and place commas between chunks.", "commas in addresses"),
  misplaced_and_missing_commas: conventionsEntry("misplaced_and_missing_commas", "commas", "The response may place commas by sound rather than by sentence structure.", "Use a comma checklist for addresses, dates, or listed parts.", "comma placement"),

  missing_quotation_marks: conventionsEntry("missing_quotation_marks", "quotation_marks", "The response may miss quotation marks around spoken words.", "Have the learner box the exact words spoken before adding marks.", "quotation marks"),
  missing_closing_mark: conventionsEntry("missing_closing_mark", "quotation_marks", "The response may mark the start of speech but not the end.", "Check that each opening quotation mark has a closing mark.", "quotation marks"),
  marks_around_wrong_words: conventionsEntry("marks_around_wrong_words", "quotation_marks", "The response may include narration inside the quotation marks.", "Separate who said it from the exact words spoken.", "quotation marks"),

  one_word_misspelled: conventionsEntry("one_word_misspelled", "spelling", "The response may miss a spelling pattern in one word.", "Compare the choice to a known spelling pattern or word family.", "spelling patterns"),
  two_words_misspelled: conventionsEntry("two_words_misspelled", "spelling", "The response may miss spelling patterns across more than one word.", "Slow down and check each word separately against a known pattern.", "spelling patterns"),
} satisfies Record<string, MappingEntry>;

export type PssaInsightMappingRegistry = typeof mappingRegistry;

export function roleFamilyOf(role: string, mapping: Record<string, MappingEntry> = mappingRegistry): RoleFamily {
  return mapDistractor(role, mapping).roleFamily;
}

export function mapDistractor(role: string, mapping: Record<string, MappingEntry> = mappingRegistry): MappingEntry {
  const entry = mapping[role];
  if (!entry) throw new Error(`pssa_insight_unmapped_distractor_role:${role}`);
  return entry;
}

export function deriveStudentInsights(
  attempt: PssaInsightAttempt,
  form: PssaInsightForm,
  mapping: Record<string, MappingEntry> = mappingRegistry,
): PssaStudentInsight[] {
  const formItems = new Map((form.items ?? []).map((item) => [itemId(item), item]));
  const usableMcqByCluster = usableMcqCountsByCluster(form);
  const grouped = new Map<string, { entry: MappingEntry; evidence: PssaInsightEvidence[]; clusterId: string }>();

  for (const response of attempt.responses ?? []) {
    const item = formItems.get(response.itemId);
    if (!item || interactionTypeOf(response, item) !== "MCQ") continue;
    if (response.isCorrect === true) continue;
    const selectedIndex = selectedIndexOf(response);
    if (selectedIndex == null) continue;
    if (selectedIndex === correctIndexOf(item)) continue;
    const role = distractorRoleAt(item, selectedIndex);
    if (!role) continue;
    const entry = mapDistractor(role, mapping);
    const clusterId = clusterIdOf(response, item);
    const key = `${clusterId}::${entry.roleFamily}`;
    if (!grouped.has(key)) grouped.set(key, { entry, evidence: [], clusterId });
    grouped.get(key)!.evidence.push({ itemId: response.itemId, distractorRole: role, roleFamily: entry.roleFamily, clusterId });
  }

  return [...grouped.values()]
    .map(({ entry, evidence, clusterId }) => buildInsight(attempt, form, entry, evidence, usableMcqByCluster.get(clusterId) ?? evidence.length))
    .sort((a, b) => `${a.roleFamily}:${a.evidence.map((row) => row.itemId).join(",")}`.localeCompare(`${b.roleFamily}:${b.evidence.map((row) => row.itemId).join(",")}`));
}

function buildInsight(attempt: PssaInsightAttempt, form: PssaInsightForm, entry: MappingEntry, evidence: PssaInsightEvidence[], clusterUsableItems: number): PssaStudentInsight {
  const confidence = confidenceFor(evidence.length, clusterUsableItems);
  return {
    mappingVersion: MAPPING_VERSION,
    benchmarkSeason: attempt.benchmarkSeason ?? "unknown",
    formId: form.formId ?? form.id ?? "unknown",
    ...(form.formVersion || form.version || form.blueprintVersion || form.contentHash ? { formVersion: String(form.formVersion ?? form.version ?? form.blueprintVersion ?? form.contentHash) } : {}),
    confidence,
    roleFamily: entry.roleFamily,
    interpretation: renderInterpretation(entry, confidence, evidence.length),
    teacherMove: renderTeacherMove(entry, confidence),
    ...(entry.recommendedSkill ? { recommendedSkill: entry.recommendedSkill } : {}),
    ...(entry.lessonReference ? { lessonReference: entry.lessonReference } : {}),
    evidence: evidence.slice().sort((a, b) => a.itemId.localeCompare(b.itemId)),
  };
}

function confidenceFor(missCount: number, clusterUsableItems: number): InsightConfidence {
  if (clusterUsableItems < 3) return "limited_evidence";
  if (missCount >= 3) return "strong_pattern";
  if (missCount === 2) return "likely";
  return "possible";
}

function renderInterpretation(entry: MappingEntry, confidence: InsightConfidence, count: number) {
  const prefix = confidence === "limited_evidence"
    ? "Limited evidence: this is a small sample, so treat the pattern as a prompt for a quick check."
    : confidence === "possible"
      ? "Possible pattern from one item."
      : confidence === "likely"
        ? "Likely pattern across two related items."
        : `Strong pattern across ${count} related items.`;
  return `${prefix} ${entry.interpretation}`;
}

function renderTeacherMove(entry: MappingEntry, confidence: InsightConfidence) {
  const frame = confidence === "limited_evidence" ? "Use a brief confirmation task before reteaching." : "Suggested next move.";
  return `${frame} ${entry.teacherMove}`;
}

function readingEntry(role: RoleFamily, interpretation: string, teacherMove: string, recommendedSkill: string): MappingEntry {
  return { role, roleFamily: role, interpretation, teacherMove, recommendedSkill, lessonReference: `pssa-reading-${role}` };
}

function conventionsEntry(role: string, roleFamily: RoleFamily, interpretation: string, teacherMove: string, recommendedSkill: string): MappingEntry {
  return { role, roleFamily, interpretation, teacherMove, recommendedSkill, lessonReference: `pssa-conventions-${roleFamily}` };
}

function itemId(item: PssaInsightFormItem) {
  return String(item.itemId ?? item.id ?? "");
}

function selectedIndexOf(response: PssaInsightResponse) {
  const value = response.selectedIndex ?? response.selectedChoiceIndex;
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function correctIndexOf(item: PssaInsightFormItem) {
  return typeof item.correctIndex === "number" && Number.isInteger(item.correctIndex) ? item.correctIndex : null;
}

function interactionTypeOf(response: PssaInsightResponse, item: PssaInsightFormItem) {
  return String(response.interactionType ?? item.interactionType ?? item.item?.interactionType ?? "").toUpperCase();
}

function clusterIdOf(response: PssaInsightResponse, item: PssaInsightFormItem) {
  return String(response.clusterId ?? item.clusterId ?? item.passageId ?? item.passageIdSnapshot ?? item.eligibleContent ?? "whole_form");
}

function usableMcqCountsByCluster(form: PssaInsightForm) {
  const counts = new Map<string, number>();
  for (const item of form.items ?? []) {
    if (String(item.interactionType ?? item.item?.interactionType ?? "").toUpperCase() !== "MCQ") continue;
    const clusterId = clusterIdOf({ itemId: itemId(item) }, item);
    counts.set(clusterId, (counts.get(clusterId) ?? 0) + 1);
  }
  return counts;
}

function distractorRoleAt(item: PssaInsightFormItem, selectedIndex: number) {
  const structured = arraySource(item.structuredChoicesJson ?? item.item?.structuredChoicesJson);
  const structuredRole = structured[selectedIndex]?.distractorRole;
  if (typeof structuredRole === "string" && structuredRole) return structuredRole;
  const choices = arraySource(item.choices ?? item.answerChoicesJson ?? item.item?.choices ?? item.item?.answerChoicesJson);
  const role = choices[selectedIndex]?.distractorRole;
  return typeof role === "string" && role ? role : null;
}

function arraySource(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}
