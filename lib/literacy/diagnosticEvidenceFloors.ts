export const DIAGNOSTIC_STRANDS = [
  "PA",
  "DECODING",
  "MORPHOLOGY",
  "FLUENCY",
  "VOCABULARY",
  "COMPREHENSION",
] as const;

export type DiagnosticStrand = (typeof DIAGNOSTIC_STRANDS)[number];

export const DIAGNOSTIC_EVIDENCE_FLOORS: Record<DiagnosticStrand, number> = {
  PA: 8,
  DECODING: 5,
  MORPHOLOGY: 6,
  FLUENCY: 1,
  VOCABULARY: 8,
  COMPREHENSION: 2,
};

export const DECODING_MIN_ITEMS_PER_PHASE = 5;
export const WITHIN_STRAND_MISS_CEILING = 4;
export const SPEECH_LOW_CONFIDENCE_THRESHOLD = 0.55;
export const DELAYED_RESPONSE_MS = 5000;
export const NO_ATTEMPT_RESPONSE_MS = 10000;
