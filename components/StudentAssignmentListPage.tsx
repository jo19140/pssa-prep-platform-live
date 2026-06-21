"use client";

import { useMemo, useState } from "react";
import { StudentTutorAgentHelpButton } from "@/components/StudentTutorAgentPanel";
import { ReadingCoachPanel } from "@/components/ReadingCoachPanel";
import { StudentJoinClassPanel } from "@/components/StudentJoinClassPanel";

export function StudentAssignmentListPage({
  assignments,
  readingCoachAssignments,
  latestLearningPath,
  studentGrade,
  onOpen,
  onOpenLearningPath,
  onOpenTdaPractice,
  onReadingCoachComplete,
  onJoinClass,
}: {
  assignments: any[];
  readingCoachAssignments?: any[];
  latestLearningPath?: any;
  studentGrade?: number | null;
  onOpen: (assignment: any) => void;
  onOpenLearningPath?: () => void;
  onOpenTdaPractice?: () => void;
  onReadingCoachComplete?: () => void;
  onJoinClass?: () => void;
}) {
  const [detailFilter, setDetailFilter] = useState<"total" | "completed" | "remaining" | null>(null);
  const currentGradeAssignments = assignments.filter((assignment) => assignment.isCurrentGrade !== false);
  const offGradeDiagnostics = assignments.filter((assignment) => assignment.assignmentType === "DIAGNOSTIC" && assignment.isCurrentGrade === false);
  const dashboardAssignments = useMemo(() => [
    ...currentGradeAssignments.map((assignment) => ({ ...assignment, sourceType: "Assessment" })),
    ...(readingCoachAssignments || []).map((assignment) => ({ ...assignment, sourceType: "Reading Coach" })),
  ], [currentGradeAssignments, readingCoachAssignments]);
  const totalAssignments = dashboardAssignments.length;
  const completedAssignments = currentGradeAssignments.filter((a) => a.statusLabel === "Completed").length;
  const completedReadingCoach = (readingCoachAssignments || []).filter((a) => a.statusLabel === "Completed").length;
  const remainingAssignments = totalAssignments - completedAssignments - completedReadingCoach;
  const completedTotal = completedAssignments + completedReadingCoach;
  const baselineDiagnostics = currentGradeAssignments.filter((a) => a.assignmentType === "DIAGNOSTIC");
  const teacherAssigned = currentGradeAssignments.filter((a) => a.assignmentType !== "DIAGNOSTIC");
  const pathItems = latestLearningPath?.items || [];
  const learningLessons = latestLearningPath?.lessons || [];
  const detailAssignments = detailFilter === "completed"
    ? dashboardAssignments.filter((assignment) => assignment.statusLabel === "Completed")
    : detailFilter === "remaining"
      ? dashboardAssignments.filter((assignment) => assignment.statusLabel !== "Completed")
      : dashboardAssignments;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg">
        <p className="text-sm font-medium text-slate-200">Student Dashboard</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-200">Here&apos;s a quick look at your assignment progress.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Assignments" value={totalAssignments} colorClass="text-slate-900" onClick={() => setDetailFilter("total")} />
        <SummaryCard label="Completed" value={completedTotal} colorClass="text-emerald-600" onClick={() => setDetailFilter("completed")} />
        <SummaryCard label="Remaining" value={remainingAssignments} colorClass="text-amber-600" onClick={() => setDetailFilter("remaining")} />
      </section>

      <StudentJoinClassPanel onJoined={onJoinClass || (() => {})} />

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Personalized Practice</p>
            <h3 className="text-xl font-bold text-slate-900">AI Learning Path</h3>
            <p className="text-sm text-slate-600">
              {pathItems.length || learningLessons.length
                ? `Based on ${latestLearningPath?.session?.assessment?.title || "your latest diagnostic"}.`
                : "Complete the baseline diagnostic to unlock a personalized learning path."}
            </p>
          </div>
          {pathItems.length ? (
            <span className="mt-2 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:mt-0">
              {latestLearningPath.generatedBy === "AI_ENRICHED" ? "AI enriched" : "Deterministic first"}
            </span>
          ) : null}
        </div>

        {pathItems.length || learningLessons.length ? (
          <div className="mt-5 space-y-4">
            <button
              onClick={onOpenLearningPath}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Open My Learning Path
            </button>
            <div className="grid gap-3">
              {(pathItems.length ? pathItems : learningLessons).slice(0, 4).map((item: any, index: number) => (
                <article key={item.id || item.order} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Step {item.order || index + 1} • {item.standardCode}</p>
                      <h4 className="mt-1 text-base font-bold text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-sm text-slate-700">{item.recommendation || item.whyAssigned}</p>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.estimatedMinutes || 15} min
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            Once a diagnostic is completed, this section will show the student&apos;s priority skills, recommended practice, and next steps.
          </div>
        )}
      </section>

      {detailFilter ? (
        <AssignmentDetailsModal
          title={detailFilter === "completed" ? "Completed Assignments" : detailFilter === "remaining" ? "Remaining Assignments" : "All Assignments"}
          assignments={detailAssignments}
          onClose={() => setDetailFilter(null)}
          onOpen={onOpen}
          onOpenLearningPath={onOpenLearningPath}
        />
      ) : null}

      <StudentTutorAgentHelpButton mode="dashboard" />

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Writing Practice</p>
            <h3 className="text-xl font-bold text-slate-900">TDA Practice Coach</h3>
            <p className="mt-1 text-sm text-slate-600">
              Open a dedicated writing screen where you type your own TDA and get coaching comments, rubric notes, and revision steps.
            </p>
          </div>
          <button
            onClick={onOpenTdaPractice}
            className="w-fit rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
          >
            Open TDA Practice
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Baseline</p>
          <h3 className="text-xl font-bold text-slate-900">Baseline Diagnostic{studentGrade ? ` - Grade ${studentGrade}` : ""}</h3>
          <p className="text-sm text-slate-600">Start here to measure current reading, writing, and conventions skills for your current grade.</p>
        </div>
        <AssignmentGroup assignments={baselineDiagnostics} emptyText="No baseline diagnostic has been assigned yet." onOpen={onOpen} onOpenLearningPath={onOpenLearningPath} />
        {offGradeDiagnostics.length ? (
          <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">
              Other grade diagnostics ({offGradeDiagnostics.length})
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              These are from a different grade level and are kept out of your main baseline list.
            </p>
            <div className="mt-3 space-y-3">
              {offGradeDiagnostics.map((assignment) => (
                <AssignmentCard key={assignment.assignmentId} assignment={assignment} onOpen={onOpen} compact />
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teacher Work</p>
          <h3 className="text-xl font-bold text-slate-900">Teacher Assigned Lessons</h3>
          <p className="text-sm text-slate-600">Tests and practice assigned by your teacher appear here.</p>
        </div>
        <AssignmentGroup assignments={teacherAssigned} emptyText="No teacher assigned lessons are available right now." onOpen={onOpen} onOpenLearningPath={onOpenLearningPath} />
      </section>

      {(readingCoachAssignments || []).length ? (
        <section className="space-y-4">
          {(readingCoachAssignments || []).map((assignment: any) => (
            <ReadingCoachPanel key={assignment.assignmentId} assignment={assignment} onComplete={onReadingCoachComplete} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  colorClass,
  onClick,
}: {
  label: string;
  value: number;
  colorClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-5 text-left shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-400">View details</p>
    </button>
  );
}

function AssignmentDetailsModal({
  title,
  assignments,
  onClose,
  onOpen,
  onOpenLearningPath,
}: {
  title: string;
  assignments: any[];
  onClose: () => void;
  onOpen: (assignment: any) => void;
  onOpenLearningPath?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">{title}</h3>
            <p className="text-sm text-slate-500">{assignments.length} assignment{assignments.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Close</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          {assignments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Assignment</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Assigned</th>
                    <th className="px-3 py-2">Completed</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={`${assignment.sourceType || "Assessment"}-${assignment.assignmentId}`} className="rounded-xl bg-slate-50">
                      <td className="rounded-l-xl px-3 py-3">
                        <p className="font-bold text-slate-900">{assignment.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{assignment.sourceType || assignment.assignmentType || "Assessment"}{assignment.gradeLevel ? ` • Grade ${assignment.gradeLevel}` : ""}</p>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={assignment.statusLabel} /></td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{formatScore(assignment)}</td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(assignment.assignedAt)}</td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(assignment.submittedAt)}</td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(assignment.dueDate)}</td>
                      <td className="rounded-r-xl px-3 py-3 text-right">
                        {assignment.assessmentId || assignment.lessonId ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (assignment.lessonId && !assignment.assessmentId && onOpenLearningPath) onOpenLearningPath();
                              else onOpen(assignment);
                            }}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                          >
                            {assignment.lessonId && !assignment.assessmentId ? "Open" : assignment.statusLabel === "Completed" ? "Report" : assignment.statusLabel === "In Progress" ? "Resume" : "Start"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No assignments in this group.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const classes = status === "Completed"
    ? "bg-emerald-100 text-emerald-700"
    : status === "In Progress"
      ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${classes}`}>{status || "Not Started"}</span>;
}

function formatScore(assignment: any) {
  if (typeof assignment.scorePercent === "number") return `${assignment.scorePercent}%`;
  if (typeof assignment.earnedPoints === "number" && typeof assignment.totalPoints === "number") return `${assignment.earnedPoints}/${assignment.totalPoints}`;
  return assignment.statusLabel === "Completed" ? "Complete" : "-";
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AssignmentGroup({
  assignments,
  emptyText,
  onOpen,
  onOpenLearningPath,
}: {
  assignments: any[];
  emptyText: string;
  onOpen: (assignment: any) => void;
  onOpenLearningPath?: () => void;
}) {
  if (!assignments.length) {
    return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{emptyText}</div>;
  }

  return (
    <div className="mt-5 space-y-4">
      {assignments.map((assignment) => (
        <AssignmentCard key={assignment.assignmentId} assignment={assignment} onOpen={onOpen} onOpenLearningPath={onOpenLearningPath} />
      ))}
    </div>
  );
}

function AssignmentCard({
  assignment,
  onOpen,
  onOpenLearningPath,
  compact = false,
}: {
  assignment: any;
  onOpen: (assignment: any) => void;
  onOpenLearningPath?: () => void;
  compact?: boolean;
}) {
  const isCompleted = assignment.statusLabel === "Completed";
  const isInProgress = assignment.statusLabel === "In Progress";
  const statusText = isCompleted ? "Completed" : isInProgress ? "In Progress" : "Not Started";
  const buttonText = assignment.statusLabel === "Not Started" ? "Start" : isCompleted ? "Review Report" : "Resume";
  const isDiagnostic = assignment.assignmentType === "DIAGNOSTIC";

  return (
    <div className={`flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm sm:flex-row sm:items-center sm:justify-between ${compact ? "p-4" : "p-5"}`}>
      <div>
        <p className={`${compact ? "text-base" : "text-lg"} font-semibold text-slate-900`}>{assignment.title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              isCompleted
                ? "bg-emerald-100 text-emerald-700"
                : isInProgress
                  ? "bg-blue-100 text-blue-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {statusText}
          </span>
          {isDiagnostic ? <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Diagnostic</span> : null}
          {assignment.gradeLevel ? <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Grade {assignment.gradeLevel}</span> : null}
          {assignment.isCurrentGrade === false ? <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Different Grade</span> : null}
        </div>
      </div>

      <button
        onClick={() => {
          if (assignment.lessonId && !assignment.assessmentId && onOpenLearningPath) onOpenLearningPath();
          else onOpen(assignment);
        }}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {assignment.lessonId && !assignment.assessmentId ? "Open Lesson" : buttonText}
      </button>
    </div>
  );
}
