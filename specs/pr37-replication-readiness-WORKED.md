# PR #37 Worked Artifact — Phase 3 Entry Replication Readiness (data/safety layer)

**Status:** Sign-off artifact for PR #37. Everything here was verified by running the **actual merged `main` validator** (`lib/literacy/pseudowordValidator.ts` @ `d6fd183`) against `data/phonogram/cmudict.json` (126,052 words) and `data/phonogram/subtlex.csv` frequencies. Approve the validated nonword sets and the lexicon design, then PR #37 ships.

> **Scope reminder.** PR #37 is the **data/safety layer only**: validator hardening + clean seed nonwords + all-target seed audit tests + a replication-readiness report + fail-fast (throwing) stale-DB pseudoword fallback. It does **not** touch per-target lesson content — that's **PR #38** (remove a_e hardcoding from the part generators, per-target content fixtures, per-target mock passages, run full PR #36 gates against all five targets). Today's a_e generators stay a_e-only.

---

## 1. The gating finding — current seed nonwords are not all clean

Running every Phase 3 Entry target's `exampleNonwords` through the merged validator:

| Target | Current seed nonwords | Verdict |
|---|---|---|
| `a_e` | zake, mave, pame, vade, sape, nace, gake, tave | ✅ 8 clean (shipped in PR #36) |
| `i_e` | zibe, mide, fime, pive, **nile** | ❌ `nile` is a real word; only 5 (need 8) |
| `o_e` | zome, fope, boke, nole, pote | ⚠️ 5 (need 8) — see homophone note |
| `u_e` | zube, **fule**, **nute**, mune, plute | ❌ `fule`≈fuel, `nute`≈newt; only 5 |
| `e_e` | zete, pheme, **nede**, **bete**, lete | ❌ `nede`≈need, `bete`≈beet; only 5 |

**Two problems:** (1) each non-a_e target has only 5 nonwords (Part 3 needs 8–10); (2) several are real words or real-word homophones — and the **current validator did not catch most of them** because its `CORE_REAL_WORDS` list is a_e-centric (it caught `nile` only because `nile` happened to be in CORE). `fule`/`nute`/`nede`/`bete` sailed through. That's the safety gap PR #37 closes.

---

## 2. The lexicon design decision (this is the heart of PR #37)

I tested three lexicon strategies against the real data. Each fails alone:

| Strategy | Catches real homophones (goal, fuel, newt, need, beet, loam)? | False-positives on valid pseudowords? |
|---|---|---|
| **Hand-curated CORE only** (today) | ❌ No — CORE is a_e-centric; misses fuel/newt/need/beet/goal/loam | ✅ None |
| **CMUdict membership** (126k words) | ✅ Yes | ❌ **Yes** — CMUdict contains obscure name tokens `mave` and `nace` (shipped a_e nonwords!) → would break the a_e fixture |
| **SUBTLEX frequency gate** | ✅ Yes | ❌ **Yes** — `tave` (zipf 5.57) and `vade` (4.29) score *higher* than real targets `loam` (4.77) / `beet` (5.44), so no clean threshold separates junk from real words |

**The empirical wall:** `tave`/`vade`/`mave`/`nace` (legitimate a_e pseudowords) appear in the corpora as junk/name tokens, and frequency does not cleanly separate them from real homophones. No single lexicon works.

**The design that works — a split lexicon:**

- **Direct real-word membership → curated `CORE_REAL_WORDS`** (deterministic, junk-free). This is what decides "is the pseudoword itself a real word." Because it's curated, `mave`/`nace`/`vade`/`tave` are *not* in it, so they stay valid. Extend CORE with common controlled-vocabulary + the spec's named collisions.
- **Homophone / near-spelling collision → CMUdict ∩ SUBTLEX zipf ≥ 4.0.** The variant generator (already in the validator: long-vowel teams + c/k, ph/f onset) produces candidate real spellings (`drane`→`drain`, `fule`→`fuel`, `nede`→`need`); a variant counts as a collision only if it's in CMUdict **and** common (SUBTLEX zipf ≥ 4.0). The zipf floor excludes CMUdict junk-name variants (e.g. `sape`→`seip`, a surname absent from SUBTLEX) while keeping every real homophone target (all of goal/fuel/newt/need/beet/loam/knoll/nile sit at zipf 4.77–9.11).

**Verified behavior of the split+gated design (run on real data):**

```
nile (i_e) -> INVALID  [real: nile]
fule (u_e) -> INVALID  [homophone: fuel]
nute (u_e) -> INVALID  [homophone: newt]
nede (e_e) -> INVALID  [homophone: need]
bete (e_e) -> INVALID  [homophone: beet]

a_e shipped 8 (zake,mave,pame,vade,sape,nace,gake,tave) -> ALL VALID   (no regression)
sape -> VALID   (its only CMUdict variant "seip" is a name, zipf ABSENT, correctly ignored)
```

So the hardened validator newly catches the bad words **and** leaves the merged a_e seed/fixture untouched. That no-regression property is a hard requirement — PR #37 must not retroactively break a_e.

---

## 3. Validated replacement nonwords (8 per target)

Every word below was confirmed: matches its target pattern, **absent from CMUdict**, and **no CMUdict homophone variant** (bulletproof under any reasonable lexicon, not just the gated one).

| Target | 8 validated nonwords |
|---|---|
| `a_e` | zake, mave, pame, vade, sape, nace, gake, tave *(unchanged — already shipped)* |
| `i_e` | zibe, mide, fime, pive, wibe, jite, vime, nibe *(replaces the 5-word set incl. `nile`)* |
| `o_e` | zome, fope, bofe, nofe, vone, wode, zode, lote |
| `u_e` | mune, plute, vune, zune, gube, mube, nube, pude *(drops `fule`/`nute`)* |
| `e_e` | pheme, zede, gete, kete, nepe, zene, gede, hefe *(drops `nede`/`bete`)* |

These become the `exampleNonwords` for each `DailyTarget` in `lib/content/phase3EntrySeed.ts`.

---

## 4. What PR #37 ships (sign-off checklist)

1. **Harden `pseudowordValidator.ts`** to the split+gated design: keep `CORE_REAL_WORDS` for direct membership; add a lazily-loaded, cached homophone lexicon = CMUdict words filtered to SUBTLEX zipf ≥ 4.0. Variant generation unchanged. Keep `{valid, reason, collidesWith, issues}` shape. **Add `strictLexicon` mode:** app/request paths degrade to CORE-only with a `HOMOPHONE_LEXICON_UNAVAILABLE` issue if the lexicon can't load (no throw); generation/audit/CI paths pass `strictLexicon: true` and **hard-fail** on a missing lexicon — so a content gate never silently runs without homophone protection.
2. **Replace seed nonwords** for i_e/o_e/u_e/e_e with the §3 sets (a_e unchanged).
3. **All-target seed audit test** — assert every `exampleNonwords` entry for all five targets passes the hardened validator. (This test fails today on i_e/u_e/e_e, passes after the fix.)
4. **Replication-readiness report script** — `scripts/content/audit-phase3-nonwords.ts` (npm `content:audit-phase3-nonwords`): prints the §1 table for all targets so regressions are visible before PR #38.
5. **Fail-fast on the stale-DB fallback** in `lessonGenerator.canonicalPseudowordsForTarget`: now that the seed is correct for all targets, remove the silent a_e hardcode; if a DB `DailyTarget` has fewer than 8 valid nonwords, **fail loudly by throwing** with a re-seed instruction. No warning-only path, no skip, and no silent substitution.
6. **No per-target lesson content** beyond what tests need. The a_e generators stay a_e-only; parameterization is PR #38.

**Sign-off question for Jonathan:** approve the §3 nonword sets and the §2 split+gated lexicon (CORE for membership, CMUdict∩SUBTLEX-zipf≥4.0 for homophones)? That's the only design decision in PR #37; everything else is mechanical.
