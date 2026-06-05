import assert from "assert/strict";
import fs from "node:fs";
import { PHASE_4_DIPHTHONG_TARGETS } from "../lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor, type LessonContentByDailyTarget } from "../lib/content/phase3EntryLessonContent";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { assertPhase4LessonContentHasFullAuditPassage, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { type GeneratedLessonPart } from "../lib/literacy/lessonParts/types";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { PATTERN_REGISTRY } from "../lib/literacy/patternRegistry";
import { auditPassage } from "../lib/literacy/passageAudit";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";

const BARE_DIPHTHONG_CODES = new Set(["oi", "oy", "ou", "ow", "oo", "au", "aw"]);

const EXPECTED_PASSAGE_METRICS: Record<string, { words: number; decod: string }> = {
  diph_oi_oy: { words: 86, decod: "1.000" },
  diph_ou_ow: { words: 95, decod: "1.000" },
  oo_both: { words: 99, decod: "1.000" },
  diph_au_aw: { words: 87, decod: "1.000" },
};

const EXPECTED_NONWORD_PATTERNS = new Map<string, string>([
  ["zoit", "diph_oi"],
  ["voib", "diph_oi"],
  ["noib", "diph_oi"],
  ["foid", "diph_oi"],
  ["zoy", "diph_oy"],
  ["voy", "diph_oy"],
  ["snoy", "diph_oy"],
  ["gloy", "diph_oy"],
  ["zoud", "diph_ou"],
  ["vout", "diph_ou"],
  ["noud", "diph_ou"],
  ["foud", "diph_ou"],
  ["zown", "diph_ow"],
  ["fown", "diph_ow"],
  ["plown", "diph_ow"],
  ["vown", "diph_ow"],
  ["zoon", "team_oo_long"],
  ["voom", "team_oo_long"],
  ["zood", "team_oo_long"],
  ["noof", "team_oo_long"],
  ["vook", "team_oo_short"],
  ["dook", "team_oo_short"],
  ["vood", "team_oo_short"],
  ["tood", "team_oo_short"],
  ["zaul", "team_au"],
  ["vaul", "team_au"],
  ["naul", "team_au"],
  ["jaul", "team_au"],
  ["zaw", "team_aw"],
  ["snaw", "team_aw"],
  ["blaw", "team_aw"],
  ["glaw", "team_aw"],
]);

