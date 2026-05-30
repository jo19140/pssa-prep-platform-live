"use client";

import { BuddyAvatar } from "./BuddyAvatar";
import { DiagnosticCard } from "./DiagnosticCard";
import { MicButton } from "./MicButton";

export function MicCheckScreen({ onDone }: { onDone: () => void }) {
  return (
    <DiagnosticCard>
      <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
        <BuddyAvatar state="listening" />
        <div>
          <h1 className="text-3xl font-black text-slate-950">First, let’s check your microphone.</h1>
          <p className="mt-3 text-slate-700">Press the mic, say your name, then press stop.</p>
          <div className="mt-6">
            <MicButton label="Try the mic" stopLabel="Stop when you're done" onResult={onDone} />
          </div>
          <button type="button" onClick={onDone} className="mt-4 text-sm font-bold text-amber-800 underline">
            Skip mic check
          </button>
        </div>
      </div>
    </DiagnosticCard>
  );
}

