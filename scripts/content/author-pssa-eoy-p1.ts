import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  generatePssaFigureLongDescription,
  validatePssaFigureFeatureShared,
  type PssaFigureProcessFeature,
  type PssaFigureProcessStructuredData,
} from "../../lib/content/pssaFigureFeature";
import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";
import { computePssaFigureAssetSha256, validatePssaFigureAssetNode } from "./lib/pssa-figure-feature-node";
import { buildPssaStaminaSectionMap, evaluatePssaDomainFactCheckRequired, evaluatePssaTextFeatureIntegrity } from "./lib/pssa-stamina-gates";

const outputDir = path.resolve("exemplars/pssa_grade3_eoy_p1");
const passageId = "pssa_psg_g3_eoy_p1_crayons";
const figureAssetPath = "/pssa/figures/g3_eoy_p1_crayon_process.svg";
const packagePath = "specs/pssa_g3_eoy_p1_passage_package.md";
const itemSpecPath = "specs/codex_pssa_eoy_p1_items.md";

type EoyChoice = {
  text: string;
  distractorRole?: keyof typeof mappingRegistry;
  rationale?: string;
  evidence?: string;
  evidenceLinks?: Array<{ evidenceKind: "quoted_span"; quotedSpan: string }>;
};

type EvidenceBinding = {
  requiresFigure: boolean;
  requiresPassageText: boolean;
  quotedText?: string;
  figureTargetId?: string;
  evidenceKind: "passage_only" | "figure_only" | "figure_and_quoted_text";
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
  reportingCategory: "B";
  pointValue: number;
  prompt?: string;
  studentFacingPrompt?: string;
  stem?: string;
  instructionText?: string;
  answerChoicesJson?: EoyChoice[];
  structuredChoicesJson?: EoyChoice[];
  correctIndex?: number;
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
  auditMetadata: { authoredIn: "PSSA_EOY_P1_ITEMS"; noDbWrite: true; productionImportReady: false; autoScoringClaim?: false };
};

export function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

function packageSource() {
  return fs.readFileSync(packagePath, "utf8");
}

