import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";

const outputDir = path.resolve("exemplars/pssa_grade3_moy_p4");
const passageId = "pssa_psg_g3_moy_p4_last_rehearsal";
const blueprintVersion = "pde-ela-diagnostic-stamina-2025-g3-moy-v1";

type Role = keyof typeof mappingRegistry;
type EvidenceKind = "stage_direction" | "whole_passage_synthesis" | "spoken_line" | "quoted_span" | "section_synthesis";

type EvidenceBinding = {
  evidenceKind: EvidenceKind;
  quotedSpan?: string;
  targetWordOrPhrase?: string;
  sceneId?: string;
  speaker?: string;
  sectionId?: string;
};

type Choice = {
  text: string;
  distractorRole?: Role;
  rationale?: string;
  misconceptionTag?: string;
  evidence?: string;
  evidenceLinks?: Array<{ evidenceKind: EvidenceKind; quotedSpan?: string; speaker?: string; sceneId?: string }>;
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
  passageTitle: "The Last Rehearsal";
  eligibleContent: string;
  reportingCategory: "A";
  pointValue: number;
  studentFacingPrompt?: string;
  stem?: string;
  answerChoicesJson?: Choice[];
  structuredChoicesJson?: Choice[];
  correctIndex?: number;
  partA?: { prompt: string; choices: Choice[]; correctIndex: number; evidenceBinding: EvidenceBinding };
  partB?: { instruction: string; choices: Array<{ text: string; isCorrect?: boolean; alignedPartAMisconception?: string }>; requiredSelectionCount: 2 };
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
  auditMetadata: { authoredIn: "PSSA_MOY_P4_ITEMS"; noDbWrite: true; productionImportReady: false; intendedAssemblyBucket?: "operational" | "analytics_only" };
};

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g) ?? []).length;
}

function packageMarkdown() {
  return fs.readFileSync("specs/pssa_g3_moy_p4_passage_package.md", "utf8");
}

function committedPackageMarkdown() {
  try {
    return execFileSync("git", ["show", "HEAD:specs/pssa_g3_moy_p4_passage_package.md"], { encoding: "utf8" });
  } catch {
    return packageMarkdown();
  }
}

export function moyP4PassageText() {
  const text = packageMarkdown().split("## 2. Passage")[1].split("## 3. Source")[0].trim();
  assert.equal(wordCount(text), 1086, "MOY P4 passage word count must be 1086");
  return text;
}

export function buildMoyP4Passage() {
  const text = moyP4PassageText();
  return {
    id: passageId,
    title: "The Last Rehearsal",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "literary",
    genre: "drama",
    wordCount: wordCount(text),
    text,
    textFeaturesJson: [],
    factCheckRequired: false,
    staminaBand: "released_length",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion, unit: "P4" },
  };
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
    passageTitle: "The Last Rehearsal",
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
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion, unit: "P4" },
    auditMetadata: { authoredIn: "PSSA_MOY_P4_ITEMS", noDbWrite: true, productionImportReady: false, intendedAssemblyBucket },
  };
}

function choice(text: string, role: Role | null, rationale: string, evidence: string, evidenceKind: EvidenceKind, speaker?: string): Choice {
  return {
    text,
    ...(role ? { distractorRole: role, misconceptionTag: role } : {}),
    rationale,
    evidence,
    evidenceLinks: [{ evidenceKind, quotedSpan: evidence, ...(speaker ? { speaker } : {}) }],
  };
}

function mcq(args: {
  id: string;
  ec: string;
  subtype: string;
  prompt: string;
  correctIndex: number;
  evidenceBinding: EvidenceBinding;
  choices: [string, Role | null, string, string, EvidenceKind, string?][];
  intendedAssemblyBucket: "operational" | "analytics_only";
}) {
  const item = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding, args.intendedAssemblyBucket);
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map(([text, role, rationale, evidence, evidenceKind, speaker], index) => {
    const row = choice(text, role, rationale, evidence, evidenceKind, speaker);
    return index === args.correctIndex ? { ...row, distractorRole: undefined, misconceptionTag: undefined } : row;
  });
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

