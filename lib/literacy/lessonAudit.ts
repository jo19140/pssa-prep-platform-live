import { auditLessonForApproval, runLessonLinter, type LessonLintCheck } from "@/lib/content/lessonMetadata";
import { wordMatchesPattern } from "./passageClassifier";
import { PATTERN_REGISTRY } from "./patternRegistry";
import { detectPatternCandidates, validatePseudowordCandidate } from "./pseudowordValidator";
import type { GeneratedLessonPart } from "./lessonParts/types";
import { decomposeInflectedWord, morphologyConfigFromTargetPatternsJson, type MorphologyAnalyzerConfig } from "./morphologyAnalyzer";

export type GeneratedLessonDraft = {
  phasePositionId: string;
  dailyTargetId: string;
  phaseBand: number;
  dailyTargetCode: string;
  targetPattern: string;
  targetPatterns: string[];
  pseudowordPatterns?: string[];
  morphology?: MorphologyAnalyzerConfig;
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
    ...auditRControlledTargetAdmission(draft),
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
    pseudowordPatterns: pseudowordPatterns(draft),
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
  const demoMode = String(part?.contentJson.demoMode ?? "minimal_pairs");
  const demoPairs = Array.isArray(part?.contentJson.demonstrationPairs) ? part.contentJson.demonstrationPairs as Array<{ closed?: unknown; base?: unknown; target?: unknown }> : [];
  const demoExamples = strings(part?.contentJson.demonstrationExamples);
  const validDemoPairs = demoPairs.filter((pair) => {
    const closed = typeof pair.closed === "string" ? pair.closed : "";
    const target = typeof pair.target === "string" ? pair.target : "";
    const targetPattern = targetPatterns(draft).find((pattern) => wordMatchesPattern(target, pattern, { strictPhonemeLexicon: draft.phaseBand >= 4 }));
    if (!targetPattern || matchesAnyTargetPattern(closed, draft) || !isPrerequisiteWord(closed)) return false;
    if (closedVowelLetter(closed) !== longVowelLetterForPattern(targetPattern)) return false;
    // True minimal pair, enforced per pattern family:
    // VCe targets must be the closed base plus exactly one appended e (cap -> cape, never cat -> cape).
    if (/^[aeiou]_e$/.test(targetPattern)) {
      return target.toLowerCase() === `${closed.toLowerCase()}e`;
    }
    // Vowel-team targets must preserve onset and coda and swap only the vowel grapheme (pan -> pain, never pat -> pain).
    return isMinimalTeamPair(closed, target, targetPattern);
  });
  const examplesOnlyValid = demoExamples.length >= 3 && demoExamples.length <= 5 && demoExamples.every((word) => matchesAnyTargetPattern(word, draft));
  const transformationPairsValid = demoPairs.length > 0 && demoPairs.every((pair) => transformationPairValid(pair, draft));
  const demoValid = demoMode === "examples_only"
    ? examplesOnlyValid && demoPairs.length === 0
    : demoMode === "transformation_pairs"
      ? transformationPairsValid
      : demoPairs.length > 0 && validDemoPairs.length === demoPairs.length;
  return [
    check("LESSON_DAILY_TARGET_NARROW", targetPatterns(draft).every(isNarrowPatternCode), "BLOCKER", `Daily target is ${draft.targetPattern}.`),
    check("LESSON_PART_TYPE_PRESENT", Boolean(part?.partType), "BLOCKER", "Part 2 requires partType."),
    check("LESSON_PART2_TARGET_EXAMPLES", examples.length > 0 && examples.every((word) => matchesAnyTargetPattern(word, draft)), "BLOCKER", "Part 2 concept examples must all match today's target."),
    check("LESSON_PART2_DEMO_MODE_VALID", demoValid, "BLOCKER", demoMode === "examples_only" ? "Part 2 examples-only mode requires 3-5 clean target examples and no non-target pairs." : demoMode === "transformation_pairs" ? "Part 2 transformation-pairs mode requires verified base-to-inflected morphology pairs." : "Part 2 minimal-pair mode requires closed-base review words contrasted with target words."),
    check("LESSON_PART2_DEMO_MINIMAL_PAIRS", demoMode === "examples_only" || demoMode === "transformation_pairs" ? true : demoValid, "BLOCKER", "Compatibility alias for minimal-pair Part 2 demonstrations."),
  ];
}

