"use client";

import { useMemo, useState } from "react";
import type { PssaStudentItemDto } from "@/lib/content/pssaStudentDto";

export type InlineDropdownDto = PssaStudentItemDto<"INLINE_DROPDOWN">;
export type InlineDropdownResponsePayload = { blankSelections: Record<string, number> };
export type InlineDropdownChange = { response: InlineDropdownResponsePayload; isComplete: boolean };

type Props = {
  item: InlineDropdownDto;
  onChange?: (change: InlineDropdownChange) => void;
};

export function isInlineDropdownComplete(item: InlineDropdownDto, blankSelections: Record<string, number>) {
  return item.responseSpec.blanks.every((blank) => typeof blankSelections[blank.blankId] === "number");
}

export function buildInlineDropdownResponse(blankSelections: Record<string, number>): InlineDropdownResponsePayload {
  return { blankSelections: { ...blankSelections } };
}

export function splitInlineDropdownText(item: InlineDropdownDto) {
  const { baseTextWithBlanks, blanks } = item.responseSpec;
  const byMarker = baseTextWithBlanks.split("___");
  if (byMarker.length === blanks.length + 1) return byMarker;
  const sorted = [...blanks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const parts: string[] = [];
  let cursor = 0;
  for (const blank of sorted) {
    const position = Math.max(cursor, blank.position ?? cursor);
    parts.push(baseTextWithBlanks.slice(cursor, position));
    cursor = position;
  }
  parts.push(baseTextWithBlanks.slice(cursor));
  return parts.length === blanks.length + 1 ? parts : [baseTextWithBlanks, ...Array.from({ length: blanks.length }, () => "")];
}

export function InlineDropdownItem({ item, onChange }: Props) {
  const { responseSpec } = item;
  const [blankSelections, setBlankSelections] = useState<Record<string, number>>({});
  const parts = useMemo(() => splitInlineDropdownText(item), [item]);
  const answeredCount = responseSpec.blanks.filter((blank) => typeof blankSelections[blank.blankId] === "number").length;
  const isComplete = answeredCount === responseSpec.blanks.length;

  function selectBlank(blankId: string, value: string) {
    const next = { ...blankSelections };
    if (value === "") delete next[blankId];
    else next[blankId] = Number(value);
    setBlankSelections(next);
    onChange?.({ response: buildInlineDropdownResponse(next), isComplete: isInlineDropdownComplete(item, next) });
  }

  return (
    <section className="space-y-4" aria-label="Inline dropdown item">
      <div>
        <div className="text-xs font-bold uppercase text-emerald-700">Inline Dropdown</div>
        <h2 className="mt-1 break-words text-lg font-extrabold leading-snug text-slate-950">{responseSpec.stem}</h2>
        {responseSpec.instructionText ? <p className="mt-2 inline-block border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-900">{responseSpec.instructionText}</p> : null}
      </div>
      <p className="break-words text-base leading-10 text-slate-950 md:text-lg">
        {responseSpec.blanks.map((blank, index) => (
          <span key={blank.blankId}>
            <span>{parts[index]}</span>
            <span className="inline-flex max-w-full min-w-0 items-baseline whitespace-normal px-1 align-baseline">
              <select
                aria-label={`Blank ${index + 1} of ${responseSpec.blanks.length}`}
                value={typeof blankSelections[blank.blankId] === "number" ? String(blankSelections[blank.blankId]) : ""}
                onChange={(event) => selectBlank(blank.blankId, event.target.value)}
                className={`min-w-0 max-w-full border-2 bg-white px-2 py-1 text-base font-bold text-slate-950 outline-offset-2 focus:outline focus:outline-2 focus:outline-cyan-300 ${typeof blankSelections[blank.blankId] === "number" ? "border-slate-950" : "border-slate-300"}`}
                style={{ width: "min(14rem, calc(100vw - 4rem))" }}
              >
                <option value="">Choose...</option>
                {blank.options.map((option, optionIndex) => (
                  <option key={`${blank.blankId}-${optionIndex}`} value={optionIndex}>{option.text}</option>
                ))}
              </select>
            </span>
          </span>
        ))}
        <span>{parts[responseSpec.blanks.length]}</span>
      </p>
      <p className="text-sm font-bold text-slate-700" aria-live="polite">
        {isComplete ? `All ${responseSpec.blanks.length} blanks answered` : `${answeredCount} of ${responseSpec.blanks.length} blanks answered`}
      </p>
    </section>
  );
}
