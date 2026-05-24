import { EhriPhaseBadge } from "@/components/literacy/EhriPhaseBadge";
import { AutopilotDecisionFeed } from "@/components/literacy/AutopilotDecisionFeed";

export function TeacherLiteracyMonitor({
  students,
  decisions,
}: {
  students: Array<{ userId: string; name: string; grade: number; phase: any; confidence: number }>;
  decisions: Array<{ id: string; decisionType: string; summary: string; reasoning: string; appliedAt: Date }>;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Literacy monitor</h1>
      <p className="mt-2 text-slate-600">Small-caseload view for tutors and interventionists.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          {students.length ? students.map((student) => (
            <a key={student.userId} href={`/teacher/literacy/${student.userId}`} className="block rounded-md border border-slate-200 bg-white p-4 hover:border-emerald-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-950">{student.name}</p>
                  <p className="text-sm text-slate-500">Grade {student.grade}</p>
                </div>
                <EhriPhaseBadge phase={student.phase} confidence={student.confidence} />
              </div>
            </a>
          )) : <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-slate-600">No students in this caseload yet.</div>}
        </section>
        <AutopilotDecisionFeed decisions={decisions} />
      </div>
    </main>
  );
}
