/**
 * Lesson + LessonPart metadata derivation, content lint, and approval audit.
 *
 * Reconstructed from consumer contracts (content-v3 first-look test fixtures)
 * after the original source files were lost from version control. Behavior is
 * anchored to the assertions in scripts/test-content-v3-first-look.ts; the
 * audit rules + lint rules below should be extended as new lesson-architecture
 * requirements ship.
 */

export type LessonMetadataFields = {
  phaseBand: number | null;
  dailyTargetCode: string | null;
  targetPattern: string | null;
  targetLabel: string | null;
  lessonStatus: string;
  lessonType: string | null;
  generatedBy: string | null;
  sourceModelDecisionId: string | null;
  contentAuditStatus: string | null;
  approvedAt: Date | null;
};

export type LessonPartMetadataFields = {
  partType: string | null;
  dailyTargetCode: string | null;
  targetPattern: string | null;
  skillFocus: string | null;
  strandFocus: string | null;
  contentAuditJson: unknown;
  wordTagsJson: unknown;
  scoringRubricJson: unknown;
  studentDisplayMode: string | null;
  responseMode: string | null;
  assistedModeAllowed: boolean | null;
  independentScoreEligible: boolean | null;
};

export type LessonLintCheck = {
  ruleId: string;
  result: "PASS" | "FAIL" | "NA";
  severity: "BLOCKER" | "WARNING" | "INFO";
  evidence?: string;
};

/** Array shape so callers can call .filter() / .some() / .map() directly. */
export type LessonLintResult = LessonLintCheck[];

