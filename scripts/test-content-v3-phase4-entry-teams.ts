import assert from "assert/strict";
import { PHASE_4_ENTRY_TARGETS } from "../lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor } from "../lib/content/phase3EntryLessonContent";
import { auditGeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { auditPassage } from "../lib/literacy/passageAudit";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import type { GeneratedLessonDraft } from "../lib/literacy/lessonAudit";

async function main() {
  assert.equal(validatePseudowordCandidate("blaim", "team_ai", { strictLexicon: true }).valid, false);
  assert.equal(validatePseudowordCandidate("blaim", "team_ai", { strictLexicon: true }).collidesWith, "blame");
  assert.equal(validatePseudowordCandidate("laim", "team_ai", { strictLexicon: true }).valid, false);
  assert.equal(validatePseudowordCandidate("laim", "team_ai", { strictLexicon: true }).collidesWith, "lame");
  assert.equal(validatePseudowordCandidate("raim", "team_ai", { strictLexicon: true }).valid, true);

  for (const target of PHASE_4_ENTRY_TARGETS) {
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
    const part3 = draft.parts.find((part) => part.partNumber === 3)!;
    const pseudoTags = ((part3.wordTagsJson as { words?: any[] }).words ?? []).filter((entry) => entry.lineNumber === 4);
    assert(pseudoTags.every((entry) => entry.selectedPattern && pseudowordPatterns.includes(entry.selectedPattern)), `${target.code} pseudowords need selectedPattern metadata`);
  }

  const aiAyDraft = await generateLessonDraft(lessonContext("team_ai_ay"), {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  const missingAy = removeAyWords(aiAyDraft);
  assert.equal(auditGeneratedLessonDraft(missingAy).checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result, "FAIL");

  console.log("content-v3 Phase 4 Entry team lesson checks passed");
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = PHASE_4_ENTRY_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing Phase 4 Entry target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = { id: "phase-4-entry", phaseNumber: 4, label: "Phase 4 Entry" };
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
  const selectedPassageAudit = auditPassage(content.mockPassageText, {
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
    selectedPassage: { id: `passage-${targetCode}`, text: content.mockPassageText, contentAuditJson: selectedPassageAudit, decodabilityScore: selectedPassageAudit.decodabilityScore },
    selectedPassageAudit,
  };
}

function removeAyWords(draft: GeneratedLessonDraft): GeneratedLessonDraft {
  const rewrite = (value: string) => value.replace(/\b(play|stay|day|gray)\b/gi, "rain");
  return {
    ...draft,
    parts: draft.parts.map((part) => ({
      ...part,
      contentJson: {
        ...part.contentJson,
        conceptExamples: Array.isArray(part.contentJson.conceptExamples) ? (part.contentJson.conceptExamples as string[]).filter((word) => !word.includes("ay")) : part.contentJson.conceptExamples,
        demonstrationPairs: Array.isArray(part.contentJson.demonstrationPairs) ? (part.contentJson.demonstrationPairs as Array<{ closed: string; target: string }>).map((pair) => pair.target.includes("ay") ? { closed: "ran", target: "rain" } : pair) : part.contentJson.demonstrationPairs,
        contrastiveLines: Array.isArray(part.contentJson.contrastiveLines)
          ? (part.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>).map((line) => ({ ...line, words: line.words.map((word) => word.includes("ay") ? "rain" : word) }))
          : part.contentJson.contrastiveLines,
        sentences: Array.isArray(part.contentJson.sentences) ? (part.contentJson.sentences as string[]).map(rewrite) : part.contentJson.sentences,
        passageText: typeof part.contentJson.passageText === "string" ? rewrite(part.contentJson.passageText) : part.contentJson.passageText,
      },
    })),
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
