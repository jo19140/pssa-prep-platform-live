"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/for-parents", label: "For Parents" },
  { href: "/for-teachers", label: "For Teachers" },
  { href: "/for-schools", label: "For Schools" },
];

const resourceLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-synesis-ink shadow-sm shadow-slate-200/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Sý Learning home">
          <Image
            src="/branding/sy-learning-square-logo-v2.png"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 rounded-2xl object-cover shadow-sm sm:h-14 sm:w-14"
            priority
          />
          <span className="flex flex-col leading-none text-synesis-ink">
            <span className="font-display text-[1.9rem] font-black tracking-normal sm:text-[2.2rem]">Sý</span>
            <span className="-mt-1 font-display text-lg font-black tracking-normal sm:text-xl">Learning</span>
            <span className="mt-1 text-[0.42rem] font-black uppercase tracking-[0.28em] sm:text-[0.48rem]">Together We Learn</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-synesis-body lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-synesis-primary">
              {link.label}
            </Link>
          ))}
          <details className="group relative">
            <summary className="cursor-pointer list-none hover:text-synesis-primary">
              Resources
              <span aria-hidden="true" className="ml-1">▾</span>
            </summary>
            <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
              {resourceLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-synesis-primary">
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/login" className="text-sm font-bold text-synesis-body hover:text-synesis-primary">
            Log In
          </Link>
          <Link href="/signup" className="rounded-full bg-synesis-primary px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-synesis-primaryDark">
            Start Free for 14 Days
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-synesis-ink lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span aria-hidden="true" className="text-xl">{open ? "×" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2 text-sm font-bold text-synesis-body" aria-label="Mobile navigation">
            {[...navLinks, ...resourceLinks].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 hover:bg-slate-50 hover:text-synesis-primary" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3">
              <Link href="/login" className="rounded-xl px-3 py-2 hover:bg-slate-50" onClick={() => setOpen(false)}>
                Log In
              </Link>
              <Link href="/signup" className="rounded-full bg-synesis-primary px-4 py-3 text-center font-black text-white" onClick={() => setOpen(false)}>
                Start Free for 14 Days
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
