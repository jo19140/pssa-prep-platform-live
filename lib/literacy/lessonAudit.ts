import { auditLessonForApproval, runLessonLinter, type LessonLintCheck } from "@/lib/content/lessonMetadata";
import { wordMatchesPattern } from "./passageClassifier";
import { detectVcePattern, validatePseudowordCandidate } from "./pseudowordValidator";
import type { GeneratedLessonPart } from "./lessonParts/types";

export type GeneratedLessonDraft = {
  phasePositionId: string;
  dailyTargetId: string;
  phaseBand: number;
  dailyTargetCode: string;
  targetPattern: string;
  targetPatterns: string[];
  parts: GeneratedLessonPart[];
};

export type LessonGenerationAudit = {
  canPersist: boolean;
  checks: LessonLintCheck[];
  blockers: string[];
};

export function auditGeneratedLessonDraft(draft: GeneratedLessonDraft): LessonGenerationAudit {
  const checks: LessonLintCheck[] = [
    check("LESSON_HAS_EIGHT_PARTS", draft.parts.length === 8, "BLOCKER", `Lesson has ${draft.parts.length} parts.`),
    check("LESSON_PART_SEQUENCE_VALID", draft.parts.every((part, index) => part.partNumber === index + 1), "BLOCKER", "Lesson part sequence must be 1-8."),
    ...auditPart1(draft),
    ...auditPart2(draft),
    ...auditPart3(draft),
    ...auditPart4And7(draft),
    ...auditPart5(draft),
    ...auditPart6(draft),
    ...auditPart8(draft),
    ...auditSilentEExceptions(draft),
    ...auditKidVisibleCopy(draft),
  ];
  const lessonLike = {
    phasePositionId: draft.phasePositionId,
    dailyTargetId: draft.dailyTargetId,
    phaseBand: draft.phaseBand,
    dailyTargetCode: draft.dailyTargetCode,
    targetPattern: draft.targetPattern,
    targetPatterns: draft.targetPatterns,
    parts: draft.parts,
  };
  checks.push(...runLessonLinter(lessonLike));
  const approval = auditLessonForApproval(lessonLike);
  const blockers = [
    ...approval.blockers,
    ...checks.filter((entry) => entry.result === "FAIL" && entry.severity === "BLOCKER").map((entry) => `${entry.ruleId}: ${entry.evidence ?? "failed"}`),
  ];
  return { canPersist: blockers.length === 0, checks, blockers: Array.from(new Set(blockers)) };
}

export function evaluateLessonApprovalReadiness(lesson: unknown) {
  const approval = auditLessonForApproval(lesson);
  const firstLookBlockers = firstLookBlockersForLesson(lesson);
  const blockers = [...approval.blockers, ...firstLookBlockers];
  return { approvable: blockers.length === 0, blockers, warnings: approval.warnings };
}

function firstLookBlockersForLesson(lesson: any) {
  const parts = Array.isArray(lesson?.parts) ? lesson.parts : [];
  return parts
    .filter((part) => !part.firstLookReviewModelDecisionId)
    .map((part) => `LESSON_PART_FIRST_LOOK_REQUIRED: Part ${part.partNumber} is missing first-look review`);
}

function auditPart1(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 1);
  const words = strings(part?.contentJson.warmupWords);
  return [
    check("LESSON_WARMUP_NO_TODAY_PATTERN", words.every((word) => !matchesAnyTargetPattern(word, draft)), "BLOCKER", "Warm-up must not include today's new pattern."),
    check("LESSON_WORDS_ALL_TAGGED", wordTags(part).length >= words.length, "BLOCKER", "Part 1 warmup words require tags."),
  ];
}

