"use client";

import { useState } from "react";

export function ComplianceOverrideForm() {
  const [studentUserId, setStudentUserId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [method, setMethod] = useState("email");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/compliance/consent-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentUserId, parentName, parentEmail, method }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Consent override saved." : json.error || "Could not save override.");
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
      <input value={studentUserId} onChange={(event) => setStudentUserId(event.target.value)} placeholder="Student userId" className="rounded-2xl border border-slate-300 px-4 py-3" />
      <input value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="Parent name" className="rounded-2xl border border-slate-300 px-4 py-3" />
      <input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="Parent email" className="rounded-2xl border border-slate-300 px-4 py-3" />
      <input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="Confirmed via email/phone/date" className="rounded-2xl border border-slate-300 px-4 py-3" />
      <button className="rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white md:col-span-2">Mark consent received</button>
      {message ? <p className="text-sm font-semibold text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}

export function ResourceSuggestionActions({ id }: { id: string }) {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function approve() {
    setBusy("approve");
    setMessage("");
    const res = await fetch(`/api/admin/resources/suggestions/${id}/approve`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    setMessage(res.ok ? "Approved. Refresh to update the queue." : json.error || "Approve failed.");
  }

  async function reject() {
    setBusy("reject");
    setMessage("");
    const res = await fetch(`/api/admin/resources/suggestions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerNotes: notes }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    setMessage(res.ok ? "Rejected. Refresh to update the queue." : json.error || "Reject failed.");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={approve} disabled={Boolean(busy)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
          {busy === "approve" ? "Approving..." : "Approve"}
        </button>
        <button onClick={reject} disabled={Boolean(busy) || notes.trim().length < 20} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
          {busy === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reviewer notes for rejection (20+ chars)" className="min-h-20 w-full rounded-xl border border-slate-300 p-2 text-xs" />
      {message ? <p className="text-xs font-semibold text-slate-700">{message}</p> : null}
    </div>
  );
}
