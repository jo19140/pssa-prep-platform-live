import Link from "next/link";
import { TeacherClassesPanel } from "@/components/TeacherClassesPanel";
import { TeacherImportStudentsPanel } from "@/components/TeacherImportStudentsPanel";

export function TeacherClassesTab() {
  return (
    <div className="space-y-5">
      <TeacherClassesPanel />
      <TeacherImportStudentsPanel />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">Other tools</p>
        <p className="mt-1 text-sm text-slate-600">Reading Coach and Resources remain in Teacher Tools while the workspace migration continues.</p>
        <Link
          href="/teacher/tools?tab=readingCoach"
          className="mt-4 inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          Open Teacher Tools
        </Link>
      </section>
    </div>
  );
}
