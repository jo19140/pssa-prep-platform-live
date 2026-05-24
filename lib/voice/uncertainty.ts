export function wordErrorDistance(a: string, b: string) {
  const left = tokenize(a);
  const right = tokenize(b);
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return right.length ? dp[left.length][right.length] / right.length : 0;
}

export function computeUncertaintyScore(input: {
  asrConfidenceMean?: number | null;
  expectedText?: string | null;
  asrTranscript?: string | null;
  phonogramCoverageGap?: boolean;
}) {
  const confidenceScore = 1 - clamp(input.asrConfidenceMean ?? 0.5, 0, 1);
  const distanceScore = wordErrorDistance(input.asrTranscript || "", input.expectedText || "");
  const coverageScore = input.phonogramCoverageGap ? 0.15 : 0;
  return clamp(confidenceScore * 0.55 + distanceScore * 0.3 + coverageScore, 0, 1);
}

function tokenize(value: string) {
  return value.toLowerCase().match(/[a-z']+/g) || [];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
