import { hasTutorEvidence, type DiagnosticResultsViewModel } from "./types";

export function ConfidenceEvidence({ result }: { result: DiagnosticResultsViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Confidence</h2>
      <p className="mt-3 text-lg font-bold capitalize text-violet-700">{result.confidence.level}</p>
      {hasTutorEvidence(result) ? (
        <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <p className="rounded-lg bg-slate-50 p-3">Scored items: {result.confidence.totalScoredItems}</p>
          <p className="rounded-lg bg-slate-50 p-3">Usable voice attempts: {result.confidence.audioQuality.usableVoiceAttempts}/{result.confidence.audioQuality.totalVoiceAttempts}</p>
          <p className="rounded-lg bg-slate-50 p-3">Excluded items: {result.confidence.excludedItemsCount}</p>
        </div>
      ) : null}
    </section>
  );
}
