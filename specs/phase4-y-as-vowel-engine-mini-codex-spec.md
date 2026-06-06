# Codex spec — y-as-vowel engine mini-PR (y_long_i + y_to_i enablement, NO content)

Decision record (Jonathan, 2026-06-06): the first y rung is MONOSYLLABIC long-i y ONLY (cry/try/fly/dry/sky), engine mini-PR FIRST then content. Defer y-as-long-e (baby/happy/pony→babies/ponies — needs multisyllabic/open-syllable support) and y-as-short-i (myth/gym). Engine prerequisites for the whole morphology arc are MERGED (morphology analyzer 8e05906, plumbing 8f71fd9/6f44a5b, gating batch incl. morphology-first classifier ordering + LESSON_MORPHOLOGY_TARGET_COVERAGE). Main at 37adc2a (28 targets, Phase 4 complete).

## Scope / boundary (locked)

Engine only. NO lesson content, NO seed content, NO student route, NO DB work, NO broad y-vowel registry (no y_long_e, no y_short_i), NO baby/happy, NO myth/gym, NO -er/-est. Files: `lib/literacy/patternRegistry.ts` (add y_long_i + its matcher), `lib/literacy/pseudowordValidator.ts` (y_long_i decode for pseudoword support), `lib/literacy/morphologyAnalyzer.ts` (y_to_i rule + keeps-y), one new test script, `package.json` (test wiring). Do NOT weaken any existing matcher/family, the VCe/team/r/diphthong pair rules, the independent CMUdict oracle (no `|| validation.valid`; caveats unchanged), the morphology coverage gate, or any existing classification behavior. The feature is opt-in: y_long_i is a new registry code nothing references yet, and y_to_i activates only via a morphologyJson declaration no existing target has.

## Verified state (probed against the live engine + lexicons 2026-06-06)

- y_long_i supply (monosyllabic cvy, final y, AY): cry, try, fly, dry, spy, fry, shy, sly, pry, sky, ply, wry. (by/my/why also match but are function/heart words — content excludes them.)
- THE "ie" COLLISION (load-bearing): every y→i -ed/-es inflection contains the letters "ie" AND phoneme-matches team_ie_long_i today: cried/tried/dried/spied/fried (K R AY D…) and flies/cries/dries/spies/fries/skies (… AY Z). They are genuine ie-long-i words by sound+spelling; what makes them y→i is morphology. The morphology-first classifier ordering (already merged) decomposes them in a y_to_i lesson before the ie-match fires — but this PR must make that decomposition exist.
- Honesty exclusions (all confirmed): yes/yard/yell = Y onset (Y EH S / Y AA R D), already classify closed/r, NOT final-y, no AY — untouched; type = T AY P (medial y, ends in e); myth/gym = IH (medial y); baby/happy/pony = final y but IY (long-e) with 2 vowel phonemes; ally/reply/deny/july = final-y AY but MULTISYLLABIC (2 vowel phonemes).
- MONOSYLLABIC is enforceable as "exactly one vowel phoneme in the CMUdict pronunciation": cry = K R AY (1 vowel phoneme), ally = AE L AY (2). Verified to separate the full supply from every exclusion.

## Change 1 — registry pattern `y_long_i` (`patternRegistry.ts`)

