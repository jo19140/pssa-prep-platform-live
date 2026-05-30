import fs from "node:fs";
import path from "node:path";
import {
  buildMcqPassageSpecificityReport,
  hasBlockingPassageSpecificityFailure,
  isPassageLinkedReadingMcq,
  type McqAuditInput,
  type PassageSpecificityRow,
  type PssaPassageAuditInput,
} from "./pssa-audit-detectors";

const grades = [3, 4, 5, 6, 7, 8];
const failures: string[] = [];
const summary: Record<string, unknown>[] = [];
const reportDir = path.resolve("audit_exports/pssa_pr4c_passage_specificity");
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
  if (!audit.includes("All gates PASS.")) failures.push(`Grade ${grade} audit report does not show all gates PASS`);
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
const generatedPassageRows = buildMcqPassageSpecificityReport(generatedReadingMcqs, pilotPassages);
const generatedFailedItemIds = new Set(generatedPassageRows.filter((row) => row.result === "FAIL").map((row) => row.itemId));
const conventionsMcqs = pilotItems.filter((item) => (item.itemType ?? item.questionType) === "MCQ" && !item.passageId);
const tdaItems = pilotItems.filter((item) => item.itemType === "TDA");

const exemplarPath = path.resolve("exemplars/pssa_grade6/pssa_grade6_exemplar_backend.json");
let exemplarRows: PassageSpecificityRow[] = [];
if (fs.existsSync(exemplarPath)) {
  const exemplar = JSON.parse(fs.readFileSync(exemplarPath, "utf8"));
  exemplarRows = buildMcqPassageSpecificityReport(exemplar.items, [exemplar.passage]);
  if (hasBlockingPassageSpecificityFailure(exemplarRows)) {
    failures.push("Grade 6 exemplar failed passage-specificity gates");
  }
} else {
  failures.push("Missing Grade 6 exemplar backend for passage-specificity pass test");
}

if (generatedReadingMcqs.length !== 144) failures.push(`Expected 144 generated reading MCQs, found ${generatedReadingMcqs.length}`);
if (generatedFailedItemIds.size !== generatedReadingMcqs.length) {
  failures.push(`Expected all generated reading MCQs to fail passage-specificity gates, failed ${generatedFailedItemIds.size}/${generatedReadingMcqs.length}`);
}

const conventionRows = buildMcqPassageSpecificityReport(conventionsMcqs, pilotPassages);
const tdaRows = buildMcqPassageSpecificityReport(tdaItems, pilotPassages);
if (conventionRows.length) failures.push("Conventions MCQs were evaluated by passage-grounding gates");
if (tdaRows.length) failures.push("TDA items were evaluated by passage-grounding gates");

fs.mkdirSync(reportDir, { recursive: true });
writeCsv(
  path.join(reportDir, "pssa_mcq_passage_specificity_report.csv"),
  generatedPassageRows.filter((row) => [
    "PSSA_MCQ_GENERIC_TEST_TAKING_LANGUAGE",
    "PSSA_MCQ_GENERIC_STEM_LANGUAGE",
    "PSSA_MCQ_PASSAGE_SPECIFIC_CHOICES",
  ].includes(row.ruleId)),
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
    "PSSA_MCQ_DISTRACTOR_ROLE_REQUIRED",
    "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER",
  ].includes(row.ruleId)),
);

const discrimination = {
  generatedReadingMcqs: {
    evaluated: generatedReadingMcqs.length,
    failed: generatedFailedItemIds.size,
    expected: "144 fail",
  },
  exemplarReadingMcq: {
    evaluated: exemplarRows.length ? 1 : 0,
    result: hasBlockingPassageSpecificityFailure(exemplarRows) ? "FAIL" : "PASS",
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
