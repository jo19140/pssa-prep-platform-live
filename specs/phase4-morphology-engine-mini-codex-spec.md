# Codex spec — Morphology engine mini-PR (Track B enablement, NO content)

Decision record (Jonathan, 2026-06-05): Morphology Entry A = drop-e (27) + doubling (28) ONLY; y→i DEFERRED until y-as-vowel registry patterns exist (cry/try/fly currently unclassifiable); -er/-est DEFERRED (suffix carries the ER phoneme — "bigger" = B IH G ER — and would interact with the r-blocked machinery; suffix-ER handling must be its own deliberately designed change, never snuck in). Suffix set for this rung: **-ing, -ed, -s, -es**. Engine approach: **decomposition + phoneme verification** — morphology never bypasses phonics gates; a suffixed form is classifiable only if its recovered base is classifiable under already-taught patterns. Two daily targets later (each rule gets clean examples before comparison); this PR is engine-only.

## Scope / boundary (locked)

Goal: the minimal engine support for Phase 4 Track B Morphology Entry A. NO lesson content, NO seed content, NO student route, NO DB work, NO registry changes, NO matcher changes for existing families. Files: new `lib/literacy/morphologyAnalyzer.ts`, `lib/literacy/passageClassifier.ts` (opt-in hook only), `lib/literacy/passageAudit.ts` (context pass-through only), `lib/literacy/lessonAudit.ts` (new Part 2 demo mode only), one new test script, `package.json` (test wiring). Do NOT touch the VCe/team/r/diphthong pair rules, examples_only, the independent CMUdict oracle (no `|| validation.valid` fallback; caveat lists unchanged), or any existing classification behavior — the entire feature is OPT-IN via a morphology declaration that none of the 26 existing targets have.

## Verified algorithm (prototyped against the live engine + lexicons 2026-06-05 — implement exactly this)

`decomposeInflectedWord(surface, config)` where config = `{ rule: "drop_e" | "double", stemPatterns: string[], suffixes: ["ing","ed","s","es"] }`. Returns `{ surface, base, suffix, rule, basePattern, verified: true } | null`:

1. For each declared suffix the surface ends with: strip it → raw base.
2. Generate candidate stems by REVERSE rule: drop_e → rawBase + "e" (vowel suffixes -ing/-ed only); double → rawBase minus the doubled final consonant (only when rawBase ends in a doubled consonant; vowel suffixes only); plus the NO-CHANGE candidate rawBase itself for -s/-es (hopes/makes/runs — contrast forms, rule "none").

