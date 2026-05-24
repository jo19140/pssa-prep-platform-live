from pathlib import Path
import json

from scripts.phonogram.lib.arpabet_to_ipa import phones_to_ipa, stress_pattern, syllable_count


FIXTURE_DIR = Path(__file__).with_name("fixtures")


def test_arpabet_fixture_pairs():
    pairs = json.loads((FIXTURE_DIR / "arpabet_ipa_pairs.json").read_text(encoding="utf-8"))
    for item in pairs:
        assert phones_to_ipa(item["arpabet"].split()) == item["ipa"]


def test_pronunciation_snapshot():
    phones = "P R AH0 N AH2 N S IY0 EY1 SH AH0 N".split()
    assert phones_to_ipa(phones) == "prəˌnʌnsiˈeɪʃən"
    assert syllable_count(phones) == 5
    assert stress_pattern(phones) == "02010"