async function main() {
  assertBareDiphthongCodeGate();
  assertPhase4LessonContentHasFullAuditPassage("diph_oi_oy", 4, phase3EntryLessonContentFor("diph_oi_oy"));

  const passageRows: Array<Record<string, string | number>> = [];
  const fixtureRows: Array<{ target: string; word: string; pattern: string; pronunciation: string; result: "PASS" }> = [];

  for (const target of PHASE_4_DIPHTHONG_TARGETS) {
    assertNoBareDiphthongCodes(target);
    const patterns = targetPatternsFor(target);
    const pseudowordPatterns = pseudowordPatternsFor(target, patterns);
    assert(pseudowordPatterns.every((pattern) => patterns.includes(pattern)), `${target.code} pseudowordPatterns must be a subset of patterns`);
    assert.equal(target.exampleNonwords.length, 8, `${target.code} must ship 8 nonwords`);
    for (const word of target.exampleNonwords) {
      const expectedPattern = EXPECTED_NONWORD_PATTERNS.get(word);
      assert(expectedPattern, `${word} must be in the fixed 32-row fixture table`);
      assert(pseudowordPatterns.includes(expectedPattern), `${word} expected pattern ${expectedPattern} must be in ${target.code} pseudowordPatterns`);
      assert(detectPatternCandidates(word).includes(expectedPattern), `${word} should detect to ${expectedPattern}`);
      const validation = validatePseudowordCandidate(word, expectedPattern, { strictLexicon: true });
      assert.equal(validation.valid, true, `${word} should validate for ${expectedPattern}: ${validation.reason ?? validation.issues.join("; ")}`);
      fixtureRows.push({ target: target.code, word, pattern: expectedPattern, pronunciation: validation.expectedPronunciation, result: "PASS" });
    }

    const ctx = lessonContext(target.code);
    const draft = await generateLessonDraft(ctx, {
      recordDecision: async (_ctx, fn) => (await fn()).output,
    });
    const lessonAudit = auditGeneratedLessonDraft(draft);
    assert.equal(lessonAudit.canPersist, true, `${target.code}: ${lessonAudit.blockers.join("\n")}`);
    assert.equal(lessonAudit.checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result ?? "PASS", "PASS");
    assert.equal(part7PassageText(draft), phase3EntryLessonContentFor(target.code).fullAuditPassageText, `${target.code} should render fullAuditPassageText in Part 7`);
    const fullAudit = assertFullPassageAudit(target.code);
    assert.equal(fullAudit.wordCount, EXPECTED_PASSAGE_METRICS[target.code].words, `${target.code} full passage word count changed`);
    assert.equal(fullAudit.decodabilityScore.toFixed(3), EXPECTED_PASSAGE_METRICS[target.code].decod, `${target.code} decodability changed`);
    assertMockPassageIsClassifiedQualityFixture(target.code);
    assertFullPassageStyleConstraints(target.code, phase3EntryLessonContentFor(target.code), patterns);
    passageRows.push({
      target: target.code,
      words: fullAudit.wordCount,
      decod: fullAudit.decodabilityScore.toFixed(3),
      unclassified: fullAudit.unclassifiedWords.length,
      blocked: fullAudit.blockedPatternViolations.length,
      trigrams: fullAudit.quality.repeatedTrigrams.length,
      gate: fullAudit.passesAuditGate ? "TRUE" : "FALSE",
      canPersist: lessonAudit.canPersist ? "TRUE" : "FALSE",
      coverage: lessonAudit.checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result ?? "PASS",
    });
  }

  const admissionRows = assertAdmissionMatrix();
  assertAmbiguityPins();
  const examplesOnlyRows = await assertExamplesOnlyValidation();
  assertPairMatrixRegressions();
  assertCrossRungRegression();
  assertOracleIntegrity();

  console.log("content-v3 Phase 4 Diphthong Entry checks passed");
  console.log("target | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage");
  console.log("--- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---");
  for (const row of passageRows) {
    console.log(`${row.target} | ${row.words} | ${row.decod} | ${row.unclassified} | ${row.blocked} | ${row.trigrams} | ${row.gate} | ${row.canPersist} | ${row.coverage}`);
  }
  console.log("target | word | pattern | pronunciation | result");
  console.log("--- | --- | --- | --- | ---");
  for (const row of fixtureRows) {
    console.log(`${row.target} | ${row.word} | ${row.pattern} | ${row.pronunciation} | ${row.result}`);
  }
  console.log("admission | target | blocked");
  console.log("--- | --- | ---");
  for (const row of admissionRows) console.log(`${row.text} | ${row.targets.join(",")} | ${row.blocked.join(", ") || "none"}`);
  console.log("examples_only | mutation | result");
  console.log("--- | --- | ---");
  for (const row of examplesOnlyRows) console.log(`${row.target} | ${row.mutation} | ${row.result}`);
  console.log("ORACLE INTEGRITY | PASS | zero new caveats, no validator-valid fallback, existing caveats unchanged");
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = PHASE_4_DIPHTHONG_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing Phase 4 Diphthong target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = { id: "phase-4-diphthong", phaseNumber: 4, label: "Phase 4 Diphthong Entry" };
  const dailyTarget = {
    id: `target-${targetCode}`,
    ...seedTarget,
    targetPatternsJson: seedTarget.targetPatternsJson as any,
  };
  const targetPatterns = targetPatternsFor(seedTarget);
  const pseudowordPatterns = pseudowordPatternsFor(seedTarget, targetPatterns);
  const heartWordsPreviewedThisLesson = content.heartWordsPreviewedThisLesson;
  const heartWordsAssumedKnown = content.heartWordsAssumedKnown;
  const vocabularyWords = content.vocabulary;
  assert(content.fullAuditPassageText, `${targetCode} needs a full audit passage.`);
  const selectedPassageAudit = auditPassage(content.fullAuditPassageText, {
    phasePosition,
    dailyTarget,
    heartWords: [...heartWordsPreviewedThisLesson, ...heartWordsAssumedKnown],
    vocabularyAllowlist: vocabularyWords,
  });
  return {
    phasePosition,
    dailyTarget,
    targetPattern: dailyTarget.code,
    targetPatterns,
    pseudowordPatterns,
    targetWords: dailyTarget.exampleWords.slice(0, 5),
    reviewWords: [],
    pseudowords: dailyTarget.exampleNonwords,
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage: {
      id: `passage-${targetCode}`,
      text: content.fullAuditPassageText,
      contentAuditJson: selectedPassageAudit,
      decodabilityScore: selectedPassageAudit.decodabilityScore,
    },
    selectedPassageAudit,
  };
}

