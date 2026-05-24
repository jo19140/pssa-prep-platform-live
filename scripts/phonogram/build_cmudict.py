#!/usr/bin/env python3
"""Build the normalized CMUdict phonogram dataset."""

from __future__ import annotations

import re
import sys
from pathlib import Path

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from scripts.phonogram.lib.arpabet_to_ipa import phones_to_ipa, phones_to_ipa_tokens, stress_pattern, syllable_count
from scripts.phonogram.lib.schemas import download, export_dataset


CMUDICT_URLS = [
    "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict-0.7b",
    "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict",
]

FIELDS = [
    "word",
    "variant",
    "arpabet",
    "phonemes_arpabet",
    "ipa",
    "phonemes_ipa",
    "syllable_count",
    "stress_pattern",
]

VARIANT_RE = re.compile(r"^(?P<word>.+?)(?:\((?P<variant>\d+)\))?$")


def parse_cmudict(path: Path) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for raw_line in path.read_text(encoding="latin-1").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";;;") or line.startswith("#"):
            continue
        if "  " in line:
            raw_word, arpabet = line.split("  ", 1)
        else:
            raw_word, arpabet = line.split(maxsplit=1)
        arpabet = arpabet.split("#", 1)[0].strip()
        match = VARIANT_RE.match(raw_word)
        if not match:
            raise ValueError(f"Unable to parse CMUdict word: {raw_word}")
        word = match.group("word").lower()
        variant = int(match.group("variant") or 0)
        phones = arpabet.split()
        records.append(
            {
                "word": word,
                "variant": variant,
                "arpabet": " ".join(phones),
                "phonemes_arpabet": phones,
                "ipa": phones_to_ipa(phones),
                "phonemes_ipa": phones_to_ipa_tokens(phones),
                "syllable_count": syllable_count(phones),
                "stress_pattern": stress_pattern(phones),
            }
        )
    if not 127_300 <= len(records) <= 140_700:
        raise RuntimeError(f"CMUdict record count {len(records)} is outside the expected 134k ±5% range")
    return records


def main() -> None:
    source = download(CMUDICT_URLS, "cmudict.dict")
    records = parse_cmudict(source)
    export_dataset("cmudict", records, FIELDS)
    print(f"Built CMUdict records: {len(records)}")


if __name__ == "__main__":
    main()
