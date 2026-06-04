import assert from "assert/strict";
import { CONTENT_V3_DAILY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { wordMatchesPattern } from "../lib/literacy/passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { GeneratedLessonPart } from "../lib/literacy/lessonParts/types";

type Pair = { closed: string; target: string };

function main() {
  assertRControlledAdmissionMatrix();
  assertPhonemeHonesty();
  assertPseudowordValidation();
  assertPart2PairRules();
  assertPart2RControlledTargetScoping();

  console.log("content-v3 r-controlled engine checks passed");
  console.log("context | admitted | rejected");
  console.log("--- | --- | ---");
  console.log("non-r a_e | none | car, horn, her, bird, turn");
  console.log("r_ar | car, park, farm | horn, her, bird, turn");
  console.log("r_or | horn, fork, storm | car, park, her, bird, turn");
  console.log("r_er/r_ir/r_ur | her, bird, turn | car, horn");
  console.log("pseudowords | zarb, vorm, nerb, jirt, murb valid | barn, herd, toast rejected as real words");
  console.log("Part 2 pairs | cat/cart, ten/tern, fist/first, cub/curb, cap/cape, pan/pain pass | cat/part, cat/cape, pat/pain fail");
}

function assertRControlledAdmissionMatrix() {
  const probe = ["car", "horn", "her", "bird", "turn"];
  assert.deepEqual(rViolations(draftFor({ patterns: ["a_e"], part5Sentences: probe })), probe);

  assert.deepEqual(rViolations(draftFor({ patterns: ["r_ar"], part5Sentences: ["car", "park", "farm"] })), []);
  assert.deepEqual(rViolations(draftFor({ patterns: ["r_ar"], part5Sentences: ["horn", "her", "bird", "turn"] })), ["horn", "her", "bird", "turn"]);

  assert.deepEqual(rViolations(draftFor({ patterns: ["r_or"], part5Sentences: ["horn", "fork", "storm"] })), []);
  assert.deepEqual(rViolations(draftFor({ patterns: ["r_or"], part5Sentences: ["car", "park", "her", "bird", "turn"] })), ["car", "park", "her", "bird", "turn"]);

  assert.deepEqual(rViolations(draftFor({ patterns: ["r_er", "r_ir", "r_ur"], part5Sentences: ["her", "bird", "turn"] })), []);
  assert.deepEqual(rViolations(draftFor({ patterns: ["r_er", "r_ir", "r_ur"], part5Sentences: ["car", "horn"] })), ["car", "horn"]);
}

function assertPhonemeHonesty() {
  assert.equal(wordMatchesPattern("warm", "r_ar", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("word", "r_or", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("work", "r_or", { strictPhonemeLexicon: true }), false);
}

function assertPseudowordValidation() {
  assertValidPseudoword("zarb", "r_ar", "Z AA R B");
  assertValidPseudoword("vorm", "r_or", "V AO R M");
  assertValidPseudoword("nerb", "r_er", "N ER B");
  assertValidPseudoword("jirt", "r_ir", "JH ER T");
  assertValidPseudoword("murb", "r_ur", "M ER B");
  assertInvalidRealWord("barn", "r_ar");
  assertInvalidRealWord("herd", "r_er");
  assertInvalidRealWord("toast", "team_oa");

  for (const target of CONTENT_V3_DAILY_TARGETS) {
    const pseudowordPatterns = pseudowordPatternsFor(target);
    for (const word of target.exampleNonwords) {
      const selected = selectPseudowordPattern(word, pseudowordPatterns);
      assert(selected, `${target.code}/${word} should detect to ${pseudowordPatterns.join(", ")}`);
      const result = validatePseudowordCandidate(word, selected, { strictLexicon: true });
      assert.equal(result.valid, true, `${target.code}/${word} should remain valid: ${result.reason ?? result.issues.join("; ")}`);
    }
  }
}

function assertPart2PairRules() {
  assertPairPass(["r_ar"], { closed: "cat", target: "cart" });
  assertPairPass(["r_er"], { closed: "ten", target: "tern" });
  assertPairPass(["r_ir"], { closed: "fist", target: "first" });
  assertPairPass(["r_ur"], { closed: "cub", target: "curb" });
  assertPairFail(["r_ar"], { closed: "cat", target: "part" });

  assertPairPass(["a_e"], { closed: "cap", target: "cape" });
  assertPairPass(["team_ai"], { closed: "pan", target: "pain" });
  assertPairFail(["a_e"], { closed: "cat", target: "cape" });
  assertPairFail(["team_ai"], { closed: "pat", target: "pain" });
}

function assertPart2RControlledTargetScoping() {
  assert.equal(namedRCheck(draftFor({ patterns: ["r_ar"], pairs: [{ closed: "cat", target: "cart" }] })).result, "PASS");
  assert.equal(namedRCheck(draftFor({ patterns: ["r_ar"], pairs: [{ closed: "got", target: "corn" }] })).result, "FAIL");
  assert.equal(namedRCheck(draftFor({ patterns: ["r_er", "r_ir", "r_ur"], pairs: [{ closed: "cat", target: "cart" }] })).result, "FAIL");
  assert.equal(namedRCheck(draftFor({ patterns: ["r_ar"], pairs: [{ closed: "car", target: "cart" }] })).result, "FAIL");
}

function assertValidPseudoword(word: string, pattern: string, phonemes: string) {
  const result = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
  assert.equal(result.valid, true, `${word}/${pattern} should validate: ${result.reason ?? result.issues.join("; ")}`);
  assert(result.expectedPronunciation.includes(phonemes), `${word}/${pattern} should decode to ${phonemes}; got ${result.expectedPronunciation}`);
}

function assertInvalidRealWord(word: string, pattern: string) {
  const result = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
  assert.equal(result.valid, false, `${word}/${pattern} should be invalid`);
  assert.equal(result.collidesWith, word);
  assert.match(result.reason ?? "", /pseudoword is a real word/);
}

function assertPairPass(patterns: string[], pair: Pair) {
  assert.equal(part2DemoCheck(draftFor({ patterns, pairs: [pair] })).result, "PASS", `${pair.closed}/${pair.target} should pass for ${patterns.join(", ")}`);
}

function assertPairFail(patterns: string[], pair: Pair) {
  assert.equal(part2DemoCheck(draftFor({ patterns, pairs: [pair] })).result, "FAIL", `${pair.closed}/${pair.target} should fail for ${patterns.join(", ")}`);
}

function rViolations(draft: GeneratedLessonDraft) {
  return auditGeneratedLessonDraft(draft).checks
    .filter((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED" && entry.result === "FAIL")
    .flatMap((entry) => entry.evidence?.match(/: (.+)$/)?.[1]?.split(", ") ?? [])
    .filter(Boolean);
}

function part2DemoCheck(draft: GeneratedLessonDraft) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_PART2_DEMO_MODE_VALID");
  assert(found, "Missing LESSON_PART2_DEMO_MODE_VALID check");
  return found;
}

function namedRCheck(draft: GeneratedLessonDraft) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET");
  assert(found, "Missing LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET check");
  return found;
}

function draftFor(opts: {
  patterns: string[];
  pairs?: Pair[];
  part3RealWords?: string[];
  part3Pseudowords?: string[];
  part5Sentences?: string[];
  part6Words?: string[];
  part6Sentences?: string[];
  part7Text?: string;
}): GeneratedLessonDraft {
  const pairs = opts.pairs ?? [];
  const targetWords = pairs.map((pair) => pair.target);
  const patterns = opts.patterns;
  const dailyTargetCode = patterns.join("_");
  const parts: GeneratedLessonPart[] = [
    part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: [] }),
    part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
      demoMode: "minimal_pairs",
      demonstrationPairs: pairs,
      conceptExamples: targetWords,
    }),
    part(3, "Word-level decoding", "WORD_LEVEL_DECODING", {
      contrastiveLines: [
        { lineNumber: 1, role: "target_real_words", words: opts.part3RealWords ?? [] },
        { lineNumber: 2, role: "contrastive_target_vs_review", words: [] },
        { lineNumber: 3, role: "cumulative_review", words: [] },
        { lineNumber: 4, role: "target_pseudowords", words: opts.part3Pseudowords ?? [] },
      ],
    }),
    part(4, "High-utility word / vocabulary", "HFW_VOCAB", { heartWordsPreviewedThisLesson: [], heartWordsAssumedKnown: [] }),
    part(5, "Sentence reading", "SENTENCE_READING", { sentences: opts.part5Sentences ?? [] }),
    part(6, "Encoding / spelling", "ENCODING_SPELLING", { dictatedWords: opts.part6Words ?? [], dictatedSentences: opts.part6Sentences ?? [] }),
    part(7, "Connected text", "CONNECTED_TEXT_READING", { passageText: opts.part7Text ?? "", heartWordsUsedInConnectedText: [] }, { unclassifiedWords: [] }, true, false),
    part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What happened in the story?" }] }),
  ];
  return {
    phasePositionId: "phase-4-r-test",
    dailyTargetId: `target-${dailyTargetCode}`,
    phaseBand: 4,
    dailyTargetCode,
    targetPattern: patterns[0],
    targetPatterns: patterns,
    pseudowordPatterns: patterns,
    parts,
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
    assistedModeAllowed,
    independentScoreEligible,
  };
}

function pseudowordPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { pseudowordPatterns?: unknown; patterns?: unknown }).pseudowordPatterns ?? (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [seedTarget.code];
}

function selectPseudowordPattern(word: string, orderedPatterns: string[]) {
  const candidates = detectPatternCandidates(word);
  return orderedPatterns.find((pattern) => candidates.includes(pattern)) ?? null;
}

main();
