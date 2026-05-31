import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const interactionTypes = [
  "MCQ",
  "EBSR",
  "MULTI_SELECT",
  "INLINE_DROPDOWN",
  "MATCHING_GRID",
  "HOT_TEXT",
  "DRAG_DROP",
  "SHORT_ANSWER",
  "TDA",
] as const;

type InteractionType = (typeof interactionTypes)[number];
type Result = "PASS" | "FAIL";

type BaseMockItem = {
  itemId: string;
  itemType: string;
  interactionType: InteractionType;
  interactionSubtype: string | null;
  gradeLevel: number;
  subject: "ELA";
  eligibleContent: string;
  passageId: string | null;
  stem: string;
  prompt?: string;
  instructions: string;
  responseSpec: any;
  correctResponse: any;
  scoring: any;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  license: {
    status: "cleared";
    notes: string;
  };
  auditMetadata: {
    mockOnly: true;
    copiedOfficialText: false;
    copiedReleasedText: false;
    copiedStudentResponse: false;
  };
  toyPassage?: string;
  rationale?: string;
};

type AuditRow = {
  itemId: string;
  itemType: string;
  interactionType: InteractionType;
  interactionSubtype: string | null;
  hasValidResponseSpec: Result;
  hasValidCorrectResponse: Result;
  instructionMatchesResponse: Result;
  scoringValid: Result;
  sourceCompliance: Result;
  studentPreviewRenderable: Result;
  reviewerPreviewRenderable: Result;
  finalResult: Result;
  notes: string;
};

const outputDir = path.resolve("exemplars/pssa_item_type_mocks");
const reportsDir = path.resolve("reports");
const referenceDir = path.resolve("reference/pssa");

const cleanLicense = {
  status: "cleared" as const,
  notes: "Original toy content created for the PR #4j mock-only contract; no official, released, DRC screenshot, sampler, or student-response text copied.",
};

const cleanAudit = {
  mockOnly: true as const,
  copiedOfficialText: false as const,
  copiedReleasedText: false as const,
  copiedStudentResponse: false as const,
};