function transformationPairValid(pair: { base?: unknown; target?: unknown }, draft: GeneratedLessonDraft) {
  const morphology = morphologyForDraft(draft);
  if (!morphology) return false;
  const base = typeof pair.base === "string" ? pair.base.toLowerCase() : "";
  const target = typeof pair.target === "string" ? pair.target.toLowerCase() : "";
  if (!base || !target) return false;
  if (!morphology.stemPatterns.some((pattern) => wordMatchesPattern(base, pattern, { strictPhonemeLexicon: draft.phaseBand >= 4 }))) return false;
  const analysis = decomposeInflectedWord(target, morphology);
  return Boolean(analysis && analysis.base === base && analysis.rule === morphology.rule);
}

// Single source of truth: delegate to the shared parser (wrap the Part 2 morphologyJson so it
// matches the targetPatternsJson shape the parser expects). New rules added in ONE place.
function morphologyForDraft(draft: GeneratedLessonDraft): MorphologyAnalyzerConfig | null {
  if (draft.morphology) return draft.morphology;
  const part = partNumber(draft, 2);
  return morphologyConfigFromTargetPatternsJson({ morphologyJson: part?.contentJson.morphologyJson }) ?? null;
}

function auditRControlledTargetAdmission(draft: GeneratedLessonDraft): LessonLintCheck[] {
  const activeRTargets = rControlledTargetPatterns(draft);
  if (activeRTargets.length === 0) return [];

  const offenders: string[] = [];
  const part2 = partNumber(draft, 2);
  const demoPairs = Array.isArray(part2?.contentJson.demonstrationPairs) ? part2.contentJson.demonstrationPairs as Array<{ closed?: unknown; target?: unknown }> : [];
  for (const pair of demoPairs) {
    const closed = typeof pair.closed === "string" ? pair.closed : "";
    const target = typeof pair.target === "string" ? pair.target : "";
    if (rControlledWords([closed]).length > 0) offenders.push(`Part 2 base ${closed}`);
    if (rControlledWords([target]).length > 0 && !matchesDeclaredRTarget(target, activeRTargets)) offenders.push(`Part 2 target ${target}`);
  }

  const part3 = partNumber(draft, 3);
  const lines = Array.isArray(part3?.contentJson.contrastiveLines) ? part3.contentJson.contrastiveLines as any[] : [];
  for (const line of lines) {
    const words = strings(line.words);
    const isPseudowordLine = line.role === "target_pseudowords";
    for (const word of rControlledWords(words)) {
      const allowed = isPseudowordLine
        ? activeRTargets.some((pattern) => detectPatternCandidates(word).includes(pattern))
        : matchesDeclaredRTarget(word, activeRTargets);
      if (!allowed) offenders.push(`Part 3 ${word}`);
    }
  }

  const part5 = partNumber(draft, 5);
  for (const word of rControlledWords(strings(part5?.contentJson.sentences))) {
    if (!matchesDeclaredRTarget(word, activeRTargets)) offenders.push(`Part 5 ${word}`);
  }

  const part6 = partNumber(draft, 6);
  for (const word of rControlledWords([...strings(part6?.contentJson.dictatedWords), ...strings(part6?.contentJson.dictatedSentences)])) {
    if (!matchesDeclaredRTarget(word, activeRTargets)) offenders.push(`Part 6 ${word}`);
  }

  const part7 = partNumber(draft, 7);
  for (const word of rControlledWords([String(part7?.contentJson.passageText ?? "")])) {
    if (!matchesDeclaredRTarget(word, activeRTargets)) offenders.push(`Part 7 ${word}`);
  }

  return [
    check(
      "LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET",
      offenders.length === 0,
      "BLOCKER",
      offenders.length
        ? `R-controlled words must match declared r-controlled targets only: ${Array.from(new Set(offenders)).join(", ")}`
        : "R-controlled words match declared target patterns, and Part 2 bases stay non-r-controlled.",
    ),
  ];
}

