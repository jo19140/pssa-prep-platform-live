import fs from "node:fs";
import path from "node:path";
import { wordMatchesPattern } from "./passageClassifier";

export type MorphologyRule = "drop_e" | "double" | "y_to_i";
export type MorphologyAnalysisRule = MorphologyRule | "none";

export type MorphologyAnalyzerConfig = {
  rule: MorphologyRule;
  stemPatterns: string[];
  suffixes: Array<"ing" | "ed" | "s" | "es">;
};

export type MorphologyAnalysis = {
  surface: string;
  base: string;
  suffix: "ing" | "ed" | "s" | "es";
  rule: MorphologyAnalysisRule;
  basePattern: string;
  verified: true;
};

type CmudictEntry = {
  word?: unknown;
  arpabet?: unknown;
  phonemes_arpabet?: unknown;
};

let cmudictCache: Map<string, string[][]> | null = null;
const cmudictPath = path.resolve("data/phonogram/cmudict.json");

const SUFFIX_ORDER: Array<"ing" | "ed" | "es" | "s"> = ["ing", "ed", "es", "s"];
const VOWEL_SUFFIXES = new Set(["ing", "ed"]);
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";

const PATTERN_VOWEL_PHONEMES: Record<string, string> = {
  a_e: "EY",
  i_e: "AY",
  o_e: "OW",
  u_e: "UW",
  e_e: "IY",
  closed_short_a: "AE",
  closed_short_i: "IH",
  closed_short_o: "AA",
  closed_short_u: "AH",
  closed_short_e: "EH",
  y_long_i: "AY",
};

const SUFFIX_ALLOMORPHS: Record<"ing" | "ed" | "s" | "es", string[][]> = {
  ing: [["IH", "NG"], ["AH", "NG"]],
  ed: [["T"], ["D"], ["IH", "D"], ["AH", "D"]],
  s: [["S"], ["Z"], ["IH", "Z"], ["AH", "Z"]],
  es: [["S"], ["Z"], ["IH", "Z"], ["AH", "Z"]],
};

export function decomposeInflectedWord(surface: string, config: MorphologyAnalyzerConfig): MorphologyAnalysis | null {
  const normalized = surface.toLowerCase().trim();
  if (!/^[a-z]+$/.test(normalized)) return null;
  const suffixes = SUFFIX_ORDER.filter((suffix) => config.suffixes.includes(suffix));
  for (const suffix of suffixes) {
    if (!normalized.endsWith(suffix) || normalized.length <= suffix.length) continue;
    const rawBase = normalized.slice(0, -suffix.length);
    for (const candidate of candidateStems(rawBase, suffix, config.rule)) {
      if (synthesize(candidate.base, suffix, candidate.rule) !== normalized) continue;
      if (!cmudictPronunciations(candidate.base).length) continue;
      const basePattern = config.stemPatterns.find((pattern) =>
        wordMatchesPattern(candidate.base, pattern, { strictPhonemeLexicon: true })
      );
      if (!basePattern) continue;
      if (!surfacePronunciationVerifies(normalized, basePattern, suffix)) continue;
      return {
        surface: normalized,
        base: candidate.base,
        suffix,
        rule: candidate.rule,
        basePattern,
        verified: true,
      };
    }
  }
  return null;
}

function candidateStems(rawBase: string, suffix: "ing" | "ed" | "s" | "es", lessonRule: MorphologyRule) {
  const candidates: Array<{ base: string; rule: MorphologyAnalysisRule }> = [];
  if (lessonRule === "y_to_i") {
    if ((suffix === "ed" || suffix === "es") && rawBase.endsWith("i")) {
      candidates.push({ base: `${rawBase.slice(0, -1)}y`, rule: "y_to_i" });
    }
    if (suffix === "ing") {
      candidates.push({ base: rawBase, rule: "none" });
    }
    return candidates;
  }
  if (lessonRule === "drop_e" && VOWEL_SUFFIXES.has(suffix)) {
    candidates.push({ base: `${rawBase}e`, rule: "drop_e" });
  }
  if (lessonRule === "double" && VOWEL_SUFFIXES.has(suffix) && hasDoubledFinalConsonant(rawBase)) {
    candidates.push({ base: rawBase.slice(0, -1), rule: "double" });
  }
  if (suffix === "s" || suffix === "es") {
    candidates.push({ base: rawBase, rule: "none" });
  }
  return candidates;
}

