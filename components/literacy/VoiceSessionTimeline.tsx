export function VoiceSessionTimeline({
  sessions,
}: {
  sessions: Array<{ id: string; sessionType: string; startedAt: Date | string; audioStorageKey?: string | null; transcriptJson?: unknown }>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Voice sessions</h2>
      <div className="space-y-2">
        {sessions.length ? (
          sessions.map((session) => (
            <article key={session.id} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="font-bold text-slate-950">{session.sessionType.replace(/_/g, " ")}</p>
              <p className="text-sm text-slate-500">{new Date(session.startedAt).toLocaleString()}</p>
              {session.audioStorageKey ? <p className="mt-2 text-sm text-slate-600">Authenticated audio key available for playback.</p> : <p className="mt-2 text-sm text-slate-500">No retained audio.</p>}
              <p className="mt-2 text-xs font-semibold text-slate-500">Clip markers: TODO: from content pipeline</p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No voice sessions yet.</div>
        )}
      </div>
    </section>
  );
}
