# P2 — 7-8 a_e lesson content (worked exemplar)

**Date:** 2026-06-14 · target `a_e` · `presentationProfile: BAND_7_8` · Verified against `origin/main` (`9a41bd3`).
**Status: FLAT-LIST gate-clean ✅; PRODUCER-PATH validation pending.** The flat-list lesson audit passed (decodability 1.000, 0 unclassified/blocked/trigrams, story 80w, Part 2 PASS, pseudowords oracle-clean, dictation clean; `his`/`pals`/`mess` accepted). **BUT (Pro caught):** the real producer assembles Part 3 as **seed `targetWords` (`cake game make same tape`) + `contrastiveLine2` + `contrastiveLine3`** — NOT my hand-listed lines — so the actual generated lesson differs (includes `make`/`same`). The authoritative gate is the **producer-path test** in `specs/p2-content-pr-codex-spec.md`. The corrected variant fields (contrastiveLine2 = `cap cape man mane hat hate`, contrastiveLine3 = `ran lake hand fast name desk`; "he" added to assumed-known) live in that spec. Don't treat this as production-final until the producer-path test is green.

## The hard constraint (grounded, not assumed)
From `phase3EntrySeed.ts`, the `a_e` target allows **only**:
`allowedPatternCodes = [closed_short_a, closed_short_i, closed_short_o, closed_short_u, closed_short_e, a_e]`
`blockedPatternCodes = [i_e, o_e, u_e, e_e, ai, ay, oa, ee]`

