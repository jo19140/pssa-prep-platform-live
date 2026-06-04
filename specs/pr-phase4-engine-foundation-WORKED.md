# Phase 4 Engine Foundation — Worked Artifact (Design + Proof)

**Status:** Sign-off artifact. Scope (your call): the **first Phase 4 PR is engine + tests only, no lesson/passage/DailyTarget content.** It makes the classifier/validator trustworthy for Phase 4 pattern families (vowel teams, r-controlled, diphthongs) before any content depends on them. Content PRs follow.

> **Why engine-first:** the current `wordMatchesPattern` matches vowel teams by crude substring `.includes()`, which false-positives (`said`/`again`/`captain`/`plaid` all "match" `ai`). That was safe in Phase 3 because teams were only ever *blocked* (over-blocking is conservative); it is unsafe once teams are *targets*. R-controlled is unsupported and actively blocked by the gate Phase 3 Mid shipped. So the matcher must be fixed first.

---

## 1. The matcher design — phoneme-verified (PROVEN against real data)

A vowel-team / r-controlled / diphthong pattern matches a **real word** only if **(a)** the grapheme is present **AND (b)** the word's CMUdict pronunciation contains the team's **expected phoneme**. This eliminates the substring false positives, principledly. Validated on the exact test matrix (CMUdict arpabet shown):

| word | code | grapheme? | expected phoneme | arpabet | matches? |
|---|---|---|---|---|---|
| rain / wait / mail / paid / sail / aim | `team_ai` | yes | EY | `R EY N` … | ✅ true |
| said | `team_ai` | yes | EY | `S EH D` | ✅ false (EH, not EY) |
| again | `team_ai` | yes | EY | `AH G EH N` | ✅ false |
| captain | `team_ai` | yes | EY | `K AE P T AH N` | ✅ false |
| plaid | `team_ai` | yes | EY | `P L AE D` | ✅ false |
| bargain / mountain | `team_ai` | yes | EY | schwa | ✅ false |
| bread / head / dead | `team_ea` | yes | IY | `B R EH D` | ✅ false (short-e exception) |
| feet/seat/boat | `team_ee`/`ea`/`oa` | yes | IY/IY/OW | … | ✅ true |
| high / light | `team_igh` | yes | AY | `HH AY` | ✅ true |
| car / far | `r_ar` | yes | AA R | `K AA R` | ✅ true |
| for / born | `r_or` | yes | AO R | `F AO R` | ✅ true |
| her / bird / turn | `r_er` | yes | ER | `HH ER` / `B ER D` | ✅ true |

**Every case in your matrix passes.** The crude substring matcher failed all six `ai` exceptions; phoneme-verification gets them all right.

