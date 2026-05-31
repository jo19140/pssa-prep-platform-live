import { z } from "zod";

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

export const studentDiagnosticItemDTOSchema = z
  .object({
    id: z.string(),
    strand: z.string(),
    itemType: z.string(),
    studentPromptJson: z.unknown().optional(),
    stimulusJson: z.unknown().optional(),
    displayMode: z.string(),
    responseMode: z.string(),
    isPracticeItem: z.boolean(),
  })
  .strict();

export const diagnosticNextResponseSchema = z
  .object({
    sessionId: z.string().optional(),
    sessionComplete: z.boolean().optional(),
    reasonCode: z.string().optional(),
    resultJson: z.unknown().optional(),
    nextItem: studentDiagnosticItemDTOSchema.optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const leaked = findBackendDiagnosticField(value);
    if (leaked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Diagnostic student DTO leaked backend-only field: ${leaked}`,
      });
    }
  });

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

export function assertNoBackendDiagnosticFields(value: unknown) {
  const leaked = findBackendDiagnosticField(value);
  if (leaked) throw new Error(`Diagnostic student DTO leaked backend-only field: ${leaked}`);
}

export function validateDiagnosticNextResponse(value: unknown) {
  return diagnosticNextResponseSchema.parse(value) as {
    sessionId?: string;
    sessionComplete?: boolean;
    reasonCode?: string;
    resultJson?: unknown;
    nextItem?: StudentDiagnosticItemDTO;
  };
}

function findBackendDiagnosticField(value: unknown, path: string[] = []): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = findBackendDiagnosticField(value[index], [...path, String(index)]);
      if (result) return result;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if ((BACKEND_ONLY_DIAGNOSTIC_FIELDS as readonly string[]).includes(key)) {
      return [...path, key].join(".");
    }
    const result = findBackendDiagnosticField(child, [...path, key]);
    if (result) return result;
  }
  return null;
}
