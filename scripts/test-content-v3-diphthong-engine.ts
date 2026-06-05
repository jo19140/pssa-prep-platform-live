import assert from "assert/strict";
import fs from "node:fs";
import { CONTENT_V3_DAILY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { type GeneratedLessonPart } from "../lib/literacy/lessonParts/types";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { PATTERN_REGISTRY } from "../lib/literacy/patternRegistry";
import { validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import { wordMatchesPattern } from "../lib/literacy/passageClassifier";

type Pair = { closed: string; target: string };

const validPseudowordFixtures = [
  ["zoit", "diph_oi"],
  ["voib", "diph_oi"],
  ["zoy", "diph_oy"],
  ["voy", "diph_oy"],
  ["zoud", "diph_ou"],
  ["vout", "diph_ou"],
  ["zown", "diph_ow"],
  ["zoon", "team_oo_long"],
  ["vook", "team_oo_short"],
  ["zaul", "team_au"],
  ["zaw", "team_aw"],
  ["snaw", "team_aw"],
] as const;

function main() {
  const rejectionRows = assertPseudowordProtection();
  const fixtureRows = assertValidPseudowordFixtures();
  assertExistingShippedNonwordsStillValid();
  assertAmbiguityHonesty();
  const pairRows = assertPart2PairMatrix();
  const admissionRows = assertTargetScopedAdmission();
  assertNoBareCodes();
  assertOracleIntegrity();

  console.log("content-v3 diphthong/ambiguous-vowel engine checks passed");
  console.log("word | pattern | pronunciation | result");
  console.log("--- | --- | --- | ---");
  for (const row of fixtureRows) console.log(`${row.word} | ${row.pattern} | ${row.pronunciation} | ${row.result}`);
  console.log("rejected | pattern | collision");
  console.log("--- | --- | ---");
  for (const row of rejectionRows) console.log(`${row.word} | ${row.pattern} | ${row.collision}`);
  console.log("pair | patterns | result");
  console.log("--- | --- | ---");
  for (const row of pairRows) console.log(`${row.pair.closed}->${row.pair.target} | ${row.patterns.join(",")} | ${row.result}`);
  console.log("admission | target | blocked");
  console.log("--- | --- | ---");
  for (const row of admissionRows) console.log(`${row.text} | ${row.targets.join(",")} | ${row.blocked.join(", ") || "none"}`);
  console.log("ORACLE INTEGRITY | PASS | no validator-valid fallback in independent CMUdict oracle");
}

function assertPseudowordProtection() {
  const cases = [
    { word: "boi", pattern: "diph_oi", collision: "boy" },
    { word: "joi", pattern: "diph_oi", collision: "joy" },
    { word: "doun", pattern: "diph_ou", collision: "down" },
    { word: "coul", pattern: "diph_ou", collision: "cowl" },
    { word: "cow", pattern: "diph_ow", collision: "cow" },
    { word: "coin", pattern: "diph_oi", collision: "coin" },
    { word: "book", pattern: "team_oo_short", collision: "book" },
  ];
  for (const entry of cases) {
    const result = validatePseudowordCandidate(entry.word, entry.pattern, { strictLexicon: true });
    assert.equal(result.valid, false, `${entry.word}/${entry.pattern} should be invalid`);
    assert.equal(result.collidesWith, entry.collision, `${entry.word}/${entry.pattern} should collide with ${entry.collision}`);
  }
  return cases;
}

function assertValidPseudowordFixtures() {
  return validPseudowordFixtures.map(([word, pattern]) => {
    const result = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
    assert.equal(result.valid, true, `${word}/${pattern} should validate: ${result.reason ?? result.issues.join("; ")}`);
    assert.match(result.expectedPronunciation, /\([A-Z ]+\)$/);
    return {
      word,
      pattern,
      pronunciation: result.expectedPronunciation,
      result: "PASS",
    };
  });
}

function assertExistingShippedNonwordsStillValid() {
  for (const target of CONTENT_V3_DAILY_TARGETS) {
    const patterns = pseudowordPatternsFor(target);
    for (const word of target.exampleNonwords) {
      const selected = patterns.find((pattern) => validatePseudowordCandidate(word, pattern, { strictLexicon: true }).valid);
      assert(selected, `${target.code}/${word} should remain valid for ${patterns.join(", ")}`);
    }
  }
}

function assertAmbiguityHonesty() {
  assert.equal(wordMatchesPattern("snow", "team_ow", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("snow", "diph_ow", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("cow", "diph_ow", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("cow", "team_ow", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("moon", "team_oo_long", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("moon", "team_oo_short", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("book", "team_oo_short", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("book", "team_oo_long", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("soup", "diph_ou", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("young", "diph_ou", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("four", "diph_ou", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("haul", "team_au", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("fault", "team_au", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("saw", "team_aw", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("lawn", "team_aw", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("hawk", "team_aw", { strictPhonemeLexicon: true }), true);
}

function assertPart2PairMatrix() {
  const rows = [
    assertPairPass(["diph_ou"], { closed: "shot", target: "shout" }),
    assertPairPass(["diph_ou"], { closed: "pond", target: "pound" }),
    assertPairPass(["diph_ow"], { closed: "ton", target: "town" }),
    assertPairPass(["team_oo_long"], { closed: "rot", target: "root" }),
    assertPairPass(["team_aw"], { closed: "fan", target: "fawn" }),
    assertPairFail(["diph_ou"], { closed: "shot", target: "pound" }),
    assertPairFail(["diph_oi", "diph_oy"], { closed: "shot", target: "shout" }),
    assertPairPass(["a_e"], { closed: "cap", target: "cape" }),
    assertPairPass(["team_ai"], { closed: "pan", target: "pain" }),
    assertPairPass(["r_ar"], { closed: "cat", target: "cart" }),
    assertPairFail(["a_e"], { closed: "cat", target: "cape" }),
    assertPairFail(["team_ai"], { closed: "pat", target: "pain" }),
  ];
  return rows;
}

function assertTargetScopedAdmission() {
  const rows = [
    assertClassification(["diph_oi", "diph_oy"], "coin boy cow moon saw", ["cow", "moon", "saw"]),
    assertClassification(["diph_ou", "diph_ow"], "shout cow snow oil", ["snow", "oil"]),
    assertClassification(["team_oo_long", "team_oo_short"], "moon book cow coin", ["cow", "coin"]),
    assertClassification(["team_au", "team_aw"], "haul saw out book", ["out", "book"]),
  ];
  return rows;
}

function assertClassification(targets: string[], text: string, blockedWords: string[]) {
  const classification = classifyPassageWords(text, {
    targetPatternCodes: targets,
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e", "a_e", "i_e", "o_e", "u_e", "e_e"],
    blockedPatternCodes: [
      "team_ai",
      "team_ay",
      "team_ee",
      "team_ea",
      "team_oa",
      "team_ow",
      "team_oo_long",
      "team_oo_short",
      "team_au",
      "team_aw",
      "diph_oi",
      "diph_oy",
      "diph_ou",
      "diph_ow",
      "r_ar",
      "r_or",
      "r_er",
      "r_ir",
      "r_ur",
    ].filter((pattern) => !targets.includes(pattern)),
    heartWords: [],
    vocabularyAllowlist: [],
  });
  const actualBlocked = classification.blockedPatternViolations.map((entry) => entry.word);
  assert.deepEqual(actualBlocked.sort(), blockedWords.sort(), `${targets.join(",")} blocked ${actualBlocked.join(", ")}`);
  return { targets, text, blocked: actualBlocked };
}

function assertNoBareCodes() {
  for (const bare of ["oi", "oy", "ou", "ow", "oo", "au", "aw"]) {
    assert.equal(PATTERN_REGISTRY[bare], undefined, `${bare} must not be a registry key`);
  }
  for (const code of ["diph_oi", "diph_oy", "diph_ou", "diph_ow", "team_oo_long", "team_oo_short", "team_au", "team_aw"]) {
    assert(PATTERN_REGISTRY[code], `${code} must be a registry key`);
  }
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
}

function assertPairPass(patterns: string[], pair: Pair) {
  const result = part2DemoCheck(draftFor(patterns, pair));
  assert.equal(result, "PASS", `${pair.closed}->${pair.target} should pass for ${patterns.join(", ")}`);
  return { pair, patterns, result };
}

function assertPairFail(patterns: string[], pair: Pair) {
  const result = part2DemoCheck(draftFor(patterns, pair));
  assert.equal(result, "FAIL", `${pair.closed}->${pair.target} should fail for ${patterns.join(", ")}`);
  return { pair, patterns, result };
}

function part2DemoCheck(draft: GeneratedLessonDraft) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_PART2_DEMO_MODE_VALID");
  assert(found, "Missing LESSON_PART2_DEMO_MODE_VALID check");
  return found.result;
}

function draftFor(patterns: string[], pair: Pair): GeneratedLessonDraft {
  return {
    phasePositionId: "phase-4-diphthong-test",
    dailyTargetId: `target-${patterns.join("-")}`,
    phaseBand: 4,
    dailyTargetCode: patterns.join("_"),
    targetPattern: patterns[0],
    targetPatterns: patterns,
    pseudowordPatterns: patterns,
    parts: [
      part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: [] }),
      part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
        demoMode: "minimal_pairs",
        demonstrationPairs: [pair],
        conceptExamples: [pair.target],
      }),
      part(3, "Word-level decoding", "WORD_LEVEL_DECODING", {
        contrastiveLines: [
          { lineNumber: 1, role: "target_real_words", words: [] },
          { lineNumber: 2, role: "contrastive_target_vs_review", words: [] },
          { lineNumber: 3, role: "cumulative_review", words: [] },
          { lineNumber: 4, role: "target_pseudowords", words: [] },
        ],
      }),
      part(4, "High-utility word / vocabulary", "HFW_VOCAB", { heartWordsPreviewedThisLesson: [], heartWordsAssumedKnown: [] }),
      part(5, "Sentence reading", "SENTENCE_READING", { sentences: [] }),
      part(6, "Encoding / spelling", "ENCODING_SPELLING", { dictatedWords: [], dictatedSentences: [] }),
      part(7, "Connected text", "CONNECTED_TEXT_READING", { passageText: "", heartWordsUsedInConnectedText: [] }, { unclassifiedWords: [] }, true, false),
      part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What happened in the story?" }] }),
    ],
  };
}

function part(
  partNumber: number,
  partLabel: string,
  partType: string,
  contentJson: Record<string, unknown>,
  contentAuditJson?: Record<string, unknown>,
  assistedModeAllowed?: boolean,
  independentScoreEligible?: boolean,
): GeneratedLessonPart {
  return {
    partNumber,
    partLabel,
    partType,
    kidVisibleCopy: {},
    tutorVisibleCopy: {},
    contentJson,
    contentAuditJson,
    wordTagsJson: { words: [] },
    assistedModeAllowed,
    independentScoreEligible,
  };
}

function pseudowordPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { pseudowordPatterns?: unknown; patterns?: unknown }).pseudowordPatterns ?? (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [seedTarget.code];
}

main();
