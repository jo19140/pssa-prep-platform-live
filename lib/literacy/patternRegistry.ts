import { getCmudictPronunciations } from "./cmudictPhonemes";

export type PatternFamily = "closed" | "vce" | "vowel_team" | "r_controlled" | "diphthong";

export type PatternDef = {
  code: string;
  family: PatternFamily;
  graphemes: string[];
  expectedPhonemeSequences?: string[][];
  includeWords?: string[];
  excludeWords?: string[];
  introducedPhase: number;
};

export type PatternMatchOptions = {
  strictPhonemeLexicon?: boolean;
};

export const LEGACY_SUBSTRING_PATTERN_CODES = new Set(["ai", "ay", "oa", "ow", "oe", "ee", "ea", "igh", "ie", "ue", "ew", "oo", "y_final"]);

export const PATTERN_REGISTRY: Record<string, PatternDef> = {
  team_ai: {
    code: "team_ai",
    family: "vowel_team",
    graphemes: ["ai"],
    expectedPhonemeSequences: [["EY"]],
    excludeWords: ["said", "again", "captain", "plaid"],
    introducedPhase: 4,
  },
  team_ay: { code: "team_ay", family: "vowel_team", graphemes: ["ay"], expectedPhonemeSequences: [["EY"]], introducedPhase: 4 },
  team_ee: { code: "team_ee", family: "vowel_team", graphemes: ["ee"], expectedPhonemeSequences: [["IY"]], introducedPhase: 4 },
  team_ea: {
    code: "team_ea",
    family: "vowel_team",
    graphemes: ["ea"],
    expectedPhonemeSequences: [["IY"]],
    excludeWords: ["bread", "head", "dead"],
    introducedPhase: 4,
  },
  team_oa: { code: "team_oa", family: "vowel_team", graphemes: ["oa"], expectedPhonemeSequences: [["OW"]], introducedPhase: 4 },
  team_ow: { code: "team_ow", family: "vowel_team", graphemes: ["ow"], expectedPhonemeSequences: [["OW"]], introducedPhase: 4 },
  team_igh: { code: "team_igh", family: "vowel_team", graphemes: ["igh"], expectedPhonemeSequences: [["AY"]], introducedPhase: 4 },
  team_ew: { code: "team_ew", family: "vowel_team", graphemes: ["ew"], expectedPhonemeSequences: [["UW"]], introducedPhase: 4 },
  team_ue: { code: "team_ue", family: "vowel_team", graphemes: ["ue"], expectedPhonemeSequences: [["UW"]], introducedPhase: 4 },
  team_ie_long_i: { code: "team_ie_long_i", family: "vowel_team", graphemes: ["ie"], expectedPhonemeSequences: [["AY"]], introducedPhase: 4 },
  team_ie_long_e: {
    code: "team_ie_long_e",
    family: "vowel_team",
    graphemes: ["ie"],
    expectedPhonemeSequences: [["IY"]],
    excludeWords: ["friend", "friends"],
    introducedPhase: 4,
  },
  team_oo_long: { code: "team_oo_long", family: "vowel_team", graphemes: ["oo"], expectedPhonemeSequences: [["UW"]], introducedPhase: 4 },
  team_oo_short: { code: "team_oo_short", family: "vowel_team", graphemes: ["oo"], expectedPhonemeSequences: [["UH"]], introducedPhase: 4 },
  team_au: { code: "team_au", family: "vowel_team", graphemes: ["au"], expectedPhonemeSequences: [["AO"]], introducedPhase: 4 },
  team_aw: { code: "team_aw", family: "vowel_team", graphemes: ["aw"], expectedPhonemeSequences: [["AO"]], introducedPhase: 4 },
  r_ar: { code: "r_ar", family: "r_controlled", graphemes: ["ar"], expectedPhonemeSequences: [["AA", "R"]], introducedPhase: 4 },
  r_or: { code: "r_or", family: "r_controlled", graphemes: ["or"], expectedPhonemeSequences: [["AO", "R"]], introducedPhase: 4 },
  r_er: { code: "r_er", family: "r_controlled", graphemes: ["er"], expectedPhonemeSequences: [["ER"]], introducedPhase: 4 },
  r_ir: { code: "r_ir", family: "r_controlled", graphemes: ["ir"], expectedPhonemeSequences: [["ER"]], introducedPhase: 4 },
  r_ur: { code: "r_ur", family: "r_controlled", graphemes: ["ur"], expectedPhonemeSequences: [["ER"]], introducedPhase: 4 },
  diph_oi: { code: "diph_oi", family: "diphthong", graphemes: ["oi"], expectedPhonemeSequences: [["OY"]], introducedPhase: 4 },
  diph_oy: { code: "diph_oy", family: "diphthong", graphemes: ["oy"], expectedPhonemeSequences: [["OY"]], introducedPhase: 4 },
  diph_ow: { code: "diph_ow", family: "diphthong", graphemes: ["ow"], expectedPhonemeSequences: [["AW"]], introducedPhase: 4 },
  diph_ou: { code: "diph_ou", family: "diphthong", graphemes: ["ou"], expectedPhonemeSequences: [["AW"]], introducedPhase: 4 },
};

export function normalizePatternCode(code: string) {
  const normalized = code.trim();
  const mapping: Record<string, string> = {
    ai: "team_ai",
    ay: "team_ay",
    oa: "team_oa",
    ee: "team_ee",
    ea: "team_ea",
    igh: "team_igh",
    ue: "team_ue",
    ew: "team_ew",
  };
  return mapping[normalized] ?? normalized;
}

export function isLegacySubstringPatternCode(code: string) {
  return LEGACY_SUBSTRING_PATTERN_CODES.has(code);
}

export function wordMatchesRegisteredPattern(word: string, patternCode: string, opts: PatternMatchOptions = {}) {
  const def = PATTERN_REGISTRY[patternCode];
  if (!def) return false;
  const normalized = normalizeWord(word);
  if (!normalized || !def.graphemes.some((grapheme) => normalized.includes(grapheme))) return false;
  if (def.excludeWords?.map(normalizeWord).includes(normalized)) return false;
  if (def.includeWords?.map(normalizeWord).includes(normalized)) return true;
  const expected = def.expectedPhonemeSequences ?? [];
  if (expected.length === 0) return false;
  const pronunciations = getCmudictPronunciations(normalized, opts);
  return pronunciations.some((pronunciation) => expected.some((sequence) => containsSequence(pronunciation, sequence)));
}

function containsSequence(pronunciation: string[], sequence: string[]) {
  if (sequence.length === 0 || sequence.length > pronunciation.length) return false;
  for (let start = 0; start <= pronunciation.length - sequence.length; start += 1) {
    if (sequence.every((phoneme, index) => pronunciation[start + index] === phoneme)) return true;
  }
  return false;
}

function normalizeWord(word: string) {
  return word.toLowerCase().trim();
}
