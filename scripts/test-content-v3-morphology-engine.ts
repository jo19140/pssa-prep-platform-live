import assert from "assert/strict";
import fs from "node:fs";
import { decomposeInflectedWord, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import type { GeneratedLessonPart } from "../lib/literacy/lessonParts/types";

const DROP_E: MorphologyAnalyzerConfig = {
  rule: "drop_e",
  stemPatterns: ["a_e", "i_e", "o_e", "u_e", "e_e"],
  suffixes: ["ing", "ed", "s", "es"],
};

const DOUBLE: MorphologyAnalyzerConfig = {
  rule: "double",
  stemPatterns: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"],
  suffixes: ["ing", "ed", "s", "es"],
};

const NO_CHANGE_PROBE: MorphologyAnalyzerConfig = {
  rule: "drop_e",
  stemPatterns: [...DROP_E.stemPatterns, ...DOUBLE.stemPatterns],
  suffixes: ["ing", "ed", "s", "es"],
};

type ExpectedRow = {
  surface: string;
  config: MorphologyAnalyzerConfig;
  base: string;
  suffix: "ing" | "ed" | "s" | "es";
  rule: "drop_e" | "double" | "none";
  basePattern: string;
};

const VALID_ROWS: ExpectedRow[] = [
  { surface: "hoping", config: DROP_E, base: "hope", suffix: "ing", rule: "drop_e", basePattern: "o_e" },
  { surface: "hoped", config: DROP_E, base: "hope", suffix: "ed", rule: "drop_e", basePattern: "o_e" },
  { surface: "making", config: DROP_E, base: "make", suffix: "ing", rule: "drop_e", basePattern: "a_e" },
  { surface: "baked", config: DROP_E, base: "bake", suffix: "ed", rule: "drop_e", basePattern: "a_e" },
  { surface: "riding", config: DROP_E, base: "ride", suffix: "ing", rule: "drop_e", basePattern: "i_e" },
  { surface: "liked", config: DROP_E, base: "like", suffix: "ed", rule: "drop_e", basePattern: "i_e" },
  { surface: "skated", config: DROP_E, base: "skate", suffix: "ed", rule: "drop_e", basePattern: "a_e" },
  { surface: "smiling", config: DROP_E, base: "smile", suffix: "ing", rule: "drop_e", basePattern: "i_e" },
  { surface: "hopes", config: NO_CHANGE_PROBE, base: "hope", suffix: "s", rule: "none", basePattern: "o_e" },
  { surface: "makes", config: NO_CHANGE_PROBE, base: "make", suffix: "s", rule: "none", basePattern: "a_e" },
  { surface: "rides", config: NO_CHANGE_PROBE, base: "ride", suffix: "s", rule: "none", basePattern: "i_e" },
  { surface: "running", config: DOUBLE, base: "run", suffix: "ing", rule: "double", basePattern: "closed_short_u" },
  { surface: "hopping", config: DOUBLE, base: "hop", suffix: "ing", rule: "double", basePattern: "closed_short_o" },
  { surface: "sitting", config: DOUBLE, base: "sit", suffix: "ing", rule: "double", basePattern: "closed_short_i" },
  { surface: "hopped", config: DOUBLE, base: "hop", suffix: "ed", rule: "double", basePattern: "closed_short_o" },
  { surface: "hugged", config: DOUBLE, base: "hug", suffix: "ed", rule: "double", basePattern: "closed_short_u" },
  { surface: "grabbed", config: DOUBLE, base: "grab", suffix: "ed", rule: "double", basePattern: "closed_short_a" },
  { surface: "sledding", config: DOUBLE, base: "sled", suffix: "ing", rule: "double", basePattern: "closed_short_e" },
  { surface: "dining", config: DROP_E, base: "dine", suffix: "ing", rule: "drop_e", basePattern: "i_e" },
  { surface: "dinning", config: DOUBLE, base: "din", suffix: "ing", rule: "double", basePattern: "closed_short_i" },
  { surface: "fixes", config: NO_CHANGE_PROBE, base: "fix", suffix: "es", rule: "none", basePattern: "closed_short_i" },
];

const INVALID_ROWS: Array<{ surface: string; config: MorphologyAnalyzerConfig }> = [
  { surface: "makeing", config: DROP_E },
  { surface: "runing", config: DOUBLE },
  { surface: "hopeing", config: DROP_E },
  { surface: "hoping", config: DOUBLE },
  { surface: "hopping", config: DROP_E },
  { surface: "riding", config: DOUBLE },
  { surface: "bigger", config: DOUBLE },
];

async function main() {
  const matrixRows = assertDecompositionMatrix();
  const optInRows = assertOptInProof();
  const pairRows = assertTransformationPairs();
  assertLongestFirstAndNoChange();
  assertGuardrails();
  assertOracleIntegrity();

  console.log("content-v3 morphology engine checks passed");
  console.log("surface | base | suffix | rule | basePattern | verified");
  console.log("--- | --- | --- | --- | --- | ---");
  for (const row of matrixRows) {
    console.log(`${row.surface} | ${row.base} | ${row.suffix} | ${row.rule} | ${row.basePattern} | ${row.verified ? "TRUE" : "FALSE"}`);
  }
  console.log("opt-in | text | result");
  console.log("--- | --- | ---");
  for (const row of optInRows) console.log(`${row.mode} | ${row.text} | ${row.result}`);
  console.log("transformation_pairs | rule | pair | result");
  console.log("--- | --- | --- | ---");
  for (const row of pairRows) console.log(`${row.mode} | ${row.rule} | ${row.pair} | ${row.result}`);
  console.log("bigger exclusion | bigger | null");
  console.log("ORACLE INTEGRITY | PASS | no validator-valid fallback, caveats unchanged");
}

function assertDecompositionMatrix() {
  const rows = [];
  for (const expected of VALID_ROWS) {
    const analysis = decomposeInflectedWord(expected.surface, expected.config);
    assert(analysis, `${expected.surface} should decompose`);
    assert.equal(analysis.base, expected.base);
    assert.equal(analysis.suffix, expected.suffix);
    assert.equal(analysis.rule, expected.rule);
    assert.equal(analysis.basePattern, expected.basePattern);
    assert.equal(analysis.verified, true);
    rows.push(analysis);
  }
  for (const invalid of INVALID_ROWS) {
    assert.equal(decomposeInflectedWord(invalid.surface, invalid.config), null, `${invalid.surface} should not decompose`);
  }
  return rows;
}

function assertOptInProof() {
  const dropText = "hoping hoped makes";
  const doubleText = "hopping hopped running";
  const dropWith = classifyPassageWords(dropText, contextWith(DROP_E));
  const dropWithout = classifyPassageWords(dropText, contextWithout());
  const doubleWith = classifyPassageWords(doubleText, contextWith(DOUBLE));
  const doubleWithout = classifyPassageWords(doubleText, contextWithout());
  assert.deepEqual(dropWith.words.map((entry) => entry.category), ["target", "target", "target"]);
  assert.deepEqual(dropWith.words.map((entry) => entry.morphology?.base), ["hope", "hope", "make"]);
  assert.deepEqual(dropWith.words.map((entry) => entry.morphology?.rule), ["drop_e", "drop_e", "none"]);
  assert.deepEqual(dropWithout.words.map((entry) => entry.category), ["unclassified", "unclassified", "unclassified"]);
  assert.deepEqual(doubleWith.words.map((entry) => entry.category), ["target", "target", "target"]);
  assert.deepEqual(doubleWith.words.map((entry) => entry.morphology?.base), ["hop", "hop", "run"]);
  assert.deepEqual(doubleWith.words.map((entry) => entry.morphology?.rule), ["double", "double", "double"]);
  assert.deepEqual(doubleWithout.words.map((entry) => entry.category), ["unclassified", "unclassified", "unclassified"]);
  return [
    { mode: "with drop_e morphology", text: dropText, result: summarizeWords(dropWith.words) },
    { mode: "without morphology", text: dropText, result: summarizeWords(dropWithout.words) },
    { mode: "with double morphology", text: doubleText, result: summarizeWords(doubleWith.words) },
    { mode: "without morphology", text: doubleText, result: summarizeWords(doubleWithout.words) },
  ];
}

function contextWith(morphology: MorphologyAnalyzerConfig) {
  return {
    targetPatternCodes: [],
    allowedPatternCodes: [],
    blockedPatternCodes: [],
    heartWords: [],
    vocabularyAllowlist: [],
    morphology,
  };
}

function contextWithout() {
  return {
    targetPatternCodes: [],
    allowedPatternCodes: [],
    blockedPatternCodes: [],
    heartWords: [],
    vocabularyAllowlist: [],
  };
}

function summarizeWords(words: Array<{ word: string; category: string; morphology?: { base: string; rule: string } }>) {
  return words.map((entry) => `${entry.word}:${entry.category}${entry.morphology ? `:${entry.morphology.base}:${entry.morphology.rule}` : ""}`).join(", ");
}

function assertTransformationPairs() {
  const rows = [
    assertPair("transformation_pairs", "drop_e", "hope", "hoping", DROP_E, "PASS"),
    assertPair("transformation_pairs", "drop_e", "make", "making", DROP_E, "PASS"),
    assertPair("transformation_pairs", "drop_e", "ride", "riding", DROP_E, "PASS"),
    assertPair("transformation_pairs", "double", "run", "running", DOUBLE, "PASS"),
    assertPair("transformation_pairs", "double", "sit", "sitting", DOUBLE, "PASS"),
    assertPair("transformation_pairs", "drop_e", "hope", "hopping", DROP_E, "FAIL"),
    assertPair("transformation_pairs", "double", "run", "runing", DOUBLE, "FAIL"),
    assertPair("transformation_pairs", "double", "hope", "hoping", DOUBLE, "FAIL"),
    assertPair("transformation_pairs", "drop_e", "hope", "hopes", DROP_E, "FAIL"),
    assertPair("transformation_pairs", "double", "run", "runs", DOUBLE, "FAIL"),
    assertPair("minimal_pairs", "a_e", "cap", "cape", undefined, "PASS"),
    assertExamplesOnly(),
  ];
  return rows;
}

function assertPair(
  mode: string,
  rule: string,
  base: string,
  target: string,
  morphology: MorphologyAnalyzerConfig | undefined,
  expected: "PASS" | "FAIL",
) {
  const result = demoModeResult(draftFor(mode, [{ base, closed: base, target }], morphology, rule === "a_e" ? ["a_e"] : morphology?.stemPatterns ?? ["a_e"]));
  assert.equal(result, expected, `${base}->${target} should ${expected}`);
  return { mode, rule, pair: `${base}->${target}`, result };
}

function assertExamplesOnly() {
  const result = demoModeResult(draftFor("examples_only", [], undefined, ["a_e"], ["cake", "make", "bake"]));
  assert.equal(result, "PASS");
  return { mode: "examples_only", rule: "n/a", pair: "cake/make/bake", result };
}

function assertLongestFirstAndNoChange() {
  const fixes = decomposeInflectedWord("fixes", NO_CHANGE_PROBE);
  assert(fixes);
  assert.equal(fixes.base, "fix");
  assert.equal(fixes.suffix, "es");
  assert.equal(fixes.rule, "none");
  const hopes = decomposeInflectedWord("hopes", NO_CHANGE_PROBE);
  assert(hopes);
  assert.equal(hopes.base, "hope");
  assert.equal(hopes.suffix, "s");
  assert.equal(hopes.rule, "none");
  assert.equal(hopes.basePattern, "o_e");
  const classified = classifyPassageWords("hopes", contextWith(DROP_E)).words[0];
  assert.equal(classified.morphology?.rule, "none");
}

function assertGuardrails() {
  assert.equal(decomposeInflectedWord("hopping", DROP_E), null, "hopping must not be admitted by drop_e");
  assert.equal(decomposeInflectedWord("hopping", { ...DROP_E, stemPatterns: ["o_e"] }), null, "fabricated o_e config must not admit hopping");
  assert.equal(decomposeInflectedWord("bigger", DOUBLE), null, "bigger must stay excluded because -er is out of scope");
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
}

function demoModeResult(draft: GeneratedLessonDraft) {
  const check = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_PART2_DEMO_MODE_VALID");
  assert(check, "Missing LESSON_PART2_DEMO_MODE_VALID");
  return check.result;
}

function draftFor(
  demoMode: string,
  demonstrationPairs: Array<{ base?: string; closed?: string; target: string }>,
  morphology?: MorphologyAnalyzerConfig,
  targetPatterns = morphology?.stemPatterns ?? ["a_e"],
  demonstrationExamples: string[] = [],
): GeneratedLessonDraft {
  return {
    phasePositionId: "phase-4-morphology-test",
    dailyTargetId: "target-morphology-test",
    phaseBand: 4,
    dailyTargetCode: "morphology-test",
    targetPattern: targetPatterns[0],
    targetPatterns,
    pseudowordPatterns: targetPatterns,
    morphology,
    parts: [
      part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: [] }),
      part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
        demoMode,
        demonstrationPairs,
        demonstrationExamples,
        conceptExamples: demonstrationExamples.length ? demonstrationExamples : [targetPatterns[0] === "a_e" ? "cake" : demonstrationPairs[0]?.base ?? "hope"],
        morphologyJson: morphology,
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
      part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What changed in the words?" }] }),
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
