import fs from "node:fs";
import path from "node:path";
import {
  buildMcqPassageSpecificityReport,
  buildPssaPassageQualityReport,
  hasBlockingPassageSpecificityFailure,
  hasBlockingPassageQualityFailure,
  isPassageLinkedReadingMcq,
  type McqAuditInput,
  type PassageQualityRow,
  type PassageSpecificityRow,
  type PssaPassageAuditInput,
} from "./pssa-audit-detectors";

const grades = [3, 4, 5, 6, 7, 8];
const failures: string[] = [];
const summary: Record<string, unknown>[] = [];
const reportDir = path.resolve("audit_exports/pssa_pr4c_passage_specificity");
const passageQualityReportDir = path.resolve("audit_exports/pssa_pr4e_passage_quality");
const pilotItems: McqAuditInput[] = [];
const pilotPassages: PssaPassageAuditInput[] = [];

for (const grade of grades) {
  const dir = path.resolve(`exemplars/pssa_grade${grade}_pilot`);
  const files = ["pilot_student_preview.md", "pilot_backend.json", "pilot_answer_key_and_rubric.md", "pilot_audit_report.md"];
  for (const file of files) {
    if (!fs.existsSync(path.join(dir, file))) failures.push(`Grade ${grade} missing ${file}`);
  }
  if (!fs.existsSync(path.join(dir, "pilot_backend.json"))) continue;
  const backend = JSON.parse(fs.readFileSync(path.join(dir, "pilot_backend.json"), "utf8"));
  pilotPassages.push(...backend.passages);
  pilotItems.push(...backend.items);
  const audit = fs.existsSync(path.join(dir, "pilot_audit_report.md")) ? fs.readFileSync(path.join(dir, "pilot_audit_report.md"), "utf8") : "";
  const auditPasses = audit.includes("All gates PASS.") || (grade === 3 && audit.includes("- Result: PASS"));
  if (!auditPasses) failures.push(`Grade ${grade} audit report does not show all gates PASS`);
  summary.push({
    grade,
    passages: backend.passages.length,
    items: backend.items.length,
    mcq: backend.items.filter((item: any) => item.itemType === "MCQ").length,
    tda: backend.items.filter((item: any) => item.itemType === "TDA").length,
    distinctEc: new Set(backend.items.map((item: any) => item.eligibleContent)).size,
  });
}

if (!fs.existsSync(path.resolve("exemplars/pssa_pilot_batch_summary.md"))) {
  failures.push("Missing exemplars/pssa_pilot_batch_summary.md");
}

const generatedReadingMcqs = pilotItems.filter((item) => isPassageLinkedReadingMcq(item) && !String(item.id ?? item.itemId ?? "").includes("_g6_t1_"));
const grade3ReadingMcqs = generatedReadingMcqs.filter((item) => item.gradeLevel === 3);
const unrevisedReadingMcqs = generatedReadingMcqs.filter((item) => item.gradeLevel !== 3);
const generatedPassageRows = buildMcqPassageSpecificityReport(generatedReadingMcqs, pilotPassages);
const grade3Rows = buildMcqPassageSpecificityReport(grade3ReadingMcqs, pilotPassages);
const unrevisedRows = buildMcqPassageSpecificityReport(unrevisedReadingMcqs, pilotPassages);
const grade3ReplacementItems = grade3ReadingMcqs.filter((item: any) => item.validationMetadataJson?.replacementAuthoredInPr4g === true);
const unrevisedFailedItemIds = new Set(unrevisedRows.filter((row) => row.result === "FAIL").map((row) => row.itemId));
const conventionsMcqs = pilotItems.filter((item) => (item.itemType ?? item.questionType) === "MCQ" && !item.passageId);
const tdaItems = pilotItems.filter((item) => item.itemType === "TDA");

const exemplarPath = path.resolve("exemplars/pssa_grade6/pssa_grade6_exemplar_backend.json");
let exemplarRows: PassageSpecificityRow[] = [];
let exemplarPassageRows: PassageQualityRow[] = [];
if (fs.existsSync(exemplarPath)) {
  const exemplar = JSON.parse(fs.readFileSync(exemplarPath, "utf8"));
  exemplarRows = buildMcqPassageSpecificityReport(exemplar.items, [exemplar.passage]);
  exemplarPassageRows = buildPssaPassageQualityReport([exemplar.passage]);
  if (hasBlockingPassageSpecificityFailure(exemplarRows)) {
    failures.push("Grade 6 exemplar failed passage-specificity gates");
  }
  if (hasBlockingPassageQualityFailure(exemplarPassageRows) || exemplarPassageRows.some((row) => row.severity === "WARNING")) {
    failures.push("Grade 6 exemplar failed passage-quality gates");
  }
} else {
  failures.push("Missing Grade 6 exemplar backend for passage-specificity pass test");
}

