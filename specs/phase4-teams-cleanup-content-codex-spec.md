# Codex spec — content-v3 Phase 4 Teams Cleanup (targets 24–26)

Companion: `specs/phase4-teams-cleanup-content-WORKED.md` (all content below validated through the real gates — decod 1.000, 0 unclassified/blocked/trigrams, passesAuditGate, canPersist, coverage PASS). Engine prerequisites ALL MERGED — verify on main, do NOT reimplement: diphthong engine mini-PR (c3cf05d), oo/ow passage-classifier regression fix (e0aed4d), diphthong content (0569d3f). This is a CONTENT-ONLY rung: live probes confirmed the engine needs zero changes.

## Scope / boundary (locked)

Add targets 24–26. Content + seed + tests ONLY. NO engine changes. NO matcher changes. NO registry changes. NO Phase 3 / Phase 4 Entry / Phase 4 Mid / R-Controlled / Diphthong content changes. NO student route. NO DB work. Registry codes only (team_ow/team_ew/team_ue/team_ie_long_i/team_ie_long_e — never bare ow/ew/ue/ie). demoMode `examples_only` for ALL THREE targets (no pairs anywhere — demonstrationPairs must be empty arrays; the gate rejects stray pairs in examples_only mode). All three targets pass the FULL passage audit; Part 7 renders fullAuditPassageText; target-scoped admission via blockedPatternCodes. Coverage required for every declared registry pattern (ew_ue and ie_both declare 2 each). Review-set default: allowed = closed + all VCe; everything else taught stays BLOCKED.

## 1. Seed — `lib/content/phase3EntrySeed.ts`

Add `PHASE_4_TEAMS_CLEANUP` phase position: `{ phaseNumber: 4, subPosition: "TEAMS_CLEANUP", label: "Phase 4 Teams Cleanup", phonicsTrack: "Cleanup of the deferred ambiguous vowel teams: ow as long o, ew and ue as long u, and the two sounds of ie.", morphologyTrack: "No new morphology target.", prerequisites: ["PHASE_4_DIPHTHONG"] }`.

Add `PHASE_4_TEAMS_CLEANUP_TARGETS: DailyTargetSeed[]` — exactly these three. Shared: allowed = the five closed_short_* + all five VCe; blocked = [team_ai, team_ay, team_ee, team_ea, team_oa, team_ow, team_igh, team_ew, team_ue, team_ie_long_i, team_ie_long_e, team_oo_long, team_oo_short, team_au, team_aw, diph_oi, diph_oy, diph_ou, diph_ow, r_ar, r_or, r_er, r_ir, r_ur] minus each target's own patterns.

1. `team_ow` (24, kid "ow as in snow", tutor "Vowel team ow: snow, grow, show"): patterns `["team_ow"]`, pseudowordPatterns `["team_ow"]`; exampleWords `["snow","grow","show","low","own","glow","slow","blow"]`; exampleNonwords `["zow","thow","smow","drow","zowl","vowl","blowl","zowm"]`. NOTE: diph_ow is in this target's blocked set — that is the point of the lesson.
2. `team_ew_ue` (25, "ew and ue words", "Long u teams ew/ue: new, blue"): patterns `["team_ew","team_ue"]`, pseudowordPatterns `["team_ew","team_ue"]`; exampleWords `["new","blue","few","true","grew","clue","chew","glue"]`; exampleNonwords `["vew","snew","twew","swew","frue","smue","spue","snue"]`. NOTE: snew and snue are intentionally paired as same-sound different-spelling examples; they are allowed only because both validate under their declared registry patterns. Not duplicates, not a mistake.
3. `team_ie_both` (26, "two sounds for ie", "Two sounds of ie: pie and field"): patterns `["team_ie_long_i","team_ie_long_e"]`, pseudowordPatterns `["team_ie_long_i","team_ie_long_e"]`; exampleWords `["pie","field","tie","chief","brief","shield","niece","lie"]`; exampleNonwords `["zie","blie","snie","grie","vief","zief","glief","sniel"]`.

Every multi-pattern exampleWords first-five spans both declared patterns. All 24 nonwords are validator-clean AND raw-CMUdict-clean (re-verified 2026-06-05; zero new oracle caveats needed). Extend `CONTENT_V3_DAILY_TARGETS`.

## 2. Content — `lib/content/phase3EntryLessonContent.ts`

Hearts everywhere: previewed `["said","was","they"]`, assumedKnown `["I","a","the","to"]`. All three `demoMode: "examples_only"` with `demonstrationPairs: []`. Take every field VERBATIM from the WORKED doc — demonstrationExamples, lines, sentences, dictation, comprehension, vocabulary, mock + full passages and titles for all three targets. Do not "improve" wording: every word is gate-validated. Deliberate choices that must survive: "trip in the snow" (NOT "snow day" — day is team_ay, blocked); "yip" (NOT "bark" — r-blocked); Flow is the team_ow target name while Cole is a VCe review name; "A spot of glue was on the step" (NOT "sat" — trigram); Brie carries team_ie_long_e.

