"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedbackPanel, ItemShell, SubmitButton, optionButtonClass, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function HotTextSentenceItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const sentences = useMemo(() => parseNumberedSentences(item.paragraph), [item.paragraph]);
  const [selectedSentenceNumber, setSelectedSentenceNumber] = useState<number | null>(() => initialResponse?.rawResponse?.selectedSentenceNumber || null);
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);

  useEffect(() => {
    setResponse(initialResponse || null);
    setSelectedSentenceNumber(initialResponse?.rawResponse?.selectedSentenceNumber || null);
  }, [initialResponse]);

  function submit() {
    if (!selectedSentenceNumber || locked) return;
    setResponse(submitResponse(item, itemId, { selectedSentenceNumber }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <div className="grid gap-2">
        {sentences.map((sentence) => {
          const selected = selectedSentenceNumber === sentence.number;
          const correct = Boolean(response) && sentence.number === Number(item.correctSentenceNumber);
          const wrong = Boolean(response) && selected && !correct;
          return (
            <button
              key={sentence.number}
              type="button"
              disabled={locked}
              onClick={() => setSelectedSentenceNumber(sentence.number)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold leading-6 ${optionButtonClass(selected, locked, correct, wrong)}`}
            >
              <span className="mr-2 font-black">({sentence.number})</span>
              {sentence.text}
            </button>
          );
        })}
      </div>
      <SubmitButton disabled={!selectedSentenceNumber || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}

function parseNumberedSentences(paragraph: string) {
  const matches = [...String(paragraph || "").matchAll(/\((\d+)\)\s*([^()]+?)(?=\s*\(\d+\)|$)/g)];
  if (matches.length) return matches.map((match) => ({ number: Number(match[1]), text: match[2].trim() }));
  return String(paragraph || "").split(/(?<=[.!?])\s+/).filter(Boolean).map((text, index) => ({ number: index + 1, text }));
}
