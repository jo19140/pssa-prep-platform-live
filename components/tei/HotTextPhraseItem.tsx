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
    setResponse(submitResponse(item, itemId, { selectedPhrases: selectedPhrases.map(phraseFromOccurrenceKey) }, onSubmit));
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
  const text = String(passage || "");
  const matches = findPhraseMatches(text, phrases);
  const matchedPhrases = new Set(matches.map((match) => normalizeText(match.phrase)));
  phrases.forEach((phrase) => {
    if (!matchedPhrases.has(normalizeText(phrase))) {
      console.warn("HotTextPhraseItem selectable phrase was not found in passage", { phrase });
    }
  });
  if (!matches.length) return passage;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.start > cursor) nodes.push(<span key={`text-${index}`}>{text.slice(cursor, match.start)}</span>);
    const selectedKey = occurrenceKey(match.phrase, match.start);
    const isSelected = selected.includes(selectedKey);
    const correct = submitted && correctPhrases.some((correctPhrase) => normalizeText(correctPhrase) === normalizeText(match.phrase));
    const wrong = submitted && isSelected && !correct;
    nodes.push(
      <button
        key={`phrase-${match.phrase}-${match.start}`}
        type="button"
        disabled={locked}
        onClick={() => toggle(selectedKey)}
        className={`mx-1 rounded-lg border px-2 py-1 text-sm font-black ${optionButtonClass(isSelected, locked, correct, wrong)}`}
      >
        {match.text}
      </button>,
    );
    cursor = match.end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return nodes.length ? nodes : passage;
}

function findPhraseMatches(passage: string, phrases: string[]) {
  const matches: Array<{ phrase: string; text: string; start: number; end: number }> = [];
  const sortedPhrases = [...phrases].sort((a, b) => String(b).length - String(a).length);

  sortedPhrases.forEach((phrase) => {
    const matcher = phraseMatcher(phrase);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(passage))) {
      const start = match.index;
      const end = matcher.lastIndex;
      const overlaps = matches.some((existing) => start < existing.end && end > existing.start);
      if (!overlaps) matches.push({ phrase, text: passage.slice(start, end), start, end });
      if (matcher.lastIndex === match.index) matcher.lastIndex += 1;
    }
  });

  return matches.sort((a, b) => a.start - b.start);
}

function phraseMatcher(phrase: string) {
  const tokens = String(phrase || "").trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  const pattern = tokens.join("[\\s\\p{P}\\p{S}]+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "giu");
}

function occurrenceKey(phrase: string, start: number) {
  return `${normalizeText(phrase)}@@${start}`;
}

function phraseFromOccurrenceKey(key: string) {
  return key.split("@@")[0] || key;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
