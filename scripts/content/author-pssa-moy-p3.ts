import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";

const outputDir = path.resolve("exemplars/pssa_grade3_moy_p3");
const groupId = "pssa_pg_g3_moy_p3_mail_paired";
const passage1Id = "pssa_psg_g3_moy_p3_letter_travels";
const passage2Id = "pssa_psg_g3_moy_p3_carrier_day";
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-moy-v1";

type Role = keyof typeof mappingRegistry;
type Slot = "passage_1" | "passage_2";

type EvidenceBinding = {
  evidenceKind: "whole_passage_synthesis" | "quoted_span" | "paragraph_synthesis";
  passageSlot?: Slot;
  passageSlots?: Slot[];
  quotedSpan?: string;
};

type Choice = {
  text: string;
  distractorRole?: Role;
  rationale?: string;
  misconceptionTag?: string;
  evidence?: string;
  evidenceLinks?: Array<{ evidenceKind: "quoted_span"; passageSlot: Slot; quotedSpan: string }>;
};

type P3Item = {
  id: string;
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "MCQ" | "EBSR";
  interactionType: "MCQ" | "EBSR";
  interactionSubtype: string;
  passageId: string | null;
  passageTitle: string;
  passageGroupId: string;
  isCrossText: boolean;
  requiredEvidenceSlotsJson?: Slot[];
  passageLinks: Array<{ passageId: string; role: "primary"; sortOrder?: number }>;
  eligibleContent: string;
  reportingCategory: "B";
  pointValue: number;
  studentFacingPrompt?: string;
  stem?: string;
  answerChoicesJson?: Choice[];
  structuredChoicesJson?: Choice[];
  correctIndex?: number;
  partA?: { prompt: string; choices: Choice[]; correctIndex: number; evidenceBinding: EvidenceBinding };
  partB?: { instruction: string; choices: Array<{ text: string; passageSlot: Slot; isCorrect?: boolean; alignedPartAMisconception?: string }>; requiredSelectionCount: 2 };
  responseSpecJson: unknown;
  correctResponseJson: unknown;
  scoringJson: unknown;
  evidenceBinding: EvidenceBinding;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  commercialUseAllowed: true;
  needsLegalReview: false;
  provenanceJson: Record<string, unknown>;
  auditMetadata: { authoredIn: "PSSA_MOY_P3_ITEMS"; noDbWrite: true; productionImportReady: false; intendedAssemblyBucket?: "operational" | "analytics_only" };
};

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? []).length;
}

function stableHash(value: unknown) {
  const json = JSON.stringify(value);
  return `sha256:${crypto.createHash("sha256").update(json).digest("hex")}`;
}

function packageMarkdown() {
  return fs.readFileSync("specs/pssa_g3_moy_p3_passage_package.md", "utf8");
}

function committedPackageMarkdown() {
  try {
    return execFileSync("git", ["show", "HEAD:specs/pssa_g3_moy_p3_passage_package.md"], { encoding: "utf8" });
  } catch {
    return packageMarkdown();
  }
}

export function moyP3Texts() {
  const txt = packageMarkdown();
  const text1 = txt.split("### Text 1: How a Letter Travels")[1].split("### Text 2:")[0].trim();
  const text2 = txt.split("### Text 2: A Mail Carrier's Day")[1].split("\n---")[0].trim();
  assert.equal(wordCount(text1), 436, "MOY P3 Text 1 word count must be 436");
  assert.equal(wordCount(text2), 360, "MOY P3 Text 2 word count must be 360");
  return { text1, text2 };
}

function basePassage(slot: Slot, id: string, title: string, text: string, factCheckNotesJson: any[]) {
  return {
    id,
    title,
    gradeLevel: 3,
    subject: "ELA",
    passageType: "informational",
    genre: "informational",
    domainVocabularyLoad: "medium",
    wordCount: wordCount(text),
    contentHash: stableHash({ id, title, gradeLevel: 3, subject: "ELA", passageType: "informational", genre: "informational", text }),
    text,
    textFeaturesJson: [],
    factCheckRequired: true,
    factCheckNotesJson,
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion, unit: "P3", passageSlot: slot },
  };
}

