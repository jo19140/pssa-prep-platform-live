"use client";

import { useState } from "react";
import { VoiceConsentExplainerCard } from "@/components/literacy/VoiceConsentExplainerCard";

export function VoiceConsentSettings({ studentUserId, consent }: { studentUserId: string; consent: any }) {
  const [state, setState] = useState(consent);
  const [message, setMessage] = useState("");
  async function save(patch: Record<string, unknown>) {
    setMessage("");
    const response = await fetch(`/api/voice/consent/${studentUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = await response.json();
    if (response.ok) {
      setState(payload.consent);
      setMessage("Data settings saved.");
    } else {
      setMessage(payload.error || "Could not save data settings.");
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Reading Buddy with Harper</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Data settings</h1>
      </div>
      <VoiceConsentExplainerCard />
      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-950">Keep recordings for service use</h2>
            <p className="mt-1 text-sm text-slate-600">Default on. Parents can turn this off; sessions still process live, but no audio is saved.</p>
          </div>
          <button onClick={() => save({ serviceAudioRetained: !state.serviceAudioRetained })} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            {state.serviceAudioRetained ? "On" : "Off"}
          </button>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Retention</p>
          <div className="mt-2 flex gap-2">
            {[30, 60, 90].map((days) => (
              <button key={days} onClick={() => save({ serviceAudioRetentionDays: days })} className={`rounded-md px-3 py-2 text-sm font-bold ${state.serviceAudioRetentionDays === days ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-800"}`}>
                {days} days
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-950">Keep learning events for service use</h2>
            <p className="mt-1 text-sm text-slate-600">Default on. This keeps answer, lesson, and progress signals briefly so the platform can support mastery and growth.</p>
          </div>
          <button onClick={() => save({ generalDataRetained: !state.generalDataRetained })} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            {state.generalDataRetained ? "On" : "Off"}
          </button>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Retention</p>
          <div className="mt-2 flex gap-2">
            {[30, 60, 90].map((days) => (
              <button key={days} onClick={() => save({ generalDataRetentionDays: days })} className={`rounded-md px-3 py-2 text-sm font-bold ${state.generalDataRetentionDays === days ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-800"}`}>
                {days} days
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-950">Help Sý Learning improve future learning support.</h2>
        <p className="text-sm text-slate-600">With your permission, we will keep eligible data longer than the service window and use it to improve the platform. This is off by default.</p>
        <button onClick={() => save({ trainingCorpusOptedIn: !state.trainingCorpusOptedIn })} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          {state.trainingCorpusOptedIn ? "Training use opted in" : "Opt in to training use"}
        </button>
        {state.trainingPurgeExpectedBy ? <p className="text-sm font-semibold text-amber-700">Purge in progress. Completes by {new Date(state.trainingPurgeExpectedBy).toLocaleDateString()}.</p> : null}
      </section>
      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-950">Allow anonymized recordings in published research?</h2>
        <p className="text-sm text-slate-600">This is separate from improving Reading Buddy and remains off unless you choose it here.</p>
        <button onClick={() => save({ researchPublicationOptedIn: !state.researchPublicationOptedIn })} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">
          {state.researchPublicationOptedIn ? "Research use opted in" : "Opt in to research use"}
        </button>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-black text-slate-950">Decision history</h2>
        <div className="mt-3 space-y-2">
          {(state.decisionLog || []).map((decision: any) => (
            <div key={decision.id} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-bold">{decision.changeType.replace(/_/g, " ")}</span> · {new Date(decision.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </section>
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
    </main>
  );
}
