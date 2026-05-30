"use client";

import { MicButton } from "./MicButton";
import { useRef } from "react";
import { AudioProblemButton } from "./DecodingCardView";
import type { DiagnosticItemViewProps } from "./types";
import { audioProblemPayload, noAttemptPayload, promptOf, responsePayload, stimulusOf } from "./utils";

export function FluencyPassageView({ item, disabled, onSubmit }: DiagnosticItemViewProps) {
  const prompt = promptOf(item.studentPromptJson);
  const stimulus = stimulusOf(item.stimulusJson);
  const startedAt = useRef(Date.now()).current;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Read this out loud."}</h1>
      <div className="rounded-xl bg-white p-5 text-lg leading-8 text-slate-900 shadow-sm">{prompt.passageText || stimulus.passageText}</div>
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
