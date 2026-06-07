import { CONTENT_V3_DAILY_TARGETS } from "../../lib/content/phase3EntrySeed";
import { morphologyConfigFromTargetPatternsJson } from "../../lib/literacy/morphologyAnalyzer";
import { detectPatternCandidates, validatePseudowordCandidate } from "../../lib/literacy/pseudowordValidator";

type TargetReport = {
  target: string;
  count: number;
  validCount: number;
  invalid: string[];
  allowNoPseudowords: boolean;
};

function main() {
  const reports: TargetReport[] = [];
  for (const target of CONTENT_V3_DAILY_TARGETS) {
    const patterns = targetPatternsForTarget(target);
    const pseudowordPatterns = pseudowordPatternsForTarget(target, patterns);
    const morphology = morphologyConfigFromTargetPatternsJson(target.targetPatternsJson);
    const allowNoPseudowords = morphology?.rule === "compare" && target.exampleNonwords.length === 0 && pseudowordPatterns.length === 0;
    const invalid: string[] = [];
    for (const word of target.exampleNonwords) {
      const detected = selectPseudowordPattern(word, pseudowordPatterns);
      const result = detected ? validatePseudowordCandidate(word, detected, { strictLexicon: true }) : null;
      if (!detected || !patterns.includes(detected) || !pseudowordPatterns.includes(detected)) {
        invalid.push(`${word} -> ${detected ?? "NO_PATTERN"} (not in pseudoword pattern set ${pseudowordPatterns.join(", ")})`);
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
      allowNoPseudowords,
    });
  }

  console.log("Content v3 pseudoword readiness");
  console.log("target | count | valid | status | notes");
  console.log("--- | ---: | ---: | --- | ---");
  for (const report of reports) {
    const short = !report.allowNoPseudowords && report.count < 8;
    const status = report.invalid.length || short ? "FAIL" : "PASS";
    const notes = [
      report.allowNoPseudowords ? "compare target intentionally has no pseudowords" : "",
      short ? `needs at least 8 nonwords` : "",
      ...report.invalid,
    ].filter(Boolean).join("; ");
    console.log(`${report.target} | ${report.count} | ${report.validCount} | ${status} | ${notes || "ok"}`);
  }

  const failures = reports.filter((report) => (!report.allowNoPseudowords && report.count < 8) || report.invalid.length);
  if (failures.length) {
    console.error(`Content v3 pseudoword audit failed for: ${failures.map((report) => report.target).join(", ")}`);
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

function pseudowordPatternsForTarget(target: { code: string; targetPatternsJson: unknown }, fallback: string[]) {
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

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
