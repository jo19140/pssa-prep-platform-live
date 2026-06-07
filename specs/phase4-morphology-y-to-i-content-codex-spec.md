# Codex spec — content-v3 Phase 4 Morphology y→i (target 29)

Companion: `specs/phase4-morphology-y-to-i-content-WORKED.md` (exemplar validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, LESSON_MORPHOLOGY_TARGET_COVERAGE PASS, transformation_pairs PASS, all 8 pseudowords strict-valid). Engine prerequisites ALL MERGED — verify on main, do NOT reimplement: y-as-vowel mini-PR (d0b7f6a) + shared-parser consolidation (faf8fc6). This is a CONTENT-ONLY rung.

## Scope / boundary (locked)

Add target 29 (`morph_y_to_i`). Content + seed + tests ONLY. NO engine changes — specifically NO `lib/literacy` diff (the y_long_i matcher, y_to_i analyzer, pseudoword decode, and shared config parser are all already merged). NO matcher/registry/analyzer changes. NO Phase 3 / earlier Phase 4 changes. NO student route. NO DB. demoMode `transformation_pairs`. morphologyJson REQUIRED on the target's targetPatternsJson AND mirrored on the Part 2 content object (part2Concept emits it automatically — supply the field). No-change -ing forms are review only, never target evidence. All 28 existing targets behavior-unchanged.

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_MORPHOLOGY_Y_TO_I` phase position (or extend PHASE_4_MORPHOLOGY if that is how Entry A is structured — match the existing convention): `{ phaseNumber: 4, subPosition: "MORPHOLOGY_Y_TO_I", label: "Phase 4 Morphology y to i", phonicsTrack: "No new phonics target; applies the y-to-i spelling rule to already-taught final-y long-i stems.", morphologyTrack: "Change y to i before -ed and -es; keep y before -ing.", prerequisites: ["PHASE_4_MORPHOLOGY"] }`.

Add `PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS: DailyTargetSeed[]` — exactly one target:

`morph_y_to_i` (29, kid "change y to i", tutor "y to i rule: cry → cried, fly → flies"): targetPatternsJson `{ patterns: ["y_long_i"], pseudowordPatterns: ["y_long_i"], graphemes: ["y"], sound: "morph_y_to_i", morphologyJson: { rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed","es","ing"] } }`; allowedPatternCodes = ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e","a_e","i_e","o_e","u_e","e_e"]; blockedPatternCodes = [all teams incl team_ie_long_i, team_ie_long_e, team_ow, team_oo_long, team_oo_short, team_au, team_aw, team_ai, team_ay, team_ee, team_ea, team_oa, team_igh, team_ew, team_ue + diph_oi, diph_oy, diph_ou, diph_ow + r_ar, r_or, r_er, r_ir, r_ur]; exampleWords `["cry","try","fly","dry","spy","fry","shy","sky"]`; exampleNonwords `["cly","sny","gly","zy","smy","vry","zby","gry"]`.

All 8 nonwords are full-oracle clean (validator + raw-CMUdict + homophone-variant), pre-verified. Extend `CONTENT_V3_DAILY_TARGETS`.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. `demoMode: "transformation_pairs"`; the content object carries `morphologyJson` (same value as the seed) and `demonstrationPairs` as `{ base, target }`. Take every field VERBATIM from the WORKED doc (pairs, lines, sentences, dictation, comprehension, vocabulary, mock + full passages, titles). Do not "improve" wording: every word is gate-validated. Deliberate choices that must survive: "Sky cried a glad cry." (NOT "Sky cried, but it was a glad cry" — that duplicates the "it was a" trigram against the closer); comprehension "How can you tell Sky kept trying?" (regrounded — the passage never says the kite fell); "trying" present as keeps-y review.

## 3. Seed script — `scripts/content/seed-phase4-morphology-y-to-i.ts` + npm `seed:phase4-morphology-y-to-i`

Mirror `seed-phase4-morphology.ts`: upsert position + 1 target; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords, each detects (detectPatternCandidates — y_long_i detection exists) + validates strictLexicon.

## 4. Tests — new `scripts/test-content-v3-phase4-morphology-y-to-i.ts`, wired into `test:content-v3`

Per the durable producer-path rule: exercise the REAL generator/audit path (generateLessonDraft + the actual generatePartN + auditPassage reading from the seed), NOT only hand-built contexts. Required pins (Jonathan's ten):

1. **Producer path — Part 2 morphologyJson:** the real `generatePart2Concept` emits `contentJson.morphologyJson` equal to the seed's morphologyJson.
2. **Both audit paths route y_to_i:** `auditPassage` (via the shared `morphologyConfigFromTargetPatternsJson`) classifies cried/flies as y_to_i targets — assert through the real passage audit, not a manual morphology arg.
3. **y_to_i forms count as target evidence:** cried, tried, dried, flies, cries, dries each decompose rule "y_to_i" and classify target.
4. **keeps-y -ing forms allowed but do NOT count:** crying, trying, flying, drying decompose rule "none" (keeps y); classify review, excluded from coverage.
5. **Degenerate keeps-y-only lesson FAILS** `LESSON_MORPHOLOGY_TARGET_COVERAGE` (a draft whose only y forms are crying/trying/flying, no -ed/-es).
6. **ie-collision in-lesson:** in a y_to_i context, cried/flies classify y_to_i (morphology-first) BEFORE team_ie_long_i can block them.
7. **ie-collision outside:** without y_to_i morphology context, "cried" still matches team_ie_long_i (honest both directions).
8. **All 8 y_long_i pseudowords pass the full oracle:** cly, sny, gly, zy, smy, vry, zby, gry strict-valid.
9. **fy negative fixture:** "fy" REJECTS (homophone collision — phy/phi); "bly" REJECTS (raw-CMUdict real word).
10. **No `lib/literacy` diff:** the rung is content+seed+tests only.

Plus: full passage passes FULL passesAuditGate; Part 7 renders fullAuditPassageText; short fixture clean; coverage PASS for morph_y_to_i; style sweep (banned function words + "are"; no plain -s on y stems); generateLessonDraft → canPersist; LESSON_MORPHOLOGY_TARGET_COVERAGE asserted (NOT the phonics vowel-span gate). Opt-in invariance: all 28 existing targets unchanged, draft.morphology unchanged.

## 5. Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for seed + content files; new test output incl. the passage gate row (88w/1.000/0/0/0/TRUE/TRUE/coverage PASS), the 8-pseudoword table + the fy/bly rejections with collision words, the y_to_i decomposition + keeps-y matrix, the degenerate coverage FAIL, the ie-collision both-directions result, and the producer-path morphologyJson-mirror PASS; ORACLE INTEGRITY block (zero new caveats, no `|| validation.valid`, existing caveats unchanged: a_e mave/nace, r_controlled_ar zarb/varn); explicit line "Engine, matcher, registry, analyzer untouched; lib/literacy byte-diff empty; all 28 prior targets unchanged" backed by `git diff <base> -- lib/literacy` being empty and the full suite; verification results. Do NOT add -er/-est, y-long-e (baby/happy), or y-short-i (myth/gym) — those are later.