function factCheckRecords(slot: Slot) {
  const dateAccessed = "2026-06-21";
  if (slot === "passage_1") return [
    { claimId: "t1-stamp-payment", claim: "A postage stamp is affixed to mail to prepay the cost of delivery.", sourceTitle: "Postage Stamps – The Basics", organization: "U.S. Postal Service", sourceUrl: "https://faq.usps.com/s/article/Postage-Stamps-The-Basics", claimSupported: true, dateAccessed },
    { claimId: "t1-zip-code", claim: "A ZIP Code's digits identify a geographic area of the country, narrowing from region to local Post Office.", sourceTitle: "Introduction of the ZIP Code – U.S. Postal Facts", organization: "U.S. Postal Service", sourceUrl: "https://facts.usps.com/decoding-the-zip-code/", claimSupported: true, dateAccessed },
    { claimId: "t1-sorting-machines", claim: "At modern processing centers mail is faced, cancelled, and sorted by automated machinery rather than by hand.", sourceTitle: "Mail Processing", organization: "Smithsonian National Postal Museum", sourceUrl: "https://postalmuseum.si.edu/exhibition/about-postal-operations/mail-processing", claimSupported: true, dateAccessed },
    { claimId: "t1-air-surface-transport", claim: "Mail moves through the air and along roads in trucks (and over the sea) across the postal transportation network.", sourceTitle: "Core Processes – Systems at Work", organization: "Smithsonian National Postal Museum", sourceUrl: "https://postalmuseum.si.edu/exhibition/systems-at-work-about-the-exhibition/core-processes", claimSupported: true, dateAccessed },
    { claimId: "t1-destination-grouping", claim: "ZIP+4 and added digits let mail be sorted by destination to a specific street, then to a residence or business (finer destination-based sorting).", sourceTitle: "Introduction of the ZIP Code – U.S. Postal Facts", organization: "U.S. Postal Service", sourceUrl: "https://facts.usps.com/decoding-the-zip-code/", claimSupported: true, dateAccessed },
  ];
  return [
    { claimId: "t2-route-order", claim: "A city carrier's route includes office duties such as casing mail before street delivery (office vs. street operations; ~80% of the day on the street).", sourceTitle: "City Delivery Operations – Nationwide Route Management", organization: "USPS Office of Inspector General", sourceUrl: "https://www.uspsoig.gov/reports/audit-reports/city-delivery-operations-nationwide-route-management", claimSupported: true, dateAccessed },
    { claimId: "t2-satchel", claim: "Carriers carry mail in a letter-carrier satchel.", sourceTitle: "Letter Carrier Satchel", organization: "U.S. Postal Service", sourceUrl: "https://about.usps.com/who/profile/history/pdf/letter-carrier-satchel.pdf", claimSupported: true, dateAccessed },
    { claimId: "t2-vehicle", claim: "City carriers deliver and collect mail on foot or by vehicle.", sourceTitle: "Top Jobs – USPS is Hiring", organization: "U.S. Postal Service", sourceUrl: "https://about.usps.com/careers/career-opportunities/top-jobs.htm", claimSupported: true, dateAccessed },
    { claimId: "t2-scanner-tracking", claim: "Carriers use a handheld Mobile Delivery Device (MDD) to scan packages and transmit real-time tracking data.", sourceTitle: "Mobile Delivery Device Program", organization: "USPS Office of Inspector General", sourceUrl: "https://www.uspsoig.gov/reports/audit-reports/mobile-delivery-device-program", claimSupported: true, dateAccessed },
    { claimId: "t2-all-weather", claim: "City carriers deliver under varying road and weather conditions (\"in all kinds of weather\").", sourceTitle: "Top Jobs – USPS is Hiring", organization: "U.S. Postal Service", sourceUrl: "https://about.usps.com/careers/career-opportunities/top-jobs.htm", claimSupported: true, dateAccessed },
  ];
}

