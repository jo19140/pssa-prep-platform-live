export function buildStandardsGrowth(currentRows: any[], previousRows: any[] = []) {
  return currentRows.map((current) => {
    const previous = previousRows.find((p) => p.standardCode === current.standardCode);
    return { standardCode: current.standardCode, standardLabel: current.standardLabel, previousScore: previous?.percentScore ?? null, currentScore: current.percentScore, growthPoints: previous?.percentScore == null ? null : current.percentScore - previous.percentScore, previousBand: previous?.performanceBand ?? null, currentBand: current.performanceBand };
  });
}
