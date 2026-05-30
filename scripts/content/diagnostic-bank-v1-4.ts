import fs from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { deriveDiagnosticItemMetadata, diagnosticMetadataToCreateInput } from "../../lib/content/diagnosticItemMetadata";

const PACKAGE_DIR = path.join(process.cwd(), "content", "reading-buddy-phase1-3-v1.4-fast-track");
export const BANK_JSON_PATH = path.join(PACKAGE_DIR, "source_files", "reading_buddy_phase1_3_pilot_bank_120_v1_4_governance_trace.json");
export const APPROVAL_NOTE =
  "Fast-track approved from Reading Buddy Phase 1-3 Pilot Diagnostic Bank v1.4 governance-trace package. Items underwent repeated GPT/Claude review, mechanical phonics audit, presentation-mode audit, pseudoword validation, and changelog reconciliation. Local Codex import validators passed before approval. Final source audit expected 120/120 eligible.";

type BankPayload = {
  bankId: string;
  createdAt: string;
  itemCount: number;
  strandCounts: Record<string, number>;
  items: BankItem[];
};

type BankItem = {
  id: string;
  schemaVersion?: string;
  itemStatus?: string;
  reviewStatus?: string;
  calibrationStatus?: string;
  createdFor?: string;
  createdAt?: string;
  sourceStatus?: string;
  strand: string;
  itemType: string;
  phaseBand?: number | null;
  phasePositionCode?: string | null;
  dailyTargetCode?: string | null;
  skill?: string | null;
  displayMode?: string | null;
  responseMode?: string | null;
  targetPattern?: string | null;
  wordType?: string | null;
  displayText?: string | null;
  canonicalAnswer?: string | null;
  expectedPronunciation?: string | null;
  targetWord?: string | null;
  vocabularyBand?: string | null;
  morphologyWave?: string | null;
  targetMorpheme?: string | null;
  comprehensionMode?: string | null;
  stimulusMode?: string | null;
  calibratedProbeLevel?: string | null;
  studentPromptJson: unknown;
  stimulusJson?: unknown;
  expectedResponseJson: unknown;
  scoringRubricJson: unknown;
  placementEvidenceJson?: unknown;
  fluencyEvidenceJson?: unknown;
  validationMetadataJson?: unknown;
  reviewFocus?: unknown;
  researchTags?: unknown;
  avoidanceNotes?: string;
  stimulusPresentationMode?: string | null;
  choicePresentationMode?: string | null;
  printedStimulusDecodabilityRequired?: boolean;
  printedChoicesDecodabilityRequired?: boolean;
  audioSupportRequired?: boolean;
  audioAssetRequired?: boolean | null;
  audioValidatedByHuman?: boolean | null;
  studentReadsPassage?: boolean;
  studentReadsChoices?: boolean;
};

export type AuditItemResult = {
  id: string;
  strand: string;
  itemType: string;
  status: "PASS" | "FAIL";
  failures: string[];
};

export type BankAuditResult = {
  bankId: string;
  expectedCount: number;
  importedCount?: number;
  passCount: number;
  failCount: number;
  strandCounts: Record<string, number>;
  results: AuditItemResult[];
};

const COMMON_REAL_WORDS = new Set([
  "a", "able", "ace", "age", "and", "are", "at", "back", "bad", "bag", "bake", "ball", "be", "bed", "bike", "bit",
  "book", "box", "boy", "bus", "cake", "can", "cap", "cat", "chop", "cube", "dad", "day", "dog", "duck", "fan",
  "fat", "fig", "fine", "fish", "five", "game", "get", "go", "got", "had", "hat", "he", "hen", "hid", "him", "hit",
  "home", "hop", "hot", "in", "is", "it", "job", "joke", "kite", "lap", "leg", "let", "line", "log", "make", "man",
  "map", "mat", "me", "men", "mop", "mud", "mule", "no", "not", "note", "on", "pat", "pig", "pin", "pot", "red",
  "ride", "rope", "rug", "run", "same", "sat", "see", "set", "shut", "sit", "sun", "tap", "ten", "these", "time",
  "top", "up", "us", "wet", "whip", "will", "with", "yes", "you",
]);

