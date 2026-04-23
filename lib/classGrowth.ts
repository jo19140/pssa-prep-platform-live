export function buildClassGrowthSummary(studentRows: any[]) {
  const withGrowth = studentRows.filter((s) => s.growthPoints != null);
  const averageGrowth = withGrowth.length ? Math.round(withGrowth.reduce((sum, s) => sum + (s.growthPoints ?? 0), 0) / withGrowth.length) : 0;
  const improvedCount = withGrowth.filter((s) => (s.growthPoints ?? 0) > 0).length;
  const flatCount = withGrowth.filter((s) => (s.growthPoints ?? 0) === 0).length;
  const declinedCount = withGrowth.filter((s) => (s.growthPoints ?? 0) < 0).length;
  return { averageGrowth, improvedCount, flatCount, declinedCount, topGrowthStudents: [...withGrowth].sort((a,b)=>(b.growthPoints??0)-(a.growthPoints??0)).slice(0,5), stalledStudents: [...withGrowth].filter((s)=>(s.growthPoints??0)<=0).sort((a,b)=>(a.growthPoints??0)-(b.growthPoints??0)).slice(0,5) };
}

export function buildStandardsGrowthAggregate(studentStandardsGrowth: any[]) {
  const grouped = new Map<string, any>();
  for (const student of studentStandardsGrowth) {
    for (const row of student.standardsGrowth || []) {
      if (row.growthPoints == null) continue;
      if (!grouped.has(row.standardCode)) grouped.set(row.standardCode, { standardCode: row.standardCode, standardLabel: row.standardLabel, growthTotal: 0, studentCount: 0 });
      const current = grouped.get(row.standardCode);
      current.growthTotal += row.growthPoints;
      current.studentCount += 1;
    }
  }
  return Array.from(grouped.values()).map((row) => ({ standardCode: row.standardCode, standardLabel: row.standardLabel, averageGrowth: row.studentCount ? Math.round(row.growthTotal / row.studentCount) : 0, studentCount: row.studentCount })).sort((a,b)=>b.averageGrowth-a.averageGrowth);
}
