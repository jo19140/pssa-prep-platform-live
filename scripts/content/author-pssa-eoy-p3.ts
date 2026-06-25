import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";
import { computePssaPassageGroupContentHash } from "./lib/pssa-paired-passage-gates";
import {
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaPassageStaminaMetadata,
} from "./lib/pssa-stamina-gates";

const outputDir = path.resolve("exemplars/pssa_grade3_eoy_p3");
const packagePath = "specs/pssa_g3_eoy_p3_passage_package.md";
const groupId = "pssa_pg_g3_eoy_p3_school_paired";
const passage1Id = "pssa_psg_g3_eoy_p3_school_long_ago";
const passage2Id = "pssa_psg_g3_eoy_p3_school_today";
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-eoy-v1";

type Slot = "passage_1" | "passage_2";
type Role = keyof typeof mappingRegistry;

type EvidenceLink =
  | {
      evidenceKind: "quoted_span";
      passageSlot: Slot;
      quotedSpan: string;
      paragraphIndex: number;
      sentenceIndex: number;
      startChar: number;
      endChar: number;
    }
  | { evidenceKind: "whole_passage_synthesis"; passageSlot: Slot }
  | { evidenceKind: "whole_passage_synthesis"; passageSlots: Slot[] };

type Choice = {
  text: string;
  isCorrect?: boolean;
  distractorRole?: Role | null;
  rationale: string;
  evidenceLinks?: EvidenceLink[];
};

type EvidenceBinding = {
  evidenceKind: "quoted_span" | "whole_passage_synthesis";
  passageSlot?: Slot;
  passageSlots?: Slot[];
  quotedSpan?: string;
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
  comprehensionKind?: "synthesis" | "interpretation" | "inference";
  comprehensionKindRationale?: string;
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
  auditMetadata: { authoredIn: "PSSA_EOY_P3_ITEMS"; noDbWrite: true; productionImportReady: false; intendedAssemblyBucket: "operational" | "analytics_only" };
};

export function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

function stableHash(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function packageMarkdown() {
  return fs.readFileSync(packagePath, "utf8");
}

export function eoyP3Texts(source = packageMarkdown()) {
  const clean = (value: string | undefined) => value
    ?.split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith("*(`passage_"))
    .join("\n")
    .replace(/\*\*/g, "")
    .trim();
  const text1 = clean(source.split("### Text 1 — School Long Ago")[1]?.split("### Text 2 — School Today")[0]);
  const text2 = clean(source.split("### Text 2 — School Today")[1]?.split("\n---")[0]);
  assert(text1, "EOY P3 Text 1 section must exist");
  assert(text2, "EOY P3 Text 2 section must exist");
  assert.equal(wordCount(text1), 425, "EOY P3 Text 1 word count must be 425");
  assert.equal(wordCount(text2), 425, "EOY P3 Text 2 word count must be 425");
  return { text1, text2 };
}

