export function ModelComparisonPanel({ rows }: { rows: any[] }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Model comparison</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Decision</th><th className="p-3">Provider</th><th className="p-3">Model</th><th className="p-3">Count</th><th className="p-3">Mean cost</th><th className="p-3">Mean latency</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.decisionType}-${row.modelProvider}-${row.modelName}-${row.modelVersion || ""}`} className="border-t border-slate-100">
                <td className="p-3">{row.decisionType}</td>
                <td className="p-3">{row.modelProvider}</td>
                <td className="p-3">{row.modelName}{row.modelVersion ? ` ${row.modelVersion}` : ""}</td>
                <td className="p-3">{row._count?._all || 0}</td>
                <td className="p-3">${Number(row._avg?.costUsd || 0).toFixed(4)}</td>
                <td className="p-3">{Math.round(Number(row._avg?.inferenceMs || 0))}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
