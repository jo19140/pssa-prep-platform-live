"use client";

import { StudentTutorAgentPanel } from "@/components/StudentTutorAgentPanel";
import { ReadingCoachPanel } from "@/components/ReadingCoachPanel";

export function StudentAssignmentListPage({
  assignments,
  readingCoachAssignments,
  latestLearningPath,
  onOpen,
  onOpenLearningPath,
  onReadingCoachComplete,
}: {
  assignments: any[];
  readingCoachAssignments?: any[];
  latestLearningPath?: any;
  onOpen: (assignment: any) => void;
  onOpenLearningPath?: () => void;
  onReadingCoachComplete?: () => void;
}) {
  const totalAssignments = assignments.length + (readingCoachAssignments?.length || 0);
  const completedAssignments = assignments.filter((a) => a.statusLabel === "Completed").length;
  const completedReadingCoach = (readingCoachAssignments || []).filter((a) => a.statusLabel === "Completed").length;
  const remainingAssignments = totalAssignments - completedAssignments - completedReadingCoach;
  const baselineDiagnostics = assignments.filter((a) => a.assignmentType === "DIAGNOSTIC");
  const teacherAssigned = assignments.filter((a) => a.assignmentType !== "DIAGNOSTIC");
  const pathItems = latestLearningPath?.items || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg">
        <p className="text-sm font-medium text-slate-200">Student Dashboard</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-200">Here&apos;s a quick look at your assignment progress.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Total Assignments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalAssignments}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{completedAssignments + completedReadingCoach}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Remaining</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{remainingAssignments}</p>
        </div>
      </section>

      <StudentTutorAgentPanel />

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Baseline</p>
          <h3 className="text-xl font-bold text-slate-900">Baseline Diagnostic</h3>
          <p className="text-sm text-slate-600">Start here to measure current reading, writing, and conventions skills.</p>
        </div>
        <AssignmentGroup assignments={baselineDiagnostics} emptyText="No baseline diagnostic has been assigned yet." onOpen={onOpen} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teacher Work</p>
          <h3 className="text-xl font-bold text-slate-900">Teacher Assigned Lessons</h3>
          <p className="text-sm text-slate-600">Tests and practice assigned by your teacher appear here.</p>
        </div>
        <AssignmentGroup assignments={teacherAssigned} emptyText="No teacher assigned lessons are available right now." onOpen={onOpen} />
      </section>

      {(readingCoachAssignments || []).length ? (
        <section className="space-y-4">
          {(readingCoachAssignments || []).map((assignment: any) => (
            <ReadingCoachPanel key={assignment.assignmentId} assignment={assignment} onComplete={onReadingCoachComplete} />
          ))}
        </section>
      ) : null}

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Personalized Practice</p>
            <h3 className="text-xl font-bold text-slate-900">AI Learning Path</h3>
            <p className="text-sm text-slate-600">
              {pathItems.length
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

        {pathItems.length ? (
          <div className="mt-5 space-y-4">
            <button
              onClick={onOpenLearningPath}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Open My Learning Path
            </button>
            <div className="grid gap-3">
            {pathItems.slice(0, 4).map((item: any) => (
              <article key={item.id || item.order} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Step {item.order} • {item.standardCode}</p>
                    <h4 className="mt-1 text-base font-bold text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-slate-700">{item.recommendation}</p>
                  </div>
                  <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {item.estimatedMinutes} min
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
    </div>
  );
}

function AssignmentGroup({
  assignments,
  emptyText,
  onOpen,
}: {
  assignments: any[];
  emptyText: string;
  onOpen: (assignment: any) => void;
}) {
  if (!assignments.length) {
    return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{emptyText}</div>;
  }

  return (
    <div className="mt-5 space-y-4">
      {assignments.map((assignment) => (
        <AssignmentCard key={assignment.assignmentId} assignment={assignment} onOpen={onOpen} />
      ))}
    </div>
  );
}

function AssignmentCard({
  assignment,
  onOpen,
}: {
  assignment: any;
  onOpen: (assignment: any) => void;
}) {
  const isCompleted = assignment.statusLabel === "Completed";
  const isInProgress = assignment.statusLabel === "In Progress";
  const statusText = isCompleted ? "Completed" : isInProgress ? "In Progress" : "Not Started";
  const buttonText = assignment.statusLabel === "Not Started" ? "Start" : isCompleted ? "Review Report" : "Resume";
  const isDiagnostic = assignment.assignmentType === "DIAGNOSTIC";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-lg font-semibold text-slate-900">{assignment.title}</p>
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
        </div>
      </div>

      <button
        onClick={() => onOpen(assignment)}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {buttonText}
      </button>
    </div>
  );
}