Add `y_long_i` (family vowel_team or a new single-letter-vowel family — author's call, but it must NOT be matched by the generic `graphemes.some(includes)` path, which would match medial/onset y). Its matcher must require ALL of:
1. the word ends in "y";
2. the CMUdict pronunciation contains exactly ONE vowel phoneme (monosyllabic proxy);
3. that single vowel phoneme is AY.

VERIFIED MATCHER MATRIX (pin every row):
- MATCH y_long_i: cry, try, fly, dry, spy, fry, shy, sly, pry, sky, ply, wry.
- NO MATCH: yes, yard, yell (onset y, no AY, not final-y); type (medial y, ends in e); myth, gym (IH, medial y); baby, happy, pony (IY, 2 vowels); ally, reply, deny, july (AY but 2 vowels — multisyllabic).

## Change 2 — pseudoword decode for y_long_i (`pseudowordValidator.ts`)

Extend the decode/detect path so y_long_i pseudowords validate (the content rung needs y_long_i pseudoword lines). A y_long_i pseudoword is onset-consonants + final "y" pronounced AY (e.g. cly, sny, gly, zy, fy, smy, vry). detectPatternCandidates must detect final-y AY-shaped pseudowords as y_long_i; validatePseudowordCandidate must decode (onset consonants + AY) and apply the full real-word + homophone-variant collision protection. Raw-CMUdict-clean starting candidates (verified absent): cly, sny, gly, zy, fy, smy, vry, zby. (bly/sty/vy/thy/spy are real — excluded.)

## Change 3 — `y_to_i` morphology rule + keeps-y (`morphologyAnalyzer.ts`)

Add rule `"y_to_i"` to the analyzer. Config: `{ rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed","es","ing"] }`. Suffix-specific behavior (longest-first ing→ed→es; note no plain -s — cry→cries not crys):
- `-ed` / `-es`: reverse = strip suffix, replace the final "i" with "y" → candidate base; round-trip forward (base with final y → replace y with i + suffix) must reproduce the surface EXACTLY; recovered base must be a real CMUdict word AND classify to y_long_i; surface pronunciation must contain AY and end with a valid suffix allomorph (-ed → T/D/IH D; -es → Z/IH Z/S). rule = "y_to_i".
- `-ing`: reverse = strip "ing", base unchanged (y kept); base must be real + classify y_long_i; surface contains AY + ends IH NG. rule = `"none"` (keeps-y review/contrast — exactly like runs/hopes: allowed but NEVER counts as y_to_i target evidence).

VERIFIED MATRIX (pin every row):
- y_to_i VALID: cried→cry, tried→try, dried→dry, spied→spy, fried→fry, shied→shy (-ed); flies→fly, cries→cry, dries→dry, spies→spy, fries→fry, skies→sky (-es).
- keeps-y (rule "none"): crying→cry, trying→try, flying→fly, drying→dry, spying→spy, frying→fry.
- INVALID (null): cryed (misspelling — round-trip fails), flys (wrong -s, not a y→i form), cried under a drop_e config, hoping under y_to_i, and any non-decomposing word.

## Change 4 — tests (new `scripts/test-content-v3-y-as-vowel-engine.ts`, wired into `test:content-v3`)

1. Matcher honesty: the full MATCH / NO MATCH matrix above (wordMatchesPattern y_long_i, strictPhonemeLexicon).
2. Pseudoword: the clean candidates (cly/sny/gly/zy/fy/smy/vry/zby) validate strict under y_long_i with decoded pronunciation + raw-CMUdict-clean; a real-word/near collision rejects (e.g. "bly" raw hit; a homophone-variant probe).
3. y_to_i decomposition: the full VALID + keeps-y + INVALID matrix above (assert base/suffix/rule equality; null for invalid).
4. THE ie-collision, both directions: (a) in a y_to_i context (morphology config present), classifyWord("cried") → target with morphology.rule "y_to_i" and matchedPattern y_long_i (morphology-first beats the ie-match); (b) WITHOUT y_to_i morphology context, "cried" still classifies team_ie_long_i (honest — it IS an ie word outside a y lesson). Pin both.
5. Coverage: a y_to_i lesson with only crying/trying/flying (keeps-y, no -ed/-es) → LESSON_MORPHOLOGY_TARGET_COVERAGE FAIL (keeps-y forms are not target evidence); a lesson with cried/flies/tries → PASS.
6. Opt-in invariance: all 28 existing targets produce identical classification + draft.morphology unchanged; y_long_i matches nothing in existing seeds; full test:content-v3 suite passes unchanged.
7. Oracle integrity: no new caveats, no `|| validation.valid`, existing caveats unchanged (a_e mave/nace; r_controlled_ar zarb/varn).

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for the three lib files; new test output incl. the matcher honesty matrix, the y_long_i pseudoword table (word/pron/result), the y_to_i decomposition matrix (surface/base/suffix/rule), the ie-collision both-directions result, and the coverage keeps-y FAIL pin; ORACLE INTEGRITY block (no fallback, caveats unchanged); explicit line "All 28 existing targets and every prior test byte-identical in behavior" backed by the full suite; byte-diff confirming NO changes outside the three lib files + new test + package.json. Do NOT add y→i targets, content, seeds, baby/happy y-long-e, myth/gym y-short-i, or -er/-est — those are later.
