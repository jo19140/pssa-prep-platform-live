import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type CsvRow = Record<string, string>;

type CrosswalkSeedRow = {
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
  mappingGranularity: "ANCHOR_BLOCK";
  mappingConfidence: "SOURCE_ANCHOR_LEVEL";
  sourceDocument: string;
  sourceVersionYear: number;
  sourceUpdatedYear: number;
  sourceAnomalyJson: Record<string, unknown> | null;
};

type AlignmentTarget = {
  id: string;
  kind: "item" | "lesson";
  subject: string;
  gradeLevel: number;
  standardCode: string;
  eligibleContent: string | null;
  alignmentStatus: string;
};

type AlignmentResolution = AlignmentTarget & {
  proposedStatus: "ALIGNED" | "NEEDS_REVIEW" | "NEEDS_CROSSWALK";
  reason: string;
};

const DEFAULT_SOURCE = "data/pssa/anchor_ec_crosswalk.csv";
const DEFAULT_REPORT_DIR = "audit/pssa_crosswalk";
const EXPECTED_HEADERS = [
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

const EC_PATTERN = /^E0[3-8]\.[A-Z](?:-[A-Z])?\.\d+\.\d+\.\d+$/;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourcePath = path.resolve(options.source);
  const reportDir = path.resolve(options.reportDir);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const csv = parseCsvStrict(raw);
  const rows = validateSeed(csv);
  const existing = await loadExistingCrosswalkKeys();
  const resolutions = await buildAlignmentResolutions(rows);
  const planned = planCrosswalkChanges(rows, existing, options.replaceVersion);
  fs.mkdirSync(reportDir, { recursive: true });
  writeReports(reportDir, rows, planned, resolutions, options, sourcePath);

  console.log(`PSSA crosswalk ${options.write ? "write" : "dry-run"} complete.`);
  console.log(JSON.stringify({
    source: sourcePath,
    reportDir,
    rows: rows.length,
    plannedCreates: planned.creates,
    plannedUpdates: planned.updates,
    plannedSkippedExisting: planned.skippedExisting,
    paCoreJoinRows: rows.reduce((total, row) => total + row.paCoreStandardCodes.length, 0),
    unconfirmedAnomalyRows: rows.filter(hasUnconfirmedAnomaly).length,
    resolvesAligned: resolutions.filter((row) => row.proposedStatus === "ALIGNED").length,
    resolvesNeedsReview: resolutions.filter((row) => row.proposedStatus === "NEEDS_REVIEW").length,
    remainsNeedsCrosswalk: resolutions.filter((row) => row.proposedStatus === "NEEDS_CROSSWALK").length,
  }, null, 2));

  if (!options.write) {
    console.log("Dry-run only. No database writes were performed.");
    return;
  }

  await writeCrosswalk(rows, options.replaceVersion);
  if (options.applyResolution) {
    await applyAlignmentResolution(resolutions);
  }
}

function parseArgs(args: string[]) {
  const options = {
    source: DEFAULT_SOURCE,
    reportDir: DEFAULT_REPORT_DIR,
    write: false,
    replaceVersion: false,
    applyResolution: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") options.source = requireValue(args, ++index, "--source");
    else if (arg === "--report-dir") options.reportDir = requireValue(args, ++index, "--report-dir");
    else if (arg === "--write") options.write = true;
    else if (arg === "--replace-version") options.replaceVersion = true;
    else if (arg === "--apply-resolution") options.applyResolution = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.applyResolution && !options.write) {
    throw new Error("--apply-resolution requires --write");
  }
  return options;
}

