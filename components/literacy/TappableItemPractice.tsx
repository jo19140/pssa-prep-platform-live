"use client";

import { formatCopy } from "@/lib/literacy/formatCopy";
import type { PresentationCopy, PresentationTheme } from "@/lib/literacy/presentationCopy";
import type { TappableItem } from "@/lib/literacy/tappableItem";
import { useEffect, useMemo, useRef, useState } from "react";

type BaseTappableItemPracticeProps = {
  items: TappableItem[];
  copy: PresentationCopy;
  theme?: PresentationTheme;
  onSpeak: (text: string) => Promise<void>;
  interactionDisabled?: boolean;
};

type TappableItemPracticeProps = BaseTappableItemPracticeProps & (
  | {
      hideCompleteButton?: false;
      completeLabel: string;
      completeDisabledLabel: string;
      onComplete: (heardCount: number) => void;
      onAllHeard?: never;
    }
  | {
      hideCompleteButton: true;
      onAllHeard: () => void;
      completeLabel?: never;
      completeDisabledLabel?: never;
      onComplete?: never;
    }
);

export function itemSetKeyFor(items: TappableItem[]) {
  return items.map((item) => item.id).join("\u001f");
}

export function nextTappableHeardState({
  items,
  heard,
  itemId,
  firedItemSetKey,
}: {
  items: TappableItem[];
  heard: Record<string, boolean>;
  itemId: string;
  firedItemSetKey: string | null;
}) {
  const itemSetKey = itemSetKeyFor(items);
  const nextHeard = { ...heard, [itemId]: true };
  const heardCount = items.filter((item) => nextHeard[item.id]).length;
  const allHeard = items.length > 0 && heardCount === items.length;
  return {
    heard: nextHeard,
    heardCount,
    allHeard,
    itemSetKey,
    shouldFireAllHeard: allHeard && firedItemSetKey !== itemSetKey,
  };
}

export function shouldBlockTappableInteraction({
  hideCompleteButton,
  interactionDisabled,
  speakInFlight,
}: {
  hideCompleteButton: boolean;
  interactionDisabled: boolean;
  speakInFlight: boolean;
}) {
  return hideCompleteButton && (interactionDisabled || speakInFlight);
}

export function TappableItemPractice({
  items,
  copy,
  theme,
  onSpeak,
  interactionDisabled = false,
  hideCompleteButton,
  completeLabel,
  completeDisabledLabel,
  onComplete,
  onAllHeard,
}: TappableItemPracticeProps) {
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const itemSetKey = useMemo(() => itemSetKeyFor(items), [items]);
  const speakInFlightRef = useRef(false);
  const firedAllHeardKeyRef = useRef<string | null>(null);
  const heardCount = items.filter((item) => heard[item.id]).length;
  const allHeard = items.length > 0 && heardCount === items.length;

  useEffect(() => {
    setHeard({});
    speakInFlightRef.current = false;
    firedAllHeardKeyRef.current = null;
  }, [itemSetKey]);

  async function hearItem(item: TappableItem) {
    const guardedInteraction = hideCompleteButton === true;
    if (
      shouldBlockTappableInteraction({
        hideCompleteButton: guardedInteraction,
        interactionDisabled,
        speakInFlight: speakInFlightRef.current,
      })
    ) {
      return;
    }
    if (guardedInteraction) speakInFlightRef.current = true;
    const next = nextTappableHeardState({
      items,
      heard,
      itemId: item.id,
      firedItemSetKey: firedAllHeardKeyRef.current,
    });
    setHeard(next.heard);
    try {
      await onSpeak(item.utterance);
    } finally {
      if (guardedInteraction) speakInFlightRef.current = false;
    }
    if (guardedInteraction && next.shouldFireAllHeard) {
      firedAllHeardKeyRef.current = next.itemSetKey;
      onAllHeard();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => hearItem(item)}
            disabled={interactionDisabled}
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
      <div className={`mt-auto flex flex-wrap items-center gap-3 ${hideCompleteButton ? "justify-center" : ""}`}>
        <span className="rounded-full border border-[#ead9c2] bg-white px-3 py-2 text-xs font-black text-slate-600">
          {formatCopy(copy.tappablePractice.heardCounter, { done: String(heardCount), total: String(items.length) })}
        </span>
        {hideCompleteButton ? null : (
          <button
            type="button"
            onClick={() => onComplete(heardCount)}
            disabled={!allHeard}
            className={theme?.cards.primaryAction ?? "rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"}
          >
            {allHeard ? completeLabel : completeDisabledLabel}
          </button>
        )}
      </div>
    </div>
  );
}