function auditPart2(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 2);
  const examples = strings(part?.contentJson.conceptExamples);
  const demoPairs = Array.isArray(part?.contentJson.demonstrationPairs) ? part.contentJson.demonstrationPairs as Array<{ closed?: unknown; target?: unknown }> : [];
  const validDemoPairs = demoPairs.filter((pair) => {
    const closed = typeof pair.closed === "string" ? pair.closed : "";
    const target = typeof pair.target === "string" ? pair.target : "";
    return target.toLowerCase() === `${closed.toLowerCase()}e` && matchesAnyTargetPattern(target, draft) && !matchesAnyTargetPattern(closed, draft) && isPrerequisiteWord(closed);
  });
  return [
    check("LESSON_DAILY_TARGET_NARROW", targetPatterns(draft).every((pattern) => pattern.endsWith("_e")), "BLOCKER", `Daily target is ${draft.targetPattern}.`),
    check("LESSON_PART_TYPE_PRESENT", Boolean(part?.partType), "BLOCKER", "Part 2 requires partType."),
    check("LESSON_PART2_TARGET_EXAMPLES", examples.length > 0 && examples.every((word) => matchesAnyTargetPattern(word, draft)), "BLOCKER", "Part 2 concept examples must all match today's target."),
    check("LESSON_PART2_DEMO_MINIMAL_PAIRS", demoPairs.length > 0 && validDemoPairs.length === demoPairs.length, "BLOCKER", "Part 2 demonstration pairs must contrast closed-base review with VCe targets."),
  ];
}

function auditPart3(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 3);
  const lines = Array.isArray(part?.contentJson.contrastiveLines) ? part.contentJson.contrastiveLines as any[] : [];
  const pseudowords = strings(lines.find((line) => line.role === "target_pseudowords")?.words);
  const validations = pseudowords.map((word) => {
    const detectedPattern = detectVcePattern(word);
    return {
      detectedPattern,
      validation: detectedPattern ? validatePseudowordCandidate(word, detectedPattern, { strictLexicon: true }) : null,
    };
  });
  const realWords = lines.filter((line) => Number(line.lineNumber) >= 1 && Number(line.lineNumber) <= 3).flatMap((line) => strings(line.words));
  const invalidPseudowords = validations.filter((entry) => !entry.validation?.valid);
  const outOfTargetSet = validations.filter((entry) => !entry.detectedPattern || !targetPatterns(draft).includes(entry.detectedPattern));
  const rControlled = rControlledWords([...pseudowords, ...realWords]);
  return [
    check("LESSON_PART3_CONTRASTIVE_LINES", lines.length === 4 && !lines.some((line) => line.lineNumber === 5), "BLOCKER", "Part 3 must use four contrastive lines and no fifth line."),
    check("LESSON_PART3_REAL_WORD_COUNT", realWords.length >= 15 && realWords.length <= 20, "BLOCKER", `Part 3 lines 1-3 have ${realWords.length} real words (need 15-20).`),
    check("LESSON_PART3_PSEUDOWORD_COUNT", pseudowords.length >= 8 && pseudowords.length <= 10, "BLOCKER", `Part 3 has ${pseudowords.length} pseudowords (need 8-10).`),
    check("LESSON_PSEUDOWORDS_TARGET_ONLY", validations.every((entry) => entry.validation && wordMatchesPattern(entry.validation.pseudoword, entry.validation.targetPattern)), "BLOCKER", "Part 3 pseudowords must use only VCe target patterns."),
    check("LESSON_PSEUDOWORDS_IN_TARGET_SET", outOfTargetSet.length === 0, "BLOCKER", outOfTargetSet.length ? `Pseudowords outside target set: ${outOfTargetSet.map((entry) => `${entry.validation?.pseudoword ?? "unknown"}(${entry.detectedPattern ?? "none"})`).join(", ")}` : "Pseudowords detect to the target pattern set."),
    check("LESSON_PSEUDOWORDS_HAVE_EXPECTED_PRONUNCIATION", validations.every((entry) => entry.validation?.expectedPronunciation), "BLOCKER", "Pseudowords require expectedPronunciation metadata."),
    check("LESSON_PSEUDOWORDS_NOT_REAL_MISSPELLINGS", invalidPseudowords.length === 0, "BLOCKER", invalidPseudowords.length ? invalidPseudowords.map((entry) => `${entry.validation?.pseudoword ?? "unknown"}${entry.validation?.collidesWith ? ` -> ${entry.validation.collidesWith}` : ""}: ${entry.validation?.reason ?? entry.validation?.issues.join(", ") ?? "invalid"}`).join("; ") : "Pseudowords passed validation."),
    check("LESSON_PHASE3_NO_RCONTROLLED", rControlled.length === 0, "BLOCKER", rControlled.length ? `Phase 3 lesson contains r-controlled words (not taught yet): ${Array.from(new Set(rControlled)).join(", ")}` : "No r-controlled words in Part 3."),
    check("LESSON_WORDS_ALL_TAGGED", wordTags(part).length >= lines.flatMap((line) => strings(line.words)).length, "BLOCKER", "Part 3 words require tags."),
  ];
}

