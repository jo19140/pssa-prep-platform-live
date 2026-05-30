import type { DiagnosticItem } from "@prisma/client";
import { countStudentReadyDiagnosticItems, getStudentReadyDiagnosticItems } from "@/lib/content/diagnosticItemReview";
import { DECODING_MIN_ITEMS_PER_PHASE, DIAGNOSTIC_EVIDENCE_FLOORS, DIAGNOSTIC_STRANDS, type DiagnosticStrand } from "./diagnosticEvidenceFloors";

export type DiagnosticPoolPreflightResult =
  | { ok: true; items: DiagnosticItem[]; totalStudentReady: number; details: Record<string, unknown> }
  | { ok: false; error: "approved_item_pool_insufficient"; details: Record<string, unknown> };

export async function loadStudentReadyDiagnosticPool(): Promise<DiagnosticItem[]> {
  return getStudentReadyDiagnosticItems({ orderBy: [{ strand: "asc" }, { phaseBand: "asc" }, { id: "asc" }] }) as Promise<DiagnosticItem[]>;
}

export async function runDiagnosticPoolPreflight(): Promise<DiagnosticPoolPreflightResult> {
  const [items, totalStudentReady] = await Promise.all([loadStudentReadyDiagnosticPool(), countStudentReadyDiagnosticItems()]);
  const failures = diagnosticPoolFailures(items);
  if (failures.length) return { ok: false, error: "approved_item_pool_insufficient", details: { failures, totalStudentReady } };
  return { ok: true, items, totalStudentReady, details: diagnosticPoolCoverage(items) };
}

export function diagnosticPoolFailures(items: Array<Pick<DiagnosticItem, "strand" | "phaseBand" | "wordType" | "comprehensionMode">>) {
  const failures: Array<Record<string, unknown>> = [];
  for (const strand of DIAGNOSTIC_STRANDS) {
    if (strand === "DECODING" || strand === "COMPREHENSION") continue;
    const count = items.filter((item) => item.strand === strand).length;
    if (count < DIAGNOSTIC_EVIDENCE_FLOORS[strand]) {
      failures.push({ strand, reason: "below_minimum_evidence_floor", count, floor: DIAGNOSTIC_EVIDENCE_FLOORS[strand] });
    }
  }

  const decodingItems = items.filter((item) => item.strand === "DECODING");
  const phases = [...new Set(decodingItems.map((item) => item.phaseBand).filter((phase): phase is number => typeof phase === "number"))];
  for (const phaseBand of phases) {
    const phaseItems = decodingItems.filter((item) => item.phaseBand === phaseBand);
    const realWordCount = phaseItems.filter((item) => item.wordType === "real_word").length;
    const pseudowordCount = phaseItems.filter((item) => item.wordType === "pseudoword").length;
    if (phaseItems.length < DECODING_MIN_ITEMS_PER_PHASE || realWordCount === 0 || pseudowordCount === 0) {
      failures.push({ strand: "DECODING", phaseBand, reason: "decoding_phase_requires_real_and_pseudoword", count: phaseItems.length, realWordCount, pseudowordCount });
    }
  }
  if (phases.length === 0) failures.push({ strand: "DECODING", reason: "no_decoding_phase_coverage" });

  const comprehensionItems = items.filter((item) => item.strand === "COMPREHENSION");
  if (!comprehensionItems.some((item) => item.comprehensionMode === "listening")) {
    failures.push({ strand: "COMPREHENSION", reason: "missing_listening_passage_set" });
  }
  if (!comprehensionItems.some((item) => item.comprehensionMode === "reading")) {
    failures.push({ strand: "COMPREHENSION", reason: "missing_reading_passage_set" });
  }

  return failures;
}

export function diagnosticPoolCoverage(items: Array<Pick<DiagnosticItem, "strand" | "phaseBand" | "targetPattern" | "wordType" | "comprehensionMode">>) {
  const strandCoverage = countBy(items, (item) => item.strand);
  const decodingCoverage: Record<string, { total: number; realWord: number; pseudoword: number }> = {};
  for (const item of items.filter((entry) => entry.strand === "DECODING")) {
    const key = `phase_${item.phaseBand || "unknown"}:${item.targetPattern || "unknown"}`;
    decodingCoverage[key] ||= { total: 0, realWord: 0, pseudoword: 0 };
    decodingCoverage[key].total += 1;
    if (item.wordType === "real_word") decodingCoverage[key].realWord += 1;
    if (item.wordType === "pseudoword") decodingCoverage[key].pseudoword += 1;
  }
  return { strandCoverage, decodingCoverage };
}

function countBy<T>(items: T[], keyFor: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFor(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
