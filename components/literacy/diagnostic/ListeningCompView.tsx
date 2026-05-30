"use client";

import { useRef, useState } from "react";
import { browserTts } from "@/lib/voice/tts";
import { AudioProblemButton } from "./DecodingCardView";
import { ChoiceView } from "./ChoiceView";
import type { DiagnosticItemViewProps } from "./types";
import { audioProblemPayload, promptOf, stimulusOf } from "./utils";

export function ListeningCompView({ item, disabled, onSubmit }: DiagnosticItemViewProps) {
  const prompt = promptOf(item.studentPromptJson);
  const stimulus = stimulusOf(item.stimulusJson);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef(Date.now()).current;

  async function play() {
    if (plays >= 2) return;
    try {
      setPlaying(true);
      await browserTts.speak(stimulus.audioScript || "", { rate: 0.92 });
      setPlays((count) => count + 1);
    } catch {
      onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: "tts_failed" }));
    } finally {
      setPlaying(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Listen to Harper read. Then choose your answer."}</h1>
      <button type="button" disabled={disabled || playing || plays >= 2} onClick={play} className="rounded-lg bg-amber-700 px-5 py-3 font-black text-white disabled:opacity-50">
        {plays === 0 ? "Play story" : "Play one more time"}
      </button>
      {plays > 0 ? <ChoiceView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      <AudioProblemButton disabled={disabled} onClick={() => onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: "could_not_hear" }))} />
    </div>
  );
}