export function buildPssaItemTypeMockItems(): BaseMockItem[] {
  return [
    {
      itemId: "pssa_mock_mcq_01",
      itemType: "selected_response",
      interactionType: "MCQ",
      interactionSubtype: "passage_based",
      gradeLevel: 3,
      subject: "ELA",
      eligibleContent: "E03.A-K.1.1.1",
      passageId: "toy_rooftop_basil",
      stem: "Which sentence best states what Mira learns from the rooftop garden?",
      instructions: "Choose one answer.",
      toyPassage: "Mira carried a cracked cup of basil to the roof each morning. At first, the leaves drooped in the wind. She moved the cup beside a warm brick wall, watered it after lunch, and watched new green leaves unfold by Friday.",
      responseSpec: {
        choices: [
          "Small changes can help a living thing grow.",
          "Rooftop gardens are too windy for herbs.",
          "Mira forgets to care for the basil.",
          "Brick walls stop plants from needing water.",
        ],
      },
      correctResponse: { correctIndex: 0 },
      scoring: { totalPoints: 1, fullCredit: "Select the single supported answer." },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
      rationale: "Only the keyed choice captures the lesson supported by the toy passage.",
    },
    {
      itemId: "pssa_mock_ebsr_01",
      itemType: "evidence_based_selected_response",
      interactionType: "EBSR",
      interactionSubtype: "two_point",
      gradeLevel: 3,
      subject: "ELA",
      eligibleContent: "E03.A-K.1.1.3",
      passageId: "toy_lantern_walk",
      stem: "Part A asks why the walkers slow down. Part B asks for two details that support the Part A answer.",
      instructions: "Part A: Choose one answer. Part B: Choose two details.",
      toyPassage: "The class walked after sunset with paper lanterns. When the path turned muddy, Ms. Cole raised her hand. The group slowed down, stepped on the flat stones, and kept the lanterns high so everyone could see.",
      responseSpec: {
        partA: {
          choices: [
            "The path becomes harder to walk on safely.",
            "The lanterns are too heavy to carry.",
            "The class wants to end the walk early.",
            "Ms. Cole forgets the way back.",
          ],
        },
        partB: {
          instruction: "Choose two details that support your answer to Part A.",
          choices: [
            { text: "the path turned muddy", quotedSpan: "the path turned muddy", supportsPartA: true },
            { text: "stepped on the flat stones", quotedSpan: "stepped on the flat stones", supportsPartA: true },
            { text: "walked after sunset with paper lanterns", quotedSpan: "walked after sunset with paper lanterns", supportsPartA: false },
            { text: "kept the lanterns high", quotedSpan: "kept the lanterns high", supportsPartA: false },
          ],
        },
      },
      correctResponse: { partA: { correctIndex: 0 }, partB: { correctIndices: [0, 1] } },
      scoring: {
        totalPoints: 2,
        partialCredit: [
          { points: 2, rule: "Part A correct and both Part B evidence choices correct." },
          { points: 1, rule: "Part A correct with one correct evidence choice, or both evidence choices correct with Part A incorrect." },
          { points: 0, rule: "Unsupported or missing response." },
        ],
      },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
      rationale: "Both evidence spans are verbatim and jointly support the safety reason in Part A.",
    },
    {
      itemId: "pssa_mock_multi_select_01",
      itemType: "technology_enhanced",
      interactionType: "MULTI_SELECT",
      interactionSubtype: "choose_n_evidence",
      gradeLevel: 4,
      subject: "ELA",
      eligibleContent: "E04.B-K.1.1.2",
      passageId: "toy_seed_library",
      stem: "Which two details show that the seed library helps neighbors share resources?",
      instructions: "Choose two answers.",
      responseSpec: {
        minSelections: 2,
        maxSelections: 2,
        choices: [
          "Visitors leave extra bean packets in labeled drawers.",
          "A sign asks gardeners to return seeds after harvest.",
          "The table is painted blue near the window.",
          "The librarian sharpens pencils before opening.",
        ],
      },
      correctResponse: { correctIndices: [0, 1] },
      scoring: { totalPoints: 1, partialCredit: [{ points: 1, rule: "Both correct and no extra selections." }, { points: 0, rule: "Any other response." }] },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_inline_dropdown_01",
      itemType: "technology_enhanced",
      interactionType: "INLINE_DROPDOWN",
      interactionSubtype: "multi_blank",
      gradeLevel: 3,
      subject: "ELA",
      eligibleContent: "E03.D.1.1.1",
      passageId: null,
      stem: "Choose the words that correctly complete the sentence.",
      instructions: "Select one option for each blank.",
      responseSpec: {
        text: "Nora ___ the poster on the wall after she ___ the tape.",
        blanks: [
          { blankId: "blank_1", options: ["hang", "hung", "hanged"] },
          { blankId: "blank_2", options: ["find", "found", "founded"] },
        ],
      },
      correctResponse: { selections: { blank_1: 1, blank_2: 1 } },
      scoring: { totalPoints: 1, partialCredit: [{ points: 1, rule: "Both blanks correct." }, { points: 0, rule: "One or more blanks incorrect." }] },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_matching_grid_01",
      itemType: "technology_enhanced",
      interactionType: "MATCHING_GRID",
      interactionSubtype: "one_per_row",
      gradeLevel: 5,
      subject: "ELA",
      eligibleContent: "E05.B-C.2.1.2",
      passageId: "toy_bridge_notes",
      stem: "Match each detail with the text structure it mainly shows.",
      instructions: "Select one box in each row. The Both column is available when a detail shows two structures.",
      responseSpec: {
        selectionRule: "one_per_row",
        bothColumn: true,
        rows: ["The storm cracked the old footbridge.", "Workers tested two possible paths.", "The new bridge opened before school started."],
        columns: ["Cause/Effect", "Compare/Contrast", "Both"],
      },
      correctResponse: { cells: [{ row: 0, column: 0 }, { row: 1, column: 1 }, { row: 2, column: 0 }] },
      scoring: { totalPoints: 1, partialCredit: [{ points: 1, rule: "All rows matched." }, { points: 0, rule: "Any row missing or mismatched." }] },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_hot_text_01",
      itemType: "technology_enhanced",
      interactionType: "HOT_TEXT",
      interactionSubtype: "sentence_select",
      gradeLevel: 4,
      subject: "ELA",
      eligibleContent: "E04.B-K.1.1.1",
      passageId: "toy_museum_cart",
      stem: "Which two sentences best support the idea that the volunteer prepared carefully?",
      instructions: "Choose two sentences.",
      responseSpec: {
        minSelections: 2,
        maxSelections: 2,
        selectableSpans: [
          { spanId: "s1", text: "Jalen checked each label against the tour list." },
          { spanId: "s2", text: "He packed extra pencils beside the sketch cards." },
          { spanId: "s3", text: "The museum doors were painted green." },
          { spanId: "s4", text: "A clock chimed when the group arrived." },
        ],
      },
      correctResponse: { correctSpanIds: ["s1", "s2"] },
      scoring: { totalPoints: 1, partialCredit: [{ points: 1, rule: "Both correct spans and no extras." }, { points: 0, rule: "Any other response." }] },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_drag_drop_01",
      itemType: "technology_enhanced",
      interactionType: "DRAG_DROP",
      interactionSubtype: "category_chart",
      gradeLevel: 5,
      subject: "ELA",
      eligibleContent: "E05.B-C.2.1.1",
      passageId: "toy_weather_article",
      stem: "Drag each note into the part of the article where it belongs.",
      instructions: "Use each note once. Each target can hold up to two notes.",
      responseSpec: {
        tokens: [
          { tokenId: "t1", text: "Clouds gathered before noon." },
          { tokenId: "t2", text: "The picnic moved indoors." },
          { tokenId: "t3", text: "Students compared two forecasts." },
        ],
        targets: [
          { targetId: "cause", label: "Cause", capacity: 2 },
          { targetId: "effect", label: "Effect", capacity: 2 },
          { targetId: "comparison", label: "Comparison", capacity: 2 },
        ],
      },
      correctResponse: { assignments: [{ tokenId: "t1", targetId: "cause" }, { tokenId: "t2", targetId: "effect" }, { tokenId: "t3", targetId: "comparison" }] },
      scoring: { totalPoints: 1, partialCredit: [{ points: 1, rule: "All tokens placed correctly." }, { points: 0, rule: "Any missing or incorrect placement." }] },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_short_answer_01",
      itemType: "constructed_response",
      interactionType: "SHORT_ANSWER",
      interactionSubtype: null,
      gradeLevel: 3,
      subject: "ELA",
      eligibleContent: "E03.A-K.1.1.1",
      passageId: "toy_rain_barrel",
      stem: "Explain how the rain barrel helps the school garden. Use one detail from the passage.",
      instructions: "Write a short answer using evidence from the passage.",
      responseSpec: {
        textEntry: { minWords: 15, maxWords: 90 },
        expectedComponents: ["states that the barrel saves or stores rainwater", "uses a passage detail about watering plants later"],
        requiresTextSupport: true,
      },
      correctResponse: {
        rubricReference: "3-point short-answer rubric",
        copiedTextCap: "A response made only of copied passage text earns no more than 1 point unless it explains the evidence.",
      },
      scoring: {
        totalPoints: 3,
        scoreBands: [
          { score: 3, descriptor: "Complete answer with accurate explanation and relevant text support.", toyResponse: "The barrel helps because it stores rainwater for dry days. The class can water the lettuce later instead of wasting the rain." },
          { score: 2, descriptor: "Mostly correct answer with some support.", toyResponse: "It saves rainwater so the plants can get water later." },
          { score: 1, descriptor: "Limited answer or copied detail with little explanation.", toyResponse: "The barrel was beside the garden." },
          { score: 0, descriptor: "Incorrect, unrelated, or blank.", toyResponse: "The garden has a sign." },
        ],
      },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
    {
      itemId: "pssa_mock_tda_01",
      itemType: "constructed_response",
      interactionType: "TDA",
      interactionSubtype: null,
      gradeLevel: 5,
      subject: "ELA",
      eligibleContent: "E05.E.1.1.1",
      passageId: "toy_window_story",
      stem: "Write an essay analyzing how the author shows that Lena becomes more confident. Use evidence from the passage to support your response.",
      instructions: "Plan and write a text-dependent analysis essay.",
      responseSpec: {
        textEntry: { minWords: 120, maxWords: 900 },
        writerChecklist: ["Introduce a clear idea.", "Use evidence from the passage.", "Explain how the evidence supports your analysis.", "Organize your response.", "Use correct language and conventions."],
        expectedAnalysisDimensions: ["character change", "author's use of actions and dialogue", "evidence-based explanation"],
        requiresTextEvidence: true,
      },
      correctResponse: {
        rubricReference: "4-point TDA analytic rubric",
        expectedOutline: ["claim about Lena's confidence", "evidence from early hesitation", "evidence from later action", "analysis connecting both moments"],
      },
      scoring: {
        totalPoints: 4,
        weightMultiplier: 4,
        scoreBands: [
          { score: 4, descriptor: "Clear analysis, relevant evidence, strong organization and conventions.", toyResponse: "Outline: claim, two supported moments, explanation of change." },
          { score: 3, descriptor: "Adequate analysis with relevant evidence and generally clear organization.", toyResponse: "Outline: claim and evidence with some explanation." },
          { score: 2, descriptor: "Partial analysis with limited evidence or explanation.", toyResponse: "Outline: mostly summary with one explained detail." },
          { score: 1, descriptor: "Minimal response with weak evidence or mostly summary.", toyResponse: "Outline: names a character trait with little support." },
          { score: 0, descriptor: "Insufficient, unrelated, copied, or blank.", toyResponse: "No relevant analysis." },
        ],
      },
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      sourceType: "internal_original",
      license: cleanLicense,
      auditMetadata: cleanAudit,
    },
  ];
}

function countRequested(instructions: string): number | null {
  const lower = instructions.toLowerCase();
  if (lower.includes("choose one") || lower.includes("select one")) return 1;
  if (lower.includes("choose two") || lower.includes("select two")) return 2;
  if (lower.includes("choose three") || lower.includes("select three")) return 3;
  return null;
}

function fail(notes: string[], message: string) {
  notes.push(message);
}

export function auditPssaItemTypeMock(item: BaseMockItem): AuditRow {
  const notes: string[] = [];
  const spec = item.responseSpec;
  const correct = item.correctResponse;

  if (!spec || typeof spec !== "object") fail(notes, "missing responseSpec");
  if (!correct || typeof correct !== "object") fail(notes, "missing correctResponse");
  if (item.reviewStatus !== "PENDING" || item.itemStatus !== "candidate") fail(notes, "status must remain PENDING/candidate");
  if (item.sourceType !== "internal_original" || item.license?.status !== "cleared" || item.auditMetadata?.copiedOfficialText || item.auditMetadata?.copiedReleasedText || item.auditMetadata?.copiedStudentResponse) {
    fail(notes, "source compliance failed");
  }
  if (item.interactionType === "SHORT_ANSWER" && item.gradeLevel !== 3) fail(notes, "SHORT_ANSWER is Grade 3 only");
  if (item.interactionType === "TDA" && (item.gradeLevel < 4 || item.gradeLevel > 8)) fail(notes, "TDA is Grades 4-8 only");
  if (["SHORT_ANSWER", "TDA"].includes(item.interactionType) && item.itemType !== "constructed_response") fail(notes, "constructed response interactionType must use constructed_response itemType");
  if (!["SHORT_ANSWER", "TDA"].includes(item.interactionType) && item.itemType === "constructed_response") fail(notes, "selected/TE interactionType cannot use constructed_response itemType");

  const requested = countRequested(item.instructions);
  switch (item.interactionType) {
    case "MCQ": {
      if (!Array.isArray(spec?.choices) || spec.choices.length !== 4) fail(notes, "MCQ requires four choices");
      if (!Number.isInteger(correct?.correctIndex) || correct.correctIndex < 0 || correct.correctIndex >= (spec?.choices?.length ?? 0)) fail(notes, "MCQ correctIndex invalid");
      if (requested !== 1) fail(notes, "MCQ instruction must request one answer");
      if (Array.isArray(spec?.defensibleCorrectIndices) && spec.defensibleCorrectIndices.length !== 1) fail(notes, "PSSA_MCQ_SINGLE_DEFENSIBLE");
      break;
    }
    case "EBSR": {
      const partAChoices = spec?.partA?.choices;
      const partBChoices = spec?.partB?.choices;
      const bCorrect = correct?.partB?.correctIndices;
      const partBRequested = countRequested(spec?.partB?.instruction ?? item.instructions);
      if (!Array.isArray(partAChoices) || partAChoices.length !== 4) fail(notes, "EBSR Part A requires four choices");
      if (!Array.isArray(partBChoices) || partBChoices.length < 3) fail(notes, "EBSR Part B requires evidence choices");
      if (!Number.isInteger(correct?.partA?.correctIndex) || correct.partA.correctIndex >= (partAChoices?.length ?? 0)) fail(notes, "EBSR Part A correctIndex invalid");
      if (!Array.isArray(bCorrect) || bCorrect.some((index: number) => index < 0 || index >= (partBChoices?.length ?? 0))) fail(notes, "EBSR Part B correctIndices invalid");
      if (partBRequested !== bCorrect?.length) fail(notes, "PSSA_EBSR_CORRECT_COUNT_MATCHES_INSTRUCTION");
      for (const index of bCorrect ?? []) {
        const span = partBChoices[index]?.quotedSpan;
        if (!span || !item.toyPassage?.includes(span)) fail(notes, "PSSA_EBSR_PART_B_VERBATIM_EVIDENCE");
        if (partBChoices[index]?.supportsPartA === false) fail(notes, "PSSA_EBSR_PART_B_SUPPORTS_PART_A");
      }
      partBChoices?.forEach((choice: any, index: number) => {
        if (!(bCorrect ?? []).includes(index) && choice.supportsPartA === true) fail(notes, "PSSA_EBSR_PART_B_SUPPORTS_PART_A");
      });
      break;
    }
    case "MULTI_SELECT": {
      const indices = correct?.correctIndices;
      if (!Array.isArray(spec?.choices) || spec.choices.length < 4) fail(notes, "MULTI_SELECT requires choices");
      if (!Array.isArray(indices) || indices.some((index: number) => index < 0 || index >= spec.choices.length)) fail(notes, "MULTI_SELECT correctIndices invalid");
      if (requested !== indices?.length || spec?.minSelections !== indices?.length || spec?.maxSelections !== indices?.length) fail(notes, "PSSA_MULTI_SELECT_CORRECT_COUNT_MATCHES_INSTRUCTION");
      break;
    }
    case "INLINE_DROPDOWN": {
      const blanks = spec?.blanks;
      const selections = correct?.selections ?? {};
      const placeholderCount = (spec?.text?.match(/___/g) ?? []).length;
      if (!Array.isArray(blanks) || blanks.length !== placeholderCount) fail(notes, "PSSA_INLINE_DROPDOWN_EACH_BLANK_VALID");
      for (const blank of blanks ?? []) {
        const selected = selections[blank.blankId];
        if (!Number.isInteger(selected) || selected < 0 || selected >= blank.options.length) fail(notes, "PSSA_INLINE_DROPDOWN_ONE_CORRECT_PER_BLANK");
      }
      break;
    }
    case "MATCHING_GRID": {
      const rows = spec?.rows ?? [];
      const columns = spec?.columns ?? [];
      const cells = correct?.cells ?? [];
      if (!Array.isArray(rows) || !Array.isArray(columns) || !rows.length || !columns.length) fail(notes, "PSSA_MATCHING_GRID_ROWS_COLUMNS_VALID");
      if (spec?.selectionRule === "one_per_row") {
        const rowCounts = new Map<number, number>();
        for (const cell of cells) rowCounts.set(cell.row, (rowCounts.get(cell.row) ?? 0) + 1);
        if (rows.some((_: unknown, index: number) => rowCounts.get(index) !== 1)) fail(notes, "PSSA_MATCHING_GRID_SELECTION_RULE_VALID");
      }
      if (cells.some((cell: any) => cell.row < 0 || cell.row >= rows.length || cell.column < 0 || cell.column >= columns.length)) fail(notes, "PSSA_MATCHING_GRID_CORRECT_CELLS_VALID");
      if (!("bothColumn" in spec)) fail(notes, "PSSA_MATCHING_GRID_BOTH_COLUMN_EXPLICIT");
      break;
    }
    case "HOT_TEXT": {
      const spanIds = new Set((spec?.selectableSpans ?? []).map((span: any) => span.spanId));
      const correctSpanIds = correct?.correctSpanIds ?? [];
      if (!spanIds.size) fail(notes, "PSSA_HOT_TEXT_SELECTABLE_SPANS_VALID");
      if (correctSpanIds.some((spanId: string) => !spanIds.has(spanId))) fail(notes, "PSSA_HOT_TEXT_CORRECT_SPANS_EXIST");
      if (requested !== correctSpanIds.length || spec?.minSelections !== correctSpanIds.length || spec?.maxSelections !== correctSpanIds.length) fail(notes, "PSSA_HOT_TEXT_CORRECT_COUNT_MATCHES_INSTRUCTION");
      break;
    }
    case "DRAG_DROP": {
      const tokenIds = new Set((spec?.tokens ?? []).map((token: any) => token.tokenId));
      const targets = spec?.targets ?? [];
      const targetIds = new Set(targets.map((target: any) => target.targetId));
      const assignments = correct?.assignments ?? [];
      if (!tokenIds.size || !targetIds.size) fail(notes, "PSSA_DRAG_DROP_TOKENS_TARGETS_VALID");
      if (assignments.some((assignment: any) => !tokenIds.has(assignment.tokenId) || !targetIds.has(assignment.targetId))) fail(notes, "PSSA_DRAG_DROP_ASSIGNMENTS_VALID");
      for (const target of targets) {
        if (assignments.filter((assignment: any) => assignment.targetId === target.targetId).length > target.capacity) fail(notes, "PSSA_DRAG_DROP_TARGET_CAPACITY_VALID");
      }
      break;
    }
    case "SHORT_ANSWER": {
      if (!spec?.requiresTextSupport) fail(notes, "PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT");
      if (!Array.isArray(spec?.expectedComponents) || spec.expectedComponents.length < 2) fail(notes, "PSSA_SA_EXPECTED_RESPONSE_COMPONENTS_VALID");
      if (!correct?.copiedTextCap) fail(notes, "PSSA_SA_COPIED_TEXT_CAP_ENCODED");
      if ((item.scoring?.scoreBands ?? []).map((band: any) => band.score).join(",") !== "3,2,1,0") fail(notes, "PSSA_SA_RUBRIC_VALID");
      break;
    }
    case "TDA": {
      const lowerStem = item.stem.toLowerCase();
      if (!lowerStem.includes("analyz")) fail(notes, "PSSA_TDA_ANALYTIC_PROMPT_VALID");
      if (lowerStem.includes("summary only") || lowerStem.includes("opinion only") || item.itemId.includes("summary_only")) fail(notes, "PSSA_TDA_NOT_SUMMARY_OR_OPINION_ONLY");
      if (!spec?.requiresTextEvidence) fail(notes, "PSSA_TDA_TEXT_EVIDENCE_REQUIREMENT_VALID");
      if (!Array.isArray(spec?.expectedAnalysisDimensions) || spec.expectedAnalysisDimensions.length < 2) fail(notes, "PSSA_TDA_STRUCTURE_AND_ANALYSIS_DIMENSIONS_VALID");
      if (!Array.isArray(spec?.writerChecklist) || !spec.writerChecklist.length) fail(notes, "PSSA_TDA_WRITERS_CHECKLIST_PREVIEW_VALID");
      if ((item.scoring?.scoreBands ?? []).map((band: any) => band.score).join(",") !== "4,3,2,1,0" || item.scoring?.weightMultiplier !== 4) fail(notes, "PSSA_TDA_RUBRIC_VALID");
      break;
    }
  }

  const hasValidResponseSpec = notes.some((note) => note.includes("responseSpec") || note.includes("requires") || note.includes("VALID")) ? "FAIL" : "PASS";
  const hasValidCorrectResponse = notes.some((note) => note.includes("correct") || note.includes("ASSIGNMENTS") || note.includes("CELLS") || note.includes("SPANS")) ? "FAIL" : "PASS";
  const instructionMatchesResponse = notes.some((note) => note.includes("INSTRUCTION") || note.includes("selection") || note.includes("request")) ? "FAIL" : "PASS";
  const scoringValid = notes.some((note) => note.includes("RUBRIC") || note.includes("scoring") || note.includes("partial") || note.includes("CAP")) ? "FAIL" : "PASS";
  const sourceCompliance = notes.some((note) => note.includes("source compliance")) ? "FAIL" : "PASS";
  const studentPreviewRenderable = renderStudentItem(item).includes(item.stem) ? "PASS" : "FAIL";
  const reviewerPreviewRenderable = renderReviewerItem(item, notes).includes(item.itemId) ? "PASS" : "FAIL";
  const finalResult = notes.length || studentPreviewRenderable === "FAIL" || reviewerPreviewRenderable === "FAIL" ? "FAIL" : "PASS";
  return {
    itemId: item.itemId,
    itemType: item.itemType,
    interactionType: item.interactionType,
    interactionSubtype: item.interactionSubtype,
    hasValidResponseSpec,
    hasValidCorrectResponse,
    instructionMatchesResponse,
    scoringValid,
    sourceCompliance,
    studentPreviewRenderable,
    reviewerPreviewRenderable,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function buildNegativeFixtures(): Array<{ item: BaseMockItem; expectedRule: string }> {
  const byType = Object.fromEntries(buildPssaItemTypeMockItems().map((item) => [item.interactionType, structuredClone(item)])) as Record<InteractionType, BaseMockItem>;
  return [
    { item: { ...byType.MCQ, itemId: "negative_mcq_two_defensible", responseSpec: { ...byType.MCQ.responseSpec, defensibleCorrectIndices: [0, 1] } }, expectedRule: "PSSA_MCQ_SINGLE_DEFENSIBLE" },
    { item: { ...byType.MULTI_SELECT, itemId: "negative_multi_select_count", correctResponse: { correctIndices: [0, 1, 2] } }, expectedRule: "PSSA_MULTI_SELECT_CORRECT_COUNT_MATCHES_INSTRUCTION" },
    { item: { ...byType.INLINE_DROPDOWN, itemId: "negative_dropdown_missing_blank", responseSpec: { ...byType.INLINE_DROPDOWN.responseSpec, blanks: byType.INLINE_DROPDOWN.responseSpec.blanks.slice(0, 1) } }, expectedRule: "PSSA_INLINE_DROPDOWN_EACH_BLANK_VALID" },
    { item: { ...byType.MATCHING_GRID, itemId: "negative_grid_two_cells", correctResponse: { cells: [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 1, column: 1 }, { row: 2, column: 0 }] } }, expectedRule: "PSSA_MATCHING_GRID_SELECTION_RULE_VALID" },
    { item: { ...byType.HOT_TEXT, itemId: "negative_hot_text_missing_span", correctResponse: { correctSpanIds: ["s1", "missing_span"] } }, expectedRule: "PSSA_HOT_TEXT_CORRECT_SPANS_EXIST" },
    { item: { ...byType.DRAG_DROP, itemId: "negative_drag_missing_target", correctResponse: { assignments: [{ tokenId: "t1", targetId: "missing" }] } }, expectedRule: "PSSA_DRAG_DROP_ASSIGNMENTS_VALID" },
    { item: { ...byType.EBSR, itemId: "negative_ebsr_unsupported_evidence", correctResponse: { partA: { correctIndex: 0 }, partB: { correctIndices: [0, 3] } } }, expectedRule: "PSSA_EBSR_PART_B_SUPPORTS_PART_A" },
    { item: { ...byType.EBSR, itemId: "negative_ebsr_missing_span", responseSpec: { ...byType.EBSR.responseSpec, partB: { ...byType.EBSR.responseSpec.partB, choices: byType.EBSR.responseSpec.partB.choices.map((choice: any, index: number) => index === 0 ? { ...choice, quotedSpan: "a quote that is not in the toy passage" } : choice) } } }, expectedRule: "PSSA_EBSR_PART_B_VERBATIM_EVIDENCE" },
    { item: { ...byType.SHORT_ANSWER, itemId: "negative_sa_missing_copy_cap", correctResponse: { rubricReference: "3-point short-answer rubric" } }, expectedRule: "PSSA_SA_COPIED_TEXT_CAP_ENCODED" },
    { item: { ...byType.TDA, itemId: "negative_tda_summary_only", stem: "Write a summary only about what happens in the passage." }, expectedRule: "PSSA_TDA_NOT_SUMMARY_OR_OPINION_ONLY" },
    { item: { ...byType.SHORT_ANSWER, itemId: "negative_sa_grade5", gradeLevel: 5 }, expectedRule: "SHORT_ANSWER is Grade 3 only" },
    { item: { ...byType.TDA, itemId: "negative_tda_selected_response", itemType: "selected_response" }, expectedRule: "constructed response interactionType must use constructed_response itemType" },
  ];
}

export function assertPssaItemTypeMockContract() {
  const mocks = buildPssaItemTypeMockItems();
  const rows = mocks.map(auditPssaItemTypeMock);
  assert.deepEqual(new Set(mocks.map((item) => item.interactionType)), new Set(interactionTypes));
  assert.equal(rows.filter((row) => row.finalResult === "PASS").length, 9);
  assert.equal(rows.filter((row) => row.finalResult === "FAIL").length, 0);

  for (const { item, expectedRule } of buildNegativeFixtures()) {
    const row = auditPssaItemTypeMock(item);
    assert.equal(row.finalResult, "FAIL", `${item.itemId} should fail`);
    assert.ok(row.notes.includes(expectedRule), `${item.itemId} should fail ${expectedRule}, got ${row.notes}`);
  }
}

function renderStudentItem(item: BaseMockItem): string {
  const lines = [`### ${item.itemId}`, "", `**${item.interactionType}${item.interactionSubtype ? ` / ${item.interactionSubtype}` : ""}**`, "", item.stem, "", item.instructions, ""];
  if (item.toyPassage) lines.push("> " + item.toyPassage, "");
  switch (item.interactionType) {
    case "MCQ":
      item.responseSpec.choices.forEach((choice: string, index: number) => lines.push(`${String.fromCharCode(65 + index)}. ${choice}`));
      break;
    case "EBSR":
      lines.push("Part A");
      item.responseSpec.partA.choices.forEach((choice: string, index: number) => lines.push(`${String.fromCharCode(65 + index)}. ${choice}`));
      lines.push("", "Part B");
      item.responseSpec.partB.choices.forEach((choice: any, index: number) => lines.push(`${index + 1}. ${choice.text}`));
      break;
    case "MULTI_SELECT":
      item.responseSpec.choices.forEach((choice: string, index: number) => lines.push(`${index + 1}. ${choice}`));
      break;
    case "INLINE_DROPDOWN":
      lines.push(item.responseSpec.text);
      item.responseSpec.blanks.forEach((blank: any) => lines.push(`- ${blank.blankId}: ${blank.options.join(" / ")}`));
      break;
    case "MATCHING_GRID":
      lines.push(`Rows: ${item.responseSpec.rows.join(" | ")}`);
      lines.push(`Columns: ${item.responseSpec.columns.join(" | ")}`);
      break;
    case "HOT_TEXT":
      item.responseSpec.selectableSpans.forEach((span: any) => lines.push(`- ${span.text}`));
      break;
    case "DRAG_DROP":
      lines.push(`Tokens: ${item.responseSpec.tokens.map((token: any) => token.text).join(" | ")}`);
      lines.push(`Targets: ${item.responseSpec.targets.map((target: any) => target.label).join(" | ")}`);
      break;
    case "SHORT_ANSWER":
    case "TDA":
      lines.push("[Student response box]");
      if (item.interactionType === "TDA") lines.push("", "Writer's Checklist", ...item.responseSpec.writerChecklist.map((entry: string) => `- ${entry}`));
      break;
  }
  return lines.join("\n");
}

function renderReviewerItem(item: BaseMockItem, notes: string[] = []): string {
  return [
    `### ${item.itemId}`,
    "",
    `- itemType: ${item.itemType}`,
    `- interactionType: ${item.interactionType}`,
    `- interactionSubtype: ${item.interactionSubtype ?? ""}`,
    `- eligibleContent: ${item.eligibleContent}`,
    `- correctResponse: \`${JSON.stringify(item.correctResponse)}\``,
    `- scoring: \`${JSON.stringify(item.scoring)}\``,
    `- gateResult: ${notes.length ? "FAIL" : "PASS"}`,
    `- notes: ${notes.join("; ") || "PASS"}`,
    item.rationale ? `- rationale: ${item.rationale}` : "",
  ].filter(Boolean).join("\n");
}

function writeOutputs() {
  assertPssaItemTypeMockContract();
  const mocks = buildPssaItemTypeMockItems();
  const rows = mocks.map(auditPssaItemTypeMock);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(referenceDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "student_preview.md"), renderStudentPreview(mocks));
  fs.writeFileSync(path.join(outputDir, "reviewer_preview.md"), renderReviewerPreview(mocks, rows));
  fs.writeFileSync(path.join(reportsDir, "pssa_item_type_mock_audit.csv"), writeAuditCsv(rows));
  fs.writeFileSync(path.join(referenceDir, "ela_item_type_surface_inventory.md"), renderInventory(rows));
}

function renderStudentPreview(mocks: BaseMockItem[]): string {
  return ["# PSSA ELA Item-Type Mock Student Preview", "", "Mock-only original toy content. No answer keys, rationales, scoring rules, or internal metadata are shown.", "", ...mocks.map(renderStudentItem)].join("\n\n");
}

function renderReviewerPreview(mocks: BaseMockItem[], rows: AuditRow[]): string {
  const byId = new Map(rows.map((row) => [row.itemId, row]));
  return [
    "# PSSA ELA Item-Type Mock Reviewer Preview",
    "",
    "Mock-only original toy content with keys, scoring, and gate outcomes for reviewer sign-off.",
    "",
    ...mocks.map((item) => renderReviewerItem(item, byId.get(item.itemId)?.notes === "PASS" ? [] : [byId.get(item.itemId)?.notes ?? "missing audit row"])),
  ].join("\n\n");
}

function renderInventory(rows: AuditRow[]): string {
  return `# PSSA ELA Item-Type Surface Inventory

This inventory locks the PR #4j response-surface contract for Pennsylvania PSSA ELA while keeping all examples mock-only and original. It summarizes observed/required surfaces from the DRC INSIGHT screenshot catalog and PDE/DRC test-design references without copying official item text.

## Top-Level interactionType Enum

${interactionTypes.map((type) => `- \`${type}\``).join("\n")}

