"use client";

import { useMemo, useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, optionButtonClass, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function HotTextWordItem({ item, itemId, disabled, onSubmit }: TEIItemComponentProps) {
  const pairs = item.bracketPairs || [];
  const [selections, setSelections] = useState<string[]>(() => pairs.map(() => ""));
  const [response, setResponse] = useState<StudentResponse | null>(null);
  const locked = disabled || Boolean(response);
  const chunks = useMemo(() => splitBracketSentence(item.sentence), [item.sentence]);

  function submit() {
    if (selections.some((selection) => !selection) || locked) return;
    setResponse(submitResponse(item, itemId, { selections }, onSubmit));
  }

  let pairIndex = -1;
  return (
    <ItemShell item={item}>
      <div className="rounded-2xl bg-slate-50 p-4 text-lg leading-10 text-slate-900 ring-1 ring-slate-200">
        {chunks.map((chunk, index) => {
          if (chunk.type === "text") return <span key={`${chunk.text}-${index}`}>{chunk.text}</span>;
          pairIndex += 1;
          const currentIndex = pairIndex;
          const pair = pairs[currentIndex] || { options: chunk.options, correct: "" };
          return (
            <span key={`${chunk.text}-${index}`} className="mx-1 inline-flex gap-1 align-middle">
              {(pair.options || chunk.options).map((option: string) => {
                const selected = selections[currentIndex] === option;
                const correct = Boolean(response) && normalizeText(option) === normalizeText(pair.correct);
                const wrong = Boolean(response) && selected && !correct;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={locked}
                    onClick={() => setSelections((previous) => previous.map((value, i) => i === currentIndex ? option : value))}
                    className={`rounded-lg border px-3 py-1 text-base font-black ${optionButtonClass(selected, locked, correct, wrong)}`}
                  >
                    {option}
                  </button>
                );
              })}
            </span>
          );
        })}
      </div>
      <SubmitButton disabled={selections.some((selection) => !selection) || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}

function splitBracketSentence(sentence: string) {
  const parts: Array<{ type: "text" | "pair"; text: string; options?: string[] }> = [];
  const regex = /\[\s*([^/\]]+)\s*\/\s*([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(String(sentence || "")))) {
    if (match.index > lastIndex) parts.push({ type: "text", text: sentence.slice(lastIndex, match.index) });
    parts.push({ type: "pair", text: match[0], options: [match[1].trim(), match[2].trim()] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < String(sentence || "").length) parts.push({ type: "text", text: String(sentence).slice(lastIndex) });
  return parts.length ? parts : [{ type: "text", text: String(sentence || "") }];
}
