#!/usr/bin/env python3
"""Build Phonetisaurus-derived grapheme-to-phoneme alignments for CMUdict."""

from __future__ import annotations

import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path
from typing import Any

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from scripts.phonogram.lib.g2p_aligner import (
    ALIGNED_CMUDICT_URL,
    flatten_alignment_graphemes,
    flatten_alignment_phones,
    load_exception_alignments,
    load_upstream_alignments,
    simple_fallback_alignment,
)
from scripts.phonogram.lib.schemas import DATA_DIR, download, export_dataset, load_json


FIELDS = ["word", "variant", "alignment", "confidence", "method"]


def load_cmudict() -> list[dict[str, Any]]:
    path = DATA_DIR / "cmudict.json"
    if not path.exists():
        raise RuntimeError("Run build_cmudict.py before build_alignment.py")
    return load_json(path)


def load_subtlex_by_rank() -> list[str]:
    path = DATA_DIR / "subtlex.json"
    if not path.exists():
        return []
    rows = load_json(path)
    return [row["word"] for row in sorted(rows, key=lambda item: item["freq_count"], reverse=True)]


def confidence_for(word: str, phones: list[str], alignment: list[dict[str, Any]], method: str) -> str:
    if method == "fallback":
        return "low"
    phone_match = flatten_alignment_phones(alignment) == phones
    word_match = flatten_alignment_graphemes(alignment) == word
    if phone_match and word_match and method in {"ruleset", "exception_list"}:
        return "high"
    if phone_match and word_match:
        return "medium"
    return "low"


def build_records() -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    source = download([ALIGNED_CMUDICT_URL], "aligned-cmudict.formatted.corpus")
    upstream = load_upstream_alignments(source)
    exceptions = load_exception_alignments(Path(__file__).with_name("lib") / "g2p_exceptions.json")
    records: list[dict[str, Any]] = []
    missing: list[dict[str, str]] = []
    for cmu in load_cmudict():
        word = cmu["word"]
        phones = cmu["phonemes_arpabet"]
        key = (word, tuple(phones))
        method = "ruleset"
        alignment = upstream.get(key)
        if key in exceptions:
            alignment = exceptions[key]
            method = "exception_list"
        if alignment is None:
            alignment = simple_fallback_alignment(word, phones)
            method = "fallback"
            missing.append({"word": word, "variant": str(cmu["variant"]), "reason": "not present in upstream aligned CMUdict"})
        records.append(
            {
                "word": word,
                "variant": cmu["variant"],
                "alignment": alignment,
                "confidence": confidence_for(word, phones, alignment, method),
                "method": method,
            }
        )
    return records, missing


def write_quality_report(records: list[dict[str, Any]], missing: list[dict[str, str]]) -> None:
    counts = Counter(record["confidence"] for record in records)
    top_words = set(load_subtlex_by_rank()[:5000])
    top_records = [record for record in records if record["word"] in top_words]
    high_top = sum(1 for record in top_records if record["confidence"] == "high")
    coverage = (high_top / len(top_records) * 100) if top_records else 0.0
    lowest = [record for record in records if record["confidence"] == "low"][:50]
    lines = [
        "# Phonogram Alignment Quality Report",
        "",
        f"- Total entries aligned: {len(records)}",
        f"- High confidence: {counts['high']}",
        f"- Medium confidence: {counts['medium']}",
        f"- Low confidence: {counts['low']}",
        f"- SUBTLEX top-5000 high-confidence coverage: {coverage:.2f}%",
        "",
        "## Source Notes",
        "",
        "- Alignment source: ckw017/aligned-cmudict, which documents Phonetisaurus as its aligner.",
        "- SUBTLEX polluted entries flagged in subtlex outputs: `don`, `haven`.",
        "",
        "## 50 Lowest-Confidence Words",
        "",
    ]
    lines.extend(f"- {record['word']} ({record['variant']})" for record in lowest)
    lines.extend(["", "## Missing From Upstream Alignment", ""])
    lines.extend(f"- {item['word']} ({item['variant']}): {item['reason']}" for item in missing[:500])
    if len(missing) > 500:
        lines.append(f"- ... {len(missing) - 500} additional fallback entries omitted from this report")
    (DATA_DIR / "alignment_quality_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_super_database() -> None:
    path = DATA_DIR / "phonogram.sqlite"
    if path.exists():
        path.unlink()
    connection = sqlite3.connect(path)
    try:
        for name in ["cmudict", "subtlex", "awl", "alignment"]:
            source = DATA_DIR / f"{name}.sqlite"
            if not source.exists():
                continue
            connection.execute(f"ATTACH DATABASE ? AS src_{name}", (str(source),))
            connection.execute(f"CREATE TABLE {name} AS SELECT * FROM src_{name}.{name}")
            index_field = "headword" if name == "awl" else "word"
            connection.execute(f"CREATE INDEX idx_{name}_{index_field} ON {name}({index_field})")
            connection.execute(f"DETACH DATABASE src_{name}")
        connection.commit()
    finally:
        connection.close()


def main() -> None:
    records, missing = build_records()
    export_dataset("alignment", records, FIELDS)
    write_quality_report(records, missing)
    write_super_database()
    print(f"Built alignment records: {len(records)}")


if __name__ == "__main__":
    main()
