import fs from "fs";
import path from "path";
import zlib from "zlib";
import { generateDiagnosticAssessment, getElaStandardsForGrade } from "../../lib/diagnosticGenerator";
import { auditLessonForApproval, runLessonLinter } from "../../lib/content/lessonMetadata";
import {
  buildAnswerPositionDistribution,
  buildDuplicateItemReport,
  buildManifestValidationReport,
  buildPassageRepetitionReport,
  countStudentPreviewEntries,
  detectorRowsToLinterRows,
} from "./pssa-audit-detectors";

type ExportOptions = {
  out: string;
  grades: number[];
  subject: string;
  includeBackendAnswers: boolean;
  redactPii: boolean;
};

type ExportFile = {
  relativePath: string;
  content: string | Buffer;
};

type ExportLogEntry = {
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  details?: unknown;
};

const DEFAULT_GRADES = [3, 4, 5, 6, 7, 8];
const BUNDLE_FILES = [
  "README.md",
  "manifest.json",
  "pssa_diagnostic_items.jsonl",
  "pssa_lessons.jsonl",
  "pssa_passages.jsonl",
  "pssa_item_summary.csv",
  "pssa_lesson_summary.csv",
  "pssa_standards_alignment.csv",
  "pssa_student_preview.md",
  "pssa_backend_answer_keys.jsonl",
  "pssa_metadata_completeness_report.csv",
  "pssa_linter_report.csv",
  "pssa_manifest_validation_report.csv",
  "pssa_answer_position_distribution.csv",
  "pssa_duplicate_item_report.csv",
  "pssa_passage_repetition_report.csv",
  "pssa_source_license_report.csv",
  "pssa_legacy_quarantine_report.csv",
  "pssa_student_ready_report.csv",
  "pssa_standards_alignment_report.csv",
  "pssa_approval_guard_report.csv",
  "pssa_runtime_source_report.md",
  "pssa_field_mapping.md",
  "pssa_model_decision_report.md",
  "pssa_generation_root_cause_report.md",
  "pssa_export_log.md",
];

const PII_KEY_PATTERN = /(email|name|phone|password|token|ipAddress|reviewedBy|reviewerUserId|approvedBy|rejectedBy|userId|studentUserId|teacherId|parent|learningPathId|sessionId|classRoomId|schoolId|studentProfileId|parentProfileId|assignedById)/i;

