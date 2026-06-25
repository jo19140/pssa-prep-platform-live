import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";

const outputDir = path.resolve("exemplars/pssa_grade3_eoy_conventions");
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-eoy-v1";

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

export type EoyConventionsItem = {
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
  auditMetadata: { authoredIn: "PSSA_EOY_CONVENTIONS_ITEMS"; noDbWrite: true; productionImportReady: false };
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
  assert.equal(baseText.includes("___"), true, `${blankId} base text must contain one blank`);
  assert.equal(baseText.indexOf("___"), baseText.lastIndexOf("___"), `${blankId} base text must contain exactly one blank`);
  assert.equal(options.length, 4, `${blankId} must have exactly four options`);
  assert.equal(options[correctIndex].errorPattern, null, `${blankId} correct option must have null errorPattern`);
  const distractorPatterns = options.filter((_option, index) => index !== correctIndex).map((option) => option.errorPattern);
  assert.equal(distractorPatterns.every(Boolean), true, `${blankId} distractors must have errorPattern`);
  assert.equal(new Set(distractorPatterns).size, 3, `${blankId} distractor errorPatterns must be distinct`);
  assert.equal(new Set(options.map((option) => option.text)).size, 4, `${blankId} option texts must be unique`);
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
  const item: EoyConventionsItem = {
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
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion, unit: "conventions" },
    auditMetadata: { authoredIn: "PSSA_EOY_CONVENTIONS_ITEMS", noDbWrite: true, productionImportReady: false },
  };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