const COMMON_HOMOPHONES = new Set(["to", "too", "two", "for", "four", "one", "won", "see", "sea", "be", "bee", "meet", "meat"]);

export function loadBankPayload(bankPath = BANK_JSON_PATH): BankPayload {
  return JSON.parse(fs.readFileSync(bankPath, "utf8")) as BankPayload;
}

export function auditBankItems(items: BankItem[], bankId = "reading-buddy-phase1-3-v1.4", options: { requireSourceStatuses?: boolean } = {}): BankAuditResult {
  const seen = new Set<string>();
  const results = items.map((item) => {
    const failures: string[] = [];
    if (!item.id) failures.push("Missing stable item id.");
    if (seen.has(item.id)) failures.push(`Duplicate item id: ${item.id}`);
    seen.add(item.id);
    if (options.requireSourceStatuses && item.itemStatus !== "candidate") failures.push(`Source itemStatus must be candidate, got ${item.itemStatus || "missing"}.`);
    if (options.requireSourceStatuses && item.reviewStatus !== "PENDING") failures.push(`Source reviewStatus must be PENDING, got ${item.reviewStatus || "missing"}.`);
    if (!item.strand) failures.push("Missing strand.");
    if (!item.itemType) failures.push("Missing itemType.");
    if (!item.phaseBand) failures.push("Missing phaseBand.");
    if (!item.phasePositionCode) failures.push("Missing phasePositionCode.");
    if (!item.skill) failures.push("Missing skill.");
    if (!item.displayMode) failures.push("Missing displayMode.");
    if (!item.responseMode) failures.push("Missing responseMode.");
    if (!item.studentPromptJson) failures.push("Missing studentPromptJson.");
    if (!item.expectedResponseJson) failures.push("Missing expectedResponseJson.");
    if (!item.scoringRubricJson) failures.push("Missing scoringRubricJson.");

    const strand = item.strand.toUpperCase();
    if (strand === "PA") validatePaItem(item, failures);
    if (strand === "DECODING") validateDecodingItem(item, failures);
    if (strand === "VOCABULARY") validateVocabularyItem(item, failures);
    if (strand === "COMPREHENSION") validateComprehensionItem(item, failures);
    if (strand === "FLUENCY") validateFluencyItem(item, failures);
    if (strand === "MORPHOLOGY") validateMorphologyItem(item, failures);

    return {
      id: item.id,
      strand: item.strand,
      itemType: item.itemType,
      status: failures.length ? "FAIL" : "PASS",
      failures,
    } satisfies AuditItemResult;
  });
  return {
    bankId,
    expectedCount: 120,
    passCount: results.filter((result) => result.status === "PASS").length,
    failCount: results.filter((result) => result.status === "FAIL").length,
    strandCounts: countBy(items, (item) => item.strand),
    results,
  };
}

export async function auditImportedBankItems(db: PrismaClient, bankId: string) {
  const items = await db.diagnosticItem.findMany({
    where: { id: { startsWith: "RB-PILOT-P1P3-" }, retiredAt: null },
    include: {
      dailyTarget: { select: { code: true } },
      firstLookReviewModelDecision: { select: { decisionJson: true } },
    },
    orderBy: { id: "asc" },
  });
  const importedItems = items.filter((item) => asRecord(item.adminReviewJson).sourceBankId === bankId);
  const audit = auditBankItems(importedItems.map(databaseItemToBankItem), bankId);
  const resultsById = new Map(audit.results.map((result) => [result.id, result]));

  for (const item of importedItems) {
    const result = resultsById.get(item.id);
    if (!result) continue;
    const derived = deriveDiagnosticItemMetadata({
      ...item,
      dailyTargetCode: item.dailyTarget?.code,
    });
    for (const blocker of derived.approvalBlockers) {
      result.failures.push(`Platform readiness blocker: ${blocker}`);
    }
    const firstLookBlockers = firstLookFailedBlockers(item.firstLookReviewModelDecision?.decisionJson);
    if (firstLookBlockers.length) {
      result.failures.push(`Platform readiness blocker: stale first-look blocker(s): ${firstLookBlockers.join(", ")}`);
    }
    if (item.reviewStatus === "APPROVED" && !item.firstLookReviewModelDecision && !asRecord(item.adminReviewJson).fastTrackEligible) {
      result.failures.push("Platform readiness blocker: approved item is missing first-look review or fast-track provenance.");
    }
    result.status = result.failures.length ? "FAIL" : "PASS";
  }

  return {
    imported: importedItems.length,
    audit: {
      ...audit,
      passCount: audit.results.filter((result) => result.status === "PASS").length,
      failCount: audit.results.filter((result) => result.status === "FAIL").length,
    },
  };
}

