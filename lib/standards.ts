import { getPerformanceBand } from "@/lib/performance";

export function buildStandardsMastery(responses: any[]) {
  const grouped = new Map<string, any>();
  for (const response of responses) {
    const code = response.standardCode ?? "Unknown";
    const label = response.standardLabel ?? "Unknown standard";
    if (!grouped.has(code)) grouped.set(code, { standardCode: code, standardLabel: label, earnedPoints: 0, totalPoints: 0, questionCount: 0 });
    const row = grouped.get(code);
    row.earnedPoints += response.scorePointsEarned ?? 0;
    row.totalPoints += response.maxPoints ?? 0;
    row.questionCount += 1;
  }
  return Array.from(grouped.values()).map((row) => {
    const percentScore = row.totalPoints ? Math.round((row.earnedPoints / row.totalPoints) * 100) : 0;
    return { ...row, percentScore, performanceBand: getPerformanceBand(percentScore) };
  });
}
