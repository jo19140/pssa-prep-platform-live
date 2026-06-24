"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppChromeHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/student/learning-path")) return null;

  return (
    <header className="border-b border-synesis-border bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/branding/sy-learning-logo-v6-dark.png"
            alt="Sý Learning"
            width={190}
            height={48}
            className="h-10 w-auto"
            priority
          />
          <span className="sr-only">Sý Learning</span>
        </Link>
        <p className="hidden text-xs font-semibold uppercase tracking-wide text-synesis-muted sm:block">
          Together We Learn
        </p>
      </div>
    </header>
  );
}
