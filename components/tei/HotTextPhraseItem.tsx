"use client";

import { useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, optionButtonClass, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function HotTextPhraseItem({ item, itemId, disabled, onSubmit }: TEIItemComponentProps) {
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [response, setResponse] = useState<StudentResponse | null>(null);
  const locked = disabled || Boolean(response);
  const maxSelect = Number(item.maxSelect || item.correctPhrases?.length || 1);
  const minSelect = Number(item.minSelect || 1);

  function toggle(phrase: string) {
    if (locked) return;
    setSelectedPhrases((previous) => {
      if (previous.includes(phrase)) return previous.filter((value) => value !== phrase);
      if (previous.length >= maxSelect) return previous;
      return [...previous, phrase];
    });
  }

  function submit() {
    if (selectedPhrases.length < minSelect || locked) return;
    setResponse(submitResponse(item, itemId, { selectedPhrases }, onSubmit));
  }

  return (
    <ItemShell item={{ ...item, passage: "" }}>
      <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-8 text-slate-800 ring-1 ring-slate-200">{renderSelectablePassage(item.passage, item.selectablePhrases || [], selectedPhrases, item.correctPhrases || [], locked, Boolean(response), toggle)}</p>
      <p className="mt-3 text-xs font-bold text-slate-500">Select {minSelect === maxSelect ? minSelect : `${minSelect}-${maxSelect}`} phrase{maxSelect === 1 ? "" : "s"}.</p>
      <SubmitButton disabled={selectedPhrases.length < minSelect || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}

function renderSelectablePassage(passage: string, phrases: string[], selected: string[], correctPhrases: string[], locked: boolean, submitted: boolean, toggle: (phrase: string) => void) {
  let remaining = String(passage || "");
  const nodes: React.ReactNode[] = [];
  phrases.forEach((phrase, index) => {
    const position = remaining.toLowerCase().indexOf(String(phrase).toLowerCase());
    if (position === -1) return;
    const before = remaining.slice(0, position);
    const match = remaining.slice(position, position + phrase.length);
    if (before) nodes.push(<span key={`text-${index}`}>{before}</span>);
    const isSelected = selected.includes(phrase);
    const correct = submitted && correctPhrases.some((correctPhrase) => normalizeText(correctPhrase) === normalizeText(phrase));
    const wrong = submitted && isSelected && !correct;
    nodes.push(
      <button
        key={`phrase-${phrase}-${index}`}
        type="button"
        disabled={locked}
        onClick={() => toggle(phrase)}
        className={`mx-1 rounded-lg border px-2 py-1 text-sm font-black ${optionButtonClass(isSelected, locked, correct, wrong)}`}
      >
        {match}
      </button>,
    );
    remaining = remaining.slice(position + phrase.length);
  });
  if (remaining) nodes.push(<span key="tail">{remaining}</span>);
  return nodes.length ? nodes : passage;
}