**Suffix matching is LONGEST-FIRST (Jonathan's patch): ing → ed → es → s.** When multiple suffixes could match, prefer the longest suffix that yields a valid round-trip analysis. (Determinism rule — verified note: the guardrails already kill the wrong analyses by themselves — "fixes" as fixe+s dies at the real-base check, "hopes" as hop+es dies at the phoneme check (closed_short_o wants AA, surface has OW) — but correctness must come from deterministic ordering, not guardrail luck.)

**No-change suffixing rule (Jonathan's patch):** the analyzer may return `rule: "none"` for -s/-es forms (hopes, makes, rides, runs, fixes). However: no-change forms are allowed REVIEW/CONTRAST forms only; they do NOT count as evidence for drop_e or double; they do NOT satisfy transformation_pairs for a drop_e or double lesson; they do NOT satisfy morphology target coverage unless a future lesson explicitly declares a no-change morphology target.
3. **Round-trip synthesis:** re-apply the FORWARD rule to (stem, suffix) and require it reproduces the surface EXACTLY. (Catches makeing — forward of make+ing is "making"; catches riding-as-doubling — forward of rid+ing is "ridding".)
4. **Real-base guardrail:** the recovered stem must exist in CMUdict. (Catches the "hoppe" hole — the VCe check is regex-based, so fake stems like hoppe pass it; CMUdict membership is the backstop. Found and fixed during prototyping.)
5. Stem must classify to one of the declared stemPatterns (`wordMatchesPattern`, strictPhonemeLexicon).
6. **Surface phoneme verification:** the surface form must exist in CMUdict; its pronunciation must CONTAIN the stem pattern's expected vowel phoneme (a_e→EY, i_e→AY, o_e→OW, u_e→UW, e_e→IY, closed a/i/o/u/e→AE/IH/AA/AH/EH) AND END with a valid suffix allomorph: -ing → IH NG (or AH NG); -ed → T, D, IH D (or AH D); -s/-es → S, Z, IH Z (or AH Z). (The vowel check is what rejects hopping-as-drop_e: o_e predicts OW, surface has AA.)

VERIFIED MATRIX (all confirmed in prototype — pin every row as a test):
- drop_e VALID: hoping→hope/o_e, hoped→hope/o_e, making→make/a_e, baked→bake/a_e, riding→ride/i_e, liked→like/i_e, skated→skate/a_e (IH-D allomorph), smiling→smile/i_e; no-change: hopes, makes, rides.
- double VALID: running→run/closed_short_u, hopping→hop/closed_short_o, sitting→sit/closed_short_i, hopped→hop, hugged→hug (D allomorph), grabbed→grab/closed_short_a, sledding→sled/closed_short_e.
- INVALID (all must return null): makeing, runing, hopeing (misspellings — die at round-trip synthesis and/or CMUdict surface check); hoping under rule "double"; hopping under rule "drop_e"; riding under rule "double".
- Honesty pair: dining→dine/i_e (drop_e) AND dinning→din/closed_short_i (double) both verify under their own rules only.

## Change 1 — `lib/literacy/morphologyAnalyzer.ts` (new)

The analyzer above, pure functions, no I/O beyond the existing CMUdict load path used by the validator (reuse the same data loading conventions as pseudowordValidator). Export `decomposeInflectedWord` and the config type.

## Change 2 — classifier opt-in hook (`passageClassifier.ts` + `passageAudit.ts`)

`PassageClassificationContext` gains optional `morphology?: { rule, stemPatterns, suffixes }`. In `classifyWord`, ONLY when context.morphology is present and the word fails all existing classification paths: attempt decomposition; on success classify as category `"target"` with `matchedPattern = basePattern` and attach the full analysis object to the word entry — new REQUIRED-on-success field `morphology: { surface, base, suffix, rule, basePattern, verified: true }` on WordAuditEntry, so future gates can distinguish making = drop_e TARGET, hopes = no_change REVIEW, running = double TARGET (the content PR needs this distinction; rule is auditable per word). `auditPassage` reads the declaration from `dailyTarget.targetPatternsJson.morphologyJson` (shape `{ rule, stemPatterns, suffixes }`) and passes it through. NO morphologyJson → identical behavior to today (assert this).

## Change 3 — Part 2 `transformation_pairs` demo mode (`lessonAudit.ts`)

New demoMode `"transformation_pairs"`: demonstrationPairs entries are `{ base, target }` (e.g., hope→hoping). Valid iff: every pair's target decomposes (via the analyzer with the lesson's morphologyJson) such that **analysis.base === pair.base AND analysis.rule === lesson.morphology.rule** (Jonathan's patch — no-change analyses never satisfy a drop_e or double lesson's pairs), AND pairs.length > 0. The base must itself classify to a declared stemPattern. minimal_pairs and examples_only behavior UNCHANGED (regression-pin both).

## Change 4 — tests (new `scripts/test-content-v3-morphology-engine.ts`, wired into `test:content-v3`)

1. The full verified matrix above — every valid row asserts base/suffix/rule/basePattern equality; every invalid row asserts null.
2. Allomorph coverage: hoped (T), hugged (D), skated (IH D); hopes (S), rides (Z), fixes under a no-change probe (IH Z).
3. Opt-in proof: classifyPassageWords on "hoping hopped makes" WITH morphology context → all target with correct basePattern + analysis attached; SAME text WITHOUT morphology context → all unclassified (today's behavior, byte-identical).
4. transformation_pairs: hope→hoping, make→making, ride→riding PASS in a drop_e draft; run→running, sit→sitting PASS in a double draft; hope→hopping FAILS (wrong rule), run→runing FAILS (misspelling), hope→hoping in a double-rule draft FAILS (rule mismatch); **hope→hopes in a drop_e draft FAILS (rule is none, not drop_e); run→runs in a double draft FAILS (rule is none, not double)** (Jonathan's patch); a minimal_pairs draft (cap→cape) and an examples_only draft still PASS unchanged.
4b. Longest-first determinism: **fixes decomposes as fix + es, not fixe + s** (assert analysis.suffix === "es"); hopes decomposes as hope + s with rule "none" and basePattern o_e.
4c. No-change scoping: "hopes" classifies (with morphology context) carrying morphology.rule "none" — assert it is distinguishable from drop_e evidence via the word-entry morphology field.
5. Guardrail pins: hopping under drop_e → null (real-base + phoneme guards); a fabricated config with stemPatterns ["o_e"] cannot admit "hopping" by any path.
6. -er exclusion pin: "bigger" with suffixes ["ing","ed","s","es"] → null (er is not in the suffix set; assert no analysis).
7. Full suite: every existing test:content-v3 script passes unchanged (zero-behavior-change requirement).

## Success condition (Jonathan, verbatim)

Suffixed forms are admitted only through verified decomposition. Recovered bases must be real and already classifiable. Surface phonemes must match the base vowel and suffix allomorph. No morphologyJson = existing behavior unchanged. VCe/team/r/diphthong logic untouched. -er/-est and y→i remain deferred. No content, seed, DB, or student-route changes.

## Verification

`npx prisma validate` · `npx tsc --noEmit` · `npm run test:content-v3` (incl. new file) · `npm run content:audit-phase3-nonwords` · `npm run build`.

## Stop — report

Diffs for all four lib files; new test output incl. the full decomposition matrix table (surface | base | suffix | rule | basePattern | verified), the opt-in proof (same text, with/without context), the transformation_pairs PASS/FAIL matrix, and the bigger-exclusion pin; ORACLE INTEGRITY block (untouched: no fallback, caveats still only a_e mave/nace + r_controlled_ar zarb/varn); explicit line "All 26 existing targets and every prior test byte-identical in behavior" backed by the full suite; byte-diff confirming NO changes outside the four lib files + new test + package.json. Do NOT add morphology targets, content, or seeds — that is the next PR.