async function main() {
  const startedAt = new Date();
  const options = parseArgs(process.argv.slice(2), startedAt);
  const log: ExportLogEntry[] = [];
  loadLocalEnv(log);
  const bundleDir = path.resolve(process.cwd(), options.out);
  const zipPath = `${bundleDir}.zip`;

  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  const generatedAssessments = options.grades.map((grade) => generateDiagnosticAssessment(grade));
  log.push({
    level: "INFO",
    message: `Generated PSSA ELA diagnostic content for grades ${options.grades.join(", ")} from lib/diagnosticGenerator.ts.`,
  });

  const dbContent = await loadDatabaseContent(options, log);
  const diagnosticItems = [
    ...generatedAssessments.flatMap((assessment) =>
      assessment.questions.map((question, index) => ({
        source: "generated",
        module: "PSSA",
        state: "PA",
        subject: "ELA",
        grade: assessment.gradeLevel,
        assessmentId: `generated-pssa-ela-grade-${assessment.gradeLevel}`,
        assessmentTitle: assessment.title,
        questionNo: index + 1,
        itemId: String(question.id),
        standardCode: question.standardCode,
        standardLabel: question.standardLabel,
        skill: question.skill,
        questionType: question.type,
        difficulty: question.difficulty,
        passageId: question.passageId,
        passageTitle: question.passageTitle,
        item: redactForStudent(question, options.includeBackendAnswers),
        metadata: {
          generatedFrom: "lib/diagnosticGenerator.ts",
          pssaStyle: true,
          reviewStatus: "SOURCE_GENERATED",
        },
      })),
    ),
    ...dbContent.assessmentQuestions,
  ];

  const passages = [
    ...generatedAssessments.flatMap((assessment) =>
      assessment.passages.map((passage) => ({
        source: "generated",
        module: "PSSA",
        state: "PA",
        subject: "ELA",
        grade: assessment.gradeLevel,
        assessmentId: `generated-pssa-ela-grade-${assessment.gradeLevel}`,
        assessmentTitle: assessment.title,
        passageId: passage.id,
        title: passage.title,
        passageType: passage.passageType,
        genre: passage.genre,
        wordCountTarget: passage.wordCountTarget,
        actualWordCount: passage.actualWordCount,
        hasTable: passage.hasTable,
        hasSections: passage.hasSections,
        tableData: passage.tableData ?? null,
        content: passage.content,
        metadata: passage.metadata,
      })),
    ),
    ...dbContent.passages,
  ];

  const standardsRows = [
    ...generatedAssessments.flatMap((assessment) =>
      getElaStandardsForGrade(assessment.gradeLevel).map((standard) => ({
        source: "generated",
        module: "PSSA",
        state: "PA",
        subject: "ELA",
        grade: assessment.gradeLevel,
        standardCode: standard.code,
        standardLabel: standard.label,
        skill: standard.skill,
        strand: standard.strand,
        itemCount: assessment.questions.filter((question) => question.standardCode === standard.code).length,
        lessonCount: 0,
      })),
    ),
    ...dbContent.standards,
  ];

  const lessons = dbContent.lessons.map((lesson) => (options.redactPii ? redactPii(lesson) : lesson));
  const answerKeys = options.includeBackendAnswers
    ? [
        ...generatedAssessments.flatMap((assessment) =>
          assessment.questions.map((question, index) => ({
            source: "generated",
            module: "PSSA",
            state: "PA",
            subject: "ELA",
            grade: assessment.gradeLevel,
            assessmentId: `generated-pssa-ela-grade-${assessment.gradeLevel}`,
            assessmentTitle: assessment.title,
            questionNo: index + 1,
            itemId: String(question.id),
            questionType: question.type,
            standardCode: question.standardCode,
            skill: question.skill,
            answerKey: extractAnswerKey(question),
            scoringMetadata: extractScoringMetadata(question),
          })),
        ),
        ...dbContent.answerKeys,
      ]
    : [];

  const rolledStandards = rollUpStandards(standardsRows, diagnosticItems, lessons);
  const metadataReport = buildMetadataCompletenessReport({ diagnosticItems, lessons, passages });
  const sourceLicenseReport = buildSourceLicenseReport({ diagnosticItems, lessons, passages });
  const itemSummary = buildItemSummary(diagnosticItems);
  const lessonSummary = buildLessonSummary(lessons);
  const studentPreview = buildStudentPreview({ generatedAssessments, diagnosticItems, lessons, options });
  const studentPreviewEntries = countStudentPreviewEntries(studentPreview);

  const manifest = {
    bundleName: path.basename(bundleDir),
    generatedAt: startedAt.toISOString(),
    generatedBy: "scripts/audit/export-pssa-audit-bundle.ts",
    module: "Pennsylvania PSSA ELA",
    state: "PA",
    subject: options.subject,
    grades: options.grades,
    options: {
      includeBackendAnswers: options.includeBackendAnswers,
      redactPii: options.redactPii,
    },
    counts: {
      diagnosticItems: diagnosticItems.length,
      lessons: lessons.length,
      passages: passages.length,
      standardsAlignmentRows: rolledStandards.length,
      studentPreviewEntries,
      backendAnswerKeys: answerKeys.length,
      databaseAssessmentQuestions: dbContent.assessmentQuestions.length,
      databaseLessons: dbContent.lessons.length,
      databasePassages: dbContent.passages.length,
    },
    totalDiagnosticItems: diagnosticItems.length,
    totalLessons: lessons.length,
    totalPassages: passages.length,
    totalStandards: rolledStandards.length,
    totalStudentPreviewEntries: studentPreviewEntries,
    files: BUNDLE_FILES,
    zipFile: path.basename(zipPath),
    readOnlyExport: true,
    noDatabaseMutations: true,
  };
  const manifestValidationReport = buildManifestValidationReport({
    manifest,
    actual: {
      diagnosticItems: diagnosticItems.length,
      lessons: lessons.length,
      passages: passages.length,
      standards: rolledStandards.length,
      studentPreviewEntries,
    },
  });
  const answerPositionDistribution = buildAnswerPositionDistribution(diagnosticItems);
  const duplicateItemReport = buildDuplicateItemReport(diagnosticItems);
  const passageRepetitionReport = buildPassageRepetitionReport(passages);
  const governanceReports = buildGovernanceReports({
    manifest,
    diagnosticItems,
    sourceLicenseReport,
    passageRepetitionReport,
    duplicateItemReport,
    answerPositionDistribution,
  });
  const linterReport = [
    ...buildLinterReport({ diagnosticItems, lessons }),
    ...detectorRowsToLinterRows({
      manifestRows: manifestValidationReport,
      answerRows: answerPositionDistribution,
      duplicateRows: duplicateItemReport,
      passageRows: passageRepetitionReport,
    }),
  ];

  const files: ExportFile[] = [
    { relativePath: "README.md", content: buildReadme(manifest) },
    { relativePath: "manifest.json", content: `${JSON.stringify(manifest, null, 2)}\n` },
    { relativePath: "pssa_diagnostic_items.jsonl", content: toJsonl(diagnosticItems.map((item) => (options.redactPii ? redactPii(item) : item))) },
    { relativePath: "pssa_lessons.jsonl", content: toJsonl(lessons) },
    { relativePath: "pssa_passages.jsonl", content: toJsonl(passages.map((passage) => (options.redactPii ? redactPii(passage) : passage))) },
    { relativePath: "pssa_item_summary.csv", content: toCsv(itemSummary) },
    { relativePath: "pssa_lesson_summary.csv", content: toCsv(lessonSummary) },
    { relativePath: "pssa_standards_alignment.csv", content: toCsv(rolledStandards) },
    { relativePath: "pssa_student_preview.md", content: studentPreview },
    { relativePath: "pssa_backend_answer_keys.jsonl", content: toJsonl(answerKeys.map((key) => (options.redactPii ? redactPii(key) : key))) },
    { relativePath: "pssa_metadata_completeness_report.csv", content: toCsv(metadataReport) },
    { relativePath: "pssa_linter_report.csv", content: toCsv(linterReport) },
    { relativePath: "pssa_manifest_validation_report.csv", content: toCsv(manifestValidationReport) },
    { relativePath: "pssa_answer_position_distribution.csv", content: toCsv(answerPositionDistribution) },
    { relativePath: "pssa_duplicate_item_report.csv", content: toCsv(duplicateItemReport) },
    { relativePath: "pssa_passage_repetition_report.csv", content: toCsv(passageRepetitionReport) },
    { relativePath: "pssa_source_license_report.csv", content: toCsv(sourceLicenseReport) },
    { relativePath: "pssa_legacy_quarantine_report.csv", content: toCsv(governanceReports.legacyQuarantineReport) },
    { relativePath: "pssa_student_ready_report.csv", content: toCsv(governanceReports.studentReadyReport) },
    { relativePath: "pssa_standards_alignment_report.csv", content: toCsv(governanceReports.standardsAlignmentReport) },
    { relativePath: "pssa_approval_guard_report.csv", content: toCsv(governanceReports.approvalGuardReport) },
    { relativePath: "pssa_runtime_source_report.md", content: governanceReports.runtimeSourceReport },
    { relativePath: "pssa_field_mapping.md", content: fs.readFileSync(path.join(process.cwd(), "pssa_field_mapping.md"), "utf8") },
    { relativePath: "pssa_model_decision_report.md", content: fs.readFileSync(path.join(process.cwd(), "pssa_model_decision_report.md"), "utf8") },
    { relativePath: "pssa_generation_root_cause_report.md", content: fs.readFileSync(path.join(process.cwd(), "pssa_generation_root_cause_report.md"), "utf8") },
    { relativePath: "pssa_export_log.md", content: buildExportLog(log, startedAt, new Date(), manifest) },
  ];

  for (const file of files) {
    writeBundleFile(bundleDir, file);
  }
  writeZip(zipPath, files, path.basename(bundleDir));

  console.log(`PSSA audit bundle written to ${bundleDir}`);
  console.log(`Zip written to ${zipPath}`);
  console.log(JSON.stringify(manifest.counts, null, 2));
}

