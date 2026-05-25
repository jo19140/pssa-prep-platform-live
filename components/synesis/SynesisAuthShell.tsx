"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function SynesisAuthShell({
  children,
  maxWidth = "max-w-md",
}: {
  children: ReactNode;
  maxWidth?: "max-w-md" | "max-w-lg" | "max-w-2xl" | "max-w-3xl";
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.13),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-synesis-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/login" className="flex items-center gap-3">
          <Image
            src="/branding/sy-learning-logo-v6.png"
            alt="Sý Learning"
            width={210}
            height={56}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <span className="hidden rounded-full border border-indigo-100 bg-white/75 px-3 py-1 text-xs font-bold uppercase tracking-wide text-synesis-primary shadow-sm sm:inline-flex">
          Together We Learn
        </span>
      </header>
      <main className={`mx-auto w-full ${maxWidth} px-6 pb-10 pt-4`}>
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-6 pb-8 text-xs font-semibold text-synesis-muted">
        <Link href="/legal/privacy" className="hover:text-synesis-ink">
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/terms" className="hover:text-synesis-ink">
          Terms of Service
        </Link>
        <span aria-hidden="true">·</span>
        <a href="mailto:privacy@sylearning.com" className="hover:text-synesis-ink">
          Contact
        </a>
      </footer>
    </div>
  );
}
