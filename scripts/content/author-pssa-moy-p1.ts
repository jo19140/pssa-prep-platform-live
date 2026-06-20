import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  generatePssaFigureLongDescription,
  validatePssaFigureFeatureShared,
  type PssaFigureFeature,
} from "../../lib/content/pssaFigureFeature";
import { mappingRegistry } from "../../lib/content/pssaInsightMapping";
import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { projectPssaStudentItem } from "../../lib/content/pssaStudentDto";
import {
  buildPssaStaminaSectionMap,
  evaluatePssaTextFeatureIntegrity,
} from "./lib/pssa-stamina-gates";
import {
  PSSA_MOY_P1_FIGURE_ASSET_PATH,
  PSSA_MOY_P1_FIGURE_ASSET_SHA256,
  PSSA_MOY_P1_FIGURE_ID,
  PSSA_MOY_P1_FIGURE_TITLE,
  museumStructuredData,
} from "./lib/pssa-moy-p1-figure-data";

const outputDir = path.resolve("exemplars/pssa_grade3_moy_p1");
const passageId = "pssa_psg_g3_moy_p1_museum_map";

export const moyP1PassageText = `At the Bright Ideas Children's Museum, every day begins before the doors open. A team of museum workers walks through the halls to check that each exhibit is ready. An exhibit is a special area where visitors can touch, build, and learn. The workers want families to have a fun day, so they think carefully about where each exhibit should go.

Planning a museum is a little like planning a party. The workers ask many questions. Which exhibits are loud? Which ones are quiet? Where will big crowds gather? They learned that the Build Lab, where children stack blocks and ramps, can get noisy. So they placed it near the front, close to the entrance. The Quiet Corner, where families read and rest, was placed far from the noise. That way, visitors who want a calm space can find one. Every choice has a reason, and the reason is always the visitor.

Some exhibits work well as neighbors. The Story Stage, where actors tell tales, sits beside the Build Lab because both invite children to imagine. Upstairs, the Art Studio sits next to the Dinosaur Dig. A child can dig for models of bones, then walk a few steps and draw the dinosaur they found. The workers plan these paths on purpose.

Once the exhibits have homes, the workers make a floor map. A floor map is a drawing that shows where everything is. But a map is only helpful if visitors can read it. So the team adds a legend. A legend is a small box that explains what the symbols on the map mean. A symbol is a tiny picture that stands for something real. On this map, a star shows the entrance. A small book shows the Story Stage. A green line shows the accessible route, a path that anyone can use, including visitors who use wheelchairs or strollers.

The museum has two levels. An elevator and a set of stairs connect them. The workers place each exhibit name on the floor map so visitors can see what is upstairs and what is on the ground floor. They mark the elevator clearly because the green accessible route uses the elevator, not the stairs.

The map helps families plan their day before they even start walking. Imagine a family that wants to see the Dinosaur Dig first. They look at the map and the legend. They see that the Dinosaur Dig is on the second level. They find the elevator symbol and follow the green route up. Without the map, they might wander and grow tired. With the map, they save time and energy for the fun. A good plan turns a big building into an easy adventure.

Workers also add a small sign near each exhibit. The Story Stage sign lists show times, so families know when the next tale begins. These signs, like the legend, are text features. Text features are parts of a page, such as labels, symbols, and lists, that help readers find information quickly. Good text features answer questions without making a reader search the whole page.

After the map is finished, the team tests it. They ask a few families to use it and watch what happens. If visitors look confused, the workers change the map. Maybe a symbol is too small, or a label is missing. The team fixes these problems before printing hundreds of copies. When a test goes well, they keep that part of the map and move on to the next problem. They would rather fix a small problem now than confuse a thousand families later. A clear map is worth the extra work.

When the doors finally open, the museum is ready. Children rush toward the Build Lab. Quiet readers head to the Quiet Corner. Families with strollers follow the green line to the elevator. None of this would feel so easy without the careful planning that happened first. The exhibits did not land in their spots by accident. The workers arranged them, drew the map, and built the legend so that every visitor, on every level, could have a smooth day of discovery.`;

