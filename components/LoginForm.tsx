"use client";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "studentRegister">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

    const session = await waitForSession();
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

    router.push(fallbackRouteForEmail(email));
  }

  async function handleStudentRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, joinCode, dateOfBirth, parentName, parentEmail, parentPhone }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Could not create student account.");
      if (json.pendingConsent) {
        router.push("/student/awaiting-consent");
        return;
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) throw new Error("Account created, but sign in failed. Try signing in.");
      router.push("/student");
    } catch (err: any) {
      setError(err.message || "Could not create student account.");
      setLoading(false);
    }
  }

  const isRegistering = mode === "studentRegister";
  const under13 = isUnder13Input(dateOfBirth);

  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 p-6 shadow-2xl shadow-indigo-950/10 backdrop-blur-md">
      <div className="flex rounded-2xl bg-white/35 p-1 shadow-inner shadow-indigo-950/5">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${!isRegistering ? "bg-white/90 text-synesis-ink shadow-sm" : "text-synesis-muted"}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode("studentRegister"); setError(""); }}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${isRegistering ? "bg-white/90 text-synesis-ink shadow-sm" : "text-synesis-muted"}`}
        >
          Student Join
        </button>
      </div>

      <form onSubmit={isRegistering ? handleStudentRegister : handleSubmit} className="mt-5">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-synesis-ink">{isRegistering ? "Join Your Class" : "Login"}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isRegistering ? "Use the class code from your teacher to create your student account." : "Sign in with your Sý Learning account."}
        </p>
        <div className="mt-4 space-y-4">
          {isRegistering ? (
            <>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                aria-label="Date of birth"
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </>
          ) : null}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
          {isRegistering ? (
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Class code, like SY-ABC123"
              className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 font-mono uppercase tracking-wide focus:border-synesis-primary focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          ) : null}
          {isRegistering && under13 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">You're under 13, so we need a parent or guardian to give permission before we create your account.</p>
              <div className="mt-3 space-y-3">
                <input value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="Parent or guardian name" className="w-full rounded-2xl border border-amber-200 px-4 py-3 focus:border-synesis-warmth focus:outline-none focus:ring-4 focus:ring-amber-100" />
                <input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} placeholder="Parent or guardian email" className="w-full rounded-2xl border border-amber-200 px-4 py-3 focus:border-synesis-warmth focus:outline-none focus:ring-4 focus:ring-amber-100" />
                <input value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} placeholder="Parent phone (optional)" className="w-full rounded-2xl border border-amber-200 px-4 py-3 focus:border-synesis-warmth focus:outline-none focus:ring-4 focus:ring-amber-100" />
              </div>
            </div>
          ) : null}
          {isRegistering ? (
            <label className="flex gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              <span>
                I have read and agree to the{" "}
                <Link href="/legal/privacy" target="_blank" className="underline">Privacy Policy</Link>{" "}
                and{" "}
                <Link href="/legal/terms" target="_blank" className="underline">Terms of Service</Link>.
              </span>
            </label>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading || (isRegistering && !acceptedTerms)} className="w-full rounded-2xl bg-synesis-primary px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-synesis-primaryDark disabled:opacity-50">
            {loading ? "Working..." : isRegistering ? "Create Student Account" : "Sign In"}
          </button>
        </div>
      </form>
      {!isRegistering ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="font-semibold text-synesis-body hover:text-synesis-primary">Forgot password?</Link>
          <Link href="/teacher/signup" className="font-semibold text-synesis-body hover:text-synesis-primary">Teacher signup</Link>
        </div>
      ) : null}
      <p className="mt-5 border-t border-white/45 pt-4 text-center text-xs font-bold leading-5 text-synesis-ink/70">
        COPPA-compliant. Built for Pennsylvania teachers and tutors.
      </p>
    </div>
  );
}

function isUnder13Input(value: string) {
  if (!value) return false;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age < 13;
}

async function waitForSession() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const session = await getSession();
    if ((session?.user as any)?.role) return session;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return getSession();
}

function fallbackRouteForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.includes("admin")) return "/admin";
  if (normalized.includes("teacher")) return "/teacher";
  if (normalized.includes("parent")) return "/parent";
  return "/student";
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
