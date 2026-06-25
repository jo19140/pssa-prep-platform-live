import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";
import {
  buildPssaDramaLineMap,
  buildPssaStaminaSectionMap,
  evaluatePssaPassageStaminaMetadata,
  evaluatePssaTextFeatureIntegrity,
} from "./lib/pssa-stamina-gates";

const outputDir = path.resolve("exemplars/pssa_grade3_eoy_p4");
const passageId = "pssa_psg_g3_eoy_p4_borrowed_bike";
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-eoy-v1";

type Role = keyof typeof mappingRegistry;
type EvidenceKind = "spoken_line" | "stage_direction" | "whole_play_synthesis" | "quoted_span";

type EvidenceLink =
  | { evidenceKind: "spoken_line"; quotedSpan: string; sceneId: string; lineIndex: number; speaker: string }
  | { evidenceKind: "stage_direction"; quotedSpan: string; sceneId: string; lineIndex: number }
  | { evidenceKind: "whole_play_synthesis" };

type Choice = {
  text: string;
  isCorrect?: boolean;
  distractorRole?: Role | null;
  rationale: string;
  evidenceLinks?: EvidenceLink[];
};

type EvidenceBinding = {
  evidenceKind: EvidenceKind;
  quotedSpan?: string;
  targetWordOrPhrase?: string;
};

type P4Item = {
  id: string;
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "MCQ" | "EBSR";
  interactionType: "MCQ" | "EBSR";
  interactionSubtype: string;
  passageId: string;
  passageTitle: "The Borrowed Bike";
  eligibleContent: string;
  reportingCategory: "A";
  pointValue: number;
  studentFacingPrompt?: string;
  stem?: string;
  answerChoicesJson?: Choice[];
  structuredChoicesJson?: Choice[];
  correctIndex?: number;
  comprehensionKind?: "synthesis";
  partA?: { prompt: string; choices: Choice[]; correctIndex: number; evidenceBinding: EvidenceBinding };
  partB?: { instruction: string; choices: Array<{ text: string; isCorrect?: boolean; alignedPartAMisconception?: string; evidenceLinks?: EvidenceLink[] }>; requiredSelectionCount: 2 };
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
  auditMetadata: { authoredIn: "PSSA_EOY_P4_ITEMS"; noDbWrite: true; productionImportReady: false; intendedAssemblyBucket: "operational" | "analytics_only" };
};

export function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

function packageMarkdown() {
  return fs.readFileSync("specs/pssa_g3_eoy_p4_passage_package.md", "utf8");
}

export function eoyP4PassageText(source = packageMarkdown()) {
  const region = source.split("## 2. Script")[1]?.split("\n---")[0];
  assert(region, "EOY P4 script section must exist");
  const lines = region
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^#{3,}\s+/, "").replace(/\*\*/g, ""));
  const text = lines.join("\n\n");
  assert.equal(wordCount(text), 1137, "EOY P4 passage word count must be 1137");
  assert.equal(text.includes("MR ALVAREZ:"), true, "EOY P4 must use period-free MR ALVAREZ labels");
  assert.equal(text.includes("MR. ALVAREZ:"), false, "EOY P4 must not use dotted MR. ALVAREZ labels");
  return text;
}

export function buildEoyP4Passage() {
  const text = eoyP4PassageText();
  const castBlock = text.split("## SCENE 1")[0].trim();
  assert(text.includes(castBlock), "cast block must be verbatim in the passage");
  const passage = {
    id: passageId,
    title: "The Borrowed Bike",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "literary",
    genre: "drama",
    staminaBand: "released_length",
    wordCount: wordCount(text),
    text,
    textFeaturesJson: [
      { type: "cast_list", featureText: castBlock },
      { type: "scene_marker", sectionId: "scene_01" },
      { type: "scene_marker", sectionId: "scene_02" },
      { type: "scene_marker", sectionId: "scene_03" },
      { type: "scene_marker", sectionId: "scene_04" },
    ],
    factCheckRequired: false,
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion, unit: "P4" },
  };
  const sectionIds = new Set(buildPssaStaminaSectionMap(passage).map((section) => section.sectionId));
  for (const id of ["scene_01", "scene_02", "scene_03", "scene_04"]) assert(sectionIds.has(id), `${id} must be in the drama section map`);
  assert.equal(evaluatePssaPassageStaminaMetadata(passage), "PASS", "EOY P4 drama metadata must pass");
  return passage;
}

