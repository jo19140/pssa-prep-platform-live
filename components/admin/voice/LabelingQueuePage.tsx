export function LabelingQueuePage({ segments }: { segments: any[] }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Voice labeling queue</h1>
      <p className="mt-2 text-slate-600">Highest-uncertainty unlabeled segments first.</p>
      <section className="mt-6 space-y-2">
        {segments.map((segment) => (
          <a key={segment.id} href={`/admin/voice/labeling/${segment.id}`} className="block rounded-md border border-slate-200 bg-white p-4 hover:border-emerald-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{segment.expectedText.slice(0, 100) || "Untitled segment"}</p>
                <p className="text-sm text-slate-500">Session {segment.voiceSessionId}</p>
              </div>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-sm font-bold text-amber-800">{Math.round((segment.uncertaintyScore || 0) * 100)} uncertainty</span>
            </div>
          </a>
        ))}
        {!segments.length ? <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-slate-600">No segments waiting for labels.</div> : null}
      </section>
    </main>
  );
}
