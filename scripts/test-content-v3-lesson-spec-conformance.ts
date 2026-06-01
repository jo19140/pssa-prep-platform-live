import assert from "assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PHASE_3_ENTRY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, evaluateLessonApprovalReadiness, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { generateLessonDraft } from "../lib/literacy/lessonGenerator";
import type { GeneratedLessonPart, LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { auditPassage, decodabilityThresholdForPhase, patternCodesFromDailyTarget } from "../lib/literacy/passageAudit";
import { classifyPassageWords, wordMatchesPattern } from "../lib/literacy/passageClassifier";
import { homophoneVariants, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";

const exemplarPassage = `Dave has a cake. The cake is a gift to Jane. Jane came to the lake. Dave gave Jane the cake at the gate. "I made this cake," said Dave. Jane ate the cake. "This cake is the same as that cake," said Jane. They gave a big wave. Dave and Jane had fun. The lake was the best.`;

const allowedCmudictNameTokenPseudowords = new Set(["mave", "nace"]);
const allowedCmudictNameTokenVariants = new Map([["sape", new Set(["seip"])]]);

async function main() {
  const ctx = buildContextFromRealSeed();
  const draft = await generateLessonDraft(ctx, {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });

  assert.equal(auditGeneratedLessonDraft(draft).canPersist, true);
  assertGeneratedLessonAgainstIndependentOracles(draft, ctx);
  assertAdversarialGateFailures(draft, ctx);

  console.log("content-v3 lesson spec-conformance checks passed");
}

function buildContextFromRealSeed(): LessonGeneratorContext {
  const seedTarget = PHASE_3_ENTRY_TARGETS.find((target) => target.code === "a_e");
  assert(seedTarget, "PHASE_3_ENTRY_TARGETS must include a_e");

  const phasePosition = { id: "phase-3-entry", phaseNumber: 3, label: "Phase 3 Entry" };
  const dailyTarget = { id: "target-a-e", ...seedTarget, targetPatternsJson: seedTarget.targetPatternsJson as any };
  const heartWordsPreviewedThisLesson = ["said", "was", "they"];
  const heartWordsAssumedKnown = ["I", "a", "the", "to"];
  const vocabularyWords = ["gift", "pal"];
  const selectedPassageAudit = auditPassage(exemplarPassage, {
    phasePosition,
    dailyTarget,
    heartWords: [...heartWordsPreviewedThisLesson, ...heartWordsAssumedKnown],
    vocabularyAllowlist: vocabularyWords,
  });

  return {
    phasePosition,
    dailyTarget,
    targetPattern: dailyTarget.code,
    targetWords: dailyTarget.exampleWords,
    reviewWords: [],
    pseudowords: dailyTarget.exampleNonwords,
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage: {
      id: "passage-a-e",
      text: exemplarPassage,
      contentAuditJson: selectedPassageAudit,
      decodabilityScore: selectedPassageAudit.decodabilityScore,
    },
    selectedPassageAudit,
  };
}

function assertGeneratedLessonAgainstIndependentOracles(draft: GeneratedLessonDraft, ctx: LessonGeneratorContext) {
  assert.deepEqual(draft.parts.map((part) => part.partNumber), [1, 2, 3, 4, 5, 6, 7, 8]);

  const part1 = requiredPart(draft, 1);
  const part3 = requiredPart(draft, 3);
  const part4 = requiredPart(draft, 4);
  const part5 = requiredPart(draft, 5);
  const part6 = requiredPart(draft, 6);
  const part7 = requiredPart(draft, 7);
  const part8 = requiredPart(draft, 8);

  for (const word of strings(part1.contentJson.warmupWords)) {
    assert.equal(wordMatchesPattern(word, "a_e"), false, `Part 1 warm-up leaked today's target: ${word}`);
  }

  const lines = contrastiveLines(part3);
  const realWordLines = lines.filter((line) => line.lineNumber >= 1 && line.lineNumber <= 3);
  const realWords = realWordLines.flatMap((line) => line.words);
  const pseudowords = lines.find((line) => line.role === "target_pseudowords")?.words ?? [];
  assert(realWords.length >= 15 && realWords.length <= 20, `Part 3 real-word count should be 15-20, found ${realWords.length}`);
  assert(pseudowords.length >= 8 && pseudowords.length <= 10, `Part 3 pseudoword count should be 8-10, found ${pseudowords.length}`);
  const lineClassification = classifyPassageWords(realWords.join(" "), classificationContext(ctx));
  assert.equal(lineClassification.unclassifiedWords.length, 0, `Part 3 real lines have unclassified words: ${lineClassification.unclassifiedWords.join(", ")}`);
  assert.equal(lineClassification.blockedPatternViolations.length, 0, `Part 3 real lines have blocked patterns: ${JSON.stringify(lineClassification.blockedPatternViolations)}`);

  const cmuWords = loadCmudictWords();
  for (const pseudoword of pseudowords) {
    const normalized = pseudoword.toLowerCase();
    const directCmuHit = cmuWords.has(normalized);
    assert(
      !directCmuHit || allowedCmudictNameTokenPseudowords.has(normalized),
      `Part 3 pseudoword ${pseudoword} appears in full CMUdict`,
    );
    if (directCmuHit) {
      console.log(`CMUdict name-token caveat accepted for shipped fixture pseudoword: ${pseudoword}`);
    }
    const vowelLetter = ctx.targetPattern.match(/^([aeiou])_e$/)?.[1] ?? "";
    const collidingVariant = homophoneVariants(normalized, vowelLetter)
      .find((variant) => cmuWords.has(variant) && !allowedCmudictNameTokenVariants.get(normalized)?.has(variant));
    assert.equal(collidingVariant, undefined, `Part 3 pseudoword ${pseudoword} has CMUdict homophone variant ${collidingVariant}`);
  }
  for (const tag of wordTags(part3).filter((tag) => tag.lineNumber === 4 || String(tag.tag ?? tag.category) === "pseudoword")) {
    const word = String(tag.word ?? "").toLowerCase();
    assert(
      !cmuWords.has(word) || allowedCmudictNameTokenPseudowords.has(word),
      `Word tagged as pseudoword/line-4 target appears in CMUdict: ${word}`,
    );
  }

  const part5Classification = classifyPassageWords(strings(part5.contentJson.sentences).join(" "), classificationContext(ctx, ["is"], ["dave", "jane"]));
  assert.equal(part5Classification.unclassifiedWords.length, 0, `Part 5 has unclassified words: ${part5Classification.unclassifiedWords.join(", ")}`);
  assert.equal(part5Classification.blockedPatternViolations.length, 0, `Part 5 has blocked patterns: ${JSON.stringify(part5Classification.blockedPatternViolations)}`);
  assert.equal(rControlledWords(strings(part5.contentJson.sentences)).length, 0, "Part 5 contains r-controlled words.");

  const passageText = String(part7.contentJson.passageText ?? "");
  const part7Classification = classifyPassageWords(passageText, classificationContext(ctx));
  assert.equal(part7Classification.unclassifiedWords.length, 0, `Part 7 has unclassified words: ${part7Classification.unclassifiedWords.join(", ")}`);
  assert.equal(part7Classification.blockedPatternViolations.length, 0, `Part 7 has blocked patterns: ${JSON.stringify(part7Classification.blockedPatternViolations)}`);
  assert(part7Classification.decodabilityScore >= decodabilityThresholdForPhase(ctx.phasePosition.phaseNumber));

  const previewed = new Set(strings(part4.contentJson.heartWordsPreviewedThisLesson).map(lower));
  const assumed = new Set(strings(part4.contentJson.heartWordsAssumedKnown).map(lower));
  const usedMinusAssumed = strings(part7.contentJson.heartWordsUsedInConnectedText).map(lower).filter((word) => !assumed.has(word));
  assert(usedMinusAssumed.every((word) => previewed.has(word)), "Part 7 heart words must be previewed unless assumed known.");

  assert(strings(part6.contentJson.dictatedWords).length > 0);
  assert(strings(part7.contentJson.passageText ? [part7.contentJson.passageText] : []).length > 0);
  assert((Array.isArray(part8.contentJson.questions) ? part8.contentJson.questions : []).length > 0);
  for (const number of [3, 5, 6, 7, 8]) {
    assert(requiredPart(draft, number), `Transfer-chain Part ${number} must be present`);
  }

  const yesNoStems = ["Did Dave make a cake?", "Do you see Dave?", "Does Jane like cake?", "Is Dave at the lake?", "Was Jane there?", "Were they at the gate?", "Are they pals?", "Am I reading?", "Can you tell me about Dave?", "Could Dave make a cake?", "Will Dave make a cake?", "Would Dave make a cake?", "Should Dave make a cake?", "Has Jane seen the lake?", "Have they had cake?", "Had Dave made cake?", "May Dave go?", "Might Jane wave?"];
  for (const question of yesNoStems) {
    const mutated = replacePart(draft, 8, { questions: [{ question }, { question: "Why did Dave bake?" }, { question: "Tell me about the lake." }] });
    assert.equal(findCheck(mutated, "LESSON_PART8_OPEN_ENDED")?.result, "FAIL", `Part 8 yes/no stem should fail: ${question}`);
  }

  for (const part of draft.parts) {
    assertKidCopyIsSpecClean(part, ctx.dailyTarget.kidVisibleLabel);
  }
}

function assertAdversarialGateFailures(draft: GeneratedLessonDraft, ctx: LessonGeneratorContext) {
  const warmupLeak = replacePart(draft, 1, { warmupWords: ["cake"] });
  assert.equal(findCheck(warmupLeak, "LESSON_WARMUP_NO_TODAY_PATTERN")?.result, "FAIL");

  const rControlled = replacePart(draft, 5, { sentences: ["The cake is a gift for a pal."] });
  assert.equal(findCheck(rControlled, "LESSON_PART5_NO_RCONTROLLED")?.result, "FAIL");

  const exceptionDraft = {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 3
        ? { ...part, wordTagsJson: { words: [...wordTags(part), { word: "have", tag: "target" }] } }
        : part,
    ),
  };
  assert.equal(findCheck(exceptionDraft, "LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART")?.result, "FAIL");

  const lines = contrastiveLines(requiredPart(draft, 3));
  const nineRealWords = replacePart(draft, 3, {
    contrastiveLines: [
      { lineNumber: 1, role: "target_real_words", words: ["cake", "game", "make"] },
      { lineNumber: 2, role: "contrastive_target_vs_review", words: ["cap", "cape", "man"] },
      { lineNumber: 3, role: "cumulative_review", words: ["ran", "lake", "hand"] },
      lines.find((line) => line.role === "target_pseudowords"),
    ],
  });
  assert.equal(findCheck(nineRealWords, "LESSON_PART3_REAL_WORD_COUNT")?.result, "FAIL");

  const threePseudowords = replacePart(draft, 3, {
    contrastiveLines: [
      ...lines.filter((line) => line.role !== "target_pseudowords"),
      { lineNumber: 4, role: "target_pseudowords", words: ["zake", "mave", "pame"] },
    ],
  });
  assert.equal(findCheck(threePseudowords, "LESSON_PART3_PSEUDOWORD_COUNT")?.result, "FAIL");

  assertPseudowordCollision("kape", "cape");
  assertPseudowordCollision("drane", "drain");
  assertPseudowordCollision("brade", "braid");

  for (const question of ["Can you tell me about Dave?", "Would Dave make a cake?", "Has Jane seen the lake?"]) {
    const yesNo = replacePart(draft, 8, { questions: [{ question }, { question: "Why did Dave bake?" }, { question: "Tell me about the lake." }] });
    assert.equal(findCheck(yesNo, "LESSON_PART8_OPEN_ENDED")?.result, "FAIL");
  }

  const blockedPassage = `${exemplarPassage} Mike rides a bike.`;
  const blockedClassification = classifyPassageWords(blockedPassage, classificationContext(ctx));
  assert(blockedClassification.blockedPatternViolations.some((entry) => entry.patternCode === "i_e"), "Independent Part 7 oracle should catch blocked i_e words.");
  const blockedPart7 = {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 7
        ? {
          ...part,
          contentJson: { ...part.contentJson, passageText: blockedPassage },
          contentAuditJson: { ...(part.contentAuditJson ?? {}), unclassifiedWords: ["bike"], unclassifiedCount: 1 },
        }
        : part,
    ),
  };
  assert.equal(findCheck(blockedPart7, "LESSON_CONNECTED_TEXT_ZERO_UNCLASSIFIED")?.result, "FAIL");

  const missingFirstLook = evaluateLessonApprovalReadiness({
    ...draft,
    parts: draft.parts.map((part) => ({ ...part, firstLookReviewModelDecisionId: null })),
  });
  assert(missingFirstLook.blockers.some((blocker) => blocker.includes("LESSON_PART_FIRST_LOOK_REQUIRED")));
}

