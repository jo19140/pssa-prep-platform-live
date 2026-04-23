export type PerformanceBand = "Below Basic" | "Basic" | "Proficient" | "Advanced";

export function getPerformanceBand(score: number): PerformanceBand {
  if (score >= 85) return "Advanced";
  if (score >= 70) return "Proficient";
  if (score >= 55) return "Basic";
  return "Below Basic";
}