export type LessonApprovalAudit = {
  approvable: boolean;
  blockers: string[];
  warnings: string[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function findPartByNumber(lesson: any, partNumber: number) {
  const parts = asArray<any>(lesson?.parts);
  return parts.find((p) => p?.partNumber === partNumber) ?? null;
}

/**
 * Derive lesson-level metadata. Pulls phaseBand from the lesson's
 * phasePosition relation if not explicitly set, and stamps lessonType as
 * STRUCTURED_LITERACY_8_PART when the lesson has 8 parts (the only lesson
 * type Reading Buddy currently ships).
 */
export function deriveLessonMetadata(lesson: any): LessonMetadataFields {
  const phasePosition = asObject(lesson?.phasePosition);
  const dailyTarget = asObject(lesson?.dailyTarget);
  const parts = asArray<any>(lesson?.parts);

  const phaseBand =
    asNumber(lesson?.phaseBand) ??
    asNumber(phasePosition?.phaseNumber) ??
    null;

  const dailyTargetCode =
    asString(lesson?.dailyTargetCode) ??
    asString(dailyTarget?.code) ??
    null;

  const targetPattern =
    asString(lesson?.targetPattern) ??
    asString(dailyTarget?.code) ??
    dailyTargetCode;

  const targetLabel =
    asString(lesson?.targetLabel) ??
    asString(dailyTarget?.tutorLabel) ??
    asString(dailyTarget?.kidVisibleLabel) ??
    null;

  const lessonType =
    asString(lesson?.lessonType) ??
    (parts.length === 8 ? "STRUCTURED_LITERACY_8_PART" : null);

  const approvedAtRaw = lesson?.approvedAt;
  const approvedAt =
    approvedAtRaw instanceof Date
      ? approvedAtRaw
      : approvedAtRaw
        ? new Date(approvedAtRaw)
        : null;

  return {
    phaseBand,
    dailyTargetCode,
    targetPattern,
    targetLabel,
    lessonStatus: asString(lesson?.lessonStatus) ?? "candidate",
    lessonType,
    generatedBy: asString(lesson?.generatedBy),
    sourceModelDecisionId: asString(lesson?.sourceModelDecisionId),
    contentAuditStatus: asString(lesson?.contentAuditStatus),
    approvedAt,
  };
}

/**
 * Derive part-level metadata. Pulls partType from the part's contentJson, and
 * marks Part 7 (CONNECTED_TEXT_READING) as independentScoreEligible = false
 * because Reading Buddy defaults Part 7 to assisted-vs-independent split
 * scoring; the independent-only path is enabled per session, not at the part
 * level.
 */
export function deriveLessonPartMetadata(part: any, lesson?: any): LessonPartMetadataFields {
  const contentJson = asObject(part?.contentJson) ?? {};
  const partType = asString(contentJson.partType);
  const partNumber = asNumber(part?.partNumber);

  let independentScoreEligible: boolean | null = null;
  if (partType === "CONNECTED_TEXT_READING" || partNumber === 7) {
    independentScoreEligible = false;
  }

  const assistedAllowedRaw = contentJson.listenFirstAllowed;
  const assistedModeAllowed =
    typeof assistedAllowedRaw === "boolean"
      ? assistedAllowedRaw
      : partType === "CONNECTED_TEXT_READING"
        ? true
        : null;

  return {
    partType,
    dailyTargetCode:
      asString(contentJson.dailyTargetCode) ??
      asString(lesson?.dailyTargetCode) ??
      asString(asObject(lesson?.dailyTarget)?.code),
    targetPattern: asString(contentJson.targetPattern) ?? asString(lesson?.targetPattern),
    skillFocus: asString(contentJson.skillFocus) ?? partType,
    strandFocus: asString(contentJson.strandFocus),
    contentAuditJson: contentJson.contentAuditJson ?? null,
    wordTagsJson: contentJson.wordTags ?? contentJson.wordTagsJson ?? null,
    scoringRubricJson: contentJson.scoringRubricJson ?? null,
    studentDisplayMode: asString(contentJson.studentDisplayMode),
    responseMode: asString(contentJson.responseMode),
    assistedModeAllowed,
    independentScoreEligible,
  };
}

/**
 * Run lesson-structure lint. Returns an array of checks each callers can
 * filter/map. Today's coverage:
 *
 *   LESSON_WARMUP_NO_TODAY_PATTERN — Part 1 warmup words must not include
 *     today's target pattern (warmups review prerequisites only).
 *
 *   LESSON_ENCODING_MINIMUM_ITEMS — Part 6 dictated words must include at
 *     least 6 items per the v3 lesson architecture spec.
 *
 * TODO: extend with §5.12 kid-view copy rules, contrastive line structure
 * validation, and Part 4 heart/vocabulary preview alignment.
 */
export function runLessonLinter(lesson: any): LessonLintResult {
  const checks: LessonLintResult = [];
  const targetPattern = asString(lesson?.targetPattern) ?? asString(asObject(lesson?.dailyTarget)?.code);

  // LESSON_WARMUP_NO_TODAY_PATTERN
  const warmup = findPartByNumber(lesson, 1);
  const warmupWords = asArray<unknown>(asObject(warmup?.contentJson)?.warmupWords)
    .map((w) => (typeof w === "string" ? w : ""))
    .filter(Boolean);
  const conceptExamples = asArray<unknown>(asObject(findPartByNumber(lesson, 2)?.contentJson)?.conceptExamples)
    .map((w) => (typeof w === "string" ? w : ""))
    .filter(Boolean);
  const targetWordsInWarmup = warmupWords.filter((w) =>
    conceptExamples.some((ex) => ex.toLowerCase() === w.toLowerCase()),
  );
  checks.push({
    ruleId: "LESSON_WARMUP_NO_TODAY_PATTERN",
    result: targetWordsInWarmup.length === 0 ? "PASS" : "FAIL",
    severity: "BLOCKER",
    evidence:
      targetWordsInWarmup.length === 0
        ? `Warmup contains no today-pattern words (targetPattern=${targetPattern ?? "unknown"}).`
        : `Warmup contains today-pattern words: ${targetWordsInWarmup.join(", ")}.`,
  });

  // LESSON_ENCODING_MINIMUM_ITEMS
  const encoding = findPartByNumber(lesson, 6);
  const dictatedWords = asArray<unknown>(asObject(encoding?.contentJson)?.dictatedWords);
  checks.push({
    ruleId: "LESSON_ENCODING_MINIMUM_ITEMS",
    result: dictatedWords.length >= 6 ? "PASS" : "FAIL",
    severity: "BLOCKER",
    evidence: `Encoding part has ${dictatedWords.length} dictated words (minimum 6).`,
  });

  return checks;
}

/**
 * Audit a lesson for approval readiness. Returns blockers (strings that
 * include a stable rule code so callers can pattern-match) and warnings.
 *
 * Current rule coverage:
 *   LESSON_HAS_PHASE_POSITION — lesson must be tied to a phase position.
 *   LESSON_HAS_DAILY_TARGET — lesson must be tied to a daily target.
 *   LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED — Part 7 contentAuditJson must
 *     have zero unclassified words (every word in connected text must be
 *     tagged as target / prerequisite / heart / vocabulary).
 *   LESSON_HEART_WORDS_PREVIEWED — Part 7 heart words must all be previewed
 *     in Part 4 (HFW/vocab preview).
 *
 * Also bundles the BLOCKER-severity lint failures from runLessonLinter so a
 * single audit call surfaces every reason a lesson can't be approved.
 *
 * TODO: extend with passage decodability gate (target/prerequisite-only
 * besides previewed heart words) and per-strand evidence checks.
 */
export function auditLessonForApproval(lesson: any): LessonApprovalAudit {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!lesson || typeof lesson !== "object") {
    return { approvable: false, blockers: ["LESSON_HAS_LESSON: lesson is null or not an object"], warnings };
  }

  if (!asString(lesson.phasePositionId)) {
    blockers.push("LESSON_HAS_PHASE_POSITION: lesson is missing phasePositionId");
  }
  if (!asString(lesson.dailyTargetId)) {
    blockers.push("LESSON_HAS_DAILY_TARGET: lesson is missing dailyTargetId");
  }

  // Part 7 content audit checks
  const part7 = findPartByNumber(lesson, 7);
  const part7ContentJson = asObject(part7?.contentJson);
  const part7Audit = asObject(part7ContentJson?.contentAuditJson);

  const unclassifiedWords = asArray<unknown>(part7Audit?.unclassifiedWords);
  if (unclassifiedWords.length > 0) {
    blockers.push(
      `LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED: Part 7 connected text has ${unclassifiedWords.length} unclassified word(s)`,
    );
  }

  // Heart words in Part 7 must all be previewed in Part 4
  const part4 = findPartByNumber(lesson, 4);
  const part4ContentJson = asObject(part4?.contentJson);
  const previewedHeart = new Set(
    asArray<unknown>(part4ContentJson?.heartWords)
      .map((w) => (typeof w === "string" ? w.toLowerCase() : null))
      .filter((w): w is string => Boolean(w)),
  );
  const part7HeartWords = asArray<unknown>(part7Audit?.heartWords)
    .map((w) => (typeof w === "string" ? w : null))
    .filter((w): w is string => Boolean(w));
  const unpreviewedHeart = part7HeartWords.filter((w) => !previewedHeart.has(w.toLowerCase()));
  if (unpreviewedHeart.length > 0) {
    blockers.push(
      `LESSON_HEART_WORDS_PREVIEWED: Part 7 heart words not previewed in Part 4: ${unpreviewedHeart.join(", ")}`,
    );
  }

  // Roll up BLOCKER lint failures into the audit
  const lintBlockers = runLessonLinter(lesson).filter(
    (check) => check.result === "FAIL" && check.severity === "BLOCKER",
  );
  for (const check of lintBlockers) {
    blockers.push(`${check.ruleId}: ${check.evidence ?? "lint blocker"}`);
  }

  return {
    approvable: blockers.length === 0,
    blockers,
    warnings,
  };
}
