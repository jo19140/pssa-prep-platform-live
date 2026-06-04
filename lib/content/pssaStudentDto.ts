export const PSSA_STUDENT_DTO_BANNED_KEYS = [
  "correctColumnId",
  "correctIndex",
  "correctIndices",
  "correctSpanIds",
  "correctCells",
  "correctAssignments",
  "supportsPrompt",
  "supportsPartA",
  "errorPattern",
  "evidenceQuote",
  "distractorRole",
  "rationale",
  "targetWordOrPhrase",
  "targetSkill",
  "answerKey",
  "scoringJson",
  "correctResponseJson",
] as const;

const BANNED_KEY_SET = new Set<string>(PSSA_STUDENT_DTO_BANNED_KEYS);

export type PssaInteractionType =
  | "MCQ"
  | "EBSR"
  | "MULTI_SELECT"
  | "HOT_TEXT"
  | "MATCHING_GRID"
  | "DRAG_DROP"
  | "INLINE_DROPDOWN"
  | "SHORT_ANSWER";

export type PssaChoiceDto = { text: string };

export type PssaStudentResponseSpec =
  | { prompt: string; choices: PssaChoiceDto[] }
  | {
      partA: { prompt: string; choices: PssaChoiceDto[] };
      partB: { instruction: string; choices: PssaChoiceDto[]; requiredSelectionCount?: number };
    }
  | { stem: string; instructionText: string; choices: PssaChoiceDto[]; minSelections?: number; maxSelections?: number; exactSelectionCount?: number }
  | {
      prompt: string;
      instructionText: string;
      selectableSpans: Array<{ spanId: string; text: string; spanKind?: "token"; paragraphIndex?: number; sentenceIndex?: number; startOffset?: number; endOffset?: number }>;
      requiredSelectionCount?: number;
    }
  | { stem: string; instructionText: string; selectionRule: string; rows: Array<{ rowId: string; label: string }>; columns: Array<{ columnId: string; label: string }> }
  | { prompt: string; instructionText: string; tokens: Array<{ tokenId: string; text: string }>; targets: Array<{ targetId: string; label: string }>; useAllTokens: boolean }
  | { stem: string; instructionText: string; baseTextWithBlanks: string; blanks: Array<{ blankId: string; position?: number; options: PssaChoiceDto[] }> }
  | { stem: string; instructionText: string; requiredSupportCount?: number; requiresTextSupport: boolean };

export type PssaStudentItemDto<T extends PssaInteractionType = PssaInteractionType> = {
  interactionType: T;
  interactionSubtype: string;
  pointValue: number;
  responseSpec: ExtractSpec<T>;
};

export type ExtractSpec<T extends PssaInteractionType> =
  T extends "MCQ" ? { prompt: string; choices: PssaChoiceDto[] }
  : T extends "EBSR" ? { partA: { prompt: string; choices: PssaChoiceDto[] }; partB: { instruction: string; choices: PssaChoiceDto[]; requiredSelectionCount?: number } }
  : T extends "MULTI_SELECT" ? { stem: string; instructionText: string; choices: PssaChoiceDto[]; minSelections?: number; maxSelections?: number; exactSelectionCount?: number }
  : T extends "HOT_TEXT" ? { prompt: string; instructionText: string; selectableSpans: Array<{ spanId: string; text: string; spanKind?: "token"; paragraphIndex?: number; sentenceIndex?: number; startOffset?: number; endOffset?: number }>; requiredSelectionCount?: number }
  : T extends "MATCHING_GRID" ? { stem: string; instructionText: string; selectionRule: string; rows: Array<{ rowId: string; label: string }>; columns: Array<{ columnId: string; label: string }> }
  : T extends "DRAG_DROP" ? { prompt: string; instructionText: string; tokens: Array<{ tokenId: string; text: string }>; targets: Array<{ targetId: string; label: string }>; useAllTokens: boolean }
  : T extends "INLINE_DROPDOWN" ? { stem: string; instructionText: string; baseTextWithBlanks: string; blanks: Array<{ blankId: string; position?: number; options: PssaChoiceDto[] }> }
  : T extends "SHORT_ANSWER" ? { stem: string; instructionText: string; requiredSupportCount?: number; requiresTextSupport: boolean }
  : never;

