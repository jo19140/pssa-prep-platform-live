"use client";

import { useState } from "react";

export function CorpusExportPanel({ batches }: { batches: any[] }) {
  const [items, setItems] = useState(batches);
  async function createExport(purpose: string) {
    const response = await fetch("/api/voice/exports/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    });
    const payload = await response.json();
    if (response.ok) setItems([payload.batch, ...items]);
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Corpus exports</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {["EVAL_SET", "FINE_TUNE_TRAINING", "FINE_TUNE_VALIDATION"].map((purpose) => (
          <button key={purpose} onClick={() => createExport(purpose)} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">{purpose.replace(/_/g, " ")}</button>
        ))}
      </div>
      <section className="mt-6 space-y-2">
        {items.map((batch) => (
          <a key={batch.id} href={`/api/voice/exports/${batch.id}/manifest`} className="block rounded-md border border-slate-200 bg-white p-4">
            <p className="font-black text-slate-950">{batch.batchName}</p>
            <p className="text-sm text-slate-500">{batch.segmentCount} segments · {batch.exportPurpose}</p>
          </a>
        ))}
      </section>
    </main>
  );
}
