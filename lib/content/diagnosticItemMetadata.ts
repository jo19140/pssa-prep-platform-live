/**
 * Diagnostic item metadata derivation, validation, and Prisma input adapters.
 *
 * This is reconstructed from consumer contracts (admin review action, bank
 * import, generator script, content-v3 first-look test) after the original
 * source files were lost from version control. Behavior is anchored to the
 * tests in scripts/test-content-v3-first-look.ts; further refinement should
 * extend the strand-specific rules in `enforceStrandRequirements` and the
 * derivation helpers below.
 */

export type DiagnosticItemMetadataFields = {
  // Phase + curriculum
  phaseBand?: number | null;
  phasePositionId?: string | null;
  dailyTargetId?: string | null;
  dailyTargetCode?: string | null;
  morphologyWave?: string | null;
  targetMorpheme?: string | null;
  skill?: string | null;

  // Display / response
  displayMode?: string | null;
  responseMode?: string | null;
  stimulusMode?: string | null;

  // Word / target
  targetWord?: string | null;
  targetPattern?: string | null;
  wordType?: string | null;
  displayText?: string | null;
  canonicalAnswer?: string | null;
  expectedPronunciation?: string | null;

  // Vocab
  vocabularyBand?: string | null;

  // Comprehension
  comprehensionMode?: string | null;
  calibratedProbeLevel?: string | null;

  // Audio gate (PA segmented audio items must not auto-approve)
  audioAssetRequired?: boolean;
  audioValidatedByHuman?: boolean;

  // Pilot readiness status
  itemStatus?: string;

  // Evidence routing
  placementEvidenceJson?: unknown;
  fluencyEvidenceJson?: unknown;
};

export type DiagnosticItemMetadataDerivation = {
  metadata: DiagnosticItemMetadataFields;
  missingRequired: string[];
  approvalBlockers: string[];
};

type AppliedEdit = {
  field?: string;
  before?: unknown;
  after?: unknown;
  reviewNoteExcerpt?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

/**
 * Apply each entry in adminReviewJson.appliedEdits onto a base record so a
 * Save-Edit decision can promote { field, after } pairs onto the top-level
 * metadata without re-deriving from prompt/response JSON.
 */
function applyAdminEdits(base: Record<string, unknown>, adminReviewJson: unknown): Record<string, unknown> {
  const admin = asObject(adminReviewJson);
  if (!admin) return base;
  const edits = asArray(admin.appliedEdits) as AppliedEdit[];
  const result = { ...base };
  for (const edit of edits) {
    const field = asString(edit?.field);
    if (!field) continue;
    result[field] = edit.after ?? result[field] ?? null;
  }
  return result;
}

function deriveDisplayMode(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.displayMode);
  if (explicit) return explicit;
  const strand = asString(raw.strand);
  const itemType = asString(raw.itemType);
  if (strand === "PA") return "AUDIO_ONLY";
  if (strand === "DECODING" && (itemType === "REAL_WORD_DECODE" || itemType === "PSEUDOWORD_DECODE")) {
    return "TEXT_CARD_ONE_WORD";
  }
  if (strand === "FLUENCY" && itemType?.includes("PASSAGE")) return "TEXT_PASSAGE";
  if (strand === "COMPREHENSION" && itemType?.startsWith("LISTENING")) return "AUDIO_THEN_TEXT_CHOICES";
  if (strand === "COMPREHENSION" && itemType?.startsWith("READING")) return "SILENT_READING_THEN_TEXT_CHOICES";
  if (strand === "VOCABULARY") return "TEXT_CHOICE";
  if (strand === "MORPHOLOGY") return "TEXT_CHOICE";
  return null;
}

function deriveResponseMode(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.responseMode);
  if (explicit) return explicit;
  const scoringRubric = asObject(raw.scoringRubricJson);
  const scoring = asString(scoringRubric?.scoring);
  if (scoring === "speech_match") return "speech_response";
  if (scoring === "speech_response") return "speech_response";
  if (scoring === "speech_accuracy_plus_latency") return "speech_response";
  if (scoring === "oral_reading_fluency") return "speech_response";
  if (scoring === "selected_choice") return "selected_choice";
  if (scoring === "spelling_accuracy") return "typed_response";
  return null;
}