function requireValue(args: string[], index: number, flag: string) {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseCsvStrict(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let atFieldStart = true;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inQuotes) {
      if (char === "\"") {
        if (next === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
          atFieldStart = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === "\"") {
      if (!atFieldStart) throw new Error(`Malformed CSV: quote inside unquoted field near char ${index}`);
      inQuotes = true;
      atFieldStart = false;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      atFieldStart = true;
      continue;
    }
    if (char === "\r") {
      if (next !== "\n") throw new Error(`Malformed CSV: bare CR near char ${index}`);
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      atFieldStart = true;
      index += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      atFieldStart = true;
      continue;
    }
    field += char;
    atFieldStart = false;
  }
  if (inQuotes) throw new Error("Malformed CSV: unterminated quoted field");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmptyRows = rows.filter((cells) => cells.some((cell) => cell.trim().length));
  if (!nonEmptyRows.length) throw new Error("CSV is empty");
  const headers = nonEmptyRows[0];
  if (headers.length !== EXPECTED_HEADERS.length) throw new Error(`Expected ${EXPECTED_HEADERS.length} columns, found ${headers.length}`);
  for (const [index, expected] of EXPECTED_HEADERS.entries()) {
    if (headers[index] !== expected) throw new Error(`Unexpected header at column ${index + 1}: expected ${expected}, found ${headers[index]}`);
  }
  return nonEmptyRows.slice(1).map((cells, rowIndex) => {
    if (cells.length !== EXPECTED_HEADERS.length) {
      throw new Error(`Row ${rowIndex + 2} expected ${EXPECTED_HEADERS.length} columns, found ${cells.length}`);
    }
    return Object.fromEntries(EXPECTED_HEADERS.map((header, index) => [header, cells[index]]));
  });
}

function validateSeed(csvRows: CsvRow[]): CrosswalkSeedRow[] {
  const errors: string[] = [];
  const rows = csvRows.map((row, index) => parseSeedRow(row, index + 2, errors));
  const validRows = rows.filter(Boolean) as CrosswalkSeedRow[];
  if (validRows.length !== 241) errors.push(`Expected 241 EC rows, found ${validRows.length}`);
  const byGrade = groupCount(validRows, (row) => row.gradeLevel);
  for (const [grade, expected] of EXPECTED_GRADE_COUNTS) {
    const actual = byGrade.get(grade) || 0;
    if (actual !== expected) errors.push(`Grade ${grade} expected ${expected} EC rows, found ${actual}`);
  }
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();
  for (const row of validRows) {
    const key = `${row.subject}|${row.gradeLevel}|${row.eligibleContent}|${row.sourceVersionYear}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  }
  for (const key of duplicateKeys) errors.push(`Duplicate subject+grade+eligibleContent+sourceVersionYear: ${key}`);
  const anomalyRows = validRows.filter(hasUnconfirmedAnomaly);
  if (anomalyRows.length !== 6) errors.push(`Expected 6 unconfirmed anomaly rows, found ${anomalyRows.length}`);
  if (errors.length) throw new Error(`Crosswalk validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return validRows;
}

function parseSeedRow(row: CsvRow, lineNumber: number, errors: string[]) {
  const errorCountAtStart = errors.length;
  const gradeLevel = Number(row.gradeLevel);
  const sourceVersionYear = Number(row.sourceVersionYear);
  const sourceUpdatedYear = Number(row.sourceUpdatedYear);
  const paCoreStandardCodes = row.paCoreStandardCodes === "NO_CC_MAPPING"
    ? []
    : row.paCoreStandardCodes.split("|").map((code) => code.trim()).filter(Boolean);
  let sourceAnomalyJson: Record<string, unknown> | null = null;
  if (row.sourceAnomalyJson.trim()) {
    try {
      const parsed = JSON.parse(row.sourceAnomalyJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      sourceAnomalyJson = parsed as Record<string, unknown>;
    } catch (error) {
      errors.push(`Line ${lineNumber}: malformed sourceAnomalyJson`);
    }
  }
  if (row.subject !== "ELA") errors.push(`Line ${lineNumber}: subject must be ELA`);
  if (!EXPECTED_GRADE_COUNTS.has(gradeLevel)) errors.push(`Line ${lineNumber}: gradeLevel must be 3-8`);
  if (!EC_PATTERN.test(row.eligibleContent)) errors.push(`Line ${lineNumber}: malformed eligibleContent ${row.eligibleContent}`);
  if (!row.paCoreStandardCodes.trim()) errors.push(`Line ${lineNumber}: paCoreStandardCodes is blank`);
  if (row.paCoreStandardCodes !== "NO_CC_MAPPING" && paCoreStandardCodes.length === 0) errors.push(`Line ${lineNumber}: paCoreStandardCodes has no usable mappings`);
  if (row.primaryPaCoreStandardCode.trim()) errors.push(`Line ${lineNumber}: primaryPaCoreStandardCode must remain blank`);
  if (row.mappingGranularity !== "ANCHOR_BLOCK") errors.push(`Line ${lineNumber}: mappingGranularity must be ANCHOR_BLOCK`);
  if (row.mappingConfidence !== "SOURCE_ANCHOR_LEVEL") errors.push(`Line ${lineNumber}: mappingConfidence must be SOURCE_ANCHOR_LEVEL`);
  if (sourceVersionYear !== 2014) errors.push(`Line ${lineNumber}: sourceVersionYear must be 2014`);
  if (sourceUpdatedYear !== 2017) errors.push(`Line ${lineNumber}: sourceUpdatedYear must be 2017`);
  if (!Number.isInteger(gradeLevel) || !Number.isInteger(sourceVersionYear) || !Number.isInteger(sourceUpdatedYear)) {
    errors.push(`Line ${lineNumber}: grade/source year fields must be integers`);
  }
  if (errors.length > errorCountAtStart) return null;
  return {
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
    mappingGranularity: "ANCHOR_BLOCK",
    mappingConfidence: "SOURCE_ANCHOR_LEVEL",
    sourceDocument: row.sourceDocument,
    sourceVersionYear,
    sourceUpdatedYear,
    sourceAnomalyJson,
  };
}

async function loadExistingCrosswalkKeys() {
  if (!(await tableExists("PssaStandardsCrosswalk"))) return new Set<string>();
  const existing = await findManyOrEmpty(() => db.pssaStandardsCrosswalk.findMany({
    select: { subject: true, gradeLevel: true, eligibleContent: true, sourceVersionYear: true },
  }));
  return new Set(existing.map((row) => crosswalkKey(row)));
}

function planCrosswalkChanges(rows: CrosswalkSeedRow[], existing: Set<string>, replaceVersion: boolean) {
  let creates = 0;
  let updates = 0;
  let skippedExisting = 0;
  for (const row of rows) {
    if (!existing.has(crosswalkKey(row))) creates += 1;
    else if (replaceVersion) updates += 1;
    else skippedExisting += 1;
  }
  return { creates, updates, skippedExisting };
}

async function buildAlignmentResolutions(rows: CrosswalkSeedRow[]): Promise<AlignmentResolution[]> {
  const [hasItems, hasLessons] = await Promise.all([tableExists("PssaItem"), tableExists("PssaLesson")]);
  const [items, lessons] = await Promise.all([
    hasItems ? findManyOrEmpty(() => db.pssaItem.findMany({ select: { id: true, subject: true, gradeLevel: true, standardCode: true, eligibleContent: true, alignmentStatus: true } })) : [],
    hasLessons ? findManyOrEmpty(() => db.pssaLesson.findMany({ select: { id: true, subject: true, gradeLevel: true, standardCode: true, eligibleContent: true, alignmentStatus: true } })) : [],
  ]);
  const targets: AlignmentTarget[] = [
    ...items.map((item) => ({ ...item, kind: "item" as const })),
    ...lessons.map((lesson) => ({ ...lesson, kind: "lesson" as const })),
  ];
  return targets.map((target) => resolveAlignment(target, rows));
}

async function findManyOrEmpty<T>(query: () => Promise<T[]>): Promise<T[]> {
  try {
    return await query();
  } catch (error: any) {
    if (error?.code === "P2021") return [];
    throw error;
  }
}

async function tableExists(tableName: string) {
  const result = await db.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS "exists"
  `;
  return result[0]?.exists === true;
}

function resolveAlignment(target: AlignmentTarget, rows: CrosswalkSeedRow[]): AlignmentResolution {
  const exact = target.eligibleContent
    ? rows.find((row) => row.subject === target.subject && row.gradeLevel === target.gradeLevel && row.eligibleContent === target.eligibleContent)
    : null;
  if (exact) {
    if (hasUnconfirmedAnomaly(exact)) {
      return { ...target, proposedStatus: "NEEDS_REVIEW", reason: "EXACT_EC_MATCH_WITH_UNCONFIRMED_SOURCE_ANOMALY" };
    }
    return { ...target, proposedStatus: "ALIGNED", reason: "EXACT_ELIGIBLE_CONTENT_MATCH" };
  }
  const broad = rows.find((row) => row.subject === target.subject && row.gradeLevel === target.gradeLevel && row.paCoreStandardCodes.includes(target.standardCode));
  if (broad) return { ...target, proposedStatus: "NEEDS_REVIEW", reason: "BROAD_PA_CORE_ONLY_MATCH" };
  return { ...target, proposedStatus: "NEEDS_CROSSWALK", reason: "NO_EC_OR_PA_CORE_MATCH" };
}

async function writeCrosswalk(rows: CrosswalkSeedRow[], replaceVersion: boolean) {
  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const data = crosswalkData(row);
      const existing = await tx.pssaStandardsCrosswalk.findUnique({
        where: { subject_gradeLevel_eligibleContent_sourceVersionYear: keyWhere(row) },
        select: { id: true },
      });
      if (existing && !replaceVersion) continue;
      const crosswalk = existing
        ? await tx.pssaStandardsCrosswalk.update({ where: { id: existing.id }, data })
        : await tx.pssaStandardsCrosswalk.create({ data });
      if (existing) await tx.pssaCrosswalkPaCoreStandard.deleteMany({ where: { crosswalkId: crosswalk.id } });
      if (row.paCoreStandardCodes.length) {
        await tx.pssaCrosswalkPaCoreStandard.createMany({
          data: row.paCoreStandardCodes.map((standardCode) => ({ crosswalkId: crosswalk.id, standardCode })),
          skipDuplicates: true,
        });
      }
    }
  });
}

async function applyAlignmentResolution(resolutions: AlignmentResolution[]) {
  await db.$transaction(async (tx) => {
    for (const resolution of resolutions) {
      if (resolution.kind === "item") {
        await tx.pssaItem.update({ where: { id: resolution.id }, data: { alignmentStatus: resolution.proposedStatus } });
      } else {
        await tx.pssaLesson.update({ where: { id: resolution.id }, data: { alignmentStatus: resolution.proposedStatus } });
      }
    }
  });
}

function writeReports(
  reportDir: string,
  rows: CrosswalkSeedRow[],
  planned: { creates: number; updates: number; skippedExisting: number },
  resolutions: AlignmentResolution[],
  options: ReturnType<typeof parseArgs>,
  sourcePath: string,
) {
  const paCoreJoinRows = rows.flatMap((row) => row.paCoreStandardCodes.map((standardCode) => ({ eligibleContent: row.eligibleContent, standardCode })));
  const coverageRows = [
    ...Array.from(groupCount(rows, (row) => row.gradeLevel)).map(([gradeLevel, count]) => ({ category: "rows_by_grade", key: String(gradeLevel), count })),
    ...Array.from(groupCount(rows, (row) => `${row.gradeLevel}:${row.reportingCategory}`)).map(([key, count]) => ({ category: "rows_by_reportingCategory", key, count })),
    ...Array.from(groupCount(rows, (row) => row.assessmentAnchor)).map(([key, count]) => ({ category: "rows_by_assessmentAnchor", key, count })),
    { category: "ec_codes_loaded", key: "total", count: rows.length },
    { category: "pa_core_join_rows", key: "total", count: paCoreJoinRows.length },
    { category: "unconfirmed_source_anomaly_rows", key: "total", count: rows.filter(hasUnconfirmedAnomaly).length },
    { category: "alignment_resolution", key: "NEEDS_CROSSWALK_TO_ALIGNED", count: resolutions.filter((row) => row.alignmentStatus === "NEEDS_CROSSWALK" && row.proposedStatus === "ALIGNED").length },
    { category: "alignment_resolution", key: "BROAD_CC_ONLY_TO_NEEDS_REVIEW", count: resolutions.filter((row) => row.proposedStatus === "NEEDS_REVIEW" && row.reason === "BROAD_PA_CORE_ONLY_MATCH").length },
    { category: "alignment_resolution", key: "REMAINING_NEEDS_CROSSWALK", count: resolutions.filter((row) => row.proposedStatus === "NEEDS_CROSSWALK").length },
  ];

  writeCsv(path.join(reportDir, "pssa_crosswalk_validation_report.csv"), [
    { check: "column_count", expected: EXPECTED_HEADERS.length, actual: EXPECTED_HEADERS.length, result: "PASS" },
    { check: "total_ec_rows", expected: 241, actual: rows.length, result: rows.length === 241 ? "PASS" : "FAIL" },
    ...Array.from(EXPECTED_GRADE_COUNTS).map(([grade, expected]) => {
      const actual = rows.filter((row) => row.gradeLevel === grade).length;
      return { check: `grade_${grade}_ec_rows`, expected, actual, result: actual === expected ? "PASS" : "FAIL" };
    }),
    { check: "primary_pa_core_blank", expected: "all_blank", actual: rows.filter((row) => row.primaryPaCoreStandardCode).length, result: "PASS" },
    { check: "mapping_granularity", expected: "ANCHOR_BLOCK", actual: "ANCHOR_BLOCK", result: "PASS" },
    { check: "mapping_confidence", expected: "SOURCE_ANCHOR_LEVEL", actual: "SOURCE_ANCHOR_LEVEL", result: "PASS" },
    { check: "unconfirmed_source_anomaly_rows", expected: 6, actual: rows.filter(hasUnconfirmedAnomaly).length, result: rows.filter(hasUnconfirmedAnomaly).length === 6 ? "PASS" : "FAIL" },
    { check: "planned_creates", expected: "dry_run_plan", actual: planned.creates, result: "INFO" },
    { check: "planned_updates", expected: "dry_run_plan", actual: planned.updates, result: "INFO" },
    { check: "planned_skipped_existing", expected: "dry_run_plan", actual: planned.skippedExisting, result: "INFO" },
  ]);
  writeCsv(path.join(reportDir, "pssa_crosswalk_coverage_report.csv"), coverageRows);
  writeCsv(path.join(reportDir, "pssa_alignment_resolution_report.csv"), resolutions.map((row) => ({
    kind: row.kind,
    id: row.id,
    gradeLevel: row.gradeLevel,
    standardCode: row.standardCode,
    eligibleContent: row.eligibleContent || "",
    currentAlignmentStatus: row.alignmentStatus,
    proposedAlignmentStatus: row.proposedStatus,
    reason: row.reason,
  })), ["kind", "id", "gradeLevel", "standardCode", "eligibleContent", "currentAlignmentStatus", "proposedAlignmentStatus", "reason"]);
  fs.writeFileSync(path.join(reportDir, "pssa_crosswalk_import_log.md"), [
    "# PSSA Crosswalk Import Log",
    "",
    `- Source: ${sourcePath}`,
    `- Mode: ${options.write ? "write" : "dry-run"}`,
    `- Replace version: ${options.replaceVersion ? "yes" : "no"}`,
    `- Apply alignment resolution: ${options.applyResolution ? "yes" : "no"}`,
    `- Validated EC rows: ${rows.length}`,
    `- Planned creates: ${planned.creates}`,
    `- Planned updates: ${planned.updates}`,
    `- Planned skipped existing rows: ${planned.skippedExisting}`,
    `- PA Core join rows: ${paCoreJoinRows.length}`,
    `- Unconfirmed source anomaly rows: ${rows.filter(hasUnconfirmedAnomaly).length}`,
    "",
    "No database writes are performed unless `--write` is passed. Existing rows are not replaced unless `--replace-version` is also passed. Governed item alignment updates require the additional `--apply-resolution` flag.",
    "",
  ].join("\n"));
}

function crosswalkData(row: CrosswalkSeedRow) {
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
    sourceAnomalyJson: row.sourceAnomalyJson ? row.sourceAnomalyJson as Prisma.InputJsonObject : Prisma.JsonNull,
  };
}

function keyWhere(row: CrosswalkSeedRow) {
  return {
    subject: row.subject,
    gradeLevel: row.gradeLevel,
    eligibleContent: row.eligibleContent,
    sourceVersionYear: row.sourceVersionYear,
  };
}

function crosswalkKey(row: { subject: string; gradeLevel: number; eligibleContent: string; sourceVersionYear: number }) {
  return `${row.subject}|${row.gradeLevel}|${row.eligibleContent}|${row.sourceVersionYear}`;
}

function hasUnconfirmedAnomaly(row: CrosswalkSeedRow) {
  return row.sourceAnomalyJson?.humanConfirmed === false;
}

function groupCount<T, K>(rows: T[], keyFn: (row: T) => K) {
  const counts = new Map<K, number>();
  for (const row of rows) counts.set(keyFn(row), (counts.get(keyFn(row)) || 0) + 1);
  return counts;
}

function writeCsv(filePath: string, rows: Record<string, unknown>[], explicitHeaders?: string[]) {
  const headers = explicitHeaders || Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set<string>()));
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
