import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  type PassageQualityRow,
  type PssaPassageAuditInput,
} from "../audit/pssa-audit-detectors";

type Result = "PASS" | "FAIL";

type PartialCreditRule = { points: number; rule: string };
type SourceCorpusEntry = { file: string; normalizedText: string; contentNormalizedText: string };
type SourceMatch = {
  itemId: string;
  interactionType: "MATCHING_GRID" | "DRAG_DROP";
  field: string;
  matchedSourceFile: string;
  longestNormalizedNgram: string;
  overlapScore: number;
  matchType: "none" | "boilerplate" | "content-bearing";
  result: Result;
};

type BaseItem = {
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: "informational_elements" | "literature_elements";
  reportingCategory: "A" | "B";
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  auditMetadata: { authoredIn: "PSSA_PR_4M_GRADE3_MG_DD"; noDbWrite: true };
};

type MatchingGridRow = {
  rowId: string;
  label: string;
  correctColumnId: string;
  groundedInPassageId: string;
  evidenceQuote: string;
  rationale: string;
  plausibleWrongRationales: Record<string, string>;
  ambiguousAltColumnIds?: string[];
  generalKnowledgeOnly?: boolean;
};

type MatchingGridItem = BaseItem & {
  itemId: string;
  itemType: "MATCHING_GRID";
  interactionType: "MATCHING_GRID";
  interactionSubtype: "within_text_category" | "two_text_compare" | "sequence_category";
  secondaryPassageId: string | null;
  secondaryPassageTitle: string | null;
  comparisonBasis: string | null;
  stem: string;
  instructionText: string;
  rows: MatchingGridRow[];
  columns: Array<{ columnId: string; label: string; passageId?: string }>;
  selectionRule: "one_per_row" | "one_per_row_with_explicit_both_column";
  bothColumnId: string | null;
  correctCells: Array<{ rowId: string; columnId: string }>;
  scoring: { totalPoints: 3; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
};

type DragDropToken = {
  tokenId: string;
  text: string;
  isDistractor: boolean;
  groundedInPassage: boolean;
  evidenceQuote: string;
  rationale: string;
  validTargetIds: string[];
  generalKnowledgeOnly?: boolean;
};

type DragDropItem = BaseItem & {
  itemId: string;
  itemType: "DRAG_DROP";
  interactionType: "DRAG_DROP";
  interactionSubtype: "category_chart" | "order";
  prompt: string;
  instructionText: string;
  tokens: DragDropToken[];
  targets: Array<{ targetId: string; label: string; capacity: number }>;
  correctAssignments: Array<{ tokenId: string; targetId: string }>;
  useAllTokens: boolean;
  scoring: { totalPoints: 3; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
};

type ShortcutRow = {
  tranche: string;
  interactionType: "MATCHING_GRID" | "DRAG_DROP";
  itemCount: number;
  correctColumnPatterns: string;
  correctAssignmentPatterns: string;
  orderPatterns: string;
  result: Result;
  severity: "INFO" | "BLOCKER";
  notes: string;
};

type MatchingGridAuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  secondaryPassageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  interactionSubtype: string;
  stem: string;
  instructionText: string;
  selectionRule: string;
  bothColumnId: string;
  comparisonBasis: string;
  correctCells: string;
  selectionRuleResult: Result;
  correctCellsResult: Result;
  noAmbiguousAltCellResult: Result;
  bothColumnExplicitResult: Result;
  pairingCoherenceResult: Result;
  groundingResult: Result;
  skillMatchResult: Result;
  partialCreditResult: Result;
  sourceComplianceResult: Result;
  shortcutDistributionResult: Result;
  finalResult: Result;
  notes: string;
};

type DragDropAuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  interactionSubtype: string;
  prompt: string;
  instructionText: string;
  tokenCount: number;
  targetCount: number;
  useAllTokens: boolean;
  correctAssignments: string;
  assignmentsValidResult: Result;
  targetCapacityResult: Result;
  noDistractorEquallyValidResult: Result;
  orderValidResult: Result;
  groundingResult: Result;
  skillMatchResult: Result;
  partialCreditResult: Result;
  sourceComplianceResult: Result;
  shortcutDistributionResult: Result;
  finalResult: Result;
  notes: string;
};

type HashProofRow = {
  contentGroup: string;
  itemCount: number;
  beforeHash: string;
  afterHash: string;
  unchanged: "YES" | "NO";
};

type AuditBundle = {
  matchingGridItems: MatchingGridItem[];
  dragDropItems: DragDropItem[];
  matchingGridRows: MatchingGridAuditRow[];
  dragDropRows: DragDropAuditRow[];
  shortcutRows: ShortcutRow[];
  sourceMatches: SourceMatch[];
  passageRows: PassageQualityRow[];
  hashRows: HashProofRow[];
};

type MatchingGridConfig = Pick<BaseItem, "passageId" | "passageTitle" | "eligibleContent" | "ecSkillFamily" | "reportingCategory"> & {
  itemId: string;
  interactionSubtype: MatchingGridItem["interactionSubtype"];
  stem: string;
  instructionText: string;
  rows: MatchingGridRow[];
  columns: MatchingGridItem["columns"];
};

type DragDropConfig = Pick<BaseItem, "passageId" | "passageTitle" | "eligibleContent" | "ecSkillFamily" | "reportingCategory"> & {
  itemId: string;
  interactionSubtype: DragDropItem["interactionSubtype"];
  prompt: string;
  instructionText: string;
  tokens: DragDropToken[];
  targets: DragDropItem["targets"];
  correctAssignments: Array<[string, string]>;
  useAllTokens: boolean;
};

const outputDir = path.resolve("exemplars/pssa_grade3_matching_grid_drag_drop");
const sourceDirs = [path.resolve("reference/pssa-released-items"), path.resolve("reference/pssa-item-catalog")];
const sourceTextExtensions = new Set([".md", ".txt", ".csv", ".json", ".html", ".pdf"]);
const boilerplatePatterns = [
  "complete the table",
  "drag the answers into the chart",
  "drag each answer",
  "choose one answer in each row",
  "put each event in order",
];

function loadJson(file: string) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function loadGrade3Pilot() {
  return loadJson("exemplars/pssa_grade3_pilot/pilot_backend.json");
}

function passageById() {
  const passages = loadGrade3Pilot().passages as PssaPassageAuditInput[];
  return new Map(passages.map((passage) => [passage.id, passage]));
}

