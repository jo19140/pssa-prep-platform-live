export function generateLearningPath(diagnostic: any) {
  const pathway = diagnostic.weakSkills.map((skill: string) => {
    return {
      standard: skill,
      recommendation: `Practice more questions on ${skill}`,
      difficulty: "medium"
    }
  })

  return pathway
}