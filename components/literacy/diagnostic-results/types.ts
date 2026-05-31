import type { DiagnosticResultsParentPayload, DiagnosticResultsTutorPayload } from "@/lib/literacy/diagnosticResultsPayload";

export type DiagnosticResultsViewModel = DiagnosticResultsParentPayload | DiagnosticResultsTutorPayload;

export function hasTutorEvidence(result: DiagnosticResultsViewModel): result is DiagnosticResultsTutorPayload {
  return "governance" in result || "decodingEvidence" in result;
}

export function formatScore(score: number, total: number) {
  return `${score}/${total}`;
}
