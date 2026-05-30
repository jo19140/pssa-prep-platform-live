import {
  DECODING_MIN_ITEMS_PER_PHASE,
  DIAGNOSTIC_EVIDENCE_FLOORS,
  DIAGNOSTIC_STRANDS,
  WITHIN_STRAND_MISS_CEILING,
  type DiagnosticStrand,
} from "./diagnosticEvidenceFloors";

export type EngineItem = {
  id: string;
  strand: string;
  itemType: string;
  studentPromptJson?: unknown;
  stimulusJson?: unknown;
  displayMode?: string | null;
  responseMode?: string | null;
  phaseBand?: number | null;
  targetPattern?: string | null;
  wordType?: string | null;
  isPracticeItem?: boolean | null;
};

export type EngineAttempt = {
  diagnosticItemId: string;
  scored: boolean;
  correct?: boolean | null;
  isPracticeAttempt?: boolean | null;
  item?: EngineItem | null;
};

export type DiagnosticEngineResult =
  | { sessionComplete: false; nextItem: EngineItem; reasonCode: string }
  | { sessionComplete: true; reasonCode: "SESSION_COMPLETE" }
  | { sessionComplete: false; nextItem: null; reasonCode: "INSUFFICIENT_SCORABLE_EVIDENCE"; details: Record<string, unknown> };

export function selectNextDiagnosticItem(input: {
  attempts: EngineAttempt[];
  approvedItemPool: EngineItem[];
  practiceItem?: EngineItem | null;
}): DiagnosticEngineResult {
  const attempts = input.attempts;
  const pool = input.approvedItemPool.filter((item) => !item.isPracticeItem);
  if (!attempts.some((attempt) => attempt.isPracticeAttempt) && input.practiceItem) {
    return { sessionComplete: false, nextItem: input.practiceItem, reasonCode: "GLOBAL_PRACTICE_ITEM" };
  }

  const attemptedIds = new Set(attempts.map((attempt) => attempt.diagnosticItemId));
  for (const strand of DIAGNOSTIC_STRANDS) {
    if (strandComplete(strand, attempts, pool)) continue;
    const replacementContext = unscoredReplacementContext(strand, attempts);
    const candidates = pool
      .filter((item) => item.strand === strand && !attemptedIds.has(item.id))
      .filter((item) => matchesReplacementContext(item, replacementContext));
    const sorted = sortCandidatesForStrand(strand, candidates, attempts);
    const nextItem = sorted[0];
    if (!nextItem) {
      return {
        sessionComplete: false,
        nextItem: null,
        reasonCode: "INSUFFICIENT_SCORABLE_EVIDENCE",
        details: { strand, replacementContext, floor: DIAGNOSTIC_EVIDENCE_FLOORS[strand] },
      };
    }
    return { sessionComplete: false, nextItem, reasonCode: replacementContext ? "LOW_CONFIDENCE_REPLACEMENT" : "NEXT_STRAND_ITEM" };
  }

  return { sessionComplete: true, reasonCode: "SESSION_COMPLETE" };
}

export function evidenceFloorStatus(strand: DiagnosticStrand, attempts: EngineAttempt[], pool: EngineItem[]) {
  if (strand === "DECODING") {
    const phases = [...new Set(pool.filter((item) => item.strand === "DECODING").map((item) => item.phaseBand).filter((phase): phase is number => typeof phase === "number"))];
    const missing = phases.filter((phase) => {
      const phaseAttempts = scoredAttempts(attempts).filter((attempt) => attempt.item?.strand === "DECODING" && attempt.item.phaseBand === phase);
      const real = phaseAttempts.filter((attempt) => attempt.item?.wordType === "real_word").length;
      const pseudo = phaseAttempts.filter((attempt) => attempt.item?.wordType === "pseudoword").length;
      return phaseAttempts.length < DECODING_MIN_ITEMS_PER_PHASE || real === 0 || pseudo === 0;
    });
    return { complete: missing.length === 0, missingPhases: missing };
  }

  const count = scoredAttempts(attempts).filter((attempt) => attempt.item?.strand === strand).length;
  return { complete: count >= DIAGNOSTIC_EVIDENCE_FLOORS[strand], count, floor: DIAGNOSTIC_EVIDENCE_FLOORS[strand] };
}

function strandComplete(strand: DiagnosticStrand, attempts: EngineAttempt[], pool: EngineItem[]) {
  return evidenceFloorStatus(strand, attempts, pool).complete;
}

function scoredAttempts(attempts: EngineAttempt[]) {
  return attempts.filter((attempt) => attempt.scored && !attempt.isPracticeAttempt);
}

function unscoredReplacementContext(strand: DiagnosticStrand, attempts: EngineAttempt[]) {
  const last = [...attempts].reverse().find((attempt) => attempt.item?.strand === strand);
  if (!last || last.scored || last.isPracticeAttempt) return null;
  return {
    phaseBand: last.item?.phaseBand ?? null,
    targetPattern: last.item?.targetPattern ?? null,
  };
}

function matchesReplacementContext(item: EngineItem, context: { phaseBand: number | null; targetPattern: string | null } | null) {
  if (!context) return true;
  if (context.phaseBand !== null && item.phaseBand !== context.phaseBand) return false;
  if (context.targetPattern && item.targetPattern !== context.targetPattern) return false;
  return true;
}

function sortCandidatesForStrand(strand: DiagnosticStrand, candidates: EngineItem[], attempts: EngineAttempt[]) {
  const misses = consecutiveMisses(strand, attempts);
  return [...candidates].sort((a, b) => {
    if (strand === "DECODING" && misses >= WITHIN_STRAND_MISS_CEILING) return (a.phaseBand || 0) - (b.phaseBand || 0);
    return (a.phaseBand || 0) - (b.phaseBand || 0) || a.id.localeCompare(b.id);
  });
}

function consecutiveMisses(strand: DiagnosticStrand, attempts: EngineAttempt[]) {
  let misses = 0;
  for (const attempt of [...attempts].reverse()) {
    if (attempt.item?.strand !== strand || attempt.isPracticeAttempt || !attempt.scored) continue;
    if (attempt.correct) break;
    misses += 1;
  }
  return misses;
}
