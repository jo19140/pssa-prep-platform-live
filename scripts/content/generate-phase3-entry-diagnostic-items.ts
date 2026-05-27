import { PrismaClient } from "@prisma/client";
import { runAIFirstLookReview } from "../../lib/content/aiFirstLookReviewer";
import { buildPhase3EntryDiagnosticItems } from "../../lib/content/phase3DiagnosticItems";
import { PHASE_3_ENTRY } from "../../lib/content/phase3EntrySeed";
import { seedPhase3Entry } from "./seed-phase3-entry";

const db = new PrismaClient();

export async function generatePhase3EntryDiagnosticItems({ runFirstLook = true } = {}) {
  await seedPhase3Entry();
  const phasePosition = await db.phasePosition.findUniqueOrThrow({
    where: { phaseNumber_subPosition: { phaseNumber: PHASE_3_ENTRY.phaseNumber, subPosition: PHASE_3_ENTRY.subPosition } },
    include: { dailyTargets: true },
  });
  const targetByCode = new Map(phasePosition.dailyTargets.map((target) => [target.code, target]));
  const seeds = buildPhase3EntryDiagnosticItems();

  await db.diagnosticItem.deleteMany({
    where: {
      phasePositionId: phasePosition.id,
      reviewStatus: "PENDING",
      reviewedAt: null,
    },
  });

  const created = [];
  for (const seed of seeds) {
    const dailyTarget = seed.dailyTargetCode ? targetByCode.get(seed.dailyTargetCode) : null;
    if (seed.dailyTargetCode && !dailyTarget) {
      throw new Error(`Missing DailyTarget ${seed.dailyTargetCode}; seed Phase 3 Entry before generating diagnostics.`);
    }

    const item = await db.diagnosticItem.create({
      data: {
        strand: seed.strand,
        phasePositionId: phasePosition.id,
        dailyTargetId: dailyTarget?.id,
        itemType: seed.itemType,
        studentPromptJson: seed.studentPromptJson,
        stimulusJson: seed.stimulusJson,
        expectedResponseJson: seed.expectedResponseJson,
        scoringRubricJson: seed.scoringRubricJson,
        adminReviewJson: seed.adminReviewJson,
        difficultyBand: seed.difficultyBand,
        isPracticeItem: seed.isPracticeItem ?? false,
        reviewStatus: "PENDING",
      },
    });

    if (runFirstLook) {
      await runAIFirstLookReview({
        artifactType: "DIAGNOSTIC_ITEM",
        artifactId: item.id,
        metadata: {
          strand: item.strand,
          itemType: item.itemType,
          difficultyBand: item.difficultyBand,
          phasePositionId: item.phasePositionId,
          dailyTargetCode: seed.dailyTargetCode ?? null,
        },
        contentForReview: {
          strand: item.strand,
          itemType: item.itemType,
          studentPromptJson: item.studentPromptJson,
          stimulusJson: item.stimulusJson,
          expectedResponseJson: item.expectedResponseJson,
          scoringRubricJson: item.scoringRubricJson,
          adminReviewJson: item.adminReviewJson,
        },
      });
    }

    created.push(item);
  }

  return {
    phasePosition: phasePosition.label,
    createdCount: created.length,
    strands: Array.from(new Set(created.map((item) => item.strand))).sort(),
  };
}

async function main() {
  const skipFirstLook = process.argv.includes("--skip-first-look");
  const result = await generatePhase3EntryDiagnosticItems({ runFirstLook: !skipFirstLook });
  console.log(`Generated ${result.createdCount} pending diagnostic items for ${result.phasePosition}.`);
  console.log(`Strands covered: ${result.strands.join(", ")}`);
  if (skipFirstLook) console.log("Skipped AI first-look review by request.");
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to generate Phase 3 Entry diagnostic items:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