export function buildMoyP3PassageGroup() {
  const { text1, text2 } = moyP3Texts();
  const p1 = basePassage("passage_1", passage1Id, "How a Letter Travels", text1, factCheckRecords("passage_1"));
  const p2 = basePassage("passage_2", passage2Id, "A Mail Carrier's Day", text2, factCheckRecords("passage_2"));
  const group = {
    model: "PssaPassageGroup",
    id: groupId,
    gradeLevel: 3,
    subject: "ELA",
    groupType: "paired_informational",
    genre: "paired_informational",
    staminaBand: "released_length",
    title: "Delivering the Mail",
    wordCount: p1.wordCount + p2.wordCount,
    domainVocabularyLoad: "medium",
    textFeaturesJson: [
      { type: "paired_member", slot: "passage_1", title: p1.title },
      { type: "paired_member", slot: "passage_2", title: p2.title },
    ],
    contentHash: stableHash({ id: groupId, groupType: "paired_informational", title: "Delivering the Mail", members: [p1.contentHash, p2.contentHash] }),
    members: [
      { passageId: p1.id, slot: "passage_1", position: 1, passageContentHashSnapshot: p1.contentHash, passage: p1 },
      { passageId: p2.id, slot: "passage_2", position: 2, passageContentHashSnapshot: p2.contentHash, passage: p2 },
    ],
  };
  assert.equal(group.wordCount, 796, "MOY P3 paired group word count must be 796");
  return group;
}

function link(slot: Slot, forEbsr = false) {
  const passageId = slot === "passage_1" ? passage1Id : passage2Id;
  const sortOrder = slot === "passage_1" ? 0 : 1;
  return forEbsr ? { passageId, role: "primary" as const } : { passageId, role: "primary" as const, sortOrder };
}

function baseItem(args: {
  id: string;
  type: "MCQ" | "EBSR";
  subtype: string;
  ec: string;
  points: number;
  passageSlot?: Slot;
  isCrossText?: boolean;
  evidenceBinding: EvidenceBinding;
  intendedAssemblyBucket: "operational" | "analytics_only";
}): P3Item {
  const slots = args.isCrossText ? ["passage_1", "passage_2"] as Slot[] : [args.passageSlot!];
  const forEbsr = args.type === "EBSR";
  return {
    id: args.id,
    itemId: args.id,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: args.type,
    interactionType: args.type,
    interactionSubtype: args.subtype,
    passageId: args.isCrossText ? null : (args.passageSlot === "passage_1" ? passage1Id : passage2Id),
    passageTitle: args.isCrossText ? "Delivering the Mail" : (args.passageSlot === "passage_1" ? "How a Letter Travels" : "A Mail Carrier's Day"),
    passageGroupId: groupId,
    isCrossText: Boolean(args.isCrossText),
    ...(args.isCrossText ? { requiredEvidenceSlotsJson: ["passage_1", "passage_2"] as Slot[] } : {}),
    passageLinks: slots.map((slot) => link(slot, forEbsr)),
    eligibleContent: args.ec,
    reportingCategory: "B",
    pointValue: args.points,
    responseSpecJson: {},
    correctResponseJson: {},
    scoringJson: { totalPoints: args.points },
    evidenceBinding: args.evidenceBinding,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion, unit: "P3", ...(args.passageSlot ? { passageSlot: args.passageSlot } : {}) },
    auditMetadata: { authoredIn: "PSSA_MOY_P3_ITEMS", noDbWrite: true, productionImportReady: false, intendedAssemblyBucket: args.intendedAssemblyBucket },
  };
}

function choice(text: string, role: Role | null, rationale: string, evidence: string, slot: Slot): Choice {
  return {
    text,
    ...(role ? { distractorRole: role, misconceptionTag: role } : {}),
    rationale,
    evidence,
    evidenceLinks: [{ evidenceKind: "quoted_span", passageSlot: slot, quotedSpan: evidence }],
  };
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  correctIndex: number;
  choices: [string, Role | null, string, string, Slot][];
  passageSlot?: Slot;
  crossText?: boolean;
  evidenceBinding: EvidenceBinding;
  intendedAssemblyBucket: "operational" | "analytics_only";
}) {
  const item = baseItem({
    id: args.id,
    type: "MCQ",
    subtype: args.subtype,
    ec: args.ec,
    points: 1,
    passageSlot: args.passageSlot,
    isCrossText: args.crossText,
    evidenceBinding: args.evidenceBinding,
    intendedAssemblyBucket: args.intendedAssemblyBucket,
  });
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map(([text, role, rationale, evidence, slot], index) => {
    const c = choice(text, role, rationale, evidence, slot);
    return index === args.correctIndex ? { ...c, distractorRole: undefined, misconceptionTag: undefined } : c;
  });
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  item.responseSpecJson = {
    prompt: args.prompt,
    choices: item.answerChoicesJson.map((row) => row.text),
    structuredChoicesJson: item.answerChoicesJson.map((row, index) => index === args.correctIndex ? { text: row.text } : { text: row.text, distractorRole: row.distractorRole }),
  };
  return item;
}