function auditPart4And7(draft: GeneratedLessonDraft) {
  const part4 = partNumber(draft, 4);
  const part7 = partNumber(draft, 7);
  const previewed = new Set(strings(part4?.contentJson.heartWordsPreviewedThisLesson).map((word) => word.toLowerCase()));
  const assumed = new Set(strings(part4?.contentJson.heartWordsAssumedKnown).map((word) => word.toLowerCase()));
  const heartWords = strings(part7?.contentJson.heartWordsUsedInConnectedText);
  const missing = heartWords.filter((word) => !previewed.has(word.toLowerCase()) && !assumed.has(word.toLowerCase()));
  const audit = part7?.contentAuditJson as any;
  const rControlled = rControlledWords([String(part7?.contentJson.passageText ?? "")]);
  return [
    check("LESSON_HEART_WORDS_PREVIEWED", missing.length === 0, "BLOCKER", missing.length ? `Unpreviewed heart words: ${missing.join(", ")}` : "All connected-text heart words are previewed or assumed known."),
    check("LESSON_CONNECTED_TEXT_HAS_AUDIT", Boolean(part7?.contentAuditJson), "BLOCKER", "Part 7 requires contentAuditJson."),
    check("LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED", strings(audit?.unclassifiedWords).length === 0, "BLOCKER", "Part 7 connected text must have zero unclassified words."),
    check("LESSON_ASSISTED_INDEPENDENT_SEPARATED", part7?.assistedModeAllowed === true && part7?.independentScoreEligible === false, "BLOCKER", "Part 7 listen-first must be assisted and not independent-score eligible."),
    check("LESSON_PHASE3_NO_RCONTROLLED", rControlled.length === 0, "BLOCKER", rControlled.length ? `Phase 3 lesson contains r-controlled words (not taught yet): ${Array.from(new Set(rControlled)).join(", ")}` : "No r-controlled words in Part 7."),
  ];
}

function auditPart5(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 5);
  const sentences = strings(part?.contentJson.sentences);
  const rControlled = rControlledWords(sentences);
  const noRControlled = check("LESSON_PHASE3_NO_RCONTROLLED", rControlled.length === 0, "BLOCKER", rControlled.length ? `Phase 3 lesson contains r-controlled words (not taught yet): ${Array.from(new Set(rControlled)).join(", ")}` : "No r-controlled words in Part 5.");
  return [
    check("LESSON_SENTENCE_COUNT", sentences.length >= 5 && sentences.length <= 8, "BLOCKER", `Part 5 has ${sentences.length} sentences.`),
    check("LESSON_NO_UNCLASSIFIED_WORDS", strings(part?.contentJson.unclassifiedWords).length === 0, "BLOCKER", "Part 5 sentence words must all classify."),
    // Classifier-independent: r-controlled words (for, are, car, her, ...) are excluded at Phase 3 Entry
    // even though the closed-syllable classifier would label e.g. "for" as a prerequisite.
    noRControlled,
    check("LESSON_PART5_NO_RCONTROLLED", noRControlled.result === "PASS", "BLOCKER", noRControlled.evidence ?? "Compatibility alias for LESSON_PHASE3_NO_RCONTROLLED."),
    check("LESSON_WORDS_ALL_TAGGED", wordTags(part).length > 0, "BLOCKER", "Part 5 requires word tags."),
  ];
}

/** Tokens whose vowel is immediately followed by an `r` in the same word (ar/er/ir/or/ur). */
function rControlledWords(sentences: string[]): string[] {
  return sentences
    .flatMap((sentence) => sentence.toLowerCase().split(/[^a-z]+/))
    .filter(Boolean)
    .filter((word) => /[aeiou]r/.test(word) || word === "are" || word === "for" || word === "here");
}

function auditPart6(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 6);
  const words = strings(part?.contentJson.dictatedWords);
  const sentences = strings(part?.contentJson.dictatedSentences);
  const rControlled = rControlledWords([...words, ...sentences]);
  return [
    check("LESSON_ENCODING_MINIMUM_ITEMS", words.length >= 6 && sentences.length >= 2, "BLOCKER", "Part 6 requires at least 6 dictated words and 2 dictated sentences."),
    check("LESSON_PHASE3_NO_RCONTROLLED", rControlled.length === 0, "BLOCKER", rControlled.length ? `Phase 3 lesson contains r-controlled words (not taught yet): ${Array.from(new Set(rControlled)).join(", ")}` : "No r-controlled words in Part 6."),
    check("LESSON_WORDS_ALL_TAGGED", wordTags(part).length >= words.length, "BLOCKER", "Part 6 dictated words require tags."),
  ];
}

