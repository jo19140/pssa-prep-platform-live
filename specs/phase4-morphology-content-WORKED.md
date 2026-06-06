# Phase 4 Morphology Entry A — content (drop_e + double, worked + validated)

Status: APPROVED by Jonathan 2026-06-05 (both exemplars signed off; engine plumbing batch approved as a standalone commit before this content). First rule-based targets in the program: the thing taught is a spelling RULE (drop the e / double the consonant), not a spelling pattern. Engine prerequisites ALL MERGED — verify on main, do NOT reimplement: morphology engine mini-PR (8e05906) + morphology plumbing batch (generator threading, closed-pattern pseudowords, narrow codes, warmup override).

Targets (orders locked): `morph_drop_e` [a_e, i_e, o_e, u_e] stems (27), `morph_double` [closed_short_a/i/o/u/e] stems (28). demoMode `transformation_pairs` for both. Suffixes -ing, -ed, -s, -es. y→i and -er/-est DEFERRED.

## Validation results (all through the real gates, 2026-06-05)

| target | passage | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage | Part 2 |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| morph_drop_e (27) | Baking with Mike | 96 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (transformation_pairs) |
| morph_double (28) | The Hopping Pup | 93 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (transformation_pairs) |

Short demo fixtures: 38w / 35w — classified clean, quality gate PASS.

## THE core principle (verified live, must be pinned in tests)

The morphology gate verifies the DECLARED RULE, not "anything with a suffix":
- In a `morph_drop_e` lesson: drop-e forms (hoping, baked) classify as TARGET; doubling forms (running, hopped) decompose to NULL → would be unclassified/blocked.
- In a `morph_double` lesson: doubling forms (running, hopped) classify as TARGET; drop-e forms (named, baked) decompose to NULL.
- In BOTH: no-change -s/-es forms (hopes, runs) classify with `rule: "none"` — allowed as REVIEW/CONTRAST, but they do NOT count toward target coverage.

## Teacher-facing notes (must appear in the worked doc / lesson tutor copy)

- drop_e: **"hopes" is a no-change review form and does not count toward drop_e target coverage.**
- double: **"runs" is a no-change review form and does not count toward doubling target coverage.**

## Authoring traps (binding for the spec)

- "are" — banned this rung; trips the r-controlled phoneme scan (AA R).
- "sunup" — unclassifiable two-vowel compound; keep out.
- mixed / jumped / helping — plain-attach forms (no rule change), NULL by design; do NOT use in Entry A passages. A morphology passage contains: rule-changed forms (drop_e or double, matching the lesson), no-change -s/-es review forms, bare stems, and already-taught review words — NOT general suffix soup.
- -er / -est — DEFERRED (suffix carries the ER phoneme; interacts with r-controlled machinery; its own deliberate change later).
- y→i — DEFERRED until y-as-vowel registry support exists (cry/try/fly unclassifiable today).
- Rule separation is per lesson: the analyzer runs the lesson's declared rule only, so a drop_e passage cannot contain doubling target forms and vice versa.
- Warmup override: morph_double declares VCe review words (lake/home/bike/cube/gate/five) so the closed-stem target family is not also the warmup family. morph_drop_e keeps the default closed warmup (its stems are VCe, no clash).
- Pseudowords are STEM-shaped (not inflected): drop_e → VCe pseudowords; double → closed pseudowords. All raw-CMUdict-clean (dake/zube/gade/pog were raw hits and excluded; lupe is a real word).

## 1. morph_drop_e — "Baking with Mike" (order 27)

Seed: patterns ["a_e","i_e","o_e","u_e"], pseudowordPatterns ["a_e","i_e","o_e","u_e"], morphologyJson `{ rule: "drop_e", stemPatterns: ["a_e","i_e","o_e","u_e"], suffixes: ["ing","ed","s","es"] }`; kid "drop the e", tutor "Drop-e rule: hope → hoping, make → making". allowed = closed_short_* + e_e. exampleWords (stems; first five span a/i/o/u): hope, make, ride, use, bake, smile, skate, slide. exampleNonwords (stem-VCe, raw-clean): zame, tabe, jide, mive, bime, zote, vope, fute.

