import Link from "next/link";

export function DecisionExplorerPage({ decisions }: { decisions: any[] }) {
  const totalCost = decisions.reduce((sum, decision) => sum + Number(decision.costUsd || 0), 0);
  const meanLatency = decisions.length ? Math.round(decisions.reduce((sum, decision) => sum + Number(decision.inferenceMs || 0), 0) / decisions.length) : 0;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Decision explorer</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Decisions" value={decisions.length} />
        <Metric label="Total cost" value={`$${totalCost.toFixed(4)}`} />
        <Metric label="Mean latency" value={`${meanLatency}ms`} />
      </div>
      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Time</th><th className="p-3">Type</th><th className="p-3">Provider</th><th className="p-3">Model</th><th className="p-3">Cost</th><th className="p-3">Latency</th></tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr key={decision.id} className="border-t border-slate-100">
                <td className="p-3">{new Date(decision.occurredAt).toLocaleString()}</td>
                <td className="p-3"><Link className="font-bold text-emerald-700" href={`/admin/decisions/${decision.id}`}>{decision.decisionType}</Link></td>
                <td className="p-3">{decision.modelProvider}</td>
                <td className="p-3">{decision.modelName}</td>
                <td className="p-3">${Number(decision.costUsd || 0).toFixed(4)}</td>
                <td className="p-3">{decision.inferenceMs ?? "-"}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export function DecisionDetailPage({ decision }: { decision: any }) {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <Link href="/admin/decisions" className="text-sm font-bold text-emerald-700">Back to decisions</Link>
      <h1 className="text-3xl font-black text-slate-950">{decision.decisionType}</h1>
      <JsonPanel title="Input context" value={decision.inputContextJson} />
      <JsonPanel title="Decision output" value={decision.decisionJson} />
      <JsonPanel title="Outcomes" value={decision.outcomes} />
      <JsonPanel title="Chain" value={{ parentDecision: decision.parentDecision, childDecisions: decision.childDecisions }} />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>;
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-black text-slate-950">{title}</h2><pre className="mt-3 overflow-auto text-xs text-slate-700">{JSON.stringify(value, null, 2)}</pre></section>;
}
