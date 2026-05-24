export function EvalSetManager({ segments }: { segments: any[] }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Eval set</h1>
      <div className="mt-6 space-y-2">
        {segments.map((segment) => (
          <a key={segment.id} href={`/admin/voice/labeling/${segment.id}`} className="block rounded-md border border-slate-200 bg-white p-4 font-semibold text-slate-800">
            {segment.expectedText.slice(0, 140)}
          </a>
        ))}
      </div>
    </main>
  );
}
