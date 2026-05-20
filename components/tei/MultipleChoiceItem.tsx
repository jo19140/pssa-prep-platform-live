"use client";

import { useEffect, useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, optionButtonClass, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function MultipleChoiceItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [selected, setSelected] = useState(() => initialResponse?.rawResponse?.selected || "");
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);

  useEffect(() => {
    setResponse(initialResponse || null);
    setSelected(initialResponse?.rawResponse?.selected || "");
  }, [initialResponse]);

  function submit() {
    if (!selected || locked) return;
    setResponse(submitResponse(item, itemId, { selected }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <div className="grid gap-2">
        {(item.choices || []).map((choice: string) => {
          const isSelected = selected === choice;
          const correct = Boolean(response) && normalizeText(choice) === normalizeText(item.correctAnswer);
          const wrong = Boolean(response) && isSelected && !correct;
          return (
            <button
              key={choice}
              type="button"
              disabled={locked}
              onClick={() => setSelected(choice)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${optionButtonClass(isSelected, locked, correct, wrong)}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <SubmitButton disabled={!selected || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}
