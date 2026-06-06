import fs from "node:fs";
import path from "node:path";
import { wordMatchesPattern } from "./passageClassifier";
import { PATTERN_REGISTRY } from "./patternRegistry";

export type PseudowordValidationResult = {
  pseudoword: string;
  expectedPronunciation: string;
  targetPattern: string;
  valid: boolean;
  /** Human-readable reason the candidate was rejected, or null when valid. */
  reason: string | null;
  /** The real word this candidate is / sounds like, when that is why it failed. */
  collidesWith: string | null;
  /** All issues found (kept for backward-compatible consumers that read `.issues`). */
  issues: string[];
};

export type PseudowordValidationOptions = {
  strictLexicon?: boolean;
  lexicon?: {
    core?: Set<string>;
    homophone?: Set<string>;
  };
};

type HomophoneLexiconCache =
  | { status: "loaded"; words: Set<string> }
  | { status: "unavailable"; error: Error };

type CmudictReverseCache =
  | { status: "loaded"; byPronunciation: Map<string, Set<string>> }
  | { status: "unavailable"; error: Error };

type RawCmudictWordCache =
  | { status: "loaded"; words: Set<string> }
  | { status: "unavailable"; error: Error };

/**
 * Curated authoritative real-word lexicon for the controlled silent-e / closed-syllable
 * vocabulary the generator produces at Phases 1-3.
 *
 * Why curated and NOT SUBTLEX/CMUdict: those corpora contain junk tokens that collide with
 * legitimate pseudowords (e.g. SUBTLEX lists "vade" and "tave" with non-trivial frequency),
 * which would wrongly reject valid pseudowords and break the golden fixture. A curated set is
 * deterministic, fast (no fs/JSON load), and avoids false positives. Extend it as new phases
 * introduce new controlled vocabulary. Callers may inject their own split lexicon via `opts.lexicon`.
 */
export const CORE_REAL_WORDS: Set<string> = new Set([
  // --- a_e real words (incl. the spec's homophone collision targets) ---
  "cake", "bake", "lake", "make", "take", "rake", "sake", "wake", "fake", "brake", "flake", "snake", "stake",
  "game", "name", "same", "came", "fame", "tame", "lame", "dame", "blame", "flame", "frame", "shame",
  "tape", "cape", "gape", "nape", "shape", "grape", "scrape", "drape",
  "made", "wade", "fade", "jade", "blade", "grade", "shade", "spade", "trade", "glade",
  "gave", "cave", "wave", "save", "pave", "rave", "brave", "crave", "grave", "shave", "slave", "stave",
  "gate", "late", "date", "fate", "hate", "mate", "rate", "plate", "skate", "slate", "state", "crate", "grate",
  "mane", "cane", "lane", "pane", "sane", "vane", "plane", "crane",
  "ate", "gaze", "maze", "daze", "blaze", "graze", "haze",
  "page", "cage", "rage", "wage", "sage", "stage",
  "race", "face", "lace", "pace", "place", "space", "trace", "grace", "brace",
  "lathe", "bathe", "scathe",
  "drain", "braid", "grain", "train", "brain", "stain", "plain", "chain", "paint", "faint",
  "play", "stay", "tray", "gray", "clay", "spray",
  // --- i_e real words ---
  "bike", "hike", "like", "mike", "pike", "spike", "strike",
  "time", "lime", "dime", "mime", "crime", "prime", "slime", "chime",
  "line", "dine", "fine", "mine", "nine", "pine", "vine", "shine", "spine", "swine", "whine",
  "five", "dive", "hive", "live", "drive", "alive",
  "ride", "bide", "hide", "side", "tide", "wide", "bride", "glide", "pride", "slide", "stride",
  "bite", "kite", "mite", "site", "white", "quite", "spite", "write",
  "nile", "pile", "mile", "tile", "file", "smile", "while",
  "high", "sigh", "thigh", "night", "light", "right", "sight", "tight", "fight", "might",
  // --- o_e real words ---
  "home", "dome", "come", "some", "chrome",
  "rope", "hope", "cope", "dope", "mope", "scope", "slope",
  "joke", "poke", "woke", "yoke", "broke", "choke", "smoke", "spoke", "stroke",
  "note", "vote", "wrote", "quote",
  "stone", "bone", "cone", "lone", "tone", "zone", "phone", "alone",
  "hole", "mole", "pole", "role", "sole", "whole",
  "boat", "coat", "goat", "road", "toad", "load", "soap", "snow", "grow", "show", "throw",
  "goal", "loam", "knoll",
  // --- u_e real words ---
  "cube", "tube", "cute", "mute", "mule", "rule", "tune", "dune", "june", "prune",
  "flute", "fume", "fuse", "huge", "duke", "fluke",
  "fuel", "newt",
  // --- e_e real words ---
  "these", "theme", "eve", "complete", "delete", "scene", "scheme", "compete",
  "need", "beet",
  // --- common closed-syllable + function words frequently in lessons ---
  "cat", "ran", "hand", "map", "fast", "last", "sand", "lamp", "stand", "band", "land",
  "pin", "did", "fish", "big", "sit", "fit", "lid", "rid", "hid", "kid", "wig", "dig",
  "top", "hot", "dog", "job", "rock", "lock", "sock", "box", "fox", "pot", "lot", "not",
  "bug", "run", "cup", "jump", "must", "dust", "rust", "bus", "fun", "sun", "nut", "cut", "hut",
  "pet", "red", "ten", "desk", "help", "bed", "leg", "men", "net", "wet", "yes", "best", "nest", "rest",
  "the", "a", "an", "and", "is", "it", "in", "on", "at", "as", "this", "that", "had", "has", "his",
]);

