import assert from "assert/strict";
import fs from "node:fs";
import { PHASE_4_DIPHTHONG_TARGETS, PHASE_4_TEAMS_CLEANUP_TARGETS } from "../lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor, type LessonContentByDailyTarget } from "../lib/content/phase3EntryLessonContent";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { assertPhase4LessonContentHasFullAuditPassage, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { type GeneratedLessonPart, type LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { auditPassage } from "../lib/literacy/passageAudit";
import { classifyPassageWords, wordMatchesPattern } from "../lib/literacy/passageClassifier";
import { PATTERN_REGISTRY } from "../lib/literacy/patternRegistry";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";

const BARE_TEAMS_CLEANUP_CODES = new Set(["ow", "ew", "ue", "ie"]);

const EXPECTED_PASSAGE_METRICS: Record<string, { words: number; decod: string; coverage: string }> = {
  team_ow: { words: 108, decod: "1.000", coverage: "n/a" },
  team_ew_ue: { words: 96, decod: "1.000", coverage: "PASS" },
  team_ie_both: { words: 101, decod: "1.000", coverage: "PASS" },
};

const EXPECTED_NONWORD_PATTERNS = new Map<string, string>([
  ["zow", "team_ow"],
  ["thow", "team_ow"],
  ["smow", "team_ow"],
  ["drow", "team_ow"],
  ["zowl", "team_ow"],
  ["vowl", "team_ow"],
  ["blowl", "team_ow"],
  ["zowm", "team_ow"],
  ["vew", "team_ew"],
  ["snew", "team_ew"],
  ["twew", "team_ew"],
  ["swew", "team_ew"],
  ["frue", "team_ue"],
  ["smue", "team_ue"],
  ["spue", "team_ue"],
  ["snue", "team_ue"],
  ["zie", "team_ie_long_i"],
  ["blie", "team_ie_long_i"],
  ["snie", "team_ie_long_i"],
  ["grie", "team_ie_long_i"],
  ["vief", "team_ie_long_e"],
  ["zief", "team_ie_long_e"],
  ["glief", "team_ie_long_e"],
  ["sniel", "team_ie_long_e"],
]);

async function main() {
  assertBareTeamsCleanupCodeGate();
  assertPhase4LessonContentHasFullAuditPassage("team_ow", 4, phase3EntryLessonContentFor("team_ow"));

  const passageRows: Array<Record<string, string | number>> = [];
  const fixtureRows: Array<{ target: string; word: string; pattern: string; pronunciation: string; result: "PASS" }> = [];

  for (const target of PHASE_4_TEAMS_CLEANUP_TARGETS) {
    assertNoBareTeamsCleanupCodes(target);
    const patterns = targetPatternsFor(target);
    const pseudowordPatterns = pseudowordPatternsFor(target, patterns);
    assert(pseudowordPatterns.every((pattern) => patterns.includes(pattern)), `${target.code} pseudowordPatterns must be a subset of patterns`);
    assert.equal(target.exampleNonwords.length, 8, `${target.code} must ship 8 nonwords`);
    for (const word of target.exampleNonwords) {
      const expectedPattern = EXPECTED_NONWORD_PATTERNS.get(word);
      assert(expectedPattern, `${word} must be in the fixed 24-row fixture table`);
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
    const coverageCheck = lessonAudit.checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE");
    assert.equal(coverageCheck?.result ?? "PASS", "PASS", `${target.code} coverage should pass`);
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
      coverage: EXPECTED_PASSAGE_METRICS[target.code].coverage,
    });
  }

  const owRows = assertOwInversion();
  const admissionRows = assertAdmissionMatrix();
  assertAmbiguityPins();
  const examplesOnlyRows = await assertExamplesOnlyValidation();
  assertPerPatternFixtureCoverage();
  assertOracleIntegrity();

  console.log("content-v3 Phase 4 Teams Cleanup checks passed");
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
  console.log("ow inversion | target words | blocked words");
  console.log("--- | --- | ---");
  for (const row of owRows) console.log(`${row.context} | ${row.targets.join(",")} | ${row.blocked.join(", ")}`);
  console.log("admission | target | blocked");
  console.log("--- | --- | ---");
  for (const row of admissionRows) console.log(`${row.text} | ${row.targets.join(",")} | ${row.blocked.join(", ") || "none"}`);
  console.log("examples_only | mutation | result");
  console.log("--- | --- | ---");
  for (const row of examplesOnlyRows) console.log(`${row.target} | ${row.mutation} | ${row.result}`);
  console.log("ORACLE INTEGRITY | PASS | zero new caveats, no validator-valid fallback, existing caveats unchanged");
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = PHASE_4_TEAMS_CLEANUP_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing Phase 4 Teams Cleanup target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = { id: "phase-4-teams-cleanup", phaseNumber: 4, label: "Phase 4 Teams Cleanup" };
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

