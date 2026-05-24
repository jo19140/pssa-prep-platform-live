"use client";

import { useState } from "react";

export function VoiceSessionTimeline({
  sessions,
}: {
  sessions: Array<{ id: string; sessionType: string; startedAt: Date | string; audioStorageKey?: string | null; transcriptJson?: unknown }>;
}) {
  const [items, setItems] = useState(sessions);
  async function deleteAudio(id: string) {
    const response = await fetch(`/api/literacy/voice-session/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((current) => current.map((item) => item.id === id ? { ...item, audioStorageKey: null } : item));
    }
  }
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Voice sessions</h2>
      <div className="space-y-2">
        {items.length ? (
          items.map((session) => (
            <article key={session.id} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="font-bold text-slate-950">{session.sessionType.replace(/_/g, " ")}</p>
              <p className="text-sm text-slate-500">{new Date(session.startedAt).toLocaleString()}</p>
              {session.audioStorageKey ? <audio controls src={`/api/voice/audio/session/${session.id}`} className="mt-3 w-full" /> : <p className="mt-2 text-sm text-slate-500">No retained audio.</p>}
              {session.audioStorageKey ? <button onClick={() => deleteAudio(session.id)} className="mt-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Delete retained audio</button> : null}
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