function deriveSkill(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.skill);
  if (explicit) return explicit;
  const strand = asString(raw.strand);
  const itemType = asString(raw.itemType);
  if (!strand || !itemType) return null;
  // Convention: lowercase itemType with verb-noun phrasing for skill keys.
  switch (itemType) {
    case "REAL_WORD_DECODE":
      return "real_word_decoding";
    case "PSEUDOWORD_DECODE":
      return "pseudoword_decoding";
    case "DECODING_PHRASE_READ":
      return "decoding_phrase_reading";
    case "ORAL_READING_FLUENCY_PASSAGE":
      return "connected_text_oral_reading_fluency";
    case "PHRASE_READ_AUTOMATICITY":
      return "phrase_reading_automaticity";
    case "BASE_WORD_ID":
      return "base_word_identification";
    case "AFFIX_ID":
      return "affix_identification";
    case "PREFIX_MEANING":
      return "prefix_meaning";
    case "SUFFIX_MEANING":
      return "suffix_meaning";
    case "WORD_MEANING_CONTEXT":
      return "infer_word_meaning_from_context";
    case "CONCRETE_WORD_PICTURE_CHOICE":
      return "concrete_word_receptive";
    default:
      return itemType.toLowerCase();
  }
}

function deriveWordType(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.wordType);
  if (explicit) return explicit;
  const itemType = asString(raw.itemType);
  if (itemType === "REAL_WORD_DECODE") return "real_word";
  if (itemType === "PSEUDOWORD_DECODE") return "pseudoword";
  return null;
}

function deriveTargetPattern(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.targetPattern);
  if (explicit) return explicit;
  const dailyTargetCode = asString(raw.dailyTargetCode);
  if (dailyTargetCode) return dailyTargetCode;
  return null;
}

function deriveDisplayText(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.displayText);
  if (explicit) return explicit;
  const studentPrompt = asObject(raw.studentPromptJson);
  return asString(studentPrompt?.displayText);
}

function deriveCanonicalAnswer(raw: Record<string, unknown>): string | null {
  const explicit = asString(raw.canonicalAnswer);
  if (explicit) return explicit;
  const expected = asObject(raw.expectedResponseJson);
  return asString(expected?.canonical);
}

/**
 * Strand-specific required field rules. Push field names onto missingRequired
 * when they're not set; push human-readable blocker messages onto approvalBlockers
 * with the same field name so callers can show them in the admin UI.
 */
function enforceStrandRequirements(
  raw: Record<string, unknown>,
  metadata: DiagnosticItemMetadataFields,
  missingRequired: string[],
  approvalBlockers: string[],
): void {
  const strand = asString(raw.strand);
  const itemType = asString(raw.itemType);
  const scoringRubric = asObject(raw.scoringRubricJson);
  const scoringMode = asString(scoringRubric?.scoring);

  if (!scoringMode) {
    missingRequired.push("scoring");
    approvalBlockers.push("Missing scoring rubric mode (scoringRubricJson.scoring).");
  }

  if (strand === "DECODING") {
    if (!metadata.displayText) {
      missingRequired.push("displayText");
      approvalBlockers.push("Decoding items require displayText.");
    }
    if (!metadata.targetPattern) {
      missingRequired.push("targetPattern");
      approvalBlockers.push("Decoding items require a targetPattern (or dailyTargetCode).");
    }
    if (!metadata.wordType) {
      missingRequired.push("wordType");
      approvalBlockers.push("Decoding items require wordType (real_word or pseudoword).");
    }
  }

  // PA items are oral-only per §4. No printed stimulus words, no printed answer choices.
  if (strand === "PA") {
    const studentPrompt = asObject(raw.studentPromptJson);
    if (asString(studentPrompt?.displayText)) {
      approvalBlockers.push("PA items must not include a printed stimulus word in studentPromptJson.displayText.");
    }
    const choices = asArray(studentPrompt?.choices);
    if (choices.length > 0) {
      approvalBlockers.push("PA items must not show printed answer choices — printed stimulus violates the oral-only rule.");
    }
    // PA segmented audio items must not auto-approve until a human validates the TTS.
    const stimulus = asObject(raw.stimulusJson);
    const isSegmented = stimulus?.audioMode === "segmented_audio";
    if (isSegmented && metadata.audioValidatedByHuman !== true) {
      approvalBlockers.push("PA segmented-audio item awaits audioValidatedByHuman = true.");
    }
  }

  // Tier 2 abstract vocabulary words must not use picture-choice presentation.
  if (strand === "VOCABULARY") {
    const isPictureChoice = itemType === "CONCRETE_WORD_PICTURE_CHOICE";
    const tier = asString(metadata.vocabularyBand);
    if (isPictureChoice && tier === "Tier 2") {
      approvalBlockers.push(
        "Tier 2 abstract vocabulary words must use sentence/scenario format, not picture-choice presentation.",
      );
    }
  }
}