function auditPart3(draft: GeneratedLessonDraft) {
  const part = partNumber(draft, 3);
  const lines = Array.isArray(part?.contentJson.contrastiveLines) ? part.contentJson.contrastiveLines as any[] : [];
  const pseudowords = strings(lines.find((line) => line.role === "target_pseudowords")?.words);
  const compareTarget = morphologyForDraft(draft)?.rule === "compare";
  const validations = pseudowords.map((word) => {
    const detectedPattern = selectPseudowordPattern(word, draft);
    return {
      detectedPattern,
      validation: detectedPattern ? validatePseudowordCandidate(word, detectedPattern, { strictLexicon: true }) : null,
    };
  });
  const realWords = lines.filter((line) => Number(line.lineNumber) >= 1 && Number(line.lineNumber) <= 3).flatMap((line) => strings(line.words));
  const invalidPseudowords = validations.filter((entry) => !entry.validation?.valid);
  const outOfTargetSet = validations.filter((entry) => !entry.detectedPattern || !pseudowordPatterns(draft).includes(entry.detectedPattern));
  // Pseudowords are not in CMUdict, so the phoneme-based r-controlled check cannot
  // admit them. Mirror the named admission gate: a pseudoword is acceptable when it
  // DETECTS to one of the declared r-controlled target patterns.
  const activeRTargetsForPseudowords = rControlledTargetPatterns(draft);
  const rAdmittedPseudoword = (word: string) =>
    activeRTargetsForPseudowords.length > 0 && detectPatternCandidates(word).some((pattern) => activeRTargetsForPseudowords.includes(pattern));
  const rControlled = rControlledViolations([...pseudowords.filter((word) => !rAdmittedPseudoword(word)), ...realWords], draft);
  return [
    check("LESSON_PART3_CONTRASTIVE_LINES", lines.length === 4 && !lines.some((line) => line.lineNumber === 5), "BLOCKER", "Part 3 must use four contrastive lines and no fifth line."),
    check("LESSON_PART3_REAL_WORD_COUNT", realWords.length >= 15 && realWords.length <= 20, "BLOCKER", `Part 3 lines 1-3 have ${realWords.length} real words (need 15-20).`),
    check(
      "LESSON_PART3_PSEUDOWORD_COUNT",
      compareTarget ? pseudowords.length === 0 : pseudowords.length >= 8 && pseudowords.length <= 10,
      "BLOCKER",
      compareTarget
        ? `Compare morphology targets carry no pseudowords; Part 3 has ${pseudowords.length}.`
        : `Part 3 has ${pseudowords.length} pseudowords (need 8-10).`,
    ),
    check("LESSON_PSEUDOWORDS_TARGET_ONLY", validations.every((entry) => entry.validation && detectPatternCandidates(entry.validation.pseudoword).includes(entry.validation.targetPattern)), "BLOCKER", "Part 3 pseudowords must use only the configured pseudoword target patterns."),
    check("LESSON_PSEUDOWORDS_IN_TARGET_SET", outOfTargetSet.length === 0, "BLOCKER", outOfTargetSet.length ? `Pseudowords outside target set: ${outOfTargetSet.map((entry) => `${entry.validation?.pseudoword ?? "unknown"}(${entry.detectedPattern ?? "none"})`).join(", ")}` : "Pseudowords detect to the target pattern set."),
    check("LESSON_PSEUDOWORDS_HAVE_EXPECTED_PRONUNCIATION", validations.every((entry) => entry.validation?.expectedPronunciation), "BLOCKER", "Pseudowords require expectedPronunciation metadata."),
    check("LESSON_PSEUDOWORDS_NOT_REAL_MISSPELLINGS", invalidPseudowords.length === 0, "BLOCKER", invalidPseudowords.length ? invalidPseudowords.map((entry) => `${entry.validation?.pseudoword ?? "unknown"}${entry.validation?.collidesWith ? ` -> ${entry.validation.collidesWith}` : ""}: ${entry.validation?.reason ?? entry.validation?.issues.join(", ") ?? "invalid"}`).join("; ") : "Pseudowords passed validation."),
    check("LESSON_PHASE3_NO_RCONTROLLED", rControlled.length === 0, "BLOCKER", rControlled.length ? `Phase 3 lesson contains r-controlled words (not taught yet): ${Array.from(new Set(rControlled)).join(", ")}` : "No r-controlled words in Part 3."),
    check("LESSON_WORDS_ALL_TAGGED", wordTags(part).length >= lines.flatMap((line) => strings(line.words)).length, "BLOCKER", "Part 3 words require tags."),
    ...auditTargetPatternCoverage(draft),
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
  const rControlled = rControlledViolations([String(part7?.contentJson.passageText ?? "")], draft);
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
  const rControlled = rControlledViolations(sentences, draft);
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

function rControlledViolations(sentences: string[], draft: GeneratedLessonDraft): string[] {
  const activeRTargets = rControlledTargetPatterns(draft);
  const morphology = morphologyForDraft(draft);
  return rControlledWords(sentences)
    .filter((word) => {
      if (activeRTargets.length > 0 && matchesDeclaredRTarget(word, activeRTargets)) return false;
      if (morphology?.rule === "compare") {
        const analysis = decomposeInflectedWord(word, morphology);
        if (analysis?.rule === "compare") return false;
      }
      return true;
    });
}

function rControlledTargetPatterns(draft: GeneratedLessonDraft) {
  return targetPatterns(draft).filter((pattern) => PATTERN_REGISTRY[pattern]?.family === "r_controlled");
}

function matchesDeclaredRTarget(word: string, activeRTargets: string[]) {
  return activeRTargets.some((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: true }));
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
  const rControlled = rControlledViolations([...words, ...sentences], draft);
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

function pseudowordPatterns(draft: GeneratedLessonDraft) {
  return draft.pseudowordPatterns?.length ? draft.pseudowordPatterns : targetPatterns(draft);
}

function matchesAnyTargetPattern(word: string, draft: GeneratedLessonDraft) {
  return targetPatterns(draft).some((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: draft.phaseBand >= 4 }));
}

function isNarrowPatternCode(pattern: string) {
  return /^[aeiou]_e$/.test(pattern) || /^closed_short_[aeiou]$/.test(pattern) || Boolean(PATTERN_REGISTRY[pattern]);
}

function isPrerequisiteWord(word: string) {
  return ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"].some((pattern) => wordMatchesPattern(word, pattern));
}

function closedVowelLetter(word: string) {
  return word.toLowerCase().match(/^[bcdfghjklmnpqrstvwxyz]*([aeiou])[bcdfghjklmnpqrstvwxyz]+$/)?.[1] ?? null;
}

/**
 * A vowel-team demonstration pair is only a true minimal pair when the closed
 * base and the team target share the same onset and coda, with only the vowel
 * grapheme swapped (pan -> pain, bed -> bead, got -> goat).
 */
function isMinimalTeamPair(closed: string, target: string, pattern: string) {
  const graphemes = PATTERN_REGISTRY[pattern]?.graphemes ?? [];
  const parts = closed.toLowerCase().match(/^([bcdfghjklmnpqrstvwxyz]*)([aeiou])([bcdfghjklmnpqrstvwxyz]+)$/);
  if (!parts) return false;
  const [, onset, , coda] = parts;
  const normalizedTarget = target.toLowerCase();
  return graphemes.some((grapheme) => normalizedTarget === `${onset}${grapheme}${coda}`);
}

function longVowelLetterForPattern(pattern: string) {
  const silentE = pattern.match(/^([aeiou])_e$/);
  if (silentE) return silentE[1];
  if (pattern === "team_oo_long" || pattern === "team_oo_short") return "o";
  if (pattern === "team_au" || pattern === "team_aw") return "a";
  // Despite the historical name, this returns the base vowel letter needed for Part 2
  // pair validation across VCe, vowel-team, r-controlled, and diphthong patterns.
  if (PATTERN_REGISTRY[pattern]?.family === "r_controlled" || PATTERN_REGISTRY[pattern]?.family === "diphthong") {
    return PATTERN_REGISTRY[pattern]?.graphemes[0]?.[0] ?? null;
  }
  const phoneme = PATTERN_REGISTRY[pattern]?.expectedPhonemeSequences?.[0]?.join(" ");
  if (phoneme === "EY") return "a";
  if (phoneme === "IY") return "e";
  if (phoneme === "AY") return "i";
  if (phoneme === "OW") return "o";
  if (phoneme === "Y UW" || phoneme === "UW") return "u";
  return null;
}

function selectPseudowordPattern(word: string, draft: GeneratedLessonDraft) {
  const candidates = detectPatternCandidates(word);
  return pseudowordPatterns(draft).find((pattern) => candidates.includes(pattern)) ?? null;
}

const MORPHOLOGY_RULE_EVIDENCE_MIN = 3;

// Morphology targets use a rule-aware coverage gate instead of phonics vowel-span.
// Only forms whose decomposed morphology.rule === the declared lesson rule count as
// target evidence. No-change (-s/-es, rule "none") forms, bare stems, incidental
// closed/VCe passage words, and wrong-rule forms NEVER count. Intentional stem spread
// is credited through transformation-pair bases, Part 2 concept examples, dictation,
// and the base patterns of true rule-matched forms (an eligibility list, not a demand
// that every declared stem vowel appear transformed in every section).
function auditMorphologyTargetCoverage(draft: GeneratedLessonDraft, morphology: MorphologyAnalyzerConfig): LessonLintCheck[] {
  if (draft.phaseBand < 4) return [];
  const part2 = partNumber(draft, 2);
  const part3 = partNumber(draft, 3);
  const part5 = partNumber(draft, 5);
  const part6 = partNumber(draft, 6);
  const part7 = partNumber(draft, 7);
  const pairs = Array.isArray(part2?.contentJson.demonstrationPairs) ? part2?.contentJson.demonstrationPairs as any[] : [];
  const pairTargets = pairs.map((pair) => String(pair?.target ?? "")).filter(Boolean);
  const pairBases = pairs.map((pair) => String(pair?.base ?? "")).filter(Boolean);
  const conceptExamples = strings(part2?.contentJson.conceptExamples);
  const lines = Array.isArray(part3?.contentJson.contrastiveLines) ? part3?.contentJson.contrastiveLines as any[] : [];
  const part3Words = lines.filter((line) => line.role !== "target_pseudowords").flatMap((line) => strings(line.words));
  const dictatedWords = strings(part6?.contentJson.dictatedWords);
  const transferWords = [
    ...strings(part5?.contentJson.sentences).flatMap(tokenizeWords),
    ...tokenizeWords(String(part7?.contentJson.passageText ?? "")),
  ];
  const ruleAnalysis = (word: string) => {
    const analysis = decomposeInflectedWord(word, morphology);
    return analysis && analysis.rule === morphology.rule ? analysis : null;
  };
  const lessonWords = [...pairTargets, ...part3Words, ...transferWords];
  const ruleMatched = Array.from(new Set(lessonWords.filter((word) => ruleAnalysis(word))));
  const part2RuleMatched = pairTargets.filter((word) => ruleAnalysis(word));
  const stemPatternsCovered = new Set<string>();
  for (const word of ruleMatched) {
    const analysis = ruleAnalysis(word);
    if (analysis) stemPatternsCovered.add(analysis.basePattern);
  }
  for (const word of [...pairBases, ...conceptExamples, ...dictatedWords]) {
    const stem = morphology.stemPatterns.find((pattern) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: true }));
    if (stem) stemPatternsCovered.add(stem);
  }
  const stemMin = Math.min(3, morphology.stemPatterns.length);
  const ruleEvidenceOk = ruleMatched.length >= MORPHOLOGY_RULE_EVIDENCE_MIN && part2RuleMatched.length >= 1;
  const stemSpreadOk = stemPatternsCovered.size >= stemMin;
  return [
    check(
      "LESSON_MORPHOLOGY_TARGET_COVERAGE",
      ruleEvidenceOk && stemSpreadOk,
      "BLOCKER",
      ruleEvidenceOk && stemSpreadOk
        ? `Morphology rule '${morphology.rule}' shown by ${ruleMatched.length} rule-matched form(s) across ${stemPatternsCovered.size} stem pattern(s).`
        : `Insufficient morphology coverage for rule '${morphology.rule}': ${ruleMatched.length} rule-matched form(s) (need >=${MORPHOLOGY_RULE_EVIDENCE_MIN}, with >=1 in Part 2 pairs; have ${part2RuleMatched.length}), ${stemPatternsCovered.size} stem pattern(s) (need >=${stemMin}). No-change forms, bare stems, and incidental words do not count.`,
    ),
  ];
}

