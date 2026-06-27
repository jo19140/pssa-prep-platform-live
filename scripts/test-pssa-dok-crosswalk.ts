import assert from "node:assert/strict";
import fs from "node:fs";

import { buildClassReport } from "../lib/content/pssaClassReport";
import {
  buildStudentReport,
  type PssaReportAttempt,
  type PssaReportForm,
  type PssaReportResponse,
} from "../lib/content/pssaStudentReport";
import { assertNoBannedKeys, projectPssaStudentItem } from "../lib/content/pssaStudentDto";
import { dokLevelFor, loadDokCrosswalk, type PssaDokLevel } from "../lib/content/pssaDokCrosswalk";
import {
  assembleDiagnosticFormFromPool,
  EOY_DIAGNOSTIC_SECTION_ITEM_IDS,
  GRADE3_EOY_DIAGNOSTIC_BLUEPRINT,
  GRADE3_MOY_DIAGNOSTIC_BLUEPRINT,
  MOY_DIAGNOSTIC_SECTION_ITEM_IDS,
  type PssaAssemblyItem,
  type PssaAssemblyPassage,
} from "./content/lib/pssa-form-assembly";
import { AUDIT_CONTRACT_VERSION, SOURCE_SCAN_VERSION } from "./content/lib/pssa-import-plan";

type Benchmark = "EOY" | "MOY";

const EXPECTED_DOK_DISTRIBUTIONS = {
  EOY: { 1: 12, 2: 28, 3: 5 },
  MOY: { 1: 12, 2: 23, 3: 5 },
} as const;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\"") {
      if (quoted && text[i + 1] === "\"") {
        cell += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function crosswalkRows() {
  const rows = parseCsv(fs.readFileSync("data/pssa/dok_crosswalk_grade3.csv", "utf8"));
  const header = rows[0];
  return rows.slice(1).map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])) as {
    itemId: string;
    dokLevel: string;
    eligibleContent: string;
    reportingCategory: string;
    benchmark: string;
  });
}

function anchorCeilings() {
  const rows = parseCsv(fs.readFileSync("data/pssa/anchor_ec_crosswalk_grade3.csv", "utf8"));
  const header = rows[0];
  const ceilingByEc = new Map<string, number>();
  for (const row of rows.slice(1)) {
    const record = Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""]));
    const ceiling = String(record.dokCeiling ?? "").trim();
    if (!ceiling) continue;
    ceilingByEc.set(String(record.eligibleContent), Number(ceiling));
  }
  return ceilingByEc;
}

function readBackend(benchmark: Benchmark, name: string) {
  return JSON.parse(fs.readFileSync(`exemplars/pssa_grade3_${benchmark.toLowerCase()}_${name}/backend.json`, "utf8"));
}

function readyPassage(raw: any): PssaAssemblyPassage {
  const hash = raw.contentHash ?? `hash-${raw.id}`;
  return {
    ...raw,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvedContentHash: hash,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: hash,
    latestAuditContentHash: hash,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    retiredAt: null,
    gradeLevel: 3,
    subject: "ELA",
  };
}

function readyItem(raw: any, passageMap: Map<string, PssaAssemblyPassage>, groupById: Map<string, any>, benchmark: Benchmark): PssaAssemblyItem {
  const id = raw.id ?? raw.itemId;
  const hash = raw.contentHash ?? `hash-${id}`;
  const passageId = raw.passageId ?? null;
  const group = raw.passageGroupId ? groupById.get(raw.passageGroupId) : null;
  const structuredChoicesJson = raw.interactionType === "MCQ" && Array.isArray(raw.structuredChoicesJson)
    ? raw.structuredChoicesJson.map((choice: any, index: number) => {
      const bindingLinks = raw.evidenceBinding?.passageSlots?.map((passageSlot: string) => ({
        passageSlot,
        evidenceKind: raw.evidenceBinding.evidenceKind ?? "whole_passage_synthesis",
      })) ?? [];
      const evidenceLinks = [...(choice.evidenceLinks ?? []), ...bindingLinks]
        .filter((link, linkIndex, links) => links.findIndex((candidate) => candidate.passageSlot === link.passageSlot && candidate.evidenceKind === link.evidenceKind) === linkIndex);
      return {
        ...choice,
        ...(index === raw.correctIndex ? { isCorrect: true, evidenceLinks } : {}),
      };
    })
    : raw.structuredChoicesJson;
  const acceptableSupportEvidenceLinks = raw.interactionType === "EBSR" && raw.isCrossText
    ? (raw.responseSpecJson?.partB?.choices ?? [])
      .filter((choice: any) => choice.isCorrect)
      .map((choice: any) => ({ passageSlot: choice.passageSlot, evidenceKind: "quoted_span", quotedSpan: choice.text }))
    : raw.acceptableSupportEvidenceLinks;
  return {
    ...raw,
    id,
    itemId: id,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    pointValue: raw.pointValue ?? raw.scoringJson?.totalPoints ?? raw.scoring?.totalPoints ?? 1,
    reviewStatus: "APPROVED",
    itemStatus: "pilot_ready",
    approvalEligible: true,
    approvedContentHash: hash,
    studentReadyBlockedReason: "NONE",
    auditContractVersion: AUDIT_CONTRACT_VERSION,
    sourceScanVersion: SOURCE_SCAN_VERSION,
    contentHash: hash,
    latestAuditContentHash: hash,
    latestAuditResult: "PASS",
    licenseStatus: "cleared",
    commercialUseAllowed: true,
    needsLegalReview: false,
    deprecatedReason: null,
    retiredAt: null,
    batchId: `${benchmark.toLowerCase()}-batch`,
    batch: {
      id: `${benchmark.toLowerCase()}-batch`,
      auditContractVersion: AUDIT_CONTRACT_VERSION,
      sourceScanVersion: SOURCE_SCAN_VERSION,
      sourceCorpusHash: `hash-${benchmark.toLowerCase()}-corpus`,
      batchAuditResult: "PASS",
    },
    passages: passageId ? [{ passage: passageMap.get(passageId), role: "primary", sortOrder: 0 } as any] : [],
    passageGroupId: raw.passageGroupId,
    passageGroup: group,
    structuredChoicesJson,
    acceptableSupportEvidenceLinks,
  };
}

