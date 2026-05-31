"use client";

import type { DiagnosticItemViewProps } from "./types";
import { choicesFrom, promptOf, responsePayload } from "./utils";
import { useRef } from "react";

export function ChoiceView({ item, disabled, onSubmit }: DiagnosticItemViewProps) {
  const prompt = promptOf(item.studentPromptJson);
  const choices = choicesFrom(item.studentPromptJson);
  const startedAt = useRef(Date.now()).current;
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-950">{prompt.kidPrompt || "Choose the best answer."}</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {choices.map((choice) => (
          <button
            type="button"
            key={choice}
            disabled={disabled}
            onClick={() => onSubmit(responsePayload({ itemId: item.id, startedAt, responseJson: { selectedChoice: choice, answer: choice } }))}
            className="min-h-20 rounded-xl border border-orange-200 bg-white px-4 py-4 text-left text-lg font-black text-slate-900 shadow-sm hover:border-amber-500 disabled:opacity-50"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
