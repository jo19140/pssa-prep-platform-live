"use client";

import { useState } from "react";

export default function AwaitingConsentPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/student/awaiting-consent/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setMessage(res.ok ? "If a pending consent record exists, we sent a new parent email." : "Could not resend right now.");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-black text-slate-950">Waiting for Parent Permission</h1>
        <p className="mt-3 leading-7 text-slate-700">
          Your account is waiting for parent permission. We sent your parent an email with a secure link. Please ask them to check their inbox.
        </p>
        <form onSubmit={resend} className="mt-5 space-y-3">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Student email" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <button disabled={loading || !email} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">
            {loading ? "Sending..." : "Resend parent email"}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
      </div>
    </main>
  );
}
