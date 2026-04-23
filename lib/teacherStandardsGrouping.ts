export function buildStandardSupportGroups(students: any[]) {
  const grouped = new Map<string, any>();
  for (const student of students) {
    for (const row of student.standardsMastery || []) {
      if (row.performanceBand === "Proficient" || row.performanceBand === "Advanced") continue;
      if (!grouped.has(row.standardCode)) grouped.set(row.standardCode, { standardCode: row.standardCode, standardLabel: row.standardLabel, performanceBand: row.performanceBand, students: [] });
      grouped.get(row.standardCode).students.push({ studentId: student.studentId, studentName: student.studentName, sessionId: student.sessionId, percentScore: row.percentScore });
    }
  }
  return Array.from(grouped.values());
}
