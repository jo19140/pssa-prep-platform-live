import { DIAGNOSTIC_STRANDS, type DiagnosticStrand } from "./diagnosticEvidenceFloors";
import {
  NOT_ENOUGH_LISTENING_READING_EVIDENCE,
  buildAdditionalSupport,
  classifyPattern,
  computeConfidenceLevel,
  countEvidenceByStrand,
  evidenceFloorSummary,
  interpretListeningVsReading,
  type ConfidenceLevel,
  type DiagnosticResultsEvidence,
  type PatternClassification,
} from "./diagnosticResultsThresholds";

export const DIAGNOSTIC_RESULTS_SCHEMA_VERSION = "diagnostic-results-v1" as const;

export type ResultAttempt = {
  id?: string;
  diagnosticItemId: string;
  scored: boolean;
  correct?: boolean | null;
  scoreConfidence?: number | null;
  audioConfidence?: number | null;
  scorerReasoningJson?: unknown;
  isPracticeAttempt?: boolean | null;
  item?: {
    id: string;
    strand: string;
    itemType: string;
    phaseBand?: number | null;
    targetPattern?: string | null;
    wordType?: string | null;
    displayMode?: string | null;
    responseMode?: string | null;
    comprehensionMode?: string | null;
  } | null;
};

export type DailyTargetContext = {
  code: string;
  phaseLabel?: string | null;
  phaseNumber?: number | null;
  exampleWords?: string[] | null;
  introductionOrder?: number | null;
};

export type DiagnosticResultsJson = {
  resultSchemaVersion: typeof DIAGNOSTIC_RESULTS_SCHEMA_VERSION;
  computedAt: string;
  diagnosticSessionId: string;
  engineVersion?: string;
  contentVersion?: string;
  placement: { phase: string; phaseBand: number | null; placementBoundary: string };
  whyThisPlacement: Record<PatternClassification, Array<{ patterns: string[]; evidence: PatternEvidence }>>;
  decodingEvidence: {
    perPhase: Array<{ phase: number; realWordScore: number; realWordTotal: number; pseudowordScore: number; pseudowordTotal: number }>;
  };
  strandPriority: Array<{
    strand: string;
    score: number;
    scoreOutOf: number;
    priority: 1 | 2 | 3 | null;
    label: "Priority 1" | "Priority 2" | "Priority 3" | "Relative strength on this diagnostic" | "Developing";
  }>;
  listeningVsReading: {
    listeningScore: number;
    listeningTotal: number;
    readingScore: number;
    readingTotal: number;
    interpretation: string;
    evidence: DiagnosticResultsEvidence[];
  };
  confidence: {
    level: ConfidenceLevel;
    totalScoredItems: number;
    audioQuality: { usableVoiceAttempts: number; totalVoiceAttempts: number; fraction: number };
    excludedItemsCount: number;
    perStrandItemCounts: Record<string, number>;
  };
  firstLessonRecommendation: {
    phase: string;
    dailyTargetCode: string;
    exampleWords: string[];
    reasoning: string;
    additionalSupport: string[];
    evidence: DiagnosticResultsEvidence[];
  };
  parentFriendlySummary: { text: string; evidence: DiagnosticResultsEvidence[] };
  governance?: {
    itemEvidence: Array<{
      itemId: string;
      strand: string;
      displayMode: string;
      responseMode: string;
      scored: boolean;
      score?: number;
      scoreOutOf?: number;
      excludedReason?: string;
    }>;
    aiFlagHistory: Array<{ itemId?: string; flagType: string; severity?: "low" | "medium" | "high"; summary: string; createdAt: string }>;
    audit: {
      engineVersion?: string;
      contentVersion?: string;
      scoringRubricVersion?: string | null;
      resultSchemaVersion: typeof DIAGNOSTIC_RESULTS_SCHEMA_VERSION;
      computedAt: string;
    };
  };
};

type PatternEvidence = {
  strand: "DECODING";
  pattern: string;
  score: number;
  total: number;
};

