import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import {
  assemblePssaFormFromPool,
  decidePssaFormWrite,
  GRADE3_BLUEPRINT,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT,
  verifyPssaFormSnapshots,
  type AssemblyResult,
  type DeficitRow,
  type GateResult,
  type SelectedFormItem,
} from "./lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./lib/pssa-import-plan";
import { getStudentReadyPssaItems } from "./lib/pssa-student-ready-selector";

const REPORT_DIR = path.resolve("reports");

type Args = {
  env: string | null;
  grade: number | null;
  seed: string | null;
  blueprint: string | null;
  write: boolean;
  allowProduction: boolean;
  verify: string | null;
  assembledBy: string;
};

export function resolveAllowedGrade3BlueprintVersion(blueprint: string): string {
  const allowed: readonly string[] = [
    GRADE3_BLUEPRINT.blueprintVersion,
    GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
  ];
  if (allowed.includes(blueprint)) return blueprint;
  throw new Error(`--blueprint must be one of: ${allowed.join(", ")}.`);
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    env: null,
    grade: null,
    seed: null,
    blueprint: null,
    write: false,
    allowProduction: false,
    verify: null,
    assembledBy: "codex",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return value;
    };
    if (arg === "--env") args.env = next();
    else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--grade") args.grade = Number(next());
    else if (arg.startsWith("--grade=")) args.grade = Number(arg.slice("--grade=".length));
    else if (arg === "--seed") args.seed = next();
    else if (arg.startsWith("--seed=")) args.seed = arg.slice("--seed=".length);
    else if (arg === "--blueprint") args.blueprint = next();
    else if (arg.startsWith("--blueprint=")) args.blueprint = arg.slice("--blueprint=".length);
    else if (arg === "--dry-run") args.write = false;
    else if (arg === "--write") args.write = true;
    else if (arg === "--allow-production") args.allowProduction = true;
    else if (arg === "--verify") args.verify = next();
    else if (arg.startsWith("--verify=")) args.verify = arg.slice("--verify=".length);
    else if (arg === "--assembled-by") args.assembledBy = next();
    else if (arg.startsWith("--assembled-by=")) args.assembledBy = arg.slice("--assembled-by=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.grade !== GRADE3_BLUEPRINT.gradeLevel) throw new Error("--grade must be 3 for DB-6.");
  args.blueprint = resolveAllowedGrade3BlueprintVersion(args.blueprint ?? "");
  if (!args.verify && !args.seed) throw new Error("--seed is required for assembly.");
  if (args.verify && args.write) throw new Error("--verify is its own write path; do not combine with --write.");
  if ((args.write || args.verify) && args.env !== "dev") throw new Error("--write/--verify requires explicit --env dev.");
  if (args.write || args.verify) {
    if (!process.env.DATABASE_URL) throw new Error("--write/--verify requires DATABASE_URL.");
    const envValues = [process.env.NODE_ENV, process.env.APP_ENV, args.env, process.env.DATABASE_URL].filter(Boolean).map((value) => value!.toLowerCase());
    const looksProduction = envValues.some((value) => value.includes("prod") || value.includes("production"));
    if (looksProduction && !args.allowProduction) throw new Error("Refusing production-like environment without --allow-production.");
  }
  return args;
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], columns: string[]) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function redactedDbTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return "DATABASE_URL missing";
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.username ? "(user)" : "(missing-user)"}:${parsed.password ? "(redacted)" : "(missing)"}@${parsed.hostname}:${parsed.port || "(default)"}/${parsed.pathname.replace(/^\//, "")}`;
}

function writeAssemblyReports(result: AssemblyResult, args: Args, mode: "dry-run" | "write" | "noop" | "refused") {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  writeCsv(path.join(REPORT_DIR, "pssa_db6_selection.csv"), result.items as any, ["position", "itemId", "slotType", "pointValue", "category", "passageId", "approvedContentHashSnapshot"]);
  writeCsv(path.join(REPORT_DIR, "pssa_db6_deficit_report.csv"), result.deficits as any, ["slot", "required", "available", "deficit", "nearMissItemIds", "nearMissBlockedReasons"]);
  const gateRows = result.gates.map((gate) => `| ${gate.gate} | ${gate.status} | ${gate.detail.replace(/\|/g, "\\|")} |`);
  const itemRows = result.items.map((item) => `| ${item.position} | ${item.itemId} | ${item.slotType} | ${item.pointValue} | ${item.category} | ${item.passageId ?? ""} |`);
  const passageRows = result.passages.map((passage) => `| ${passage.position} | ${passage.passageId} | ${passage.categoryPoints.A} | ${passage.categoryPoints.B} | ${passage.categoryPoints.D} | ${passage.approvedPassageContentHashSnapshot} |`);
  const lines = [
    "# PSSA DB-6 Assembly Summary",
    "",
    `- DB target: ${redactedDbTarget()}`,
    `- Mode: ${mode}`,
    `- Seed: ${args.seed ?? ""}`,
    `- Blueprint version: ${args.blueprint}`,
    `- Result: ${result.ok ? "PASS" : "REFUSED"}`,
    `- Refused reason: ${result.refusedReason ?? ""}`,
    `- Content hash: ${result.contentHash ?? ""}`,
    `- Total points: ${result.totalPoints}`,
    `- Category points: A=${result.categoryPoints.A}, B=${result.categoryPoints.B}, D=${result.categoryPoints.D}`,
    "",
    "## Passage Category Points",
    "",
    "| Position | Passage | A | B | D | Approved hash snapshot |",
    "|---:|---|---:|---:|---:|---|",
    ...passageRows,
    "",
    "## Selection",
    "",
    "| Position | Item | Slot type | Points | Category | Passage |",
    "|---:|---|---|---:|---|---|",
    ...itemRows,
    "",
    "## Gates",
    "",
    "| Gate | Status | Detail |",
    "|---|---|---|",
    ...gateRows,
    "",
    "## Reports",
    "",
    `- Selection CSV: ${path.join(REPORT_DIR, "pssa_db6_selection.csv")}`,
    `- Deficit CSV: ${path.join(REPORT_DIR, "pssa_db6_deficit_report.csv")}`,
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "pssa_db6_assembly_summary.md"), `${lines.join("\n")}\n`);
}

