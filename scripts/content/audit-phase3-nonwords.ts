import { PHASE_3_TARGETS } from "../../lib/content/phase3EntrySeed";
import { detectVcePattern, validatePseudowordCandidate } from "../../lib/literacy/pseudowordValidator";

type TargetReport = {
  target: string;
  count: number;
  validCount: number;
  invalid: string[];
};

function main() {
  const reports: TargetReport[] = [];
  for (const target of PHASE_3_TARGETS) {
    const patterns = targetPatternsForTarget(target);
    const invalid: string[] = [];
    for (const word of target.exampleNonwords) {
      const detected = detectVcePattern(word);
      const result = detected ? validatePseudowordCandidate(word, detected, { strictLexicon: true }) : null;
      if (!detected || !patterns.includes(detected)) {
        invalid.push(`${word} -> ${detected ?? "NO_VCE_PATTERN"} (not in target pattern set ${patterns.join(", ")})`);
        continue;
      }
      if (!result?.valid) {
        invalid.push(`${word} -> ${result.collidesWith ?? "INVALID"} (${result.reason ?? result.issues.join("; ")})`);
      }
    }
    reports.push({
      target: target.code,
      count: target.exampleNonwords.length,
      validCount: target.exampleNonwords.length - invalid.length,
      invalid,
    });
  }

  console.log("Phase 3 pseudoword readiness");
  console.log("target | count | valid | status | notes");
  console.log("--- | ---: | ---: | --- | ---");
  for (const report of reports) {
    const short = report.count < 8;
    const status = report.invalid.length || short ? "FAIL" : "PASS";
    const notes = [
      short ? `needs at least 8 nonwords` : "",
      ...report.invalid,
    ].filter(Boolean).join("; ");
    console.log(`${report.target} | ${report.count} | ${report.validCount} | ${status} | ${notes || "ok"}`);
  }

  const failures = reports.filter((report) => report.count < 8 || report.invalid.length);
  if (failures.length) {
    console.error(`Phase 3 pseudoword audit failed for: ${failures.map((report) => report.target).join(", ")}`);
    process.exit(1);
  }
}

function targetPatternsForTarget(target: { code: string; targetPatternsJson: unknown }) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) {
      return patterns as string[];
    }
  }
  return [target.code];
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
