import Link from "next/link";
import { AutopilotDecisionFeed } from "@/components/literacy/AutopilotDecisionFeed";
import { MTSSTierBadge } from "@/components/literacy/MTSSTierBadge";

type TierDisplay = {
  tier: "1" | "2" | "3";
  variant: "CORE" | "SMALL_GROUP" | "WATCH_EVIDENCE" | "INTENSIVE";
  label: string;
  subLabel: string;
};

type TeacherLiteracyStudent = {
  userId: string;
  name: string;
  grade: number;
  result: {
    placement: { phase: string };
    firstLessonRecommendation: { exampleWords?: string[] | null };
  } | null;
  tierDisplay: TierDisplay | null;
  readingProfile: string | null;
  dailyTargetLabel: string | null;
  computedAt: string | null;
};

type TierMix = {
  core: number;
  smallGroupOrWatch: number;
  intensive: number;
  awaiting: number;
};

const HONEST_UNCERTAINTY_FOOTER =
  "Diagnostic results inform instructional starting points; they are not a clinical diagnosis. Tier recommendations are initial estimates — confirm with 4–6 weeks of progress monitoring. For comprehensive evaluation, consult your school's evaluation team.";

export function TeacherLiteracyMonitor({
  students,
  decisions,
  tierMix,
}: {
  students: TeacherLiteracyStudent[];
  decisions: Array<{ id: string; decisionType: string; summary: string; reasoning: string; appliedAt: Date }>;
  tierMix: TierMix;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Literacy monitor</h1>
          <p className="mt-2 text-slate-600">Small-caseload view for tutors and interventionists.</p>
        </div>
        <Link href="/teacher/literacy/caseload-report" className="rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:border-emerald-400">
          Caseload report ↗
        </Link>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          {students.length ? students.map((student) => (
            <StudentCard key={student.userId} student={student} />
          )) : <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-slate-600">No students in this caseload yet.</div>}
        </section>
        <aside className="space-y-6">
          <CaseloadTierMix tierMix={tierMix} />
          <AutopilotDecisionFeed decisions={decisions} />
        </aside>
      </div>
      <footer className="mt-8 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
        {HONEST_UNCERTAINTY_FOOTER}
      </footer>
    </main>
  );
}

function StudentCard({ student }: { student: TeacherLiteracyStudent }) {
  if (!student.result) return <AwaitingDiagnosticCard student={student} />;

  const examples = (student.result.firstLessonRecommendation.exampleWords ?? [])
    .filter(Boolean)
    .slice(0, 4);

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-950">{student.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            Grade {student.grade}
            {student.computedAt ? <span> · Assessed {formatDate(student.computedAt)}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {student.tierDisplay ? <MTSSTierBadge tierDisplay={student.tierDisplay} /> : null}
          <Link href={`/teacher/literacy/${student.userId}`} className="text-sm font-black text-emerald-800 hover:text-emerald-900">
            View report ↗
          </Link>
        </div>
      </div>
      <div className="my-4 border-t border-slate-200" />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Working on</p>
          <p className="mt-1 font-bold text-slate-950">{student.dailyTargetLabel}</p>
          {examples.length ? (
            <p className="mt-1 text-sm text-slate-600">Examples: {examples.join(", ")}</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Placement</p>
          <p className="mt-1 font-bold text-slate-950">{student.result.placement.phase}</p>
        </div>
      </div>
      <div className="my-4 border-t border-dashed border-slate-200" />
      <p className="text-sm leading-6 text-slate-700">
        <span className="font-black text-slate-950">Reading profile: </span>
        {student.readingProfile}
      </p>
    </article>
  );
}

function AwaitingDiagnosticCard({ student }: { student: TeacherLiteracyStudent }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-950">{student.name}</p>
          <p className="mt-1 text-sm text-slate-500">Grade {student.grade} · No diagnostic yet</p>
        </div>
        <Link href="/teacher?tab=import" className="text-sm font-black text-emerald-800 hover:text-emerald-900">
          Send invite ↗
        </Link>
      </div>
      <div className="my-4 border-t border-slate-200" />
      <p className="text-sm leading-6 text-slate-700">
        A 15-min diagnostic will place {student.name} on a starting pattern and pick the first lesson.
      </p>
    </article>
  );
}

function CaseloadTierMix({ tierMix }: { tierMix: TierMix }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-black text-slate-950">Caseload tier mix</h2>
      <div className="mt-4 space-y-3">
        <TierMixRow label="Tier 1 (Core)" count={tierMix.core} />
        <TierMixRow label="Tier 2 (Small group / watch)" count={tierMix.smallGroupOrWatch} />
        <TierMixRow label="Tier 3 (Intensive)" count={tierMix.intensive} />
        <TierMixRow label="Awaiting diagnostic" count={tierMix.awaiting} />
      </div>
    </section>
  );
}

function TierMixRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-sm font-black text-slate-950">{count}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
