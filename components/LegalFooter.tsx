import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-6 text-xs font-semibold text-slate-500">
      <Link href="/legal/privacy" className="hover:text-slate-900">
        Privacy Policy
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/legal/terms" className="hover:text-slate-900">
        Terms of Service
      </Link>
      <span aria-hidden="true">·</span>
      <a href="mailto:privacy@[domain]" className="hover:text-slate-900">
        Contact
      </a>
    </footer>
  );
}
