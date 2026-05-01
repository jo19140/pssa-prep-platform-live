"use client";

export function StudentAssignmentListPage({
  assignments,
  onOpen,
}: {
  assignments: any[];
  onOpen: (assignment: any) => void;
}) {
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter((a) => a.statusLabel === "Completed").length;
  const remainingAssignments = totalAssignments - completedAssignments;

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
          <p className="mt-2 text-3xl font-bold text-emerald-600">{completedAssignments}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-500">Remaining</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{remainingAssignments}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <h3 className="text-xl font-bold text-slate-900">My Assignments</h3>
        <div className="mt-5 space-y-4">
          {assignments.map((a) => {
            const isCompleted = a.statusLabel === "Completed";
            const statusText = isCompleted ? "Completed" : "Pending";
            const buttonText = a.statusLabel === "Not Started" ? "Start Test" : isCompleted ? "Review Report" : "Resume Test";

            return (
              <div
                key={a.assignmentId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900">{a.title}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>

                <button
                  onClick={() => onOpen(a)}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
