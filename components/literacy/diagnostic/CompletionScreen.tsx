"use client";

import { BuddyAvatar } from "./BuddyAvatar";
import { DiagnosticCard } from "./DiagnosticCard";

export function CompletionScreen({ onNext }: { onNext: () => void }) {
  return (
    <DiagnosticCard>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <BuddyAvatar state="idle" />
        <div>
          <h1 className="text-3xl font-black text-slate-950">All done for today.</h1>
          <p className="mt-3 text-slate-700">Harper has what they need to help plan your next reading practice.</p>
          <button type="button" onClick={onNext} className="mt-5 rounded-lg bg-slate-950 px-5 py-3 font-black text-white">
            What happens next
          </button>
        </div>
      </div>
    </DiagnosticCard>
  );
}

