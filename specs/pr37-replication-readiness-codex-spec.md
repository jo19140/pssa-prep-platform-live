# Content v3 PR #37 — Phase 3 Entry Replication Readiness (data/safety layer)

**Data/safety layer only.** Harden the pseudoword validator, clean every Phase 3 Entry target's seed nonwords, add all-target seed-audit tests + a readiness report, and make the stale-DB pseudoword fallback fail loudly. **Do NOT** remove a_e hardcoding from the lesson-part generators, add per-target content fixtures, or run the full PR #36 gate stack against i_e/o_e/u_e/e_e — that is **PR #38**. No new Prisma models, no lesson UI, no runtime. Branch from latest `main` (PR #36 merged at `d6fd183`). Commit.

> Companion sign-off artifact: `specs/pr37-replication-readiness-WORKED.md` — the validated nonword sets and the lexicon-design proof (run against real CMUdict/SUBTLEX data). Build to that.
>
> **For Codex — use this 2026-06-01 spec + worked artifact pair only.**

## Rule 0 — preserve the a_e no-regression property

PR #36's a_e slice is merged and green. The hardened validator **must not** newly reject any shipped a_e nonword (`zake, mave, pame, vade, sape, nace, gake, tave`). This is verified-critical: `mave` and `nace` exist in CMUdict as obscure name tokens, and `vade`/`tave` appear in SUBTLEX with anomalously high frequency — so a naive "use CMUdict" or "use SUBTLEX" validator would break the merged a_e fixture. The split design below is specifically engineered to avoid that. Any change that flips an a_e nonword to invalid is a regression and a failed PR.

## Preconditions (stop and report if missing)

1. On `main` at/after `d6fd183`. `lib/literacy/pseudowordValidator.ts` exports `validatePseudowordCandidate`, `validatePseudowordSet`, `homophoneVariants`, `CORE_REAL_WORDS`.
2. `data/phonogram/cmudict.json` (array of `{word, ...}`, ~126k entries) and `data/phonogram/subtlex.csv` (header includes `word` col 0, `zipf` col 5) are present.
3. `lessonAudit.ts` gates from PR #36 are intact (`LESSON_PART3_PSEUDOWORD_COUNT` etc.). `lessonGenerator.ts` has `canonicalPseudowordsForTarget`.

## 1. Harden `pseudowordValidator.ts` — split + frequency-gated lexicon

Two independent lexicons (the worked artifact §2 explains why neither works alone):

- **Direct real-word membership → `CORE_REAL_WORDS`** (curated, deterministic, junk-free). Keep and extend CORE with common controlled-vocabulary words and the named collision targets across all five vowels. This decides whether the candidate *itself* is a real word. Because CORE is curated, `mave/nace/vade/tave` are not in it and stay valid.
- **Homophone / near-spelling collision → a comprehensive, frequency-gated lexicon.** Build it lazily (cached, module-scope) from CMUdict words **filtered to SUBTLEX zipf ≥ 4.0**. A generated pronunciation-preserving variant counts as a collision only if it is in this gated set. The zipf floor is load-bearing: it admits every real homophone target (goal 7.2, fuel 7.2, newt 6.1, need 9.1, beet 5.4, loam 4.8, knoll 5.7, nile 6.3 — all ≥ 4.0) while excluding CMUdict junk-name variants (e.g. `sape`→`seip`, a surname absent from SUBTLEX).

**Implementation notes:**
- Keep the existing `homophoneVariants(word, vowelLetter)` generator (long-vowel teams + c/k, ph/f onset) unchanged.
- `validatePseudowordCandidate(word, targetPattern, opts?)`: membership check uses CORE; variant-collision check uses the gated lexicon. Preserve the return shape `{ pseudoword, expectedPronunciation, targetPattern, valid, reason, collidesWith, issues }`. `collidesWith` = the real word matched (for membership, the word itself; for homophone, the matched common variant).
- **Lazy + guarded loading.** Load CMUdict + SUBTLEX on first homophone check, cache in module scope. Do not load at import time. Loading is acceptable on the generation/audit/CLI path.
- **Single options shape (do not create a second signature).** `validatePseudowordCandidate(word, targetPattern, opts?)` where `opts` is one object:
  ```ts
  { strictLexicon?: boolean; lexicon?: { core?: Set<string>; homophone?: Set<string> } }
  ```
  `strictLexicon` controls missing-lexicon behavior (below); `lexicon` lets tests inject deterministic sets without the 51MB load. Keep `validatePseudowordSet` and `homophoneVariants` signatures consistent with this.