export async function ensurePhasePosition(db: { phasePosition: PrismaClient["phasePosition"] }, item: BankItem) {
  const code = item.phasePositionCode || `PHASE_${item.phaseBand || 0}_ENTRY`;
  const parsed = parsePhasePositionCode(code, item.phaseBand);
  return db.phasePosition.upsert({
    where: { phaseNumber_subPosition: { phaseNumber: parsed.phaseNumber, subPosition: parsed.subPosition } },
    update: {},
    create: {
      phaseNumber: parsed.phaseNumber,
      subPosition: parsed.subPosition,
      label: parsed.label,
      phonicsTrack: `Reading Buddy ${parsed.label} pilot diagnostic position imported from v1.4 governance-trace package.`,
      morphologyTrack: `Reading Buddy ${parsed.label} morphology diagnostic position imported from v1.4 governance-trace package.`,
      prerequisites: parsed.phaseNumber > 1 ? [`PHASE_${parsed.phaseNumber - 1}_ENTRY`] : [],
    },
  });
}

export async function ensureDailyTarget(db: { dailyTarget: PrismaClient["dailyTarget"] }, item: BankItem, phasePositionId: string) {
  if (!item.dailyTargetCode) return null;
  return db.dailyTarget.upsert({
    where: { code: item.dailyTargetCode },
    update: {},
    create: {
      phasePositionId,
      code: item.dailyTargetCode,
      kidVisibleLabel: item.dailyTargetCode.replace(/_/g, " "),
      tutorLabel: `${item.dailyTargetCode} pilot diagnostic target`,
      description: `Specific pilot diagnostic daily target ${item.dailyTargetCode} from Reading Buddy v1.4 governance-trace package.`,
      introductionOrder: targetOrder(item.dailyTargetCode),
      targetPatternsJson: { patterns: [item.dailyTargetCode], sourceBankId: "reading-buddy-phase1-3-pilot-bank-v1.4" },
      allowedPatternCodes: [],
      blockedPatternCodes: [],
      exampleWords: item.displayText && item.wordType === "real_word" ? [item.displayText] : [],
      exampleNonwords: item.displayText && item.wordType === "pseudoword" ? [item.displayText] : [],
      reviewStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewNotes: "Imported as daily-target metadata required for Reading Buddy Phase 1-3 Pilot Diagnostic Bank v1.4.",
    },
  });
}

