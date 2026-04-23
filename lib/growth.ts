export function buildGrowthSummary({ previousScore, currentScore, previousBand, currentBand }: { previousScore: number | null; currentScore: number; previousBand: string | null; currentBand: string; }) {
  return { previousScore, currentScore, growthPoints: previousScore == null ? null : currentScore - previousScore, previousBand, currentBand };
}
