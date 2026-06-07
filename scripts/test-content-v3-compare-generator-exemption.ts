import assert from "assert/strict";
import { CONTENT_V3_DAILY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import {
  canonicalPseudowordsForTarget,
  canonicalPseudowordsForTargetPatterns,
} from "../lib/literacy/lessonGenerator";
import { generatePart3Decoding } from "../lib/literacy/lessonParts/part3Decoding";
import type { GeneratedLessonPart, LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { morphologyConfigFromTargetPatternsJson, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";

const COMPARE_MORPHOLOGY: MorphologyAnalyzerConfig = {
  rule: "compare",
  stemPatterns: ["closed_short_a", "closed_short_e", "closed_short_i", "closed_short_o", "team_ow"],
  suffixes: ["er", "est"],
  comparativeStems: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
};

const COMPARE_TARGET_PATTERNS_JSON = {
  patterns: COMPARE_MORPHOLOGY.stemPatterns,
  pseudowordPatterns: [],
  morphologyJson: COMPARE_MORPHOLOGY,
};

function main() {
  const rows: string[][] = [];

  const morphology = morphologyConfigFromTargetPatternsJson(COMPARE_TARGET_PATTERNS_JSON);
  assert.equal(morphology?.rule, "compare");
  const compareResolved = canonicalPseudowordsForTargetPatterns(
    "morph_compare_no_change",
    [],
    COMPARE_MORPHOLOGY.stemPatterns,
    "content-v3 lesson seed",
    [],
    { allowNoPseudowords: morphology?.rule === "compare" },
  );
  assert.deepEqual(compareResolved, []);
  rows.push(["compare exemption", "empty seed + empty pseudowordPatterns", "[]"]);

  assert.throws(
    () => canonicalPseudowordsForTargetPatterns("non_compare_empty", [], ["a_e"], "content-v3 lesson seed", ["a_e"]),
    /fewer than 8 valid pseudowords/,
  );
  assert.throws(
    () => canonicalPseudowordsForTargetPatterns("non_compare_short", ["zake"], ["a_e"], "content-v3 lesson seed", ["a_e"]),
    /fewer than 8 valid pseudowords/,
  );
  rows.push(["non-compare contract", "empty/<8 seed", "THROWS"]);

  assert.throws(
    () => canonicalPseudowordsForTargetPatterns("compare_misconfigured_patterns", [], COMPARE_MORPHOLOGY.stemPatterns, "content-v3 lesson seed", ["closed_short_a"], { allowNoPseudowords: true }),
    /fewer than 8 valid pseudowords/,
  );
  assert.throws(
    () => canonicalPseudowordsForTargetPatterns("compare_misconfigured_seed", ["zat"], COMPARE_MORPHOLOGY.stemPatterns, "content-v3 lesson seed", [], { allowNoPseudowords: true }),
    /fewer than 8 valid pseudowords/,
  );
  rows.push(["both-empty guard", "non-empty seed or pseudowordPatterns", "THROWS"]);

  assert.deepEqual(
    canonicalPseudowordsForTarget("a_e", ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"]),
    ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"],
  );
  rows.push(["canonicalPseudowordsForTarget", "Phase 3 Entry a_e", "BYTE-IDENTICAL"]);

  const realPath = assertRealPathSmoke(compareResolved);
  rows.push(["real-path smoke", "Part 3 target_pseudowords line", realPath.emptyLine ? "EMPTY" : "NOT_EMPTY"]);
  rows.push(["real-path smoke", "LESSON_PART3_PSEUDOWORD_COUNT", realPath.countCheck]);

  const invariantCount = assertExistingTargetsUnchanged();
  rows.push(["29-target invariance", `${invariantCount} current targets`, "PASS"]);

  printTable("check | fixture | result", rows);
  console.log(">=8-pseudoword contract unchanged for all non-compare targets; canonicalPseudowordsForTarget byte-identical");
  console.log("content-v3 compare no-pseudoword generator exemption checks passed");
}

function assertRealPathSmoke(pseudowords: string[]) {
  const ctx = compareLessonContext(pseudowords);
  const part3 = generatePart3Decoding(ctx);
  const lines = part3.contentJson.contrastiveLines as Array<{ role: string; words: string[] }>;
  assert.equal(lines.length, 4);
  const pseudowordLine = lines.find((line) => line.role === "target_pseudowords");
  assert(pseudowordLine, "Part 3 must include the target_pseudowords line");
  assert.deepEqual(pseudowordLine.words, []);

  const draft = compareDraft(ctx, part3);
  const audit = auditGeneratedLessonDraft(draft);
  const countCheck = audit.checks.find((check) => check.ruleId === "LESSON_PART3_PSEUDOWORD_COUNT");
  assert.equal(countCheck?.result, "PASS");
  return { emptyLine: pseudowordLine.words.length === 0, countCheck: countCheck.result };
}

function assertExistingTargetsUnchanged() {
  let count = 0;
  for (const target of CONTENT_V3_DAILY_TARGETS) {
    const morphology = morphologyConfigFromTargetPatternsJson(target.targetPatternsJson);
    assert.notEqual(morphology?.rule, "compare", `${target.code} must not opt into compare yet`);
    const targetPatterns = targetPatternsFor(target);
    const pseudowordPatterns = pseudowordPatternsFor(target, targetPatterns);
    const resolved = canonicalPseudowordsForTargetPatterns(
      target.code,
      target.exampleNonwords,
      targetPatterns,
      "content-v3 lesson seed",
      pseudowordPatterns,
      { allowNoPseudowords: morphology?.rule === "compare" },
    );
    assert.deepEqual(resolved, target.exampleNonwords.slice(0, 8), `${target.code} pseudoword resolution changed`);
    count += 1;
  }
  assert.equal(count, 29);
  return count;
}

function compareLessonContext(pseudowords: string[]): LessonGeneratorContext {
  return {
    phasePosition: { id: "phase-4-compare", phaseNumber: 4, label: "Phase 4 Compare" },
    dailyTarget: {
      id: "target-compare",
      code: "morph_y_to_i",
      kidVisibleLabel: "compare words",
      tutorLabel: "suffix -er/-est compare",
      targetPatternsJson: COMPARE_TARGET_PATTERNS_JSON as any,
      allowedPatternCodes: [],
      blockedPatternCodes: [],
      exampleWords: ["fast", "tall", "slow", "soft", "fresh"],
      exampleNonwords: [],
    },
    targetPattern: "morph_compare_no_change",
    targetPatterns: COMPARE_MORPHOLOGY.stemPatterns,
    pseudowordPatterns: [],
    targetWords: ["fast", "tall", "slow", "soft", "fresh"],
    reviewWords: [],
    pseudowords,
    heartWordsPreviewedThisLesson: [],
    heartWordsAssumedKnown: [],
    vocabularyWords: [],
  };
}

function compareDraft(ctx: LessonGeneratorContext, part3: GeneratedLessonPart): GeneratedLessonDraft {
  return {
    phasePositionId: ctx.phasePosition.id,
    dailyTargetId: ctx.dailyTarget.id,
    phaseBand: ctx.phasePosition.phaseNumber,
    dailyTargetCode: "morph_compare_no_change",
    targetPattern: "morph_compare_no_change",
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    morphology: COMPARE_MORPHOLOGY,
    parts: [
      part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: ["cat", "bed", "sit", "hop", "cup"] }, tags(["cat", "bed", "sit", "hop", "cup"])),
      part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
        demoMode: "transformation_pairs",
        demonstrationPairs: [
          { base: "fast", target: "faster" },
          { base: "tall", target: "tallest" },
          { base: "slow", target: "slower" },
        ],
        conceptExamples: ["fast", "tall", "slow"],
        morphologyJson: COMPARE_MORPHOLOGY,
      }, tags(["fast", "faster", "tall", "tallest", "slow", "slower"])),
      part3,
      part(4, "High-utility word / vocabulary", "HFW_VOCAB", { heartWordsPreviewedThisLesson: [], heartWordsAssumedKnown: [] }),
      part(5, "Sentence reading", "SENTENCE_READING", { sentences: ["The faster fox sat.", "The tallest dog ran."], unclassifiedWords: [] }, tags(["the", "faster", "fox", "sat", "the", "tallest", "dog", "ran"])),
      part(6, "Encoding / spelling", "ENCODING_SPELLING", {
        dictatedWords: ["faster", "fastest", "taller", "tallest", "slower", "slowest"],
        dictatedSentences: ["The faster fox ran.", "The tallest dog sat."],
      }, tags(["faster", "fastest", "taller", "tallest", "slower", "slowest"])),
      part(7, "Connected text", "CONNECTED_TEXT_READING", { passageText: "The faster fox ran. The tallest dog sat.", heartWordsUsedInConnectedText: [] }, tags(["the", "faster", "fox", "ran", "the", "tallest", "dog", "sat"]), { unclassifiedWords: [] }, true, false),
      part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What did the fox do?", questionType: "literal" }] }),
    ],
  };
}

function part(
  partNumber: number,
  partLabel: string,
  partType: string,
  contentJson: Record<string, unknown>,
  wordTagsJson: Record<string, unknown> = { words: [] },
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
    wordTagsJson,
    scoringRubricJson: {},
    studentDisplayMode: "TEXT",
    responseMode: "speech_response",
    assistedModeAllowed,
    independentScoreEligible,
  };
}

function tags(words: string[]) {
  return { words: words.map((word) => ({ word, tag: "target" })) };
}

function targetPatternsFor(target: { code: string; targetPatternsJson: unknown }) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [target.code];
}

function pseudowordPatternsFor(target: { targetPatternsJson: unknown }, fallback: string[]) {
  const json = target.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { pseudowordPatterns?: unknown }).pseudowordPatterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return fallback;
}

function printTable(header: string, rows: string[][]) {
  console.log(header);
  console.log(header.split("|").map(() => "---").join("|"));
  for (const row of rows) console.log(row.join(" | "));
}

main();