let cmudictPath = path.resolve("data/phonogram/cmudict.json");
let subtlexPath = path.resolve("data/phonogram/subtlex.csv");
let homophoneLexiconCache: HomophoneLexiconCache | null = null;
let cmudictReverseCache: CmudictReverseCache | null = null;
let rawCmudictWordCache: RawCmudictWordCache | null = null;

export function __setPseudowordLexiconPathsForTest(paths: { cmudictPath?: string; subtlexPath?: string } | null) {
  cmudictPath = paths?.cmudictPath ?? path.resolve("data/phonogram/cmudict.json");
  subtlexPath = paths?.subtlexPath ?? path.resolve("data/phonogram/subtlex.csv");
  homophoneLexiconCache = null;
  cmudictReverseCache = null;
  rawCmudictWordCache = null;
}

const LONG_VOWEL_TEAMS: Record<string, string[]> = {
  a: ["ai", "ay", "ea", "eigh", "ei"],
  i: ["igh", "ie", "y", "uy", "ye"],
  o: ["oa", "ow", "oe", "ough"],
  u: ["ue", "ew", "eu", "ui"],
  e: ["ee", "ea", "ie", "ei"],
};

/**
 * Generate phoneme-preserving spelling variants of a silent-e pseudoword.
 * If any variant is a real word, the candidate is a homophone / near-spelling collision.
 *
 * Two pronunciation-preserving transforms for the long-vowel VCe pattern:
 *  1. Long-vowel team alternation (a_e -> ai/ay/ea/...): drane -> drain, brade -> braid.
 *  2. Onset consonant equivalence (/k/ = c|k, /f/ = f|ph): kape -> cape.
 */
export function homophoneVariants(word: string, vowelLetter: string): string[] {
  const variants = new Set<string>();
  const vce = word.match(/^([^aeiou]*)([aeiou])([^aeiou]+)e$/);
  if (vce) {
    const [, onset, vowel, coda] = vce;
    if (vowel === vowelLetter) {
      for (const team of LONG_VOWEL_TEAMS[vowelLetter] ?? []) {
        variants.add(`${onset}${team}${coda}`); // drop the silent e
      }
    }
  }
  // Onset consonant equivalences applied to the full word (rime, incl. silent e, preserved).
  if (/^k/.test(word)) variants.add(word.replace(/^k/, "c"));
  if (/^c(?=[aou])/.test(word)) variants.add(word.replace(/^c/, "k"));
  if (/^ph/.test(word)) variants.add(word.replace(/^ph/, "f"));
  if (/^f(?!f)/.test(word)) variants.add(word.replace(/^f/, "ph"));
  variants.delete(word);
  return Array.from(variants);
}

function vowelLetterForPattern(targetPattern: string): string | null {
  return targetPattern.match(/^([aeiou])_e$/)?.[1] ?? null;
}

export function detectVcePattern(word: string): string | null {
  const match = word.toLowerCase().trim().match(/^[^aeiou]*([aeiou])[^aeiou]+e$/);
  return match ? `${match[1]}_e` : null;
}