- **Strict lexicon mode (required).** `opts.strictLexicon?: boolean`:
  - **Default (app/request paths, `strictLexicon` falsy):** if CMUdict or SUBTLEX cannot load, fall back to CORE-only for variant collisions and attach an issue/warning `HOMOPHONE_LEXICON_UNAVAILABLE` to the result. Do **not** throw — app/request paths must never crash.
  - **Strict (`strictLexicon: true`):** a missing/unreadable CMUdict or SUBTLEX is a **hard failure** (throw). Do **not** silently pass candidates through CORE-only. This is the safety guarantee: when we're actually gating content, an absent lexicon must fail the run, not quietly disable the homophone check.
  - **These callers MUST pass `strictLexicon: true`:** `scripts/content/audit-phase3-nonwords.ts`, the all-target seed audit tests, and `canonicalPseudowordsForTarget` (lesson-generation path). Anything that decides whether content ships runs strict.

**Verified target behavior (assert in tests):**
```
nile(i_e) INVALID [real]   fule(u_e) INVALID [->fuel]   nute(u_e) INVALID [->newt]
nede(e_e) INVALID [->need]  bete(e_e) INVALID [->beet]
a_e shipped 8 ALL VALID (no regression)   sape VALID (seip is a name, zipf-gated out)
```

## 2. Clean seed nonwords — `lib/content/phase3EntrySeed.ts`

Replace `exampleNonwords` for the four non-a_e targets (a_e unchanged). All validated absent-from-CMUdict + no-CMUdict-homophone (worked artifact §3):

```
i_e: ["zibe", "mide", "fime", "pive", "wibe", "jite", "vime", "nibe"]
o_e: ["zome", "fope", "bofe", "nofe", "vone", "wode", "zode", "lote"]
u_e: ["mune", "plute", "vune", "zune", "gube", "mube", "nube", "pude"]
e_e: ["pheme", "zede", "gete", "kete", "nepe", "zene", "gede", "hefe"]
```

