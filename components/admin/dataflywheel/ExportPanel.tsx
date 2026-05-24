export function ExportPanel({ batches }: { batches: any[] }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Data flywheel exports</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Batch</th><th className="p-3">Purpose</th><th className="p-3">Events</th><th className="p-3">Decisions</th><th className="p-3">Excluded</th><th className="p-3">Manifest</th></tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className="border-t border-slate-100">
                <td className="p-3 font-bold">{batch.batchName}</td>
                <td className="p-3">{batch.exportPurpose}</td>
                <td className="p-3">{batch.eventCount}</td>
                <td className="p-3">{batch.decisionCount}</td>
                <td className="p-3">{batch.excludedRecordCount}</td>
                <td className="p-3"><a className="font-bold text-emerald-700" href={`/api/admin/data-flywheel/exports/${batch.id}/manifest`}>Download</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
