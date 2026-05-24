#!/usr/bin/env python3
"""Build the SUBTLEX-US frequency dataset."""

from __future__ import annotations

import csv
import math
import sys
from pathlib import Path

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from scripts.phonogram.lib.schemas import download, export_dataset


SUBTLEX_URLS = [
    "https://osf.io/djpqz/download",
    "https://gist.githubusercontent.com/mzaeemnasir/ce0aedfe16e7e70cff13366161166527/raw/aab92c915bc522d2d3707bb64330e1037226da49/SUBTLEX-US.csv",
]

FIELDS = [
    "word",
    "freq_count",
    "freq_per_million",
    "cd_count",
    "cd_pct",
    "zipf",
    "dominant_pos",
    "dominant_pos_freq",
    "dominant_pos_rel_freq",
    "all_pos",
    "all_pos_freqs",
    "polluted",
]


def _number(value: str, default: float = 0.0) -> float:
    try:
        if value in {"", "#N/A"}:
            return default
        return float(value)
    except ValueError:
        return default


def parse_subtlex_csv(path: Path) -> list[dict[str, object]]:
    text = path.read_text(encoding="utf-8-sig", errors="ignore")
    if text[:2] == "PK":
        raise RuntimeError("Downloaded SUBTLEX source is an .xlsx file; use the CSV mirror fallback URL")
    records: list[dict[str, object]] = []
    for row in csv.DictReader(text.splitlines()):
        word = row["Word"].strip().lower()
        freq_count = int(_number(row.get("FREQcount", "0")))
        freq_per_million = _number(row.get("SUBTLWF", "0"))
        zipf = math.log10(freq_count * (1_000_000_000 / 51_000_000)) + 3 if freq_count > 0 else 0.0
        records.append(
            {
                "word": word,
                "freq_count": freq_count,
                "freq_per_million": freq_per_million,
                "cd_count": int(_number(row.get("CDcount", "0"))),
                "cd_pct": _number(row.get("SUBTLCD", "0")),
                "zipf": round(zipf, 4),
                "dominant_pos": "" if row.get("Dom_PoS_SUBTLEX") == "#N/A" else row.get("Dom_PoS_SUBTLEX", ""),
                "dominant_pos_freq": int(_number(row.get("Freq_dom_PoS_SUBTLEX", "0"))),
                "dominant_pos_rel_freq": _number(row.get("Percentage_dom_PoS", "0")),
                "all_pos": [] if row.get("All_PoS_SUBTLEX") == "#N/A" else row.get("All_PoS_SUBTLEX", "").split("."),
                "all_pos_freqs": [int(_number(value)) for value in row.get("All_freqs_SUBTLEX", "").split(".") if value and value != "#N/A"],
                "polluted": word in {"don", "haven"},
            }
        )
    if not 70_300 <= len(records) <= 78_100:
        raise RuntimeError(f"SUBTLEX record count {len(records)} is outside the expected 74k ±5% range")
    top = max(records, key=lambda item: item["freq_per_million"])
    if top["word"] != "the":
        # The POS-augmented public CSV has "you" at rank 1. Keep building but make
        # the source mismatch explicit for review.
        print(f"Warning: highest SUBTLEX frequency is {top['word']!r}, not 'the'.")
    return records


def main() -> None:
    source = download(SUBTLEX_URLS, "subtlex.csv")
    records = parse_subtlex_csv(source)
    export_dataset("subtlex", records, FIELDS)
    print(f"Built SUBTLEX records: {len(records)}")


if __name__ == "__main__":
    main()