function assertNoBareTeamsCleanupCodes(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const values = metadataCodes(seedTarget);
  const bare = values.filter((value) => BARE_TEAMS_CLEANUP_CODES.has(value));
  assert.equal(bare.length, 0, `${seedTarget.code} must use registry codes, not bare cleanup team codes: ${bare.join(", ")}`);
}

function assertBareTeamsCleanupCodeGate() {
  const invalid = {
    code: "invalid_cleanup",
    targetPatternsJson: { patterns: ["ow"], pseudowordPatterns: ["team_ow"], graphemes: ["ow"] },
  };
  assert.throws(() => assertNoBareTeamsCleanupCodes(invalid), /registry codes/);
  for (const bare of BARE_TEAMS_CLEANUP_CODES) {
    assert.equal(PATTERN_REGISTRY[bare], undefined, `${bare} must not be a registry key`);
  }
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
  const banned = new Set(["we", "he", "she", "me", "be", "go", "so", "by", "my", "no", "do"]);
  const bannedContentWords = new Set(["bow", "sow", "sew", "know", "knew", "yowl", "smew", "fly", "thread", "die"]);
  for (const value of values) {
    for (const token of value.toLowerCase().match(/[a-z]+/g) ?? []) {
      assert.equal(banned.has(token), false, `${targetCode} should avoid banned open-syllable function word ${token}`);
      assert.equal(bannedContentWords.has(token), false, `${targetCode} should avoid banned cleanup trap word ${token}`);
      const stem = token.replace(/(?:s|es|ed|ing)$/i, "");
      if (stem !== token) {
        const candidates = detectPatternCandidates(stem);
        assert.equal(candidates.some((pattern) => patterns.includes(pattern)), false, `${targetCode} should avoid target-pattern inflection ${token}`);
      }
    }
  }
}

