import { PrismaClient } from "@prisma/client";

import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";
import { buildPlan, stableStringify } from "./lib/pssa-import-plan";

const DEV_DB = { host: "127.0.0.1", port: "5433", database: "pssa_dev" };
const TARGET_FORM_ID = "cmq7b3yig0001n9ldf9kqzvw6";

type SourceItem = {
  itemId: string;
  responseSpecJson: any;
  correctResponseJson: any;
};

type ValidationRow = {
  itemId: string;
  currentSpec: any;
  nextSpec: any;
  currentChoices: string[];
  expectedChoices: string[];
  needsUpdate: boolean;
};

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const verifyForm = args.has("--verify-form");
const simulateBadMatch = args.has("--simulate-bad-match");

async function main() {
  assertDevOnlyGuard();
  const db = new PrismaClient();
  try {
    const sourceById = loadRoleBearingSourceItems();
    const validation = await validateTargets(db, sourceById, simulateBadMatch);
    const summary = {
      mode: apply ? "apply" : verifyForm ? "verify-form" : "dry-run",
      sourceRoleBearingMcqCount: sourceById.size,
      dbTargetCount: validation.rows.length + validation.mismatches.length,
      updatesNeeded: validation.rows.filter((row) => row.needsUpdate).length,
      noops: validation.rows.filter((row) => !row.needsUpdate).length,
      missingDbItems: validation.missingDbItems,
      mismatches: validation.mismatches,
    };
    console.log(JSON.stringify({ backfillSummary: summary }, null, 2));
    if (validation.mismatches.length) throw new Error("ABORT_PSSA_DISTRACTORROLE_BACKFILL_VALIDATION_FAILED");
    if (apply) {
      await db.$transaction(async (tx) => {
        for (const row of validation.rows.filter((candidate) => candidate.needsUpdate)) {
          const result = await tx.pssaItem.updateMany({
            where: { id: row.itemId },
            data: { responseSpecJson: row.nextSpec },
          });
          if (result.count !== 1) throw new Error(`PSSA_DISTRACTORROLE_BACKFILL_UPDATE_COUNT:${row.itemId}:${result.count}`);
        }
      });
      console.log(JSON.stringify({ applied: true, updatedRows: summary.updatesNeeded }, null, 2));
    } else if (!verifyForm) {
      console.log(JSON.stringify({ applied: false, dryRunOnly: true }, null, 2));
    }
    const formCoverage = await computeLiveFormCoverage(db, sourceById);
    console.log(JSON.stringify({ liveFormCoverage: formCoverage }, null, 2));
    if ((apply || verifyForm) && !formCoverage.ok) throw new Error("PSSA_DISTRACTORROLE_FORM_COVERAGE_INCOMPLETE");
  } finally {
    await db.$disconnect();
  }
}

function assertDevOnlyGuard() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for PSSA distractorRole backfill");
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "");
  const matchesDev = url.hostname === DEV_DB.host && url.port === DEV_DB.port && database === DEV_DB.database;
  if (!matchesDev) {
    throw new Error(`Refusing PSSA distractorRole backfill outside exact dev DB ${DEV_DB.host}:${DEV_DB.port}/${DEV_DB.database}`);
  }
  if (process.env.ALLOW_PSSA_DISTRACTORROLE_BACKFILL !== "1") {
    throw new Error("Refusing PSSA distractorRole backfill without ALLOW_PSSA_DISTRACTORROLE_BACKFILL=1");
  }
}

function loadRoleBearingSourceItems() {
  const plan = buildPlan(3);
  const sourceById = new Map<string, SourceItem>();
  for (const item of [...plan.activeItems, ...plan.deprecatedItems]) {
    if (item.interactionType !== "MCQ") continue;
    const rebuiltSpec = buildPssaResponseSpec({
      interactionType: "MCQ",
      studentFacingPrompt: (item.responseSpecJson as any)?.prompt,
      choices: (item.responseSpecJson as any)?.choices,
      answerChoicesJson: (item.responseSpecJson as any)?.choices,
      structuredChoicesJson: (item.responseSpecJson as any)?.structuredChoicesJson,
      correctIndex: (item.correctResponseJson as any)?.correctIndex,
    }) as any;
    if (!hasCompleteRoleCoverage(rebuiltSpec, item.correctResponseJson)) continue;
    sourceById.set(item.itemId, {
      itemId: item.itemId,
      responseSpecJson: rebuiltSpec,
      correctResponseJson: item.correctResponseJson,
    });
  }
  return sourceById;
}

