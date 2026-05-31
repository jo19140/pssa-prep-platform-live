import { DIAGNOSTIC_EVIDENCE_FLOORS, DIAGNOSTIC_STRANDS, type DiagnosticStrand } from "./diagnosticEvidenceFloors";

export type EvidenceStrand =
  | "DECODING"
  | "PA"
  | "MORPHOLOGY"
  | "FLUENCY"
  | "VOCABULARY"
  | "LISTENING_COMPREHENSION"
  | "READING_COMPREHENSION";

export type DiagnosticResultsEvidence = {
  strand: EvidenceStrand;
  pattern?: string;
  score: number;
  total: number;
};

export type PatternClassification = "secure" | "developing" | "notYetSecure" | "insufficientEvidence";
export type ConfidenceLevel = "high" | "medium" | "low";

export function classifyPattern(score: number, total: number): PatternClassification {
  if (total < 3) return "insufficientEvidence";
  const accuracy = total ? score / total : 0;
  if (total >= 4 && accuracy >= 0.8) return "secure";
  if (accuracy >= 0.5 && accuracy < 0.8) return "developing";
  return "notYetSecure";
}

export function computeConfidenceLevel(input: {
  totalScoredItems: number;
  usableAudioFraction: number;
  strandsBelowMinimumEvidence: number;
  strandsAtMinimumEvidence: number;
}): ConfidenceLevel {
  if (input.totalScoredItems < 20 || input.usableAudioFraction < 0.8 || input.strandsBelowMinimumEvidence >= 3) {
    return "low";
  }
  if (
    input.totalScoredItems >= 30 &&
    input.usableAudioFraction >= 0.9 &&
    input.strandsBelowMinimumEvidence === 0 &&
    input.strandsAtMinimumEvidence === 0
  ) {
    return "high";
  }
  return "medium";
}

export const NOT_ENOUGH_LISTENING_READING_EVIDENCE = "Not enough evidence yet to compare listening and reading comprehension.";

export function interpretListeningVsReading(input: { listeningScore: number; listeningTotal: number; readingScore: number; readingTotal: number }) {
  if (input.listeningTotal < 4 || input.readingTotal < 4) {
    return { gap: null, interpretation: NOT_ENOUGH_LISTENING_READING_EVIDENCE };
  }
  const listeningPercent = (input.listeningScore / input.listeningTotal) * 100;
  const readingPercent = (input.readingScore / input.readingTotal) * 100;
  const gap = listeningPercent - readingPercent;
  if (gap >= 25) {
    return {
      gap,
      interpretation:
        "Listening comprehension is notably stronger than independent reading comprehension. This pattern is consistent with decoding and/or fluency limiting access to meaning.",
    };
  }
  if (gap >= 15) {
    return {
      gap,
      interpretation:
        "Listening comprehension is moderately stronger than reading comprehension. Continue decoding instruction and monitor reading-comprehension growth as automaticity develops.",
    };
  }
  if (gap >= -10) {
    return { gap, interpretation: "Listening and reading comprehension are operating consistently on this diagnostic." };
  }
  return {
    gap,
    interpretation: "Reading comprehension is stronger than listening comprehension on this diagnostic. Review listening-language evidence and continue monitoring.",
  };
}

export function countEvidenceByStrand(attempts: Array<{ strand: string; scored: boolean; isPracticeAttempt?: boolean | null }>) {
  const counts: Record<string, number> = {};
  for (const strand of DIAGNOSTIC_STRANDS) counts[strand] = 0;
  for (const attempt of attempts) {
    if (!attempt.scored || attempt.isPracticeAttempt) continue;
    counts[attempt.strand] = (counts[attempt.strand] || 0) + 1;
  }
  return counts;
}

export function evidenceFloorSummary(perStrandItemCounts: Record<string, number>) {
  let strandsBelowMinimumEvidence = 0;
  let strandsAtMinimumEvidence = 0;
  for (const strand of DIAGNOSTIC_STRANDS) {
    const count = perStrandItemCounts[strand] || 0;
    const floor = DIAGNOSTIC_EVIDENCE_FLOORS[strand as DiagnosticStrand];
    if (count < floor) strandsBelowMinimumEvidence += 1;
    if (count === floor) strandsAtMinimumEvidence += 1;
  }
  return { strandsBelowMinimumEvidence, strandsAtMinimumEvidence };
}

export function buildAdditionalSupport(input: {
  confidence: ConfidenceLevel;
  listeningVsReadingGap: number | null;
  strandPriority: Array<{ strand: string }>;
}) {
  const supports: string[] = [];
  if (input.confidence === "low") {
    supports.push("Use the first full lesson cycle to confirm this starting point before making longer-term placement decisions.");
  }
  if (input.listeningVsReadingGap !== null && input.listeningVsReadingGap >= 25) {
    supports.push("Emphasize decoding and connected-text fluency. Use the listen-first scaffold for the lesson passage on the first day.");
  }
  if (input.strandPriority[0]?.strand === "PA") {
    supports.push("Add extra phonemic-awareness warm-up before the target instruction.");
  }
  if (input.strandPriority[0]?.strand === "MORPHOLOGY" || input.strandPriority[1]?.strand === "MORPHOLOGY") {
    supports.push("Include morphology connections during target instruction (target word families with shared roots or affixes).");
  }
  if (input.confidence === "medium") {
    supports.push("Treat this placement as a starting hypothesis; confirm or adjust after the first 2 lessons.");
  }
  return supports.slice(0, 3);
}
