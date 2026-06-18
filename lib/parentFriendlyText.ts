export function parentFriendlyPerformanceLevel(band: string) {
  switch (band) {
    case "Strong": return "Strong";
    case "Developing": return "Growing";
    case "Growing": return "Growing";
    case "Needs support": return "Needs support";
    case "Limited evidence": return "Limited evidence";
    case "Incomplete": return "Incomplete";
    case "Still being finalized": return "Still being finalized";
    case "Advanced": return "Working above grade-level expectations";
    case "Proficient": return "Meeting grade-level expectations";
    case "Basic": return "Getting closer to grade-level expectations";
    case "Below Basic": return "Needs extra support to reach grade-level expectations";
    default: return band;
  }
}

export function parentFriendlyGrowth(growthPoints: number | null) {
  if (growthPoints == null) return "There is not enough previous test data yet to measure growth.";
  if (growthPoints > 0) return `Your child improved by ${growthPoints} points since the previous assessment.`;
  if (growthPoints < 0) return `Your child scored ${Math.abs(growthPoints)} points lower than the previous assessment.`;
  return "Your child performed at about the same level as the previous assessment.";
}
