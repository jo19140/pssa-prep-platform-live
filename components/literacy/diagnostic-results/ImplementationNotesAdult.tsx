import { hasTutorEvidence, type DiagnosticResultsViewModel } from "./types";

export function ImplementationNotesAdult({ result }: { result: DiagnosticResultsViewModel }) {
  if (!hasTutorEvidence(result)) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
      <h2 className="text-xl font-black">Implementation notes</h2>
      <p className="mt-3 text-sm text-slate-300">Result schema: {result.governance?.audit.resultSchemaVersion}</p>
      <p className="text-sm text-slate-300">Computed: {result.computedAt}</p>
      <p className="mt-3 text-sm text-slate-300">Item evidence records: {result.governance?.itemEvidence.length || 0}</p>
    </section>
  );
}