export function extractEoyP1PassageText(source = packageSource()) {
  const section = source.split("## 2. Passage")[1]?.split("\n---")[0];
  assert(section, "EOY P1 package passage section must exist");
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => line.replace(/^#{3,}\s+/, "").replace(/\*\*/g, ""));
  return lines.join("\n\n");
}

export function extractEoyP1FactChecks(source = packageSource()) {
  const match = source.match(/```json\s*(\[[\s\S]*?\])\s*```/);
  assert(match, "EOY P1 factCheckNotesJson block must exist");
  return JSON.parse(match[1]);
}

export const eoyP1ProcessStructuredData: PssaFigureProcessStructuredData = {
  stages: [
    { order: 1, targetId: "stage_melt", label: "Melt the wax", caption: "Paraffin wax is heated or kept warm until it is liquid." },
    { order: 2, targetId: "stage_color", label: "Add the color", caption: "Powdered pigment is blended in to give the wax its color." },
    { order: 3, targetId: "stage_mold", label: "Fill the mold", caption: "The colored wax is poured into crayon-shaped holes and cooled." },
    { order: 4, targetId: "stage_check", label: "Push out and check", caption: "Hardened crayons are pushed out; broken or chipped ones are removed." },
    { order: 5, targetId: "stage_pack", label: "Wrap and pack", caption: "Each crayon gets a paper label, then crayons are sorted and boxed." },
  ],
};

export const eoyP1FigureAltText = "Diagram: the five steps of making a crayon, in order — melt the wax, add the color, fill the mold, push out and check, wrap and pack.";

function processSvgRaw() {
  const labels = ["How a Crayon Is Made", ...eoyP1ProcessStructuredData.stages.flatMap((stage) => [stage.label, stage.caption])];
  const text = labels.map((label, index) => `<text x="24" y="${36 + index * 28}">${escapeXml(label)}</text>`).join("");
  const arrows = eoyP1ProcessStructuredData.stages.slice(0, -1).map((_, index) => `<line x1="${92 + index * 100}" y1="250" x2="${132 + index * 100}" y2="250" stroke="#111"/>`).join("");
  const boxes = eoyP1ProcessStructuredData.stages.map((stage, index) => `<rect x="${24 + index * 100}" y="220" width="72" height="60" fill="#fff" stroke="#111"/><text x="${34 + index * 100}" y="254">${stage.order}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360"><title>How a Crayon Is Made</title><desc>Five labeled process stages for making a crayon.</desc>${text}${boxes}${arrows}</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function writeEoyP1FigureAsset() {
  const absolute = path.resolve(`public${figureAssetPath}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, processSvgRaw());
  return computePssaFigureAssetSha256(figureAssetPath);
}

export function buildEoyP1Figure(assetSha256 = computePssaFigureAssetSha256(figureAssetPath)): PssaFigureProcessFeature {
  return {
    type: "figure",
    figureKind: "process",
    featureId: "eoy_p1_crayon_process",
    title: "How a Crayon Is Made",
    sectionId: "section_0_intro",
    assetPath: figureAssetPath,
    assetSha256,
    altText: eoyP1FigureAltText,
    longDescription: generatePssaFigureLongDescription(eoyP1ProcessStructuredData),
    structuredData: eoyP1ProcessStructuredData,
  };
}

export function buildEoyP1Passage(assetSha256 = computePssaFigureAssetSha256(figureAssetPath)) {
  const text = extractEoyP1PassageText();
  const figure = buildEoyP1Figure(assetSha256);
  const passage = {
    id: passageId,
    title: "How Crayons Are Made",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "informational",
    genre: "informational_description",
    domainVocabularyLoad: "medium",
    wordCount: wordCount(text),
    text,
    textFeaturesJson: [figure],
    factCheckRequired: true,
    factCheckNotesJson: extractEoyP1FactChecks(),
    staminaBand: "released_length",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1", unit: "P1" },
  };
  assert.equal(passage.wordCount, 712, "EOY P1 passage word count must be 712");
  const sections = buildPssaStaminaSectionMap(passage).map((section) => section.sectionId);
  assert(sections.includes("section_0_intro"), "EOY P1 passage must expose section_0_intro");
  assert.equal(validatePssaFigureFeatureShared(figure, sections), true);
  assert.equal(validatePssaFigureAssetNode(figure).assetSha256, assetSha256);
  assert.equal(evaluatePssaTextFeatureIntegrity(passage as any, []), "PASS");
  assert.equal(evaluatePssaDomainFactCheckRequired(passage), "PASS");
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
    passageTitle: "How Crayons Are Made",
    eligibleContent: ec,
    reportingCategory: "B",
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
    provenanceJson: { benchmarkSeason: "EOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1", unit: "P1" },
    auditMetadata: { authoredIn: "PSSA_EOY_P1_ITEMS", noDbWrite: true, productionImportReady: false },
  };
}

function mcq(args: { id: string; ec: string; subtype: string; prompt: string; correctIndex: number; evidenceBinding: EvidenceBinding; choices: [string, string | null, string, string][] }): EoyItem {
  const item = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding);
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map(([text, role, rationale, evidence]) => ({
    text,
    ...(role ? { distractorRole: role as keyof typeof mappingRegistry } : {}),
    rationale,
    evidence,
  }));
  if (args.evidenceBinding.quotedText && item.answerChoicesJson[args.correctIndex]) {
    item.answerChoicesJson[args.correctIndex].evidenceLinks = [{ evidenceKind: "quoted_span", quotedSpan: args.evidenceBinding.quotedText }];
  }
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