**Pseudowords (not in CMUdict)** are matched **by grapheme/rule** — a `rain`-shaped nonword like `vain`→`vaip` is a `team_ai` (long-a) pseudoword by decoding rule. The classifier uses phoneme-verification for real words; the pseudoword validator uses grapheme-by-rule (real words / CMUdict still gate homophone collisions, per PR #37).

## 2. Ambiguity resolution — phoneme-keyed pattern codes

The graphemes you flagged are genuinely ambiguous; the **phoneme disambiguates them into separate pattern codes** (proven):

| grapheme | example → phoneme | example → phoneme | resolution |
|---|---|---|---|
| `oo` | moon → UW | book → UH | two codes: `team_oo_long` (UW), `team_oo_short` (UH) |
| `ow` | snow → OW | cow → AW | `team_ow` (OW, long-o team) vs `diph_ow` (AW, diphthong) |
| `ea` | seat → IY | bread → EH | `team_ea` (IY); EH words are exceptions, not a Phase-4 long-e target |

So the registry stores an **expected phoneme per code**, and the matcher requires that exact phoneme. `cow` never classifies as a long-o `team_ow` target; `book` never classifies as a long-`oo` target. This is the "explicit target metadata" resolution you asked for.

## 3. Pattern-family registry (the data shape)

Replace the ad-hoc `if (patternCode === "ai" || …)` chain with a registry:

```ts
type PatternFamily = "closed" | "vce" | "vowel_team" | "r_controlled" | "diphthong";
type PatternDef = {
  code: string;                          // "team_ai", "r_ar", "team_oo_long", "diph_ow", "a_e", "closed_short_a"
  family: PatternFamily;
  graphemes: string[];                   // ["ai"], ["ar"], ["oo"], ["ow"]
  expectedPhonemeSequences?: string[][]; // [["EY"]], [["AA","R"]], [["UW"]], [["AW"]] — ARPABET sequences, required for team/r/diph
  includeWords?: string[];               // positive override when CMUdict is missing/wrong for a word
  excludeWords?: string[];               // explicit non-target exceptions (said for team_ai, bread for team_ea)
  introducedPhase: number;               // 3 for vce/closed, 4 for teams/r/diphthongs
};
```
(`excludeWords` wins first, then `includeWords`, then CMUdict phoneme-sequence match. Phoneme sequences are matched contiguously with stress digits stripped; multi-pronunciation words match if any pronunciation contains an expected sequence. `digraph` is intentionally NOT a family in this PR — digraphs stay in existing prerequisite logic.)

`wordMatchesPattern(word, code)` dispatches by family:
- **`closed` / `vce`** → existing regexes, UNCHANGED (Phase 3 back-compat — this is a hard invariant).
- **`vowel_team` / `r_controlled` / `diphthong`** → grapheme present AND (real word: CMUdict pronunciation contains an `expectedPhonemes` entry; OR word in `exceptions`). CMUdict is lazy-loaded + cached (share the pseudoword validator's loader); only consulted for these families, so closed/vce/heart stay fast. This is an offline/content-gen + audit path, not student runtime.

## 4. Phase-aware r-controlled gate

`LESSON_PHASE3_NO_RCONTROLLED` currently blocks all `ar/er/ir/or/ur` + `are/for/here` everywhere. Generalize it: **r-controlled words are blocked UNLESS the active `targetPatterns` (or allowed review set) includes the matching r-controlled family.** So:
- Phase 3 lessons (no r-controlled target) → still block `farm`/`her`/`for`/`are` (unchanged behavior).
- Phase 4 r-controlled lesson with `targetPatterns` including `r_ar` → `farm`/`car` classify as target and pass the gate; non-target r-controlled still blocked.

Keep the existing rule ID working as before for Phase 3 (compat); the gate just gains the "unless targeted" exemption.

## 5. Pseudoword validator interface

Generalize so it no longer assumes VCe-only:
- `detectVcePattern` stays (VCe), add **`detectPatternCandidates(word): string[]`** returning ALL plausible codes by grapheme/rule — ambiguous graphemes (`ow`, `oo`, `ie`) return multiple candidates. `validatePseudowordCandidate(word, targetPattern)` asserts the target is among the candidates (don't force a unique pattern for ambiguous spellings).
- `validatePseudowordCandidate` gains a **pattern-family validation hook** so each family can plug in its own checks; keep the strict-lexicon + CMUdict homophone behavior from PR #37 (real-word/near-spelling collisions still rejected). Vowel-team homophone logic (a `team_ai` pseudoword colliding with a silent-e or other-team real word) is added when the **team content PR** ships — the foundation PR only lands the interface + VCe behavior unchanged.

## 6. Back-compat invariant (hard)

All Phase 3 Entry + Mid generation/audit/spec-conformance tests pass **unchanged**; VCe/closed matching identical; no new false positives in any existing lesson. The registry's Phase 3 entries (`a_e`…`e_e`, `closed_short_*`) use the existing regex matchers verbatim.

## 7. Test matrix (the PR is judged by tests, not content)

- **Vowel-team positive:** rain/wait/mail → `team_ai` target; feet → `team_ee`; seat → `team_ea`; boat → `team_oa`; high → `team_igh`.
- **Vowel-team exception:** said/again/captain/plaid → NOT `team_ai`; bread/head/dead → NOT `team_ea`.
- **R-controlled pre-Phase-4:** for/are/here/farm/her FAIL the no-r-controlled gate when no r-controlled target is active.
- **R-controlled Phase-4 target:** farm classifies as `r_ar` and PASSES the gate when `targetPatterns` includes `r_ar`; a non-target r-controlled word still fails.
- **Diphthong separation:** cow → `diph_ow` (AW), NOT `team_ow` (OW); snow → `team_ow`, NOT `diph_ow`; toy → `diph_oy` only when active.
- **oo ambiguity:** moon → `team_oo_long` (UW), NOT `team_oo_short`; book → `team_oo_short` (UH), NOT long.
- **Back-compat:** all Phase 3 Entry/Mid tests pass unchanged; VCe matching identical; pseudoword validator VCe behavior identical.

## 8. Phase 4 roadmap (for the PR description; only the foundation ships now)

1. **THIS PR — Phase 4 phonics engine foundation** (registry, phoneme-verified matchers, ambiguity-keyed codes, phase-aware r-controlled gate, validator interface, tests). No content.
2. **Phase 4 Entry — long-vowel teams** (`team_ai/ay`, `team_ee/ea`, `team_oa/ow`, `team_igh`): seed + content + full lesson gates.
3. **R-controlled** (`r_ar`, `r_or`, `r_er/ir/ur`): content + r-controlled gate relaxed only where targeted.
4. **Diphthongs / variant vowels** (`diph_oi/oy`, `diph_ow/ou`, `au/aw`, `team_oo_long/short`): content + ambiguity policy.
5. **Track B — suffix spelling changes** (drop-e, doubling, y→i): the morphology engine + morpheme catalog (separate epic; master spec §6.7 defers this).

**Sign-off questions for Jonathan:**
1. Approve the **phoneme-verified matcher** (grapheme + CMUdict expected-phoneme) as the Phase 4 matching foundation, with curated `exceptions` only for CMUdict gaps.
2. Approve the **ambiguity-keyed codes** (`team_oo_long`/`team_oo_short`, `team_ow` vs `diph_ow`) so each grapheme/sound is a distinct target.
3. Approve **engine-only scope** for this PR (no Phase 4 content; back-compat is the headline acceptance criterion).
