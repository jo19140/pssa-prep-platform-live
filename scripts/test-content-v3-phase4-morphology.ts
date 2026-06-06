import assert from "assert/strict";
import { LESSON_CONTENT_BY_DAILY_TARGET, phase3EntryLessonContentFor } from "../lib/content/phase3EntryLessonContent";
import {
  CONTENT_V3_DAILY_TARGETS,
  PHASE_3_MID_TARGETS,
  PHASE_4_DIPHTHONG_TARGETS,
  PHASE_4_ENTRY_TARGETS,
  PHASE_4_MID_TARGETS,
  PHASE_4_MORPHOLOGY_TARGETS,
  PHASE_4_RCONTROLLED_TARGETS,
  PHASE_4_TEAMS_CLEANUP_TARGETS,
} from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { generatePart1Warmup } from "../lib/literacy/lessonParts/part1Warmup";
import { generatePart2Concept } from "../lib/literacy/lessonParts/part2Concept";
import type { GeneratedLessonPart, LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { decomposeInflectedWord, morphologyConfigFromTargetPatternsJson, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";
import { auditPassage } from "../lib/literacy/passageAudit";
import { classifyPassageWords, type WordAuditEntry } from "../lib/literacy/passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";

const morphologyTargets = ["morph_drop_e", "morph_double"] as const;

async function main() {
  const rows: string[][] = [];
  const fixtureRows: string[][] = [];
  const ruleRows: string[][] = [];
  const pairRows: string[][] = [];
  const collisionRows: string[][] = [];
  const warmupRows: string[][] = [];
  const coverageRows: string[][] = [];

  for (const targetCode of morphologyTargets) {
    const ctx = lessonContext(targetCode);
    const morphology = requiredMorphology(ctx);
    const draft = await generateLessonDraft(ctx, { recordDecision: async (_ctx, fn) => (await fn()).output });
    assert.deepEqual(draft.morphology, morphology, `${targetCode} draft must carry morphology config`);
    const audit = auditGeneratedLessonDraft(draft);
    assert.equal(audit.canPersist, true, `${targetCode}: ${audit.blockers.join("\n")}`);
    assert.equal(audit.checks.find((check) => check.ruleId === "LESSON_MORPHOLOGY_TARGET_COVERAGE")?.result, "PASS");

    const content = phase3EntryLessonContentFor(targetCode);
    const fullAudit = auditPassage(content.fullAuditPassageText!, {
      phasePosition: ctx.phasePosition,
      dailyTarget: ctx.dailyTarget,
      heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
      vocabularyAllowlist: ctx.vocabularyWords,
    });
    const shortAudit = auditPassage(content.mockPassageText, {
      phasePosition: ctx.phasePosition,
      dailyTarget: ctx.dailyTarget,
      heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
      vocabularyAllowlist: ctx.vocabularyWords,
    });
    assert.equal(fullAudit.passesAuditGate, true, `${targetCode} full passage must pass audit`);
    assert.equal(shortAudit.unclassifiedWords.length, 0, `${targetCode} short passage must classify cleanly`);
    assert.equal(shortAudit.blockedPatternViolations.length, 0, `${targetCode} short passage must have no blocked patterns`);
    assert.equal(shortAudit.quality.passesQualityGate, true, `${targetCode} short passage must pass quality audit`);
    assertStyleSweep(content, targetCode);
    rows.push([targetCode, String(fullAudit.wordCount), fullAudit.decodabilityScore.toFixed(3), String(fullAudit.unclassifiedCount), String(fullAudit.blockedPatternViolations.length), String(fullAudit.quality.repeatedTrigrams.length), String(fullAudit.passesAuditGate).toUpperCase(), String(audit.canPersist).toUpperCase(), "PASS"]);

    const part1 = generatePart1Warmup(ctx);
    const part2 = generatePart2Concept(ctx);
    assert.deepEqual(part2.contentJson.morphologyJson, content.morphologyJson, `${targetCode} Part 2 must mirror content morphologyJson`);
    if (targetCode === "morph_double") {
      assert.deepEqual(part1.contentJson.warmupWords, ["lake", "home", "bike", "cube", "gate", "five"]);
    } else {
      assert.notDeepEqual(part1.contentJson.warmupWords, ["lake", "home", "bike", "cube", "gate", "five"]);
    }
    assert.equal(auditGeneratedLessonDraft({ ...draft, parts: replacePart(draft, 1, part1) }).checks.find((check) => check.ruleId === "LESSON_WARMUP_NO_TODAY_PATTERN")?.result, "PASS");
    warmupRows.push([targetCode, JSON.stringify(part1.contentJson.warmupWords), "PASS"]);

    for (const word of ctx.pseudowords) {
      const pattern = selectPseudowordPattern(word, ctx.pseudowordPatterns);
      assert(pattern, `${targetCode} pseudoword ${word} must detect to a target pseudoword pattern`);
      const validation = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
      assert.equal(validation.valid, true, `${targetCode} pseudoword ${word} failed validation: ${validation.reason ?? validation.issues.join(", ")}`);
      fixtureRows.push([targetCode, word, pattern, validation.expectedPronunciation ?? "", "PASS"]);
    }
  }

  const dropCtx = lessonContext("morph_drop_e");
  const dropMorph = requiredMorphology(dropCtx);
  for (const word of ["hoping", "baked", "making"]) {
    const entry = classifiedEntry(word, dropCtx);
    assert.equal(entry.category, "target");
    assert.equal(entry.morphology?.rule, "drop_e");
    ruleRows.push(["morph_drop_e", word, entry.morphology?.base ?? "", entry.morphology?.rule ?? "", "TARGET"]);
  }
  for (const word of ["running", "hopped"]) {
    assert.equal(decomposeInflectedWord(word, dropMorph), null);
    ruleRows.push(["morph_drop_e", word, "", "null", "NOT_TARGET"]);
  }
  const hopes = classifiedEntry("hopes", dropCtx);
  assert.equal(hopes.morphology?.rule, "none");
  ruleRows.push(["morph_drop_e", "hopes", hopes.morphology.base, hopes.morphology.rule, "REVIEW_ONLY"]);

  const doubleCtx = lessonContext("morph_double");
  const doubleMorph = requiredMorphology(doubleCtx);
  for (const word of ["running", "hopped", "sitting"]) {
    const entry = classifiedEntry(word, doubleCtx);
    assert.equal(entry.category, "target");
    assert.equal(entry.morphology?.rule, "double");
    ruleRows.push(["morph_double", word, entry.morphology?.base ?? "", entry.morphology?.rule ?? "", "TARGET"]);
  }
  for (const word of ["named", "baked"]) {
    assert.equal(decomposeInflectedWord(word, doubleMorph), null);
    ruleRows.push(["morph_double", word, "", "null", "NOT_TARGET"]);
  }
  const runs = classifiedEntry("runs", doubleCtx);
  assert.equal(runs.morphology?.rule, "none");
  ruleRows.push(["morph_double", "runs", runs.morphology.base, runs.morphology.rule, "REVIEW_ONLY"]);

  coverageRows.push(await assertCoverageFailure(
    "degenerate stems plus no-change forms",
    {
      demonstrationPairs: [{ base: "run", target: "runs" }, { base: "hop", target: "hops" }],
      part3Words: ["run", "runs", "hop", "hops", "sit", "sits", "grab", "grabs"],
      part5Sentences: ["The pup runs and hops.", "Sam sits with his pup."],
      part7Text: "The pup runs. Sam sits. The pup hops.",
      dictatedWords: ["run", "runs", "hop", "hops", "sit", "sits"],
    },
  ));
  coverageRows.push(await assertCoverageFailure(
    "incidental closed words plus no-change forms",
    {
      demonstrationPairs: [{ base: "log", target: "logs" }, { base: "bug", target: "bugs" }],
      part3Words: ["log", "bug", "sat", "logs", "bugs", "sits", "run", "runs"],
      part5Sentences: ["The log sat by the bug.", "The bug runs by the log."],
      part7Text: "A log sat. A bug runs. Sam logs bugs.",
      dictatedWords: ["log", "logs", "bug", "bugs", "sat", "sits"],
    },
  ));

  pairRows.push(assertPair("morph_drop_e", "hope", "hoping", true));
  pairRows.push(assertPair("morph_drop_e", "make", "making", true));
  pairRows.push(assertPair("morph_drop_e", "ride", "riding", true));
  pairRows.push(assertPair("morph_drop_e", "bake", "baked", true));
  pairRows.push(assertPair("morph_double", "run", "running", true));
  pairRows.push(assertPair("morph_double", "hop", "hopping", true));
  pairRows.push(assertPair("morph_double", "sit", "sitting", true));
  pairRows.push(assertPair("morph_double", "hug", "hugged", true));
  pairRows.push(assertPair("morph_drop_e", "hope", "hopping", false));
  pairRows.push(assertPair("morph_double", "run", "runing", false));
  pairRows.push(assertPair("morph_drop_e", "hope", "hopes", false));
  pairRows.push(assertPair("a_e", "cap", "cape", true));
  pairRows.push(assertExamplesOnly());

  collisionRows.push(assertPseudowordRejected("nok", "closed_short_o", "knock"));
  collisionRows.push(assertPseudowordRejected("wat", "closed_short_a", "wat"));

  await assertPriorTargetsMorphologyUndefined();

  printTable("target | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage", rows);
  printTable("target | word | pattern | pronunciation | result", fixtureRows);
  printTable("context | surface | base | rule | result", ruleRows);
  printTable("demoMode | context | pair | result", pairRows);
  printTable("coverage regression | detail | result", coverageRows);
  printTable("closed pseudoword pin | pattern | collision | result", collisionRows);
  printTable("warmup producer path | words | result", warmupRows);
  console.log("ORACLE INTEGRITY | PASS | zero new caveats, no validator-valid fallback, existing caveats unchanged");
  console.log("content-v3 Phase 4 Morphology Entry A checks passed");
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing content-v3 target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = phasePositionFor(targetCode);
  const dailyTarget = { id: `target-${targetCode}`, ...seedTarget, targetPatternsJson: seedTarget.targetPatternsJson as any };
  const targetPatterns = targetPatternsFor(seedTarget);
  const pseudowordPatterns = pseudowordPatternsFor(seedTarget, targetPatterns);
  const heartWordsPreviewedThisLesson = content.heartWordsPreviewedThisLesson;
  const heartWordsAssumedKnown = content.heartWordsAssumedKnown;
  const vocabularyWords = content.vocabulary;
  const selectedPassageText = phasePosition.phaseNumber >= 4 ? content.fullAuditPassageText : content.mockPassageText;
  assert(selectedPassageText, `${targetCode} needs fullAuditPassageText for Phase 4+ lesson generation.`);
  const selectedPassageAudit = auditPassage(selectedPassageText, {
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
    reviewWords: content.reviewWords ?? [],
    pseudowords: dailyTarget.exampleNonwords,
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage: { id: `passage-${targetCode}`, text: selectedPassageText, contentAuditJson: selectedPassageAudit, decodabilityScore: selectedPassageAudit.decodabilityScore },
    selectedPassageAudit,
  };
}

function phasePositionFor(targetCode: string) {
  const isMid = PHASE_3_MID_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Entry = PHASE_4_ENTRY_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Mid = PHASE_4_MID_TARGETS.some((target) => target.code === targetCode);
  const isPhase4RControlled = PHASE_4_RCONTROLLED_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Diphthong = PHASE_4_DIPHTHONG_TARGETS.some((target) => target.code === targetCode);
  const isPhase4TeamsCleanup = PHASE_4_TEAMS_CLEANUP_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Morphology = PHASE_4_MORPHOLOGY_TARGETS.some((target) => target.code === targetCode);
  const isPhase4 = isPhase4Entry || isPhase4Mid || isPhase4RControlled || isPhase4Diphthong || isPhase4TeamsCleanup || isPhase4Morphology;
  return {
    id: isPhase4Morphology ? "phase-4-morphology" : isPhase4TeamsCleanup ? "phase-4-teams-cleanup" : isPhase4Diphthong ? "phase-4-diphthong" : isPhase4RControlled ? "phase-4-rcontrolled" : isPhase4Mid ? "phase-4-mid" : isPhase4Entry ? "phase-4-entry" : isMid ? "phase-3-mid" : "phase-3-entry",
    phaseNumber: isPhase4 ? 4 : 3,
    label: isPhase4Morphology ? "Phase 4 Morphology Entry A" : isPhase4TeamsCleanup ? "Phase 4 Teams Cleanup" : isPhase4Diphthong ? "Phase 4 Diphthong Entry" : isPhase4RControlled ? "Phase 4 R-Controlled Entry" : isPhase4Mid ? "Phase 4 Mid" : isPhase4Entry ? "Phase 4 Entry" : isMid ? "Phase 3 Mid" : "Phase 3 Entry",
  };
}

function requiredMorphology(ctx: LessonGeneratorContext): MorphologyAnalyzerConfig {
  const morphology = morphologyConfigFromTargetPatternsJson(ctx.dailyTarget.targetPatternsJson);
  assert(morphology, `${ctx.dailyTarget.code} requires morphologyJson`);
  return morphology;
}

function classifiedEntry(word: string, ctx: LessonGeneratorContext): WordAuditEntry {
  const result = classifyPassageWords(word, classificationContext(ctx));
  assert.equal(result.words.length, 1);
  return result.words[0];
}

function classificationContext(ctx: LessonGeneratorContext) {
  return {
    targetPatternCodes: ctx.targetPatterns,
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
    vocabularyAllowlist: ctx.vocabularyWords,
    morphology: requiredMorphology(ctx),
  };
}

function assertPair(targetCode: string, base: string, target: string, shouldPass: boolean) {
  const ctx = lessonContext(targetCode);
  const pair = targetCode.startsWith("morph_") ? { base, target } : { closed: base, target };
  const draft = baseDraft(ctx, [pair]);
  const result = auditGeneratedLessonDraft(draft).checks.find((check) => check.ruleId === "LESSON_PART2_DEMO_MODE_VALID")?.result;
  assert.equal(result === "PASS", shouldPass, `${targetCode} ${base}->${target}`);
  return [draft.parts[1].contentJson.demoMode as string, targetCode, `${base}->${target}`, shouldPass ? "PASS" : "FAIL"];
}

function assertExamplesOnly() {
  const ctx = lessonContext("a_e");
  const draft = {
    ...baseDraft(ctx, []),
    parts: [
      baseDraft(ctx, []).parts[0],
      {
        ...baseDraft(ctx, []).parts[1],
        contentJson: {
          ...baseDraft(ctx, []).parts[1].contentJson,
          demoMode: "examples_only",
          demonstrationExamples: ["cake", "make", "bake"],
          demonstrationPairs: [],
        },
      },
    ],
  } as unknown as GeneratedLessonDraft;
  const result = auditGeneratedLessonDraft(draft).checks.find((check) => check.ruleId === "LESSON_PART2_DEMO_MODE_VALID")?.result;
  assert.equal(result, "PASS");
  return ["examples_only", "a_e", "cake/make/bake", "PASS"];
}

async function assertCoverageFailure(name: string, fixture: {
  demonstrationPairs: { base: string; target: string }[];
  part3Words: string[];
  part5Sentences: string[];
  part7Text: string;
  dictatedWords: string[];
}) {
  const ctx = lessonContext("morph_double");
  const draft = await generateLessonDraft(ctx, { recordDecision: async (_ctx, fn) => (await fn()).output });
  const mutated: GeneratedLessonDraft = {
    ...draft,
    parts: draft.parts.map((part) => {
      if (part.partNumber === 2) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            demonstrationPairs: fixture.demonstrationPairs,
          },
        };
      }
      if (part.partNumber === 3) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            contrastiveLines: [
              { lineNumber: 1, role: "target_real_words", words: fixture.part3Words.slice(0, 4) },
              { lineNumber: 2, role: "contrastive_target_vs_review", words: fixture.part3Words.slice(4) },
              { lineNumber: 3, role: "cumulative_review", words: ["lake", "home", "bike"] },
              { lineNumber: 4, role: "target_pseudowords", words: ctx.pseudowords },
            ],
          },
        };
      }
      if (part.partNumber === 5) {
        return { ...part, contentJson: { ...part.contentJson, sentences: fixture.part5Sentences } };
      }
      if (part.partNumber === 6) {
        return { ...part, contentJson: { ...part.contentJson, dictatedWords: fixture.dictatedWords } };
      }
      if (part.partNumber === 7) {
        return { ...part, contentJson: { ...part.contentJson, passageText: fixture.part7Text } };
      }
      return part;
    }),
  };
  const result = auditGeneratedLessonDraft(mutated).checks.find((check) => check.ruleId === "LESSON_MORPHOLOGY_TARGET_COVERAGE")?.result;
  assert.equal(result, "FAIL", `${name} must fail LESSON_MORPHOLOGY_TARGET_COVERAGE`);
  return [name, "LESSON_MORPHOLOGY_TARGET_COVERAGE", "FAIL"];
}

