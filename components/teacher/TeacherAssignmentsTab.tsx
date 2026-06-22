"use client";

import { Fragment, useEffect, useState } from "react";

type TeacherAssignment = {
  id: string;
  title: string;
  gradeLevel: number;
  audienceLabel: string | null;
  dueDate: string | null;
  status: string;
  assignmentType: string;
  recipientTotal: number;
  completedCount: number;
  averagePercent: number | null;
  students: Array<{
    studentName: string;
    recipientStatus: string;
    finalized: { pointsEarned: number; pointsPossible: number; percent: number } | null;
  }>;
};

export function TeacherAssignmentsTab() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const loadAssignments = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/teacher/assignments/canonical", { cache: "no-store" });
      if (!response.ok) throw new Error("Assignments could not be loaded.");
      const data = await response.json();
      setAssignments(data.assignments ?? []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  if (status === "loading") {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading assignments...</section>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Assignments</h2>
            <p className="mt-1 text-sm text-slate-600">Track assigned mini-lessons and finalized scores from the canonical gradebook.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/teacher?tab=lessons" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Assign a lesson</a>
            <a href="/teacher?tab=reports" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Assign from Reports</a>
          </div>
        </div>
      </div>

      {status === "error" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Assignments could not be loaded.</p>
          <button type="button" onClick={() => void loadAssignments()} className="mt-4 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Retry</button>
        </section>
      ) : null}

      {assignments.length === 0 && status === "ready" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No canonical assignments yet.</section>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Lesson</th>
              <th className="px-4 py-3">Grade level</th>
              <th className="px-4 py-3">Assigned to</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.map((assignment) => {
              const writingReviewCount = assignment.assignmentType !== "LESSON"
                ? assignment.students.filter((student) => student.recipientStatus === "SUBMITTED" || student.recipientStatus === "COMPLETED").length
                : 0;
              return (
                <Fragment key={assignment.id}>
                  <tr key={assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setExpanded(expanded === assignment.id ? null : assignment.id)} className="font-semibold text-slate-950 hover:underline">
                        {assignment.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">Grade {assignment.gradeLevel}</td>
                    <td className="px-4 py-3 text-slate-600">{assignment.audienceLabel || "Assigned students"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(assignment.dueDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{assignment.completedCount} of {assignment.recipientTotal} complete</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {assignment.assignmentType === "LESSON"
                        ? assignment.averagePercent == null ? "-" : `${assignment.averagePercent}%`
                        : <button type="button" disabled title="Grading arrives in #36" className="cursor-not-allowed text-slate-400">Review {writingReviewCount} responses -&gt;</button>}
                    </td>
                  </tr>
                  {expanded === assignment.id ? (
                    <tr>
                      <td colSpan={6} className="bg-slate-50 px-4 py-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {assignment.students.map((student) => (
                            <div key={`${assignment.id}-${student.studentName}`} className="rounded-md border border-slate-200 bg-white p-3">
                              <p className="font-semibold text-slate-900">{student.studentName}</p>
                              <p className="text-xs text-slate-500">{student.recipientStatus}</p>
                              <p className="mt-2 text-sm text-slate-700">{student.finalized ? `${student.finalized.pointsEarned}/${student.finalized.pointsPossible} (${student.finalized.percent}%)` : "-"}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
