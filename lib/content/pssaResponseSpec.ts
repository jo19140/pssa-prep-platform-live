type AuthoredPssaItem = Record<string, any>;

type StructuredChoice = {
  text: string;
  distractorRole?: string;
};

export function buildPssaResponseSpec(item: AuthoredPssaItem) {
  if (item.responseSpec) return item.responseSpec;
  const interactionType = interactionTypeFor(item);
  if (interactionType === "MCQ") return buildMcqResponseSpec(item);
  if (interactionType === "MULTI_SELECT") return { stem: item.stem, instructionText: item.instructionText, choices: item.choices, minSelections: item.minSelections, maxSelections: item.maxSelections, exactSelectionCount: item.exactSelectionCount };
  if (interactionType === "HOT_TEXT") return {
    prompt: item.prompt,
    instructionText: item.instructionText,
    selectableSpans: item.selectableSpans ?? item.selectableTokens?.map((token: any) => ({
      spanId: token.tokenId,
      text: token.text,
      spanKind: "token",
    })),
  };
  if (interactionType === "MATCHING_GRID") return { stem: item.stem, instructionText: item.instructionText, rows: item.rows, columns: item.columns, selectionRule: item.selectionRule };
  if (interactionType === "DRAG_DROP") return {
    prompt: item.prompt ?? item.baseSentenceWithSlots,
    instructionText: item.instructionText,
    tokens: item.tokens ?? item.draggableTokens?.map((token: any) => ({ tokenId: token.tokenId, text: token.text })),
    targets: item.targets ?? item.slots?.map((slot: any) => ({ targetId: slot.slotId, label: slot.label ?? "" })),
    useAllTokens: item.useAllTokens,
  };
  if (interactionType === "INLINE_DROPDOWN") return { stem: item.stem, baseTextWithBlanks: item.baseTextWithBlanks, blanks: item.blanks?.map((blank: any) => ({ ...blank, correctIndex: undefined, rationale: undefined })) };
  if (interactionType === "SHORT_ANSWER") return { stem: item.stem, instructionText: item.instructionText, requiredSupportCount: item.requiredSupportCount, requiresTextSupport: item.requiresTextSupport };
  return item;
}

function buildMcqResponseSpec(item: AuthoredPssaItem) {
  const authoredChoices = Array.isArray(item.structuredChoicesJson)
    ? item.structuredChoicesJson
    : Array.isArray(item.answerChoicesJson)
      ? item.answerChoicesJson
      : item.choices;
  const choices = choiceTexts(Array.isArray(item.answerChoicesJson) ? item.answerChoicesJson : authoredChoices);
  const structuredChoicesJson = structuredChoices(authoredChoices, item.correctIndex);
  return {
    prompt: item.studentFacingPrompt ?? item.stem,
    choices,
    ...(structuredChoicesJson ? { structuredChoicesJson } : {}),
  };
}

function choiceTexts(choices: unknown): string[] | unknown {
  if (!Array.isArray(choices)) return choices;
  return choices.map((choice) => typeof choice === "string" ? choice : String(choice?.text ?? ""));
}

function structuredChoices(choices: unknown, correctIndex: unknown): StructuredChoice[] | null {
  if (!Array.isArray(choices) || !choices.some(hasDistractorRole)) return null;
  const correct = Number.isInteger(correctIndex) ? Number(correctIndex) : -1;
  return choices.map((choice, index) => {
    const text = typeof choice === "string" ? choice : String(choice?.text ?? "");
    if (index === correct) return { text };
    const role = typeof choice === "object" && choice && typeof choice.distractorRole === "string" && choice.distractorRole
      ? choice.distractorRole
      : null;
    return role ? { text, distractorRole: role } : { text };
  });
}

function hasDistractorRole(choice: unknown) {
  return Boolean(choice && typeof choice === "object" && typeof (choice as Record<string, unknown>).distractorRole === "string" && (choice as Record<string, unknown>).distractorRole);
}

function interactionTypeFor(item: AuthoredPssaItem) {
  if (item.interactionType) return item.interactionType;
  if (item.itemType === "CONVENTIONS") return "MCQ";
  return item.itemType ?? "MCQ";
}
