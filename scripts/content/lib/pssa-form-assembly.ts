import crypto from "node:crypto";

import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION, stableStringify } from "./pssa-import-plan";
import {
  computeStudentReadyBlockedReason,
  explainPssaPassageStudentReadiness,
  type PssaReadyItem,
  type PssaReadyPassage,
} from "./pssa-student-ready-selector";

export const GRADE3_BLUEPRINT = {
  blueprintVersion: "pde-ela-test-design-2025-g3-v1",
  module: "PSSA",
  subject: "ELA",
  gradeLevel: 3,
  totalPoints: 45,
  passages: 4,
  readingOnePointRange: { min: 19, max: 23 },
  conventionsOnePoint: 9,
  multipointItemsRange: { min: 3, max: 4 },
  shortAnswerItems: 2,
  shortAnswerPointsEach: 3,
  categoryPointRanges: {
    A: { min: 15, max: 21 },
    B: { min: 15, max: 21 },
    D: { min: 9, max: 9 },
  },
  maxReadingEcRepeats: 2,
  maxCorrectPositionShare: 0.4,
} as const;

export const GRADE3_DIAGNOSTIC_BLUEPRINT = {
  blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-v1",
  module: "PSSA",
  subject: "ELA",
  gradeLevel: 3,
  totalPoints: 45,
  passages: 4,
  readingOnePointRange: { min: 19, max: 23 },
  conventionsOnePoint: 9,
  multipointItemsRange: { min: 3, max: 4 },
  shortAnswerItems: 2,
  shortAnswerPointsEach: 3,
  categoryPointRanges: {
    A: { min: 15, max: 21 },
    B: { min: 15, max: 21 },
    D: { min: 9, max: 9 },
  },
  maxReadingEcRepeats: 3,
  maxCorrectPositionShare: 0.4,
  hasSections: true,
  sections: [
    { sectionIndex: 1, sectionType: "conventions_reading", label: "Section 1", estimatedMinutes: 60, conventionsCount: 5, readingPassages: 1, shortAnswers: 1 },
    { sectionIndex: 2, sectionType: "reading", label: "Section 2", estimatedMinutes: 35, conventionsCount: 0, readingPassages: 1, shortAnswers: 1 },
    { sectionIndex: 3, sectionType: "conventions_reading", label: "Section 3", estimatedMinutes: 60, conventionsCount: 4, readingPassages: 2, shortAnswers: 0 },
  ],
  maxSectionsPerDay: 2,
  untimed: true,
  sourcePool: "stamina",
} as const;

export const GRADE3_MOY_DIAGNOSTIC_BLUEPRINT = {
  blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-moy-v1",
  module: "PSSA",
  subject: "ELA",
  gradeLevel: 3,
  deliveredItems: 40,
  operational: { items: 35, points: 45 },
  analyticsOnly: { items: 5, points: 8 },
  deliveredPossiblePoints: 53,
  passageUnits: 4,
  rawPassages: 5,
  totalPoints: 45,
  conventionsOnePoint: 9,
  shortAnswerItems: 2,
  shortAnswerPointsEach: 3,
  operationalAnswerPositionEligibleItems: 29,
  operationalAnswerPositionDistribution: [8, 7, 7, 7],
  maxCorrectPositionShare: 0.4,
  maxOperationalReadingMcqEcRepeats: 2,
  maxDeliveredReadingMcqEcRepeats: 3,
  hasSections: true,
  sections: [
    { sectionIndex: 1, sectionType: "conventions_reading", label: "Section 1", estimatedMinutes: 55, conventionsCount: 5, readingPassages: 1, shortAnswers: 0, delivered: 12, operationalItems: 11, operationalPoints: 12, analyticsItems: 1, analyticsPoints: 1 },
    { sectionIndex: 2, sectionType: "reading", label: "Section 2", estimatedMinutes: 70, conventionsCount: 0, readingPassages: 2, shortAnswers: 1, delivered: 16, operationalItems: 13, operationalPoints: 18, analyticsItems: 3, analyticsPoints: 4 },
    { sectionIndex: 3, sectionType: "conventions_reading", label: "Section 3", estimatedMinutes: 50, conventionsCount: 4, readingPassages: 1, shortAnswers: 1, delivered: 12, operationalItems: 11, operationalPoints: 15, analyticsItems: 1, analyticsPoints: 3 },
  ],
  untimed: true,
  sourcePool: "moy",
} as const;

export const GRADE3_EOY_DIAGNOSTIC_BLUEPRINT = {
  blueprintVersion: "pde-ela-diagnostic-stamina-2025-g3-eoy-v1",
  module: "PSSA",
  subject: "ELA",
  gradeLevel: 3,
  deliveredItems: 45,
  operational: { items: 35, points: 45 },
  analyticsOnly: { items: 10, points: 16 },
  deliveredPossiblePoints: 61,
  passageUnits: 4,
  rawPassages: 5,
  totalPoints: 45,
  conventionsOnePoint: 9,
  shortAnswerItems: 2,
  shortAnswerPointsEach: 3,
  operationalAnswerPositionEligibleItems: 29,
  operationalAnswerPositionDistribution: [7, 8, 8, 6],
  maxCorrectPositionShare: 0.4,
  maxOperationalReadingMcqEcRepeats: 2,
  maxDeliveredReadingMcqEcRepeats: 3,
  hasSections: true,
  sections: [
    { sectionIndex: 1, sectionType: "conventions_reading", label: "Section 1", estimatedMinutes: 60, conventionsCount: 5, readingPassages: 1, shortAnswers: 0, delivered: 12, operationalItems: 11, operationalPoints: 12, analyticsItems: 1, analyticsPoints: 1 },
    { sectionIndex: 2, sectionType: "reading", label: "Section 2", estimatedMinutes: 80, conventionsCount: 0, readingPassages: 2, shortAnswers: 1, delivered: 18, operationalItems: 13, operationalPoints: 18, analyticsItems: 5, analyticsPoints: 7 },
    { sectionIndex: 3, sectionType: "conventions_reading", label: "Section 3", estimatedMinutes: 60, conventionsCount: 4, readingPassages: 1, shortAnswers: 1, delivered: 15, operationalItems: 11, operationalPoints: 15, analyticsItems: 4, analyticsPoints: 8 },
  ],
  untimed: true,
  sourcePool: "eoy",
} as const;

export type PssaFormSlotType = "reading_1pt" | "conventions_1pt" | "multipoint" | "short_answer";
export type PssaFormCategory = "A" | "B" | "D";
export type PssaScoringBucket = "operational" | "analytics_only";
export type GateStatus = "PASS" | "FAIL";

export type PssaAssemblyItem = PssaReadyItem & {
  module?: string | null;
  subject?: string | null;
  gradeLevel?: number | null;
  standardCode?: string | null;
  eligibleContent?: string | null;
  reportingCategory?: string | null;
  interactionType?: string | null;
  interactionSubtype?: string | null;
  correctResponseJson?: unknown;
  pointValue?: number | null;
  scoringBucket?: PssaScoringBucket | string | null;
};

export type PssaAssemblyPassage = PssaReadyPassage & {
  gradeLevel?: number | null;
  subject?: string | null;
};

export type ClassifiedAssemblyItem = {
  item: PssaAssemblyItem;
  itemId: string;
  category: PssaFormCategory;
  slotType: PssaFormSlotType;
  pointValue: number;
  primaryPassageId: string | null;
  scoringBucket: PssaScoringBucket;
  approvedContentHashSnapshot: string;
};

export type SelectedSection = {
  sectionIndex: number;
  sectionType: string;
  label: string;
  estimatedMinutes: number;
};

export type SelectedPassage = {
  position: number;
  passageId: string;
  sectionIndex?: number | null;
  passageUnitId?: string;
  categoryPoints: { A: number; B: number; D: number };
  approvedPassageContentHashSnapshot: string;
};

export type SelectedFormItem = {
  position: number;
  itemId: string;
  slotType: PssaFormSlotType;
  pointValue: number;
  category: PssaFormCategory;
  passageId: string | null;
  sectionIndex?: number | null;
  passageUnitId?: string | null;
  scoringBucket?: PssaScoringBucket;
  approvedContentHashSnapshot: string;
};

export type GateResult = {
  gate: string;
  status: GateStatus;
  detail: string;
};

export type DeficitRow = {
  slot: string;
  required: string;
  available: number;
  deficit: number;
  nearMissItemIds: string;
  nearMissBlockedReasons: string;
};

export type AssemblyResult = {
  ok: boolean;
  refusedReason: string | null;
  contentHash: string | null;
  canonical: Record<string, unknown> | null;
  sections?: SelectedSection[];
  passages: SelectedPassage[];
  items: SelectedFormItem[];
  categoryPoints: { A: number; B: number; D: number };
  totalPoints: number;
  gates: GateResult[];
  deficits: DeficitRow[];
};

function sha256(text: string) {
  return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;
}

function seededSortKey(seed: string, id: string) {
  return sha256(`${seed}:${id}`);
}

function deterministicSort<T extends { id?: string; itemId?: string; passageId?: string }>(seed: string, rows: T[]) {
  return [...rows].sort((a, b) => {
    const aId = a.id ?? a.itemId ?? a.passageId ?? "";
    const bId = b.id ?? b.itemId ?? b.passageId ?? "";
    return seededSortKey(seed, aId).localeCompare(seededSortKey(seed, bId)) || aId.localeCompare(bId);
  });
}

function scoringBucketOf(item: PssaAssemblyItem): PssaScoringBucket {
  return item.scoringBucket === "analytics_only" ? "analytics_only" : "operational";
}

function combinations<T>(rows: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (rows.length < size) return [];
  const [first, ...rest] = rows;
  return [...combinations(rest, size - 1).map((combo) => [first, ...combo]), ...combinations(rest, size)];
}

export function categoryFromEligibleContent(eligibleContent: string | null | undefined): PssaFormCategory | null {
  const match = String(eligibleContent ?? "").match(/^E\d{2}\.([ABD])(?:[.-]|$)/);
  return match ? (match[1] as PssaFormCategory) : null;
}

export function categoryFromReportingCategory(reportingCategory: string | null | undefined): PssaFormCategory | null {
  const text = String(reportingCategory ?? "").trim();
  if (!text) return null;
  const exact = text.match(/^([ABD])$/i);
  if (exact) return exact[1].toUpperCase() as PssaFormCategory;
  const labeled = text.match(/\b(?:category|reporting category)\s*([ABD])\b/i);
  if (labeled) return labeled[1].toUpperCase() as PssaFormCategory;
  return null;
}

export function primaryPassageId(item: PssaAssemblyItem): string | null {
  const links = item.passages ?? [];
  const first = links.find((link: any) => link?.role === "primary" || link?.role === "PRIMARY") ?? links[0];
  return first?.passage?.id ?? (first as any)?.passageId ?? null;
}

export function classifyAssemblyItem(item: PssaAssemblyItem): ClassifiedAssemblyItem | { error: string } {
  const ecCategory = categoryFromEligibleContent(item.eligibleContent);
  if (!ecCategory) return { error: `category_unresolved:${item.id}` };
  const reportingCategory = categoryFromReportingCategory(item.reportingCategory);
  if (reportingCategory && reportingCategory !== ecCategory) return { error: `category_mismatch:${item.id}:${ecCategory}_vs_${reportingCategory}` };
  const pointValue = Number(item.pointValue ?? 0);
  if (!Number.isInteger(pointValue) || pointValue <= 0) return { error: `invalid_point_value:${item.id}` };
  const interactionType = String(item.interactionType ?? "");
  const passageId = primaryPassageId(item);
  const slotType: PssaFormSlotType = interactionType === "SHORT_ANSWER"
    ? "short_answer"
    : ecCategory === "D"
      ? "conventions_1pt"
      : pointValue > 1
        ? "multipoint"
        : "reading_1pt";
  if (slotType === "conventions_1pt" && (pointValue !== 1 || passageId)) return { error: `invalid_conventions_slot:${item.id}` };
  if ((slotType === "reading_1pt" || slotType === "multipoint" || slotType === "short_answer") && !passageId) return { error: `missing_primary_passage:${item.id}` };
  if (slotType === "reading_1pt" && pointValue !== 1) return { error: `invalid_reading_point_value:${item.id}` };
  if (slotType === "short_answer" && pointValue !== GRADE3_BLUEPRINT.shortAnswerPointsEach) return { error: `invalid_short_answer_points:${item.id}` };
  if (!item.approvedContentHash) return { error: `missing_approved_hash:${item.id}` };
  return {
    item,
    itemId: item.id,
    category: ecCategory,
    slotType,
    pointValue,
    primaryPassageId: slotType === "conventions_1pt" ? null : passageId,
    scoringBucket: scoringBucketOf(item),
    approvedContentHashSnapshot: item.approvedContentHash,
  };
}

