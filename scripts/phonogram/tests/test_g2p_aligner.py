from pathlib import Path
import json

from scripts.phonogram.lib.g2p_aligner import flatten_alignment_graphemes, flatten_alignment_phones
from scripts.phonogram.lib.schemas import DATA_DIR


FIXTURE_DIR = Path(__file__).with_name("fixtures")


def _load_alignment_lookup():
    path = DATA_DIR / "alignment.json"
    if not path.exists():
        raise AssertionError("data/phonogram/alignment.json is missing; run make phonogram before fixture tests")
    records = json.loads(path.read_text(encoding="utf-8"))
    return {(record["word"], record["variant"]): record["alignment"] for record in records}


def test_known_alignment_fixtures_do_not_regress():
    lookup = _load_alignment_lookup()
    fixtures = json.loads((FIXTURE_DIR / "known_alignments.json").read_text(encoding="utf-8"))
    assert len(fixtures) >= 100
    for item in fixtures:
        actual = lookup[(item["word"], item["variant"])]
        assert actual == item["alignment"], item["word"]
        assert flatten_alignment_graphemes(actual) == item["word"]


def test_fixture_phone_sequences_are_not_empty():
    fixtures = json.loads((FIXTURE_DIR / "known_alignments.json").read_text(encoding="utf-8"))
    for item in fixtures:
        assert flatten_alignment_phones(item["alignment"]), item["word"]
