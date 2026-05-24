import type { EhriPhase } from "@prisma/client";
import { PHASE_LABELS } from "@/lib/literacy/constants";

export function EhriPhaseBadge({ phase, confidence }: { phase: EhriPhase; confidence?: number | null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
      {PHASE_LABELS[phase]}
      {typeof confidence === "number" ? <span className="text-xs font-semibold text-emerald-700">{Math.round(confidence * 100)}%</span> : null}
    </span>
  );
}
