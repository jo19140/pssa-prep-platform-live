export function buildStandardsRecommendations(groups: any[]) {
  return groups.map((group) => {
    const isEvidence = group.standardCode.includes(".B") || group.standardLabel?.toLowerCase?.().includes("inference");
    const isPov = group.standardCode.includes(".G") || group.standardLabel?.toLowerCase?.().includes("point of view");
    const isFigurative = group.standardCode.includes(".F") || group.standardLabel?.toLowerCase?.().includes("figurative");
    const isFlashback = group.standardCode.includes(".E") || group.standardLabel?.toLowerCase?.().includes("flashback");
    const isSetting = group.standardLabel?.toLowerCase?.().includes("setting") || group.skill?.toLowerCase?.().includes("setting");
    const isPlot = group.standardLabel?.toLowerCase?.().includes("plot") || (group.standardCode.includes("1.3") && group.standardCode.includes(".C"));
    return {
      standardCode: group.standardCode,
      standardLabel: group.standardLabel,
      title: `${group.standardCode} Intervention Set`,
      groupSize: group.students.length,
      focus: isSetting ? "Setting impact on plot, character, mood, and theme" : isPlot ? "Plot development, conflict, resolution, and cause/effect" : isFlashback ? "Flashback, sequence, and literary structure" : isFigurative ? "Figurative language, connotation, tone, and meaning" : isPov ? "Point of view, perspective, and narrator reliability" : isEvidence ? "Inference with text evidence" : "Central idea and summary",
      activityType: isSetting ? "Setting analysis + evidence practice" : isPlot ? "Plot analysis + evidence practice" : isFlashback ? "Flashback structure analysis + evidence practice" : isFigurative ? "Figurative language MCQ + tone/effect practice" : isPov ? "POV analysis + evidence practice" : isEvidence ? "Inference MCQ + EBSR + short response" : "Main Idea + Multi-Select",
      estimatedMinutes: isPov || isEvidence || isFigurative || isFlashback || isPlot || isSetting ? 20 : 15,
      recommendation: `Assign focused practice on ${group.standardCode}.`,
    };
  });
}
