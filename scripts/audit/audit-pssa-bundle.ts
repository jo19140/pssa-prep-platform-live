import fs from "fs";
import path from "path";
import {
  buildAnswerPositionDistribution,
  buildDuplicateItemReport,
  buildManifestValidationReport,
  buildPassageRepetitionReport,
  countCsvRows,
  countJsonl,
  countStudentPreviewEntries,
  readJsonl,
  writeCsv,
} from "./pssa-audit-detectors";

function main() {
  const bundleDir = resolveBundleDir(process.argv.slice(2));
  const manifestPath = path.join(bundleDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest.json in ${bundleDir}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const diagnosticItems = readJsonl(path.join(bundleDir, "pssa_diagnostic_items.jsonl"));
  const passages = readJsonl(path.join(bundleDir, "pssa_passages.jsonl"));
  const preview = fs.existsSync(path.join(bundleDir, "pssa_student_preview.md"))
    ? fs.readFileSync(path.join(bundleDir, "pssa_student_preview.md"), "utf8")
    : "";

  const manifestRows = buildManifestValidationReport({
    manifest,
    actual: {
      diagnosticItems: countJsonl(path.join(bundleDir, "pssa_diagnostic_items.jsonl")),
      lessons: countJsonl(path.join(bundleDir, "pssa_lessons.jsonl")),
      passages: countJsonl(path.join(bundleDir, "pssa_passages.jsonl")),
      standards: countCsvRows(path.join(bundleDir, "pssa_standards_alignment.csv")),
      studentPreviewEntries: countStudentPreviewEntries(preview),
    },
  });
  const answerRows = buildAnswerPositionDistribution(diagnosticItems);
  const duplicateRows = buildDuplicateItemReport(diagnosticItems);
  const passageRows = buildPassageRepetitionReport(passages);
  const sourceLicenseRows = readCsvLike(path.join(bundleDir, "pssa_source_license_report.csv"));

  writeCsv(path.join(bundleDir, "pssa_manifest_validation_report.csv"), manifestRows);
  writeCsv(path.join(bundleDir, "pssa_answer_position_distribution.csv"), answerRows);
  writeCsv(path.join(bundleDir, "pssa_duplicate_item_report.csv"), duplicateRows);
  writeCsv(path.join(bundleDir, "pssa_passage_repetition_report.csv"), passageRows);
  const governanceReports = buildGovernanceReports({ manifest, diagnosticItems, sourceLicenseRows, answerRows, duplicateRows, passageRows });
  writeCsv(path.join(bundleDir, "pssa_legacy_quarantine_report.csv"), governanceReports.legacyQuarantineReport);
  writeCsv(path.join(bundleDir, "pssa_student_ready_report.csv"), governanceReports.studentReadyReport);
  writeCsv(path.join(bundleDir, "pssa_standards_alignment_report.csv"), governanceReports.standardsAlignmentReport);
  writeCsv(path.join(bundleDir, "pssa_approval_guard_report.csv"), governanceReports.approvalGuardReport);
  fs.writeFileSync(path.join(bundleDir, "pssa_runtime_source_report.md"), governanceReports.runtimeSourceReport);

  const uniqueItemGroups = new Set(diagnosticItems.map((item: any) => `${item.grade}:${item.questionType}:${item.standardCode}:${JSON.stringify(item.item?.question ?? item.item?.partAQuestion ?? item.item?.prompt ?? "")}`)).size;
  const summary = {
    bundleDir,
    totalItems: diagnosticItems.length,
    uniqueItemGroups,
    duplicateItemGroups: duplicateRows.length,
    repeatedPassages: passageRows.filter((row) => row.result === "FAIL").length,
    answerBiasFailures: answerRows.filter((row) => row.result === "FAIL").length,
    manifestMismatches: manifestRows.filter((row) => row.result === "FAIL").length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

function buildGovernanceReports({ manifest, diagnosticItems, sourceLicenseRows, answerRows, duplicateRows, passageRows }: any) {
  const totalLegacyPssaRows = manifest?.counts?.databaseAssessmentQuestions ?? 0;
  const sourceLicenseUnresolvedCount = sourceLicenseRows.filter((row: any) => String(row.licenseStatus || "").includes("review_required")).length + diagnosticItems.length;
  const missingAnchorEcCount = diagnosticItems.length;
  const repeatedPassages = passageRows.filter((row: any) => row.result === "FAIL").length;
  const duplicateGroups = duplicateRows.length;
  const answerBiasGroups = answerRows.filter((row: any) => row.result === "FAIL").length;
  return {
    legacyQuarantineReport: [
      { category: "legacy_assessment_questions", totalRows: totalLegacyPssaRows, studentReadyRows: 0, excludedFromRuntimeRows: totalLegacyPssaRows, quarantinePolicy: "fail_closed_governed_allowlist_only", blockerReason: "legacy_generated_not_migrated_to_governed_pssa_item" },
    ],
    studentReadyReport: [
      { totalLegacyPssaRows, totalGovernedPssaItems: 0, totalStudentReadyItems: 0, rowsExcludedFromRuntime: totalLegacyPssaRows, sourceLicenseUnresolvedCount, missingAnchorEcCount, approvedButNotStudentReadyCount: 0 },
    ],
    standardsAlignmentReport: [
      { totalItems: diagnosticItems.length, missingAssessmentAnchor: diagnosticItems.length, missingEligibleContent: diagnosticItems.length, blockedSolelyBecauseCrosswalkMissing: 0, alignmentStatus: "NEEDS_CROSSWALK_FOR_LEGACY_EXPORT" },
    ],
    approvalGuardReport: [
      { guard: "source_license_cleared", blockedCount: sourceLicenseUnresolvedCount, result: "BLOCK" },
      { guard: "assessment_anchor_present", blockedCount: missingAnchorEcCount, result: "BLOCK" },
      { guard: "eligible_content_present", blockedCount: missingAnchorEcCount, result: "BLOCK" },
      { guard: "duplicate_blocker_clear", blockedCount: duplicateGroups, result: "BLOCK" },
      { guard: "passage_repetition_clear", blockedCount: repeatedPassages, result: "BLOCK" },
      { guard: "answer_position_audit_clear", blockedCount: answerBiasGroups, result: "BLOCK" },
    ],
    runtimeSourceReport: `# PSSA Runtime Source Report

Runtime policy: fail-closed governed allowlist only.

- Legacy database AssessmentQuestion rows: ${totalLegacyPssaRows}
- Governed PSSA items: 0
- Student-ready governed PSSA items: 0
- Rows excluded from PSSA student runtime by construction: ${totalLegacyPssaRows}

app/api/student/session/route.ts uses getStudentReadyPssaItems() and getStudentReadyPssaPassages() for PA/ELA assignments and returns 409 when no governed content is ready.
`,
  };
}

function readCsvLike(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const [headerLine, ...lines] = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function resolveBundleDir(args: string[]) {
  const explicitIndex = args.indexOf("--bundle");
  if (explicitIndex >= 0 && args[explicitIndex + 1]) return path.resolve(process.cwd(), args[explicitIndex + 1]);
  const date = new Date().toISOString().slice(0, 10);
  return path.resolve(process.cwd(), "audit_exports", `pssa_audit_bundle_${date}`);
}

main();
