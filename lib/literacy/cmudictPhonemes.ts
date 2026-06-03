import fs from "node:fs";
import path from "node:path";

type CmudictCache =
  | { status: "loaded"; pronunciations: Map<string, string[][]> }
  | { status: "unavailable"; error: Error };

let cmudictPath = path.resolve("data/phonogram/cmudict.json");
let cmudictCache: CmudictCache | null = null;

export function __setCmudictPhonemePathForTest(filePath: string | null) {
  cmudictPath = filePath ?? path.resolve("data/phonogram/cmudict.json");
  cmudictCache = null;
}

export function getCmudictPronunciations(word: string, opts: { strictPhonemeLexicon?: boolean } = {}) {
  const cache = getCmudictCache();
  if (cache.status === "loaded") return cache.pronunciations.get(normalizeWord(word)) ?? [];
  if (opts.strictPhonemeLexicon) {
    throw new Error(`CMUDICT_PHONEME_LEXICON_UNAVAILABLE: ${cache.error.message}`);
  }
  return [];
}

function getCmudictCache(): CmudictCache {
  if (!cmudictCache) {
    try {
      cmudictCache = { status: "loaded", pronunciations: loadCmudictPhonemes(cmudictPath) };
    } catch (error) {
      cmudictCache = { status: "unavailable", error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
  return cmudictCache;
}

function loadCmudictPhonemes(filePath: string) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<{ word?: unknown; arpabet?: unknown }>;
  const pronunciations = new Map<string, string[][]>();
  for (const entry of raw) {
    const word = normalizeWord(String(entry.word ?? ""));
    const arpabet = String(entry.arpabet ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(stripStress);
    if (!word || arpabet.length === 0) continue;
    const existing = pronunciations.get(word) ?? [];
    existing.push(arpabet);
    pronunciations.set(word, existing);
  }
  return pronunciations;
}

function stripStress(token: string) {
  return token.replace(/\d/g, "");
}

function normalizeWord(word: string) {
  const normalized = word.toLowerCase().trim();
  return /^[a-z]+$/.test(normalized) ? normalized : "";
}