type MoyChoice = {
  text: string;
  distractorRole?: keyof typeof mappingRegistry;
  rationale?: string;
  evidence?: string;
  evidenceLinks?: Array<{ evidenceKind: "quoted_span" | "map_fact"; quotedSpan?: string; figureFeatureId?: string; targetId?: string }>;
};

type MoyItem = {
  id: string;
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "MCQ" | "MATCHING_GRID" | "SHORT_ANSWER" | "DRAG_DROP";
  interactionType: "MCQ" | "MATCHING_GRID" | "SHORT_ANSWER" | "DRAG_DROP";
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
  answerChoicesJson?: MoyChoice[];
  structuredChoicesJson?: MoyChoice[];
  correctIndex?: number;
  rows?: Array<{ rowId: string; label: string }>;
  columns?: Array<{ columnId: string; label: string }>;
  selectionRule?: string;
  tokens?: Array<{ tokenId: string; text: string; evidenceBinding: EvidenceBinding }>;
  targets?: Array<{ targetId: string; label: string; distractorRole?: keyof typeof mappingRegistry; rationale?: string }>;
  useAllTokens?: boolean;
  requiredSupportCount?: number;
  requiresTextSupport?: boolean;
  expectedAnswerCore?: string;
  acceptableTextSupport?: Array<{ supportId: string; quotedSpan: string; connectsToExpectedAnswer: string }>;
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
  auditMetadata: { authoredIn: "PSSA_MOY_P1_ITEMS"; noDbWrite: true; productionImportReady: false; autoScoringClaim?: false };
};

export type EvidenceBinding = {
  requiresFigure: boolean;
  requiresPassageText: boolean;
  quotedText?: string;
  dragTokenTexts?: string[];
  evidenceKind: "passage_only" | "figure_only" | "figure_and_quoted_text" | "figure_and_drag_tokens";
};

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length;
}

export function buildMoyP1Figure(): PssaFigureFeature {
  const structuredData = museumStructuredData();
  return {
    type: "figure",
    figureKind: "map",
    featureId: PSSA_MOY_P1_FIGURE_ID,
    title: PSSA_MOY_P1_FIGURE_TITLE,
    sectionId: "section_0_intro",
    assetPath: PSSA_MOY_P1_FIGURE_ASSET_PATH,
    assetSha256: PSSA_MOY_P1_FIGURE_ASSET_SHA256,
    altText: "Floor map of the Bright Ideas Children's Museum with an accessible route to the Dinosaur Dig.",
    longDescription: generatePssaFigureLongDescription(structuredData),
    structuredData,
  };
}

