# Codex spec — content-v3 Phase 4 Diphthong Entry (targets 20–23)

Companion: `specs/phase4-diphthong-content-WORKED.md` (all content below validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, LESSON_TARGET_PATTERN_COVERAGE PASS for all four 2-pattern targets). Engine prerequisites MERGED — verify both are on main before starting; do NOT reimplement either:

1. Diphthong engine mini-PR (merge c3cf05d): pseudoword decode for family `diphthong` + Part 2 pair letters (oo→"o", au/aw→"a").
2. oo/ow passage-classifier regression fix (commit "Fix diphthong oo/ow passage classification for Phase 4 content"): `patternCodesFromDailyTarget` returns declared registry codes verbatim; regression test `scripts/test-content-v3-diph-classifier-regression.ts` exists and passes.

## Scope / boundary (locked)

Content + seed + tests ONLY. NO engine changes. NO matcher changes. NO registry changes. NO Phase 3 / Phase 4 Entry / Phase 4 Mid / R-Controlled changes. NO student route. NO DB work. Registry codes only (diph_oi/diph_oy/diph_ou/diph_ow/team_oo_long/team_oo_short/team_au/team_aw — never bare oi/oy/ou/ow/oo/au/aw). All four targets must pass the FULL passage audit; Part 7 renders fullAuditPassageText; target-scoped admission is enforced through blockedPatternCodes (no new gate — the classifier fix makes this honest). Coverage is required for every declared registry pattern (each target declares 2). ay/igh-style coverage-exception logic applies where real minimal pairs are not pedagogically clean (oi_oy examples_only; au pairs from aw only; oo_short via examples) — NO forced fake pairs (god→good, hod→hood, con→coin, sol→soil all pass the predicate structurally and are all BANNED on content grounds). Review-set default: allowed = closed + all VCe; taught teams and r patterns stay BLOCKED (cumulative spiral review remains a deliberate future change).

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_DIPHTHONG` phase position: `{ phaseNumber: 4, subPosition: "DIPHTHONG", label: "Phase 4 Diphthong Entry", phonicsTrack: "Diphthongs and ambiguous vowels: oi/oy and ou/ow gliding vowels, the two sounds of oo, and au/aw as one broad-a sound with two spellings.", morphologyTrack: "No new morphology target.", prerequisites: ["PHASE_4_RCONTROLLED"] }`.

Add `PHASE_4_DIPHTHONG_TARGETS: DailyTargetSeed[]` — exactly these four. Shared: allowed = the five closed_short_* + all five VCe; blocked = ALL teams (ai/ay/ee/ea/oa/ow/igh/ew/ue/ie_long_i/ie_long_e) + ALL r patterns (r_ar/r_or/r_er/r_ir/r_ur) + the NON-target patterns among {team_oo_long, team_oo_short, team_au, team_aw, diph_oi, diph_oy, diph_ou, diph_ow}.

1. `diph_oi_oy` (20, kid "oi and oy words", tutor "Diphthong oi/oy: coin, boy"): patterns `["diph_oi","diph_oy"]`, pseudowordPatterns `["diph_oi","diph_oy"]`; exampleWords `["coin","boy","oil","joy","soil","toy","join","point"]`; exampleNonwords `["zoit","voib","noib","foid","zoy","voy","snoy","gloy"]`.
2. `diph_ou_ow` (21, "ou and ow words", "Diphthong ou/ow: out, town"): patterns `["diph_ou","diph_ow"]`, pseudowordPatterns `["diph_ou","diph_ow"]`; exampleWords `["out","town","loud","down","found","cow","shout","owl"]`; exampleNonwords `["zoud","vout","noud","foud","zown","fown","plown","vown"]`.
3. `oo_both` (22, "oo words", "Two sounds of oo: moon and book"): patterns `["team_oo_long","team_oo_short"]`, pseudowordPatterns `["team_oo_short","team_oo_long"]` (selector order is deliberate so the approved dook fixture is evaluated under team_oo_short); exampleWords `["moon","book","soon","look","food","good","boot","foot"]`; exampleNonwords `["zoon","voom","zood","noof","vook","dook","vood","tood"]`. (CORRECTION: "dook" replaces the rejected predecessor that the independent CMUdict oracle correctly caught as a raw-CMUdict direct hit — the oracle stays strict, no caveat added.)
4. `diph_au_aw` (23, "au and aw words", "Vowel au/aw: haul, saw"): patterns `["team_au","team_aw"]`, pseudowordPatterns `["team_au","team_aw"]`; exampleWords `["saw","haul","paw","fault","lawn","draw","dawn","yawn"]`; exampleNonwords `["zaul","vaul","naul","jaul","zaw","snaw","blaw","glaw"]`.

Every exampleWords first-five spans both declared patterns (line-1 coverage). Every exampleNonwords list is 4+4 across the two patterns, validator-clean AND raw-CMUdict-clean (no new oracle caveats needed — see Tests §6). Extend `CONTENT_V3_DAILY_TARGETS` to include all four.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. demoMode per target: oi_oy = `examples_only` (with `demonstrationExamples: ["coin","boy","oil","joy","soil"]` and demonstrationPairs EMPTY); the other three = `minimal_pairs`. Take every field VERBATIM from the WORKED doc — pairs, lines, sentences, dictation, comprehension, vocabulary, mockPassageText/Title, fullAuditPassageText/Title for all four targets. Do not "improve" wording: every word has been gate-validated ("The path ran past a wood." is the approved oo_both line; "Step off the lawn" is deliberate — "do" cannot classify; "for" is banned outside r_or lessons; caw/chomp/calm are deliberate).

## 3. Seed script — `scripts/content/seed-phase4-diphthong.ts` + npm `seed:phase4-diphthong`

Mirror `seed-phase4-rcontrolled.ts`: upsert position + 4 targets; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords per target, each detects (ordered detectPatternCandidates) + validates strictLexicon.

## 4. Tests — new `scripts/test-content-v3-phase4-diphthong.ts`, wired into `test:content-v3`

Per target (mirror phase4-rcontrolled test): nonwords detect + validate strict; generateLessonDraft (phaseNumber 4) → canPersist; Part 7 renders fullAuditPassageText; full passage passes FULL passesAuditGate; short fixture classified + unblocked + quality; style sweep over fullAuditPassageText + sentences + dictatedSentences (banned function words we/he/she/me/be/go/so/by/my/no, no -s/-es/-ed/-ing on target stems); `LESSON_TARGET_PATTERN_COVERAGE` PASS for ALL FOUR targets (each declares 2 patterns).

Rung-specific assertions:

1. **Admission matrix per target (classifier-honesty in lesson context):** the oi_oy full passage audit admits coin/boy/oil/joy as targets; injecting "cow" or "moon" or "saw" into a Part 5 sentence → blocked violation naming the word. Same shape for ou_ow (inject "oil", and "snow" → blocked team_ow violation — snow must NEVER classify as a diph_ow target), oo_both (inject "cow"/"coin"), au_aw (inject "out"/"book").
2. **Ambiguity pins at the passage level with the real seeds:** in the ou_ow lesson context, "cow"/"town" classify target diph_ow while "snow" surfaces only as a blocked team_ow violation; in the oo_both context, "moon" classifies target team_oo_long and "book" target team_oo_short (assert matchedPattern, not just category).
3. **examples_only validation (first use):** the oi_oy draft passes LESSON_PART2_DEMO_MODE_VALID with zero pairs; a mutated fixture adding one demonstration pair to oi_oy → FAIL (the gate rejects stray pairs in examples_only mode — verified behavior).
4. **Pair matrix:** ou_ow pairs shot→shout/pond→pound/fond→found/ton→town PASS; au_aw pairs fan→fawn/pan→pawn PASS; oo_both pairs rot→root/hot→hoot/tot→toot/hop→hoop PASS. Regression: cap→cape, pan→pain, cat→cart still PASS in their existing drafts.
5. **Fixed pseudoword fixtures (no placeholders):** commit the exact 32 nonwords above; the test validates each against its declared pattern (strictLexicon) and the stop report prints each word, pattern, decoded expectedPronunciation, and strictLexicon result.
6. **Oracle integrity:** the independent CMUdict oracle in `test-content-v3-lesson-spec-conformance.ts` must pass over the new seeds with ZERO new caveat entries (all 32 nonwords are absent from raw CMUdict — re-verified 2026-06-04 after the oracle caught the rejected predecessor; "dook" is its replacement). No `|| validation.valid` fallback anywhere (spec-template rule: extend explicit caveat lists, never weaken the oracle). Existing caveats unchanged: a_e mave/nace; r_controlled_ar zarb/varn.
7. **Cross-rung regression:** an oo_both draft does not admit "out"/"down"; a diph_ou_ow draft does not admit "look"/"good". All existing test:content-v3 scripts pass unchanged.

## 5. Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for seed + content files; new test output incl. the four-passage gate table (words/decod/unclassified/blocked/trigrams/gate/canPersist/coverage), the 32-row pseudoword fixture table (word/pattern/pronunciation/result), the admission-matrix results incl. the snow-blocked pin, and the examples_only PASS/FAIL pair; ORACLE INTEGRITY block (zero new caveats, no fallback, existing caveats unchanged); explicit line "Engine, matcher, registry, Phase 3, Phase 4 Entry, Phase 4 Mid, and R-Controlled content and tests untouched" backed by byte-diff (`git diff <base> -- lib/literacy scripts/test-content-v3-phase4-entry-teams.ts scripts/test-content-v3-phase4-mid.ts scripts/test-content-v3-phase4-rcontrolled.ts scripts/test-content-v3-rcontrolled-engine.ts scripts/test-content-v3-diphthong-engine.ts scripts/test-content-v3-diph-classifier-regression.ts` must be empty); verification results. Do NOT touch the deferred teams-cleanup patterns (team_ow/ew/ue/ie_*) — that is a later rung.
