# Codex spec — Diphthong/ambiguous-vowel engine mini-PR (enablement only, NO content)

Decision record (Jonathan, 2026-06-04): engine mini-PR FIRST, content PR second — same sequence as r-controlled. Grouping locked for the LATER content PR (FYI only, NOT in this scope), orders 20–23: `diph_oi_oy` [diph_oi, diph_oy], `diph_ou_ow` [diph_ou, diph_ow], `oo_both` [team_oo_long, team_oo_short] (one spelling, two sounds — both must be represented), `diph_au_aw` [team_au, team_aw]. Registry codes only — never bare oi/oy/ou/ow/oo/au/aw. Deferred to a final teams-cleanup rung: team_ow (snow), team_ew, team_ue, team_ie_long_i, team_ie_long_e.

## Scope / boundary (locked)

Goal: the minimal engine support needed for Phase 4 Diphthong Entry. NO lesson content, NO seed content, NO student route, NO DB work, NO registry changes (all needed patterns exist with graphemes + phonemes), NO broad matcher rewrite. Files: `lib/literacy/pseudowordValidator.ts`, `lib/literacy/lessonAudit.ts`, one new test script, `package.json` (test wiring). Do NOT weaken the VCe +e pair rule, the team onset/coda pair rule, the r-controlled pair logic, or the independent CMUdict oracle (spec-template rule: extend explicit caveat lists, never add validator fallbacks).

## Verified current state (probed against the live engine 2026-06-04)

GOOD (pin as regressions, no changes needed):
- Phoneme matcher is 46/46 honest across the rung: soup/young/four ≠ diph_ou; snow = team_ow but ≠ diph_ow; cow = diph_ow but ≠ team_ow; moon = team_oo_long ≠ team_oo_short; book = team_oo_short ≠ team_oo_long; haul/fault = team_au; saw/lawn/hawk = team_aw.
- vowel_team-family patterns already have FULL pseudoword protection: `zoon(team_oo_long)` valid with decoded `Z UW N`; `vawn(team_aw)` correctly rejected (sounds like "von"); `book` rejected as a real word.
- The global strict self-real-word check (from the r mini-PR) already rejects direct real words for ALL families: `coin(diph_oi)` correctly invalid.

GAPS (this PR fixes):
1. `decodePatternPseudowordPronunciation` covers families vowel_team + r_controlled only. For family `diphthong`, decode returns null → NO homophone protection: **boi, joi, doun, coul all validate today** despite being exact homophones of boy, joy, down, cowl.
2. `longVowelLetterForPattern` returns null (or wrong letter) for the rung's patterns → Part 2 pairs cannot validate: diphthong family hits the phoneme map (AW/OY → null); `team_oo_long` hits UW → "u" but oo pairs need "o" (closedVowelLetter("rot") = "o"); `team_oo_short` UH → null.

## Change 1 — pseudoword decode for diphthong family (`pseudowordValidator.ts`)

`decodePatternPseudowordPronunciation`: extend the family list to `["vowel_team", "r_controlled", "diphthong"]`. Nothing else. Result: `boi` decodes `B OY` → reverse-CMUdict finds "boy" → blocking collision; valid diphthong pseudowords get decoded expectedPronunciation.

## Change 2 — Part 2 pair vowel-letter support (`lessonAudit.ts`)

