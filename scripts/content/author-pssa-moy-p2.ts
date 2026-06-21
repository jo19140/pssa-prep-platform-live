import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";

const outputDir = path.resolve("exemplars/pssa_grade3_moy_p2");
const passageId = "pssa_psg_g3_moy_p2_stubborn_dough";

export const moyP2PassageText = `Nadia wanted to bake the best bread on the whole block.

Every summer, the families on Juniper Street held a block party, and everyone brought food to share. Nadia's grandmother, whom she called Abuela, always baked soft, golden bread that disappeared before the sun went down. This year, Abuela's hands ached too much to bake. So Nadia decided she would make the bread herself. She wanted to see the neighbors smile the way they smiled at Abuela's loaves.

"Are you sure?" asked her little brother, Sam. He was seven, and he could not sit still for more than a minute.

"I am sure," Nadia said. "How hard can it be?"

Abuela sat at the kitchen table and read the recipe out loud. Nadia poured flour, water, and yeast into a big bowl. Yeast is a tiny ingredient that helps bread puff up and grow. Then she began to knead. To knead means to push and fold the dough with your hands, over and over. The dough felt like a stubborn cloud that did not want to be shaped. Her hands grew sticky, and white flour dusted her nose and her shirt. Little by little, the lumpy mixture turned into a smooth, round ball.

"Now we wait," Abuela said. "The dough must rest and rise. When bread rises, it slowly fills with air and gets bigger."

Nadia frowned. Waiting was the hardest part. "How long?" she asked.

"About an hour," said Abuela.

An hour felt like a year. Sam poked the dough with one finger. "It's not doing anything," he complained.

"Leave it alone," Nadia said. But secretly, she agreed. The dough just sat there like a lazy lump. After only twenty minutes, Nadia could not wait any longer. Surely, she thought, the heat of the oven would do the rest of the work faster. She pushed the dough inside.

When the timer rang, Nadia pulled out the pan, and her heart sank. The bread was flat and hard, like a stone. It had not grown at all; the little ball of dough had baked into a pale, heavy disk, no taller than a cookie. She tapped the top, and it made a dull, heavy thud.

"It's a rock," Sam said, and he laughed.

Nadia's eyes stung. She had rushed, and now her bread was ruined. "I should give up," she said quietly. "I am not Abuela."

Abuela took Nadia's hand. "You are not Abuela," she said gently. "You are Nadia, and you are still learning. Bread does not like to be hurried. Neither do most good things. Let's try once more - and this time, we trust the dough."

Nadia took a deep breath and mixed a fresh batch. She kneaded until her arms were tired. Then came the hard part again: waiting. This time, Nadia did not poke the dough or peek under the towel. To keep herself busy, she set the table and swept the floor. She even taught Sam a clapping game so that he would leave the bowl alone. Still, Sam wanted to check every few minutes. "Is it bigger yet? Is it bigger now?" he asked. Each time, Nadia gently pulled him back. "Give it time, Sam," she said - and she was surprised to hear Abuela's calm words coming out of her own mouth.

When the hour finally ended, Nadia lifted the towel. The dough had doubled in size! It had puffed up like a soft pillow. "It worked!" she gasped.

She shaped the dough into a round loaf and slid it into the oven. Soon the whole house smelled like a warm hug. When the bread came out, it was golden and tall. She tapped the crust, and this time it gave a light, hollow sound - exactly the way Abuela's loaves always did.

That evening, Nadia carried her loaf to the block party. Her hands shook a little. What if the neighbors did not like it? She set the bread on the long table, between the salads and the sliced watermelon.

A neighbor named Mr. Park took the first slice. He chewed slowly. Then he smiled. "This is wonderful," he said. "Soft inside, crisp outside - just like your grandmother's." Nadia let out the breath she had been holding, then cut slice after slice and passed them down the long table.

Soon the whole loaf was gone, and people were asking Nadia for the recipe. One older neighbor said the bread reminded her of her own grandmother's kitchen, and Nadia felt a warm glow - the kind that comes from doing something hard and doing it well. Sam told everyone, "My sister made that, and the first one was a rock!" Nadia laughed instead of feeling embarrassed. The rock loaf was part of the story now.

Abuela pulled her close. "You learned the secret," she said.

"Patience," Nadia answered.

"Patience," Abuela agreed. "And trying again."

Walking home under the streetlights, Nadia thought about her two loaves. The first was hard and flat because she had hurried it. The second was soft and tall because she had waited. She smiled to herself in the dark and listened to the crickets.

Next summer, Nadia decided, she would bake two loaves - one for the party, and one just for practice. And maybe, if he could learn to wait, she would even let Sam help.`;