export function detectClosedShortPattern(word: string): string | null {
  const match = word.toLowerCase().trim().match(/^[^aeiou]*([aeiou])[^aeiou]+$/);
  return match ? `closed_short_${match[1]}` : null;
}

export function detectYLongIPattern(word: string): "y_long_i" | null {
  return /^[bcdfghjklmnpqrstvwxz]+y$/.test(word.toLowerCase().trim()) ? "y_long_i" : null;
}

export function detectPatternCandidates(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  const candidates = new Set<string>();
  const vce = detectVcePattern(normalized);
  if (vce) candidates.add(vce);
  const closedShort = detectClosedShortPattern(normalized);
  if (closedShort) candidates.add(closedShort);
  const yLongI = detectYLongIPattern(normalized);
  if (yLongI) candidates.add(yLongI);
  for (const [code, def] of Object.entries(PATTERN_REGISTRY)) {
    if (code === "y_long_i") continue;
    if (def.graphemes.some((grapheme) => normalized.includes(grapheme))) candidates.add(code);
  }
  return Array.from(candidates);
}

export function validatePseudowordCandidate(
  pseudoword: string,
  targetPattern: string,
  opts: PseudowordValidationOptions = {},
): PseudowordValidationResult {
  const normalized = pseudoword.toLowerCase().trim();
  const coreLexicon = opts.lexicon?.core ?? CORE_REAL_WORDS;
  const homophoneLexiconResult = opts.lexicon?.homophone
    ? { words: opts.lexicon.homophone, unavailable: false as const }
    : getHomophoneLexicon(opts.strictLexicon === true);
  const homophoneLexicon = homophoneLexiconResult.unavailable ? coreLexicon : homophoneLexiconResult.words;
  const issues: string[] = [];
  const blockingIssues: string[] = [];
  let collidesWith: string | null = null;
  const patternCandidates = detectPatternCandidates(normalized);

  if (!normalized) {
    blockingIssues.push("empty pseudoword");
  }
  if (!patternCandidates.includes(targetPattern)) {
    blockingIssues.push(`pseudoword does not contain target pattern ${targetPattern}`);
  } else if (/^[aeiou]_e$/.test(targetPattern) && !wordMatchesPattern(normalized, targetPattern)) {
    blockingIssues.push(`pseudoword does not match target pattern ${targetPattern}`);
  }
  // 1. Direct real-word membership.
  if (normalized && coreLexicon.has(normalized)) {
    collidesWith = normalized;
    blockingIssues.push(`pseudoword is a real word ("${normalized}")`);
  }
  if (!collidesWith && normalized && opts.strictLexicon === true && homophoneLexicon.has(normalized)) {
    collidesWith = normalized;
    blockingIssues.push(`pseudoword is a real word ("${normalized}")`);
  }
  if (!collidesWith && normalized && targetPattern === "y_long_i" && opts.strictLexicon === true) {
    const rawCmudictWords = getRawCmudictWords(true);
    if (rawCmudictWords.unavailable) {
      issues.push("CMUDICT_WORD_LEXICON_UNAVAILABLE");
    } else if (rawCmudictWords.words.has(normalized)) {
      collidesWith = normalized;
      blockingIssues.push(`pseudoword is a real word ("${normalized}")`);
    }
  }
  if (homophoneLexiconResult.unavailable) {
    issues.push("HOMOPHONE_LEXICON_UNAVAILABLE");
  }
  // 2. Homophone / near-spelling collision via pronunciation-preserving variants.
  if (!collidesWith && normalized) {
    const vowelLetter = vowelLetterForPattern(targetPattern);
    if (vowelLetter) {
      for (const variant of homophoneVariants(normalized, vowelLetter)) {
        if (homophoneLexicon.has(variant)) {
          collidesWith = variant;
          blockingIssues.push(`pseudoword sounds like / is a near-spelling of the real word "${variant}"`);
          break;
        }
      }
    } else {
      const decoded = decodePatternPseudowordPronunciation(normalized, targetPattern);
      if (decoded) {
        const reverse = getCmudictReverseIndex(opts.strictLexicon === true);
        if (reverse.unavailable) {
          issues.push("CMUDICT_PHONEME_LEXICON_UNAVAILABLE");
        } else {
          const matches = reverse.byPronunciation.get(decoded.join(" "));
          const realWord = matches ? Array.from(matches).find((word) => word !== normalized && homophoneLexicon.has(word)) : null;
          if (realWord) {
            collidesWith = realWord;
            blockingIssues.push(`pseudoword sounds like the real word "${realWord}"`);
          }
        }
      }
    }
  }

  return {
    pseudoword: normalized,
    expectedPronunciation: expectedPronunciationForPattern(normalized, targetPattern),
    targetPattern,
    valid: blockingIssues.length === 0,
    reason: blockingIssues[0] ?? null,
    collidesWith,
    issues: [...blockingIssues, ...issues],
  };
}

