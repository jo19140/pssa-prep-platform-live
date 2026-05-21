#!/usr/bin/env python3
"""
Local-only cleanup of V2 sample lessons in audit/v2-samples/sample-db-*.json.

Operates on JSON files in place. Does NOT touch the database.

What it fixes:
  1. Removes repeated sentences within practice passages (keeps first occurrence).
  2. Strips known padding sentences (legacy "Researchers observed..." filler etc.).
  3. Detects and reports intra-lesson passage duplication (same passage used in
     multiple practice items in one lesson).
  4. Reports any passage that ends up too short after cleanup (likely needs
     LLM regeneration; this script does NOT call OpenAI).

What it does NOT do:
  - Touch the production database.
  - Regenerate passages via LLM (flags them for manual/Codex follow-up).

Usage:
  python3 scripts/cleanup-v2-samples-local.py                 # dry-run, prints diff
  python3 scripts/cleanup-v2-samples-local.py --apply         # writes cleaned JSON
  python3 scripts/cleanup-v2-samples-local.py --apply --quiet # silent apply
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audit", "v2-samples")

# Sentences known to be filler/padding from prior generator bugs.
# These are stripped unconditionally before repetition checking.
LEGACY_FILLER_PATTERNS = [
    re.compile(r"\bThe passage gives another clear detail in simple language\.?", re.IGNORECASE),
    re.compile(r"\bStudents can use this detail to check the answer,? compare choices,? and explain why one choice is stronger than another\.?", re.IGNORECASE),
    re.compile(r"\bResearchers observed the area over several weeks and recorded changes in water level,? plant growth,? and foot traffic\.?", re.IGNORECASE),
    re.compile(r"\bTheir notes showed that a small change in one part of the environment could affect the whole system\.?", re.IGNORECASE),
    re.compile(r"\bThe community used the information to plan improvements that protected both people and the natural habitat\.?", re.IGNORECASE),
]

PRACTICE_SECTIONS = ["guidedPractice", "independentPractice", "exitTicket", "masteryCheck"]

MIN_PASSAGE_WORDS_BY_GRADE = {3: 120, 4: 120, 5: 120, 6: 200, 7: 200, 8: 200}


def words(text):
    return len((text or "").split())


def split_sentences(text):
    """Split passage into sentences, preserving terminal punctuation."""
    if not text:
        return []
    # Use a forgiving split that keeps the terminal punctuation with the sentence.
    pieces = re.split(r"(?<=[.!?])\s+", text.strip())
    return [piece.strip() for piece in pieces if piece.strip()]


def normalize_sentence(sentence):
    """Lowercase, strip punctuation/whitespace for repetition comparison."""
    return re.sub(r"[^a-z0-9\s]", " ", sentence.lower()).strip()


def strip_legacy_filler(passage):
    """Remove known filler sentence patterns from passage."""
    if not passage:
        return passage, 0
    cleaned = passage
    hits = 0
    for pattern in LEGACY_FILLER_PATTERNS:
        new_cleaned, n = pattern.subn("", cleaned)
        hits += n
        cleaned = new_cleaned
    # Collapse extra whitespace left behind
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned, hits


def dedup_sentences(passage):
    """Keep first occurrence of each sentence; remove later duplicates."""
    if not passage:
        return passage, 0
    sentences = split_sentences(passage)
    seen = set()
    kept = []
    removed = 0
    for sentence in sentences:
        key = normalize_sentence(sentence)
        if not key:
            continue
        if key in seen:
            removed += 1
            continue
        seen.add(key)
        kept.append(sentence)
    return " ".join(kept), removed


def clean_passage(passage):
    """Full cleanup: strip legacy filler, then dedup sentences."""
    if not passage:
        return passage, {"legacy_filler_removed": 0, "sentences_dedup": 0, "before_words": 0, "after_words": 0}
    before_words = words(passage)
    stripped, legacy_hits = strip_legacy_filler(passage)
    deduped, sentences_removed = dedup_sentences(stripped)
    after_words = words(deduped)
    return deduped, {
        "legacy_filler_removed": legacy_hits,
        "sentences_dedup": sentences_removed,
        "before_words": before_words,
        "after_words": after_words,
    }


def clean_lesson(lesson, grade):
    """Clean every practice passage in a lesson. Returns (cleaned_lesson, report)."""
    cleaned = json.loads(json.dumps(lesson))
    report = {
        "total_filler_removed": 0,
        "total_sentences_deduped": 0,
        "passages_processed": 0,
        "passages_now_too_short": 0,
        "intra_lesson_dupes": [],
    }
    min_words = MIN_PASSAGE_WORDS_BY_GRADE.get(grade, 120)
    all_passages_normalized = []  # to detect cross-item duplicates

    for section in PRACTICE_SECTIONS:
        items = cleaned.get(section) or []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            passage = item.get("passage")
            if not passage or not isinstance(passage, str):
                continue
            new_passage, stats = clean_passage(passage)
            report["passages_processed"] += 1
            report["total_filler_removed"] += stats["legacy_filler_removed"]
            report["total_sentences_deduped"] += stats["sentences_dedup"]
            if stats["after_words"] < min_words:
                report["passages_now_too_short"] += 1
            item["passage"] = new_passage
            all_passages_normalized.append((section, index, normalize_sentence(new_passage)[:400]))

    # Detect intra-lesson passage duplicates
    seen_norm = defaultdict(list)
    for section, index, norm in all_passages_normalized:
        if len(norm) > 200:
            seen_norm[norm].append((section, index))
    for norm, occurrences in seen_norm.items():
        if len(occurrences) > 1:
            report["intra_lesson_dupes"].append(occurrences)

    return cleaned, report


def main():
    apply = "--apply" in sys.argv
    quiet = "--quiet" in sys.argv

    sample_files = sorted(
        f for f in os.listdir(SAMPLE_DIR) if f.startswith("sample-db-") and f.endswith(".json")
    )
    if not sample_files:
        print(f"No sample-db-*.json files found in {SAMPLE_DIR}")
        return 1

    print(f"Found {len(sample_files)} sample files. Mode: {'APPLY (writing)' if apply else 'DRY-RUN (no writes)'}")
    print("=" * 80)

    grand_total = Counter()

    for fname in sample_files:
        path = os.path.join(SAMPLE_DIR, fname)
        with open(path) as fh:
            raw = json.load(fh)
        lesson = raw.get("lesson") or {}
        grade = lesson.get("gradeLevel", 6)

        cleaned_lesson, report = clean_lesson(lesson, grade)

        grand_total["passages_processed"] += report["passages_processed"]
        grand_total["total_filler_removed"] += report["total_filler_removed"]
        grand_total["total_sentences_deduped"] += report["total_sentences_deduped"]
        grand_total["passages_now_too_short"] += report["passages_now_too_short"]
        grand_total["intra_lesson_dupe_groups"] += len(report["intra_lesson_dupes"])

        if not quiet:
            print(f"\n{fname}  (grade {grade})")
            print(f"  Passages processed: {report['passages_processed']}")
            print(f"  Legacy filler sentences removed: {report['total_filler_removed']}")
            print(f"  Duplicate sentences within passages removed: {report['total_sentences_deduped']}")
            print(f"  Passages now below grade-band minimum ({MIN_PASSAGE_WORDS_BY_GRADE.get(grade, 120)} words): {report['passages_now_too_short']}")
            if report["intra_lesson_dupes"]:
                print(f"  Intra-lesson passage duplicate clusters: {len(report['intra_lesson_dupes'])}")
                for cluster in report["intra_lesson_dupes"][:3]:
                    print(f"    - Same passage used in: {cluster}")

        if apply:
            raw["lesson"] = cleaned_lesson
            with open(path, "w") as fh:
                json.dump(raw, fh, indent=2)

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    for key in ("passages_processed", "total_filler_removed", "total_sentences_deduped", "passages_now_too_short", "intra_lesson_dupe_groups"):
        print(f"  {key}: {grand_total[key]}")

    if not apply:
        print("\nDry-run only. Re-run with --apply to write the cleaned JSON back.")
    else:
        print("\nApplied. Files updated in place.")

    if grand_total["passages_now_too_short"] > 0 or grand_total["intra_lesson_dupe_groups"] > 0:
        print("\nFollow-up needed (this script can't do these automatically):")
        if grand_total["passages_now_too_short"]:
            print(f"  - {grand_total['passages_now_too_short']} passage(s) are below grade-band minimum after cleanup.")
            print("    These need LLM regeneration. Have Codex run a targeted regenerator on them.")
        if grand_total["intra_lesson_dupe_groups"]:
            print(f"  - {grand_total['intra_lesson_dupe_groups']} intra-lesson duplicate cluster(s) detected.")
            print("    These need LLM regeneration to produce unique passages per practice item.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