type MoyChoice = {
  text: string;
  distractorRole?: keyof typeof mappingRegistry;
  rationale?: string;
  evidence?: string;
  evidenceLinks?: Array<{ evidenceKind: "quoted_span"; quotedSpan: string }>;
};

type MoyItem = {
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
  answerChoicesJson?: MoyChoice[];
  structuredChoicesJson?: MoyChoice[];
  correctIndex?: number;
  rows?: Array<{ rowId: string; label: string; correctColumnId?: string; rationale?: string; plausibleWrongRationales?: Record<string, string> }>;
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
  scoringJson: unknown;
  responseSpecJson?: unknown;
  evidenceBinding: EvidenceBinding;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  commercialUseAllowed: true;
  needsLegalReview: false;
  provenanceJson: Record<string, unknown>;
  auditMetadata: { authoredIn: "PSSA_MOY_P2_ITEMS"; noDbWrite: true; productionImportReady: false; autoScoringClaim?: false };
};

export type EvidenceBinding = {
  requiresFigure: false;
  requiresPassageText: true;
  evidenceKind: "passage_only";
  task?: "identify_message_only" | "explain_message_development";
  quotedText?: string;
  targetWordOrPhrase?: string;
  requiredDetailCount?: number;
  requiresReasoningConnection?: boolean;
  messageEvidenceThemes?: Array<"rushed_loaf" | "successful_loaf" | "changed_behavior">;
};

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

export function buildMoyP2Passage() {
  const passage = {
    id: passageId,
    title: "The Stubborn Dough",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "literary",
    genre: "literary_narrative",
    pov: "third_person",
    domainVocabularyLoad: "medium",
    wordCount: wordCount(moyP2PassageText),
    text: moyP2PassageText,
    textFeaturesJson: [],
    factCheckRequired: false,
    factCheckNotesJson: [
      {
        claimId: "fictional_story",
        claim: "The characters, Juniper Street, and block party are fictional; bread-rising details are generic grade-appropriate story details.",
        claimSupported: true,
      },
    ],
    staminaBand: "released_length",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1", unit: "P2" },
  };
  assert.equal(passage.wordCount, 884, "MOY P2 passage word count must be 884");
  assert.equal(passage.textFeaturesJson.length, 0, "MOY P2 is plain prose and must not carry a figure feature");
  return passage;
}

function baseItem(id: string, type: MoyItem["interactionType"], subtype: string, ec: string, points: number, evidenceBinding: EvidenceBinding): MoyItem {
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
    passageTitle: "The Stubborn Dough",
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
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1", unit: "P2" },
    auditMetadata: { authoredIn: "PSSA_MOY_P2_ITEMS", noDbWrite: true, productionImportReady: false },
  };
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  choices: [string, string | null, string, string][];
  correctIndex: number;
  evidenceBinding: EvidenceBinding;
}): MoyItem {
  const item = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding);
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map(([text, role, rationale, evidence], index) => ({
    text,
    ...(role ? { distractorRole: role as keyof typeof mappingRegistry } : {}),
    rationale,
    evidence,
    ...(index === args.correctIndex ? { evidenceLinks: [{ evidenceKind: "quoted_span" as const, quotedSpan: evidence }] } : {}),
  }));
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

