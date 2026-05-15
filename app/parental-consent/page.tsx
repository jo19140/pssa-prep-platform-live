import Link from "next/link";

export default function ParentalConsentInfoPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="rounded-3xl bg-white p-6 shadow">
        <h1 className="text-2xl font-black text-slate-950">Parent Permission Required</h1>
        <p className="mt-3 leading-7 text-slate-700">
          Students under 13 need a parent or legal guardian to review the privacy notice and give permission before the account is created.
        </p>
        <p className="mt-3 leading-7 text-slate-700">
          If you are a parent, use the secure link from your email. The link expires after 7 days.
        </p>
        <Link href="/legal/privacy" className="mt-5 inline-block font-bold text-slate-900">
          Read the Privacy Policy
        </Link>
      </div>
    </main>
  );
}
