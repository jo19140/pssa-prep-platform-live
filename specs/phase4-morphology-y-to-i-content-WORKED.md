# Phase 4 Morphology y→i — content (worked + validated)

Status: APPROVED by Jonathan 2026-06-07 (one required edit — comprehension question regrounded; one style polish "Sky cried, glad."→"Sky cried a glad cry." validated green and adopted). Third morphology rung (after Entry A drop_e + double). The thing taught is a spelling RULE: change y to i before -ed/-es; keep y before -ing.

Engine prerequisites ALL MERGED — verify on main, do NOT reimplement:
- y-as-vowel engine mini-PR (d0b7f6a): y_long_i matcher (final-y + exactly-one-vowel-phoneme + AY) + y_long_i pseudoword decode + full homophone-collision protection + y_to_i analyzer rule + keeps-y.
- shared-parser consolidation (faf8fc6): passageAudit + lessonAudit delegate to morphologyConfigFromTargetPatternsJson, so y_to_i routes through BOTH audit paths (this was the gap that blocked the first content run).

Target (order locked): `morph_y_to_i` [y_long_i] stems (29). demoMode `transformation_pairs`. Suffixes -ed, -es (trigger y→i) + -ing (keeps y, no-change). NO plain -s (cry→cries, never crys).

## Validation result (real gates, via Codex on origin/main 2026-06-07)

| target | passage | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage | Part 2 |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| morph_y_to_i (29) | Sky and the Kite | 88 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (transformation_pairs) |

Short fixture: 39w — classified clean, quality gate PASS. All 8 pseudowords strict-valid through the full oracle.

## THE core principle (verified live, must be pinned in tests)

- y_to_i rule forms (cried, tried, dried, flies, cries, dries, spied) classify as TARGET; they are the rule evidence.
- keeps-y -ing forms (crying, trying, flying, drying) classify with `rule: "none"` — allowed as REVIEW/CONTRAST, but they do NOT count toward target coverage.
- THE ie-collision (load-bearing): cried/flies/etc. contain "ie" and phoneme-match team_ie_long_i. In a y_to_i lesson, morphology-first ordering decomposes them as y_to_i BEFORE the ie-match can block them. Outside a y_to_i context they stay honest team_ie_long_i. Both directions are pinned.

## Teacher-facing note (must appear in worked doc / tutor copy)

- **"trying" (and other -ing forms) keep the y and are no-change review forms; they do NOT count toward y→i target coverage.** Only -ed/-es forms (cried, flies) are y→i evidence.

## Authoring traps (binding for the spec)

- Monosyllabic consonant+y long-i stems only: cry, try, fly, dry, spy, fry, shy, sly, pry, sky, ply. AVOID by/my/why (function/heart words).
- Banned (matcher excludes, but keep out of content too): yes/yard/yell (onset y), type (medial y), myth/gym (y short-i), baby/happy/pony (y long-e IY, multisyllabic), ally/reply/deny/july (multisyllabic final-y AY).
- "first" = r_ir (r-controlled) blocked — caught in an early draft, removed.
- No plain -s: cry→cries (es with y→i), never "crys".
- Pseudowords are STEM-shaped final-y (cly/sny/gly/zy/smy/vry/zby/gry), full-oracle clean. "fy" is a NEGATIVE fixture (homophone collision with phy/phi). "bly" is a NEGATIVE fixture (raw-CMUdict real word).
- Standard bans still apply: "are" (r-scan), team words, diphthongs, r-controlled, plain-attach inflections from other rules.

## morph_y_to_i — "Sky and the Kite" (order 29)

Seed: patterns ["y_long_i"], pseudowordPatterns ["y_long_i"], morphologyJson `{ rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed","es","ing"] }`; kid "change y to i", tutor "y to i rule: cry → cried, fly → flies". allowed = closed_short_a/i/o/u/e + a_e/i_e/o_e/u_e/e_e. blocked = all teams (incl team_ie_long_i/team_ie_long_e) + diphthongs + au/aw + oo + r-controlled. exampleWords (stems): cry, try, fly, dry, spy, fry, shy, sky. exampleNonwords (full-oracle clean): cly, sny, gly, zy, smy, vry, zby, gry.

Part 2: transformation_pairs — cry→cried, try→tried, fly→flies, dry→dries (mixes -ed and -es). Line 2: cry, cried, try, tried, fly, flies, dry, dries. Line 3: spy, sky, shy, lake, hand, desk, home. Hearts standard (said/was/they + I/a/the/to). Vocabulary: gust, den.

Sentences: Sky tried to fly the kite. / The bug flies up. / Sky did not cry. / Dad spied a fox in the den. / The mud dries in the sun. / "Sky cries a lot," said Mom.
Dictation: cried, tried, flies, dries, cries, crying + "Sky tried to fly the kite." / "The mud dries in the sun."
Comprehension: How can you tell Sky kept trying? (inference) / What did Dad spy in the den? (literal) / Tell me how Sky got the kite to fly. (retell) / What would you try to fly? (personal_connection)

mockPassageText (39w): Sky had a red kite. Sky tried to make it fly. The kite did not fly yet. Sky did not cry. Sky tried a lot. Then it flies up. Sky cried a glad cry. It was a fine try.

fullAuditPassageText (88w): Sky had a red kite. Sky tried to make it fly. The kite did not fly yet. Sky did not cry. Sky tried a lot. Then a gust came. The kite rose up fast. It flies! The kite flies up in the sky. Sky cried a glad cry. Dad spied the kite up on the hill. Mom came up to help. The kite dips, then flies up. They had a fine time. Sky kept trying fun tricks. The mud dries on the kite. It was a fine try.

Morphology-tagged in passage: tried, flies, cried, spied, dries (y_to_i — 5 distinct rule-evidence forms) + trying (none, keeps-y review). "Sky" is the name carrying the y_long_i target; rule shown by -ed/-es forms, contrast shown by keeps-y "trying".

## Status

Sign-off COMPLETE (2026-06-07). Codex spec: specs/phase4-morphology-y-to-i-content-codex-spec.md. Next: commit both docs → Codex on a fresh branch from main → independent audit. After merge: 29 targets on main.
