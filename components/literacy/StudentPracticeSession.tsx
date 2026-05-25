"use client";

import { useState } from "react";
import { BuddyCharacter } from "@/components/literacy/BuddyCharacter";
import { PLACEHOLDER_PASSAGE } from "@/lib/literacy/constants";
import { getTtsProvider } from "@/lib/voice/tts";

export function StudentPracticeSession({ voice = false }: { voice?: boolean }) {
  const [state, setState] = useState<"idle" | "listening" | "speaking" | "confused">("idle");
  const [answerSaved, setAnswerSaved] = useState<"correct" | "try-again" | null>(null);
  async function speak() {
    setState("speaking");
    try {
      await getTtsProvider().speak("Today's Reading Buddy practice is ready. Content will come from the content pipeline.");
    } finally {
      setState("idle");
    }
  }
  async function submitAnswer(isCorrect: boolean) {
    await fetch("/api/literacy/item-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surface: voice ? "reading_buddy_voice_practice" : "reading_buddy_practice",
        itemId: "practice-placeholder-phonogram",
        itemType: "phonogram_placeholder",
        isCorrect,
        responseKind: isCorrect ? "marked_understood" : "marked_needs_help",
      }),
    });
    setAnswerSaved(isCorrect ? "correct" : "try-again");
  }
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <BuddyCharacter state={state} />
          <div className="mt-4 flex gap-2">
            <button onClick={speak} className="rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Speak</button>
            {voice ? <button onMouseDown={() => setState("listening")} onMouseUp={() => setState("idle")} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Hold mic</button> : null}
          </div>
        </section>
        <section className="space-y-4">
          <h1 className="text-3xl font-black text-slate-950">{voice ? "Voice practice" : "Daily practice"}</h1>
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5">
            <p className="font-semibold text-slate-700">{PLACEHOLDER_PASSAGE}</p>
            <p className="mt-4 text-sm text-slate-500">Word-splitting scaffolds will use sourced `PhonogramFamily` records after the content pipeline seed runs.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => submitAnswer(true)} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white">I got it</button>
              <button onClick={() => submitAnswer(false)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800">Need help</button>
            </div>
            {answerSaved ? (
              <p className="mt-3 text-sm font-semibold text-emerald-700">Practice response saved.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
