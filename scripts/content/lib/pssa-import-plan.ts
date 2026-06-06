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

type PssaGradeImportFiles = {
  pilot: string;
  ebsr: string;
  tei: string;
  matchingGridDragDrop: string;
  conventions: string;
  shortAnswer: string;
  literaryTopup?: string;
  deprecation: string;
};

export type PssaGradeImportManifest = {
  gradeLevel: number;
  files: PssaGradeImportFiles;
  expectedCounts: { passages: number; activeItems: number; deprecatedItems: number; supersessions: number; batches: number };
  batchIds: {
    readingMcq: string;
    ebsr: string;
    multiSelect: string;
    hotText: string;
    matchingGrid: string;
    dragDrop: string;
    conventions: string;
    shortAnswerPool: string;
  };
  conventionItemIdPrefix: string;
  audits: {
    ebsr: (items: any[], passages?: PssaPassageAuditInput[]) => any;
    tei: (multiSelect: any[], hotText: any[], passages?: PssaPassageAuditInput[]) => any;
    matchingGridDragDrop: (mg: any[], dd: any[], passages?: PssaPassageAuditInput[]) => any;
    conventions: (items: any[]) => any;
    shortAnswer: (items: any[], options?: { passages?: PssaPassageAuditInput[] }) => any;
  };
};

export const GRADE3_IMPORT_MANIFEST: PssaGradeImportManifest = {
  gradeLevel: 3,
  files: {
    pilot: "exemplars/pssa_grade3_pilot/pilot_backend.json",
    ebsr: "exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json",
    tei: "exemplars/pssa_grade3_tei/grade3_tei_backend.json",
    matchingGridDragDrop: "exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json",
    conventions: "exemplars/pssa_grade3_conventions/grade3_conventions_backend.json",
    shortAnswer: "exemplars/pssa_grade3_short_answer/grade3_short_answer_backend.json",
    literaryTopup: "exemplars/pssa_grade3_literary_topup/grade3_literary_topup_backend.json",
    deprecation: "exemplars/pssa_grade3_conventions/pssa_conventions_grade3_deprecation_report.csv",
  },
  expectedCounts: { passages: 7, activeItems: 91, deprecatedItems: 12, supersessions: 12, batches: 8 },
  batchIds: {
    readingMcq: "reading_mcq_grade3",
    ebsr: "ebsr_grade3",
    multiSelect: "multi_select_grade3",
    hotText: "hot_text_grade3",
    matchingGrid: "matching_grid_grade3",
    dragDrop: "drag_drop_grade3",
    conventions: "conventions_grade3",
    shortAnswerPool: "short_answer_grade3_pool",
  },
  conventionItemIdPrefix: "pssa_conv_",
  audits: {
    ebsr: auditGrade3EbsrItems,
    tei: auditGrade3TeiItems,
    matchingGridDragDrop: auditGrade3MatchingGridDragDropItems,
    conventions: auditGrade3ConventionsItems,
    shortAnswer: auditGrade3ShortAnswerItems,
  },
};

export const PSSA_GRADE_IMPORT_MANIFESTS: Record<number, PssaGradeImportManifest> = {
  3: GRADE3_IMPORT_MANIFEST,
};

export const FILES = GRADE3_IMPORT_MANIFEST.files;

export const EXPECTED_BATCHES = [
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.readingMcq, streamType: "MCQ" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.ebsr, streamType: "EBSR" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.multiSelect, streamType: "MULTI_SELECT" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.hotText, streamType: "HOT_TEXT" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.matchingGrid, streamType: "MATCHING_GRID" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.dragDrop, streamType: "DRAG_DROP" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.conventions, streamType: "CONVENTIONS" },
  { batchId: GRADE3_IMPORT_MANIFEST.batchIds.shortAnswerPool, streamType: "SHORT_ANSWER" },
] as const;

export function lookupPssaGradeImportManifest(gradeLevel: number): PssaGradeImportManifest {
  const manifest = PSSA_GRADE_IMPORT_MANIFESTS[gradeLevel];
  if (!manifest) throw new Error(`No PSSA import manifest registered for grade ${gradeLevel}.`);
  if (manifest.gradeLevel !== gradeLevel) throw new Error(`PSSA import manifest registry mismatch for grade ${gradeLevel}.`);
  const batchIds = Object.values(manifest.batchIds);
  if (new Set(batchIds).size !== batchIds.length) throw new Error(`PSSA import manifest has duplicate batch ids for grade ${gradeLevel}.`);
  return manifest;
}