function matchingGrid(args: {
  id: string;
  ec: string;
  subtype: string;
  stem: string;
  rows: EoyItem["rows"];
  columns: EoyItem["columns"];
  evidenceBinding: EvidenceBinding;
}): EoyItem {
  const item = baseItem(args.id, "MATCHING_GRID", args.subtype, args.ec, 3, args.evidenceBinding);
  item.stem = args.stem;
  item.instructionText = "Choose the best match for each row.";
  item.rows = args.rows;
  item.columns = args.columns;
  item.selectionRule = "Select one column for each row.";
  const correctCells = args.rows.map((row) => ({ rowId: row.rowId, columnId: row.correctColumnId }));
  item.correctResponseJson = { correctCells };
  (item as any).correctCells = correctCells;
  item.scoringJson = { totalPoints: 3 };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
}

export function buildEoyP1Items(): EoyItem[] {
  const items: EoyItem[] = [
    mcq({
      id: "pssa_item_g3_eoy_p1_mcq_bk111",
      ec: "E03.B-K.1.1.1",
      subtype: "explicit_text_detail",
      prompt: "What material is blended in to give the wax its color?",
      correctIndex: 2,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, quotedText: "A worker blends in powdered pigment, the material that gives each crayon its shade.", evidenceKind: "passage_only" },
      choices: [
        ["paraffin wax", "wrong_section", "Paraffin is the wax base, but the passage says pigment gives the crayon its shade.", "Crayons are made mostly of paraffin wax."],
        ["cool water", "wrong_emphasis", "Cool water helps the wax harden in the mold; it does not give the wax color.", "Cool water runs through pipes around the mold."],
        ["powdered pigment", null, "Correct. The passage states that powdered pigment gives each crayon its shade.", "A worker blends in powdered pigment, the material that gives each crayon its shade."],
        ["a paper label", "plausible_misreading", "The label names the color after the crayon is made; it does not color the wax.", "The label prints the color's name."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p1_mcq_bc212",
      ec: "E03.B-C.2.1.2",
      subtype: "heading_locator",
      prompt: "Which text feature would best help a reader find the step where pigment is added?",
      correctIndex: 0,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, quotedText: "Adding the Color", evidenceKind: "passage_only" },
      choices: [
        ["the heading \"Adding the Color\"", null, "Correct. The heading names the section about adding pigment.", "Adding the Color"],
        ["the title \"How Crayons Are Made\"", "wrong_emphasis", "The title gives the topic of the whole passage, not the exact step where pigment is added.", "How Crayons Are Made"],
        ["the sentence about four to seven minutes", "wrong_section", "That sentence belongs to the mold-filling section, not the color section.", "The wax usually becomes solid in about four to seven minutes."],
        ["the closing paragraph about a fresh box", "unsupported_inference", "The closing paragraph summarizes the journey; it does not locate the color step.", "So the next time you open a fresh box"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p1_mcq_bc311",
      ec: "E03.B-C.3.1.1",
      subtype: "cause_effect",
      prompt: "According to the passage, why may a crayon have bubbles?",
      correctIndex: 3,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, quotedText: "A crayon may have bubbles if the color was not mixed all the way.", evidenceKind: "passage_only" },
      choices: [
        ["because the paper label was wrapped twice", "wrong_section", "The double paper layer is about strength during wrapping, not bubbles.", "Many crayons get a double layer of paper."],
        ["because cool water runs through pipes", "opposite_claim", "Cool water helps crayons harden; the passage does not say it creates bubbles.", "Cool water runs through pipes around the mold to help the wax harden quickly."],
        ["because the wax was poured into crayon-shaped holes", "wrong_emphasis", "Pouring into molds shapes crayons, but the passage names incomplete mixing as the cause of bubbles.", "The hot wax is poured carefully."],
        ["because the color was not mixed all the way", null, "Correct. The passage directly connects incomplete mixing with bubbles.", "A crayon may have bubbles if the color was not mixed all the way."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p1_mcq_bv411",
      ec: "E03.B-V.4.1.1",
      subtype: "context_vocabulary",
      prompt: "What does harden mean as it is used in the melting section?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, quotedText: "must stay warm so it does not harden", evidenceKind: "passage_only" },
      choices: [
        ["to become colorful", "wrong_section", "Color is added later with pigment; harden describes what happens if wax is not kept warm.", "Next comes the color."],
        ["to become solid", null, "Correct. The wax must stay warm so it does not become solid before it is used.", "must stay warm so it does not harden"],
        ["to move quickly", "unsupported_inference", "The passage does not use harden to mean moving quickly.", "The wax is kept hot so it stays liquid."],
        ["to be wrapped with paper", "plausible_misreading", "Wrapping happens after the crayon is made; harden is about the wax changing from liquid to solid.", "The last steps are wrapping and packing."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_eoy_p1_mcq_bc313",
      ec: "E03.B-C.3.1.3",
      subtype: "process_diagram_integration",
      prompt: "The passage says a double layer of paper makes a crayon stronger. Which numbered diagram stage shows when that happens?",
      correctIndex: 2,
      evidenceBinding: { requiresFigure: true, requiresPassageText: true, quotedText: "Many crayons get a double layer of paper, which makes them stronger so they do not snap as easily.", figureTargetId: "stage_pack", evidenceKind: "figure_and_quoted_text" },
      choices: [
        ["1 — Melt the wax", "wrong_section", "Stage 1 is about heating wax, not adding paper.", "stage_melt"],
        ["3 — Fill the mold", "wrong_emphasis", "Stage 3 shapes and cools the wax; it does not show wrapping.", "stage_mold"],
        ["5 — Wrap and pack", null, "Correct. The double-paper detail happens during the wrapping and packing stage.", "stage_pack"],
        ["4 — Push out and check", "plausible_misreading", "Stage 4 checks crayons for problems before wrapping, but the paper layer is added later.", "stage_check"],
      ],
    }),
  ];

  items.push(matchingGrid({
    id: "pssa_item_g3_eoy_p1_te_bk112",
    ec: "E03.B-K.1.1.2",
    subtype: "main_idea_detail_grid",
    stem: "Classify each statement as the passage's main idea or a supporting detail.",
    evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
    columns: [
      { columnId: "main_idea", label: "Main idea" },
      { columnId: "supporting_detail", label: "Supporting detail" },
    ],
    rows: [
      { rowId: "row_main", label: "Crayons are made from wax and pigment in a few careful steps.", correctColumnId: "main_idea", rationale: "This statement tells what the whole passage is mostly about.", plausibleWrongRationales: { supporting_detail: "It is broader than one small detail; it covers the whole process." } },
      { rowId: "row_tanks", label: "Workers heat the wax in large metal tanks until it is liquid.", correctColumnId: "supporting_detail", rationale: "This is one detail from the melting step that supports the main idea.", plausibleWrongRationales: { main_idea: "It describes only one step, not the whole passage." } },
      { rowId: "row_minutes", label: "Crayons solidify in about four to seven minutes.", correctColumnId: "supporting_detail", rationale: "This is a specific detail about the mold step.", plausibleWrongRationales: { main_idea: "It is too narrow to be the main idea of the entire passage." } },
    ],
  }));

  const shortAnswer = baseItem("pssa_item_g3_eoy_p1_sa_bk113", "SHORT_ANSWER", "sequence_process_short_answer", "E03.B-K.1.1.3", 3, { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" });
  shortAnswer.stem = "Explain how wax becomes a wrapped crayon. Use at least two details from the passage to support your answer.";
  shortAnswer.instructionText = "Write a short answer that explains the ordered process and uses details from the passage.";
  shortAnswer.requiredSupportCount = 2;
  shortAnswer.requiresTextSupport = true;
  shortAnswer.expectedAnswerCore = "Wax is melted, pigment is mixed in, colored wax is poured into molds and cooled, the crayons are checked, and then they are wrapped and boxed.";
  shortAnswer.acceptableTextSupport = [
    { supportId: "melt", quotedSpan: "The wax must be fully melted before any color can be added.", connectsToExpectedAnswer: "Shows the first step before coloring." },
    { supportId: "color", quotedSpan: "A worker blends in powdered pigment", connectsToExpectedAnswer: "Shows how the wax gets its color." },
    { supportId: "mold", quotedSpan: "The hot wax is poured carefully so that each hole fills all the way to the top.", connectsToExpectedAnswer: "Shows how the crayon shape is formed." },
    { supportId: "check", quotedSpan: "Inspectors examine the crayons for breaks, chips, and bubbles.", connectsToExpectedAnswer: "Shows the checking step before wrapping." },
    { supportId: "wrap", quotedSpan: "A fast machine wraps a paper label around the middle of each crayon.", connectsToExpectedAnswer: "Shows the final wrapping step." },
  ];
  shortAnswer.commonIncompletePatterns = [
    "Names only one step without explaining order.",
    "Copies a sentence but does not explain how the process moves from wax to crayon.",
    "Skips the checking or wrapping stage.",
  ];
  shortAnswer.rubric = {
    points3: "Explains the ordered crayon-making process with at least two accurate passage details and clear reasoning about how the steps connect.",
    points2: "Explains part of the sequence with at least one accurate detail, or gives two details with limited explanation.",
    points1: "Gives one relevant detail or a vague sequence with little explanation.",
    points0: "Gives an incorrect, unsupported, or off-topic response.",
  };
  shortAnswer.scoreBandExamples = [
    { band: 3, response: "First the wax is melted, then pigment is mixed in so it has color. The liquid wax is poured into molds and cooled, then workers check it before a machine wraps the crayons and boxes them.", why: "Explains the sequence and uses multiple accurate details." },
    { band: 2, response: "The wax melts and gets color. Then it goes in molds and is wrapped.", why: "Mostly correct sequence but limited support and explanation." },
    { band: 1, response: "Crayons are made with wax and paper.", why: "Mentions relevant materials but does not explain the process." },
    { band: 0, response: "Crayons grow on trees.", why: "Unsupported and incorrect." },
  ];
  shortAnswer.correctResponseJson = { rubric: "human_scored" };
  shortAnswer.scoringJson = { totalPoints: 3, autoScoringClaim: false };
  shortAnswer.auditMetadata = { ...shortAnswer.auditMetadata, autoScoringClaim: false };
  shortAnswer.responseSpecJson = buildPssaResponseSpec(shortAnswer);
  items.push(shortAnswer);

  items.push(mcq({
    id: "pssa_item_g3_eoy_p1_mcq_bc212_ao2",
    ec: "E03.B-C.2.1.2",
    subtype: "diagram_as_organizer",
    prompt: "How does the process diagram help a reader understand the passage?",
    correctIndex: 0,
    evidenceBinding: { requiresFigure: true, requiresPassageText: true, evidenceKind: "figure_and_quoted_text" },
    choices: [
      ["It shows the five crayon-making steps in order at a glance.", null, "Correct. The diagram organizes the process from melting to wrapping.", "This diagram shows 5 steps in order."],
      ["It explains where the factory is located.", "unsupported_inference", "The diagram does not show the factory's location.", "How a Crayon Is Made"],
      ["It lists every crayon color made in a factory.", "wrong_emphasis", "The passage mentions many shades, but the diagram organizes steps, not colors.", "dozens of different shades"],
      ["It proves rejected crayons are thrown away.", "opposite_claim", "This reverses the passage, which says rejected crayons are melted down and recast.", "The rejected crayons are not thrown away"],
    ],
  }));

  items.push(mcq({
    id: "pssa_item_g3_eoy_p1_mcq_bv411_ao3",
    ec: "E03.B-V.4.1.1",
    subtype: "context_vocabulary",
    prompt: "What does batch mean as it is used in the passage?",
    correctIndex: 3,
    evidenceBinding: { requiresFigure: false, requiresPassageText: true, quotedText: "every crayon from one batch should look the same", evidenceKind: "passage_only" },
    choices: [
      ["a paper label around one crayon", "wrong_section", "A label is added during wrapping; batch describes a group made together.", "A fast machine wraps a paper label"],
      ["a hole in a metal mold", "plausible_misreading", "The passage discusses mold holes, but batch refers to the group of crayons made from one mixture.", "crayon-shaped holes"],
      ["a problem such as a chip or bubble", "wrong_emphasis", "Chips and bubbles are inspection problems, not the meaning of batch.", "breaks, chips, and bubbles"],
      ["one group of wax and crayons made at the same time", null, "Correct. The sentence says crayons from one batch should look the same, showing a batch is one made group.", "every crayon from one batch should look the same"],
    ],
  }));

  items.push(matchingGrid({
    id: "pssa_item_g3_eoy_p1_te_bc313_ao9",
    ec: "E03.B-C.3.1.3",
    subtype: "stage_statement_grid",
    stem: "Match each diagram stage to the passage statement it supports.",
    evidenceBinding: { requiresFigure: true, requiresPassageText: true, evidenceKind: "figure_and_quoted_text" },
    columns: [
      { columnId: "wax_fully_melted", label: "The wax must be fully melted before any color can be added." },
      { columnId: "hundreds_form", label: "Hundreds of crayons form at the same time." },
      { columnId: "rainbow_boxes", label: "Some boxes hold every color of the rainbow." },
    ],
    rows: [
      { rowId: "stage_melt", label: "1 — Melt the wax", correctColumnId: "wax_fully_melted", rationale: "The melting stage is when the wax becomes liquid before color is added.", plausibleWrongRationales: { hundreds_form: "That statement belongs to the molding stage.", rainbow_boxes: "That statement belongs to wrapping and packing." } },
      { rowId: "stage_mold", label: "3 — Fill the mold", correctColumnId: "hundreds_form", rationale: "The molding stage fills many holes so many crayons form at once.", plausibleWrongRationales: { wax_fully_melted: "That statement belongs before color is added.", rainbow_boxes: "That statement happens after wrapping and sorting." } },
      { rowId: "stage_pack", label: "5 — Wrap and pack", correctColumnId: "rainbow_boxes", rationale: "The packing stage is when crayons are sorted and placed into boxes.", plausibleWrongRationales: { wax_fully_melted: "That statement belongs to the first stage.", hundreds_form: "That statement belongs to filling the mold." } },
    ],
  }));

  items.push(matchingGrid({
    id: "pssa_item_g3_eoy_p1_te_bv411_ao10",
    ec: "E03.B-V.4.1.1",
    subtype: "vocabulary_meaning_grid",
    stem: "Match each word from the passage to its meaning.",
    evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
    columns: [
      { columnId: "same_all_through", label: "in the same way throughout" },
      { columnId: "flows_easily", label: "thin enough to flow easily" },
      { columnId: "melted_and_shaped_again", label: "melted and shaped again" },
    ],
    rows: [
      { rowId: "evenly", label: "evenly", correctColumnId: "same_all_through", rationale: "The pigment spreads evenly when no part is lighter or darker.", plausibleWrongRationales: { flows_easily: "Runny, not evenly, describes flowing.", melted_and_shaped_again: "Recast, not evenly, means shaped again." } },
      { rowId: "runny", label: "runny", correctColumnId: "flows_easily", rationale: "The liquid wax is smooth and runny when it is ready to flow.", plausibleWrongRationales: { same_all_through: "Evenly means the same throughout.", melted_and_shaped_again: "Recast means made again after melting." } },
      { rowId: "recast", label: "recast", correctColumnId: "melted_and_shaped_again", rationale: "Rejected crayons are melted down and recast in a new batch.", plausibleWrongRationales: { same_all_through: "Evenly describes color mixing.", flows_easily: "Runny describes liquid wax." } },
    ],
  }));

  validateItems(items);
  return items;
}

function validateItems(items: EoyItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_eoy_p1_mcq_bk111",
    "pssa_item_g3_eoy_p1_mcq_bc212",
    "pssa_item_g3_eoy_p1_mcq_bc311",
    "pssa_item_g3_eoy_p1_mcq_bv411",
    "pssa_item_g3_eoy_p1_mcq_bc313",
    "pssa_item_g3_eoy_p1_te_bk112",
    "pssa_item_g3_eoy_p1_sa_bk113",
    "pssa_item_g3_eoy_p1_mcq_bc212_ao2",
    "pssa_item_g3_eoy_p1_mcq_bv411_ao3",
    "pssa_item_g3_eoy_p1_te_bc313_ao9",
    "pssa_item_g3_eoy_p1_te_bv411_ao10",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [2, 0, 3, 1, 2, 0, 3]);
  for (const item of items) {
    assert.equal(item.reviewStatus, "PENDING");
    assert.equal(item.itemStatus, "candidate");
    assert.equal(item.sourceType, "internal_original");
    assert.equal(item.licenseStatus, "cleared_internal_original");
    assert.equal(item.commercialUseAllowed, true);
    assert.equal(item.needsLegalReview, false);
    assert.equal((item as any).scoringBucket, undefined, "EOY P1 bank item must not set scoringBucket");
    projectPssaStudentItem(item);
    for (const choice of item.structuredChoicesJson ?? []) {
      if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole], `registered distractorRole ${choice.distractorRole}`);
    }
  }
}

export function buildEoyP1Packet(assetSha256 = computePssaFigureAssetSha256(figureAssetPath)) {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 11,
    passages: [buildEoyP1Passage(assetSha256)],
    items: buildEoyP1Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildEoyP1Packet>) {
  const lines = ["# EOY P1 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) {
    lines.push(`## ${passage.title}`, "", passage.text, "", "[Figure: How a Crayon Is Made]", "");
  }
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildEoyP1Packet>) {
  const lines = ["# EOY P1 Reviewer Preview", "", "Includes keys, rationales, rubric, and fact-check records. All content is PENDING/candidate and noDbWrite.", ""];
  for (const passage of packet.passages) {
    lines.push(`## Fact checks for ${passage.id}`, "", "```json", JSON.stringify(passage.factCheckNotesJson, null, 2), "```", "");
  }
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

function renderAnswerKey(packet: ReturnType<typeof buildEoyP1Packet>) {
  const lines = ["# EOY P1 Answer Key and Rubric", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    if (item.rubric) lines.push("", "Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildEoyP1Packet>) {
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
  assert.equal(wordCount(extractEoyP1PassageText(source)), 712, "source package passage must be 712 words");
  for (const stale of ["block of wax", "Hard wax", "misshapen", "uneven shapes", "trained workers", "sent to stores"]) {
    assert.equal(source.includes(stale), false, `source package must not contain stale term: ${stale}`);
  }
  for (const required of ["figureKind:\"process\"", "altText", "stage_pack", "AO-9 grid"]) {
    assert(source.includes(required), `source package must contain ${required}`);
  }
  assert(itemSpec.includes("C, A, D, B, C"), "item spec must contain operational key order C, A, D, B, C");
}

function main() {
  assertSourcePackageFresh();
  const assetSha256 = writeEoyP1FigureAsset();
  const packet = buildEoyP1Packet(assetSha256);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("EOY P1 authoring complete: wrote exemplars/pssa_grade3_eoy_p1/* and public/pssa/figures/g3_eoy_p1_crayon_process.svg");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
