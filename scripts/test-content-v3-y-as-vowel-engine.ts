import assert from "assert/strict";
import fs from "node:fs";
import { CONTENT_V3_DAILY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import type { GeneratedLessonPart } from "../lib/literacy/lessonParts/types";
import { decomposeInflectedWord, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import { wordMatchesRegisteredPattern } from "../lib/literacy/patternRegistry";

const Y_TO_I: MorphologyAnalyzerConfig = {
  rule: "y_to_i",
  stemPatterns: ["y_long_i"],
  suffixes: ["ed", "es", "ing"],
};

const MATCH_WORDS = ["cry", "try", "fly", "dry", "spy", "fry", "shy", "sly", "pry", "sky", "ply", "wry"];
const NO_MATCH_WORDS = ["yes", "yard", "yell", "type", "myth", "gym", "baby", "happy", "pony", "ally", "reply", "deny", "july"];
const CLEAN_PSEUDOWORDS = ["cly", "sny", "gly", "zy", "smy", "vry", "zby", "gry"];

type ExpectedDecomposition = {
  surface: string;
  base: string;
  suffix: "ed" | "es" | "ing";
  rule: "y_to_i" | "none";
};

const VALID_DECOMPOSITIONS: ExpectedDecomposition[] = [
  { surface: "cried", base: "cry", suffix: "ed", rule: "y_to_i" },
  { surface: "tried", base: "try", suffix: "ed", rule: "y_to_i" },
  { surface: "dried", base: "dry", suffix: "ed", rule: "y_to_i" },
  { surface: "spied", base: "spy", suffix: "ed", rule: "y_to_i" },
  { surface: "fried", base: "fry", suffix: "ed", rule: "y_to_i" },
  { surface: "shied", base: "shy", suffix: "ed", rule: "y_to_i" },
  { surface: "flies", base: "fly", suffix: "es", rule: "y_to_i" },
  { surface: "cries", base: "cry", suffix: "es", rule: "y_to_i" },
  { surface: "dries", base: "dry", suffix: "es", rule: "y_to_i" },
  { surface: "spies", base: "spy", suffix: "es", rule: "y_to_i" },
  { surface: "fries", base: "fry", suffix: "es", rule: "y_to_i" },
  { surface: "skies", base: "sky", suffix: "es", rule: "y_to_i" },
  { surface: "crying", base: "cry", suffix: "ing", rule: "none" },
  { surface: "trying", base: "try", suffix: "ing", rule: "none" },
  { surface: "flying", base: "fly", suffix: "ing", rule: "none" },
  { surface: "drying", base: "dry", suffix: "ing", rule: "none" },
  { surface: "spying", base: "spy", suffix: "ing", rule: "none" },
  { surface: "frying", base: "fry", suffix: "ing", rule: "none" },
];

async function main() {
  const matcherRows = assertMatcherHonesty();
  const pseudowordRows = assertPseudowords();
  const decompositionRows = assertDecomposition();
  const collisionRows = assertIeCollision();
  const coverageRows = assertCoverage();
  const optInRows = assertOptInInvariance();
  assertOracleIntegrity();

  console.log("content-v3 y-as-vowel engine checks passed");
  console.log("matcher honesty | word | y_long_i");
  console.log("--- | --- | ---");
  for (const row of matcherRows) console.log(`${row.kind} | ${row.word} | ${row.result}`);
  console.log("y_long_i pseudoword | pronunciation | result");
  console.log("--- | --- | ---");
  for (const row of pseudowordRows) console.log(`${row.word} | ${row.pronunciation} | ${row.result}`);
  console.log("y_to_i decomposition | base | suffix | rule");
  console.log("--- | --- | --- | ---");
  for (const row of decompositionRows) console.log(`${row.surface} | ${row.base} | ${row.suffix} | ${row.rule}`);
  console.log("ie collision | context | word | result");
  console.log("--- | --- | --- | ---");
  for (const row of collisionRows) console.log(`${row.context} | ${row.word} | ${row.result}`);
  console.log("coverage | fixture | LESSON_MORPHOLOGY_TARGET_COVERAGE");
  console.log("--- | --- | ---");
  for (const row of coverageRows) console.log(`${row.fixture} | ${row.words} | ${row.result}`);
  console.log("opt-in invariance | probe | result");
  console.log("--- | --- | ---");
  for (const row of optInRows) console.log(`${row.probe} | ${row.result}`);
  console.log("ORACLE INTEGRITY | PASS | no validator-valid fallback, caveats unchanged");
}

function assertMatcherHonesty() {
  const rows: Array<{ kind: string; word: string; result: string }> = [];
  for (const word of MATCH_WORDS) {
    assert.equal(wordMatchesRegisteredPattern(word, "y_long_i", { strictPhonemeLexicon: true }), true, `${word} should match y_long_i`);
    rows.push({ kind: "MATCH", word, result: "TRUE" });
  }
  for (const word of NO_MATCH_WORDS) {
    assert.equal(wordMatchesRegisteredPattern(word, "y_long_i", { strictPhonemeLexicon: true }), false, `${word} should not match y_long_i`);
    rows.push({ kind: "NO_MATCH", word, result: "FALSE" });
  }
  return rows;
}

function assertPseudowords() {
  const rows: Array<{ word: string; pronunciation: string; result: string }> = [];
  for (const word of CLEAN_PSEUDOWORDS) {
    assert.deepEqual(detectPatternCandidates(word).filter((pattern) => pattern === "y_long_i"), ["y_long_i"], `${word} should detect y_long_i`);
    const validation = validatePseudowordCandidate(word, "y_long_i", { strictLexicon: true });
    assert.equal(validation.valid, true, `${word} should validate: ${validation.reason ?? validation.issues.join(", ")}`);
    assert.match(validation.expectedPronunciation, /\bAY\)/);
    rows.push({ word, pronunciation: validation.expectedPronunciation, result: "PASS" });
  }
  const fyCollision = validatePseudowordCandidate("fy", "y_long_i", { strictLexicon: true });
  assert.equal(fyCollision.valid, false, "fy must reject as a reverse-pronunciation homophone collision");
  assert(fyCollision.collidesWith, "fy collision must name a real-word collision");
  rows.push({ word: "fy", pronunciation: fyCollision.expectedPronunciation, result: `REJECT ${fyCollision.collidesWith}` });
  const rawCollision = validatePseudowordCandidate("bly", "y_long_i", { strictLexicon: true });
  assert.equal(rawCollision.valid, false, "bly must reject as a raw CMUdict real-word collision");
  assert.equal(rawCollision.collidesWith, "bly");
  rows.push({ word: "bly", pronunciation: rawCollision.expectedPronunciation, result: `REJECT ${rawCollision.collidesWith}` });
  return rows;
}

function assertDecomposition() {
  const rows = [];
  for (const expected of VALID_DECOMPOSITIONS) {
    const analysis = decomposeInflectedWord(expected.surface, Y_TO_I);
    assert(analysis, `${expected.surface} should decompose`);
    assert.equal(analysis.base, expected.base);
    assert.equal(analysis.suffix, expected.suffix);
    assert.equal(analysis.rule, expected.rule);
    assert.equal(analysis.basePattern, "y_long_i");
    rows.push(analysis);
  }
  for (const surface of ["cryed", "flys", "hoping"]) {
    assert.equal(decomposeInflectedWord(surface, Y_TO_I), null, `${surface} must not decompose under y_to_i`);
  }
  assert.equal(decomposeInflectedWord("cried", { rule: "drop_e", stemPatterns: ["i_e"], suffixes: ["ing", "ed", "s", "es"] }), null);
  rows.push({ surface: "cryed", base: "null", suffix: "n/a", rule: "INVALID" });
  rows.push({ surface: "flys", base: "null", suffix: "n/a", rule: "INVALID" });
  rows.push({ surface: "cried under drop_e", base: "null", suffix: "n/a", rule: "INVALID" });
  rows.push({ surface: "hoping under y_to_i", base: "null", suffix: "n/a", rule: "INVALID" });
  return rows;
}

function assertIeCollision() {
  const yContext = classifyPassageWords("cried", {
    targetPatternCodes: ["y_long_i"],
    allowedPatternCodes: [],
    blockedPatternCodes: [],
    heartWords: [],
    vocabularyAllowlist: [],
    morphology: Y_TO_I,
  }).words[0];
  assert.equal(yContext.category, "target");
  assert.equal(yContext.matchedPattern, "y_long_i");
  assert.equal(yContext.morphology?.rule, "y_to_i");

  const ieContext = classifyPassageWords("cried", {
    targetPatternCodes: ["team_ie_long_i"],
    allowedPatternCodes: [],
    blockedPatternCodes: [],
    heartWords: [],
    vocabularyAllowlist: [],
  }).words[0];
  assert.equal(ieContext.category, "target");
  assert.equal(ieContext.matchedPattern, "team_ie_long_i");
  assert.equal(ieContext.morphology, undefined);

  return [
    { context: "with y_to_i morphology", word: "cried", result: "target:y_long_i:y_to_i" },
    { context: "without morphology", word: "cried", result: "target:team_ie_long_i" },
  ];
}

function assertCoverage() {
  const keepsY = coverageResult(["crying", "trying", "flying"], ["crying", "trying", "flying"]);
  assert.equal(keepsY, "FAIL", "keeps-y -ing forms must not satisfy y_to_i target coverage");
  const trueEvidence = coverageResult(["cried", "flies", "tries"], ["cried", "flies", "tries"]);
  assert.equal(trueEvidence, "PASS", "true y_to_i forms must satisfy morphology target coverage");
  return [
    { fixture: "keeps-y only", words: "crying, trying, flying", result: keepsY },
    { fixture: "true y_to_i evidence", words: "cried, flies, tries", result: trueEvidence },
  ];
}

function coverageResult(pairTargets: string[], transferWords: string[]) {
  const pairs = pairTargets.map((target) => ({ base: baseFor(target), target }));
  const draft = draftForCoverage(pairs, transferWords);
  const check = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_MORPHOLOGY_TARGET_COVERAGE");
  assert(check, "Missing LESSON_MORPHOLOGY_TARGET_COVERAGE");
  return check.result;
}

function baseFor(word: string) {
  const analysis = decomposeInflectedWord(word, Y_TO_I);
  return analysis?.base ?? word.replace(/ing$/, "");
}

function assertOptInInvariance() {
  const priorTargets = CONTENT_V3_DAILY_TARGETS.filter((target) => target.code !== "morph_y_to_i");
  const seedPatterns = priorTargets.flatMap((target) => [
    ...patternsFromJson(target.targetPatternsJson),
    ...target.exampleWords,
    ...target.exampleNonwords,
  ]);
  assert.equal(seedPatterns.includes("y_long_i"), false, "prior targets must not reference y_long_i");
  assert.equal(seedPatterns.some((entry) => entry === "y_to_i"), false, "prior targets must not reference y_to_i");
  for (const target of priorTargets) {
    for (const word of [...target.exampleWords, ...target.exampleNonwords]) {
      assert.equal(wordMatchesRegisteredPattern(word, "y_long_i", { strictPhonemeLexicon: true }), false, `${target.code} seed word ${word} should not newly match y_long_i`);
    }
  }
  return [
    { probe: "prior target metadata", result: "no y_long_i / y_to_i references" },
    { probe: "prior seed example words + nonwords", result: "no y_long_i matches" },
  ];
}

function patternsFromJson(json: unknown): string[] {
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const patterns = (json as { patterns?: unknown }).patterns;
  const morphologyJson = (json as { morphologyJson?: unknown }).morphologyJson;
  const rule = morphologyJson && typeof morphologyJson === "object" && !Array.isArray(morphologyJson)
    ? String((morphologyJson as { rule?: unknown }).rule ?? "")
    : "";
  return [
    ...(Array.isArray(patterns) ? patterns.filter((entry): entry is string => typeof entry === "string") : []),
    rule,
  ].filter(Boolean);
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
}

function draftForCoverage(
  demonstrationPairs: Array<{ base: string; target: string }>,
  transferWords: string[],
): GeneratedLessonDraft {
  return {
    phasePositionId: "phase-4-y-test",
    dailyTargetId: "target-y-to-i-test",
    phaseBand: 4,
    dailyTargetCode: "morph_y_to_i",
    targetPattern: "y_long_i",
    targetPatterns: ["y_long_i"],
    pseudowordPatterns: ["y_long_i"],
    morphology: Y_TO_I,
    parts: [
      part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: [] }),
      part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
        demoMode: "transformation_pairs",
        demonstrationPairs,
        conceptExamples: ["cry", "fly", "try"],
        morphologyJson: Y_TO_I,
      }),
      part(3, "Word-level decoding", "WORD_LEVEL_DECODING", {
        contrastiveLines: [
          { lineNumber: 1, role: "target_real_words", words: transferWords },
          { lineNumber: 2, role: "contrastive_target_vs_review", words: [] },
          { lineNumber: 3, role: "cumulative_review", words: [] },
          { lineNumber: 4, role: "target_pseudowords", words: [] },
        ],
      }),
      part(4, "High-utility word / vocabulary", "HFW_VOCAB", { heartWordsPreviewedThisLesson: [], heartWordsAssumedKnown: [] }),
      part(5, "Sentence reading", "SENTENCE_READING", { sentences: [`${transferWords.join(" ")}.`] }),
      part(6, "Encoding / spelling", "ENCODING_SPELLING", { dictatedWords: ["cry", "fly", "try"], dictatedSentences: [] }),
      part(7, "Connected text", "CONNECTED_TEXT_READING", { passageText: transferWords.join(" "), heartWordsUsedInConnectedText: [] }, { unclassifiedWords: [] }, true, false),
      part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What changed in these words?" }] }),
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
    scoringRubricJson: {},
    studentDisplayMode: "TEXT",
    responseMode: "speech_response",
    assistedModeAllowed,
    independentScoreEligible,
  };
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