function correctPosition(item: PssaAssemblyItem): number | null {
  const response: any = item.correctResponseJson ?? {};
  const candidates = [
    response.correctIndex,
    response.correctOptionIndex,
    response.answerIndex,
    response.partA?.correctIndex,
    response.correctResponse?.partA?.correctIndex,
    response.blanks?.[0]?.correctIndex,
  ];
  for (const candidate of candidates) {
    if (Number.isInteger(candidate)) return Number(candidate);
  }
  return null;
}

function selectedCategoryPoints(items: SelectedFormItem[]) {
  return items.reduce((acc, item) => {
    acc[item.category] += item.pointValue;
    return acc;
  }, { A: 0, B: 0, D: 0 });
}

function addGate(gates: GateResult[], gate: string, pass: boolean, detail: string) {
  gates.push({ gate, status: pass ? "PASS" : "FAIL", detail });
}

function buildDeficits(classified: ClassifiedAssemblyItem[], allItems: PssaAssemblyItem[]) {
  const nearMisses = allItems
    .map((item) => ({ item, reason: computeStudentReadyBlockedReason(item) }))
    .filter((row) => row.reason !== "NONE");
  const nearMissSummary = nearMisses
    .filter((row) => row.reason === "PENDING_REVIEW")
    .map((row) => `${row.item.id}:${row.reason}`)
    .join("|");
  const count = (predicate: (row: ClassifiedAssemblyItem) => boolean) => classified.filter(predicate).length;
  return [
    { slot: "passages", required: "4", available: new Set(classified.map((row) => row.primaryPassageId).filter(Boolean)).size, deficit: Math.max(0, 4 - new Set(classified.map((row) => row.primaryPassageId).filter(Boolean)).size), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "reading_1pt", required: "19-23", available: count((row) => row.slotType === "reading_1pt"), deficit: Math.max(0, GRADE3_BLUEPRINT.readingOnePointRange.min - count((row) => row.slotType === "reading_1pt")), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "conventions_1pt", required: "9", available: count((row) => row.slotType === "conventions_1pt"), deficit: Math.max(0, 9 - count((row) => row.slotType === "conventions_1pt")), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "multipoint", required: "3-4 with >=1 two-point and >=1 three-point", available: count((row) => row.slotType === "multipoint"), deficit: Math.max(0, GRADE3_BLUEPRINT.multipointItemsRange.min - count((row) => row.slotType === "multipoint")), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "short_answer", required: "2", available: count((row) => row.slotType === "short_answer"), deficit: Math.max(0, 2 - count((row) => row.slotType === "short_answer")), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "category_A_points", required: "15-21", available: classified.filter((row) => row.category === "A").reduce((sum, row) => sum + row.pointValue, 0), deficit: Math.max(0, 15 - classified.filter((row) => row.category === "A").reduce((sum, row) => sum + row.pointValue, 0)), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "category_B_points", required: "15-21", available: classified.filter((row) => row.category === "B").reduce((sum, row) => sum + row.pointValue, 0), deficit: Math.max(0, 15 - classified.filter((row) => row.category === "B").reduce((sum, row) => sum + row.pointValue, 0)), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
    { slot: "category_D_points", required: "9", available: classified.filter((row) => row.category === "D").reduce((sum, row) => sum + row.pointValue, 0), deficit: Math.max(0, 9 - classified.filter((row) => row.category === "D").reduce((sum, row) => sum + row.pointValue, 0)), nearMissItemIds: nearMisses.map((row) => row.item.id).join("|"), nearMissBlockedReasons: nearMissSummary },
  ];
}

function buildCanonical(blueprintVersion: string, passages: SelectedPassage[], items: SelectedFormItem[], sections?: SelectedSection[]) {
  const scoreItems = items.filter((item) => item.scoringBucket !== "analytics_only");
  const categoryPoints = selectedCategoryPoints(scoreItems);
  const canonical: Record<string, unknown> = {
    blueprintVersion,
    gradeLevel: GRADE3_BLUEPRINT.gradeLevel,
    module: GRADE3_BLUEPRINT.module,
    subject: GRADE3_BLUEPRINT.subject,
    totalPoints: scoreItems.reduce((sum, item) => sum + item.pointValue, 0),
    categoryPoints,
    passages: passages.map(({ position, passageId, sectionIndex, passageUnitId, approvedPassageContentHashSnapshot }) => ({
      position,
      passageId,
      ...(sectionIndex ? { sectionIndex } : {}),
      ...(passageUnitId ? { passageUnitId } : {}),
      approvedPassageContentHashSnapshot,
    })),
    items: items.map(({ position, itemId, slotType, pointValue, passageId, sectionIndex, passageUnitId, scoringBucket, approvedContentHashSnapshot }) => ({
      position,
      itemId,
      slotType,
      pointValue,
      passageId,
      ...(sectionIndex ? { sectionIndex } : {}),
      ...(passageUnitId ? { passageUnitId } : {}),
      ...(scoringBucket === "analytics_only" ? { scoringBucket } : {}),
      approvedContentHashSnapshot,
    })),
  };
  if (sections?.length) {
    canonical.hasSections = true;
    canonical.sections = sections.map(({ sectionIndex, sectionType, label, estimatedMinutes }) => ({ sectionIndex, sectionType, label, estimatedMinutes }));
  }
  return canonical;
}

export function computePssaFormContentHash(canonical: Record<string, unknown>) {
  return sha256(stableStringify(canonical));
}

export type ExistingFormLookup = { id: string; formStatus: string } | null;
export type WriteDecision =
  | { action: "create" }
  | { action: "noop"; formId: string }
  | { action: "refuse_invalidated_collision"; formId: string };

export function decidePssaFormWrite(existing: ExistingFormLookup): WriteDecision {
  if (!existing) return { action: "create" };
  if (existing.formStatus === "assembled") return { action: "noop", formId: existing.id };
  if (existing.formStatus === "invalidated") return { action: "refuse_invalidated_collision", formId: existing.id };
  return { action: "refuse_invalidated_collision", formId: existing.id };
}

function validateSelectedForm(
  selected: ClassifiedAssemblyItem[],
  selectedPassages: SelectedPassage[],
  liveReadyIds: Set<string>,
) {
  const gates: GateResult[] = [];
  const itemIds = selected.map((row) => row.itemId);
  const duplicateItems = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
  const passageIds = new Set(selectedPassages.map((passage) => passage.passageId));
  const reading = selected.filter((row) => row.slotType === "reading_1pt");
  const conventions = selected.filter((row) => row.slotType === "conventions_1pt");
  const multipoint = selected.filter((row) => row.slotType === "multipoint");
  const shortAnswer = selected.filter((row) => row.slotType === "short_answer");
  const selectedItems = selected.map((row, index) => ({
    position: index + 1,
    itemId: row.itemId,
    slotType: row.slotType,
    pointValue: row.pointValue,
    category: row.category,
    passageId: row.primaryPassageId,
    scoringBucket: row.scoringBucket,
    approvedContentHashSnapshot: row.approvedContentHashSnapshot,
  }));
  const categoryPoints = selectedCategoryPoints(selectedItems);
  const totalPoints = selectedItems.reduce((sum, item) => sum + item.pointValue, 0);
  const correctPositions = selected
    .filter((row) => row.item.interactionType === "MCQ" || row.item.interactionType === "EBSR")
    .map((row) => correctPosition(row.item))
    .filter((position): position is number => position !== null);
  const positionCounts = new Map<number, number>();
  for (const position of correctPositions) positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  const maxShare = correctPositions.length ? Math.max(...positionCounts.values()) / correctPositions.length : 0;
  const multipointPatterns = new Set(multipoint.map((row) => stableStringify(row.item.correctResponseJson)));
  const readingEcCounts = new Map<string, number>();
  for (const row of reading) {
    const ec = String(row.item.eligibleContent ?? "");
    readingEcCounts.set(ec, (readingEcCounts.get(ec) ?? 0) + 1);
  }
  const overRepeatedEc = [...readingEcCounts].filter(([, count]) => count > GRADE3_BLUEPRINT.maxReadingEcRepeats).map(([ec]) => ec);

  addGate(gates, "live_selector_membership", selected.every((row) => liveReadyIds.has(row.itemId)), "all selected items must be live selector results");
  addGate(gates, "selected_item_readiness", selected.every((row) => computeStudentReadyBlockedReason(row.item) === "NONE"), "all selected items must recompute to NONE");
  addGate(gates, "passage_count", selectedPassages.length === GRADE3_BLUEPRINT.passages, `${selectedPassages.length}/4 passages`);
  addGate(gates, "passage_membership", selected.every((row) => row.slotType === "conventions_1pt" || passageIds.has(row.primaryPassageId!)), "all passage-based items use form passages");
  addGate(gates, "no_duplicate_items", duplicateItems.length === 0, duplicateItems.join("|") || "none");
  addGate(gates, "no_deprecated_or_retired", selected.every((row) => row.item.itemStatus === "pilot_ready" && !row.item.retiredAt && !row.item.deprecatedReason), "selector should make this structural");
  addGate(gates, "reading_1pt_count", reading.length >= GRADE3_BLUEPRINT.readingOnePointRange.min && reading.length <= GRADE3_BLUEPRINT.readingOnePointRange.max, `${reading.length}`);
  addGate(gates, "conventions_count", conventions.length === GRADE3_BLUEPRINT.conventionsOnePoint, `${conventions.length}`);
  addGate(gates, "multipoint_count", multipoint.length >= GRADE3_BLUEPRINT.multipointItemsRange.min && multipoint.length <= GRADE3_BLUEPRINT.multipointItemsRange.max, `${multipoint.length}`);
  addGate(gates, "multipoint_point_variety", multipoint.some((row) => row.pointValue === 2) && multipoint.some((row) => row.pointValue === 3), multipoint.map((row) => `${row.itemId}:${row.pointValue}`).join("|"));
  addGate(gates, "multipoint_pattern_variety", multipointPatterns.size >= Math.min(2, multipoint.length), `${multipointPatterns.size} unique patterns`);
  addGate(gates, "short_answer_count", shortAnswer.length === GRADE3_BLUEPRINT.shortAnswerItems, `${shortAnswer.length}`);
  addGate(gates, "short_answer_points", shortAnswer.every((row) => row.pointValue === GRADE3_BLUEPRINT.shortAnswerPointsEach), shortAnswer.map((row) => `${row.itemId}:${row.pointValue}`).join("|"));
  addGate(gates, "total_points", totalPoints === GRADE3_BLUEPRINT.totalPoints, `${totalPoints}`);
  addGate(gates, "category_A_points", categoryPoints.A >= 15 && categoryPoints.A <= 21, `${categoryPoints.A}`);
  addGate(gates, "category_B_points", categoryPoints.B >= 15 && categoryPoints.B <= 21, `${categoryPoints.B}`);
  addGate(gates, "category_D_points", categoryPoints.D === 9, `${categoryPoints.D}`);
  addGate(gates, "answer_position_distribution", maxShare <= GRADE3_BLUEPRINT.maxCorrectPositionShare, `maxShare=${maxShare.toFixed(3)}`);
  addGate(gates, "reading_ec_variety", overRepeatedEc.length === 0, overRepeatedEc.join("|") || "none");

  return { gates, categoryPoints, totalPoints, selectedItems };
}

const DIAGNOSTIC_SECTION_ITEM_IDS = [
  [
    "pssa_stamina_item_g3_syrup_01",
    "pssa_stamina_item_g3_syrup_02",
    "pssa_stamina_item_g3_syrup_03",
    "pssa_stamina_item_g3_syrup_04",
    "pssa_stamina_item_g3_syrup_dd_01",
    "pssa_stamina_item_g3_syrup_sa_01",
    "conv_01",
    "conv_02",
    "conv_03",
    "conv_04",
    "conv_05",
  ],
  [
    "pssa_stamina_item_g3_boat_01",
    "pssa_stamina_item_g3_boat_02",
    "pssa_stamina_item_g3_boat_03",
    "pssa_stamina_item_g3_boat_04",
    "pssa_stamina_item_g3_boat_05",
    "pssa_stamina_item_g3_boat_ebsr_01",
    "pssa_stamina_item_g3_boat_mg_01",
    "pssa_stamina_item_g3_boat_sa_01",
  ],
  [
    "pssa_stamina_item_g3_owls_01",
    "pssa_stamina_item_g3_owls_02",
    "pssa_stamina_item_g3_owls_03",
    "pssa_stamina_item_g3_owls_04",
    "pssa_stamina_item_g3_owls_05",
    "pssa_stamina_item_g3_owls_ebsr_01",
    "pssa_stamina_item_g3_rabbit_01",
    "pssa_stamina_item_g3_rabbit_02",
    "pssa_stamina_item_g3_rabbit_03",
    "pssa_stamina_item_g3_rabbit_04",
    "pssa_stamina_item_g3_rabbit_05",
    "pssa_stamina_item_g3_rabbit_06",
    "conv_06",
    "conv_07",
    "conv_08",
    "conv_09",
  ],
] as const;

const DIAGNOSTIC_UNIT_SECTIONS = new Map([
  ["pssa_stamina_psg_g3_syrup_v4", 1],
  ["pssa_stamina_psg_g3_boat_literary", 2],
  ["pssa_pg_g3_owls_paired_01", 3],
  ["pssa_stamina_psg_g3_rabbit_drama", 3],
]);

export const MOY_DIAGNOSTIC_SECTION_ITEM_IDS = [
  [
    "pssa_item_g3_moy_p4_mcq_ak111",
    "pssa_item_g3_moy_p4_mcq_ak112",
    "pssa_item_g3_moy_p4_mcq_ak113",
    "pssa_item_g3_moy_p4_mcq_av411",
    "pssa_item_g3_moy_p4_mcq_av412",
    "pssa_item_g3_moy_p4_mcq_av412_ao2",
    "pssa_item_g3_moy_p4_ebsr_ak113",
    "pssa_item_g3_moy_conv_d111_word_function",
    "pssa_item_g3_moy_conv_d114_irregular_verb",
    "pssa_item_g3_moy_conv_d115_verb_tense",
    "pssa_item_g3_moy_conv_d116_agreement",
    "pssa_item_g3_moy_conv_d118_conjunctions",
  ],
  [
    "pssa_item_g3_moy_p2_mcq_ak111",
    "pssa_item_g3_moy_p2_mcq_ak112",
    "pssa_item_g3_moy_p2_mcq_ac211",
    "pssa_item_g3_moy_p2_mcq_av411",
    "pssa_item_g3_moy_p2_mcq_av412",
    "pssa_item_g3_moy_p2_te_ak113",
    "pssa_item_g3_moy_p2_sa_ak112",
    "pssa_item_g3_moy_p3_mcq_bk112_t1",
    "pssa_item_g3_moy_p3_mcq_bk112_t2",
    "pssa_item_g3_moy_p3_mcq_bk113_t1",
    "pssa_item_g3_moy_p3_mcq_bc311_t1",
    "pssa_item_g3_moy_p3_mcq_bc312",
    "pssa_item_g3_moy_p3_ebsr_bc312",
    "pssa_item_g3_moy_p3_mcq_bv412_ao1",
    "pssa_item_g3_moy_p3_mcq_bc211_ao3",
    "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
  ],
  [
    "pssa_item_g3_moy_p1_mcq_bk111",
    "pssa_item_g3_moy_p1_mcq_bc211",
    "pssa_item_g3_moy_p1_mcq_bc313",
    "pssa_item_g3_moy_p1_mcq_bv411",
    "pssa_item_g3_moy_p1_mcq_bc212",
    "pssa_item_g3_moy_p1_te_bk112",
    "pssa_item_g3_moy_p1_sa_bk113",
    "pssa_item_g3_moy_p1_ao5_dd_bc313",
    "pssa_item_g3_moy_conv_d121_title_caps",
    "pssa_item_g3_moy_conv_d123_dialogue",
    "pssa_item_g3_moy_conv_d125_spelling",
    "pssa_item_g3_moy_conv_d211_word_choice",
  ],
] as const;

const MOY_ANALYTICS_ITEM_IDS = new Set([
  "pssa_item_g3_moy_p1_ao5_dd_bc313",
  "pssa_item_g3_moy_p3_mcq_bv412_ao1",
  "pssa_item_g3_moy_p3_mcq_bc211_ao3",
  "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
  "pssa_item_g3_moy_p4_mcq_av412_ao2",
]);

const MOY_UNIT_SECTIONS = new Map([
  ["pssa_psg_g3_moy_p4_last_rehearsal", 1],
  ["pssa_psg_g3_moy_p2_stubborn_dough", 2],
  ["pssa_pg_g3_moy_p3_mail_paired", 2],
  ["pssa_psg_g3_moy_p1_museum_map", 3],
]);

const MOY_PASSAGE_ROWS = [
  { position: 1, passageId: "pssa_psg_g3_moy_p4_last_rehearsal", passageUnitId: "pssa_psg_g3_moy_p4_last_rehearsal", sectionIndex: 1 },
  { position: 2, passageId: "pssa_psg_g3_moy_p2_stubborn_dough", passageUnitId: "pssa_psg_g3_moy_p2_stubborn_dough", sectionIndex: 2 },
  { position: 3, passageId: "pssa_psg_g3_moy_p3_letter_travels", passageUnitId: "pssa_pg_g3_moy_p3_mail_paired", sectionIndex: 2 },
  { position: 4, passageId: "pssa_psg_g3_moy_p3_carrier_day", passageUnitId: "pssa_pg_g3_moy_p3_mail_paired", sectionIndex: 2 },
  { position: 5, passageId: "pssa_psg_g3_moy_p1_museum_map", passageUnitId: "pssa_psg_g3_moy_p1_museum_map", sectionIndex: 3 },
] as const;

export const EOY_DIAGNOSTIC_SECTION_ITEM_IDS = [
  [
    "pssa_item_g3_eoy_p4_mcq_ak111",
    "pssa_item_g3_eoy_p4_mcq_ak113",
    "pssa_item_g3_eoy_p4_mcq_av411",
    "pssa_item_g3_eoy_p4_mcq_av412",
    "pssa_item_g3_eoy_p4_mcq_ak112",
    "pssa_item_g3_eoy_p4_ebsr_ak113",
    "pssa_item_g3_eoy_p4_mcq_av412_ao6",
    "pssa_item_g3_eoy_conv_d112_plurals",
    "pssa_item_g3_eoy_conv_d113_abstract_noun",
    "pssa_item_g3_eoy_conv_d116_pronoun_agreement",
    "pssa_item_g3_eoy_conv_d117_comparative",
    "pssa_item_g3_eoy_conv_d119_sentence_formation",
  ],
  [
    "pssa_item_g3_eoy_p2_mcq_ak111",
    "pssa_item_g3_eoy_p2_mcq_ac211",
    "pssa_item_g3_eoy_p2_mcq_av411",
    "pssa_item_g3_eoy_p2_mcq_av412",
    "pssa_item_g3_eoy_p2_mcq_ak112",
    "pssa_item_g3_eoy_p2_te_ak113",
    "pssa_item_g3_eoy_p2_sa_ak112",
    "pssa_item_g3_eoy_p2_mcq_ac211_ao5",
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
  ],
  [
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
    "pssa_item_g3_eoy_conv_d122_address_commas",
    "pssa_item_g3_eoy_conv_d123_dialogue",
    "pssa_item_g3_eoy_conv_d124_possessives",
    "pssa_item_g3_eoy_conv_d126_spelling",
  ],
] as const;

export const EOY_ANALYTICS_ITEM_IDS = new Set([
  "pssa_item_g3_eoy_p4_mcq_av412_ao6",
  "pssa_item_g3_eoy_p2_mcq_ac211_ao5",
  "pssa_item_g3_eoy_p3_mcq_bc211_ao1",
  "pssa_item_g3_eoy_p3_mcq_bv412_ao4",
  "pssa_item_g3_eoy_p3_ebsr_bk111_ao7",
  "pssa_item_g3_eoy_p3_ebsr_bc311_ao8",
  "pssa_item_g3_eoy_p1_mcq_bc212_ao2",
  "pssa_item_g3_eoy_p1_mcq_bv411_ao3",
  "pssa_item_g3_eoy_p1_te_bc313_ao9",
  "pssa_item_g3_eoy_p1_te_bv411_ao10",
]);

export const EOY_UNIT_SECTIONS = new Map([
  ["pssa_psg_g3_eoy_p4_borrowed_bike", 1],
  ["pssa_psg_g3_eoy_p2_broken_vase", 2],
  ["pssa_pg_g3_eoy_p3_school_paired", 2],
  ["pssa_psg_g3_eoy_p1_crayons", 3],
]);

export const EOY_PASSAGE_ROWS = [
  { position: 1, passageId: "pssa_psg_g3_eoy_p4_borrowed_bike", passageUnitId: "pssa_psg_g3_eoy_p4_borrowed_bike", sectionIndex: 1 },
  { position: 2, passageId: "pssa_psg_g3_eoy_p2_broken_vase", passageUnitId: "pssa_psg_g3_eoy_p2_broken_vase", sectionIndex: 2 },
  { position: 3, passageId: "pssa_psg_g3_eoy_p3_school_long_ago", passageUnitId: "pssa_pg_g3_eoy_p3_school_paired", sectionIndex: 2 },
  { position: 4, passageId: "pssa_psg_g3_eoy_p3_school_today", passageUnitId: "pssa_pg_g3_eoy_p3_school_paired", sectionIndex: 2 },
  { position: 5, passageId: "pssa_psg_g3_eoy_p1_crayons", passageUnitId: "pssa_psg_g3_eoy_p1_crayons", sectionIndex: 3 },
] as const;

type DiagnosticClassifiedItem = ClassifiedAssemblyItem & {
  sectionIndex: number;
  passageUnitId: string | null;
  rawPassageIds: string[];
};

function passageGroupIdFor(item: PssaAssemblyItem) {
  return String((item as any).passageGroupId ?? (item as any).passageGroup?.id ?? "");
}

function groupedPassageIds(item: PssaAssemblyItem) {
  return ((item as any).passageGroup?.members ?? [])
    .map((member: any) => member?.passage?.id)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
}

function sectionForConvention(itemId: string) {
  if (/^conv_0[1-5]$/.test(itemId)) return 1;
  if (/^conv_0[6-9]$/.test(itemId)) return 3;
  return null;
}

function classifyDiagnosticAssemblyItem(item: PssaAssemblyItem): DiagnosticClassifiedItem | { error: string } {
  const ecCategory = categoryFromEligibleContent(item.eligibleContent);
  if (!ecCategory) return { error: `category_unresolved:${item.id}` };
  const reportingCategory = categoryFromReportingCategory(item.reportingCategory);
  if (reportingCategory && reportingCategory !== ecCategory) return { error: `category_mismatch:${item.id}:${ecCategory}_vs_${reportingCategory}` };
  const pointValue = Number(item.pointValue ?? 0);
  if (!Number.isInteger(pointValue) || pointValue <= 0) return { error: `invalid_point_value:${item.id}` };
  const interactionType = String(item.interactionType ?? "");
  const slotType: PssaFormSlotType = interactionType === "SHORT_ANSWER"
    ? "short_answer"
    : ecCategory === "D"
      ? "conventions_1pt"
      : pointValue > 1
        ? "multipoint"
        : "reading_1pt";
  const directPassageId = primaryPassageId(item) ?? ((item as any).passageId ?? null);
  const groupId = passageGroupIdFor(item);
  const passageUnitId = slotType === "conventions_1pt" ? null : (groupId || directPassageId);
  if (slotType === "conventions_1pt" && (pointValue !== 1 || passageUnitId)) return { error: `invalid_conventions_slot:${item.id}` };
  if ((slotType === "reading_1pt" || slotType === "multipoint" || slotType === "short_answer") && !passageUnitId) return { error: `missing_primary_passage:${item.id}` };
  if (groupId && !DIAGNOSTIC_UNIT_SECTIONS.has(groupId)) return { error: `missing_primary_passage:${item.id}` };
  if (passageUnitId && !DIAGNOSTIC_UNIT_SECTIONS.has(passageUnitId)) return { error: `unknown_passage_unit:${item.id}:${passageUnitId}` };
  if (slotType === "reading_1pt" && pointValue !== 1) return { error: `invalid_reading_point_value:${item.id}` };
  if (slotType === "short_answer" && pointValue !== GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerPointsEach) return { error: `invalid_short_answer_points:${item.id}` };
  if (!item.approvedContentHash) return { error: `missing_approved_hash:${item.id}` };
  const sectionIndex = passageUnitId ? DIAGNOSTIC_UNIT_SECTIONS.get(passageUnitId)! : sectionForConvention(item.id);
  if (!sectionIndex) return { error: `section_unresolved:${item.id}` };
  return {
    item,
    itemId: item.id,
    category: ecCategory,
    slotType,
    pointValue,
    primaryPassageId: slotType === "conventions_1pt" ? null : directPassageId,
    scoringBucket: scoringBucketOf(item),
    passageUnitId,
    rawPassageIds: groupId ? groupedPassageIds(item) : (directPassageId ? [directPassageId] : []),
    sectionIndex,
    approvedContentHashSnapshot: item.approvedContentHash,
  };
}

function validateDiagnosticSelectedForm(input: {
  selected: DiagnosticClassifiedItem[];
  selectedPassages: SelectedPassage[];
  sections: SelectedSection[];
  liveReadyIds: Set<string>;
}) {
  const { selected, selectedPassages, sections, liveReadyIds } = input;
  const gates: GateResult[] = [];
  const itemIds = selected.map((row) => row.itemId);
  const duplicateItems = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
  const passageUnitIds = new Set(selected.filter((row) => row.passageUnitId).map((row) => row.passageUnitId!));
  const passageIds = new Set(selectedPassages.map((passage) => passage.passageId));
  const reading = selected.filter((row) => row.slotType === "reading_1pt");
  const conventions = selected.filter((row) => row.slotType === "conventions_1pt");
  const multipoint = selected.filter((row) => row.slotType === "multipoint");
  const shortAnswer = selected.filter((row) => row.slotType === "short_answer");
  const selectedItems: SelectedFormItem[] = selected.map((row, index) => ({
    position: index + 1,
    itemId: row.itemId,
    slotType: row.slotType,
    pointValue: row.pointValue,
    category: row.category,
    passageId: row.primaryPassageId,
    sectionIndex: row.sectionIndex,
    passageUnitId: row.passageUnitId,
    scoringBucket: row.scoringBucket,
    approvedContentHashSnapshot: row.approvedContentHashSnapshot,
  }));
  const categoryPoints = selectedCategoryPoints(selectedItems);
  const totalPoints = selectedItems.reduce((sum, item) => sum + item.pointValue, 0);
  const correctPositions = selected
    .filter((row) => row.item.interactionType === "MCQ")
    .map((row) => correctPosition(row.item))
    .filter((position): position is number => position !== null);
  const positionCounts = new Map<number, number>();
  for (const position of correctPositions) positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  const answerDetail = [0, 1, 2, 3].map((index) => positionCounts.get(index) ?? 0);
  const maxShare = correctPositions.length ? Math.max(...positionCounts.values()) / correctPositions.length : 0;
  const multipointPatterns = new Set(multipoint.map((row) => stableStringify(row.item.correctResponseJson)));
  const readingEcCounts = new Map<string, number>();
  for (const row of reading) {
    const ec = String(row.item.eligibleContent ?? "");
    readingEcCounts.set(ec, (readingEcCounts.get(ec) ?? 0) + 1);
  }
  const overRepeatedEc = [...readingEcCounts].filter(([, count]) => count > GRADE3_DIAGNOSTIC_BLUEPRINT.maxReadingEcRepeats).map(([ec]) => ec);
  const expectedTripleEc = new Map([["E03.A-K.1.1.3", 3], ["E03.B-K.1.1.1", 3]]);
  const tripleEcOk = [...expectedTripleEc].every(([ec, count]) => readingEcCounts.get(ec) === count)
    && [...readingEcCounts].every(([, count]) => count <= GRADE3_DIAGNOSTIC_BLUEPRINT.maxReadingEcRepeats);
  const sectionTargets = new Map([
    [1, { units: 1, reading: 4, conventions: 5, ebsr: 0, te: 1, shortAnswer: 1, items: 11, points: 15 }],
    [2, { units: 1, reading: 5, conventions: 0, ebsr: 1, te: 1, shortAnswer: 1, items: 8, points: 13 }],
    [3, { units: 2, reading: 11, conventions: 4, ebsr: 1, te: 0, shortAnswer: 0, items: 16, points: 17 }],
  ]);
  for (const [sectionIndex, target] of sectionTargets) {
    const rows = selected.filter((row) => row.sectionIndex === sectionIndex);
    const units = new Set(rows.map((row) => row.passageUnitId).filter(Boolean)).size;
    const ebsr = rows.filter((row) => row.item.interactionType === "EBSR").length;
    const te = rows.filter((row) => ["DRAG_DROP", "MATCHING_GRID"].includes(String(row.item.interactionType))).length;
    const detail = `units=${units} reading=${rows.filter((row) => row.slotType === "reading_1pt").length} conventions=${rows.filter((row) => row.slotType === "conventions_1pt").length} ebsr=${ebsr} te=${te} sa=${rows.filter((row) => row.slotType === "short_answer").length} items=${rows.length} points=${rows.reduce((sum, row) => sum + row.pointValue, 0)}`;
    const ok = units === target.units
      && rows.filter((row) => row.slotType === "reading_1pt").length === target.reading
      && rows.filter((row) => row.slotType === "conventions_1pt").length === target.conventions
      && ebsr === target.ebsr
      && te === target.te
      && rows.filter((row) => row.slotType === "short_answer").length === target.shortAnswer
      && rows.length === target.items
      && rows.reduce((sum, row) => sum + row.pointValue, 0) === target.points;
    addGate(gates, `section_${sectionIndex}_composition`, ok, detail);
  }
  const owlRows = selected.filter((row) => row.passageUnitId === "pssa_pg_g3_owls_paired_01");
  const owlPassageRows = selectedPassages.filter((passage) => passage.passageUnitId === "pssa_pg_g3_owls_paired_01");

  addGate(gates, "section_count", sections.length === 3, `${sections.length}`);
  addGate(gates, "live_selector_membership", selected.every((row) => liveReadyIds.has(row.itemId)), "all selected items must be live selector results");
  addGate(gates, "selected_item_readiness", selected.every((row) => computeStudentReadyBlockedReason(row.item) === "NONE"), "all selected items must recompute to NONE");
  addGate(gates, "passage_count", passageUnitIds.size === GRADE3_DIAGNOSTIC_BLUEPRINT.passages, `${passageUnitIds.size}/4 passage units`);
  addGate(gates, "passage_membership", selected.every((row) => row.slotType === "conventions_1pt" || row.rawPassageIds.every((id) => passageIds.has(id))), "all passage-based items use form passages");
  addGate(gates, "passage_group_integrity", owlRows.every((row) => row.sectionIndex === 3) && owlPassageRows.length === 2 && owlPassageRows.every((row) => row.sectionIndex === 3), `owlItems=${owlRows.length}; owlPassages=${owlPassageRows.length}`);
  addGate(gates, "no_duplicate_items", duplicateItems.length === 0, duplicateItems.join("|") || "none");
  addGate(gates, "no_deprecated_or_retired", selected.every((row) => row.item.itemStatus === "pilot_ready" && !row.item.retiredAt && !row.item.deprecatedReason), "selector should make this structural");
  addGate(gates, "reading_1pt_count", reading.length >= GRADE3_DIAGNOSTIC_BLUEPRINT.readingOnePointRange.min && reading.length <= GRADE3_DIAGNOSTIC_BLUEPRINT.readingOnePointRange.max, `${reading.length}`);
  addGate(gates, "conventions_count", conventions.length === GRADE3_DIAGNOSTIC_BLUEPRINT.conventionsOnePoint, `${conventions.length}`);
  addGate(gates, "multipoint_count", multipoint.length >= GRADE3_DIAGNOSTIC_BLUEPRINT.multipointItemsRange.min && multipoint.length <= GRADE3_DIAGNOSTIC_BLUEPRINT.multipointItemsRange.max, `${multipoint.length}`);
  addGate(gates, "multipoint_point_variety", multipoint.some((row) => row.pointValue === 2) && multipoint.some((row) => row.pointValue === 3), multipoint.map((row) => `${row.itemId}:${row.pointValue}`).join("|"));
  addGate(gates, "multipoint_pattern_variety", multipointPatterns.size >= Math.min(2, multipoint.length), `${multipointPatterns.size} unique patterns`);
  addGate(gates, "ebsr_integrity", multipoint.filter((row) => row.item.interactionType === "EBSR").every((row) => Boolean((row.item.correctResponseJson as any)?.partA && (row.item.correctResponseJson as any)?.partB)), "selected EBSR items have Part A and Part B");
  addGate(gates, "short_answer_count", shortAnswer.length === GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerItems, `${shortAnswer.length}`);
  addGate(gates, "short_answer_points", shortAnswer.every((row) => row.pointValue === GRADE3_DIAGNOSTIC_BLUEPRINT.shortAnswerPointsEach), shortAnswer.map((row) => `${row.itemId}:${row.pointValue}`).join("|"));
  addGate(gates, "total_points", totalPoints === GRADE3_DIAGNOSTIC_BLUEPRINT.totalPoints, `${totalPoints}`);
  addGate(gates, "category_A_points", categoryPoints.A >= 15 && categoryPoints.A <= 21, `${categoryPoints.A}`);
  addGate(gates, "category_B_points", categoryPoints.B >= 15 && categoryPoints.B <= 21, `${categoryPoints.B}`);
  addGate(gates, "category_D_points", categoryPoints.D === 9, `${categoryPoints.D}`);
  addGate(gates, "answer_position_distribution", maxShare <= GRADE3_DIAGNOSTIC_BLUEPRINT.maxCorrectPositionShare && stableStringify(answerDetail) === stableStringify([8, 7, 7, 7]), `A=${answerDetail[0]} B=${answerDetail[1]} C=${answerDetail[2]} D=${answerDetail[3]} maxShare=${maxShare.toFixed(3)}`);
  addGate(gates, "reading_ec_variety", overRepeatedEc.length === 0 && tripleEcOk, `triples=E03.A-K.1.1.3:${readingEcCounts.get("E03.A-K.1.1.3") ?? 0}|E03.B-K.1.1.1:${readingEcCounts.get("E03.B-K.1.1.1") ?? 0}; over=${overRepeatedEc.join("|") || "none"}`);

  return { gates, categoryPoints, totalPoints, selectedItems, readingEcCounts };
}

function sectionForMoyConvention(itemId: string) {
  for (const [sectionIndex, ids] of MOY_DIAGNOSTIC_SECTION_ITEM_IDS.entries()) {
    if ((ids as readonly string[]).includes(itemId)) return sectionIndex + 1;
  }
  return null;
}

function expectedMoyBucket(itemId: string): PssaScoringBucket {
  return MOY_ANALYTICS_ITEM_IDS.has(itemId) ? "analytics_only" : "operational";
}

function moyBucketFor(item: PssaAssemblyItem): PssaScoringBucket | { error: string } {
  const expected = expectedMoyBucket(item.id);
  if (!Object.prototype.hasOwnProperty.call(item, "scoringBucket") || item.scoringBucket === undefined) return expected;
  if (item.scoringBucket === "operational" || item.scoringBucket === "analytics_only") return item.scoringBucket;
  return { error: `missing_or_invalid_scoring_bucket:${item.id}` };
}

function classifyMoyAssemblyItem(item: PssaAssemblyItem): DiagnosticClassifiedItem | { error: string } {
  const ecCategory = categoryFromEligibleContent(item.eligibleContent);
  if (!ecCategory) return { error: `category_unresolved:${item.id}` };
  const reportingCategory = categoryFromReportingCategory(item.reportingCategory);
  if (reportingCategory && reportingCategory !== ecCategory) return { error: `category_mismatch:${item.id}:${ecCategory}_vs_${reportingCategory}` };
  const pointValue = Number(item.pointValue ?? 0);
  if (!Number.isInteger(pointValue) || pointValue <= 0) return { error: `invalid_point_value:${item.id}` };
  const interactionType = String(item.interactionType ?? "");
  const slotType: PssaFormSlotType = interactionType === "SHORT_ANSWER"
    ? "short_answer"
    : ecCategory === "D"
      ? "conventions_1pt"
      : pointValue > 1
        ? "multipoint"
        : "reading_1pt";
  const directPassageId = primaryPassageId(item) ?? ((item as any).passageId ?? null);
  const groupId = passageGroupIdFor(item);
  const passageUnitId = slotType === "conventions_1pt" ? null : (groupId || directPassageId);
  if (slotType === "conventions_1pt" && (pointValue !== 1 || passageUnitId)) return { error: `invalid_conventions_slot:${item.id}` };
  if ((slotType === "reading_1pt" || slotType === "multipoint" || slotType === "short_answer") && !passageUnitId) return { error: `missing_primary_passage:${item.id}` };
  if (groupId && !MOY_UNIT_SECTIONS.has(groupId)) return { error: `missing_primary_passage:${item.id}` };
  if (passageUnitId && !MOY_UNIT_SECTIONS.has(passageUnitId)) return { error: `unknown_passage_unit:${item.id}:${passageUnitId}` };
  if (slotType === "reading_1pt" && pointValue !== 1) return { error: `invalid_reading_point_value:${item.id}` };
  if (slotType === "short_answer" && pointValue !== GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.shortAnswerPointsEach) return { error: `invalid_short_answer_points:${item.id}` };
  if (!item.approvedContentHash) return { error: `missing_approved_hash:${item.id}` };
  const bucket = moyBucketFor(item);
  if (typeof bucket !== "string") return bucket;
  const sectionIndex = passageUnitId ? MOY_UNIT_SECTIONS.get(passageUnitId)! : sectionForMoyConvention(item.id);
  if (!sectionIndex) return { error: `section_unresolved:${item.id}` };
  return {
    item,
    itemId: item.id,
    category: ecCategory,
    slotType,
    pointValue,
    primaryPassageId: slotType === "conventions_1pt" ? null : directPassageId,
    scoringBucket: bucket,
    passageUnitId,
    rawPassageIds: groupId ? groupedPassageIds(item) : (directPassageId ? [directPassageId] : []),
    sectionIndex,
    approvedContentHashSnapshot: item.approvedContentHash,
  };
}

function countsByEc(rows: DiagnosticClassifiedItem[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const ec = String(row.item.eligibleContent ?? "");
    counts.set(ec, (counts.get(ec) ?? 0) + 1);
  }
  return counts;
}

function ecCountDetail(counts: Map<string, number>) {
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([ec, count]) => `${ec}:${count}`).join("|");
}

