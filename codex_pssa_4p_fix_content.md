# PSSA Grade 3 content-quality consolidation — fixes + re-tags + re-keys + 5 permanent gates (SUPERSEDES the earlier 2-item fix spec; ONE rebuild, ONE approval pass after)

## Context
Three independent reviews (Pro round 1, Claude full 91-item adversarial review, Pro round 2) converged on: 3 item defects, 1 systemic EC-category integrity issue (13 items), 1 systemic evidence-clueing issue (~6-8 items), and 5 missing permanent gates. Jonathan's standard is locked: zero defects against every defined standard. This PR brings the bank to that bar in ONE corpus change. Findings of record: `specs/pssa-grade3-adversarial-review-findings.md`. The dev DB has NO approvals; after this merges, fresh-DB rebuild → Jonathan's single approval pass.

## Part 1 — Item fixes (3)
1. **`pssa_ebsr_g3_bell_01`** (BLOCKER): Part A choices B and C are byte-identical. Replace C with a NEW distinct distractor: passage-grounded plausible misreading of The Porch Bell, not supported by any Part B evidence, distinct in meaning from A/B/D. Key stays D; Part B unchanged.
2. **`pssa_item_g3_lantern_06`** (circular vocab key): replace keyed option B with a non-circular definition — recommended "a job Nia feels responsible for finishing" (must define "promise" without using it; uniquely correct vs A/C/D).
3. **`pssa_item_g3_reading_24`** (surface-locatable vocab key): keyed option D currently paraphrases the source sentence ("kids followed the bus route in the air" ≈ "Two kids traced the bus route in the air") — answerable by sentence-matching. Rewrite all four options as DEFINITIONS (keyed: "moved a finger along the path of something" or equivalent); model on the clean exemplars `pssa_item_g3_bell_05` ("smudge") and `pssa_item_g3_reading_7` ("creases").

## Part 2 — S1 genre/EC re-tags (13 items; category integrity)
Re-tag each item's `eligibleContent` (+ `assessmentAnchor`/`standardCode`/`reportingCategory` consistently) to the genre-matching EC family. The SKILL stays identical — only the family letter changes (A-K↔B-K, A-C↔B-C, A-V↔B-V at the same descriptor position); every re-tag must resolve against the crosswalk AND re-pass the EC-skill-match gate (if any skill does not cleanly map, STOP and report rather than force it).
| Item | From | To (genre-matching) |
|---|---|---|
| pssa_item_g3_reading_1 (creek) | E03.A-K.1.1.1 | E03.B-K.1.1.1 |
| pssa_item_g3_reading_21 (creek) | E03.A-C.2.1.1 | E03.B-C.2.1.1 |
| pssa_item_g3_reading_6 (creek) | E03.A-V.4.1.1 | E03.B-V.4.1.1 |
| pssa_item_g3_reading_2 (map) | E03.A-K.1.1.2 | E03.B-K.1.1.2 |
| pssa_item_g3_reading_22 (map) | E03.A-C.3.1.1 | E03.B-C.3.1.1 |
| pssa_item_g3_reading_7 (map) | E03.A-V.4.1.2 | E03.B-V.4.1.2 |
| pssa_item_g3_reading_18 (lunch) | E03.A-K.1.1.1 | E03.B-K.1.1.1 |
| pssa_item_g3_reading_23 (lunch) | E03.A-V.4.1.1 | E03.B-V.4.1.1 |
| pssa_item_g3_reading_3 (lunch) | E03.A-K.1.1.3 | E03.B-K.1.1.3 |
| pssa_item_g3_reading_20 (cart) | E03.A-K.1.1.3 | E03.B-K.1.1.3 |
| pssa_item_g3_reading_5 (cart) | E03.A-C.3.1.1 | E03.B-C.3.1.1 |
| pssa_item_g3_reading_14 (mural, literary) | E03.B-C.3.1.2 | E03.A-K.1.1.2 — see pre-resolved case below |
| pssa_item_g3_reading_9 (mural, literary) | E03.B-K.1.1.2 | E03.A-K.1.1.2 |

