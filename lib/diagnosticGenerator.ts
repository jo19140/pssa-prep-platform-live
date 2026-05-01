export function generateDiagnostic(results: any[]) {
  const weakSkills: string[] = []

  results.forEach((q) => {
    if (!q.correct) {
      weakSkills.push(q.standard)
    }
  })

  return {
    weakSkills,
    totalQuestions: results.length,
    incorrect: weakSkills.length
  }
}