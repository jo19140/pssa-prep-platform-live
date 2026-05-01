"use client";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
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

  return <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow"><h1 className="text-2xl font-bold">Login</h1><div className="mt-4 space-y-4"><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl border border-slate-300 px-4 py-3" /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />{error ? <p className="text-sm text-rose-600">{error}</p> : null}<button className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Sign In</button></div></form>;
}
