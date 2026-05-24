import type { LiteracyStrand, MasteryLevel } from "@prisma/client";
import { LITERACY_STRANDS, STRAND_LABELS } from "@/lib/literacy/constants";

const levelTone: Record<MasteryLevel, string> = {
  UNTESTED: "bg-slate-100 text-slate-600",
  NOT_YET: "bg-rose-50 text-rose-800",
  DEVELOPING: "bg-amber-50 text-amber-900",
  SOLID: "bg-sky-50 text-sky-800",
  MASTERED: "bg-emerald-50 text-emerald-800",
};

export function LiteracyStrandPanel({
  scores,
}: {
  scores: Array<{ strand: LiteracyStrand; score: number; level: MasteryLevel; priorityRank?: number | null }>;
}) {
  const byStrand = new Map(scores.map((score) => [score.strand, score]));
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Six-strand profile</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {LITERACY_STRANDS.map((strand) => {
          const score = byStrand.get(strand);
          const level = score?.level || "UNTESTED";
          const value = Math.round(score?.score || 0);
          return (
            <div key={strand} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-900">{STRAND_LABELS[strand]}</p>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${levelTone[level]}`}>{level.replace(/_/g, " ")}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-500">{value}% evidence score{score?.priorityRank ? ` · priority ${score.priorityRank}` : ""}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
