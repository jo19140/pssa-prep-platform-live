# Phase 3 Mid Worked Artifact — Mixed Silent-e Consolidation

**Status:** Sign-off artifact. Scope (your call): Phase 3 Mid = **consolidation and application of the five Phase 3 Entry VCe patterns** (a_e, i_e, o_e, u_e, e_e). No open syllables, affixes, -y, vowel teams, or morphology — those are separate follow-up PRs needing new classifier/validator support. Every passage/line/sentence/dictation below was validated against the **real `classifyPassageWords`** (current `main`) with multi-pattern target codes, **`runPassageQualityAudit`** (no repeated trigrams), and each nonword validated per its detected VCe pattern against the **full CMUdict** oracle. All clean.

---

## 1. Design — how "multiple active VCe target patterns" works

A Phase 3 Mid daily target practices **two-plus** VCe patterns at once. The model (validated):

- **`targetPatternsJson.patterns`** = the VCe patterns this lesson practices (e.g. `["a_e","i_e"]`). Words matching any of these classify as **target**.
- **`allowedPatternCodes`** = `closed_short_*` **+ the other VCe patterns not in this target's set**. Because the student learned all five VCe in Entry, the non-target VCe are **allowed review** (classify as prerequisite), not blocked. This is what makes "consolidation" work — a mixed o_e+u_e+e_e lesson can still contain decodable a_e/i_e review words.
- **`blockedPatternCodes`** = the **non-VCe long-vowel teams only**: `ai, ay, oa, ow, oe, ee, ea, igh, ie, ue, ew, y_final`. (Long vowels must still be spelled with silent-e in Phase 3; vowel teams are Phase 4.)
- **Nonwords** mix across the target's patterns; each is detected to its own VCe (by vowel) and validated against that pattern. All chosen nonwords are **absent from CMUdict** (no caveats needed, unlike a_e's `mave`/`nace`).

**Three targets (progressive mix):**

| code | patterns practiced | passage | decodability | unique target words |
|---|---|---:|---:|---:|
| `vce_mix_ai` | a_e + i_e | 45w | 1.000 | 14 |
| `vce_mix_oue` | o_e + u_e + e_e | 45w | 1.000 | 14 |
| `vce_mix_all` | a_e + i_e + o_e + u_e + e_e | 45w | 1.000 | 20 |

