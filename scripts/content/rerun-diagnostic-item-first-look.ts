import { PrismaClient } from "@prisma/client";
import { runAIFirstLookReview } from "../../lib/content/aiFirstLookReviewer";
import { DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE } from "../../lib/content/diagnosticItemReview";

const db = new PrismaClient();

export async function rerunDiagnosticItemFirstLook() {
  const includeReviewed = process.argv.includes("--include-reviewed") || process.argv.includes("--all");
  const items = await db.diagnosticItem.findMany({
    where: { retiredAt: null },
    include: {
      dailyTarget: true,
      firstLookReviewModelDecision: {
        include: {
          outcomes: { where: { outcomeType: DIAGNOSTIC_ITEM_REVIEW_OUTCOME_TYPE } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let rerun = 0;
  let skippedWithHumanOutcome = 0;

  for (const item of items) {
    if (!includeReviewed && item.firstLookReviewModelDecision?.outcomes.length) {
      skippedWithHumanOutcome += 1;
      continue;
    }

    await runAIFirstLookReview({
      artifactType: "DIAGNOSTIC_ITEM",
      artifactId: item.id,
      metadata: {
        strand: item.strand,
        itemType: item.itemType,
        difficultyBand: item.difficultyBand,
        phasePositionId: item.phasePositionId,
        dailyTargetCode: item.dailyTarget?.code ?? null,
        phaseBand: item.phaseBand,
        morphologyWave: item.morphologyWave,
        targetMorpheme: item.targetMorpheme,
        skill: item.skill,
      },
      contentForReview: {
        strand: item.strand,
        itemType: item.itemType,
        studentPromptJson: item.studentPromptJson,
        stimulusJson: item.stimulusJson,
        expectedResponseJson: item.expectedResponseJson,
        scoringRubricJson: item.scoringRubricJson,
        adminReviewJson: item.adminReviewJson,
        phaseBand: item.phaseBand,
        morphologyWave: item.morphologyWave,
        targetMorpheme: item.targetMorpheme,
        skill: item.skill,
      },
    });
    rerun += 1;
  }

  return { total: items.length, rerun, skippedWithHumanOutcome };
}

async function main() {
  const result = await rerunDiagnosticItemFirstLook();
  console.log(`Re-ran diagnostic first-look review for ${result.rerun}/${result.total} items.`);
  if (result.skippedWithHumanOutcome) {
    console.log(`Skipped ${result.skippedWithHumanOutcome} items that already had human review outcomes.`);
  }
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to rerun diagnostic first-look reviews:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