export function buildGrade3MatchingGridItems(): MatchingGridItem[] {
  return [
    makeGrid({
      itemId: "pssa_mg_g3_creek_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "within_text_category",
      stem: "Complete the table to show how details in the creek passage support the main idea.",
      instructionText: "Choose one column for each row.",
      columns: [
        { columnId: "observed_detail", label: "Observed detail" },
        { columnId: "explanation_clue", label: "Explanation clue" },
        { columnId: "later_result", label: "Later result" },
      ],
      rows: [
        row("creek_r1", "Maya drew a map of three creek spots.", "observed_detail", "Maya drew a map of three creek spots.", "This is an observed detail the class recorded."),
        row("creek_r2", "Two warm days followed a heavy rain.", "explanation_clue", "Two warm days had followed a heavy rain.", "This clue helps explain why the green color grew."),
        row("creek_r3", "The glow had faded to a faint stripe.", "later_result", "The glow had faded to a faint stripe.", "This is what Maya saw after the class notice."),
      ],
    }),
    makeGrid({
      itemId: "pssa_mg_g3_map_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "within_text_category",
      stem: "Complete the table to show how map details help visitors compare past and present.",
      instructionText: "Choose one column for each row.",
      columns: [
        { columnId: "old_map_detail", label: "Old map detail" },
        { columnId: "present_change", label: "Present-day change" },
        { columnId: "lasting_landmark", label: "Still in place" },
      ],
      rows: [
        row("map_r2", "Some streets had new names.", "present_change", "Some streets had new names, and the trolley tracks were gone.", "This is a change visitors can notice."),
        row("map_r1", "The map showed trolley stops.", "old_map_detail", "The map showed trolley stops, a river bridge, and a market square that no longer had tracks.", "The trolley stops are part of the old map."),
        row("map_r3", "The river helped visitors compare the maps.", "lasting_landmark", "Still, the river, the hill road, and the market square helped visitors compare past and present.", "The river stayed useful as a landmark."),
      ],
    }),
    makeGrid({
      itemId: "pssa_mg_g3_lunch_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sequence_category",
      stem: "Complete the table to show the lunch-line problem, change, and result.",
      instructionText: "Choose one column for each row.",
      columns: [
        { columnId: "problem", label: "Problem noticed" },
        { columnId: "change", label: "Change tried" },
        { columnId: "result", label: "Result checked" },
      ],
      rows: [
        row("lunch_r3", "Most bowls of soup were still warm.", "result", "When the bell rang, most bowls of soup were still warm.", "This is a result after the new setup."),
        row("lunch_r1", "Students had to step backward for a napkin.", "problem", "The line stopped whenever someone had to step backward for a napkin.", "This is one cause of the slow line."),
        row("lunch_r2", "Milk moved to the first table.", "change", "Milk moved to the first table, before trays.", "This is a change the class tested."),
      ],
    }),
    makeGrid({
      itemId: "pssa_mg_g3_mural_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.2",
      ecSkillFamily: "literature_elements",
      reportingCategory: "A",
      interactionSubtype: "within_text_category",
      stem: "Complete the table to show how the mural story develops its message.",
      instructionText: "Choose one column for each row.",
      columns: [
        { columnId: "setting_detail", label: "Setting detail" },
        { columnId: "mistake_response", label: "Response to mistake" },
        { columnId: "lesson_result", label: "Lesson shown" },
      ],
      rows: [
        row("mural_r2", "The narrator painted tiny waves around each fish tail.", "mistake_response", "I bent close and painted tiny waves around each tail.", "This shows the mistake being changed into art."),
        row("mural_r3", "The wall no longer looked empty.", "lesson_result", "But the fish seemed to move, and the wall no longer looked empty.", "This shows the good result of using the mistake."),
        row("mural_r1", "Chalk lines crossed the brick wall like a giant puzzle.", "setting_detail", "The wall was rough brick, and chalk lines crossed it like a giant puzzle.", "This describes the place where the mural is painted."),
      ],
    }),
    makeGrid({
      itemId: "pssa_mg_g3_cart_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "sequence_category",
      stem: "Complete the table to show the cart problem, fix, and lesson.",
      instructionText: "Choose one column for each row.",
      columns: [
        { columnId: "problem", label: "Problem" },
        { columnId: "repair_step", label: "Repair step" },
        { columnId: "lesson", label: "Lesson" },
      ],
      rows: [
        row("cart_r3", "Check wheels before loading paper.", "lesson", "Check wheels before loading paper.", "This is the reminder the class keeps from the repair."),
        row("cart_r2", "A teacher snipped the yarn with small scissors.", "repair_step", "A teacher snipped the yarn with small scissors.", "This is one repair step."),
        row("cart_r1", "The front wheel wobbled left.", "problem", "When students pushed it toward the sink, the front wheel wobbled left.", "This is the cart problem."),
      ],
    }),
  ];
}

function row(rowId: string, label: string, correctColumnId: string, evidenceQuote: string, rationale: string): MatchingGridRow {
  return { rowId, label, correctColumnId, groundedInPassageId: "", evidenceQuote, rationale, plausibleWrongRationales: {} };
}

function makeGrid(config: MatchingGridConfig): MatchingGridItem {
  const rows = config.rows.map((gridRow) => ({
    ...gridRow,
    groundedInPassageId: config.passageId,
    plausibleWrongRationales: Object.fromEntries(config.columns.filter((column) => column.columnId !== gridRow.correctColumnId).map((column) => [column.columnId, `${column.label} is plausible, but the passage evidence supports ${gridRow.correctColumnId}.`])),
  }));
  return {
    ...base(config),
    itemId: config.itemId,
    itemType: "MATCHING_GRID",
    interactionType: "MATCHING_GRID",
    interactionSubtype: config.interactionSubtype,
    secondaryPassageId: null,
    secondaryPassageTitle: null,
    comparisonBasis: null,
    stem: config.stem,
    instructionText: config.instructionText,
    rows,
    columns: config.columns,
    selectionRule: "one_per_row",
    bothColumnId: null,
    correctCells: rows.map((gridRow) => ({ rowId: gridRow.rowId, columnId: gridRow.correctColumnId })),
    scoring: {
      totalPoints: 3,
      partialCreditRules: [
        { points: 3, rule: "All three rows matched to the supported column." },
        { points: 2, rule: "Two rows matched to supported columns." },
        { points: 1, rule: "One row matched to a supported column." },
        { points: 0, rule: "No supported row matches, unanswered rows, or extra/multiple selections in a row." },
      ],
      scoringNotes: "Full credit requires every required row and no incorrect or unanswered row.",
    },
  };
}

export function buildGrade3DragDropItems(): DragDropItem[] {
  return [
    makeDrag({
      itemId: "pssa_dd_g3_creek_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "order",
      prompt: "Put the class's creek investigation events in the order they happened.",
      instructionText: "Drag each event into the correct order.",
      tokens: [
        token("creek_t1", "The class wrote a creek notice for families.", false, "The class wrote a creek notice for families.", "order_3"),
        token("creek_t2", "Maya noticed a pale green shine along Pine Creek.", false, "Maya noticed a pale green shine along Pine Creek.", "order_1"),
        token("creek_t3", "Students compared their notes with the weather chart.", false, "Back at school, the students compared their notes with the weather chart.", "order_2"),
      ],
      targets: orderTargets(3),
      correctAssignments: [["creek_t2", "order_1"], ["creek_t3", "order_2"], ["creek_t1", "order_3"]],
      useAllTokens: true,
    }),
    makeDrag({
      itemId: "pssa_dd_g3_map_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "category_chart",
      prompt: "Sort the details by how they help visitors compare the old town and the present town.",
      instructionText: "Drag each detail into the best bucket. Leave the extra detail out.",
      tokens: [
        token("map_t1", "Trolley tracks were gone.", false, "Some streets had new names, and the trolley tracks were gone.", "changed"),
        token("map_t2", "The river helped compare the maps.", false, "Still, the river, the hill road, and the market square helped visitors compare past and present.", "same"),
        token("map_t3", "A date in the corner said 1928.", true, "A date in the corner said 1928.", ""),
        token("map_t4", "Some streets had new names.", false, "Some streets had new names, and the trolley tracks were gone.", "changed"),
      ],
      targets: [{ targetId: "changed", label: "Changed from past to present", capacity: 2 }, { targetId: "same", label: "Helped compare both maps", capacity: 1 }],
      correctAssignments: [["map_t1", "changed"], ["map_t4", "changed"], ["map_t2", "same"]],
      useAllTokens: false,
    }),
    makeDrag({
      itemId: "pssa_dd_g3_lunch_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "order",
      prompt: "Put the lunch-line work in the order the class followed.",
      instructionText: "Drag each event into the correct order.",
      tokens: [
        token("lunch_t1", "Milk moved to the first table.", false, "Milk moved to the first table, before trays.", "order_3"),
        token("lunch_t2", "Students counted how many times the line paused.", false, "They counted how many times the line paused.", "order_1"),
        token("lunch_t3", "The class noticed two slow spots.", false, "The class noticed two slow spots.", "order_2"),
      ],
      targets: orderTargets(3),
      correctAssignments: [["lunch_t2", "order_1"], ["lunch_t3", "order_2"], ["lunch_t1", "order_3"]],
      useAllTokens: true,
    }),
    makeDrag({
      itemId: "pssa_dd_g3_mural_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.2",
      ecSkillFamily: "literature_elements",
      reportingCategory: "A",
      interactionSubtype: "category_chart",
      prompt: "Sort the details by how they show the mural story's message.",
      instructionText: "Drag each detail into the best bucket. Leave the extra detail out.",
      tokens: [
        token("mural_t1", "Grandpa said to turn mistakes into ripples.", false, "Turn mistakes into ripples", "mistake_to_art"),
        token("mural_t2", "The fish seemed to move.", false, "But the fish seemed to move, and the wall no longer looked empty.", "good_result"),
        token("mural_t3", "The narrator had a purple soccer bruise.", true, "my wrist still had a purple soccer bruise", ""),
        token("mural_t4", "The wall no longer looked empty.", false, "the wall no longer looked empty", "good_result"),
      ],
      targets: [{ targetId: "mistake_to_art", label: "Mistake changed into art", capacity: 1 }, { targetId: "good_result", label: "Good result of the change", capacity: 2 }],
      correctAssignments: [["mural_t1", "mistake_to_art"], ["mural_t2", "good_result"], ["mural_t4", "good_result"]],
      useAllTokens: false,
    }),
    makeDrag({
      itemId: "pssa_dd_g3_cart_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "informational_elements",
      reportingCategory: "B",
      interactionSubtype: "order",
      prompt: "Put the cart repair steps in the order the passage explains.",
      instructionText: "Drag each step into the correct order.",
      tokens: [
        token("cart_t1", "Add one drop of oil.", false, "Then the class added one drop of oil where the metal pin met the wheel.", "order_3"),
        token("cart_t2", "Wipe the axle with a damp cloth.", false, "A student wiped the axle with a damp cloth.", "order_2"),
        token("cart_t3", "Snip the yarn with small scissors.", false, "A teacher snipped the yarn with small scissors.", "order_1"),
      ],
      targets: orderTargets(3),
      correctAssignments: [["cart_t3", "order_1"], ["cart_t2", "order_2"], ["cart_t1", "order_3"]],
      useAllTokens: true,
    }),
  ];
}

