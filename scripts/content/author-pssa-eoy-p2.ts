import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";
import {
  evaluatePssaDomainFactCheckRequired,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaSectionLookbackBalance,
  evaluatePssaTextFeatureIntegrity,
  evaluatePssaTextFeatureItemLink,
} from "./lib/pssa-stamina-gates";

const outputDir = path.resolve("exemplars/pssa_grade3_eoy_p2");
const passageId = "pssa_psg_g3_eoy_p2_broken_vase";
const packagePath = "specs/pssa_g3_eoy_p2_passage_package.md";
const itemSpecPath = "specs/codex_pssa_eoy_p2_items.md";

type EvidenceLink =
  | {
      evidenceKind: "quoted_span";
      quotedSpan: string;
      paragraphIndex: number;
      sentenceIndex: number;
      startChar: number;
      endChar: number;
    }
  | { evidenceKind: "whole_passage_synthesis" };

type EoyChoice = {
  text: string;
  isCorrect: boolean;
  distractorRole: keyof typeof mappingRegistry | null;
  rationale: string;
  evidenceLinks: EvidenceLink[];
};

type EvidenceBinding = {
  requiresFigure: false;
  requiresPassageText: true;
  evidenceKind: "passage_only" | "whole_passage_synthesis";
  quotedText?: string;
  targetWordOrPhrase?: string;
  task?: "identify_message_only" | "explain_message_development";
  requiredDetailCount?: number;
  requiresReasoningConnection?: boolean;
};

type EoyItem = {
  id: string;
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "MCQ" | "MATCHING_GRID" | "SHORT_ANSWER";
  interactionType: "MCQ" | "MATCHING_GRID" | "SHORT_ANSWER";
  interactionSubtype: string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  reportingCategory: "A";
  pointValue: number;
  studentFacingPrompt?: string;
  stem?: string;
  instructionText?: string;
  answerChoicesJson?: EoyChoice[];
  structuredChoicesJson?: EoyChoice[];
  correctIndex?: number;
  comprehensionKind?: "inference";
  comprehensionKindRationale?: string;
  rows?: Array<{ rowId: string; label: string; correctColumnId: string; rationale: string; plausibleWrongRationales: Record<string, string> }>;
  columns?: Array<{ columnId: string; label: string }>;
  selectionRule?: string;
  requiredSupportCount?: number;
  requiresTextSupport?: boolean;
  expectedAnswerCore?: string;
  acceptableTextSupport?: Array<{ supportId: string; quotedSpan: string; connectsToExpectedAnswer: string }>;
  commonIncompletePatterns?: string[];
  rubric?: Record<"points3" | "points2" | "points1" | "points0", string>;
  scoreBandExamples?: Array<{ band: 3 | 2 | 1 | 0; response: string; why: string }>;
  correctResponseJson: unknown;
  scoringJson: Record<string, unknown>;
  responseSpecJson?: unknown;
  evidenceBinding: EvidenceBinding;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  commercialUseAllowed: true;
  needsLegalReview: false;
  provenanceJson: Record<string, unknown>;
  auditMetadata: { authoredIn: "PSSA_EOY_P2_ITEMS"; noDbWrite: true; productionImportReady: false; autoScoringClaim?: false };
};

export function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

function packageSource() {
  return fs.readFileSync(packagePath, "utf8");
}

export function extractEoyP2PassageText(source = packageSource()) {
  const section = source.split("## 2. Passage")[1]?.split("\n---")[0];
  assert(section, "EOY P2 package passage section must exist");
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("##"))
    .join("\n\n");
}

