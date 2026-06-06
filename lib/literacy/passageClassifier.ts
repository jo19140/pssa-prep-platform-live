import { tokenizePassage } from "./passageTokenizer";
import { PATTERN_REGISTRY, wordMatchesRegisteredPattern, type PatternMatchOptions } from "./patternRegistry";
import { decomposeInflectedWord, type MorphologyAnalysis, type MorphologyAnalyzerConfig } from "./morphologyAnalyzer";

export type WordCategory = "target" | "prerequisite" | "heart" | "vocabulary" | "unclassified";

export type WordAuditEntry = {
  word: string;
  category: WordCategory;
  matchedPattern?: string;
  morphology?: MorphologyAnalysis;
};

export type BlockedPatternViolation = {
  word: string;
  patternCode: string;
};

export type PassageClassificationContext = {
  targetPatternCodes: string[];
  allowedPatternCodes: string[];
  blockedPatternCodes: string[];
  heartWords: string[];
  vocabularyAllowlist: string[];
  morphology?: MorphologyAnalyzerConfig;
};

export type PassageClassification = {
  words: WordAuditEntry[];
  targetWords: string[];
  prerequisiteWords: string[];
  heartWords: string[];
  vocabularyWords: string[];
  unclassifiedWords: string[];
  blockedPatternViolations: BlockedPatternViolation[];
  classifiedCount: number;
  wordCount: number;
  decodabilityScore: number;
};

const CLOSED_SHORT_WORDS = new Set([
  "a", "am", "an", "and", "as", "at", "bad", "bag", "bed", "big", "but", "can", "cat", "did", "dog", "get", "had", "has", "him", "his", "hot", "in", "is", "it", "let", "lot", "mad", "map", "met", "mom", "not", "on", "pen", "pig", "ran", "red", "run", "sat", "set", "sit", "sun", "ten", "the", "this", "up", "us", "yes",
]);

export function classifyPassageWords(text: string, context: PassageClassificationContext): PassageClassification {
  const heartSet = setOf(context.heartWords);
  const vocabularySet = setOf(context.vocabularyAllowlist);
  const words = tokenizePassage(text).map((word) => classifyWord(word, context, heartSet, vocabularySet));
  const blockedPatternViolations: BlockedPatternViolation[] = [];

  for (const entry of words) {
    if (entry.category === "heart" || entry.category === "target" || entry.category === "vocabulary") continue;
    for (const patternCode of context.blockedPatternCodes) {
      if (wordMatchesPattern(entry.word, patternCode)) {
        blockedPatternViolations.push({ word: entry.word, patternCode });
      }
    }
  }

  const byCategory = (category: WordCategory) => words.filter((entry) => entry.category === category).map((entry) => entry.word);
  const classifiedCount = words.filter((entry) => entry.category !== "unclassified").length;
  const wordCount = words.length;
  return {
    words,
    targetWords: byCategory("target"),
    prerequisiteWords: byCategory("prerequisite"),
    heartWords: byCategory("heart"),
    vocabularyWords: byCategory("vocabulary"),
    unclassifiedWords: byCategory("unclassified"),
    blockedPatternViolations,
    classifiedCount,
    wordCount,
    decodabilityScore: wordCount === 0 ? 0 : classifiedCount / wordCount,
  };
}

function classifyWord(word: string, context: PassageClassificationContext, heartSet: Set<string>, vocabularySet: Set<string>): WordAuditEntry {
  if (word.includes("_")) return { word, category: "unclassified" };
  if (heartSet.has(word)) return { word, category: "heart" };
  // In a morphology lesson, decompose suffixed forms BEFORE the direct pattern match.
  // Otherwise a no-change -s/-es form (runs, hops) that still scans as a single closed
  // syllable short-circuits to a plain closed_short target and loses its morphology
  // annotation (rule "none"), making it indistinguishable from real target evidence.
  // Bare stems carry no suffix, so decomposition returns null and they fall through.
  // Opt-in: with no morphology context this block is skipped (behavior unchanged).
  if (context.morphology) {
    const analysis = decomposeInflectedWord(word, context.morphology);
    if (analysis) return { word, category: "target", matchedPattern: analysis.basePattern, morphology: analysis };
  }
  const targetPattern = context.targetPatternCodes.find((code) => wordMatchesPattern(word, code));
  if (targetPattern) return { word, category: "target", matchedPattern: targetPattern };
  const prerequisitePattern = context.allowedPatternCodes.find((code) => wordMatchesPattern(word, code));
  if (prerequisitePattern || CLOSED_SHORT_WORDS.has(word)) return { word, category: "prerequisite", matchedPattern: prerequisitePattern };
  if (vocabularySet.has(word)) return { word, category: "vocabulary" };
  return { word, category: "unclassified" };
}

export function wordMatchesPattern(word: string, patternCode: string, opts: PatternMatchOptions = {}): boolean {
  const normalized = word.toLowerCase();
  const silentE = patternCode.match(/^([aeiou])_e$/);
  if (silentE) {
    const vowel = silentE[1];
    return new RegExp(`^[a-z]*${vowel}[bcdfghjklmnpqrstvwxyz]+e$`).test(normalized);
  }
  if (/^closed_short_[aeiou]$/.test(patternCode)) {
    const vowel = patternCode.at(-1);
    return Boolean(vowel && new RegExp(`^[bcdfghjklmnpqrstvwxyz]*${vowel}[bcdfghjklmnpqrstvwxyz]+$`).test(normalized));
  }
  if (patternCode === "ai" || patternCode === "ay" || patternCode === "oa" || patternCode === "ee" || patternCode === "ea" || patternCode === "igh" || patternCode === "ow" || patternCode === "ue" || patternCode === "ew") {
    return normalized.includes(patternCode);
  }
  if (PATTERN_REGISTRY[patternCode]) {
    return wordMatchesRegisteredPattern(normalized, patternCode, opts);
  }
  return false;
}

function setOf(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase()));
}