Part 2: transformation_pairs — hope→hoping, make→making, ride→riding, bake→baked (mixes -ing and -ed). Line 2: hope, hoping, make, making, ride, riding, bake, baked. Line 3: smile, use, skate, lake, hand, desk, home. Hearts standard. Vocabulary: blade, dome.

Sentences: Jane is hoping to bake a cake. / Mike liked the big slide. / "Mike is making a mess," said Jane. / The dog hopes to get a bite. / Jane waved at the bus. / "Use the red cup," said Mike.
Dictation: hoping, making, riding, baked, liked, hopes + "Jane is hoping to bake a cake." / "Jane waved at the bus."
Comprehension: Why did Jane scrape the tub? (inference) / What rose up like a dome? (literal) / Tell me how Jane and Mike made the cake. (retell) / What would you bake with a pal? (personal_connection)

mockPassageText (38w): Jane had a plan to bake a cake. Mike came to help. They made the mix in a tub. The cake rose up like a dome. Jane sliced it and Mike liked his slice. Making it was fun.

fullAuditPassageText (96w): Jane had a plan to bake a cake. Mike came to help. "I am hoping it will rise," said Jane. They made the mix in a big tub. Mike was smiling at the mess. Jane scraped the tub with a flat blade. The cake baked fast in the stove. It rose up like a dome. Jane and Mike skated on the path while it baked. At last Jane sliced it. Mike liked his slice. "That is a fine cake," said Mike. Jane smiled. Making it was fun. Jane hopes to bake the next one with Mike.

Morphology-tagged in passage: hoping, smiling, scraped, baked, skated, sliced, liked, smiled, making (drop_e) + hopes (none, review). Note: "hopes" is a no-change review form, NOT drop_e coverage.

## 2. morph_double — "The Hopping Pup" (order 28)

Seed: patterns ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e"], pseudowordPatterns same, morphologyJson `{ rule: "double", stemPatterns: ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e"], suffixes: ["ing","ed","s","es"] }`; kid "double the last letter", tutor "Doubling rule: run → running, hop → hopped". allowed = a_e/i_e/o_e/u_e/e_e (VCe review). reviewWords (warmup override): lake, home, bike, cube, gate, five. exampleWords (stems; first five span a/i/o/u/e): run, sit, hop, grab, sled, hug, win, swim. exampleNonwords (closed, raw-clean): zat, vit, jop, gub, zet, mip, fim, nuv.

Part 2: transformation_pairs — run→running, hop→hopping, sit→sitting, hug→hugged. Line 2: run, running, hop, hopping, sit, sitting, hug, hugged. Line 3: grab, sled, swim, lake, hand, desk, home. Vocabulary: strap, dusk.

Sentences: The dog is running up the hill. / Sam grabbed his red cap. / "Stop hopping on the bed," said Mom. / Deb is sitting on the steps. / Tim hugged his pup. / The pup runs to the gate.
Dictation: running, hopping, sitting, hopped, hugged, runs + "The dog is running up the hill." / "Tim hugged his pup."
Comprehension: Why did Rex stop and sit still? (inference) / What was sitting on the log? (literal) / Tell me what Rex did on the path. (retell) / What would you name a pup? (personal_connection)

mockPassageText (35w): Tim has a pup. His pup is Rex. Rex was hopping at a bug. A frog was sitting on a log. The frog hopped off. Rex wagged and wagged. Rex had fun running with Tim.

fullAuditPassageText (93w): Tim has a pup. His pup is Rex. Rex sat at the gate at six. Tim grabbed the strap and they set off. Rex was hopping at a bug on the path. The bug zipped off in the grass. A frog was sitting on a log. Rex stopped and sat still. The frog hopped off the log and was gone. Rex wagged and wagged. "What a fine pup," said Tim. Tim patted him on the back. They jogged home in the dusk. Rex napped on his rug. Rex had fun running with Tim.

Morphology-tagged in passage: grabbed, hopping, zipped, sitting, stopped, hopped, wagged, patted, jogged, napped, running (double) + runs (none, review). Note: "runs" is a no-change review form, NOT doubling coverage.

## Status

Sign-off COMPLETE (2026-06-05, both targets). Codex spec: specs/phase4-morphology-content-codex-spec.md. Next: commit both docs → Codex on a fresh branch from main → independent audit. After merge: 28 targets on main — Phase 4 complete (Track A vowel phonics + Track B morphology Entry A).
