import assert from "node:assert/strict";
import fs from "node:fs";

import {
  collectSingleSelectSets,
  evaluateCorrectLongestMidP,
  type CorrectLongestMidPRow,
  type CorrectLongestSingleSelectSet,
} from "./audit/pssa-audit-detectors";

type Benchmark = "BOY" | "MOY" | "EOY";

const BENCHMARK_FILES: Record<Benchmark, string[]> = {
  BOY: [
    "exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json",
    "exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json",
    "exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json",
    "exemplars/pssa_grade3_stamina_pilot/rabbit_drama_released_length.json",
    "exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json",
  ],
  MOY: [
    "exemplars/pssa_grade3_moy_p1/backend.json",
    "exemplars/pssa_grade3_moy_p2/backend.json",
    "exemplars/pssa_grade3_moy_p3/backend.json",
    "exemplars/pssa_grade3_moy_p4/backend.json",
    "exemplars/pssa_grade3_moy_conventions/backend.json",
  ],
  EOY: [
    "exemplars/pssa_grade3_eoy_p1/backend.json",
    "exemplars/pssa_grade3_eoy_p2/backend.json",
    "exemplars/pssa_grade3_eoy_p3/backend.json",
    "exemplars/pssa_grade3_eoy_p4/backend.json",
    "exemplars/pssa_grade3_eoy_conventions/backend.json",
  ],
};

function benchmarkItems(benchmark: Benchmark) {
  return BENCHMARK_FILES[benchmark].flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")).items ?? []);
}

function readingSingleSelectSets(benchmark: Benchmark): CorrectLongestSingleSelectSet[] {
  const items = benchmarkItems(benchmark).filter((item) => {
    if (item.interactionType === "EBSR") return true;
    if (item.interactionType !== "MCQ") return false;
    return !String(item.eligibleContent ?? "").startsWith("E03.D");
  });
  return collectSingleSelectSets(items, { kinds: ["MCQ", "EBSR_PART_A"] });
}

function ebsrPartASets(): CorrectLongestSingleSelectSet[] {
  return (["BOY", "MOY", "EOY"] as Benchmark[]).flatMap((benchmark) =>
    collectSingleSelectSets(benchmarkItems(benchmark).filter((item) => item.interactionType === "EBSR"), { kinds: ["EBSR_PART_A"] })
  );
}

function assertApprox(actual: number, expected: number, tolerance: number, label: string) {
  assert.equal(Math.abs(actual - expected) <= tolerance, true, `${label}: expected ${expected}, got ${actual}`);
}

function reportLine(row: CorrectLongestMidPRow, trackedDebt: boolean) {
  return [
    row.scope,
    row.n,
    row.k,
    `${(row.strictPct * 100).toFixed(1)}%`,
    row.exactTail.toPrecision(4),
    row.midP.toPrecision(4),
    row.alpha,
    row.scopeMinN,
    row.block ? "BLOCK" : "PASS",
    trackedDebt ? "yes" : "no",
  ].join(" | ");
}

const rows = [
  evaluateCorrectLongestMidP(readingSingleSelectSets("BOY"), { scope: "BOY reading", scopeMinN: 20 }),
  evaluateCorrectLongestMidP(readingSingleSelectSets("MOY"), { scope: "MOY reading", scopeMinN: 20 }),
  evaluateCorrectLongestMidP(readingSingleSelectSets("EOY"), { scope: "EOY reading", scopeMinN: 20 }),
  evaluateCorrectLongestMidP(ebsrPartASets(), { scope: "EBSR Part A pooled", scopeMinN: 1 }),
];

const byScope = new Map(rows.map((row) => [row.scope, row]));
assert.deepEqual([byScope.get("BOY reading")?.k, byScope.get("BOY reading")?.n], [6, 24], "BOY reading strict-longest state");
assert.equal(byScope.get("BOY reading")?.block, false, "BOY reading must stay block-clean");
assertApprox(byScope.get("BOY reading")!.midP, 0.485, 0.001, "BOY reading mid-p");

assert.deepEqual([byScope.get("MOY reading")?.k, byScope.get("MOY reading")?.n], [20, 26], "MOY reading strict-longest state");
assert.equal(byScope.get("MOY reading")?.block, true, "MOY reading remains tracked debt");
assertApprox(byScope.get("MOY reading")!.midP, 2.2e-8, 0.2e-8, "MOY reading mid-p");

assert.deepEqual([byScope.get("EOY reading")?.k, byScope.get("EOY reading")?.n], [12, 30], "EOY reading strict-longest state");
assert.equal(byScope.get("EOY reading")?.block, true, "EOY reading remains tracked debt");
assertApprox(byScope.get("EOY reading")!.exactTail, 0.0507, 0.0001, "EOY exact upper tail");
assertApprox(byScope.get("EOY reading")!.midP, 0.0361, 0.0001, "EOY reading mid-p");

assert.deepEqual([byScope.get("EBSR Part A pooled")?.k, byScope.get("EBSR Part A pooled")?.n], [8, 11], "EBSR pooled strict-longest state");
assert.equal(byScope.get("EBSR Part A pooled")?.block, true, "EBSR Part A remains tracked debt");
assertApprox(byScope.get("EBSR Part A pooled")!.midP, 0.000657, 0.000001, "EBSR Part A pooled mid-p");

console.log("scope | n | strict-longest count | strict-longest rate | exact upper-tail p | upper mid-p | alpha | scopeMinN | block | tracked-debt");
for (const row of rows) console.log(reportLine(row, row.block));
console.log("PSSA correct-longest aggregate mid-p gate tests passed.");