type Recordish = Record<string, any>;

export function projectPssaStudentItem(row: Recordish): PssaStudentItemDto {
  const interactionType = canonicalInteractionType(row);
  const source = specSource(row);
  const base = {
    interactionType,
    interactionSubtype: stringOrEmpty(row.interactionSubtype),
    pointValue: pointValue(row),
  };
  let dto: PssaStudentItemDto;
  if (interactionType === "MCQ") dto = { ...base, interactionType, responseSpec: projectMcq(source, row) };
  else if (interactionType === "EBSR") dto = { ...base, interactionType, responseSpec: projectEbsr(source, row) };
  else if (interactionType === "MULTI_SELECT") dto = { ...base, interactionType, responseSpec: projectMultiSelect(source) };
  else if (interactionType === "HOT_TEXT") dto = { ...base, interactionType, responseSpec: projectHotText(source, row) };
  else if (interactionType === "MATCHING_GRID") dto = { ...base, interactionType, responseSpec: projectMatchingGrid(source) };
  else if (interactionType === "DRAG_DROP") dto = { ...base, interactionType, responseSpec: projectDragDrop(source) };
  else if (interactionType === "INLINE_DROPDOWN") dto = { ...base, interactionType, responseSpec: projectInlineDropdown(source) };
  else if (interactionType === "SHORT_ANSWER") dto = { ...base, interactionType, responseSpec: projectShortAnswer(source) };
  else throw new Error("unknown_interaction_shape");
  assertNoBannedKeys(dto);
  return dto;
}

export function assertNoBannedKeys(value: unknown, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoBannedKeys(child, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (BANNED_KEY_SET.has(key) || /correct/i.test(key)) throw new Error(`student_dto_banned_key:${path}.${key}`);
    assertNoBannedKeys(child, `${path}.${key}`);
  }
}

function canonicalInteractionType(row: Recordish): PssaInteractionType {
  const type = String(row.interactionType ?? row.itemType ?? "").toUpperCase();
  if (type === "CONVENTIONS") return "MCQ";
  if (["MCQ", "EBSR", "MULTI_SELECT", "HOT_TEXT", "MATCHING_GRID", "DRAG_DROP", "INLINE_DROPDOWN", "SHORT_ANSWER"].includes(type)) return type as PssaInteractionType;
  throw new Error("unknown_interaction_shape");
}