function buildGovernanceReports({
  manifest,
  diagnosticItems,
  sourceLicenseReport,
  passageRepetitionReport,
  duplicateItemReport,
  answerPositionDistribution,
}: {
  manifest: any;
  diagnosticItems: any[];
  sourceLicenseReport: any[];
  passageRepetitionReport: any[];
  duplicateItemReport: any[];
  answerPositionDistribution: any[];
}) {
  const totalLegacyPssaRows = manifest.counts.databaseAssessmentQuestions;
  const totalGovernedPssaItems = 0;
  const totalStudentReadyItems = 0;
  const missingAnchorEcCount = diagnosticItems.length;
  const sourceLicenseUnresolvedCount = sourceLicenseReport.filter((row) => String(row.licenseStatus || "").includes("review_required")).length + diagnosticItems.length;
  const approvedButNotStudentReadyCount = 0;
  const repeatedPassages = passageRepetitionReport.filter((row) => row.result === "FAIL").length;
  const duplicateGroups = duplicateItemReport.length;
  const answerBiasGroups = answerPositionDistribution.filter((row) => row.result === "FAIL").length;

  const legacyQuarantineReport = [
    {
      category: "legacy_assessment_questions",
      totalRows: totalLegacyPssaRows,
      studentReadyRows: 0,
      excludedFromRuntimeRows: totalLegacyPssaRows,
      quarantinePolicy: "fail_closed_governed_allowlist_only",
      blockerReason: "legacy_generated_not_migrated_to_governed_pssa_item",
    },
    {
      category: "generated_export_items",
      totalRows: diagnosticItems.filter((item) => item.source === "generated").length,
      studentReadyRows: 0,
      excludedFromRuntimeRows: diagnosticItems.filter((item) => item.source === "generated").length,
      quarantinePolicy: "fail_closed_governed_allowlist_only",
      blockerReason: "generated_export_reference_only",
    },
  ];

  const studentReadyReport = [
    {
      totalLegacyPssaRows,
      totalGovernedPssaItems,
      totalStudentReadyItems,
      rowsExcludedFromRuntime: totalLegacyPssaRows,
      approvedButNotStudentReadyCount,
      sourceLicenseUnresolvedCount,
      missingAnchorEcCount,
      note: "No legacy AssessmentQuestion row is student-ready by construction. Governed PSSA tables start empty until PR #3/#4 migration/review/regeneration work.",
    },
  ];

  const standardsAlignmentReport = [
    {
      totalItems: diagnosticItems.length,
      missingAssessmentAnchor: diagnosticItems.length,
      missingEligibleContent: diagnosticItems.length,
      blockedSolelyBecauseCrosswalkMissing: 0,
      alignmentStatus: "NEEDS_CROSSWALK_FOR_LEGACY_EXPORT",
      note: "Legacy export does not contain official PA Assessment Anchor / Eligible Content mappings. Do not infer these codes.",
    },
  ];

  const approvalGuardReport = [
    { guard: "source_license_cleared", blockedCount: sourceLicenseUnresolvedCount, result: "BLOCK" },
    { guard: "assessment_anchor_present", blockedCount: missingAnchorEcCount, result: "BLOCK" },
    { guard: "eligible_content_present", blockedCount: missingAnchorEcCount, result: "BLOCK" },
    { guard: "duplicate_blocker_clear", blockedCount: duplicateGroups, result: "BLOCK" },
    { guard: "passage_repetition_clear", blockedCount: repeatedPassages, result: "BLOCK" },
    { guard: "answer_position_audit_clear", blockedCount: answerBiasGroups, result: "BLOCK" },
  ];

  const runtimeSourceReport = `# PSSA Runtime Source Report

Runtime policy: fail-closed governed allowlist only.

- Legacy database AssessmentQuestion rows: ${totalLegacyPssaRows}
- Governed PSSA items: ${totalGovernedPssaItems}
- Student-ready governed PSSA items: ${totalStudentReadyItems}
- Rows excluded from PSSA student runtime by construction: ${totalLegacyPssaRows}

## Runtime Route Status

- app/api/student/session/route.ts: PA/ELA assignments now branch to getStudentReadyPssaItems() and getStudentReadyPssaPassages(). If no governed items are ready, the route returns 409 instead of hydrating raw AssessmentQuestion rows.
- app/api/test/start/route.ts: still creates sessions by assessmentId only; item delivery remains controlled by the session route.

## Remaining Raw Legacy Readers

Scoring/submission routes may still reference AssessmentQuestion for legacy/non-PSSA sessions and need PR #3/#4 follow-up before governed PSSA scoring is enabled. Current PR #2 prevents PSSA item delivery from raw rows.
`;

  return {
    legacyQuarantineReport,
    studentReadyReport,
    standardsAlignmentReport,
    approvalGuardReport,
    runtimeSourceReport,
  };
}

