import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assertNoBannedKeys,
  projectPssaStudentItem,
  type PssaStudentItemDto,
} from "@/lib/content/pssaStudentDto";
import {
  buildInlineDropdownResponse,
  isInlineDropdownComplete,
} from "@/components/pssa/InlineDropdownItem";
import {
  buildMatchingGridResponse,
  isMatchingGridComplete,
} from "@/components/pssa/MatchingGridItem";

const BACKEND_FILES = [
  "exemplars/pssa_grade3_pilot/pilot_backend.json",
  "exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json",
  "exemplars/pssa_grade3_tei/grade3_tei_backend.json",
  "exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json",
  "exemplars/pssa_grade3_conventions/grade3_conventions_backend.json",
  "exemplars/pssa_grade3_short_answer/grade3_short_answer_backend.json",
];

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function realItems() {
  return BACKEND_FILES.flatMap((filePath) => {
    const data = readJson(filePath);
    return Object.values(data)
      .filter(Array.isArray)
      .flat()
      .filter((row: any) => row?.interactionType || row?.itemType)
      .map((row: any) => ({ ...row, __filePath: filePath }));
  });
}

function byType(type: string) {
  const item = realItems().find((row: any) => String(row.interactionType ?? row.itemType).toUpperCase() === type);
  assert.ok(item, `missing fixture for ${type}`);
  return item;
}

function stableShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [stableShape(value[0])] : [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, stableShape((value as Record<string, unknown>)[key])]));
  }
  return typeof value;
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((child) => collectKeys(child, keys));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function assertKeyFree(value: unknown) {
  assertNoBannedKeys(value);
  for (const key of collectKeys(value)) assert.equal(/correct/i.test(key), false, `correct-like key survived: ${key}`);
}

function testAllRealItemsProjectWithoutLeaks() {
  const items = realItems();
  assert.equal(items.length, 79);
  const projected = items.map((item: any) => projectPssaStudentItem(item));
  projected.forEach(assertKeyFree);
  console.log(`PSSA PR B leak sweep projected ${projected.length} real Grade 3 items with zero banned keys.`);
}

function testAdversarialNestedLeaksDropOrThrow() {
  const matchingGrid = structuredClone(byType("MATCHING_GRID"));
  matchingGrid.correctResponseJson = { answerKey: true };
  matchingGrid.rows[0].correctColumnId = "secret";
  matchingGrid.rows[0].nested = { correctThing: "secret" };
  matchingGrid.columns[0].correctLabel = "secret";
  const projectedGrid = projectPssaStudentItem(matchingGrid);
  assertKeyFree(projectedGrid);

  const inlineDropdown = structuredClone(byType("INLINE_DROPDOWN"));
  inlineDropdown.blanks[0].correctIndex = 0;
  inlineDropdown.blanks[0].options[0].correctNested = true;
  inlineDropdown.blanks[0].options[0].answerKey = "secret";
  const projectedDropdown = projectPssaStudentItem(inlineDropdown);
  assertKeyFree(projectedDropdown);
}

function testProjectionShapes() {
  const expectedShapes: Record<string, unknown> = {
    MCQ: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { choices: [{ text: "string" }], prompt: "string" } },
    EBSR: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { partA: { choices: [{ text: "string" }], prompt: "string" }, partB: { choices: [{ text: "string" }], instruction: "string" } } },
    MULTI_SELECT: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { choices: [{ text: "string" }], exactSelectionCount: "number", instructionText: "string", maxSelections: "number", minSelections: "number", stem: "string" } },
    HOT_TEXT: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { instructionText: "string", prompt: "string", requiredSelectionCount: "number", selectableSpans: [{ endOffset: "number", paragraphIndex: "number", sentenceIndex: "number", spanId: "string", startOffset: "number", text: "string" }] } },
    MATCHING_GRID: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { columns: [{ columnId: "string", label: "string" }], instructionText: "string", rows: [{ label: "string", rowId: "string" }], selectionRule: "string", stem: "string" } },
    DRAG_DROP: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { instructionText: "string", prompt: "string", targets: [{ label: "string", targetId: "string" }], tokens: [{ text: "string", tokenId: "string" }], useAllTokens: "boolean" } },
    INLINE_DROPDOWN: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { baseTextWithBlanks: "string", blanks: [{ blankId: "string", options: [{ text: "string" }], position: "number" }], instructionText: "string", stem: "string" } },
    SHORT_ANSWER: { interactionSubtype: "string", interactionType: "string", pointValue: "number", responseSpec: { instructionText: "string", requiredSupportCount: "number", requiresTextSupport: "boolean", stem: "string" } },
  };
  for (const type of Object.keys(expectedShapes)) {
    assert.deepEqual(stableShape(projectPssaStudentItem(byType(type))), expectedShapes[type], type);
  }
}