function baseDraft(ctx: LessonGeneratorContext, demonstrationPairs: { base?: string; closed?: string; target: string }[]): GeneratedLessonDraft {
  return {
    phasePositionId: ctx.phasePosition.id,
    dailyTargetId: ctx.dailyTarget.id,
    phaseBand: ctx.phasePosition.phaseNumber,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    morphology: morphologyConfigFromTargetPatternsJson(ctx.dailyTarget.targetPatternsJson),
    parts: [
      { partNumber: 1, partLabel: "Warmup", partType: "CUMULATIVE_CODE_REVIEW", kidVisibleCopy: {}, tutorVisibleCopy: {}, contentJson: { warmupWords: ["lake"] } },
      { partNumber: 2, partLabel: "Explicit target concept", partType: "EXPLICIT_TARGET_INSTRUCTION", kidVisibleCopy: {}, tutorVisibleCopy: {}, contentJson: { conceptExamples: ctx.targetWords, demoMode: ctx.dailyTarget.code.startsWith("morph_") ? "transformation_pairs" : "minimal_pairs", demonstrationPairs, demonstrationExamples: [] } },
    ],
  };
}

function assertPseudowordRejected(word: string, pattern: string, collision: string) {
  const result = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
  assert.equal(result.valid, false, `${word} should reject`);
  assert.equal(result.collidesWith, collision);
  return [word, pattern, collision, "PASS"];
}