function typeTotals(rows: DiagnosticClassifiedItem[]) {
  return {
    readingMcq: rows.filter((row) => row.item.interactionType === "MCQ" && row.category !== "D").length,
    conventions: rows.filter((row) => row.slotType === "conventions_1pt").length,
    ebsr: rows.filter((row) => row.item.interactionType === "EBSR").length,
    te: rows.filter((row) => ["MATCHING_GRID", "DRAG_DROP"].includes(String(row.item.interactionType))).length,
    shortAnswer: rows.filter((row) => row.slotType === "short_answer").length,
  };
}

function typeTotalsMatch(actual: ReturnType<typeof typeTotals>, expected: ReturnType<typeof typeTotals>) {
  return actual.readingMcq === expected.readingMcq
    && actual.conventions === expected.conventions
    && actual.ebsr === expected.ebsr
    && actual.te === expected.te
    && actual.shortAnswer === expected.shortAnswer;
}

function validateMoySelectedForm(input: {
  selected: DiagnosticClassifiedItem[];
  selectedPassages: SelectedPassage[];
  sections: SelectedSection[];
  liveReadyIds: Set<string>;
}) {
  const { selected, selectedPassages, sections, liveReadyIds } = input;
  const gates: GateResult[] = [];
  const itemIds = selected.map((row) => row.itemId);
  const duplicateItems = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
  const selectedItems: SelectedFormItem[] = selected.map((row, index) => ({
    position: index + 1,
    itemId: row.itemId,
    slotType: row.slotType,
    pointValue: row.pointValue,
    category: row.category,
    passageId: row.primaryPassageId,
    sectionIndex: row.sectionIndex,
    passageUnitId: row.passageUnitId,
    scoringBucket: row.scoringBucket,
    approvedContentHashSnapshot: row.approvedContentHashSnapshot,
  }));
  const operational = selected.filter((row) => row.scoringBucket === "operational");
  const analytics = selected.filter((row) => row.scoringBucket === "analytics_only");
  const operationalItems = selectedItems.filter((item) => item.scoringBucket !== "analytics_only");
  const categoryPoints = selectedCategoryPoints(operationalItems);
  const totalPoints = operational.reduce((sum, row) => sum + row.pointValue, 0);
  const analyticsPoints = analytics.reduce((sum, row) => sum + row.pointValue, 0);
  const deliveredPoints = selected.reduce((sum, row) => sum + row.pointValue, 0);
  const passageUnitIds = new Set(selected.filter((row) => row.passageUnitId).map((row) => row.passageUnitId!));
  const passageIds = new Set(selectedPassages.map((passage) => passage.passageId));
  const analyticsIds = new Set(analytics.map((row) => row.itemId));
  const expectedAnalytics = [...MOY_ANALYTICS_ITEM_IDS].sort();
  const expectedBucketsOk = selected.every((row) => row.scoringBucket === expectedMoyBucket(row.itemId));
  const deliveredTypeTotals = typeTotals(selected);
  const operationalTypeTotals = typeTotals(operational);
  const analyticsTypeTotals = typeTotals(analytics);
  const positionRows = operational.filter((row) => row.item.interactionType === "MCQ" || row.item.interactionType === "INLINE_DROPDOWN");
  const correctPositions = positionRows.map((row) => correctPosition(row.item)).filter((position): position is number => position !== null);
  const positionCounts = new Map<number, number>();
  for (const position of correctPositions) positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  const answerDetail = [0, 1, 2, 3].map((index) => positionCounts.get(index) ?? 0);
  const maxShare = correctPositions.length ? Math.max(...positionCounts.values()) / correctPositions.length : 0;
  const operationalEcCounts = countsByEc(operational);
  const deliveredEcCounts = countsByEc(selected);
  const operationalTriples = [...operationalEcCounts].filter(([, count]) => count === 3).map(([ec]) => ec).sort();
  const deliveredTriples = [...deliveredEcCounts].filter(([, count]) => count === 3).map(([ec]) => ec).sort();
  const operationalReadingMcqEcCounts = countsByEc(operational.filter((row) => row.item.interactionType === "MCQ" && row.category !== "D"));
  const maxOperationalReadingMcqRepeat = Math.max(0, ...operationalReadingMcqEcCounts.values());
  const maxDeliveredRepeat = Math.max(0, ...deliveredEcCounts.values());
  const p3Rows = selected.filter((row) => row.passageUnitId === "pssa_pg_g3_moy_p3_mail_paired");
  const p3Passages = selectedPassages.filter((passage) => passage.passageUnitId === "pssa_pg_g3_moy_p3_mail_paired");
  const readinessFailures = selected
    .map((row) => ({ row, reason: computeStudentReadyBlockedReason(row.item) }))
    .filter(({ reason }) => reason !== "NONE")
    .map(({ row, reason }) => `${row.itemId}:${reason}`);
  const conventionSectionByEc = new Map(operational.filter((row) => row.slotType === "conventions_1pt").map((row) => [String(row.item.eligibleContent), row.sectionIndex]));
  const expectedS1Conventions = ["E03.D.1.1.1", "E03.D.1.1.4", "E03.D.1.1.5", "E03.D.1.1.6", "E03.D.1.1.8"];
  const expectedS3Conventions = ["E03.D.1.2.1", "E03.D.1.2.3", "E03.D.1.2.5", "E03.D.2.1.1"];
  const wordLoads = new Map([
    [1, 1086],
    [2, 1680],
    [3, 687],
  ]);

  addGate(gates, "section_count", sections.length === 3, `${sections.length}`);
  addGate(gates, "live_selector_membership", selected.every((row) => liveReadyIds.has(row.itemId)), "all selected items must be live selector results");
  addGate(gates, "selected_item_readiness", readinessFailures.length === 0, readinessFailures.join("|") || "all selected items must recompute to NONE");
  addGate(gates, "delivered_count", selected.length === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.deliveredItems, `${selected.length}`);
  addGate(gates, "delivered_points", deliveredPoints === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.deliveredPossiblePoints, `${deliveredPoints}`);
  addGate(gates, "operational_total", operational.length === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.operational.items && totalPoints === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.operational.points, `${operational.length}/${totalPoints}`);
  addGate(gates, "analytics_total", analytics.length === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.analyticsOnly.items && analyticsPoints === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.analyticsOnly.points, `${analytics.length}/${analyticsPoints}`);
  addGate(gates, "analytics_id_set", stableStringify([...analyticsIds].sort()) === stableStringify(expectedAnalytics), [...analyticsIds].sort().join("|"));
  addGate(gates, "scoring_bucket_assignment", expectedBucketsOk, selected.filter((row) => row.scoringBucket !== expectedMoyBucket(row.itemId)).map((row) => `${row.itemId}:${row.scoringBucket}->${expectedMoyBucket(row.itemId)}`).join("|") || "pinned buckets");
  addGate(gates, "passage_count", passageUnitIds.size === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.passageUnits && selectedPassages.length === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.rawPassages, `${passageUnitIds.size} units/${selectedPassages.length} rows`);
  addGate(gates, "passage_membership", selected.every((row) => row.slotType === "conventions_1pt" || row.rawPassageIds.every((id) => passageIds.has(id))), "all passage-based items use form passages");
  addGate(gates, "p3_group_integrity", p3Rows.length === 9 && p3Rows.every((row) => row.sectionIndex === 2) && p3Passages.length === 2 && p3Passages.every((row) => row.sectionIndex === 2), `p3Items=${p3Rows.length}; p3Passages=${p3Passages.length}`);
  addGate(gates, "no_duplicate_items", duplicateItems.length === 0, duplicateItems.join("|") || "none");
  addGate(gates, "no_deprecated_or_retired", selected.every((row) => row.item.itemStatus === "pilot_ready" && !row.item.retiredAt && !row.item.deprecatedReason), "selector should make this structural");
  addGate(gates, "delivered_type_totals", typeTotalsMatch(deliveredTypeTotals, { readingMcq: 23, conventions: 9, ebsr: 3, te: 3, shortAnswer: 2 }), stableStringify(deliveredTypeTotals));
  addGate(gates, "operational_type_totals", typeTotalsMatch(operationalTypeTotals, { readingMcq: 20, conventions: 9, ebsr: 2, te: 2, shortAnswer: 2 }), stableStringify(operationalTypeTotals));
  addGate(gates, "analytics_type_totals", typeTotalsMatch(analyticsTypeTotals, { readingMcq: 3, conventions: 0, ebsr: 1, te: 1, shortAnswer: 0 }), stableStringify(analyticsTypeTotals));
  addGate(gates, "answer_position_distribution", correctPositions.length === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.operationalAnswerPositionEligibleItems && stableStringify(answerDetail) === stableStringify(GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.operationalAnswerPositionDistribution) && maxShare <= GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.maxCorrectPositionShare, `eligible=${correctPositions.length} A=${answerDetail[0]} B=${answerDetail[1]} C=${answerDetail[2]} D=${answerDetail[3]} maxShare=${maxShare.toFixed(3)}`);
  addGate(gates, "operational_ec_caps", stableStringify(operationalTriples) === stableStringify(["E03.A-K.1.1.2", "E03.A-K.1.1.3", "E03.B-K.1.1.2"]) && Math.max(...operationalEcCounts.values()) === 3 && maxOperationalReadingMcqRepeat <= GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.maxOperationalReadingMcqEcRepeats, `triples=${operationalTriples.join("|")}; opReadingMcqMax=${maxOperationalReadingMcqRepeat}; ${ecCountDetail(operationalEcCounts)}`);
  addGate(gates, "delivered_ec_caps", stableStringify(deliveredTriples) === stableStringify(["E03.A-K.1.1.2", "E03.A-K.1.1.3", "E03.A-V.4.1.2", "E03.B-K.1.1.2"]) && maxDeliveredRepeat <= GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.maxDeliveredReadingMcqEcRepeats, `triples=${deliveredTriples.join("|")}; max=${maxDeliveredRepeat}; ${ecCountDetail(deliveredEcCounts)}`);
  addGate(gates, "conventions_by_ec_section", expectedS1Conventions.every((ec) => conventionSectionByEc.get(ec) === 1) && expectedS3Conventions.every((ec) => conventionSectionByEc.get(ec) === 3), `S1=${expectedS1Conventions.map((ec) => `${ec}:${conventionSectionByEc.get(ec)}`).join("|")} S3=${expectedS3Conventions.map((ec) => `${ec}:${conventionSectionByEc.get(ec)}`).join("|")}`);
  for (const section of GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.sections) {
    const rows = selected.filter((row) => row.sectionIndex === section.sectionIndex);
    const opRows = rows.filter((row) => row.scoringBucket === "operational");
    const analyticsRows = rows.filter((row) => row.scoringBucket === "analytics_only");
    const detail = `delivered=${rows.length} op=${opRows.length}/${opRows.reduce((sum, row) => sum + row.pointValue, 0)} analytics=${analyticsRows.length}/${analyticsRows.reduce((sum, row) => sum + row.pointValue, 0)} words=${wordLoads.get(section.sectionIndex)}`;
    const ok = rows.length === section.delivered
      && opRows.length === section.operationalItems
      && opRows.reduce((sum, row) => sum + row.pointValue, 0) === section.operationalPoints
      && analyticsRows.length === section.analyticsItems
      && analyticsRows.reduce((sum, row) => sum + row.pointValue, 0) === section.analyticsPoints;
    addGate(gates, `section_${section.sectionIndex}_composition`, ok, detail);
  }

  return { gates, categoryPoints, totalPoints, selectedItems };
}

