# Phase 4 Diphthong Entry — content (all four targets, worked + validated)

Status: APPROVED by Jonathan 2026-06-04 (oo_both exemplar signed off first, then the remaining three; his optional wording edit "The path ran past a wood." validated green and adopted). Engine prerequisites — BOTH must be on main before the content PR starts, and the content PR must NOT reimplement either:

1. Diphthong pseudoword/pair engine mini-PR (merged c3cf05d): decode covers family `diphthong`; Part 2 pair letters for diphthongs + explicit team_oo_long/short→"o", team_au/team_aw→"a".
2. oo/ow passage-classifier regression fix ("Fix diphthong oo/ow passage classification for Phase 4 content"): `patternCodesFromDailyTarget` now returns declared registry codes verbatim; regression test `scripts/test-content-v3-diph-classifier-regression.ts` (banner LESSON_PHASE4_DIPH_CLASSIFIER_AMBIGUITY_REGRESSION). Without this fix the rung is impossible (oo words cannot classify; snow would dishonestly classify as a diph_ow target).

Targets (orders locked): `diph_oi_oy` [diph_oi, diph_oy] (20), `diph_ou_ow` [diph_ou, diph_ow] (21), `oo_both` [team_oo_long, team_oo_short] (22), `diph_au_aw` [team_au, team_aw] (23). Deferred to the final teams-cleanup rung: team_ow (snow), team_ew, team_ue, team_ie_long_i, team_ie_long_e.

## Validation results (all through the real gates, 2026-06-04)

| target | passage | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage | Part 2 |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| diph_oi_oy (20) | The Coin in the Soil | 86 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (examples_only) |
| diph_ou_ow (21) | The Loud Sound in Town | 95 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (4 pairs) |
| oo_both (22) | A Good Look at the Moon | 99 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (4 pairs) |
| diph_au_aw (23) | The Fawn on the Lawn | 87 | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS (2 pairs) |

Short demo fixtures: 39w / 38w / 37w / 38w — all classified clean, quality gate PASS.

## Design decisions (ratified)

- **examples_only for oi_oy (first use of this demo mode).** con→coin and sol→soil PASS the pair predicate structurally, but "con"/"sol" are poor kid-facing closed bases. Rule: bad minimal pairs are worse than no minimal pairs — never force fake closed bases. demonstrationExamples: coin, boy, oil, joy, soil; demonstrationPairs MUST be empty (the gate fails examples_only with any stray pair — verified).
- **oo_both is ONE target, deliberately.** The instructional point is that oo has two common sounds; both patterns must be covered in Part 2 words, Part 3 non-pseudoword lines, and transfer text (the coverage gate enforces this for 2-pattern targets). Part 2 pairs come from oo_long only (rot→root, hot→hoot, tot→toot, hop→hoop); oo_short coverage rides on conceptExamples/targetWords/sentences/dictation/passage. god→good and hod→hood pass structurally — banned on content grounds.
- **au/aw pairs:** fan→fawn, pan→pawn (both aw). team_au has no clean closed-base pairs — au coverage via examples + "haul"/"fault" + the name Paul (phoneme-matches team_au). Two good pairs > four forced ones.
- **Names carry targets:** Roy/Joy (oy), Scout (ou), Brook/Boone (oo short/long), Paul (au), Dawn (aw).

## Authoring traps discovered this rung (binding for the spec)

- "do" cannot classify (D-UW, vowel-final, not a heart word) — use "Step off"/"Get off" (or-lesson precedent). Same class: "two", "go"-style vowel-finals (go already banned).
- "for" phoneme-matches r_or → blocked violation in EVERY non-r lesson. Banned outside r_or lessons.
- all-words (small/tall/ball/call) are unclassified — no aw match (no aw grapheme), no closed match (ll after a reads AO).
- "laugh" does NOT phoneme-match team_au (AE, not AO).
- "roof" matches BOTH oo patterns (dual CMUdict pronunciation) — banned from the oo_both contrastive day. "too" (heart-word homophone) and "poor" (oo_long + r coda) also avoided.
- door/floor/blood/flood/would: unclassified — keep out of all passages.
- Cross-rung blocking: out/down/now blocked outside ou_ow; stood/look/took/good blocked outside oo_both; saw/dawn blocked outside au_aw; coin/boy blocked outside oi_oy; dark/sharp/bark/start r-blocked everywhere in this rung.
- Raw-CMUdict name tokens banned from seeds even when the validator passes them (SUBTLEX gate misses them; they would force new oracle caveats): floy, spaw, vaw, nouz, gaul, craw, trow, clow, taul (→tall), gawn (→gone), soud (→sowed), toob (→tube).
- Inflection rule unchanged: no -s/-es/-ed/-ing on TARGET stems (cows/looks/hauled banned); non-target stems fine (steps, tricks, pals — hens precedent).