export function bankItemToDiagnosticCreateInput(item: BankItem, args: { phasePositionId: string; dailyTargetId?: string | null; sourceBankId: string; approve: boolean }) {
  const derived = deriveDiagnosticItemMetadata({
    ...item,
    phasePositionId: args.phasePositionId,
    dailyTargetId: args.dailyTargetId,
    dailyTargetCode: item.dailyTargetCode,
  });
  const canApprove = args.approve && derived.approvalBlockers.length === 0;
  const adminReviewJson = {
    sourceBankId: args.sourceBankId,
    sourceItemId: item.id,
    sourceSchemaVersion: item.schemaVersion,
    calibrationStatus: item.calibrationStatus,
    createdFor: item.createdFor,
    sourceStatus: item.sourceStatus,
    phasePositionCode: item.phasePositionCode,
    validationMetadataJson: item.validationMetadataJson ?? null,
    reviewFocus: item.reviewFocus ?? [],
    researchTags: item.researchTags ?? [],
    avoidanceNotes: item.avoidanceNotes ?? null,
    stimulusPresentationMode: item.stimulusPresentationMode ?? null,
    choicePresentationMode: item.choicePresentationMode ?? null,
    printedStimulusDecodabilityRequired: Boolean(item.printedStimulusDecodabilityRequired),
    printedChoicesDecodabilityRequired: Boolean(item.printedChoicesDecodabilityRequired),
    audioSupportRequired: Boolean(item.audioSupportRequired),
    studentReadsPassage: Boolean(item.studentReadsPassage),
    studentReadsChoices: Boolean(item.studentReadsChoices),
    fastTrackEligible: true,
    platformApprovalBlockers: derived.approvalBlockers,
    batchApprovalNote: canApprove ? APPROVAL_NOTE : null,
    batchApprovedAt: canApprove ? new Date().toISOString() : null,
  };
  return {
    id: item.id,
    strand: item.strand,
    phasePositionId: args.phasePositionId,
    dailyTargetId: args.dailyTargetId ?? null,
    itemType: item.itemType,
    studentPromptJson: inputJson(item.studentPromptJson),
    stimulusJson: item.stimulusJson === undefined ? Prisma.JsonNull : inputJson(item.stimulusJson),
    expectedResponseJson: inputJson(item.expectedResponseJson),
    scoringRubricJson: inputJson(item.scoringRubricJson),
    adminReviewJson: inputJson(adminReviewJson),
    ...diagnosticMetadataToCreateInput(derived.metadata),
    difficultyBand: item.phaseBand || 3,
    isPracticeItem: false,
    itemStatus: canApprove ? "pilot_ready" : "candidate",
    reviewStatus: canApprove ? "APPROVED" : "PENDING",
    reviewedAt: canApprove ? new Date() : null,
    reviewNotes: canApprove ? APPROVAL_NOTE : null,
    version: 1,
  } satisfies Prisma.DiagnosticItemUncheckedCreateInput;
}

function validatePaItem(item: BankItem, failures: string[]) {
  const prompt = asRecord(item.studentPromptJson);
  const stimulus = asRecord(item.stimulusJson);
  if (item.displayMode !== "AUDIO_ONLY") failures.push(`PA displayMode must be AUDIO_ONLY, got ${item.displayMode}.`);
  if (item.responseMode !== "speech_response") failures.push(`PA responseMode must be speech_response, got ${item.responseMode}.`);
  if (Array.isArray(prompt.choices)) failures.push("PA studentPromptJson must not expose printed choices.");
  if (prompt.studentVisibleStimulus !== false) failures.push("PA studentPromptJson.studentVisibleStimulus must be false.");
  if (stimulus.displayToStudent !== false) failures.push("PA stimulusJson.displayToStudent must be false.");
  if (hasPhonemeNotation(JSON.stringify(prompt))) failures.push("PA student prompt exposes phoneme notation or segmented sound text.");
  const segmented = hasPhonemeNotation(stringFrom(stimulus.audioScript)) || /\.{2,}/.test(stringFrom(stimulus.audioScript));
  if (segmented && (!stimulus.audioAssetRequired || !stimulus.audioValidatedByHuman)) {
    failures.push("PA segmented/phoneme stimulus requires audioAssetRequired and audioValidatedByHuman.");
  }
}

