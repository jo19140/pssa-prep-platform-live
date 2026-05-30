export type StudentDiagnosticItemDTO = {
  id: string;
  strand: string;
  itemType: string;
  studentPromptJson?: unknown;
  stimulusJson?: unknown;
  displayMode: string;
  responseMode: string;
  isPracticeItem: boolean;
};

export const BACKEND_ONLY_DIAGNOSTIC_FIELDS = [
  "expectedResponseJson",
  "scoringRubricJson",
  "adminReviewJson",
  "firstLookReviewModelDecisionId",
  "firstLookReviewModelDecision",
  "validationMetadataJson",
  "canonicalAnswer",
  "correctAnswer",
  "expectedPronunciation",
  "reviewStatus",
  "itemStatus",
  "reviewedAt",
  "reviewedByUserId",
  "reviewNotes",
  "retiredAt",
] as const;

export function toStudentItemDTO(item: {
  id: string;
  strand: string;
  itemType: string;
  studentPromptJson?: unknown;
  stimulusJson?: unknown;
  displayMode?: string | null;
  responseMode?: string | null;
  isPracticeItem?: boolean | null;
}): StudentDiagnosticItemDTO {
  const dto: StudentDiagnosticItemDTO = {
    id: item.id,
    strand: item.strand,
    itemType: item.itemType,
    studentPromptJson: item.studentPromptJson,
    displayMode: item.displayMode || "UNKNOWN",
    responseMode: item.responseMode || "UNKNOWN",
    isPracticeItem: item.isPracticeItem === true,
  };
  if (item.stimulusJson !== undefined && item.stimulusJson !== null) dto.stimulusJson = item.stimulusJson;
  return dto;
}

export function dtoLeaksBackendFields(dto: unknown) {
  if (!dto || typeof dto !== "object") return false;
  const keys = new Set(Object.keys(dto as Record<string, unknown>));
  return BACKEND_ONLY_DIAGNOSTIC_FIELDS.some((field) => keys.has(field));
}
