import assert from "assert/strict";
import { PHASE_4_MID_TARGETS } from "../lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor, type LessonContentByDailyTarget } from "../lib/content/phase3EntryLessonContent";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { assertPhase4LessonContentHasFullAuditPassage, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { auditPassage } from "../lib/literacy/passageAudit";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";

const BARE_TEAM_CODES = new Set(["ai", "ay", "ee", "ea", "oa", "igh"]);

async function main() {
  const results: Array<{ target: string; status: "PASS" }> = [];
  assertBareTeamCodeGate();
  assertPhase4FullAuditPassageGuard();

  for (const target of PHASE_4_MID_TARGETS) {
    assertNoBareTeamCodes(target);
    const patterns = targetPatternsFor(target);
    const pseudowordPatterns = pseudowordPatternsFor(target, patterns);
    assert(pseudowordPatterns.every((pattern) => patterns.includes(pattern)), `${target.code} pseudowordPatterns must be a subset of patterns`);
    assert.equal(target.exampleNonwords.length, 8, `${target.code} must ship 8 nonwords`);
    for (const word of target.exampleNonwords) {
      const selected = selectPseudowordPattern(word, pseudowordPatterns);
      assert(selected, `${word} should detect to ${pseudowordPatterns.join(", ")}`);
      assert.equal(validatePseudowordCandidate(word, selected, { strictLexicon: true }).valid, true, `${word} should validate for ${selected}`);
    }

    const ctx = lessonContext(target.code);
    const draft = await generateLessonDraft(ctx, {
      recordDecision: async (_ctx, fn) => (await fn()).output,
    });
    const audit = auditGeneratedLessonDraft(draft);
    assert.equal(audit.canPersist, true, `${target.code}: ${audit.blockers.join("\n")}`);
    assert.equal(audit.checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result ?? "PASS", "PASS");
    assert.equal(part7PassageText(draft), phase3EntryLessonContentFor(target.code).fullAuditPassageText, `${target.code} should render the full audit passage in Part 7`);
    assertFullPassageAudit(target.code);
    assertMockPassageIsClassifiedQualityFixture(target.code);
    assertFullPassageStyleConstraints(target.code, phase3EntryLessonContentFor(target.code), patterns);
    results.push({ target: target.code, status: "PASS" });
  }

  assertAyAndIghDemoExceptions();
  const longADraft = await generateLessonDraft(lessonContext("consolidate_long_a"), {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  assert.equal(auditGeneratedLessonDraft(removeAyWords(longADraft)).checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result, "FAIL");
  assertNonMinimalMixedPairsFail(longADraft);
  assertCrossSoundContaminationFails();

  console.log("content-v3 Phase 4 Mid consolidation checks passed");
  console.log("target | status");
  console.log("--- | ---");
  for (const result of results) {
    console.log(`${result.target} | ${result.status}`);
  }
  console.log("adversarial | expected failure");
  console.log("--- | ---");
  console.log("bare ai code | PASS");
  console.log("long_a without ay transfer words | PASS");
  console.log("cat/cape and pat/pain demo pairs | PASS");
  console.log("long_a passage contaminated with see/sea | PASS");
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = PHASE_4_MID_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing Phase 4 Mid target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = { id: "phase-4-mid", phaseNumber: 4, label: "Phase 4 Mid" };
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
    selectedPassage: { id: `passage-${targetCode}`, text: content.fullAuditPassageText, contentAuditJson: selectedPassageAudit, decodabilityScore: selectedPassageAudit.decodabilityScore },
    selectedPassageAudit,
  };
}

function assertNoBareTeamCodes(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const values = metadataCodes(seedTarget);
  const bare = values.filter((value) => BARE_TEAM_CODES.has(value));
  assert.equal(bare.length, 0, `${seedTarget.code} must use registry codes, not bare team codes: ${bare.join(", ")}`);
}

function assertBareTeamCodeGate() {
  const invalid = {
    code: "invalid_mid",
    targetPatternsJson: { patterns: ["ai"], pseudowordPatterns: ["team_ai"], graphemes: ["ai"] },
  };
  assert.throws(() => assertNoBareTeamCodes(invalid), /registry codes/);
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

function assertPhase4FullAuditPassageGuard() {
  assert.throws(
    () => assertPhase4LessonContentHasFullAuditPassage("phase4_missing_fixture", 4, {}),
    /Phase 4\+ lesson content for phase4_missing_fixture requires fullAuditPassageText\./,
  );
}

function assertAyAndIghDemoExceptions() {
  const longA = phase3EntryLessonContentFor("consolidate_long_a");
  assert.equal((longA.demonstrationPairs ?? []).some((pair) => pair.target.includes("ay")), false, "long a Mid target should not require ay demo pairs");
  const longI = phase3EntryLessonContentFor("consolidate_long_i");
  assert.equal((longI.demonstrationPairs ?? []).some((pair) => pair.target.includes("igh")), false, "long i Mid target should not require igh demo pairs");
}

function assertNonMinimalMixedPairsFail(draft: GeneratedLessonDraft) {
  const nonMinimalPairs = {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 2
        ? {
            ...part,
            contentJson: {
              ...part.contentJson,
              demonstrationPairs: [
                { closed: "cat", target: "cape" },
                { closed: "pat", target: "pain" },
              ],
            },
          }
        : part,
    ),
  };
  const checks = auditGeneratedLessonDraft(nonMinimalPairs).checks;
  assert.equal(checks.find((entry) => entry.ruleId === "LESSON_PART2_DEMO_MODE_VALID")?.result, "FAIL", "Non-minimal mixed pairs must fail Part 2 demo audit");
}

function assertCrossSoundContaminationFails() {
  const ctx = lessonContext("consolidate_long_a");
  const content = phase3EntryLessonContentFor("consolidate_long_a");
  const contaminated = auditPassage(`${content.fullAuditPassageText} I see the sea.`, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  const blockedWords = contaminated.blockedPatternViolations.map((entry) => entry.word.toLowerCase());
  assert(blockedWords.includes("see"), "long a contaminated passage should block see/team_ee");
  assert(blockedWords.includes("sea"), "long a contaminated passage should block sea/team_ea");
}

function removeAyWords(draft: GeneratedLessonDraft): GeneratedLessonDraft {
  const rewrite = (value: string) => value.replace(/\b(play|stay|day|gray|may|jay|tray|away)\b/gi, "rain");
  return {
    ...draft,
    parts: draft.parts.map((part) => ({
      ...part,
      contentJson: {
        ...part.contentJson,
        conceptExamples: Array.isArray(part.contentJson.conceptExamples)
          ? (part.contentJson.conceptExamples as string[]).map((word) => word.includes("ay") ? "rain" : word)
          : part.contentJson.conceptExamples,
        demonstrationPairs: Array.isArray(part.contentJson.demonstrationPairs)
          ? (part.contentJson.demonstrationPairs as Array<{ closed: string; target: string }>).map((pair) => pair.target.includes("ay") ? { closed: "ran", target: "rain" } : pair)
          : part.contentJson.demonstrationPairs,
        contrastiveLines: Array.isArray(part.contentJson.contrastiveLines)
          ? (part.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>).map((line) => ({ ...line, words: line.words.map((word) => word.includes("ay") ? "rain" : word) }))
          : part.contentJson.contrastiveLines,
        sentences: Array.isArray(part.contentJson.sentences) ? (part.contentJson.sentences as string[]).map(rewrite) : part.contentJson.sentences,
        passageText: typeof part.contentJson.passageText === "string" ? rewrite(part.contentJson.passageText) : part.contentJson.passageText,
      },
    })),
  };
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
  const part7 = draft.parts.find((part) => part.partNumber === 7);
  return typeof part7?.contentJson.passageText === "string" ? part7.contentJson.passageText : "";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