function sectionForEoyConvention(itemId: string) {
  for (const [sectionIndex, ids] of EOY_DIAGNOSTIC_SECTION_ITEM_IDS.entries()) {
    if ((ids as readonly string[]).includes(itemId)) return sectionIndex + 1;
  }
  return null;
}

export function expectedEoyBucket(itemId: string): PssaScoringBucket {
  return EOY_ANALYTICS_ITEM_IDS.has(itemId) ? "analytics_only" : "operational";
}

export function eoyBucketFor(item: PssaAssemblyItem): PssaScoringBucket | { error: string } {
  const expected = expectedEoyBucket(item.id);
  if (!Object.prototype.hasOwnProperty.call(item, "scoringBucket") || item.scoringBucket === undefined) return expected;
  if (item.scoringBucket === "operational" || item.scoringBucket === "analytics_only") return item.scoringBucket;
  return { error: `missing_or_invalid_scoring_bucket:${item.id}` };
}

export function classifyEoyAssemblyItem(item: PssaAssemblyItem): DiagnosticClassifiedItem | { error: string } {
  const ecCategory = categoryFromEligibleContent(item.eligibleContent);
  if (!ecCategory) return { error: `category_unresolved:${item.id}` };
  const reportingCategory = categoryFromReportingCategory(item.reportingCategory);
  if (reportingCategory && reportingCategory !== ecCategory) return { error: `category_mismatch:${item.id}:${ecCategory}_vs_${reportingCategory}` };
  const pointValue = Number(item.pointValue ?? 0);
  if (!Number.isInteger(pointValue) || pointValue <= 0) return { error: `invalid_point_value:${item.id}` };
  const interactionType = String(item.interactionType ?? "");
  const slotType: PssaFormSlotType = interactionType === "SHORT_ANSWER"
    ? "short_answer"
    : ecCategory === "D"
      ? "conventions_1pt"
      : pointValue > 1
        ? "multipoint"
        : "reading_1pt";
  const directPassageId = primaryPassageId(item) ?? ((item as any).passageId ?? null);
  const groupId = passageGroupIdFor(item);
  const passageUnitId = slotType === "conventions_1pt" ? null : (groupId || directPassageId);
  if (slotType === "conventions_1pt" && (pointValue !== 1 || passageUnitId)) return { error: `invalid_conventions_slot:${item.id}` };
  if ((slotType === "reading_1pt" || slotType === "multipoint" || slotType === "short_answer") && !passageUnitId) return { error: `missing_primary_passage:${item.id}` };
  if (groupId && !EOY_UNIT_SECTIONS.has(groupId)) return { error: `missing_primary_passage:${item.id}` };
  if (passageUnitId && !EOY_UNIT_SECTIONS.has(passageUnitId)) return { error: `unknown_passage_unit:${item.id}:${passageUnitId}` };
  if (slotType === "reading_1pt" && pointValue !== 1) return { error: `invalid_reading_point_value:${item.id}` };
  if (slotType === "short_answer" && pointValue !== GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.shortAnswerPointsEach) return { error: `invalid_short_answer_points:${item.id}` };
  if (!item.approvedContentHash) return { error: `missing_approved_hash:${item.id}` };
  const bucket = eoyBucketFor(item);
  if (typeof bucket !== "string") return bucket;
  const sectionIndex = passageUnitId ? EOY_UNIT_SECTIONS.get(passageUnitId)! : sectionForEoyConvention(item.id);
  if (!sectionIndex) return { error: `section_unresolved:${item.id}` };
  return {
    item,
    itemId: item.id,
    category: ecCategory,
    slotType,
    pointValue,
    primaryPassageId: slotType === "conventions_1pt" ? null : directPassageId,
    scoringBucket: bucket,
    passageUnitId,
    rawPassageIds: groupId ? groupedPassageIds(item) : (directPassageId ? [directPassageId] : []),
    sectionIndex,
    approvedContentHashSnapshot: item.approvedContentHash,
  };
}