function dramaLink(passage: ReturnType<typeof buildEoyP4Passage>, quotedSpan: string, evidenceKind: "spoken_line" | "stage_direction", speaker?: string): EvidenceLink {
  const row = buildPssaDramaLineMap(passage).find((row) => row.text.includes(quotedSpan) && row.evidenceKind === evidenceKind && (!speaker || row.speaker === speaker));
  assert(row, `drama evidence row not found: ${quotedSpan}`);
  assert.equal(passage.text.includes(quotedSpan), true, `quotedSpan must be in passage: ${quotedSpan}`);
  if (evidenceKind === "spoken_line") {
    assert(row.speaker, `spoken line must have speaker for ${quotedSpan}`);
    return { evidenceKind, quotedSpan, sceneId: row.sceneId, lineIndex: row.lineIndex, speaker: row.speaker };
  }
  return { evidenceKind, quotedSpan, sceneId: row.sceneId, lineIndex: row.lineIndex };
}

function baseItem(id: string, type: "MCQ" | "EBSR", subtype: string, ec: string, points: number, evidenceBinding: EvidenceBinding, intendedAssemblyBucket: "operational" | "analytics_only"): P4Item {
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
    passageTitle: "The Borrowed Bike",
    eligibleContent: ec,
    reportingCategory: "A",
    pointValue: points,
    correctResponseJson: {},
    scoringJson: { totalPoints: points },
    responseSpecJson: {},
    evidenceBinding,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion, unit: "P4" },
    auditMetadata: { authoredIn: "PSSA_EOY_P4_ITEMS", noDbWrite: true, productionImportReady: false, intendedAssemblyBucket },
  };
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  correctIndex: number;
  evidenceBinding: EvidenceBinding;
  choices: Array<{ text: string; role: Role | null; rationale: string; evidenceLinks: EvidenceLink[] }>;
  intendedAssemblyBucket: "operational" | "analytics_only";
  comprehensionKind?: "synthesis";
}) {
  const item = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding, args.intendedAssemblyBucket);
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
  item.responseSpecJson = {
    prompt: args.prompt,
    choices: item.answerChoicesJson.map((row) => row.text),
    structuredChoicesJson: item.answerChoicesJson.map((row, index) => index === args.correctIndex ? { text: row.text } : { text: row.text, distractorRole: row.distractorRole }),
  };
  if (args.comprehensionKind) item.comprehensionKind = args.comprehensionKind;
  return item;
}

function ebsr(args: {
  id: string;
  ec: string;
  subtype: string;
  partA: { prompt: string; correctIndex: number; choices: Array<{ text: string; role: Role | null; rationale: string }>; evidenceBinding: EvidenceBinding };
  partB: { instruction: string; choices: Array<{ text: string; isCorrect?: boolean; alignedPartAMisconception?: string; evidenceLinks: EvidenceLink[] }>; correctIndices: number[] };
}) {
  const item = baseItem(args.id, "EBSR", args.subtype, args.ec, 2, args.partA.evidenceBinding, "operational");
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
    partB: { instruction: args.partB.instruction, choices: args.partB.choices, requiredSelectionCount: 2 },
  };
  item.correctResponseJson = { partA: { correctIndex: args.partA.correctIndex }, partB: { correctIndices: args.partB.correctIndices } };
  item.scoringJson = { totalPoints: 2, partAPoints: 1, partBPoints: 1, requirePartACorrectForFullCredit: true };
  return item;
}

