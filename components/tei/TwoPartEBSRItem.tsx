"use client";

import { useEffect, useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, optionButtonClass, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function TwoPartEBSRItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [partA, setPartA] = useState(() => initialResponse?.rawResponse?.partA || "");
  const [partB, setPartB] = useState<string[]>(() => initialResponse?.rawResponse?.partB || []);
  const [partAConfirmed, setPartAConfirmed] = useState(() => Boolean(initialResponse?.rawResponse?.partA));
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);

  useEffect(() => {
    setResponse(initialResponse || null);
    setPartA(initialResponse?.rawResponse?.partA || "");
    setPartB(initialResponse?.rawResponse?.partB || []);
    setPartAConfirmed(Boolean(initialResponse?.rawResponse?.partA));
  }, [initialResponse]);

  function toggleEvidence(choice: string) {
    if (locked) return;
    setPartB((previous) => previous.includes(choice) ? previous.filter((value) => value !== choice) : [...previous, choice]);
  }

  function submit() {
    if (!partA || !partB.length || locked) return;
    setResponse(submitResponse(item, itemId, { partA, partB }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="font-black text-slate-950">Part A: {item.partA?.question}</p>
        <div className="mt-3 grid gap-2">
          {(item.partA?.choices || []).map((choice: string) => {
            const selected = partA === choice;
            const correct = Boolean(response) && normalizeText(choice) === normalizeText(item.partA?.correctAnswer);
            const wrong = Boolean(response) && selected && !correct;
            return (
              <button key={choice} type="button" disabled={locked || partAConfirmed} onClick={() => setPartA(choice)} className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${optionButtonClass(selected, locked || partAConfirmed, correct, wrong)}`}>
                {choice}
              </button>
            );
          })}
        </div>
        {!partAConfirmed ? (
          <button type="button" disabled={!partA || locked} onClick={() => setPartAConfirmed(true)} className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            Continue to Part B
          </button>
        ) : null}
      </section>

      {partAConfirmed ? (
        <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="font-black text-slate-950">Part B: {item.partB?.question}</p>
          <div className="mt-3 grid gap-2">
            {(item.partB?.choices || []).map((choice: string) => {
              const checked = partB.includes(choice);
              const correct = Boolean(response) && (item.partB?.correctAnswers || []).some((answer: string) => normalizeText(answer) === normalizeText(choice));
              const wrong = Boolean(response) && checked && !correct;
              return (
                <label key={choice} className={`flex items-start gap-3 rounded-xl border p-3 text-sm font-bold ${correct ? "border-emerald-400 bg-emerald-50" : wrong ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white"}`}>
                  <input type="checkbox" className="mt-1" checked={checked} disabled={locked} onChange={() => toggleEvidence(choice)} />
                  <span>{choice}</span>
                </label>
              );
            })}
          </div>
          <SubmitButton disabled={!partB.length || disabled} submitted={Boolean(response)} onClick={submit} />
        </section>
      ) : null}
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}