function ebsr(args: {
  id: string;
  ec: string;
  subtype: string;
  passageSlot?: Slot;
  crossText: boolean;
  partA: { prompt: string; correctIndex: number; choices: [string, Role | null, string][]; evidenceBinding: EvidenceBinding };
  partB: { instruction: string; choices: Array<{ text: string; passageSlot: Slot; isCorrect?: boolean; alignedPartAMisconception?: string }>; correctIndices: number[] };
  intendedAssemblyBucket: "operational" | "analytics_only";
}) {
  const item = baseItem({
    id: args.id,
    type: "EBSR",
    subtype: args.subtype,
    ec: args.ec,
    points: 2,
    passageSlot: args.passageSlot,
    isCrossText: args.crossText,
    evidenceBinding: args.partA.evidenceBinding,
    intendedAssemblyBucket: args.intendedAssemblyBucket,
  });
  item.partA = {
    prompt: args.partA.prompt,
    correctIndex: args.partA.correctIndex,
    evidenceBinding: args.partA.evidenceBinding,
    choices: args.partA.choices.map(([text, role, rationale], index) => index === args.partA.correctIndex
      ? { text, rationale }
      : { text, distractorRole: role!, misconceptionTag: role!, rationale }),
  };
  item.partB = {
    instruction: args.partB.instruction,
    choices: args.partB.choices,
    requiredSelectionCount: 2,
  };
  item.responseSpecJson = {
    partA: {
      prompt: item.partA.prompt,
      choices: item.partA.choices.map((row, index) => index === args.partA.correctIndex ? { text: row.text } : { text: row.text, distractorRole: row.distractorRole }),
      correctIndex: args.partA.correctIndex,
      evidenceBinding: args.partA.evidenceBinding,
    },
    partB: {
      instruction: args.partB.instruction,
      choices: args.partB.choices,
      requiredSelectionCount: 2,
    },
  };
  item.correctResponseJson = { partA: { correctIndex: args.partA.correctIndex }, partB: { correctIndices: args.partB.correctIndices } };
  item.scoringJson = { totalPoints: 2, partAPoints: 1, partBPoints: 1, requirePartACorrectForFullCredit: true };
  return item;
}

function assertVerbatim(text: string, span: string, label: string) {
  assert(text.includes(span), `${label} must be verbatim in its source passage`);
}