function diagnosticPool(benchmark: Benchmark) {
  const p1 = readBackend(benchmark, "p1");
  const p2 = readBackend(benchmark, "p2");
  const p3 = readBackend(benchmark, "p3");
  const p4 = readBackend(benchmark, "p4");
  const conventions = readBackend(benchmark, "conventions");
  const passages = [
    ...p1.passages,
    ...p2.passages,
    ...p3.passages,
    ...p4.passages,
  ].map(readyPassage);
  const passageMap = new Map(passages.map((passage) => [passage.id, passage]));
  const p3Group = {
    ...p3.passageGroups[0],
    members: p3.passageGroups[0].members.map((member: any) => ({
      ...member,
      passage: passageMap.get(member.passageId),
    })),
  };
  const groupById = new Map([[p3Group.id, p3Group]]);
  const items = [
    ...p1.items,
    ...p2.items,
    ...p3.items,
    ...p4.items,
    ...conventions.items,
  ].map((item: any) => readyItem(item, passageMap, groupById, benchmark));
  return { items, passages };
}

function assemble(benchmark: Benchmark) {
  const pool = diagnosticPool(benchmark);
  const result = assembleDiagnosticFormFromPool({
    seed: `g3-${benchmark.toLowerCase()}-001`,
    blueprintVersion: benchmark === "EOY"
      ? GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion
      : GRADE3_MOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion,
    readyItems: pool.items,
    allItems: pool.items,
  });
  assert.equal(result.ok, true, result.gates.map((gate) => `${gate.gate}:${gate.status}:${gate.detail}`).join("\n"));
  return { pool, result };
}

function distribution(itemIds: string[]) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const itemId of itemIds) {
    const dok = dokLevelFor(itemId);
    assert.ok(dok, `missing DOK for ${itemId}`);
    counts[dok] += 1;
  }
  return counts;
}

function reportFor(benchmark: Benchmark) {
  const { pool, result } = assemble(benchmark);
  const sourceById = new Map(pool.items.map((item) => [item.id, item]));
  const form: PssaReportForm = {
    id: `${benchmark.toLowerCase()}-form`,
    benchmarkSeason: benchmark,
    blueprintVersion: result.canonical?.blueprintVersion as string,
    contentHash: result.contentHash ?? undefined,
    items: result.items.map((row) => {
      const source = sourceById.get(row.itemId)!;
      return {
        itemId: row.itemId,
        eligibleContent: source.eligibleContent,
        reportingCategory: source.reportingCategory,
        interactionType: source.interactionType,
        structuredChoicesJson: source.structuredChoicesJson,
        answerChoicesJson: (source as any).answerChoicesJson,
        scoringBucket: row.scoringBucket,
      };
    }),
  } as PssaReportForm;
  const responses: PssaReportResponse[] = result.items.map((row) => {
    const source = sourceById.get(row.itemId)!;
    const pending = source.interactionType === "SHORT_ANSWER";
    return {
      itemId: row.itemId,
      scoringBucket: row.scoringBucket,
      scoreStatus: pending ? "pending_human_scoring" : "scored",
      pointsEarned: pending ? null : row.pointValue,
      maxPoints: row.pointValue,
      isCorrect: pending ? null : true,
    };
  });
  const operational = result.items.filter((row) => row.scoringBucket !== "analytics_only");
  const analytics = result.items.filter((row) => row.scoringBucket === "analytics_only");
  const scoring = {
    totalPoints: operational.reduce((sum, row) => sum + row.pointValue, 0),
    earnedPoints: operational.filter((row) => sourceById.get(row.itemId)!.interactionType !== "SHORT_ANSWER").reduce((sum, row) => sum + row.pointValue, 0),
    pendingHumanPoints: operational.filter((row) => sourceById.get(row.itemId)!.interactionType === "SHORT_ANSWER").reduce((sum, row) => sum + row.pointValue, 0),
    maxOperationalPoints: operational.reduce((sum, row) => sum + row.pointValue, 0),
  };
  const attempt: PssaReportAttempt = {
    benchmarkSeason: benchmark,
    completionStatus: "complete",
    responses,
  };
  const report = buildStudentReport(attempt, form, scoring, [], { benchmarkSeason: benchmark });
  return { report, result, analytics };
}