export function validatePseudowordSet(pseudowords: string[], targetPattern: string, opts: PseudowordValidationOptions = {}) {
  return pseudowords.map((word) => validatePseudowordCandidate(word, targetPattern, opts));
}

function pronunciationForSilentE(word: string, pattern: string) {
  const vowel = vowelLetterForPattern(pattern);
  if (!vowel) return word;
  return `${word} (${vowel} says its name)`;
}

function expectedPronunciationForPattern(word: string, pattern: string) {
  const silentE = pronunciationForSilentE(word, pattern);
  if (silentE !== word) return silentE;
  const phonemes = decodePatternPseudowordPronunciation(word, pattern);
  return phonemes ? `${word} (${phonemes.join(" ")})` : word;
}

const CONSONANT_PHONEMES: Record<string, string> = {
  b: "B",
  c: "K",
  d: "D",
  f: "F",
  g: "G",
  h: "HH",
  j: "JH",
  k: "K",
  l: "L",
  m: "M",
  n: "N",
  p: "P",
  q: "K",
  r: "R",
  s: "S",
  t: "T",
  v: "V",
  w: "W",
  x: "K S",
  y: "Y",
  z: "Z",
};

const CLOSED_SHORT_VOWEL_PHONEMES: Record<string, string> = { a: "AE", i: "IH", o: "AA", u: "AH", e: "EH" };

function decodePatternPseudowordPronunciation(word: string, pattern: string): string[] | null {
  if (pattern === "y_long_i") {
    if (detectYLongIPattern(word) !== "y_long_i") return null;
    const onset = word.slice(0, -1);
    const decoded = [...decodeConsonantString(onset), "AY"];
    return decoded.length ? decoded : null;
  }
  const closedShort = pattern.match(/^closed_short_([aeiou])$/);
  if (closedShort) {
    const vowelLetter = closedShort[1];
    const vowelPhoneme = CLOSED_SHORT_VOWEL_PHONEMES[vowelLetter];
    if (!vowelPhoneme || detectClosedShortPattern(word) !== pattern) return null;
    const index = word.indexOf(vowelLetter);
    if (index < 0) return null;
    const onset = word.slice(0, index);
    const coda = word.slice(index + 1);
    const decoded = [...decodeConsonantString(onset), vowelPhoneme, ...decodeConsonantString(coda)];
    return decoded.length ? decoded : null;
  }
  const definition = PATTERN_REGISTRY[pattern];
  const vowelPhonemes = definition?.expectedPhonemeSequences?.[0];
  if (!definition || !["vowel_team", "r_controlled", "diphthong"].includes(definition.family) || !vowelPhonemes?.length) return null;
  const grapheme = definition.graphemes.find((entry) => word.includes(entry));
  if (!grapheme) return null;
  const index = word.indexOf(grapheme);
  const onset = word.slice(0, index);
  const coda = word.slice(index + grapheme.length);
  const decoded = [...decodeConsonantString(onset), ...vowelPhonemes, ...decodeConsonantString(coda)];
  return decoded.length ? decoded : null;
}

function decodeConsonantString(value: string): string[] {
  const phonemes: string[] = [];
  for (const char of value.toLowerCase()) {
    const mapped = CONSONANT_PHONEMES[char];
    if (!mapped) return [];
    phonemes.push(...mapped.split(" "));
  }
  return phonemes;
}

function getHomophoneLexicon(strictLexicon: boolean): { words: Set<string>; unavailable: false } | { words: Set<string>; unavailable: true } {
  if (!homophoneLexiconCache) {
    try {
      homophoneLexiconCache = { status: "loaded", words: loadFrequencyGatedHomophoneLexicon() };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      homophoneLexiconCache = { status: "unavailable", error: normalized };
    }
  }
  if (homophoneLexiconCache.status === "loaded") {
    return { words: homophoneLexiconCache.words, unavailable: false };
  }
  if (strictLexicon) {
    throw new Error(`HOMOPHONE_LEXICON_UNAVAILABLE: ${homophoneLexiconCache.error.message}`);
  }
  return { words: CORE_REAL_WORDS, unavailable: true };
}