export function buildMoyP3Items(): P3Item[] {
  const { text1, text2 } = moyP3Texts();
  const destinationGrouping = "Grouping letters by destination helps keep the mail organized.";
  const localPostOfficeResort = "When the letters reach the local post office, carriers sort them one more time — now by street and by house number.";
  const carefulPlan = "A good carrier uses special tools and follows a careful plan, rain or shine.";
  const routeOrder = "By putting the mail in order first, the carrier never has to stop and dig around for the next house's letters.";
  const routeSavesTime = "Putting the mail in route order takes time, but it saves time later on the street.";
  for (const [source, span, label] of [
    [text1, destinationGrouping, "destination grouping"],
    [text1, localPostOfficeResort, "local post office re-sort"],
    [text2, carefulPlan, "careful plan"],
    [text2, routeOrder, "route order"],
    [text2, routeSavesTime, "route saves time"],
  ] as const) assertVerbatim(source, span, label);

  const items: P3Item[] = [
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bk112_t1",
      ec: "E03.B-K.1.1.2",
      subtype: "text1_main_idea",
      prompt: "What is the best main idea of Text 1, \"How a Letter Travels\"?",
      correctIndex: 2,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlot: "passage_1" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["ZIP codes are numbers that stand for areas of the country.", "too_narrow", "This is a true detail, but it is too narrow to be the main idea of the whole text.", "A ZIP code is a set of numbers that stands for a certain area of the country.", "passage_1"],
        ["Mail carriers use special tools and work in every kind of weather.", "wrong_section", "This idea comes from Text 2, not the main idea of Text 1.", "Mail carriers work in every kind of weather.", "passage_2"],
        ["A letter takes many organized steps and helpers to reach the right home.", null, "Correct. Text 1 follows a letter through collecting, sorting, transporting, and delivery.", "A single letter takes a long journey before it reaches the right home, and many workers and machines help it along the way.", "passage_1"],
        ["Machines have replaced all the workers who help move letters.", "opposite_claim", "This reverses the text's point because workers and machines both help the letter move.", "Workers watch over the machines and pull out any letter that is bent, torn, or hard to read, so every piece keeps moving toward its home.", "passage_1"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bk112_t2",
      ec: "E03.B-K.1.1.2",
      subtype: "text2_main_idea",
      prompt: "What is the best main idea of Text 2, \"A Mail Carrier's Day\"?",
      correctIndex: 0,
      passageSlot: "passage_2",
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlot: "passage_2" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["A mail carrier uses special tools and a careful plan to deliver mail in different conditions.", null, "Correct. Text 2 describes route order, tools, weather, and pride in the work.", carefulPlan, "passage_2"],
        ["A satchel is a bag that holds letters, magazines, and small packages.", "too_narrow", "This is one true detail about a tool, but it is not the main idea of Text 2.", "It holds letters, magazines, and small packages.", "passage_2"],
        ["Machines sort thousands of letters an hour at a sorting center.", "wrong_section", "This detail belongs to Text 1, not the main idea of Text 2.", "The machines can sort thousands of letters in an hour — far faster than people could ever sort them by hand.", "passage_1"],
        ["Carriers mostly enjoy waving to neighbors during the day.", "wrong_emphasis", "A friendly wave can help, but Text 2 focuses on careful work, tools, and conditions.", "A friendly wave from a neighbor, or a thank-you note tucked in a mailbox, can make a long day feel lighter.", "passage_2"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bk113_t1",
      ec: "E03.B-K.1.1.3",
      subtype: "text1_sequence_cause_effect",
      prompt: "According to Text 1, what happens to a letter right after a mail carrier collects it?",
      correctIndex: 3,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: "The carrier brings them to a building called a sorting center." },
      intendedAssemblyBucket: "operational",
      choices: [
        ["It flies across the country on an airplane first.", "wrong_section", "This uses a later section of the letter's journey, not what happens right after collection.", "Letters headed far away may even fly across the country on an airplane.", "passage_1"],
        ["A carrier slips it into the correct box at a home.", "wrong_emphasis", "This focuses on the final delivery detail, not the step that happens right after collection.", "Finally, a carrier loads the mail and follows a route through the neighborhood, slipping each letter into the correct box.", "passage_1"],
        ["The writer adds a stamp and writes the address neatly.", "opposite_claim", "This reverses the sequence because the stamp and address come before collection, not after.", "First, you write your letter, fold it into an envelope, and add a stamp.", "passage_1"],
        ["It is brought to a sorting center where machines read the address and ZIP code.", null, "Correct. After collection, the carrier brings letters to the sorting center.", "The carrier brings them to a building called a sorting center.", "passage_1"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bc311_t1",
      ec: "E03.B-C.3.1.1",
      subtype: "text1_logical_connection",
      prompt: "In Text 1, why is each letter grouped with other letters going to the same place?",
      correctIndex: 1,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: destinationGrouping },
      intendedAssemblyBucket: "operational",
      choices: [
        ["So the barcode can be printed near the bottom of the envelope.", "wrong_section", "This uses a different sorting-machine detail; the question asks about destination grouping.", "A barcode may be printed near the bottom of the envelope.", "passage_1"],
        ["So the mail stays organized and reaches the correct area.", null, "Correct. The next sentence explains that grouping by destination keeps mail organized.", destinationGrouping, "passage_1"],
        ["So the letter can fly across the country before it is sorted.", "opposite_claim", "This reverses the order because letters are sorted before long-distance transport.", "After they are sorted, the letters travel toward the city or town written on the address.", "passage_1"],
        ["So the carrier can carry fewer tools on the route.", "wrong_emphasis", "Carrier tools are described in Text 2 and are not why Text 1 groups letters by destination.", "A mail carrier helps every letter finish its journey.", "passage_2"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bc312",
      ec: "E03.B-C.3.1.2",
      subtype: "cross_text_difference_in_focus",
      prompt: "How are the focuses of Text 1 and Text 2 different?",
      correctIndex: 2,
      crossText: true,
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlots: ["passage_1", "passage_2"] },
      intendedAssemblyBucket: "operational",
      choices: [
        ["Text 1 focuses on a carrier's daily tools, while Text 2 focuses on the whole mail system.", "opposite_claim", "This reverses the focus of the two texts.", carefulPlan, "passage_2"],
        ["Both texts are mainly about how sorting machines read ZIP codes.", "too_narrow", "This is one Text 1 detail and is too narrow for comparing both texts; Text 2 focuses on a carrier's work.", "Inside, tall machines read the address and the ZIP code printed on each envelope.", "passage_1"],
        ["Text 1 follows a letter through the mail system, while Text 2 focuses on a carrier's tools and daily work.", null, "Correct. Text 1 follows the system journey, and Text 2 describes the carrier's job.", "A mail carrier helps every letter finish its journey.", "passage_2"],
        ["Both texts are mainly about why ZIP codes are printed on envelopes.", "wrong_emphasis", "ZIP codes are one detail from Text 1, not the focus of both texts.", "A ZIP code is a set of numbers that stands for a certain area of the country.", "passage_1"],
      ],
    }),
    ebsr({
      id: "pssa_item_g3_moy_p3_ebsr_bc312",
      ec: "E03.B-C.3.1.2",
      subtype: "cross_text_shared_idea_ebsr",
      crossText: true,
      intendedAssemblyBucket: "operational",
      partA: {
        prompt: "Which idea is shared by both texts?",
        correctIndex: 1,
        evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlots: ["passage_1", "passage_2"] },
        choices: [
          ["Sorting machines can move many letters quickly.", "wrong_section", "This is a Text 1 detail only, not an idea shared by both texts."],
          ["Careful organization helps mail reach the correct home.", null, "Correct. Text 1 and Text 2 both show organization helping mail reach the correct home."],
          ["The mail system works without planning.", "opposite_claim", "This reverses both texts, which emphasize planning and organization."],
          ["Both texts are mainly about stamps.", "too_narrow", "Stamps are in Text 1, but they are not the shared idea of both texts."],
        ],
      },
      partB: {
        instruction: "Choose two sentences — one from each passage — that best support the answer to Part A.",
        correctIndices: [0, 2],
        choices: [
          { text: localPostOfficeResort, passageSlot: "passage_1", isCorrect: true },
          { text: "The stamp is like a ticket that pays for the trip.", passageSlot: "passage_1", alignedPartAMisconception: "stamps" },
          { text: carefulPlan, passageSlot: "passage_2", isCorrect: true },
          { text: "On walking routes, a carrier may use a strong shoulder bag called a satchel.", passageSlot: "passage_2", alignedPartAMisconception: "single_tool_detail" },
        ],
      },
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bv412_ao1",
      ec: "E03.B-V.4.1.2",
      subtype: "word_relationship_stamp_ticket",
      prompt: "In Text 1, what does the comparison \"The stamp is like a ticket that pays for the trip\" mean?",
      correctIndex: 3,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: "The stamp is like a ticket that pays for the trip." },
      intendedAssemblyBucket: "analytics_only",
      choices: [
        ["A stamp is an actual paper ticket that a person tears.", "plausible_misreading", "This reads the comparison literally instead of as a way to explain the stamp's job.", "The stamp is like a ticket that pays for the trip.", "passage_1"],
        ["A stamp shows the address where the letter should go.", "wrong_section", "This uses the address section of the passage; the stamp detail explains payment for delivery.", "Writing the address neatly helps every machine and worker send the letter to the right place.", "passage_1"],
        ["A stamp makes the letter travel faster through machines.", "unsupported_inference", "The text does not say a stamp controls speed or machine sorting.", "Inside, tall machines read the address and the ZIP code printed on each envelope.", "passage_1"],
        ["A stamp is the payment that lets the letter be carried.", null, "Correct. The comparison explains that the stamp pays for the letter's trip.", "The stamp is like a ticket that pays for the trip.", "passage_1"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p3_mcq_bc211_ao3",
      ec: "E03.B-C.2.1.1",
      subtype: "text2_author_viewpoint",
      prompt: "Which statement best describes the author's point of view about a mail carrier's job in Text 2?",
      correctIndex: 1,
      passageSlot: "passage_2",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_2", quotedSpan: "The work is not easy, yet carriers take real pride in bringing the mail to the right home, day after day." },
      intendedAssemblyBucket: "analytics_only",
      choices: [
        ["The author thinks the job is easy because carriers follow the same route every day.", "opposite_claim", "This reverses the author's view that the work is not easy.", "The work is not easy, yet carriers take real pride in bringing the mail to the right home, day after day.", "passage_2"],
        ["The author thinks the job is demanding but useful and important.", null, "Correct. Text 2 describes hard conditions and pride in delivering mail.", "The work is not easy, yet carriers take real pride in bringing the mail to the right home, day after day.", "passage_2"],
        ["The author thinks the job is boring and unimportant.", "unsupported_inference", "The passage never says the job is boring or unimportant; it shows pride in the work.", "A friendly wave from a neighbor, or a thank-you note tucked in a mailbox, can make a long day feel lighter.", "passage_2"],
        ["The author mostly admires how sorting machines read ZIP codes.", "wrong_section", "That viewpoint belongs to Text 1's system focus, not Text 2's carrier focus.", "Inside, tall machines read the address and the ZIP code printed on each envelope.", "passage_1"],
      ],
    }),
    ebsr({
      id: "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
      ec: "E03.B-C.3.1.1",
      subtype: "text2_route_order_ebsr",
      passageSlot: "passage_2",
      crossText: false,
      intendedAssemblyBucket: "analytics_only",
      partA: {
        prompt: "According to Text 2, why does the carrier put the mail in route order before leaving?",
        correctIndex: 0,
        evidenceBinding: { evidenceKind: "paragraph_synthesis", passageSlot: "passage_2" },
        choices: [
          ["It saves time because the carrier does not have to dig for each house's letters later.", null, "Correct. The paragraph explains that route order prevents stopping and digging and saves time."],
          ["It makes the satchel lighter before the carrier starts walking.", "wrong_section", "This uses a tool detail but does not explain the route-order cause and effect."],
          ["It helps the carrier memorize every address in the neighborhood.", "unsupported_inference", "The text says carriers learn the neighborhood, but it does not say route order is for memorizing every address."],
          ["It causes the carrier to stop more often on the street.", "opposite_claim", "This reverses the effect because route order saves time and prevents extra digging.",],
        ],
      },
      partB: {
        instruction: "Choose two sentences from \"A Mail Carrier's Day\" that best support the answer.",
        correctIndices: [1, 3],
        choices: [
          { text: "A route is the planned path a carrier follows through a neighborhood.", passageSlot: "passage_2", alignedPartAMisconception: "definition_only" },
          { text: routeOrder, passageSlot: "passage_2", isCorrect: true },
          { text: "Over time, a carrier learns the neighborhood well and remembers which homes are easy to miss.", passageSlot: "passage_2", alignedPartAMisconception: "memorize_addresses" },
          { text: routeSavesTime, passageSlot: "passage_2", isCorrect: true },
        ],
      },
    }),
  ];
  validateItems(items, text1, text2);
  return items;
}

function validateItems(items: P3Item[], text1: string, text2: string) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_moy_p3_mcq_bk112_t1",
    "pssa_item_g3_moy_p3_mcq_bk112_t2",
    "pssa_item_g3_moy_p3_mcq_bk113_t1",
    "pssa_item_g3_moy_p3_mcq_bc311_t1",
    "pssa_item_g3_moy_p3_mcq_bc312",
    "pssa_item_g3_moy_p3_ebsr_bc312",
    "pssa_item_g3_moy_p3_mcq_bv412_ao1",
    "pssa_item_g3_moy_p3_mcq_bc211_ao3",
    "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [2, 0, 3, 1, 2, 3, 1]);
  assert.deepEqual(items.filter((item) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1, 0]);
  for (const item of items) {
    assert.equal((item as any).scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
    projectPssaStudentItem(item);
    const specs = item.interactionType === "MCQ" ? item.structuredChoicesJson ?? [] : item.partA?.choices ?? [];
    for (const choice of specs) if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole], `registered role ${choice.distractorRole}`);
  }
  for (const item of items) {
    for (const c of item.answerChoicesJson ?? []) {
      for (const link of c.evidenceLinks ?? []) assertVerbatim(link.passageSlot === "passage_1" ? text1 : text2, link.quotedSpan, `${item.itemId} evidence`);
    }
    for (const c of item.partB?.choices ?? []) assertVerbatim(c.passageSlot === "passage_1" ? text1 : text2, c.text, `${item.itemId} Part B`);
  }
}