function factCheckRecords(slot: Slot) {
  const records = [
    { claimId: "t1-one-room-all-ages", claim: "In rural one-room schoolhouses, the grades studied together in a single room and were taught by one teacher.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-cities-grade-separation", claim: "In urban areas, schools were larger and students worked in separate classrooms according to their grade level.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-slate-chalk", claim: "Students in the early twentieth century probably had only a slate and chalk rather than paper and other modern school supplies.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-rote-memorization", claim: "In early one-room schools, learning was frequently by rote memorization.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-strict-discipline", claim: "Discipline in early one-room schools could be rather strict.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-shorter-rural-year", claim: "In rural areas the school year was shorter because young people were needed to work on the farm.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-lunch-pail", claim: "There was no school lunch program; students carried their lunch to school, often in a metal pail.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t1-attendance-1920", claim: "By 1920 all states required students aged 8 to 14 to attend school for at least part of the year; public schools had grown more numerous and states began requiring attendance.", sourceTitle: "Children's Lives at the Turn of the Twentieth Century", organization: "Library of Congress", sourceUrl: "https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_1" },
    { claimId: "t2-device-per-student", claim: "Many public schools provide a computer for each student (45 percent one-per-student, plus 37 percent in some grades), and some let students take a school computer home (15 percent in all grades).", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-online-textbooks", claim: "About half of public schools used interactive (online) textbooks for teaching and learning.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-learn-at-own-pace", claim: "Schools reported that classroom technology helped students learn at their own pace.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-independent", claim: "Schools reported that the way technology is used helped students be more independent and self-directed.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-active-learning", claim: "Schools reported that technology helped students learn more actively.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-collaborate", claim: "Schools reported that technology helped students learn collaboratively with peers.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-tech-not-enough", claim: "Technology alone does not guarantee a better education; schools and teachers play a central role in using technology to strengthen teaching and learning.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
    { claimId: "t2-teacher-training", claim: "Teachers need time, training, and support to use technology well for teaching and learning; lack of time and training are reported challenges.", sourceTitle: "Use of Educational Technology for Instruction in Public Schools: 2019-20", organization: "National Center for Education Statistics, U.S. Department of Education", sourceUrl: "https://nces.ed.gov/pubs2021/2021017Summary.pdf", claimSupported: true, dateAccessed: "2026-06-24", passageSlot: "passage_2" },
  ] as const;
  return records.filter((record) => record.passageSlot === slot);
}

function basePassage(slot: Slot, id: string, title: string, text: string) {
  const passage = {
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
    factCheckNotesJson: factCheckRecords(slot),
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion, unit: "P3", passageSlot: slot },
  };
  assert.equal(evaluatePssaPassageStaminaMetadata(passage), "SKIP", `${id} member stamina metadata must skip`);
  assert.equal(evaluatePssaDomainFactCheckRequired(passage), "PASS", `${id} fact-check gate must pass`);
  return passage;
}

export function buildEoyP3PassageGroup() {
  const { text1, text2 } = eoyP3Texts();
  const p1 = basePassage("passage_1", passage1Id, "School Long Ago", text1);
  const p2 = basePassage("passage_2", passage2Id, "School Today", text2);
  const group = {
    model: "PssaPassageGroup",
    id: groupId,
    gradeLevel: 3,
    subject: "ELA",
    groupType: "paired_informational",
    genre: "paired_informational",
    staminaBand: "released_length",
    title: "Going to School: Then & Now",
    wordCount: 850,
    domainVocabularyLoad: "medium",
    textFeaturesJson: [
      { type: "paired_member", slot: "passage_1", title: p1.title },
      { type: "paired_member", slot: "passage_2", title: p2.title },
    ],
    contentHash: "",
    members: [
      { passageId: p1.id, slot: "passage_1", position: 1, passageContentHashSnapshot: p1.contentHash, passage: p1 },
      { passageId: p2.id, slot: "passage_2", position: 2, passageContentHashSnapshot: p2.contentHash, passage: p2 },
    ],
  };
  group.contentHash = computePssaPassageGroupContentHash(group);
  assert.equal(p1.wordCount, 425);
  assert.equal(p2.wordCount, 425);
  return group;
}

function passageText(slot: Slot, text1: string, text2: string) {
  return slot === "passage_1" ? text1 : text2;
}

