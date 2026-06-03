import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import {
  classifyPssaItemForReview,
  classifyPssaPassageForReview,
  fetchPssaReviewTargets,
  getPssaReviewCounts,
  pssaBatchDriftDetail,
  writeClassifiedPssaReviews,
  type PssaReviewAction,
  type PssaReviewClassification,
} from "../../lib/content/pssaItemReview";
import { getStudentReadyPssaItems } from "./lib/pssa-student-ready-selector";

const REPORT_DIR = path.resolve("reports");

type Target = "item" | "passage" | "passages" | "batch";

type Args = {
  target: Target | null;
  itemId: string | null;
  passageId: string | null;
  batchId: string | null;
  gradeLevel: number | null;
  env: string | null;
  reviewer: string | null;
  reason: string | null;
  action: PssaReviewAction;
  write: boolean;
  allowProduction: boolean;
  attestLicenseCleared: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    target: null,
    itemId: null,
    passageId: null,
    batchId: null,
    gradeLevel: null,
    env: null,
    reviewer: null,
    reason: null,
    action: "approve",
    write: false,
    allowProduction: false,
    attestLicenseCleared: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}.`);
      i += 1;
      return value;
    };
    if (arg === "--target") args.target = next() as Target;
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length) as Target;
    else if (arg === "--item") args.itemId = next();
    else if (arg.startsWith("--item=")) args.itemId = arg.slice("--item=".length);
    else if (arg === "--passage") args.passageId = next();
    else if (arg.startsWith("--passage=")) args.passageId = arg.slice("--passage=".length);
    else if (arg === "--batch") args.batchId = next();
    else if (arg.startsWith("--batch=")) args.batchId = arg.slice("--batch=".length);
    else if (arg === "--grade") args.gradeLevel = Number(next());
    else if (arg.startsWith("--grade=")) args.gradeLevel = Number(arg.slice("--grade=".length));
    else if (arg === "--env") args.env = next();
    else if (arg.startsWith("--env=")) args.env = arg.slice("--env=".length);
    else if (arg === "--reviewer") args.reviewer = next();
    else if (arg.startsWith("--reviewer=")) args.reviewer = arg.slice("--reviewer=".length);
    else if (arg === "--reason") args.reason = next();
    else if (arg.startsWith("--reason=")) args.reason = arg.slice("--reason=".length);
    else if (arg === "--action") args.action = next() as PssaReviewAction;
    else if (arg.startsWith("--action=")) args.action = arg.slice("--action=".length) as PssaReviewAction;
    else if (arg === "--write") args.write = true;
    else if (arg === "--dry-run") args.write = false;
    else if (arg === "--allow-production") args.allowProduction = true;
    else if (arg === "--attest-license-cleared") args.attestLicenseCleared = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.target || !["item", "passage", "passages", "batch"].includes(args.target)) throw new Error("--target must be item, passage, passages, or batch.");
  if (!["approve", "reject", "revoke"].includes(args.action)) throw new Error("--action must be approve, reject, or revoke.");
  if (args.target === "item" && !args.itemId) throw new Error("--target item requires --item.");
  if (args.target === "passage" && !args.passageId) throw new Error("--target passage requires --passage.");
  if (args.target === "passages" && !args.gradeLevel) throw new Error("--target passages requires --grade.");
  if (args.target === "batch" && !args.batchId) throw new Error("--target batch requires --batch.");
  if (args.write) {
    if (args.env !== "dev") throw new Error("--write requires explicit --env dev.");
    if (!process.env.DATABASE_URL) throw new Error("--write requires DATABASE_URL.");
    if (!args.reviewer) throw new Error("--write requires --reviewer.");
    const envValues = [process.env.NODE_ENV, process.env.APP_ENV, args.env].filter(Boolean).map((value) => value!.toLowerCase());
    const looksProduction = envValues.some((value) => value.includes("prod") || value === "production");
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

function writeReports(rows: PssaReviewClassification[], args: Args, readyCount: number) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const csvPath = path.join(REPORT_DIR, "pssa_db5_approval_dryrun.csv");
  writeCsv(csvPath, rows as any, ["kind", "id", "batchId", "bucket", "blockedReason", "detail", "sourceType", "licenseStatus", "writeAction"]);
  const counts = {
    eligible: rows.filter((row) => row.bucket === "eligible_to_approve").length,
    noop: rows.filter((row) => row.bucket === "already_approved_noop").length,
    refused: rows.filter((row) => row.bucket === "refused").length,
  };
  const summary = [
    "# PSSA DB-5 Approval Write Summary",
    "",
    `- DB target: ${redactedDbTarget()}`,
    `- Mode: ${args.write ? "write" : "dry-run"}`,
    `- Target: ${args.target}`,
    `- Action: ${args.action}`,
    `- Eligible/actionable rows: ${counts.eligible}`,
    `- Already no-op rows: ${counts.noop}`,
    `- Refused rows: ${counts.refused}`,
    `- Student-ready selector count after run: ${readyCount}`,
    `- Dry-run CSV: ${csvPath}`,
    "",
    "## Guardrails",
    "",
    "- Any refused row aborts the whole write before mutation.",
    "- Already-ready rows are no-ops and do not receive duplicate review logs.",
    "- Student readiness is computed live by the DB-5 selector.",
  ];
  fs.writeFileSync(path.join(REPORT_DIR, "pssa_db5_approval_write_summary.md"), `${summary.join("\n")}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    const selected = await fetchPssaReviewTargets(db, {
      target: args.target!,
      itemId: args.itemId,
      passageId: args.passageId,
      batchId: args.batchId,
      gradeLevel: args.gradeLevel,
    });
    const drift = await pssaBatchDriftDetail(db, { target: args.target!, action: args.action, batchId: args.batchId });
    const rows = [
      ...selected.passages.map((passage) => classifyPssaPassageForReview(passage, { action: args.action, attestLicenseCleared: args.attestLicenseCleared })),
      ...selected.items.map((item) => classifyPssaItemForReview(item, { action: args.action, attestLicenseCleared: args.attestLicenseCleared, batchDriftDetail: drift })),
    ];
    const refused = rows.filter((row) => row.bucket === "refused");
    if (args.write && refused.length) {
      writeReports(rows, args, await getStudentReadyPssaItems(db, { gradeLevel: args.gradeLevel ?? undefined, batchId: args.batchId ?? undefined }).then((items) => items.length));
      throw new Error(`DB-5 write refused: ${refused.length} selected row(s) failed approval gates.`);
    }
    if (args.write) {
      await writeClassifiedPssaReviews(db, rows, selected.items, selected.passages, {
        reviewerUserId: args.reviewer!,
        reason: args.reason,
        attestLicenseCleared: args.attestLicenseCleared,
      });
    }
    const ready = await getStudentReadyPssaItems(db, { gradeLevel: args.gradeLevel ?? undefined, batchId: args.batchId ?? undefined });
    writeReports(rows, args, ready.length);
    const counts = {
      eligible: rows.filter((row) => row.bucket === "eligible_to_approve").length,
      noop: rows.filter((row) => row.bucket === "already_approved_noop").length,
      refused: refused.length,
    };
    console.log(`PSSA DB-5 ${args.write ? "write" : "dry-run"} complete.`);
    console.log(`eligible=${counts.eligible}, noop=${counts.noop}, refused=${counts.refused}, studentReady=${ready.length}`);
    if (args.write && args.target === "batch") {
      const reviewCounts = await getPssaReviewCounts(args.gradeLevel ?? 3);
      console.log(`pendingItems=${reviewCounts.pendingItems}, pendingPassages=${reviewCounts.pendingPassages}, approved=${reviewCounts.approved}`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
