"""CMUdict ARPABET to broad General American IPA conversion."""

from __future__ import annotations

import re


CONSONANT_IPA = {
    "B": "b",
    "CH": "tʃ",
    "D": "d",
    "DH": "ð",
    "F": "f",
    "G": "ɡ",
    "HH": "h",
    "JH": "dʒ",
    "K": "k",
    "L": "l",
    "M": "m",
    "N": "n",
    "NG": "ŋ",
    "P": "p",
    "R": "ɹ",
    "S": "s",
    "SH": "ʃ",
    "T": "t",
    "TH": "θ",
    "V": "v",
    "W": "w",
    "Y": "j",
    "Z": "z",
    "ZH": "ʒ",
}

VOWEL_IPA = {
    "AA": "ɑː",
    "AE": "æ",
    "AH": "ə",
    "AO": "ɔː",
    "AW": "aʊ",
    "AY": "aɪ",
    "EH": "ɛ",
    "ER": "ɝː",
    "EY": "eɪ",
    "IH": "ɪ",
    "IY": "iː",
    "OW": "oʊ",
    "OY": "ɔɪ",
    "UH": "ʊ",
    "UW": "uː",
}

VOWELS = set(VOWEL_IPA)
ARPABET_RE = re.compile(r"^([A-Z]+)([012])?$")


def split_phone(phone: str) -> tuple[str, str | None]:
    match = ARPABET_RE.match(phone)
    if not match:
        raise ValueError(f"Unknown ARPABET token: {phone}")
    return match.group(1), match.group(2)


def is_vowel(phone: str) -> bool:
    base, _stress = split_phone(phone)
    return base in VOWELS


def phone_to_ipa(phone: str, *, word_final: bool = False) -> str:
    base, stress = split_phone(phone)
    if base == "AH":
        return "ə" if stress == "0" else "ʌ"
    if base == "ER" and word_final and stress == "0":
        return "ɝ"
    if base == "IY" and stress == "0":
        return "i"
    if base in VOWEL_IPA:
        return VOWEL_IPA[base]
    if base in CONSONANT_IPA:
        return CONSONANT_IPA[base]
    raise ValueError(f"No IPA mapping for ARPABET token: {phone}")


def phones_to_ipa_tokens(phones: list[str]) -> list[str]:
    return [
        phone_to_ipa(phone, word_final=index == len(phones) - 1)
        for index, phone in enumerate(phones)
    ]


def stress_pattern(phones: list[str]) -> str:
    digits: list[str] = []
    for phone in phones:
        base, stress = split_phone(phone)
        if base in VOWELS:
            digits.append(stress or "0")
    return "".join(digits)


def syllable_count(phones: list[str]) -> int:
    return len(stress_pattern(phones))


def phones_to_ipa(phones: list[str]) -> str:
    """Convert phones to IPA with stress before the syllable onset.

    This v1 syllabifier uses a small maximum-onset approximation: when a stressed
    vowel is reached, stress is inserted before the consonant run immediately
    before it, unless that run is word-initial or follows another vowel.
    """

    ipa = phones_to_ipa_tokens(phones)
    stress_marks: dict[int, str] = {}
    last_vowel_index: int | None = None
    for index, phone in enumerate(phones):
        base, stress = split_phone(phone)
        if base not in VOWELS:
            continue
        if stress in {"1", "2"}:
            onset = index
            while onset > 0 and not is_vowel(phones[onset - 1]):
                onset -= 1
            if last_vowel_index is None and onset == 0:
                marker_index = 0
            elif last_vowel_index is not None:
                marker_index = max(last_vowel_index + 1, onset)
            else:
                marker_index = index
            stress_marks[marker_index] = "ˈ" if stress == "1" else "ˌ"
        last_vowel_index = index

    output: list[str] = []
    for index, token in enumerate(ipa):
        if index in stress_marks:
            output.append(stress_marks[index])
        output.append(token)
    return "".join(output).replace("ɹ", "r")