function splitPassageSentences(text: string) {
  return text.split(/\n\s*\n/g).map((paragraph) => {
    const matches = paragraph.match(/[^.!?]+[.!?]+(?:["”])?/g);
    return (matches ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
  });
}

function evidenceLink(quotedSpan: string, passageText = extractEoyP2PassageText()): EvidenceLink {
  const startChar = passageText.indexOf(quotedSpan);
  assert(startChar >= 0, `quotedSpan not found in passage: ${quotedSpan}`);
  const endChar = startChar + quotedSpan.length;
  const paragraphs = passageText.split(/\n\s*\n/g);
  const sentenceGrid = splitPassageSentences(passageText);
  let offset = 0;
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const paragraphStart = passageText.indexOf(paragraph, offset);
    assert(paragraphStart >= 0, `paragraph not found for evidence: ${quotedSpan}`);
    const paragraphEnd = paragraphStart + paragraph.length;
    if (startChar >= paragraphStart && endChar <= paragraphEnd) {
      const sentenceIndex = sentenceGrid[paragraphIndex].findIndex((sentence) => sentence.includes(quotedSpan));
      assert(sentenceIndex >= 0, `quotedSpan not found in a sentence: ${quotedSpan}`);
      assert.equal(passageText.slice(startChar, endChar), quotedSpan, `char offsets must exactly identify ${quotedSpan}`);
      return { evidenceKind: "quoted_span", quotedSpan, paragraphIndex, sentenceIndex, startChar, endChar };
    }
    offset = paragraphEnd;
  }
  throw new Error(`unable to locate paragraph for evidence: ${quotedSpan}`);
}

export function buildEoyP2Passage() {
  const text = extractEoyP2PassageText();
  const passage = {
    id: passageId,
    title: "The Broken Vase",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "literary",
    genre: "literary_narrative",
    pov: "third_person",
    domainVocabularyLoad: "medium",
    wordCount: wordCount(text),
    text,
    textFeaturesJson: [
      {
        type: "figurative_language",
        featureText: "his stomach tied in a knot",
        sectionId: "paragraph_05",
        mustUseInItem: true,
        linkedByItemIds: ["pssa_item_g3_eoy_p2_mcq_av412"],
      },
    ],
    factCheckRequired: false,
    staminaBand: "released_length",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1", unit: "P2" },
  };
  assert.equal(passage.wordCount, 925, "EOY P2 passage must be exactly 925 words");
  assert.equal(passage.text.includes("his stomach tied in a knot"), true, "EOY P2 must preserve figurative feature text");
  assert.equal(passage.text.includes("reaching to dust the shelf and finding the empty spot bare"), true, "EOY P2 must preserve AO-5 evidence span");
  assert.equal(evaluatePssaPassageStaminaMetadata(passage), "PASS", "EOY P2 stamina metadata must pass");
  assert.equal(evaluatePssaTextFeatureIntegrity(passage), "PASS", "EOY P2 text feature integrity must pass");
  assert.equal(evaluatePssaDomainFactCheckRequired(passage), "SKIP", "EOY P2 fact-check gate must skip original fiction");
  return passage;
}

function baseItem(id: string, type: EoyItem["interactionType"], subtype: string, ec: string, points: number, evidenceBinding: EvidenceBinding): EoyItem {
  return {
    id,
    itemId: id,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: type,
    interactionType: type,
    interactionSubtype: subtype,
    passageId,
    passageTitle: "The Broken Vase",
    eligibleContent: ec,
    reportingCategory: "A",
    pointValue: points,
    correctResponseJson: {},
    scoringJson: { totalPoints: points },
    evidenceBinding,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1", unit: "P2" },
    auditMetadata: { authoredIn: "PSSA_EOY_P2_ITEMS", noDbWrite: true, productionImportReady: false },
  };
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  correctIndex: number;
  evidenceBinding: EvidenceBinding;
  choices: Array<{ text: string; role: keyof typeof mappingRegistry | null; rationale: string; quotedSpan?: string; synthesis?: true }>;
  comprehensionKind?: "inference";
  comprehensionKindRationale?: string;
}): EoyItem {
  const item = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding);
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map((choice, index) => {
    assert.equal(index === args.correctIndex, choice.role === null, `${args.id} correct role/null pairing must match key`);
    return {
      text: choice.text,
      isCorrect: index === args.correctIndex,
      distractorRole: choice.role,
      rationale: choice.rationale,
      evidenceLinks: choice.synthesis ? [{ evidenceKind: "whole_passage_synthesis" as const }] : [evidenceLink(choice.quotedSpan ?? "")],
    };
  });
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  if (args.comprehensionKind) item.comprehensionKind = args.comprehensionKind;
  if (args.comprehensionKindRationale) item.comprehensionKindRationale = args.comprehensionKindRationale;
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

function matchingGrid(): EoyItem {
  const item = baseItem("pssa_item_g3_eoy_p2_te_ak113", "MATCHING_GRID", "plot_role_action_grid", "E03.A-K.1.1.3", 3, {
    requiresFigure: false,
    requiresPassageText: true,
    evidenceKind: "passage_only",
  });
  item.stem = "Match each of Mateo's actions to its role in the plot.";
  item.instructionText = "Choose the plot role that best matches each action.";
  item.rows = [
    {
      rowId: "breaks_vase",
      label: "Mateo plays ball indoors and breaks the vase.",
      correctColumnId: "starts_problem",
      rationale: "Breaking the vase creates the story's main problem and sets Mateo's choice in motion.",
      plausibleWrongRationales: {
        turning_point: "The turning point happens later, when Mateo stops and decides to go to the kitchen.",
        consequence: "The consequence comes after Mateo confesses, when the ball is put away.",
      },
    },
    {
      rowId: "stops_walks",
      label: "Mateo stops before touching the sharp piece and walks toward the kitchen.",
      correctColumnId: "turning_point",
      rationale: "This action marks Mateo's change from hiding the mistake toward telling Abuela the truth.",
      plausibleWrongRationales: {
        starts_problem: "The problem has already started when the vase breaks.",
        consequence: "The consequence is the later result of his choice, not this decision point.",
      },
    },
    {
      rowId: "puts_ball_away",
      label: "Mateo puts the ball away when Abuela tells him.",
      correctColumnId: "consequence",
      rationale: "Putting the ball away shows the consequence of breaking the rule about playing indoors.",
      plausibleWrongRationales: {
        starts_problem: "The broken vase starts the problem before this consequence happens.",
        turning_point: "Mateo's decision to confess is the turning point; putting away the ball follows Abuela's response.",
      },
    },
  ];
  item.columns = [
    { columnId: "starts_problem", label: "Starts the problem" },
    { columnId: "turning_point", label: "Marks the turning point" },
    { columnId: "consequence", label: "Shows the consequence" },
  ];
  item.selectionRule = "Select one plot role for each action.";
  const correctCells = item.rows.map((row) => ({ rowId: row.rowId, columnId: row.correctColumnId }));
  item.correctResponseJson = { correctCells };
  (item as any).correctCells = correctCells;
  item.scoringJson = { totalPoints: 3 };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

function shortAnswer(): EoyItem {
  const item = baseItem("pssa_item_g3_eoy_p2_sa_ak112", "SHORT_ANSWER", "theme_support_short_answer", "E03.A-K.1.1.2", 3, {
    requiresFigure: false,
    requiresPassageText: true,
    evidenceKind: "passage_only",
    task: "explain_message_development",
    requiredDetailCount: 2,
    requiresReasoningConnection: true,
  });
  item.stem = "What lesson does Mateo learn? Use two details from the story to support your answer.";
  item.instructionText = "Write a short answer that explains the lesson and supports it with two details from the story.";
  item.requiredSupportCount = 2;
  item.requiresTextSupport = true;
  item.expectedAnswerCore = "Mateo learns that telling the truth and taking responsibility matters even when a mistake is hard to admit.";
  item.acceptableTextSupport = [
    { supportId: "reject_hide_plan", quotedSpan: "Hiding the pieces would not bring the vase back.", connectsToExpectedAnswer: "This shows Mateo rejects hiding the mistake." },
    { supportId: "safe_cleanup", quotedSpan: "We clean them the safe way, and we do it together.", connectsToExpectedAnswer: "This shows Mateo helps repair the situation after telling the truth." },
    { supportId: "new_use", quotedSpan: "We could press the pieces into a stepping stone for the garden", connectsToExpectedAnswer: "This shows they try to make something new from the mistake." },
  ];
  item.commonIncompletePatterns = [
    "States the lesson but gives only one supporting detail.",
    "Retells the broken vase event without explaining honesty or responsibility.",
    "Uses Mateo's confession only, without adding distinct support from the repair or cleanup.",
  ];
  item.rubric = {
    points3: "Explains a valid lesson about honesty or responsibility and supports it with at least two accurate, distinct story details from the allowed support set.",
    points2: "Explains a valid lesson with one strong detail, or gives two details with only a partial connection to the lesson.",
    points1: "Names honesty, responsibility, or a relevant event but gives little explanation or support.",
    points0: "Gives an incorrect, unsupported, copied-only, or off-topic response.",
  };
  item.scoreBandExamples = [
    { band: 3, response: "Mateo learns that it is better to tell the truth about a mistake. He thinks hiding the pieces will not bring the vase back, and later he helps Abuela clean the sharp pieces safely. Those details show he takes responsibility.", why: "Explains the lesson and connects two distinct details." },
    { band: 2, response: "The lesson is to be honest. Mateo tells Abuela and helps clean up.", why: "Correct lesson and relevant details, but the explanation is brief." },
    { band: 1, response: "Mateo broke the vase and felt bad.", why: "Relevant event, but little lesson or support." },
    { band: 0, response: "The story teaches that cats should stay off shelves.", why: "Incorrect lesson and unsupported by the story." },
  ];
  item.correctResponseJson = { rubric: "human_scored" };
  item.scoringJson = { totalPoints: 3, autoScoringClaim: false };
  item.auditMetadata = { ...item.auditMetadata, autoScoringClaim: false };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

export function buildEoyP2Items(): EoyItem[] {
  const items: EoyItem[] = [
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_ak111",
      ec: "E03.A-K.1.1.1",
      subtype: "explicit_detail_importance",
      prompt: "Why was the blue vase important to Abuela?",
      correctIndex: 0,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "his grandmother had carried it carefully from the house where she grew up" },
      choices: [
        { text: "It came from the house where Abuela grew up.", role: null, rationale: "Correct. The passage explains that Abuela carried it from her childhood home across the ocean.", quotedSpan: "his grandmother had carried it carefully from the house where she grew up" },
        { text: "It was the newest decoration in the living room.", role: "wrong_emphasis", rationale: "This focuses on the vase as a kept decoration, but the important detail is that it came from Abuela's old home.", quotedSpan: "She dusted it every Sunday." },
        { text: "It was where Abuela kept the foam ball.", role: "unsupported_inference", rationale: "The passage never says the vase held the ball; the ball is what hits the vase.", quotedSpan: "the foam ball felt too harmless to cause any trouble" },
        { text: "It was easy for Abuela to replace.", role: "opposite_claim", rationale: "This is the opposite of Abuela's feeling because she calls it irreplaceable.", quotedSpan: "She called it the one thing she could never replace." },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_ac211",
      ec: "E03.A-C.2.1.1",
      subtype: "literary_point_of_view",
      prompt: "Which statement best describes the point of view of the story?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "Mateo was not supposed to play ball in the house." },
      choices: [
        { text: "Mateo tells what happened to Abuela's blue vase using I and me.", role: "opposite_claim", rationale: "The story is not told by Mateo in first person; it names him from outside the action.", quotedSpan: "Mateo was not supposed to play ball in the house." },
        { text: "A narrator outside the story tells what Mateo does and thinks.", role: null, rationale: "Correct. The narrator names Mateo and also reports his private thoughts.", quotedSpan: "A thought slipped into his head, quick and sneaky." },
        { text: "Abuela tells readers only what she sees in the kitchen.", role: "wrong_section", rationale: "Abuela appears in the kitchen, but she is not the narrator of the whole story.", quotedSpan: "He found his grandmother by the window, quietly folding a stack of warm towels." },
        { text: "The cat tells readers why the vase fell.", role: "unsupported_inference", rationale: "The cat is only part of Mateo's possible excuse and never narrates the story.", quotedSpan: "his grandmother might think the cat had knocked the vase down." },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_av411",
      ec: "E03.A-V.4.1.1",
      subtype: "context_vocabulary",
      prompt: "What does shards mean as it is used in the story?",
      correctIndex: 2,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "many tiny shards scattered across the boards like blue snow", targetWordOrPhrase: "shards" },
      choices: [
        { text: "soft cloths used to wrap a vase", role: "wrong_section", rationale: "This uses a later detail about wrapping the large pieces, not the meaning of shards.", quotedSpan: "She wrapped them gently in an old cloth." },
        { text: "painted birds on the outside of a vase", role: "wrong_emphasis", rationale: "The birds are a design on the vase, but shards describes pieces after it breaks.", quotedSpan: "It was painted with small white birds" },
        { text: "small sharp broken pieces", role: null, rationale: "Correct. The vase breaks and the tiny pieces are sharp enough to require careful sweeping.", quotedSpan: "many tiny shards scattered across the boards like blue snow" },
        { text: "heavy shoes filled with sand", role: "plausible_misreading", rationale: "This is another image from the story, but it describes Mateo's feelings, not broken pieces.", quotedSpan: "as if his shoes were filled with sand" },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_av412",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_language",
      prompt: "What does the phrase \"his stomach tied in a knot\" mean in the story?",
      correctIndex: 3,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "His heart pounded, and his stomach tied in a knot.", targetWordOrPhrase: "his stomach tied in a knot" },
      choices: [
        { text: "Mateo had eaten too quickly.", role: "plausible_misreading", rationale: "This reads a body reaction too literally, but the story uses Mateo's body feelings to show worry.", quotedSpan: "Mateo sat back on his heels and let out a slow breath." },
        { text: "Mateo wanted to tie the vase pieces together.", role: "unsupported_inference", rationale: "The passage never says Mateo plans to tie the vase; he thinks about hiding the pieces.", quotedSpan: "He could hide the pieces at the bottom of the trash" },
        { text: "Mateo felt proud of what had happened.", role: "opposite_claim", rationale: "This reverses the emotion in the passage, where Mateo is worried and tense.", quotedSpan: "The knot in his stomach pulled tighter." },
        { text: "Mateo felt worried and nervous.", role: null, rationale: "Correct. The knot image and his pounding heart show worry after the vase breaks.", quotedSpan: "His heart pounded, and his stomach tied in a knot." },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_ak112",
      ec: "E03.A-K.1.1.2",
      subtype: "central_message_inference",
      prompt: "Which sentence best states the lesson of the story?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "whole_passage_synthesis", task: "identify_message_only" },
      comprehensionKind: "inference",
      comprehensionKindRationale: "The narrator never states the lesson directly; readers infer it from Mateo's confession, Abuela's response, and the repair afterward.",
      choices: [
        { text: "A person should keep fragile things on a lower shelf.", role: "too_narrow", rationale: "This focuses on one object instead of the larger lesson Mateo learns about honesty.", quotedSpan: "the shelf where his grandmother kept the blue vase" },
        { text: "Telling the truth about a mistake is hard but important.", role: null, rationale: "Correct. The whole story shows Mateo choosing to confess and take responsibility.", synthesis: true },
        { text: "A rainy day is the best time to practice ball skills indoors.", role: "wrong_emphasis", rationale: "This focuses on the rainy-day setup, but the lesson comes from Mateo's choice to tell the truth.", quotedSpan: "this Saturday it was raining hard" },
        { text: "Broken things should always be thrown away at once.", role: "opposite_claim", rationale: "This reverses the ending because Abuela saves the large pieces for a new use.", quotedSpan: "The three big pieces she did not throw out." },
      ],
    }),
    matchingGrid(),
    shortAnswer(),
    mcq({
      id: "pssa_item_g3_eoy_p2_mcq_ac211_ao5",
      ec: "E03.A-C.2.1.1",
      subtype: "third_person_limited_private_thought",
      prompt: "What does the third-person limited point of view help the reader know?",
      correctIndex: 2,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "reaching to dust the shelf and finding the empty spot bare" },
      choices: [
        { text: "What Abuela plans to do with the vase pieces before Mateo tells her", role: "unsupported_inference", rationale: "The passage does not reveal Abuela's private plan before Mateo confesses.", quotedSpan: "His grandmother set the towels down." },
        { text: "What the cat thinks when Mateo imagines blaming it for the blue vase", role: "plausible_misreading", rationale: "This misreads Mateo's imagined excuse as access to the cat's thoughts, which the story never gives.", quotedSpan: "the cat had knocked the vase down" },
        { text: "What Mateo privately imagines about Abuela finding the empty shelf", role: null, rationale: "Correct. The narrator lets readers know Mateo pictures the empty shelf even though Abuela cannot see that thought.", quotedSpan: "reaching to dust the shelf and finding the empty spot bare" },
        { text: "What every person in the house thinks about the broken vase", role: "wrong_emphasis", rationale: "The narration mainly follows Mateo's thoughts, not every person's thoughts.", quotedSpan: "Only Mateo and the broken vase knew what had happened." },
      ],
    }),
  ];
  validateItems(items);
  const passage = buildEoyP2Passage();
  assert.equal(evaluatePssaTextFeatureItemLink(passage, items), "PASS", "EOY P2 feature must be linked to item 17");
  assert.equal(evaluatePssaSectionLookbackBalance(passage, items), "PASS", "EOY P2 section lookback must pass");
  return items;
}

function validateItems(items: EoyItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_eoy_p2_mcq_ak111",
    "pssa_item_g3_eoy_p2_mcq_ac211",
    "pssa_item_g3_eoy_p2_mcq_av411",
    "pssa_item_g3_eoy_p2_mcq_av412",
    "pssa_item_g3_eoy_p2_mcq_ak112",
    "pssa_item_g3_eoy_p2_te_ak113",
    "pssa_item_g3_eoy_p2_sa_ak112",
    "pssa_item_g3_eoy_p2_mcq_ac211_ao5",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [0, 1, 2, 3, 1, 2], "EOY P2 MCQ key positions must be A/B/C/D/B/C");
  for (const item of items) {
    assert.equal(item.reviewStatus, "PENDING");
    assert.equal(item.itemStatus, "candidate");
    assert.equal(item.sourceType, "internal_original");
    assert.equal(item.licenseStatus, "cleared_internal_original");
    assert.equal(item.commercialUseAllowed, true);
    assert.equal(item.needsLegalReview, false);
    assert.equal((item as any).scoringBucket, undefined, "EOY P2 bank item must not set scoringBucket");
    projectPssaStudentItem(item);
    if (item.structuredChoicesJson) {
      assert.equal(item.structuredChoicesJson.length, 4, `${item.itemId} must have four structured choices`);
      const roles = item.structuredChoicesJson.filter((_, index) => index !== item.correctIndex).map((choice) => choice.distractorRole);
      assert.equal(new Set(roles).size, 3, `${item.itemId} must have three distinct distractor roles`);
      for (const [index, choice] of item.structuredChoicesJson.entries()) {
        assert.equal(choice.isCorrect, index === item.correctIndex, `${item.itemId} isCorrect must match key`);
        assert.equal(String(choice.rationale).trim().length > 20, true, `${item.itemId} choice rationale must be specific`);
        assert.equal(choice.evidenceLinks.length > 0, true, `${item.itemId} choice must carry evidenceLinks`);
        if (index === item.correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct choice must carry distractorRole:null`);
        else assert(mappingRegistry[choice.distractorRole as keyof typeof mappingRegistry], `${item.itemId} role must be registered: ${choice.distractorRole}`);
      }
    }
  }
}

export function buildEoyP2Packet() {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 8,
    passages: [buildEoyP2Passage()],
    items: buildEoyP2Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildEoyP2Packet>) {
  const lines = ["# EOY P2 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildEoyP2Packet>) {
  const lines = ["# EOY P2 Reviewer Preview", "", "Includes keys, rationales, evidence links, and rubric. All content is PENDING/candidate and noDbWrite.", ""];
  for (const passage of packet.passages) lines.push(`## Passage: ${passage.title}`, "", `POV: ${passage.pov}`, `Feature: ${JSON.stringify(passage.textFeaturesJson[0])}`, "");
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale}`));
      lines.push("");
    }
    if (item.interactionType === "MATCHING_GRID") lines.push("Key:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```", "");
    if (item.rubric) lines.push("Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`, "");
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildEoyP2Packet>) {
  const lines = ["# EOY P2 Answer Key and Rubric", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    if (item.rubric) lines.push("", "Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildEoyP2Packet>) {
  const header = ["itemId", "eligibleContent", "interactionType", "pointValue", "reviewStatus", "itemStatus", "requiresFigure", "evidenceKind", "studentPreviewLeakFree"];
  const rows = packet.items.map((item) => [
    item.itemId,
    item.eligibleContent,
    item.interactionType,
    String(item.pointValue),
    item.reviewStatus,
    item.itemStatus,
    String(item.evidenceBinding.requiresFigure),
    item.evidenceBinding.evidenceKind,
    "PASS",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function assertSourcePackageFresh() {
  const source = packageSource();
  const itemSpec = fs.readFileSync(itemSpecPath, "utf8");
  assert(source.includes("APPROVED / LOCKED"), "source package must be approved and locked");
  assert.equal(wordCount(extractEoyP2PassageText(source)), 925, "source package passage must be 925 words");
  assert(source.includes("factCheckRequired:false"), "source package must record factCheckRequired:false");
  for (const required of [
    "pov: \"third_person\"",
    "figurative_language",
    "paragraph_05",
    "shards",
    "stomach tied in a knot",
    "Starts the problem",
    "Marks the turning point",
    "Shows the consequence",
    "reaching to dust the shelf and finding the empty spot bare",
  ]) {
    assert(source.includes(required) || itemSpec.includes(required), `EOY P2 specs must contain ${required}`);
  }
}

function main() {
  assertSourcePackageFresh();
  const packet = buildEoyP2Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("EOY P2 authoring complete: wrote exemplars/pssa_grade3_eoy_p2/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