function classificationContext(ctx: LessonGeneratorContext, extraHeartWords: string[] = [], extraVocabularyWords: string[] = []) {
  return {
    targetPatternCodes: patternCodesFromDailyTarget(ctx.dailyTarget),
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown, ...extraHeartWords],
    vocabularyAllowlist: [...ctx.vocabularyWords, ...extraVocabularyWords],
  };
}

function assertPseudowordCollision(word: string, collidesWith: string) {
  const result = validatePseudowordCandidate(word, "a_e");
  assert.equal(result.valid, false);
  assert.equal(result.collidesWith, collidesWith);
}

function assertKidCopyIsSpecClean(part: GeneratedLessonPart, allowedKidLabel: string) {
  const copy = JSON.stringify(part.kidVisibleCopy);
  const withoutAllowedLabel = copy.split(allowedKidLabel).join("");
  assert(!/\/[^/\n]+\/|[āēīōūăĕĭŏŭ]/i.test(copy), `Part ${part.partNumber} kid copy contains phoneme notation.`);
  assert(!/\bPhase\s+\d+\b|Phase 3 Entry|closed_short_[aeiou]|PA_PSSA_ELA|framework|scoring/i.test(withoutAllowedLabel), `Part ${part.partNumber} kid copy contains internal framework/scoring metadata.`);
}