function auditTargetPatternCoverage(draft: GeneratedLessonDraft): LessonLintCheck[] {
  const morphology = morphologyForDraft(draft);
  if (morphology) return auditMorphologyTargetCoverage(draft, morphology);
  const patterns = targetPatterns(draft);
  if (draft.phaseBand < 4 || patterns.length < 2) {
    return [];
  }
  const part2 = partNumber(draft, 2);
  const part3 = partNumber(draft, 3);
  const part5 = partNumber(draft, 5);
  const part7 = partNumber(draft, 7);
  const part2Words = [
    ...strings(part2?.contentJson.conceptExamples),
    ...strings(part2?.contentJson.demonstrationExamples),
    ...(Array.isArray(part2?.contentJson.demonstrationPairs) ? (part2?.contentJson.demonstrationPairs as any[]).map((pair) => String(pair?.target ?? "")).filter(Boolean) : []),
  ];
  const lines = Array.isArray(part3?.contentJson.contrastiveLines) ? part3?.contentJson.contrastiveLines as any[] : [];
  const part3Words = lines
    .filter((line) => line.role !== "target_pseudowords")
    .flatMap((line) => strings(line.words));
  const transferWords = [
    ...strings(part5?.contentJson.sentences).flatMap(tokenizeWords),
    ...tokenizeWords(String(part7?.contentJson.passageText ?? "")),
  ];
  const missing = patterns.filter((pattern) =>
    !hasPattern(part2Words, pattern) ||
    !hasPattern(part3Words, pattern) ||
    !hasPattern(transferWords, pattern)
  );
  return [
    check(
      "LESSON_TARGET_PATTERN_COVERAGE",
      missing.length === 0,
      "BLOCKER",
      missing.length
        ? `Missing real-word coverage for target patterns: ${missing.join(", ")}`
        : "Every target pattern appears in Part 2, Part 3, and transfer text.",
    ),
  ];
}

function hasPattern(words: string[], pattern: string) {
  return words.some((word) => wordMatchesPattern(word, pattern, { strictPhonemeLexicon: true }));
}

function tokenizeWords(text: string) {
  return text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
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