async function assertPriorTargetsMorphologyUndefined() {
  for (const code of Object.keys(LESSON_CONTENT_BY_DAILY_TARGET).filter((target) => !target.startsWith("morph_"))) {
    const draft = await generateLessonDraft(lessonContext(code), { recordDecision: async (_ctx, fn) => (await fn()).output });
    assert.equal(draft.morphology, undefined, `${code} should not opt into morphology`);
  }
}

function assertStyleSweep(content: { sentences: string[]; fullAuditPassageText?: string; mockPassageText: string }, targetCode: string) {
  const text = [content.sentences.join(" "), content.mockPassageText, content.fullAuditPassageText ?? ""].join(" ").toLowerCase();
  assert(!/\bare\b/.test(text), `${targetCode} must not use are`);
  assert(!/\bsunup\b/.test(text), `${targetCode} must not use sunup`);
  for (const banned of ["mixed", "jumped", "helping"]) {
    assert(!new RegExp(`\\b${banned}\\b`).test(text), `${targetCode} must not use plain-attach form ${banned}`);
  }
}

function replacePart(draft: GeneratedLessonDraft, partNumber: number, replacement: GeneratedLessonPart) {
  return draft.parts.map((part) => (part.partNumber === partNumber ? replacement : part));
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

function printTable(header: string, rows: string[][]) {
  console.log(header);
  console.log(header.split("|").map(() => "---").join("|"));
  for (const row of rows) console.log(row.join(" | "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
