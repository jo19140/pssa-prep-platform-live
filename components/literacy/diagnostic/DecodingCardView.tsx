"use client";

import { MicButton } from "./MicButton";
import { useRef } from "react";
import type { DiagnosticItemViewProps } from "./types";
import { promptOf, responsePayload, noAttemptPayload, audioProblemPayload } from "./utils";

export function DecodingCardView({ item, disabled, onSubmit }: DiagnosticItemViewProps) {
  const prompt = promptOf(item.studentPromptJson);
  const startedAt = useRef(Date.now()).current;
  const displayText = prompt.displayText || "";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Read this word out loud."}</h1>
      <div className="mx-auto w-full max-w-xs rounded-xl border border-orange-200 bg-white px-6 py-10 text-center text-6xl font-black tracking-tight text-slate-950 shadow-sm">{displayText}</div>
      <MicButton
        disabled={disabled}
        label="Start reading"
        stopLabel="Stop when you're done"
        onResult={(result) => {
          if (result.noAttempt) return onSubmit(noAttemptPayload({ itemId: item.id, startedAt }));
          if (result.clientIssue) return onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: result.clientIssue }));
          onSubmit(responsePayload({ itemId: item.id, startedAt, responseJson: { transcript: result.transcript }, audioConfidence: result.audioConfidence }));
        }}
      />
      <AudioProblemButton disabled={disabled} onClick={() => onSubmit(audioProblemPayload({ itemId: item.id, startedAt, clientIssue: "mic_problem" }))} />
    </div>
  );
}

export function AudioProblemButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="mx-auto block text-sm font-bold text-amber-800 underline disabled:opacity-50">
      Something went wrong with the sound
    </button>
  );
}
