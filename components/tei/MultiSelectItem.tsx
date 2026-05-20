"use client";

import { useEffect, useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function MultiSelectItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(() => initialResponse?.rawResponse?.selectedAnswers || []);
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);
  const minSelect = Number(item.minSelect || 1);
  const maxSelect = Number(item.maxSelect || item.correctAnswers?.length || 1);

  useEffect(() => {
    setResponse(initialResponse || null);
    setSelectedAnswers(initialResponse?.rawResponse?.selectedAnswers || []);
  }, [initialResponse]);

  function toggle(choice: string) {
    if (locked) return;
    setSelectedAnswers((previous) => {
      if (previous.includes(choice)) return previous.filter((value) => value !== choice);
      if (previous.length >= maxSelect) return previous;
      return [...previous, choice];
    });
  }

  function submit() {
    if (selectedAnswers.length < minSelect || locked) return;
    setResponse(submitResponse(item, itemId, { selectedAnswers }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <div className="grid gap-2">
        {(item.choices || []).map((choice: string) => {
          const checked = selectedAnswers.includes(choice);
          const correct = Boolean(response) && (item.correctAnswers || []).some((answer: string) => normalizeText(answer) === normalizeText(choice));
          const wrong = Boolean(response) && checked && !correct;
          return (
            <label key={choice} className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-bold ${correct ? "border-emerald-400 bg-emerald-50" : wrong ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" className="mt-1" checked={checked} disabled={locked || (!checked && selectedAnswers.length >= maxSelect)} onChange={() => toggle(choice)} />
              <span>{choice}</span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">Choose {minSelect === maxSelect ? minSelect : `${minSelect}-${maxSelect}`} answer{maxSelect === 1 ? "" : "s"}.</p>
      <SubmitButton disabled={selectedAnswers.length < minSelect || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}
