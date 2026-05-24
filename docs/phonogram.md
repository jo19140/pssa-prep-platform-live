# Phonogram Inventory Pipeline

The v2 phonogram pipeline builds platform-owned literacy datasets from open sources:

- `cmudict`: CMU Pronouncing Dictionary normalized into word, pronunciation variant, ARPABET, IPA, syllable count, and stress pattern records.
- `subtlex`: SUBTLEX-US word frequency records with POS metadata and `polluted` flags for `don` and `haven`.
- `awl`: Coxhead Academic Word List headwords, sublists, and word-family forms.
- `alignment`: grapheme-to-phoneme alignments joined to CMUdict by `word` and `variant`.

Run everything with:

```bash
make phonogram
python3 -m pytest scripts/phonogram/tests/
```

Generated files are written to `data/phonogram/` as JSON, CSV, and SQLite. They are intentionally ignored by git because they are reproducible build outputs.

## Sources

- CMUdict: `https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict`, with the legacy `cmudict-0.7b` URL attempted first.
- SUBTLEX-US: OSF file `https://osf.io/djpqz/download`, with a public POS-augmented CSV mirror fallback.
- AWL: Coxhead, A. (2000), cross-checked against EAP Foundation's AWL table.
- Alignment: `ckw017/aligned-cmudict`, which documents Phonetisaurus as the upstream aligner.

## ARPABET To IPA

Consonants:

| ARPABET | IPA | ARPABET | IPA | ARPABET | IPA |
| --- | --- | --- | --- | --- | --- |
| B | b | CH | tʃ | D | d |
| DH | ð | F | f | G | ɡ |
| HH | h | JH | dʒ | K | k |
| L | l | M | m | N | n |
| NG | ŋ | P | p | R | ɹ |
| S | s | SH | ʃ | T | t |
| TH | θ | V | v | W | w |
| Y | j | Z | z | ZH | ʒ |

Vowels:

| ARPABET | IPA |
| --- | --- |
| AA | ɑː |
| AE | æ |
| AH1/AH2 | ʌ |
| AH0 | ə |
| AO | ɔː |
| AW | aʊ |
| AY | aɪ |
| EH | ɛ |
| ER | ɝː, with word-final ER0 as ɝ |
| EY | eɪ |
| IH | ɪ |
| IY | iː, with word-final IY0 as i |
| OW | oʊ |
| OY | ɔɪ |
| UH | ʊ |
| UW | uː |

Stress markers are inserted before a syllable onset using a small maximum-onset approximation. Primary stress `1` becomes `ˈ`; secondary stress `2` becomes `ˌ`; unstressed `0` has no marker.

## Alignment Layer

The aligner does not invent a G2P ruleset. It parses the published Phonetisaurus-aligned CMUdict corpus from `ckw017/aligned-cmudict` and converts each aligned token into chunks:

```json
{"graphemes": "ph", "phonemes_arpabet": ["F"], "phonemes_ipa": ["f"]}
```

Entries present in current CMUdict but absent from the upstream aligned corpus receive a deterministic one-letter fallback and are marked `low`. High-frequency irregular exceptions can be added to `scripts/phonogram/lib/g2p_exceptions.json`; keep that file curated and small, and add a fixture in `scripts/phonogram/tests/fixtures/known_alignments.json` for every manual exception.

## Quality Checks

`data/phonogram/alignment_quality_report.md` reports total entries, confidence distribution, the 50 lowest-confidence words, SUBTLEX top-5000 high-confidence coverage, and current-CMUdict words missing from the upstream alignment source.

CI should run:

```bash
python3 -m pytest scripts/phonogram/tests/
```

The fixture file contains more than 100 known alignments so regressions in common phonogram patterns fail quickly.
