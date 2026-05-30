import { DIAGNOSTIC_STRANDS, type DiagnosticStrand } from "./diagnosticEvidenceFloors";

export type PlacementAttempt = {
  strand: string;
  phaseBand?: number | null;
  correct?: boolean | null;
  scored: boolean;
  isPracticeItem?: boolean | null;
};

export function computeDiagnosticResults(attempts: PlacementAttempt[]) {
  const scored = attempts.filter((attempt) => attempt.scored && !attempt.isPracticeItem);
  const decoding = scored.filter((attempt) => attempt.strand === "DECODING");
  const phaseAccuracy = new Map<number, { correct: number; total: number }>();
  for (const attempt of decoding) {
    const phase = attempt.phaseBand || 0;
    const current = phaseAccuracy.get(phase) || { correct: 0, total: 0 };
    current.total += 1;
    if (attempt.correct) current.correct += 1;
    phaseAccuracy.set(phase, current);
  }

  const phasePlacement = [...phaseAccuracy.entries()]
    .sort((a, b) => b[0] - a[0])
    .find(([, value]) => value.total > 0 && value.correct / value.total >= 0.8)?.[0]
    ?? [...phaseAccuracy.keys()].sort((a, b) => b - a)[0]
    ?? null;

  const strandSummaries = DIAGNOSTIC_STRANDS.map((strand) => summarizeStrand(strand, scored));
  const priorityRanked = [...strandSummaries].sort((a, b) => a.accuracy - b.accuracy);

  return {
    phasePlacement,
    placementBasis: "DECODING_ACCURACY_ONLY",
    decodingEvidence: Object.fromEntries(phaseAccuracy),
    strandPriorities: priorityRanked.map((summary, index) => ({
      strand: summary.strand,
      label: `Priority ${index + 1}`,
      descriptor: index < 3 ? `Priority ${index + 1}` : "Relative strength on this diagnostic",
      accuracy: summary.accuracy,
      scoredItems: summary.total,
    })),
    adultFacingLanguage: "Priority 1/2/3; Relative strength on this diagnostic",
  };
}

function summarizeStrand(strand: DiagnosticStrand, attempts: PlacementAttempt[]) {
  const strandAttempts = attempts.filter((attempt) => attempt.strand === strand);
  const total = strandAttempts.length;
  const correct = strandAttempts.filter((attempt) => attempt.correct).length;
  return { strand, total, correct, accuracy: total ? correct / total : 0 };
}
