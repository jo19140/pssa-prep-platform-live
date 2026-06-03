import { PrismaClient } from "@prisma/client";
import { PHASE_3_MID, PHASE_3_MID_TARGETS } from "../../lib/content/phase3EntrySeed";
import { detectVcePattern, validatePseudowordCandidate } from "../../lib/literacy/pseudowordValidator";

const db = new PrismaClient();

export async function seedPhase3Mid() {
  const phasePosition = await db.phasePosition.upsert({
    where: {
      phaseNumber_subPosition: {
        phaseNumber: PHASE_3_MID.phaseNumber,
        subPosition: PHASE_3_MID.subPosition,
      },
    },
    create: PHASE_3_MID,
    update: PHASE_3_MID,
  });

  for (const target of PHASE_3_MID_TARGETS) {
    const patterns = patternsForTarget(target);
    if (patterns.length < 2) {
      throw new Error(`Phase 3 Mid DailyTarget ${target.code} must declare at least two target patterns.`);
    }
    for (const word of target.exampleNonwords) {
      const detected = detectVcePattern(word);
      if (!detected || !patterns.includes(detected)) {
        throw new Error(`DailyTarget ${target.code} nonword ${word} detects to ${detected ?? "none"}, not one of ${patterns.join(", ")}`);
      }
      const validation = validatePseudowordCandidate(word, detected, { strictLexicon: true });
      if (!validation.valid) {
        throw new Error(`DailyTarget ${target.code} nonword ${word} failed validation: ${validation.reason ?? validation.issues.join("; ")}`);
      }
    }
    if (target.exampleNonwords.length < 8) {
      throw new Error(`DailyTarget ${target.code} needs at least 8 exampleNonwords.`);
    }

    await db.dailyTarget.upsert({
      where: { code: target.code },
      create: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewNotes: "Seeded from content-v3 Phase 3 Mid mixed silent-e consolidation spec.",
      },
      update: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewNotes: "Seeded from content-v3 Phase 3 Mid mixed silent-e consolidation spec.",
      },
    });
  }

  return {
    phasePosition,
    dailyTargets: PHASE_3_MID_TARGETS.map((target) => target.code),
  };
}

function patternsForTarget(target: { targetPatternsJson: unknown }) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) {
      return patterns as string[];
    }
  }
  return [];
}

async function main() {
  const result = await seedPhase3Mid();
  console.log(`Seeded ${result.phasePosition.label}: ${result.dailyTargets.join(", ")}`);
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to seed Phase 3 Mid content:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
