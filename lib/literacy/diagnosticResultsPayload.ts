import type { DiagnosticResultsJson } from "./diagnosticResults";

export type DiagnosticResultsTutorPayload = DiagnosticResultsJson;

export type DiagnosticResultsParentPayload = Omit<DiagnosticResultsJson, "decodingEvidence" | "governance" | "engineVersion" | "contentVersion" | "confidence"> & {
  confidence: { level: DiagnosticResultsJson["confidence"]["level"] };
};

export function toTutorPayload(resultJson: unknown): DiagnosticResultsTutorPayload {
  return normalizeResult(resultJson);
}

export function toParentPayload(resultJson: unknown): DiagnosticResultsParentPayload {
  const result = normalizeResult(resultJson);
  const { decodingEvidence: _decodingEvidence, governance: _governance, engineVersion: _engineVersion, contentVersion: _contentVersion, confidence, ...parent } = result;
  return { ...parent, confidence: { level: confidence.level } };
}

function normalizeResult(resultJson: unknown): DiagnosticResultsJson {
  if (!resultJson || typeof resultJson !== "object") throw new Error("diagnostic_result_missing");
  return resultJson as DiagnosticResultsJson;
}
