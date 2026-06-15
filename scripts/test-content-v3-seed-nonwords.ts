import assert from "assert/strict";
import { PHASE_3_ENTRY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { canonicalPseudowordsForTarget, canonicalPseudowordsForTargetPatterns } from "../lib/literacy/lessonGenerator";
import { generatePart3Decoding } from "../lib/literacy/lessonParts/part3Decoding";
import type { GeneratedLessonPart, LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import {
  __resetPseudowordLexiconCachesForTests,
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

  const strictCollisionWithGracefulMissingMode = validatePseudowordCandidate("blaim", "team_ai", {
    strictLexicon: true,
    failClosedOnMissingLexicon: false,
  });
  assert.equal(strictCollisionWithGracefulMissingMode.valid, false, "failClosedOnMissingLexicon=false must not weaken strict collision checks when lexicons are present");
  assert.equal(strictCollisionWithGracefulMissingMode.collidesWith, "blame");

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
  const renderModeStrict = validatePseudowordCandidate("zake", "a_e", {
    strictLexicon: true,
    failClosedOnMissingLexicon: false,
  });
  assert.equal(renderModeStrict.valid, true);
  assert.equal(renderModeStrict.reason, null);
  assert.equal(renderModeStrict.collidesWith, null);
  assert(renderModeStrict.issues.includes("HOMOPHONE_LEXICON_UNAVAILABLE"));
  assert.equal("blockingIssues" in renderModeStrict, false, "PseudowordValidationResult must not expose internal blockingIssues");

  const renderPseudowords = canonicalPseudowordsForTargetPatterns("a_e", shippedAeNonwords, ["a_e"], "content-v3 lesson seed", ["a_e"]);
  assert.deepEqual(renderPseudowords, shippedAeNonwords);
  const part3 = generatePart3Decoding(aeLessonContext(renderPseudowords));
  const pseudowordLine = (part3.contentJson.contrastiveLines as Array<{ role?: string; words?: string[] }>).find((line) => line.role === "target_pseudowords");
  assert.deepEqual(pseudowordLine?.words, shippedAeNonwords);
  const validations = part3.contentJson.pseudowordValidation as Array<{ issues?: string[] }>;
  assert(validations.every((entry) => entry.issues?.includes("HOMOPHONE_LEXICON_UNAVAILABLE")), "rendered Part 3 should retain missing-lexicon diagnostics");
  assert.throws(
    () => auditGeneratedLessonDraft(aeAuditDraft(part3)),
    /HOMOPHONE_LEXICON_UNAVAILABLE/,
    "lesson audit must stay fail-closed when lexicons are unavailable",
  );
  __setPseudowordLexiconPathsForTest(null);
  __resetPseudowordLexiconCachesForTests();

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

function aeLessonContext(pseudowords: string[]): LessonGeneratorContext {
  const dailyTarget = PHASE_3_ENTRY_TARGETS.find((target) => target.code === "a_e");
  assert(dailyTarget, "a_e seed target must exist");
  return {
    phasePosition: { id: "phase-3-entry", phaseNumber: 3, label: "Phase 3 Entry" },
    dailyTarget: {
      id: "target-a-e",
      code: "a_e",
      kidVisibleLabel: dailyTarget.kidVisibleLabel,
      tutorLabel: dailyTarget.tutorLabel,
      targetPatternsJson: dailyTarget.targetPatternsJson as LessonGeneratorContext["dailyTarget"]["targetPatternsJson"],
      allowedPatternCodes: dailyTarget.allowedPatternCodes,
      blockedPatternCodes: dailyTarget.blockedPatternCodes,
      exampleWords: dailyTarget.exampleWords,
      exampleNonwords: dailyTarget.exampleNonwords,
    },
    targetPattern: "a_e",
    targetPatterns: ["a_e"],
    pseudowordPatterns: ["a_e"],
    targetWords: dailyTarget.exampleWords.slice(0, 5),
    reviewWords: [],
    pseudowords,
    heartWordsPreviewedThisLesson: [],
    heartWordsAssumedKnown: [],
    vocabularyWords: [],
  };
}

function aeAuditDraft(part3: GeneratedLessonPart) {
  const parts = Array.from({ length: 8 }, (_, index) => dummyPart(index + 1));
  parts[2] = part3;
  return {
    phasePositionId: "phase-3-entry",
    dailyTargetId: "target-a-e",
    phaseBand: 3,
    dailyTargetCode: "a_e",
    targetPattern: "a_e",
    targetPatterns: ["a_e"],
    pseudowordPatterns: ["a_e"],
    parts,
  };
}

function dummyPart(partNumber: number): GeneratedLessonPart {
  return {
    partNumber,
    partLabel: `Part ${partNumber}`,
    partType: `PART_${partNumber}`,
    kidVisibleCopy: {},
    tutorVisibleCopy: {},
    contentJson: {},
    wordTagsJson: { words: [] },
  };
}

main().catch((error) => {
  __setPseudowordLexiconPathsForTest(null);
  console.error(error);
  process.exit(1);
});
