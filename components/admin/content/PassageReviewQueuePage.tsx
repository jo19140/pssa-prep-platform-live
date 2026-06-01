import Link from "next/link";
import type { PassageReviewFilter, PassageReviewSummary } from "@/lib/literacy/passageReview";

export function PassageReviewQueuePage({
  items,
  stats,
  activeFilter,
}: {
  items: PassageReviewSummary[];
  stats: {
    pending: number;
    edited: number;
    approved: number;
    rejected: number;
    aiRejectHints: number;
    needsHumanEye: number;
  };
  activeFilter: PassageReviewFilter;
}) {
  const emptyCopy = emptyStateCopy(activeFilter);
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">Content v3 review</p>
            <h1 className="text-3xl font-black text-slate-950">Passage review queue</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review generated passages after mechanical audit and AI first-look. Approved passages become eligible for lesson generation only after the data-layer approval guard passes.
            </p>
          </div>
          <Link href="/admin" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Back to admin
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Pending" value={stats.pending} href="/admin/content/passages/queue?reviewStatus=PENDING" active={isActiveFilter(activeFilter, { reviewStatus: "PENDING" })} />
          <Metric label="Edited" value={stats.edited} href="/admin/content/passages/queue?reviewStatus=EDITED" active={isActiveFilter(activeFilter, { reviewStatus: "EDITED" })} tone="indigo" />
          <Metric label="AI reject hints" value={stats.aiRejectHints} href="/admin/content/passages/queue?firstLookRecommendation=REJECT" active={isActiveFilter(activeFilter, { firstLookRecommendation: "REJECT" })} tone="rose" />
          <Metric label="Needs human eye" value={stats.needsHumanEye} href="/admin/content/passages/queue?firstLookRecommendation=FLAG_FOR_HUMAN" active={isActiveFilter(activeFilter, { firstLookRecommendation: "FLAG_FOR_HUMAN" })} tone="amber" />
          <Metric label="Approved production pool" value={stats.approved} href="/admin/content/passages/queue?reviewStatus=APPROVED" active={isActiveFilter(activeFilter, { reviewStatus: "APPROVED" })} tone="emerald" />
          <Metric label="Rejected" value={stats.rejected} href="/admin/content/passages/queue?reviewStatus=REJECTED" active={isActiveFilter(activeFilter, { reviewStatus: "REJECTED" })} tone="rose" />
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">AI hint</th>
                <th className="px-4 py-3">Passage</th>
                <th className="px-4 py-3">Phase / target</th>
                <th className="px-4 py-3">Word count</th>
                <th className="px-4 py-3">Decodability</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {!items.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="font-bold text-slate-700">{emptyCopy}</p>
                    <Link href="/admin/content/passages/queue" className="mt-2 inline-flex text-sm font-bold text-indigo-700">
                      View all
                    </Link>
                    <p className="mx-auto mt-3 max-w-3xl text-xs text-slate-500">
                      To populate this queue, run <code className="rounded bg-slate-100 px-1 py-0.5">npm run content:generate-passages -- --all-in-phase phase3-entry --mock-model</code> for a dry orchestration check, or omit <code className="rounded bg-slate-100 px-1 py-0.5">--mock-model</code> for real generation.
                    </p>
                  </td>
                </tr>
              ) : null}
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-indigo-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/content/passages/${item.id}`} className="flex flex-col gap-1 font-bold text-slate-950">
                      <span className={recommendationPillClass(item.firstLookRecommendation)}>{recommendationLabel(item.firstLookRecommendation)}</span>
                      <span className="text-xs font-semibold text-slate-500">{recommendationSublabel(item.firstLookRecommendation)}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.titleOrFirstWords}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.source} · {item.reviewStatus}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.phasePositionLabel}</div>
                    <div className="text-xs text-slate-500">{item.dailyTargetCode || "No daily target"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={item.wordCountWithinBand ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                      {item.wordCount} {item.wordCountWithinBand ? "[OK]" : "[OUT]"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{Math.round(item.decodabilityScore * 100)}%</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  href,
  active,
  tone = "slate",
}: {
  label: string;
  value: number;
  href: string;
  active: boolean;
  tone?: "slate" | "rose" | "amber" | "emerald" | "indigo";
}) {
  const toneClass = tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : tone === "indigo" ? "text-indigo-700" : "text-slate-950";
  const activeClass = active ? "border-indigo-400 bg-indigo-50 shadow-sm ring-2 ring-indigo-200" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/60";
  return (
    <Link href={href} className={`block rounded-md border p-4 transition ${activeClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black ${toneClass}`}>{value}</p>
    </Link>
  );
}

function isActiveFilter(active: PassageReviewFilter, candidate: PassageReviewFilter) {
  if (candidate.reviewStatus) return active.reviewStatus === candidate.reviewStatus;
  if (candidate.firstLookRecommendation) return active.firstLookRecommendation === candidate.firstLookRecommendation;
  return false;
}

function emptyStateCopy(filter: PassageReviewFilter) {
  if (filter.firstLookRecommendation === "REJECT") return "No passages with AI reject hints.";
  if (filter.firstLookRecommendation === "FLAG_FOR_HUMAN") return "No passages currently flagged for human review.";
  if (filter.firstLookRecommendation === "UNEVALUATED") return "No unevaluated passages.";
  if (filter.reviewStatus === "EDITED") return "No edited passages.";
  if (filter.reviewStatus === "APPROVED") return "No passages in the approved production pool yet.";
  if (filter.reviewStatus === "REJECTED") return "No rejected passages.";
  return "No passages in this queue.";
}

function recommendationPillClass(recommendation: string) {
  if (recommendation === "REJECT") return "inline-flex w-fit rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800";
  if (recommendation === "APPROVE") return "inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800";
  if (recommendation === "UNEVALUATED") return "inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800";
  return "inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800";
}

function recommendationLabel(recommendation: string) {
  if (recommendation === "FLAG_FOR_HUMAN") return "FLAG";
  if (recommendation === "UNEVALUATED") return "UNEVALUATED";
  return recommendation;
}

function recommendationSublabel(recommendation: string) {
  if (recommendation === "APPROVE") return "Auto-approval candidate";
  if (recommendation === "UNEVALUATED") return "Awaiting AI first-look";
  return "Human review required";
}
