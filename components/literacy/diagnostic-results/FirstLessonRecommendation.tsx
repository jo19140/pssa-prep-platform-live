import type { DiagnosticResultsViewModel } from "./types";

export function FirstLessonRecommendation({ result }: { result: DiagnosticResultsViewModel }) {
  const rec = result.firstLessonRecommendation;
  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">First lesson recommendation</h2>
      <p className="mt-2 text-lg font-bold text-violet-800">{rec.dailyTargetCode}</p>
      <p className="mt-3 text-slate-700">{rec.reasoning}</p>
      {rec.exampleWords.length ? <p className="mt-3 text-sm text-slate-700">Example words: {rec.exampleWords.join(", ")}</p> : null}
      {rec.additionalSupport.length ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {rec.additionalSupport.map((support) => (
            <li key={support} className="rounded-lg bg-white px-3 py-2 shadow-sm">{support}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