function splitSentences(paragraph: string) {
  return (paragraph.match(/[^.!?]+[.!?]+(?:["”])?/g) ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
}

function quotedLink(slot: Slot, quotedSpan: string, text1: string, text2: string): Extract<EvidenceLink, { evidenceKind: "quoted_span" }> {
  const text = passageText(slot, text1, text2);
  const startChar = text.indexOf(quotedSpan);
  assert(startChar >= 0, `quoted span not found in ${slot}: ${quotedSpan}`);
  const endChar = startChar + quotedSpan.length;
  const paragraphs = text.split(/\n\s*\n/g);
  let offset = 0;
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const paragraphStart = text.indexOf(paragraph, offset);
    const paragraphEnd = paragraphStart + paragraph.length;
    if (startChar >= paragraphStart && endChar <= paragraphEnd) {
      const sentenceIndex = splitSentences(paragraph).findIndex((sentence) => sentence.includes(quotedSpan));
      assert(sentenceIndex >= 0, `quoted span must map to a sentence: ${quotedSpan}`);
      assert.equal(text.slice(startChar, endChar), quotedSpan);
      return { evidenceKind: "quoted_span", passageSlot: slot, quotedSpan, paragraphIndex, sentenceIndex, startChar, endChar };
    }
    offset = paragraphEnd;
  }
  throw new Error(`unable to locate paragraph for ${quotedSpan}`);
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
}) {
  const slots = args.isCrossText ? ["passage_1", "passage_2"] as Slot[] : [args.passageSlot!];
  const forEbsr = args.type === "EBSR";
  const item: P3Item = {
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
    passageTitle: args.isCrossText ? "Going to School: Then & Now" : (args.passageSlot === "passage_1" ? "School Long Ago" : "School Today"),
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
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion, unit: "P3", ...(args.passageSlot ? { passageSlot: args.passageSlot } : {}) },
    auditMetadata: { authoredIn: "PSSA_EOY_P3_ITEMS", noDbWrite: true, productionImportReady: false, intendedAssemblyBucket: args.intendedAssemblyBucket },
  };
  return item;
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  correctIndex: number;
  passageSlot?: Slot;
  crossText?: boolean;
  evidenceBinding: EvidenceBinding;
  choices: Array<{ text: string; role: Role | null; rationale: string; evidenceLinks: EvidenceLink[] }>;
  intendedAssemblyBucket: "operational" | "analytics_only";
  comprehensionKind?: "synthesis" | "interpretation" | "inference";
  comprehensionKindRationale?: string;
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
  item.answerChoicesJson = args.choices.map((choice, index) => ({
    text: choice.text,
    isCorrect: index === args.correctIndex,
    distractorRole: index === args.correctIndex ? null : choice.role,
    rationale: choice.rationale,
    evidenceLinks: choice.evidenceLinks,
  }));
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  if (args.comprehensionKind) item.comprehensionKind = args.comprehensionKind;
  if (args.comprehensionKindRationale) item.comprehensionKindRationale = args.comprehensionKindRationale;
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
  intendedAssemblyBucket: "operational" | "analytics_only";
  partA: { prompt: string; correctIndex: number; choices: Array<{ text: string; role: Role | null; rationale: string }>; evidenceBinding: EvidenceBinding };
  partB: { instruction: string; choices: Array<{ text: string; passageSlot: Slot; isCorrect?: boolean; alignedPartAMisconception?: string }>; correctIndices: number[] };
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
    choices: args.partA.choices.map((choice, index) => ({
      text: choice.text,
      distractorRole: index === args.partA.correctIndex ? null : choice.role,
      rationale: choice.rationale,
    })),
  };
  item.partB = { instruction: args.partB.instruction, choices: args.partB.choices, requiredSelectionCount: 2 };
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

function q(slot: Slot, span: string, text1: string, text2: string) {
  return quotedLink(slot, span, text1, text2);
}

export function buildEoyP3Items(): P3Item[] {
  const { text1, text2 } = eoyP3Texts();
  const p1Gist = q("passage_1", "In these small country schools, children of several grades studied together in a single room, taught by just one teacher.", text1, text2);
  const p1Limit = q("passage_1", "A one-room school had real limits.", text1, text2);
  const heart = q("passage_1", "For the families they served, the country schoolhouse was the heart of learning, a place where children of several grades learned side by side.", text1, text2);
  const sequence = q("passage_1", "States began to pass laws requiring children to attend, and by 1920 every state required children ages eight to fourteen to go to school for at least part of the year.", text1, text2);
  const slate = q("passage_1", "a child in the early twentieth century probably had only a slate and a piece of chalk", text1, text2);
  const online = q("passage_2", "many schools use online textbooks that students can read on a screen", text1, text2);
  const techHelp = q("passage_2", "the right tools can give students more choices about how they learn", text1, text2);
  const window = q("passage_2", "For many students, these tools can act like a window, opening a view to new things to learn.", text1, text2);
  const teacherCentral = q("passage_2", "Even the best new device cannot replace a caring, well-trained teacher.", text1, text2);

  const purposeP1 = "these country schools existed for one purpose: to help children learn";
  const purposeP2 = "school exists so that children can learn and grow";
  const lunch1 = "These schools did not have a lunch program.";
  const lunch2 = "Students carried their own food from home, often in a metal pail.";
  const devices = "each student has a computer or a tablet of their own";
  const ownPace = "technology can help children learn at their own pace";
  for (const [slot, span] of [
    ["passage_1", purposeP1],
    ["passage_2", purposeP2],
    ["passage_1", lunch1],
    ["passage_1", lunch2],
    ["passage_2", devices],
    ["passage_2", ownPace],
  ] as const) q(slot, span, text1, text2);

  const items: P3Item[] = [
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bk112",
      ec: "E03.B-K.1.1.2",
      subtype: "text1_main_idea",
      prompt: "What is the best main idea of Text 1, \"School Long Ago\"?",
      correctIndex: 1,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlot: "passage_1" },
      intendedAssemblyBucket: "operational",
      comprehensionKind: "synthesis",
      choices: [
        { text: "Children long ago learned only by using computers and online books.", role: "opposite_claim", rationale: "This reverses Text 1, which describes slates, chalk, and few supplies rather than computers.", evidenceLinks: [slate] },
        { text: "Rural schools long ago often had one teacher, several grades, and few supplies, while public schooling became more common.", role: null, rationale: "Correct. This choice summarizes the whole informational text, including school conditions and the growth of attendance.", evidenceLinks: [{ evidenceKind: "whole_passage_synthesis", passageSlot: "passage_1" }] },
        { text: "The most important idea is that farm work made the school year shorter.", role: "too_narrow", rationale: "This is one true detail, but it is too narrow to be the main idea of the whole passage.", evidenceLinks: [q("passage_1", "In farm areas, the school year was often shorter than it is today, because young people were needed to work on the farm.", text1, text2)] },
        { text: "City schools long ago were the only schools that served children.", role: "wrong_emphasis", rationale: "This overemphasizes one contrast detail; Text 1 mostly explains rural one-room schools and their role.", evidenceLinks: [q("passage_1", "In the growing cities, schools were already larger, and students worked in separate classrooms by grade.", text1, text2)] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bc211",
      ec: "E03.B-C.2.1.1",
      subtype: "text1_author_viewpoint",
      prompt: "Which statement best describes the author's point of view about one-room schools in Text 1?",
      correctIndex: 3,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlot: "passage_1" },
      intendedAssemblyBucket: "operational",
      comprehensionKind: "interpretation",
      comprehensionKindRationale: "The item asks students to infer the author's evaluative stance across the whole passage, not retrieve one explicit sentence.",
      choices: [
        { text: "The author thinks one-room schools were perfect and had no limits.", role: "opposite_claim", rationale: "This reverses the author's balanced view because the passage explicitly says the schools had real limits.", evidenceLinks: [p1Limit] },
        { text: "The author thinks strict discipline was the only important feature of one-room schools.", role: "too_narrow", rationale: "This focuses on one detail and misses the broader view of limited but valuable schools.", evidenceLinks: [q("passage_1", "Discipline in these schools could be rather strict.", text1, text2)] },
        { text: "The author thinks one-room schools gave every child plenty of teacher time.", role: "unsupported_inference", rationale: "The passage does not say every child received plenty of teacher time; it says each child received only a small share.", evidenceLinks: [q("passage_1", "One teacher had to divide a single day among many ages and many levels, so each child received only a small share of the teacher's time.", text1, text2)] },
        { text: "The author presents one-room schools as limited but still valuable places where children learned together.", role: null, rationale: "Correct. The passage names real limits and then explains that the schools gathered children to learn.", evidenceLinks: [{ evidenceKind: "whole_passage_synthesis", passageSlot: "passage_1" }] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bv412",
      ec: "E03.B-V.4.1.2",
      subtype: "nonliteral_heart",
      prompt: "In Text 1, what does the author mean by saying the country schoolhouse was the \"heart\" of learning?",
      correctIndex: 0,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: heart.quotedSpan },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "It was a central and important place for children to learn.", role: null, rationale: "Correct. The comparison shows the schoolhouse was central to learning for the families it served.", evidenceLinks: [heart] },
        { text: "It was shaped like a real heart inside the building.", role: "plausible_misreading", rationale: "This reads the nonliteral word heart as a literal body part or shape.", evidenceLinks: [heart] },
        { text: "It was where students memorized and recited facts aloud.", role: "wrong_section", rationale: "This uses a learning-method detail from another paragraph instead of explaining the word relationship.", evidenceLinks: [q("passage_1", "Much of the learning happened by memorizing and reciting, repeating facts out loud until they were known well.", text1, text2)] },
        { text: "It was less important because each child received little teacher time.", role: "opposite_claim", rationale: "This reverses the comparison; the sentence calls the schoolhouse central even though it had limits.", evidenceLinks: [p1Limit] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bk113",
      ec: "E03.B-K.1.1.3",
      subtype: "historical_sequence",
      prompt: "Which sequence best matches Text 1?",
      correctIndex: 2,
      passageSlot: "passage_1",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: sequence.quotedSpan },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "Every state required school first, then public schools grew more common, then states began to pass laws.", role: "opposite_claim", rationale: "This reverses the order of events described in the paragraph.", evidenceLinks: [sequence] },
        { text: "Farm work made the school year shorter, and students used slates.", role: "wrong_emphasis", rationale: "This emphasizes scattered details from other sections instead of the historical sequence about school attendance.", evidenceLinks: [q("passage_1", "In farm areas, the school year was often shorter than it is today, because young people were needed to work on the farm.", text1, text2)] },
        { text: "Public schools grew more common, states began requiring attendance, and by 1920 every state required ages eight to fourteen to attend at least part of the year.", role: null, rationale: "Correct. This follows the historical order in Text 1.", evidenceLinks: [sequence] },
        { text: "The main sequence is that students memorized facts and recited them aloud.", role: "wrong_section", rationale: "This uses the learning-method section of Text 1, not the historical sequence about attendance laws.", evidenceLinks: [q("passage_1", "Much of the learning happened by memorizing and reciting, repeating facts out loud until they were known well.", text1, text2)] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bc312",
      ec: "E03.B-C.3.1.2",
      subtype: "cross_text_materials_difference",
      prompt: "Which difference between schools long ago and schools today is shown by the two texts?",
      correctIndex: 1,
      crossText: true,
      evidenceBinding: { evidenceKind: "quoted_span", passageSlots: ["passage_1", "passage_2"], quotedSpan: `${slate.quotedSpan} / ${online.quotedSpan}` },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "Both texts say students mainly used online textbooks on screens.", role: "opposite_claim", rationale: "This reverses Text 1, which says children probably used only a slate and chalk.", evidenceLinks: [slate] },
        { text: "Text 1 shows students using a slate and chalk, while Text 2 shows students using online textbooks on a screen.", role: null, rationale: "Correct. The two details show a clear difference in learning materials across time.", evidenceLinks: [slate, online] },
        { text: "Text 1 and Text 2 both focus only on farm schedules.", role: "wrong_emphasis", rationale: "Farm schedules are one Text 1 detail and are not the main comparison across both texts.", evidenceLinks: [q("passage_1", "In farm areas, the school year was often shorter than it is today, because young people were needed to work on the farm.", text1, text2)] },
        { text: "Text 2 says students today use slates and chalk instead of computers.", role: "wrong_section", rationale: "This puts a Text 1 detail into Text 2, where modern tools are described.", evidenceLinks: [online] },
      ],
    }),
    ebsr({
      id: "pssa_item_g3_eoy_p3_ebsr_bc312",
      ec: "E03.B-C.3.1.2",
      subtype: "cross_text_shared_purpose",
      crossText: true,
      intendedAssemblyBucket: "operational",
      partA: {
        prompt: "What important purpose do both texts show that schools share?",
        correctIndex: 1,
        evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlots: ["passage_1", "passage_2"] },
        choices: [
          { text: "Both show that schools are mainly places for students to use technology.", role: "wrong_section", rationale: "This fits Text 2 more than Text 1 and does not name the shared purpose." },
          { text: "Both show that schools exist to help children learn.", role: null, rationale: "Correct. Each text includes a sentence about school helping children learn." },
          { text: "Both show that schools have no limits or challenges.", role: "opposite_claim", rationale: "This reverses both texts, which name limits in old schools and cautions about technology today." },
          { text: "Both show that lunch programs are the main reason for school.", role: "too_narrow", rationale: "This focuses on one Text 1 detail and is not shared by both texts." },
        ],
      },
      partB: {
        instruction: "Choose two excerpts, one from each text, that best support the answer to Part A.",
        correctIndices: [0, 2],
        choices: [
          { text: purposeP1, passageSlot: "passage_1", isCorrect: true },
          { text: "a child in the early twentieth century probably had only a slate and a piece of chalk", passageSlot: "passage_1", alignedPartAMisconception: "tools_not_purpose" },
          { text: purposeP2, passageSlot: "passage_2", isCorrect: true },
          { text: "many schools use online textbooks that students can read on a screen", passageSlot: "passage_2", alignedPartAMisconception: "tools_not_purpose" },
        ],
      },
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bc211_ao1",
      ec: "E03.B-C.2.1.1",
      subtype: "text2_author_viewpoint",
      prompt: "Which statement best describes the author's point of view about technology in Text 2?",
      correctIndex: 0,
      passageSlot: "passage_2",
      evidenceBinding: { evidenceKind: "whole_passage_synthesis", passageSlot: "passage_2" },
      intendedAssemblyBucket: "analytics_only",
      comprehensionKind: "interpretation",
      comprehensionKindRationale: "The item asks for the author's stance across the whole text: technology helps, but teachers remain central.",
      choices: [
        { text: "Technology can help students learn in new ways, but teachers and training still matter.", role: null, rationale: "Correct. Text 2 balances benefits of tools with the point that teachers remain central.", evidenceLinks: [{ evidenceKind: "whole_passage_synthesis", passageSlot: "passage_2" }] },
        { text: "Technology alone always creates a better education.", role: "opposite_claim", rationale: "This reverses the author's caution that technology alone does not make a better education.", evidenceLinks: [teacherCentral] },
        { text: "The author says every school lets each student keep a computer forever.", role: "unsupported_inference", rationale: "The passage does not say students keep computers forever; it only says some schools let students take one home.", evidenceLinks: [q("passage_2", "In some schools, students may even take a school computer home.", text1, text2)] },
        { text: "The author thinks the only benefit of technology is online textbooks.", role: "too_narrow", rationale: "This is too narrow because Text 2 names independent learning, active learning, and collaboration too.", evidenceLinks: [online] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p3_mcq_bv412_ao4",
      ec: "E03.B-V.4.1.2",
      subtype: "nonliteral_window",
      prompt: "In Text 2, what does the author mean when saying tools can act like a \"window\"?",
      correctIndex: 2,
      passageSlot: "passage_2",
      evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_2", quotedSpan: window.quotedSpan },
      intendedAssemblyBucket: "analytics_only",
      choices: [
        { text: "The tools are made of glass and open in a wall.", role: "plausible_misreading", rationale: "This reads window literally instead of as a comparison about learning.", evidenceLinks: [window] },
        { text: "The tools replace teachers completely.", role: "opposite_claim", rationale: "This reverses the author's point that devices cannot replace caring, well-trained teachers.", evidenceLinks: [teacherCentral] },
        { text: "The tools can help students see and reach new things to learn.", role: null, rationale: "Correct. The comparison says technology can open a view to new learning.", evidenceLinks: [window] },
        { text: "The tools only help students carry books home.", role: "wrong_emphasis", rationale: "This overemphasizes one device detail and misses the nonliteral meaning of window.", evidenceLinks: [q("passage_2", "In some schools, students may even take a school computer home.", text1, text2)] },
      ],
    }),
    ebsr({
      id: "pssa_item_g3_eoy_p3_ebsr_bk111_ao7",
      ec: "E03.B-K.1.1.1",
      subtype: "text1_explicit_lunch",
      passageSlot: "passage_1",
      crossText: false,
      intendedAssemblyBucket: "analytics_only",
      partA: {
        prompt: "What does Text 1 say about lunch at the country schools?",
        correctIndex: 0,
        evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_1", quotedSpan: lunch1 },
        choices: [
          { text: "The schools had no lunch program, so children brought food from home.", role: null, rationale: "Correct. Text 1 gives both details directly." },
          { text: "The schools served lunch to every student each day.", role: "opposite_claim", rationale: "This reverses the sentence saying the schools did not have a lunch program." },
          { text: "The schools used online lunch menus on tablets.", role: "wrong_section", rationale: "This borrows modern technology from Text 2 and is not in Text 1." },
          { text: "The schools closed because students forgot lunch pails.", role: "unsupported_inference", rationale: "The text never says schools closed for this reason." },
        ],
      },
      partB: {
        instruction: "Choose two sentences from Text 1 that best support the answer.",
        correctIndices: [0, 1],
        choices: [
          { text: lunch1, passageSlot: "passage_1", isCorrect: true },
          { text: lunch2, passageSlot: "passage_1", isCorrect: true },
          { text: "A slate was a small board that a student could write on and then wipe clean to use again.", passageSlot: "passage_1", alignedPartAMisconception: "school_supplies" },
          { text: "Much of the learning happened by memorizing and reciting, repeating facts out loud until they were known well.", passageSlot: "passage_1", alignedPartAMisconception: "rote_learning" },
        ],
      },
    }),
    ebsr({
      id: "pssa_item_g3_eoy_p3_ebsr_bc311_ao8",
      ec: "E03.B-C.3.1.1",
      subtype: "text2_devices_own_pace",
      passageSlot: "passage_2",
      crossText: false,
      intendedAssemblyBucket: "analytics_only",
      partA: {
        prompt: "Why can students today often learn at their own pace?",
        correctIndex: 2,
        evidenceBinding: { evidenceKind: "quoted_span", passageSlot: "passage_2", quotedSpan: ownPace },
        choices: [
          { text: "Because students today always work without teachers.", role: "opposite_claim", rationale: "This reverses the text, which says teachers still plan lessons and help students." },
          { text: "Because students long ago had slates and chalk.", role: "wrong_section", rationale: "This uses a Text 1 detail instead of the cause-and-effect relation in Text 2." },
          { text: "Because many students can use their own devices, which can help them move ahead or slow down.", role: null, rationale: "Correct. The passage connects devices and technology with learning at a student's own pace." },
          { text: "Because online textbooks are the only tool schools use.", role: "wrong_emphasis", rationale: "This focuses too much on one tool and ignores the broader device-and-pace explanation." },
        ],
      },
      partB: {
        instruction: "Choose two excerpts from Text 2 that best support the answer.",
        correctIndices: [0, 2],
        choices: [
          { text: devices, passageSlot: "passage_2", isCorrect: true },
          { text: "For many students, these tools can act like a window, opening a view to new things to learn.", passageSlot: "passage_2", alignedPartAMisconception: "figurative_tools" },
          { text: ownPace, passageSlot: "passage_2", isCorrect: true },
          { text: "Teachers still plan the lessons, explain the hard ideas, and help each student who is stuck.", passageSlot: "passage_2", alignedPartAMisconception: "teacher_role" },
        ],
      },
    }),
  ];
  validateItems(items, text1, text2);
  return items;
}