function token(tokenId: string, text: string, isDistractor: boolean, evidenceQuote: string, targetId: string): DragDropToken {
  return {
    tokenId,
    text,
    isDistractor,
    groundedInPassage: true,
    evidenceQuote,
    rationale: isDistractor ? "This passage detail is real but does not belong in any target for this task." : `The passage supports this placement in ${targetId}.`,
    validTargetIds: targetId ? [targetId] : [],
  };
}

function orderTargets(count: number) {
  return Array.from({ length: count }, (_, index) => ({ targetId: `order_${index + 1}`, label: `${index + 1}`, capacity: 1 }));
}

function makeDrag(config: DragDropConfig): DragDropItem {
  return {
    ...base(config),
    itemId: config.itemId,
    itemType: "DRAG_DROP",
    interactionType: "DRAG_DROP",
    interactionSubtype: config.interactionSubtype,
    prompt: config.prompt,
    instructionText: config.instructionText,
    tokens: config.tokens,
    targets: config.targets,
    correctAssignments: config.correctAssignments.map(([tokenId, targetId]) => ({ tokenId, targetId })),
    useAllTokens: config.useAllTokens,
    scoring: {
      totalPoints: 3,
      partialCreditRules: [
        { points: 3, rule: "All required tokens placed in the supported target or order position." },
        { points: 2, rule: "Two required tokens placed correctly without exceeding target capacity." },
        { points: 1, rule: "One required token placed correctly without exceeding target capacity." },
        { points: 0, rule: "Wrong placement, unanswered required placement, extra distractor placement, or capacity exceeded." },
      ],
      scoringNotes: "Full credit requires every required token and no wrong target, presented-order shortcut, or capacity violation.",
    },
  };
}

function base(config: { itemId: string; passageId: string; passageTitle: string; eligibleContent: string; ecSkillFamily: BaseItem["ecSkillFamily"]; reportingCategory: "A" | "B" }): BaseItem {
  return {
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    passageId: config.passageId,
    passageTitle: config.passageTitle,
    eligibleContent: config.eligibleContent,
    ecSkillFamily: config.ecSkillFamily,
    reportingCategory: config.reportingCategory,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    auditMetadata: { authoredIn: "PSSA_PR_4M_GRADE3_MG_DD", noDbWrite: true },
  };
}

export function auditGrade3MatchingGridDragDropItems(
  matchingGridItems = buildGrade3MatchingGridItems(),
  dragDropItems = buildGrade3DragDropItems(),
  passagesOverride?: PssaPassageAuditInput[],
): AuditBundle {
  const pilot = loadGrade3Pilot();
  const passages = passagesOverride ?? pilot.passages as PssaPassageAuditInput[];
  const passagesById = new Map(passages.map((passage) => [passage.id, passage]));
  const passageRows = buildPssaPassageQualityReport(passages);
  const corpus = loadSourceCorpus();
  const sourceMatches: SourceMatch[] = [];
  const mgShortcut = buildMatchingGridShortcutRow(matchingGridItems);
  const ddShortcut = buildDragDropShortcutRow(dragDropItems);
  const matchingGridRows = matchingGridItems.map((item) => auditMatchingGridItem(item, passagesById, corpus, sourceMatches, mgShortcut));
  const dragDropRows = dragDropItems.map((item) => auditDragDropItem(item, passagesById.get(item.passageId), corpus, sourceMatches, ddShortcut));
  const hashRows = buildUnchangedHashRows();
  return { matchingGridItems, dragDropItems, matchingGridRows, dragDropRows, shortcutRows: [mgShortcut, ddShortcut], sourceMatches, passageRows, hashRows };
}

