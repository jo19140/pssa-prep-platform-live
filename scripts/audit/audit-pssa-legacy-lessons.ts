import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildItemEcSkillMatchReport,
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildMcqPassageSpecificityReport,
  buildPssaPassageQualityReport,
  type ItemEcSkillMatchRow,
  type McqAbsoluteLanguageRow,
  type McqAuditInput,
  type McqCorrectIsLongestRow,
  type PassageQualityRow,
  type PassageSpecificityRow,
  type PssaPassageAuditInput,
  type StructuredChoice,
} from "./pssa-audit-detectors";

type SourceStatus = "AVAILABLE" | "MISSING_SOURCE" | "PARSE_ERROR";
type FindingResult = "PASS" | "WARN" | "FAIL" | "SKIP";
type Recommendation =
  | "MISSING_SOURCE"
  | "REVALIDATE_UNCHANGED_CANDIDATE"
  | "REPAIR_AND_REAUDIT"
  | "REAUTHOR_AGAINST_CANONICAL_CONTRACTS"
  | "DEPRECATE_OR_SUPERSEDE";

type SourceRow = {
  sourceId: string;
  sourceType: string;
  ref: string;
  pathPattern: string;
  status: SourceStatus;
  availableFiles: number;
  lessonRecords: number;
  notes: string;
};

type LegacyLesson = {
  sourceId: string;
  sourceType: string;
  sourcePath: string;
  sourceRef: string;
  rawRecordIndex: number;
  lessonId: string;
  title: string;
  grade: number | "";
  state: string;
  subject: string;
  module: string;
  standardCode: string;
  standardLabel: string;
  skill: string;
  generatorVersion: string;
  reviewStatus: string;
  content: any;
  rawText: string;
};

type PracticeItem = {
  lessonId: string;
  itemId: string;
  sourceId: string;
  section: string;
  index: number;
  type: string;
  question: string;
  passage: string;
  choices: string[];
  correctAnswer: unknown;
  normalizedInteractionType: string;
  hasResponseSpec: boolean;
  hasCorrectResponse: boolean;
  hasScoring: boolean;
  hasVerbatimEvidence: boolean | "";
  raw: any;
};

type FindingRow = {
  lessonId: string;
  sourceId: string;
  scope: "lesson" | "item" | "passage" | "batch";
  targetId: string;
  ruleId: string;
  result: FindingResult;
  severity: "INFO" | "WARNING" | "BLOCKER";
  evidence: string;
  notes: string;
};

type InventoryRow = {
  lessonId: string;
  title: string;
  sourceId: string;
  sourceType: string;
  sourcePath: string;
  sourceRef: string;
  grade: number | "";
  state: string;
  subject: string;
  module: string;
  standardCode: string;
  skill: string;
  generatorVersion: string;
  reviewStatus: string;
  legacyStatus: "QUARANTINED";
  practiceItems: number;
  mcqItems: number;
  teiItems: number;
  passageCount: number;
  blockerCount: number;
  warningCount: number;
  recommendation: Recommendation;
  notes: string;
};

const archiveRefs = [
  "state-track/pssa-v2-lessons-and-tei-player",
  "origin/state-track/pssa-v2-lessons-and-tei-player",
];
const fallbackArchiveRef = "local-pssa-governance-and-tranche1-2026-05-31";
const outputDir = path.resolve("audit_exports/pssa_legacy_lesson_audit");

const canonicalInteractionTypes = new Set([
  "MCQ",
  "EBSR",
  "MULTI_SELECT",
  "INLINE_DROPDOWN",
  "MATCHING_GRID",
  "HOT_TEXT",
  "DRAG_DROP",
  "SHORT_ANSWER",
  "TDA",
]);

const legacyToCanonical: Record<string, string> = {
  mc: "MCQ",
  mcq: "MCQ",
  "multiple-choice": "MCQ",
  "two-part-ebsr": "EBSR",
  ebsr: "EBSR",
  "inline-dropdown": "INLINE_DROPDOWN",
  "hot-text": "HOT_TEXT",
  "hot-text-phrase": "HOT_TEXT",
  "hot-text-sentence": "HOT_TEXT",
  "hot-text-word": "HOT_TEXT",
  "drag-drop": "DRAG_DROP",
  "drag-drop-order": "DRAG_DROP",
  "drag-drop-table": "DRAG_DROP",
  "matching-grid": "MATCHING_GRID",
  "short-answer": "SHORT_ANSWER",
  tda: "TDA",
};

const sourceRows: SourceRow[] = [];
const lessons: LegacyLesson[] = [];
const findings: FindingRow[] = [];
const practiceRows: PracticeItem[] = [];
const passageQualityRows: (PassageQualityRow & { lessonId: string; sourceId: string })[] = [];
const passageSpecificityRows: (PassageSpecificityRow & { lessonId: string; sourceId: string })[] = [];
const skillMatchRows: (ItemEcSkillMatchRow & { lessonId: string; sourceId: string })[] = [];
const shortcutRows: (McqCorrectIsLongestRow & { lessonId: string; sourceId: string })[] = [];
const absoluteLanguageRows: (McqAbsoluteLanguageRow & { lessonId: string; sourceId: string })[] = [];