`longVowelLetterForPattern`: extend the existing grapheme-first branch (currently `family === "r_controlled"`) to also cover `family === "diphthong"` (ou→o, ow→o, oi→o, oy→o), AND add explicit overrides for the ambiguous-vowel team patterns this rung uses (Jonathan's patch — these are vowel_team family, so they currently reach the phoneme map first and get "u"/null):

- team_oo_long → "o"
- team_oo_short → "o"
- team_au → "a"
- team_aw → "a"

Do NOT change behavior for any unrelated vowel_team pattern (ai/ay/ee/ea/oa/igh keep their current letters; team_ow, team_ew, team_ue, team_ie_* remain deferred and untouched). `isMinimalTeamPair` needs NO change (family-agnostic via registry graphemes): shot→shout = sh+ou+t, ton→town = t+ow+n, pond→pound = p+ou+nd, rot→root = r+oo+t, fan→fawn = f+aw+n. VERIFIED NOTE: "faun" does NOT phoneme-match team_au (probed false) — do not use fan→faun as a test pair; team_au has no clean closed-base pairs (the later content PR uses the coverage exception for au), but the engine must still return "a" for team_au.

## Change 3 — tests (new `scripts/test-content-v3-diphthong-engine.ts`, wired into `test:content-v3`)

Pseudoword protection:
- boi(diph_oi) → INVALID, homophone collision with boy.
- joi(diph_oi) → INVALID, homophone collision with joy.
- doun(diph_ou) → INVALID, homophone collision with down.
- coul(diph_ou) → INVALID, homophone collision with cowl (verified: cowl IS in the frequency-gated lexicon at 4.99 ≥ 4.0).
- cow(diph_ow) → INVALID as a real word; coin(diph_oi), book(team_oo_short) → INVALID as real words (already true — pin all three).
- PER-PATTERN fixture coverage (Jonathan's patch): commit a FIXED final list with at least one strict-valid pseudoword for EVERY declared registry pattern used by the later content targets — diph_oi, diph_oy, diph_ou, diph_ow, team_oo_long, team_oo_short, team_au, team_aw. Prefer at least 2 per content group, but do not allow a group to cover only one of its patterns. No placeholders in committed tests. VERIFIED-CLEAN starting candidates (reverse-CMUdict simulated, no direct hits, no pronunciation matches): zoit/voib (diph_oi); zoy/voy (diph_oy); zoud/vout (diph_ou); zown (diph_ow); zoon (team_oo_long, already valid); vook (team_oo_short, already valid); zaul (team_au, already valid); zaw/snaw (team_aw). KNOWN TRAPS — do NOT use: floy (direct CMUdict name token), vaw (pronunciation matches "vaugh"), nouz (pronunciation matches "now's"). The stop report must print each final fixture's word, pattern, decoded expectedPronunciation, and strictLexicon result; any substitution noted.
- Existing shipped nonword sets (Phase 3 + Entry + Mid + R) still 100% valid — no regression.

Ambiguity honesty (pin the 46/46 behavior, minimum set):
- snow matches team_ow, NOT diph_ow. cow matches diph_ow, NOT team_ow.
- moon matches team_oo_long, NOT team_oo_short. book matches team_oo_short, NOT team_oo_long.
- soup and young do NOT match diph_ou.

Part 2 pairs:
- shot→shout (diph_ou), pond→pound (diph_ou), ton→town (diph_ow), rot→root (team_oo_long), fan→fawn (team_aw) PASS the pair predicate in a draft declaring those targets.
- shot→pound FAILS (onset/coda mismatch). shot→shout in a draft whose targets are [diph_oi, diph_oy] FAILS (non-target).
- Regression: cap→cape and pan→pain and cat→cart still PASS in their existing drafts; cat→cape, pat→pain still FAIL (predicates untouched for VCe/team/r families).

Target-scoped admission (classifier-level, no new gate — there is no legacy diphthong scan to invert):
- classifyPassageWords with targets [diph_oi, diph_oy] and the rung's standard blocked set: "coin/boy" classify target; "cow/moon/saw" produce blocked violations.
- Same shape for [diph_ou, diph_ow] (snow → blocked team_ow violation; oil → blocked), [team_oo_long, team_oo_short] (cow/coin blocked), [team_au, team_aw] (out/book blocked).

No bare codes: assert "oi", "oy", "ou", "ow", "oo", "au", and "aw" are not PATTERN_REGISTRY keys, and that the registry codes used above all exist. (ow is one of the core ambiguity risks — it must be in this list.)

Full suite: every existing test:content-v3 script passes unchanged.

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for the two lib files (expect ~1 line + ~6 lines); new test output incl. the boi/joi/doun rejections with their collision words and the pair matrix results; ORACLE INTEGRITY block (spec-template rule: no `|| validation.valid` fallback anywhere; explicit caveat lists unchanged: a_e mave/nace, r_controlled_ar zarb/varn); explicit line "Phase 3, Phase 4 Entry, Phase 4 Mid, and R-Controlled content and tests untouched and passing" backed by byte-diff (`git diff <base> -- lib/content scripts/test-content-v3-phase4-*.ts scripts/test-content-v3-rcontrolled-engine.ts` must be empty); verification results. Do NOT add diphthong targets, content, or seeds — that is the next PR.
