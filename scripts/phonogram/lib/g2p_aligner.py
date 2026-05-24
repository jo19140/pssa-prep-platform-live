"""Parse Phonetisaurus-aligned CMUdict output."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .arpabet_to_ipa import phone_to_ipa


ALIGNED_CMUDICT_URL = "https://raw.githubusercontent.com/ckw017/aligned-cmudict/master/cmudict.formatted.corpus"


def _clean_graphemes(raw: str) -> str:
    return raw.replace("|", "").replace("_", "")


def _split_phonemes(raw: str) -> list[str]:
    if raw == "_":
        return []
    return [part for part in raw.split("|") if part and part != "_" and part != "#"]


def _phone_to_ipa_safe(phone: str) -> str:
    try:
        return phone_to_ipa(phone, word_final=False)
    except ValueError:
        return phone


def parse_alignment_line(line: str) -> tuple[str, tuple[str, ...], list[dict[str, Any]]]:
    chunks: list[dict[str, Any]] = []
    word_parts: list[str] = []
    phones: list[str] = []
    for token in line.strip().split():
        if "}" not in token:
            continue
        raw_graphemes, raw_phones = token.split("}", 1)
        graphemes = _clean_graphemes(raw_graphemes).lower()
        phonemes = _split_phonemes(raw_phones)
        if graphemes:
            word_parts.append(graphemes)
        phones.extend(phonemes)
        if graphemes or phonemes:
            chunks.append(
                {
                    "graphemes": graphemes,
                    "phonemes_arpabet": phonemes,
                    "phonemes_ipa": [
                        _phone_to_ipa_safe(phone)
                        for phone in phonemes
                    ],
                }
            )
    return "".join(word_parts), tuple(phones), _merge_empty_graphemes(chunks)


def _merge_empty_graphemes(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    for chunk in chunks:
        if not chunk["graphemes"] and merged:
            merged[-1]["phonemes_arpabet"].extend(chunk["phonemes_arpabet"])
            merged[-1]["phonemes_ipa"].extend(chunk["phonemes_ipa"])
            continue
        merged.append(chunk)
    return merged


def load_exception_alignments(path: Path) -> dict[tuple[str, tuple[str, ...]], list[dict[str, Any]]]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    output: dict[tuple[str, tuple[str, ...]], list[dict[str, Any]]] = {}
    for item in data:
        output[(item["word"], tuple(item["phonemes_arpabet"]))] = item["alignment"]
    return output


def load_upstream_alignments(path: Path) -> dict[tuple[str, tuple[str, ...]], list[dict[str, Any]]]:
    output: dict[tuple[str, tuple[str, ...]], list[dict[str, Any]]] = {}
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line.strip():
            continue
        word, phones, chunks = parse_alignment_line(line)
        if word and phones:
            output[(word, phones)] = chunks
    return output


def simple_fallback_alignment(word: str, phones: list[str]) -> list[dict[str, Any]]:
    letters = re.findall(r"[a-z]+|[^a-z]", word.lower())
    graphemes = list("".join(letters))
    chunks: list[dict[str, Any]] = []
    max_len = max(len(graphemes), len(phones))
    for index in range(max_len):
        grapheme = graphemes[index] if index < len(graphemes) else ""
        phone = phones[index] if index < len(phones) else None
        chunk_phones = [phone] if phone else []
        chunks.append(
            {
                "graphemes": grapheme,
                "phonemes_arpabet": chunk_phones,
                "phonemes_ipa": [phone_to_ipa(phone, word_final=index == len(phones) - 1)] if phone else [],
            }
        )
    return chunks


def flatten_alignment_phones(chunks: list[dict[str, Any]]) -> list[str]:
    return [phone for chunk in chunks for phone in chunk["phonemes_arpabet"]]


def flatten_alignment_graphemes(chunks: list[dict[str, Any]]) -> str:
    return "".join(chunk["graphemes"] for chunk in chunks)
