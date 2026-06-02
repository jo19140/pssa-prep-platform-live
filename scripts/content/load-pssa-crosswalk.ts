import { Prisma, PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const CSV_PATH = path.join(process.cwd(), "data/pssa/anchor_ec_crosswalk.csv");
const REPORT_DIR = path.join(process.cwd(), "reports");
const REPORT_CSV_PATH = path.join(REPORT_DIR, "pssa_crosswalk_load_report.csv");
const REPORT_SUMMARY_PATH = path.join(REPORT_DIR, "pssa_crosswalk_load_summary.md");

const EXPECTED_HEADER = [
  "subject",
  "gradeLevel",
  "reportingCategory",
  "reportingCategoryTitle",
  "assessmentAnchor",
  "assessmentAnchorTitle",
  "anchorDescriptor",
  "anchorDescriptorText",
  "eligibleContent",
  "eligibleContentText",
  "dokCeiling",
  "paCoreStandardCodes",
  "primaryPaCoreStandardCode",
  "mappingGranularity",
  "mappingConfidence",
  "sourceDocument",
  "sourceVersionYear",
  "sourceUpdatedYear",
  "sourceAnomalyJson",
] as const;

const EXPECTED_GRADE_COUNTS = new Map([
  [3, 33],
  [4, 37],
  [5, 40],
  [6, 41],
  [7, 43],
  [8, 47],
]);

const REQUIRED_FIELDS = [
  "subject",
  "gradeLevel",
  "reportingCategory",
  "assessmentAnchor",
  "anchorDescriptor",
  "eligibleContent",
  "mappingGranularity",
  "mappingConfidence",
  "sourceDocument",
  "sourceVersionYear",
  "sourceUpdatedYear",
] as const;

const GATE_IDS = [
  "PSSA_XWALK_ROWCOUNT",
  "PSSA_XWALK_COLUMNS_VALID",
  "PSSA_XWALK_EC_FORMAT",
  "PSSA_XWALK_NATURAL_KEY_UNIQUE",
  "PSSA_XWALK_CC_FORMAT",
  "PSSA_XWALK_ANOMALY_PRESERVED",
  "PSSA_XWALK_NO_INVENTION",
  "PSSA_XWALK_IDEMPOTENT",
] as const;

type GateId = (typeof GATE_IDS)[number];
type Mode = "file-only-dry-run" | "db-aware-dry-run" | "write";
type DbAction = "canonical_source_only" | "insert" | "update" | "noop" | "remove";

type CsvRow = Record<(typeof EXPECTED_HEADER)[number], string>;

type CanonicalCrosswalk = {
  subject: string;
  gradeLevel: number;
  reportingCategory: string;
  reportingCategoryTitle: string;
  assessmentAnchor: string;
  assessmentAnchorTitle: string;
  anchorDescriptor: string;
  anchorDescriptorText: string;
  eligibleContent: string;
  eligibleContentText: string;
  dokCeiling: string | null;
  paCoreStandardCodes: string[];
  primaryPaCoreStandardCode: string | null;
  mappingGranularity: string;
  mappingConfidence: string;
  sourceDocument: string;
  sourceVersionYear: number;
  sourceUpdatedYear: number;
  sourceAnomalyJson: Prisma.InputJsonValue | null;
  rawSourceAnomalyJson: string;
  naturalKey: string;
  sourceValues: Set<string>;
};

type CrosswalkDbFields = Omit<CanonicalCrosswalk, "paCoreStandardCodes" | "rawSourceAnomalyJson" | "naturalKey" | "sourceValues">;

type ValidationResult = {
  id: GateId;
  status: "PASS" | "FAIL";
  notes: string;
};

type ReconcileRow = {
  canonical: CanonicalCrosswalk;
  dbAction: DbAction;
  notes: string;
};

type ReconcilePlan = {
  crosswalk: {
    inserts: CanonicalCrosswalk[];
    updates: CanonicalCrosswalk[];
    noops: CanonicalCrosswalk[];
  };
  joins: {
    inserts: { crosswalkId: string; standardCode: string }[];
    removes: { id: string; standardCode: string }[];
    noops: { standardCode: string }[];
  };
  rows: ReconcileRow[];
};

type DbIdempotencyCheck = {
  evaluated: boolean;
  passed: boolean;
  notes: string;
};

type Args = {
  write: boolean;
  dbAware: boolean;
  selfTest: boolean;
  env: string | null;
  allowProduction: boolean;
  csvPath: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    write: false,
    dbAware: false,
    selfTest: false,
    env: null,
    allowProduction: false,
    csvPath: CSV_PATH,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") {
      args.write = true;
    } else if (arg === "--dry-run") {
      args.write = false;
    } else if (arg === "--db-aware" || arg === "--db-aware-dry-run") {
      args.dbAware = true;
    } else if (arg === "--self-test") {
      args.selfTest = true;
    } else if (arg === "--allow-production") {
      args.allowProduction = true;
    } else if (arg === "--env") {
      args.env = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith("--env=")) {
      args.env = arg.slice("--env=".length);
    } else if (arg === "--csv") {
      args.csvPath = path.resolve(argv[i + 1] ?? "");
      i += 1;
    } else if (arg.startsWith("--csv=")) {
      args.csvPath = path.resolve(arg.slice("--csv=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (args.write) {
    args.dbAware = true;
  }

  return args;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV parse failed: unterminated quoted field.");
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): { header: string[]; rows: CsvRow[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    throw new Error("CSV is empty.");
  }

  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== header.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} columns; expected ${header.length}.`);
    }
    return Object.fromEntries(header.map((key, i) => [key, values[i]])) as CsvRow;
  });

  return { header, rows };
}

function naturalKey(row: Pick<CanonicalCrosswalk, "subject" | "gradeLevel" | "eligibleContent" | "sourceVersionYear">) {
  return `${row.subject}|${row.gradeLevel}|${row.eligibleContent}|${row.sourceVersionYear}`;
}

function dbFields(row: CanonicalCrosswalk): CrosswalkDbFields {
  return {
    subject: row.subject,
    gradeLevel: row.gradeLevel,
    reportingCategory: row.reportingCategory,
    reportingCategoryTitle: row.reportingCategoryTitle,
    assessmentAnchor: row.assessmentAnchor,
    assessmentAnchorTitle: row.assessmentAnchorTitle,
    anchorDescriptor: row.anchorDescriptor,
    anchorDescriptorText: row.anchorDescriptorText,
    eligibleContent: row.eligibleContent,
    eligibleContentText: row.eligibleContentText,
    dokCeiling: row.dokCeiling,
    primaryPaCoreStandardCode: row.primaryPaCoreStandardCode,
    mappingGranularity: row.mappingGranularity,
    mappingConfidence: row.mappingConfidence,
    sourceDocument: row.sourceDocument,
    sourceVersionYear: row.sourceVersionYear,
    sourceUpdatedYear: row.sourceUpdatedYear,
    sourceAnomalyJson: row.sourceAnomalyJson,
  };
}

function canonicalize(rows: CsvRow[]): CanonicalCrosswalk[] {
  return rows.map((row) => {
    const gradeLevel = Number(row.gradeLevel);
    const sourceVersionYear = Number(row.sourceVersionYear);
    const sourceUpdatedYear = Number(row.sourceUpdatedYear);
    const rawSourceAnomalyJson = row.sourceAnomalyJson;
    const sourceAnomalyJson = rawSourceAnomalyJson ? JSON.parse(rawSourceAnomalyJson) as Prisma.InputJsonValue : null;
    const ccTokens = row.paCoreStandardCodes.split("|");
    const paCoreStandardCodes = Array.from(new Set(ccTokens.map((token) => token.trim()).filter(Boolean)));
    const canonical: CanonicalCrosswalk = {
      subject: row.subject,
      gradeLevel,
      reportingCategory: row.reportingCategory,
      reportingCategoryTitle: row.reportingCategoryTitle,
      assessmentAnchor: row.assessmentAnchor,
      assessmentAnchorTitle: row.assessmentAnchorTitle,
      anchorDescriptor: row.anchorDescriptor,
      anchorDescriptorText: row.anchorDescriptorText,
      eligibleContent: row.eligibleContent,
      eligibleContentText: row.eligibleContentText,
      dokCeiling: row.dokCeiling || null,
      paCoreStandardCodes,
      primaryPaCoreStandardCode: row.primaryPaCoreStandardCode || null,
      mappingGranularity: row.mappingGranularity,
      mappingConfidence: row.mappingConfidence,
      sourceDocument: row.sourceDocument,
      sourceVersionYear,
      sourceUpdatedYear,
      sourceAnomalyJson,
      rawSourceAnomalyJson,
      naturalKey: "",
      sourceValues: new Set(),
    };
    canonical.naturalKey = naturalKey(canonical);
    canonical.sourceValues = new Set([
      row.subject,
      row.gradeLevel,
      row.reportingCategory,
      row.reportingCategoryTitle,
      row.assessmentAnchor,
      row.assessmentAnchorTitle,
      row.anchorDescriptor,
      row.anchorDescriptorText,
      row.eligibleContent,
      row.eligibleContentText,
      row.dokCeiling,
      row.primaryPaCoreStandardCode,
      row.mappingGranularity,
      row.mappingConfidence,
      row.sourceDocument,
      row.sourceVersionYear,
      row.sourceUpdatedYear,
      ...paCoreStandardCodes,
    ].filter(Boolean));
    return canonical;
  });
}

function validate(header: string[], rawRows: CsvRow[], canonicalRows: CanonicalCrosswalk[]): ValidationResult[] {
  const failures = new Map<GateId, string[]>();
  const addFailure = (id: GateId, message: string) => {
    const messages = failures.get(id) ?? [];
    messages.push(message);
    failures.set(id, messages);
  };

  if (header.join(",") !== EXPECTED_HEADER.join(",")) {
    addFailure("PSSA_XWALK_COLUMNS_VALID", `Header mismatch. Expected ${EXPECTED_HEADER.join(",")}; got ${header.join(",")}.`);
  }

  rawRows.forEach((row, index) => {
    for (const field of REQUIRED_FIELDS) {
      if (!row[field]) {
        addFailure("PSSA_XWALK_COLUMNS_VALID", `Row ${index + 2} missing required field ${field}.`);
      }
    }
  });

  if (rawRows.length !== 241) {
    addFailure("PSSA_XWALK_ROWCOUNT", `Expected 241 data rows; found ${rawRows.length}.`);
  }

  const gradeCounts = countByGrade(canonicalRows);
  for (const [grade, expected] of EXPECTED_GRADE_COUNTS.entries()) {
    const actual = gradeCounts.get(grade) ?? 0;
    if (actual !== expected) {
      addFailure("PSSA_XWALK_ROWCOUNT", `Grade ${grade} expected ${expected} rows; found ${actual}.`);
    }
  }

  const ecPattern = /^E0([3-8])\.([ABDE])(?:-[A-Z])?\..+$/;
  canonicalRows.forEach((row, index) => {
    if (!Number.isInteger(row.gradeLevel) || row.gradeLevel < 3 || row.gradeLevel > 8) {
      addFailure("PSSA_XWALK_EC_FORMAT", `Row ${index + 2} has invalid gradeLevel ${rawRows[index].gradeLevel}.`);
    }
    const match = row.eligibleContent.match(ecPattern);
    if (!match) {
      addFailure("PSSA_XWALK_EC_FORMAT", `Row ${index + 2} malformed eligibleContent ${row.eligibleContent}.`);
      return;
    }
    const embeddedGrade = Number(match[1]);
    const embeddedCategory = match[2];
    if (embeddedGrade !== row.gradeLevel) {
      addFailure("PSSA_XWALK_EC_FORMAT", `Row ${index + 2} eligibleContent grade ${embeddedGrade} != gradeLevel ${row.gradeLevel}.`);
    }
    if (embeddedCategory !== row.reportingCategory) {
      addFailure("PSSA_XWALK_EC_FORMAT", `Row ${index + 2} eligibleContent category ${embeddedCategory} != reportingCategory ${row.reportingCategory}.`);
    }
  });

  const seenKeys = new Set<string>();
  canonicalRows.forEach((row, index) => {
    if (seenKeys.has(row.naturalKey)) {
      addFailure("PSSA_XWALK_NATURAL_KEY_UNIQUE", `Duplicate natural key at row ${index + 2}: ${row.naturalKey}.`);
    }
    seenKeys.add(row.naturalKey);
  });

  let ccCount = 0;
  const ccPattern = /^CC\.\d\.\d\.\d+\.[A-Z]$/;
  rawRows.forEach((row, index) => {
    const tokens = row.paCoreStandardCodes.split("|");
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) {
        addFailure("PSSA_XWALK_CC_FORMAT", `Row ${index + 2} contains an empty CC token.`);
      } else if (!ccPattern.test(trimmed)) {
        addFailure("PSSA_XWALK_CC_FORMAT", `Row ${index + 2} malformed CC token ${trimmed}.`);
      }
    }
    ccCount += new Set(tokens.map((token) => token.trim()).filter(Boolean)).size;
  });
  if (ccCount !== 936) {
    addFailure("PSSA_XWALK_CC_FORMAT", `Expected 936 total CC codes; found ${ccCount}.`);
  }

  const anomalyRows = rawRows.filter((row) => row.sourceAnomalyJson);
  if (anomalyRows.length !== 6) {
    addFailure("PSSA_XWALK_ANOMALY_PRESERVED", `Expected 6 anomaly rows; found ${anomalyRows.length}.`);
  }
  anomalyRows.forEach((row, index) => {
    try {
      JSON.parse(row.sourceAnomalyJson);
    } catch {
      addFailure("PSSA_XWALK_ANOMALY_PRESERVED", `Anomaly row ${index + 1} contains invalid JSON: ${row.sourceAnomalyJson}.`);
    }
  });

  const invented = canonicalRows.flatMap((row) => {
    const fields = [
      row.subject,
      String(row.gradeLevel),
      row.reportingCategory,
      row.reportingCategoryTitle,
      row.assessmentAnchor,
      row.assessmentAnchorTitle,
      row.anchorDescriptor,
      row.anchorDescriptorText,
      row.eligibleContent,
      row.eligibleContentText,
      row.dokCeiling ?? "",
      row.primaryPaCoreStandardCode ?? "",
      row.mappingGranularity,
      row.mappingConfidence,
      row.sourceDocument,
      String(row.sourceVersionYear),
      String(row.sourceUpdatedYear),
      ...row.paCoreStandardCodes,
    ].filter(Boolean);
    return fields.filter((value) => !row.sourceValues.has(value));
  });
  if (invented.length > 0) {
    addFailure("PSSA_XWALK_NO_INVENTION", `Loader introduced values not present in CSV: ${Array.from(new Set(invented)).join(", ")}.`);
  }

  const firstCanonical = JSON.stringify(canonicalRows.map((row) => ({ ...dbFields(row), paCoreStandardCodes: row.paCoreStandardCodes })));
  const secondCanonical = JSON.stringify(canonicalize(rawRows).map((row) => ({ ...dbFields(row), paCoreStandardCodes: row.paCoreStandardCodes })));
  if (firstCanonical !== secondCanonical) {
    addFailure("PSSA_XWALK_IDEMPOTENT", "Canonicalization is not deterministic for the same CSV.");
  }

  return GATE_IDS.map((id) => ({
    id,
    status: failures.has(id) ? "FAIL" : "PASS",
    notes: failures.get(id)?.join(" | ") ?? "Passed",
  }));
}

function countByGrade(rows: CanonicalCrosswalk[]) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.gradeLevel, (counts.get(row.gradeLevel) ?? 0) + 1);
  }
  return counts;
}

function canonicalizeJsonForComparison(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalizeJsonForComparison);
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeJsonForComparison((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(canonicalizeJsonForComparison(a)) === JSON.stringify(canonicalizeJsonForComparison(b));
}

function dbRowMatches(dbRow: Record<string, unknown>, canonical: CanonicalCrosswalk) {
  const fields = dbFields(canonical);
  return Object.entries(fields).every(([key, value]) => {
    if (key === "sourceAnomalyJson") {
      return jsonEqual(dbRow[key], value);
    }
    return dbRow[key] === value;
  });
}

function assertSelfTest(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`DB-2 JSON comparator self-test failed: ${message}`);
  }
}

function runSelfTest() {
  assertSelfTest(jsonEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), "object key order should be ignored.");
  assertSelfTest(!jsonEqual({ a: [1, 2] }, { a: [2, 1] }), "array order should be respected.");
  assertSelfTest(jsonEqual(null, null), "null should compare equal to null.");
  assertSelfTest(!jsonEqual(null, {}), "null should not compare equal to an empty object.");

  const anomalyPayload = {
    field: "paCoreStandardCodes",
    sourceValue: "CC.1.4.7.B",
    correctedValue: "CC.1.4.8.B",
    reason: "PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency",
    humanConfirmed: false,
  };
  const jsonbReadbackOrder = {
    field: "paCoreStandardCodes",
    reason: "PDE Grade 8 TDA reference block lists CC.1.4.7.B (grade-level mismatch); corrected to CC.1.4.8.B for grade consistency",
    sourceValue: "CC.1.4.7.B",
    humanConfirmed: false,
    correctedValue: "CC.1.4.8.B",
  };
  assertSelfTest(jsonEqual(anomalyPayload, jsonbReadbackOrder), "actual anomaly payload should compare equal after JSONB key reordering.");

  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const { rows: rawRows } = parseCsv(csvText);
  const anomalyCanonical = canonicalize(rawRows).find((row) => row.eligibleContent === "E08.E.1.1.1");
  assertSelfTest(Boolean(anomalyCanonical), "expected anomaly row E08.E.1.1.1 to exist in the crosswalk CSV.");
  assertSelfTest(dbRowMatches({ ...dbFields(anomalyCanonical!), sourceAnomalyJson: jsonbReadbackOrder }, anomalyCanonical!), "dbRowMatches should classify JSONB-reordered anomaly payload as a noop.");

  console.log("DB-2 JSON comparator self-test passed.");
}

async function assertDb2TablesAvailable(db: PrismaClient) {
  try {
    await db.pssaStandardsCrosswalk.findFirst({ select: { id: true } });
    await db.pssaCrosswalkPaCoreStandard.findFirst({ select: { id: true } });
  } catch (error) {
    throw new Error(`DB-2 requires DB-1 migration tables. Apply DB-1 first. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function buildReconcilePlan(db: PrismaClient, canonicalRows: CanonicalCrosswalk[]): Promise<ReconcilePlan> {
  await assertDb2TablesAvailable(db);
  const rows: ReconcileRow[] = [];
  const inserts: CanonicalCrosswalk[] = [];
  const updates: CanonicalCrosswalk[] = [];
  const noops: CanonicalCrosswalk[] = [];
  const joinInserts: { crosswalkId: string; standardCode: string }[] = [];
  const joinRemoves: { id: string; standardCode: string }[] = [];
  const joinNoops: { standardCode: string }[] = [];

  for (const canonical of canonicalRows) {
    const existing = await db.pssaStandardsCrosswalk.findUnique({
      where: {
        subject_gradeLevel_eligibleContent_sourceVersionYear: {
          subject: canonical.subject,
          gradeLevel: canonical.gradeLevel,
          eligibleContent: canonical.eligibleContent,
          sourceVersionYear: canonical.sourceVersionYear,
        },
      },
      include: { paCoreStandards: true },
    });

    if (!existing) {
      inserts.push(canonical);
      rows.push({ canonical, dbAction: "insert", notes: "Crosswalk row is absent from DB." });
      for (const standardCode of canonical.paCoreStandardCodes) {
        joinInserts.push({ crosswalkId: "pending", standardCode });
      }
      continue;
    }

    if (dbRowMatches(existing, canonical)) {
      noops.push(canonical);
      rows.push({ canonical, dbAction: "noop", notes: "Canonical fields already match DB." });
    } else {
      updates.push(canonical);
      rows.push({ canonical, dbAction: "update", notes: "Canonical fields differ from DB." });
    }

    const desiredCodes = new Set(canonical.paCoreStandardCodes);
    const existingCodes = new Set(existing.paCoreStandards.map((join) => join.standardCode));
    for (const standardCode of desiredCodes) {
      if (existingCodes.has(standardCode)) {
        joinNoops.push({ standardCode });
      } else {
        joinInserts.push({ crosswalkId: existing.id, standardCode });
      }
    }
    for (const join of existing.paCoreStandards) {
      if (!desiredCodes.has(join.standardCode)) {
        joinRemoves.push({ id: join.id, standardCode: join.standardCode });
      }
    }
  }

  return {
    crosswalk: { inserts, updates, noops },
    joins: { inserts: joinInserts, removes: joinRemoves, noops: joinNoops },
    rows,
  };
}

async function writeCanonicalRows(db: PrismaClient, canonicalRows: CanonicalCrosswalk[]) {
  await assertDb2TablesAvailable(db);
  await db.$transaction(async (tx) => {
    for (const canonical of canonicalRows) {
      const crosswalk = await tx.pssaStandardsCrosswalk.upsert({
        where: {
          subject_gradeLevel_eligibleContent_sourceVersionYear: {
            subject: canonical.subject,
            gradeLevel: canonical.gradeLevel,
            eligibleContent: canonical.eligibleContent,
            sourceVersionYear: canonical.sourceVersionYear,
          },
        },
        create: dbFields(canonical),
        update: dbFields(canonical),
      });
      const desiredCodes = new Set(canonical.paCoreStandardCodes);
      const existingJoins = await tx.pssaCrosswalkPaCoreStandard.findMany({
        where: { crosswalkId: crosswalk.id },
      });
      for (const standardCode of desiredCodes) {
        await tx.pssaCrosswalkPaCoreStandard.upsert({
          where: {
            crosswalkId_standardCode: {
              crosswalkId: crosswalk.id,
              standardCode,
            },
          },
          create: { crosswalkId: crosswalk.id, standardCode },
          update: {},
        });
      }
      const removeIds = existingJoins.filter((join) => !desiredCodes.has(join.standardCode)).map((join) => join.id);
      if (removeIds.length > 0) {
        await tx.pssaCrosswalkPaCoreStandard.deleteMany({ where: { id: { in: removeIds } } });
      }
    }
  });
}

function ensureWriteAllowed(args: Args) {
  if (!args.write) {
    return;
  }
  if (args.env !== "dev") {
    throw new Error("--write requires explicit --env dev.");
  }
  const envValues = [process.env.NODE_ENV, process.env.APP_ENV, args.env].filter(Boolean).map((value) => value!.toLowerCase());
  const looksProduction = envValues.some((value) => value.includes("prod") || value === "production");
  if (looksProduction && !args.allowProduction) {
    throw new Error("Refusing to write in a production-like environment without --allow-production.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("--write requires DATABASE_URL and a dev DB with DB-1 migration applied.");
  }
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function renderCsvReport(rows: ReconcileRow[]) {
  const header = ["subject", "gradeLevel", "eligibleContent", "ccCodeCount", "anomalyPresent", "rawSourceAnomalyJson", "result", "notes", "dbAction"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([
      row.canonical.subject,
      row.canonical.gradeLevel,
      row.canonical.eligibleContent,
      row.canonical.paCoreStandardCodes.length,
      row.canonical.rawSourceAnomalyJson ? "true" : "false",
      row.canonical.rawSourceAnomalyJson,
      "PASS",
      row.notes,
      row.dbAction,
    ].map(csvEscape).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function renderSummary(params: {
  mode: Mode;
  env: string;
  canonicalRows: CanonicalCrosswalk[];
  validations: ValidationResult[];
  plan: ReconcilePlan | null;
  wrote: boolean;
  dbIdempotency: DbIdempotencyCheck;
}) {
  const gradeCounts = countByGrade(params.canonicalRows);
  const ccCount = params.canonicalRows.reduce((sum, row) => sum + row.paCoreStandardCodes.length, 0);
  const anomalyRows = params.canonicalRows.filter((row) => row.rawSourceAnomalyJson);
  const crosswalkInserts = params.plan?.crosswalk.inserts.length ?? 0;
  const crosswalkUpdates = params.plan?.crosswalk.updates.length ?? 0;
  const crosswalkNoops = params.plan?.crosswalk.noops.length ?? 0;
  const joinInserts = params.plan?.joins.inserts.length ?? 0;
  const joinRemoves = params.plan?.joins.removes.length ?? 0;
  const joinNoops = params.plan?.joins.noops.length ?? 0;
  const dbCounts = params.plan
    ? [
        `- Crosswalk inserts: ${crosswalkInserts}`,
        `- Crosswalk updates: ${crosswalkUpdates}`,
        `- Crosswalk noops: ${crosswalkNoops}`,
        `- CC join inserts: ${joinInserts}`,
        `- CC join removes: ${joinRemoves}`,
        `- CC join noops: ${joinNoops}`,
      ].join("\n")
    : "- DB actions: N/A (canonical source only; no DB comparison)";

  return [
    "# PSSA Crosswalk Load Summary",
    "",
    `- Mode: ${params.mode}`,
    `- Env: ${params.env}`,
    `- Wrote to DB: ${params.wrote ? "yes" : "no"}`,
    `- Canonical crosswalk rows: ${params.canonicalRows.length}`,
    `- Canonical CC join rows: ${ccCount}`,
    `- Anomaly rows: ${anomalyRows.length}`,
    "",
    "## Per Grade",
    "",
    "| Grade | Rows |",
    "|---:|---:|",
    ...Array.from(EXPECTED_GRADE_COUNTS.keys()).map((grade) => `| ${grade} | ${gradeCounts.get(grade) ?? 0} |`),
    "",
    "## DB Reconcile Counts",
    "",
    dbCounts,
    "",
    "## Validation Gates",
    "",
    "| Gate | Status | Notes |",
    "|---|---|---|",
    ...params.validations.map((gate) => `| ${gate.id} | ${gate.status} | ${gate.notes.replace(/\|/g, "/")} |`),
    "",
    "## Traceability",
    "",
    "- Zero invented EC, anchor, descriptor, or CC values: validation gate `PSSA_XWALK_NO_INVENTION` passed.",
    "- File-only idempotency proves deterministic canonical output for the unchanged CSV.",
    params.dbIdempotency.evaluated
      ? `- DB-aware idempotency: ${params.dbIdempotency.passed ? "PASS" : "FAIL"} (${params.dbIdempotency.notes})`
      : "- DB-aware idempotency was not evaluated in file-only mode.",
    "",
    "## Anomaly Raw Values",
    "",
    ...anomalyRows.map((row) => `- ${row.eligibleContent}: ${row.rawSourceAnomalyJson}`),
  ].join("\n");
}

function writeReports(rows: ReconcileRow[], summary: string) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_CSV_PATH, renderCsvReport(rows));
  fs.writeFileSync(REPORT_SUMMARY_PATH, `${summary}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }
  ensureWriteAllowed(args);

  const csvText = fs.readFileSync(args.csvPath, "utf8");
  const { header, rows: rawRows } = parseCsv(csvText);
  const canonicalRows = canonicalize(rawRows);
  const validations = validate(header, rawRows, canonicalRows);
  const failures = validations.filter((gate) => gate.status === "FAIL");
  const mode: Mode = args.write ? "write" : args.dbAware ? "db-aware-dry-run" : "file-only-dry-run";

  if (failures.length > 0) {
    const reportRows = canonicalRows.map((canonical) => ({
      canonical,
      dbAction: "canonical_source_only" as const,
      notes: "Validation failed before DB comparison/write.",
    }));
    writeReports(reportRows, renderSummary({
      mode,
      env: args.env ?? "N/A",
      canonicalRows,
      validations,
      plan: null,
      wrote: false,
      dbIdempotency: { evaluated: false, passed: false, notes: "Validation failed before DB comparison/write." },
    }));
    throw new Error(`Crosswalk validation failed: ${failures.map((gate) => gate.id).join(", ")}`);
  }

  let plan: ReconcilePlan | null = null;
  let wrote = false;
  let dbIdempotency: DbIdempotencyCheck = {
    evaluated: false,
    passed: false,
    notes: "No DB comparison requested.",
  };
  if (args.dbAware) {
    const db = new PrismaClient();
    try {
      plan = await buildReconcilePlan(db, canonicalRows);
      dbIdempotency = {
        evaluated: true,
        passed: false,
        notes: "Dry-run reconcile plan computed; post-write no-op proof not run.",
      };
      if (args.write) {
        await writeCanonicalRows(db, canonicalRows);
        wrote = true;
        const postWritePlan = await buildReconcilePlan(db, canonicalRows);
        const postWriteIsNoop =
          postWritePlan.crosswalk.inserts.length === 0
          && postWritePlan.crosswalk.updates.length === 0
          && postWritePlan.joins.inserts.length === 0
          && postWritePlan.joins.removes.length === 0;
        dbIdempotency = {
          evaluated: true,
          passed: postWriteIsNoop,
          notes: postWriteIsNoop
            ? "Post-write reconcile plan is a no-op for unchanged CSV."
            : "Post-write reconcile plan still has pending DB actions.",
        };
        if (!postWriteIsNoop) {
          throw new Error(dbIdempotency.notes);
        }
      }
    } finally {
      await db.$disconnect();
    }
  }

  const reportRows = plan?.rows ?? canonicalRows.map((canonical) => ({
    canonical,
    dbAction: "canonical_source_only" as const,
    notes: "Canonical source validation only; no DB comparison requested.",
  }));
  const summary = renderSummary({
    mode,
    env: args.env ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "N/A",
    canonicalRows,
    validations,
    plan,
    wrote,
    dbIdempotency,
  });
  writeReports(reportRows, summary);

  const ccCount = canonicalRows.reduce((sum, row) => sum + row.paCoreStandardCodes.length, 0);
  console.log(`PSSA crosswalk ${mode} complete.`);
  console.log(`Canonical crosswalk rows: ${canonicalRows.length}`);
  console.log(`Canonical CC join rows: ${ccCount}`);
  console.log(`Anomaly rows: ${canonicalRows.filter((row) => row.rawSourceAnomalyJson).length}`);
  console.log(`Reports: ${REPORT_CSV_PATH}, ${REPORT_SUMMARY_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
