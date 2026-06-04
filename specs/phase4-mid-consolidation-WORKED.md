# Phase 4 Mid — same-sound spelling consolidation (gating analysis + worked exemplar)

Status: APPROVED by Jonathan 2026-06-04 (architecture, all four targets, all passages — "up to standard for decodable instructional text; do not rewrite for style"). Jonathan content sign-off complete. Next: ChatGPT Pro review → full Codex spec (specs/phase4-mid-consolidation-codex-spec.md).
COMMIT THIS FILE PROMPTLY (uncommitted-doc-loss pattern).

## Decision record (Jonathan, 2026-06-04)

Option A — same-sound spellings. Each Phase 4 Mid target consolidates ALL spellings of one long-vowel sound, including Phase 3 VCe and Phase 4 Entry teams. One mental model: "these are different spellings for the same vowel sound." Guardrails locked: registry codes only (never bare ai/ay/ee/ea/oa/igh); all target words classify into declared patterns; no off-sound contamination; VCe demo pairs keep the strict +e rule; team demo pairs keep the same-onset/same-coda rule; Phase 3 behavior unchanged.

## The four targets (introductionOrder 13–16)

| code | patterns | pseudowordPatterns | demo pairs | notes |
|---|---|---|---|---|
| consolidate_long_a | a_e, team_ai, team_ay | a_e, team_ai | cap→cape, man→mane (+e); pan→pain, ran→rain (team) | WORKED + VALIDATED below |
| consolidate_long_e | e_e, team_ee, team_ea | team_ee, team_ea (e_e pseudowords optional; supply thin) | pet→Pete (+e); bed→bead, ten→teen (team) | e_e scarcity known from Phase 3 (3 clean +e pairs) |
| consolidate_long_o | o_e, team_oa | o_e, team_oa | not→note (+e); got→goat, cot→coat (team) | |
| consolidate_long_i | i_e, team_igh | i_e, team_igh | rid→ride, rip→ripe (+e) | igh has NO closed minimal pair (same as Entry); igh coverage via exampleWords/conceptExamples |

Shared shape: allowed = closed short vowels + the NON-target VCe patterns; blocked = all non-target teams + diphthongs + r-controlled; hearts = said/was/they previewed + I/a/the/to assumed (post-rollback list); nonwords reused from the Entry-validated per-family sets (4+4 mixes), each detecting to exactly its own family within the ordered pseudowordPatterns.

## Engine validation (no code changes needed)

- Cross-system classification PROBED on the real classifier: under [a_e, team_ai, team_ay], `made/cake` → a_e, `gail/rain` → team_ai, `play/day` → team_ay, closed words prerequisite, `see/deep/sea` correctly flagged blocked (team_ee/team_ea).
- `isNarrowPatternCode` checks constituent patterns (a_e regex or registry) — mix codes need no registry entry.
- `LESSON_TARGET_PATTERN_COVERAGE` (phase ≥ 4, ≥2 patterns) enforces every spelling in Part 2, Part 3, and transfer text — mechanics proven by Entry's 2-pattern targets, exercised here with 3.
- Part 2 per-family minimal-pair enforcement (commit 2737263) supports mixed-family pair lists: each pair validated against its own family's rule.
- FINDING: ay-final words cannot form team demo pairs (no coda — the onset/coda rule requires one), exactly like Entry. ay is demonstrated via conceptExamples/words, not pairs.
- Plurals/inflections still don't classify (`grapes` → unclassified) — the no-inflection authoring rule carries over to all Mid content.

## Worked exemplar: consolidate_long_a — ALL GATES PASS (first run)

Pseudowords (4 a_e + 4 team_ai, all strict-valid, family-orthogonal): zake, pame, vade, sape, zaib, vaib, naid, paib.
exampleWords: cake, rain, play, made, day, wait, gray, lake (first 5 span all three spellings → coverage + igh-style ay handling).
Sentences (6): Jake made a cake at the lake. / The rain fell all day. / "Stay in and play," said Jane. / Gail had to wait in the lane. / They gave May a plate. / The gray paint is wet.
Dictation: cake, made, rain, wait, play, day + 2 sentences. Vocabulary: paint, plate.
Short demo fixture (43w, clean): "Jake made a cake. The rain fell all day. …" (The Rainy Day Cake).

fullAuditPassageText (94 words — decod 1.000, unclassified 0, blocked 0, quality pass, passesAuditGate TRUE; draft canPersist TRUE, coverage PASS, part2 demo PASS):

> Jake and Gail made a cake. The rain fell all day. "Stay in," said Jane. Jay had to wait at the gate. May came late with a pail and a cape. They gave him a plate. Jake set the cake on the plate. "It is a fine cake," said May. Gail made gray paint. They paint a game grid on a tray. Jay and May play the game. The rain came to a stop. The sun came up at last. They ran to the lake. Jake gave a wave. It was a fine day.

Comprehension: Why did Jake and Gail stay in? (inference) / What did Jake and Gail make? (literal) / Tell me what happened on the rainy day. (retell) / What game would you play inside on a rainy day? (personal_connection).

## Teacher note — dictation in consolidation lessons

Dictating /kāk/ has one taught spelling, but /rān/ vs /lān/ shows the consolidation point: the child must use orthographic memory to pick the spelling. That ambiguity is the skill, not a defect — but expect more dictation errors than Entry, and the tutor copy should treat a phonetically-plausible wrong spelling (rane) as a teaching moment, not a miss.

## Reviewer additions (Jonathan, approved 2026-06-04 — make these executable in the Codex spec)

