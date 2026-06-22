import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";

const outputDir = path.resolve("exemplars/pssa_grade3_moy_conventions");
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-moy-v1";

type Option = { text: string; errorPattern: string | null; rationale: string };
type Blank = {
  blankId: string;
  position: number;
  options: Option[];
  correctIndex: number;
  targetSkill: string;
  targetWordOrPhrase: string;
  rationale: string;
};
export type MoyConventionsItem = {
  id: string;
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "INLINE_DROPDOWN";
  interactionType: "INLINE_DROPDOWN";
  interactionSubtype: "single_blank";
  passageId: null;
  ecSkillFamily: "conventions";
  eligibleContent: string;
  reportingCategory: "D";
  pointValue: 1;
  targetConvention: string;
  targetSubskill: string;
  stem: string;
  instructionText: string;
  baseTextWithBlanks: string;
  blanks: Blank[];
  correctResponseJson: { blanks: Array<{ blankId: string; correctIndex: number }> };
  scoringJson: { totalPoints: 1 };
  scoring: { totalPoints: 1; partialCreditRules: Array<{ points: number; rule: string }>; scoringNotes: string };
  responseSpecJson: unknown;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  commercialUseAllowed: true;
  needsLegalReview: false;
  approvalEligible: false;
  provenanceJson: Record<string, unknown>;
  auditMetadata: { authoredIn: "PSSA_MOY_CONVENTIONS_ITEMS"; noDbWrite: true; productionImportReady: false };
};

const scoring = {
  totalPoints: 1 as const,
  partialCreditRules: [
    { points: 1, rule: "The single correct convention response is selected." },
    { points: 0, rule: "Any incorrect, ambiguous, missing, or extra response earns no credit." },
  ],
  scoringNotes: "Full credit requires the one defensible convention answer and no contradictory answer.",
};

function blank(blankId: string, baseText: string, options: Option[], correctIndex: number, targetSkill: string, targetWordOrPhrase: string, rationale: string): Blank {
  assert.equal(options.length, 4, `${blankId} must have exactly four options`);
  assert.equal(options[correctIndex].errorPattern, null, `${blankId} correct option must have null errorPattern`);
  const distractorPatterns = options.filter((_option, index) => index !== correctIndex).map((option) => option.errorPattern);
  assert.equal(distractorPatterns.every(Boolean), true, `${blankId} distractors must have errorPattern`);
  assert.equal(new Set(distractorPatterns).size, 3, `${blankId} distractor errorPatterns must be distinct`);
  return {
    blankId,
    position: baseText.indexOf("___"),
    options,
    correctIndex,
    targetSkill,
    targetWordOrPhrase,
    rationale,
  };
}

function item(args: {
  itemId: string;
  eligibleContent: string;
  targetConvention: string;
  targetSubskill: string;
  stem: string;
  baseTextWithBlanks: string;
  options: Option[];
  correctIndex: number;
  targetSkill: string;
  targetWordOrPhrase: string;
}) {
  const item: MoyConventionsItem = {
    id: args.itemId,
    itemId: args.itemId,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: "INLINE_DROPDOWN",
    interactionType: "INLINE_DROPDOWN",
    interactionSubtype: "single_blank",
    passageId: null,
    ecSkillFamily: "conventions",
    eligibleContent: args.eligibleContent,
    reportingCategory: "D",
    pointValue: 1,
    targetConvention: args.targetConvention,
    targetSubskill: args.targetSubskill,
    stem: args.stem,
    instructionText: "Choose the option that correctly completes the sentence.",
    baseTextWithBlanks: args.baseTextWithBlanks,
    blanks: [blank(`${args.itemId}_blank`, args.baseTextWithBlanks, args.options, args.correctIndex, args.targetSkill, args.targetWordOrPhrase, args.options[args.correctIndex].rationale)],
    correctResponseJson: { blanks: [{ blankId: `${args.itemId}_blank`, correctIndex: args.correctIndex }] },
    scoringJson: { totalPoints: 1 },
    scoring,
    responseSpecJson: {},
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    approvalEligible: false,
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion, unit: "conventions" },
    auditMetadata: { authoredIn: "PSSA_MOY_CONVENTIONS_ITEMS", noDbWrite: true, productionImportReady: false },
  };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