function writeDeterminismProof(first: AssemblyResult, second: AssemblyResult, seed: string) {
  writeCsv(path.join(REPORT_DIR, "pssa_db6_determinism_proof.csv"), [{
    seed,
    firstOk: first.ok,
    secondOk: second.ok,
    firstHash: first.contentHash,
    secondHash: second.contentHash,
    hashMatch: first.contentHash === second.contentHash,
    selectionMatch: JSON.stringify(first.items) === JSON.stringify(second.items),
  }], ["seed", "firstOk", "secondOk", "firstHash", "secondHash", "hashMatch", "selectionMatch"]);
}

async function loadAllGrade3Items(db: PrismaClient) {
  return db.pssaItem.findMany({
    where: { gradeLevel: GRADE3_BLUEPRINT.gradeLevel, subject: GRADE3_BLUEPRINT.subject },
    include: {
      batch: true,
      passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { id: "asc" },
  }) as any;
}

async function assemble(db: PrismaClient, args: Args) {
  const [readyItems, allItems] = await Promise.all([
    getStudentReadyPssaItems(db, { gradeLevel: GRADE3_BLUEPRINT.gradeLevel, subject: GRADE3_BLUEPRINT.subject }) as any,
    loadAllGrade3Items(db),
  ]);
  const result = assemblePssaFormFromPool({
    seed: args.seed!,
    blueprintVersion: args.blueprint!,
    readyItems,
    allItems,
  });
  const proof = assemblePssaFormFromPool({
    seed: args.seed!,
    blueprintVersion: args.blueprint!,
    readyItems,
    allItems,
  });
  writeDeterminismProof(result, proof, args.seed!);
  if (!result.ok) {
    writeAssemblyReports(result, args, "refused");
    throw new Error(`DB-6 assembly refused: ${result.refusedReason}`);
  }
  if (!args.write) {
    writeAssemblyReports(result, args, "dry-run");
    return { action: "dry-run", result };
  }
  const dbAny = db as any;
  const existing = await dbAny.pssaForm.findUnique({ where: { contentHash: result.contentHash! } });
  const writeDecision = decidePssaFormWrite(existing);
  switch (writeDecision.action) {
    case "noop":
      writeAssemblyReports(result, args, "noop");
      return { action: "noop", result };
    case "refuse_invalidated_collision":
      writeAssemblyReports(result, args, "refused");
      throw new Error(`DB-6 write refused: contentHash matches invalidated form ${writeDecision.formId}.`);
    case "create":
      break;
  }
  const assemblyRunId = `pssa-db6-${Date.now()}-${args.seed}`;
  await db.$transaction(async (tx) => {
    const txAny = tx as any;
    const created = await txAny.pssaForm.create({
      data: {
        module: GRADE3_BLUEPRINT.module,
        subject: GRADE3_BLUEPRINT.subject,
        gradeLevel: GRADE3_BLUEPRINT.gradeLevel,
        blueprintVersion: args.blueprint!,
        seed: args.seed!,
        formStatus: "assembled",
        totalPoints: result.totalPoints,
        categoryPointsJson: result.categoryPoints,
        contentHash: result.contentHash!,
        auditContractVersion: AUDIT_CONTRACT_VERSION,
        sourceScanVersion: SOURCE_SCAN_VERSION,
        assembledAt: new Date(),
        assembledBy: args.assembledBy,
        assemblyRunId,
        passages: {
          create: result.passages.map((passage) => ({
            passageId: passage.passageId,
            position: passage.position,
            approvedPassageContentHashSnapshot: passage.approvedPassageContentHashSnapshot,
          })),
        },
        items: {
          create: result.items.map((item) => ({
            itemId: item.itemId,
            position: item.position,
            pointValue: item.pointValue,
            slotType: item.slotType,
            scoringBucket: item.scoringBucket ?? "operational",
            approvedContentHashSnapshot: item.approvedContentHashSnapshot,
            passageIdSnapshot: item.passageId,
          })),
        },
      },
      include: { items: true, passages: true },
    });
    if (created.items.length !== result.items.length || created.passages.length !== result.passages.length) {
      throw new Error("DB-6 post-write assertion failed: inserted row counts do not match selection.");
    }
  });
  writeAssemblyReports(result, args, "write");
  return { action: "write", result };
}

async function verify(db: PrismaClient, args: Args) {
  const dbAny = db as any;
  const form = await dbAny.pssaForm.findUnique({
    where: { id: args.verify! },
    include: {
      items: { include: { item: { include: { batch: true, passages: { include: { passage: true }, orderBy: { sortOrder: "asc" } } } } }, orderBy: { position: "asc" } },
      passages: { include: { passage: true }, orderBy: { position: "asc" } },
    },
  });
  if (!form) throw new Error(`PssaForm not found: ${args.verify}`);
  const liveReadyItems = await getStudentReadyPssaItems(db, { gradeLevel: form.gradeLevel, subject: form.subject }) as any;
  const verification = verifyPssaFormSnapshots({ form, liveReadyItems });
  const rows = verification.failures.map((failure) => ({ formId: form.id, failure }));
  writeCsv(path.join(REPORT_DIR, "pssa_db6_verify_report.csv"), rows, ["formId", "failure"]);
  if (!verification.ok) {
    await dbAny.pssaForm.update({
      where: { id: form.id },
      data: { formStatus: "invalidated", invalidatedReason: verification.invalidatedReason },
    });
  }
  return verification;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    if (args.verify) {
      const result = await verify(db, args);
      console.log(`PSSA DB-6 verify complete. ok=${result.ok}, failures=${result.failures.length}`);
      if (!result.ok) console.log(`invalidatedReason=${result.invalidatedReason}`);
      return;
    }
    const { action, result } = await assemble(db, args);
    console.log(`PSSA DB-6 ${action} complete.`);
    console.log(`ok=${result.ok}, contentHash=${result.contentHash}, totalPoints=${result.totalPoints}, A=${result.categoryPoints.A}, B=${result.categoryPoints.B}, D=${result.categoryPoints.D}`);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