main();

function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  inventoryMissingExactV2JsonSamples();
  collectReadableSamples();
  collectTokenBudgetJsonSamples();
  collectLessonBundles();

  for (const lesson of lessons) {
    auditLesson(lesson);
  }

  const inventory = buildInventoryRows();
  writeCsv(path.join(outputDir, "source_inventory.csv"), sourceRows);
  writeCsv(path.join(outputDir, "lesson_inventory.csv"), inventory);
  writeCsv(path.join(outputDir, "gate_findings.csv"), findings);
  writeCsv(path.join(outputDir, "practice_item_findings.csv"), practiceItemFindingRows());
  writeCsv(path.join(outputDir, "passage_quality_report.csv"), passageQualityRows);
  writeCsv(path.join(outputDir, "mcq_passage_specificity_report.csv"), passageSpecificityRows);
  writeCsv(path.join(outputDir, "ec_skill_match_report.csv"), skillMatchRows);
  writeCsv(path.join(outputDir, "surface_shortcut_report.csv"), shortcutRows);
  writeCsv(path.join(outputDir, "absolute_language_report.csv"), absoluteLanguageRows);
  writeSummary(path.join(outputDir, "summary.md"), inventory);
}

function inventoryMissingExactV2JsonSamples() {
  const sourceId = "state-track-v2-json-samples";
  for (const ref of archiveRefs) {
    const files = gitLs(ref, "audit/v2-samples");
    if (files.length) {
      sourceRows.push({
        sourceId,
        sourceType: "v2_sample_json",
        ref,
        pathPattern: "audit/v2-samples/*.json",
        status: "AVAILABLE",
        availableFiles: files.filter((file) => file.endsWith(".json")).length,
        lessonRecords: 0,
        notes: "Exact V2 JSON sample path is available; this audit runner can be extended to parse it.",
      });
      return;
    }
  }
  sourceRows.push({
    sourceId,
    sourceType: "v2_sample_json",
    ref: archiveRefs.join(" | "),
    pathPattern: "audit/v2-samples/*.json",
    status: "MISSING_SOURCE",
    availableFiles: 0,
    lessonRecords: 0,
    notes: "Named state-track branch/ref and audit/v2-samples/*.json were not accessible from the local repository or fetched origin refs.",
  });
}

function collectReadableSamples() {
  const files = gitLs(fallbackArchiveRef, "audit/v2-samples-readable").filter((file) => file.endsWith(".md"));
  const sourceId = "archive-readable-v2-samples";
  if (!files.length) {
    sourceRows.push(missingSource(sourceId, "readable_v2_sample", fallbackArchiveRef, "audit/v2-samples-readable/*.md"));
    return;
  }

  let count = 0;
  for (const file of files) {
    const text = gitShow(fallbackArchiveRef, file);
    if (!text) continue;
    count += 1;
    lessons.push(lessonFromReadableMarkdown(sourceId, fallbackArchiveRef, file, count, text));
  }
  sourceRows.push({
    sourceId,
    sourceType: "readable_v2_sample",
    ref: fallbackArchiveRef,
    pathPattern: "audit/v2-samples-readable/*.md",
    status: "AVAILABLE",
    availableFiles: files.length,
    lessonRecords: count,
    notes: "Readable Markdown exports are useful for lesson-level and text-pattern audit, but they are not canonical JSON lesson records.",
  });
}

function collectTokenBudgetJsonSamples() {
  const files = gitLs(fallbackArchiveRef, "audit")
    .filter((file) => /audit\/v2-token-budget.*\/sample-.*\.json$/.test(file));
  const sourceId = "archive-token-budget-json-samples";
  if (!files.length) {
    sourceRows.push(missingSource(sourceId, "v2_token_budget_json", fallbackArchiveRef, "audit/v2-token-budget*/sample-*.json"));
    return;
  }

  let count = 0;
  for (const file of files) {
    const text = gitShow(fallbackArchiveRef, file);
    try {
      const parsed = JSON.parse(text);
      count += 1;
      lessons.push(lessonFromObject(sourceId, "v2_token_budget_json", fallbackArchiveRef, file, count, parsed.lesson ?? parsed));
    } catch (error) {
      sourceRows.push({
        sourceId: `${sourceId}:${file}`,
        sourceType: "v2_token_budget_json",
        ref: fallbackArchiveRef,
        pathPattern: file,
        status: "PARSE_ERROR",
        availableFiles: 1,
        lessonRecords: 0,
        notes: error instanceof Error ? error.message : String(error),
      });
    }
  }
  sourceRows.push({
    sourceId,
    sourceType: "v2_token_budget_json",
    ref: fallbackArchiveRef,
    pathPattern: "audit/v2-token-budget*/sample-*.json",
    status: "AVAILABLE",
    availableFiles: files.length,
    lessonRecords: count,
    notes: "Generated V2 JSON fixtures found on the accessible archive branch.",
  });
}

