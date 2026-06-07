import assert from "assert/strict";
import fs from "node:fs";
import { phase3EntryLessonContentFor } from "../lib/content/phase3EntryLessonContent";
import {
  CONTENT_V3_DAILY_TARGETS,
  PHASE_3_MID_TARGETS,
  PHASE_4_DIPHTHONG_TARGETS,
  PHASE_4_ENTRY_TARGETS,
  PHASE_4_MID_TARGETS,
  PHASE_4_MORPHOLOGY_COMPARE_TARGETS,
  PHASE_4_MORPHOLOGY_TARGETS,
  PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS,
  PHASE_4_RCONTROLLED_TARGETS,
  PHASE_4_TEAMS_CLEANUP_TARGETS,
} from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { canonicalPseudowordsForTargetPatterns, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { generatePart1Warmup } from "../lib/literacy/lessonParts/part1Warmup";
import { generatePart2Concept } from "../lib/literacy/lessonParts/part2Concept";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { decomposeInflectedWord, morphologyConfigFromTargetPatternsJson, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";
import { auditPassage } from "../lib/literacy/passageAudit";
import type { WordAuditEntry } from "../lib/literacy/passageClassifier";

const TARGET_CODE = "morph_compare_no_change";
const EXPECTED_MORPHOLOGY: MorphologyAnalyzerConfig = {
  rule: "compare",
  stemPatterns: ["closed_short_a", "closed_short_e", "closed_short_i", "closed_short_o", "team_ow"],
  comparativeStems: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
  suffixes: ["er", "est"],
};

async function main() {
  const ctx = lessonContext(TARGET_CODE);
  const morphology = requiredMorphology(ctx);
  assert.deepEqual(morphology, EXPECTED_MORPHOLOGY);
  assert.deepEqual(ctx.pseudowords, [], "compare context must route through resolver and return []");

  const draft = await generateLessonDraft(ctx, { recordDecision: async (_ctx, fn) => (await fn()).output });
  assert.deepEqual(draft.morphology, morphology);
  const draftAudit = auditGeneratedLessonDraft(draft);
  assert.equal(draftAudit.canPersist, true, draftAudit.blockers.join("\n"));
  assert.equal(checkResult(draft, "LESSON_MORPHOLOGY_TARGET_COVERAGE"), "PASS");
  assert.equal(checkResult(draft, "LESSON_PART3_PSEUDOWORD_COUNT"), "PASS");

  const content = phase3EntryLessonContentFor(TARGET_CODE);
  const fullAudit = auditPassage(content.fullAuditPassageText!, passageContext(ctx));
  const shortAudit = auditPassage(content.mockPassageText, passageContext(ctx));
  assert.equal(fullAudit.passesAuditGate, true, `${TARGET_CODE} full passage must pass audit`);
  assert.equal(shortAudit.unclassifiedWords.length, 0, `${TARGET_CODE} short passage must classify cleanly`);
  assert.equal(shortAudit.blockedPatternViolations.length, 0, `${TARGET_CODE} short passage must have no blocked patterns`);
  assert.equal(shortAudit.quality.passesQualityGate, true, `${TARGET_CODE} short passage must pass quality audit`);
  assertStyleSweep(content);

  const part1 = generatePart1Warmup(ctx);
  assert.deepEqual(part1.contentJson.warmupWords, ["lake", "home", "bike", "cube", "gate", "five"]);
  assert.equal(auditGeneratedLessonDraft({ ...draft, parts: replacePart(draft, 1, part1) }).checks.find((check) => check.ruleId === "LESSON_WARMUP_NO_TODAY_PATTERN")?.result, "PASS");

  const part2 = generatePart2Concept(ctx);
  assert.deepEqual(part2.contentJson.morphologyJson, content.morphologyJson, "Part 2 must mirror content morphologyJson through the real producer path");
  assert.equal(part2.contentJson.demoMode, "transformation_pairs");

  const part3 = draft.parts.find((part) => part.partNumber === 3);
  const pseudowordLine = (part3?.contentJson.contrastiveLines as Array<{ role: string; words: string[] }>).find((line) => line.role === "target_pseudowords");
  assert(pseudowordLine, "Part 3 must include target_pseudowords line");
  assert.deepEqual(pseudowordLine.words, []);

  const part7 = draft.parts.find((part) => part.partNumber === 7);
  assert.equal(part7?.contentJson.passageText, content.fullAuditPassageText, "Part 7 must render fullAuditPassageText for Phase 4");

  const evidenceRows = assertMorphologyEvidence(fullAudit.words);
  const bareRows = assertBareStemReview(fullAudit.words);
  const adversarialRows = assertAdversarialFixtures(draft, morphology);
  const coverageRows = assertDegenerateCoverage(draft);
  const priorRows = await assertPriorTargetsUnchanged();
  assertOracleIntegrity();

  printTable("target | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage", [[
    TARGET_CODE,
    String(fullAudit.wordCount),
    fullAudit.decodabilityScore.toFixed(3),
    String(fullAudit.unclassifiedCount),
    String(fullAudit.blockedPatternViolations.length),
    String(fullAudit.quality.repeatedTrigrams.length),
    String(fullAudit.passesAuditGate).toUpperCase(),
    String(draftAudit.canPersist).toUpperCase(),
    checkResult(draft, "LESSON_MORPHOLOGY_TARGET_COVERAGE"),
  ]]);
  printTable("resolver | target | result", [[TARGET_CODE, "canonicalPseudowordsForTargetPatterns", JSON.stringify(ctx.pseudowords)]]);
  printTable("morphology evidence | surface | base | suffix | rule", evidenceRows);
  printTable("bare stem review | surface | morphology | result", bareRows);
  printTable("adversarial | fixture | result", adversarialRows);
  printTable("coverage regression | detail | result", coverageRows);
  printTable("producer path | assertion | result", [
    ["Part 1 warmup override", JSON.stringify(part1.contentJson.warmupWords), "PASS"],
    ["Part 2 morphologyJson mirror", JSON.stringify(part2.contentJson.morphologyJson), "PASS"],
    ["Part 3 target_pseudowords", JSON.stringify(pseudowordLine.words), "PASS"],
    ["Part 7 fullAuditPassageText", content.fullAuditPassageTitle ?? "", "PASS"],
  ]);
  printTable("prior target invariance | probe | result", priorRows);
  console.log("ORACLE INTEGRITY | PASS | zero new caveats, no validator-valid fallback, existing caveats unchanged");
  console.log("content-v3 Phase 4 Morphology compare checks passed");
}

function assertMorphologyEvidence(words: WordAuditEntry[]) {
  const rows: string[][] = [];
  for (const surface of ["faster", "fastest", "softer", "softest", "slower", "slowest", "thicker", "thickest", "fresher"]) {
    const entries = words.filter((entry) => entry.word.toLowerCase() === surface);
    assert(entries.length > 0, `Expected ${surface} in full passage audit`);
    const evidence = entries.find((entry) => entry.morphology?.rule === "compare");
    assert(evidence, `${surface} must audit as compare`);
    rows.push([surface, evidence.morphology?.base ?? "", evidence.morphology?.suffix ?? "", evidence.morphology?.rule ?? ""]);
  }
  return rows;
}

function assertBareStemReview(words: WordAuditEntry[]) {
  const rows: string[][] = [];
  for (const surface of ["fast", "soft", "slow", "thick", "fresh"]) {
    const entries = words.filter((entry) => entry.word.toLowerCase() === surface);
    assert(entries.length > 0, `Expected bare stem ${surface} in full passage audit`);
    assert(entries.every((entry) => entry.morphology?.rule !== "compare"), `${surface} must not count as compare evidence`);
    rows.push([surface, "not compare", "PASS"]);
  }
  return rows;
}

function assertAdversarialFixtures(draft: GeneratedLessonDraft, morphology: MorphologyAnalyzerConfig) {
  const rows: string[][] = [];
  for (const word of ["after", "teacher", "bigger", "nicer"]) {
    assert.equal(decomposeInflectedWord(word, morphology), null, `${word} must not decompose as compare`);
  }
  const afterTeacher = injectPassage(draft, "The faster cat ran after the teacher.");
  assert.equal(checkResult(afterTeacher, "LESSON_PHASE3_NO_RCONTROLLED"), "FAIL");
  rows.push(["after/teacher", "LESSON_PHASE3_NO_RCONTROLLED FAIL + null decomposition", "PASS"]);

  const biggerNicer = injectPassage(draft, "The bigger cat sat on a nicer mat.");
  assert.equal(checkResult(biggerNicer, "LESSON_PHASE3_NO_RCONTROLLED"), "FAIL");
  rows.push(["bigger/nicer", "LESSON_PHASE3_NO_RCONTROLLED FAIL + null decomposition", "PASS"]);
  return rows;
}

function assertDegenerateCoverage(draft: GeneratedLessonDraft) {
  const degenerate = mutateDraftForBareStemsOnly(draft);
  const result = checkResult(degenerate, "LESSON_MORPHOLOGY_TARGET_COVERAGE");
  assert.equal(result, "FAIL", "bare-stem-only evidence must fail morphology coverage");
  return [["bare stems only", "fast, soft, slow, thick, fresh", result]];
}

async function assertPriorTargetsUnchanged() {
  const priorTargets = CONTENT_V3_DAILY_TARGETS.filter((target) => target.code !== TARGET_CODE);
  assert.equal(priorTargets.length, 29, "Exactly 29 prior targets should remain before morph_compare_no_change");
  const rows: string[][] = [];
  for (const target of priorTargets) {
    const draft = await generateLessonDraft(lessonContext(target.code), { recordDecision: async (_ctx, fn) => (await fn()).output });
    if (target.code === "morph_drop_e") {
      assert.equal(draft.morphology?.rule, "drop_e");
    } else if (target.code === "morph_double") {
      assert.equal(draft.morphology?.rule, "double");
    } else if (target.code === "morph_y_to_i") {
      assert.equal(draft.morphology?.rule, "y_to_i");
    } else {
      assert.equal(draft.morphology, undefined, `${target.code} should not opt into morphology`);
    }
  }
  rows.push(["prior target count", String(priorTargets.length), "PASS"]);
  rows.push(["prior morphology opt-in states", "drop_e/double/y_to_i unchanged; non-morph undefined", "PASS"]);
  return rows;
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing content-v3 target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = phasePositionFor(targetCode);
  const dailyTarget = { id: `target-${targetCode}`, ...seedTarget, targetPatternsJson: seedTarget.targetPatternsJson as any };
  const targetPatterns = targetPatternsFor(seedTarget);
  const pseudowordPatterns = pseudowordPatternsFor(seedTarget, targetPatterns);
  const morphology = morphologyConfigFromTargetPatternsJson(dailyTarget.targetPatternsJson);
  const pseudowords = canonicalPseudowordsForTargetPatterns(
    dailyTarget.code,
    dailyTarget.exampleNonwords,
    targetPatterns,
    "content-v3 lesson seed",
    pseudowordPatterns,
    { allowNoPseudowords: morphology?.rule === "compare" },
  );
  if (targetCode === TARGET_CODE) assert.deepEqual(pseudowords, []);
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
    pseudowords,
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
  const isPhase4MorphologyYToI = PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS.some((target) => target.code === targetCode);
  const isPhase4MorphologyCompare = PHASE_4_MORPHOLOGY_COMPARE_TARGETS.some((target) => target.code === targetCode);
  const isPhase4 = isPhase4Entry || isPhase4Mid || isPhase4RControlled || isPhase4Diphthong || isPhase4TeamsCleanup || isPhase4Morphology || isPhase4MorphologyYToI || isPhase4MorphologyCompare;
  return {
    id: isPhase4MorphologyCompare ? "phase-4-morphology-compare" : isPhase4MorphologyYToI ? "phase-4-morphology-y-to-i" : isPhase4Morphology ? "phase-4-morphology" : isPhase4TeamsCleanup ? "phase-4-teams-cleanup" : isPhase4Diphthong ? "phase-4-diphthong" : isPhase4RControlled ? "phase-4-rcontrolled" : isPhase4Mid ? "phase-4-mid" : isPhase4Entry ? "phase-4-entry" : isMid ? "phase-3-mid" : "phase-3-entry",
    phaseNumber: isPhase4 ? 4 : 3,
    label: isPhase4MorphologyCompare ? "Phase 4 Morphology Compare" : isPhase4MorphologyYToI ? "Phase 4 Morphology y to i" : isPhase4Morphology ? "Phase 4 Morphology Entry A" : isPhase4TeamsCleanup ? "Phase 4 Teams Cleanup" : isPhase4Diphthong ? "Phase 4 Diphthong Entry" : isPhase4RControlled ? "Phase 4 R-Controlled Entry" : isPhase4Mid ? "Phase 4 Mid" : isPhase4Entry ? "Phase 4 Entry" : isMid ? "Phase 3 Mid" : "Phase 3 Entry",
  };
}

function passageContext(ctx: LessonGeneratorContext) {
  return {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
    vocabularyAllowlist: ctx.vocabularyWords,
  };
}

function requiredMorphology(ctx: LessonGeneratorContext): MorphologyAnalyzerConfig {
  const morphology = morphologyConfigFromTargetPatternsJson(ctx.dailyTarget.targetPatternsJson);
  assert(morphology, `${ctx.dailyTarget.code} requires morphologyJson`);
  return morphology;
}

function injectPassage(draft: GeneratedLessonDraft, sentence: string): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) => {
      if (part.partNumber === 7) {
        return { ...part, contentJson: { ...part.contentJson, passageText: `${part.contentJson.passageText} ${sentence}` } };
      }
      return part;
    }),
  };
}

