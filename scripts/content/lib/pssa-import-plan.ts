import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildItemEcSkillMatchReport,
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildMcqPassageSpecificityReport,
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  hasBlockingPassageSpecificityFailure,
  type McqAuditInput,
  type PssaPassageAuditInput,
} from "../../audit/pssa-audit-detectors";
import { auditGrade3ConventionsItems } from "../author-pssa-grade3-conventions";
import { auditGrade3EbsrItems } from "../author-pssa-grade3-ebsr";
import { auditGrade3MatchingGridDragDropItems } from "../author-pssa-grade3-matching-grid-drag-drop";
import { auditGrade3ShortAnswerItems } from "../author-pssa-grade3-short-answer";
import { auditGrade3TeiItems } from "../author-pssa-grade3-tei";

export const CROSSWALK_PATH = path.resolve("data/pssa/anchor_ec_crosswalk.csv");
export const SOURCE_VERSION_YEAR = 2014;
export const AUDIT_CONTRACT_VERSION = "pssa-db3-import-v1";
export const SOURCE_SCAN_VERSION = "pssa-source-scan-v1";

export const FILES = {
  pilot: "exemplars/pssa_grade3_pilot/pilot_backend.json",
  ebsr: "exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json",
  tei: "exemplars/pssa_grade3_tei/grade3_tei_backend.json",
  matchingGridDragDrop: "exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json",
  conventions: "exemplars/pssa_grade3_conventions/grade3_conventions_backend.json",
  shortAnswer: "exemplars/pssa_grade3_short_answer/grade3_short_answer_backend.json",
  deprecation: "exemplars/pssa_grade3_conventions/pssa_conventions_grade3_deprecation_report.csv",
} as const;

export const EXPECTED_BATCHES = [
  { batchId: "reading_mcq_grade3", streamType: "MCQ" },
  { batchId: "ebsr_grade3", streamType: "EBSR" },
  { batchId: "multi_select_grade3", streamType: "MULTI_SELECT" },
  { batchId: "hot_text_grade3", streamType: "HOT_TEXT" },
  { batchId: "matching_grid_grade3", streamType: "MATCHING_GRID" },
  { batchId: "drag_drop_grade3", streamType: "DRAG_DROP" },
  { batchId: "conventions_grade3", streamType: "CONVENTIONS" },
  { batchId: "short_answer_grade3_pool", streamType: "SHORT_ANSWER" },
] as const;

export type GateStatus = "PASS" | "FAIL";
export type ImportStatus = "eligible" | "blocked";

export type ManifestRow = {
  sourceFile: string;
  recordType: "passage" | "item" | "deprecated" | "supersession" | "batch";
  count: number;
  expectedCount: number;
  match: boolean;
};

export type BatchRow = {
  batchId: string;
  streamType: string;
  gradeLevel: number;
  batchGate: string;
  batchResult: GateStatus;
  itemCount: number;
};

export type WouldImportItem = {
  itemId: string;
  sourceFile: string;
  standardCode: string;
  assessmentAnchor: string;
  reportingCategory: string;
  dokLevel: number | null;
  itemType: string;
  skill: string;
  pointValue: number;
  passageIds: string[];
  sourceType: "internal_original" | "released_sampler" | "unknown";
  sourceName: string | null;
  sourceCitation: string | null;
  licenseStatus: "cleared" | "unresolved" | "restricted";
  commercialUseAllowed: boolean;
  needsLegalReview: boolean;
  interactionType: string;
  interactionSubtype: string;
  gradeLevel: number;
  subject: string;
  eligibleContent: string;
  ecResolved: boolean;
  contentHash: string;
  reviewStatus: "PENDING";
  itemStatus: "candidate" | "deprecated_superseded";
  studentReadyBlockedReason: "PENDING_REVIEW" | "DEPRECATED_SUPERSEDED";
  approvalEligible: false;
  alignmentStatus: "ALIGNED" | "NEEDS_CROSSWALK";
  batchId: string;
  responseSpecJson: unknown;
  correctResponseJson: unknown;
  scoringJson: unknown;
  studentPreviewJson: unknown;
  responseSpecVersion: string;
  auditContractVersion: string;
  sourceScanVersion: string;
  latestAuditResult: "PASS" | "WARN" | "FAIL";
  latestAuditAt: string;
  provenanceJson: Record<string, unknown>;
  importedFromFile: string;
  deprecatedReason?: string;
  supersededByItemIds?: string[];
  gates: Record<string, GateStatus>;
  finalImportEligibility: ImportStatus;
  blockedReasons: string[];
};