export function buildDiagnosticResults(input: {
  diagnosticSessionId: string;
  attempts: ResultAttempt[];
  dailyTargets?: DailyTargetContext[];
  computedAt?: Date;
  engineVersion?: string;
  contentVersion?: string;
}): DiagnosticResultsJson {
  const computedAt = (input.computedAt || new Date()).toISOString();
  const scored = input.attempts.filter((attempt) => attempt.scored && !attempt.isPracticeAttempt);
  const decoding = scored.filter((attempt) => attempt.item?.strand === "DECODING");
  const placedPhase = phasePlacement(decoding);
  const phaseLabel = input.dailyTargets?.[0]?.phaseLabel || (placedPhase ? `Phase ${placedPhase}` : "Starting point not yet confirmed");

  const decodingEvidence = decodingEvidenceByPhase(decoding);
  const whyThisPlacement = whyPlacement(decoding, input.dailyTargets || [], placedPhase);
  const strandPriority = strandPriorities(scored);
  const listeningVsReading = listeningReading(scored);
  const perStrandItemCounts = countEvidenceByStrand(
    input.attempts.map((attempt) => ({
      strand: attempt.item?.strand || "UNKNOWN",
      scored: attempt.scored,
      isPracticeAttempt: attempt.isPracticeAttempt,
    })),
  );
  const floorSummary = evidenceFloorSummary(perStrandItemCounts);
  const voiceAttempts = input.attempts.filter((attempt) => !attempt.isPracticeAttempt && attempt.item?.responseMode === "speech_response");
  const usableVoiceAttempts = voiceAttempts.filter((attempt) => attempt.scored).length;
  const totalVoiceAttempts = voiceAttempts.length;
  const usableAudioFraction = totalVoiceAttempts ? usableVoiceAttempts / totalVoiceAttempts : 1;
  const confidenceLevel = computeConfidenceLevel({
    totalScoredItems: scored.length,
    usableAudioFraction,
    ...floorSummary,
  });
  const firstLessonRecommendation = firstLesson({
    phaseLabel,
    dailyTargets: input.dailyTargets || [],
    whyThisPlacement,
    confidence: confidenceLevel,
    listeningVsReadingGap: listeningVsReadingGap(listeningVsReading),
    strandPriority,
  });

  const parentFriendlySummary = parentSummary({
    phaseLabel,
    firstLessonRecommendation,
    strandPriority,
    confidenceLevel,
  });

  return {
    resultSchemaVersion: DIAGNOSTIC_RESULTS_SCHEMA_VERSION,
    computedAt,
    diagnosticSessionId: input.diagnosticSessionId,
    engineVersion: input.engineVersion,
    contentVersion: input.contentVersion,
    placement: {
      phase: phaseLabel,
      phaseBand: placedPhase,
      placementBoundary: "Decoding accuracy sets the starting phase; the other strands guide the first support priorities.",
    },
    whyThisPlacement,
    decodingEvidence,
    strandPriority,
    listeningVsReading,
    confidence: {
      level: confidenceLevel,
      totalScoredItems: scored.length,
      audioQuality: { usableVoiceAttempts, totalVoiceAttempts, fraction: Number(usableAudioFraction.toFixed(3)) },
      excludedItemsCount: input.attempts.filter((attempt) => !attempt.scored && !attempt.isPracticeAttempt).length,
      perStrandItemCounts,
    },
    firstLessonRecommendation,
    parentFriendlySummary,
    governance: {
      itemEvidence: input.attempts
        .filter((attempt) => !attempt.isPracticeAttempt)
        .map((attempt) => ({
          itemId: attempt.diagnosticItemId,
          strand: attempt.item?.strand || "UNKNOWN",
          displayMode: attempt.item?.displayMode || "UNKNOWN",
          responseMode: attempt.item?.responseMode || "UNKNOWN",
          scored: attempt.scored,
          score: attempt.scored ? (attempt.correct ? 1 : 0) : undefined,
          scoreOutOf: attempt.scored ? 1 : undefined,
          excludedReason: attempt.scored ? undefined : excludedReason(attempt.scorerReasoningJson),
        })),
      aiFlagHistory: [],
      audit: {
        engineVersion: input.engineVersion,
        contentVersion: input.contentVersion,
        scoringRubricVersion: null,
        resultSchemaVersion: DIAGNOSTIC_RESULTS_SCHEMA_VERSION,
        computedAt,
      },
    },
  };
}

