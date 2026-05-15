"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ParentConsentTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [guardian, setGuardian] = useState(false);
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/parental-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, guardian, adult, consent, signature }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not confirm consent.");
      return;
    }
    router.push("/login?consent=verified");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-black text-slate-950">Give Parent Permission</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Please review the consent notice and confirm each statement. This creates the student's account only after permission is verified.
        </p>
        <div className="mt-5 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p>
            I consent to account creation and collection of learning data, assessment responses, tutor messages, reading-coach transcripts, and lesson progress as described in the Privacy Policy. AI subprocessors may process limited data to provide scoring, tutoring, lessons, and reading feedback. I can request export, correction, deletion, or consent withdrawal.
          </p>
          <Link href="/legal/privacy" target="_blank" className="mt-3 inline-block font-bold text-slate-900">
            Open Privacy Policy
          </Link>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Check checked={guardian} onChange={setGuardian} label="I am the student's parent or legal guardian." />
          <Check checked={adult} onChange={setAdult} label="I am at least 18 years old." />
          <Check checked={consent} onChange={setConsent} label="I consent to data collection and use as described." />
          <input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Type your full name as e-signature" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <button disabled={loading || !guardian || !adult || !consent || signature.trim().length < 2} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">
            {loading ? "Confirming..." : "Confirm Consent"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex gap-3 rounded-2xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
