"use client";

import Link from "next/link";
import { useState } from "react";

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
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-950">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email and check your inbox for a reset link.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {sent ? <p className="text-sm text-emerald-700">If an account exists, a reset link has been sent.</p> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Sending..." : "Send Reset Link"}</button>
        </form>
        <Link href="/login" className="mt-4 block text-sm font-semibold text-slate-700">Back to login</Link>
      </div>
    </main>
  );
}