function phasePlacement(decoding: ResultAttempt[]) {
  const phaseAccuracy = new Map<number, { score: number; total: number }>();
  for (const attempt of decoding) {
    const phase = attempt.item?.phaseBand;
    if (typeof phase !== "number") continue;
    const current = phaseAccuracy.get(phase) || { score: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.score += 1;
    phaseAccuracy.set(phase, current);
  }
  return (
    [...phaseAccuracy.entries()]
      .sort((a, b) => b[0] - a[0])
      .find(([, value]) => value.total > 0 && value.score / value.total >= 0.8)?.[0] ??
    [...phaseAccuracy.keys()].sort((a, b) => b - a)[0] ??
    null
  );
}

function decodingEvidenceByPhase(decoding: ResultAttempt[]) {
  const byPhase = new Map<number, { phase: number; realWordScore: number; realWordTotal: number; pseudowordScore: number; pseudowordTotal: number }>();
  for (const attempt of decoding) {
    const phase = attempt.item?.phaseBand;
    if (typeof phase !== "number") continue;
    const current = byPhase.get(phase) || { phase, realWordScore: 0, realWordTotal: 0, pseudowordScore: 0, pseudowordTotal: 0 };
    if (attempt.item?.wordType === "pseudoword") {
      current.pseudowordTotal += 1;
      if (attempt.correct) current.pseudowordScore += 1;
    } else {
      current.realWordTotal += 1;
      if (attempt.correct) current.realWordScore += 1;
    }
    byPhase.set(phase, current);
  }
  return { perPhase: [...byPhase.values()].sort((a, b) => a.phase - b.phase) };
}

function whyPlacement(decoding: ResultAttempt[], dailyTargets: DailyTargetContext[], placedPhase: number | null) {
  const byPattern = new Map<string, { score: number; total: number }>();
  for (const attempt of decoding) {
    if (placedPhase !== null && attempt.item?.phaseBand !== placedPhase) continue;
    const pattern = attempt.item?.targetPattern || "unclassified";
    const current = byPattern.get(pattern) || { score: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.score += 1;
    byPattern.set(pattern, current);
  }
  for (const target of dailyTargets) {
    if (!byPattern.has(target.code)) byPattern.set(target.code, { score: 0, total: 0 });
  }
  const buckets = {
    secure: [],
    developing: [],
    notYetSecure: [],
    insufficientEvidence: [],
  } as DiagnosticResultsJson["whyThisPlacement"];
  for (const [pattern, value] of [...byPattern.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const status = classifyPattern(value.score, value.total);
    buckets[status].push({ patterns: [pattern], evidence: { strand: "DECODING", pattern, score: value.score, total: value.total } });
  }
  return buckets;
}

function strandPriorities(scored: ResultAttempt[]) {
  const summaries = DIAGNOSTIC_STRANDS.map((strand) => {
    const attempts = scored.filter((attempt) => attempt.item?.strand === strand);
    const score = attempts.filter((attempt) => attempt.correct).length;
    return { strand, score, scoreOutOf: attempts.length, accuracy: attempts.length ? score / attempts.length : 0 };
  });
  return summaries
    .sort((a, b) => a.accuracy - b.accuracy || a.strand.localeCompare(b.strand))
    .map((summary, index) => {
      const priority = index < 3 ? ((index + 1) as 1 | 2 | 3) : null;
      return {
        strand: summary.strand,
        score: summary.score,
        scoreOutOf: summary.scoreOutOf,
        priority,
        label: priority ? (`Priority ${priority}` as const) : ("Relative strength on this diagnostic" as const),
      };
    });
}

function listeningReading(scored: ResultAttempt[]): DiagnosticResultsJson["listeningVsReading"] {
  const listening = scored.filter((attempt) => attempt.item?.strand === "COMPREHENSION" && attempt.item.comprehensionMode === "listening");
  const reading = scored.filter((attempt) => attempt.item?.strand === "COMPREHENSION" && attempt.item.comprehensionMode !== "listening");
  const listeningScore = listening.filter((attempt) => attempt.correct).length;
  const readingScore = reading.filter((attempt) => attempt.correct).length;
  const result = interpretListeningVsReading({ listeningScore, listeningTotal: listening.length, readingScore, readingTotal: reading.length });
  return {
    listeningScore,
    listeningTotal: listening.length,
    readingScore,
    readingTotal: reading.length,
    interpretation: result.interpretation,
    evidence: [
      { strand: "LISTENING_COMPREHENSION", score: listeningScore, total: listening.length },
      { strand: "READING_COMPREHENSION", score: readingScore, total: reading.length },
    ],
  };
}

function firstLesson(input: {
  phaseLabel: string;
  dailyTargets: DailyTargetContext[];
  whyThisPlacement: DiagnosticResultsJson["whyThisPlacement"];
  confidence: ConfidenceLevel;
  listeningVsReadingGap: number | null;
  strandPriority: DiagnosticResultsJson["strandPriority"];
}): DiagnosticResultsJson["firstLessonRecommendation"] {
  const secure = new Set(input.whyThisPlacement.secure.flatMap((entry) => entry.patterns));
  const allTargets = [...input.dailyTargets].sort((a, b) => (a.introductionOrder || 0) - (b.introductionOrder || 0));
  const firstOpen = allTargets.find((target) => !secure.has(target.code));
  const fallback = allTargets[0] || { code: "review", exampleWords: [], phaseLabel: input.phaseLabel };
  const selected = firstOpen || fallback;
  const allSecure = allTargets.length > 0 && !firstOpen;
  const evidence = patternEvidence(input.whyThisPlacement, selected.code);
  const additionalSupport = buildAdditionalSupport({
    confidence: input.confidence,
    listeningVsReadingGap: input.listeningVsReadingGap,
    strandPriority: input.strandPriority,
  });
  if (allSecure) {
    additionalSupport.unshift("Use review and consolidation before considering movement into a new phase.");
  }
  return {
    phase: selected.phaseLabel || input.phaseLabel,
    dailyTargetCode: selected.code,
    exampleWords: selected.exampleWords || [],
    reasoning: allSecure
      ? `All available targets in ${input.phaseLabel} look secure on this diagnostic, so start with review and consolidation instead of moving ahead automatically.`
      : `Start with ${selected.code} because this target is not yet secure enough for the first lesson cycle.`,
    additionalSupport: additionalSupport.slice(0, 3),
    evidence: evidence ? [{ strand: "DECODING", pattern: selected.code, score: evidence.score, total: evidence.total }] : [],
  };
}

function parentSummary(input: {
  phaseLabel: string;
  firstLessonRecommendation: DiagnosticResultsJson["firstLessonRecommendation"];
  strandPriority: DiagnosticResultsJson["strandPriority"];
  confidenceLevel: ConfidenceLevel;
}): DiagnosticResultsJson["parentFriendlySummary"] {
  const priority = input.strandPriority[0];
  const examples = input.firstLessonRecommendation.exampleWords.slice(0, 2);
  const exampleText = examples.length ? ` using words like ${examples.join(" and ")}` : "";
  return {
    text: `The diagnostic points to ${input.phaseLabel} as the best starting place. The first lesson should focus on ${input.firstLessonRecommendation.dailyTargetCode}${exampleText}. The first support priority is ${priority?.strand || "practice"}; confidence is ${input.confidenceLevel}.`,
    evidence: [
      ...input.firstLessonRecommendation.evidence.slice(0, 1),
      ...(priority ? [{ strand: priority.strand as DiagnosticResultsEvidence["strand"], score: priority.score, total: priority.scoreOutOf }] : []),
    ].slice(0, 3),
  };
}

function patternEvidence(why: DiagnosticResultsJson["whyThisPlacement"], pattern: string) {
  for (const entries of Object.values(why)) {
    const match = entries.find((entry) => entry.patterns.includes(pattern));
    if (match) return match.evidence;
  }
  return null;
}

function listeningVsReadingGap(value: DiagnosticResultsJson["listeningVsReading"]) {
  if (value.interpretation === NOT_ENOUGH_LISTENING_READING_EVIDENCE) return null;
  if (!value.listeningTotal || !value.readingTotal) return null;
  return (value.listeningScore / value.listeningTotal) * 100 - (value.readingScore / value.readingTotal) * 100;
}

function excludedReason(value: unknown) {
  if (!value || typeof value !== "object") return "unscored";
  const reason = (value as { reasonCode?: unknown }).reasonCode;
  return typeof reason === "string" ? reason : "unscored";
}
