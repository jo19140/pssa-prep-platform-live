export function buildSkillGrowth(currentSkills: any[], previousSkills: any[] = []) {
  return currentSkills.map((current) => {
    const previous = previousSkills.find((p) => p.skill === current.skill);
    return { skill: current.skill, previousAccuracy: previous?.accuracy ?? null, currentAccuracy: current.accuracy, growthPoints: previous?.accuracy == null ? null : current.accuracy - previous.accuracy };
  });
}
