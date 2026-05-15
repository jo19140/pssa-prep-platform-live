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
