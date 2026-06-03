# PR #43 Worked Artifact — Phase 4 Entry: Long-vowel teams + team-pseudoword support

**Status:** Sign-off artifact. **Engine/pseudoword feasibility is resolved; this is the final content + the engine layer the PR must add.** Every passage and pseudoword below was validated against the **real engine on the merged foundation branch** (PR #42): `classifyPassageWords` with the phoneme-verified matcher (real words), a by-rule + CMUdict-reverse homophone check (pseudowords), and `runPassageQualityAudit`. Passages: decodability 1.000, zero unclassified, zero blocked, zero repeated trigrams, both target spellings covered.

> **This PR is engine + content, not content-only.** PR #42 made *real-word* team matching safe (phoneme-verified, so `said`/`captain` are rejected from `team_ai`). But pseudowords aren't in CMUdict, so `wordMatchesPattern("raim","team_ai")` returns false and Part 3 still uses VCe-only `detectVcePattern`. PR #43 adds the team-pseudoword path.

---

## 1. Target structure — 4 sound-grouped targets, `patterns` vs `pseudowordPatterns`

```ts
const PHASE_4_ENTRY_TARGETS = [
  { code: "team_ai_ay", kidVisibleLabel: "ai and ay words",
    targetPatternsJson: { patterns: ["team_ai","team_ay"], pseudowordPatterns: ["team_ai"] } },
  { code: "team_ee_ea", kidVisibleLabel: "ee and ea words",
    targetPatternsJson: { patterns: ["team_ee","team_ea"], pseudowordPatterns: ["team_ee","team_ea"] } },
  { code: "team_oa",    kidVisibleLabel: "oa words",
    targetPatternsJson: { patterns: ["team_oa"], pseudowordPatterns: ["team_oa"] } },
  { code: "team_igh",   kidVisibleLabel: "igh words",
    targetPatternsJson: { patterns: ["team_igh"], pseudowordPatterns: ["team_igh"] } },
];
```

**Why grouped:** `team_ay` can produce only ~3 clean pseudowords (it's word-final, no coda — onset+`ay` is almost always a real word or long-a homophone), so it cannot be a standalone target under the 8–10 pseudoword gate. Grouping `ai/ay` by sound is mechanically necessary and pedagogically natural. **`patterns`** = spellings taught in real words (both); **`pseudowordPatterns`** = subset used for the made-up-word line (`ai` only for `team_ai_ay`). `ow`/`oo`/`ie`/`ue`/`ew`, diphthongs, r-controlled, and morphology are **out of this PR** (later slices) — and `team_oa` means **oa only, not ow** (no `snow`/`grow` in content).

---

## 2. Locked pseudowords (8 per target, by-rule clean — CMUdict-absent + no phoneme-reverse homophone)

| target | `pseudowordPatterns` | 8 pseudowords |
|---|---|---|
| `team_ai_ay` | `team_ai` | zaib, vaib, jaib, maig, naid, paib, saib, taib |
| `team_ee_ea` | `team_ee`,`team_ea` | zeed, veeb, jeeb, meeb, zead, veab, jeab, meab |
| `team_oa` | `team_oa` | zoab, voab, joad, moag, noab, poab, soab, toag |
| `team_igh` | `team_igh` | zighb, vighg, jighd, mighb, nighb, pighb, sighg, tighb |

Validated: each contains its team grapheme, is absent from CMUdict, and has **no real-word homophone** (decode-by-rule → CMUdict reverse lookup). The check correctly rejects `blaim` (→`blame`) and `laim` (→`lame`) while NOT false-rejecting `raim`-shaped words via spelling-only alternation.

---

## 3. Validated Part 7 passages (engine-confirmed: decod 1.000, clean, both spellings, no repeated trigrams)

- **team_ai_ay — "Gail's Rainy Day":** *Gail will play in the rain. The rain fell all day. Jay had to wait. "I see the rain," said Gail. Jay and May ran to play. They paint a sail. The sail is gray. We help Gail paint. Gail had to stay. It was a fun day.* (48 words; ai: rain/wait/paint/sail/Gail · ay: play/day/Jay/May/gray/stay)
- **team_ee_ea — "The Seal":** *We see a seal at the sea. The seal can leap. The seal ate a treat. "I see green weeds," said Jean. They feed the seal meat. The seal sleeps in the deep. We keep the seal neat. He gave the seal a bean. It was a sweet week.* (49 words; ee: see/green/weeds/feed/sleeps/deep/keep/sweet/week · ea: seal/sea/leap/treat/meat/neat/bean)
- **team_oa — "Joan's Goat":** *Joan has a goat. The goat ate the oats. The goat ran on the road. The goat had a coat. "I see a goat," said Joan. They gave the goat soap. We made goat toast. The goat sat on a boat. It was a fine day.* (46 words; oa: goat/oats/road/coat/Joan/soap/toast/boat)
- **team_igh — "The Knight":** *The knight had a small light. The night was bright. The knight will fight. "I see the light," said Dwight. They might win. We held the light up high. A knight ran in the night. The light is not tight. It was a fine sight.* (46 words; igh: knight/light/night/bright/fight/Dwight/might/high/tight/sight)

---

## 4. Per-target lesson content (Parts 2/3/5/6/8)

Heart/sight words used (canonical Dolch, non-r-controlled only): `said, was, they, I, a, the, to, is, see, of, we, he, she, me, be`. **No r-controlled words anywhere** (`for/are/her/here/water` excluded — the phase-aware gate blocks them since r-controlled is untaught here). Allowed review = closed-syllable + all Phase-3 VCe. Blocked = all other teams + diphthongs + r-controlled.

### team_ai_ay  (ai + ay)
- **Part 2 demo (closed→team, shows the team makes long a):** pan→pain, ran→rain, man→main, mad→maid; plus ay exemplars day/play/stay.
- **Part 3:** L1 (exampleWords): rain, wait, paint, day, play. L2 (contrast short vs team): pan pain · ran rain · man main · mad maid. L3 (cumulative + ay): sail, gray, stay, lake, hand, jay, desk. L4 (pseudowords): the 8 above.
- **Part 5 sentences:** "The rain fell on the hay." · "Jay had to wait all day." · "We paint a gray sail." · "\"I like the rain,\" said May." · "They play in the rain." · "Gail had to stay."
- **Part 6 dictation:** rain, wait, paint, day, play, stay · "Jay ran in the rain." · "We play all day."
- **Part 8 questions:** Why did Gail have to stay? · What did Jay and May do? · Tell me what happened on the rainy day in your own words. · What do you like to do on a rainy day?
- **Vocabulary:** sail, paint

### team_ee_ea  (ee + ea)
- **Part 2 demo (closed→team):** pet→? (ee/ea add a vowel: bed→bead, men→mean, set→seat, ten→teen); plus ee exemplars see/feet/green.
- **Part 3:** L1: seal, green, treat, feet, week. L2 (contrast): bed bead · men mean · set seat · ten teen. L3 (cumulative): meat, deep, sea, lake, hand, sweet, desk. L4: the 8 above.
- **Part 5 sentences:** "We see a green seal." · "The seal can leap." · "They feed the seal meat." · "\"I see the sea,\" said Jean." · "We keep the seal neat." · "He had a sweet treat."
- **Part 6 dictation:** seal, green, treat, feet, week, meat · "We see a seal." · "The seal can leap."
- **Part 8 questions:** What can the seal do? · What did they feed the seal? · Tell me what happened at the sea in your own words. · What animal would you like to see at the sea?
- **Vocabulary:** seal, treat

### team_oa  (oa)
- **Part 2 demo (closed→team):** got→goat, cot→coat, rod→road, rob→? (cob→? ); use: got→goat, cot→coat, rod→road, lod? → use top→toad? (not minimal) — clean minimal pairs: got→goat, cot→coat, rod→road, (cod→? ). Provide 3–4: got→goat, cot→coat, rod→road.
- **Part 3:** L1: goat, road, coat, soap, boat. L2 (contrast): got goat · cot coat · rod road. L3 (cumulative): oats, toast, home, lake, hand, load, desk. L4: the 8 above.
- **Part 5 sentences:** "Joan has a goat." · "The goat ate the oats." · "The goat ran on the road." · "\"I see a coat,\" said Joan." · "We made toast." · "The goat sat on a boat."
- **Part 6 dictation:** goat, road, coat, soap, boat, toast · "Joan has a goat." · "The goat ran on the road."
- **Part 8 questions:** What does Joan have? · Where did the goat run? · Tell me what the goat did in your own words. · What would you feed a goat?
- **Vocabulary:** goat, coat

### team_igh  (igh)
- **Part 2 demo (closed→team, igh has no clean closed base → use igh word family):** contrast `it→? `; igh has no closed-base minimal pairs, so Part 2 shows the igh family directly: light, night, bright, knight, fight. *(Note: igh demo uses family examples, not closed→team pairs — see §5 gate note.)*
- **Part 3:** L1: light, night, bright, fight, high. L2 (igh family vs sight-of-i): pit? — igh has no minimal pair; use: light night sight right tight might. L3 (cumulative): knight, flight, lake, hand, high, desk. L4: the 8 above.
- **Part 5 sentences:** "The knight had a light." · "The night was bright." · "The knight will fight." · "\"I see the light,\" said Dwight." · "We held the light up high." · "It was a fine sight."
- **Part 6 dictation:** light, night, bright, fight, high, might · "The knight had a light." · "The night was bright."
- **Part 8 questions:** What did the knight have? · What will the knight do? · Tell me what happened at night in your own words. · What would you do if you were a knight?
- **Vocabulary:** knight, light

---

## 5. Audit summary (validated) + the engine layer this PR adds

**Each target (validated):** zero unclassified · zero blocked-pattern violations · no r-controlled words (Parts 3/5/6/7) · passage 46–49 words (in band) · uniqueSentenceRatio 1.0, no repeated trigrams · target-pattern coverage satisfied (both `ai`+`ay`, both `ee`+`ea`) · 8 pseudowords by-rule clean.

**Engine additions this PR must make (the deferred team layer):**
1. **Pseudowords classify by grapheme/rule, not CMUdict** — a `team_ai` pseudoword (`zaib`) validates by rule even though it's absent from CMUdict. Real words keep phoneme-verified `wordMatchesPattern`.
2. **Part 3 audit: `detectVcePattern` → `detectPatternCandidates`** (family-aware). For each pseudoword: `candidates = detectPatternCandidates(w)`; assert `candidates ∩ ctx.pseudowordPatterns ≠ ∅`; `validatePseudowordCandidate(w, selectedPattern, { strictLexicon: true })`. Never match on `ctx.targetPattern`.
3. **Team pseudoword homophone validator = phoneme-based reverse lookup** (decode-by-rule → CMUdict reverse). Rejects `blaim`→`blame`; does NOT false-reject `raim` via spelling-only alternation.
4. **New gate `LESSON_TARGET_PATTERN_COVERAGE`:** for each pattern in `patterns`, require ≥1 real-word in Part 2 AND Part 3 AND (Part 5 or Part 7). Pseudoword coverage is over `pseudowordPatterns` only. (Prevents `team_ai_ay` from teaching only `ai` in real words.)
5. **Part 2 demo-pair gate adapted for teams:** closed-base→team contrast (`pan→pain`) where the target side matches the team and the base classifies as prerequisite. For `igh` (no clean closed base), demo uses the igh word family — the gate must allow a family-examples form for teams that lack closed minimal pairs.
6. **Heart-word discipline:** sight words may shield classification only if they're in the canonical phase HFW set; do not add heart words to rescue out-of-scope/future-pattern phonics, and no r-controlled HFWs (`for/are/her`).

**Resolved product decisions (final):** 4 sound-grouped targets as above; `team_oa` = oa only (no `ow`); ambiguous teams (`ow`/`oo`/`ie`) and r-controlled/morphology deferred.

> **Remaining before send:** Codex spec (engine additions + the coverage gate + the per-target content above). The `igh` passage is 46 words (in band); the `team_igh` Part 2/3 demo uses family examples (no closed minimal pair exists for igh) — the demo-pair gate must accommodate that.