function findCheck(draft: GeneratedLessonDraft, ruleId: string) {
  return auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === ruleId);
}

function replacePart(draft: GeneratedLessonDraft, partNumber: number, contentJson: Record<string, unknown>): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) => part.partNumber === partNumber ? { ...part, contentJson: { ...part.contentJson, ...contentJson } } : part),
  };
}

function requiredPart(draft: GeneratedLessonDraft, partNumber: number) {
  const part = draft.parts.find((entry) => entry.partNumber === partNumber);
  assert(part, `Missing Part ${partNumber}`);
  return part;
}

function contrastiveLines(part: GeneratedLessonPart) {
  assert(Array.isArray(part.contentJson.contrastiveLines), "Part 3 contrastiveLines must be an array");
  return part.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>;
}

function wordTags(part: GeneratedLessonPart) {
  const tags = part.wordTagsJson as any;
  return Array.isArray(tags?.words) ? tags.words : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function lower(value: string) {
  return value.toLowerCase();
}

function rControlledWords(sentences: string[]) {
  return sentences
    .flatMap((sentence) => sentence.toLowerCase().split(/[^a-z]+/))
    .filter(Boolean)
    .filter((word) => /[aeiou]r/.test(word));
}

function loadCmudictWords() {
  const raw = JSON.parse(fs.readFileSync(path.resolve("data/phonogram/cmudict.json"), "utf8")) as Array<{ word?: unknown }>;
  return new Set(raw.map((entry) => String(entry.word ?? "").toLowerCase()).filter((word) => /^[a-z]+$/.test(word)));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
