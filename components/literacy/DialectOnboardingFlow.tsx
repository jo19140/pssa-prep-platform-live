"use client";

import { useState } from "react";
import { DialectChip } from "@/components/literacy/DialectChip";
import { VoiceConsentExplainerCard } from "@/components/literacy/VoiceConsentExplainerCard";

const languages = ["English", "Spanish", "Arabic", "Mandarin"];
const dialects = ["AAE", "Southern", "Chicano English", "Caribbean English"];

export function DialectOnboardingFlow() {
  const [homeLanguages, setHomeLanguages] = useState<string[]>([]);
  const [regionalDialects, setRegionalDialects] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentConfirmationRequested, setParentConfirmationRequested] = useState(false);
  async function submit(skipped = false) {
    setError(null);
    setSaved(false);
    const response = await fetch("/api/literacy/dialect-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeLanguages, regionalDialects, skipped }),
    });
    if (!response.ok) {
      setError("We couldn't save listening settings. Please try again.");
      return;
    }
    setSaved(true);
  }
  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Listening settings</h1>
      <p className="mt-2 text-slate-600">Families can share language and dialect patterns explicitly. Reading Buddy never auto-detects dialect and only uses settings families choose.</p>
      <section className="mt-6 space-y-5 rounded-md border border-slate-200 bg-white p-6">
        <div>
          <p className="font-bold text-slate-900">Home languages</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {languages.map((language) => (
              <button key={language} type="button" aria-pressed={homeLanguages.includes(language)} onClick={() => toggle(homeLanguages, language, setHomeLanguages)}><DialectChip label={language} selected={homeLanguages.includes(language)} /></button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold text-slate-900">Regional sound patterns</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dialects.map((dialect) => (
              <button key={dialect} type="button" aria-pressed={regionalDialects.includes(dialect)} onClick={() => toggle(regionalDialects, dialect, setRegionalDialects)}><DialectChip label={dialect} selected={regionalDialects.includes(dialect)} /></button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => submit(false)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Save</button>
          <button onClick={() => submit(true)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Skip</button>
        </div>
        {saved ? <p className="text-sm font-semibold text-emerald-700">Listening settings saved.</p> : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      </section>
      <section className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-6">
        <VoiceConsentExplainerCard />
        <p className="text-sm font-semibold text-slate-800">Training-corpus recording use requires a parent or guardian to opt in from Data settings.</p>
        <button
          type="button"
          onClick={() => setParentConfirmationRequested(true)}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          Ask a parent to confirm
        </button>
        {parentConfirmationRequested ? (
          <p className="text-sm font-semibold text-amber-700">Training use is still off. A parent can turn it on later from Data settings.</p>
        ) : null}
        <p className="text-sm text-slate-500">Skip for now is always valid. Training-corpus use is off unless a parent explicitly opts in.</p>
        <button onClick={() => submit(true)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Skip for now</button>
      </section>
    </main>
  );
}
