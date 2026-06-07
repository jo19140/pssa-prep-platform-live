import assert from "assert/strict";
import { PHASE_3_ENTRY_TARGETS } from "../lib/content/phase3EntrySeed";
import { canonicalPseudowordsForTarget } from "../lib/literacy/lessonGenerator";
import {
  __setPseudowordLexiconPathsForTest,
  validatePseudowordCandidate,
} from "../lib/literacy/pseudowordValidator";

const shippedAeNonwords = ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"];

function assertInvalid(word: string, targetPattern: string, collidesWith: string) {
  const result = validatePseudowordCandidate(word, targetPattern, { strictLexicon: true });
  assert.equal(result.valid, false, `${word} should be invalid`);
  assert.equal(result.collidesWith, collidesWith, `${word} should collide with ${collidesWith}`);
}

async function main() {
  for (const target of PHASE_3_ENTRY_TARGETS) {
    if (!targetRequiresNoPseudowords(target.targetPatternsJson)) {
      assert(
        target.exampleNonwords.length >= 8,
        `${target.code} must have at least 8 exampleNonwords; found ${target.exampleNonwords.length}`,
      );
    }
    for (const word of target.exampleNonwords) {
      const result = validatePseudowordCandidate(word, target.code, { strictLexicon: true });
      assert.equal(result.valid, true, `${target.code}/${word} failed: ${result.reason ?? result.issues.join("; ")}`);
    }
  }

  assertInvalid("nile", "i_e", "nile");
  assertInvalid("fule", "u_e", "fuel");
  assertInvalid("nute", "u_e", "newt");
  assertInvalid("nede", "e_e", "need");
  assertInvalid("bete", "e_e", "beet");

  for (const word of shippedAeNonwords) {
    const result = validatePseudowordCandidate(word, "a_e", { strictLexicon: true });
    assert.equal(result.valid, true, `${word} must remain valid for the shipped a_e fixture`);
  }
  for (const word of ["mave", "nace", "vade", "tave"]) {
    const result = validatePseudowordCandidate(word, "a_e", { strictLexicon: true });
    assert.equal(result.valid, true, `${word} must not be invalidated by CMUdict/SUBTLEX direct membership`);
    assert.equal(result.collidesWith, null);
  }
  assertInvalid("nile", "i_e", "nile");

  assert.deepEqual(canonicalPseudowordsForTarget("a_e", shippedAeNonwords), shippedAeNonwords);
  assert.throws(
    () => canonicalPseudowordsForTarget("a_e", ["zake", "mave", "pame"]),
    /Re-seed Phase 3 Entry content/,
  );

  __setPseudowordLexiconPathsForTest({ cmudictPath: "/missing/cmudict.json", subtlexPath: "/missing/subtlex.csv" });
  assert.throws(
    () => validatePseudowordCandidate("zake", "a_e", { strictLexicon: true }),
    /HOMOPHONE_LEXICON_UNAVAILABLE/,
  );
  const nonStrict = validatePseudowordCandidate("zake", "a_e", { strictLexicon: false });
  assert.equal(nonStrict.valid, true);
  assert(nonStrict.issues.includes("HOMOPHONE_LEXICON_UNAVAILABLE"));
  __setPseudowordLexiconPathsForTest(null);

  console.log("content-v3 Phase 3 seed nonword checks passed");
}

function targetRequiresNoPseudowords(targetPatternsJson: unknown) {
  if (!targetPatternsJson || typeof targetPatternsJson !== "object" || Array.isArray(targetPatternsJson)) return false;
  const morphologyJson = (targetPatternsJson as { morphologyJson?: unknown }).morphologyJson;
  return Boolean(
    morphologyJson &&
    typeof morphologyJson === "object" &&
    !Array.isArray(morphologyJson) &&
    (morphologyJson as { rule?: unknown }).rule === "compare"
  );
}

main().catch((error) => {
  __setPseudowordLexiconPathsForTest(null);
  console.error(error);
  process.exit(1);
});
