"use client";

import Link from "next/link";
import { DiagnosticCard } from "./DiagnosticCard";

export function WhatHappensNextScreen() {
  return (
    <DiagnosticCard>
      <h1 className="text-3xl font-black text-slate-950">Your teacher or tutor will see the results.</h1>
      <p className="mt-3 max-w-2xl text-slate-700">Reading Buddy will use this check-in to pick practice that fits what you need next.</p>
      <Link href="/student/practice" className="mt-5 inline-flex rounded-lg bg-amber-700 px-5 py-3 font-black text-white">
        Go to practice
      </Link>
    </DiagnosticCard>
  );
}
