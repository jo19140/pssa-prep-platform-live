"use client";

import { useRef, useState } from "react";
import { browserTts } from "@/lib/voice/tts";
import { MicButton } from "./MicButton";
import { AudioProblemButton } from "./DecodingCardView";
import type { DiagnosticItemViewProps } from "./types";
import { audioProblemPayload, noAttemptPayload, promptOf, responsePayload, stimulusOf } from "./utils";

export function PaItemView({ item, disabled, onSubmit }: DiagnosticItemViewProps) {
  const prompt = promptOf(item.studentPromptJson);
  const stimulus = stimulusOf(item.stimulusJson);
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef(Date.now()).current;

  async function play() {
    try {
      setPlaying(true);
      await browserTts.speak(stimulus.audioScript || prompt.kidPrompt || "", { rate: 0.9 });
      setPlayed(true);
    } catch {
      onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: "tts_failed" }));
    } finally {
      setPlaying(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Listen carefully."}</h1>
      <button type="button" disabled={disabled || playing} onClick={play} className="rounded-lg bg-amber-700 px-5 py-3 font-black text-white disabled:opacity-50">
        {played ? "Listen again" : "Listen"}
      </button>
      <p className="text-lg font-semibold text-slate-700">{prompt.readyPrompt || "When you’re ready, say your answer."}</p>
      <MicButton
        disabled={disabled}
        label="Start answer"
        stopLabel="Stop when you're done"
        onResult={(result) => {
          if (result.noAttempt) return onSubmit(noAttemptPayload({ itemId: item.id, startedAt }));
          if (result.clientIssue) return onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: result.clientIssue }));
          onSubmit(responsePayload({ itemId: item.id, startedAt, responseJson: { transcript: result.transcript }, audioConfidence: result.audioConfidence }));
        }}
      />
      <AudioProblemButton disabled={disabled} onClick={() => onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: "could_not_hear" }))} />
    </div>
  );
}
