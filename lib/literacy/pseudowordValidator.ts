import { wordMatchesPattern } from "./passageClassifier";

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

/**
 * Curated authoritative real-word lexicon for the controlled silent-e / closed-syllable
 * vocabulary the generator produces at Phases 1-3.
 *
 * Why curated and NOT SUBTLEX/CMUdict: those corpora contain junk tokens that collide with
 * legitimate pseudowords (e.g. SUBTLEX lists "vade" and "tave" with non-trivial frequency),
 * which would wrongly reject valid pseudowords and break the golden fixture. A curated set is
 * deterministic, fast (no fs/JSON load), and avoids false positives. Extend it as new phases
 * introduce new controlled vocabulary. Callers may inject their own lexicon via `realWordSet`.
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
  // --- u_e real words ---
  "cube", "tube", "cute", "mute", "mule", "rule", "tune", "dune", "june", "prune",
  "flute", "fume", "fuse", "huge", "duke", "fluke",
  // --- e_e real words ---
  "these", "theme", "eve", "complete", "delete", "scene", "scheme", "compete",
  // --- common closed-syllable + function words frequently in lessons ---
  "cat", "ran", "hand", "map", "fast", "last", "sand", "lamp", "stand", "band", "land",
  "pin", "did", "fish", "big", "sit", "fit", "lid", "rid", "hid", "kid", "wig", "dig",
  "top", "hot", "dog", "job", "rock", "lock", "sock", "box", "fox", "pot", "lot", "not",
  "bug", "run", "cup", "jump", "must", "dust", "rust", "bus", "fun", "sun", "nut", "cut", "hut",
  "pet", "red", "ten", "desk", "help", "bed", "leg", "men", "net", "wet", "yes", "best", "nest", "rest",
  "the", "a", "an", "and", "is", "it", "in", "on", "at", "as", "this", "that", "had", "has", "his",
]);

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

export function validatePseudowordCandidate(
  pseudoword: string,
  targetPattern: string,
  realWordSet: Set<string> = CORE_REAL_WORDS,
): PseudowordValidationResult {
  const normalized = pseudoword.toLowerCase().trim();
  const issues: string[] = [];
  let collidesWith: string | null = null;

  if (!normalized) {
    issues.push("empty pseudoword");
  }
  if (!wordMatchesPattern(normalized, targetPattern)) {
    issues.push(`pseudoword does not match target pattern ${targetPattern}`);
  }
  // 1. Direct real-word membership.
  if (normalized && realWordSet.has(normalized)) {
    collidesWith = normalized;
    issues.push(`pseudoword is a real word ("${normalized}")`);
  }
  // 2. Homophone / near-spelling collision via pronunciation-preserving variants.
  if (!collidesWith && normalized) {
    const vowelLetter = vowelLetterForPattern(targetPattern);
    if (vowelLetter) {
      for (const variant of homophoneVariants(normalized, vowelLetter)) {
        if (realWordSet.has(variant)) {
          collidesWith = variant;
          issues.push(`pseudoword sounds like / is a near-spelling of the real word "${variant}"`);
          break;
        }
      }
    }
  }

  return {
    pseudoword: normalized,
    expectedPronunciation: pronunciationForSilentE(normalized, targetPattern),
    targetPattern,
    valid: issues.length === 0,
    reason: issues[0] ?? null,
    collidesWith,
    issues,
  };
}

export function validatePseudowordSet(pseudowords: string[], targetPattern: string, realWordSet?: Set<string>) {
  return pseudowords.map((word) => validatePseudowordCandidate(word, targetPattern, realWordSet));
}

function pronunciationForSilentE(word: string, pattern: string) {
  const vowel = vowelLetterForPattern(pattern);
  if (!vowel) return word;
  return `${word} (${vowel} says its name)`;
}
