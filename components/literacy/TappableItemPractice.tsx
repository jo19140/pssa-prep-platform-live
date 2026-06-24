"use client";

import { formatCopy } from "@/lib/literacy/formatCopy";
import type { PresentationCopy, PresentationTheme } from "@/lib/literacy/presentationCopy";
import type { TappableItem } from "@/lib/literacy/tappableItem";
import { useState } from "react";

export function TappableItemPractice({
  items,
  copy,
  theme,
  onSpeak,
  completeLabel,
  completeDisabledLabel,
  onComplete,
}: {
  items: TappableItem[];
  copy: PresentationCopy;
  theme?: PresentationTheme;
  onSpeak: (text: string) => Promise<void>;
  completeLabel: string;
  completeDisabledLabel: string;
  onComplete: (heardCount: number) => void;
}) {
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const heardCount = items.filter((item) => heard[item.id]).length;
  const allHeard = items.length > 0 && heardCount === items.length;

  async function hearItem(item: TappableItem) {
    setHeard((state) => ({ ...state, [item.id]: true }));
    await onSpeak(item.utterance);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => hearItem(item)}
            className={`rounded-3xl border-2 p-5 text-center transition ${
              heard[item.id] ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-[#ead9c2] bg-[#fffdf8] text-slate-950"
            }`}
          >
            <span className="block text-3xl font-black">{item.label}</span>
            <span className="mt-2 inline-block rounded-full bg-white px-2 py-1 text-xs font-black text-amber-800">
              {heard[item.id] ? copy.tappablePractice.heardBadge : item.helper}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#ead9c2] bg-white px-3 py-2 text-xs font-black text-slate-600">
          {formatCopy(copy.tappablePractice.heardCounter, { done: String(heardCount), total: String(items.length) })}
        </span>
        <button
          onClick={() => onComplete(heardCount)}
          disabled={!allHeard}
          className={theme?.cards.primaryAction ?? "rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"}
        >
          {allHeard ? completeLabel : completeDisabledLabel}
        </button>
      </div>
    </div>
  );
}