function collectLessonBundles() {
  const files = gitLs(fallbackArchiveRef, "audit_exports")
    .filter((file) => /audit_exports\/[^/]+\/pssa_lessons\.jsonl$/.test(file));
  const sourceId = "archive-db-exported-lesson-bundles";
  if (!files.length) {
    sourceRows.push(missingSource(sourceId, "db_export_jsonl", fallbackArchiveRef, "audit_exports/*/pssa_lessons.jsonl"));
    return;
  }

  let totalRecords = 0;
  for (const file of files) {
    const text = gitShow(fallbackArchiveRef, file);
    const lines = text.split(/\r?\n/).filter(Boolean);
    let parsedRecords = 0;
    lines.forEach((line, index) => {
      try {
        const record = JSON.parse(line);
        parsedRecords += 1;
        totalRecords += 1;
        const content = record.content && typeof record.content === "object" ? record.content : record;
        lessons.push(lessonFromObject(`${sourceId}:${path.dirname(file)}`, "db_export_jsonl", fallbackArchiveRef, file, index + 1, {
          ...content,
          lessonId: record.lessonId ?? content.lessonId,
          title: record.title ?? content.title,
          grade: record.grade ?? content.grade,
          gradeLevel: record.gradeLevel ?? content.gradeLevel,
          state: record.state ?? content.state,
          subject: record.subject ?? content.subject,
          module: record.module ?? content.module,
          standardCode: record.standardCode ?? content.standardCode,
          standardLabel: record.standardLabel ?? content.standardLabel,
          skill: record.skill ?? content.skill,
          generatorVersion: record.generatorVersion ?? content.generatorVersion,
          reviewStatus: record.reviewStatus ?? content.reviewStatus,
          sourceEnvelope: {
            source: record.source,
            generatedBy: record.generatedBy,
            aiStatus: record.aiStatus,
            approvedAt: record.approvedAt,
            rejectedAt: record.rejectedAt,
          },
        }));
      } catch (error) {
        sourceRows.push({
          sourceId: `${sourceId}:${file}:${index + 1}`,
          sourceType: "db_export_jsonl",
          ref: fallbackArchiveRef,
          pathPattern: file,
          status: "PARSE_ERROR",
          availableFiles: 1,
          lessonRecords: 0,
          notes: error instanceof Error ? error.message : String(error),
        });
      }
    });
    sourceRows.push({
      sourceId: `${sourceId}:${path.dirname(file)}`,
      sourceType: "db_export_jsonl",
      ref: fallbackArchiveRef,
      pathPattern: file,
      status: "AVAILABLE",
      availableFiles: 1,
      lessonRecords: parsedRecords,
      notes: "Read-only JSONL lesson export from archive branch.",
    });
  }
  sourceRows.push({
    sourceId,
    sourceType: "db_export_jsonl",
    ref: fallbackArchiveRef,
    pathPattern: "audit_exports/*/pssa_lessons.jsonl",
    status: "AVAILABLE",
    availableFiles: files.length,
    lessonRecords: totalRecords,
    notes: "Aggregate row for all available lesson bundle exports.",
  });
}

function auditLesson(lesson: LegacyLesson) {
  const items = extractPracticeItems(lesson);
  practiceRows.push(...items);
  const lessonPassages = extractPassages(lesson, items);
  const mcqInputs = toMcqAuditInputs(lesson, items);
  const canonicalItemFindings = auditCanonicalItemContracts(items);

  findings.push(...auditLessonMetadata(lesson, items, lessonPassages));
  findings.push(...canonicalItemFindings);
  findings.push(...auditPreviewAndBackendLeakShape(lesson));
  findings.push(...auditSourceComplianceShape(lesson));

  if (lessonPassages.length) {
    const rows = buildPssaPassageQualityReport(lessonPassages).map((row) => ({
      ...row,
      lessonId: lesson.lessonId,
      sourceId: lesson.sourceId,
    }));
    passageQualityRows.push(...rows);
    findings.push(...rows
      .filter((row) => row.result === "FAIL" || row.severity === "WARNING")
      .map((row) => finding(lesson, "passage", row.passageId, row.ruleId, row.result === "FAIL" ? "FAIL" : "WARN", row.severity, row.evidence, row.notes)));
  }

  if (mcqInputs.length) {
    const rows = buildMcqPassageSpecificityReport(mcqInputs, lessonPassages).map((row) => ({
      ...row,
      lessonId: lesson.lessonId,
      sourceId: lesson.sourceId,
    }));
    passageSpecificityRows.push(...rows);
    findings.push(...rows
      .filter((row) => row.result === "FAIL" || row.severity === "WARNING")
      .map((row) => finding(lesson, "item", row.itemId, row.ruleId, row.result === "FAIL" ? "FAIL" : "WARN", row.severity, row.evidence, row.notes)));

    const skillRows = buildItemEcSkillMatchReport(mcqInputs, lessonPassages, {}).map((row) => ({
      ...row,
      lessonId: lesson.lessonId,
      sourceId: lesson.sourceId,
    }));
    skillMatchRows.push(...skillRows);
    findings.push(...skillRows.map((row) => finding(
      lesson,
      "item",
      row.itemId,
      "PSSA_ITEM_EC_SKILL_MATCH",
      row.eligibleContent.startsWith("E") ? (row.skillMatchResult === "PASS" ? "PASS" : row.skillMatchResult === "WARN" ? "WARN" : "FAIL") : "SKIP",
      row.eligibleContent.startsWith("E") && row.skillMatchResult === "FAIL" ? "BLOCKER" : row.skillMatchResult === "WARN" ? "WARNING" : "INFO",
      row.mismatchReason,
      row.eligibleContent.startsWith("E") ? row.notes : "Legacy lesson uses PA Core CC standard codes, not current eligible-content IDs; EC skill-match requires a crosswalk before approval.",
    )));

    shortcutRows.push(...buildMcqCorrectIsLongestReport(mcqInputs).map((row) => ({ ...row, lessonId: lesson.lessonId, sourceId: lesson.sourceId })));
    absoluteLanguageRows.push(...buildMcqAbsoluteLanguageDistractorReport(mcqInputs).map((row) => ({ ...row, lessonId: lesson.lessonId, sourceId: lesson.sourceId })));
  }
}

