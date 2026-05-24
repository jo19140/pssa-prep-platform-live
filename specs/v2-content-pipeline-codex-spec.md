# Sýnesis v2 · Phonogram Inventory Pipeline · Codex Spec

**Status:** Ready for Codex execution
**Originated:** Parallel Claude chat ("Building open-source phonogram word lists") in Claude.ai web, Opus 4.7
**Saved into Sýnesis project:** 2026-05-23
**Companion spec:** `specs/reading-buddy-v1-codex-spec.md` (UI/schema/voice infrastructure that consumes this dataset)
**Memory:** `memory/project_v2_content_pipeline_decisions.md`

---

## Codex Task: Phonogram Inventory Pipeline

### Goal

Build a reproducible pipeline that assembles a platform-owned phonogram word inventory from three open sources: CMU Pronouncing Dictionary, SUBTLEX-US, and Coxhead's Academic Word List. Output three independent datasets (JSON + CSV + SQLite each), plus a grapheme-to-phoneme alignment layer over CMUdict.

The deliverable is code in the repo, not a one-off generated file. We will re-run this when sources update, when the alignment ruleset changes, or when we want to add a fourth source. Treat it as a platform asset.

### Repo layout

```
scripts/phonogram/
  build_cmudict.py
  build_subtlex.py
  build_awl.py
  build_alignment.py
  lib/
    arpabet_to_ipa.py
    g2p_aligner.py
    schemas.py           # pydantic or dataclasses for the output records
  tests/
    test_arpabet_to_ipa.py
    test_g2p_aligner.py
    fixtures/
      known_alignments.json   # 100+ hand-verified word→alignment pairs
      arpabet_ipa_pairs.json
data/phonogram/
  cmudict.json
  cmudict.csv
  cmudict.sqlite
  subtlex.json
  subtlex.csv
  subtlex.sqlite
  awl.json
  awl.csv
  awl.sqlite
  alignment.json           # joined to cmudict by word+pron_variant
  alignment_quality_report.md
docs/
  phonogram.md             # ARPABET→IPA mapping, alignment rules, schema docs
Makefile  (or justfile)
```

Each builder script is independently runnable. `make phonogram` runs all four in order and regenerates everything in `data/phonogram/`.

### Source 1: CMU Pronouncing Dictionary

Download: `https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict-0.7b`
Plain text, latin-1 encoded, one entry per line, two-space separator between word and pronunciation. Lines starting with `;;;` are comments. Multiple pronunciations encoded as `WORD(1)`, `WORD(2)`, etc.

Output schema (per record):

```python
{
  "word": str,                  # lowercased headword, no (N) suffix
  "variant": int,               # 0 for primary, 1+ for alternates
  "arpabet": str,               # space-separated, e.g. "P R AH0 N AH2 N S IY0 EY1 SH AH0 N"
  "phonemes_arpabet": list[str],
  "ipa": str,                   # converted, e.g. "prəˌnʌnsiˈeɪʃən"
  "phonemes_ipa": list[str],
  "syllable_count": int,        # count of vowel phonemes (any with stress digit)
  "stress_pattern": str,        # e.g. "01020" — one digit per syllable
}
```

ARPABET → IPA conversion rules (encode in `lib/arpabet_to_ipa.py` as a table, plus the special cases below). Document the full table in `docs/phonogram.md`.

Standard mappings (consonants): `B→b, CH→tʃ, D→d, DH→ð, F→f, G→ɡ, HH→h, JH→dʒ, K→k, L→l, M→m, N→n, NG→ŋ, P→p, R→ɹ, S→s, SH→ʃ, T→t, TH→θ, V→v, W→w, Y→j, Z→z, ZH→ʒ`

Vowels with stress-conditional rules:

* `AH1`, `AH2` → `ʌ`; `AH0` → `ə`
* `AA` → `ɑː`; `ER` → `ɝː` (but word-final `ER0` → `ɝ`); `IY` → `iː` (but word-final unstressed → `i`); `UW` → `uː`
* `AE → æ, AO → ɔː, AW → aʊ, AY → aɪ, EH → ɛ, EY → eɪ, IH → ɪ, OW → oʊ, OY → ɔɪ, UH → ʊ`

Stress markers: `1` → `ˈ` before syllable, `2` → `ˌ` before syllable, `0` → no marker. Place the stress marker before the syllable's onset (you'll need a simple syllabifier — maximum onset principle is fine for v1; document the choice).