function validateDecodingItem(item: BankItem, failures: string[]) {
  const prompt = asRecord(item.studentPromptJson);
  const scoring = asRecord(item.scoringRubricJson);
  if (item.displayMode !== "TEXT_CARD_ONE_WORD") failures.push(`Decoding displayMode must be TEXT_CARD_ONE_WORD, got ${item.displayMode}.`);
  if (item.responseMode !== "speech_response") failures.push(`Decoding responseMode must be speech_response, got ${item.responseMode}.`);
  if (!item.displayText || prompt.displayText !== item.displayText) failures.push("Decoding item must show exactly one displayText word.");
  if (!item.canonicalAnswer) failures.push("Decoding item missing canonicalAnswer.");
  if (!item.targetPattern) failures.push("Decoding item missing targetPattern.");
  if (scoring.placementUsesAccuracyOnly !== true) failures.push("Decoding placement must use accuracy only.");
  if (scoring.latencyFeeds !== "FLUENCY") failures.push("Decoding latency must feed fluency/automaticity profile.");
  if (item.wordType === "pseudoword") {
    if (!item.expectedPronunciation) failures.push("Pseudoword missing expectedPronunciation.");
    validatePseudoword(item, failures);
  }
}

function validateVocabularyItem(item: BankItem, failures: string[]) {
  if (!item.targetWord) failures.push("Vocabulary item missing targetWord.");
  if (!item.vocabularyBand) failures.push("Vocabulary item missing vocabularyBand.");
  const tier2 = /tier\s*2|abstract|relational/i.test(item.vocabularyBand || "");
  if (tier2 && item.itemType === "CONCRETE_WORD_PICTURE_CHOICE") failures.push("Tier 2/abstract vocabulary cannot use picture choice.");
  if (item.itemType === "CONCRETE_WORD_PICTURE_CHOICE" && item.displayMode !== "PICTURE_CHOICE") failures.push("Picture-choice vocabulary must use PICTURE_CHOICE displayMode.");
  if (item.itemType !== "CONCRETE_WORD_PICTURE_CHOICE" && !["TEXT_CHOICE", "SCENARIO_CHOICE", "AUDIO_THEN_TEXT_CHOICES"].includes(item.displayMode || "")) {
    failures.push(`Vocabulary context/scenario item must use text/scenario choices, got ${item.displayMode}.`);
  }
}

function validateComprehensionItem(item: BankItem, failures: string[]) {
  const prompt = asRecord(item.studentPromptJson);
  const stimulus = asRecord(item.stimulusJson);
  if (!item.comprehensionMode) failures.push("Comprehension item missing comprehensionMode.");
  if (!item.stimulusMode) failures.push("Comprehension item missing stimulusMode.");
  if (!item.calibratedProbeLevel) failures.push("Comprehension item missing calibratedProbeLevel.");
  if (item.stimulusMode === "audio_only") {
    if (prompt.passageVisibleToStudent !== false) failures.push("Listening comprehension passage must not be visible to student.");
    if (stimulus.displayToStudent !== false) failures.push("Listening comprehension stimulus displayToStudent must be false.");
    if (!stimulus.audioScript) failures.push("Listening comprehension needs backend/TTS audioScript.");
  }
}

function validateFluencyItem(item: BankItem, failures: string[]) {
  const prompt = asRecord(item.studentPromptJson);
  const scoring = asRecord(item.scoringRubricJson);
  if (prompt.timerVisibleToStudent === true || scoring.noVisibleTimer === false) failures.push("Fluency item must not expose a visible timer.");
  if (!item.fluencyEvidenceJson) failures.push("Fluency item missing fluencyEvidenceJson.");
  if (scoring.latencyFeeds && scoring.latencyFeeds !== "FLUENCY") failures.push("Fluency scoring must mark latency as FLUENCY evidence.");
}

function validateMorphologyItem(item: BankItem, failures: string[]) {
  if (!item.morphologyWave) failures.push("Morphology item missing morphologyWave.");
  if (!item.targetMorpheme && !item.targetWord) failures.push("Morphology item missing targetMorpheme or targetWord.");
  if (!item.skill) failures.push("Morphology item missing skill.");
}

function validatePseudoword(item: BankItem, failures: string[]) {
  const word = (item.displayText || "").toLowerCase();
  if (!word) return;
  if (COMMON_REAL_WORDS.has(word)) failures.push(`Pseudoword ${word} is a common real word.`);
  if (COMMON_HOMOPHONES.has(word)) failures.push(`Pseudoword ${word} is a common homophone.`);
}

