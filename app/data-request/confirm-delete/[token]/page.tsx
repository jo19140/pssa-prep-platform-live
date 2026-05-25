"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default function ConfirmDeletePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/data-request/confirm-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, email }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not confirm deletion. Check the email and link.");
      return;
    }
    router.push("/login?deleted=requested");
  }

  return (
    <SynesisAuthShell maxWidth="max-w-lg">
      <div className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">
        <h1 className="text-2xl font-black text-slate-950">Confirm Account Deletion</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">Type the account email to permanently delete the account's child records and de-identify the user row.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Account email" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <button disabled={loading || !email} className="w-full rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white disabled:opacity-50">
            {loading ? "Deleting..." : "Permanently delete my account"}
          </button>
        </form>
      </div>
    </SynesisAuthShell>
  );
}