function loadLocalEnv(log: ExportLogEntry[]) {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    const loadedKeys: string[] = [];
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = unquoteEnvValue(rawValue);
      loadedKeys.push(key);
    }
    if (loadedKeys.length) {
      log.push({
        level: "INFO",
        message: `Loaded ${loadedKeys.length} environment key(s) from ${fileName}.`,
      });
    }
  }
}

function unquoteEnvValue(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseArgs(args: string[], now: Date): ExportOptions {
  const date = now.toISOString().slice(0, 10);
  const options: ExportOptions = {
    out: path.join("audit_exports", `pssa_audit_bundle_${date}`),
    grades: DEFAULT_GRADES,
    subject: "ELA",
    includeBackendAnswers: true,
    redactPii: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    } else if (arg === "--grade" && next) {
      const grade = Number(next);
      if (!Number.isInteger(grade) || grade < 3 || grade > 8) throw new Error("--grade must be an integer from 3 to 8.");
      options.grades = [grade];
      index += 1;
    } else if (arg === "--subject" && next) {
      options.subject = next.toUpperCase();
      index += 1;
    } else if (arg === "--include-backend-answers") {
      options.includeBackendAnswers = true;
    } else if (arg === "--redact-pii") {
      options.redactPii = true;
    } else if (arg === "--no-backend-answers") {
      options.includeBackendAnswers = false;
    } else if (arg === "--no-redact-pii") {
      options.redactPii = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.subject !== "ELA") {
    throw new Error("Only --subject ELA is currently supported for the Pennsylvania PSSA audit export.");
  }
  return options;
}

function printHelpAndExit(): never {
  console.log(`Usage:
  npm run content:export-pssa-audit
  npm run content:export-pssa-audit -- --out audit_exports/pssa_audit_bundle_TEST
  npm run content:export-pssa-audit -- --grade 4
  npm run content:export-pssa-audit -- --subject ELA
  npm run content:export-pssa-audit -- --include-backend-answers
  npm run content:export-pssa-audit -- --redact-pii`);
  process.exit(0);
}

async function loadDatabaseContent(options: ExportOptions, log: ExportLogEntry[]) {
  const empty = {
    assessmentQuestions: [] as unknown[],
    passages: [] as unknown[],
    lessons: [] as unknown[],
    standards: [] as unknown[],
    answerKeys: [] as unknown[],
  };

  if (!process.env.DATABASE_URL) {
    log.push({ level: "WARN", message: "DATABASE_URL is not set; exported generated/static PSSA content only." });
    return empty;
  }

  let db: any = null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    db = new PrismaClient({ log: ["error", "warn"] });

    const assessments = await db.assessment.findMany({
      where: {
        state: "PA",
        subject: options.subject,
        grade: { in: options.grades },
      },
      include: {
        questions: { orderBy: { questionNo: "asc" } },
        passages: { orderBy: { passageKey: "asc" } },
      },
      orderBy: [{ grade: "asc" }, { createdAt: "asc" }],
    });

    const learningLessons = await db.learningLesson.findMany({
      where: {
        gradeLevel: { in: options.grades },
        standardCode: { startsWith: "CC." },
      },
      include: {
        items: { orderBy: { order: "asc" } },
        steps: { orderBy: { order: "asc" } },
        reviews: {
          include: { editInstructions: true },
          orderBy: { createdAt: "asc" },
        },
        learningPathItem: true,
      },
      orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { createdAt: "asc" }],
    });

    const lessonCaches = await db.lessonCache.findMany({
      where: {
        gradeLevel: { in: options.grades },
        standardCode: { startsWith: "CC." },
      },
      include: {
        reviews: {
          include: { editInstructions: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }, { createdAt: "asc" }],
    });

    log.push({
      level: "INFO",
      message: `Loaded ${assessments.length} PA ${options.subject} assessment(s), ${learningLessons.length} learning lesson(s), and ${lessonCaches.length} lesson cache record(s) from the database.`,
    });

    const assessmentQuestions = assessments.flatMap((assessment: any) =>
      assessment.questions.map((question: any) => ({
        source: "database",
        module: "PSSA",
        state: assessment.state,
        subject: assessment.subject,
        grade: assessment.grade,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        questionNo: question.questionNo,
        itemId: question.id,
        standardCode: question.standardCode,
        standardLabel: question.standardLabel,
        skill: question.skill,
        questionType: question.questionType,
        difficulty: question.difficulty,
        item: redactForStudent(question.questionPayload, options.includeBackendAnswers),
        metadata: {
          assessmentCreatedAt: assessment.createdAt,
          questionCreatedAt: question.createdAt,
          isAdaptive: assessment.isAdaptive,
        },
      })),
    );

    const passages = assessments.flatMap((assessment: any) =>
      assessment.passages.map((passage: any) => ({
        source: "database",
        module: "PSSA",
        state: assessment.state,
        subject: assessment.subject,
        grade: assessment.grade,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        passageId: passage.passageKey,
        title: passage.title,
        passageType: passage.passageType,
        genre: passage.genre,
        wordCountTarget: passage.wordCountTarget,
        actualWordCount: passage.actualWordCount,
        hasTable: passage.hasTable,
        hasSections: passage.hasSections,
        tableData: passage.tableData ?? null,
        content: passage.content,
        metadata: passage.metadata,
        createdAt: passage.createdAt,
      })),
    );

    const lessons = [
      ...learningLessons.map((lesson: any) => ({
        source: "database.learningLesson",
        module: "PSSA",
        state: "PA",
        subject: "ELA",
        lessonId: lesson.id,
        grade: lesson.gradeLevel,
        standardCode: lesson.standardCode,
        standardLabel: lesson.standardLabel,
        skill: lesson.skill,
        title: lesson.title,
        priority: lesson.priority,
        reviewStatus: lesson.reviewStatus,
        generatedBy: lesson.generatedBy,
        aiStatus: lesson.aiStatus,
        approvedAt: lesson.approvedAt,
        rejectedAt: lesson.rejectedAt,
        content: {
          whyAssigned: lesson.whyAssigned,
          lessonExplanation: lesson.lessonExplanation,
          workedExample: lesson.workedExample,
          guidedPractice: lesson.guidedPractice,
          independentPractice: lesson.independentPractice,
          exitTicket: lesson.exitTicket,
          masteryCheck: lesson.masteryCheck,
          retestRecommendation: lesson.retestRecommendation,
          steps: lesson.steps,
          items: lesson.items,
        },
        reviewMetadata: {
          reviews: lesson.reviews,
          sourcePayload: lesson.sourcePayload,
          learningPathItem: lesson.learningPathItem,
        },
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      })),
      ...lessonCaches.map((cache: any) => ({
        source: "database.lessonCache",
        module: "PSSA",
        state: "PA",
        subject: "ELA",
        lessonId: cache.id,
        grade: cache.gradeLevel,
        standardCode: cache.standardCode,
        standardLabel: null,
        skill: cache.skill,
        title: cache.payload?.title ?? `${cache.standardCode} ${cache.skill}`,
        reviewStatus: cache.reviewStatus,
        generatedBy: cache.generatedBy,
        modelHint: cache.modelHint,
        approvedAt: cache.approvedAt,
        rejectedAt: cache.rejectedAt,
        hitCount: cache.hitCount,
        commonError: cache.commonError,
        content: cache.payload,
        reviewMetadata: {
          reviews: cache.reviews,
        },
        createdAt: cache.createdAt,
        lastUsedAt: cache.lastUsedAt,
      })),
    ];

    const standards = summarizeDatabaseStandards({ assessmentQuestions, lessons });
    const answerKeys = assessmentQuestions.map((item: any) => ({
      source: "database",
      module: "PSSA",
      state: item.state,
      subject: item.subject,
      grade: item.grade,
      assessmentId: item.assessmentId,
      assessmentTitle: item.assessmentTitle,
      questionNo: item.questionNo,
      itemId: item.itemId,
      questionType: item.questionType,
      standardCode: item.standardCode,
      skill: item.skill,
      answerKey: extractAnswerKey(item.item),
      scoringMetadata: extractScoringMetadata(item.item),
    }));

    return { assessmentQuestions, passages, lessons, standards, answerKeys };
  } catch (error) {
    log.push({
      level: "ERROR",
      message: "Database content export failed; generated/static PSSA content was still exported.",
      details: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
    return empty;
  } finally {
    if (db) await db.$disconnect();
  }
}

function summarizeDatabaseStandards({ assessmentQuestions, lessons }: { assessmentQuestions: any[]; lessons: any[] }) {
  const byStandard = new Map<string, any>();
  for (const item of assessmentQuestions) {
    const key = `${item.grade}:${item.standardCode}:${item.skill}`;
    const row = byStandard.get(key) ?? {
      source: "database",
      module: "PSSA",
      state: item.state,
      subject: item.subject,
      grade: item.grade,
      standardCode: item.standardCode,
      standardLabel: item.standardLabel,
      skill: item.skill,
      strand: strandFromStandard(item.standardCode),
      itemCount: 0,
      lessonCount: 0,
    };
    row.itemCount += 1;
    byStandard.set(key, row);
  }
  for (const lesson of lessons) {
    const key = `${lesson.grade}:${lesson.standardCode}:${lesson.skill}`;
    const row = byStandard.get(key) ?? {
      source: "database",
      module: "PSSA",
      state: lesson.state,
      subject: lesson.subject,
      grade: lesson.grade,
      standardCode: lesson.standardCode,
      standardLabel: lesson.standardLabel,
      skill: lesson.skill,
      strand: strandFromStandard(lesson.standardCode),
      itemCount: 0,
      lessonCount: 0,
    };
    row.lessonCount += 1;
    byStandard.set(key, row);
  }
  return [...byStandard.values()];
}

function redactForStudent(value: any, includeBackendAnswers: boolean): any {
  if (includeBackendAnswers) return value;
  if (Array.isArray(value)) return value.map((entry) => redactForStudent(entry, includeBackendAnswers));
  if (!value || typeof value !== "object") return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isAnswerKeyField(key)) {
      redacted[key] = "[OMITTED_BACKEND_ANSWER]";
    } else {
      redacted[key] = redactForStudent(child, includeBackendAnswers);
    }
  }
  return redacted;
}

