"use client";

import { BuddyAvatar } from "./BuddyAvatar";
import { DiagnosticCard } from "./DiagnosticCard";

export function WelcomeScreen({ hasResume, onResume, onStart, busy }: { hasResume: boolean; onResume: () => void; onStart: () => void; busy?: boolean }) {
  return (
    <DiagnosticCard>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <BuddyAvatar state="idle" />
        <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">Reading Buddy check-in</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Let’s see what feels easy and what needs practice.</h1>
          <p className="mt-3 max-w-2xl text-slate-700">Take your time. Harper will guide you through listening, reading, and answering.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {hasResume ? (
              <button type="button" onClick={onResume} disabled={busy} className="rounded-lg bg-amber-700 px-5 py-3 font-black text-white disabled:opacity-60">
                Keep going
              </button>
            ) : null}
            <button type="button" onClick={onStart} disabled={busy} className="rounded-lg bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">
              {hasResume ? "Start again" : "Start"}
            </button>
          </div>
        </div>
      </div>
    </DiagnosticCard>
  );
}