function auditLessonMetadata(lesson: LegacyLesson, items: PracticeItem[], passages: PssaPassageAuditInput[]): FindingRow[] {
  const rows: FindingRow[] = [];
  rows.push(finding(lesson, "lesson", lesson.lessonId, "PSSA_LEGACY_LESSON_QUARANTINED", "FAIL", "BLOCKER", "Legacy lesson starts quarantined.", "Audit-only result; do not activate, approve, import, or count as student-ready."));
  rows.push(finding(lesson, "lesson", lesson.lessonId, "PSSA_LESSON_MODULE_EXPLICIT", lesson.module && lesson.state && lesson.subject ? "PASS" : "FAIL", lesson.module && lesson.state && lesson.subject ? "INFO" : "BLOCKER", `${lesson.module}|${lesson.state}|${lesson.subject}`, "Legacy reuse requires explicit module/state/subject metadata."));
  rows.push(finding(lesson, "lesson", lesson.lessonId, "PSSA_LESSON_GRADE_STANDARD_EXPLICIT", lesson.grade && lesson.standardCode ? "PASS" : "FAIL", lesson.grade && lesson.standardCode ? "INFO" : "BLOCKER", `${lesson.grade}|${lesson.standardCode}`, "Legacy reuse requires explicit grade and standards framework metadata."));
  rows.push(finding(lesson, "lesson", lesson.lessonId, "PSSA_LESSON_HAS_PRACTICE_ITEMS", items.length ? "PASS" : "FAIL", items.length ? "INFO" : "BLOCKER", String(items.length), "Lesson must expose auditable practice/check items."));
  rows.push(finding(lesson, "lesson", lesson.lessonId, "PSSA_LESSON_HAS_AUDITABLE_PASSAGES", passages.length ? "PASS" : "WARN", passages.length ? "INFO" : "WARNING", String(passages.length), "Passage gates run only when lesson practice includes passage text."));
  return rows;
}

function auditCanonicalItemContracts(items: PracticeItem[]): FindingRow[] {
  const rows: FindingRow[] = [];
  for (const item of items) {
    const lesson = lessons.find((entry) => entry.lessonId === item.lessonId);
    if (!lesson) continue;
    const knownInteraction = canonicalInteractionTypes.has(item.normalizedInteractionType);
    rows.push(finding(lesson, "item", item.itemId, "PSSA_RESPONSE_SPEC_UNION_SHAPE", item.hasResponseSpec ? "PASS" : "FAIL", item.hasResponseSpec ? "INFO" : "BLOCKER", item.type, item.hasResponseSpec ? "Practice item includes responseSpec." : "Legacy practice item uses old lesson fields and does not include canonical responseSpec."));
    rows.push(finding(lesson, "item", item.itemId, "PSSA_INTERACTION_TYPE_CANONICAL_MAPPING", knownInteraction ? "PASS" : "FAIL", knownInteraction ? "INFO" : "BLOCKER", `${item.type} -> ${item.normalizedInteractionType || "UNMAPPED"}`, "Legacy type must map to canonical #4j responseSpec interaction type."));
    rows.push(finding(lesson, "item", item.itemId, "PSSA_CORRECT_RESPONSE_EXPLICIT", item.hasCorrectResponse ? "PASS" : "FAIL", item.hasCorrectResponse ? "INFO" : "BLOCKER", String(item.correctAnswer ?? ""), item.hasCorrectResponse ? "Practice item exposes an answer key field." : "No auditable answer key field found."));
    rows.push(finding(lesson, "item", item.itemId, "PSSA_SCORING_RULE_EXPLICIT", item.hasScoring ? "PASS" : "FAIL", item.hasScoring ? "INFO" : "BLOCKER", item.type, item.hasScoring ? "Practice item exposes scoring metadata." : "Legacy practice item lacks canonical scoring/partial-credit rules."));
    if (item.hasVerbatimEvidence !== "") {
      rows.push(finding(lesson, "item", item.itemId, "PSSA_EVIDENCE_SPAN_VERBATIM", item.hasVerbatimEvidence ? "PASS" : "FAIL", item.hasVerbatimEvidence ? "INFO" : "BLOCKER", item.question, item.hasVerbatimEvidence ? "Correct evidence text appears verbatim in the passage." : "Correct evidence text was not found verbatim in the attached passage."));
    }
  }
  return rows;
}

