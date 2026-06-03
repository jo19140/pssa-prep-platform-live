# Content v3 PR #43 — Phase 4 Entry: Long-vowel teams + team-pseudoword support

Add the first Phase 4 content slice — four sound-grouped long-vowel-team targets — **plus the team-pseudoword engine layer** the foundation (PR #42) deferred. **Engine + content.** No `ow`/`oo`/`ie`/`ue`/`ew`, no diphthongs, no r-controlled vowels, no suffix spelling changes, no morphology. Phase 3 + the PR #42 real-word matcher behavior stay byte-identical. Branch from latest `main`. Commit.

> Companion sign-off artifact: `specs/pr43-phase4-entry-teams-WORKED.md` — the validated content (passages decod 1.000, locked pseudowords, both-spelling coverage) and the engine additions. Build content from it verbatim.

## HARD PRECONDITIONS — verify before coding (STOP if any fails)
1. **PR #42 engine foundation on `main`:** `lib/literacy/patternRegistry.ts` exists with `team_ai/team_ay/team_ee/team_ea/team_oa/team_igh` codes; `wordMatchesPattern` is phoneme-verified for registry codes; `pseudowordValidator.ts` exports `detectPatternCandidates`; `lessonAudit.ts` `LESSON_PHASE3_NO_RCONTROLLED` is phase-aware. (Verify by content, not PR number.)
2. **Worked artifact exists and is complete:** `specs/pr43-phase4-entry-teams-WORKED.md` must be present and contain final validated content for all four targets (`team_ai_ay`, `team_ee_ea`, `team_oa`, `team_igh`), each with kidVisibleLabel, exampleWords, 8 exampleNonwords, demonstrationPairs/Examples, contrastiveLine2/3, sentences, dictatedWords/Sentences, heart buckets, vocabulary, mockPassageText, mockPassageTitle, comprehensionQuestions. **If it is missing or incomplete, STOP — do NOT invent content.**

## Rule 0 — back-compat
All Phase 3 Entry/Mid + PR #42 tests pass unchanged. Real-word team matching (`rain`→`team_ai`, `said`→not) stays identical. VCe/closed unchanged.

## 1. Team-pseudoword engine layer (the core add)
Real words use the PR #42 phoneme-verified matcher. **Pseudowords are not in CMUdict**, so they need a by-rule path:
- **Classification by grapheme/rule:** a pseudoword containing a team grapheme (and decodable by rule) IS that team — e.g. `zaib`→`team_ai`, `zighb`→`team_igh`. Do NOT require a CMUdict pronunciation for pseudoword classification.
- **`validatePseudowordCandidate(word, targetPattern, opts)` — generalize beyond VCe:** validate by the **requested** `targetPattern` (family-aware), keep strict-lexicon + real-word rejection, and add **team homophone rejection** via **phoneme-based reverse lookup**: decode the pseudoword by rule to its ARPABET (onset consonants + the team's vowel phoneme + coda consonants), look it up in a CMUdict reverse index (`arpabet → words`); if a real word shares the pronunciation, reject with `collidesWith`. This must reject `blaim`→`blame`, `laim`→`lame`, and must NOT false-reject `raim` (spelling-only alternation wrongly flagged `raim`→`ream`, which is a different vowel sound — do not use spelling-alternation for teams).
- Keep the existing VCe homophone behavior byte-identical (PR #37/#42).

## 2. Part 3 audit — family-aware (stop using VCe-only detection)
In `lessonAudit.ts auditPart3`, replace the VCe-only `detectVcePattern(word)` pseudoword path with:
```
const candidates = detectPatternCandidates(pseudoword);
const inSet = candidates.filter(c => ctx.pseudowordPatterns.includes(c));
assert inSet.length > 0;   // LESSON_PSEUDOWORDS_IN_TARGET_SET
// DETERMINISTIC selection: pick by ctx.pseudowordPatterns ORDER, not Set iteration order
const selectedPattern = ctx.pseudowordPatterns.find(p => inSet.includes(p));
validatePseudowordCandidate(pseudoword, selectedPattern, { strictLexicon: true });
```
`pseudowordPatterns` comes from `dailyTarget.targetPatternsJson.pseudowordPatterns` (fall back to `targetPatterns` if absent, for Phase 3 single-pattern targets). Never match pseudowords on `ctx.targetPattern`. **Selection must be deterministic** — when `inSet` has multiple patterns, pick the first by `ctx.pseudowordPatterns` order (do not rely on Set/object iteration order). **Store `selectedPattern`/`matchedPattern` in each Part 3 pseudoword `WordAudit` entry**, so reviewers can see which team validated each pseudoword (e.g. that all `team_ai_ay` pseudowords resolved to `team_ai` by design). Keep `LESSON_PHASE3_NO_RCONTROLLED` (Parts 3/5/6/7) active — r-controlled is not a target in this PR, so `for/are/her/here/water` stay blocked.

## 3. New gate — `LESSON_TARGET_PATTERN_COVERAGE`
For each pattern in `targetPatternsJson.patterns`: require ≥1 real target word in **Part 2** AND **Part 3 real-word lines** AND (**Part 5 sentences** OR **Part 7 passage**). Pseudoword coverage is checked over `pseudowordPatterns` only (not all `patterns`). This prevents a `team_ai_ay` lesson from teaching only `ai` in real words. **Scope:** this gate applies to Phase 4 Entry and later grouped/multi-pattern targets only — it must NOT change Phase 3 Entry/Mid behavior (back-compat / Rule 0); single-pattern Phase 3 targets are trivially covered, but do not retroactively tighten them.

**Demo-pair gate (`LESSON_PART2_DEMO_MINIMAL_PAIRS`) — explicit demo mode (don't special-case in the gate body):** add `demoMode: "minimal_pairs" | "examples_only"` to the content shape, with `demonstrationPairs?: {closed,target}[]` and `demonstrationExamples?: string[]`. For `minimal_pairs` (ai/ay/ee/ea/oa): each pair is closed-base→team where the target matches the team and the base classifies as prerequisite (`pan→pain`). For `examples_only` (`team_igh` — no clean closed minimal pair exists): the gate accepts `demonstrationExamples` and still requires **3–5 clean target examples and zero non-target examples**.

## 4. Seed — `PHASE_4_ENTRY` + 4 targets (phase3EntrySeed.ts pattern; add `seed:phase4-entry`)
`PHASE_4_ENTRY` PhasePosition: `phaseNumber: 4`, `subPosition: "ENTRY"`, prerequisites `["PHASE_3_MID"]`. Targets exactly as the worked artifact §1 (`team_ai_ay`, `team_ee_ea`, `team_oa`, `team_igh`), each with `targetPatternsJson.patterns` + `targetPatternsJson.pseudowordPatterns`, `exampleWords` (team real words covering all `patterns`), and the 8 `exampleNonwords` from worked artifact §2. `allowedPatternCodes` = `closed_short_*` + all VCe (`a_e`..`e_e`). `blockedPatternCodes` = the other teams + diphthongs + r-controlled (everything not in this target's `patterns`), **including `team_ow`** (so `team_oa` = oa only). Seed validation: each target's 8 `exampleNonwords` detect to a pattern in `pseudowordPatterns` and pass `validatePseudowordCandidate(..., { strictLexicon: true })`; **and assert every `pseudowordPatterns` entry is also present in `patterns`** (prevents drift like `patterns:["team_ai","team_ay"], pseudowordPatterns:["team_oa"]`).

## 5. Content — add 4 targets to the content map (verbatim from worked artifact §3/§4)
**Rename the content map to a phase-neutral name** `LESSON_CONTENT_BY_DAILY_TARGET` (keyed by code), and keep a back-compat alias `export const PHASE_3_ENTRY_LESSON_CONTENT = LESSON_CONTENT_BY_DAILY_TARGET;` so existing imports still work. Do not leave Phase 4 content living in a "Phase 3 Entry" module name. Add the 4 targets to it: demonstrationPairs, contrastiveLine2/3, sentences, dictatedWords/Sentences, comprehensionQuestions, heartWords (canonical sight set, no r-controlled), vocabulary, mockPassageText, mockPassageTitle — all from the worked artifact verbatim (the passages are engine-validated; do not paraphrase). `ensureMockApprovedPassage` seeds the 4 Phase 4 Entry mock passages (idempotent + full auditPassage incl quality gate).

## What Codex should NOT do
1. No `ow`/`oo`/`ie`/`ue`/`ew`, diphthongs, r-controlled, suffix spelling, morphology.
2. Do not use `ow` words (`snow`/`grow`) in `team_oa` content — oa only.
3. Do not change Phase 3 / PR #42 behavior (Rule 0).
4. Do not match pseudowords via CMUdict pronunciation; do not use spelling-alternation for team homophones.
5. Do not add heart words to rescue out-of-scope phonics; no r-controlled HFWs (`for/are/her`).
6. Do not require every `targetPatterns` member to supply pseudowords — pseudowords cover `pseudowordPatterns`.

## Acceptance criteria
- 4 Phase 4 Entry targets seeded with `patterns` + `pseudowordPatterns`; `seed:phase4-entry` runs; seed validation green.
- Team pseudowords classify by rule; `validatePseudowordCandidate` rejects `blaim`→`blame` (phoneme-reverse) and accepts the 8 locked nonwords per target; does not false-reject `raim`.
- Part 3 audit uses `detectPatternCandidates`; `LESSON_PSEUDOWORDS_IN_TARGET_SET` checks against `pseudowordPatterns`.
- `LESSON_TARGET_PATTERN_COVERAGE` present: `team_ai_ay` real words include both `ai` and `ay`; `team_ee_ea` both `ee` and `ea`.
- For all 4 targets: `auditGeneratedLessonDraft().canPersist === true`; independent classifier re-audit clean (zero unclassified/blocked, decod ≥ threshold, no r-controlled); Part 7 passage passes the quality gate (no repeated trigrams).
- Back-compat: every Phase 3 Entry/Mid + PR #42 test passes unchanged.
- Verify gates: `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords` (rename/extend to cover Phase 4 too, or add `content:audit-phase4-nonwords`), `npm run build`.

## PR description must include the Phase 4 roadmap
This = Phase 4 Entry (long-vowel teams). Next: Phase 4 Mid (mixed teams), r-controlled, diphthongs/variant vowels, then Track B suffix spelling (morphology).