Validation: expected ~134,000 records after parsing. Fail loudly if count is more than 5% off. Snapshot test: `pronunciation` → `P R AH0 N AH2 N S IY0 EY1 SH AH0 N` → `prəˌnʌnsiˈeɪʃən`.

### Source 2: SUBTLEX-US

Download: `https://osf.io/djpqz/download` (Excel file). Fallback: `https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus5.xlsx` — but the URL on the Ghent site changes occasionally, so prefer OSF and pin the OSF file ID.

Output schema (per record):

```python
{
  "word": str,                  # lowercased
  "freq_count": int,            # raw count in 51M-word corpus
  "freq_per_million": float,    # SUBTLEXWF
  "cd_count": int,              # contextual diversity count
  "cd_pct": float,              # contextual diversity percentage
  "zipf": float,                # log10(freq_per_billion) + 3, per Van Heuven 2014
  "dominant_pos": str,
  "dominant_pos_freq": int,
  "dominant_pos_rel_freq": float,
  "all_pos": list[str],
  "all_pos_freqs": list[int],
  "polluted": bool,             # True for "don" and "haven" only
}
```

Polluted entries: flag `don` and `haven` with `polluted: true` and a note in the quality report. These are inflated by `don't` and `haven't` apostrophe-splitting in the source corpus.

Validation: expected ~74,000 records. Snapshot test: `the` should have the highest `freq_per_million`.

### Source 3: Coxhead AWL

No download — hand-encode the 570 word families in `build_awl.py` as a Python dict literal. Source: Coxhead, A. (2000). A new academic word list. TESOL Quarterly, 34, 213–238. Sublist groupings and family members are reproduced widely; cross-check against `https://www.eapfoundation.com/vocab/academic/awllists/` and `https://www.ohsu.edu/sites/default/files/2019-04/Coxhead%20AWL.pdf`.

Output schema (per record):

```python
{
  "headword": str,              # e.g. "analyse"
  "sublist": int,               # 1–10
  "word_family": list[str],     # all inflected forms, e.g. ["analysed", "analyser", "analysers", "analyses", "analysing", "analysis", "analyst", "analysts", "analytic", "analytical", "analytically", "analyze", "analyzed", "analyzes", "analyzing"]
}
```

Validation: exactly 570 headwords. Sublists 1–9 have exactly 60 headwords each; sublist 10 has exactly 30. Hard-fail the build if either count is off.

### Source 4 (derived): G2P Alignment

This is the hard part. Goal: for every CMUdict entry, produce a grapheme-to-phoneme alignment showing which letter chunks spell which phoneme chunks.

Example output:

```python
{
  "word": "photograph",
  "variant": 0,
  "alignment": [
    {"graphemes": "ph", "phonemes_arpabet": ["F"],  "phonemes_ipa": ["f"]},
    {"graphemes": "o",  "phonemes_arpabet": ["OW"], "phonemes_ipa": ["oʊ"]},
    {"graphemes": "t",  "phonemes_arpabet": ["T"],  "phonemes_ipa": ["t"]},
    {"graphemes": "o",  "phonemes_arpabet": ["AH0"],"phonemes_ipa": ["ə"]},
    {"graphemes": "gr", "phonemes_arpabet": ["G","R"], "phonemes_ipa": ["ɡ","ɹ"]},
    {"graphemes": "a",  "phonemes_arpabet": ["AE2"],"phonemes_ipa": ["æ"]},
    {"graphemes": "ph", "phonemes_arpabet": ["F"],  "phonemes_ipa": ["f"]}
  ],
  "confidence": "high",         # "high" | "medium" | "low"
  "method": "ruleset",          # "ruleset" | "exception_list" | "fallback"
}
```

#### Approach

**Do not invent the ruleset from scratch.** Start from a published reference:

1. **Preferred:** Use the pre-aligned CMUdict from Phonetisaurus (`https://github.com/AdolfVonKleist/Phonetisaurus`) or the alignments in Festival's `cmulex`. If either is downloadable, parse their alignments directly and skip ruleset work entirely — this is the fastest path and gives the highest quality.
2. **Fallback:** Implement a rule-based aligner with the standard English grapheme→phoneme inventory (digraphs first: `ph`, `th`, `ch`, `sh`, `wh`, `ck`, `ng`, `qu`, `tion`, `sion`, `ough`, `augh`, `eigh`, then vowel teams, then single letters). Use a dynamic programming aligner (Needham-Wunsch style) that scores each candidate alignment against the ruleset's emission probabilities.

