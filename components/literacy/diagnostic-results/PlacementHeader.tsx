import type { DiagnosticResultsViewModel } from "./types";

export function PlacementHeader({ result }: { result: DiagnosticResultsViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Diagnostic results</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">{result.placement.phase}</h1>
      <p className="mt-3 max-w-3xl text-base text-slate-700">{result.placement.placementBoundary}</p>
    </section>
  );
}