function synthesize(base: string, suffix: "ing" | "ed" | "s" | "es", rule: MorphologyAnalysisRule) {
  if (rule === "drop_e") return `${base.slice(0, -1)}${suffix}`;
  if (rule === "double") return `${base}${base.at(-1)}${suffix}`;
  if (rule === "y_to_i") return `${base.slice(0, -1)}i${suffix}`;
  return `${base}${suffix}`;
}

function hasDoubledFinalConsonant(value: string) {
  if (value.length < 2) return false;
  const last = value.at(-1) ?? "";
  return last === value.at(-2) && CONSONANTS.includes(last);
}

function surfacePronunciationVerifies(surface: string, basePattern: string, suffix: "ing" | "ed" | "s" | "es") {
  const expectedVowel = PATTERN_VOWEL_PHONEMES[basePattern];
  if (!expectedVowel) return false;
  return cmudictPronunciations(surface).some((pronunciation) =>
    pronunciation.includes(expectedVowel) && SUFFIX_ALLOMORPHS[suffix].some((ending) => endsWithSequence(pronunciation, ending))
  );
}

function endsWithSequence(values: string[], suffix: string[]) {
  if (values.length < suffix.length) return false;
  return suffix.every((value, index) => values[values.length - suffix.length + index] === value);
}

function cmudictPronunciations(word: string) {
  return loadCmudict().get(word.toLowerCase()) ?? [];
}

function loadCmudict() {
  if (cmudictCache) return cmudictCache;
  const raw = JSON.parse(fs.readFileSync(cmudictPath, "utf8")) as CmudictEntry[];
  const map = new Map<string, string[][]>();
  for (const entry of raw) {
    const word = normalizeWord(String(entry.word ?? ""));
    if (!word) continue;
    const phonemes = Array.isArray(entry.phonemes_arpabet)
      ? entry.phonemes_arpabet.map((value) => stripStress(String(value))).filter(Boolean)
      : String(entry.arpabet ?? "").trim().split(/\s+/).map(stripStress).filter(Boolean);
    if (!phonemes.length) continue;
    const values = map.get(word) ?? [];
    values.push(phonemes);
    map.set(word, values);
  }
  cmudictCache = map;
  return map;
}

function stripStress(token: string) {
  return token.replace(/\d/g, "");
}

function normalizeWord(word: string) {
  const normalized = word.toLowerCase().trim();
  return /^[a-z]+$/.test(normalized) ? normalized : "";
}

// Shared parser so the generator, part builders, and passage audit derive the
// morphology config from a daily target identically (single source of truth).
export function morphologyConfigFromTargetPatternsJson(json: unknown): MorphologyAnalyzerConfig | undefined {
  if (!json || typeof json !== "object" || Array.isArray(json)) return undefined;
  const morphologyJson = (json as { morphologyJson?: unknown }).morphologyJson;
  if (!morphologyJson || typeof morphologyJson !== "object" || Array.isArray(morphologyJson)) return undefined;
  const rule = (morphologyJson as { rule?: unknown }).rule;
  const stemPatterns = (morphologyJson as { stemPatterns?: unknown }).stemPatterns;
  const suffixes = (morphologyJson as { suffixes?: unknown }).suffixes;
  if (rule !== "drop_e" && rule !== "double" && rule !== "y_to_i") return undefined;
  if (!Array.isArray(stemPatterns) || !stemPatterns.every((entry) => typeof entry === "string")) return undefined;
  if (!Array.isArray(suffixes) || !suffixes.every((entry) => entry === "ing" || entry === "ed" || entry === "s" || entry === "es")) return undefined;
  return { rule, stemPatterns: stemPatterns as string[], suffixes: suffixes as ("ing" | "ed" | "s" | "es")[] };
}
