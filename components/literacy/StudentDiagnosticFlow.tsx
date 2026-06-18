"use client";

import { useState } from "react";
import { BuddyCharacter } from "@/components/literacy/BuddyCharacter";
import { EhriPhaseBadge } from "@/components/literacy/EhriPhaseBadge";
import { LITERACY_STRANDS, PLACEHOLDER_PASSAGE, STRAND_LABELS } from "@/lib/literacy/constants";

export function StudentDiagnosticFlow({ voice = false }: { voice?: boolean }) {
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function completeDiagnostic() {
    setSaving(true);
    const responses = Object.fromEntries(LITERACY_STRANDS.map((strand, index) => [strand, 72 - index * 4]));
    const response = await fetch("/api/literacy/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses }),
    });
    const payload = await response.json();
    setResult(payload);
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Reading Buddy with Harper</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Standards-aligned diagnostic</h1>
            <p className="mt-2 max-w-2xl text-slate-600">A short baseline for striving readers. Passage, word, and comprehension content is marked as placeholder until the content pipeline supplies reviewed material.</p>
          </div>
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5">
            <p className="text-sm font-semibold text-slate-500">{PLACEHOLDER_PASSAGE}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {LITERACY_STRANDS.map((strand) => (
                <label key={strand} className="rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  {STRAND_LABELS[strand]}
                </label>
              ))}
            </div>
          </div>
          <button onClick={completeDiagnostic} disabled={saving} className="rounded-md bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Complete diagnostic"}
          </button>
          {result?.profile ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-bold text-emerald-900">Adult-facing result</p>
              <div className="mt-3">
                <EhriPhaseBadge phase={result.profile.ehriPhase} confidence={result.profile.ehriPhaseConfidence} />
              </div>
              <p className="mt-3 text-sm text-emerald-800">Lexile estimate: {result.profile.lexileEstimate}. Grade equivalent: {result.profile.gradeEquivalent}.</p>
            </div>
          ) : null}
        </section>
        <aside className="rounded-md border border-slate-200 bg-white p-5">
          <BuddyCharacter state={voice ? "listening" : "idle"} />
          <p className="mt-4 text-sm text-slate-600">{voice ? "Voice-first mode can be completed without reading on-screen instructions." : "Text-first mode uses the same data model as voice."}</p>
        </aside>
      </div>
    </main>
  );
}