export function buildEoyP4Items(): P4Item[] {
  const passage = buildEoyP4Passage();
  const chore = "I saved up two whole summers of chore money for it.";
  const cold = "her words coming out cold as ice";
  const showingOff = "You were probably showing off, doing wheelies, not even looking.";
  const goHome = "I don't want to hear it. Just go home, Tyler.";
  const swerved = "He swerved so fast that he scraped the whole side.";
  const jumped = "I jumped to conclusions.";
  const apology = "Tyler. I am so sorry. Mr Alvarez just found me. He told me about Sofia, and the ball, and the curb. You scratched my bike saving a little kid, and I yelled at you for it.";
  const borrowed = "Could I maybe borrow yours? Just for an hour? I'll be careful, I promise.";
  const tylerHurt = "That part hurt worse than the bike, Maya. You decided I was careless before you asked me anything. You looked at me like I'd wreck your bike on purpose.";
  const listen = "Tell me the whole thing. This time I'll just listen.";
  const gold = "I'll guard it like it's made of gold.";

  const l = (span: string, kind: "spoken_line" | "stage_direction", speaker?: string) => dramaLink(passage, span, kind, speaker);
  const items = [
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_ak111",
      ec: "E03.A-K.1.1.1",
      subtype: "explicit_bike_matters",
      prompt: "Why is Maya's bike special to her?",
      correctIndex: 2,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: chore },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "Tyler gave it to her as a present that morning.", role: "unsupported_inference", rationale: "The play does not say Tyler gave Maya the bike; Maya explains how she earned it.", evidenceLinks: [l(chore, "spoken_line", "MAYA")] },
        { text: "It belongs to Mr Alvarez and Sofia.", role: "wrong_section", rationale: "This pulls in characters from a later scene, not the reason the bike matters to Maya.", evidenceLinks: [l("This belongs to my daughter, Sofia.", "spoken_line", "MR ALVAREZ")] },
        { text: "She saved two summers of chore money for it.", role: null, rationale: "Correct. Maya says she saved for it and calls it the nicest thing she owns.", evidenceLinks: [l(chore, "spoken_line", "MAYA")] },
        { text: "It is special because the scratch makes it look new.", role: "opposite_claim", rationale: "This reverses Maya's feelings because the scratch upsets her.", evidenceLinks: [l("Wait. What is that? Is that a scratch? On my bike?", "spoken_line", "MAYA")] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_ak113",
      ec: "E03.A-K.1.1.3",
      subtype: "drama_sequence",
      prompt: "Which choice shows the order of important events in the play?",
      correctIndex: 0,
      evidenceBinding: { evidenceKind: "whole_play_synthesis" },
      intendedAssemblyBucket: "operational",
      comprehensionKind: "synthesis",
      choices: [
        { text: "Maya lends the bike, sees the scratch, hears Mr Alvarez, and apologizes.", role: null, rationale: "Correct. This follows the four-scene order of the play.", evidenceLinks: [l(borrowed, "spoken_line", "TYLER")] },
        { text: "Mr Alvarez explains first, then Tyler borrows the bike, and then Maya sees the scratch.", role: "opposite_claim", rationale: "This reverses the order because Mr Alvarez explains after Maya sees the scratch.", evidenceLinks: [l(swerved, "spoken_line", "MR ALVAREZ")] },
        { text: "Maya apologizes before she learns why Tyler scratched the bike.", role: "wrong_section", rationale: "This uses the apology scene but puts it before the reveal that causes it.", evidenceLinks: [l(apology, "spoken_line", "MAYA")] },
        { text: "The play is mainly a list of bike-care rules Maya gives Tyler.", role: "too_narrow", rationale: "The rules are one early detail, not the sequence across the whole play.", evidenceLinks: [l("Walk the bumpy part. No curb jumping. Straight back. Got it.", "spoken_line", "TYLER")] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_av411",
      ec: "E03.A-V.4.1.1",
      subtype: "vocab_swerved",
      prompt: "What does the word \"swerved\" mean in Scene 3?",
      correctIndex: 3,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: swerved, targetWordOrPhrase: "swerved" },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "stopped slowly in a straight line", role: "opposite_claim", rationale: "This is the opposite of turning hard and scraping the side.", evidenceLinks: [l(swerved, "spoken_line", "MR ALVAREZ")] },
        { text: "polished the bike until it shined", role: "wrong_section", rationale: "This uses an earlier driveway detail, not the word swerved.", evidenceLinks: [l("(A driveway on a bright Saturday morning. MAYA is wiping down a blue bicycle with a soft cloth, polishing the frame until it shines. TYLER hurries up the sidewalk, out of breath.)", "stage_direction")] },
        { text: "bragged about doing something brave", role: "unsupported_inference", rationale: "Mr Alvarez says Tyler did not stop to brag, so this is not the meaning.", evidenceLinks: [l("He didn't even stop to brag.", "spoken_line", "MR ALVAREZ")] },
        { text: "turned suddenly aside", role: null, rationale: "Correct. Mr Alvarez says Tyler turned hard to miss Sofia and scraped the bike.", evidenceLinks: [l(swerved, "spoken_line", "MR ALVAREZ")] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_av412",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_cold_as_ice",
      prompt: "What does the phrase \"cold as ice\" show about Maya's words?",
      correctIndex: 1,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: cold, targetWordOrPhrase: "cold as ice" },
      intendedAssemblyBucket: "operational",
      choices: [
        { text: "Her words are quiet because she is sleepy.", role: "unsupported_inference", rationale: "The play does not say Maya is sleepy; it shows she is upset about the scratch.", evidenceLinks: [l(cold, "spoken_line", "MAYA")] },
        { text: "Her words sound angry and unkind.", role: null, rationale: "Correct. The phrase describes Maya's harsh tone when she assumes Tyler was careless.", evidenceLinks: [l(cold, "spoken_line", "MAYA")] },
        { text: "Her words are about actual ice on the bike.", role: "plausible_misreading", rationale: "This reads the figurative phrase literally, but no ice is on the bike.", evidenceLinks: [l(cold, "spoken_line", "MAYA")] },
        { text: "Her words prove she already knows the full story.", role: "opposite_claim", rationale: "This reverses the play because Maya is speaking before she knows what happened.", evidenceLinks: [l("He tried to tell me. And I never let him say a single word.", "spoken_line", "MAYA")] },
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_ak112",
      ec: "E03.A-K.1.1.2",
      subtype: "central_message",
      prompt: "Which message is best supported by the whole play?",
      correctIndex: 2,
      evidenceBinding: { evidenceKind: "whole_play_synthesis" },
      intendedAssemblyBucket: "operational",
      comprehensionKind: "synthesis",
      choices: [
        { text: "A bike scratch is always more important than helping a person.", role: "opposite_claim", rationale: "This reverses Maya's lesson that Sofia's safety matters more than the scratch.", evidenceLinks: [l("But you stopping to keep a little kid safe matters a whole lot more.", "spoken_line", "MAYA")] },
        { text: "Friends should never borrow things from each other.", role: "unsupported_inference", rationale: "The play does not teach never to borrow; it teaches listening before judging.", evidenceLinks: [l(borrowed, "spoken_line", "TYLER")] },
        { text: "Ask and listen before deciding what happened.", role: null, rationale: "Correct. Maya learns she jumped to conclusions and lets Tyler tell the whole story.", evidenceLinks: [{ evidenceKind: "whole_play_synthesis" }] },
        { text: "The best way to fix every problem is with touch-up paint.", role: "too_narrow", rationale: "Touch-up paint is one repair detail, not the larger message of the play.", evidenceLinks: [l("A scratch can be fixed: my uncle has touch-up paint, or we could tape a stripe over it and call it a racing stripe.", "spoken_line", "MAYA")] },
      ],
    }),
    ebsr({
      id: "pssa_item_g3_eoy_p4_ebsr_ak113",
      ec: "E03.A-K.1.1.3",
      subtype: "motivation_action_ebsr",
      partA: {
        prompt: "Why does Maya tell Tyler to go home before he can explain?",
        correctIndex: 0,
        evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: showingOff },
        choices: [
          { text: "She has already decided he scratched the bike by being careless, so she will not listen.", role: null, rationale: "Correct. Maya assumes Tyler was showing off and refuses to hear his explanation." },
          { text: "She already knows Tyler saved Sofia and wants to thank him later.", role: "opposite_claim", rationale: "This reverses the order because Maya does not learn about Sofia until Scene 3." },
          { text: "She wants Tyler to go get library books before noon.", role: "wrong_section", rationale: "This uses Tyler's reason for borrowing the bike, not Maya's motivation in Scene 2." },
          { text: "She thinks Mr Alvarez scratched the bike.", role: "unsupported_inference", rationale: "The play does not say Maya blames Mr Alvarez for the scratch." },
        ],
      },
      partB: {
        instruction: "Choose two Maya lines from Scene 2 that best support the answer.",
        correctIndices: [1, 2],
        choices: [
          { text: borrowed, alignedPartAMisconception: "borrowing_reason", evidenceLinks: [l(borrowed, "spoken_line", "TYLER")] },
          { text: showingOff, isCorrect: true, evidenceLinks: [l(showingOff, "spoken_line", "MAYA")] },
          { text: goHome, isCorrect: true, evidenceLinks: [l(goHome, "spoken_line", "MAYA")] },
          { text: apology, alignedPartAMisconception: "later_apology", evidenceLinks: [l(apology, "spoken_line", "MAYA")] },
        ],
      },
    }),
    mcq({
      id: "pssa_item_g3_eoy_p4_mcq_av412_ao6",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_jumped_to_conclusions",
      prompt: "What does Maya mean when she says, \"I jumped to conclusions\"?",
      correctIndex: 1,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: jumped, targetWordOrPhrase: "jumped to conclusions" },
      intendedAssemblyBucket: "analytics_only",
      choices: [
        { text: "She physically jumped away from the bicycle.", role: "plausible_misreading", rationale: "This reads the phrase literally, but Maya is describing how she made a decision.", evidenceLinks: [l(jumped, "spoken_line", "MAYA")] },
        { text: "She judged before she knew the facts.", role: null, rationale: "Correct. Maya says this after learning she judged Tyler without hearing him.", evidenceLinks: [l(jumped, "spoken_line", "MAYA")] },
        { text: "She listened carefully before she spoke.", role: "opposite_claim", rationale: "This reverses the phrase because she did not listen before accusing Tyler.", evidenceLinks: [l(listen, "spoken_line", "MAYA")] },
        { text: "She wanted to make the scratch into a racing stripe.", role: "wrong_section", rationale: "This uses a later repair idea, not the meaning of the figurative phrase.", evidenceLinks: [l("A racing stripe is kind of cool.", "spoken_line", "TYLER")] },
      ],
    }),
  ];
  validateItems(items, passage);
  assert.equal(evaluatePssaTextFeatureIntegrity(passage, items), "PASS", "EOY P4 drama feature integrity must pass");
  return items;
}

