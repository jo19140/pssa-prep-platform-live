"use client";

import { useMemo, useState } from "react";

const STRAND_ORDER = ["Conventions and Writing", "Literary Reading", "Informational Reading", "Foundational Skills", "Other Standards"];
const STATUS_GROUPS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "MASTERED"];

export function StandardsProgressPanel({
  lessons,
  onStudentSelect,
  classFilter,
  selectedClassName,
}: {
  lessons: any[];
  onStudentSelect: (studentName: string) => void;
  classFilter: string;
  selectedClassName: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedStandardKey, setSelectedStandardKey] = useState<string | null>(null);

  const derivedStandardsProgress = useMemo(() => {
    const byKey = new Map<string, { standardCode: string; skill: string; lessonCount: number; completed: number; mastered: number }>();
    for (const lesson of lessons || []) {
      const key = standardKey(lesson.standardCode, lesson.skill);
      if (!byKey.has(key)) {
        byKey.set(key, { standardCode: lesson.standardCode, skill: lesson.skill, lessonCount: 0, completed: 0, mastered: 0 });
      }
      const row = byKey.get(key)!;
      row.lessonCount += 1;
      if (lesson.status === "COMPLETED" || lesson.status === "MASTERED") row.completed += 1;
      if (lesson.status === "MASTERED") row.mastered += 1;
    }
    return Array.from(byKey.values());
  }, [lessons]);

  const groups = useMemo(() => {
    const lessonsByStandard = new Map<string, any[]>();
    for (const lesson of lessons || []) {
      const key = standardKey(lesson.standardCode, lesson.skill);
      if (!lessonsByStandard.has(key)) lessonsByStandard.set(key, []);
      lessonsByStandard.get(key)!.push(lesson);
    }

    const rows = derivedStandardsProgress.map((row) => ({
      ...row,
      key: standardKey(row.standardCode, row.skill),
      strand: strandForStandard(row.standardCode),
      lessons: lessonsByStandard.get(standardKey(row.standardCode, row.skill)) || [],
    }));

    const grouped = new Map<string, any[]>();
    for (const strand of STRAND_ORDER) grouped.set(strand, []);
    for (const row of rows) {
      if (!grouped.has(row.strand)) grouped.set(row.strand, []);
      grouped.get(row.strand)!.push(row);
    }

    return STRAND_ORDER
      .map((strand) => ({ strand, rows: (grouped.get(strand) || []).sort((a, b) => a.standardCode.localeCompare(b.standardCode) || a.skill.localeCompare(b.skill)) }))
      .filter((group) => group.rows.length);
  }, [derivedStandardsProgress, lessons]);

  const selectedRow = groups.flatMap((group) => group.rows).find((row) => row.key === selectedStandardKey);

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Standards Progress</p>
        <h2 className="text-xl font-bold text-slate-900">Strand-Grouped Mastery Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          {classFilter === "all"
            ? "All sections - completion and mastery percentages across every class."
            : `${selectedClassName} - click a standard to see which students need help.`}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {groups.map((group) => {
          const totalLessons = group.rows.reduce((sum, row) => sum + row.lessonCount, 0);
          const completed = group.rows.reduce((sum, row) => sum + row.completed, 0);
          const completionPercent = percentage(completed, totalLessons);
          return (
            <div key={group.strand} className="overflow-hidden rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCollapsed((current) => ({ ...current, [group.strand]: !current[group.strand] }))}
                className="flex w-full items-center justify-between gap-4 bg-slate-50 px-4 py-3 text-left"
              >
                <div>
                  <h3 className="font-black text-slate-950">{group.strand}</h3>
                  <p className="text-sm text-slate-600">{totalLessons} lessons - {completionPercent}% complete</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                  {collapsed[group.strand] ? "Expand" : "Collapse"}
                </span>
              </button>

              {!collapsed[group.strand] ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Standard</th>
                        <th className="px-4 py-3">Skill</th>
                        <th className="px-4 py-3">Lessons</th>
                        <th className="px-4 py-3">Completion</th>
                        <th className="px-4 py-3">Mastery</th>
                        <th className="px-4 py-3">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => {
                        const completedPercent = percentage(row.completed, row.lessonCount);
                        const masteryPercent = percentage(row.mastered, row.lessonCount);
                        return (
                          <tr
                            key={row.key}
                            onClick={() => setSelectedStandardKey((current) => current === row.key ? null : row.key)}
                            className={`cursor-pointer border-t border-slate-100 ${selectedStandardKey === row.key ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                          >
                            <td className="px-4 py-3 font-bold text-slate-900">{row.standardCode}</td>
                            <td className="px-4 py-3 text-slate-700">{row.skill}</td>
                            <td className="px-4 py-3">{row.lessonCount}</td>
                            <td className="px-4 py-3 font-semibold">{completedPercent}%</td>
                            <td className="px-4 py-3 font-semibold">{masteryPercent}%</td>
                            <td className="px-4 py-3">
                              <div className="h-3 w-48 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${progressColor(completedPercent)}`} style={{ width: `${completedPercent}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedRow ? <StandardDrilldown row={selectedRow} onStudentSelect={onStudentSelect} /> : null}
    </section>
  );
}

function StandardDrilldown({ row, onStudentSelect }: { row: any; onStudentSelect: (studentName: string) => void }) {
  const grouped = groupLessonsByStatus(row.lessons || []);
  return (
    <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">Drill-down</p>
        <h3 className="text-lg font-black text-slate-950">{row.standardCode} - {row.skill}</h3>
        <p className="mt-1 text-sm text-slate-600">Click a student to open their roster row below.</p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {STATUS_GROUPS.map((status) => (
          <div key={status} className="rounded-xl bg-white p-4 ring-1 ring-indigo-100">
            <h4 className="text-sm font-black text-slate-900">{statusLabel(status)}</h4>
            <div className="mt-3 space-y-2">
              {(grouped[status] || []).map((lesson: any) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onStudentSelect(lesson.studentName)}
                  className="block w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-100"
                >
                  {lesson.studentName}
                </button>
              ))}
              {!(grouped[status] || []).length ? <p className="text-sm text-slate-400">None</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function groupLessonsByStatus(lessons: any[]) {
  const grouped: Record<string, any[]> = { NOT_STARTED: [], IN_PROGRESS: [], COMPLETED: [], MASTERED: [] };
  for (const lesson of lessons) {
    const status = STATUS_GROUPS.includes(lesson.status) ? lesson.status : "NOT_STARTED";
    grouped[status].push(lesson);
  }
  for (const status of STATUS_GROUPS) {
    grouped[status].sort((a, b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));
  }
  return grouped;
}

function strandForStandard(standardCode: string) {
  if (standardCode.startsWith("CC.1.4.")) return "Conventions and Writing";
  if (standardCode.startsWith("CC.1.3.")) return "Literary Reading";
  if (standardCode.startsWith("CC.1.2.")) return "Informational Reading";
  if (standardCode.startsWith("CC.1.1.")) return "Foundational Skills";
  return "Other Standards";
}

function standardKey(standardCode: string, skill: string) {
  return `${standardCode}:${skill}`;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function progressColor(percent: number) {
  if (percent < 30) return "bg-red-500";
  if (percent <= 70) return "bg-amber-500";
  return "bg-green-500";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
