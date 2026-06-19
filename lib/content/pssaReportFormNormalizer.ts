import type { PssaReportForm, PssaReportItem } from "@/lib/content/pssaStudentReport";

export type NormalizablePssaForm = {
  id: string;
  contentHash?: string | null;
  blueprintVersion?: string | null;
  items: NormalizablePssaFormItem[];
};

export type NormalizablePssaFormItem = {
  itemId: string;
  scoringBucket?: "operational" | "analytics_only" | string | null;
  item: {
    itemType?: string | null;
    interactionType?: string | null;
    eligibleContent?: string | null;
    reportingCategory?: string | null;
    responseSpecJson?: unknown;
    correctResponseJson?: unknown;
  };
};

export function normalizePssaReportForm(form: NormalizablePssaForm): PssaReportForm {
  return {
    id: form.id,
    formId: form.id,
    formVersion: form.contentHash ?? undefined,
    blueprintVersion: form.blueprintVersion ?? undefined,
    contentHash: form.contentHash ?? undefined,
    items: form.items.map(normalizeFormItem),
  };
}

function normalizeFormItem(formItem: NormalizablePssaFormItem): PssaReportItem {
  const item = formItem.item;
  return {
    id: formItem.itemId,
    itemId: formItem.itemId,
    interactionType: String(item.interactionType ?? ""),
    itemType: item.itemType ?? undefined,
    eligibleContent: item.eligibleContent ?? null,
    reportingCategory: item.reportingCategory ?? null,
    correctIndex: correctIndexOf(item.correctResponseJson),
    structuredChoicesJson: choicesArray(item.responseSpecJson),
    answerChoicesJson: choicesArray(item.responseSpecJson),
    choices: choicesArray(item.responseSpecJson),
    scoringBucket: formItem.scoringBucket ?? "operational",
  };
}

function choicesArray(responseSpecJson: unknown) {
  const spec = plainObject(responseSpecJson);
  const direct = spec.structuredChoicesJson ?? spec.choices ?? spec.answerChoicesJson;
  return Array.isArray(direct) ? direct : [];
}

function correctIndexOf(correctResponseJson: unknown) {
  const correct = plainObject(correctResponseJson);
  return typeof correct.correctIndex === "number" && Number.isInteger(correct.correctIndex) ? correct.correctIndex : null;
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