function assertNoBareDiphthongCodes(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const values = metadataCodes(seedTarget);
  const bare = values.filter((value) => BARE_DIPHTHONG_CODES.has(value));
  assert.equal(bare.length, 0, `${seedTarget.code} must use registry codes, not bare diphthong/team codes: ${bare.join(", ")}`);
}

function assertBareDiphthongCodeGate() {
  const invalid = {
    code: "invalid_diphthong",
    targetPatternsJson: { patterns: ["oi"], pseudowordPatterns: ["diph_oi"], graphemes: ["oi"] },
  };
  assert.throws(() => assertNoBareDiphthongCodes(invalid), /registry codes/);
}

function metadataCodes(seedTarget: { targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const values: string[] = [];
  for (const key of ["patterns", "pseudowordPatterns"] as const) {
    const entries = (json as Record<string, unknown>)[key];
    if (Array.isArray(entries)) values.push(...entries.filter((entry): entry is string => typeof entry === "string"));
  }
  return values;
}

function assertFullPassageAudit(targetCode: string) {
  const content = phase3EntryLessonContentFor(targetCode);
  const ctx = lessonContext(targetCode);
  const fullAudit = auditPassage(content.fullAuditPassageText!, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  assert.equal(fullAudit.passesAuditGate, true, `${targetCode} full audit passage should pass production gate: ${JSON.stringify(fullAudit, null, 2)}`);
  assert.equal(fullAudit.quality.passesQualityGate, true, `${targetCode} full audit passage should pass quality gate`);
  assert.equal(fullAudit.unclassifiedWords.length, 0, `${targetCode} full audit passage should have zero unclassified`);
  assert.equal(fullAudit.blockedPatternViolations.length, 0, `${targetCode} full audit passage should have zero blocked`);
  assert.equal(fullAudit.quality.repeatedTrigrams.length, 0, `${targetCode} full audit passage should have zero repeated trigrams`);
  return fullAudit;
}

function assertMockPassageIsClassifiedQualityFixture(targetCode: string) {
  const content = phase3EntryLessonContentFor(targetCode);
  const ctx = lessonContext(targetCode);
  const mockAudit = auditPassage(content.mockPassageText, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  assert.equal(mockAudit.unclassifiedWords.length, 0, `${targetCode} mock passage should classify all words`);
  assert.equal(mockAudit.blockedPatternViolations.length, 0, `${targetCode} mock passage should have no blocked patterns`);
  assert.equal(mockAudit.quality.passesQualityGate, true, `${targetCode} mock passage should pass quality gate`);
}

function assertFullPassageStyleConstraints(targetCode: string, content: LessonContentByDailyTarget, patterns: string[]) {
  const values = [
    content.fullAuditPassageText || "",
    ...content.sentences,
    ...content.dictatedSentences,
  ];
  const banned = new Set(["we", "he", "she", "me", "be", "go", "so", "by", "my", "no"]);
  for (const value of values) {
    for (const token of value.toLowerCase().match(/[a-z]+/g) ?? []) {
      assert.equal(banned.has(token), false, `${targetCode} should avoid banned open-syllable function word ${token}`);
      const stem = token.replace(/(?:s|es|ed|ing)$/i, "");
      if (stem !== token) {
        const candidates = detectPatternCandidates(stem);
        assert.equal(candidates.some((pattern) => patterns.includes(pattern)), false, `${targetCode} should avoid target-pattern inflection ${token}`);
      }
    }
  }
}

function assertAdmissionMatrix() {
  return [
    assertInjectedBlocked("diph_oi_oy", "cow"),
    assertInjectedBlocked("diph_oi_oy", "moon"),
    assertInjectedBlocked("diph_oi_oy", "saw"),
    assertInjectedBlocked("diph_ou_ow", "oil"),
    assertInjectedBlocked("diph_ou_ow", "snow"),
    assertInjectedBlocked("oo_both", "cow"),
    assertInjectedBlocked("oo_both", "coin"),
    assertInjectedBlocked("diph_au_aw", "out"),
    assertInjectedBlocked("diph_au_aw", "book"),
  ];
}

function assertInjectedBlocked(targetCode: string, injectedWord: string) {
  const ctx = lessonContext(targetCode);
  const content = phase3EntryLessonContentFor(targetCode);
  const audit = auditPassage(`${content.fullAuditPassageText} ${injectedWord}.`, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  const blocked = audit.blockedPatternViolations.map((entry) => `${entry.word}:${entry.patternCode}`);
  assert(blocked.some((entry) => entry.startsWith(`${injectedWord.toLowerCase()}:`)), `${targetCode} should block injected ${injectedWord}: ${blocked.join(", ")}`);
  if (targetCode === "diph_ou_ow" && injectedWord === "snow") {
    assert(blocked.includes("snow:team_ow"), "snow must surface as blocked team_ow, never diph_ow target");
  }
  return { text: `${targetCode} + ${injectedWord}`, targets: targetPatternsFor(ctx.dailyTarget), blocked };
}

function assertAmbiguityPins() {
  const ouOw = classifyInContext("diph_ou_ow", "cow town snow");
  assert.equal(ouOw.words.find((entry) => entry.word === "cow")?.matchedPattern, "diph_ow");
  assert.equal(ouOw.words.find((entry) => entry.word === "town")?.matchedPattern, "diph_ow");
  assert.notEqual(ouOw.words.find((entry) => entry.word === "snow")?.matchedPattern, "diph_ow");
  assert(ouOw.blockedPatternViolations.some((entry) => entry.word === "snow" && entry.patternCode === "team_ow"));

  const oo = classifyInContext("oo_both", "moon book");
  assert.equal(oo.words.find((entry) => entry.word === "moon")?.matchedPattern, "team_oo_long");
  assert.equal(oo.words.find((entry) => entry.word === "book")?.matchedPattern, "team_oo_short");
}

function classifyInContext(targetCode: string, text: string) {
  const ctx = lessonContext(targetCode);
  return classifyPassageWords(text, {
    targetPatternCodes: targetPatternsFor(ctx.dailyTarget),
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [],
    vocabularyAllowlist: [],
  });
}

async function assertExamplesOnlyValidation() {
  const clean = await generateLessonDraft(lessonContext("diph_oi_oy"), {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  const cleanCheck = findCheck(clean, "LESSON_PART2_DEMO_MODE_VALID");
  assert.equal(cleanCheck.result, "PASS", "diph_oi_oy examples_only should pass with zero pairs");

  const mutated = {
    ...clean,
    parts: clean.parts.map((part) =>
      part.partNumber === 2
        ? { ...part, contentJson: { ...part.contentJson, demonstrationPairs: [{ closed: "con", target: "coin" }] } }
        : part,
    ),
  };
  const mutatedCheck = findCheck(mutated, "LESSON_PART2_DEMO_MODE_VALID");
  assert.equal(mutatedCheck.result, "FAIL", "examples_only mode must reject stray pairs");
  return [
    { target: "diph_oi_oy", mutation: "zero pairs", result: cleanCheck.result },
    { target: "diph_oi_oy", mutation: "stray pair con->coin", result: mutatedCheck.result },
  ];
}

function assertPairMatrixRegressions() {
  const rows = [
    ["diph_ou", "shot", "shout"],
    ["diph_ou", "pond", "pound"],
    ["diph_ou", "fond", "found"],
    ["diph_ow", "ton", "town"],
    ["team_aw", "fan", "fawn"],
    ["team_aw", "pan", "pawn"],
    ["team_oo_long", "rot", "root"],
    ["team_oo_long", "hot", "hoot"],
    ["team_oo_long", "tot", "toot"],
    ["team_oo_long", "hop", "hoop"],
    ["a_e", "cap", "cape"],
    ["team_ai", "pan", "pain"],
    ["r_ar", "cat", "cart"],
  ] as const;
  for (const [pattern, closed, target] of rows) {
    assert.equal(part2DemoCheck(draftFor([pattern], { closed, target })), "PASS", `${closed}->${target} should pass for ${pattern}`);
  }
}

function assertCrossRungRegression() {
  const ooOut = auditPassage(`${phase3EntryLessonContentFor("oo_both").fullAuditPassageText} out down.`, passageContext("oo_both"));
  assert(ooOut.blockedPatternViolations.some((entry) => entry.word === "out" && entry.patternCode === "diph_ou"));
  assert(ooOut.blockedPatternViolations.some((entry) => entry.word === "down" && entry.patternCode === "diph_ow"));
  const ouLook = auditPassage(`${phase3EntryLessonContentFor("diph_ou_ow").fullAuditPassageText} look good.`, passageContext("diph_ou_ow"));
  assert(ouLook.blockedPatternViolations.some((entry) => entry.word === "look" && entry.patternCode === "team_oo_short"));
  assert(ouLook.blockedPatternViolations.some((entry) => entry.word === "good" && entry.patternCode === "team_oo_short"));
}

function passageContext(targetCode: string) {
  const ctx = lessonContext(targetCode);
  const content = phase3EntryLessonContentFor(targetCode);
  return {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  };
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
  assert.equal(source.includes("diph_"), false, "Diphthong seeds must not add new CMUdict oracle caveats");
  assert.equal(source.includes("team_oo"), false, "oo seeds must not add new CMUdict oracle caveats");
  assert.equal(source.includes("team_au"), false, "au/aw seeds must not add new CMUdict oracle caveats");
}

function findCheck(draft: GeneratedLessonDraft, ruleId: string) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === ruleId);
  assert(found, `Missing ${ruleId} check`);
  return found;
}

function part2DemoCheck(draft: GeneratedLessonDraft) {
  return findCheck(draft, "LESSON_PART2_DEMO_MODE_VALID").result;
}

function draftFor(patterns: string[], pair: { closed: string; target: string }): GeneratedLessonDraft {
  return {
    phasePositionId: "phase-4-diphthong-pair-test",
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
    scoringRubricJson: {},
    studentDisplayMode: "TEXT",
    responseMode: "speech_response",
    assistedModeAllowed,
    independentScoreEligible,
  };
}

function targetPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [seedTarget.code];
}

function pseudowordPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }, fallback: string[]) {
  const json = seedTarget.targetPatternsJson;
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

function part7PassageText(draft: GeneratedLessonDraft) {
  const part = draft.parts.find((entry) => entry.partNumber === 7);
  return typeof part?.contentJson.passageText === "string" ? part.contentJson.passageText : null;
}

for (const bare of BARE_DIPHTHONG_CODES) {
  assert.equal(PATTERN_REGISTRY[bare], undefined, `${bare} must not be a registry key`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