async function validateTargets(db: PrismaClient, sourceById: Map<string, SourceItem>, injectMismatch: boolean) {
  const dbItems = await db.pssaItem.findMany({
    where: { gradeLevel: 3, id: { in: [...sourceById.keys()] } },
    select: { id: true, responseSpecJson: true, correctResponseJson: true },
    orderBy: { id: "asc" },
  });
  const dbById = new Map(dbItems.map((item) => [item.id, item]));
  const missingDbItems = [...sourceById.keys()].filter((id) => !dbById.has(id));
  const rows: ValidationRow[] = [];
  const mismatches: Array<{ itemId: string; reason: string; currentChoices?: string[]; expectedChoices?: string[] }> = [];
  let mismatchInjected = false;
  for (const [itemId, source] of sourceById) {
    const current = dbById.get(itemId);
    if (!current) continue;
    const currentChoices = choiceTexts((current.responseSpecJson as any)?.choices ?? (current.responseSpecJson as any)?.structuredChoicesJson);
    const expectedChoices = choiceTexts((source.responseSpecJson as any)?.choices);
    const expectedForValidation = injectMismatch && !mismatchInjected
      ? [`__deliberate_bad_match__${expectedChoices[0] ?? ""}`, ...expectedChoices.slice(1)]
      : expectedChoices;
    mismatchInjected = mismatchInjected || injectMismatch;
    if (currentChoices.length !== expectedForValidation.length) {
      mismatches.push({ itemId, reason: "choice_count_mismatch", currentChoices, expectedChoices: expectedForValidation });
      continue;
    }
    if (!currentChoices.every((choice, index) => choice === expectedForValidation[index])) {
      mismatches.push({ itemId, reason: "choice_text_mismatch", currentChoices, expectedChoices: expectedForValidation });
      continue;
    }
    rows.push({
      itemId,
      currentSpec: current.responseSpecJson,
      nextSpec: source.responseSpecJson,
      currentChoices,
      expectedChoices,
      needsUpdate: stableStringify(current.responseSpecJson) !== stableStringify(source.responseSpecJson),
    });
  }
  return { rows, missingDbItems, mismatches };
}

async function computeLiveFormCoverage(db: PrismaClient, sourceById: Map<string, SourceItem>) {
  const form = await db.pssaForm.findUnique({
    where: { id: TARGET_FORM_ID },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { item: { select: { id: true, responseSpecJson: true, correctResponseJson: true } } },
      },
    },
  });
  if (!form) return { formId: TARGET_FORM_ID, formFound: false, ok: false };
  let roleEligibleMcqCount = 0;
  let mcqsWithCompleteRoleCoverage = 0;
  let expectedDistractorCount = 0;
  let distractorsWithRoles = 0;
  let correctChoicesWithRoles = 0;
  const incompleteItems: string[] = [];
  for (const row of form.items) {
    if (!sourceById.has(row.itemId)) continue;
    const spec = row.item.responseSpecJson as any;
    const choices = choiceTexts(spec?.choices);
    const structured = Array.isArray(spec?.structuredChoicesJson) ? spec.structuredChoicesJson : [];
    const correctIndex = (row.item.correctResponseJson as any)?.correctIndex;
    roleEligibleMcqCount += 1;
    expectedDistractorCount += Math.max(choices.length - 1, 0);
    let rowDistractorsWithRoles = 0;
    for (const [index, choice] of structured.entries()) {
      if (index === correctIndex) {
        if (typeof choice?.distractorRole === "string" && choice.distractorRole.trim()) correctChoicesWithRoles += 1;
      } else if (typeof choice?.distractorRole === "string" && choice.distractorRole.trim()) {
        rowDistractorsWithRoles += 1;
      }
    }
    distractorsWithRoles += rowDistractorsWithRoles;
    if (structured.length === choices.length && rowDistractorsWithRoles === choices.length - 1) {
      mcqsWithCompleteRoleCoverage += 1;
    } else {
      incompleteItems.push(row.itemId);
    }
  }
  return {
    formId: TARGET_FORM_ID,
    formFound: true,
    roleEligibleMcqCount,
    mcqsWithCompleteRoleCoverage,
    expectedDistractorCount,
    distractorsWithRoles,
    correctChoicesWithRoles,
    incompleteItems,
    ok: roleEligibleMcqCount === mcqsWithCompleteRoleCoverage
      && expectedDistractorCount === distractorsWithRoles
      && correctChoicesWithRoles === 0,
  };
}

function hasCompleteRoleCoverage(spec: any, correctResponseJson: any) {
  const choices = choiceTexts(spec?.choices);
  const structured = Array.isArray(spec?.structuredChoicesJson) ? spec.structuredChoicesJson : [];
  const correctIndex = correctResponseJson?.correctIndex;
  if (!choices.length || structured.length !== choices.length || !Number.isInteger(correctIndex)) return false;
  return structured.every((choice: any, index: number) => {
    if (index === correctIndex) return typeof choice?.distractorRole === "undefined";
    return typeof choice?.distractorRole === "string" && choice.distractorRole.trim().length > 0;
  });
}

function choiceTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((choice) => typeof choice === "string" ? choice : String((choice as any)?.text ?? ""));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
