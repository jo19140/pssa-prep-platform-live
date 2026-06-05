# Phase 4 Teams Cleanup — content (all three targets, worked + validated)

Status: APPROVED by Jonathan 2026-06-05 (team_ow exemplar signed off first with the Flow/Cole name-evidence correction applied; team_ew_ue + team_ie_both signed off together). CONTENT-ONLY RUNG — the first with NO engine mini-PR: all engine support verified on main via live probes (decode covers vowel_team; pair letters proven; matcher honest both directions; classifier fix handles declared codes; examples_only validated in the diphthong rung). Ratified rule: "No pin-only mini-PR unless the engine actually needs work" — the inversion pins live in this content PR's tests.

Engine prerequisites ALL MERGED (verify on main; do NOT reimplement): diphthong engine mini-PR (c3cf05d), oo/ow passage-classifier regression fix (e0aed4d), diphthong content merge (0569d3f).

Targets (orders locked): `team_ow` [team_ow] (24), `team_ew_ue` [team_ew, team_ue] (25), `team_ie_both` [team_ie_long_i, team_ie_long_e] (26). demoMode: examples_only for ALL THREE (this rung is about ambiguous/cleanup spellings — no forced thin pairs; on→own and chef→chief pass the predicate structurally but a one-pair demo is artificial).

## Validation results (all through the real gates, 2026-06-05)

| target | passage | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage | Part 2 |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| team_ow (24) | Snow on the Hill | 108 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | n/a (1 pattern) | PASS (examples_only) |
| team_ew_ue (25) | The True Clue | 96 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (examples_only) |
| team_ie_both (26) | The Pie in the Field | 101 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (examples_only) |

Short demo fixtures: 36w / 39w / 41w — all classified clean, quality gate PASS.

## THE load-bearing acceptance check: the ow inversion (verified live)

team_ow lesson context: snow/grow/show/low/own classify as TARGET; cow/town/down surface as BLOCKED diph_ow violations. (Live probe: targets=[snow,grow] blocked=[cow(diph_ow),town(diph_ow)].)
diph_ow (diph_ou_ow) lesson context: cow/town/down classify as TARGET; snow surfaces as a BLOCKED team_ow violation. (Already pinned in the diphthong content tests — this PR re-pins BOTH directions in its own test file without touching the diphthong test file.)

## Design decisions (ratified)

- **examples_only everywhere.** Coverage comes through demonstrationExamples, contrast lines, sentences, dictation, and the full passage — never through weakened pair logic or forced pairs.
- **Name evidence rule:** names may carry targets but must be counted transparently and never as the ONLY evidence for a pattern. Flow = team_ow target name; **Cole = VCe REVIEW name, must NOT count as team_ow evidence.** Drew (ew), Sue (ue), Brie (ie_long_e) all carry targets legitimately alongside common-noun evidence.
- **snew and snue are intentionally paired as same-sound different-spelling examples.** They are allowed only because both validate under their declared registry patterns. The tutor can use the pair: "These can sound the same, but the spelling is different." They are not duplicates or a mistake.

## Authoring traps discovered this rung (binding for the spec)

- bow, sow: dual pronunciation — match BOTH team_ow and diph_ow (roof rule) — BANNED.
- sew: does NOT phoneme-match team_ew (sounds OW) — banned from ew lessons.
- know/knew: phoneme-match their patterns but kn- spelling avoided.
- yowl: passes BOTH the validator and the raw-CMUdict check but is a real English word (cats yowl) — content-banned. Same class: smew (a real duck). The dual-check is necessary but not sufficient; content judgment is the final filter.
- Raw-CMUdict hits banned from seeds: skow, frew, prew, plew, trew (→true), clew (→clue), zew/zue (→xu), vue, drue (→drew), brue (→brew), grue, flue, thew, prue, gie (→guy), jie, drie (→dry), flie (→fly), plie (→ply), brie-as-pseudoword, ziel (→zeal), miel (→meal), mowl (→mole), gowl (→goal), fow (→foe), jow (→jo), fowm (→foam), trowl (→troll), stue (→stew), gawn, snow-itself.
- fly and all y-only-vowel words: unclassifiable (no aeiou letter) — keep out of passages/sentences.
- thread: does NOT match team_ea (EH phoneme) — unclassified.
- "die" excluded from the ie set on content grounds; "lie" kept (lie in the sun).
- Cross-rung blocking now bites hard: day/play (ay), flew/grew banned outside ew lessons, look/good outside oo, out/down/now outside ou_ow, saw/dawn outside au_aw, bark/dark/hard r-banned everywhere. "snow day" phrasing is impossible in a team_ow lesson — use "trip in the snow".
- Inflection rule unchanged: no -s/-es/-ed/-ing on TARGET stems (snows/blows/clues/ties banned); non-target stems fine (steps, ducks, pups, skates).

## 1. team_ow — "Snow on the Hill" (order 24)

Seed: patterns ["team_ow"], pseudowordPatterns ["team_ow"]; kid "ow as in snow", tutor "Vowel team ow: snow, grow, show". exampleWords: snow, grow, show, low, own, glow, slow, blow. exampleNonwords (validator + raw-CMUdict clean): zow, thow, smow, drow, zowl, vowl, blowl, zowm.

Part 2: examples_only — demonstrationExamples: snow, grow, show, low, own; NO pairs. Line 2 (target vs review): snow, snap, grow, grab, show, shop, low, lap. Line 3: glow, slow, blow, lake, hand, desk, home. Hearts standard (said/was/they + I/a/the/to). Vocabulary: crow, sled.

