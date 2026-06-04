# Codex spec — content-v3 Phase 4 R-Controlled Entry (targets 17–19)

Companion: `specs/phase4-rcontrolled-content-WORKED.md` (all content below validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET PASS). Engine prerequisites MERGED: mini-PR 4ce688e + legacy-gate pseudoword fix 966d3b8.

## Scope / boundary (locked)

Content + seed + tests ONLY. NO engine/matcher/registry changes (the legacy-gate pseudoword exception is ALREADY on main — do not reimplement). NO Phase 3 / Phase 4 Entry / Phase 4 Mid changes. NO student route. Registry codes only (r_ar/r_or/r_er/r_ir/r_ur — never bare ar/or/er/ir/ur). Review-set default: allowed = closed + all VCe; taught teams stay BLOCKED in r lessons (cumulative spiral review is a deliberate future change, not this PR).

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_RCONTROLLED` phase position: `{ phaseNumber: 4, subPosition: "RCONTROLLED", label: "Phase 4 R-Controlled Entry", phonicsTrack: "R-controlled vowel entry: ar and or as distinct sounds, then er/ir/ur as three spellings of the same r-controlled sound.", morphologyTrack: "No new morphology target.", prerequisites: ["PHASE_4_MID"] }`.

Add `PHASE_4_RCONTROLLED_TARGETS: DailyTargetSeed[]` — exactly these three. Shared: allowed = the five closed_short_* + all five VCe; blocked = ALL teams (ai/ay/ee/ea/oa/ow/igh/ew/ue/ie_long_i/ie_long_e/oo_long/oo_short) + all diphthongs (ow/ou/oi/oy) + the NON-target r patterns.

1. `r_controlled_ar` (17, kid "ar words", tutor "R-controlled ar: car, park, farm"): patterns `["r_ar"]`, pseudowordPatterns `["r_ar"]`; exampleWords `["car","park","barn","farm","star","dark","hard","yard"]`; exampleNonwords `["zarb","varn","jarm","marb","narp","sarb","parn","tarb"]`.
2. `r_controlled_or` (18, "or words", "R-controlled or: corn, fork, storm"): patterns `["r_or"]`, pseudowordPatterns `["r_or"]`; exampleWords `["corn","fork","storm","horn","north","porch","short","fort"]`; exampleNonwords `["vorm","zorb","jorm","morb","norp","torb","dorb","lorm"]`.
3. `r_controlled_er_ir_ur` (19, "er, ir, and ur words", "R-controlled er/ir/ur: her, bird, turn"): patterns `["r_er","r_ir","r_ur"]`, pseudowordPatterns `["r_er","r_ir","r_ur"]`; exampleWords `["her","bird","turn","fern","girl","curb","first","burn"]` (first five span all three spellings); exampleNonwords `["nerb","zerb","derm","jirt","virn","nirt","murb","gurb"]`.

Extend `CONTENT_V3_DAILY_TARGETS` to include them.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. All `demoMode: "minimal_pairs"`.

### r_controlled_ar
- demonstrationPairs: cat→cart, had→hard, ban→barn, pat→part. Line2: those 8. Line3: star, dark, yard, lake, hand, desk, home.
- sentences: Carl has a car at the farm. / The barn is dark and big. / "Park the car in the yard," said Carl. / It is hard to spot a star. / Mark made a tart at home. / The dog can bark in the dark.
- dictatedWords: car, park, barn, farm, hard, dark. dictatedSentences: Carl has a car at the farm. / The barn is dark and big. vocabulary: cart, yard.
- comprehension: How can you tell the car was hard to start? (inference) / What did Carl set on the cart? (literal) / Tell me what happened at the farm. (retell) / What job would you do on a farm? (personal_connection)
- titles: A Fine Start at the Farm.
- mockPassageText: `Carl woke up at the farm. The barn was still dark. "Park the cart in the yard," said Marge. Bart came up the path in a car. Carl gave him a hand. A star came up far in the dark. It was a fine start.`
- fullAuditPassageText: `Carl woke up at the farm. The barn was still dark. "Park the cart in the yard," said Marge. Carl set a lamp on the cart. Bart came up the path in a car. "It is hard to start the car," said Bart. Carl gave him a hand. The car gave a sharp snap. At last it ran. Marge fed the hens at the gate. A star came up far in the dark. Bart said, "It is a fine farm." Carl had a big smile. It was a fine start.`

### r_controlled_or
- demonstrationPairs: shot→short, pot→port, cod→cord, ton→torn. Line2: those 8. Line3: storm, horn, north, lake, hand, desk, home.
- sentences: The storm hit in the north. / A horn went off at the fort. / "Hold the fork," said Norm. / The corn is on the porch. / Mort can sort the caps. / "Step off the cord," said Dot.
- dictatedWords: corn, fork, storm, horn, short, port. dictatedSentences: The storm hit in the north. / A horn went off at the fort. vocabulary: fort, cord.
- comprehension: Why did Mort shut the porch gate? (inference) / What did Dot get for the flag? (literal) / Tell me what happened in the storm. (retell) / What would you do in a big storm? (personal_connection)
- titles: The Storm at the Fort.
- mockPassageText: `Norm woke up at the fort. A storm hit from the north. "Shut the porch gate," said Mort. The horn went off in the storm. At last the storm went past. It was a short storm.`
- fullAuditPassageText: `Norm woke up at the fort. A storm hit from the north. The wind bent the corn. "Shut the porch gate," said Mort. Dot got the cord for the flag. The horn went off in the storm. Norm held his fork at lunch. "This corn is hot," said Dot. Mort had to sort the caps. At last the storm went past. The sun came up at last. "It was a short storm," said Norm. They sat on the porch with corn. The fort was safe and still.`

### r_controlled_er_ir_ur
- demonstrationPairs: ten→tern, fist→first, cub→curb, hut→hurt. Line2: those 8. Line3: her, bird, turn, lake, hand, desk, home.
- sentences: The bird sat on the curb. / "Turn at the third hut," said Bert. / Her fern is in the dirt. / The girl hurt her hand. / Kurt has a firm grip. / "The sun can burn the fern," said Gert.
- dictatedWords: her, bird, turn, first, hurt, burn. dictatedSentences: The bird sat on the curb. / The girl hurt her hand. vocabulary: fern, curb.
- comprehension: Why did Fern set the pot at the curb? (inference) / What did Fern feed the bird? (literal) / Tell me what the bird did. (retell) / What pet trick would you teach a bird? (personal_connection)
- titles: The Bird That Can Twirl.
- mockPassageText: `Fern is a girl with a bird. The bird can chirp and turn. Kurt sat on the curb. The bird went up in a swirl. Fern fed the bird a crust. It was her best turn yet.`
- fullAuditPassageText: `Fern is a girl with a bird. The bird can chirp and turn. "Her bird is the first to sing," said Bert. Kurt sat on the curb. The bird went up in a swirl. It came back at the third turn. "That bird can twirl," said Kurt. Fern fed the bird a crust. The bird gave a chirp. Gert had a fern in a pot. "It must not burn in the sun," said Gert. Fern set the pot at the curb. Her bird sat on her hand. It was her best turn yet.`

## 3. Seed script — `scripts/content/seed-phase4-rcontrolled.ts` + npm `seed:phase4-rcontrolled`

Mirror `seed-phase4-mid.ts`: upsert position + 3 targets; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords, each detects (ordered detectPatternCandidates) + validates strictLexicon.

## 4. Tests — new `scripts/test-content-v3-phase4-rcontrolled.ts`, wired into `test:content-v3`

Per target (mirror phase4-mid test): nonwords detect + validate strict; generateLessonDraft (phaseNumber 4) → canPersist; Part 7 renders fullAuditPassageText; full passage passes FULL passesAuditGate; short fixture classified + unblocked + quality; style sweep over fullAuditPassageText + sentences + dictatedSentences (banned function words, no -s/-es/-ed/-ing on target stems); LESSON_TARGET_PATTERN_COVERAGE PASS for er_ir_ur (3 patterns).

R-specific assertions:

1. **Admission matrix per target:** r_controlled_ar draft admits car/park/farm content and `LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET` PASSES; inject "horn" into a Part 5 sentence → FAIL naming Part 5 horn; inject "her" → FAIL. Same shape for or (inject car/turn) and er_ir_ur (inject car/horn).
2. **Legacy-gate pseudoword regression (the 966d3b8 fix):** the r_ar draft with its 8 nonwords passes `LESSON_PHASE3_NO_RCONTROLLED` (non-CMUdict pseudowords like jarm/marb not flagged).
3. **Part 2 scoping:** r_ar draft with pair got→corn → FAIL (non-target r_or); er_ir_ur draft with pair cat→cart → FAIL (non-target r_ar); r_ar draft with r-controlled BASE car→cart → FAIL (bases must be non-r closed words).
4. **Bare-code gate:** scan the three targets' patterns/pseudowordPatterns for bare ar/or/er/ir/ur → none; negative fixture with `patterns: ["ar"]` throws.
5. **Cross-family contamination:** append "The car is far." to the er_ir_ur full passage → blocked/violation for car (r_ar).
6. **Monosyllable note as executable check (cheap):** assert no token in the three fullAuditPassageTexts is a multisyllabic r-controlled word (per the WORKED doc finding re: "never" — keep the sweep simple: every r-controlled token must phoneme-match a declared target of its own lesson).

## 5. Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run seed:phase4-rcontrolled` · `npm run build`.

## Stop — report

Diff summary; three targets' seed JSON verbatim; nonword audit table; new test assertion list with results; proof adversarial cases fail (output); EXPLICIT line "Phase 3, Phase 4 Entry, and Phase 4 Mid content untouched" backed by byte-diff (`git diff <base> -- lib/content lib/literacy scripts/test-content-v3-phase4-entry-teams.ts scripts/test-content-v3-phase4-mid.ts` showing only the specified additions); verification results. Do NOT touch the engine, registry, matcher, or pair predicates. Do NOT rewrite passages for style.