function mutateDraftForBareStemsOnly(draft: GeneratedLessonDraft): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) => {
      if (part.partNumber === 2) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            demonstrationPairs: [
              { base: "fast", target: "fast" },
              { base: "soft", target: "soft" },
              { base: "slow", target: "slow" },
            ],
          },
        };
      }
      if (part.partNumber === 3) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            contrastiveLines: [
              { lineNumber: 1, role: "target_real_words", words: ["fast", "soft", "slow", "thick", "fresh"] },
              { lineNumber: 2, role: "contrastive_target_vs_review", words: ["fast", "soft", "slow", "thick", "fresh"] },
              { lineNumber: 3, role: "cumulative_review", words: ["fast", "soft", "slow", "thick", "fresh"] },
              { lineNumber: 4, role: "target_pseudowords", words: [] },
            ],
          },
        };
      }
      if (part.partNumber === 5) {
        return { ...part, contentJson: { ...part.contentJson, sentences: ["The fast cat sat.", "The slow slug sat."] } };
      }
      if (part.partNumber === 6) {
        return { ...part, contentJson: { ...part.contentJson, dictatedWords: ["fast", "soft", "slow", "thick", "fresh", "tall"] } };
      }
      if (part.partNumber === 7) {
        return { ...part, contentJson: { ...part.contentJson, passageText: "The fast cat sat. The soft mat sat. The slow slug sat." } };
      }
      return part;
    }),
  };
}