Each target now has 8 nonwords (satisfies the Part 3 `LESSON_PART3_PSEUDOWORD_COUNT` 8–10 gate when those targets are generated in PR #38). Do not touch `exampleWords`, labels, or pattern codes.

## 3. All-target seed audit test

Extend the content-v3 test suite (or add `scripts/test-content-v3-seed-nonwords.ts` wired into `test:content-v3`): for **every** `DailyTarget` in `PHASE_3_ENTRY_TARGETS`, assert each `exampleNonwords` entry passes the hardened `validatePseudowordCandidate(word, target.code)` — pattern-match, not a real word, no homophone collision — and that each target has ≥ 8 nonwords. This test must **fail on the current seed** (i_e/u_e/e_e) and **pass after** the §2 replacement. Use the real (file-backed) lexicon here, or an injected lexicon that includes the §1 collision targets, so the homophone path is actually exercised (a CORE-only run would miss `fule`→`fuel`).

Also add focused validator unit tests:
- **§1 verified behavior:** the bad words fail with the right `collidesWith` (homophone path), the a_e 8 stay valid.
- **Direct-membership regression (load-bearing — membership stays curated CORE):** `mave`, `nace`, `vade`, `tave` are NOT invalidated by direct membership; `nile` IS invalid by CORE membership. This guards against anyone "fixing" membership by switching to CMUdict (which contains `mave`/`nace`).
- **Strict-mode behavior:** with `strictLexicon: true` and an unavailable SUBTLEX/CMUdict (simulate by pointing the loader at a missing path or injecting a load failure) → the validator/audit **throws**; with `strictLexicon: false` and the same failure → no throw, returns a CORE-only result carrying the `HOMOPHONE_LEXICON_UNAVAILABLE` issue.

## 4. Replication-readiness report — `scripts/content/audit-phase3-nonwords.ts`

New CLI, npm `"content:audit-phase3-nonwords": "tsx scripts/content/audit-phase3-nonwords.ts"`. Loads all Phase 3 Entry targets, runs each `exampleNonwords` through the hardened validator **with `strictLexicon: true`** (a missing lexicon must fail the audit, not silently pass), and prints a per-target table (valid / invalid + `collidesWith` reason + count vs. the 8 minimum). Exit non-zero if any target has an invalid or fewer-than-8 nonword set, **or if the lexicon could not load**. This is the standing guard that no future seed edit reintroduces a real-word pseudoword.

## 5. Harden the stale-DB pseudoword fallback — `lessonGenerator.ts`

`canonicalPseudowordsForTarget` currently silently substitutes a hardcoded a_e list when the DB `DailyTarget.exampleNonwords` is stale/insufficient. Now that the seed is correct for all five targets, **remove the silent a_e hardcode**:
- If `dailyTarget.exampleNonwords` has ≥ 8 entries that all pass `validatePseudowordCandidate(word, code, { strictLexicon: true })` → use them (the normal path).
- Otherwise → **fail fast (mandatory — throw, do not warn-and-skip)**: throw with a clear message naming the target and instructing a re-seed (`npm run db:seed` / re-run the Phase 3 Entry seed). No silent per-target rescue list, no warn-and-continue. A stale local DB must not be able to masquerade as valid. (Strict mode here also means a missing lexicon throws rather than passing the DB nonwords through a CORE-only check.)

## What Codex should NOT do (this PR)

1. Do **not** remove a_e hardcoding from `lib/literacy/lessonParts/*` or add per-target content (demo pairs, decoding lines, sentences, dictation, passages, questions) — that is PR #38.
2. Do **not** seed/generate mock approved passages for i_e/o_e/u_e/e_e, and do **not** run `auditGeneratedLessonDraft` end-to-end against those targets — PR #38.
3. Do **not** switch direct membership to CMUdict/SUBTLEX (it would reject `mave`/`nace`/`vade`/`tave`). Membership stays curated CORE.
4. Do **not** add Prisma models, migrations, lesson review UI, or runtime.
5. Do **not** load CMUdict/SUBTLEX at import time or on any request path — lazy + cached + guarded only.

## Acceptance criteria

- Hardened validator: the §1 verified behaviors all hold; **no a_e nonword regresses**; direct membership stays curated CORE (`mave`/`nace`/`vade`/`tave` not invalidated by membership). Strict mode: missing lexicon **throws**; non-strict (app paths): missing lexicon degrades to CORE-only with a `HOMOPHONE_LEXICON_UNAVAILABLE` issue (no throw).
- `phase3EntrySeed.ts`: all five targets have 8 validated nonwords; `nile`/`fule`/`nute`/`nede`/`bete` gone.
- All-target seed audit test present, fails on old seed, passes on new.
- `content:audit-phase3-nonwords` runs, prints the table, exits non-zero on any invalid/short target.
- Stale-DB fallback **fails loudly by throwing** — no warning-only path, no skip, and no silent a_e substitution.
- Verify gates all green: `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords`, `npm run build`.

## One-paragraph instruction to Codex

Use **CORE** for direct real-word membership; use **CMUdict ∩ SUBTLEX zipf ≥ 4.0** for homophone/near-spelling variants. Add **`strictLexicon` mode**: app/request paths degrade to CORE-only with a `HOMOPHONE_LEXICON_UNAVAILABLE` issue (no throw); generation/audit/CI paths (`audit-phase3-nonwords`, seed audit tests, `canonicalPseudowordsForTarget`) pass `strictLexicon: true` and **hard-fail** if the lexicon is missing. **Preserve all shipped a_e nonwords** (`mave`/`nace`/`vade`/`tave` must stay valid — never switch membership to CMUdict). Replace the i_e/o_e/u_e/e_e seed nonwords with the validated 8-item sets. Add the all-target seed audit test + the readiness report. Make `canonicalPseudowordsForTarget` **fail fast** (throw) on a stale/short DB — no silent a_e rescue, no warn-and-skip. **Do not** parameterize lesson content — that's PR #38.

## PR #38 (next, not now) — content parameterization
Remove a_e hardcoding from the part generators; add per-target content fixtures (demo pairs, contrastive lines, sentences, dictation, comprehension) for i_e/o_e/u_e/e_e; seed/mock approved passages per target; run the full PR #36 gate stack against all five Phase 3 Entry targets. a_e remains the verified reference implementation that PR #38 replicates by data.