if (generatedReadingMcqs.length !== 144) failures.push(`Expected 144 generated reading MCQs, found ${generatedReadingMcqs.length}`);
if (grade3ReadingMcqs.length !== 28) failures.push(`Expected 28 reauthored Grade 3 reading MCQs, found ${grade3ReadingMcqs.length}`);
if (grade3ReplacementItems.length !== grade3ReadingMcqs.length) failures.push(`Expected all Grade 3 reading MCQs to be PR #4g replacements, found ${grade3ReplacementItems.length}/${grade3ReadingMcqs.length}`);
if (hasBlockingPassageSpecificityFailure(grade3Rows)) failures.push("Expected reauthored Grade 3 reading MCQs to pass passage-specificity gates");
if (unrevisedReadingMcqs.length !== 116) failures.push(`Expected 116 unrevised reading MCQs, found ${unrevisedReadingMcqs.length}`);
if (unrevisedFailedItemIds.size !== unrevisedReadingMcqs.length) {
  failures.push(`Expected unrevised reading MCQs to fail passage-specificity gates, failed ${unrevisedFailedItemIds.size}/${unrevisedReadingMcqs.length}`);
}

const conventionRows = buildMcqPassageSpecificityReport(conventionsMcqs, pilotPassages);
const tdaRows = buildMcqPassageSpecificityReport(tdaItems, pilotPassages);
if (conventionRows.length) failures.push("Conventions MCQs were evaluated by passage-grounding gates");
if (tdaRows.length) failures.push("TDA items were evaluated by passage-grounding gates");

const passageQualityRows = buildPssaPassageQualityReport(pilotPassages);
const passageQualityFailedIds = new Set(passageQualityRows.filter((row) => row.result === "FAIL" && row.severity === "BLOCKER").map((row) => row.passageId));
const passageCoherenceWarnRows = passageQualityRows.filter((row) => row.ruleId === "PSSA_PASSAGE_TOPIC_COHERENCE" && row.severity === "WARNING");
const grade3Passages = pilotPassages.filter((passage) => passage.gradeLevel === 3);
const grade3PassageRows = passageQualityRows.filter((row) => row.gradeLevel === 3);
const templatedPilotPassages = pilotPassages.filter((passage) => passage.gradeLevel !== 3 && !passage.id.includes("tranche1"));
const approvedTranchePassages = pilotPassages.filter((passage) => passage.id.includes("tranche1"));
const templatedPassageFailedIds = new Set([...passageQualityFailedIds].filter((id) => templatedPilotPassages.some((passage) => passage.id === id)));
const approvedTrancheFailedIds = new Set([...passageQualityFailedIds].filter((id) => approvedTranchePassages.some((passage) => passage.id === id)));
const grade3ClusterIds = new Set(passageQualityRows
  .filter((row) => row.ruleId === "PSSA_PASSAGE_CROSS_DUPLICATE" && row.gradeLevel === 3 && row.clusterId)
  .map((row) => row.clusterId));

if (pilotPassages.length !== 30) failures.push(`Expected 30 pilot passages, found ${pilotPassages.length}`);
if (hasBlockingPassageQualityFailure(grade3PassageRows) || grade3PassageRows.some((row) => row.severity === "WARNING")) failures.push("Expected regenerated Grade 3 passages to pass passage-quality gates without WARN");
if (templatedPassageFailedIds.size !== templatedPilotPassages.length) {
  failures.push(`Expected all templated pilot passages to fail passage-quality blockers, failed ${templatedPassageFailedIds.size}/${templatedPilotPassages.length}`);
}
if (approvedTrancheFailedIds.size) {
  failures.push(`Expected approved Grade 6 tranche passages to avoid passage-quality blockers, failed ${approvedTrancheFailedIds.size}/${approvedTranchePassages.length}`);
}
if (grade3ClusterIds.size !== 0) failures.push(`Expected regenerated Grade 3 passages not to cluster, found ${grade3ClusterIds.size} clusters`);

fs.mkdirSync(reportDir, { recursive: true });
writeCsv(
  path.join(reportDir, "pssa_mcq_passage_specificity_report.csv"),
  generatedPassageRows.filter((row) => [
    "PSSA_MCQ_GENERIC_TEST_TAKING_LANGUAGE",
    "PSSA_MCQ_GENERIC_STEM_LANGUAGE",
    "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES",
  ].includes(row.ruleId)),
);

