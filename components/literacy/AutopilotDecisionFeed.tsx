"use client";

import { useState } from "react";

export function AutopilotDecisionFeed({
  decisions,
}: {
  decisions: Array<{ id: string; decisionType: string; summary: string; reasoning: string; appliedAt: Date | string; overriddenAt?: Date | string | null }>;
}) {
  const [items, setItems] = useState(decisions);
  async function overrideDecision(id: string) {
    const response = await fetch(`/api/literacy/autopilot-decisions/${id}/override`, { method: "POST" });
    if (!response.ok) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, overriddenAt: new Date().toISOString() } : item));
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">What the program did this week</h2>
      <div className="space-y-2">
        {items.length ? (
          items.map((decision) => (
            <article key={decision.id} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">{decision.decisionType.replace(/_/g, " ")}</p>
                {decision.overriddenAt ? (
                  <span className="text-xs font-semibold text-amber-700">Overridden</span>
                ) : (
                  <button onClick={() => overrideDecision(decision.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700">
                    Override
                  </button>
                )}
              </div>
              <p className="mt-1 font-bold text-slate-950">{decision.summary}</p>
              <p className="mt-2 text-sm text-slate-600">{decision.reasoning}</p>
            </article>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No autopilot decisions yet.</div>
        )}
      </div>
    </section>
  );
}