export function buildMoyP2Items(): MoyItem[] {
  const items: MoyItem[] = [
    mcq({
      id: "pssa_item_g3_moy_p2_mcq_ak111",
      ec: "E03.A-K.1.1.1",
      subtype: "explicit_evidence_cause",
      prompt: "Why did Nadia's first loaf turn out flat and hard?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", quotedText: "After only twenty minutes, Nadia could not wait any longer." },
      choices: [
        ["The oven was too cool to bake bread correctly.", "unsupported_inference", "The passage does not say the oven was too cool; Nadia only thinks the oven will do the rest faster.", "Surely, she thought, the heat of the oven would do the rest of the work faster."],
        ["She baked the dough after only twenty minutes, before it had time to rise.", null, "Correct. The passage says Nadia waited only twenty minutes even though the dough needed about an hour to rest and rise.", "After only twenty minutes, Nadia could not wait any longer."],
        ["Sam poked the dough once, so it could not become bread.", "wrong_emphasis", "Sam's poking is a true nearby detail, but the passage emphasizes that Nadia rushed the dough into the oven too early.", "Sam poked the dough with one finger."],
        ["Nadia forgot to add yeast to the mixing bowl.", "opposite_claim", "This reverses the passage detail; Nadia did add yeast to the bowl before kneading.", "Nadia poured flour, water, and yeast into a big bowl."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p2_mcq_ak112",
      ec: "E03.A-K.1.1.2",
      subtype: "central_message_identify",
      prompt: "Which sentence best states the central message of the story?",
      correctIndex: 3,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", task: "identify_message_only" },
      choices: [
        ["Fresh bread tastes best when it is served at a party.", "too_narrow", "This focuses on one story detail instead of the larger lesson Nadia learns.", "That evening, Nadia carried her loaf to the block party."],
        ["People should avoid asking younger siblings for help.", "unsupported_inference", "The passage does not teach that younger siblings should be avoided; Sam is included and may help later.", "And maybe, if he could learn to wait, she would even let Sam help."],
        ["A person should hurry before a task becomes boring.", "opposite_claim", "This reverses the story's lesson because hurrying causes Nadia's first loaf to fail.", "The first was hard and flat because she had hurried it."],
        ["Patience and trying again can help someone succeed.", null, "Correct. Nadia succeeds after she tries again, waits, and trusts the dough.", "Patience. And trying again."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p2_mcq_ac211",
      ec: "E03.A-C.2.1.1",
      subtype: "literary_point_of_view",
      prompt: "Which statement best describes the point of view of the story?",
      correctIndex: 0,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
      choices: [
        ["A narrator outside the story tells what Nadia does and feels.", null, "Correct. The narrator uses names such as Nadia and describes Nadia's feelings.", "Nadia's eyes stung."],
        ["Nadia tells the story using the words I and me.", "opposite_claim", "This is the opposite of the passage's narration; Nadia does not narrate in first person.", "Nadia wanted to bake the best bread on the whole block."],
        ["Sam tells only what happens to the dough.", "unsupported_inference", "The passage does not show Sam narrating the story or limiting the story to the dough.", "Sam poked the dough with one finger."],
        ["Abuela tells readers the recipe step by step.", "wrong_emphasis", "Abuela reads the recipe in the story, but she is not the narrator of the whole passage.", "Abuela sat at the kitchen table and read the recipe out loud."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p2_mcq_av411",
      ec: "E03.A-V.4.1.1",
      subtype: "context_vocabulary",
      prompt: "What does the word \"dull\" mean in the phrase \"a dull, heavy thud\"?",
      correctIndex: 2,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", targetWordOrPhrase: "dull", quotedText: "a dull, heavy thud" },
      choices: [
        ["bright and shiny", "opposite_claim", "This is nearly the opposite of dull in this context, which describes a heavy sound.", "The bread was flat and hard, like a stone."],
        ["funny and surprising", "plausible_misreading", "The rock loaf may seem funny to Sam, but dull describes the sound the bread makes when tapped.", "It's a rock."],
        ["low, heavy, and not clear", null, "Correct. The words heavy thud show that dull describes a low, unclear sound.", "She tapped the top, and it made a dull, heavy thud."],
        ["soft and sweet-smelling", "wrong_section", "This uses a later detail about the successful loaf, not the meaning of dull.", "Soon the whole house smelled like a warm hug."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p2_mcq_av412",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_language",
      prompt: "What does the phrase \"the whole house smelled like a warm hug\" suggest?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only", targetWordOrPhrase: "the whole house smelled like a warm hug", quotedText: "Soon the whole house smelled like a warm hug." },
      choices: [
        ["The oven made the kitchen too hot.", "wrong_emphasis", "This focuses on warmth literally, but the phrase describes how pleasant and comforting the smell is.", "Soon the whole house smelled like a warm hug."],
        ["The bread smelled comforting and pleasant.", null, "Correct. A warm hug suggests comfort, so the smell is welcoming and good.", "Soon the whole house smelled like a warm hug."],
        ["Someone gave Nadia a hug in the kitchen.", "plausible_misreading", "This reads the comparison as a real action, but the phrase is figurative.", "Soon the whole house smelled like a warm hug."],
        ["The smell made everyone dislike the bread.", "opposite_claim", "This reverses the positive meaning of the phrase and the later praise for the bread.", "This is wonderful."],
      ],
    }),
  ];

  const matchingGrid = baseItem("pssa_item_g3_moy_p2_te_ak113", "MATCHING_GRID", "character_action_trait_grid", "E03.A-K.1.1.3", 3, { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" });
  matchingGrid.stem = "For each character, choose the action that best shows the character's trait or motivation.";
  matchingGrid.instructionText = "Match each character to the action that best shows what the character is like or wants.";
  matchingGrid.rows = [
    {
      rowId: "row_nadia",
      label: "Nadia",
      correctColumnId: "action_nadia_waits",
      rationale: "Nadia shows determination and growing patience when she mixes a fresh batch, waits, and helps Sam wait too.",
      plausibleWrongRationales: {
        action_sam_checks: "This action shows Sam's impatience, not Nadia's changed behavior after the first loaf fails.",
        action_abuela_comforts: "This action belongs to Abuela, who guides Nadia instead of baking the second loaf herself.",
      },
    },
    {
      rowId: "row_sam",
      label: "Sam",
      correctColumnId: "action_sam_checks",
      rationale: "Sam shows impatience and curiosity when he pokes the dough and keeps asking whether it is bigger.",
      plausibleWrongRationales: {
        action_nadia_waits: "This action shows Nadia learning patience, not Sam's repeated checking.",
        action_abuela_comforts: "This action shows Abuela's calm guidance, not Sam's impatience.",
      },
    },
    {
      rowId: "row_abuela",
      label: "Abuela",
      correctColumnId: "action_abuela_comforts",
      rationale: "Abuela shows patience and wisdom when she comforts Nadia and encourages her to try again slowly.",
      plausibleWrongRationales: {
        action_nadia_waits: "This action shows Nadia applying Abuela's advice, not Abuela giving the advice.",
        action_sam_checks: "This action shows Sam's impatience, not Abuela's patient guidance.",
      },
    },
  ];
  matchingGrid.columns = [
    { columnId: "action_nadia_waits", label: "Mixes a fresh batch and helps Sam wait." },
    { columnId: "action_sam_checks", label: "Pokes the dough and asks again and again whether it is bigger." },
    { columnId: "action_abuela_comforts", label: "Comforts Nadia and encourages her to try again patiently." },
  ];
  matchingGrid.selectionRule = "Select one action for each character.";
  const correctCells = [
    { rowId: "row_nadia", columnId: "action_nadia_waits" },
    { rowId: "row_sam", columnId: "action_sam_checks" },
    { rowId: "row_abuela", columnId: "action_abuela_comforts" },
  ];
  matchingGrid.correctResponseJson = { correctCells };
  (matchingGrid as any).correctCells = correctCells;
  matchingGrid.scoringJson = { totalPoints: 3 };
  matchingGrid.responseSpecJson = buildPssaResponseSpec(matchingGrid);
  items.push(matchingGrid);

  const shortAnswer = baseItem("pssa_item_g3_moy_p2_sa_ak112", "SHORT_ANSWER", "central_message_development_short_answer", "E03.A-K.1.1.2", 3, {
    requiresFigure: false,
    requiresPassageText: true,
    evidenceKind: "passage_only",
    task: "explain_message_development",
    requiredDetailCount: 2,
    requiresReasoningConnection: true,
    messageEvidenceThemes: ["rushed_loaf", "successful_loaf", "changed_behavior"],
  });
  shortAnswer.stem = "Explain how Nadia's actions and her two loaves help develop the message of the story. Use two details from the passage.";
  shortAnswer.instructionText = "Write a short answer that explains the message and supports it with two details from the passage.";
  shortAnswer.requiredSupportCount = 2;
  shortAnswer.requiresTextSupport = true;
  shortAnswer.expectedAnswerCore = "Nadia's rushed first loaf fails, but she changes her behavior, waits, tries again, and succeeds; the contrast develops the message that patience and trying again can lead to success.";
  shortAnswer.acceptableTextSupport = [
    { supportId: "rushed_loaf", quotedSpan: "After only twenty minutes, Nadia could not wait any longer.", connectsToExpectedAnswer: "This shows the rushed choice that leads to the failed first loaf." },
    { supportId: "rock_loaf", quotedSpan: "The bread was flat and hard, like a stone.", connectsToExpectedAnswer: "This shows the result of rushing and helps set up the contrast." },
    { supportId: "changed_behavior", quotedSpan: "This time, Nadia did not poke the dough or peek under the towel.", connectsToExpectedAnswer: "This shows Nadia changes by waiting and trusting the dough." },
    { supportId: "successful_loaf", quotedSpan: "When the bread came out, it was golden and tall.", connectsToExpectedAnswer: "This shows the successful result after Nadia waits and tries again." },
    { supportId: "reflection", quotedSpan: "The first was hard and flat because she had hurried it. The second was soft and tall because she had waited.", connectsToExpectedAnswer: "This directly connects the two loaves to the message about patience." },
  ];
  shortAnswer.commonIncompletePatterns = [
    "Names the message but gives only one detail.",
    "Lists two loaf details without explaining how they show patience or trying again.",
    "Copies Abuela's words without connecting them to Nadia's changed actions.",
  ];
  shortAnswer.rubric = {
    points3: "Explains the message and connects at least two accurate passage details, including the rushed first loaf and the successful second loaf or Nadia's changed behavior, to the idea that patience and trying again lead to success.",
    points2: "Explains the message with one strong detail, or gives two accurate details with a partial connection to the message.",
    points1: "Names patience, trying again, or a relevant detail but gives little explanation of how the story develops the message.",
    points0: "Gives an incorrect, unsupported, copied-only, or off-topic response.",
  };
  shortAnswer.scoreBandExamples = [
    { band: 3, response: "Nadia's first loaf is flat and hard because she bakes it after only twenty minutes. Then she tries again, waits the full time, and the second loaf is golden and tall. These details show that patience and trying again help her succeed.", why: "Uses two details and explains how the contrast develops the message." },
    { band: 2, response: "The message is to be patient. Nadia waits the second time and the bread comes out better.", why: "Correct message and one strong detail, but the contrast and reasoning are partial." },
    { band: 1, response: "The bread was flat and hard, like a stone. Then it was golden.", why: "Relevant details are listed, but the response barely explains the message." },
    { band: 0, response: "The story is mostly about a block party and watermelon.", why: "Off-topic and does not explain the message." },
  ];
  shortAnswer.correctResponseJson = { rubric: "human_scored" };
  shortAnswer.scoringJson = { totalPoints: 3, autoScoringClaim: false };
  shortAnswer.auditMetadata = { ...shortAnswer.auditMetadata, autoScoringClaim: false };
  shortAnswer.responseSpecJson = buildPssaResponseSpec(shortAnswer);
  items.push(shortAnswer);

  validateItems(items);
  return items;
}

function validateItems(items: MoyItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_moy_p2_mcq_ak111",
    "pssa_item_g3_moy_p2_mcq_ak112",
    "pssa_item_g3_moy_p2_mcq_ac211",
    "pssa_item_g3_moy_p2_mcq_av411",
    "pssa_item_g3_moy_p2_mcq_av412",
    "pssa_item_g3_moy_p2_te_ak113",
    "pssa_item_g3_moy_p2_sa_ak112",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [1, 3, 0, 2, 1], "P2 MCQ key positions must be B/D/A/C/B");
  for (const item of items) {
    assert.equal(item.reviewStatus, "PENDING");
    assert.equal(item.itemStatus, "candidate");
    assert.equal(item.sourceType, "internal_original");
    assert.equal(item.licenseStatus, "cleared_internal_original");
    assert.equal(item.commercialUseAllowed, true);
    assert.equal(item.needsLegalReview, false);
    assert.equal((item as any).scoringBucket, undefined, "P2 bank item must not set scoringBucket");
    projectPssaStudentItem(item);
    for (const choice of item.structuredChoicesJson ?? []) {
      if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole], `registered distractorRole ${choice.distractorRole}`);
    }
  }
}

export function buildMoyP2Packet() {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 7,
    passages: [buildMoyP2Passage()],
    items: buildMoyP2Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildMoyP2Packet>) {
  const lines = ["# MOY P2 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildMoyP2Packet>) {
  const lines = ["# MOY P2 Reviewer Preview", "", "Includes keys, rationales, and rubric. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("");
    }
    if (item.interactionType === "MATCHING_GRID") lines.push("Key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    if (item.rubric) lines.push("Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`, "");
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildMoyP2Packet>) {
  const lines = ["# MOY P2 Answer Key and Rubric", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    if (item.rubric) lines.push("", "Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildMoyP2Packet>) {
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
  const source = fs.readFileSync("specs/pssa_g3_moy_p2_passage_package.md", "utf8");
  const itemSpec = fs.readFileSync("specs/codex_pssa_moy_p2_items.md", "utf8");
  assert(source.includes("APPROVED"), "source package must be approved");
  assert(source.includes("860–900 words") || source.includes("860-900 words"), "source package must record approved length band");
  assert(itemSpec.includes("884 words") || itemSpec.includes("884-word") || itemSpec.includes("**884**"), "item authoring spec must record 884 words");
  assert(source.includes("a dull, heavy thud"), "source package must preserve failed-loaf sound");
  assert(source.includes("light, hollow sound"), "source package must preserve successful-loaf sound");
  assert(source.includes("Juniper Street"), "source package must use Juniper Street");
  assert(source.includes("A-V.4.1.1") && source.includes("undefined"), "source package must caution that A-V.4.1.1 uses an undefined word");
  assert(/character\s*→\s*concrete action|character→action|character matching grid/i.test(source), "source package must preserve character-action grid caution");
  assert(!source.includes("central message stated"), "source package must not be stale explicit-message version");
}

function main() {
  assertSourcePackageFresh();
  const packet = buildMoyP2Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("MOY P2 authoring complete: wrote exemplars/pssa_grade3_moy_p2/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