function extractAnswerKey(item: any): unknown {
  if (!item || typeof item !== "object") return null;
  const answer: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (isAnswerKeyField(key)) answer[key] = value;
  }
  return Object.keys(answer).length ? answer : null;
}

function extractScoringMetadata(item: any): unknown {
  if (!item || typeof item !== "object") return null;
  const scoring: Record<string, unknown> = {};
  for (const key of ["rubric", "maxScore", "sampleAnswer", "distractorRationale", "explanation", "skillTip"]) {
    if (key in item) scoring[key] = item[key];
  }
  return Object.keys(scoring).length ? scoring : null;
}

function isAnswerKeyField(key: string) {
  return /^(correctAnswer|correctIndex|correctIndices|partACorrectIndex|partBCorrectIndices|correctSpanIndices|correctMapping|sampleAnswer)$/i.test(key);
}

function buildItemSummary(items: any[]) {
  return items.map((item) => ({
    source: item.source,
    grade: item.grade,
    assessmentId: item.assessmentId,
    assessmentTitle: item.assessmentTitle,
    questionNo: item.questionNo,
    itemId: item.itemId,
    standardCode: item.standardCode,
    skill: item.skill,
    questionType: item.questionType,
    difficulty: item.difficulty,
    passageId: item.passageId ?? "",
    hasBackendAnswer: extractAnswerKey(item.item) ? "yes" : "no",
  }));
}

