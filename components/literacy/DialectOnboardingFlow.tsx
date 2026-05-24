"use client";

import { useState } from "react";
import { DialectChip } from "@/components/literacy/DialectChip";
import { VoiceConsentExplainerCard } from "@/components/literacy/VoiceConsentExplainerCard";

const languages = ["English", "Spanish", "Arabic", "Mandarin"];
const dialects = ["AAE", "Southern", "Chicano English", "Caribbean English"];

export function DialectOnboardingFlow() {
  const [homeLanguages, setHomeLanguages] = useState<string[]>([]);
  const [regionalDialects, setRegionalDialects] = useState<string[]>([]);
  const [trainingCorpusOptedIn, setTrainingCorpusOptedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  async function submit(skipped = false) {
    await fetch("/api/literacy/dialect-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeLanguages, regionalDialects, skipped }),
    });
    await fetch("/api/voice/consent/self", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainingCorpusOptedIn }),
    }).catch(() => undefined);
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
              <button key={language} onClick={() => toggle(homeLanguages, language, setHomeLanguages)}><DialectChip label={language} selected={homeLanguages.includes(language)} /></button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold text-slate-900">Regional sound patterns</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dialects.map((dialect) => (
              <button key={dialect} onClick={() => toggle(regionalDialects, dialect, setRegionalDialects)}><DialectChip label={dialect} selected={regionalDialects.includes(dialect)} /></button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => submit(false)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Save</button>
          <button onClick={() => submit(true)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Skip</button>
        </div>
        {saved ? <p className="text-sm font-semibold text-emerald-700">Settings saved.</p> : null}
      </section>
      <section className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-6">
        <VoiceConsentExplainerCard />
        <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
          <input type="checkbox" checked={trainingCorpusOptedIn} onChange={(event) => setTrainingCorpusOptedIn(event.target.checked)} className="mt-1" />
          Yes, you can keep my child's recordings to improve the program.
        </label>
        <p className="text-sm text-slate-500">Skip for now is always valid. Training-corpus use is off unless a parent explicitly opts in.</p>
        <button onClick={() => submit(true)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Skip for now</button>
      </section>
    </main>
  );
}