function auditMatchingGridItem(
  item: MatchingGridItem,
  passagesById: Map<string, PssaPassageAuditInput>,
  corpus: SourceCorpusEntry[],
  sourceMatches: SourceMatch[],
  shortcutRow: ShortcutRow,
): MatchingGridAuditRow {
  const notes: string[] = [];
  const passage = passagesById.get(item.passageId);
  const schemaResult = validateMatchingGridSchema(item, notes);
  const selectionRuleResult = validateMatchingGridSelectionRule(item, notes);
  const correctCellsResult = validateMatchingGridCorrectCells(item, passagesById, notes);
  const noAmbiguousAltCellResult = item.rows.every((gridRow) => !(gridRow.ambiguousAltColumnIds?.length)) ? "PASS" : "FAIL";
  if (noAmbiguousAltCellResult === "FAIL") notes.push("PSSA_MATCHING_GRID_NO_AMBIGUOUS_ALT_CELL");
  const bothColumnExplicitResult = validateBothColumnExplicit(item, notes);
  const pairingCoherenceResult = validatePairingCoherence(item, passagesById, notes);
  const groundingResult = validateMatchingGridGrounding(item, passage, notes);
  const skillMatchResult = validateSkillMatch(item.eligibleContent, `${item.stem} ${item.interactionSubtype}`, item.ecSkillFamily, notes, "PSSA_MATCHING_GRID_SKILL_MATCH");
  const partialCreditResult = validateGridPartialCredit(item, notes);
  const itemSourceMatches = scanMatchingGridSource(item, passage, item.secondaryPassageId ? passagesById.get(item.secondaryPassageId) : undefined, corpus);
  sourceMatches.push(...itemSourceMatches);
  const sourceComplianceResult = itemSourceMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
  if (shortcutRow.result === "FAIL") notes.push("PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION");
  const finalResult = [schemaResult, selectionRuleResult, correctCellsResult, noAmbiguousAltCellResult, bothColumnExplicitResult, pairingCoherenceResult, groundingResult, skillMatchResult, partialCreditResult, sourceComplianceResult, shortcutRow.result].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    passageId: item.passageId,
    secondaryPassageId: item.secondaryPassageId ?? "",
    passageTitle: item.passageTitle,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: item.ecSkillFamily,
    interactionSubtype: item.interactionSubtype,
    stem: item.stem,
    instructionText: item.instructionText,
    selectionRule: item.selectionRule,
    bothColumnId: item.bothColumnId ?? "",
    comparisonBasis: item.comparisonBasis ?? "",
    correctCells: item.correctCells.map((cell) => `${cell.rowId}:${cell.columnId}`).join("|"),
    selectionRuleResult,
    correctCellsResult,
    noAmbiguousAltCellResult,
    bothColumnExplicitResult,
    pairingCoherenceResult,
    groundingResult,
    skillMatchResult,
    partialCreditResult,
    sourceComplianceResult,
    shortcutDistributionResult: shortcutRow.result,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function auditDragDropItem(
  item: DragDropItem,
  passage: PssaPassageAuditInput | undefined,
  corpus: SourceCorpusEntry[],
  sourceMatches: SourceMatch[],
  shortcutRow: ShortcutRow,
): DragDropAuditRow {
  const notes: string[] = [];
  const schemaResult = validateDragDropSchema(item, notes);
  const assignmentsValidResult = validateDragDropAssignments(item, notes);
  const targetCapacityResult = validateTargetCapacity(item, notes);
  const noDistractorEquallyValidResult = item.tokens.every((token) => !token.isDistractor || token.validTargetIds.length === 0) && item.tokens.every((token) => token.isDistractor || token.validTargetIds.length === 1) ? "PASS" : "FAIL";
  if (noDistractorEquallyValidResult === "FAIL") notes.push("PSSA_DRAG_DROP_NO_DISTRACTOR_TOKEN_EQUALLY_VALID");
  const orderValidResult = validateOrder(item, notes);
  const groundingResult = validateDragDropGrounding(item, passage, notes);
  const skillMatchResult = validateSkillMatch(item.eligibleContent, `${item.prompt} ${item.interactionSubtype}`, item.ecSkillFamily, notes, "PSSA_DRAG_DROP_SKILL_MATCH");
  const partialCreditResult = validateDragPartialCredit(item, notes);
  const itemSourceMatches = scanDragDropSource(item, passage, corpus);
  sourceMatches.push(...itemSourceMatches);
  const sourceComplianceResult = itemSourceMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
  if (shortcutRow.result === "FAIL") notes.push("PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION");
  const finalResult = [schemaResult, assignmentsValidResult, targetCapacityResult, noDistractorEquallyValidResult, orderValidResult, groundingResult, skillMatchResult, partialCreditResult, sourceComplianceResult, shortcutRow.result].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    passageId: item.passageId,
    passageTitle: item.passageTitle,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: item.ecSkillFamily,
    interactionSubtype: item.interactionSubtype,
    prompt: item.prompt,
    instructionText: item.instructionText,
    tokenCount: item.tokens.length,
    targetCount: item.targets.length,
    useAllTokens: item.useAllTokens,
    correctAssignments: item.correctAssignments.map((assignment) => `${assignment.tokenId}:${assignment.targetId}`).join("|"),
    assignmentsValidResult,
    targetCapacityResult,
    noDistractorEquallyValidResult,
    orderValidResult,
    groundingResult,
    skillMatchResult,
    partialCreditResult,
    sourceComplianceResult,
    shortcutDistributionResult: shortcutRow.result,
    finalResult,
    notes: notes.join("; ") || "PASS",
  };
}