export function buildEoyConventionsItems(): EoyConventionsItem[] {
  const items = [
    item({
      itemId: "pssa_item_g3_eoy_conv_d112_plurals",
      eligibleContent: "E03.D.1.1.2",
      targetConvention: "regular and irregular plural nouns",
      targetSubskill: "irregular_plural_nouns",
      stem: "Choose the plural noun that correctly completes the sentence.",
      baseTextWithBlanks: "The farmer counted six ___ beside the pond.",
      correctIndex: 0,
      targetSkill: "irregular plural nouns",
      targetWordOrPhrase: "geese",
      options: [
        { text: "geese", errorPattern: null, rationale: "Geese is the correct irregular plural form of goose." },
        { text: "gooses", errorPattern: "regular_s_added_to_irregular_noun", rationale: "Gooses incorrectly adds regular -s to an irregular noun." },
        { text: "goose", errorPattern: "singular_used_where_plural_needed", rationale: "Goose is singular, but the sentence names six animals." },
        { text: "geeses", errorPattern: "extra_s_on_irregular_plural", rationale: "Geeses adds an extra ending to the already-plural word geese." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d113_abstract_noun",
      eligibleContent: "E03.D.1.1.3",
      targetConvention: "abstract nouns",
      targetSubskill: "abstract_nouns",
      stem: "Choose the noun that correctly completes the sentence.",
      baseTextWithBlanks: "The children showed great ___ when they shared their snacks.",
      correctIndex: 1,
      targetSkill: "abstract noun",
      targetWordOrPhrase: "kindness",
      options: [
        { text: "kind", errorPattern: "adjective_used_where_abstract_noun_needed", rationale: "Kind is an adjective, but the sentence needs a noun that names the quality." },
        { text: "kindness", errorPattern: null, rationale: "Kindness is an abstract noun that names the quality the children showed." },
        { text: "kindly", errorPattern: "adverb_used_where_abstract_noun_needed", rationale: "Kindly is an adverb, not the noun needed after showed great." },
        { text: "kinder", errorPattern: "comparative_used_where_abstract_noun_needed", rationale: "Kinder compares qualities, but it is not the noun form needed here." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d116_pronoun_agreement",
      eligibleContent: "E03.D.1.1.6",
      targetConvention: "pronoun-antecedent agreement",
      targetSubskill: "pronoun_antecedent_agreement",
      stem: "Choose the pronoun that correctly completes the sentence.",
      baseTextWithBlanks: "The two hikers packed ___ own water bottles.",
      correctIndex: 0,
      targetSkill: "pronoun-antecedent agreement",
      targetWordOrPhrase: "their",
      options: [
        { text: "their", errorPattern: null, rationale: "Their is a possessive pronoun that agrees with the plural antecedent two hikers." },
        { text: "his", errorPattern: "singular_pronoun_with_plural_antecedent", rationale: "His is singular, but two hikers is plural." },
        { text: "they", errorPattern: "subject_pronoun_used_where_possessive_needed", rationale: "They is a subject pronoun, but the sentence needs a possessive before own." },
        { text: "our", errorPattern: "first_person_pronoun_mismatch", rationale: "Our does not match the third-person antecedent two hikers." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d117_comparative",
      eligibleContent: "E03.D.1.1.7",
      targetConvention: "comparative and superlative adjectives",
      targetSubskill: "comparative_superlative",
      stem: "Choose the adjective that correctly completes the sentence.",
      baseTextWithBlanks: "Of the three kittens, the gray one is the ___.",
      correctIndex: 2,
      targetSkill: "superlative adjective",
      targetWordOrPhrase: "smallest",
      options: [
        { text: "smaller", errorPattern: "comparative_used_for_three_or_more", rationale: "Smaller compares two things, but the sentence compares three kittens." },
        { text: "more small", errorPattern: "more_used_with_short_adjective", rationale: "More small is not the standard comparative or superlative form for the short adjective small." },
        { text: "smallest", errorPattern: null, rationale: "Smallest is the superlative form used when comparing three or more." },
        { text: "most small", errorPattern: "most_used_with_short_adjective", rationale: "Most small is not the standard superlative form for the short adjective small." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d119_sentence_formation",
      eligibleContent: "E03.D.1.1.9",
      targetConvention: "produce compound and complex sentences",
      targetSubskill: "sentence_formation",
      stem: "Choose the words that correctly complete the sentence.",
      baseTextWithBlanks: "The sky grew dark, ___",
      correctIndex: 0,
      targetSkill: "compound sentence formation",
      targetWordOrPhrase: "and the wind began to blow.",
      options: [
        { text: "and the wind began to blow.", errorPattern: null, rationale: "The conjunction and joins two complete ideas with the comma already in place." },
        { text: "the wind began to blow.", errorPattern: "comma_splice_without_conjunction", rationale: "This joins two complete sentences with only a comma." },
        { text: "and the wind blowing hard.", errorPattern: "fragment_without_complete_verb", rationale: "Blowing has no helping verb, so the second part is not a complete idea." },
        { text: "and the wind blew hard the trees bent.", errorPattern: "run_on_two_complete_ideas", rationale: "This adds another complete idea without punctuation to separate it." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d122_address_commas",
      eligibleContent: "E03.D.1.2.2",
      targetConvention: "commas in addresses",
      targetSubskill: "commas_in_addresses",
      stem: "Choose the words and punctuation that correctly complete the sentence.",
      baseTextWithBlanks: "My aunt's new house is in ___.",
      correctIndex: 3,
      targetSkill: "commas in city-state addresses",
      targetWordOrPhrase: "Tampa, Florida",
      options: [
        { text: "Tampa Florida", errorPattern: "missing_comma_between_city_and_state", rationale: "A comma is needed between the city and state." },
        { text: "Tampa Florida,", errorPattern: "comma_after_state_instead_of_between", rationale: "This places a comma after the state but still misses the comma between city and state." },
        { text: "Tampa, Florida,", errorPattern: "extra_comma_after_state_at_sentence_end", rationale: "The comma between city and state is correct, but no extra comma is needed before the sentence period." },
        { text: "Tampa, Florida", errorPattern: null, rationale: "A comma correctly separates the city Tampa from the state Florida." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d123_dialogue",
      eligibleContent: "E03.D.1.2.3",
      targetConvention: "quotation marks and commas in dialogue",
      targetSubskill: "dialogue_punctuation",
      stem: "Choose the words and punctuation that correctly complete the dialogue.",
      baseTextWithBlanks: "Lily smiled and said, ___",
      correctIndex: 1,
      targetSkill: "tag-first dialogue punctuation",
      targetWordOrPhrase: "\"Let's go to the park.\"",
      options: [
        { text: "Let's go to the park.", errorPattern: "missing_quotation_marks", rationale: "The spoken words need quotation marks." },
        { text: "\"Let's go to the park.\"", errorPattern: null, rationale: "The spoken words are capitalized and the period is inside the quotation marks." },
        { text: "\"let's go to the park.\"", errorPattern: "quotation_starts_with_lowercase_word", rationale: "The first word of the quotation should be capitalized." },
        { text: "\"Let's go to the park\".", errorPattern: "period_outside_closing_quotation_mark", rationale: "The period should be inside the closing quotation mark." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d124_possessives",
      eligibleContent: "E03.D.1.2.4",
      targetConvention: "form and use possessives",
      targetSubskill: "possessives",
      stem: "Choose the possessive noun that correctly completes the sentence.",
      baseTextWithBlanks: "All three ___ kites were tangled in the tree.",
      correctIndex: 2,
      targetSkill: "plural possessive nouns",
      targetWordOrPhrase: "girls'",
      options: [
        { text: "girls", errorPattern: "plural_without_apostrophe", rationale: "Girls is plural but does not show ownership." },
        { text: "girl's", errorPattern: "singular_possessive_for_plural_owners", rationale: "Girl's shows one owner, but all three girls own the kites." },
        { text: "girls'", errorPattern: null, rationale: "Girls' is the plural possessive form for more than one girl." },
        { text: "girls's", errorPattern: "extra_s_after_plural_possessive", rationale: "Girls's incorrectly adds another s after the plural possessive." },
      ],
    }),
    item({
      itemId: "pssa_item_g3_eoy_conv_d126_spelling",
      eligibleContent: "E03.D.1.2.6",
      targetConvention: "spelling patterns and generalizations",
      targetSubskill: "spelling_ending_rules",
      stem: "Choose the correctly spelled word.",
      baseTextWithBlanks: "The children were ___ across the open field.",
      correctIndex: 3,
      targetSkill: "doubling final consonant before -ing",
      targetWordOrPhrase: "running",
      options: [
        { text: "runing", errorPattern: "final_consonant_not_doubled_before_ing", rationale: "Running needs a doubled n before adding -ing." },
        { text: "runnning", errorPattern: "consonant_doubled_too_many_times", rationale: "Runnning has too many n letters." },
        { text: "runnig", errorPattern: "letters_dropped_from_ing_ending", rationale: "Runnig drops a letter from the -ing ending." },
        { text: "running", errorPattern: null, rationale: "Running correctly doubles the final consonant before -ing." },
      ],
    }),
  ];
  validateItems(items);
  assertNoReuseAgainstSources(items);
  return items;
}

function validateItems(items: EoyConventionsItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_eoy_conv_d112_plurals",
    "pssa_item_g3_eoy_conv_d113_abstract_noun",
    "pssa_item_g3_eoy_conv_d116_pronoun_agreement",
    "pssa_item_g3_eoy_conv_d117_comparative",
    "pssa_item_g3_eoy_conv_d119_sentence_formation",
    "pssa_item_g3_eoy_conv_d122_address_commas",
    "pssa_item_g3_eoy_conv_d123_dialogue",
    "pssa_item_g3_eoy_conv_d124_possessives",
    "pssa_item_g3_eoy_conv_d126_spelling",
  ]);
  assert.deepEqual(items.map((item) => item.blanks[0].correctIndex), [0, 1, 0, 2, 0, 3, 1, 2, 3]);
  assert.equal(new Set(items.map((item) => item.eligibleContent)).size, 9, "EOY conventions ECs must not repeat");
  for (const row of items) {
    assert.equal(row.passageId, null);
    assert.equal(row.interactionType, "INLINE_DROPDOWN");
    assert.equal(row.interactionSubtype, "single_blank");
    assert.equal(row.ecSkillFamily, "conventions");
    assert.equal((row as any).scoringBucket, undefined);
    assert.equal((row as any).section, undefined);
    assert.equal((row as any).passageGroupId, undefined);
    for (const option of row.blanks[0].options) assert.equal((option as any).distractorRole, undefined, `${row.itemId} must not carry distractorRole`);
    projectPssaStudentItem(row);
  }
}

function normalize(text: unknown) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function optionSet(options: any[]) {
  return options.map((option) => normalize(typeof option === "string" ? option : option.text)).sort().join("|");
}

function contentSentence(item: any) {
  if (item.baseTextWithBlanks) return item.baseTextWithBlanks;
  const stem = String(item.stem ?? item.studentFacingPrompt ?? "");
  const quoted = stem.match(/"([^"]+)"/g);
  if (quoted?.length) return quoted.map((part) => part.slice(1, -1)).join(" ");
  return stem;
}

function sourceRows() {
  const files = [
    "exemplars/pssa_grade3_conventions/grade3_conventions_backend.json",
    "exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json",
    "exemplars/pssa_grade3_moy_conventions/backend.json",
  ];
  const rows: Array<{ itemId: string; ec: string; baseText: string; target: string; options: string; targetSubskill: string }> = [];
  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of parsed.items ?? []) {
      const blank = item.blanks?.[0];
      const rawOptions = blank?.options ?? item.answerChoicesJson ?? item.choices ?? item.structuredChoicesJson ?? [];
      const target = blank?.targetWordOrPhrase ?? item.targetWordOrPhrase ?? item.correctAnswer ?? (Number.isInteger(item.correctIndex) ? rawOptions[item.correctIndex] : "");
      rows.push({
        itemId: item.itemId ?? item.id,
        ec: item.eligibleContent,
        baseText: normalize(contentSentence(item)),
        target: normalize(typeof target === "string" ? target : target?.text),
        options: optionSet(rawOptions),
        targetSubskill: item.targetSubskill,
      });
    }
  }
  return rows;
}

export function assertNoReuseAgainstSources(eoyItems: EoyConventionsItem[]) {
  const sources = sourceRows();
  for (const item of eoyItems) {
    const blank = item.blanks[0];
    const current = {
      baseText: normalize(item.baseTextWithBlanks),
      target: normalize(blank.targetWordOrPhrase),
      options: optionSet(blank.options),
    };
    for (const source of sources) {
      assert.notEqual(current.baseText, source.baseText, `${item.itemId} baseTextWithBlanks reuses ${source.itemId}`);
      assert.notEqual(current.target, source.target, `${item.itemId} target/correct answer reuses ${source.itemId}`);
      assert.notEqual(current.options, source.options, `${item.itemId} option set reuses ${source.itemId}`);
    }
  }
  const moyAgreement = sources.find((row) => row.ec === "E03.D.1.1.6" && row.targetSubskill === "subject_verb_agreement");
  const eoyAgreement = eoyItems.find((item) => item.itemId === "pssa_item_g3_eoy_conv_d116_pronoun_agreement");
  assert(moyAgreement && eoyAgreement, "MOY/EOY D.1.1.6 rows must exist");
  assert.equal(eoyAgreement.targetSubskill, "pronoun_antecedent_agreement");
  assert.notEqual(eoyAgreement.targetSubskill, moyAgreement.targetSubskill, "EOY D.1.1.6 must rotate away from MOY subject-verb facet");
  assert.notEqual(normalize(eoyAgreement.baseTextWithBlanks), moyAgreement.baseText, "EOY D.1.1.6 base text must differ from MOY");
  assert.notEqual(optionSet(eoyAgreement.blanks[0].options), moyAgreement.options, "EOY D.1.1.6 options must differ from MOY");

  const moyDialogue = sources.find((row) => row.ec === "E03.D.1.2.3" && row.baseText.startsWith("said omar"));
  const eoyDialogue = eoyItems.find((item) => item.itemId === "pssa_item_g3_eoy_conv_d123_dialogue");
  assert(moyDialogue && eoyDialogue, "MOY/EOY D.1.2.3 rows must exist");
  assert.equal(eoyDialogue.baseTextWithBlanks.includes("said, ___"), true, "EOY dialogue must be tag-first");
  assert.notEqual(normalize(eoyDialogue.baseTextWithBlanks), moyDialogue.baseText, "EOY D.1.2.3 base text must differ from MOY");
  assert.notEqual(optionSet(eoyDialogue.blanks[0].options), moyDialogue.options, "EOY D.1.2.3 options must differ from MOY");
}

export function buildEoyConventionsPacket() {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    itemCount: 9,
    items: buildEoyConventionsItems(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildEoyConventionsPacket>) {
  const lines = ["# EOY Conventions Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildEoyConventionsPacket>) {
  const lines = ["# EOY Conventions Reviewer Preview", "", "Includes keys, error patterns, and rationales. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    const blank = item.blanks[0];
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Target: ${item.targetConvention} / ${item.targetSubskill}`, item.baseTextWithBlanks, "");
    blank.options.forEach((option, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === blank.correctIndex ? " (KEY)" : ""}: ${option.text} — ${option.errorPattern ?? "correct"} — ${option.rationale}`));
    lines.push("");
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildEoyConventionsPacket>) {
  const lines = ["# EOY Conventions Answer Key", ""];
  for (const item of packet.items) {
    const blank = item.blanks[0];
    lines.push(`## ${item.itemId}`, "", `Correct: ${String.fromCharCode(65 + blank.correctIndex)} (${blank.options[blank.correctIndex].text})`, "");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildEoyConventionsPacket>) {
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
  const packet = buildEoyConventionsPacket();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("EOY conventions authoring complete: wrote exemplars/pssa_grade3_eoy_conventions/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