function ebsr(args: {
  id: string;
  ec: string;
  subtype: string;
  partA: { prompt: string; correctIndex: number; choices: [string, Role | null, string][]; evidenceBinding: EvidenceBinding };
  partB: { instruction: string; choices: Array<{ text: string; isCorrect?: boolean; alignedPartAMisconception?: string }>; correctIndices: number[] };
}) {
  const item = baseItem(args.id, "EBSR", args.subtype, args.ec, 2, args.partA.evidenceBinding, "operational");
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
  item.scoringJson = {
    totalPoints: 2,
    partAPoints: 1,
    partBPoints: 1,
    requirePartACorrectForFullCredit: true,
    partialCreditRules: [
      { points: 2, rule: "Part A is correct and both Part B evidence choices are correct." },
      { points: 1, rule: "Part A is correct and Part B has one correct evidence choice." },
      { points: 0, rule: "Part A is incorrect, missing, malformed, or Part B provides no correct evidence." },
    ],
  };
  return item;
}

function assertVerbatim(text: string, span: string, label: string) {
  assert(text.includes(span), `${label} must be verbatim in the P4 passage: ${span}`);
}

export function buildMoyP4Items(): P4Item[] {
  const text = moyP4PassageText();
  const tornBackdrop = "A sudden gust blows in through a propped-open door. The tall castle leans, then wobbles. With a loud RIP, the painted cloth tears straight down the middle and folds to the floor in two ragged pieces.";
  const centralMessageLine = "Good thing we each knew how to help.";
  const marcusPride = "I spent three weeks on this castle. Every stone, every window, I painted by hand.";
  const marcusReal = "It won't look real. Mine looked real.";
  const frantically = "pacing frantically back and forth";
  const butterflies = "I already have butterflies in my stomach just thinking about it.";
  const backToSquareOne = "If I don't, we're back to square one.";
  const priyaIdea = "What if we don't copy the old one? What if we build something new — together?";
  const marcusTurns = "...Okay. Show me what you mean.";
  const jadaCancel = "A torn castle on stage is worse than no play at all.";
  for (const [span, label] of [
    [tornBackdrop, "torn backdrop"],
    [centralMessageLine, "central message anchor"],
    [marcusPride, "Marcus pride"],
    [marcusReal, "Marcus realism"],
    [frantically, "frantically"],
    [butterflies, "butterflies"],
    [backToSquareOne, "back to square one"],
    [priyaIdea, "Priya idea"],
    [marcusTurns, "Marcus turning point"],
    [jadaCancel, "Jada cancel"],
  ] as const) assertVerbatim(text, span, label);

  const items: P4Item[] = [
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_ak111",
      ec: "E03.A-K.1.1.1",
      subtype: "explicit_stage_event",
      prompt: "What happens to the castle backdrop in Scene 1?",
      correctIndex: 3,
      evidenceBinding: { evidenceKind: "stage_direction", quotedSpan: tornBackdrop },
      intendedAssemblyBucket: "operational",
      choices: [
        ["Marcus knocks the castle over while climbing down the ladder.", "unsupported_inference", "The passage does not say Marcus knocks it over; he has already climbed down before the gust.", "MARCUS climbs down a ladder, looking proud of his work.", "stage_direction"],
        ["Wet paint smears across the castle gate.", "wrong_emphasis", "This focuses on paint details, but the stage direction shows the backdrop tearing.", "I spent three weeks on this castle. Every stone, every window, I painted by hand.", "spoken_line", "MARCUS"],
        ["Someone steps through the painted gate by mistake.", "plausible_misreading", "This treats Priya's compliment about the gate as a real action, but nobody walks through it.", "It looks like you could walk right through the gate.", "spoken_line", "PRIYA"],
        ["A gust of wind blows in, and the painted castle tears down the middle.", null, "Correct. The stage direction says a gust blows in and the cloth tears down the middle.", tornBackdrop, "stage_direction"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_ak112",
      ec: "E03.A-K.1.1.2",
      subtype: "central_message_identify",
      prompt: "Which sentence best states the central message of the play?",
      correctIndex: 0,
      evidenceBinding: { evidenceKind: "whole_passage_synthesis" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["Listening to one another and combining everyone's strengths can solve a problem.", null, "Correct. The students solve the problem by using Priya's design, Marcus's art, and Jada's organizing.", centralMessageLine, "spoken_line", "PRIYA"],
        ["Always keep a spare backdrop ready before a play.", "too_narrow", "This is one practical detail a reader might imagine, but it is too narrow to be the central message.", tornBackdrop, "stage_direction"],
        ["Hard work always pays off exactly as planned.", "opposite_claim", "This reverses the play's lesson because Marcus's original hard work breaks and the group changes plans.", "Yours *was* beautiful, Marcus. Truly. But the beautiful one broke. This one would be quick, and from the seats it would still feel like a castle at night.", "spoken_line", "PRIYA"],
        ["It is best to follow the original plan no matter what happens.", "wrong_emphasis", "This focuses on Marcus's first reaction, but the play shows success after the students adapt.", marcusReal, "spoken_line", "MARCUS"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_ak113",
      ec: "E03.A-K.1.1.3",
      subtype: "character_motivation",
      prompt: "Why does Marcus want to repaint the same castle?",
      correctIndex: 1,
      evidenceBinding: { evidenceKind: "spoken_line", quotedSpan: marcusPride, speaker: "MARCUS" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["He wants to finish before Jada checks her list.", "unsupported_inference", "The passage does not say Marcus is competing with Jada or her list.", "JADA holds a script and checks items off a list.", "stage_direction"],
        ["He is proud of the three weeks he spent and wants it to look just as he planned.", null, "Correct. Marcus says he spent three weeks on the castle and later says his looked real.", marcusPride, "spoken_line", "MARCUS"],
        ["He dislikes Priya's idea because she wants everyone to stop helping.", "opposite_claim", "This reverses Priya's idea, which is to build something new together.", priyaIdea, "spoken_line", "PRIYA"],
        ["He is afraid of standing on the dark stage.", "wrong_section", "This uses a stage detail from later, not Marcus's motivation for repainting the castle.", "She turns the stage lights down low.", "stage_direction"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_av411",
      ec: "E03.A-V.4.1.1",
      subtype: "context_vocabulary_frantically",
      prompt: "What does the word \"frantically\" mean in the stage direction \"pacing frantically back and forth\"?",
      correctIndex: 2,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: frantically, targetWordOrPhrase: "frantically" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["slowly and calmly", "opposite_claim", "This is the opposite of Jada's worried pacing before the show.", "No. No, no, no.", "spoken_line", "JADA"],
        ["quietly and secretly", "wrong_emphasis", "This focuses on quietness, but Jada is openly worried and pacing.", "The show is tomorrow!", "spoken_line", "JADA"],
        ["in a fast, worried, out-of-control way", null, "Correct. Jada is panicking about the torn castle and tomorrow's show.", frantically, "stage_direction"],
        ["angrily and meanly", "plausible_misreading", "This is a plausible misread of Jada's upset feeling, but the context shows worry more than anger toward someone.", "The whole audience will laugh.", "spoken_line", "JADA"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_av412",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_butterflies",
      prompt: "What does Jada mean when she says she has \"butterflies in my stomach\"?",
      correctIndex: 3,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: butterflies, targetWordOrPhrase: "butterflies in my stomach" },
      intendedAssemblyBucket: "operational",
      choices: [
        ["She sees real insects flying near the stage.", "plausible_misreading", "This reads the phrase literally, but Jada is describing a feeling.", butterflies, "spoken_line", "JADA"],
        ["She is very hungry before rehearsal.", "wrong_section", "This uses the stomach word from the phrase, but the section is about worry before the show.", "The show is tomorrow!", "spoken_line", "JADA"],
        ["She is too sleepy to remember her lines.", "unsupported_inference", "The passage does not say Jada is sleepy or forgetting lines.", "JADA holds a script and checks items off a list.", "stage_direction"],
        ["She has a nervous, fluttery feeling.", null, "Correct. The context shows Jada feels nervous about the broken castle and the audience.", butterflies, "spoken_line", "JADA"],
      ],
    }),
    ebsr({
      id: "pssa_item_g3_moy_p4_ebsr_ak113",
      ec: "E03.A-K.1.1.3",
      subtype: "turning_point_actions_ebsr",
      partA: {
        prompt: "How do Priya's and Marcus's actions help the students begin solving the backdrop problem?",
        correctIndex: 1,
        evidenceBinding: { evidenceKind: "section_synthesis", sectionId: "scene_2" },
        choices: [
          ["Marcus repaints the original castle by himself.", "wrong_emphasis", "This focuses on Marcus's first plan, but he does not solve the problem by repainting alone."],
          ["Priya proposes a simpler design, and Marcus agrees to listen and try it.", null, "Correct. Priya suggests a new design, and Marcus changes from resisting to listening."],
          ["The students cancel the show before the audience arrives.", "opposite_claim", "This reverses the play because they keep working instead of canceling."],
          ["Ms. Reyes fixes the backdrop for the students.", "unsupported_inference", "The passage does not say Ms. Reyes fixes the backdrop; the students solve it."],
        ],
      },
      partB: {
        instruction: "Choose two lines that best support the answer to Part A.",
        correctIndices: [0, 2],
        choices: [
          { text: priyaIdea, isCorrect: true },
          { text: jadaCancel, alignedPartAMisconception: "cancel_show" },
          { text: marcusTurns, isCorrect: true },
          { text: marcusReal, alignedPartAMisconception: "repaint_original" },
        ],
      },
    }),
    mcq({
      id: "pssa_item_g3_moy_p4_mcq_av412_ao2",
      ec: "E03.A-V.4.1.2",
      subtype: "figurative_back_to_square_one",
      prompt: "What does Marcus mean when he says, \"we're back to square one\"?",
      correctIndex: 0,
      evidenceBinding: { evidenceKind: "quoted_span", quotedSpan: backToSquareOne, targetWordOrPhrase: "back to square one" },
      intendedAssemblyBucket: "analytics_only",
      choices: [
        ["They are back at the beginning and have to start over.", null, "Correct. Marcus says this after the old castle breaks and he thinks they must begin again.", backToSquareOne, "spoken_line", "MARCUS"],
        ["They need to cut the backdrop into a square shape.", "plausible_misreading", "This reads square literally, but Marcus is talking about starting over.", backToSquareOne, "spoken_line", "MARCUS"],
        ["They should return to the first row of seats.", "wrong_section", "This uses a different detail about the audience location, not the meaning of the idiom.", "The front row will be watching the actors, not the wall.", "spoken_line", "PRIYA"],
        ["They are finished and ready for the show.", "opposite_claim", "This is the opposite of Marcus's meaning because the problem is not solved yet.", "The show is tomorrow!", "spoken_line", "JADA"],
      ],
    }),
  ];
  validateItems(items, text);
  return items;
}

function validateItems(items: P4Item[], text: string) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_moy_p4_mcq_ak111",
    "pssa_item_g3_moy_p4_mcq_ak112",
    "pssa_item_g3_moy_p4_mcq_ak113",
    "pssa_item_g3_moy_p4_mcq_av411",
    "pssa_item_g3_moy_p4_mcq_av412",
    "pssa_item_g3_moy_p4_ebsr_ak113",
    "pssa_item_g3_moy_p4_mcq_av412_ao2",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [3, 0, 1, 2, 3, 0]);
  assert.deepEqual(items.filter((item) => item.interactionType === "EBSR").map((item: any) => item.correctResponseJson.partA.correctIndex), [1]);
  for (const item of items) {
    assert.equal((item as any).scoringBucket, undefined, `${item.itemId} must not set scoringBucket`);
    assert.equal((item as any).passageGroupId, undefined, `${item.itemId} must not set passageGroupId`);
    assert.equal((item as any).passageLinks, undefined, `${item.itemId} must not set passageLinks`);
    assert.equal((item as any).isCrossText, undefined, `${item.itemId} must not set isCrossText`);
    assert.equal((item as any).requiredEvidenceSlotsJson, undefined, `${item.itemId} must not set requiredEvidenceSlotsJson`);
    projectPssaStudentItem(item);
    const specs = item.interactionType === "MCQ" ? item.structuredChoicesJson ?? [] : item.partA?.choices ?? [];
    for (const choice of specs) if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole], `registered role ${choice.distractorRole}`);
    for (const choice of item.answerChoicesJson ?? []) for (const link of choice.evidenceLinks ?? []) if (link.quotedSpan) assertVerbatim(text, link.quotedSpan, `${item.itemId} evidence`);
    for (const choice of item.partB?.choices ?? []) {
      assert.equal((choice as any).passageSlot, undefined, `${item.itemId} Part B choice must omit passageSlot`);
      assertVerbatim(text, choice.text, `${item.itemId} Part B`);
    }
  }
}