export function buildMoyP1Passage() {
  const figure = buildMoyP1Figure();
  const passage = {
    id: passageId,
    title: "A Map for a Day of Discovery",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "informational",
    genre: "informational_description",
    domainVocabularyLoad: "medium",
    wordCount: wordCount(moyP1PassageText),
    text: moyP1PassageText,
    textFeaturesJson: [figure],
    factCheckRequired: false,
    factCheckNotesJson: [
      {
        claimId: "fictional_museum",
        claim: "Bright Ideas Children's Museum and its exhibits are fictional; informational map concepts are grade-appropriate and generic.",
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
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1", unit: "P1" },
  };
  assert.equal(passage.wordCount, 687, "MOY P1 passage word count must be 687");
  assert.equal(validatePssaFigureFeatureShared(figure, buildPssaStaminaSectionMap(passage).map((section) => section.sectionId)), true);
  assert.equal(evaluatePssaTextFeatureIntegrity(passage as any, []), "PASS", "MOY P1 figure must pass text feature integrity");
  return passage;
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
  const item: MoyItem = baseItem(args.id, "MCQ", args.subtype, args.ec, 1, args.evidenceBinding);
  item.studentFacingPrompt = args.prompt;
  item.stem = args.prompt;
  item.answerChoicesJson = args.choices.map(([text, role, rationale, evidence], index) => ({
    text,
    ...(role ? { distractorRole: role as keyof typeof mappingRegistry } : {}),
    rationale,
    evidence,
    ...(index === args.correctIndex ? { evidenceLinks: evidence.includes(" ") ? [{ evidenceKind: "quoted_span" as const, quotedSpan: evidence }] : [{ evidenceKind: "map_fact" as const, figureFeatureId: PSSA_MOY_P1_FIGURE_ID, targetId: evidence }] } : {}),
  }));
  item.structuredChoicesJson = item.answerChoicesJson;
  item.correctIndex = args.correctIndex;
  item.correctResponseJson = { correctIndex: args.correctIndex };
  item.scoringJson = { totalPoints: 1 };
  item.responseSpecJson = buildPssaResponseSpec(item);
  return item;
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
    passageTitle: "A Map for a Day of Discovery",
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
    provenanceJson: { benchmarkSeason: "MOY", blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1", unit: "P1" },
    auditMetadata: { authoredIn: "PSSA_MOY_P1_ITEMS", noDbWrite: true, productionImportReady: false },
  };
}

export function buildMoyP1Items(): MoyItem[] {
  const items: MoyItem[] = [
    mcq({
      id: "pssa_item_g3_moy_p1_mcq_bk111",
      ec: "E03.B-K.1.1.1",
      subtype: "text_detail_support",
      prompt: "Why did the workers place the Art Studio beside the Dinosaur Dig?",
      correctIndex: 0,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
      choices: [
        ["So children could dig for model bones and then draw the dinosaur they found.", null, "Correct. Paragraph 3 explains this exact connection between the two exhibits.", "A child can dig for models of bones, then walk a few steps and draw the dinosaur they found."],
        ["So visitors would hear the Story Stage actors while they painted.", "wrong_section", "This uses the Story Stage, which is a different exhibit relationship.", "The Story Stage sits beside the Build Lab."],
        ["So families could find the green accessible route more quickly.", "wrong_emphasis", "The accessible route is important to the map, but it is not the reason these two exhibits are neighbors.", "They mark the elevator clearly because the green accessible route uses the elevator."],
        ["So quiet readers could rest away from loud exhibits.", "wrong_section", "This describes why the Quiet Corner is away from noise, not why Art Studio is beside Dinosaur Dig.", "The Quiet Corner was placed far from the noise."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p1_mcq_bc211",
      ec: "E03.B-C.2.1.1",
      subtype: "author_point_of_view",
      prompt: "Which statement best describes the author's point of view about a clear museum map?",
      correctIndex: 1,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
      choices: [
        ["A museum map is useful only after visitors already know the building well.", "opposite_claim", "The passage says the map helps families before they start walking.", "The map helps families plan their day before they even start walking."],
        ["A clear, carefully tested map is worth the work because it helps visitors move easily.", null, "Correct. Paragraph 8 says a clear map is worth the extra work, and the ending shows how it makes the day smoother.", "A clear map is worth the extra work."],
        ["Museum workers should spend less time on maps and more time building exhibits.", "unsupported_inference", "The passage never says maps are less important than exhibits.", "The workers arranged them, drew the map, and built the legend."],
        ["A map mostly matters because it makes the museum look more colorful.", "plausible_misreading", "The map may include symbols and colors, but the author's point is about helping visitors use the museum.", "Good text features answer questions without making a reader search the whole page."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p1_mcq_bc313",
      ec: "E03.B-C.3.1.3",
      subtype: "map_words_integration",
      prompt: "Read this sentence from paragraph 2: 'The Quiet Corner, where families read and rest, was placed far from the noise.' Which detail from the map best supports this decision?",
      correctIndex: 2,
      evidenceBinding: {
        requiresFigure: true,
        requiresPassageText: true,
        quotedText: "The Quiet Corner, where families read and rest, was placed far from the noise.",
        evidenceKind: "figure_and_quoted_text",
      },
      choices: [
        ["The Story Stage is beside the Build Lab.", "wrong_section", "This is a real map relationship, but it supports a different planning choice.", "story_stage_build_lab"],
        ["The Family Rest Area is on Level 1.", "wrong_emphasis", "This map fact does not show that the Quiet Corner is away from noise.", "family_rest_area"],
        ["The Quiet Corner is separated from the Build Lab.", null, "Correct. The quoted sentence gives the reason, and the map relationship shows the separation.", "quiet_corner_build_lab"],
        ["The accessible route goes through the elevator.", "wrong_section", "This supports the route and accessibility detail, not the Quiet Corner decision.", "accessible_route_dinosaur_dig"],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p1_mcq_bv411",
      ec: "E03.B-V.4.1.1",
      subtype: "context_vocabulary",
      prompt: "What does the word wander mean as it is used in paragraph 6?",
      correctIndex: 3,
      evidenceBinding: { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" },
      choices: [
        ["to print many copies", "wrong_section", "Printing copies happens later and is not the meaning of wander.", "printing hundreds of copies"],
        ["to test a symbol carefully", "wrong_emphasis", "Testing is part of revising the map, not the meaning of wander.", "After the map is finished, the team tests it."],
        ["to draw an exhibit on a floor map", "plausible_misreading", "The passage discusses drawing maps, but wander describes what families might do without a map.", "Without the map, they might wander and grow tired."],
        ["to move around without a clear plan", null, "Correct. The contrast with following the green route shows that wander means moving without a clear plan.", "Without the map, they might wander and grow tired."],
      ],
    }),
    mcq({
      id: "pssa_item_g3_moy_p1_mcq_bc212",
      ec: "E03.B-C.2.1.2",
      subtype: "text_feature_locate",
      prompt: "How does the map label help a reader find the Family Rest Area?",
      correctIndex: 0,
      evidenceBinding: { requiresFigure: true, requiresPassageText: false, evidenceKind: "figure_only" },
      choices: [
        ["It shows the Family Rest Area is on Level 1.", null, "Correct. The map label places the Family Rest Area on Level 1.", "family_rest_area"],
        ["Level 2", "opposite_claim", "This reverses the map's level label.", "family_rest_area"],
        ["Beside the Dinosaur Dig", "wrong_section", "This uses a different Level 2 map area.", "dinosaur_dig"],
        ["On the accessible route endpoint", "plausible_misreading", "The accessible route ends at Dinosaur Dig, not the Family Rest Area.", "accessible_route_dinosaur_dig"],
      ],
    }),
  ];

  const matchingGrid = baseItem("pssa_item_g3_moy_p1_te_bk112", "MATCHING_GRID", "main_idea_detail_grid", "E03.B-K.1.1.2", 3, { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" });
  matchingGrid.stem = "Match each detail to what it shows about the workers' planning.";
  matchingGrid.instructionText = "Choose the best planning idea for each detail.";
  matchingGrid.rows = [
    { rowId: "row_build_lab", label: "The Build Lab was placed near the front, close to the entrance." },
    { rowId: "row_art_dig", label: "The Art Studio sits next to the Dinosaur Dig." },
    { rowId: "row_fix_map", label: "If visitors look confused, the workers change the map." },
  ];
  matchingGrid.columns = [
    { columnId: "noise_and_crowds", label: "They plan for noise and crowds." },
    { columnId: "connected_activities", label: "They place connected activities near each other." },
    { columnId: "test_and_revise", label: "They test and revise before printing." },
  ];
  matchingGrid.selectionRule = "Select one planning idea for each detail.";
  matchingGrid.correctResponseJson = { correctCells: [
    { rowId: "row_build_lab", columnId: "noise_and_crowds" },
    { rowId: "row_art_dig", columnId: "connected_activities" },
    { rowId: "row_fix_map", columnId: "test_and_revise" },
  ] };
  matchingGrid.scoringJson = { totalPoints: 3 };
  matchingGrid.responseSpecJson = buildPssaResponseSpec(matchingGrid);
  items.push(matchingGrid);

  const shortAnswer = baseItem("pssa_item_g3_moy_p1_sa_bk113", "SHORT_ANSWER", "sequence_cause_effect_short_answer", "E03.B-K.1.1.3", 3, { requiresFigure: false, requiresPassageText: true, evidenceKind: "passage_only" });
  shortAnswer.stem = "Explain how the museum workers make the map useful for visitors. Use two details from the passage to support your answer.";
  shortAnswer.instructionText = "Write a short answer that explains the workers' process and supports it with two details from the passage.";
  shortAnswer.requiredSupportCount = 2;
  shortAnswer.requiresTextSupport = true;
  shortAnswer.expectedAnswerCore = "The workers arrange exhibits, make a map with helpful features, test it with families, and revise it so visitors can move through the museum easily.";
  shortAnswer.acceptableTextSupport = [
    { supportId: "arrange_exhibits", quotedSpan: "The exhibits did not land in their spots by accident.", connectsToExpectedAnswer: "This supports that workers intentionally arrange the museum before visitors arrive." },
    { supportId: "make_map_legend", quotedSpan: "So the team adds a legend.", connectsToExpectedAnswer: "This supports that workers add map features to help visitors understand the map." },
    { supportId: "test_map", quotedSpan: "They ask a few families to use it and watch what happens.", connectsToExpectedAnswer: "This supports that workers test the map before printing copies." },
    { supportId: "revise_map", quotedSpan: "If visitors look confused, the workers change the map.", connectsToExpectedAnswer: "This supports that workers revise the map to make it clearer." },
  ];
  shortAnswer.rubric = {
    points3: "Explains the sequence or cause-effect process and uses at least two accurate passage details, such as arranging exhibits, adding a legend, testing the map, and revising confusing parts.",
    points2: "Explains the process with one strong passage detail or two details with a partial connection.",
    points1: "Gives one relevant copied or loosely connected detail but does not explain the process clearly.",
    points0: "Gives an incorrect, unsupported, or off-topic response.",
  };
  shortAnswer.scoreBandExamples = [
    { band: 3, response: "The workers first arrange exhibits for visitors, then make and test the map. They add a legend so people understand symbols, and they ask families to use the map so they can fix confusing parts.", why: "Explains the process and uses two relevant details." },
    { band: 2, response: "The workers make the map better by adding a legend and watching families use it. This helps visitors, but the answer does not fully explain the whole sequence.", why: "Uses relevant details with partial sequence explanation." },
    { band: 1, response: "So the team adds a legend. If visitors look confused, the workers change the map.", why: "Mostly copied details with little explanation." },
    { band: 0, response: "The museum workers like dinosaurs best.", why: "Unsupported and does not answer the prompt." },
  ];
  shortAnswer.correctResponseJson = { rubric: "human_scored" };
  shortAnswer.scoringJson = { totalPoints: 3, autoScoringClaim: false };
  shortAnswer.auditMetadata = { ...shortAnswer.auditMetadata, autoScoringClaim: false };
  shortAnswer.responseSpecJson = buildPssaResponseSpec(shortAnswer);
  items.push(shortAnswer);

  const dragDrop = baseItem("pssa_item_g3_moy_p1_ao5_dd_bc313", "DRAG_DROP", "map_sentence_feature_match", "E03.B-C.3.1.3", 3, {
    requiresFigure: true,
    requiresPassageText: true,
    dragTokenTexts: [
      "The workers place each exhibit name on the floor map so visitors can see what is upstairs and what is on the ground floor.",
      "They mark the elevator clearly because the green accessible route uses the elevator, not the stairs.",
      "The Story Stage sign lists show times...",
    ],
    evidenceKind: "figure_and_drag_tokens",
  });
  dragDrop.prompt = "Drag each sentence from the passage to the map feature that best supports it.";
  dragDrop.instructionText = "Use each sentence once.";
  dragDrop.tokens = [
    { tokenId: "token_levels", text: "The workers place each exhibit name on the floor map so visitors can see what is upstairs and what is on the ground floor.", evidenceBinding: { requiresFigure: true, requiresPassageText: true, quotedText: "The workers place each exhibit name on the floor map so visitors can see what is upstairs and what is on the ground floor.", evidenceKind: "figure_and_quoted_text" } },
    { tokenId: "token_route", text: "They mark the elevator clearly because the green accessible route uses the elevator, not the stairs.", evidenceBinding: { requiresFigure: true, requiresPassageText: true, quotedText: "They mark the elevator clearly because the green accessible route uses the elevator, not the stairs.", evidenceKind: "figure_and_quoted_text" } },
    { tokenId: "token_show_times", text: "The Story Stage sign lists show times...", evidenceBinding: { requiresFigure: true, requiresPassageText: true, quotedText: "The Story Stage sign lists show times", evidenceKind: "figure_and_quoted_text" } },
  ];
  dragDrop.targets = [
    { targetId: "target_levels", label: "Level 1 and Level 2 headings" },
    { targetId: "target_route", label: "Accessible route through the elevator" },
    { targetId: "target_show_times", label: "11:00 · 1:00 · 3:00" },
    { targetId: "target_stairs", label: "Stairs", distractorRole: "opposite_claim", rationale: "The accessible route uses the elevator, not the stairs." },
    { targetId: "target_quiet_corner", label: "Quiet Corner", distractorRole: "wrong_section", rationale: "Quiet Corner belongs to the separation item, not these AO-5 rows." },
    { targetId: "target_family_rest", label: "Family Rest Area", distractorRole: "wrong_emphasis", rationale: "Family Rest Area is map-only for location, not a match for these sentences." },
  ];
  dragDrop.useAllTokens = true;
  dragDrop.correctResponseJson = { correctAssignments: [
    { tokenId: "token_levels", targetId: "target_levels" },
    { tokenId: "token_route", targetId: "target_route" },
    { tokenId: "token_show_times", targetId: "target_show_times" },
  ] };
  dragDrop.scoringJson = { totalPoints: 3 };
  dragDrop.responseSpecJson = buildPssaResponseSpec(dragDrop);
  items.push(dragDrop);

  validateItems(items);
  return items;
}

function validateItems(items: MoyItem[]) {
  assert.deepEqual(items.map((item) => item.itemId), [
    "pssa_item_g3_moy_p1_mcq_bk111",
    "pssa_item_g3_moy_p1_mcq_bc211",
    "pssa_item_g3_moy_p1_mcq_bc313",
    "pssa_item_g3_moy_p1_mcq_bv411",
    "pssa_item_g3_moy_p1_mcq_bc212",
    "pssa_item_g3_moy_p1_te_bk112",
    "pssa_item_g3_moy_p1_sa_bk113",
    "pssa_item_g3_moy_p1_ao5_dd_bc313",
  ]);
  assert.deepEqual(items.filter((item) => item.interactionType === "MCQ").map((item) => item.correctIndex), [0, 1, 2, 3, 0], "P1 MCQ key positions must be A/B/C/D/A");
  for (const item of items) {
    assert.equal(item.reviewStatus, "PENDING");
    assert.equal(item.itemStatus, "candidate");
    assert.equal(item.sourceType, "internal_original");
    assert.equal(item.licenseStatus, "cleared_internal_original");
    assert.equal(item.commercialUseAllowed, true);
    assert.equal(item.needsLegalReview, false);
    assert.equal((item as any).scoringBucket, undefined, "P1 bank item must not set scoringBucket");
    projectPssaStudentItem(item);
    for (const choice of item.structuredChoicesJson ?? []) {
      if (choice.distractorRole) assert(mappingRegistry[choice.distractorRole], `registered distractorRole ${choice.distractorRole}`);
    }
    for (const target of item.targets ?? []) {
      if (target.distractorRole) assert(mappingRegistry[target.distractorRole], `registered target distractorRole ${target.distractorRole}`);
    }
  }
}

export function buildMoyP1Packet() {
  return {
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    passageCount: 1,
    itemCount: 8,
    passages: [buildMoyP1Passage()],
    items: buildMoyP1Items(),
  };
}

function renderStudentPreview(packet: ReturnType<typeof buildMoyP1Packet>) {
  const lines = ["# MOY P1 Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const passage of packet.passages) {
    lines.push(`## ${passage.title}`, "", passage.text, "", "[Figure: Bright Ideas Children's Museum Visitor Floor Map]", "");
  }
  for (const item of packet.items) {
    const dto = projectPssaStudentItem(item) as any;
    lines.push(`### ${item.itemId}`, "", `EC: ${item.eligibleContent}`, "", JSON.stringify(dto.responseSpec, null, 2), "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(packet: ReturnType<typeof buildMoyP1Packet>) {
  const lines = ["# MOY P1 Reviewer Preview", "", "Includes keys, rationales, and rubric. All content is PENDING/candidate and noDbWrite.", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `EC: ${item.eligibleContent}`, `Type: ${item.interactionType}`, `Points: ${item.pointValue}`, "");
    if (item.answerChoicesJson) {
      item.answerChoicesJson.forEach((choice, index) => lines.push(`- ${String.fromCharCode(65 + index)}${index === item.correctIndex ? " (KEY)" : ""}: ${choice.text} — ${choice.rationale ?? ""}`));
      lines.push("");
    }
    if (item.interactionType === "MATCHING_GRID") lines.push("Key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    if (item.interactionType === "DRAG_DROP") lines.push("Key:", JSON.stringify(item.correctResponseJson, null, 2), "");
    if (item.rubric) lines.push("Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`, "");
  }
  return lines.join("\n");
}

function renderAnswerKey(packet: ReturnType<typeof buildMoyP1Packet>) {
  const lines = ["# MOY P1 Answer Key and Rubric", ""];
  for (const item of packet.items) {
    lines.push(`## ${item.itemId}`, "", `Type: ${item.interactionType}`, `Points: ${item.pointValue}`);
    if (typeof item.correctIndex === "number") lines.push(`Correct: ${String.fromCharCode(65 + item.correctIndex)}`);
    else lines.push("Correct response:", "```json", JSON.stringify(item.correctResponseJson, null, 2), "```");
    if (item.rubric) lines.push("", "Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderAuditCsv(packet: ReturnType<typeof buildMoyP1Packet>) {
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
  const source = fs.readFileSync("specs/pssa_g3_moy_p1_passage_package.md", "utf8");
  assert(source.includes("APPROVED — Phase 4A verified on `main`"), "source package must be approved");
  assert(source.includes("687 words") || source.includes("687"), "source package must record 687 words");
  assert(source.includes("E03.B-C.2.1.2"), "source package must contain text-features/search-tools EC");
  assert(source.includes("E03.B-C.3.1.3"), "source package must contain map+words EC");
  assert(!/Art Studio placement is\s+listed as map-only evidence/i.test(source), "Art Studio placement must not be map-only evidence");
  assert(source.includes("## 8.1 Item evidence allocation"), "source package must contain final evidence allocation");
}

function main() {
  assertSourcePackageFresh();
  const packet = buildMoyP1Packet();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "backend.json"), JSON.stringify(packet, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(packet));
  fs.writeFileSync(path.join(outputDir, "answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "audit_report.csv"), renderAuditCsv(packet));
  console.log("MOY P1 authoring complete: wrote exemplars/pssa_grade3_moy_p1/*");
  console.log("noDbWrite=true productionImportReady=false; no Prisma import/use");
}

if (require.main === module) main();
