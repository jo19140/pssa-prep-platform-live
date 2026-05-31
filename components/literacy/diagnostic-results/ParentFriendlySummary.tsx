import type { DiagnosticResultsViewModel } from "./types";

export function ParentFriendlySummary({ result }: { result: DiagnosticResultsViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Plain-language summary</h2>
      <p className="mt-3 text-slate-700">{result.parentFriendlySummary.text}</p>
    </section>
  );
}
