import { VoiceSessionTimeline } from "@/components/literacy/VoiceSessionTimeline";

export function ParentVoiceSessionsPage({ sessions }: { sessions: any[] }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-950">Voice sessions</h1>
        <a href="/parent/settings/voice" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Data settings</a>
      </div>
      <p className="mt-2 text-slate-600">Parents can review authenticated session metadata and delete retained audio.</p>
      <div className="mt-6">
        <VoiceSessionTimeline sessions={sessions} />
      </div>
    </main>
  );
}
