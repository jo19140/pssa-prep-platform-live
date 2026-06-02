import { db } from "@/lib/db";
import type { DiagnosticResultsTutorPayload } from "@/lib/literacy/diagnosticResultsPayload";

export type MTSSTier = "1" | "2" | "3";

export type MTSSTierVariant =
  | "CORE"
  | "SMALL_GROUP"
  | "WATCH_EVIDENCE"
  | "INTENSIVE";

export type MTSSTierDisplay = {
  tier: MTSSTier;
  variant: MTSSTierVariant;
  label: string;
  subLabel: string;
};

const READING_PROFILE_MAX_LEN = 120;
const FORBIDDEN_TOKENS = [
  "grade level",
  "grade-level",
  "at grade",
  "above grade",
  "below grade",
  "percentile",
  "%",
];
const NEUTRAL_FALLBACK =
  "Use diagnostic strand priorities to choose the next small-group focus.";

/**
 * Derives an initial MTSS tier estimate from V3 diagnostic evidence.
 * This is a deterministic instructional starting point, not a clinical label.
 */
export function deriveMTSSTier(
  result: DiagnosticResultsTutorPayload | null
): MTSSTier | null {
  if (!result) return null;

  const gap = result.listeningVsReading.listeningScore - result.listeningVsReading.readingScore;
  const hasListeningReadingGap = gap >= 3;

  const priority1Strands = result.strandPriority.filter((strand) => strand.priority === 1);
  const hasPriority1 = priority1Strands.length > 0;

  if (
    result.confidence.level === "low" ||
    (hasPriority1 && hasListeningReadingGap)
  ) {
    return "3";
  }

  if (result.confidence.level === "high" && !hasPriority1) {
    return "1";
  }

  return "2";
}

/**
 * Converts the deterministic MTSS tier estimate into display copy and color variant metadata.
 * Tier 2 separates small-group starts from watch-evidence starts when evidence is still thin.
 */
export function deriveMTSSTierDisplay(
  result: DiagnosticResultsTutorPayload | null
): MTSSTierDisplay | null {
  const tier = deriveMTSSTier(result);
  if (!tier || !result) return null;

  if (tier === "1") {
    return { tier, variant: "CORE", label: "Tier 1", subLabel: "Core" };
  }

  if (tier === "2") {
    if (result.confidence.level === "medium" && result.confidence.totalScoredItems < 12) {
      return { tier, variant: "WATCH_EVIDENCE", label: "Tier 2", subLabel: "Watch evidence" };
    }
    return { tier, variant: "SMALL_GROUP", label: "Tier 2", subLabel: "Small group" };
  }

  return { tier, variant: "INTENSIVE", label: "Tier 3", subLabel: "Intensive" };
}

/**
 * Produces a short, non-normed reading profile summary from V3 diagnostic fields.
 * Output is capped and guarded against grade-comparative or percentile language.
 */
export function deriveReadingProfileSummary(result: DiagnosticResultsTutorPayload): string {
  const gap = result.listeningVsReading.listeningScore - result.listeningVsReading.readingScore;
  const hasListeningReadingGap = gap >= 3;

  const priority1Strands = result.strandPriority.filter((strand) => strand.priority === 1);
  const hasPriority1 = priority1Strands.length > 0;

  const allPriority1AreDecoding =
    hasPriority1 && priority1Strands.every((strand) => strand.strand === "DECODING");

  const anyPriority1IsLanguage =
    priority1Strands.some((strand) => strand.strand === "VOCABULARY" || strand.strand === "COMPREHENSION");
  const noPriority1IsDecoding =
    !priority1Strands.some((strand) => strand.strand === "DECODING");

  if (result.confidence.totalScoredItems < 8) {
    return `Limited diagnostic evidence. ${result.confidence.totalScoredItems} items usable — rediagnose in 2 weeks.`;
  }

  if (hasListeningReadingGap) {
    return `Listening exceeds reading by ${gap} items — decoding load constraining comprehension. Pair with listen-first passages.`;
  }

  if (allPriority1AreDecoding) {
    return "Decoding focus; language-comprehension signals look stable.";
  }

  if (anyPriority1IsLanguage && noPriority1IsDecoding) {
    return "Decoding on plan; targeting language comprehension.";
  }

  if (result.confidence.level === "high" && !hasPriority1) {
    return "Ready for assigned text with continued small-group support.";
  }

  const candidate = result.listeningVsReading.interpretation ?? "";
  const lower = candidate.toLowerCase();
  const tooLong = candidate.length > READING_PROFILE_MAX_LEN;
  const hasForbidden = FORBIDDEN_TOKENS.some((token) => lower.includes(token));
  if (!candidate || tooLong || hasForbidden) {
    return NEUTRAL_FALLBACK;
  }
  return candidate;
}

/**
 * Summarizes initial MTSS tier estimates across a caseload, including students awaiting a diagnostic.
 */
export function summarizeCaseloadTierMix(
  tiers: Array<MTSSTier | null>
): { core: number; smallGroupOrWatch: number; intensive: number; awaiting: number } {
  return tiers.reduce(
    (summary, tier) => {
      if (tier === "1") summary.core += 1;
      else if (tier === "2") summary.smallGroupOrWatch += 1;
      else if (tier === "3") summary.intensive += 1;
      else summary.awaiting += 1;
      return summary;
    },
    { core: 0, smallGroupOrWatch: 0, intensive: 0, awaiting: 0 }
  );
}

type DailyTargetLookup = (args: {
  where: { code: string };
}) => Promise<{ tutorLabel: string | null; kidVisibleLabel: string | null } | null>;

/**
 * Creates a request-scoped daily-target label resolver that dedupes repeated codes.
 * The memo map is closed over by one page render and is not shared globally.
 */
export function createDailyTargetLabelResolver(findUnique: DailyTargetLookup = db.dailyTarget.findUnique.bind(db.dailyTarget)) {
  const memo = new Map<string, Promise<string>>();
  return async function resolveDailyTargetLabel(dailyTargetCode: string): Promise<string> {
    if (!memo.has(dailyTargetCode)) {
      memo.set(
        dailyTargetCode,
        findUnique({ where: { code: dailyTargetCode } }).then(
          (row) => row?.tutorLabel ?? row?.kidVisibleLabel ?? dailyTargetCode
        )
      );
    }
    return memo.get(dailyTargetCode)!;
  };
}