Either way, maintain an exception list for high-frequency irregulars: `colonel`, `wednesday`, `women`, `one`, `said`, `says`, `does`, `gone`, `iron`, `choir`, `island`, `subtle`, `debt`, `castle`, `often` (silent t), `salmon`, `aisle`, `worcestershire`, etc. Aim for 500–1000 hand-curated entries covering the worst offenders. Store these in `lib/g2p_exceptions.json`.

#### Confidence scoring

* `high`: every chunk matched a ruleset entry with score above threshold, no orphan letters or phonemes
* `medium`: alignment completed but with one or more low-scoring chunks, or one orphan
* `low`: aligner had to fall back (e.g., proper nouns, loanwords); we still emit a best-guess alignment but it's flagged

#### Quality report

`alignment_quality_report.md` should include:

* Total entries aligned
* Confidence distribution (counts of high/medium/low)
* 50 lowest-confidence words for manual review
* Coverage check: % of SUBTLEX top-5000 that aligned with `high` confidence (target: >90%)
* List of words present in CMUdict but absent from the alignment output, with reason

### Testing

`tests/fixtures/known_alignments.json` should contain at least 100 hand-verified alignments covering:

* Regular CVC, CVCe, vowel teams, consonant digraphs (50+ entries)
* Common irregulars from the exception list (20+ entries)
* Multi-syllable words with schwa reduction (20+ entries)
* Edge cases: words starting with silent letters, words with silent `e`, words with double consonants (10+ entries)

CI must run `pytest scripts/phonogram/tests/` and fail if any fixture alignment regresses. When you tweak the ruleset to fix one word, you'll find out immediately if it broke five others. This is the whole point of the test suite.

### Output format details

For each of the four datasets:

* JSON: array of records, pretty-printed with 2-space indent (so diffs are reviewable)
* CSV: one row per record. Arrays serialized as `|`-separated strings (avoids CSV quoting hell with commas in phonemes)
* SQLite: one table per dataset, indexed on `word`. Add a `phonogram.sqlite` super-database that joins all four with foreign keys on `word`

### Out of scope for v1

* Syllabification beyond a simple maximum-onset implementation (good enough for stress placement; not good enough for hyphenation)
* Pronunciation variants beyond what's already in CMUdict (no accent modeling, no British English)
* Morphological decomposition (no prefix/suffix tagging)
* Neural G2P (the ruleset + exception list approach is intentionally simple and inspectable)

If any of these become needed, they're follow-up tickets.

### Definition of done

1. `make phonogram` runs end-to-end on a clean checkout with only `requirements.txt` installed
2. All four datasets present in `data/phonogram/` in JSON + CSV + SQLite
3. `pytest` green
4. `alignment_quality_report.md` shows >90% high-confidence coverage on SUBTLEX top-5000
5. `docs/phonogram.md` documents the ARPABET→IPA table, the alignment ruleset (or the upstream source if Phonetisaurus alignments were used), the exception list, and how to add new exceptions
6. README section in repo root pointing to `docs/phonogram.md` and listing the four output files with their schemas

---

## How this spec relates to v1

The v1 Sýnesis spec (`specs/reading-buddy-v1-codex-spec.md`) defines:
- Prisma model `PhonogramFamily` with fields `code`, `category`, `syllableType`, `exampleWords`, `introductionOrder`
- Seed script `prisma/seed-phonograms.ts` (skeleton, populated from this v2 output)
- Use of phonogram families throughout the literacy engine

**Run order:** v2 builds first (produces `data/phonogram/*.sqlite`), then v1's seed script reads from those datasets to populate `PhonogramFamily`. Both can scaffold in parallel, but neither has a real product until both land.

**Bridging script (Codex should also write):** `prisma/seed-phonograms.ts` reads `data/phonogram/alignment.sqlite` + `data/phonogram/subtlex.sqlite`, derives phonogram families by clustering CMUdict alignments by their final vowel + final consonant chunks (long-a `-ake`, r-controlled `-urn`, etc.), and writes the `PhonogramFamily` rows with appropriate `introductionOrder` per the Blevins methodology referenced in `memory/reference_phonogram_methodology.md`.

## What the v1 spec must NOT do (re-stated for clarity)

- Do not invent phonogram word lists inside the Next.js app. All word data comes from this v2 pipeline.
- Do not commit any output files from `data/phonogram/` directly — they're regenerable from this pipeline; just `.gitignore` them or commit them deliberately as snapshot if size allows.
