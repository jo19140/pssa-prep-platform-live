import { PHASE_3_ENTRY_TARGETS } from "../../lib/content/phase3EntrySeed";
import { validatePseudowordCandidate } from "../../lib/literacy/pseudowordValidator";

type TargetReport = {
  target: string;
  count: number;
  validCount: number;
  invalid: string[];
};

function main() {
  const reports: TargetReport[] = [];
  for (const target of PHASE_3_ENTRY_TARGETS) {
    const invalid: string[] = [];
    for (const word of target.exampleNonwords) {
      const result = validatePseudowordCandidate(word, target.code, { strictLexicon: true });
      if (!result.valid) {
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

  console.log("Phase 3 Entry pseudoword readiness");
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
    console.error(`Phase 3 Entry pseudoword audit failed for: ${failures.map((report) => report.target).join(", ")}`);
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