Sentences: The snow fell on the path. / "Show us the map," said Mom. / The plant will grow in the sun. / A crow sat on the post. / The flag is low on the pole. / The wind can blow the snow.
Dictation: snow, grow, show, low, blow, own + "The snow fell on the path." / "The plant will grow in the sun."
Comprehension: Why did Cole grin at the top of the hill? (inference) / What did the crow sit on? (literal) / Tell me what Cole and Flow did in the snow. (retell) / What would you do on a day with big snow? (personal_connection)

mockPassageText (36w): Cole got up and ran to the glass. White snow fell on the steps. Cole got his sled. His dog Flow ran at his side. The sled slid fast and low. Cole did love the snow.

fullAuditPassageText (108w): Cole got up and ran to the glass. White snow fell on the steps. "The hill will glow in the sun," said Mom. Cole got his hat and his sled. His dog Flow ran at his side. The hill had a low dip and a slow rise. Cole and Flow went up to the top. The sled slid fast on the snow. Flow gave a glad yip. A crow sat on a low branch. "I own this hill," said Cole with a grin. The wind made the snow blow on the path. The pals went home in the soft glow. It was a fine trip in the snow.

## 2. team_ew_ue — "The True Clue" (order 25)

Seed: patterns ["team_ew","team_ue"], pseudowordPatterns ["team_ew","team_ue"]; kid "ew and ue words", tutor "Long u teams ew/ue: new, blue". exampleWords: new, blue, few, true, grew, clue, chew, glue (first five span both spellings). exampleNonwords (4 ew + 4 ue): vew, snew, twew, swew, frue, smue, spue, snue.

Part 2: examples_only — demonstrationExamples: new, blue, few, true, glue. Line 2: new, net, blue, bun, few, fed, true, trip. Line 3: grew, clue, chew, lake, hand, desk, home. Vocabulary: clue, stew.

Sentences: The cup is blue. / Sam has a new cap. / The glue is on the desk. / "That clue is true," said Drew. / A few pups sat in the sun. / "Chew the snack well," said Mom.
Dictation: new, blue, few, true, glue, chew + "The cup is blue." / "Sam has a new cap."
Comprehension: How can you tell the cap was not lost for long? (inference) / What did Drew spot on the box? (literal) / Tell me how Drew and Sue used the clue. (retell) / What would you hunt for with a clue? (personal_connection)

mockPassageText (39w): Drew and Sue sat on the steps. "The cap is lost," said Sue. It was a new blue cap. A blue spot led them to the shed. The cap sat on a chest. "This clue is true," said Drew.

fullAuditPassageText (96w): Drew and Sue sat on the steps. "The cap is lost," said Sue. It was a new blue cap. "Let us hunt," said Drew. A spot of glue was on the step. A blue spot led them to the shed. The glue on the box was still wet. "This clue is true," said Drew. Sue gave a clap. The cap sat on a chest in the shed. "It is the same blue cap," said Sue. Drew grew a big grin. They went in and had hot stew. The hunt was fun and the clue was true.

## 3. team_ie_both — "The Pie in the Field" (order 26)

Seed: patterns ["team_ie_long_i","team_ie_long_e"], pseudowordPatterns ["team_ie_long_i","team_ie_long_e"]; kid "two sounds for ie", tutor "Two sounds of ie: pie and field". exampleWords: pie, field, tie, chief, brief, shield, niece, lie (first five span both sounds). exampleNonwords (4 ie_long_i + 4 ie_long_e): zie, blie, snie, grie, vief, zief, glief, sniel.

Part 2: examples_only — demonstrationExamples: pie, field, tie, chief, shield. Line 2: pie, pin, tie, tin, field, fed, chief, chip. Line 3: brief, niece, lie, lake, hand, desk, home. Vocabulary: shield, niece.

Sentences: The pie is on the dish. / "Tie the lace," said the chief. / The dog ran in the field. / His niece has a red kite. / "Hold the shield up," said Gus. / The cat can lie in the sun.
Dictation: pie, tie, field, chief, brief, shield + "The pie is on the dish." / "The dog ran in the field."
Comprehension: Why did Brie hold the lid up like a shield? (inference) / What did Brie have in the box? (literal) / Tell me what happened with the pie. (retell) / What would you bring on a trip to a field? (personal_connection)

mockPassageText (41w): The chief and his niece Brie went to the field. Brie had a pie in a box. The chief set a mat on the grass. Brie set the pie on the mat. They cut the pie and had a fine lunch.

fullAuditPassageText (101w): The chief and his niece Brie went to the field. Brie had a pie in a box with a lid. The chief set a mat on the grass. The wind made the mat flip. "Hold it flat," said Brie. The chief made a brief stop to fix it. Brie set the pie on the mat. A bug came at the pie. Brie held the lid up like a shield. "That was a close call," said the chief. They cut the pie and had a fine lunch. The chief gave Brie a wide grin. It was a fine end to the trip.

## Status

Sign-off COMPLETE (2026-06-05, all three targets). Codex spec: specs/phase4-teams-cleanup-content-codex-spec.md. Next: commit both docs → Codex on a fresh branch from main → independent audit. After merge: 26 targets on main, vowel phonics complete — Track B morphology (drop-e, doubling, y→i) closes Phase 4.