export type GateStatus = "PASS" | "FAIL";
export type ImportStatus = "eligible" | "blocked";
export const PSSA_CONTENT_QUALITY_GATE_IDS = [
  "PSSA_ITEM_INTRA_CHOICE_DUPLICATE",
  "PSSA_VOCAB_KEY_CONSTRUCT",
  "PSSA_SA_BANDS_NONEMPTY",
  "PSSA_ITEM_EC_GENRE_MATCH",
  "PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP",
] as const;

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
  gradeLevel: number;
  passages: WouldImportPassage[];
  activeItems: WouldImportItem[];
  deprecatedItems: WouldImportItem[];
  supersessions: Array<{ oldItemId: string; newItemId: string; reason: string }>;
  batches: BatchRow[];
  manifest: ManifestRow[];
  manifestConfig: PssaGradeImportManifest;
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

function loadDeprecationRows(manifest: PssaGradeImportManifest) {
  const rows = parseCsv(fs.readFileSync(manifest.files.deprecation, "utf8"));
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

function batchIdFor(item: any, manifest: PssaGradeImportManifest, deprecated = false) {
  if (deprecated) return "";
  switch (interactionTypeFor(item)) {
    case "EBSR": return manifest.batchIds.ebsr;
    case "MULTI_SELECT": return manifest.batchIds.multiSelect;
    case "HOT_TEXT": return item.itemId?.startsWith(manifest.conventionItemIdPrefix) ? manifest.batchIds.conventions : manifest.batchIds.hotText;
    case "MATCHING_GRID": return manifest.batchIds.matchingGrid;
    case "DRAG_DROP": return item.itemId?.startsWith(manifest.conventionItemIdPrefix) ? manifest.batchIds.conventions : manifest.batchIds.dragDrop;
    case "INLINE_DROPDOWN": return manifest.batchIds.conventions;
    case "SHORT_ANSWER": return manifest.batchIds.shortAnswerPool;
    case "MCQ": return item.passageId ? manifest.batchIds.readingMcq : manifest.batchIds.conventions;
    default: return "";
  }
}

function sourceFileForTopupItem(item: any, fallback: string, manifest: PssaGradeImportManifest) {
  return item.auditMetadata?.authoredIn === "PSSA_PR_4P_GRADE3_LITERARY_TOPUP" && manifest.files.literaryTopup
    ? manifest.files.literaryTopup
    : fallback;
}

function sourceFileForTopupPassage(passage: any, manifest: PssaGradeImportManifest) {
  return passage.auditMetadata?.authoredIn === "PSSA_PR_4P_GRADE3_LITERARY_TOPUP" && manifest.files.literaryTopup
    ? manifest.files.literaryTopup
    : manifest.files.pilot;
}

function responseSpec(item: any) {
  if (item.responseSpec) return item.responseSpec;
  const interactionType = interactionTypeFor(item);
  if (interactionType === "MCQ") return { prompt: item.studentFacingPrompt ?? item.stem, choices: item.answerChoicesJson ?? item.choices };
  if (interactionType === "MULTI_SELECT") return { stem: item.stem, instructionText: item.instructionText, choices: item.choices, minSelections: item.minSelections, maxSelections: item.maxSelections, exactSelectionCount: item.exactSelectionCount };
  if (interactionType === "HOT_TEXT") return {
    prompt: item.prompt,
    instructionText: item.instructionText,
    selectableSpans: item.selectableSpans ?? item.selectableTokens?.map((token: any) => ({
      spanId: token.tokenId,
      text: token.text,
      spanKind: "token",
    })),
  };
  if (interactionType === "MATCHING_GRID") return { stem: item.stem, instructionText: item.instructionText, rows: item.rows, columns: item.columns, selectionRule: item.selectionRule };
  if (interactionType === "DRAG_DROP") return {
    prompt: item.prompt ?? item.baseSentenceWithSlots,
    instructionText: item.instructionText,
    tokens: item.tokens ?? item.draggableTokens?.map((token: any) => ({ tokenId: token.tokenId, text: token.text })),
    targets: item.targets ?? item.slots?.map((slot: any) => ({ targetId: slot.slotId, label: slot.label ?? "" })),
    useAllTokens: item.useAllTokens,
  };
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
  if (interactionType === "DRAG_DROP") return { correctAssignments: item.correctAssignments?.map((row: any) => ({ tokenId: row.tokenId, targetId: row.targetId ?? row.slotId })) };
  if (interactionType === "INLINE_DROPDOWN") return { blanks: item.blanks?.map((blank: any) => ({ blankId: blank.blankId, correctIndex: blank.correctIndex, correctOption: blank.options?.[blank.correctIndex]?.text })) };
  if (interactionType === "SHORT_ANSWER") return { expectedAnswerCore: item.expectedAnswerCore, acceptableTextSupport: item.acceptableTextSupport };
  return {};
}

function scoringJson(item: any) {
  const base = item.scoring ?? item.scoringRubricJson ?? item.rubric ?? { totalPoints: pointValue(item) };
  return interactionTypeFor(item) === "SHORT_ANSWER"
    ? { ...base, scoreBandExamples: item.scoreBandExamples ?? [] }
    : base;
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

function ecResolves(item: any, crosswalkKeys: Set<string>, gradeLevel: number) {
  return crosswalkKeys.has([item.subject ?? "ELA", String(item.gradeLevel ?? gradeLevel), item.eligibleContent, String(SOURCE_VERSION_YEAR)].join("|"));
}

function buildWouldItem(item: any, sourceFile: string, gates: Record<string, GateStatus>, crosswalkKeys: Set<string>, manifest: PssaGradeImportManifest, deprecated = false, deprecation?: any): WouldImportItem {
  const id = itemId(item);
  const interactionType = interactionTypeFor(item);
  const resolved = ecResolves(item, crosswalkKeys, manifest.gradeLevel);
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
    gradeLevel: item.gradeLevel ?? manifest.gradeLevel,
    subject: item.subject ?? "ELA",
    eligibleContent: item.eligibleContent ?? "",
    ecResolved: resolved,
    contentHash: hashCanonical(content),
    reviewStatus,
    itemStatus,
    studentReadyBlockedReason,
    approvalEligible: false,
    alignmentStatus: resolved ? "ALIGNED" : "NEEDS_CROSSWALK",
    batchId: batchIdFor(item, manifest, deprecated),
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

function defaultContentQualityGates(): Record<string, GateStatus> {
  return Object.fromEntries(PSSA_CONTENT_QUALITY_GATE_IDS.map((gate) => [gate, "PASS" as GateStatus]));
}

function normalizeChoiceText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function rawChoiceText(value: unknown) {
  return String(value ?? "").trim();
}

function choiceTextGroups(item: any): Array<{ raw: boolean; values: string[] }> {
  const interactionType = interactionTypeFor(item);
  if (interactionType === "MCQ") return [{ raw: false, values: (item.answerChoicesJson ?? item.choices ?? []).map((choice: any) => typeof choice === "string" ? choice : choice.text) }];
  if (interactionType === "EBSR") return [
    { raw: false, values: item.partA?.choices?.map((choice: any) => choice.text) ?? [] },
    { raw: false, values: item.partB?.choices?.map((choice: any) => choice.text) ?? [] },
  ];
  if (interactionType === "MULTI_SELECT") return [{ raw: false, values: item.choices?.map((choice: any) => choice.text) ?? [] }];
  if (interactionType === "MATCHING_GRID") return [
    { raw: false, values: item.rows?.map((row: any) => row.label) ?? [] },
    { raw: false, values: item.columns?.map((column: any) => column.label) ?? [] },
  ];
  if (interactionType === "INLINE_DROPDOWN") return (item.blanks ?? []).map((blank: any) => ({
    raw: true,
    values: blank.options?.map((option: any) => typeof option === "string" ? option : option.text) ?? [],
  }));
  return [];
}

export function evaluatePssaItemIntraChoiceDuplicate(item: any): GateStatus {
  for (const group of choiceTextGroups(item)) {
    const seen = new Set<string>();
    for (const value of group.values) {
      const normalized = group.raw ? rawChoiceText(value) : normalizeChoiceText(value);
      if (!normalized) continue;
      if (seen.has(normalized)) return "FAIL";
      seen.add(normalized);
    }
  }
  return "PASS";
}

const VOCAB_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "became", "before", "by", "for", "from", "had", "has", "he", "her", "his",
  "in", "into", "is", "it", "like", "near", "not", "of", "old", "on", "or", "paper", "she", "so", "that", "the",
  "their", "them", "then", "there", "they", "this", "to", "was", "were", "when", "where", "which", "while", "with", "would",
]);

function vocabTargetWord(item: any) {
  const prompt = String(item.studentFacingPrompt ?? item.stem ?? item.prompt ?? "");
  return prompt.match(/"([^"]+)"/)?.[1]
    ?? prompt.match(/\bwhat does\s+([A-Za-z'-]+)\s+mean\b/i)?.[1]
    ?? prompt.match(/\bmeaning of\s+([A-Za-z'-]+)/i)?.[1]
    ?? "";
}

function inflections(word: string) {
  const base = word.toLowerCase();
  const forms = new Set([base, `${base}s`, `${base}es`, `${base}ed`, `${base}ing`]);
  if (base.endsWith("e")) forms.add(`${base.slice(0, -1)}ing`);
  if (base.endsWith("y")) forms.add(`${base.slice(0, -1)}ied`);
  return forms;
}

function contentWordsWithoutTarget(value: string, targetForms: Set<string>) {
  return normalizeChoiceText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !VOCAB_STOP_WORDS.has(token) && !targetForms.has(token));
}

function passageSentences(passage?: PssaPassageAuditInput) {
  const text = passage?.text ?? "";
  const rows: Array<{ id: string; text: string }> = [];
  for (const [paragraphIndex, paragraph] of text.split(/\n\n/).entries()) {
    const matches = paragraph.match(/[^.!?]+[.!?]/g) ?? [];
    matches.forEach((sentence, sentenceIndex) => rows.push({ id: `${paragraphIndex}:${sentenceIndex}`, text: sentence.trim() }));
  }
  return rows;
}

function keyedChoiceText(item: any) {
  const interactionType = interactionTypeFor(item);
  if (interactionType !== "MCQ") return "";
  return String((item.answerChoicesJson ?? item.choices ?? [])[item.correctIndex] ?? "");
}

export function evaluatePssaVocabKeyConstruct(item: any, passage?: PssaPassageAuditInput): GateStatus {
  if (!String(item.eligibleContent ?? "").includes("-V.")) return "PASS";
  const target = vocabTargetWord(item);
  const key = keyedChoiceText(item);
  if (!target || !key) return "FAIL";
  const targetForms = inflections(target);
  const keyWords = normalizeChoiceText(key).split(" ");
  if (keyWords.some((word) => targetForms.has(word))) return "FAIL";
  const sourceSentence = passageSentences(passage).find((sentence) => {
    const words = normalizeChoiceText(sentence.text).split(" ");
    return words.some((word) => targetForms.has(word));
  });
  if (!sourceSentence) return "PASS";
  const sourceWords = new Set(contentWordsWithoutTarget(sourceSentence.text, targetForms));
  const shared = new Set(contentWordsWithoutTarget(key, targetForms).filter((word) => sourceWords.has(word)));
  return shared.size >= 3 ? "FAIL" : "PASS";
}

export function evaluatePssaShortAnswerBandsNonempty(item: any): GateStatus {
  if (interactionTypeFor(item) !== "SHORT_ANSWER") return "PASS";
  const examples = Array.isArray(item.scoreBandExamples) ? item.scoreBandExamples : [];
  return [0, 1, 2, 3].every((band) => {
    const example = examples.find((row: any) => row.band === band);
    return example && String(example.response ?? "").trim() && String(example.why ?? "").trim();
  }) ? "PASS" : "FAIL";
}

export function evaluatePssaItemEcGenreMatch(item: any, passage?: PssaPassageAuditInput): GateStatus {
  const ec = String(item.eligibleContent ?? "");
  if (!passageIdsFor(item).length || !ec.startsWith("E03.")) return "PASS";
  if (ec.includes(".D-")) return "PASS";
  if (!passage) return "FAIL";
  const passageType = String((passage as Record<string, unknown>).passageType ?? "").toLowerCase();
  if (ec.includes(".A-")) return passageType === "literary" ? "PASS" : "FAIL";
  if (ec.includes(".B-")) return passageType === "informational" ? "PASS" : "FAIL";
  return "PASS";
}

function sentenceIdForText(text: string, passage?: PssaPassageAuditInput) {
  const normalized = normalizeChoiceText(text);
  const sentences = passageSentences(passage);
  const exact = sentences.find((sentence) => normalizeChoiceText(sentence.text) === normalized);
  if (exact) return exact.id;
  return sentences.find((sentence) => {
    const sentenceNorm = normalizeChoiceText(sentence.text);
    return normalized && (sentenceNorm.includes(normalized) || normalized.includes(sentenceNorm));
  })?.id ?? "";
}

function keyedEvidenceSentenceIds(item: any, passage?: PssaPassageAuditInput) {
  const interactionType = interactionTypeFor(item);
  if (interactionType === "EBSR") {
    return new Set((item.partB?.correctIndices ?? [])
      .map((index: number) => item.partB?.choices?.[index]?.quotedSpan ?? item.partB?.choices?.[index]?.text)
      .map((text: string) => sentenceIdForText(text, passage))
      .filter(Boolean));
  }
  if (interactionType === "HOT_TEXT") {
    return new Set((item.correctSpanIds ?? [])
      .map((spanId: string) => item.selectableSpans?.find((span: any) => span.spanId === spanId))
      .map((span: any) => span ? sentenceIdForText(span.text, passage) : "")
      .filter(Boolean));
  }
  if (interactionType === "MULTI_SELECT") {
    return new Set((item.correctIndices ?? [])
      .map((index: number) => item.choices?.[index]?.text)
      .map((text: string) => sentenceIdForText(text, passage))
      .filter(Boolean));
  }
  return new Set<string>();
}

export function evaluatePssaPassageMultipointEvidenceOverlap(items: any[], passages: PssaPassageAuditInput[]): Record<string, GateStatus> {
  const byId = new Map(passages.map((passage) => [passage.id, passage]));
  const result: Record<string, GateStatus> = {};
  const multipoint = items
    .filter((item) => ["EBSR", "HOT_TEXT", "MULTI_SELECT"].includes(interactionTypeFor(item)) && passageIdsFor(item).length)
    .map((item) => ({ item, passageId: passageIdsFor(item)[0], evidence: keyedEvidenceSentenceIds(item, byId.get(passageIdsFor(item)[0])) }));
  for (const row of multipoint) result[itemId(row.item)] = "PASS";
  for (let i = 0; i < multipoint.length; i += 1) {
    for (let j = i + 1; j < multipoint.length; j += 1) {
      const a = multipoint[i];
      const b = multipoint[j];
      if (a.passageId !== b.passageId) continue;
      const overlap = [...a.evidence].filter((id) => b.evidence.has(id)).length;
      if (overlap > 1) {
        result[itemId(a.item)] = "FAIL";
        result[itemId(b.item)] = "FAIL";
      }
    }
  }
  return result;
}

function buildContentQualityGateMap(items: any[], passages: PssaPassageAuditInput[]) {
  const passagesById = new Map(passages.map((passage) => [passage.id, passage]));
  const overlap = evaluatePssaPassageMultipointEvidenceOverlap(items, passages);
  const gates = new Map<string, Record<string, GateStatus>>();
  for (const item of items) {
    const passage = passagesById.get(passageIdsFor(item)[0]);
    gates.set(itemId(item), {
      PSSA_ITEM_INTRA_CHOICE_DUPLICATE: evaluatePssaItemIntraChoiceDuplicate(item),
      PSSA_VOCAB_KEY_CONSTRUCT: evaluatePssaVocabKeyConstruct(item, passage),
      PSSA_SA_BANDS_NONEMPTY: evaluatePssaShortAnswerBandsNonempty(item),
      PSSA_ITEM_EC_GENRE_MATCH: evaluatePssaItemEcGenreMatch(item, passage),
      PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP: overlap[itemId(item)] ?? "PASS",
    });
  }
  return gates;
}

function contentQualityGatesFor(gates: Map<string, Record<string, GateStatus>>, item: any) {
  return gates.get(itemId(item)) ?? defaultContentQualityGates();
}

function buildMcqPositionBatch(items: any[], manifest: PssaGradeImportManifest): BatchRow {
  const counts = [0, 0, 0, 0];
  for (const item of items) if (typeof item.correctIndex === "number") counts[item.correctIndex] += 1;
  const maxShare = Math.max(...counts) / Math.max(items.length, 1);
  return {
    batchId: manifest.batchIds.readingMcq,
    streamType: "MCQ",
    gradeLevel: manifest.gradeLevel,
    batchGate: `PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION A:${counts[0]} B:${counts[1]} C:${counts[2]} D:${counts[3]}`,
    batchResult: maxShare <= 0.4 ? "PASS" : "FAIL",
    itemCount: items.length,
  };
}

export function buildPlan(gradeLevel: number): ImportPlan {
  const manifestConfig = lookupPssaGradeImportManifest(gradeLevel);
  const crosswalkKeys = loadCrosswalkKeys();
  const ecCatalog = loadEcCatalog();
  const pilot = readJson<any>(manifestConfig.files.pilot);
  const ebsr = readJson<any>(manifestConfig.files.ebsr);
  const tei = readJson<any>(manifestConfig.files.tei);
  const mgdd = readJson<any>(manifestConfig.files.matchingGridDragDrop);
  const conventions = readJson<any>(manifestConfig.files.conventions);
  const shortAnswer = readJson<any>(manifestConfig.files.shortAnswer);
  const literaryTopup = manifestConfig.files.literaryTopup ? readJson<any>(manifestConfig.files.literaryTopup) : { passages: [], items: [] };
  const deprecationRows = loadDeprecationRows(manifestConfig);
  const deprecationByOld = new Map(deprecationRows.map((row) => [row.oldItemId, row]));

  const literaryTopupItems = literaryTopup.items ?? [];
  const passages = [...pilot.passages, ...(literaryTopup.passages ?? [])] as PssaPassageAuditInput[];
  const activeReadingMcq = [
    ...pilot.items.filter((item: any) => item.itemType === "MCQ" && item.passageId && item.itemStatus !== "deprecated_superseded"),
    ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "MCQ" && item.passageId && item.itemStatus !== "deprecated_superseded"),
  ];
  const deprecatedMcq = pilot.items.filter((item: any) => item.itemStatus === "deprecated_superseded");
  const ebsrItems = [...ebsr.items, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "EBSR")];
  const multiSelectItems = [...tei.multiSelectItems, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "MULTI_SELECT")];
  const hotTextItems = [...tei.hotTextItems, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "HOT_TEXT")];
  const matchingGridItems = [...mgdd.matchingGridItems, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "MATCHING_GRID")];
  const dragDropItems = [...mgdd.dragDropItems, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "DRAG_DROP")];
  const shortAnswerItems = [...shortAnswer.items, ...literaryTopupItems.filter((item: any) => interactionTypeFor(item) === "SHORT_ANSWER")];
  const contentQualityGates = buildContentQualityGateMap([
    ...activeReadingMcq,
    ...deprecatedMcq,
    ...ebsrItems,
    ...multiSelectItems,
    ...hotTextItems,
    ...matchingGridItems,
    ...dragDropItems,
    ...conventions.items,
    ...shortAnswerItems,
  ], passages);

  const passageQuality = buildPssaPassageQualityReport(passages);
  const mcqSpecificity = buildMcqPassageSpecificityReport(activeReadingMcq as McqAuditInput[], passages);
  const mcqSpecificityFailed = new Set(mcqSpecificity.filter((row) => row.result === "FAIL").map((row) => row.itemId));
  const mcqSkill = buildItemEcSkillMatchReport(activeReadingMcq as McqAuditInput[], passages, ecCatalog);
  const mcqSkillFailed = new Set(mcqSkill.filter((row) => row.skillMatchResult === "FAIL").map((row) => row.itemId));
  const mcqLength = buildMcqCorrectIsLongestReport(activeReadingMcq as McqAuditInput[]);
  const mcqLengthFailed = new Set(mcqLength.filter((row) => row.scope === "item" && row.result === "FAIL").map((row) => row.itemId));
  const mcqAbsolute = buildMcqAbsoluteLanguageDistractorReport(activeReadingMcq as McqAuditInput[]);
  const mcqAbsoluteFailed = new Set(mcqAbsolute.filter((row) => row.itemId !== "batch" && row.result === "FAIL").map((row) => row.itemId));
  const mcqPositionBatch = buildMcqPositionBatch(activeReadingMcq, manifestConfig);

  const ebsrAudit = manifestConfig.audits.ebsr(ebsrItems as any, passages);
  const teiAudit = manifestConfig.audits.tei(multiSelectItems as any, hotTextItems as any, passages);
  const mgddAudit = manifestConfig.audits.matchingGridDragDrop(matchingGridItems as any, dragDropItems as any, passages);
  const conventionsAudit = manifestConfig.audits.conventions(conventions.items as any);
  const shortAnswerAudit = manifestConfig.audits.shortAnswer(shortAnswerItems as any, { passages });

  const gateTallies = new Map<string, { pass: number; fail: number }>();
  const activeItems: WouldImportItem[] = [];
  const deprecatedItems: WouldImportItem[] = [];

  for (const item of activeReadingMcq) {
    activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.pilot, manifestConfig), {
      PSSA_MCQ_PASSAGE_SPECIFICITY: mcqSpecificityFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_ITEM_EC_SKILL_MATCH: mcqSkillFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_CORRECT_IS_LONGEST: mcqLengthFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: mcqAbsoluteFailed.has(itemId(item)) ? "FAIL" : "PASS",
      PSSA_MCQ_ANSWER_POSITION_DISTRIBUTION: mcqPositionBatch.batchResult,
      ...contentQualityGatesFor(contentQualityGates, item),
    }, crosswalkKeys, manifestConfig));
  }

  for (const item of ebsrItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.ebsr, manifestConfig), { PSSA_EBSR_FAMILY_AND_BATCH: finalFromRows(ebsrAudit.rows, "finalEbsrResult")[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of multiSelectItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.tei, manifestConfig), { PSSA_MULTI_SELECT_FAMILY_AND_BATCH: finalFromRows(teiAudit.multiSelectRows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of hotTextItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.tei, manifestConfig), { PSSA_HOT_TEXT_FAMILY_AND_BATCH: finalFromRows(teiAudit.hotTextRows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of matchingGridItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.matchingGridDragDrop, manifestConfig), { PSSA_MATCHING_GRID_FAMILY_AND_BATCH: finalFromRows(mgddAudit.matchingGridRows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of dragDropItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.matchingGridDragDrop, manifestConfig), { PSSA_DRAG_DROP_FAMILY_AND_BATCH: finalFromRows(mgddAudit.dragDropRows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of conventions.items) activeItems.push(buildWouldItem(item, manifestConfig.files.conventions, { PSSA_CONVENTIONS_FAMILY_AND_BATCH: finalFromRows(conventionsAudit.rows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));
  for (const item of shortAnswerItems) activeItems.push(buildWouldItem(item, sourceFileForTopupItem(item, manifestConfig.files.shortAnswer, manifestConfig), { PSSA_SHORT_ANSWER_FAMILY: finalFromRows(shortAnswerAudit.rows)[item.itemId] ?? "FAIL", ...contentQualityGatesFor(contentQualityGates, item) }, crosswalkKeys, manifestConfig));

  const activeIds = new Set(activeItems.map((item) => item.itemId));
  for (const item of deprecatedMcq) {
    const dep = deprecationByOld.get(itemId(item));
    const supersededIds = dep?.supersededByItemIds?.split("|").filter(Boolean) ?? [];
    const deprecationValid = dep && supersededIds.length > 0 && supersededIds.every((id: string) => activeIds.has(id));
    deprecatedItems.push(buildWouldItem(item, manifestConfig.files.pilot, {
      PSSA_IMPORT_DEPRECATION_VALID: deprecationValid ? "PASS" : "FAIL",
      ...contentQualityGatesFor(contentQualityGates, item),
    }, crosswalkKeys, manifestConfig, true, dep));
  }

  for (const item of [...activeItems, ...deprecatedItems]) addItemTallies(gateTallies, item);
  tallyGate(gateTallies, "PSSA_IMPORT_MANIFEST_VALID", "PASS");
  tallyGate(gateTallies, "PSSA_PASSAGE_QUALITY", hasBlockingPassageQualityFailure(passageQuality) ? "FAIL" : "PASS");
  tallyGate(gateTallies, "PSSA_MCQ_PASSAGE_SPECIFICITY_BATCH", hasBlockingPassageSpecificityFailure(mcqSpecificity) ? "FAIL" : "PASS");

  const batches: BatchRow[] = [
    mcqPositionBatch,
    { batchId: manifestConfig.batchIds.ebsr, streamType: "EBSR", gradeLevel: manifestConfig.gradeLevel, batchGate: "PSSA_EBSR_ANSWER_POSITION_DISTRIBUTION", batchResult: ebsrAudit.positionDistribution.ebsrPositionBiasResult, itemCount: ebsrItems.length },
    ...teiAudit.shortcutRows.map((row: any) => ({ batchId: row.interactionType === "MULTI_SELECT" ? manifestConfig.batchIds.multiSelect : manifestConfig.batchIds.hotText, streamType: row.interactionType, gradeLevel: manifestConfig.gradeLevel, batchGate: "PSSA_TEI_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: row.result, itemCount: row.itemCount })),
    ...mgddAudit.shortcutRows.map((row: any) => ({ batchId: row.interactionType === "MATCHING_GRID" ? manifestConfig.batchIds.matchingGrid : manifestConfig.batchIds.dragDrop, streamType: row.interactionType, gradeLevel: manifestConfig.gradeLevel, batchGate: "PSSA_MG_DD_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: row.result, itemCount: row.itemCount })),
    { batchId: manifestConfig.batchIds.conventions, streamType: "CONVENTIONS", gradeLevel: manifestConfig.gradeLevel, batchGate: "PSSA_CONVENTIONS_SURFACE_SHORTCUT_DISTRIBUTION", batchResult: conventionsAudit.shortcutRow.result, itemCount: conventions.items.length },
    { batchId: manifestConfig.batchIds.shortAnswerPool, streamType: "SHORT_ANSWER", gradeLevel: manifestConfig.gradeLevel, batchGate: "PSSA_SHORT_ANSWER_POOL_BLUEPRINT", batchResult: shortAnswerAudit.blueprint.result, itemCount: shortAnswerItems.length },
  ];

  const manifest: ManifestRow[] = [
    { sourceFile: "all passage files", recordType: "passage", count: passages.length, expectedCount: manifestConfig.expectedCounts.passages, match: passages.length === manifestConfig.expectedCounts.passages },
    { sourceFile: "all active item files", recordType: "item", count: activeItems.length, expectedCount: manifestConfig.expectedCounts.activeItems, match: activeItems.length === manifestConfig.expectedCounts.activeItems },
    { sourceFile: manifestConfig.files.pilot, recordType: "deprecated", count: deprecatedItems.length, expectedCount: manifestConfig.expectedCounts.deprecatedItems, match: deprecatedItems.length === manifestConfig.expectedCounts.deprecatedItems },
    { sourceFile: manifestConfig.files.deprecation, recordType: "supersession", count: deprecationRows.length, expectedCount: manifestConfig.expectedCounts.supersessions, match: deprecationRows.length === manifestConfig.expectedCounts.supersessions },
    { sourceFile: "derived import batches", recordType: "batch", count: batches.length, expectedCount: manifestConfig.expectedCounts.batches, match: batches.length === manifestConfig.expectedCounts.batches },
  ];
  if (manifest.some((row) => !row.match)) tallyGate(gateTallies, "PSSA_IMPORT_MANIFEST_VALID", "FAIL");

  const passageImports = passages.map((passage: any) => ({
    passageId: passage.id,
    sourceFile: sourceFileForTopupPassage(passage, manifestConfig),
    title: passage.title,
    gradeLevel: passage.gradeLevel ?? manifestConfig.gradeLevel,
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
      sourceFile: sourceFileForTopupPassage(passage, manifestConfig),
      sourcePassageId: passage.id,
      importedBy: "pssa-db4-writer",
    },
  }));

  const plan = { gradeLevel: manifestConfig.gradeLevel, passages: passageImports, activeItems, deprecatedItems, supersessions: deprecationRows.map((row) => ({ oldItemId: row.oldItemId, newItemId: row.supersededByItemIds, reason: row.deprecatedReason })), batches, manifest, manifestConfig, gateTallies, sourceScanFailures: 0, hashStable: true };
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
