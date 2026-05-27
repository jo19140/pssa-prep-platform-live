import Link from "next/link";
import { firstLookConfidence, firstLookRecommendation } from "@/lib/content/diagnosticItemReview";

export function DiagnosticItemReviewQueuePage({
  items,
  approvedPoolCount,
}: {
  items: any[];
  approvedPoolCount: number;
}) {
  const flagged = items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === "FLAG_FOR_HUMAN").length;
  const rejected = items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === "REJECT").length;
  const approveHints = items.filter((item) => firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson) === "APPROVE").length;

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">Content v3 review</p>
            <h1 className="text-3xl font-black text-slate-950">Diagnostic item queue</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Pending diagnostic candidates only. Student-facing selectors must use APPROVED items with no retired date.
            </p>
          </div>
          <Link href="/admin" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900">
            Back to admin
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Pending" value={items.length} />
          <Metric label="AI reject hints" value={rejected} tone="rose" />
          <Metric label="Needs human eye" value={flagged} tone="amber" />
          <Metric label="Approved production pool" value={approvedPoolCount} tone="emerald" />
        </div>

        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">AI hint</th>
                <th className="px-4 py-3">Strand</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {!items.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No pending diagnostic items.
                  </td>
                </tr>
              ) : null}
              {items.map((item) => {
                const recommendation = firstLookRecommendation(item.firstLookReviewModelDecision?.decisionJson);
                return (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-indigo-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/admin/content/diagnostic-items/${item.id}`} className="flex flex-col gap-1 font-bold text-slate-950">
                        <span className={recommendationPillClass(recommendation)}>{recommendation.replace(/_/g, " ")}</span>
                        <span className="text-xs font-semibold text-slate-500">
                          {Math.round(firstLookConfidence(item.firstLookReviewModelDecision?.decisionJson) * 100)}% confidence
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.strand}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.dailyTarget?.code || "Phase diagnostic"}</div>
                      <div className="text-xs text-slate-500">{item.phasePosition?.name || "No phase position"}</div>
                    </td>
                    <td className="px-4 py-3">{item.itemType}</td>
                    <td className="px-4 py-3">{item.difficultyBand}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {approveHints ? (
          <p className="text-xs text-slate-500">
            {approveHints} item{approveHints === 1 ? "" : "s"} have an AI APPROVE hint. Human approval is still required before production use.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "rose" | "amber" | "emerald" }) {
  const toneClass = tone === "rose" ? "text-rose-700" : tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-950";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function recommendationPillClass(recommendation: string) {
  if (recommendation === "REJECT") return "inline-flex w-fit rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-800";
  if (recommendation === "APPROVE") return "inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800";
  return "inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800";
}
