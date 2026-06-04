import { PrismaClient } from "@prisma/client";
import { PHASE_4_MID, PHASE_4_MID_TARGETS } from "../../lib/content/phase3EntrySeed";
import { detectPatternCandidates, validatePseudowordCandidate } from "../../lib/literacy/pseudowordValidator";

const db = new PrismaClient();

export async function seedPhase4Mid() {
  const phasePosition = await db.phasePosition.upsert({
    where: {
      phaseNumber_subPosition: {
        phaseNumber: PHASE_4_MID.phaseNumber,
        subPosition: PHASE_4_MID.subPosition,
      },
    },
    create: PHASE_4_MID,
    update: PHASE_4_MID,
  });

  for (const target of PHASE_4_MID_TARGETS) {
    const patterns = patternsForTarget(target);
    const pseudowordPatterns = pseudowordPatternsForTarget(target, patterns);
    if (!pseudowordPatterns.every((pattern) => patterns.includes(pattern))) {
      throw new Error(`DailyTarget ${target.code} pseudowordPatterns must be a subset of patterns.`);
    }
    if (target.exampleNonwords.length < 8) {
      throw new Error(`DailyTarget ${target.code} needs at least 8 exampleNonwords.`);
    }
    for (const word of target.exampleNonwords) {
      const detected = selectPseudowordPattern(word, pseudowordPatterns);
      if (!detected) {
        throw new Error(`DailyTarget ${target.code} nonword ${word} did not detect to ${pseudowordPatterns.join(", ")}`);
      }
      const validation = validatePseudowordCandidate(word, detected, { strictLexicon: true });
      if (!validation.valid) {
        throw new Error(`DailyTarget ${target.code} nonword ${word} failed validation: ${validation.reason ?? validation.issues.join("; ")}`);
      }
    }

    await db.dailyTarget.upsert({
      where: { code: target.code },
      create: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewNotes: "Seeded from content-v3 Phase 4 Mid same-sound spelling consolidation spec.",
      },
      update: {
        ...target,
        phasePositionId: phasePosition.id,
        reviewStatus: "APPROVED",
        reviewNotes: "Seeded from content-v3 Phase 4 Mid same-sound spelling consolidation spec.",
      },
    });
  }

  return {
    phasePosition,
    dailyTargets: PHASE_4_MID_TARGETS.map((target) => target.code),
  };
}

function patternsForTarget(target: { targetPatternsJson: unknown }) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [];
}

function pseudowordPatternsForTarget(target: { targetPatternsJson: unknown }, fallback: string[]) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { pseudowordPatterns?: unknown }).pseudowordPatterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return fallback;
}

function selectPseudowordPattern(word: string, orderedPatterns: string[]) {
  const candidates = detectPatternCandidates(word);
  return orderedPatterns.find((pattern) => candidates.includes(pattern)) ?? null;
}

async function main() {
  const result = await seedPhase4Mid();
  console.log(`Seeded ${result.phasePosition.label}: ${result.dailyTargets.join(", ")}`);
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (error) => {
      console.error("Failed to seed Phase 4 Mid content:", error);
      await db.$disconnect();
      process.exit(1);
    });
}