export function validateEoySelectedForm(input: {
  selected: DiagnosticClassifiedItem[];
  selectedPassages: SelectedPassage[];
  sections: SelectedSection[];
  liveReadyIds: Set<string>;
}) {
  const { selected, selectedPassages, sections, liveReadyIds } = input;
  const gates: GateResult[] = [];
  const itemIds = selected.map((row) => row.itemId);
  const duplicateItems = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
  const selectedItems: SelectedFormItem[] = selected.map((row, index) => ({
    position: index + 1,
    itemId: row.itemId,
    slotType: row.slotType,
    pointValue: row.pointValue,
    category: row.category,
    passageId: row.primaryPassageId,
    sectionIndex: row.sectionIndex,
    passageUnitId: row.passageUnitId,
    scoringBucket: row.scoringBucket,
    approvedContentHashSnapshot: row.approvedContentHashSnapshot,
  }));
  const operational = selected.filter((row) => row.scoringBucket === "operational");
  const analytics = selected.filter((row) => row.scoringBucket === "analytics_only");
  const operationalItems = selectedItems.filter((item) => item.scoringBucket !== "analytics_only");
  const categoryPoints = selectedCategoryPoints(operationalItems);
  const totalPoints = operational.reduce((sum, row) => sum + row.pointValue, 0);
  const analyticsPoints = analytics.reduce((sum, row) => sum + row.pointValue, 0);
  const deliveredPoints = selected.reduce((sum, row) => sum + row.pointValue, 0);
  const passageUnitIds = new Set(selected.filter((row) => row.passageUnitId).map((row) => row.passageUnitId!));
  const passageIds = new Set(selectedPassages.map((passage) => passage.passageId));
  const analyticsIds = new Set(analytics.map((row) => row.itemId));
  const expectedAnalytics = [...EOY_ANALYTICS_ITEM_IDS].sort();
  const expectedBucketsOk = selected.every((row) => row.scoringBucket === expectedEoyBucket(row.itemId));
  const deliveredTypeTotals = typeTotals(selected);
  const operationalTypeTotals = typeTotals(operational);
  const analyticsTypeTotals = typeTotals(analytics);
  const positionRows = operational.filter((row) => row.item.interactionType === "MCQ" || row.item.interactionType === "INLINE_DROPDOWN");
  const correctPositions = positionRows.map((row) => correctPosition(row.item)).filter((position): position is number => position !== null);
  const positionCounts = new Map<number, number>();
  for (const position of correctPositions) positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  const answerDetail = [0, 1, 2, 3].map((index) => positionCounts.get(index) ?? 0);
  const maxShare = correctPositions.length ? Math.max(...positionCounts.values()) / correctPositions.length : 0;
  const operationalEcCounts = countsByEc(operational);
  const deliveredEcCounts = countsByEc(selected);
  const operationalTriples = [...operationalEcCounts].filter(([, count]) => count === 3).map(([ec]) => ec).sort();
  const deliveredTriples = [...deliveredEcCounts].filter(([, count]) => count === 3).map(([ec]) => ec).sort();
  const operationalReadingMcqEcCounts = countsByEc(operational.filter((row) => row.item.interactionType === "MCQ" && row.category !== "D"));
  const deliveredReadingMcqEcCounts = countsByEc(selected.filter((row) => row.item.interactionType === "MCQ" && row.category !== "D"));
  const maxOperationalReadingMcqRepeat = Math.max(0, ...operationalReadingMcqEcCounts.values());
  const maxDeliveredReadingMcqRepeat = Math.max(0, ...deliveredReadingMcqEcCounts.values());
  const p3Rows = selected.filter((row) => row.passageUnitId === "pssa_pg_g3_eoy_p3_school_paired");
  const p3Passages = selectedPassages.filter((passage) => passage.passageUnitId === "pssa_pg_g3_eoy_p3_school_paired");
  const readinessFailures = selected
    .map((row) => ({ row, reason: computeStudentReadyBlockedReason(row.item) }))
    .filter(({ reason }) => reason !== "NONE")
    .map(({ row, reason }) => `${row.itemId}:${reason}`);
  const conventionSectionByEc = new Map(operational.filter((row) => row.slotType === "conventions_1pt").map((row) => [String(row.item.eligibleContent), row.sectionIndex]));
  const expectedS1Conventions = ["E03.D.1.1.2", "E03.D.1.1.3", "E03.D.1.1.6", "E03.D.1.1.7", "E03.D.1.1.9"];
  const expectedS3Conventions = ["E03.D.1.2.2", "E03.D.1.2.3", "E03.D.1.2.4", "E03.D.1.2.6"];

  addGate(gates, "section_count", sections.length === 3, `${sections.length}`);
  addGate(gates, "live_selector_membership", selected.every((row) => liveReadyIds.has(row.itemId)), "all selected items must be live selector results");
  addGate(gates, "selected_item_readiness", readinessFailures.length === 0, readinessFailures.join("|") || "all selected items must recompute to NONE");
  addGate(gates, "delivered_count", selected.length === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.deliveredItems, `${selected.length}`);
  addGate(gates, "delivered_points", deliveredPoints === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.deliveredPossiblePoints, `${deliveredPoints}`);
  addGate(gates, "operational_total", operational.length === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.operational.items && totalPoints === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.operational.points, `${operational.length}/${totalPoints}`);
  addGate(gates, "analytics_total", analytics.length === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.analyticsOnly.items && analyticsPoints === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.analyticsOnly.points, `${analytics.length}/${analyticsPoints}`);
  addGate(gates, "analytics_id_set", stableStringify([...analyticsIds].sort()) === stableStringify(expectedAnalytics), [...analyticsIds].sort().join("|"));
  addGate(gates, "scoring_bucket_assignment", expectedBucketsOk, selected.filter((row) => row.scoringBucket !== expectedEoyBucket(row.itemId)).map((row) => `${row.itemId}:${row.scoringBucket}->${expectedEoyBucket(row.itemId)}`).join("|") || "pinned buckets");
  addGate(gates, "passage_count", passageUnitIds.size === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.passageUnits && selectedPassages.length === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.rawPassages, `${passageUnitIds.size} units/${selectedPassages.length} rows`);
  addGate(gates, "passage_membership", selected.every((row) => row.slotType === "conventions_1pt" || row.rawPassageIds.every((id) => passageIds.has(id))), "all passage-based items use form passages");
  addGate(gates, "p3_group_integrity", p3Rows.length === 10 && p3Rows.every((row) => row.sectionIndex === 2) && p3Passages.length === 2 && p3Passages.every((row) => row.sectionIndex === 2), `p3Items=${p3Rows.length}; p3Passages=${p3Passages.length}`);
  addGate(gates, "no_duplicate_items", duplicateItems.length === 0, duplicateItems.join("|") || "none");
  addGate(gates, "no_deprecated_or_retired", selected.every((row) => row.item.itemStatus === "pilot_ready" && !row.item.retiredAt && !row.item.deprecatedReason), "selector should make this structural");
  addGate(gates, "delivered_type_totals", typeTotalsMatch(deliveredTypeTotals, { readingMcq: 26, conventions: 9, ebsr: 4, te: 4, shortAnswer: 2 }), stableStringify(deliveredTypeTotals));
  addGate(gates, "operational_type_totals", typeTotalsMatch(operationalTypeTotals, { readingMcq: 20, conventions: 9, ebsr: 2, te: 2, shortAnswer: 2 }), stableStringify(operationalTypeTotals));
  addGate(gates, "analytics_type_totals", typeTotalsMatch(analyticsTypeTotals, { readingMcq: 6, conventions: 0, ebsr: 2, te: 2, shortAnswer: 0 }), stableStringify(analyticsTypeTotals));
  addGate(gates, "answer_position_distribution", correctPositions.length === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.operationalAnswerPositionEligibleItems && stableStringify(answerDetail) === stableStringify(GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.operationalAnswerPositionDistribution) && maxShare <= GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.maxCorrectPositionShare, `eligible=${correctPositions.length} A=${answerDetail[0]} B=${answerDetail[1]} C=${answerDetail[2]} D=${answerDetail[3]} maxShare=${maxShare.toFixed(3)}`);
  addGate(gates, "operational_ec_caps", stableStringify(operationalTriples) === stableStringify(["E03.A-K.1.1.2", "E03.A-K.1.1.3"]) && Math.max(...operationalEcCounts.values()) === 3 && maxOperationalReadingMcqRepeat <= GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.maxOperationalReadingMcqEcRepeats, `triples=${operationalTriples.join("|")}; opReadingMcqMax=${maxOperationalReadingMcqRepeat}; ${ecCountDetail(operationalEcCounts)}`);
  addGate(gates, "delivered_ec_caps", stableStringify(deliveredTriples) === stableStringify(["E03.A-K.1.1.2", "E03.A-K.1.1.3", "E03.A-V.4.1.2", "E03.B-V.4.1.1"]) && maxDeliveredReadingMcqRepeat <= GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.maxDeliveredReadingMcqEcRepeats, `triples=${deliveredTriples.join("|")}; maxReadingMcq=${maxDeliveredReadingMcqRepeat}; ${ecCountDetail(deliveredEcCounts)}`);
  addGate(gates, "conventions_by_ec_section", expectedS1Conventions.every((ec) => conventionSectionByEc.get(ec) === 1) && expectedS3Conventions.every((ec) => conventionSectionByEc.get(ec) === 3), `S1=${expectedS1Conventions.map((ec) => `${ec}:${conventionSectionByEc.get(ec)}`).join("|")} S3=${expectedS3Conventions.map((ec) => `${ec}:${conventionSectionByEc.get(ec)}`).join("|")}`);
  for (const section of GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.sections) {
    const rows = selected.filter((row) => row.sectionIndex === section.sectionIndex);
    const opRows = rows.filter((row) => row.scoringBucket === "operational");
    const analyticsRows = rows.filter((row) => row.scoringBucket === "analytics_only");
    const detail = `delivered=${rows.length} op=${opRows.length}/${opRows.reduce((sum, row) => sum + row.pointValue, 0)} analytics=${analyticsRows.length}/${analyticsRows.reduce((sum, row) => sum + row.pointValue, 0)}`;
    const ok = rows.length === section.delivered
      && opRows.length === section.operationalItems
      && opRows.reduce((sum, row) => sum + row.pointValue, 0) === section.operationalPoints
      && analyticsRows.length === section.analyticsItems
      && analyticsRows.reduce((sum, row) => sum + row.pointValue, 0) === section.analyticsPoints;
    addGate(gates, `section_${section.sectionIndex}_composition`, ok, detail);
  }

  return { gates, categoryPoints, totalPoints, selectedItems };
}