function buildLessonSummary(lessons: any[]) {
  return lessons.map((lesson) => {
    const audit = lesson.source === "database.learningLesson" ? { approvable: "", blockers: [], warnings: [] } : { approvable: "", blockers: [], warnings: [] };
    return {
      source: lesson.source,
      grade: lesson.grade,
      lessonId: lesson.lessonId,
      title: lesson.title,
      standardCode: lesson.standardCode,
      skill: lesson.skill,
      reviewStatus: lesson.reviewStatus,
      generatedBy: lesson.generatedBy,
      aiStatus: lesson.aiStatus ?? "",
      approvedAt: formatDate(lesson.approvedAt),
      rejectedAt: formatDate(lesson.rejectedAt),
      practiceSections: countPracticeSections(lesson),
      reviewCount: Array.isArray(lesson.reviewMetadata?.reviews) ? lesson.reviewMetadata.reviews.length : 0,
      approvable: audit.approvable,
      blockerCount: audit.blockers.length,
    };
  });
}

function buildMetadataCompletenessReport({ diagnosticItems, lessons, passages }: { diagnosticItems: any[]; lessons: any[]; passages: any[] }) {
  const rows: Record<string, unknown>[] = [];
  const requiredItemFields = ["grade", "standardCode", "standardLabel", "skill", "questionType", "difficulty", "item"];
  for (const item of diagnosticItems) rows.push(completenessRow("diagnostic_item", item.itemId, item.source, requiredItemFields, item));
  const requiredLessonFields = ["grade", "standardCode", "skill", "title", "content", "reviewStatus"];
  for (const lesson of lessons) rows.push(completenessRow("lesson", lesson.lessonId, lesson.source, requiredLessonFields, lesson));
  const requiredPassageFields = ["grade", "title", "passageType", "genre", "content", "actualWordCount"];
  for (const passage of passages) rows.push(completenessRow("passage", passage.passageId, passage.source, requiredPassageFields, passage));
  return rows;
}

function completenessRow(entityType: string, entityId: string, source: string, fields: string[], record: Record<string, unknown>) {
  const missing = fields.filter((field) => record[field] === undefined || record[field] === null || record[field] === "");
  return {
    entityType,
    entityId,
    source,
    requiredFields: fields.length,
    presentFields: fields.length - missing.length,
    missingFields: missing.join("|"),
    completenessPercent: Math.round(((fields.length - missing.length) / fields.length) * 100),
  };
}

