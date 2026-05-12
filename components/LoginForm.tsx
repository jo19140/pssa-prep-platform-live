"use client";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "studentRegister">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setLoading(false);
      if (result?.error && result.error !== "CredentialsSignin") {
        setError("Login is not configured correctly. Check the server environment.");
        return;
      }
      setError("Invalid email or password.");
      return;
    }

    const session = await getSession();
    const role = (session?.user as any)?.role;

    if (role === "ADMIN") {
      router.push("/admin");
      return;
    }
    if (role === "TEACHER") {
      router.push("/teacher");
      return;
    }
    if (role === "STUDENT") {
      router.push("/student");
      return;
    }
    if (role === "PARENT") {
      router.push("/parent");
      return;
    }

    router.push("/");
  }

  async function handleStudentRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, joinCode }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Could not create student account.");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) throw new Error("Account created, but sign in failed. Try signing in.");
      router.push("/student");
    } catch (err: any) {
      setError(err.message || "Could not create student account.");
      setLoading(false);
    }
  }

  const isRegistering = mode === "studentRegister";

  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${!isRegistering ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode("studentRegister"); setError(""); }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${isRegistering ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Student Join
        </button>
      </div>

      <form onSubmit={isRegistering ? handleStudentRegister : handleSubmit} className="mt-5">
        <h1 className="text-2xl font-bold">{isRegistering ? "Join Your Class" : "Login"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isRegistering ? "Use the class code from your teacher to create your student account." : "Sign in with your PSSA Platform account."}
        </p>
        <div className="mt-4 space-y-4">
          {isRegistering ? (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          ) : null}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          />
          {isRegistering ? (
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Class code, like PSSA-ABC123"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 font-mono uppercase tracking-wide"
            />
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? "Working..." : isRegistering ? "Create Student Account" : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  );
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