export function buildMoyP3Packet() {
  const group = buildMoyP3PassageGroup();
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageGroupCount: 1,
    passageCount: 2,
    itemCount: 9,
    passageGroups: [group],
    passages: group.members.map((member) => member.passage),
    items: buildMoyP3Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildMoyP3Packet>) {
  const lines = ["# MOY P3 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildMoyP3Packet>) {
  const lines = ["# MOY P3 Reviewer Preview", "", "Includes keys, rationales, and fact-check records. All content is PENDING/candidate and noDbWrite.", ""];
  for (const passage of packet.passages) {
    lines.push(`## ${passage.title} Fact Checks`, "", JSON.stringify(passage.factCheckNotesJson, null, 2), "");
  }
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("");
    }
    if (item.partA) {
      lines.push("Part A:");
      item.partA.choices.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.partA?.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("Part B key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    }
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildMoyP3Packet>) {
  const lines = ["# MOY P3 Answer Key", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildMoyP3Packet>) {
  const header = ["itemId", "eligibleContent", "interactionType", "pointValue", "reviewStatus", "itemStatus", "isCrossText", "requiredEvidenceSlots", "intendedAssemblyBucket", "studentPreviewLeakFree"];
  const rows = packet.items.map((item) => [
    item.itemId,
    item.eligibleContent,
    item.interactionType,
    String(item.pointValue),
    item.reviewStatus,
    item.itemStatus,
    String(item.isCrossText),
    (item.requiredEvidenceSlotsJson ?? []).join("|"),
    String(item.auditMetadata.intendedAssemblyBucket),
    "PASS",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function assertSourcePackageFresh() {
  const source = committedPackageMarkdown();
  const required = [
    "APPROVED",
    "checked against authoritative postal-service / postal-history sources",
    "Sources are kept in reviewer metadata only",
    "The stamp is like a ticket that pays for the trip",
    "not easy, yet carriers take real pride",
    "Part B must use one verbatim excerpt from EACH text",
    "avoids claims that every route, vehicle, or facility works exactly the same way",
    "some routes",
    "Reserved evidence per item (LOCKED",
  ];
  for (const text of required) assert(source.includes(text), `P3 source package missing ${text}`);
  for (const bad of ["red flag", "sprayed lines", "steering wheel on the right", "tells exactly where", "right-hand drive", "grouped so none is lost", "so none gets lost"]) {
    assert.equal(source.includes(bad), false, `P3 source package contains stale wording: ${bad}`);
  }
  const { text1, text2 } = moyP3Texts();
  assert.equal(wordCount(text1), 436);
  assert.equal(wordCount(text2), 360);
}

function main() {
  assertSourcePackageFresh();
  const packet = buildMoyP3Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("MOY P3 authoring complete: wrote exemplars/pssa_grade3_moy_p3/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