function assertOwInversion() {
  const team = classifyInContext("team_ow", "snow grow show low own cow town down");
  for (const word of ["snow", "grow", "show", "low", "own"]) {
    assert.equal(team.words.find((entry) => entry.word === word)?.matchedPattern, "team_ow", `${word} should target-match team_ow`);
  }
  for (const word of ["cow", "town", "down"]) {
    assert.notEqual(team.words.find((entry) => entry.word === word)?.matchedPattern, "team_ow", `${word} must not target-match team_ow`);
    assert(team.blockedPatternViolations.some((entry) => entry.word === word && entry.patternCode === "diph_ow"), `${word} must be blocked as diph_ow`);
  }

  const diph = classifyInDiphthongContext("diph_ou_ow", "cow town down snow");
  for (const word of ["cow", "town", "down"]) {
    assert.equal(diph.words.find((entry) => entry.word === word)?.matchedPattern, "diph_ow", `${word} should target-match diph_ow`);
  }
  assert.notEqual(diph.words.find((entry) => entry.word === "snow")?.matchedPattern, "diph_ow", "snow must not target-match diph_ow");
  assert(diph.blockedPatternViolations.some((entry) => entry.word === "snow" && entry.patternCode === "team_ow"), "snow must be blocked as team_ow in diph_ow context");

  return [
    {
      context: "team_ow context",
      targets: team.words.filter((entry) => entry.matchedPattern === "team_ow").map((entry) => `${entry.word}:${entry.matchedPattern}`),
      blocked: team.blockedPatternViolations.map((entry) => `${entry.word}:${entry.patternCode}`),
    },
    {
      context: "diph_ow context",
      targets: diph.words.filter((entry) => entry.matchedPattern === "diph_ow").map((entry) => `${entry.word}:${entry.matchedPattern}`),
      blocked: diph.blockedPatternViolations.map((entry) => `${entry.word}:${entry.patternCode}`),
    },
  ];
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

function classifyInDiphthongContext(targetCode: string, text: string) {
  const seedTarget = PHASE_4_DIPHTHONG_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing diphthong target ${targetCode}`);
  return classifyPassageWords(text, {
    targetPatternCodes: targetPatternsFor(seedTarget),
    allowedPatternCodes: seedTarget.allowedPatternCodes,
    blockedPatternCodes: seedTarget.blockedPatternCodes,
    heartWords: [],
    vocabularyAllowlist: [],
  });
}

function assertAdmissionMatrix() {
  return [
    assertInjectedBlocked("team_ow", "cow"),
    assertInjectedBlocked("team_ew_ue", "snow"),
    assertInjectedBlocked("team_ow", "pie"),
    assertInjectedBlocked("team_ow", "blue"),
    assertInjectedBlocked("team_ow", "day"),
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
  if (targetCode === "team_ow" && injectedWord === "day") {
    assert(blocked.includes("day:team_ay"), "day must surface as blocked team_ay in the snow-day trap");
  }
  return { text: `${targetCode} + ${injectedWord}`, targets: targetPatternsFor(ctx.dailyTarget), blocked };
}

function assertAmbiguityPins() {
  for (const word of ["bow", "sow"]) {
    assert.equal(wordMatchesPattern(word, "team_ow"), true, `${word} should match team_ow`);
    assert.equal(wordMatchesPattern(word, "diph_ow"), true, `${word} should match diph_ow`);
    assertContentExcludes(word);
  }
  assert.equal(wordMatchesPattern("sew", "team_ew"), false, "sew must not phoneme-match team_ew");
  assertContentExcludes("sew");
  assert.equal(wordMatchesPattern("pie", "team_ie_long_i"), true);
  assert.equal(wordMatchesPattern("pie", "team_ie_long_e"), false);
  assert.equal(wordMatchesPattern("field", "team_ie_long_e"), true);
  assert.equal(wordMatchesPattern("field", "team_ie_long_i"), false);
}

function assertContentExcludes(word: string) {
  for (const target of PHASE_4_TEAMS_CLEANUP_TARGETS) {
    const text = JSON.stringify(phase3EntryLessonContentFor(target.code)).toLowerCase();
    assert.equal(new RegExp(`\\b${word}\\b`).test(text), false, `${target.code} content must not include banned word ${word}`);
  }
}

async function assertExamplesOnlyValidation() {
  const rows: Array<{ target: string; mutation: string; result: string }> = [];
  for (const target of PHASE_4_TEAMS_CLEANUP_TARGETS) {
    const clean = await generateLessonDraft(lessonContext(target.code), {
      recordDecision: async (_ctx, fn) => (await fn()).output,
    });
    const cleanCheck = findCheck(clean, "LESSON_PART2_DEMO_MODE_VALID");
    assert.equal(cleanCheck.result, "PASS", `${target.code} examples_only should pass with zero pairs`);
    rows.push({ target: target.code, mutation: "zero pairs", result: cleanCheck.result });
  }

  const mutatedBase = await generateLessonDraft(lessonContext("team_ow"), {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  const mutated = {
    ...mutatedBase,
    parts: mutatedBase.parts.map((part) =>
      part.partNumber === 2
        ? { ...part, contentJson: { ...part.contentJson, demonstrationPairs: [{ closed: "on", target: "own" }] } }
        : part,
    ),
  };
  const mutatedCheck = findCheck(mutated, "LESSON_PART2_DEMO_MODE_VALID");
  assert.equal(mutatedCheck.result, "FAIL", "examples_only mode must reject stray pairs");
  rows.push({ target: "team_ow", mutation: "stray pair on->own", result: mutatedCheck.result });
  return rows;
}

function assertPerPatternFixtureCoverage() {
  const covered = new Set(EXPECTED_NONWORD_PATTERNS.values());
  for (const pattern of ["team_ow", "team_ew", "team_ue", "team_ie_long_i", "team_ie_long_e"]) {
    assert(covered.has(pattern), `${pattern} must have at least one strict-valid pseudoword fixture`);
  }
  assert.equal(validatePseudowordCandidate("snew", "team_ew", { strictLexicon: true }).valid, true);
  assert.equal(validatePseudowordCandidate("snue", "team_ue", { strictLexicon: true }).valid, true);
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
  assert.equal(source.includes("team_ow"), false, "Teams Cleanup seeds must not add new CMUdict oracle caveats");
  assert.equal(source.includes("team_ew"), false, "Teams Cleanup seeds must not add new CMUdict oracle caveats");
  assert.equal(source.includes("team_ue"), false, "Teams Cleanup seeds must not add new CMUdict oracle caveats");
  assert.equal(source.includes("team_ie"), false, "Teams Cleanup seeds must not add new CMUdict oracle caveats");
}

function findCheck(draft: GeneratedLessonDraft, ruleId: string) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === ruleId);
  assert(found, `Missing ${ruleId} check`);
  return found;
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

function part7PassageText(draft: GeneratedLessonDraft) {
  const part = draft.parts.find((entry) => entry.partNumber === 7);
  return typeof part?.contentJson.passageText === "string" ? part.contentJson.passageText : null;
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
