"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TeacherSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/teacher/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, schoolName }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not create teacher account.");
      return;
    }
    router.push("/login?registered=teacher");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-950">Teacher Signup</h1>
        <p className="mt-2 text-sm text-slate-600">Create a teacher account and verify your email.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <input value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="School name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Creating..." : "Create Teacher Account"}</button>
        </form>
        <Link href="/login" className="mt-4 block text-sm font-semibold text-slate-700">Back to login</Link>
      </div>
    </main>
  );
}
