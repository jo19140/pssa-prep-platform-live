import { wordMatchesPattern } from "./passageClassifier";

export type PseudowordValidationResult = {
  pseudoword: string;
  expectedPronunciation: string;
  targetPattern: string;
  valid: boolean;
  issues: string[];
};

const COMMON_REAL_WORDS = new Set([
  "cake", "game", "make", "same", "tape", "cape", "mane", "lake", "gave", "name", "gate",
  "bike", "time", "line", "five", "ride", "home", "rope", "joke", "note", "stone",
  "cube", "mule", "cute", "tune", "flute", "these", "theme", "eve",
  "lathe", "nape", "shape", "save", "wave", "made", "came", "ate",
]);

export function validatePseudowordCandidate(
  pseudoword: string,
  targetPattern: string,
  realWordSet: Set<string> = COMMON_REAL_WORDS,
): PseudowordValidationResult {
  const normalized = pseudoword.toLowerCase().trim();
  const issues: string[] = [];
  if (!normalized) issues.push("empty pseudoword");
  if (realWordSet.has(normalized)) issues.push("pseudoword is a real/common word");
  if (!wordMatchesPattern(normalized, targetPattern)) issues.push(`pseudoword does not match target pattern ${targetPattern}`);
  return {
    pseudoword: normalized,
    expectedPronunciation: pronunciationForSilentE(normalized, targetPattern),
    targetPattern,
    valid: issues.length === 0,
    issues,
  };
}

export function validatePseudowordSet(pseudowords: string[], targetPattern: string) {
  return pseudowords.map((word) => validatePseudowordCandidate(word, targetPattern));
}

function pronunciationForSilentE(word: string, pattern: string) {
  const vowel = pattern.match(/^([aeiou])_e$/)?.[1];
  if (!vowel) return word;
  return `${word} (${vowel} says its name)`;
}
