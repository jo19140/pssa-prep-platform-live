import { formatScore, type DiagnosticResultsViewModel } from "./types";

const labels = {
  secure: "Secure",
  developing: "Developing",
  notYetSecure: "Not yet secure",
  insufficientEvidence: "Not enough evidence yet",
} as const;

export function WhyThisPlacementSection({ result }: { result: DiagnosticResultsViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Why this placement</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => {
          const entries = result.whyThisPlacement[key as keyof typeof labels] || [];
          return (
            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">{label}</h3>
              {entries.length ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {entries.map((entry) => (
                    <li key={`${key}-${entry.evidence.pattern}`} className="flex items-center justify-between gap-3">
                      <span>{entry.patterns.join(", ")}</span>
                      <span className="font-semibold">{formatScore(entry.evidence.score, entry.evidence.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">None reported.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
