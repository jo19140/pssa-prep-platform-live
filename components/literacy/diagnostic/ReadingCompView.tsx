"use client";

import { useState } from "react";
import { ChoiceView } from "./ChoiceView";
import type { DiagnosticItemViewProps } from "./types";
import { promptOf, stimulusOf } from "./utils";

export function ReadingCompView(props: DiagnosticItemViewProps) {
  const prompt = promptOf(props.item.studentPromptJson);
  const stimulus = stimulusOf(props.item.stimulusJson);
  const [ready, setReady] = useState(false);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Read this. Then choose your answer."}</h1>
      {!ready ? (
        <>
          <div className="rounded-xl bg-white p-5 text-lg leading-8 text-slate-900 shadow-sm">{prompt.passageText || stimulus.passageText}</div>
          <button type="button" disabled={props.disabled} onClick={() => setReady(true)} className="rounded-lg bg-amber-700 px-5 py-3 font-black text-white disabled:opacity-50">
            I’m ready
          </button>
        </>
      ) : (
        <ChoiceView {...props} />
      )}
    </div>
  );
}

