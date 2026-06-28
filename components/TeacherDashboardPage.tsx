import LogoutButton from "@/components/LogoutButton";

export default function TeacherDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Teacher Tools</h1>
          <p className="mt-1 text-sm text-slate-600">Resources remains available while the final legacy tools migrate into product workspaces.</p>
        </div>
        <LogoutButton />
      </div>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" aria-label="Teacher tools">
        <span className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Resources</span>
      </nav>

      <ResourcesMigrationPlaceholder />
    </div>
  );
}

function ResourcesMigrationPlaceholder() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Resource Library</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">Resources is moving to the new workspace</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        The legacy resource list is temporarily unavailable while it is reconnected to the current lesson-library data model.
      </p>
    </section>
  );
}