## 1. diph_oi_oy — "The Coin in the Soil" (order 20)

Seed: patterns ["diph_oi","diph_oy"], pseudowordPatterns ["diph_oi","diph_oy"]; kid "oi and oy words", tutor "Diphthong oi/oy: coin, boy". exampleWords: coin, boy, oil, joy, soil, toy, join, point (first five span both spellings). exampleNonwords (validator-clean AND raw-CMUdict-clean; 4 oi + 4 oy): zoit, voib, noib, foid, zoy, voy, snoy, gloy.

Part 2: demoMode examples_only; demonstrationExamples coin, boy, oil, joy, soil; NO pairs. Line 2 (target vs review): coin, can, boy, ban, joy, jam, toy, tan. Line 3: oil, join, point, lake, hand, desk, home. Hearts standard (said/was/they + I/a/the/to). Vocabulary: coil, gem.

Sentences: The coin fell in the soil. / "Point at the map," said Roy. / Joy can join the club. / The boy got mud on his toy. / "Boil the egg," said Mom. / Roy can coil the rope.
Dictation: coin, boy, oil, joy, soil, toy + "The coin fell in the soil." / "Joy can join the club."
Comprehension: Why did Roy rub oil on the coin? (inference) / What did the spade hit? (literal) / Tell me what happened in the dig. (retell) / What would you do with a coin you dug up? (personal_connection)

mockPassageText (39w): Roy dug a hole in the soil. His pal Joy came to dig. The spade hit a coin in the mud. Roy got oil to rub on it. "Take this coin," said Roy. Joy was glad to get it.

fullAuditPassageText (86w): Roy dug a hole in the soil. His pal Joy came to dig. "Point to the spot," said Joy. The spade hit a flat lump. It was a coin in the mud. "That coin is a gem," said Joy. Roy got oil to rub on it. The oil made the coin shine. Roy made a choice. "Take this coin," said Roy. "It is a gift." Joy gave a glad yelp. The boy was glad to give it. The pals sat in the sun with the coin.

## 2. diph_ou_ow — "The Loud Sound in Town" (order 21)

Seed: patterns ["diph_ou","diph_ow"], pseudowordPatterns ["diph_ou","diph_ow"]; kid "ou and ow words", tutor "Diphthong ou/ow: out, town". exampleWords: out, town, loud, down, found, cow, shout, owl. exampleNonwords (4 ou + 4 ow): zoud, vout, noud, foud, zown, fown, plown, vown.

Part 2: minimal_pairs — shot→shout, pond→pound, fond→found, ton→town (town puts ow in Part 2 directly). Line 2: those 8. Line 3: out, cow, owl, lake, hand, desk, home. Vocabulary: crowd, clown.

Sentences: The owl is out at dusk. / "Count to ten," said Beth. / The crowd was loud in town. / Scout found a round stone. / "Sit down now," said Beth. / The clown has a gown.
Dictation: out, town, loud, down, found, cow + "The owl is out at dusk." / "The crowd was loud in town."
Comprehension: Why did Scout let out a howl? (inference) / What did the clown give Scout? (literal) / Tell me what happened in town. (retell) / What would you do at a town fair? (personal_connection)

mockPassageText (38w): Scout the dog sat on the steps. A loud sound came from town. Scout let out a howl. "Calm down, Scout," said Beth. It was a crowd at the town pond. Beth went down the path with Scout.

fullAuditPassageText (95w): Scout the dog sat on the steps. A loud sound came from town. Scout let out a howl. "Calm down, Scout," said Beth. The sound got close. It was a crowd at the town pond. Beth and Scout went down the path. A clown did tricks at the pond. The crowd gave a big shout. Scout found a spot up front. The clown gave Scout a crown. Scout gave a proud howl. The crowd had fun in the sun. At last Beth went home with Scout. "That was a fun trip to town," said Beth.