function orderSelectedItems(seed: string, selected: ClassifiedAssemblyItem[], passageOrder: string[]) {
  const byPassage = passageOrder.flatMap((passageId) => {
    const block = selected.filter((row) => row.primaryPassageId === passageId && (row.slotType === "reading_1pt" || row.slotType === "multipoint"));
    return [
      ...deterministicSort(seed, block.filter((row) => row.slotType === "reading_1pt").map((row) => ({ ...row, id: row.itemId }))),
      ...deterministicSort(seed, block.filter((row) => row.slotType === "multipoint").map((row) => ({ ...row, id: row.itemId }))),
    ];
  });
  return [
    ...byPassage,
    ...deterministicSort(seed, selected.filter((row) => row.slotType === "conventions_1pt").map((row) => ({ ...row, id: row.itemId }))),
    ...deterministicSort(seed, selected.filter((row) => row.slotType === "short_answer").map((row) => ({ ...row, id: row.itemId }))),
  ];
}

function collectPassageMap(items: PssaAssemblyItem[]) {
  const passageMap = new Map<string, PssaAssemblyPassage>();
  for (const item of items) {
    for (const link of item.passages ?? []) {
      if (link.passage) passageMap.set(link.passage.id, link.passage as PssaAssemblyPassage);
    }
    for (const member of ((item as any).passageGroup?.members ?? [])) {
      if (member?.passage) passageMap.set(member.passage.id, member.passage as PssaAssemblyPassage);
    }
  }
  return passageMap;
}

