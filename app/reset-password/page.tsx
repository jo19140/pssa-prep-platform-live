"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<SynesisAuthShell><div className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">Loading...</div></SynesisAuthShell>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("This reset link is invalid or expired.");
      return;
    }
    router.push("/login");
  }

  return (
    <SynesisAuthShell>
      <div className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">
        <h1 className="text-2xl font-bold text-slate-950">Choose New Password</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100" />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading || !token} className="w-full rounded-2xl bg-synesis-primary px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-synesis-primaryDark disabled:opacity-50">{loading ? "Saving..." : "Reset Password"}</button>
        </form>
      </div>
    </SynesisAuthShell>
  );
}
