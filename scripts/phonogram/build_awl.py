#!/usr/bin/env python3
"""Build the Coxhead Academic Word List dataset."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

if __package__ is None:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from scripts.phonogram.lib.schemas import download, export_dataset


AWL_URLS = ["https://www.eapfoundation.com/vocab/academic/awllists/index.php"]
FIELDS = ["headword", "sublist", "word_family"]


def parse_awl_html(path: Path) -> list[dict[str, object]]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    table_start = text.find('<table class="offset">')
    table_end = text.find("</table>", table_start)
    if table_start < 0 or table_end < 0:
        raise RuntimeError("Could not find AWL table in source HTML")
    table = text[table_start:table_end]
    rows = re.findall(r"<tr><td>(.*?)</td><td>(\d+)</td><td>(.*?)</td></tr>", table, flags=re.S)
    records: list[dict[str, object]] = []
    for head_html, sublist, family_html in rows:
        head_match = re.search(r"<b>(.*?)</b>", head_html)
        if not head_match:
            continue
        family = [html.unescape(value).strip().lower() for value in re.findall(r">([^<>]+)</a>", family_html)]
        records.append(
            {
                "headword": html.unescape(head_match.group(1)).strip().lower(),
                "sublist": int(sublist),
                "word_family": family,
            }
        )
    if len(records) != 570:
        raise RuntimeError(f"AWL must contain exactly 570 headwords; got {len(records)}")
    counts = {sublist: sum(1 for item in records if item["sublist"] == sublist) for sublist in range(1, 11)}
    expected = {**{sublist: 60 for sublist in range(1, 10)}, 10: 30}
    if counts != expected:
        raise RuntimeError(f"AWL sublist counts are wrong: {counts}")
    return records


def main() -> None:
    source = download(AWL_URLS, "awl.html")
    records = parse_awl_html(source)
    export_dataset("awl", records, FIELDS, index_field="headword")
    print(f"Built AWL records: {len(records)}")


if __name__ == "__main__":
    main()
