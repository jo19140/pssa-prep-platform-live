import Link from "next/link";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default function ParentalConsentInfoPage() {
  return (
    <SynesisAuthShell maxWidth="max-w-2xl">
      <div className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">
        <h1 className="text-2xl font-black text-slate-950">Parent Permission Required</h1>
        <p className="mt-3 leading-7 text-slate-700">
          Students under 13 need a parent or legal guardian to review the privacy notice and give permission before the account is created.
        </p>
        <p className="mt-3 leading-7 text-slate-700">
          If you are a parent, use the secure link from your email. The link expires after 7 days.
        </p>
        <Link href="/legal/privacy" className="mt-5 inline-block font-bold text-synesis-primary hover:text-synesis-primaryDark">
          Read the Privacy Policy
        </Link>
      </div>
    </SynesisAuthShell>
  );
}
