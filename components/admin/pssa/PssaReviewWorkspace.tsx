"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Counts = {
  pendingPassages: number;
  pendingItems: number;
  approved: number;
  studentReady: number;
};

type PassageRow = {
  id: string;
  kind: "passage";
  passageType: string;
  gradeLevel: number;
  reviewStatus: string;
  studentReadyBlockedReason: string;
  studentPreview: Record<string, unknown>;
  reviewer: Record<string, unknown>;
};

type ItemRow = {
  id: string;
  kind: "item";
  interactionType: string;
  interactionSubtype: string | null;
  eligibleContent: string | null;
  batchId: string | null;
  pointValue: number;
  gradeLevel: number;
  reviewStatus: string;
  studentReadyBlockedReason: string;
  passageApproved: boolean;
  studentPreview: Record<string, unknown>;
  reviewer: Record<string, unknown>;
};

type ReviewRow = PassageRow | ItemRow;

type QueueResponse = {
  counts: Counts;
  passages: PassageRow[];
  items: ItemRow[];
};

export function PssaReviewWorkspace() {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadQueue() {
    const response = await fetch("/api/admin/pssa-review/queue?grade=3&status=PENDING", { cache: "no-store" });
    if (!response.ok) {
      setMessage(`Queue load failed: ${response.status}`);
      return;
    }
    const data = await response.json() as QueueResponse;
    setQueue(data);
    setActiveId((current) => current && [...data.passages, ...data.items].some((row) => row.id === current) ? current : (data.passages[0]?.id || data.items[0]?.id || null));
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const rows = useMemo(() => [...(queue?.passages ?? []), ...(queue?.items ?? [])], [queue]);
  const active = rows.find((row) => row.id === activeId) ?? rows[0] ?? null;
  const groupedItems = useMemo(() => groupItems(queue?.items ?? []), [queue]);

  async function mutate(action: "approve" | "reject") {
    if (!active || busy) return;
    if (!reason.trim()) {
      setMessage("A reason is required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/pssa-review/${action}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, kind: active.kind, reason }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.detail || body.error || `${action} failed`);
      setBusy(false);
      return;
    }
    setReason("");
    setMessage(`${action === "approve" ? "Approved" : "Rejected"} ${active.kind}; student-ready now ${body.refreshedStudentReadyCount}.`);
    await loadQueue();
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-indigo-700">PSSA review · Grade 3</p>
            <h1 className="text-3xl font-black text-slate-950">Item bank approval</h1>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
            admin only · server-enforced
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Pending passages" value={queue?.counts.pendingPassages ?? 0} />
          <Metric label="Pending items" value={queue?.counts.pendingItems ?? 0} />
          <Metric label="Approved" value={queue?.counts.approved ?? 0} />
          <Metric label="Student-ready" value={queue?.counts.studentReady ?? 0} tone="emerald" />
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Items become student-ready only after their linked passage is approved. Approve passages first.
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            <QueueGroup title="Passages" count={queue?.passages.length ?? 0}>
              {(queue?.passages ?? []).map((passage) => (
                <QueueButton key={passage.id} row={passage} active={active?.id === passage.id} onClick={() => setActiveId(passage.id)} />
              ))}
            </QueueGroup>
            {groupedItems.map((group) => (
              <QueueGroup key={group.batchId} title={group.batchId || "No batch"} count={group.items.length}>
                {group.items.map((item) => (
                  <QueueButton key={item.id} row={item} active={active?.id === item.id} onClick={() => setActiveId(item.id)} />
                ))}
              </QueueGroup>
            ))}
          </aside>

          <section className="rounded-md border border-slate-200 bg-white">
            {!active ? (
              <div className="p-10 text-center text-slate-500">No pending PSSA review rows.</div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">{active.kind}</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{active.id}</h2>
                    <p className="mt-1 text-sm text-slate-600">{summaryLine(active)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{active.studentReadyBlockedReason}</span>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Pane title="Student preview" tone="student">
                    <StructuredJson value={active.studentPreview} />
                  </Pane>
                  <Pane title="Reviewer-only" tone="reviewer">
                    <StructuredJson value={active.reviewer} />
                  </Pane>
                </div>

                {active.kind === "item" && !active.passageApproved ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    Linked passage is still pending, so approval will not make this item student-ready yet.
                  </div>
                ) : null}

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <label className="block text-sm font-bold text-slate-800" htmlFor="pssa-review-reason">Review reason</label>
                  <textarea
                    id="pssa-review-reason"
                    className="min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={busy} onClick={() => mutate("reject")} className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      Reject
                    </button>
                    <button type="button" disabled={busy} onClick={() => mutate("approve")} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800 disabled:opacity-50">
                      Approve
                    </button>
                  </div>
                  {message ? <p className="text-sm font-semibold text-slate-700">{message}</p> : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black ${tone === "emerald" ? "text-emerald-700" : "text-slate-950"}`}>{value}</p>
    </div>
  );
}

function QueueGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
        <span className="text-xs font-bold text-slate-500">{count}</span>
      </div>
      <div className="max-h-80 overflow-auto p-2">{children}</div>
    </div>
  );
}

function QueueButton({ row, active, onClick }: { row: ReviewRow; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`mb-2 w-full rounded-md border p-3 text-left text-sm ${active ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
      <span className="block font-black text-slate-950">{row.id}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-500">{summaryLine(row)}</span>
    </button>
  );
}

function Pane({ title, tone, children }: { title: string; tone: "student" | "reviewer"; children: ReactNode }) {
  return (
    <div className={`rounded-md border p-4 ${tone === "student" ? "border-slate-200 bg-slate-50" : "border-indigo-200 bg-indigo-50"}`}>
      <h3 className={`text-sm font-black ${tone === "student" ? "text-slate-900" : "text-indigo-900"}`}>{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StructuredJson({ value }: { value: unknown }) {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
    return <p className="text-sm text-slate-500">No structured fields.</p>;
  }
  return (
    <dl className="space-y-3 text-sm">
      {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
        <div key={key}>
          <dt className="font-black text-slate-700">{key}</dt>
          <dd className="mt-1 overflow-auto rounded-md bg-white p-2 text-slate-800">
            {typeof child === "string" || typeof child === "number" || typeof child === "boolean" ? String(child) : <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(child, null, 2)}</pre>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function summaryLine(row: ReviewRow) {
  if (row.kind === "passage") return `${row.passageType} · grade ${row.gradeLevel}`;
  return `${row.interactionType}${row.batchId ? ` · ${row.batchId}` : ""}${row.passageApproved ? "" : " · passage pending"}`;
}

function groupItems(items: ItemRow[]) {
  const groups = new Map<string, ItemRow[]>();
  for (const item of items) {
    const key = item.batchId || "No batch";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([batchId, rows]) => ({ batchId, items: rows }));
}
