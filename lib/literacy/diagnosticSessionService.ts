import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentReadyDiagnosticItems } from "@/lib/content/diagnosticItemReview";
import { toStudentItemDTO } from "./diagnosticItemDTO";
import { selectNextDiagnosticItem, evidenceFloorStatus, type EngineAttempt, type EngineItem } from "./diagnosticEngine";
import { DIAGNOSTIC_STRANDS } from "./diagnosticEvidenceFloors";
import { computeDiagnosticResults } from "./diagnosticPlacement";
import { buildDiagnosticResults } from "./diagnosticResults";
import { validateDiagnosticResultsCopy } from "./validateDiagnosticResultsCopy";

export async function loadDiagnosticSessionState(sessionId: string) {
  const [session, pool] = await Promise.all([
    db.diagnosticSession.findUnique({
      where: { id: sessionId },
      include: {
        attempts: {
          include: { diagnosticItem: true },
          orderBy: { attemptedAt: "asc" },
        },
      },
    }),
    getStudentReadyDiagnosticItems({ orderBy: [{ strand: "asc" }, { phaseBand: "asc" }, { id: "asc" }] }),
  ]);
  return { session, pool };
}

export function selectNextStudentItem(input: {
  attempts: Array<{
    diagnosticItemId: string;
    scored: boolean;
    correct?: boolean | null;
    isPracticeAttempt?: boolean | null;
    diagnosticItem?: EngineItem | null;
  }>;
  pool: EngineItem[];
}) {
  const practiceItem = input.pool.find((item) => item.isPracticeItem) || null;
  const result = selectNextDiagnosticItem({
    attempts: input.attempts.map((attempt): EngineAttempt => ({
      diagnosticItemId: attempt.diagnosticItemId,
      scored: attempt.scored,
      correct: attempt.correct,
      isPracticeAttempt: attempt.isPracticeAttempt,
      item: attempt.diagnosticItem || null,
    })),
    approvedItemPool: input.pool,
    practiceItem,
  });
  if (!("nextItem" in result) || !result.nextItem) return result;
  return { ...result, nextItem: toStudentItemDTO(result.nextItem) };
}

export function completionBlockers(attempts: EngineAttempt[], pool: EngineItem[]) {
  const blockers: Array<Record<string, unknown>> = [];
  for (const strand of DIAGNOSTIC_STRANDS) {
    const status = evidenceFloorStatus(strand, attempts, pool);
    if (!status.complete) blockers.push({ strand, ...status });
  }
  return blockers;
}

export async function diagnosticResultJson(sessionId: string, attempts: Array<EngineAttempt & { item?: EngineItem | null }>) {
  const baseResult = computeDiagnosticResults(
    attempts.map((attempt) => ({
      strand: attempt.item?.strand || "UNKNOWN",
      phaseBand: attempt.item?.phaseBand,
      correct: attempt.correct,
      scored: attempt.scored,
      isPracticeItem: attempt.isPracticeAttempt,
    })),
  );
  const phaseNumber = typeof baseResult.phasePlacement === "number" ? baseResult.phasePlacement : null;
  const phasePosition = phaseNumber
    ? await db.phasePosition.findFirst({
        where: { phaseNumber },
        include: { dailyTargets: { orderBy: { introductionOrder: "asc" } } },
      })
    : null;
  const result = buildDiagnosticResults({
    diagnosticSessionId: sessionId,
    attempts: attempts.map((attempt) => ({
      diagnosticItemId: attempt.diagnosticItemId,
      scored: attempt.scored,
      correct: attempt.correct,
      isPracticeAttempt: attempt.isPracticeAttempt,
      item: attempt.item
        ? {
            id: attempt.item.id,
            strand: attempt.item.strand,
            itemType: attempt.item.itemType,
            phaseBand: attempt.item.phaseBand,
            targetPattern: attempt.item.targetPattern,
            wordType: attempt.item.wordType,
            displayMode: attempt.item.displayMode,
            responseMode: attempt.item.responseMode,
            comprehensionMode: (attempt.item as { comprehensionMode?: string | null }).comprehensionMode,
          }
        : null,
    })),
    dailyTargets: phasePosition?.dailyTargets.map((target) => ({
      code: target.code,
      phaseLabel: phasePosition.label,
      phaseNumber: phasePosition.phaseNumber,
      exampleWords: target.exampleWords,
      introductionOrder: target.introductionOrder,
    })),
    engineVersion: "content-v3-phase-a",
  });
  validateDiagnosticResultsCopy(result);
  return result as Prisma.InputJsonValue;
}