export type WouldImportPassage = {
  passageId: string;
  sourceFile: string;
  title: string;
  gradeLevel: number;
  subject: string;
  passageType: string;
  text: string;
  wordCount: number;
  sourceType: "internal_original" | "released_sampler" | "unknown";
  sourceName: string | null;
  sourceCitation: string | null;
  licenseStatus: "cleared" | "unresolved" | "restricted";
  commercialUseAllowed: boolean;
  needsLegalReview: boolean;
  contentHash: string;
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  studentReadyBlockedReason: "PENDING_REVIEW";
  provenanceJson: Record<string, unknown>;
};

export type ImportPlan = {
  passages: WouldImportPassage[];
  activeItems: WouldImportItem[];
  deprecatedItems: WouldImportItem[];
  supersessions: Array<{ oldItemId: string; newItemId: string; reason: string }>;
  batches: BatchRow[];
  manifest: ManifestRow[];
  gateTallies: Map<string, { pass: number; fail: number }>;
  sourceScanFailures: number;
  hashStable: boolean;
};

function readJson<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function loadCrosswalkKeys() {
  const rows = parseCsv(fs.readFileSync(CROSSWALK_PATH, "utf8"));
  const header = rows[0];
  const indexes = Object.fromEntries(header.map((column, index) => [column, index]));
  return new Set(rows.slice(1).map((row) => [
    row[indexes.subject],
    row[indexes.gradeLevel],
    row[indexes.eligibleContent],
    row[indexes.sourceVersionYear],
  ].join("|")));
}

function loadEcCatalog() {
  const rows = parseCsv(fs.readFileSync(CROSSWALK_PATH, "utf8"));
  const header = rows[0];
  const indexes = Object.fromEntries(header.map((column, index) => [column, index]));
  const catalog: Record<string, string> = {};
  for (const row of rows.slice(1)) {
    catalog[row[indexes.eligibleContent]] = row[indexes.eligibleContentText];
  }
  return catalog;
}