function buildLinterReport({ diagnosticItems, lessons }: { diagnosticItems: any[]; lessons: any[] }) {
  const rows: Record<string, unknown>[] = [];
  for (const item of diagnosticItems) {
    const answerKey = extractAnswerKey(item.item);
    rows.push({
      entityType: "diagnostic_item",
      entityId: item.itemId,
      source: item.source,
      ruleId: "PSSA_ITEM_HAS_STANDARD_AND_KEY",
      severity: answerKey && item.standardCode ? "INFO" : "WARNING",
      result: answerKey && item.standardCode ? "PASS" : "FAIL",
      evidence: answerKey && item.standardCode ? "Standard and backend answer key present." : "Missing standard or backend answer key.",
    });
  }

  for (const lesson of lessons) {
    if (lesson.source === "database.contentV3Lesson") {
      const audit = auditLessonForApproval(lesson.rawLesson);
      for (const check of runLessonLinter(lesson.rawLesson)) {
        rows.push({
          entityType: "lesson",
          entityId: lesson.lessonId,
          source: lesson.source,
          ruleId: check.ruleId,
          severity: check.severity,
          result: check.result,
          evidence: check.evidence ?? "",
        });
      }
      for (const blocker of audit.blockers) {
        rows.push({
          entityType: "lesson",
          entityId: lesson.lessonId,
          source: lesson.source,
          ruleId: blocker.split(":")[0],
          severity: "BLOCKER",
          result: "FAIL",
          evidence: blocker,
        });
      }
      continue;
    }
    rows.push({
      entityType: "lesson",
      entityId: lesson.lessonId,
      source: lesson.source,
      ruleId: "PSSA_LESSON_HAS_PRACTICE_AND_REVIEW_STATUS",
      severity: "INFO",
      result: lesson.reviewStatus && countPracticeSections(lesson) > 0 ? "PASS" : "FAIL",
      evidence: `reviewStatus=${lesson.reviewStatus ?? "missing"}; practiceSections=${countPracticeSections(lesson)}`,
    });
  }
  return rows;
}

function buildSourceLicenseReport({ diagnosticItems, lessons, passages }: { diagnosticItems: any[]; lessons: any[]; passages: any[] }) {
  const rows: Record<string, unknown>[] = [];
  const generatedSources = new Set(diagnosticItems.filter((item) => item.source === "generated").map((item) => item.assessmentId));
  for (const sourceId of generatedSources) {
    rows.push({
      sourceType: "generated_diagnostic",
      sourceId,
      licenseStatus: "internal_original",
      attribution: "Generated by lib/diagnosticGenerator.ts using internal PSSA-style blueprint logic.",
      externalSourceUrl: "",
      notes: "Sampler patterns are style references; exported passages and items are generated platform content.",
    });
  }
  for (const passage of passages.filter((entry) => entry.source === "database")) {
    rows.push({
      sourceType: "database_passage",
      sourceId: `${passage.assessmentId}:${passage.passageId}`,
      licenseStatus: "review_required",
      attribution: passage.metadata?.sourceAttributionCode ?? passage.metadata?.source ?? "",
      externalSourceUrl: passage.metadata?.sourceUrl ?? "",
      notes: "Verify source metadata before external sharing.",
    });
  }
  for (const lesson of lessons) {
    rows.push({
      sourceType: "lesson",
      sourceId: lesson.lessonId,
      licenseStatus: "internal_or_ai_assisted_review_required",
      attribution: lesson.generatedBy ?? lesson.source,
      externalSourceUrl: lesson.content?.resourceUrl ?? lesson.content?.resource?.url ?? "",
      notes: "Lesson may contain resource links or AI-assisted text; review sourcePayload/reviewMetadata.",
    });
  }
  return rows;
}

function rollUpStandards(standardsRows: any[], diagnosticItems: any[], lessons: any[]) {
  const byKey = new Map<string, any>();
  for (const row of standardsRows) {
    const key = `${row.grade}:${row.standardCode}:${row.skill}`;
    byKey.set(key, { ...row });
  }
  for (const item of diagnosticItems) {
    const key = `${item.grade}:${item.standardCode}:${item.skill}`;
    const row = byKey.get(key) ?? {
      source: "derived",
      module: "PSSA",
      state: item.state,
      subject: item.subject,
      grade: item.grade,
      standardCode: item.standardCode,
      standardLabel: item.standardLabel,
      skill: item.skill,
      strand: strandFromStandard(item.standardCode),
      itemCount: 0,
      lessonCount: 0,
    };
    row.itemCount = (row.itemCount || 0) + 1;
    byKey.set(key, row);
  }
  for (const lesson of lessons) {
    const key = `${lesson.grade}:${lesson.standardCode}:${lesson.skill}`;
    const row = byKey.get(key) ?? {
      source: "derived",
      module: "PSSA",
      state: lesson.state,
      subject: lesson.subject,
      grade: lesson.grade,
      standardCode: lesson.standardCode,
      standardLabel: lesson.standardLabel,
      skill: lesson.skill,
      strand: strandFromStandard(lesson.standardCode),
      itemCount: 0,
      lessonCount: 0,
    };
    row.lessonCount = (row.lessonCount || 0) + 1;
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => Number(a.grade) - Number(b.grade) || String(a.standardCode).localeCompare(String(b.standardCode)));
}