function getCmudictReverseIndex(strictLexicon: boolean): { byPronunciation: Map<string, Set<string>>; unavailable: false } | { byPronunciation: Map<string, Set<string>>; unavailable: true } {
  if (!cmudictReverseCache) {
    try {
      cmudictReverseCache = { status: "loaded", byPronunciation: loadCmudictReverseIndex() };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      cmudictReverseCache = { status: "unavailable", error: normalized };
    }
  }
  if (cmudictReverseCache.status === "loaded") {
    return { byPronunciation: cmudictReverseCache.byPronunciation, unavailable: false };
  }
  if (strictLexicon) {
    throw new Error(`CMUDICT_PHONEME_LEXICON_UNAVAILABLE: ${cmudictReverseCache.error.message}`);
  }
  return { byPronunciation: new Map(), unavailable: true };
}

function getRawCmudictWords(strictLexicon: boolean): { words: Set<string>; unavailable: false } | { words: Set<string>; unavailable: true } {
  if (!rawCmudictWordCache) {
    try {
      rawCmudictWordCache = { status: "loaded", words: loadRawCmudictWords() };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      rawCmudictWordCache = { status: "unavailable", error: normalized };
    }
  }
  if (rawCmudictWordCache.status === "loaded") {
    return { words: rawCmudictWordCache.words, unavailable: false };
  }
  if (strictLexicon) {
    throw new Error(`CMUDICT_WORD_LEXICON_UNAVAILABLE: ${rawCmudictWordCache.error.message}`);
  }
  return { words: new Set(), unavailable: true };
}

function loadCmudictReverseIndex() {
  const rawCmudict = JSON.parse(fs.readFileSync(cmudictPath, "utf8")) as Array<{ word?: unknown; arpabet?: unknown }>;
  const index = new Map<string, Set<string>>();
  for (const entry of rawCmudict) {
    const word = normalizeLexiconWord(String(entry.word ?? ""));
    const arpabet = String(entry.arpabet ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(stripStress);
    if (!word || arpabet.length === 0) continue;
    const key = arpabet.join(" ");
    const words = index.get(key) ?? new Set<string>();
    words.add(word);
    index.set(key, words);
  }
  return index;
}

function loadRawCmudictWords() {
  const rawCmudict = JSON.parse(fs.readFileSync(cmudictPath, "utf8")) as Array<{ word?: unknown }>;
  const words = new Set<string>();
  for (const entry of rawCmudict) {
    const word = normalizeLexiconWord(String(entry.word ?? ""));
    if (word) words.add(word);
  }
  return words;
}

function stripStress(token: string) {
  return token.replace(/\d/g, "");
}

function loadFrequencyGatedHomophoneLexicon() {
  const subtlexWords = loadSubtlexWordsWithZipfAtLeast(subtlexPath, 4.0);
  const rawCmudict = JSON.parse(fs.readFileSync(cmudictPath, "utf8")) as Array<{ word?: unknown }>;
  const gated = new Set<string>();
  for (const entry of rawCmudict) {
    const word = normalizeLexiconWord(String(entry.word ?? ""));
    if (word && subtlexWords.has(word)) gated.add(word);
  }
  return gated;
}

function loadSubtlexWordsWithZipfAtLeast(filePath: string, minZipf: number) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const header = lines.shift()?.split(",") ?? [];
  const wordIndex = header.indexOf("word");
  const zipfIndex = header.indexOf("zipf");
  if (wordIndex < 0 || zipfIndex < 0) {
    throw new Error(`SUBTLEX header must include word and zipf columns: ${filePath}`);
  }
  const words = new Set<string>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const columns = line.split(",");
    const word = normalizeLexiconWord(columns[wordIndex] ?? "");
    const zipf = Number(columns[zipfIndex]);
    if (word && Number.isFinite(zipf) && zipf >= minZipf) words.add(word);
  }
  return words;
}

function normalizeLexiconWord(word: string) {
  const normalized = word.toLowerCase().trim();
  return /^[a-z]+$/.test(normalized) ? normalized : "";
}