1. **Coverage exception for ay/igh (executable):** For patterns that cannot form valid minimal team pairs under the onset/coda rule (team_ay — no coda; team_igh — no closed minimal pair), coverage may be satisfied through exampleWords, contrastive lines, sentences, dictation, and fullAuditPassageText rather than Part 2 demo pairs. Do NOT weaken the Part 2 pair rules to force invalid ay/igh pairs.
2. **Hard gate `LESSON_PHASE4_MID_NO_BARE_TEAM_CODES`:** fails if `targetPatternsJson`, `pseudowordPatterns`, metadata, or nonword detection expectations use bare `ai/ay/ee/ea/oa/igh` instead of registry codes. (Bare codes hit the unsafe substring matcher path; registry codes hit the phoneme-verified classifier.)
3. **Fold-ins stay narrow:** the three minors below ride along, but NO new engine behavior may be added while folding them in.

## Fold-in scope (the three parked minors — this PR touches these files anyway)

1. Negative test: phase ≥ 4 target missing `fullAuditPassageText` → generator throws (currently only indirectly exercised).
2. team_oa vocabulary: `["goat", "oats"]` → `["goat", "oat"]` (drop the inflection from the teacher-facing list).
3. `buildLessonGeneratorContext` phase ≥ 4 DB-passage override: add the TODO/conditional note so the unconditional fixture override is revisited when the real phase-4 passage pipeline lands.

## ALL FOUR TARGETS AUTHORED + VALIDATED (2026-06-04)

| target | pseudowords | full passage | decod | unclassified | blocked | trigrams | passesAuditGate | canPersist | coverage | short fixture |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| consolidate_long_a | 8/8 valid | 94w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | 43w clean |
| consolidate_long_e | 8/8 valid | 93w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | 41w clean |
| consolidate_long_o | 8/8 valid | 92w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | 39w clean |
| consolidate_long_i | 8/8 valid | 89w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | 38w clean |

### consolidate_long_e — "A Week at the Sea"

Pairs: pet→Pete, them→theme (+e); bed→bead, ten→teen (team). exampleWords: Pete, green, sea, these, feet, eat, team, keep. Nonwords: pheme, zede (e_e) + zeed, veeb, jeeb (ee) + zead, veab, jeab (ea). Sentences: Pete can see the green sea. / Steve will eat a peach. / "This beet is sweet," said Pete. / The team can keep the seat. / Eve had a dream at home. / "Feel the heat," said Jean. Dictation: these, see, green, sea, eat, team (+2 sentences). Vocabulary: peach, beet.

Full passage (93w): Pete and Steve went to the sea. Eve came to meet them. "I see a green reef," said Eve. The three sat in the sand. Steve had a peach to eat. Pete gave Eve a beet. "This beet is sweet," said Eve. A seal came up from the deep. It made a big leap. They fed the seal a treat. The seal kept a bean in its teeth. "See its feet," said Pete. Eve set the peach seed in a pot. They had a fine time at the sea. The week was sweet.

### consolidate_long_o — "The Boat Ride"

Pairs: not→note, hop→hope (+e); got→goat, cot→coat (team). exampleWords: home, boat, note, road, rope, goat, soap, hose. Nonwords: zome, fope, nofe, vone (o_e) + zoab, voab, joad, moag (oa). Sentences: Joan rode home on the road. / "Tote the rope to the boat," said Cole. / The goat woke up at home. / Rose got soap and a hose. / "I hope the boat can float," said Joan. / The toad sat on a stone. Dictation: home, note, boat, road, soap, rope. Vocabulary: rope, toad.

Full passage (92w): Joan and Cole woke up at home. "Tote the rope to the boat," said Cole. Joan got the soap and a hose. Rose came up the road with a goat. The goat had a red coat. Joan said, "Hop in the boat." The goat sat on a stone. A toad gave a croak on a log. The boat did float on the lake. Cole held the rope. Rose wrote a note at home. They rode home in the sun. "I hope the goat can doze," said Rose. It was a fine ride.

### consolidate_long_i — "The Night Ride"

Pairs (i_e only — igh exception per reviewer addition #1): rid→ride, rip→ripe, fin→fine, dim→dime. exampleWords: ride, light, time, night, fine, bright, bike, high. Nonwords: zibe, mide, fime, pive (i_e) + zighb, vighg, jighd, mighb (igh). Sentences: Mike can ride his bike at night. / The light is bright at five. / "I like this light," said Dwight. / The kite went up high. / "Hide the dime," said Mike. / Dwight had a fine time. Dictation: ride, time, light, night, fine, high. Vocabulary: kite, pine.

Full passage (89w): Mike and Dwight like to ride at night. The night was fine and bright. Mike had a light on his bike. "I like this light," said Dwight. They rode up the hill in a line. A kite was stuck in a pine. Mike held his light up high. Dwight got the kite in time. "Nice job," said Mike. The pine had a fine smell. They ride a mile in the night. Mike hid a dime in his side bag. "It is mine," said Mike. Dwight slept well that night.

## Status

Jonathan content sign-off complete (2026-06-04). Next: ChatGPT Pro review → full Codex spec. The Codex requirements list (Jonathan's approval, verbatim): add Phase 4 Mid targets 13–16; same-sound consolidation targets; registry codes only; add/extend PHASE_4_MID content entries; include fullAuditPassageText/Title; enforce LESSON_PHASE4_MID_NO_BARE_TEAM_CODES; enforce pattern-in-target-set coverage; preserve strict VCe +e pairs; preserve same-onset/same-coda team pairs; apply ay/igh coverage exception without weakening pair rules; include the three narrow fold-ins; no engine/matcher/registry changes; no Phase 3 behavior changes; no student-facing route.