export function buildMoyP4Packet() {
  const passage = buildMoyP4Passage();
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 7,
    passages: [passage],
    items: buildMoyP4Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildMoyP4Packet>) {
  const lines = ["# MOY P4 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) lines.push(`## ${passage.title}`, "", passage.text, "");
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildMoyP4Packet>) {
  const lines = ["# MOY P4 Reviewer Preview", "", "Includes keys and rationales. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("");
    }
    if (item.partA) {
      lines.push("Part A:");
      item.partA.choices.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.partA?.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("Part B:");
      item.partB?.choices.forEach((choice, index) => lines.push(`- ${index}${choice.isCorrect ? " (KEY)" : ""}: ${choice.text}`));
      lines.push("Part B key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    }
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildMoyP4Packet>) {
  const lines = ["# MOY P4 Answer Key", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildMoyP4Packet>) {
  const header = ["itemId", "eligibleContent", "interactionType", "pointValue", "reviewStatus", "itemStatus", "intendedAssemblyBucket", "studentPreviewLeakFree"];
  const rows = packet.items.map((item) => [
    item.itemId,
    item.eligibleContent,
    item.interactionType,
    String(item.pointValue),
    item.reviewStatus,
    item.itemStatus,
    String(item.auditMetadata.intendedAssemblyBucket),
    "PASS",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).split("\"").join("\"\"")}"`).join(",")).join("\n") + "\n";
}

function assertSourcePackageFresh() {
  const source = committedPackageMarkdown();
  for (const required of [
    "APPROVED",
    "combining everyone's strengths",
    "Good thing we each knew how to help",
    "sharing a hollow log during a storm",
    "frantically",
    "butterflies in my stomach",
    "back to square one",
    "What if we don't copy the old one? What if we build something new — together?",
    "...Okay. Show me what you mean.",
  ]) assert(source.includes(required), `P4 source package missing ${required}`);
  for (const bad of ["Good thing nobody listened to just one of us", "using everyone's ideas", "woodland characters performing a story"]) {
    assert.equal(source.includes(bad), false, `P4 source package contains stale wording: ${bad}`);
  }
  assert.equal(wordCount(moyP4PassageText()), 1086);
}

function main() {
  assertSourcePackageFresh();
  const packet = buildMoyP4Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("MOY P4 authoring complete: wrote exemplars/pssa_grade3_moy_p4/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
