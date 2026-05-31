"use client";

import { BuddyAvatar } from "./BuddyAvatar";
import { DiagnosticCard } from "./DiagnosticCard";
import { MicButton } from "./MicButton";

export function PracticeItemScreen({ onDone }: { onDone: () => void }) {
  return (
    <DiagnosticCard>
      <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
        <BuddyAvatar state="speaking" />
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">Practice</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">This one doesn’t count.</h1>
          <p className="mt-3 text-slate-700">Say: “I am ready.” Then we’ll begin.</p>
          <div className="mt-6">
            <MicButton label="Practice talking" stopLabel="Done practicing" onResult={onDone} />
          </div>
        </div>
      </div>
    </DiagnosticCard>
  );
}
