# Content v3 — Phase 4 Phonics Engine Foundation (engine + tests only, NO content)

Make the classifier and pseudoword validator trustworthy for Phase 4 pattern families (vowel teams, r-controlled vowels, diphthongs) before any Phase 4 lesson/passage content depends on them. **This PR ships ENGINE + TESTS ONLY:** no Phase 4 `DailyTarget`s, no lesson/passage content, no seed content (beyond tiny test fixtures), no student UI, no morphology. Phase 3 behavior must be byte-identical. Branch from latest `main`. Commit.

> Companion sign-off artifact: `specs/pr-phase4-engine-foundation-WORKED.md` — the validated matcher design (phoneme-verification proven against CMUdict) and the full test matrix. The matcher approach there is authoritative.

## HARD PRECONDITION — Phase 3 Mid (PR #41) must be merged first

This PR makes `LESSON_PHASE3_NO_RCONTROLLED` phase-aware and builds on the multi-pattern `targetPatterns` infra — both introduced by Phase 3 Mid (branch `codex/content-v3-phase3-mid`). **Verify on `main` before starting:** `lessonAudit.ts` contains `LESSON_PHASE3_NO_RCONTROLLED` and `targetPatterns`, and `pseudowordValidator.ts` exports `detectVcePattern`. If absent, STOP — merge Phase 3 Mid first. (Verify by content, not PR number.)

## Rule 0 — Phase 3 back-compat is the headline acceptance criterion

All Phase 3 Entry + Mid generation/audit/spec-conformance/seed tests must pass **unchanged**. `closed_short_*` and `*_e` (VCe) matching stays byte-identical (existing regexes, reused verbatim). No new false positives in any existing lesson. If a Phase 3 test changes behavior, the PR has failed.

## 1. Pattern-family registry (replace the ad-hoc matcher)

Today `wordMatchesPattern(word, patternCode)` in `lib/literacy/passageClassifier.ts` handles silent-e + closed via regex and 9 vowel teams via crude `normalized.includes(patternCode)` (substring → false positives: `said`/`again`/`captain`/`plaid` all "match" `ai`). Replace the family logic with a registry (new `lib/literacy/patternRegistry.ts`):

```ts
// PatternFamily is exactly these for this PR — do NOT add "digraph" (digraphs stay in existing prerequisite logic).
type PatternFamily = "closed" | "vce" | "vowel_team" | "r_controlled" | "diphthong";
type PatternDef = {
  code: string;                          // "team_ai", "r_ar", "team_oo_long", "diph_ow", "a_e", "closed_short_a"
  family: PatternFamily;
  graphemes: string[];                   // ["ai"] | ["ar"] | ["oo"] | ["ow"]
  expectedPhonemeSequences?: string[][]; // ARPABET sequences (stress-stripped), e.g. team_ai [["EY"]], r_ar [["AA","R"]]; required for team/r/diphthong
  includeWords?: string[];               // positive override when CMUdict is missing/wrong for a word
  excludeWords?: string[];               // explicit non-target exceptions (e.g. said for team_ai, bread for team_ea)
  introducedPhase: number;               // 3 for vce/closed, 4 for teams/r/diphthongs
};
export const PATTERN_REGISTRY: Record<string, PatternDef>;
```

`wordMatchesPattern(word, code)` dispatches by `family`:
- **`closed` / `vce`** → the existing regexes, UNCHANGED.
- **`vowel_team` / `r_controlled` / `diphthong`** → grapheme present in `word`, then: **`excludeWords` wins first** (if `word ∈ excludeWords` → no match); else `word ∈ includeWords` → match; else the word's CMUdict pronunciation **contains one of `expectedPhonemeSequences` contiguously**. Rules: strip ARPABET stress digits; if a word has multiple CMUdict pronunciations, match if **any** pronunciation contains an expected sequence contiguously; **do not string-match raw ARPABET** (compare token sequences). A word NOT in CMUdict and not in include/exclude → does not match (unknown words surface as unclassified, which the lesson gates reject).
- **Strict phoneme mode (`strictPhonemeLexicon`):** default app/request paths — if CMUdict can't load, team/r/diphthong matching returns `false` and does NOT throw (Phase 3 closed/vce unaffected). Content/audit/CI paths and the Phase 4 matcher tests pass `strictPhonemeLexicon: true`, where a missing/unreadable CMUdict is a **hard failure** (mirrors PR #37's strict-lexicon discipline — a content gate must never silently run with a disabled matcher).

