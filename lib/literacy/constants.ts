import type { EhriPhase, LiteracyStrand, MasteryLevel, SyllableType } from "@prisma/client";

export const LITERACY_STRANDS: LiteracyStrand[] = [
  "PHONEMIC_AWARENESS",
  "DECODING",
  "MORPHOLOGY",
  "FLUENCY",
  "VOCABULARY",
  "COMPREHENSION",
];

export const SYLLABLE_TYPES: SyllableType[] = [
  "CLOSED",
  "OPEN",
  "VCE",
  "VOWEL_TEAM",
  "R_CONTROLLED",
  "CONSONANT_LE",
];

export const EHRI_PHASES: EhriPhase[] = [
  "PRE_ALPHABETIC",
  "PARTIAL_ALPHABETIC",
  "FULL_ALPHABETIC",
  "CONSOLIDATED_ALPHABETIC",
];

export const TODO_CONTENT_NOTE = "TODO: from content pipeline";

export const PLACEHOLDER_PASSAGE = `${TODO_CONTENT_NOTE} — Reading Buddy v1 waits for sourced literacy passages, word lists, and comprehension items.`;

export const STRAND_LABELS: Record<LiteracyStrand, string> = {
  PHONEMIC_AWARENESS: "Phonemic awareness",
  DECODING: "Decoding",
  MORPHOLOGY: "Morphology",
  FLUENCY: "Fluency",
  VOCABULARY: "Vocabulary",
  COMPREHENSION: "Comprehension",
};

export const SYLLABLE_LABELS: Record<SyllableType, string> = {
  CLOSED: "Closed",
  OPEN: "Open",
  VCE: "Vowel-consonant-e",
  VOWEL_TEAM: "Vowel team",
  R_CONTROLLED: "R-controlled",
  CONSONANT_LE: "Consonant + le",
};

export const PHASE_LABELS: Record<EhriPhase, string> = {
  PRE_ALPHABETIC: "Pre-alphabetic",
  PARTIAL_ALPHABETIC: "Partial alphabetic",
  FULL_ALPHABETIC: "Full alphabetic",
  CONSOLIDATED_ALPHABETIC: "Consolidated alphabetic",
};

export function levelFromScore(score: number): MasteryLevel {
  if (score >= 85) return "MASTERED";
  if (score >= 70) return "SOLID";
  if (score >= 45) return "DEVELOPING";
  return "NOT_YET";
}

export function phaseFromDecodingScore(score: number): EhriPhase {
  if (score >= 80) return "CONSOLIDATED_ALPHABETIC";
  if (score >= 60) return "FULL_ALPHABETIC";
  if (score >= 35) return "PARTIAL_ALPHABETIC";
  return "PRE_ALPHABETIC";
}

export function phaseConfidence(scores: number[]) {
  if (!scores.length) return 0.5;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.max(0.55, Math.min(0.95, average / 100));
}