// Full yes/no auxiliary/copula stem list, word-boundary anchored at the start of the question.
const YES_NO_STEM = /^(is|are|am|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might)\b/i;

function auditPart8(draft: GeneratedLessonDraft) {
  const questions = Array.isArray(partNumber(draft, 8)?.contentJson.questions) ? partNumber(draft, 8)?.contentJson.questions as any[] : [];
  const yesNo = questions.filter((entry) => YES_NO_STEM.test(String(entry.question || "").trim()));
  return [
    check("LESSON_PART8_OPEN_ENDED", questions.length >= 3 && yesNo.length === 0, "WARNING", yesNo.length ? `Part 8 has yes/no questions: ${yesNo.map((entry) => `"${entry.question}"`).join(", ")}` : "Part 8 questions are open-ended."),
  ];
}

function targetPatterns(draft: GeneratedLessonDraft) {
  return draft.targetPatterns?.length ? draft.targetPatterns : [draft.targetPattern];
}

function matchesAnyTargetPattern(word: string, draft: GeneratedLessonDraft) {
  return targetPatterns(draft).some((pattern) => wordMatchesPattern(word, pattern));
}

function isPrerequisiteWord(word: string) {
  return ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"].some((pattern) => wordMatchesPattern(word, pattern));
}

const SILENT_E_EXCEPTION_WORDS = new Set(["have", "give", "live", "come", "some", "done", "gone", "love"]);

/**
 * Silent-e *exception* words (short-vowel VCe) must be tagged `heart`, never `target`.
 * The classifier's a_e/i_e/o_e regex would otherwise match e.g. "have" and mis-decode it.
 */
function auditSilentEExceptions(draft: GeneratedLessonDraft) {
  const offenders: string[] = [];
  for (const part of draft.parts) {
    for (const tagged of wordTags(part)) {
      const word = String(tagged?.word ?? "").toLowerCase();
      const category = String(tagged?.tag ?? tagged?.category ?? "").toLowerCase();
      if (SILENT_E_EXCEPTION_WORDS.has(word) && category === "target") offenders.push(word);
    }
  }
  return [
    check("LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART", offenders.length === 0, "BLOCKER", offenders.length ? `Silent-e exception words tagged as target (must be heart): ${Array.from(new Set(offenders)).join(", ")}` : "No silent-e exception words mis-tagged as target."),
  ];
}

function auditKidVisibleCopy(draft: GeneratedLessonDraft) {
  const offenders: string[] = [];
  for (const part of draft.parts) {
    const copy = JSON.stringify(part.kidVisibleCopy);
    const allowsSilentEReview = draft.dailyTargetCode === "vce_mix_all";
    const copyWithoutAllowed = allowsSilentEReview ? copy.split("silent-e review").join("") : copy;
    if (/Phase 3 Mid/i.test(copyWithoutAllowed)) offenders.push(`Part ${part.partNumber}: Phase 3 Mid`);
    if (/silent-e words/i.test(copyWithoutAllowed)) offenders.push(`Part ${part.partNumber}: silent-e words`);
    if (!allowsSilentEReview && /silent-e review/i.test(copy)) offenders.push(`Part ${part.partNumber}: silent-e review`);
  }
  return [
    check("LESSON_KID_VIEW_NO_INTERNAL_METADATA", offenders.length === 0, "BLOCKER", offenders.length ? `Kid copy contains forbidden labels: ${offenders.join(", ")}` : "Kid copy avoids internal phase labels and broad silent-e wording."),
  ];
}

function check(ruleId: string, passed: boolean, severity: LessonLintCheck["severity"], evidence: string): LessonLintCheck {
  return { ruleId, result: passed ? "PASS" : "FAIL", severity, evidence };
}

function partNumber(draft: GeneratedLessonDraft, number: number) {
  return draft.parts.find((part) => part.partNumber === number);
}

function wordTags(part: GeneratedLessonPart | undefined) {
  const tags = part?.wordTagsJson as any;
  return Array.isArray(tags?.words) ? tags.words : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