type MoyAssemblyOverrides = {
  sectionItemIds?: readonly (readonly string[])[];
  passageRows?: readonly { position: number; passageId: string; passageUnitId: string; sectionIndex: number }[];
};

type EoyAssemblyOverrides = {
  sectionItemIds?: readonly (readonly string[])[];
  passageRows?: readonly { position: number; passageId: string; passageUnitId: string; sectionIndex: number }[];
};

function assembleMoyDiagnosticFormFromPool(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}, overrides: MoyAssemblyOverrides = {}): AssemblyResult {
  const gates: GateResult[] = [];
  if (!input.seed) throw new Error("--seed is required.");
  if (GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.sections.length !== 3) throw new Error("MOY diagnostic blueprint requires exactly 3 sections.");
  const liveReadyIds = new Set(input.readyItems.map((item) => item.id));
  const byId = new Map(input.readyItems.map((item) => [item.id, item]));
  const sectionItemIds = overrides.sectionItemIds ?? MOY_DIAGNOSTIC_SECTION_ITEM_IDS;
  const selectedIds = sectionItemIds.flatMap((ids) => [...ids]);
  const missingIds = selectedIds.filter((id) => !byId.has(id));
  addGate(gates, "pinned_selection_presence", missingIds.length === 0, missingIds.join("|") || "all pinned MOY items present");
  const deficits = buildDeficits(input.readyItems.flatMap((item) => {
    const result = classifyAssemblyItem(item);
    return "error" in result ? [] : [result];
  }), input.allItems ?? input.readyItems);
  const sections = GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.sections.map((section) => ({
    sectionIndex: section.sectionIndex,
    sectionType: section.sectionType,
    label: section.label,
    estimatedMinutes: section.estimatedMinutes,
  }));
  if (missingIds.length) {
    return { ok: false, refusedReason: `PINNED_ITEMS_MISSING:${missingIds.join("|")}`, contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const classificationErrors: string[] = [];
  const sectionByItemId = new Map(sectionItemIds.flatMap((ids, sectionIndex) => [...ids].map((id) => [id, sectionIndex + 1] as const)));
  const selected = selectedIds.flatMap((itemId) => {
    const result = classifyMoyAssemblyItem(byId.get(itemId)!);
    if ("error" in result) {
      classificationErrors.push(result.error);
      return [];
    }
    return [{ ...result, sectionIndex: sectionByItemId.get(itemId)! }];
  });
  addGate(gates, "classification", classificationErrors.length === 0, classificationErrors.join("|") || "all pinned MOY items classified");
  if (classificationErrors.length) {
    return { ok: false, refusedReason: classificationErrors[0], contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const passageMap = collectPassageMap(input.readyItems);
  const selectedPassages: SelectedPassage[] = (overrides.passageRows ?? MOY_PASSAGE_ROWS).map((row) => ({
    ...row,
    categoryPoints: { A: 0, B: 0, D: 0 },
    approvedPassageContentHashSnapshot: passageMap.get(row.passageId)?.approvedContentHash ?? "",
  }));
  const validation = validateMoySelectedForm({ selected, selectedPassages, sections, liveReadyIds });
  for (const passage of selectedPassages) {
    const passageItems = validation.selectedItems.filter((item) => item.passageUnitId === passage.passageUnitId && item.scoringBucket !== "analytics_only");
    passage.categoryPoints = selectedCategoryPoints(passageItems);
  }
  const allGates = [...gates, ...validation.gates];
  if (allGates.some((gate) => gate.status === "FAIL")) {
    return {
      ok: false,
      refusedReason: "BLUEPRINT_UNSATISFIED",
      contentHash: null,
      canonical: null,
      sections,
      passages: selectedPassages,
      items: validation.selectedItems,
      categoryPoints: validation.categoryPoints,
      totalPoints: validation.totalPoints,
      gates: allGates,
      deficits,
    };
  }
  const canonical = buildCanonical(input.blueprintVersion, selectedPassages, validation.selectedItems, sections);
  return {
    ok: true,
    refusedReason: null,
    contentHash: computePssaFormContentHash(canonical),
    canonical,
    sections,
    passages: selectedPassages,
    items: validation.selectedItems,
    categoryPoints: validation.categoryPoints,
    totalPoints: validation.totalPoints,
    gates: allGates,
    deficits,
  };
}

export function assembleMoyDiagnosticFormFromPoolForTest(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}, overrides: MoyAssemblyOverrides = {}) {
  return assembleMoyDiagnosticFormFromPool(input, overrides);
}

function assembleEoyDiagnosticFormFromPool(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}, overrides: EoyAssemblyOverrides = {}): AssemblyResult {
  const gates: GateResult[] = [];
  if (!input.seed) throw new Error("--seed is required.");
  if (GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.sections.length !== 3) throw new Error("EOY diagnostic blueprint requires exactly 3 sections.");
  const liveReadyIds = new Set(input.readyItems.map((item) => item.id));
  const byId = new Map(input.readyItems.map((item) => [item.id, item]));
  const sectionItemIds = overrides.sectionItemIds ?? EOY_DIAGNOSTIC_SECTION_ITEM_IDS;
  const selectedIds = sectionItemIds.flatMap((ids) => [...ids]);
  const missingIds = selectedIds.filter((id) => !byId.has(id));
  addGate(gates, "pinned_selection_presence", missingIds.length === 0, missingIds.join("|") || "all pinned EOY items present");
  const deficits = buildDeficits(input.readyItems.flatMap((item) => {
    const result = classifyAssemblyItem(item);
    return "error" in result ? [] : [result];
  }), input.allItems ?? input.readyItems);
  const sections = GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.sections.map((section) => ({
    sectionIndex: section.sectionIndex,
    sectionType: section.sectionType,
    label: section.label,
    estimatedMinutes: section.estimatedMinutes,
  }));
  if (missingIds.length) {
    return { ok: false, refusedReason: `PINNED_ITEMS_MISSING:${missingIds.join("|")}`, contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const classificationErrors: string[] = [];
  const sectionByItemId = new Map(sectionItemIds.flatMap((ids, sectionIndex) => [...ids].map((id) => [id, sectionIndex + 1] as const)));
  const selected = selectedIds.flatMap((itemId) => {
    const result = classifyEoyAssemblyItem(byId.get(itemId)!);
    if ("error" in result) {
      classificationErrors.push(result.error);
      return [];
    }
    return [{ ...result, sectionIndex: sectionByItemId.get(itemId)! }];
  });
  addGate(gates, "classification", classificationErrors.length === 0, classificationErrors.join("|") || "all pinned EOY items classified");
  if (classificationErrors.length) {
    return { ok: false, refusedReason: classificationErrors[0], contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const passageMap = collectPassageMap(input.readyItems);
  const selectedPassages: SelectedPassage[] = (overrides.passageRows ?? EOY_PASSAGE_ROWS).map((row) => ({
    ...row,
    categoryPoints: { A: 0, B: 0, D: 0 },
    approvedPassageContentHashSnapshot: passageMap.get(row.passageId)?.approvedContentHash ?? "",
  }));
  const validation = validateEoySelectedForm({ selected, selectedPassages, sections, liveReadyIds });
  for (const passage of selectedPassages) {
    const passageItems = validation.selectedItems.filter((item) => item.passageUnitId === passage.passageUnitId && item.scoringBucket !== "analytics_only");
    passage.categoryPoints = selectedCategoryPoints(passageItems);
  }
  const allGates = [...gates, ...validation.gates];
  if (allGates.some((gate) => gate.status === "FAIL")) {
    return {
      ok: false,
      refusedReason: "BLUEPRINT_UNSATISFIED",
      contentHash: null,
      canonical: null,
      sections,
      passages: selectedPassages,
      items: validation.selectedItems,
      categoryPoints: validation.categoryPoints,
      totalPoints: validation.totalPoints,
      gates: allGates,
      deficits,
    };
  }
  const canonical = buildCanonical(input.blueprintVersion, selectedPassages, validation.selectedItems, sections);
  return {
    ok: true,
    refusedReason: null,
    contentHash: computePssaFormContentHash(canonical),
    canonical,
    sections,
    passages: selectedPassages,
    items: validation.selectedItems,
    categoryPoints: validation.categoryPoints,
    totalPoints: validation.totalPoints,
    gates: allGates,
    deficits,
  };
}

export function assembleEoyDiagnosticFormFromPoolForTest(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}, overrides: EoyAssemblyOverrides = {}) {
  return assembleEoyDiagnosticFormFromPool(input, overrides);
}

export function assembleDiagnosticFormFromPool(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}): AssemblyResult {
  const gates: GateResult[] = [];
  if (!input.seed) throw new Error("--seed is required.");
  if (input.blueprintVersion === GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion) return assembleMoyDiagnosticFormFromPool(input);
  if (input.blueprintVersion === GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion) return assembleEoyDiagnosticFormFromPool(input);
  if (input.blueprintVersion !== GRADE3_DIAGNOSTIC_BLUEPRINT.blueprintVersion) throw new Error(`Unsupported blueprint: ${input.blueprintVersion}`);
  if (GRADE3_DIAGNOSTIC_BLUEPRINT.sections.length !== 3) throw new Error("Diagnostic blueprint requires exactly 3 sections.");
  const liveReadyIds = new Set(input.readyItems.map((item) => item.id));
  const byId = new Map(input.readyItems.map((item) => [item.id, item]));
  const selectedIds = DIAGNOSTIC_SECTION_ITEM_IDS.flat();
  const missingIds = selectedIds.filter((id) => !byId.has(id));
  addGate(gates, "pinned_selection_presence", missingIds.length === 0, missingIds.join("|") || "all pinned items present");
  const passageMap = collectPassageMap(input.readyItems);
  const sections = GRADE3_DIAGNOSTIC_BLUEPRINT.sections.map((section) => ({
    sectionIndex: section.sectionIndex,
    sectionType: section.sectionType,
    label: section.label,
    estimatedMinutes: section.estimatedMinutes,
  }));
  const deficits = buildDeficits(input.readyItems.flatMap((item) => {
    const result = classifyAssemblyItem(item);
    return "error" in result ? [] : [result];
  }), input.allItems ?? input.readyItems);
  if (missingIds.length) {
    return { ok: false, refusedReason: `PINNED_ITEMS_MISSING:${missingIds.join("|")}`, contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const classificationErrors: string[] = [];
  const selected = selectedIds.flatMap((itemId) => {
    const result = classifyDiagnosticAssemblyItem(byId.get(itemId)!);
    if ("error" in result) {
      classificationErrors.push(result.error);
      return [];
    }
    return [result];
  });
  addGate(gates, "classification", classificationErrors.length === 0, classificationErrors.join("|") || "all pinned diagnostic items classified");
  if (classificationErrors.length) {
    return { ok: false, refusedReason: classificationErrors[0], contentHash: null, canonical: null, sections, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const sectionByItemId = new Map(DIAGNOSTIC_SECTION_ITEM_IDS.flatMap((ids, sectionIndex) => ids.map((id) => [id, sectionIndex + 1] as const)));
  for (const row of selected) row.sectionIndex = sectionByItemId.get(row.itemId)!;
  const selectedPassages: SelectedPassage[] = [
    { position: 1, passageId: "pssa_stamina_psg_g3_syrup_v4", passageUnitId: "pssa_stamina_psg_g3_syrup_v4", sectionIndex: 1 },
    { position: 2, passageId: "pssa_stamina_psg_g3_boat_literary", passageUnitId: "pssa_stamina_psg_g3_boat_literary", sectionIndex: 2 },
    { position: 3, passageId: "pssa_stamina_psg_g3_owls_p1_night", passageUnitId: "pssa_pg_g3_owls_paired_01", sectionIndex: 3 },
    { position: 4, passageId: "pssa_stamina_psg_g3_owls_p2_barn", passageUnitId: "pssa_pg_g3_owls_paired_01", sectionIndex: 3 },
    { position: 5, passageId: "pssa_stamina_psg_g3_rabbit_drama", passageUnitId: "pssa_stamina_psg_g3_rabbit_drama", sectionIndex: 3 },
  ].map((row) => ({
    ...row,
    categoryPoints: { A: 0, B: 0, D: 0 },
    approvedPassageContentHashSnapshot: passageMap.get(row.passageId)?.approvedContentHash ?? "",
  }));
  const validation = validateDiagnosticSelectedForm({ selected, selectedPassages, sections, liveReadyIds });
  for (const passage of selectedPassages) {
    const passageItems = validation.selectedItems.filter((item) => item.passageUnitId === passage.passageUnitId);
    passage.categoryPoints = selectedCategoryPoints(passageItems);
  }
  const allGates = [...gates, ...validation.gates];
  if (allGates.some((gate) => gate.status === "FAIL")) {
    return {
      ok: false,
      refusedReason: "BLUEPRINT_UNSATISFIED",
      contentHash: null,
      canonical: null,
      sections,
      passages: selectedPassages,
      items: validation.selectedItems,
      categoryPoints: validation.categoryPoints,
      totalPoints: validation.totalPoints,
      gates: allGates,
      deficits,
    };
  }
  const canonical = buildCanonical(input.blueprintVersion, selectedPassages, validation.selectedItems, sections);
  return {
    ok: true,
    refusedReason: null,
    contentHash: computePssaFormContentHash(canonical),
    canonical,
    sections,
    passages: selectedPassages,
    items: validation.selectedItems,
    categoryPoints: validation.categoryPoints,
    totalPoints: validation.totalPoints,
    gates: allGates,
    deficits,
  };
}

export function assemblePssaFormFromPool(input: {
  seed: string;
  blueprintVersion: string;
  readyItems: PssaAssemblyItem[];
  allItems?: PssaAssemblyItem[];
}): AssemblyResult {
  const gates: GateResult[] = [];
  if (!input.seed) throw new Error("--seed is required.");
  if (input.blueprintVersion !== GRADE3_BLUEPRINT.blueprintVersion) throw new Error(`Unsupported blueprint: ${input.blueprintVersion}`);
  const liveReadyIds = new Set(input.readyItems.map((item) => item.id));
  const classificationErrors: string[] = [];
  const classified = input.readyItems.flatMap((item) => {
    const result = classifyAssemblyItem(item);
    if ("error" in result) {
      classificationErrors.push(result.error);
      return [];
    }
    return [result];
  });
  addGate(gates, "classification", classificationErrors.length === 0, classificationErrors.join("|") || "all selected-pool items classified");
  const deficits = buildDeficits(classified, input.allItems ?? input.readyItems);
  for (const deficit of deficits) {
    if (deficit.slot.startsWith("category_")) {
      const category = deficit.slot.split("_")[1];
      const range = GRADE3_BLUEPRINT.categoryPointRanges[category as PssaFormCategory];
      addGate(gates, deficit.slot, deficit.available >= range.min, `${deficit.available} available; selected form must be ${range.min}-${range.max}`);
    } else if (deficit.deficit > 0) {
      addGate(gates, `${deficit.slot}_available`, false, `${deficit.available} available; requires ${deficit.required}`);
    }
  }
  if (classificationErrors.length) {
    return { ok: false, refusedReason: classificationErrors[0], contentHash: null, canonical: null, passages: [], items: [], categoryPoints: { A: 0, B: 0, D: 0 }, totalPoints: 0, gates, deficits };
  }

  const passageMap = new Map<string, PssaAssemblyPassage>();
  for (const row of classified) {
    for (const link of row.item.passages ?? []) {
      if (link.passage) passageMap.set(link.passage.id, link.passage as PssaAssemblyPassage);
    }
  }
  const passageIds = deterministicSort(input.seed, [...passageMap.keys()].map((id) => ({ id }))).map((row) => row.id);
  const passageCombos = combinations(passageIds, GRADE3_BLUEPRINT.passages);
  const conventionPool = deterministicSort(input.seed, classified.filter((row) => row.slotType === "conventions_1pt").map((row) => ({ ...row, id: row.itemId })));

  let bestFailure: { gates: GateResult[]; selected: ClassifiedAssemblyItem[]; passages: SelectedPassage[] } | null = null;
  for (const combo of passageCombos) {
    const comboSet = new Set(combo);
    const readingPool = deterministicSort(input.seed, classified.filter((row) => row.slotType === "reading_1pt" && comboSet.has(row.primaryPassageId!)).map((row) => ({ ...row, id: row.itemId })));
    const multipointPool = deterministicSort(input.seed, classified.filter((row) => row.slotType === "multipoint" && comboSet.has(row.primaryPassageId!)).map((row) => ({ ...row, id: row.itemId })));
    const shortAnswerPool = deterministicSort(input.seed, classified.filter((row) => row.slotType === "short_answer" && comboSet.has(row.primaryPassageId!)).map((row) => ({ ...row, id: row.itemId })));
    const conventions = conventionPool.slice(0, GRADE3_BLUEPRINT.conventionsOnePoint);
    const shortAnswer = shortAnswerPool.slice(0, GRADE3_BLUEPRINT.shortAnswerItems);
    const multipointCombos = combinations(multipointPool, 3).concat(combinations(multipointPool, 4));
    for (const multipoint of multipointCombos) {
      const multipointPoints = multipoint.reduce((sum, row) => sum + row.pointValue, 0);
      const neededReadingPoints = GRADE3_BLUEPRINT.totalPoints - GRADE3_BLUEPRINT.conventionsOnePoint - (GRADE3_BLUEPRINT.shortAnswerItems * GRADE3_BLUEPRINT.shortAnswerPointsEach) - multipointPoints;
      if (neededReadingPoints < GRADE3_BLUEPRINT.readingOnePointRange.min || neededReadingPoints > GRADE3_BLUEPRINT.readingOnePointRange.max) continue;
      const reading = readingPool.slice(0, neededReadingPoints);
      const selectedPassages = combo.map((passageId, index) => {
        const passage = passageMap.get(passageId);
        return {
          position: index + 1,
          passageId,
          approvedPassageContentHashSnapshot: passage?.approvedContentHash ?? "",
          categoryPoints: { A: 0, B: 0, D: 0 },
        };
      });
      const ordered = orderSelectedItems(input.seed, [...reading, ...multipoint, ...conventions, ...shortAnswer], combo);
      const validation = validateSelectedForm(ordered, selectedPassages, liveReadyIds);
      for (const passage of selectedPassages) {
        const passageItems = validation.selectedItems.filter((item) => item.passageId === passage.passageId);
        passage.categoryPoints = selectedCategoryPoints(passageItems);
      }
      bestFailure = { gates: validation.gates, selected: ordered, passages: selectedPassages };
      if (validation.gates.every((gate) => gate.status === "PASS")) {
        const items = validation.selectedItems.map((item, index) => ({ ...item, position: index + 1 }));
        const canonical = buildCanonical(input.blueprintVersion, selectedPassages, items);
        return {
          ok: true,
          refusedReason: null,
          contentHash: computePssaFormContentHash(canonical),
          canonical,
          passages: selectedPassages,
          items,
          categoryPoints: validation.categoryPoints,
          totalPoints: validation.totalPoints,
          gates: [{ gate: "classification", status: "PASS", detail: "all selected-pool items classified" }, ...validation.gates],
          deficits,
        };
      }
    }
  }

  return {
    ok: false,
    refusedReason: "BLUEPRINT_UNSATISFIED",
    contentHash: null,
    canonical: null,
    passages: bestFailure?.passages ?? [],
    items: bestFailure ? bestFailure.selected.map((row, index) => ({
      position: index + 1,
      itemId: row.itemId,
      slotType: row.slotType,
      pointValue: row.pointValue,
      category: row.category,
      passageId: row.primaryPassageId,
      approvedContentHashSnapshot: row.approvedContentHashSnapshot,
    })) : [],
    categoryPoints: bestFailure ? selectedCategoryPoints(bestFailure.selected.map((row, index) => ({
      position: index + 1,
      itemId: row.itemId,
      slotType: row.slotType,
      pointValue: row.pointValue,
      category: row.category,
      passageId: row.primaryPassageId,
      approvedContentHashSnapshot: row.approvedContentHashSnapshot,
    }))) : { A: 0, B: 0, D: 0 },
    totalPoints: bestFailure ? bestFailure.selected.reduce((sum, row) => sum + row.pointValue, 0) : 0,
    gates: [...gates, ...(bestFailure?.gates ?? [])],
    deficits,
  };
}

export function verifyPssaFormSnapshots(input: {
  form: {
    id: string;
    formStatus: string;
    items: Array<{ itemId: string; approvedContentHashSnapshot: string; passageIdSnapshot: string | null; item: PssaAssemblyItem }>;
    passages: Array<{ passageId: string; approvedPassageContentHashSnapshot: string; passage: PssaAssemblyPassage }>;
  };
  liveReadyItems: PssaAssemblyItem[];
}) {
  const liveReadyIds = new Set(input.liveReadyItems.map((item) => item.id));
  const failures: string[] = [];
  for (const row of input.form.items) {
    if (!liveReadyIds.has(row.itemId)) failures.push(`item_not_live_ready:${row.itemId}`);
    if (row.item.approvedContentHash !== row.approvedContentHashSnapshot) failures.push(`item_hash_drift:${row.itemId}`);
    const currentPrimary = primaryPassageId(row.item);
    if ((currentPrimary ?? null) !== (row.passageIdSnapshot ?? null)) failures.push(`item_primary_passage_drift:${row.itemId}`);
    const readiness = computeStudentReadyBlockedReason(row.item);
    if (readiness !== "NONE") failures.push(`item_readiness:${row.itemId}:${readiness}`);
  }
  for (const row of input.form.passages) {
    if (row.passage.approvedContentHash !== row.approvedPassageContentHashSnapshot) failures.push(`passage_hash_drift:${row.passageId}`);
    const readiness = explainPssaPassageStudentReadiness(row.passage);
    if (readiness.reason !== "NONE") failures.push(`passage_readiness:${row.passageId}:${readiness.reason}`);
  }
  return {
    ok: failures.length === 0,
    invalidatedReason: failures.join("|") || null,
    failures,
  };
}