function auditPreviewAndBackendLeakShape(lesson: LegacyLesson): FindingRow[] {
  const text = lesson.rawText;
  const hasBackendAnswers = /correctAnswer|correctIndex|correctPhrases|correctMapping|rightAnswerRationale|distractorRationale/.test(text);
  return [
    finding(
      lesson,
      "lesson",
      lesson.lessonId,
      "PSSA_STUDENT_PREVIEW_LEAK_CHECK_REQUIRED",
      hasBackendAnswers ? "FAIL" : "WARN",
      hasBackendAnswers ? "BLOCKER" : "WARNING",
      hasBackendAnswers ? "answer/rationale keys present in lesson export" : "no answer keys detected in raw text",
      "Legacy lesson exports are backend/editor shapes; student-preview redaction must be generated and audited separately before reuse.",
    ),
    finding(
      lesson,
      "lesson",
      lesson.lessonId,
      "PSSA_REVIEWER_PREVIEW_COMPLETENESS_REQUIRED",
      "WARN",
      "WARNING",
      "not present in canonical reviewer-preview shape",
      "Reviewer preview completeness cannot be approved from legacy lesson content alone.",
    ),
  ];
}

function auditSourceComplianceShape(lesson: LegacyLesson): FindingRow[] {
  const copiedOfficialSignals = /(released item|DRC|Pennsylvania Department of Education|PDE|item sampler|student response)/i.test(lesson.rawText);
  const licenseSignals = /license|sourceType|internal_original|cleared/i.test(lesson.rawText);
  return [
    finding(
      lesson,
      "lesson",
      lesson.lessonId,
      "PSSA_SOURCE_COMPLIANCE_NO_COPY_SCAN",
      copiedOfficialSignals ? "FAIL" : "PASS",
      copiedOfficialSignals ? "BLOCKER" : "INFO",
      copiedOfficialSignals ? "official/released-source signal found" : "no obvious released-source copy signal found",
      "Heuristic text scan only; source-compliance approval still requires canonical source scan.",
    ),
    finding(
      lesson,
      "lesson",
      lesson.lessonId,
      "PSSA_SOURCE_LICENSE_METADATA_PRESENT",
      licenseSignals ? "PASS" : "FAIL",
      licenseSignals ? "INFO" : "BLOCKER",
      licenseSignals ? "license/source metadata signal present" : "license/source metadata missing",
      "Legacy lessons need explicit source type, license status, and no-copy audit metadata before reuse.",
    ),
  ];
}

function buildInventoryRows(): InventoryRow[] {
  return lessons.map((lesson) => {
    const lessonFindings = findings.filter((row) => row.lessonId === lesson.lessonId);
    const lessonPractice = practiceRows.filter((row) => row.lessonId === lesson.lessonId);
    const blockerCount = lessonFindings.filter((row) => row.result === "FAIL" && row.severity === "BLOCKER").length;
    const warningCount = lessonFindings.filter((row) => row.result === "WARN" || row.severity === "WARNING").length;
    const responseSpecFailures = lessonFindings.filter((row) => row.ruleId === "PSSA_RESPONSE_SPEC_UNION_SHAPE" && row.result === "FAIL").length;
    const passageBlockers = lessonFindings.filter((row) => row.scope === "passage" && row.severity === "BLOCKER" && row.result === "FAIL").length;
    const leakBlockers = lessonFindings.some((row) => row.ruleId === "PSSA_STUDENT_PREVIEW_LEAK_CHECK_REQUIRED" && row.result === "FAIL");
    const recommendation: Recommendation = blockerCount === 0
      ? "REVALIDATE_UNCHANGED_CANDIDATE"
      : responseSpecFailures || leakBlockers
        ? "REAUTHOR_AGAINST_CANONICAL_CONTRACTS"
        : passageBlockers
          ? "REPAIR_AND_REAUDIT"
          : blockerCount > 20
            ? "DEPRECATE_OR_SUPERSEDE"
            : "REPAIR_AND_REAUDIT";
    return {
      lessonId: lesson.lessonId,
      title: lesson.title,
      sourceId: lesson.sourceId,
      sourceType: lesson.sourceType,
      sourcePath: lesson.sourcePath,
      sourceRef: lesson.sourceRef,
      grade: lesson.grade,
      state: lesson.state,
      subject: lesson.subject,
      module: lesson.module,
      standardCode: lesson.standardCode,
      skill: lesson.skill,
      generatorVersion: lesson.generatorVersion,
      reviewStatus: lesson.reviewStatus,
      legacyStatus: "QUARANTINED",
      practiceItems: lessonPractice.length,
      mcqItems: lessonPractice.filter((item) => item.normalizedInteractionType === "MCQ").length,
      teiItems: lessonPractice.filter((item) => item.normalizedInteractionType !== "MCQ").length,
      passageCount: new Set(lessonPractice.map((item) => item.passage).filter(Boolean)).size,
      blockerCount,
      warningCount,
      recommendation,
      notes: "Audit-only. This row is not an approval and must not be used to activate legacy lesson content.",
    };
  });
}