function specSource(row: Recordish): Recordish {
  const raw = row.responseSpecJson ?? row.responseSpec ?? row;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function projectMcq(source: Recordish, row: Recordish): ExtractSpec<"MCQ"> {
  return {
    prompt: stringOrEmpty(source.prompt ?? row.studentFacingPrompt ?? row.stem ?? row.prompt ?? row.question),
    choices: choiceArray(source.choices ?? row.answerChoicesJson ?? row.choices ?? row.structuredChoicesJson),
  };
}

function projectEbsr(source: Recordish, row: Recordish): ExtractSpec<"EBSR"> {
  const partA = objectSource(source.partA ?? row.partA);
  const partB = objectSource(source.partB ?? row.partB);
  return {
    partA: {
      prompt: stringOrEmpty(partA.prompt ?? partA.stem ?? row.partA?.stem),
      choices: choiceArray(partA.choices),
    },
    partB: {
      instruction: stringOrEmpty(partB.instruction ?? partB.instructionText ?? row.partB?.instruction),
      choices: choiceArray(partB.choices),
      ...(typeof partB.requiredSelectionCount === "number" ? { requiredSelectionCount: partB.requiredSelectionCount } : {}),
    },
  };
}

function projectMultiSelect(source: Recordish): ExtractSpec<"MULTI_SELECT"> {
  if (source.rows || source.columns || source.cells) throw new Error("unknown_interaction_shape");
  return stripUndefined({
    stem: stringOrEmpty(source.stem),
    instructionText: stringOrEmpty(source.instructionText),
    choices: choiceArray(source.choices),
    minSelections: numberOrUndefined(source.minSelections),
    maxSelections: numberOrUndefined(source.maxSelections),
    exactSelectionCount: numberOrUndefined(source.exactSelectionCount),
  });
}

function projectHotText(source: Recordish, row: Recordish): ExtractSpec<"HOT_TEXT"> {
  return stripUndefined({
    prompt: stringOrEmpty(source.prompt),
    instructionText: stringOrEmpty(source.instructionText),
    selectableSpans: arraySource(source.selectableSpans).map((span) => stripUndefined({
      spanId: stringOrEmpty(span.spanId),
      text: stringOrEmpty(span.text),
      spanKind: span.spanKind === "token" ? "token" : undefined,
      paragraphIndex: numberOrUndefined(span.paragraphIndex),
      sentenceIndex: numberOrUndefined(span.sentenceIndex),
      startOffset: numberOrUndefined(span.startOffset),
      endOffset: numberOrUndefined(span.endOffset),
    })),
    requiredSelectionCount: numberOrUndefined(source.requiredSelectionCount ?? source.exactSelectionCount ?? row.requiredSelectionCount ?? row.exactSelectionCount),
  });
}

function projectMatchingGrid(source: Recordish): ExtractSpec<"MATCHING_GRID"> {
  return {
    stem: stringOrEmpty(source.stem),
    instructionText: stringOrEmpty(source.instructionText),
    selectionRule: stringOrEmpty(source.selectionRule),
    rows: arraySource(source.rows).map((row) => ({ rowId: stringOrEmpty(row.rowId), label: stringOrEmpty(row.label) })),
    columns: arraySource(source.columns).map((column) => ({ columnId: stringOrEmpty(column.columnId), label: stringOrEmpty(column.label) })),
  };
}

function projectDragDrop(source: Recordish): ExtractSpec<"DRAG_DROP"> {
  return {
    prompt: stringOrEmpty(source.prompt),
    instructionText: stringOrEmpty(source.instructionText),
    tokens: arraySource(source.tokens).map((token) => ({ tokenId: stringOrEmpty(token.tokenId), text: stringOrEmpty(token.text) })),
    targets: arraySource(source.targets).map((target) => ({ targetId: stringOrEmpty(target.targetId), label: stringOrEmpty(target.label) })),
    useAllTokens: Boolean(source.useAllTokens),
  };
}

function projectInlineDropdown(source: Recordish): ExtractSpec<"INLINE_DROPDOWN"> {
  return {
    stem: stringOrEmpty(source.stem),
    instructionText: stringOrEmpty(source.instructionText),
    baseTextWithBlanks: stringOrEmpty(source.baseTextWithBlanks),
    blanks: arraySource(source.blanks).map((blank) => stripUndefined({
      blankId: stringOrEmpty(blank.blankId),
      position: numberOrUndefined(blank.position),
      options: choiceArray(blank.options),
    })),
  };
}

function projectShortAnswer(source: Recordish): ExtractSpec<"SHORT_ANSWER"> {
  return stripUndefined({
    stem: stringOrEmpty(source.stem),
    instructionText: stringOrEmpty(source.instructionText),
    requiredSupportCount: numberOrUndefined(source.requiredSupportCount),
    requiresTextSupport: Boolean(source.requiresTextSupport),
  });
}

function choiceArray(value: unknown): PssaChoiceDto[] {
  return arraySource(value).map((choice) => ({ text: typeof choice === "string" ? choice : stringOrEmpty(choice.text) }));
}

function arraySource(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function objectSource(value: unknown): Recordish {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Recordish : {};
}

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pointValue(row: Recordish) {
  const value = row.pointValue;
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stripUndefined<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined)) as T;
}
