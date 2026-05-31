import { tokenizePassage } from "./passageTokenizer";

export type WordCategory = "target" | "prerequisite" | "heart" | "vocabulary" | "unclassified";

export type WordAuditEntry = {
  word: string;
  category: WordCategory;
  matchedPattern?: string;
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
  if (heartSet.has(word)) return { word, category: "heart" };
  const targetPattern = context.targetPatternCodes.find((code) => wordMatchesPattern(word, code));
  if (targetPattern) return { word, category: "target", matchedPattern: targetPattern };
  const prerequisitePattern = context.allowedPatternCodes.find((code) => wordMatchesPattern(word, code));
  if (prerequisitePattern || CLOSED_SHORT_WORDS.has(word)) return { word, category: "prerequisite", matchedPattern: prerequisitePattern };
  if (vocabularySet.has(word)) return { word, category: "vocabulary" };
  return { word, category: "unclassified" };
}

export function wordMatchesPattern(word: string, patternCode: string): boolean {
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
  return false;
}

function setOf(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase()));
}