const rows = crosswalkRows();
assert.equal(rows.length, 167, "DOK crosswalk must have exactly 167 item rows");
assert.equal(loadDokCrosswalk().size, 167, "DOK loader must expose 167 item rows");
assert.equal(new Set(rows.map((row) => row.itemId)).size, 167, "DOK crosswalk item IDs must be unique");
assert.deepEqual(new Set(rows.map((row) => row.benchmark)), new Set(["EOY", "MOY", "BOY/Foundation"]), "DOK crosswalk must cover EOY, MOY, and BOY/Foundation");
assert.equal(rows.some((row) => row.dokLevel === "4"), false, "DOK 4 is outside the Grade 3 diagnostic crosswalk");
assert.equal(rows.filter((row) => row.eligibleContent.startsWith("E03.D")).every((row) => row.dokLevel === "1"), true, "every conventions item must be DOK 1");

for (const [benchmark, expected] of Object.entries(EXPECTED_DOK_DISTRIBUTIONS) as Array<[Benchmark, typeof EXPECTED_DOK_DISTRIBUTIONS[Benchmark]]>) {
  const { result } = assemble(benchmark);
  const expectedIds = benchmark === "EOY" ? EOY_DIAGNOSTIC_SECTION_ITEM_IDS.flat() : MOY_DIAGNOSTIC_SECTION_ITEM_IDS.flat();
  assert.deepEqual(result.items.map((item) => item.itemId), expectedIds, `${benchmark} assembly must use the pinned diagnostic roster`);
  assert.deepEqual(distribution(result.items.map((item) => item.itemId)), expected, `${benchmark} all-item DOK distribution`);
}

const ceilings = anchorCeilings();
for (const row of rows) {
  const ceiling = ceilings.get(row.eligibleContent);
  if (!ceiling) continue;
  assert.ok(Number(row.dokLevel) <= ceiling, `${row.itemId} DOK ${row.dokLevel} exceeds EC ceiling ${ceiling}`);
}

const eoy = reportFor("EOY");
assert.equal(eoy.report.byDok.reduce((sum, row) => sum + row.operationalPoints, 0), 45, "student byDok must count operational points only");
assert.equal(eoy.report.byDok.reduce((sum, row) => sum + row.earnedPoints, 0), 39, "student byDok earned points must use operational scoring only");
assert.equal(eoy.report.byDok.reduce((sum, row) => sum + row.pendingHumanPoints, 0), 6, "student byDok pending points must use operational scoring only");
assert.equal(eoy.report.additionalAnalyticsItems.analyticsByDok?.reduce((sum, row) => sum + row.itemCount, 0), eoy.analytics.length, "analyticsByDok is counts-only for analytics items");
assert.equal(JSON.stringify(eoy.report.additionalAnalyticsItems.analyticsByDok).includes("earnedPoints"), false, "analyticsByDok must not carry points");

const classReport = buildClassReport([
  { studentId: "s1", report: eoy.report },
  { studentId: "s2", report: eoy.report },
]);
assert.equal(classReport.byDok.reduce((sum, row) => sum + row.operationalPoints, 0), 90, "class byDok aggregates operational points");
assert.equal(classReport.byDokCategory.reduce((sum, row) => sum + row.operationalPoints, 0), 90, "class byDokCategory aggregates operational points by category");
assert.equal(classReport.additionalAnalyticsItems.analyticsByDok?.reduce((sum, row) => sum + row.itemCount, 0), eoy.analytics.length * 2, "class analyticsByDok aggregates counts only");

for (const benchmark of ["EOY", "MOY"] as const) {
  const { pool, result } = assemble(benchmark);
  const byId = new Map(pool.items.map((item) => [item.id, item]));
  for (const selected of result.items) {
    const dto = projectPssaStudentItem(byId.get(selected.itemId) as any);
    assertNoBannedKeys(dto);
    assert.equal(JSON.stringify(dto).includes("dok"), false, `${selected.itemId} student DTO must not expose DOK metadata`);
  }
}

console.log("PSSA DOK crosswalk checks passed: rows=167; EOY=12/28/5; MOY=12/23/5; analyticsByDok counts-only; student DTO leak-free");
