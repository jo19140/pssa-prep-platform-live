import { db } from "@/lib/db";
import { generatePassagesForTarget, type PassageGenerationPipelineResult } from "@/lib/literacy/passageGenerationPipeline";
import type { PassageModelRunner } from "@/lib/literacy/passageGenerator";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const phasePositionCode = stringArg(args["phase-position"]) || stringArg(args["all-in-phase"]);
  const dailyTargetCode = stringArg(args["all-in-phase"]) ? "all-in-phase" : stringArg(args["daily-target"]);
  const count = Number(args.count || 1);
  const mockModel = Boolean(args["mock-model"]);
  if (!phasePositionCode || !dailyTargetCode) {
    throw new Error("Usage: tsx scripts/content/generate-passages.ts --phase-position <code-or-label> --daily-target <code|all-in-phase> [--count 1] [--mock-model]\nOr: tsx scripts/content/generate-passages.ts --all-in-phase <code-or-label> [--mock-model]");
  }
  const phasePositionLabel = labelFromSlug(phasePositionCode);
  const phasePosition = await db.phasePosition.findFirst({
    where: { OR: [{ subPosition: phasePositionCode }, { label: phasePositionCode }, { label: phasePositionLabel }, { id: phasePositionCode }] },
  });
  if (!phasePosition) throw new Error(`Phase position not found: ${phasePositionCode}`);
  const targets = dailyTargetCode === "all-in-phase"
    ? await db.dailyTarget.findMany({ where: { phasePositionId: phasePosition.id }, orderBy: { introductionOrder: "asc" } })
    : await db.dailyTarget.findMany({ where: { phasePositionId: phasePosition.id, code: dailyTargetCode } });
  if (targets.length === 0) throw new Error(`No daily targets found for ${dailyTargetCode}`);

  for (const target of targets) {
    const result = await generatePassagesForTarget({
      phasePositionId: phasePosition.id,
      dailyTargetId: target.id,
      count,
      modelRunner: mockModel ? mockPassageModelRunner : undefined,
      firstLookModelRunner: mockModel ? async ({ artifact, checklist }) => ({
        modelName: "mock-first-look",
        review: {
          artifactType: artifact.artifactType,
          artifactId: artifact.artifactId,
          recommendation: "APPROVE",
          confidence: 0.9,
          checks: checklist.items.map((item) => ({ requirementId: item.requirementId, result: "PASS", severity: item.severity, evidence: "Mock first-look pass." })),
          specificIssues: [],
          kidViewLintViolations: [],
        },
      }) : undefined,
    });
    console.log(JSON.stringify({ dailyTargetCode: target.code, ...result, auditSummary: summarizeAuditResults(result) }, null, 2));
  }
}

const mockPassageModelRunner: PassageModelRunner = async ({ params }) => {
  const anchor = params.exampleWords[0] || "cake";
  const words = ["the", anchor, "and", "the", anchor, "sat"];
  const text = Array.from({ length: 8 }, (_, index) => `${words[index % words.length]} ${words[(index + 1) % words.length]} ${words[(index + 2) % words.length]}.`).join(" ");
  return { text };
};

function parseArgs(args: string[]) {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
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

function summarizeAuditResults(result: PassageGenerationPipelineResult) {
  const failureCounts: Record<string, number> = {
    wordCountWithinBand: 0,
    unclassifiedCount: 0,
    blockedPatternViolations: 0,
    decodabilityThreshold: 0,
    qualityGate: 0,
  };
  for (const attempt of result.failedAttempts) {
    const reasons = new Set(attempt.reasons);
    if (hasReason(reasons, "word count outside phase band")) failureCounts.wordCountWithinBand += 1;
    if (hasReason(reasons, "unclassified words")) failureCounts.unclassifiedCount += 1;
    if (hasReason(reasons, "blocked pattern violations")) failureCounts.blockedPatternViolations += 1;
    if (hasReason(reasons, "decodability below phase threshold")) failureCounts.decodabilityThreshold += 1;
    if (hasReason(reasons, "quality gate failed")) failureCounts.qualityGate += 1;
  }
  return {
    insertedCount: result.insertedPassageIds.length,
    failedAttemptCount: result.failedAttempts.length,
    passCounts: {
      persistedCandidates: result.insertedPassageIds.length,
    },
    failureCounts,
  };
}

function hasReason(reasons: Set<string>, prefix: string) {
  return Array.from(reasons).some((reason) => reason.startsWith(prefix));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => db.$disconnect());
