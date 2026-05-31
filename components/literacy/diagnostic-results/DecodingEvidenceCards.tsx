import { formatScore, hasTutorEvidence, type DiagnosticResultsViewModel } from "./types";

export function DecodingEvidenceCards({ result }: { result: DiagnosticResultsViewModel }) {
  if (!hasTutorEvidence(result)) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Decoding evidence</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {result.decodingEvidence.perPhase.map((phase) => (
          <div key={phase.phase} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">Phase {phase.phase}</h3>
            <p className="mt-2 text-sm text-slate-700">Real words: {formatScore(phase.realWordScore, phase.realWordTotal)}</p>
            <p className="text-sm text-slate-700">Pseudowords: {formatScore(phase.pseudowordScore, phase.pseudowordTotal)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
