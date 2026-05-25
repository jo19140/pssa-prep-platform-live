"use client";

import Link from "next/link";
import { useState } from "react";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <SynesisAuthShell>
      <div className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">
        <h1 className="text-2xl font-bold text-slate-950">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email and check your inbox for a reset link.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100" />
          {sent ? <p className="text-sm text-emerald-700">If an account exists, a reset link has been sent.</p> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-synesis-primary px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-synesis-primaryDark disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
        </form>
        <Link href="/login" className="mt-4 block text-sm font-semibold text-synesis-body hover:text-synesis-primary">Back to login</Link>
      </div>
    </SynesisAuthShell>
  );
}
