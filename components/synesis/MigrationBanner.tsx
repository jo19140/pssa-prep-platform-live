"use client";

import { useState } from "react";

export function MigrationBanner({ show = true }: { show?: boolean }) {
  const [visible, setVisible] = useState(show);
  if (!visible) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-950">Sý Learning is here. Your Pennsylvania PSSA work is still in Test Prep.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-amber-900">
            <span className="rounded-md bg-white px-2 py-1">Your PSSA work · Test Prep tab</span>
            <span className="rounded-md bg-white px-2 py-1">What's new · Reading Buddy on Venus</span>
            <span className="rounded-md bg-white px-2 py-1">Your data · Untouched</span>
          </div>
        </div>
        <button onClick={() => setVisible(false)} className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-950">
          Dismiss
        </button>
      </div>
    </div>
  );
}
