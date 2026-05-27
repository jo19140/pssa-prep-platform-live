"use client";

import { useState } from "react";
import type { TestPrepModule } from "@prisma/client";

export function TestPrepDropdown({ enrolledTestPrep = ["PSSA"] }: { enrolledTestPrep?: TestPrepModule[] }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasPssa = enrolledTestPrep.includes("PSSA");

  async function requestState(formData: FormData) {
    const stateCode = String(formData.get("stateCode") || "").toUpperCase();
    if (!stateCode) return;
    await fetch("/api/synesis/state-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stateCode, requestNotes: "Requested from Sý Learning test prep dropdown." }),
    });
    setSubmitted(true);
  }

  // When PSSA is enrolled, the tab acts as a direct link to the PSSA teacher dashboard.
  // A small caret beside it opens the "request another state" dropdown so the
  // multi-state request affordance is preserved but not visually dominant.
  const tabClasses =
    "flex min-w-[128px] items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950 transition hover:bg-amber-100";

  const tabInner = (
    <>
      <span>
        <span className="block font-semibold">Test Prep</span>
        <span className="text-xs">{hasPssa ? "Pennsylvania" : "Select a state"}</span>
      </span>
      <span
        aria-hidden="true"
        className="rounded border border-[#FFCD05] bg-[#003F87] px-1.5 py-0.5 font-serif text-[0.7rem] font-bold leading-none text-white shadow-sm"
      >
        PA
      </span>
    </>
  );

  return (
    <div className="relative flex items-stretch gap-1">
      {hasPssa ? (
        <a href="/teacher" className={tabClasses} aria-label="Open Pennsylvania PSSA teacher dashboard">
          {tabInner}
        </a>
      ) : (
        <button type="button" onClick={() => setOpen((value) => !value)} className={tabClasses} aria-expanded={open}>
          {tabInner}
        </button>
      )}

      {hasPssa ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-amber-300 bg-amber-50 px-2 text-sm text-amber-950 transition hover:bg-amber-100"
          aria-expanded={open}
          aria-label="Request another state"
          title="Request another state"
        >
          ▾
        </button>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-xs text-slate-500">Additional state modules are not built in v1.</p>
          <form action={requestState} className="mt-3 space-y-2">
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