function buildStudentPreview({ generatedAssessments, diagnosticItems, lessons, options }: { generatedAssessments: any[]; diagnosticItems: any[]; lessons: any[]; options: ExportOptions }) {
  const lines: string[] = [];
  lines.push("# PSSA Student Preview");
  lines.push("");
  lines.push("This preview omits backend answer keys and audit-only metadata.");
  lines.push("");
  for (const assessment of generatedAssessments) {
    lines.push(`## Grade ${assessment.gradeLevel} ${assessment.title}`);
    lines.push("");
    for (const passage of assessment.passages.slice(0, 2)) {
      lines.push(`### Passage: ${passage.title}`);
      lines.push("");
      lines.push(passage.content.split(/\s+/).slice(0, 120).join(" ") + "...");
      lines.push("");
    }
    const sampleItems = diagnosticItems.filter((item) => item.grade === assessment.gradeLevel && item.source === "generated").slice(0, 6);
    for (const item of sampleItems) {
      lines.push(`### Item ${item.questionNo}: ${item.skill}`);
      lines.push("");
      const studentItem = redactForStudent(item.item, false);
      lines.push(formatStudentItem(studentItem));
      lines.push("");
    }
  }
  if (lessons.length) {
    lines.push("## Lesson Samples");
    lines.push("");
    for (const lesson of lessons.slice(0, 10)) {
      lines.push(`### Grade ${lesson.grade}: ${lesson.title}`);
      lines.push("");
      lines.push(`Standard: ${lesson.standardCode}`);
      lines.push("");
      const explanation = lesson.content?.lessonExplanation ?? lesson.content?.lesson?.lessonExplanation ?? lesson.content?.whyAssigned ?? "";
      if (explanation) lines.push(String(explanation).slice(0, 700));
      lines.push("");
    }
  }
  lines.push(`_Generated for ${options.subject}; PII redaction ${options.redactPii ? "enabled" : "disabled"}._`);
  lines.push("");
  return lines.join("\n");
}

function formatStudentItem(item: any) {
  if (!item || typeof item !== "object") return "";
  if (item.question) {
    return [`**Question:** ${item.question}`, ...(Array.isArray(item.choices) ? item.choices.map((choice: string, index: number) => `${String.fromCharCode(65 + index)}. ${choice}`) : [])].join("\n");
  }
  if (item.partAQuestion) return `**Part A:** ${item.partAQuestion}`;
  if (item.prompt) return `**Prompt:** ${item.prompt}`;
  if (item.hotTextPrompt) return `**Prompt:** ${item.hotTextPrompt}`;
  if (item.dragDropPrompt) return `**Prompt:** ${item.dragDropPrompt}`;
  return JSON.stringify(item, null, 2).slice(0, 800);
}

function buildReadme(manifest: any) {
  return `# PSSA Audit Bundle

Generated: ${manifest.generatedAt}

This bundle is a read-only export for internal audit of the Pennsylvania PSSA ELA module. It includes generated PSSA diagnostic items, passages, standards alignment rows, lesson content found in the database, backend answer keys, metadata completeness checks, linter output, and source/license notes.

No database content was modified. No items or lessons were approved, rejected, or changed.

## Contents

${manifest.files.map((file: string) => `- \`${file}\``).join("\n")}

## Counts

- Diagnostic items: ${manifest.counts.diagnosticItems}
- Lessons: ${manifest.counts.lessons}
- Passages: ${manifest.counts.passages}
- Backend answer keys: ${manifest.counts.backendAnswerKeys}

## Options

- Grades: ${manifest.grades.join(", ")}
- Subject: ${manifest.subject}
- Include backend answer keys: ${manifest.options.includeBackendAnswers}
- Redact PII: ${manifest.options.redactPii}
`;
}

function buildExportLog(log: ExportLogEntry[], startedAt: Date, finishedAt: Date, manifest: any) {
  const lines = [
    "# PSSA Export Log",
    "",
    `Started: ${startedAt.toISOString()}`,
    `Finished: ${finishedAt.toISOString()}`,
    `Read-only export: ${manifest.readOnlyExport}`,
    `No database mutations: ${manifest.noDatabaseMutations}`,
    "",
    "## Events",
    "",
  ];
  for (const entry of log) {
    lines.push(`- ${entry.level}: ${entry.message}`);
    if (entry.details) lines.push(`  - Details: \`${JSON.stringify(entry.details)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

function countPracticeSections(lesson: any) {
  const content = lesson.content ?? {};
  return ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck", "steps", "items"].filter((key) => Array.isArray(content[key]) && content[key].length > 0).length;
}

function strandFromStandard(standardCode: string) {
  if (!standardCode) return "";
  if (standardCode.startsWith("CC.1.2.")) return "Informational";
  if (standardCode.startsWith("CC.1.3.")) return "Literature";
  if (standardCode.startsWith("CC.1.4.")) return "Writing/Conventions";
  if (standardCode.startsWith("CC.1.1.")) return "Foundational Skills";
  return "";
}

function redactPii(value: any): any {
  if (Array.isArray(value)) return value.map(redactPii);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return value;
  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    redacted[key] = PII_KEY_PATTERN.test(key) ? "[REDACTED]" : redactPii(child);
  }
  return redacted;
}

function toJsonl(records: unknown[]) {
  return records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
}

function toCsv(rows: Record<string, unknown>[]) {
  const headers = [...rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>())];
  if (!headers.length) return "";
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function formatDate(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function writeBundleFile(bundleDir: string, file: ExportFile) {
  const fullPath = path.join(bundleDir, file.relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, file.content);
}

function writeZip(zipPath: string, files: ExportFile[], rootName: string) {
  const output: Buffer[] = [];
  const centralDirectory: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = `${rootName}/${file.relativePath}`;
    const nameBuffer = Buffer.from(name);
    const source = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    const compressed = zlib.deflateRawSync(source);
    const crc = crc32(source);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(source.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    output.push(localHeader, nameBuffer, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(source.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralDirectory.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + compressed.length;
  }

  const centralStart = offset;
  const centralBuffer = Buffer.concat(centralDirectory);
  output.push(centralBuffer);
  offset += centralBuffer.length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  output.push(end);

  fs.writeFileSync(zipPath, Buffer.concat(output));
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let current = index;
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[index] = current >>> 0;
  }
  return table;
})();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
