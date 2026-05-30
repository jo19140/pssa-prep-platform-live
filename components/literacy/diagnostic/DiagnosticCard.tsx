"use client";

import type React from "react";

export function DiagnosticCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-amber-200 bg-[#faeeda] p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>;
}