fs.mkdirSync(passageQualityReportDir, { recursive: true });
writePassageQualityCsv(
  path.join(passageQualityReportDir, "pssa_passage_cross_duplicate_report.csv"),
  passageQualityRows.filter((row) => row.ruleId === "PSSA_PASSAGE_CROSS_DUPLICATE"),
);
writePassageQualityCsv(
  path.join(passageQualityReportDir, "pssa_passage_template_skeleton_report.csv"),
  passageQualityRows.filter((row) => row.ruleId === "PSSA_PASSAGE_TEMPLATE_SKELETON"),
);
writePassageQualityCsv(
  path.join(passageQualityReportDir, "pssa_passage_coherence_report.csv"),
  passageQualityRows.filter((row) => row.ruleId === "PSSA_PASSAGE_TOPIC_COHERENCE"),
);
writePassageQualityCsv(
  path.join(passageQualityReportDir, "pssa_passage_concreteness_report.csv"),
  passageQualityRows.filter((row) => row.ruleId === "PSSA_PASSAGE_CONCRETENESS"),
);
writeCsv(
  path.join(reportDir, "pssa_mcq_template_language_reuse_report.csv"),
  generatedPassageRows.filter((row) => [
    "PSSA_MCQ_TEMPLATE_LANGUAGE_REUSE",
    "PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES",
  ].includes(row.ruleId)),
);
writeCsv(
  path.join(reportDir, "pssa_mcq_choice_grounding_report.csv"),
  generatedPassageRows.filter((row) => [
    "PSSA_MCQ_CHOICE_EVIDENCE_LINKS_REQUIRED",
    "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND",
    "PSSA_MCQ_EVIDENCE_SPAN_REUSED",
    "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED",
    "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER",
  ].includes(row.ruleId)),
);

const discrimination = {
  rewrittenGrade3ReadingMcqs: {
    evaluated: grade3ReadingMcqs.length,
    result: !hasBlockingPassageSpecificityFailure(grade3Rows) && grade3ReplacementItems.length === grade3ReadingMcqs.length ? "PASS" : "FAIL",
    expected: "28 PR #4g reauthored items pass",
  },
  unrevisedReadingMcqs: {
    evaluated: unrevisedReadingMcqs.length,
    failed: unrevisedFailedItemIds.size,
    expected: "116 fail",
  },
  exemplarReadingMcq: {
    evaluated: exemplarRows.length ? 1 : 0,
    result: hasBlockingPassageSpecificityFailure(exemplarRows) ? "FAIL" : "PASS",
  },
  passageQuality: {
    pilotPassagesEvaluated: pilotPassages.length,
    regeneratedGrade3PassagesEvaluated: grade3Passages.length,
    regeneratedGrade3PassageResult: hasBlockingPassageQualityFailure(grade3PassageRows) || grade3PassageRows.some((row) => row.severity === "WARNING") ? "FAIL" : "PASS",
    templatedPilotPassagesEvaluated: templatedPilotPassages.length,
    templatedPilotPassagesFailed: templatedPassageFailedIds.size,
    approvedTranchePassagesEvaluated: approvedTranchePassages.length,
    approvedTranchePassagesFailed: approvedTrancheFailedIds.size,
    expected: "5 regenerated Grade 3 pass; 22 remaining templated fail; 3 approved tranche passages avoid blockers",
    grade3ClusterIds: [...grade3ClusterIds],
    exemplarPassageResult: hasBlockingPassageQualityFailure(exemplarPassageRows) || exemplarPassageRows.some((row) => row.severity === "WARNING") ? "FAIL" : "PASS",
    topicCoherenceWarnings: passageCoherenceWarnRows.map((row) => row.passageId),
  },
  exempt: {
    conventionsMcqs: conventionsMcqs.length,
    conventionsFlaggedByPassageGrounding: conventionRows.length,
    tdaItems: tdaItems.length,
    tdaFlaggedByPassageGrounding: tdaRows.length,
  },
  reports: [
    path.relative(process.cwd(), path.join(reportDir, "pssa_mcq_passage_specificity_report.csv")),
    path.relative(process.cwd(), path.join(reportDir, "pssa_mcq_template_language_reuse_report.csv")),
    path.relative(process.cwd(), path.join(reportDir, "pssa_mcq_choice_grounding_report.csv")),
    path.relative(process.cwd(), path.join(passageQualityReportDir, "pssa_passage_cross_duplicate_report.csv")),
    path.relative(process.cwd(), path.join(passageQualityReportDir, "pssa_passage_template_skeleton_report.csv")),
    path.relative(process.cwd(), path.join(passageQualityReportDir, "pssa_passage_coherence_report.csv")),
    path.relative(process.cwd(), path.join(passageQualityReportDir, "pssa_passage_concreteness_report.csv")),
  ],
};

if (failures.length) {
  console.error(JSON.stringify({ result: "FAIL", failures, summary, discrimination }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ result: "PASS", summary, discrimination }, null, 2));
}

function writeCsv(filePath: string, rows: PassageSpecificityRow[]) {
  const columns = ["itemId", "passageId", "gradeLevel", "eligibleContent", "ruleId", "result", "severity", "evidence", "failedChoiceIndices", "notes"];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell((row as any)[column])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function writePassageQualityCsv(filePath: string, rows: PassageQualityRow[]) {
  const columns = ["passageId", "gradeLevel", "title", "topicDomain", "ruleId", "result", "severity", "clusterId", "score", "evidence", "notes"];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell((row as any)[column])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}