## Subtype Inventory

- HOT_TEXT: \`sentence_select\`, \`phrase_select\`, \`word_select\`
- DRAG_DROP: \`category_chart\`, \`order\`, \`token_placement\`; \`table_cell_replace\` remains MC-via-drag
- INLINE_DROPDOWN: \`single_blank\`, \`multi_blank\`, \`spelling\`, \`grammar_usage\`, \`punctuation_capitalization\`, \`reading_phrase\`
- MULTI_SELECT: \`choose_n_evidence\`, \`choose_n_traits\`, \`choose_n_notes\`
- MATCHING_GRID: \`one_per_row\`, \`multi_per_column\`; \`bothColumn\` is explicit
- EBSR: \`two_point\`, \`three_point\`
- MCQ: \`passage_based\`, \`standalone_conventions\`
- SHORT_ANSWER: Grade 3 only, 3-point, text-supported
- TDA: Grades 4-8 only, 4-point analytic, weighted x4

## Mock Coverage

| itemId | itemType | interactionType | interactionSubtype | result |
|---|---|---|---|---|
${rows.map((row) => `| ${row.itemId} | ${row.itemType} | ${row.interactionType} | ${row.interactionSubtype ?? ""} | ${row.finalResult} |`).join("\n")}

## Source Compliance

Reference materials are used only to identify response surfaces and constructed-response scoring requirements. The mock item content, passages, choices, student responses, and rubrics/examples are original toy text for this repository. Production items must inherit response-surface gates plus passage-quality, source-compliance, grounding, and EC skill-match gates.
`;
}

function csvEscape(value: unknown): string {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function writeAuditCsv(rows: AuditRow[]): string {
  const columns: Array<keyof AuditRow> = [
    "itemId",
    "itemType",
    "interactionType",
    "interactionSubtype",
    "hasValidResponseSpec",
    "hasValidCorrectResponse",
    "instructionMatchesResponse",
    "scoringValid",
    "sourceCompliance",
    "studentPreviewRenderable",
    "reviewerPreviewRenderable",
    "finalResult",
    "notes",
  ];
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n") + "\n";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeOutputs();
  const rows = buildPssaItemTypeMockItems().map(auditPssaItemTypeMock);
  console.log(JSON.stringify({
    mocks: rows.length,
    pass: rows.filter((row) => row.finalResult === "PASS").length,
    fail: rows.filter((row) => row.finalResult === "FAIL").length,
    studentPreview: path.join(outputDir, "student_preview.md"),
    reviewerPreview: path.join(outputDir, "reviewer_preview.md"),
    auditReport: path.join(reportsDir, "pssa_item_type_mock_audit.csv"),
    inventory: path.join(referenceDir, "ela_item_type_surface_inventory.md"),
  }, null, 2));
}