function practiceItemFindingRows() {
  return practiceRows.map((item) => ({
    lessonId: item.lessonId,
    sourceId: item.sourceId,
    itemId: item.itemId,
    section: item.section,
    itemIndex: item.index,
    legacyType: item.type,
    normalizedInteractionType: item.normalizedInteractionType,
    hasPassage: Boolean(item.passage),
    choiceCount: item.choices.length,
    hasResponseSpec: item.hasResponseSpec,
    hasCorrectResponse: item.hasCorrectResponse,
    hasScoring: item.hasScoring,
    hasVerbatimEvidence: item.hasVerbatimEvidence,
    question: item.question,
  }));
}

function writeSummary(filePath: string, inventory: InventoryRow[]) {
  const byRecommendation = countBy(inventory, "recommendation");
  const bySource = countBy(inventory, "sourceId");
  const missingSources = sourceRows.filter((row) => row.status === "MISSING_SOURCE");
  const totalBlockers = inventory.reduce((sum, row) => sum + row.blockerCount, 0);
  const totalWarnings = inventory.reduce((sum, row) => sum + row.warningCount, 0);

  const lines = [
    "# PSSA Legacy Lesson Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope Guardrails",
    "",
    "- Audit-only: no legacy lessons activated, imported, approved, rewritten, or written to the database.",
    "- Every inventoried legacy lesson remains `QUARANTINED`.",
    "- Current #4j-#4o detectors and contracts govern; archive generator or governance output does not override them.",
    "",
    "## Inventory",
    "",
    `- Sources inventoried: ${sourceRows.length}`,
    `- Lessons inventoried: ${inventory.length}`,
    `- Practice/check items normalized for audit: ${practiceRows.length}`,
    `- Passage-quality detector rows: ${passageQualityRows.length}`,
    `- MCQ passage-specificity detector rows: ${passageSpecificityRows.length}`,
    `- Blocker findings: ${totalBlockers}`,
    `- Warning findings: ${totalWarnings}`,
    "",
    "## Recommendation Counts",
    "",
    ...Object.entries(byRecommendation).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Source Counts",
    "",
    ...Object.entries(bySource).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Missing Sources",
    "",
    ...(missingSources.length
      ? missingSources.map((row) => `- ${row.sourceId}: ${row.ref} ${row.pathPattern} -> ${row.notes}`)
      : ["- None"]),
    "",
    "## Readout",
    "",
    "The accessible legacy lesson corpus is useful as design/reference material, but the audited records are not student-ready under the canonical contracts. The dominant blockers are missing canonical `responseSpec` / scoring shapes and backend-answer leakage in legacy lesson exports. Passage and item detectors also surface repair work where passages or choices are generic, repetitive, or insufficiently evidence-linked.",
    "",
    "Reports:",
    "",
    "- `source_inventory.csv`",
    "- `lesson_inventory.csv`",
    "- `gate_findings.csv`",
    "- `practice_item_findings.csv`",
    "- `passage_quality_report.csv`",
    "- `mcq_passage_specificity_report.csv`",
    "- `ec_skill_match_report.csv`",
    "- `surface_shortcut_report.csv`",
    "- `absolute_language_report.csv`",
    "",
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function lessonFromReadableMarkdown(sourceId: string, ref: string, file: string, index: number, text: string): LegacyLesson {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(file, ".md");
  const meta = text.match(/\*\*Grade\*\*:\s*(\d+)\s*\|\s*\*\*Standard\*\*:\s*([^—\n]+)(?:—\s*([^\n]+))?/);
  const skill = text.match(/\*\*Skill\*\*:\s*([^\n]+)/)?.[1]?.trim() ?? "";
  return {
    sourceId,
    sourceType: "readable_v2_sample",
    sourcePath: file,
    sourceRef: ref,
    rawRecordIndex: index,
    lessonId: stableId(`${sourceId}:${file}`),
    title,
    grade: meta?.[1] ? Number(meta[1]) : "",
    state: "PA",
    subject: "ELA",
    module: "PSSA",
    standardCode: meta?.[2]?.trim() ?? "",
    standardLabel: meta?.[3]?.trim() ?? "",
    skill,
    generatorVersion: "V2",
    reviewStatus: "ARCHIVE_READABLE_SAMPLE",
    content: { markdown: text },
    rawText: text,
  };
}

function lessonFromObject(sourceId: string, sourceType: string, ref: string, file: string, index: number, content: any): LegacyLesson {
  const lessonId = String(content.lessonId ?? content.id ?? stableId(`${sourceId}:${file}:${index}:${content.title ?? ""}`));
  const grade = content.grade ?? content.gradeLevel ?? "";
  return {
    sourceId,
    sourceType,
    sourcePath: file,
    sourceRef: ref,
    rawRecordIndex: index,
    lessonId,
    title: String(content.title ?? content.resourceTitle ?? lessonId),
    grade: typeof grade === "number" ? grade : Number.isFinite(Number(grade)) ? Number(grade) : "",
    state: String(content.state ?? "PA"),
    subject: String(content.subject ?? "ELA"),
    module: String(content.module ?? "PSSA"),
    standardCode: String(content.standardCode ?? ""),
    standardLabel: String(content.standardLabel ?? ""),
    skill: String(content.skill ?? ""),
    generatorVersion: String(content.generatorVersion ?? ""),
    reviewStatus: String(content.reviewStatus ?? content.sourceEnvelope?.aiStatus ?? ""),
    content,
    rawText: JSON.stringify(content),
  };
}

function extractPracticeItems(lesson: LegacyLesson): PracticeItem[] {
  if (typeof lesson.content.markdown === "string") return extractPracticeItemsFromMarkdown(lesson);
  const sections = ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"];
  const items: PracticeItem[] = [];
  for (const section of sections) {
    const entries = Array.isArray(lesson.content[section]) ? lesson.content[section] : [];
    entries.forEach((raw: any, index: number) => items.push(normalizePracticeItem(lesson, section, index + 1, raw)));
  }
  if (Array.isArray(lesson.content.steps)) {
    lesson.content.steps.forEach((step: any, stepIndex: number) => {
      const check = step.checkQuestion;
      if (check && typeof check === "object") items.push(normalizePracticeItem(lesson, `steps.${stepIndex + 1}.checkQuestion`, 1, check));
    });
  }
  return items;
}

function extractPracticeItemsFromMarkdown(lesson: LegacyLesson): PracticeItem[] {
  const text = lesson.content.markdown;
  const chunks = text.split(/\n### Practice item /).slice(1);
  return chunks.map((chunk: string, index: number) => {
    const type = chunk.match(/^\d+\s+—\s+([^\n]+)/)?.[1]?.trim() ?? "";
    const passage = chunk.match(/\*\*Passage\*\*[\s\S]*?>\s*([\s\S]*?)(?:\n\n\*\*Question\*\*|\n\n\*\*Part A\*\*|\n\n\*\*Drag items\*\*)/)?.[1]?.replace(/\n>\s?/g, "\n").trim() ?? "";
    const question = chunk.match(/\*\*Question\*\*:\s*([^\n]+)/)?.[1]?.trim() ?? "";
    const choices = [...chunk.matchAll(/^\s*-\s+(.+?)(?:\s+\*\*← CORRECT\*\*)?$/gm)]
      .map((match) => match[1].replace(/\s+✓$/, "").trim())
      .filter((choice) => !choice.includes("→"));
    const correct = chunk.match(/-\s+(.+?)\s+\*\*← CORRECT\*\*/)?.[1]?.trim() ?? "";
    return normalizePracticeItem(lesson, "markdown", index + 1, { type, question, passage, choices, correctAnswer: correct });
  });
}

function normalizePracticeItem(lesson: LegacyLesson, section: string, index: number, raw: any): PracticeItem {
  const type = String(raw.type ?? raw.interactionType ?? raw.questionType ?? raw.itemType ?? "").trim();
  const normalizedInteractionType = legacyToCanonical[type.toLowerCase()] ?? String(raw.interactionType ?? "").toUpperCase();
  const choices = Array.isArray(raw.choices)
    ? raw.choices.map(String)
    : Array.isArray(raw.dropdownOptions)
      ? raw.dropdownOptions.map(String)
      : [];
  const correctAnswer = raw.correctAnswer ?? raw.correctOption ?? raw.correctPhrases ?? raw.correctMapping ?? raw.correctOrder ?? raw.correctResponse ?? null;
  return {
    lessonId: lesson.lessonId,
    sourceId: lesson.sourceId,
    itemId: `${lesson.lessonId}:${section}:${index}`,
    section,
    index,
    type,
    question: String(raw.question ?? raw.stem ?? raw.prompt ?? ""),
    passage: String(raw.passage ?? ""),
    choices,
    correctAnswer,
    normalizedInteractionType,
    hasResponseSpec: Boolean(raw.responseSpec),
    hasCorrectResponse: correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== "",
    hasScoring: Boolean(raw.scoring || raw.partialCredit || raw.rubric),
    hasVerbatimEvidence: evidenceIsVerbatim(raw),
    raw,
  };
}

function evidenceIsVerbatim(raw: any): boolean | "" {
  const passage = String(raw.passage ?? "");
  if (!passage) return "";
  const candidates = [
    ...(Array.isArray(raw.correctPhrases) ? raw.correctPhrases : []),
    ...(Array.isArray(raw.correctSentences) ? raw.correctSentences : []),
    ...(Array.isArray(raw.partB?.correctAnswers) ? raw.partB.correctAnswers : []),
    ...(Array.isArray(raw.partB?.correctChoices) ? raw.partB.correctChoices : []),
  ].map(String).filter(Boolean);
  if (!candidates.length) return "";
  return candidates.every((candidate) => containsNormalized(passage, candidate));
}

function extractPassages(lesson: LegacyLesson, items: PracticeItem[]): PssaPassageAuditInput[] {
  const seen = new Map<string, PssaPassageAuditInput>();
  items.forEach((item) => {
    if (!item.passage.trim()) return;
    const id = stableId(`${lesson.lessonId}:${item.passage}`);
    if (!seen.has(id)) {
      seen.set(id, {
        id,
        title: `${lesson.title} passage ${seen.size + 1}`,
        text: item.passage,
        gradeLevel: typeof lesson.grade === "number" ? lesson.grade : undefined,
        topicDomain: lesson.skill || lesson.standardLabel,
      });
    }
  });
  return [...seen.values()];
}

function toMcqAuditInputs(lesson: LegacyLesson, items: PracticeItem[]): McqAuditInput[] {
  const passageIdByText = new Map(extractPassages(lesson, items).map((passage) => [passage.text, passage.id]));
  return items
    .filter((item) => item.normalizedInteractionType === "MCQ" && item.choices.length >= 2)
    .map((item) => {
      const correctIndex = typeof item.correctAnswer === "string"
        ? item.choices.findIndex((choice) => normalizeText(choice) === normalizeText(String(item.correctAnswer)))
        : typeof item.correctAnswer === "number"
          ? item.correctAnswer
          : -1;
      const structuredChoices: StructuredChoice[] = item.choices.map((choice, index) => ({
        text: choice,
        isCorrect: index === correctIndex,
        rationale: Array.isArray(item.raw.distractorRationale)
          ? String(item.raw.distractorRationale.find((entry: any) => entry.choice === choice)?.whyWrong ?? "")
          : "",
        evidenceLinks: [],
        distractorRole: null,
      }));
      return {
        itemId: item.itemId,
        itemType: "MCQ",
        questionType: "MCQ",
        correctIndex: correctIndex >= 0 ? correctIndex : null,
        choices: item.choices,
        answerChoicesJson: item.choices,
        structuredChoicesJson: structuredChoices,
        studentFacingPrompt: item.question,
        passageId: item.passage ? passageIdByText.get(item.passage) ?? null : null,
        eligibleContent: lesson.standardCode,
        gradeLevel: typeof lesson.grade === "number" ? lesson.grade : undefined,
        reportingCategory: reportingCategoryFromStandard(lesson.standardCode),
      };
    });
}

function reportingCategoryFromStandard(standardCode: string) {
  if (/CC\.1\.3\./.test(standardCode)) return "A";
  if (/CC\.1\.2\./.test(standardCode)) return "B";
  if (/CC\.1\.4\./.test(standardCode)) return "D";
  return "";
}

function finding(
  lesson: LegacyLesson,
  scope: FindingRow["scope"],
  targetId: string,
  ruleId: string,
  result: FindingResult,
  severity: FindingRow["severity"],
  evidence: string,
  notes: string,
): FindingRow {
  return {
    lessonId: lesson.lessonId,
    sourceId: lesson.sourceId,
    scope,
    targetId,
    ruleId,
    result,
    severity,
    evidence: truncate(evidence),
    notes,
  };
}

function missingSource(sourceId: string, sourceType: string, ref: string, pathPattern: string): SourceRow {
  return {
    sourceId,
    sourceType,
    ref,
    pathPattern,
    status: "MISSING_SOURCE",
    availableFiles: 0,
    lessonRecords: 0,
    notes: "Source path was not accessible; no guessing performed.",
  };
}

function gitLs(ref: string, treePath: string) {
  try {
    const output = childProcess.execFileSync("git", ["ls-tree", "-r", "--name-only", ref, treePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function gitShow(ref: string, file: string) {
  return childProcess.execFileSync("git", ["show", `${ref}:${file}`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 200,
  });
}

function writeCsv(filePath: string, rows: Record<string, any>[]) {
  const headers = [...rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>())];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key]);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function stableId(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsNormalized(haystack: string, needle: string) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

function truncate(value: string, max = 260) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