function validateItems(items: P3Item[], text1: string, text2: string) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_eoy_p3_mcq_bk112",
    "pssa_item_g3_eoy_p3_mcq_bc211",
    "pssa_item_g3_eoy_p3_mcq_bv412",
    "pssa_item_g3_eoy_p3_mcq_bk113",
    "pssa_item_g3_eoy_p3_mcq_bc312",
    "pssa_item_g3_eoy_p3_ebsr_bc312",
    "pssa_item_g3_eoy_p3_mcq_bc211_ao1",
    "pssa_item_g3_eoy_p3_mcq_bv412_ao4",
    "pssa_item_g3_eoy_p3_ebsr_bk111_ao7",
    "pssa_item_g3_eoy_p3_ebsr_bc311_ao8",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [1, 3, 0, 2, 1, 0, 2]);
  assert.deepEqual(items.filter((item) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1, 0, 2]);
  for (const item of items) {
    assert.equal((item as any).scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
    projectPssaStudentItem(item);
    const choices = item.interactionType === "MCQ" ? item.structuredChoicesJson ?? [] : item.partA?.choices ?? [];
    for (const [index, choice] of choices.entries()) {
      const correctIndex = item.interactionType === "MCQ" ? item.correctIndex : item.partA?.correctIndex;
      if (index === correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct choice role must be null`);
      else assert(mappingRegistry[choice.distractorRole as Role], `${item.itemId} registered role ${choice.distractorRole}`);
    }
    for (const choice of item.answerChoicesJson ?? []) {
      for (const link of choice.evidenceLinks ?? []) {
        if (link.evidenceKind === "quoted_span") assert.equal(passageText(link.passageSlot, text1, text2).slice(link.startChar, link.endChar), link.quotedSpan);
      }
    }
    for (const choice of item.partB?.choices ?? []) assert(passageText(choice.passageSlot, text1, text2).includes(choice.text), `${item.itemId} Part B span verbatim`);
  }
}

export function buildEoyP3Packet() {
  const group = buildEoyP3PassageGroup();
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageGroupCount: 1,
    passageCount: 2,
    itemCount: 10,
    passageGroups: [group],
    passages: group.members.map((member) => member.passage),
    items: buildEoyP3Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildEoyP3Packet>) {
  const lines = ["# EOY P3 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildEoyP3Packet>) {
  const lines = ["# EOY P3 Reviewer Preview", "", "Includes keys, rationales, and fact-check records. All content is PENDING/candidate and noDbWrite.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title} Fact Checks`, "", JSON.stringify(passage.factCheckNotesJson, null, 2), "");
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale}`));
      lines.push("");
    }
    if (item.partA) {
      lines.push("Part A:");
      item.partA.choices.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.partA?.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale}`));
      lines.push("Part B key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    }
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildEoyP3Packet>) {
  const lines = ["# EOY P3 Answer Key", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildEoyP3Packet>) {
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
    item.auditMetadata.intendedAssemblyBucket,
    "PASS",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function assertSourcePackageFresh() {
  const source = packageMarkdown();
  for (const text of ["APPROVED / LOCKED", "Text 1 = 425", "Text 2 = 425", "factCheckNotesJson", "Both show that schools exist to help children learn.", "these country schools existed for one purpose: to help children learn"]) {
    assert(source.includes(text), `EOY P3 package missing ${text}`);
  }
  const records = factCheckRecords("passage_1").concat(factCheckRecords("passage_2"));
  assert.equal(records.length, 16);
  assert.equal(records.filter((record) => record.passageSlot === "passage_1" && record.sourceUrl.includes("loc.gov")).length, 8);
  assert.equal(records.filter((record) => record.passageSlot === "passage_2" && record.sourceUrl.includes("nces.ed.gov")).length, 8);
  eoyP3Texts(source);
}

function main() {
  assertSourcePackageFresh();
  const packet = buildEoyP3Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("EOY P3 authoring complete: wrote exemplars/pssa_grade3_eoy_p3/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
