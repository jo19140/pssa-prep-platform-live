import { db } from "@/lib/db";
import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";
import { generateLessonsForTarget } from "@/lib/literacy/lessonGenerator";
import type { FirstLookModelRunner } from "@/lib/content/aiFirstLookReviewer";
import { auditPassage } from "@/lib/literacy/passageAudit";
import type { Prisma } from "@prisma/client";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const phasePositionArg = stringArg(args["phase-position"]);
  const dailyTargetArg = stringArg(args["daily-target"]);
  const count = Number(args.count || 1);
  const mockModel = Boolean(args["mock-model"]);

  if (!phasePositionArg || !dailyTargetArg) {
    throw new Error("Usage: tsx scripts/content/generate-lessons.ts --phase-position <code-or-label> --daily-target <code> [--count 1] [--mock-model]");
  }

  const phasePosition = await db.phasePosition.findFirst({
    where: {
      OR: [
        { id: phasePositionArg },
        { subPosition: phasePositionArg },
        { label: phasePositionArg },
        { label: labelFromSlug(phasePositionArg) },
      ],
    },
  });
  if (!phasePosition) throw new Error(`Phase position not found: ${phasePositionArg}`);
  const dailyTarget = await db.dailyTarget.findFirst({
    where: { phasePositionId: phasePosition.id, code: dailyTargetArg },
  });
  if (!dailyTarget) throw new Error(`Daily target not found: ${dailyTargetArg} for ${phasePosition.label}`);
  if (mockModel) {
    await ensureMockApprovedPassage(phasePosition, dailyTarget);
  }

  const result = await generateLessonsForTarget({
    phasePositionId: phasePosition.id,
    dailyTargetId: dailyTarget.id,
    count,
    firstLookModelRunner: mockModel ? mockFirstLookRunner : undefined,
  });
  console.log(JSON.stringify({
    phasePosition: phasePosition.label,
    dailyTargetCode: dailyTarget.code,
    ...result,
    summary: {
      insertedCount: result.insertedLessonIds.length,
      failedCount: result.failed.length,
      failedReasons: result.failed.flatMap((entry) => entry.reasons),
    },
  }, null, 2));
}

const mockFirstLookRunner: FirstLookModelRunner = async ({ artifact, checklist }) => ({
  modelName: "mock-lesson-first-look",
  review: {
    artifactType: artifact.artifactType,
    artifactId: artifact.artifactId,
    recommendation: "APPROVE",
    confidence: 0.95,
    checks: checklist.items.map((item) => ({
      requirementId: item.requirementId,
      result: "PASS",
      severity: item.severity,
      evidence: "Mock first-look pass.",
    })),
    specificIssues: [],
    kidViewLintViolations: [],
  },
});

async function ensureMockApprovedPassage(
  phasePosition: { id: string; phaseNumber: number; label: string },
  dailyTarget: {
    id: string;
    code: string;
    targetPatternsJson: Prisma.JsonValue;
    allowedPatternCodes: string[];
    blockedPatternCodes: string[];
  },
) {
  const content = phase3EntryLessonContentFor(dailyTarget.code);
  const passageText = phasePosition.phaseNumber >= 4 ? content.fullAuditPassageText : content.mockPassageText;
  const passageTitle = phasePosition.phaseNumber >= 4 ? content.fullAuditPassageTitle || content.mockPassageTitle : content.mockPassageTitle;
  if (!passageText) {
    throw new Error(`Mock ${dailyTarget.code} passage requires fullAuditPassageText for Phase 4+.`);
  }
  const normalizedMockText = normalizeText(passageText);
  const existingPassages = await db.passage.findMany({
    where: {
      phasePositionId: phasePosition.id,
      reviewStatus: "APPROVED",
      retiredAt: null,
      sourceMetadataJson: { path: ["dailyTargetCode"], equals: dailyTarget.code },
    },
  });
  const existing = existingPassages.find((passage) => normalizeText(passage.text) === normalizedMockText);
  if (existing) return;
  const audit = auditPassage(passageText, {
    phasePosition,
    dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  if (!audit.passesAuditGate || !audit.quality.passesQualityGate) {
    throw new Error(`Mock ${dailyTarget.code} passage failed audit: ${JSON.stringify(audit, null, 2)}`);
  }
  await db.passage.create({
    data: {
      source: "MOCK_APPROVED_FIXTURE",
      sourceAttributionCode: "MOCK_APPROVED_FIXTURE",
      phasePositionId: phasePosition.id,
      text: passageText,
      wordCount: audit.wordCount,
      contentAuditJson: audit,
      decodabilityScore: audit.decodabilityScore,
      reviewStatus: "APPROVED",
      reviewedAt: new Date(),
      sourceMetadataJson: {
        dailyTargetId: dailyTarget.id,
        dailyTargetCode: dailyTarget.code,
        mockPassageTitle: passageTitle,
        normalizedText: normalizedMockText,
        mockFixture: true,
      },
    },
  });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function stringArg(value: string | boolean | undefined) {
  return typeof value === "string" ? value : "";
}

function labelFromSlug(value: string) {
  return value.replace(/phase\s*(\d+)/i, "Phase $1").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => db.$disconnect());
