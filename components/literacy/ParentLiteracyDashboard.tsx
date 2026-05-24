import { AutoSendParentUpdateCard } from "@/components/literacy/AutoSendParentUpdateCard";
import { EhriPhaseBadge } from "@/components/literacy/EhriPhaseBadge";
import { TODO_CONTENT_NOTE } from "@/lib/literacy/constants";

export function ParentLiteracyDashboard({ profile }: { profile: any }) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-md bg-emerald-700 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-100">Reading Buddy on Venus</p>
        <h1 className="mt-2 text-3xl font-black">{profile?.student?.name || "Your reader"} gained another month of reading this week.</h1>
        <p className="mt-2 text-emerald-50">A warm summary for parents, built from current literacy profile evidence.</p>
      </section>
      {profile ? <EhriPhaseBadge phase={profile.ehriPhase} confidence={profile.ehriPhaseConfidence} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="font-black text-slate-950">Words she's learning</p>
          <p className="mt-2 text-sm text-slate-600">{TODO_CONTENT_NOTE}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="font-black text-slate-950">What's coming next</p>
          <p className="mt-2 text-sm text-slate-600">{profile?.autopilotDecisions?.[0]?.summary || "A short progress check before changing the plan."}</p>
        </div>
        <AutoSendParentUpdateCard />
      </div>
    </main>
  );
}