function validateItems(items: P4Item[], passage: ReturnType<typeof buildEoyP4Passage>) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_eoy_p4_mcq_ak111",
    "pssa_item_g3_eoy_p4_mcq_ak113",
    "pssa_item_g3_eoy_p4_mcq_av411",
    "pssa_item_g3_eoy_p4_mcq_av412",
    "pssa_item_g3_eoy_p4_mcq_ak112",
    "pssa_item_g3_eoy_p4_ebsr_ak113",
    "pssa_item_g3_eoy_p4_mcq_av412_ao6",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [2, 0, 3, 1, 2, 1]);
  assert.deepEqual(items.filter((item) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [0]);
  for (const item of items) {
    assert.equal((item as any).scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
    projectPssaStudentItem(item);
    const choices = item.interactionType === "MCQ" ? item.structuredChoicesJson ?? [] : item.partA?.choices ?? [];
    for (const [index, choice] of choices.entries()) {
      const correctIndex = item.interactionType === "MCQ" ? item.correctIndex : item.partA?.correctIndex;
      if (index === correctIndex) assert.equal(choice.distractorRole, null, `${item.itemId} correct role must be null`);
      else assert(mappingRegistry[choice.distractorRole as Role], `${item.itemId} registered role ${choice.distractorRole}`);
    }
    for (const choice of item.answerChoicesJson ?? []) for (const link of choice.evidenceLinks ?? []) if ("quotedSpan" in link) assert(passage.text.includes(link.quotedSpan), `${item.itemId} evidence verbatim`);
    for (const choice of item.partB?.choices ?? []) for (const link of choice.evidenceLinks ?? []) if ("quotedSpan" in link) assert(passage.text.includes(link.quotedSpan), `${item.itemId} Part B evidence verbatim`);
  }
}

export function buildEoyP4Packet() {
  const passage = buildEoyP4Passage();
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 7,
    passages: [passage],
    items: buildEoyP4Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildEoyP4Packet>) {
  const lines = ["# EOY P4 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildEoyP4Packet>) {
  const lines = ["# EOY P4 Reviewer Preview", "", "Includes keys and rationales. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale}`));
      lines.push("");
    }
    if (item.partA) {
      lines.push("Part A:");
      item.partA.choices.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.partA?.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale}`));
      lines.push("Part B:");
      item.partB?.choices.forEach((choice, index) => lines.push(`- ${index}${choice.isCorrect ? " (KEY)" : ""}: ${choice.text}`));
      lines.push("Part B key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    }
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildEoyP4Packet>) {
  const lines = ["# EOY P4 Answer Key", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildEoyP4Packet>) {
  const header = ["itemId", "eligibleContent", "interactionType", "pointValue", "reviewStatus", "itemStatus", "intendedAssemblyBucket", "studentPreviewLeakFree"];
  const rows = packet.items.map((item) => [item.itemId, item.eligibleContent, item.interactionType, String(item.pointValue), item.reviewStatus, item.itemStatus, item.auditMetadata.intendedAssemblyBucket, "PASS"]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function assertSourcePackageFresh() {
  const source = packageMarkdown();
  for (const required of ["APPROVED / LOCKED", "MR ALVAREZ:", "You were probably showing off, doing wheelies, not even looking.", "I don't want to hear it. Just go home, Tyler.", "I saved up two whole summers of chore money for it.", "cold as ice", "He swerved so fast that he scraped the whole side.", "I jumped to conclusions.", "evaluatePssaTextFeatureIntegrity"]) {
    assert(source.includes(required), `EOY P4 source package missing ${required}`);
  }
  assert.equal(eoyP4PassageText().includes("MR. ALVAREZ:"), false, "EOY P4 extracted script must not use MR. ALVAREZ");
  assert.equal((source.match(/^## SCENE \d/gm) ?? []).length, 4, "EOY P4 source package must have four scenes");
  assert.equal(eoyP4PassageText().includes("**"), false, "EOY P4 extracted script must not contain markdown bold");
}

function main() {
  assertSourcePackageFresh();
  const packet = buildEoyP4Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("EOY P4 authoring complete: wrote exemplars/pssa_grade3_eoy_p4/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
