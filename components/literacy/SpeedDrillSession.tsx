"use client";

import { useState } from "react";
import { SpeedDrillTimer } from "@/components/literacy/SpeedDrillTimer";
import { TODO_CONTENT_NOTE } from "@/lib/literacy/constants";

export function SpeedDrillSession() {
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wordResults, setWordResults] = useState<Record<string, "correct" | "missed">>({});
  const words = ["make", "take", "cake", "lake", "shake"];
  async function submitWord(word: string, isCorrect: boolean) {
    await fetch("/api/literacy/item-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surface: "reading_buddy_speed_drill",
        itemId: `speed-drill-${word}`,
        itemType: "phonogram_word_placeholder",
        isCorrect,
        responseKind: isCorrect ? "read_correctly" : "missed",
      }),
    });
    setWordResults((current) => ({ ...current, [word]: isCorrect ? "correct" : "missed" }));
  }
  async function save() {
    await fetch("/api/literacy/speed-drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordsRead: 18, wordsCorrect: 15, wordsSelfCorrected: 2, wordsMissed: 1, durationSeconds: 60 }),
    });
    setSaved(true);
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Speed drill</h1>
      <div className="mt-6 flex items-center gap-6 rounded-md border border-slate-200 bg-white p-6">
        <SpeedDrillTimer running={running} />
        <div>
          <p className="font-semibold text-slate-700">{TODO_CONTENT_NOTE}</p>
          <p className="mt-1 text-sm text-slate-500">In v1, drill rows are placeholders until developing-tier phonograms are seeded.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {words.map((word) => (
              <div key={word} className="rounded-md border border-slate-200 p-3">
                <p className="font-black text-slate-950">{word}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => submitWord(word, true)} className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-bold text-white">Correct</button>
                  <button onClick={() => submitWord(word, false)} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800">Missed</button>
                </div>
                {wordResults[word] ? <p className="mt-2 text-xs font-semibold text-emerald-700">Saved as {wordResults[word]}.</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setRunning(true)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Start</button>
            <button onClick={save} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Save sample run</button>
          </div>
          {saved ? <p className="mt-3 text-sm font-semibold text-emerald-700">VoiceSession saved with 90-day service retention.</p> : null}
        </div>
      </div>
    </main>
  );
}
