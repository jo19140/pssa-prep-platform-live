import { db } from "@/lib/db";
import { splitSentences, tokenizePassage } from "./passageTokenizer";

export type PassageDuplicateRow = {
  id: string;
  text: string;
};

export function findNearDuplicatePassagesInRows(text: string, rows: PassageDuplicateRow[], jaccardThreshold = 0.8): string[] {
  const normalizedText = normalizeText(text);
  const candidateSentences = new Set(splitSentences(text).map(normalizeText).filter(Boolean));
  const candidateFiveGrams = fiveGrams(text);
  const matches: string[] = [];

  for (const row of rows) {
    if (normalizeText(row.text) === normalizedText) {
      matches.push(row.id);
      continue;
    }
    const sentenceOverlap = splitSentences(row.text).map(normalizeText).some((sentence) => candidateSentences.has(sentence));
    if (sentenceOverlap) {
      matches.push(row.id);
      continue;
    }
    if (jaccard(candidateFiveGrams, fiveGrams(row.text)) > jaccardThreshold) {
      matches.push(row.id);
    }
  }
  return matches;
}

export async function findNearDuplicatePassages(args: { text: string; phasePositionId: string; excludePassageId?: string | null }) {
  const rows = await db.passage.findMany({
    where: {
      phasePositionId: args.phasePositionId,
      retiredAt: null,
      ...(args.excludePassageId ? { id: { not: args.excludePassageId } } : {}),
    },
    select: { id: true, text: true },
  });
  return findNearDuplicatePassagesInRows(args.text, rows);
}

function normalizeText(text: string) {
  return tokenizePassage(text).join(" ");
}

function fiveGrams(text: string) {
  const words = tokenizePassage(text);
  const grams = new Set<string>();
  for (let index = 0; index <= words.length - 5; index += 1) {
    grams.add(words.slice(index, index + 5).join(" "));
  }
  return grams;
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}
