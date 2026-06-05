// LESSON_PHASE4_DIPH_CLASSIFIER_AMBIGUITY_REGRESSION
// Regression test for the patternCodesFromDailyTarget bug: the legacy collector regex-mangled
// multi-underscore registry codes (team_oo_long, r_ar, diph_ou) down to bare graphemes, so the
// passage classifier's target path never saw real registry codes. oo words could not classify at
// all (no substring fallback, no closed-short absorption), and diph_ou_ow would have classified
// "snow" as a target via the phoneme-blind "ow" substring path.
import assert from "assert/strict";
import { auditPassage, patternCodesFromDailyTarget } from "../lib/literacy/passageAudit";

const PHASE4: any = { id: "phase-4-diph-regression", phaseNumber: 4, label: "Phase 4 Diphthong Entry" };
const ALLOWED = ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e", "o_e", "u_e", "e_e"];
const ALL_NON_TARGETS = [
  "team_ai", "team_ay", "team_ee", "team_ea", "team_oa", "team_ow", "team_igh", "team_ew", "team_ue",
  "team_ie_long_i", "team_ie_long_e", "team_oo_long", "team_oo_short", "team_au", "team_aw",
  "diph_oi", "diph_oy", "diph_ou", "diph_ow",
  "r_ar", "r_or", "r_er", "r_ir", "r_ur",
];
const HEARTS = ["said", "was", "they", "I", "a", "the", "to"];

function dailyTarget(code: string, patterns: string[], graphemes: string[], sound: string): any {
  return {
    code,
    targetPatternsJson: { patterns, pseudowordPatterns: patterns, graphemes, sound },
    allowedPatternCodes: ALLOWED,
    blockedPatternCodes: ALL_NON_TARGETS.filter((pattern) => !patterns.includes(pattern)),
  };
}

function audit(text: string, target: any) {
  return auditPassage(text, { phasePosition: PHASE4, dailyTarget: target, heartWords: HEARTS, vocabularyAllowlist: [] });
}

function main() {
  const ooBoth = dailyTarget("oo_both", ["team_oo_long", "team_oo_short"], ["oo"], "oo_both");
  const ouOw = dailyTarget("diph_ou_ow", ["diph_ou", "diph_ow"], ["ou", "ow"], "ou_ow");

  // 1. Declared registry codes survive verbatim — no grapheme mangling.
  assert.deepEqual(patternCodesFromDailyTarget(ooBoth).sort(), ["team_oo_long", "team_oo_short"]);
  assert.deepEqual(patternCodesFromDailyTarget(ouOw).sort(), ["diph_ou", "diph_ow"].sort());
  assert.deepEqual(
    patternCodesFromDailyTarget(dailyTarget("r_controlled_ar", ["r_ar"], ["ar"], "r_controlled_ar")),
    ["r_ar"],
  );
  assert.deepEqual(
    patternCodesFromDailyTarget(dailyTarget("team_ai_ay", ["team_ai", "team_ay"], ["ai", "ay"], "long_a")).sort(),
    ["team_ai", "team_ay"],
  );
  // Legacy fallback unchanged for targets without a usable patterns array.
  assert.deepEqual(patternCodesFromDailyTarget({ code: "a_e", targetPatternsJson: null } as any), ["a_e"]);

  // 2. oo_both classifies BOTH sounds honestly, per pattern.
  const oo = audit("moon food root book look cook", ooBoth);
  for (const [word, expected] of [
    ["moon", "team_oo_long"], ["food", "team_oo_long"], ["root", "team_oo_long"],
    ["book", "team_oo_short"], ["look", "team_oo_short"], ["cook", "team_oo_short"],
  ] as const) {
    const entry = oo.words.find((item) => item.word === word);
    assert.equal(entry?.category, "target", `${word} must classify as target`);
    assert.equal(entry?.matchedPattern, expected, `${word} must match ${expected}`);
  }

  // 3. ou/ow ambiguity honesty at the passage level: snow blocked, cow/town admitted.
  const ow = audit("the cow ran to town past the snow", ouOw);
  const snowEntry = ow.words.find((item) => item.word === "snow");
  assert.notEqual(snowEntry?.category, "target", "snow must NOT classify as a diph_ou_ow target");
  assert(
    ow.blockedPatternViolations.some((violation) => violation.word === "snow" && violation.patternCode === "team_ow"),
    "snow must surface as a blocked team_ow violation",
  );
  for (const word of ["cow", "town"]) {
    const entry = ow.words.find((item) => item.word === word);
    assert.equal(entry?.category, "target", `${word} must classify as target`);
    assert.equal(entry?.matchedPattern, "diph_ow", `${word} must match diph_ow`);
  }

  // 4. Decodability recovery: an all-decodable oo_both fixture reaches 1.000 with zero unclassified.
  const fixture = audit(
    "Brook took the book to the pool. The moon was up soon. A duck swam a loop. Brook stood on the wood and had a good look. It was cool at the zoo.",
    ooBoth,
  );
  assert.equal(fixture.unclassifiedCount, 0, `unclassified: ${fixture.unclassifiedWords.join(", ")}`);
  assert.equal(fixture.decodabilityScore, 1, `decodability ${fixture.decodabilityScore}`);
  assert.equal(fixture.blockedPatternViolations.length, 0);

  console.log("content-v3 diphthong classifier ambiguity regression checks passed");
}

main();
