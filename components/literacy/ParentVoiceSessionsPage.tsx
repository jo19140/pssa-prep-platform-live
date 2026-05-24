import { VoiceSessionTimeline } from "@/components/literacy/VoiceSessionTimeline";

export function ParentVoiceSessionsPage({ sessions }: { sessions: any[] }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Voice sessions</h1>
      <p className="mt-2 text-slate-600">Parents can review authenticated session metadata and delete retained audio.</p>
      <div className="mt-6">
        <VoiceSessionTimeline sessions={sessions} />
      </div>
    </main>
  );
}
