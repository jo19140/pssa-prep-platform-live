"use client";

export function LearningPathPanel({ learningPath }: { learningPath: any }) {
  const items = learningPath?.items || [];

  if (!items.length) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow">
        <h3 className="text-xl font-bold text-slate-900">Learning Pathway</h3>
        <p className="mt-3 text-sm text-slate-600">Complete a test to generate a personalized practice pathway.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Learning Pathway</h3>
          {learningPath.aiSummary ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{learningPath.aiSummary}</p> : null}
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {learningPath.generatedBy === "AI_ENRICHED" ? "AI enriched" : "Deterministic"}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {items.map((item: any) => (
          <article key={item.id || item.order} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Step {item.order} • {item.standardCode}</p>
                <h4 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-sm text-slate-700">{item.recommendation}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{item.activityType}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{item.estimatedMinutes} min</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{item.difficulty.replace("_", " ")}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{item.rationale}</p>
            <div className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
              <span className="font-semibold text-slate-900">Practice:</span> {item.practicePrompt}
            </div>
            {item.aiExplanation ? <p className="mt-3 text-sm text-slate-600">{item.aiExplanation}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