**Phoneme source:** a lazy-loaded + cached CMUdict **phoneme map** (`word → ARPABET`), read from `data/phonogram/cmudict.json`. Note this is DIFFERENT data from the pseudoword validator's frequency-gated homophone *word-set* — the validator needs "is this a common real word," the matcher needs "what phonemes does this word have." Add a small shared module (e.g. `lib/literacy/cmudictPhonemes.ts`) that lazily builds the `word→arpabet` map once and caches it; the validator may keep its own loader or both can sit behind the shared module. Do not load at import time. It is consulted ONLY for `vowel_team`/`r_controlled`/`diphthong` checks, so `closed`/`vce`/heart/function words stay regex-fast. This is the offline content-generation + audit path, not student runtime; lazy+cached is acceptable, and must degrade gracefully (if CMUdict is unavailable, team/r/diphthong matching returns false rather than throwing — Phase 3 closed/vce is unaffected).

Registry coverage for this PR (codes + expected phonemes — from the worked artifact, validated):
`team_ai`/`team_ay`→EY, `team_ee`/`team_ea`→IY, `team_oa`→OW, `team_igh`→AY, `team_ew`/`team_ue`→UW; `team_ie_long_i`→AY (pie/tie/lie), `team_ie_long_e`→IY (chief/field/brief) with `friend`/`friends` as exceptions (EH, match nothing); `r_ar`→AA R, `r_or`→AO R, `r_er`/`r_ir`/`r_ur`→ER; `diph_oi`/`diph_oy`→OY, `diph_ow`→AW, `diph_ou`→AW, `au`/`aw`→AO; `team_oo_long`→UW, `team_oo_short`→UH. (No `DailyTarget` uses these yet — they exist in the registry + tests only.)

### Legacy pattern-code compatibility (back-compat critical)
Phase 3 seeds use legacy codes in `allowedPatternCodes`/`blockedPatternCodes`: `ai, ay, oa, ow, oe, ee, ea, igh, ie, ue, ew`. These must keep their **exact current behavior** (the existing substring match — used only for Phase-3 *blocking*, which is conservative over-blocking). Add a `normalizePatternCode(code)` helper mapping legacy → registry where unambiguous (`ai`→`team_ai`, `ay`→`team_ay`, `ee`→`team_ee`, `ea`→`team_ea`, `oa`→`team_oa`, `igh`→`team_igh`, `ue`→`team_ue`, `ew`→`team_ew`). For **ambiguous** legacy codes (`ow`, `ie`, `oe`), **preserve the existing substring-block behavior** rather than binding to one phoneme-keyed code: a Phase 3 `blockedPatternCodes: ["ow"]` must still block any `ow`-grapheme word (snow AND cow), unchanged. The new phoneme-keyed codes (`team_ow`, `diph_ow`, `team_ie_long_i`, `team_ie_long_e`) are for Phase 4 *targets* only. **Do not migrate seeds in this PR.** Add tests proving every existing Phase 3 `blockedPatternCodes` entry behaves identically (e.g. a Phase 3 a_e lesson still blocks `ai`/`oa`/`ee`).

## 2. Ambiguity-keyed codes

Genuinely ambiguous graphemes become distinct codes keyed by phoneme (validated): `oo` → `team_oo_long` (UW, moon) vs `team_oo_short` (UH, book); `ow` → `team_ow` (OW, snow, long-o team) vs `diph_ow` (AW, cow, diphthong); `ea` → `team_ea` (IY, seat) with EH words (bread) matching nothing (exceptions). The matcher requires the exact `expectedPhonemes`, so `cow` never matches `team_ow` and `book` never matches `team_oo_long`.

## 3. Phase-aware r-controlled gate

`LESSON_PHASE3_NO_RCONTROLLED` (in `lessonAudit.ts`) currently blocks all `[aeiou]r` + `are/for/here` on Parts 3/5/6/7 unconditionally. Generalize: **block r-controlled words UNLESS the active `targetPatterns` includes the matching r-controlled family** (`r_ar`/`r_or`/`r_er`/`r_ir`/`r_ur`).
- No r-controlled target active (all Phase 3 lessons) → behavior **unchanged** (still blocks `farm`/`her`/`for`/`are`). Keep `LESSON_PART5_NO_RCONTROLLED` compat alias working.
- An r-controlled target active → the targeted r-controlled words pass; non-target r-controlled still blocked.
(No Phase 4 r-controlled DailyTarget ships in this PR — this is exercised by test fixtures only.)