function checkResult(draft: GeneratedLessonDraft, ruleId: string) {
  const checks = auditGeneratedLessonDraft(draft).checks.filter((entry) => entry.ruleId === ruleId);
  assert(checks.length > 0, `Missing ${ruleId}`);
  return checks.some((entry) => entry.result === "FAIL") ? "FAIL" : checks[0].result;
}

function replacePart(draft: GeneratedLessonDraft, partNumber: number, replacement: GeneratedLessonDraft["parts"][number]) {
  return draft.parts.map((part) => part.partNumber === partNumber ? replacement : part);
}

function assertStyleSweep(content: { sentences: string[]; fullAuditPassageText?: string; mockPassageText: string }) {
  const text = [content.sentences.join(" "), content.mockPassageText, content.fullAuditPassageText ?? ""].join(" ").toLowerCase();
  for (const banned of ["after", "teacher", "bigger", "nicer", "dampest", "longer", "longest"]) {
    assert(!new RegExp(`\\b${banned}\\b`).test(text), `${TARGET_CODE} must not use ${banned}`);
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

function assertOracleIntegrity() {
  const conformanceSource = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  const validatorSource = fs.readFileSync("lib/literacy/pseudowordValidator.ts", "utf8");
  assert.equal(conformanceSource.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.equal(validatorSource.includes("|| validation.valid"), false, "validator must not contain a validator-valid fallback");
  assert.match(conformanceSource, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(conformanceSource, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
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
