"use client";

import { useState } from "react";
import type { TestPrepModule } from "@prisma/client";

export function TestPrepDropdown({ enrolledTestPrep = ["PSSA"] }: { enrolledTestPrep?: TestPrepModule[] }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function requestState(formData: FormData) {
    const stateCode = String(formData.get("stateCode") || "").toUpperCase();
    if (!stateCode) return;
    await fetch("/api/synesis/state-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stateCode, requestNotes: "Requested from Sýnesis test prep dropdown." }),
    });
    setSubmitted(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
      >
        Test prep
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <div className="space-y-2">
            {enrolledTestPrep.includes("PSSA") ? (
              <a href="/teacher" className="block rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                Pennsylvania PSSA
              </a>
            ) : null}
            <p className="text-xs text-slate-500">Additional state modules are not built in v1.</p>
          </div>
          <form action={requestState} className="mt-4 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Request your state</label>
            <div className="flex gap-2">
              <input name="stateCode" maxLength={2} placeholder="TX" className="w-16 rounded-md border border-slate-200 px-2 py-2 text-sm uppercase" />
              <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Send</button>
            </div>
            {submitted ? <p className="text-xs font-semibold text-emerald-700">Request saved.</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