/**
 * Derive top-level diagnostic item metadata from a raw payload (v1.4 bank
 * entry, generated candidate, save-edit promotion, or existing DB row).
 *
 * Returns { metadata, missingRequired, approvalBlockers }. The metadata is
 * the field bag suitable for spreading into Prisma create/update inputs via
 * the adapters below. missingRequired and approvalBlockers drive the admin
 * review queue's approval gate.
 */
export function deriveDiagnosticItemMetadata(raw: unknown): DiagnosticItemMetadataDerivation {
  const base = (asObject(raw) ?? {}) as Record<string, unknown>;
  const merged = applyAdminEdits(base, base.adminReviewJson);

  const metadata: DiagnosticItemMetadataFields = {
    phaseBand: typeof merged.phaseBand === "number" ? merged.phaseBand : null,
    phasePositionId: asString(merged.phasePositionId),
    dailyTargetId: asString(merged.dailyTargetId),
    dailyTargetCode: asString(merged.dailyTargetCode),
    morphologyWave: asString(merged.morphologyWave),
    targetMorpheme: asString(merged.targetMorpheme),
    skill: deriveSkill(merged),

    displayMode: deriveDisplayMode(merged),
    responseMode: deriveResponseMode(merged),
    stimulusMode: asString(merged.stimulusMode),

    targetWord: asString(merged.targetWord),
    targetPattern: deriveTargetPattern(merged),
    wordType: deriveWordType(merged),
    displayText: deriveDisplayText(merged),
    canonicalAnswer: deriveCanonicalAnswer(merged),
    expectedPronunciation: asString(merged.expectedPronunciation),

    vocabularyBand: asString(merged.vocabularyBand),

    comprehensionMode: asString(merged.comprehensionMode),
    calibratedProbeLevel: asString(merged.calibratedProbeLevel),

    audioAssetRequired: asBool(merged.audioAssetRequired, false),
    audioValidatedByHuman: asBool(merged.audioValidatedByHuman, false),

    itemStatus: asString(merged.itemStatus) ?? "candidate",

    placementEvidenceJson: merged.placementEvidenceJson ?? null,
    fluencyEvidenceJson: merged.fluencyEvidenceJson ?? null,
  };

  const missingRequired: string[] = [];
  const approvalBlockers: string[] = [];
  enforceStrandRequirements(merged, metadata, missingRequired, approvalBlockers);

  return { metadata, missingRequired, approvalBlockers };
}

/**
 * Strip fields that the caller must set directly (FK columns via relation
 * form on the strict variant; derived-only fields like dailyTargetCode that
 * aren't actual DB columns) and normalize JSON columns to a Prisma-compatible
 * shape: omit when null/undefined so the field stays unset on the input.
 *
 * Returning a permissive shape (`Record<string, unknown>`) avoids forcing the
 * caller into one variant of Prisma's strict-vs-unchecked input XOR. The
 * generator and bank-import scripts set phasePositionId/dailyTargetId
 * directly (unchecked variant); the review action route uses the relation
 * form (strict variant). Both spread the adapter output safely as long as it
 * doesn't include conflicting FK or JSON fields.
 */
function normalizeForPrismaInput(meta: DiagnosticItemMetadataFields): Record<string, unknown> {
  const {
    dailyTargetCode: _ignoredDailyTargetCode,
    phasePositionId: _ignoredPhasePositionId,
    dailyTargetId: _ignoredDailyTargetId,
    placementEvidenceJson,
    fluencyEvidenceJson,
    ...rest
  } = meta;
  const normalized: Record<string, unknown> = { ...rest };
  if (placementEvidenceJson !== null && placementEvidenceJson !== undefined) {
    normalized.placementEvidenceJson = placementEvidenceJson;
  }
  if (fluencyEvidenceJson !== null && fluencyEvidenceJson !== undefined) {
    normalized.fluencyEvidenceJson = fluencyEvidenceJson;
  }
  return normalized;
}

/**
 * Spread-friendly Prisma create input fragment. Caller must merge with
 * required DiagnosticItem fields (strand, itemType, phasePositionId,
 * dailyTargetId, etc.).
 */
export function diagnosticMetadataToCreateInput(meta: DiagnosticItemMetadataFields) {
  return normalizeForPrismaInput(meta);
}

/**
 * Spread-friendly Prisma update input fragment.
 */
export function diagnosticMetadataToUpdateInput(meta: DiagnosticItemMetadataFields) {
  return normalizeForPrismaInput(meta);
}
