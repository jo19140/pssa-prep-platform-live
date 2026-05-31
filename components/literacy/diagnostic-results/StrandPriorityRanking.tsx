import { formatScore, type DiagnosticResultsViewModel } from "./types";

export function StrandPriorityRanking({ result }: { result: DiagnosticResultsViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Strand priorities</h2>
      <div className="mt-4 space-y-3">
        {result.strandPriority.map((strand) => (
          <div key={strand.strand} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-900">{strand.strand}</p>
              <p className="text-sm text-slate-600">{strand.label}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-800 shadow-sm">{formatScore(strand.score, strand.scoreOutOf)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