## 3. oo_both — "A Good Look at the Moon" (order 22)

Seed: patterns ["team_oo_long","team_oo_short"], pseudowordPatterns ["team_oo_long","team_oo_short"]; kid "oo words", tutor "Two sounds of oo: moon and book". exampleWords: moon, book, soon, look, food, good, boot, foot (first five span both sounds). exampleNonwords (4 long + 4 short): zoon, voom, zood, noof, vook, zook, vood, tood.

Part 2: minimal_pairs — rot→root, hot→hoot, tot→toot, hop→hoop (all oo_long; oo_short coverage via conceptExamples/targetWords). Line 2: those 8. Line 3: zoo, wood, broom, lake, hand, desk, home. Vocabulary: stool, hood.

Sentences: The moon was still up at noon. / Brook took a good look at the map. / "Set the food on the stool," said Boone. / The boot got stuck in the mud. / A duck swam in the cool pool. / "Hang the hood on the hook," said Brook.
Dictation: moon, book, soon, look, food, good (3 long + 3 short) + "The moon was still up at noon." / "Brook took a good look at the map."
Comprehension: Why did Boone shake the sand from the boot? (inference) / What did Boone set on the stool? (literal) / Tell me what happened on the trip. (retell) / What would you pack for a trip to the wood? (personal_connection)

mockPassageText (37w): Brook and Boone set off at noon. "Look at the brook," said Boone. Brook took a sip from a cup. Soon the moon came up. Boone shook the sand from a boot. It was a good trip.

fullAuditPassageText (99w): Brook and Boone set off at noon. The path ran past a wood. "Look at the brook," said Boone. It was cool in the shade. Brook took a sip from a cup. Boone set the food on a flat stool. A duck swam a loop in the pool. Brook had a good look at it. "That duck can zoom," said Brook. Soon the sun was gone. The moon came up white and big. Boone shook the sand from a boot. "Hang the hood on the hook," said Boone. They stood still on the path. It was a good trip.

## 4. diph_au_aw — "The Fawn on the Lawn" (order 23)

Seed: patterns ["team_au","team_aw"], pseudowordPatterns ["team_au","team_aw"]; kid "au and aw words", tutor "Vowel au/aw: haul, saw". exampleWords: saw, haul, paw, fault, lawn, draw, dawn, yawn (first five span both spellings). exampleNonwords (4 au + 4 aw): zaul, vaul, naul, jaul, zaw, snaw, blaw, glaw.

Part 2: minimal_pairs — fan→fawn, pan→pawn (both aw; au has no clean closed-base pairs — coverage exception; engine returns "a" for team_au). Line 2: fan, fawn, pan, pawn, tan, paw, ban, claw. Line 3: saw, haul, dawn, lake, hand, desk, home. Vocabulary: fawn, straw.

Sentences: Paul saw a fawn at dawn. / The hawk sat on a post. / "Draw the dog," said Dawn. / The pup got mud on its paw. / Paul can haul the straw. / "Step off the lawn," said Dawn.
Dictation: saw, paw, lawn, dawn, draw, haul + "Paul saw a fawn at dawn." / "The hawk sat on a post."
Comprehension: Why did Paul stand still? (inference) / What did the hawk dive at? (literal) / Tell me what Paul saw at dawn. (retell) / What animal would you draw? (personal_connection)

mockPassageText (38w): Paul got up at dawn. A fawn was on the lawn. "Stand still," said Paul. The fawn gave a big yawn. Dawn had a straw hat. "I can draw the fawn," said Dawn. It was a calm dawn.

fullAuditPassageText (87w): Paul got up at dawn. The lawn was wet and still. A fawn was on the lawn. "Stand still," said Paul. Dawn had a straw hat. The fawn gave a big yawn. It bent to chomp on the grass. A hawk sat on a post. The hawk gave a caw. Paul saw the hawk dive at the grass. The fawn ran to its mom. Dawn made a sketch on a pad. "I can draw the fawn," said Dawn. Paul gave a nod. It was a calm dawn.

## Status

Sign-off COMPLETE (2026-06-04, all four targets). Codex spec: specs/phase4-diphthong-content-codex-spec.md. Next: commit both docs → Codex on a fresh branch from main (with both engine prerequisites merged) → independent audit.