**Authoring constraints (carried from Phase 3 Entry, all enforced):** no r-controlled words (`are`, `for`, `here` — note `are` matches the a_e regex and would pass the classifier but is pedagogically wrong, so it's excluded); no open-syllable function words (`by`, `my`, `you`, `be`); no inflections on target VCe words (`likes`, `rides`); names must match a VCe/allowed pattern (`Dave`/a_e, `Mike`/i_e, `Rose`/o_e, `June`/u_e, `Pete`/e_e, `Kate`/a_e).

---

## 2. Validated content per target

Shared: heart previewed `["said","was","they"]`, assumed-known `["I","a","the","to"]`. L1 = `exampleWords`; L4 = `exampleNonwords`.

### vce_mix_ai  (a_e + i_e)
- **kidVisibleLabel:** "a_e and i_e words"  ·  **mockPassageTitle:** "Dave's Bike"
- **exampleWords (L1, mixed):** cake, bike, lake, time, ride
- **exampleNonwords (L4, 4 a_e + 4 i_e, CMUdict-absent):** zake, pame, vade, sape, zibe, mide, fime, pive
- **demonstrationPairs:** cap→cape, man→mane, pin→pine, rid→ride
- **L2:** cap cape man mane pin pine rid ride
- **L3:** ran lake hand bike fast mine desk
- **Sentences:** "Dave has a bike." · "The bike is white." · "Mike can ride to the lake." · "Kate gave Dave a kite." · "\"I like this bike,\" said Mike." · "They ride and smile."
- **Dictation:** cake, bike, ride, made, ran, hand · "Dave has a bike." · "Mike can ride a mile."
- **Vocabulary:** bike, kite
- **Passage:** *Dave has a bike. Mike has a kite. The bike is white. Mike can ride to the lake. Kate came to ride. "I like this bike," said Dave. Dave gave Kate a ride. They ride and smile. It was a fine time at the lake.*
- **Questions:** Why does Mike like the bike? · What did Kate do? · Tell me what happened at the lake in your own words. · What would you like to ride?

### vce_mix_oue  (o_e + u_e + e_e)
- **kidVisibleLabel:** "o_e, u_e, and e_e words"  ·  **mockPassageTitle:** "June's Mule"
- **exampleWords (L1, mixed):** home, mule, note, cute, scene
- **exampleNonwords (L4, 3 o_e + 3 u_e + 2 e_e, CMUdict-absent):** zome, fope, bofe, mune, plute, vune, pheme, zede
- **demonstrationPairs:** not→note, hop→hope, cub→cube, cut→cute, pet→Pete
- **L2:** not note hop hope cub cube cut cute
- **L3:** ran home hand mule fast scene desk
- **Sentences:** "Rose has a home." · "June has a cute mule." · "The mule is huge." · "Pete woke and rode home." · "\"I hope to compete,\" said Pete." · "They like the scene."
- **Dictation:** home, mule, cute, note, ran, hand · "Rose has a home." · "June has a cute mule."
- **Vocabulary:** mule, scene
- **Passage:** *Rose woke at home. June has a cute mule. The mule is huge. Pete rode the mule home. "I hope to compete," said Pete. Rose gave Pete a note. June and Pete like the mule. They sat on a stone. It was a fine scene.*
- **Questions:** What does June have? · Why did Pete go home? · Tell me what happened in your own words. · What would you like to compete in?

### vce_mix_all  (a_e + i_e + o_e + u_e + e_e)
- **kidVisibleLabel:** "silent-e review"  *(**resolved**: allowed ONLY for `vce_mix_all`, because this lesson genuinely mixes all five VCe patterns. Single-pattern targets keep "a_e words" etc.; "silent-e words" is forbidden per §5.12. The kid-view linter allows this exact label only for this target.)*  ·  **mockPassageTitle:** "At the Lake"
- **exampleWords (L1, mixed all 5):** cake, bike, home, mule, Pete
- **exampleNonwords (L4, 2a+2i+2o+1u+1e, CMUdict-absent):** zake, pame, zibe, mide, zome, fope, mune, pheme
- **demonstrationPairs:** cap→cape, pin→pine, hop→hope, cub→cube, pet→Pete
- **L2:** cap cape pin pine hop hope cub cube
- **L3:** ran lake bike home mule Pete desk
- **Sentences:** "Dave has a bike." · "Rose has a cute mule." · "Pete rode home." · "June came to ride." · "\"I like these,\" said Pete." · "Mike and Dave like the lake."  *(was "These are fun" — `are` is r-controlled and would wrongly match the a_e regex; removed)*
- **Dictation:** cake, bike, home, mule, ran, hand · "Dave rode a bike." · "June has a mule."
- **Vocabulary:** mule, note
- **Passage:** *Dave has a bike. Mike rode the bike home. Rose has a cute mule. June came to ride the mule. "I like these," said Pete. Dave gave Pete a note. Mike and June like the lake. They ride and smile. It was a fine scene.*
- **Questions:** What can June ride? · Why does Mike like the bike? · Tell me what happened in your own words. · What would you like to ride?

---

## 3. Minimal code change (thread `targetPatterns: string[]`)

The single-pattern `targetPattern: string` is threaded through ~6 audit checks + 2 generators. The change is bounded:

- **`buildLessonGeneratorContext` / `LessonDraft` / ctx:** add `targetPatterns: string[]` from `targetPatternsJson.patterns` (keep `targetPattern` string for display = the daily-target `code`).
- **`lessonAudit.ts`:** `LESSON_WARMUP_NO_TODAY_PATTERN` → warm-up word matches **none** of `targetPatterns`; `LESSON_DAILY_TARGET_NARROW` → **every** `targetPatterns` entry is VCe (ends `_e`); `LESSON_PART2_TARGET_EXAMPLES` → each example matches **some** `targetPattern`; Part 3 pseudowords → **detect each pseudoword's VCe pattern**, assert it's in `targetPatterns`, validate against the detected pattern.
- **`part5Sentences.ts`:** `targetPatternCodes: ctx.targetPatterns` (already an array param).
- **`part3Decoding.ts`:** validate each pseudoword against its detected VCe pattern.
- **New helper `detectVcePattern(word)`** (validator): `^[^aeiou]*([aeiou])[^aeiou]+e$` → `${vowel}_e`, else null.

Single-pattern Phase 3 Entry targets keep working unchanged (a 1-element `patterns` array behaves identically).

**r-controlled is a hard gate, not just a content rule.** Because `are`/`for`/`here` and any `ar/er/ir/or/ur` word can pass a naive VCe matcher (`are` matches the a_e regex), the spec adds an independent `LESSON_PHASE3_NO_RCONTROLLED` gate scanning Parts 3/5/6/7 (decodable practice — not Part 8 spoken questions, where "your own words" is fine). All decodable content above was verified r-controlled-free.

**Resolved product decisions (do not re-litigate — these are final for the build):**
1. Phase 3 Mid uses three targets: `vce_mix_ai` (a_e+i_e), `vce_mix_oue` (o_e+u_e+e_e), `vce_mix_all` (all five) — progressive two→three→all.
2. `vce_mix_all` uses the exact `kidVisibleLabel` "silent-e review"; that label is allowed only for this full-mix target. Single-pattern targets keep "a_e words" etc.; "silent-e words" stays forbidden generally.
3. Non-target VCe patterns are **allowed review** (not blocked) in every Mid lesson — this is the consolidation model.
