"use client";

export type BuddyState = "idle" | "listening" | "speaking" | "confused";

const labels: Record<BuddyState, string> = {
  idle: "Ready",
  listening: "Listening",
  speaking: "Speaking",
  confused: "Trying another clue",
};

export function BuddyCharacter({ state = "idle", name = "Reading Buddy" }: { state?: BuddyState; name?: string }) {
  const isActive = state === "listening" || state === "speaking";
  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative grid h-24 w-24 place-items-center rounded-full border-4 ${
          isActive ? "border-amber-300 bg-amber-100" : "border-slate-200 bg-white"
        }`}
      >
        <div className="h-12 w-12 rounded-full bg-slate-900" />
        <div className="absolute left-7 top-9 h-2 w-2 rounded-full bg-white" />
        <div className="absolute right-7 top-9 h-2 w-2 rounded-full bg-white" />
        {state === "confused" ? <div className="absolute bottom-6 h-1 w-8 rounded bg-slate-600" /> : <div className="absolute bottom-6 h-2 w-8 rounded-b-full border-b-4 border-white" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{name}</p>
        <p className="text-lg font-black text-slate-950">{labels[state]}</p>
      </div>
    </div>
  );
}
