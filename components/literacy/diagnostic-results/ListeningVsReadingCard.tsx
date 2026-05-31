import { formatScore, type DiagnosticResultsViewModel } from "./types";

export function ListeningVsReadingCard({ result }: { result: DiagnosticResultsViewModel }) {
  const value = result.listeningVsReading;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Listening and reading</h2>
      <p className="mt-3 text-slate-700">{value.interpretation}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-800">
        <span className="rounded-full bg-slate-100 px-3 py-1">Listening {formatScore(value.listeningScore, value.listeningTotal)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Reading {formatScore(value.readingScore, value.readingTotal)}</span>
      </div>
    </section>
  );
}
