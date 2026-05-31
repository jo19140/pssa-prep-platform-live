import { splitSentences, tokenizePassage } from "./passageTokenizer";

export type PassageQualityAudit = {
  sentenceCount: number;
  uniqueSentenceRatio: number;
  repeatedSentences: string[];
  repeatedTrigrams: string[];
  hasTerminalPunctuation: boolean;
  nearDuplicateExistingPassageIds: string[];
  passesQualityGate: boolean;
};

export function runPassageQualityAudit(text: string, nearDuplicateExistingPassageIds: string[] = []): PassageQualityAudit {
  const sentences = splitSentences(text);
  const normalizedSentences = sentences.map(normalizeSentence).filter(Boolean);
  const uniqueSentences = new Set(normalizedSentences);
  const repeatedSentences = normalizedSentences.filter((sentence, index) => normalizedSentences.indexOf(sentence) !== index);
  const repeatedTrigrams = findRepeatedTrigrams(tokenizePassage(text));
  const hasTerminalPunctuation = /[.!?]\s*$/.test(text.trim());
  const sentenceCount = normalizedSentences.length;
  const uniqueSentenceRatio = sentenceCount === 0 ? 0 : uniqueSentences.size / sentenceCount;
  const passesQualityGate =
    text.trim().length > 0 &&
    sentenceCount > 0 &&
    uniqueSentenceRatio === 1 &&
    repeatedTrigrams.length === 0 &&
    hasTerminalPunctuation &&
    nearDuplicateExistingPassageIds.length === 0;

  return {
    sentenceCount,
    uniqueSentenceRatio,
    repeatedSentences: Array.from(new Set(repeatedSentences)),
    repeatedTrigrams,
    hasTerminalPunctuation,
    nearDuplicateExistingPassageIds,
    passesQualityGate,
  };
}

function normalizeSentence(sentence: string) {
  return sentence.toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
}

function findRepeatedTrigrams(words: string[]) {
  const counts = new Map<string, number>();
  for (let index = 0; index <= words.length - 3; index += 1) {
    const trigram = words.slice(index, index + 3).join(" ");
    counts.set(trigram, (counts.get(trigram) || 0) + 1);
  }
  return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([trigram]) => trigram);
}