function testResponseStatePayloads() {
  const matchingGrid = projectPssaStudentItem(byType("MATCHING_GRID")) as PssaStudentItemDto<"MATCHING_GRID">;
  const gridPartial = { [matchingGrid.responseSpec.rows[0].rowId]: matchingGrid.responseSpec.columns[0].columnId };
  assert.equal(isMatchingGridComplete(matchingGrid, gridPartial), false);
  const gridComplete = Object.fromEntries(matchingGrid.responseSpec.rows.map((row) => [row.rowId, matchingGrid.responseSpec.columns[0].columnId]));
  assert.equal(isMatchingGridComplete(matchingGrid, gridComplete), true);
  assertKeyFree(buildMatchingGridResponse(gridComplete));

  const inlineDropdown = projectPssaStudentItem(byType("INLINE_DROPDOWN")) as PssaStudentItemDto<"INLINE_DROPDOWN">;
  assert.equal(isInlineDropdownComplete(inlineDropdown, {}), false);
  const blankSelections = Object.fromEntries(inlineDropdown.responseSpec.blanks.map((blank) => [blank.blankId, 0]));
  assert.equal(isInlineDropdownComplete(inlineDropdown, blankSelections), true);
  assertKeyFree(buildInlineDropdownResponse(blankSelections));

  const hotText = projectPssaStudentItem(byType("HOT_TEXT")) as PssaStudentItemDto<"HOT_TEXT">;
  assertKeyFree({ selectedSpanIds: hotText.responseSpec.selectableSpans.slice(0, hotText.responseSpec.requiredSelectionCount ?? 1).map((span) => span.spanId) });

  const multiSelect = projectPssaStudentItem(byType("MULTI_SELECT")) as PssaStudentItemDto<"MULTI_SELECT">;
  assertKeyFree({ selectedIndices: Array.from({ length: multiSelect.responseSpec.exactSelectionCount ?? 1 }, (_, index) => index) });

  const dragDrop = projectPssaStudentItem(byType("DRAG_DROP")) as PssaStudentItemDto<"DRAG_DROP">;
  assertKeyFree({ assignments: Object.fromEntries(dragDrop.responseSpec.tokens.map((token, index) => [token.tokenId, dragDrop.responseSpec.targets[index % dragDrop.responseSpec.targets.length].targetId])) });

  const ebsr = projectPssaStudentItem(byType("EBSR")) as PssaStudentItemDto<"EBSR">;
  assertKeyFree({ partAIndex: 0, partBIndices: [0] });
  assert.equal("requiredSelectionCount" in ebsr.responseSpec.partB, false);

  const mcq = projectPssaStudentItem(byType("MCQ"));
  assertKeyFree({ selectedIndex: 0, interactionType: mcq.interactionType });

  const conventionsMcq = projectPssaStudentItem(realItems().find((item: any) => item.__filePath.includes("conventions") && (item.interactionType ?? item.itemType) === "MCQ"));
  assertKeyFree({ selectedIndex: 0, interactionType: conventionsMcq.interactionType });

  const shortAnswer = projectPssaStudentItem(byType("SHORT_ANSWER")) as PssaStudentItemDto<"SHORT_ANSWER">;
  assertKeyFree({ shortResponse: `A student response using ${shortAnswer.responseSpec.requiresTextSupport ? "text support" : "an explanation"}.` });
}

function testCheckTableAndEbsrEvidence() {
  const items = realItems();
  const serialized = JSON.stringify(items);
  assert.equal(serialized.includes("CHECK_TABLE"), false);
  assert.equal(items.filter((item: any) => (item.interactionType ?? item.itemType) === "MULTI_SELECT" && (item.rows || item.columns || item.cells)).length, 0);
  assert.equal(items.filter((item: any) => (item.interactionType ?? item.itemType) === "MULTI_SELECT").every((item: any) => String(item.interactionSubtype).startsWith("choose_n_")), true);
  assert.throws(() => projectPssaStudentItem({ interactionType: "MULTI_SELECT", rows: [], columns: [], cells: [] }), /unknown_interaction_shape/);

  const ebsrItems = items.filter((item: any) => item.interactionType === "EBSR");
  assert.equal(ebsrItems.length, 5);
  assert.equal(ebsrItems.every((item: any) => typeof item.responseSpec?.partB?.requiredSelectionCount !== "number"), true);
  assert.equal(ebsrItems.every((item: any) => !("requiredSelectionCount" in (projectPssaStudentItem(item) as PssaStudentItemDto<"EBSR">).responseSpec.partB)), true);
}

testAllRealItemsProjectWithoutLeaks();
testAdversarialNestedLeaksDropOrThrow();
testProjectionShapes();
testResponseStatePayloads();
testCheckTableAndEbsrEvidence();

console.log("PSSA PR B renderer/projection tests passed.");