So every decodable word must be a **short-vowel closed syllable** (incl. blends + the `th` digraph, which the validated K-3 story uses) **or an `a_e` word**. Irregular words are allowed **only** as explicit heart/sight words (the lesson's heart-word inventory: `the, a, to, I, he, said, was, they, of`). No vowel teams, r-controlled, other VCe, diphthongs, `y`-as-vowel, `qu`, `ck`/`ch`/`sh` (avoided to stay safe), or `all`.
> This is exactly what tripped both mocks: `rough`(ough), `stayed/Stays`(ay), `eyes`(irreg), `ball`(all), `won/one`(irreg), `for`(or), `by`(y-vowel), `took`(oo). None are allowed.

## Content (Coach Mode register; same a_e skill)

### Part 2 — the rule (mature wording)
**Rule:** "Silent e changes the vowel to its long sound. When a short word adds silent e, the vowel says its name: **cap → cape**. The e stays silent."
**Reteach (on miss):** "Silent e at the end makes the vowel long. Try {word} again."
**Demonstration pairs** (reuse the validated set — all clean): cap→cape, at→ate, man→mane, tap→tape, hat→hate.

### Part 3 — decoding reps (PRODUCER assembles these; ~17 real words, 15-20 band)
The producer builds Part 3 real words as **Line 1 = seed `targetWords` (`cake game make same tape`, fixed/shared) + `contrastiveLine2` + `contrastiveLine3`** (pseudowords = seed set). The variant only authors the two contrastive lines:
**`contrastiveLine2` · minimal pairs (short a ↔ a_e):** cap · cape · man · mane · hat · hate
**`contrastiveLine3` · review mix (closed ↔ a_e):** ran · lake · hand · fast · name · desk
**Generated real-word set (asserted by the producer-path test):** cake game make same tape · cap cape man mane hat hate · ran lake hand fast name desk (= 17).
**Nonsense words (Part 3, never scored — seed's oracle-clean set):** zake · mave · pame · vade · sape · nace · gake · tave
**Nonsense words (Part 3, never scored — reuse the seed's oracle-clean set):** zake · mave · pame · vade · sape · nace · gake · tave

### Part 4 — power words (heart/vocab)
Heart words: **said · was · they · the** (irregular — taught, not decoded)
Power/vocab words: **brave · pace · gap** (support the story meaning; dropped `gave` — it's a decoding target, not a vocab concept)

### Part 5 — sentences (all hand-audited decodable)
1. Jake ran his last race.
2. He set a fast pace.
3. Jake gave it his best.
4. His pals gave a wave.
5. Jake was brave.
6. He made up the gap.

### Part 6 — spelling
**Dictated words (a_e):** cape · made · lake · game · gave · brave
**Dictated sentences:** "Jake made a save." · "He gave his best."

### Part 7 — story (≈80 words, age-respecting, strictly decodable)
**Title:** *Jake at the Race*  *(no possessive apostrophe — avoids the `'s` question)*

> Jake had his last race. He came in late. His face felt hot. "Did I mess up?" Jake said. But Jake did not stop. He set his pace. A pal said, "Jake, get set." Jake felt bad, but he ran on. He ran his best lap and did not fade. Jake ran fast in his lane. He made up the gap. At the end, Jake came in. His pals gave him a wave. Jake was brave. He gave his best.

*(Word count: 80 — dropped "it" from the final sentence to land within the 45-80 Phase 3 band, 81→80.)*

### Part 8 — comprehension (reflection, low-pressure, no auto-grade)
1. Why did Jake think he made a mistake? *(inference)*
2. How do you know Jake did not give up? *(literal)*
3. Tell what happened at the end, in your own words. *(retell)*
4. Tell about a time you kept going after a setback. *(personal connection)*

---

## Story decodability audit (every word classified — the centerpiece)
Pattern key: **A**=a_e · **a/i/o/u/e**=closed short vowel · **H**=heart/sight word (taught, irregular).

| word | pattern | ok |
|---|---|---|
| Jake | A | ✓ |
| had | closed-a | ✓ |
| his | closed-i | ✓ |
| last | closed-a (st) | ✓ |
| race | A | ✓ |
| He | H (open-syll heart) | ✓ |
| came | A | ✓ |
| in | closed-i | ✓ |
| late | A | ✓ |
| His | closed-i | ✓ |
| face | A | ✓ |
| felt | closed-e (lt) | ✓ |
| hot | closed-o | ✓ |
| Did | closed-i | ✓ |
| I | H | ✓ |
| make | A | ✓ |
| a | H | ✓ |
| mess | closed-e (FLOSS -ss) | ✓ ⚠ watch |
| up | closed-u | ✓ |
| said | H (irregular) | ✓ |
| pal | closed-a | ✓ |
| get | closed-e | ✓ |
| set | closed-e | ✓ |
| felt | closed-e (lt) | ✓ |
| bad | closed-a | ✓ |
| but | closed-u | ✓ |
| on | closed-o | ✓ |
| But | closed-u | ✓ |
| did | closed-i | ✓ |
| not | closed-o | ✓ |
| stop | closed-o (st) | ✓ |
| set | closed-e | ✓ |
| pace | A | ✓ |
| ran | closed-a | ✓ |
| fast | closed-a (st) | ✓ |
| lane | A | ✓ |
| made | A | ✓ |
| up | closed-u | ✓ |
| the | H | ✓ |
| gap | closed-a | ✓ |
| At | closed-a | ✓ |
| end | closed-e (nd) | ✓ |
| pals | closed-a (ls) | ✓ |
| gave | A | ✓ |
| him | closed-i | ✓ |
| wave | A | ✓ |
| was | H (irregular) | ✓ |
| brave | A | ✓ |
| best | closed-e (st) | ✓ |
| ran | closed-a | ✓ |
| best | closed-e (st) | ✓ |
| lap | closed-a | ✓ |
| and | closed-a (nd) | ✓ |
| fade | A | ✓ |

**Hand audit result:** every word ∈ {a_e, closed-short, heart-word}. No vowel teams, r-controlled, other VCe, diphthongs, `qu`, `ck/ch/sh`, `all`, `-ind/-ild/-old/-ost` exception words, or undeclared irregulars. Heart words used: he, I, a, said, the, was — all in the lesson heart inventory.

## Rejected words / known traps (kept OUT on purpose)
Deliberately avoided because they're outside the a_e allowed set — these are the ones that catch you:
- **Vowel teams:** wait/ai, stay/stayed/ay, team/read/ea, ball→ (and `all`), boat/oa, week/ee.
- **r-controlled:** for, her, first, hard, start, score, after, world.
- **other VCe / blocked:** close/o_e, like/i_e, here/e_e, cute/u_e.
- **long-vowel exception words:** find, kind, mind, child, wild, old, cold, most, both — these *look* closed but say long; **not** decodable at this rung.
- **irregulars not in heart set:** one, won, took, eyes, rough, two, who, said(✓ only because declared heart), was(✓ heart).
- **`qu` / risky digraphs:** quit, quick, much, chase→(ch), shape→(sh). (Used `stop` instead of `quit`; avoided ch/sh/ck entirely.)
- **`y`-as-vowel:** by, my, try, fly.

## REQUIRED before approval (do not skip — staying honest)
1. Run this content through the **content-v3 decodability gate** (the real oracle): expect **decodability 1.000**, 0 unclassified, 0 blocked-pattern hits, `passesAuditGate: true`, `canPersist: true`.
2. Confirm the **nonsense words** validate oracle-clean for `a_e` (they're the seed's set, so they should — re-run to be sure).
3. Confirm every **heart word** used (he, I, a, said, the, was) is in the lesson's heart-word inventory; if `said`/`was` aren't previewed, add them or swap the sentence.
   - **Gate-watch words (report how the gate classifies these):** `his`/`pals` (final-`s` /z/ — parallel to validated `has`), `mess` (FLOSS double-`s`, closed-e). If `mess` flags, fall back to `slip up`. `mistake` was removed (only multisyllable word — gate may not decompose `mis+take` at this rung).
4. Confirm **dictation** words are all a_e and the dictated sentences pass.
5. This becomes the `BAND_7_8` content variant for `a_e` (P2 of `presentation-profile-architecture.md`); render path unchanged (P1/P3).

## Note
This is hand-authored against the real allowed-pattern set — a far tighter pass than either mock — but I am **not** asserting it passes the gate. The machine gate is the authority; if it flags anything, the flagged word gets swapped and re-audited (the same loop we ran for the Phase 4 passages).
