import { PrismaClient } from "@prisma/client";
import { NDL_LICENSE_ATTRIBUTION, PHASE_3_ENTRY, PHASE_3_ENTRY_TARGETS } from "../../lib/content/phase3EntrySeed";

const db = new PrismaClient();

export async function seedPhase3Entry() {
  const phasePosition = await db.phasePosition.upsert({
    where: {
      phaseNumber_subPosition: {
        phaseNumber: PHASE_3_ENTRY.phaseNumber,
        subPosition: PHASE_3_ENTRY.subPosition,
      },
    },
    create: PHASE_3_ENTRY,
    update: PHASE_3_ENTRY,
  });

  for (const target of PHASE_3_ENTRY_TARGETS) {
    if (target.targetPatternsJson && typeof target.targetPatternsJson === "object" && "patterns" in target.targetPatternsJson) {
      const patterns = (target.targetPatternsJson as { patterns?: unknown }).patterns;
      if (!Array.isArray(patterns) || patterns.length !== 1 || patterns[0] !== target.code) {
        throw new Error(`DailyTarget ${target.code} must declare exactly one matching target pattern.`);
      }
    }

    if (target.blockedPatternCodes.includes(target.code)) {
      throw new Error(`DailyTarget ${target.code} cannot block itself.`);
    }

    await db.dailyTarget.upsert({
      where: { code: target.code },
      create: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewNotes: "Seeded from content-v3 Phase 3 Entry spec for the first diagnostic MVP slice.",
      },
      update: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewNotes: "Seeded from content-v3 Phase 3 Entry spec for the first diagnostic MVP slice.",
      },
    });
  }

  await db.licenseAttribution.upsert({
    where: { sourceCode: NDL_LICENSE_ATTRIBUTION.sourceCode },
    create: NDL_LICENSE_ATTRIBUTION,
    update: NDL_LICENSE_ATTRIBUTION,
  });

  return {
    phasePosition,
    dailyTargets: PHASE_3_ENTRY_TARGETS.map((target) => target.code),
  };
}

async function main() {
  const result = await seedPhase3Entry();
  console.log(`Seeded ${result.phasePosition.label}: ${result.dailyTargets.join(", ")}`);
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to seed Phase 3 Entry content:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