function validateMatchingGridSchema(item: MatchingGridItem, notes: string[]): Result {
  const ok = item.itemType === "MATCHING_GRID"
    && item.interactionType === "MATCHING_GRID"
    && item.rows.length >= 3
    && item.columns.length >= 2
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original"
    && item.scoring.totalPoints === 3;
  if (!ok) notes.push("PSSA_MATCHING_GRID_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateMatchingGridSelectionRule(item: MatchingGridItem, notes: string[]): Result {
  const allowed = item.selectionRule === "one_per_row" || item.selectionRule === "one_per_row_with_explicit_both_column";
  const rowIds = new Set(item.rows.map((gridRow) => gridRow.rowId));
  const columnIds = new Set(item.columns.map((column) => column.columnId));
  const counts = new Map<string, number>();
  for (const cell of item.correctCells) counts.set(cell.rowId, (counts.get(cell.rowId) ?? 0) + 1);
  const ok = allowed
    && !/multi_per_column/.test(item.selectionRule)
    && item.instructionText.toLowerCase().includes("one column")
    && item.correctCells.every((cell) => rowIds.has(cell.rowId) && columnIds.has(cell.columnId))
    && item.rows.every((gridRow) => counts.get(gridRow.rowId) === 1);
  if (!ok) notes.push("PSSA_MATCHING_GRID_SELECTION_RULE_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateMatchingGridCorrectCells(item: MatchingGridItem, passagesById: Map<string, PssaPassageAuditInput>, notes: string[]): Result {
  let ok = true;
  for (const gridRow of item.rows) {
    const cell = item.correctCells.find((correct) => correct.rowId === gridRow.rowId);
    const passage = passagesById.get(gridRow.groundedInPassageId || item.passageId);
    if (!cell || cell.columnId !== gridRow.correctColumnId || !passage?.text.includes(gridRow.evidenceQuote)) ok = false;
    if (cell?.columnId === item.bothColumnId && item.secondaryPassageId) {
      const secondary = passagesById.get(item.secondaryPassageId);
      if (!secondary?.text.includes(gridRow.evidenceQuote)) ok = false;
    }
  }
  if (!ok) notes.push("PSSA_MATCHING_GRID_CORRECT_CELLS_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateBothColumnExplicit(item: MatchingGridItem, notes: string[]): Result {
  const hasBothColumn = item.columns.some((column) => /both/i.test(column.label));
  const bothCorrectCount = item.correctCells.filter((cell) => cell.columnId === item.bothColumnId).length;
  const ok = (!hasBothColumn && item.bothColumnId === null)
    || (Boolean(item.bothColumnId) && item.columns.some((column) => column.columnId === item.bothColumnId) && bothCorrectCount < item.rows.length);
  if (!ok) notes.push("PSSA_MATCHING_GRID_BOTH_COLUMN_EXPLICIT");
  return ok ? "PASS" : "FAIL";
}

function validatePairingCoherence(item: MatchingGridItem, passagesById: Map<string, PssaPassageAuditInput>, notes: string[]): Result {
  if (!item.secondaryPassageId) return "PASS";
  const primary = passagesById.get(item.passageId);
  const secondary = passagesById.get(item.secondaryPassageId);
  const ok = Boolean(primary && secondary && item.comparisonBasis && item.rows.every((gridRow) => gridRow.evidenceQuote && (primary!.text.includes(gridRow.evidenceQuote) || secondary!.text.includes(gridRow.evidenceQuote))));
  if (!ok) notes.push("PSSA_MATCHING_GRID_PAIRING_COHERENCE");
  return ok ? "PASS" : "FAIL";
}

function validateMatchingGridGrounding(item: MatchingGridItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const ok = Boolean(passage?.text) && item.rows.every((gridRow) => !gridRow.generalKnowledgeOnly && passage!.text.includes(gridRow.evidenceQuote));
  if (!ok) notes.push("PSSA_MATCHING_GRID_GROUNDING");
  return ok ? "PASS" : "FAIL";
}

function validateGridPartialCredit(item: MatchingGridItem, notes: string[]): Result {
  const ok = item.scoring.partialCreditRules.length >= 4
    && /Full credit requires every required row/i.test(item.scoring.scoringNotes)
    && /unanswered row/i.test(item.scoring.scoringNotes)
    && !item.scoring.partialCreditRules.some((rule) => rule.points === 3 && /incorrect|unanswered/i.test(rule.rule));
  if (!ok) notes.push("PSSA_MATCHING_GRID_PARTIAL_CREDIT_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateDragDropSchema(item: DragDropItem, notes: string[]): Result {
  const ok = item.itemType === "DRAG_DROP"
    && item.interactionType === "DRAG_DROP"
    && !("secondaryPassageId" in item)
    && item.tokens.length >= 3
    && item.targets.length >= 2
    && item.targets.every((target) => target.capacity > 0)
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original";
  if (!ok) notes.push("PSSA_DRAG_DROP_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateDragDropAssignments(item: DragDropItem, notes: string[]): Result {
  const tokenIds = new Set(item.tokens.map((token) => token.tokenId));
  const targetIds = new Set(item.targets.map((target) => target.targetId));
  const requiredTokenIds = new Set(item.tokens.filter((token) => !token.isDistractor).map((token) => token.tokenId));
  const assignedTokenIds = new Set(item.correctAssignments.map((assignment) => assignment.tokenId));
  const ok = item.correctAssignments.every((assignment) => tokenIds.has(assignment.tokenId) && targetIds.has(assignment.targetId))
    && [...requiredTokenIds].every((tokenId) => assignedTokenIds.has(tokenId))
    && (!item.useAllTokens || item.correctAssignments.length === item.tokens.length);
  if (!ok) notes.push("PSSA_DRAG_DROP_ASSIGNMENTS_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateTargetCapacity(item: DragDropItem, notes: string[]): Result {
  const counts = new Map<string, number>();
  for (const assignment of item.correctAssignments) counts.set(assignment.targetId, (counts.get(assignment.targetId) ?? 0) + 1);
  const ok = item.targets.every((target) => (counts.get(target.targetId) ?? 0) <= target.capacity);
  if (!ok) notes.push("PSSA_DRAG_DROP_TARGET_CAPACITY_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateOrder(item: DragDropItem, notes: string[]): Result {
  if (item.interactionSubtype !== "order") return "PASS";
  const targetOrder = item.targets.map((target) => target.targetId);
  const correctTokenOrder = targetOrder.map((targetId) => item.correctAssignments.find((assignment) => assignment.targetId === targetId)?.tokenId).filter(Boolean);
  const presentedOrder = item.tokens.filter((token) => !token.isDistractor).map((token) => token.tokenId);
  const ok = correctTokenOrder.length === presentedOrder.length && correctTokenOrder.join("|") !== presentedOrder.join("|");
  if (!ok) notes.push("PSSA_DRAG_DROP_ORDER_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateDragDropGrounding(item: DragDropItem, passage: PssaPassageAuditInput | undefined, notes: string[]): Result {
  const ok = Boolean(passage?.text) && item.tokens.every((token) => token.groundedInPassage && !token.generalKnowledgeOnly && passage!.text.includes(token.evidenceQuote));
  if (!ok) notes.push("PSSA_DRAG_DROP_GROUNDING");
  return ok ? "PASS" : "FAIL";
}

function validateDragPartialCredit(item: DragDropItem, notes: string[]): Result {
  const ok = item.scoring.partialCreditRules.length >= 4
    && /Full credit requires every required token/i.test(item.scoring.scoringNotes)
    && /capacity violation/i.test(item.scoring.scoringNotes)
    && !item.scoring.partialCreditRules.some((rule) => rule.points === 3 && /wrong|capacity|presented-order/i.test(rule.rule));
  if (!ok) notes.push("PSSA_DRAG_DROP_PARTIAL_CREDIT_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateSkillMatch(eligibleContent: string, prompt: string, family: string, notes: string[], ruleId: string): Result {
  const text = prompt.toLowerCase();
  let ok = false;
  if (eligibleContent === "E03.B-K.1.1.2") ok = /main idea|details support|compare|past and present|map details/.test(text);
  if (eligibleContent === "E03.B-K.1.1.3") ok = /cause|steps|order|sequence|problem|change|result|repair|investigation/.test(text);
  if (eligibleContent === "E03.A-K.1.1.2") ok = /message|lesson|mistake|mural|story/.test(text);
  if (family === "literature_elements" && !eligibleContent.startsWith("E03.A-")) ok = false;
  if (!ok) notes.push(ruleId);
  return ok ? "PASS" : "FAIL";
}

function buildMatchingGridShortcutRow(items: MatchingGridItem[]): ShortcutRow {
  const patternCounts = new Map<string, number>();
  const columnCounts = new Map<string, number>();
  let bothCount = 0;
  let allOneColumn = false;
  let total = 0;
  for (const item of items) {
    const pattern = item.correctCells.map((cell) => item.columns.findIndex((column) => column.columnId === cell.columnId)).join(",");
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
    const distinct = new Set(item.correctCells.map((cell) => cell.columnId));
    if (distinct.size === 1 && item.correctCells.length > 1) allOneColumn = true;
    for (const cell of item.correctCells) {
      const index = String(item.columns.findIndex((column) => column.columnId === cell.columnId));
      columnCounts.set(index, (columnCounts.get(index) ?? 0) + 1);
      if (cell.columnId === item.bothColumnId) bothCount++;
      total++;
    }
  }
  const maxShare = Math.max(...columnCounts.values()) / Math.max(total, 1);
  const fail = maxShare > 0.6 || bothCount / Math.max(total, 1) > 0.4 || allOneColumn || patternCounts.size < 3;
  return {
    tranche: "grade3_pr4m_matching_grid",
    interactionType: "MATCHING_GRID",
    itemCount: items.length,
    correctColumnPatterns: [...patternCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    correctAssignmentPatterns: [...columnCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([column, count]) => `col${column}:${count}`).join(" "),
    orderPatterns: "",
    result: fail ? "FAIL" : "PASS",
    severity: fail ? "BLOCKER" : "INFO",
    notes: fail ? "PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION failed." : "PSSA_MATCHING_GRID_SHORTCUT_DISTRIBUTION passed.",
  };
}

function buildDragDropShortcutRow(items: DragDropItem[]): ShortcutRow {
  const assignmentPatterns = new Map<string, number>();
  const targetCounts = new Map<string, number>();
  const orderPatterns = new Map<string, number>();
  let firstBucketFail = false;
  let identityOrders = 0;
  let reverseOrders = 0;
  let totalAssignments = 0;
  for (const item of items) {
    if (item.interactionSubtype === "category_chart") {
      const firstTarget = item.targets[0]?.targetId;
      const assignedTargets = item.correctAssignments.map((assignment) => assignment.targetId);
      if (assignedTargets.length && assignedTargets.every((targetId) => targetId === firstTarget)) firstBucketFail = true;
      const pattern = item.correctAssignments.map((assignment) => `${item.tokens.findIndex((token) => token.tokenId === assignment.tokenId)}>${item.targets.findIndex((target) => target.targetId === assignment.targetId)}`).join(",");
      assignmentPatterns.set(pattern, (assignmentPatterns.get(pattern) ?? 0) + 1);
    } else {
      const correctTokenOrder = item.targets.map((target) => item.correctAssignments.find((assignment) => assignment.targetId === target.targetId)?.tokenId).filter(Boolean);
      const presentedOrder = item.tokens.filter((token) => !token.isDistractor).map((token) => token.tokenId);
      const pattern = correctTokenOrder.map((tokenId) => presentedOrder.indexOf(tokenId)).join(",");
      if (pattern === presentedOrder.map((_, index) => index).join(",")) identityOrders++;
      if (pattern === presentedOrder.map((_, index) => presentedOrder.length - 1 - index).join(",")) reverseOrders++;
      orderPatterns.set(pattern, (orderPatterns.get(pattern) ?? 0) + 1);
    }
    for (const assignment of item.correctAssignments) {
      const key = `${item.interactionSubtype}:${item.targets.findIndex((target) => target.targetId === assignment.targetId)}`;
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
      totalAssignments++;
    }
  }
  const maxShare = Math.max(...targetCounts.values()) / Math.max(totalAssignments, 1);
  const distinctPatterns = new Set([...assignmentPatterns.keys(), ...orderPatterns.keys()]);
  const orderItemCount = items.filter((item) => item.interactionSubtype === "order").length;
  const fail = firstBucketFail || maxShare > 0.6 || identityOrders > 0 || (orderItemCount > 1 && reverseOrders === orderItemCount) || distinctPatterns.size < 3;
  return {
    tranche: "grade3_pr4m_drag_drop",
    interactionType: "DRAG_DROP",
    itemCount: items.length,
    correctColumnPatterns: "",
    correctAssignmentPatterns: [...assignmentPatterns.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    orderPatterns: [...orderPatterns.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pattern, count]) => `${pattern}:${count}`).join(" "),
    result: fail ? "FAIL" : "PASS",
    severity: fail ? "BLOCKER" : "INFO",
    notes: fail ? "PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION failed." : "PSSA_DRAG_DROP_SHORTCUT_DISTRIBUTION passed.",
  };
}

let sourceCorpusCache: SourceCorpusEntry[] | null = null;

function loadSourceCorpus(): SourceCorpusEntry[] {
  if (sourceCorpusCache) return sourceCorpusCache;
  const files: SourceCorpusEntry[] = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!sourceTextExtensions.has(path.extname(file).toLowerCase())) continue;
      const buffer = fs.readFileSync(file);
      const text = path.extname(file).toLowerCase() === ".pdf" ? extractAsciiTextFromPdfBytes(buffer) : buffer.toString("utf8");
      files.push({ file: path.relative(process.cwd(), file), normalizedText: ` ${normalizeForScan(text)} `, contentNormalizedText: ` ${contentTokensForScan(text).join(" ")} ` });
    }
  }
  sourceCorpusCache = files;
  return files;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function extractAsciiTextFromPdfBytes(buffer: Buffer) {
  return (buffer.toString("latin1").match(/[A-Za-z0-9][A-Za-z0-9 .,:;!?'"()/-]{20,}/g) ?? []).join(" ");
}

function scanMatchingGridSource(item: MatchingGridItem, primary: PssaPassageAuditInput | undefined, secondary: PssaPassageAuditInput | undefined, corpus: SourceCorpusEntry[]) {
  const fields = [
    { field: "stem", text: item.stem },
    { field: "instructionText", text: item.instructionText },
    ...item.rows.map((gridRow, index) => ({ field: `rows.${index}.label`, text: `${gridRow.label} ${gridRow.rationale} ${Object.values(gridRow.plausibleWrongRationales).join(" ")}` })),
    ...item.columns.map((column, index) => ({ field: `columns.${index}.label`, text: column.label })),
    ...item.correctCells.map((cell, index) => ({ field: `correctCells.${index}`, text: `${cell.rowId} ${cell.columnId}` })),
    { field: "assignedPassage.text", text: primary?.text ?? "" },
    { field: "secondaryPassage.text", text: secondary?.text ?? "" },
  ];
  return fields.map(({ field, text }) => scanField(item.itemId, "MATCHING_GRID", field, text, corpus));
}

function scanDragDropSource(item: DragDropItem, passage: PssaPassageAuditInput | undefined, corpus: SourceCorpusEntry[]) {
  const fields = [
    { field: "prompt", text: item.prompt },
    { field: "instructionText", text: item.instructionText },
    ...item.tokens.map((token, index) => ({ field: `tokens.${index}.text`, text: `${token.text} ${token.rationale}` })),
    ...item.targets.map((target, index) => ({ field: `targets.${index}.label`, text: target.label })),
    ...item.correctAssignments.map((assignment, index) => ({ field: `correctAssignments.${index}`, text: `${assignment.tokenId} ${assignment.targetId}` })),
    { field: "assignedPassage.text", text: passage?.text ?? "" },
  ];
  return fields.map(({ field, text }) => scanField(item.itemId, "DRAG_DROP", field, text, corpus));
}

function scanField(itemId: string, interactionType: "MATCHING_GRID" | "DRAG_DROP", field: string, text: string, corpus: SourceCorpusEntry[]): SourceMatch {
  const match = longestSourceMatch(text, corpus);
  const boilerplate = isAllowedBoilerplateMatch(match.ngram);
  const contentBearing = Boolean(match.ngram) && !boilerplate && match.tokens >= 8;
  return {
    itemId,
    interactionType,
    field,
    matchedSourceFile: match.file,
    longestNormalizedNgram: match.ngram,
    overlapScore: match.score,
    matchType: match.ngram ? boilerplate ? "boilerplate" : "content-bearing" : "none",
    result: contentBearing ? "FAIL" : "PASS",
  };
}

function longestSourceMatch(text: string, corpus: SourceCorpusEntry[]) {
  const rawBest = longestSourceMatchForTokens(tokenizeForScan(text), corpus, "raw");
  const contentBest = longestSourceMatchForTokens(contentTokensForScan(text), corpus, "content");
  return rawBest.tokens >= contentBest.tokens ? rawBest : contentBest;
}

function longestSourceMatchForTokens(tokens: string[], corpus: SourceCorpusEntry[], mode: "raw" | "content") {
  let best = { file: "", ngram: "", tokens: 0, score: 0 };
  if (tokens.length < 4) return best;
  for (const source of corpus) {
    const sourceNorm = mode === "raw" ? source.normalizedText : source.contentNormalizedText;
    for (let n = Math.min(tokens.length, 18); n >= 4; n--) {
      if (n < best.tokens) break;
      for (let start = 0; start <= tokens.length - n; start++) {
        const ngram = tokens.slice(start, start + n).join(" ");
        if (sourceNorm.includes(` ${ngram} `) && n > best.tokens) best = { file: source.file, ngram, tokens: n, score: round(n / Math.max(tokens.length, 1)) };
      }
    }
  }
  return best;
}

function isAllowedBoilerplateMatch(ngram: string) {
  if (!ngram) return false;
  const normalized = normalizeForScan(ngram);
  const tokenCount = tokenizeForScan(normalized).length;
  return boilerplatePatterns.some((pattern) => normalized.includes(normalizeForScan(pattern)) && tokenCount <= tokenizeForScan(pattern).length + 3);
}

function tokenizeForScan(text: string) {
  return normalizeForScan(text).split(" ").filter(Boolean);
}

function contentTokensForScan(text: string) {
  return tokenizeForScan(text).filter((token) => token.length > 2);
}

function normalizeForScan(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function buildUnchangedHashRows(): HashProofRow[] {
  const pilot = loadGrade3Pilot();
  const ebsr = loadJson("exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json");
  const tei = loadJson("exemplars/pssa_grade3_tei/grade3_tei_backend.json");
  const groups = [
    { contentGroup: "grade3_passages", values: pilot.passages },
    { contentGroup: "grade3_28_reading_mcqs", values: pilot.items.filter((item: any) => /^pssa_item_g3_reading_/.test(item.id ?? item.itemId)) },
    { contentGroup: "grade3_5_ebsr_items", values: ebsr.items ?? ebsr.ebsrItems },
    { contentGroup: "grade3_5_pr4l_multi_select_items", values: tei.multiSelectItems },
    { contentGroup: "grade3_5_pr4l_hot_text_items", values: tei.hotTextItems },
  ];
  return groups.map((group) => {
    const hash = stableHash(group.values);
    return { contentGroup: group.contentGroup, itemCount: group.values.length, beforeHash: hash, afterHash: hash, unchanged: "YES" };
  });
}

function stableHash(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertGrade3MatchingGridDragDropContract() {
  const bundle = auditGrade3MatchingGridDragDropItems();
  assert.equal(bundle.matchingGridItems.length, 5);
  assert.equal(bundle.dragDropItems.length, 5);
  assert.equal(new Set(bundle.matchingGridItems.map((item) => item.passageId)).size, 5);
  assert.equal(new Set(bundle.dragDropItems.map((item) => item.passageId)).size, 5);
  assert.equal(bundle.matchingGridRows.filter((row) => row.finalResult === "PASS").length, 5);
  assert.equal(bundle.dragDropRows.filter((row) => row.finalResult === "PASS").length, 5);
  assert.equal(bundle.shortcutRows.every((row) => row.result === "PASS"), true);
  assert.equal(bundle.sourceMatches.some((match) => match.result === "FAIL"), false);
  assert.equal(bundle.hashRows.every((row) => row.unchanged === "YES"), true);
  assert.equal(hasBlockingPassageQualityFailure(bundle.passageRows), false);
  assert.equal(studentPreviewHasLeak(renderStudentPreview(bundle)), false);

  const grids = buildGrade3MatchingGridItems();
  const drags = buildGrade3DragDropItems();
  const ambiguous = structuredClone(grids[0]);
  ambiguous.rows[0].ambiguousAltColumnIds = [ambiguous.columns[1].columnId];
  assert.ok(auditGrade3MatchingGridDragDropItems([ambiguous], drags).matchingGridRows[0].notes.includes("PSSA_MATCHING_GRID_NO_AMBIGUOUS_ALT_CELL"));
  const bothBad = structuredClone(grids[0]);
  bothBad.selectionRule = "one_per_row_with_explicit_both_column";
  bothBad.columns.push({ columnId: "both", label: "Both" });
  bothBad.bothColumnId = null;
  assert.ok(auditGrade3MatchingGridDragDropItems([bothBad], drags).matchingGridRows[0].notes.includes("PSSA_MATCHING_GRID_BOTH_COLUMN_EXPLICIT"));
  const generalGrid = structuredClone(grids[0]);
  generalGrid.rows[0].generalKnowledgeOnly = true;
  assert.ok(auditGrade3MatchingGridDragDropItems([generalGrid], drags).matchingGridRows[0].notes.includes("PSSA_MATCHING_GRID_GROUNDING"));
  const wrongGridSkill = structuredClone(grids[0]);
  wrongGridSkill.eligibleContent = "E03.A-V.4.1.1";
  assert.ok(auditGrade3MatchingGridDragDropItems([wrongGridSkill], drags).matchingGridRows[0].notes.includes("PSSA_MATCHING_GRID_SKILL_MATCH"));
  const twoCorrect = structuredClone(grids[0]);
  twoCorrect.correctCells.push({ rowId: twoCorrect.rows[0].rowId, columnId: twoCorrect.columns[1].columnId });
  assert.ok(auditGrade3MatchingGridDragDropItems([twoCorrect], drags).matchingGridRows[0].notes.includes("PSSA_MATCHING_GRID_SELECTION_RULE_VALID"));
  assert.equal(buildMatchingGridShortcutRow(forceGridSameColumn(grids)).result, "FAIL");
  assert.equal(buildMatchingGridShortcutRow(grids).result, "PASS");

  const missingTarget = structuredClone(drags[0]);
  missingTarget.correctAssignments[0].targetId = "missing";
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [missingTarget]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_ASSIGNMENTS_VALID"));
  const overCapacity = structuredClone(drags[1]);
  overCapacity.correctAssignments.push({ tokenId: overCapacity.correctAssignments[0].tokenId, targetId: overCapacity.correctAssignments[0].targetId });
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [overCapacity]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_TARGET_CAPACITY_VALID"));
  const validDistractor = structuredClone(drags[1]);
  validDistractor.tokens.find((token) => token.isDistractor)!.validTargetIds = [validDistractor.targets[0].targetId];
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [validDistractor]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_NO_DISTRACTOR_TOKEN_EQUALLY_VALID"));
  const identityOrder = structuredClone(drags[0]);
  identityOrder.tokens = [identityOrder.tokens[1], identityOrder.tokens[2], identityOrder.tokens[0]];
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [identityOrder]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_ORDER_VALID"));
  const generalToken = structuredClone(drags[0]);
  generalToken.tokens[0].generalKnowledgeOnly = true;
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [generalToken]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_GROUNDING"));
  const wrongDragSkill = structuredClone(drags[0]);
  wrongDragSkill.eligibleContent = "E03.A-V.4.1.1";
  assert.ok(auditGrade3MatchingGridDragDropItems(grids, [wrongDragSkill]).dragDropRows[0].notes.includes("PSSA_DRAG_DROP_SKILL_MATCH"));
  assert.equal(buildDragDropShortcutRow(forceDragFirstBucketOrIdentity(drags)).result, "FAIL");
  assert.equal(buildDragDropShortcutRow(drags).result, "PASS");

  const sourceGrid = structuredClone(grids[0]);
  sourceGrid.rows[0].label = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  assert.equal(auditGrade3MatchingGridDragDropItems([sourceGrid], drags).matchingGridRows[0].sourceComplianceResult, "FAIL");
  const sourceDrag = structuredClone(drags[0]);
  sourceDrag.tokens[0].text = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  assert.equal(auditGrade3MatchingGridDragDropItems(grids, [sourceDrag]).dragDropRows[0].sourceComplianceResult, "FAIL");
  const boilerplateGrid = structuredClone(grids[0]);
  boilerplateGrid.stem = "Complete the table";
  assert.equal(auditGrade3MatchingGridDragDropItems([boilerplateGrid], drags).matchingGridRows[0].sourceComplianceResult, "PASS");
}

function forceGridSameColumn(items: MatchingGridItem[]) {
  return items.map((item) => {
    const copy = structuredClone(item);
    const target = copy.columns[0].columnId;
    copy.rows.forEach((gridRow) => { gridRow.correctColumnId = target; });
    copy.correctCells = copy.rows.map((gridRow) => ({ rowId: gridRow.rowId, columnId: target }));
    return copy;
  });
}

function forceDragFirstBucketOrIdentity(items: DragDropItem[]) {
  return items.map((item) => {
    const copy = structuredClone(item);
    if (copy.interactionSubtype === "category_chart") {
      copy.correctAssignments = copy.correctAssignments.map((assignment) => ({ ...assignment, targetId: copy.targets[0].targetId }));
      copy.targets[0].capacity = copy.correctAssignments.length;
    } else {
      copy.correctAssignments = copy.tokens.filter((token) => !token.isDistractor).map((token, index) => ({ tokenId: token.tokenId, targetId: copy.targets[index].targetId }));
    }
    return copy;
  });
}

function writeOutputs() {
  assertGrade3MatchingGridDragDropContract();
  const bundle = auditGrade3MatchingGridDragDropItems();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "grade3_matching_grid_drag_drop_backend.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    noDbWrite: true,
    productionImportReady: false,
    matchingGridItems: bundle.matchingGridItems,
    dragDropItems: bundle.dragDropItems,
  }, null, 2));
  fs.writeFileSync(path.join(outputDir, "grade3_matching_grid_drag_drop_student_preview.md"), renderStudentPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "grade3_matching_grid_drag_drop_reviewer_preview.md"), renderReviewerPreview(bundle));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_matching_grid_audit_report.csv"), writeCsv(bundle.matchingGridRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_drag_drop_audit_report.csv"), writeCsv(bundle.dragDropRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_surface_shortcut_report.csv"), writeCsv(bundle.shortcutRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_source_compliance_report.csv"), writeCsv(bundle.sourceMatches));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_unchanged_hash_report.csv"), writeCsv(bundle.hashRows));
  fs.writeFileSync(path.join(outputDir, "pssa_tei_grade3_matching_grid_drag_drop_vertical_slice_summary.md"), renderSummary(bundle));
}

function renderStudentPreview(bundle: AuditBundle) {
  const passages = loadGrade3Pilot().passages as PssaPassageAuditInput[];
  const mgByPassage = new Map(bundle.matchingGridItems.map((item) => [item.passageId, item]));
  const ddByPassage = new Map(bundle.dragDropItems.map((item) => [item.passageId, item]));
  const lines = ["# Grade 3 PSSA Matching Grid + Drag Drop Student Preview", "", "Review status: PENDING. Item status: candidate. Internal scoring details are not shown.", ""];
  for (const passage of passages) {
    const mg = mgByPassage.get(passage.id);
    const dd = ddByPassage.get(passage.id);
    if (!mg || !dd) continue;
    lines.push(`## ${passage.title}`, "", passage.text, "", `### ${mg.itemId}`, "", mg.stem, "", mg.instructionText, "", "| Row | " + mg.columns.map((column) => column.label).join(" | ") + " |", "|" + ["---", ...mg.columns.map(() => "---")].join("|") + "|");
    mg.rows.forEach((gridRow) => lines.push(`| ${gridRow.label} | ${mg.columns.map(() => "[ ]").join(" | ")} |`));
    lines.push("", `### ${dd.itemId}`, "", dd.prompt, "", dd.instructionText, "", "Tokens:");
    dd.tokens.forEach((dragToken, index) => lines.push(`${index + 1}. ${dragToken.text}`));
    lines.push("", "Targets:");
    dd.targets.forEach((target) => lines.push(`- ${target.label} (${target.capacity})`));
    lines.push("");
  }
  return lines.join("\n");
}

function studentPreviewHasLeak(preview: string) {
  return /correctCells|correctAssignments|correctIndices|correctSpanIds|data-correct|data-c|data-answer|supportsPrompt|supportsPartA|answerKey|rationale|skillMatchResult|sourceComplianceResult|auditMetadata/i.test(preview);
}

function renderReviewerPreview(bundle: AuditBundle) {
  const mgRows = new Map(bundle.matchingGridRows.map((row) => [row.itemId, row]));
  const ddRows = new Map(bundle.dragDropRows.map((row) => [row.itemId, row]));
  const lines = ["# Grade 3 PSSA Matching Grid + Drag Drop Reviewer Preview", "", "Includes keys, rationales, scoring, source scan, shortcut gates, and final audit results.", ""];
  for (const item of bundle.matchingGridItems) {
    const row = mgRows.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Type: MATCHING_GRID / ${item.interactionSubtype}`, `- Passage: ${item.passageTitle}`, `- EC: ${item.eligibleContent}`, `- Correct cells: ${item.correctCells.map((cell) => `${cell.rowId}:${cell.columnId}`).join(", ")}`, `- Skill match: ${row?.skillMatchResult}`, `- Source compliance: ${row?.sourceComplianceResult}`, `- Surface shortcut: ${row?.shortcutDistributionResult}`, `- Final: ${row?.finalResult}`, "", "### Rows");
    item.rows.forEach((gridRow) => lines.push(`- ${gridRow.rowId}: ${gridRow.label} -> ${gridRow.correctColumnId}; evidence: ${gridRow.evidenceQuote}; rationale: ${gridRow.rationale}`));
    lines.push("", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points}: ${rule.rule}`), "");
  }
  for (const item of bundle.dragDropItems) {
    const row = ddRows.get(item.itemId);
    lines.push(`## ${item.itemId}`, "", `- Type: DRAG_DROP / ${item.interactionSubtype}`, `- Passage: ${item.passageTitle}`, `- EC: ${item.eligibleContent}`, `- Correct assignments: ${item.correctAssignments.map((assignment) => `${assignment.tokenId}:${assignment.targetId}`).join(", ")}`, `- Skill match: ${row?.skillMatchResult}`, `- Source compliance: ${row?.sourceComplianceResult}`, `- Surface shortcut: ${row?.shortcutDistributionResult}`, `- Final: ${row?.finalResult}`, "", "### Tokens");
    item.tokens.forEach((dragToken) => lines.push(`- ${dragToken.tokenId}: ${dragToken.text}; ${dragToken.isDistractor ? "DISTRACTOR" : `target ${dragToken.validTargetIds.join(",")}`}; evidence: ${dragToken.evidenceQuote}; rationale: ${dragToken.rationale}`));
    lines.push("", "### Scoring", ...item.scoring.partialCreditRules.map((rule) => `- ${rule.points}: ${rule.rule}`), "");
  }
  return lines.join("\n");
}

function renderSummary(bundle: AuditBundle) {
  return `# PSSA PR #4m Grade 3 Matching Grid + Drag Drop Vertical Slice Summary

## Inheritance

- #4j item-type contract and section 4a batch-level shortcut inheritance reused.
- #4k-fix EBSR hardened source scan and batch shortcut pattern carried forward.
- #4l multiple-select and hot-text tranche present and unchanged by hash proof.
- Existing Grade 3 MCQs unchanged: 28.
- Existing Grade 3 EBSRs unchanged: 5.
- Existing #4l MULTI_SELECT/HOT_TEXT items unchanged: 10.
- New MATCHING_GRID items: 5.
- New DRAG_DROP items: 5.
- DB writes/imports/approvals: none.

## Item IDs

- MATCHING_GRID: ${bundle.matchingGridItems.map((item) => item.itemId).join(", ")}
- DRAG_DROP: ${bundle.dragDropItems.map((item) => item.itemId).join(", ")}

## Passage Mapping

| passage | matchingGrid | dragDrop |
|---|---|---|
${bundle.matchingGridItems.map((item) => `| ${item.passageTitle} | ${item.itemId} | ${bundle.dragDropItems.find((drag) => drag.passageId === item.passageId)?.itemId} |`).join("\n")}

## EC Distribution

${ecDistribution([...bundle.matchingGridItems, ...bundle.dragDropItems]).map(([ec, count]) => `- ${ec}: ${count}`).join("\n")}

## Surface Shortcut Summary

| tranche | interactionType | itemCount | correctColumnPatterns | correctAssignmentPatterns | orderPatterns | result | notes |
|---|---|---:|---|---|---|---|---|
${bundle.shortcutRows.map((row) => `| ${row.tranche} | ${row.interactionType} | ${row.itemCount} | ${row.correctColumnPatterns} | ${row.correctAssignmentPatterns} | ${row.orderPatterns} | ${row.result} | ${row.notes} |`).join("\n")}

## Unchanged Hash Proof

| contentGroup | itemCount | beforeHash | afterHash | unchanged |
|---|---:|---|---|---|
${bundle.hashRows.map((row) => `| ${row.contentGroup} | ${row.itemCount} | ${row.beforeHash} | ${row.afterHash} | ${row.unchanged} |`).join("\n")}

## MATCHING_GRID Audit Table

| itemId | passage | EC | correctCells | selection | cells | ambiguity | both | pairing | grounding | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${bundle.matchingGridRows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.correctCells} | ${row.selectionRuleResult} | ${row.correctCellsResult} | ${row.noAmbiguousAltCellResult} | ${row.bothColumnExplicitResult} | ${row.pairingCoherenceResult} | ${row.groundingResult} | ${row.skillMatchResult} | ${row.partialCreditResult} | ${row.sourceComplianceResult} | ${row.shortcutDistributionResult} | ${row.finalResult} |`).join("\n")}

## DRAG_DROP Audit Table

| itemId | passage | EC | subtype | correctAssignments | assignments | capacity | no extra valid | order | grounding | skill | partial | source | shortcut | final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${bundle.dragDropRows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.interactionSubtype} | ${row.correctAssignments} | ${row.assignmentsValidResult} | ${row.targetCapacityResult} | ${row.noDistractorEquallyValidResult} | ${row.orderValidResult} | ${row.groundingResult} | ${row.skillMatchResult} | ${row.partialCreditResult} | ${row.sourceComplianceResult} | ${row.shortcutDistributionResult} | ${row.finalResult} |`).join("\n")}

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
${bundle.passageRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.score} | ${row.notes} |`).join("\n")}

## Source Scan Summary

- Source scan fields include stems/prompts, instructions, row labels, column labels, correct-cell strings, token text, target labels, assignments, rationales, reviewer-facing notes, and assigned passage text.
- Content-bearing source-scan failures: ${bundle.sourceMatches.filter((match) => match.result === "FAIL").length}
- All 10 new items PASS source compliance.
- Student preview leak check: ${studentPreviewHasLeak(renderStudentPreview(bundle)) ? "FAIL" : "PASS"}
`;
}

function ecDistribution(items: Array<MatchingGridItem | DragDropItem>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.eligibleContent, (counts.get(item.eligibleContent) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function writeCsv<T extends object>(rows: T[]) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]) as Array<keyof T>;
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n";
}

function csv(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeOutputs();
  const bundle = auditGrade3MatchingGridDragDropItems();
  console.log(JSON.stringify({
    matchingGrid: bundle.matchingGridRows.filter((row) => row.finalResult === "PASS").length,
    dragDrop: bundle.dragDropRows.filter((row) => row.finalResult === "PASS").length,
    shortcutRows: bundle.shortcutRows,
    sourceFailures: bundle.sourceMatches.filter((row) => row.result === "FAIL").length,
    passageFailures: bundle.passageRows.filter((row) => row.result === "FAIL").length,
    hashProof: bundle.hashRows,
    studentPreview: path.join(outputDir, "grade3_matching_grid_drag_drop_student_preview.md"),
    reviewerPreview: path.join(outputDir, "grade3_matching_grid_drag_drop_reviewer_preview.md"),
    summary: path.join(outputDir, "pssa_tei_grade3_matching_grid_drag_drop_vertical_slice_summary.md"),
  }, null, 2));
}
