import assert from "assert/strict";
import { LESSON_CONTENT_BY_DAILY_TARGET, phase3EntryLessonContentFor } from "../lib/content/phase3EntryLessonContent";
import { CONTENT_V3_DAILY_TARGETS, PHASE_3_MID_TARGETS, PHASE_4_ENTRY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, evaluateLessonApprovalReadiness } from "../lib/literacy/lessonAudit";
import { deterministicLessonPartRunner, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { generatePart1Warmup } from "../lib/literacy/lessonParts/part1Warmup";
import { generatePart3Decoding } from "../lib/literacy/lessonParts/part3Decoding";
import { generatePart6Encoding } from "../lib/literacy/lessonParts/part6Encoding";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { auditPassage } from "../lib/literacy/passageAudit";
import { detectVcePattern, validatePseudowordCandidate, validatePseudowordSet } from "../lib/literacy/pseudowordValidator";

function lessonContext(targetCode = "a_e"): LessonGeneratorContext {
  const seedTarget = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing content-v3 target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const isMid = PHASE_3_MID_TARGETS.some((target) => target.code === targetCode);
  const isPhase4 = PHASE_4_ENTRY_TARGETS.some((target) => target.code === targetCode);
  const phasePosition = { id: isPhase4 ? "phase-4-entry" : isMid ? "phase-3-mid" : "phase-3-entry", phaseNumber: isPhase4 ? 4 : 3, label: isPhase4 ? "Phase 4 Entry" : isMid ? "Phase 3 Mid" : "Phase 3 Entry" };
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

async function main() {
  const ctx = lessonContext();
  assert.equal(ctx.selectedPassageAudit?.passesAuditGate, true);
  assert.equal(ctx.selectedPassageAudit?.unclassifiedWords.length, 0);
  assert.equal(ctx.selectedPassageAudit?.blockedPatternViolations.length, 0);

  const part1 = generatePart1Warmup(ctx);
  assert.equal((part1.contentJson.warmupWords as string[]).some((word) => /a[^aeiou]+e$/.test(word)), false);

  const part3 = generatePart3Decoding(ctx);
  const contrastiveLines = part3.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>;
  assert.equal(contrastiveLines.length, 4);
  assert.equal(contrastiveLines.some((line) => line.lineNumber === 5), false);
  assert.deepEqual(contrastiveLines[3].words, ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"]);
  assert(validatePseudowordSet(contrastiveLines[3].words, "a_e").every((entry) => entry.valid));
  assert.equal(validatePseudowordCandidate("nape", "a_e").valid, false);
  assert.equal(validatePseudowordCandidate("lathe", "a_e").valid, false);

  const part6 = generatePart6Encoding(ctx);
  assert((part6.contentJson.dictatedWords as string[]).length >= 6);
  assert((part6.contentJson.dictatedSentences as string[]).length >= 2);

  const draft = await generateLessonDraft(ctx, {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  assert.equal(draft.parts.length, 8);
  assert.deepEqual(draft.parts.map((part) => part.partNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(draft.dailyTargetCode, "a_e");
  assert.equal(draft.targetPattern, "a_e");

  const audit = auditGeneratedLessonDraft(draft);
  assert.equal(audit.canPersist, true, audit.blockers.join("\n"));

  for (const targetCode of Object.keys(LESSON_CONTENT_BY_DAILY_TARGET)) {
    const targetCtx = lessonContext(targetCode);
    const targetDraft = await generateLessonDraft(targetCtx, {
      recordDecision: async (_ctx, fn) => (await fn()).output,
    });
    const targetAudit = auditGeneratedLessonDraft(targetDraft);
    assert.equal(targetAudit.canPersist, true, `${targetCode}: ${targetAudit.blockers.join("\n")}`);
    if (targetCtx.phasePosition.phaseNumber >= 4) {
      assert.equal(targetCtx.selectedPassageAudit?.unclassifiedWords.length, 0, `${targetCode} mock passage must classify all words`);
      assert.equal(targetCtx.selectedPassageAudit?.blockedPatternViolations.length, 0, `${targetCode} mock passage must avoid blocked patterns`);
    } else {
      assert.equal(targetCtx.selectedPassageAudit?.passesAuditGate, true, `${targetCode} mock passage must pass audit`);
    }
    assert.equal(targetCtx.selectedPassageAudit?.quality.passesQualityGate, true, `${targetCode} mock passage must pass quality audit`);
  }

  const unwrapped = (await deterministicLessonPartRunner(ctx)({
    phasePositionId: ctx.phasePosition.id,
    phaseNumber: ctx.phasePosition.phaseNumber,
    phaseLabel: ctx.phasePosition.label,
    dailyTargetId: ctx.dailyTarget.id,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    targetWords: ctx.targetWords,
    pseudowords: ctx.pseudowords,
    selectedPassageId: ctx.selectedPassage?.id || "",
  })).parts;
  const wrapped = await generateLessonDraft(ctx, {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  const wrappedPersistenceFailure = await generateLessonDraft(ctx, {
    recordDecision: async (_ctx, fn) => {
      try {
        throw new Error("simulated persistence failure");
      } catch {
        return (await fn()).output;
      }
    },
  });
  assert.deepEqual(wrapped.parts, unwrapped);
  assert.deepEqual(wrappedPersistenceFailure.parts, unwrapped);

  const warmupLeak = { ...draft, parts: [{ ...draft.parts[0], contentJson: { ...draft.parts[0].contentJson, warmupWords: ["cake"] } }, ...draft.parts.slice(1)] };
  assert.equal(auditGeneratedLessonDraft(warmupLeak).canPersist, false);

  const missingFirstLook = evaluateLessonApprovalReadiness({
    ...draft,
    parts: draft.parts.map((part) => ({ ...part, firstLookReviewModelDecisionId: null })),
  });
  assert(missingFirstLook.blockers.some((blocker) => blocker.includes("LESSON_PART_FIRST_LOOK_REQUIRED")));

  const approvedReady = evaluateLessonApprovalReadiness({
    ...draft,
    parts: draft.parts.map((part) => ({ ...part, firstLookReviewModelDecisionId: `md-${part.partNumber}` })),
  });
  assert.equal(approvedReady.approvable, true, approvedReady.blockers.join("\n"));

  // --- PR #36-gates conformance: pseudoword real-word + homophone collisions ---
  const kape = validatePseudowordCandidate("kape", "a_e");
  assert.equal(kape.valid, false);
  assert.equal(kape.collidesWith, "cape");
  const drane = validatePseudowordCandidate("drane", "a_e");
  assert.equal(drane.valid, false);
  assert.equal(drane.collidesWith, "drain");
  const brade = validatePseudowordCandidate("brade", "a_e");
  assert.equal(brade.valid, false);
  assert.equal(brade.collidesWith, "braid");
  for (const word of ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"]) {
    assert.equal(validatePseudowordCandidate(word, "a_e").valid, true, `${word} should be a valid pseudoword`);
  }

  const findCheck = (mutated: typeof draft, ruleId: string) =>
    auditGeneratedLessonDraft(mutated).checks.find((entry) => entry.ruleId === ruleId);
  const replacePart = (partNumber: number, contentJson: Record<string, unknown>) => ({
    ...draft,
    parts: draft.parts.map((part) => (part.partNumber === partNumber ? { ...part, contentJson: { ...part.contentJson, ...contentJson } } : part)),
  });
  const lines = draft.parts.find((part) => part.partNumber === 3)!.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>;

  // r-controlled word in Part 5
  const rControlled = replacePart(5, { sentences: ["The cake is a gift for a pal."] });
  assert.equal(findCheck(rControlled, "LESSON_PART5_NO_RCONTROLLED")?.result, "FAIL");
  assert(auditGeneratedLessonDraft(rControlled).checks.some((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED" && entry.result === "FAIL"));

  // silent-e exception word tagged as target
  const exceptionDraft = {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 3
        ? { ...part, wordTagsJson: { words: [...(part.wordTagsJson as { words: unknown[] }).words, { word: "have", tag: "target" }] } }
        : part,
    ),
  };
  assert.equal(findCheck(exceptionDraft, "LESSON_PART4_SILENT_E_EXCEPTION_AS_HEART")?.result, "FAIL");

  // Part 3 count gates
  const fewRealWords = replacePart(3, {
    contrastiveLines: [
      { lineNumber: 1, role: "target_real_words", words: ["cake", "game", "make"] },
      { lineNumber: 2, role: "contrastive_target_vs_review", words: ["cap", "cape", "man"] },
      { lineNumber: 3, role: "cumulative_review", words: ["ran", "lake", "hand"] },
      lines.find((line) => line.role === "target_pseudowords"),
    ],
  });
  assert.equal(findCheck(fewRealWords, "LESSON_PART3_REAL_WORD_COUNT")?.result, "FAIL");

  const fewPseudowords = replacePart(3, {
    contrastiveLines: [
      ...lines.filter((line) => line.role !== "target_pseudowords"),
      { lineNumber: 4, role: "target_pseudowords", words: ["zake", "mave", "pame"] },
    ],
  });
  assert.equal(findCheck(fewPseudowords, "LESSON_PART3_PSEUDOWORD_COUNT")?.result, "FAIL");

  // Part 8 broadened yes/no stems
  for (const yesNo of ["Can you tell me about Dave?", "Would Dave make a cake?", "Has Jane seen the lake?"]) {
    const ynDraft = replacePart(8, {
      questions: [{ question: yesNo }, { question: "Why did Dave bake the cake?" }, { question: "Tell me about the lake." }],
    });
    assert.equal(findCheck(ynDraft, "LESSON_PART8_OPEN_ENDED")?.result, "FAIL", `"${yesNo}" should fail open-ended`);
  }

  const midAiCtx = lessonContext("vce_mix_ai");
  const midAiDraft = await generateLessonDraft(midAiCtx, {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
  assert.equal(auditGeneratedLessonDraft(midAiDraft).canPersist, true);
  assert.deepEqual(midAiCtx.targetPatterns, ["a_e", "i_e"]);
  assert(midAiCtx.pseudowords.every((word) => {
    const detected = detectVcePattern(word);
    return Boolean(detected && midAiCtx.targetPatterns.includes(detected));
  }));
  const midLines = midAiDraft.parts.find((part) => part.partNumber === 3)!.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string; words: string[] }>;
  const oPatternInAiMix = {
    ...midAiDraft,
    parts: midAiDraft.parts.map((part) =>
      part.partNumber === 3
        ? {
          ...part,
          contentJson: {
            ...part.contentJson,
            contrastiveLines: [
              ...midLines.filter((line) => line.role !== "target_pseudowords"),
              { lineNumber: 4, role: "target_pseudowords", words: ["zome", "zake", "pame", "vade", "sape", "zibe", "mide", "fime"] },
            ],
          },
        }
        : part,
    ),
  };
  assert.equal(auditGeneratedLessonDraft(oPatternInAiMix).checks.find((entry) => entry.ruleId === "LESSON_PSEUDOWORDS_IN_TARGET_SET")?.result, "FAIL");
  const zareInAiMix = {
    ...midAiDraft,
    parts: midAiDraft.parts.map((part) =>
      part.partNumber === 3
        ? {
          ...part,
          contentJson: {
            ...part.contentJson,
            contrastiveLines: [
              ...midLines.filter((line) => line.role !== "target_pseudowords"),
              { lineNumber: 4, role: "target_pseudowords", words: ["zare", "zake", "pame", "vade", "sape", "zibe", "mide", "fime"] },
            ],
          },
        }
        : part,
    ),
  };
  assert.equal(detectVcePattern("zare"), "a_e");
  assert(auditGeneratedLessonDraft(zareInAiMix).checks.some((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED" && entry.result === "FAIL"));
  assert.equal(detectVcePattern("nore"), "o_e");
  const badDemoPair = {
    ...midAiDraft,
    parts: midAiDraft.parts.map((part) => (part.partNumber === 2 ? { ...part, contentJson: { ...part.contentJson, demonstrationPairs: [{ closed: "cap", target: "bike" }] } } : part)),
  };
  assert.equal(auditGeneratedLessonDraft(badDemoPair).checks.find((entry) => entry.ruleId === "LESSON_PART2_DEMO_MINIMAL_PAIRS")?.result, "FAIL");
  assert.equal(lessonContext("vce_mix_all").dailyTarget.kidVisibleLabel, "silent-e review");

  console.log("content-v3 lesson pipeline checks passed");
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