## 3. Seed script — `scripts/content/seed-phase4-teams-cleanup.ts` + npm `seed:phase4-teams-cleanup`

Mirror `seed-phase4-diphthong.ts`: upsert position + 3 targets; validate pseudowordPatterns ⊆ patterns, ≥8 nonwords per target, each detects (ordered detectPatternCandidates) + validates strictLexicon.

## 4. Tests — new `scripts/test-content-v3-phase4-teams-cleanup.ts`, wired into `test:content-v3`

Per target (mirror phase4-diphthong test): nonwords detect + validate strict; generateLessonDraft (phaseNumber 4) → canPersist; Part 7 renders fullAuditPassageText; full passage passes FULL passesAuditGate; short fixture classified + unblocked + quality; style sweep (banned function words we/he/she/me/be/go/so/by/my/no/do, no -s/-es/-ed/-ing on target stems); `LESSON_TARGET_PATTERN_COVERAGE` PASS for team_ew_ue and team_ie_both; examples_only PASSES with zero pairs for all three, and a mutated fixture adding one pair → FAIL.

Rung-specific assertions — THE LOAD-BEARING ONE FIRST:

1. **The ow inversion (both directions, in one test):**
   - team_ow lesson context: snow/grow/show/low/own classify as TARGET (assert matchedPattern team_ow); cow/town/down surface as BLOCKED diph_ow violations and never classify target.
   - diph_ow context (build from the EXISTING diph_ou_ow seed — read-only, do not modify the diphthong test file): cow/town/down classify as TARGET diph_ow; snow surfaces as a BLOCKED team_ow violation.
   This is the exact mirror of the diphthong rung's snow pin and the most important acceptance check of this PR.
2. **Ambiguity honesty pins:** bow and sow match BOTH ow patterns (assert both true — that is WHY they are banned from content; assert neither appears in any of this rung's content); sew does NOT match team_ew; pie matches team_ie_long_i NOT team_ie_long_e; field matches team_ie_long_e NOT team_ie_long_i.
3. **Admission matrix:** inject "cow" into a team_ow Part 5 sentence → blocked violation naming the word; inject "snow" into ew_ue → blocked team_ow; inject "pie"/"blue" into team_ow → blocked; inject "day" into team_ow → blocked team_ay (the snow-day trap, pinned).
4. **Per-pattern fixture coverage:** all 24 nonwords print word/pattern/decoded expectedPronunciation/strictLexicon result (fixed list, no placeholders); each of the 5 registry patterns has ≥1 strict-valid pseudoword; snew/snue both validate under their respective patterns.
5. **Oracle integrity:** the independent CMUdict oracle passes over the new seeds with ZERO new caveat entries (all 24 nonwords raw-CMUdict-clean — pre-verified). No `|| validation.valid` fallback anywhere. Existing caveats unchanged: a_e mave/nace; r_controlled_ar zarb/varn.
6. **Shared-harness recognition:** extend the lesson-pipeline and spec-conformance harnesses to recognize TEAMS_CLEANUP as Phase 4 — mechanical phase-recognition extension ONLY, exactly like the diphthong PR's (import + isPhase4 disjunction + ternary branches); zero assertion changes.
7. **Cross-rung regression:** all existing test:content-v3 scripts pass unchanged.

## 5. Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for seed + content files; new test output incl. the three-passage gate table (words/decod/unclassified/blocked/trigrams/gate/canPersist/coverage), the 24-row pseudoword fixture table, the FULL ow-inversion results (both directions), the examples_only zero-pair PASS + stray-pair FAIL, and the admission matrix incl. the day-trap pin; ORACLE INTEGRITY block (zero new caveats, no fallback, existing caveats unchanged); explicit line "Engine, matcher, registry, and all prior content and tests untouched" backed by byte-diff (`git diff <base> -- lib/literacy scripts/test-content-v3-phase4-entry-teams.ts scripts/test-content-v3-phase4-mid.ts scripts/test-content-v3-phase4-rcontrolled.ts scripts/test-content-v3-rcontrolled-engine.ts scripts/test-content-v3-diphthong-engine.ts scripts/test-content-v3-diph-classifier-regression.ts scripts/test-content-v3-phase4-diphthong.ts` must be empty — the shared-harness files are the ONLY permitted test-file edits and their diffs must be shown in full); verification results. Do NOT start morphology — that is the next rung.
