import { db } from "@/lib/db";
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

const MOCK_A_E_PASSAGE = `Dave has a cake. The cake is a gift to Jane. Jane came to the lake. Dave gave Jane the cake at the gate. "I made this cake," said Dave. Jane ate the cake. "This cake is the same as that cake," said Jane. They gave a big wave. Dave and Jane had fun. The lake was the best.`;

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
  if (dailyTarget.code !== "a_e") return;
  const existing = await db.passage.findFirst({
    where: {
      phasePositionId: phasePosition.id,
      reviewStatus: "APPROVED",
      retiredAt: null,
      sourceMetadataJson: { path: ["dailyTargetCode"], equals: dailyTarget.code },
    },
  });
  if (existing) return;
  const audit = auditPassage(MOCK_A_E_PASSAGE, {
    phasePosition,
    dailyTarget,
    heartWords: ["said", "was", "they", "I", "a", "the", "to"],
    vocabularyAllowlist: ["gift", "pal"],
  });
  if (!audit.passesAuditGate) {
    throw new Error(`Mock a_e passage failed audit: ${JSON.stringify(audit, null, 2)}`);
  }
  await db.passage.create({
    data: {
      source: "MOCK_APPROVED_FIXTURE",
      sourceAttributionCode: "MOCK_APPROVED_FIXTURE",
      phasePositionId: phasePosition.id,
      text: MOCK_A_E_PASSAGE,
      wordCount: audit.wordCount,
      contentAuditJson: audit,
      decodabilityScore: audit.decodabilityScore,
      reviewStatus: "APPROVED",
      reviewedAt: new Date(),
      sourceMetadataJson: {
        dailyTargetId: dailyTarget.id,
        dailyTargetCode: dailyTarget.code,
        mockFixture: true,
      },
    },
  });
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
