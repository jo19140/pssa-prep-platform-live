# Codex spec — content-v3 Phase 4 Mid: same-sound spelling consolidation (targets 13–16)

Companion: `specs/phase4-mid-consolidation-WORKED.md` (Jonathan-approved 2026-06-04; all content below already validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, coverage PASS, 8/8 pseudowords strict-valid per target).

## Scope / boundary (locked)

Content + seed + tests ONLY. NO engine/matcher/registry changes. NO Phase 3 or Phase 4 Entry behavior changes (existing targets, content, gates byte-identical except the three fold-ins below). NO student-facing route. The three fold-ins are narrow file edits — do not add new engine behavior while folding them in.

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_MID` phase position (mirror `PHASE_4_ENTRY`): `{ phaseNumber: 4, subPosition: "MID", label: "Phase 4 Mid", phonicsTrack: "Same-sound long-vowel consolidation: each target groups the VCe spelling with the vowel-team spellings of one long vowel (a_e/ai/ay, e_e/ee/ea, o_e/oa, i_e/igh).", morphologyTrack: "No new morphology target.", prerequisites: ["PHASE_4_ENTRY"] }`.

Add `PHASE_4_MID_TARGETS: DailyTargetSeed[]` with EXACTLY these four (registry codes only — never bare ai/ay/ee/ea/oa/igh):

Shared: `allowedPatternCodes` = the five closed_short_* + the NON-target VCe codes; `blockedPatternCodes` = every non-target team + all diphthongs + all r-controlled (same blockedExcept style as Phase 4 Entry).

1. `consolidate_long_a` (order 13, kid "long a spellings", tutor "Long a consolidation: a_e, ai, ay"): patterns `["a_e","team_ai","team_ay"]`, pseudowordPatterns `["a_e","team_ai"]`, sound long_a; exampleWords `["cake","rain","play","made","day","wait","gray","lake"]`; exampleNonwords `["zake","pame","vade","sape","zaib","vaib","naid","paib"]`.
2. `consolidate_long_e` (order 14, "long e spellings", "Long e consolidation: e_e, ee, ea"): patterns `["e_e","team_ee","team_ea"]`, pseudowordPatterns `["e_e","team_ee","team_ea"]`; exampleWords `["Pete","green","sea","these","feet","eat","team","keep"]`; exampleNonwords `["pheme","zede","zeed","veeb","jeeb","zead","veab","jeab"]`.
3. `consolidate_long_o` (order 15, "long o spellings", "Long o consolidation: o_e, oa"): patterns `["o_e","team_oa"]`, pseudowordPatterns `["o_e","team_oa"]`; exampleWords `["home","boat","note","road","rope","goat","soap","hose"]`; exampleNonwords `["zome","fope","nofe","vone","zoab","voab","joad","moag"]`.
4. `consolidate_long_i` (order 16, "long i spellings", "Long i consolidation: i_e, igh"): patterns `["i_e","team_igh"]`, pseudowordPatterns `["i_e","team_igh"]`; exampleWords `["ride","light","time","night","fine","bright","bike","high"]`; exampleNonwords `["zibe","mide","fime","pive","zighb","vighg","jighd","mighb"]`.

Extend `CONTENT_V3_DAILY_TARGETS` to include `PHASE_4_MID_TARGETS`.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Four new entries keyed by target code. Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. All use `demoMode: "minimal_pairs"`.

### consolidate_long_a
- demonstrationPairs: cap→cape, man→mane (VCe +e); pan→pain, ran→rain (team onset/coda).
- contrastiveLine2: cap, cape, man, mane, pan, pain, ran, rain. contrastiveLine3: play, stay, gray, lane, wait, hand, desk.
- sentences: Jake made a cake at the lake. / The rain fell all day. / "Stay in and play," said Jane. / Gail had to wait in the lane. / They gave May a plate. / The gray paint is wet.
- dictatedWords: cake, made, rain, wait, play, day. dictatedSentences: Jake made a cake at the lake. / The rain fell all day. vocabulary: paint, plate.
- comprehensionQuestions: Why did Jake and Gail stay in? (inference) / What did Jake and Gail make? (literal) / Tell me what happened on the rainy day. (retell) / What game would you play inside on a rainy day? (personal_connection)
- mockPassageTitle + fullAuditPassageTitle: The Rainy Day Cake.
- mockPassageText: `Jake made a cake. The rain fell all day. "Stay in," said Jane. Gail had to wait. They play a game at home. Jake gave May a plate. May ate the cake. "I like this game," said Gail. It was a fine day.`
- fullAuditPassageText: `Jake and Gail made a cake. The rain fell all day. "Stay in," said Jane. Jay had to wait at the gate. May came late with a pail and a cape. They gave him a plate. Jake set the cake on the plate. "It is a fine cake," said May. Gail made gray paint. They paint a game grid on a tray. Jay and May play the game. The rain came to a stop. The sun came up at last. They ran to the lake. Jake gave a wave. It was a fine day.`

### consolidate_long_e
- demonstrationPairs: pet→Pete, them→theme (VCe +e); bed→bead, ten→teen (team).
- contrastiveLine2: pet, Pete, them, theme, bed, bead, ten, teen. contrastiveLine3: green, sea, keep, these, team, hand, desk.
- sentences: Pete can see the green sea. / Steve will eat a peach. / "This beet is sweet," said Pete. / The team can keep the seat. / Eve had a dream at home. / "Feel the heat," said Jean.
- dictatedWords: these, see, green, sea, eat, team. dictatedSentences: Pete can see the green sea. / Steve will eat a peach. vocabulary: peach, beet.
- comprehensionQuestions: Why did they feed the seal? (inference) / What did Steve bring to eat? (literal) / Tell me what happened at the sea. (retell) / What snack would you take to the beach? (personal_connection)
- titles: A Week at the Sea.
- mockPassageText: `Pete and Steve went to the sea. "I see a green reef," said Eve. Steve had a peach to eat. A seal made a big leap. They fed the seal a treat. "See its feet," said Pete. The week was sweet.`
- fullAuditPassageText: `Pete and Steve went to the sea. Eve came to meet them. "I see a green reef," said Eve. The three sat in the sand. Steve had a peach to eat. Pete gave Eve a beet. "This beet is sweet," said Eve. A seal came up from the deep. It made a big leap. They fed the seal a treat. The seal kept a bean in its teeth. "See its feet," said Pete. Eve set the peach seed in a pot. They had a fine time at the sea. The week was sweet.`

### consolidate_long_o
- demonstrationPairs: not→note, hop→hope (VCe +e); got→goat, cot→coat (team).
- contrastiveLine2: not, note, hop, hope, got, goat, cot, coat. contrastiveLine3: road, soap, home, rope, toad, hand, desk.
- sentences: Joan rode home on the road. / "Tote the rope to the boat," said Cole. / The goat woke up at home. / Rose got soap and a hose. / "I hope the boat can float," said Joan. / The toad sat on a stone.
- dictatedWords: home, note, boat, road, soap, rope. dictatedSentences: Joan rode home on the road. / The toad sat on a stone. vocabulary: rope, toad.
- comprehensionQuestions: Why did Cole hold the rope? (inference) / What did Rose write at home? (literal) / Tell me what happened on the boat ride. (retell) / Where would you ride a boat? (personal_connection)
- titles: The Boat Ride.
- mockPassageText: `Joan woke up at home. "Tote the rope to the boat," said Cole. Rose came up the road with a goat. The boat did float on the lake. A toad gave a croak. They rode home in the sun.`
- fullAuditPassageText: `Joan and Cole woke up at home. "Tote the rope to the boat," said Cole. Joan got the soap and a hose. Rose came up the road with a goat. The goat had a red coat. Joan said, "Hop in the boat." The goat sat on a stone. A toad gave a croak on a log. The boat did float on the lake. Cole held the rope. Rose wrote a note at home. They rode home in the sun. "I hope the goat can doze," said Rose. It was a fine ride.`

### consolidate_long_i
- demonstrationPairs (i_e ONLY — igh coverage exception): rid→ride, rip→ripe, fin→fine, dim→dime.
- contrastiveLine2: rid, ride, rip, ripe, fin, fine, dim, dime. contrastiveLine3: light, night, bright, time, high, hand, desk.
- sentences: Mike can ride his bike at night. / The light is bright at five. / "I like this light," said Dwight. / The kite went up high. / "Hide the dime," said Mike. / Dwight had a fine time.
- dictatedWords: ride, time, light, night, fine, high. dictatedSentences: Mike can ride his bike at night. / The kite went up high. vocabulary: kite, pine.
- comprehensionQuestions: Why did Mike need the light? (inference) / What was stuck in the pine? (literal) / Tell me what happened on the night ride. (retell) / What would you take on a night walk? (personal_connection)
- titles: The Night Ride.
- mockPassageText: `Mike and Dwight ride at night. The light is bright. A kite was stuck in a pine. Mike held his light up high. Dwight got the kite in time. "Nice job," said Mike. It was a fine night.`
- fullAuditPassageText: `Mike and Dwight like to ride at night. The night was fine and bright. Mike had a light on his bike. "I like this light," said Dwight. They rode up the hill in a line. A kite was stuck in a pine. Mike held his light up high. Dwight got the kite in time. "Nice job," said Mike. The pine had a fine smell. They ride a mile in the night. Mike hid a dime in his side bag. "It is mine," said Mike. Dwight slept well that night.`

## 3. Seed script — `scripts/content/seed-phase4-mid.ts` + npm `seed:phase4-mid`

Mirror `seed-phase4-entry.ts` exactly: upsert PHASE_4_MID phase position + the four targets; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords, each nonword detects to a pseudowordPattern (ordered selection via detectPatternCandidates) and passes validatePseudowordCandidate strictLexicon. Importer must never re-run over an approved DB (existing design).

## 4. Tests — new `scripts/test-content-v3-phase4-mid.ts`, wired into `test:content-v3`

Per target (mirror test-content-v3-phase4-entry-teams): pseudowordPatterns subset; 8 nonwords each detect + validate strict; generateLessonDraft (phase-4-mid context, phaseNumber 4) → canPersist; LESSON_TARGET_PATTERN_COVERAGE PASS where ≥2 patterns; Part 7 renders fullAuditPassageText; fullAuditPassage passes the FULL passesAuditGate; short mockPassage: classified + no blocked + quality (NOT band-bound); style sweep over fullAuditPassageText + sentences + dictatedSentences (no we/he/she/me/be/go/so/by/my/no, no -s/-es/-ed/-ing token whose stem matches a target pattern).

New assertions specific to Mid:

1. **LESSON_PHASE4_MID_NO_BARE_TEAM_CODES** (hard gate, data-level — no engine change): scan each Mid target's `targetPatternsJson.patterns`, `pseudowordPatterns`, and graphemes-derived metadata expectations; FAIL if any entry is a bare `ai/ay/ee/ea/oa/igh`. Negative test: a fixture target with `patterns: ["ai"]` must fail.
2. **ay/igh coverage exception (executable):** assert consolidate_long_a has NO ay-based demonstration pair and consolidate_long_i has NO igh-based pair, while team_ay/team_igh coverage is still satisfied via exampleWords/lines/sentences/passage (LESSON_TARGET_PATTERN_COVERAGE must PASS). Adversarial: strip ay words from a long_a draft's parts → coverage FAIL (mirror removeAyWords).
3. **Per-family pair rules hold in mixed lists:** adversarial cat→cape (VCe non-+e) and pat→pain (team coda change) injected into a Mid part 2 → LESSON_PART2_DEMO_MODE_VALID FAIL. (Same predicates as commit 2737263 — do not modify them.)
4. **Cross-sound contamination:** append `I see the sea.` to the long_a full passage → blocked violations for see/sea (team_ee/team_ea).

## 5. Fold-ins (narrow; NO new engine behavior)

1. Negative test (in the new test file): a phase ≥ 4 target whose content lacks `fullAuditPassageText` → `buildLessonGeneratorContext`'s throw fires (assert the exact error message).
2. `team_oa` vocabulary in the content module: `["goat","oats"]` → `["goat","oat"]`.
3. `lib/literacy/lessonGenerator.ts`: add a TODO comment on the phase ≥ 4 selectedPassage text override: `// TODO(phase4-passage-pipeline): make this override conditional once human-approved phase-4 passages exist in the DB; unconditional override is correct only while fixtures are the sole phase-4 passages.` No logic change.

## 6. Verification (all must be green)

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. the new file) · `npm run content:audit-phase3-nonwords` (now covers Mid targets via CONTENT_V3_DAILY_TARGETS) · `npm run seed:phase4-mid` · `npm run build`.

## Stop — report (paste back for Claude's independent audit)

Diff summary; the four targets' seed JSON verbatim; nonword audit table; the new test's assertion list with PASS/FAIL counts; proof the adversarial cases fail (test output); an EXPLICIT line stating "Phase 3 and Phase 4 Entry content untouched" backed by byte-diff evidence (`git diff <base> -- lib/content lib/literacy` showing only the specified files/sections changed) — "tests green" alone is NOT sufficient for this item; the three fold-in diffs; verification command results. Do NOT touch the engine, matcher, registry, Part 2 pair predicates, or any Phase 3/Entry content. Do NOT add grade/phase scaffolding beyond these four targets. Do NOT rewrite passages for style.