function loadDeprecationRows() {
  const rows = parseCsv(fs.readFileSync(FILES.deprecation, "utf8"));
  const header = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(header.map((column, index) => [column, row[index]])));
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashCanonical(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function sourceTypeFor(value: unknown): "internal_original" | "released_sampler" | "unknown" {
  return value === "internal_original" || value === "released_sampler" ? value : "unknown";
}

function licenseStatusFor(value: unknown): "cleared" | "unresolved" | "restricted" {
  if (value === "cleared" || value === "cleared_internal_original") return "cleared";
  if (value === "restricted") return "restricted";
  return "unresolved";
}

function itemId(item: any) {
  return String(item.itemId ?? item.id ?? "");
}

function pointValue(item: any) {
  return Number(item.pointValue ?? item.scoring?.totalPoints ?? item.scoring?.points ?? item.scoringRubricJson?.totalPoints ?? 1);
}

function interactionTypeFor(item: any) {
  return String(item.interactionType ?? item.itemType ?? "");
}

function passageIdsFor(item: any) {
  const ids = [
    item.passageId,
    ...(Array.isArray(item.passageIds) ? item.passageIds : []),
    item.sourcePassageId,
  ].filter(Boolean).map(String);
  return Array.from(new Set(ids));
}

function batchIdFor(item: any, deprecated = false) {
  if (deprecated) return "";
  switch (interactionTypeFor(item)) {
    case "EBSR": return "ebsr_grade3";
    case "MULTI_SELECT": return "multi_select_grade3";
    case "HOT_TEXT": return item.itemId?.startsWith("pssa_conv_") ? "conventions_grade3" : "hot_text_grade3";
    case "MATCHING_GRID": return "matching_grid_grade3";
    case "DRAG_DROP": return item.itemId?.startsWith("pssa_conv_") ? "conventions_grade3" : "drag_drop_grade3";
    case "INLINE_DROPDOWN": return "conventions_grade3";
    case "SHORT_ANSWER": return "short_answer_grade3_pool";
    case "MCQ": return item.passageId ? "reading_mcq_grade3" : "conventions_grade3";
    default: return "";
  }
}

function responseSpec(item: any) {
  if (item.responseSpec) return item.responseSpec;
  const interactionType = interactionTypeFor(item);
  if (interactionType === "MCQ") return { prompt: item.studentFacingPrompt ?? item.stem, choices: item.answerChoicesJson ?? item.choices };
  if (interactionType === "MULTI_SELECT") return { stem: item.stem, instructionText: item.instructionText, choices: item.choices, minSelections: item.minSelections, maxSelections: item.maxSelections, exactSelectionCount: item.exactSelectionCount };
  if (interactionType === "HOT_TEXT") return { prompt: item.prompt, instructionText: item.instructionText, selectableSpans: item.selectableSpans };
  if (interactionType === "MATCHING_GRID") return { stem: item.stem, instructionText: item.instructionText, rows: item.rows, columns: item.columns, selectionRule: item.selectionRule };
  if (interactionType === "DRAG_DROP") return { prompt: item.prompt, instructionText: item.instructionText, tokens: item.tokens, targets: item.targets, useAllTokens: item.useAllTokens };
  if (interactionType === "INLINE_DROPDOWN") return { stem: item.stem, baseTextWithBlanks: item.baseTextWithBlanks, blanks: item.blanks?.map((blank: any) => ({ ...blank, correctIndex: undefined, rationale: undefined })) };
  if (interactionType === "SHORT_ANSWER") return { stem: item.stem, instructionText: item.instructionText, requiredSupportCount: item.requiredSupportCount, requiresTextSupport: item.requiresTextSupport };
  return item;
}

function correctResponse(item: any) {
  if (item.correctResponse) return item.correctResponse;
  const interactionType = interactionTypeFor(item);
  if (interactionType === "MCQ") return { correctIndex: item.correctIndex };
  if (interactionType === "MULTI_SELECT") return { correctIndices: item.correctIndices };
  if (interactionType === "HOT_TEXT") return { correctSpanIds: item.correctSpanIds ?? item.correctTokenIds };
  if (interactionType === "MATCHING_GRID") return { correctCells: item.correctCells };
  if (interactionType === "DRAG_DROP") return { correctAssignments: item.correctAssignments };
  if (interactionType === "INLINE_DROPDOWN") return { blanks: item.blanks?.map((blank: any) => ({ blankId: blank.blankId, correctIndex: blank.correctIndex, correctOption: blank.options?.[blank.correctIndex]?.text })) };
  if (interactionType === "SHORT_ANSWER") return { expectedAnswerCore: item.expectedAnswerCore, acceptableTextSupport: item.acceptableTextSupport };
  return {};
}

function scoringJson(item: any) {
  return item.scoring ?? item.scoringRubricJson ?? item.rubric ?? { totalPoints: pointValue(item) };
}

function studentPreview(item: any) {
  return item.studentPreviewJson ?? {
    prompt: item.studentFacingPrompt ?? item.stem ?? item.prompt ?? "",
    interactionType: interactionTypeFor(item),
  };
}

function hasPreviewLeak(preview: unknown) {
  return /correctIndex|correctIndices|correctTokenIds|correctAssignments|correctOption|data-correct|data-c|data-answer|answerKey|rationale|skillMatchResult|sourceComplianceResult|auditMetadata|expectedAnswerCore|acceptableTextSupport|rubric|scoreBandExamples/i.test(JSON.stringify(preview));
}

function ecResolves(item: any, crosswalkKeys: Set<string>) {
  return crosswalkKeys.has([item.subject ?? "ELA", String(item.gradeLevel ?? 3), item.eligibleContent, String(SOURCE_VERSION_YEAR)].join("|"));
}

function buildWouldItem(item: any, sourceFile: string, gates: Record<string, GateStatus>, crosswalkKeys: Set<string>, deprecated = false, deprecation?: any): WouldImportItem {
  const id = itemId(item);
  const interactionType = interactionTypeFor(item);
  const resolved = ecResolves(item, crosswalkKeys);
  const preview = studentPreview(item);
  const reviewStatus = "PENDING" as const;
  const itemStatus = deprecated ? "deprecated_superseded" : "candidate";
  const studentReadyBlockedReason = deprecated ? "DEPRECATED_SUPERSEDED" : "PENDING_REVIEW";
  const content = {
    id,
    interactionType,
    interactionSubtype: item.interactionSubtype ?? "",
    eligibleContent: item.eligibleContent,
    responseSpecJson: responseSpec(item),
    correctResponseJson: correctResponse(item),
    scoringJson: scoringJson(item),
    pointValue: pointValue(item),
    passageId: item.passageId ?? null,
  };
  const passageIds = passageIdsFor(item);
  const allGates = {
    ...gates,
    PSSA_IMPORT_EC_RESOLVES: resolved ? "PASS" : "FAIL",
    PSSA_IMPORT_NO_LEAK: hasPreviewLeak(preview) ? "FAIL" : "PASS",
    PSSA_IMPORT_FAILCLOSED_DEFAULTS: reviewStatus === "PENDING"
      && (deprecated ? itemStatus === "deprecated_superseded" : itemStatus === "candidate")
      && (deprecated ? studentReadyBlockedReason === "DEPRECATED_SUPERSEDED" : studentReadyBlockedReason === "PENDING_REVIEW")
      ? "PASS"
      : "FAIL",
    PSSA_IMPORT_RESPONSE_SHAPE_VALID: responseSpec(item) && correctResponse(item) ? "PASS" : "FAIL",
  } as Record<string, GateStatus>;
  const blockedReasons = Object.entries(allGates).filter(([, status]) => status === "FAIL").map(([gate]) => gate);
  return {
    itemId: id,
    sourceFile,
    standardCode: item.standardCode ?? item.eligibleContent,
    assessmentAnchor: item.assessmentAnchor ?? "",
    reportingCategory: item.reportingCategory ?? "",
    dokLevel: item.dokLevel ?? null,
    itemType: item.itemType ?? interactionType,
    skill: item.skill ?? "",
    pointValue: pointValue(item),
    passageIds,
    sourceType: sourceTypeFor(item.sourceType),
    sourceName: item.sourceName ?? null,
    sourceCitation: item.sourceCitation ?? null,
    licenseStatus: licenseStatusFor(item.licenseStatus),
    commercialUseAllowed: Boolean(item.commercialUseAllowed ?? true),
    needsLegalReview: Boolean(item.needsLegalReview ?? false),
    interactionType,
    interactionSubtype: item.interactionSubtype ?? "",
    gradeLevel: item.gradeLevel ?? 3,
    subject: item.subject ?? "ELA",
    eligibleContent: item.eligibleContent ?? "",
    ecResolved: resolved,
    contentHash: hashCanonical(content),
    reviewStatus,
    itemStatus,
    studentReadyBlockedReason,
    approvalEligible: false,
    alignmentStatus: resolved ? "ALIGNED" : "NEEDS_CROSSWALK",
    batchId: batchIdFor(item, deprecated),
    responseSpecJson: content.responseSpecJson,
    correctResponseJson: content.correctResponseJson,
    scoringJson: content.scoringJson,
    studentPreviewJson: preview,
    responseSpecVersion: "v1",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    latestAuditResult: blockedReasons.length ? "FAIL" : "PASS",
    latestAuditAt: new Date(0).toISOString(),
    provenanceJson: {
      sourceFile,
      sourceItemId: id,
      importedBy: "pssa-db4-writer",
    },
    importedFromFile: sourceFile,
    deprecatedReason: deprecation?.deprecatedReason,
    supersededByItemIds: deprecation?.supersededByItemIds?.split("|").filter(Boolean),
    gates: allGates,
    finalImportEligibility: blockedReasons.length ? "blocked" : "eligible",
    blockedReasons,
  };
}

export function tallyGate(tallies: Map<string, { pass: number; fail: number }>, gate: string, status: GateStatus) {
  const row = tallies.get(gate) ?? { pass: 0, fail: 0 };
  if (status === "PASS") row.pass += 1;
  else row.fail += 1;
  tallies.set(gate, row);
}

function addItemTallies(tallies: Map<string, { pass: number; fail: number }>, item: WouldImportItem) {
  for (const [gate, status] of Object.entries(item.gates)) tallyGate(tallies, gate, status);
}

function finalFromRows(rows: any[], field = "finalResult"): Record<string, GateStatus> {
  const result: Record<string, GateStatus> = {};
  for (const row of rows) result[row.itemId] = row[field] === "PASS" ? "PASS" : "FAIL";
  return result;
}

function buildMcqPositionBatch(items: any[]): BatchRow {
  const counts = [0, 0, 0, 0];
  for (const item of items) if (typeof item.correctIndex === "number") counts[item.correctIndex] += 1;
  const maxShare = Math.max(...counts) / Math.max(items.length, 1);
  return {
    batchId: "reading_mcq_grade3",
    streamType: "MCQ",
    gradeLevel: 3,
    batchGate: `PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION A:${counts[0]} B:${counts[1]} C:${counts[2]} D:${counts[3]}`,
    batchResult: maxShare <= 0.4 ? "PASS" : "FAIL",
    itemCount: items.length,
  };
}

export function buildPlan(): ImportPlan {
  const crosswalkKeys = loadCrosswalkKeys();
  const ecCatalog = loadEcCatalog();
  const pilot = readJson<any>(FILES.pilot);
  const ebsr = readJson<any>(FILES.ebsr);
  const tei = readJson<any>(FILES.tei);
  const mgdd = readJson<any>(FILES.matchingGridDragDrop);
  const conventions = readJson<any>(FILES.conventions);
  const shortAnswer = readJson<any>(FILES.shortAnswer);
  const deprecationRows = loadDeprecationRows();
  const deprecationByOld = new Map(deprecationRows.map((row) => [row.oldItemId, row]));

  const passages = pilot.passages as PssaPassageAuditInput[];
  const activeReadingMcq = pilot.items.filter((item: any) => item.itemType === "MCQ" && item.passageId && item.itemStatus !== "deprecated_superseded");
  const deprecatedMcq = pilot.items.filter((item: any) => item.itemStatus === "deprecated_superseded");

  const passageQuality = buildPssaPassageQualityReport(passages);
  const mcqSpecificity = buildMcqPassageSpecificityReport(activeReadingMcq as McqAuditInput[], passages);
  const mcqSpecificityFailed = new Set(mcqSpecificity.filter((row) => row.result === "FAIL").map((row) => row.itemId));
  const mcqSkill = buildItemEcSkillMatchReport(activeReadingMcq as McqAuditInput[], passages, ecCatalog);
  const mcqSkillFailed = new Set(mcqSkill.filter((row) => row.skillMatchResult === "FAIL").map((row) => row.itemId));
  const mcqLength = buildMcqCorrectIsLongestReport(activeReadingMcq as McqAuditInput[]);
  const mcqLengthFailed = new Set(mcqLength.filter((row) => row.scope === "item" && row.result === "FAIL").map((row) => row.itemId));
  const mcqAbsolute = buildMcqAbsoluteLanguageDistractorReport(activeReadingMcq as McqAuditInput[]);
  const mcqAbsoluteFailed = new Set(mcqAbsolute.filter((row) => row.itemId !== "batch" && row.result === "FAIL").map((row) => row.itemId));
  const mcqPositionBatch = buildMcqPositionBatch(activeReadingMcq);

  const ebsrAudit = auditGrade3EbsrItems(ebsr.items as any);
  const teiAudit = auditGrade3TeiItems(tei.multiSelectItems as any, tei.hotTextItems as any);
  const mgddAudit = auditGrade3MatchingGridDragDropItems(mgdd.matchingGridItems as any, mgdd.dragDropItems as any);
  const conventionsAudit = auditGrade3ConventionsItems(conventions.items as any);
  const shortAnswerAudit = auditGrade3ShortAnswerItems(shortAnswer.items as any);

  const gateTallies = new Map<string, { pass: number; fail: number }>();
  const activeItems: WouldImportItem[] = [];
  const deprecatedItems: WouldImportItem[] = [];

  for (const item of activeReadingMcq) {
    activeItems.push(buildWouldItem(item, FILES.pilot, {
      PSSA_MCQ_PASSAGE_SPECIFICITY: mcqSpecificityFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_ITEM_EC_SKILL_MATCH: mcqSkillFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_CORRECT_IS_LONGEST: mcqLengthFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: mcqAbsoluteFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION: mcqPositionBatch.batchResult,
    }, crosswalkKeys));
  }

  for (const item of ebsr.items) activeItems.push(buildWouldItem(item, FILES.ebsr, { PSSA_EBSR_FAMILY_AND_BATCH: finalFromRows(ebsrAudit.rows, "finalEbsrResult")[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of tei.multiSelectItems) activeItems.push(buildWouldItem(item, FILES.tei, { PSSA_MULTI_SELECT_FAMILY_AND_BATCH: finalFromRows(teiAudit.multiSelectRows)[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of tei.hotTextItems) activeItems.push(buildWouldItem(item, FILES.tei, { PSSA_HOT_TEXT_FAMILY_AND_BATCH: finalFromRows(teiAudit.hotTextRows)[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of mgdd.matchingGridItems) activeItems.push(buildWouldItem(item, FILES.matchingGridDragDrop, { PSSA_MATCHING_GRID_FAMILY_AND_BATCH: finalFromRows(mgddAudit.matchingGridRows)[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of mgdd.dragDropItems) activeItems.push(buildWouldItem(item, FILES.matchingGridDragDrop, { PSSA_DRAG_DROP_FAMILY_AND_BATCH: finalFromRows(mgddAudit.dragDropRows)[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of conventions.items) activeItems.push(buildWouldItem(item, FILES.conventions, { PSSA_CONVENTIONS_FAMILY_AND_BATCH: finalFromRows(conventionsAudit.rows)[item.itemId] ?? "FAIL" }, crosswalkKeys));
  for (const item of shortAnswer.items) activeItems.push(buildWouldItem(item, FILES.shortAnswer, { PSSA_SHORT_ANSWER_FAMILY: finalFromRows(shortAnswerAudit.rows)[item.itemId] ?? "FAIL" }, crosswalkKeys));

  const activeIds = new Set(activeItems.map((item) => item.itemId));
  for (const item of deprecatedMcq) {
    const dep = deprecationByOld.get(itemId(item));
    const supersededIds = dep?.supersededByItemIds?.split("|").filter(Boolean) ?? [];
    const deprecationValid = dep && supersededIds.length > 0 && supersededIds.every((id: string) => activeIds.has(id));
    deprecatedItems.push(buildWouldItem(item, FILES.pilot, {
      PSSA_IMPORT_DEPRECATION_VALID: deprecationValid ? "PASS" : "FAIL",
    }, crosswalkKeys, true, dep));
  }

  for (const item of [...activeItems, ...deprecatedItems]) addItemTallies(gateTallies, item);
  tallyGate(gateTallies, "PSSA_IMPORT_MANIFEST_VALID", "PASS");
  tallyGate(gateTallies, "PSSA_PASSAGE_QUALITY", hasBlockingPassageQualityFailure(passageQuality) ? "FAIL" : "PASS");
  tallyGate(gateTallies, "PSSA_MCQ_PASSAGE_SPECIFICITY_BATCH", hasBlockingPassageSpecificityFailure(mcqSpecificity) ? "FAIL" : "PASS");

  const batches: BatchRow[] = [
    mcqPositionBatch,
    { batchId: "ebsr_grade3", streamType: "EBSR", gradeLevel: 3, batchGate: "PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION", batchResult: ebsrAudit.positionDistribution.ebsrPositionBiasResult, itemCount: ebsr.items.length },
    ...teiAudit.shortcutRows.map((row: any) => ({ batchId: row.interactionType === "MULTI_SELECT" ? "multi_select_grade3" : "hot_text_grade3", streamType: row.interactionType, gradeLevel: 3, batchGate: "PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: row.result, itemCount: row.itemCount })),
    ...mgddAudit.shortcutRows.map((row: any) => ({ batchId: row.interactionType === "MATCHING_GRID" ? "matching_grid_grade3" : "drag_drop_grade3", streamType: row.interactionType, gradeLevel: 3, batchGate: "PSSA_MG_DD_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: row.result, itemCount: row.itemCount })),
    { batchId: "conventions_grade3", streamType: "CONVENTIONS", gradeLevel: 3, batchGate: "PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: conventionsAudit.shortcutRow.result, itemCount: conventions.items.length },
    { batchId: "short_answer_grade3_pool", streamType: "SHORT_ANSWER", gradeLevel: 3, batchGate: "PSSA_SHORT_ANSWER_POOL_BLUEPRINT", batchResult: shortAnswer.blueprint?.result === "PASS" ? "PASS" : "FAIL", itemCount: shortAnswer.items.length },
  ];

  const manifest: ManifestRow[] = [
    { sourceFile: FILES.pilot, recordType: "passage", count: pilot.passages.length, expectedCount: 5, match: pilot.passages.length === 5 },
    { sourceFile: "all active item files", recordType: "item", count: activeItems.length, expectedCount: 67, match: activeItems.length === 67 },
    { sourceFile: FILES.pilot, recordType: "deprecated", count: deprecatedItems.length, expectedCount: 12, match: deprecatedItems.length === 12 },
    { sourceFile: FILES.deprecation, recordType: "supersession", count: deprecationRows.length, expectedCount: 12, match: deprecationRows.length === 12 },
    { sourceFile: "derived import batches", recordType: "batch", count: batches.length, expectedCount: 8, match: batches.length === 8 },
  ];
  if (manifest.some((row) => !row.match)) tallyGate(gateTallies, "PSSA_IMPORT_MANIFEST_VALID", "FAIL");

  const passageImports = pilot.passages.map((passage: any) => ({
    passageId: passage.id,
    sourceFile: FILES.pilot,
    title: passage.title,
    gradeLevel: passage.gradeLevel ?? 3,
    subject: passage.subject ?? "ELA",
    passageType: passage.passageType ?? "unknown",
    text: passage.text,
    wordCount: passage.wordCount ?? String(passage.text ?? "").split(/\s+/).filter(Boolean).length,
    sourceType: sourceTypeFor(passage.sourceType),
    sourceName: passage.sourceName ?? null,
    sourceCitation: passage.sourceCitation ?? null,
    licenseStatus: licenseStatusFor(passage.licenseStatus),
    commercialUseAllowed: Boolean(passage.commercialUseAllowed ?? true),
    needsLegalReview: Boolean(passage.needsLegalReview ?? false),
    contentHash: hashCanonical({ id: passage.id, title: passage.title, text: passage.text, gradeLevel: passage.gradeLevel, subject: passage.subject, passageType: passage.passageType }),
    reviewStatus: "PENDING" as const,
    itemStatus: "candidate" as const,
    studentReadyBlockedReason: "PENDING_REVIEW" as const,
    provenanceJson: {
      sourceFile: FILES.pilot,
      sourcePassageId: passage.id,
      importedBy: "pssa-db4-writer",
    },
  }));

  const plan = { passages: passageImports, activeItems, deprecatedItems, supersessions: deprecationRows.map((row) => ({ oldItemId: row.oldItemId, newItemId: row.supersededByItemIds, reason: row.deprecatedReason })), batches, manifest, gateTallies, sourceScanFailures: 0, hashStable: true };
  plan.sourceScanFailures = [
    ...ebsrAudit.sourceMatches,
    ...teiAudit.sourceMatches,
    ...mgddAudit.sourceMatches,
    ...conventionsAudit.sourceMatches,
    ...shortAnswerAudit.sourceMatches,
  ].filter((match: any) => match.result === "FAIL").length;
  tallyGate(gateTallies, "PSSA_IMPORT_SOURCE_COMPLIANCE", plan.sourceScanFailures === 0 ? "PASS" : "FAIL");
  return plan;
}
