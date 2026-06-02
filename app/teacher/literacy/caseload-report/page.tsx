import Link from "next/link";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function TeacherLiteracyCaseloadReportPage() {
  return (
    <SynesisPageShell roles={["TEACHER"]}>
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center px-4 py-12">
        <section className="w-full rounded-md border border-slate-200 bg-white p-8 shadow-sm">
          <Link href="/teacher/literacy" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
            ← Back to literacy monitor
          </Link>
          <h1 className="mt-6 text-3xl font-black text-slate-950">Caseload report</h1>
          <p className="mt-4 text-slate-700">
            The caseload report will surface strengths, deficiency clusters, suggested small groups, and recommendations across your students.
          </p>
          <p className="mt-3 text-slate-700">Coming in the next release.</p>
        </section>
      </main>
    </SynesisPageShell>
  );
}
