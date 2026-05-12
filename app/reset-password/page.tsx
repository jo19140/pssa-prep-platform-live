"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6"><div className="rounded-3xl bg-white p-6 shadow">Loading...</div></main>}>
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
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-950">Choose New Password</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading || !token} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Saving..." : "Reset Password"}</button>
        </form>
      </div>
    </main>
  );
}
