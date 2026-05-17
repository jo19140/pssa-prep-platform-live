"use client";

import { useState } from "react";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function InlineDropdownItem({ item, itemId, disabled, onSubmit }: TEIItemComponentProps) {
  const [selectedOption, setSelectedOption] = useState("");
  const [response, setResponse] = useState<StudentResponse | null>(null);
  const locked = disabled || Boolean(response);
  const [before, after] = String(item.sentence || "").split("[BLANK]");

  function submit() {
    if (!selectedOption || locked) return;
    setResponse(submitResponse(item, itemId, { selectedOption }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <div className="rounded-2xl bg-slate-50 p-4 text-lg leading-8 text-slate-900 ring-1 ring-slate-200">
        <span>{before}</span>
        <select
          aria-label="Choose the best option for the blank"
          value={selectedOption}
          disabled={locked}
          onChange={(event) => setSelectedOption(event.target.value)}
          className={`mx-2 rounded-lg border px-3 py-2 text-base font-black ${response && normalizeText(selectedOption) !== normalizeText(item.correctOption) ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white"}`}
        >
          <option value="">Choose</option>
          {(item.dropdownOptions || []).map((option: string) => <option key={option} value={option}>{option}</option>)}
        </select>
        <span>{after}</span>
      </div>
      <SubmitButton disabled={!selectedOption || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}