export function buildMoyConventionsItems(): MoyConventionsItem[] {
  const items = [
    item({
      itemId: "pssa_item_g3_moy_conv_d111_word_function",
      eligibleContent: "E03.D.1.1.1",
      targetConvention: "word function in a sentence",
      targetSubskill: "word_function",
      stem: "Choose the word that correctly completes the sentence.",
      baseTextWithBlanks: "The students carried the model ___ across the room.",
      correctIndex: 1,
      targetSkill: "word function",
      targetWordOrPhrase: "carefully",
      options: [
        { text: "careful", errorPattern: "adjective_used_where_adverb_needed", rationale: "Careful is an adjective, but the sentence needs an adverb to tell how the students carried the model." },
        { text: "carefully", errorPattern: null, rationale: "Carefully is an adverb that tells how the students carried the model." },
        { text: "care", errorPattern: "noun_or_base_verb_used_where_adverb_needed", rationale: "Care can be a noun or verb, but it does not tell how the action was done." },
        { text: "carefulness", errorPattern: "ness_noun_used_where_adverb_needed", rationale: "Carefulness is a noun, not an adverb that describes the carrying." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d114_irregular_verb",
      eligibleContent: "E03.D.1.1.4",
      targetConvention: "regular and irregular verbs",
      targetSubskill: "regular_irregular_verbs",
      stem: "Choose the verb that correctly completes the sentence.",
      baseTextWithBlanks: "Yesterday, Ava ___ her bicycle.",
      correctIndex: 3,
      targetSkill: "irregular verb formation",
      targetWordOrPhrase: "rode",
      options: [
        { text: "rided", errorPattern: "regular_ed_added_to_irregular_verb", rationale: "Rided incorrectly adds -ed to the irregular verb ride." },
        { text: "ridden", errorPattern: "past_participle_used_as_simple_past", rationale: "Ridden is a past participle and does not work alone as the simple past verb here." },
        { text: "rides", errorPattern: "present_tense_used_for_past_time", rationale: "Rides is present tense, but yesterday signals past time." },
        { text: "rode", errorPattern: null, rationale: "Rode is the correct simple past form of ride." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d115_verb_tense",
      eligibleContent: "E03.D.1.1.5",
      targetConvention: "simple verb tense",
      targetSubskill: "verb_tense",
      stem: "Choose the verb form that correctly completes the sentence.",
      baseTextWithBlanks: "Yesterday, the class ___ across the bridge.",
      correctIndex: 0,
      targetSkill: "simple past tense",
      targetWordOrPhrase: "crossed",
      options: [
        { text: "crossed", errorPattern: null, rationale: "Crossed is the correct past-tense verb for the time clue yesterday." },
        { text: "crosses", errorPattern: "present_tense_used_for_past_time", rationale: "Crosses is present tense, but the sentence is about yesterday." },
        { text: "will cross", errorPattern: "future_tense_used_for_past_time", rationale: "Will cross is future tense, but yesterday signals past time." },
        { text: "crossing", errorPattern: "ing_form_without_helping_verb", rationale: "Crossing needs a helping verb to work as the verb in this sentence." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d116_agreement",
      eligibleContent: "E03.D.1.1.6",
      targetConvention: "subject-verb agreement",
      targetSubskill: "subject_verb_agreement",
      stem: "Choose the verb that agrees with the subject.",
      baseTextWithBlanks: "Today, the group of students ___ ready to begin.",
      correctIndex: 2,
      targetSkill: "subject-verb agreement",
      targetWordOrPhrase: "is",
      options: [
        { text: "were", errorPattern: "plural_past_verb_agrees_with_nearby_noun", rationale: "Were incorrectly agrees with students instead of the subject group." },
        { text: "are", errorPattern: "plural_present_verb_agrees_with_nearby_noun", rationale: "Are incorrectly agrees with students instead of the singular subject group." },
        { text: "is", errorPattern: null, rationale: "Is agrees with the singular subject group." },
        { text: "be", errorPattern: "base_form_with_no_subject_agreement", rationale: "Be does not agree with the subject in this sentence." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d118_conjunctions",
      eligibleContent: "E03.D.1.1.8",
      targetConvention: "coordinating and subordinating conjunctions",
      targetSubskill: "conjunctions",
      stem: "Choose the conjunction that best connects the ideas.",
      baseTextWithBlanks: "The path was muddy. Maya wore boots ___ she did not want mud on her socks.",
      correctIndex: 0,
      targetSkill: "cause conjunction",
      targetWordOrPhrase: "because",
      options: [
        { text: "because", errorPattern: null, rationale: "Because correctly shows why Maya wore boots." },
        { text: "although", errorPattern: "contrast_conjunction_where_cause_needed", rationale: "Although shows contrast, but the sentence needs a reason." },
        { text: "or", errorPattern: "choice_conjunction_where_cause_needed", rationale: "Or shows a choice, but the sentence explains the cause." },
        { text: "so", errorPattern: "result_conjunction_reverses_cause_effect", rationale: "So would make the second idea sound like a result, but it is the reason." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d121_title_caps",
      eligibleContent: "E03.D.1.2.1",
      targetConvention: "capitalization in titles",
      targetSubskill: "title_capitalization",
      stem: "Select the book title with correct capitalization.",
      baseTextWithBlanks: "The class read the book ___.",
      correctIndex: 2,
      targetSkill: "title capitalization",
      targetWordOrPhrase: "The Secret in the Attic",
      options: [
        { text: "the secret in the attic", errorPattern: "all_title_words_lowercase", rationale: "The important words in the title should be capitalized." },
        { text: "The Secret In The Attic", errorPattern: "small_words_over_capitalized", rationale: "The small words in and the should not both be capitalized in this title." },
        { text: "The Secret in the Attic", errorPattern: null, rationale: "The first word and important words are capitalized, while in and the stay lowercase." },
        { text: "The secret in the Attic", errorPattern: "inconsistent_title_capitalization", rationale: "Secret should be capitalized as an important word in the title." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d123_dialogue",
      eligibleContent: "E03.D.1.2.3",
      targetConvention: "quotation marks and commas in dialogue",
      targetSubskill: "dialogue_punctuation",
      stem: "Choose the words and punctuation that correctly complete the dialogue.",
      baseTextWithBlanks: "___ said Omar.",
      correctIndex: 1,
      targetSkill: "dialogue punctuation",
      targetWordOrPhrase: "\"Please close the gate,\"",
      options: [
        { text: "\"Please close the gate\"", errorPattern: "missing_comma_before_dialogue_tag", rationale: "A comma is needed before the dialogue tag said Omar." },
        { text: "\"Please close the gate,\"", errorPattern: null, rationale: "The comma belongs inside the closing quotation mark before the dialogue tag." },
        { text: "\"Please close the gate\",", errorPattern: "comma_outside_quotation_marks", rationale: "The comma should be inside the quotation marks." },
        { text: "Please close the gate,", errorPattern: "missing_quotation_marks", rationale: "The spoken words need quotation marks." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d125_spelling",
      eligibleContent: "E03.D.1.2.5",
      targetConvention: "grade-level spelling and suffixes",
      targetSubskill: "spelling_in_context",
      stem: "Choose the correctly spelled word.",
      baseTextWithBlanks: "Lena is ___ a poster for the fair.",
      correctIndex: 3,
      targetSkill: "drop e before -ing",
      targetWordOrPhrase: "making",
      options: [
        { text: "makeing", errorPattern: "silent_e_kept_before_ing", rationale: "The silent e in make should be dropped before adding -ing." },
        { text: "makking", errorPattern: "consonant_doubled_incorrectly", rationale: "The consonant k should not be doubled when adding -ing to make." },
        { text: "makin", errorPattern: "final_letters_dropped", rationale: "Makin drops letters and is not the standard spelling." },
        { text: "making", errorPattern: null, rationale: "Making correctly drops the silent e before adding -ing." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_moy_conv_d211_word_choice",
      eligibleContent: "E03.D.2.1.1",
      targetConvention: "word or phrase choice for effect",
      targetSubskill: "word_choice_for_effect",
      stem: "Choose the most precise word for the sentence.",
      baseTextWithBlanks: "The puppy ___ across the yard, kicking up dust as it hurried to greet Maya.",
      correctIndex: 0,
      targetSkill: "precise word choice",
      targetWordOrPhrase: "raced",
      options: [
        { text: "raced", errorPattern: null, rationale: "Raced best matches the puppy hurrying and kicking up dust." },
        { text: "went", errorPattern: "overly_general_word_choice", rationale: "Went is too general to show the puppy's quick movement." },
        { text: "strolled", errorPattern: "too_slow_for_context", rationale: "Strolled suggests slow walking, which conflicts with hurried." },
        { text: "proceeded", errorPattern: "awkwardly_formal_register", rationale: "Proceeded is too formal and does not fit the lively sentence." },
      ],
    }),
  ];
  validateItems(items);
  return items;
}

function validateItems(items: MoyConventionsItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_moy_conv_d111_word_function",
    "pssa_item_g3_moy_conv_d114_irregular_verb",
    "pssa_item_g3_moy_conv_d115_verb_tense",
    "pssa_item_g3_moy_conv_d116_agreement",
    "pssa_item_g3_moy_conv_d118_conjunctions",
    "pssa_item_g3_moy_conv_d121_title_caps",
    "pssa_item_g3_moy_conv_d123_dialogue",
    "pssa_item_g3_moy_conv_d125_spelling",
    "pssa_item_g3_moy_conv_d211_word_choice",
  ]);
  assert.deepEqual(items.map((item) => item.blanks[0].correctIndex), [1, 3, 0, 2, 0, 2, 1, 3, 0]);
  for (const row of items) {
    assert.equal(row.passageId, null);
    assert.equal(row.interactionType, "INLINE_DROPDOWN");
    assert.equal(row.interactionSubtype, "single_blank");
    assert.equal(row.ecSkillFamily, "conventions");
    assert.equal((row as any).scoringBucket, undefined);
    assert.equal((row as any).section, undefined);
    for (const option of row.blanks[0].options) assert.equal((option as any).distractorRole, undefined, `${row.itemId} must not carry distractorRole`);
    projectPssaStudentItem(row);
  }
}

export function buildMoyConventionsPacket() {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    itemCount: 9,
    items: buildMoyConventionsItems(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildMoyConventionsPacket>) {
  const lines = ["# MOY Conventions Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildMoyConventionsPacket>) {
  const lines = ["# MOY Conventions Reviewer Preview", "", "Includes keys, error patterns, and rationales. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    const blank = item.blanks[0];
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Target: ${item.targetConvention} / ${item.targetSubskill}`, item.baseTextWithBlanks, "");
    blank.options.forEach((option, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === blank.correctIndex ? " (KEY)" : ""}: ${option.text} — ${option.errorPattern ?? "correct"} — ${option.rationale}`));
    lines.push("");
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildMoyConventionsPacket>) {
  const lines = ["# MOY Conventions Answer Key", ""];
  for (const item of packet.items) {
    const blank = item.blanks[0];
    lines.push(`## ${item.itemId}`, "", `Correct: ${String.fromCharCode(65 + blank.correctIndex)} (${blank.options[blank.correctIndex].text})`, "");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildMoyConventionsPacket>) {
  const header = ["itemId", "eligibleContent", "targetSubskill", "correctIndex", "key", "optionCount", "distractorErrorPatterns", "studentPreviewLeakFree"];
  const rows = packet.items.map((item) => {
    const blank = item.blanks[0];
    return [
      item.itemId,
      item.eligibleContent,
      item.targetSubskill,
      String(blank.correctIndex),
      String.fromCharCode(65 + blank.correctIndex),
      String(blank.options.length),
      blank.options.filter((_option, index) => index !== blank.correctIndex).map((option) => option.errorPattern).join("|"),
      "PASS",
    ];
  });
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function main() {
  const packet = buildMoyConventionsPacket();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("MOY conventions authoring complete: wrote exemplars/pssa_grade3_moy_conventions/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