**GLOBAL RULE (Pro patch, round 4): NO nearest-neighbor EC mapping is allowed in this PR.** If the exact family-letter equivalent does not exist in the crosswalk, Codex must STOP and report the item; it must not choose a nearby descriptor. CROSSWALK VERIFICATION (done deterministically against `data/pssa/anchor_ec_crosswalk.csv` before this spec shipped): 12 of 13 targets EXIST; `E03.A-C.3.1.2` does NOT (grade-3 A-C ends at 3.1.1).

**Pre-resolved case — `pssa_item_g3_reading_14`:** its clean family-letter swap target is missing, so its re-tag goes to `E03.A-K.1.1.2` (key ideas/central message — the item asks what a detail SHOWS about the mural's meaning, an inference-toward-key-idea construct) **SUBJECT TO the EC-skill-match audit passing honestly**. If that audit fails, STOP and report — do not force, do not pick another EC. Note: this makes TWO mural items share A-K.1.1.2 (reading_9 + reading_14) — exactly at the EC-variety gate's max-2 limit among reading 1-pt items; assert the gate still passes and report the tightness.
Post-re-tag category math must be reported: pool A points (literary passages only) and B points; form-feasibility check that A 15–21 remains satisfiable from literary passages alone (expected: yes, ~55+ A points across mural/lantern/bell).

## Part 3 — S2 evidence-overlap re-keys (mural, lunch, cart + creek vocab pair)
Constraint: on any passage, multipoint items (EBSR Part B / HOT_TEXT / MULTI_SELECT) may share AT MOST ONE keyed evidence sentence pairwise. Current state: mural EBSR-B=HT=MS (same 2 sentences ×3 items); **cart EBSR-B=HT=MS (same 2 sentences ×3 items — "empty the heavy paper boxes" + "Weight can hide a small problem"; Pro correction to the original finding)**; lunch HT=MS identical (lunch EBSR-B targets different evidence — counted pauses/noticed slow spots — and is COMPLIANT, do not touch).

**S2 re-key allowlist (EXACT — Pro patch 1; touching any other item violates Forbidden):**
- `pssa_ebsr_g3_mural_01`, `pssa_ht_g3_mural_01`, `pssa_ms_g3_mural_01`
- `pssa_ht_g3_lunch_01`, `pssa_ms_g3_lunch_01`
- `pssa_ebsr_g3_cart_01`, `pssa_ht_g3_cart_01`, `pssa_ms_g3_cart_01`
- `pssa_item_g3_reading_6`, `pssa_item_g3_reading_16` (creek vocab de-twin)

Re-key (and re-author option/span text where needed to keep new keys uniquely defensible):
- Feasible pattern per passage with evidence sentences {s1..s4}: e.g. EBSR-B {s3,s4}, HT {s2,s3}, MS {s2,s4} — pairwise overlap exactly 1. Codex chooses the assignment per passage such that every keyed pair is genuinely the BEST answer for that item's stem (re-word stems/instructions minimally if needed to make the new targets correct); all single-defensibility, grounding, and distractor rules re-apply.
- Lantern/bell: verify ≤1 pairwise overlap after any changes (currently 1 shared sentence each — compliant; do not touch unless a gate fails).
- Creek vocab pair `reading_16`/`reading_6`: de-twin the keys — reword one item's options so the two keys no longer define each other (e.g., reading_6 keyed "dim and pale" family vs reading_16 "became weaker"); both remain proper definitions.

## Part 4 — Five permanent gates (each with negative fixtures + bank-wide 0-failure assertion post-fix)
1. **`PSSA_ITEM_INTRA_CHOICE_DUPLICATE`** (precision rules as previously specced): normalized compare for MCQ/EBSR-A/EBSR-B/MS choices + MG row/column labels; RAW compare for INLINE_DROPDOWN options (case-only differences legitimate — `dropdown_titles_01` must PASS); EXEMPT drag-drop token pools and HOT_TEXT token-kind spans (`drag_address/dialogue_01` must PASS).
2. **`PSSA_VOCAB_KEY_CONSTRUCT`** (Pro patch 3 — precise normalization to avoid false positives): for vocabulary items (V-family ECs), the keyed option must NOT contain the tested word (or its inflections). Near-paraphrase detection: compare the keyed option to the source sentence containing the tested word; REMOVE the tested word and its inflections before comparison; ignore stop words, punctuation, capitalization, and common grade-level function words; count only normalized content words; **fail at ≥3 shared content words** unless the item is manually marked with an explicit audit rationale AND still passes human review. `lantern_06`/`reading_24` pre-fix = negative fixtures (must fail for the right reason); `bell_05`/`reading_7` = positive controls (must pass — short legitimate definitions must not false-fail).
3. **`PSSA_SA_BANDS_NONEMPTY`** (Pro patch 2 — covers the full chain, not just source data): every SHORT_ANSWER must carry non-empty scoreBandExamples for bands 3/2/1/0 (band + response + why), asserted at THREE layers: (1) source exemplar JSON / canonical imported data — import-blocking; (2) the `/admin/pssa-review` reviewer DTO — test asserts the queue DTO carries all four bands; (3) any generated reviewer-copy artifact used for human review — the generator must fail loudly on a blank band rather than render an empty field. A reviewer-VISIBLE blank band is a failure even when the backend data is complete (the v1 reviewer-copy incident: data existed, the export dropped it, and the rubric-band judgment was impossible from the review surface).
4. **`PSSA_ITEM_EC_GENRE_MATCH`**: passage-based items' EC family letter must match passage genre (A↔literary, B↔informational); D-family and standalone items exempt; SA included.
5. **`PSSA_PASSAGE_MULTIPOINT_EVIDENCE_OVERLAP`**: pairwise keyed-evidence overlap between multipoint items on one passage ≤1 sentence (compare keyed span/choice source sentences after normalization). Mural/lunch/cart pre-fix = negative fixtures.
All five wire into the author audits + import plan gates (merged-membership, per the #4p pattern).

## Part 5 — Consequences (enumerate every flip)
- contentHash changes: the 3 fixed items + 13 re-tagged + re-keyed S2 items (~6-9) + de-twinned creek item ≈ **22-26 items**; all OTHER item + all passage hashes byte-identical (golden proof; passages untouched).
- `GRADE3_SOURCE_CORPUS_HASH` old→new; DB-6.5 pinned mapping updated for exactly the changed set; PR B/C counts unchanged (103); dry-run reports: changed rows only.
- Merged batch gates re-run and PASS (position distributions: re-keys may move EBSR-B/MS/HT correct patterns — keep merged distributions inside thresholds).
- **Fresh disposable DB rebuild** (operator, after audit): migrate → crosswalk → import dry-run (7/91/12/12/8, 0 failures incl. all 5 new gates) → write ×2 (no-op second) → THEN Jonathan's single approval pass.

## Forbidden
Touching passages' text; any item not listed; assembler/scorer/projection/routes/schema; "improvements" beyond the enumerated scope. If a re-tag or re-key cannot be made cleanly defensible, STOP and report that item rather than forcing it.

## Stop — report (for Claude's independent audit)
Replacement texts for the 3 fixes; the 13 re-tag diffs + crosswalk resolution + EC-skill re-audit results; per-passage S2 key assignments (old→new) + defensibility rationale per changed item; creek vocab de-twin texts; all 5 gate implementations + rule tables + fixture results + bank-wide sweep (0 failures, false-positive patterns passing); hash-change table (exact item list; everything else identical); merged batch-gate outputs; category-math report post-re-tag; dry-run manifest; tsc/build/all-suites. Do NOT approve anything. Do NOT touch passages.
