import Link from "next/link";

export function EventExplorerPage({ events }: { events: any[] }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-slate-950">Event explorer</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Time</th><th className="p-3">Student</th><th className="p-3">Type</th><th className="p-3">Outcome</th><th className="p-3">Duration</th><th className="p-3">Decisions</th></tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-slate-100">
                <td className="p-3">{new Date(event.occurredAt).toLocaleString()}</td>
                <td className="p-3 font-mono">{shortId(event.studentUserId)}</td>
                <td className="p-3"><Link className="font-bold text-emerald-700" href={`/admin/events/${event.id}`}>{event.eventType}</Link></td>
                <td className="p-3">{event.immediateOutcome || "-"}</td>
                <td className="p-3">{event.durationMs ? `${Math.round(event.durationMs / 1000)}s` : "-"}</td>
                <td className="p-3">{event.modelDecisions?.length ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export function EventDetailPage({ event }: { event: any }) {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <Link href="/admin/events" className="text-sm font-bold text-emerald-700">Back to events</Link>
      <h1 className="text-3xl font-black text-slate-950">{event.eventType}</h1>
      <JsonPanel title="Context" value={event.contextJson} />
      <JsonPanel title="Response" value={event.responseJson} />
      <JsonPanel title="Outcomes" value={event.outcomes} />
      <JsonPanel title="Related decisions" value={event.modelDecisions} />
    </main>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return <section className="rounded-md border border-slate-200 bg-white p-4"><h2 className="font-black text-slate-950">{title}</h2><pre className="mt-3 overflow-auto text-xs text-slate-700">{JSON.stringify(value, null, 2)}</pre></section>;
}

function shortId(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "-";
}
