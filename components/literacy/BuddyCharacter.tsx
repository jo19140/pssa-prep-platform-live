"use client";

import Image from "next/image";
import { DEFAULT_BUDDY_STATE_LABELS, type BuddyStateLabelMap } from "@/lib/literacy/presentationCopy";

export type BuddyState = "idle" | "listening" | "speaking" | "confused";

export function BuddyCharacter({
  state = "idle",
  name = "Reading Buddy",
  stateLabels = DEFAULT_BUDDY_STATE_LABELS,
  imageAlt = "Harper",
}: {
  state?: BuddyState;
  name?: string;
  stateLabels?: BuddyStateLabelMap;
  imageAlt?: string;
}) {
  const isActive = state === "listening" || state === "speaking";
  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 bg-white shadow-sm transition ${
          isActive ? "scale-105 border-amber-300 ring-4 ring-amber-100" : "border-slate-200"
        }`}
      >
        <Image
          src="/branding/harper-character-v1.png"
          alt={imageAlt}
          fill
          sizes="96px"
          priority
          className="object-contain p-1"
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{name}</p>
        <p className="text-lg font-black text-slate-950">{stateLabels[state]}</p>
      </div>
    </div>
  );
}
