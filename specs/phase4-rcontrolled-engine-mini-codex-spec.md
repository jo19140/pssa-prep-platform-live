# Codex spec — R-controlled engine mini-PR (enablement only, NO content)

Decision record (Jonathan, 2026-06-04): engine mini-PR FIRST, content PR second — "prove the gate inversion and pseudoword/pair logic in isolation, then author the r-controlled lessons against a stable engine." Grouping locked for the LATER content PR (FYI only, NOT in this scope): r_controlled_ar [r_ar], r_controlled_or [r_or], r_controlled_er_ir_ur [r_er, r_ir, r_ur] — registry codes only, target-scoped admission.

## Scope / boundary (locked)

Goal: the minimal engine support needed for Phase 4 R-controlled Entry. NO lesson content, NO seed content, NO student route, NO DB work, NO broad matcher rewrite, NO registry changes (r_* entries already exist with graphemes + phonemes). Files: `lib/literacy/pseudowordValidator.ts`, `lib/literacy/lessonAudit.ts`, one new test script, `package.json` (test wiring). Do NOT weaken the VCe +e pair rule or the vowel-team same-onset/same-coda pair rule (commit 2737263 predicates stay byte-identical in behavior for those families).

## Verified current gaps (probed against the live engine 2026-06-04)

1. `validatePseudowordCandidate("barn","r_ar",{strictLexicon:true})` → **valid:true**. The homophone decode path requires `family === "vowel_team"`, so r_controlled candidates get no expected pronunciation, no collision check, no real-word protection.
2. LATENT TEAM GAP: `validatePseudowordCandidate("toast","team_oa")` → **valid:true**. The reverse-CMUdict branch excludes the word itself (`word !== normalized`), so a real word with no homophone (and not in CORE) passes as a pseudoword. ("paint" is caught only because CORE happens to contain it; "rain/bright/sweet" only via homophones.)
3. `longVowelLetterForPattern("r_ar")` → null (phoneme map covers EY/IY/AY/OW/UW only) → the Part 2 vowel-agreement precondition fails for every r pair → `cat→cart` cannot validate in minimal_pairs mode.
4. Target-scoped admission EXISTS (`rControlledViolations` admits only active r_* targets via strict phoneme match) but has no named rule for r-target lessons and no tests for the inversion direction.

## Change 1 — pseudoword decode for r_controlled + self-real-word check (`pseudowordValidator.ts`)

a. `decodeTeamPseudowordPronunciation`: accept `family === "vowel_team" || family === "r_controlled"` (rename to `decodePatternPseudowordPronunciation` if desired; keep behavior identical for teams). r decode example: `zarb` → onset z + [AA R] + coda b → `Z AA R B`.
b. GLOBAL self-real-word check (Jonathan's patch 2 — stronger than family-scoped): in strictLexicon mode, if `homophoneLexicon.has(normalized)`, emit blocking issue `pseudoword is a real word ("<word>")` with `collidesWith = normalized` — REGARDLESS of pattern family. Place it before/alongside the reverse-CMUdict collision branch; the decoded-pronunciation branch then still runs to add non-identical homophone detail. This closes the toast/barn/herd class of bug generally. (Safety: shipped Entry/Mid nonwords like mave/nace are CMUdict name tokens but SUBTLEX-gated out of homophoneLexicon, so they stay valid — and the regression test below proves it.)
c. `expectedPronunciationForPattern` therefore returns decoded phonemes for r_* candidates (e.g. `zarb (Z AA R B)`).

## Change 2 — Part 2 pair support for r patterns (`lessonAudit.ts`)

a. `longVowelLetterForPattern`: if `PATTERN_REGISTRY[pattern]?.family === "r_controlled"`, return the first letter of the pattern's first grapheme (ar→a, or→o, er→e, ir→i, ur→u). No change for VCe/team paths. Add the comment: `// Despite the historical name, this returns the base vowel letter needed for Part 2 pair validation across VCe, vowel-team, and r-controlled patterns.` Optionally rename to `baseVowelLetterForPattern` ONLY if the change is small and tests stay clean.
b. NO change to `isMinimalTeamPair` — it is already family-agnostic via registry graphemes and produces the correct r analog: cat→cart (c+ar+t), ten→tern (t+er+n), fist→first (f+ir+st), cub→curb (c+ur+b), got→? (g+or+t = "gort" not real — authoring concern, not engine).
c. New named BLOCKER check `LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET` (Jonathan's explicit gate, Parts 2/3/5/6/7 — patch 1 widened it to include Part 2): for drafts whose targetPatterns include any r_controlled pattern, every r-controlled word in Parts 2/3/5/6/7 must phoneme-match one of the DECLARED r targets — non-target r families remain BLOCKER violations. Part 2 specifics: closed/base words must remain NON-r-controlled closed-syllable words (an r-controlled base like "car" is a violation even when it matches the declared target — bases demonstrate the pre-r state); pair TARGET words must phoneme-match a declared r target; non-target r-controlled Part 2 targets are BLOCKER violations. Implement over the existing `rControlledViolations` predicate; keep `LESSON_PHASE3_NO_RCONTROLLED` exactly as-is for non-r lessons (zero behavior change there).

## Change 3 — tests (new `scripts/test-content-v3-rcontrolled-engine.ts`, wired into `test:content-v3`)

Jonathan's required matrix, verbatim, plus regressions:

- Non-r lessons (use an existing a_e draft): car / horn / her / bird / turn each still produce r-controlled violations.
- r_ar context: car, park, farm admit as r_ar; horn, her, bird, turn remain violations.
- r_or context: horn, fork, storm admit; car, park, her, bird, turn remain violations.
- r_er_ir_ur context (targetPatterns [r_er, r_ir, r_ur]): her, bird, turn admit; car, horn remain violations.
- Phoneme honesty: warm does NOT match r_ar; word/work do NOT match r_or (already true — pin it).
- Pseudowords: zarb→r_ar, vorm→r_or, nerb→r_er, jirt→r_ir, murb→r_ur all VALID with decoded expectedPronunciation; barn(r_ar), herd(r_er), toast(team_oa) all INVALID with "pseudoword is a real word"; existing Entry/Mid shipped nonword sets still 100% valid (no regression).
- Part 2 pairs: cat→cart (r_ar), ten→tern (r_er), fist→first (r_ir), cub→curb (r_ur) PASS the pair predicate in an r-target draft; cat→part FAILS (onset mismatch); cap→cape and pan→pain still PASS in their existing drafts (predicate untouched for VCe/teams — rerun the existing adversarials cat→cape, pat→pain to prove FAIL still fires).
- Part 2 target-scoping (patch 1 tests): r_ar draft with Part 2 cat→cart → PASS; r_ar draft with Part 2 got→corn → FAIL (non-target r_or, flagged by LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET); r_er_ir_ur draft with Part 2 cat→cart → FAIL (non-target r_ar); r_ar draft with an r-controlled BASE (e.g. car→cart) → FAIL (bases must be non-r closed words).
- Full suite: every existing test:content-v3 script passes unchanged.

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for the two lib files; new test output with the full admission matrix results; explicit line "Phase 3, Phase 4 Entry, and Phase 4 Mid content and tests untouched and passing" backed by byte-diff evidence (`git diff <base> -- lib/content scripts/test-content-v3-phase4-entry-teams.ts scripts/test-content-v3-phase4-mid.ts` must be empty); confirmation that no registry, matcher (passageClassifier/patternRegistry/cmudictPhonemes), seed, or content file changed. Do NOT add r-controlled targets, content, or seeds in this PR — that is the next PR.
