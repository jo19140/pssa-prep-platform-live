"use client";

import { useEffect, useState } from "react";
import { MiscueTagPicker } from "@/components/admin/voice/MiscueTagPicker";
import { MISCUE_TYPE_VALUES } from "@/lib/voice/miscueTypes";

export function LabelingWorkspace({ segment, audioUrl }: { segment: any; audioUrl: string }) {
  const [humanTranscript, setHumanTranscript] = useState(segment.humanTranscript || segment.asrTranscript || "");
  const [miscueType, setMiscueType] = useState(segment.miscueType || "CORRECT");
  const [isEvalSet, setIsEvalSet] = useState(Boolean(segment.isEvalSet));
  const [notes, setNotes] = useState(segment.labelerNotes || "");
  const [message, setMessage] = useState("");
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.key === "Enter") submit();
      if (event.metaKey && event.key.toLowerCase() === "e") setIsEvalSet((value) => !value);
      if (/^[1-9]$/.test(event.key)) setMiscueType(MISCUE_TYPE_VALUES[Number(event.key) - 1] || miscueType);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  async function submit() {
    const response = await fetch(`/api/voice/labeling/segment/${segment.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ humanTranscript, miscueType, isEvalSet, labelerNotes: notes }),
    });
    setMessage(response.ok ? "Label saved." : "Could not save label.");
  }
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Label voice segment</h1>
        <p className="mt-2 text-sm text-slate-500">Shortcuts: Space play/pause, J/K previous/next, 1-9 tag, Cmd+Enter submit, Cmd+E eval set.</p>
      </div>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <audio controls src={audioUrl} className="w-full" />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-950">Expected text</h2>
          <p className="mt-3 leading-7 text-slate-700">{segment.expectedText}</p>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-950">ASR transcript</h2>
          <p className="mt-3 leading-7 text-slate-700">{segment.asrTranscript}</p>
        </section>
      </div>
      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <label className="block text-sm font-bold text-slate-700">Human transcript</label>
        <textarea value={humanTranscript} onChange={(event) => setHumanTranscript(event.target.value)} className="min-h-32 w-full rounded-md border border-slate-300 p-3" />
        <MiscueTagPicker value={miscueType} onChange={setMiscueType} />
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={isEvalSet} onChange={(event) => setIsEvalSet(event.target.checked)} />
          Eval set
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Labeler notes" className="min-h-24 w-full rounded-md border border-slate-300 p-3" />
        <button onClick={submit} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Submit label</button>
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      </section>
    </main>
  );
}