## 4. Pseudoword validator interface

In `lib/literacy/pseudowordValidator.ts`: keep `detectVcePattern` (VCe). Add a family-aware **`detectPatternCandidates(word): string[]`** returning **all** plausible pattern codes by grapheme/rule — **ambiguous graphemes return multiple candidates** (a pseudoword `zow` → `["team_ow","diph_ow"]`; an `oo` nonword → `["team_oo_long","team_oo_short"]`). Do NOT force a single detected pattern for ambiguous spellings. `validatePseudowordCandidate(word, targetPattern, opts)` then asserts the requested `targetPattern` is one of `detectPatternCandidates(word)` (the caller already knows which target the lesson is teaching). Refactor to support a **pattern-family validation hook** (so future family content PRs plug in their own homophone/real-word logic) while keeping the strict-lexicon + CMUdict homophone behavior from PR #37 byte-identical for VCe. **Do not** add Phase 4 pseudoword content or family-specific homophone logic yet — interface + VCe behavior only.

## What Codex should NOT do
1. Do **not** add Phase 4 `DailyTarget`s, lesson content, passages, or seed content (test fixtures only).
2. Do **not** change Phase 3 matching/output (Rule 0) — closed/vce regex and all Phase 3 tests unchanged.
3. Do **not** add the morphology / Track-B engine.
4. Do **not** load CMUdict at import time or on a student-runtime path; lazy + cached + graceful-degrade only.
5. Do **not** implement Phase 4 pseudoword homophone logic or family content (later PRs).

## Acceptance criteria (judged by tests)
- `PATTERN_REGISTRY` exists; `wordMatchesPattern` dispatches by family; closed/vce byte-identical.
- **Vowel-team positives:** rain/wait/mail→`team_ai`, feet→`team_ee`, seat→`team_ea`, boat→`team_oa`, high→`team_igh` all match.
- **Vowel-team exceptions:** said/again/captain/plaid NOT `team_ai`; bread/head/dead NOT `team_ea`; friend NOT `team_ie_long_e`/`team_ie_long_i`.
- **`ie` ambiguity:** pie/tie/lie→`team_ie_long_i` (AY) not `team_ie_long_e`; chief/field/brief→`team_ie_long_e` (IY) not `team_ie_long_i`.
- **Ambiguity:** moon→`team_oo_long` not `team_oo_short`; book→`team_oo_short` not long; cow→`diph_ow` not `team_ow`; snow→`team_ow` not `diph_ow`.
- **R-controlled gate phase-aware:** with no r-controlled target, for/are/here/farm/her FAIL the gate; with `targetPatterns` incl `r_ar`, farm classifies as `r_ar` and passes, non-target r-controlled still fails.
- **Legacy codes:** every existing Phase 3 `blockedPatternCodes`/`allowedPatternCodes` entry (`ai`/`ay`/`oa`/`ow`/`oe`/`ee`/`ea`/`igh`/`ie`/`ue`/`ew`) behaves identically (tested); no seed migration.
- **Phoneme matching:** `expectedPhonemeSequences` matched contiguously, stress-stripped, any-pronunciation; `excludeWords` beats `includeWords` beats CMUdict.
- **Validator:** `detectPatternCandidates` returns multiple codes for ambiguous graphemes; `validatePseudowordCandidate` accepts a target that's among the candidates; VCe validation/strict-lexicon behavior byte-identical to PR #37.
- **Strict phoneme mode:** content/audit/CI + matcher tests use `strictPhonemeLexicon: true` (missing CMUdict = hard fail); default app paths degrade gracefully (team/r/diphthong → false, no throw, Phase 3 unaffected).
- **Back-compat:** every Phase 3 Entry/Mid test passes unchanged.
- Verify gates: `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords`, `npm run build`.

## PR description must include the Phase 4 roadmap
This PR = engine foundation only. Then: (2) Phase 4 Entry long-vowel teams, (3) r-controlled, (4) diphthongs/variant vowels, (5) Track B suffix spelling (morphology). Content is only safe after this foundation lands.