function databaseItemToBankItem(item: {
  id: string;
  itemStatus?: string | null;
  reviewStatus?: string | null;
  strand: string;
  itemType: string;
  phaseBand?: number | null;
  targetPattern?: string | null;
  skill?: string | null;
  displayMode?: string | null;
  responseMode?: string | null;
  wordType?: string | null;
  displayText?: string | null;
  canonicalAnswer?: string | null;
  expectedPronunciation?: string | null;
  targetWord?: string | null;
  vocabularyBand?: string | null;
  morphologyWave?: string | null;
  targetMorpheme?: string | null;
  comprehensionMode?: string | null;
  stimulusMode?: string | null;
  calibratedProbeLevel?: string | null;
  studentPromptJson: unknown;
  stimulusJson?: unknown;
  expectedResponseJson: unknown;
  scoringRubricJson: unknown;
  placementEvidenceJson?: unknown;
  fluencyEvidenceJson?: unknown;
  adminReviewJson?: unknown;
  audioAssetRequired?: boolean | null;
  audioValidatedByHuman?: boolean | null;
}): BankItem {
  return {
    id: item.id,
    itemStatus: item.itemStatus,
    reviewStatus: item.reviewStatus,
    strand: item.strand,
    itemType: item.itemType,
    phaseBand: item.phaseBand,
    phasePositionCode: stringFrom(asRecord(item.adminReviewJson).phasePositionCode),
    dailyTargetCode: item.targetPattern,
    skill: item.skill,
    displayMode: item.displayMode,
    responseMode: item.responseMode,
    targetPattern: item.targetPattern,
    wordType: item.wordType,
    displayText: item.displayText,
    canonicalAnswer: item.canonicalAnswer,
    expectedPronunciation: item.expectedPronunciation,
    targetWord: item.targetWord,
    vocabularyBand: item.vocabularyBand,
    morphologyWave: item.morphologyWave,
    targetMorpheme: item.targetMorpheme,
    comprehensionMode: item.comprehensionMode,
    stimulusMode: item.stimulusMode,
    calibratedProbeLevel: item.calibratedProbeLevel,
    studentPromptJson: item.studentPromptJson,
    stimulusJson: item.stimulusJson,
    expectedResponseJson: item.expectedResponseJson,
    scoringRubricJson: item.scoringRubricJson,
    placementEvidenceJson: item.placementEvidenceJson,
    fluencyEvidenceJson: item.fluencyEvidenceJson,
    validationMetadataJson: asRecord(item.adminReviewJson).validationMetadataJson,
    audioAssetRequired: item.audioAssetRequired,
    audioValidatedByHuman: item.audioValidatedByHuman,
  };
}

function parsePhasePositionCode(code: string, phaseBand?: number | null) {
  const match = code.match(/^PHASE_(\d+)_(.+)$/);
  const phaseNumber = match ? Number(match[1]) : phaseBand || 1;
  const subPosition = match ? match[2] : "ENTRY";
  return { phaseNumber, subPosition, label: `Phase ${phaseNumber} ${titleCase(subPosition)}` };
}

function targetOrder(code: string) {
  const known = ["short_a_cvc", "short_e_cvc", "short_i_cvc", "short_o_cvc", "short_u_cvc", "sh", "ch", "th", "wh", "ck", "ng", "nk", "initial_blend", "a_e", "i_e", "o_e", "u_e", "e_e"];
  return known.indexOf(code) >= 0 ? known.indexOf(code) + 1 : 99;
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasPhonemeNotation(text: string) {
  return /\/[a-z]+\/|[āēīōūăĕĭŏŭ]/i.test(text);
}

function firstLookFailedBlockers(decisionJson: unknown) {
  const checks = asRecord(decisionJson).checks;
  if (!Array.isArray(checks)) return [];
  return checks
    .filter((check) => {
      const record = asRecord(check);
      return record.result === "FAIL" && record.severity === "BLOCKER";
    })
    .map((check) => stringFrom(asRecord(check).requirementId) || "UNKNOWN_REQUIREMENT");
}

function countBy<T>(items: T[], fn: (item: T) => string) {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = fn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
