# Codex spec — content-v3 Phase 4 Morphology Entry A (targets 27–28)

Companion: `specs/phase4-morphology-content-WORKED.md` (both targets validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, coverage PASS, transformation_pairs PASS). Engine prerequisites ALL MERGED — verify on main, do NOT reimplement: morphology engine mini-PR (8e05906) + morphology plumbing batch ("Morphology plumbing...", 8f71fd9) + morphology producer-plumbing patch (content type gains `reviewWords`/`morphologyJson`; `buildLessonGeneratorContext` threads `content.reviewWords`; `part2Concept` emits `morphologyJson` into Part 2 contentJson). This is a CONTENT-ONLY rung. CRITICAL: `reviewWords` and `morphologyJson` live on the LESSON CONTENT object in `phase3EntryLessonContent.ts` (DailyTarget has no such columns) — NOT only on the seed targetPatternsJson. The generator reads them from content; Part 2's morphologyJson mirror is produced by the engine, so the content just supplies the field.

## Scope / boundary (locked)

Add targets 27–28. Content + seed + tests ONLY. NO engine changes. NO matcher changes. NO registry changes. NO new analyzer logic. NO Phase 3 / Phase 4 Entry / Mid / R-Controlled / Diphthong / Teams-Cleanup changes. NO student route. NO DB work. NO y→i. NO -er/-est. demoMode `transformation_pairs` for BOTH targets. morphologyJson REQUIRED on each target's targetPatternsJson AND mirrored on the Part 2 content (the worked content carries it in both places — keep both). No-change -s/-es forms allowed ONLY as review/contrast, never as target evidence. All 26 existing targets behavior-unchanged.

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_MORPHOLOGY` phase position: `{ phaseNumber: 4, subPosition: "MORPHOLOGY", label: "Phase 4 Morphology Entry A", phonicsTrack: "No new phonics target; morphology applies suffix spelling rules to already-taught stems.", morphologyTrack: "Suffix spelling changes: drop final e before a vowel suffix; double the final consonant of a short-vowel stem before a vowel suffix. Suffixes -ing, -ed, -s, -es.", prerequisites: ["PHASE_4_TEAMS_CLEANUP"] }`.

Add `PHASE_4_MORPHOLOGY_TARGETS: DailyTargetSeed[]` — exactly these two. Shared blocked = [team_ai, team_ay, team_ee, team_ea, team_oa, team_ow, team_igh, team_ew, team_ue, team_ie_long_i, team_ie_long_e, team_oo_long, team_oo_short, team_au, team_aw, diph_oi, diph_oy, diph_ou, diph_ow, r_ar, r_or, r_er, r_ir, r_ur].

1. `morph_drop_e` (27, kid "drop the e", tutor "Drop-e rule: hope → hoping, make → making"): targetPatternsJson `{ patterns: ["a_e","i_e","o_e","u_e"], pseudowordPatterns: ["a_e","i_e","o_e","u_e"], graphemes: ["a_e","i_e","o_e","u_e"], sound: "morph_drop_e", morphologyJson: { rule: "drop_e", stemPatterns: ["a_e","i_e","o_e","u_e"], suffixes: ["ing","ed","s","es"] } }`; allowedPatternCodes = ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e","e_e"]; exampleWords `["hope","make","ride","use","bake","smile","skate","slide"]`; exampleNonwords `["zame","vate","jide","mive","bime","zote","vope","fute"]`.
2. `morph_double` (28, "double the last letter", "Doubling rule: run → running, hop → hopped"): targetPatternsJson `{ patterns: ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e"], pseudowordPatterns: same, graphemes: ["a","i","o","u","e"], sound: "morph_double", morphologyJson: { rule: "double", stemPatterns: ["closed_short_a","closed_short_i","closed_short_o","closed_short_u","closed_short_e"], suffixes: ["ing","ed","s","es"] } }`; allowedPatternCodes = ["a_e","i_e","o_e","u_e","e_e"]; exampleWords `["run","sit","hop","grab","sled","hug","win","swim"]`; exampleNonwords `["zat","vit","jop","gub","zet","mip","fim","nuv"]`. The `reviewWords` warmup override `["lake","home","bike","cube","gate","five"]` goes on the morph_double LESSON CONTENT object (§2), not here — the generator threads it from content. (morph_drop_e needs no reviewWords; its closed warmup does not clash with VCe stems.)

Both exampleWords first-five span all declared stem vowels. All 16 nonwords are stem-shaped (drop_e VCe; double closed), validator-clean AND raw-CMUdict-clean (re-verified; zero new oracle caveats). Extend `CONTENT_V3_DAILY_TARGETS`.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. Both `demoMode: "transformation_pairs"`, each content object carries `morphologyJson` (same value as the seed) and `demonstrationPairs` as `{ base, target }` entries; the morph_double content object ALSO carries `reviewWords: ["lake","home","bike","cube","gate","five"]`. part2Concept reads `content.morphologyJson` and emits it into Part 2 contentJson automatically — do NOT hand-write the mirror, just supply the field. Take every other field VERBATIM from the WORKED doc (pairs, lines, sentences, dictation, comprehension, vocabulary, mock + full passages, titles). Do not "improve" wording: every word is gate-validated. Deliberate choices that must survive: "Mike is making a mess" (NOT "Jane and Mike are making" — "are" trips the r-scan); no plain-attach forms (mixed/jumped/helping) anywhere; "runs"/"hopes" present as no-change review.

## 3. Seed script — `scripts/content/seed-phase4-morphology.ts` + npm `seed:phase4-morphology`

Mirror `seed-phase4-teams-cleanup.ts`: upsert position + 2 targets; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords per target, each detects (ordered detectPatternCandidates — note closed detection now exists) + validates strictLexicon.

## 4. Tests — new `scripts/test-content-v3-phase4-morphology.ts`, wired into `test:content-v3`

Per target: nonwords detect + validate strict; generateLessonDraft (phaseNumber 4) → canPersist (the generator now threads morphology from targetPatternsJson — assert draft.morphology is set); Part 7 renders fullAuditPassageText; full passage passes FULL passesAuditGate; short fixture classified + unblocked + quality; style sweep (banned function words + "are" + sunup; no plain-attach forms); `LESSON_MORPHOLOGY_TARGET_COVERAGE` PASS for both (morphology targets use this gate, NOT LESSON_TARGET_PATTERN_COVERAGE); transformation_pairs PASSES for both with zero misclassified pairs.

Rung-specific assertions — THE CORE RULE-VERIFICATION FIRST:

1. **Rule verification (decompose under the lesson's rule only):**
   - morph_drop_e context: hoping/baked/making classify TARGET with morphology.rule "drop_e"; running/hopped decompose to NULL (not target) — assert they do NOT classify as target in a drop_e passage.
   - morph_double context: running/hopped/sitting classify TARGET with morphology.rule "double"; named/baked decompose to NULL.
2. **No-change scoping + coverage gate (LESSON_MORPHOLOGY_TARGET_COVERAGE — upstream prerequisite):** morphology targets use `LESSON_MORPHOLOGY_TARGET_COVERAGE`, NOT the phonics vowel-span gate. GOVERNING PRINCIPLE (verbatim): *Coverage counts only intentional morphology evidence: rule-matched transformed forms and intentional stem spread. It never counts no-change forms, incidental phonics words, or wrong-rule transformations as target evidence.* (Bare stems contribute to stem spread only when intentionally placed in pair bases / concept examples / dictation — never from incidental passage appearance.) Required test cases (Jonathan, verbatim):
   1. Degenerate morph_double (only bare stems + no-change forms) → LESSON_MORPHOLOGY_TARGET_COVERAGE FAIL.
   2. "runs"/"hops"/"sits" present → carry morphology.rule "none" → excluded from doubling coverage.
   3. Incidental "log"/"bug"/"sat" in the passage → do NOT count as morphology target evidence.
   4. running/hopping/sitting/hopped/etc → count only because morphology.rule === "double".
   5. morph_drop_e: hopes/makes/rides → rule "none" → excluded from drop_e coverage.
   6. morph_drop_e: making/hoping/riding/baked → count only because morphology.rule === "drop_e".
   7. A drop_e form in a double lesson does NOT count; a double form in a drop_e lesson does NOT count.
   8. Both signed-off exemplars PASS LESSON_MORPHOLOGY_TARGET_COVERAGE.
3. **transformation_pairs PASS/FAIL:** hope→hoping/make→making/ride→riding/bake→baked PASS in drop_e; run→running/hop→hopping/sit→sitting/hug→hugged PASS in double; hope→hopping FAILS in drop_e (wrong rule), run→runing FAILS (misspelling), hope→hopes FAILS (no-change is not drop_e evidence); a minimal_pairs draft (cap→cape) and an examples_only draft still PASS unchanged.
4. **Closed pseudoword pins:** the 8 morph_double nonwords validate strict under their closed patterns; "nok" rejects (knock collision), "wat" rejects (real word) — pin the closed-pseudoword collision path exists.
5. **Warmup override (PRODUCER PATH):** call the real `generatePart1Warmup` (not a hand-built warmup) for morph_double and assert its contentJson.warmupWords are the VCe review words from content (not the default closed list), and LESSON_WARMUP_NO_TODAY_PATTERN PASSES; morph_drop_e keeps the default warmup.
5b. **Part 2 morphology mirror (PRODUCER PATH):** call the real `generatePart2Concept` for both targets and assert contentJson.morphologyJson equals the content's morphologyJson (rule + stemPatterns + suffixes). This proves the spec's "mirrored on Part 2 content" requirement is met by the engine, not hand-written.
5c. **DURABLE TEST PRINCIPLE (Jonathan):** morphology tests must exercise the real producer path — `generateLessonDraft` and the actual `generatePartN` builders reading from `LESSON_CONTENT_BY_DAILY_TARGET` — NOT only hand-built contexts. The exemplar harness's hand-passed `morphology`/`reviewWords` is what masked the two producer gaps; the content test must assert on GENERATED part output.
6. **Opt-in invariance:** every existing non-morphology target still produces draft.morphology === undefined and byte-identical classification; run the full suite.
7. **Oracle integrity:** zero new caveats (all 16 nonwords raw-CMUdict-clean — pre-verified); no `|| validation.valid` fallback; existing caveats unchanged (a_e mave/nace; r_controlled_ar zarb/varn).

## 5. Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for seed + content files; new test output incl. the two-passage gate table, the 16-row pseudoword fixture table, the rule-verification results (drop_e admits drop_e + nulls doubling; double admits doubling + nulls drop_e; no-change scoping), the transformation_pairs PASS/FAIL matrix, the closed-pseudoword collision pins, and the warmup-override PASS; ORACLE INTEGRITY block (zero new caveats, no fallback, existing caveats unchanged); explicit line "Engine, matcher, registry, analyzer, and all prior content and tests untouched; all 26 prior targets produce draft.morphology undefined" backed by byte-diff (`git diff <base> -- lib/literacy` must be empty) and the full suite; verification results. Do NOT add y→i, -er/-est, or any third morphology target — those are later rungs.
