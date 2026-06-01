# PR #36 Exemplar — Worked 8-Part Lesson (Phase 3 Entry · a_e)

**Status:** Golden fixture / sign-off artifact. **This lesson must pass every gate PR #36 ships** — it is the concrete output target Codex matches, so it cannot contain any known gate failure.
**Purpose:** One real `(phasePosition, dailyTarget)` pair — Phase 3 Entry / `a_e` — rendered the way an approved `Lesson` + 8 `LessonPart` rows should look.

> **How to read this.** Each part shows **Kid view** (exactly what the student surface renders — must pass the §5.12 kid-view linter) and **Tutor / design layer** (`tutorVisibleCopy` + `designNotes` + `contentJson` tags — phoneme notation and metadata live here, never in kid view). Mechanical audit summary at the bottom.

> **Latest changes (post-review, 2026-06-01):** Part 1 trimmed to 15 words; Part 3 inflection line (L5) deferred to a later morphology PR; Part 4 heart words split into three buckets and `are` removed (r-controlled hard-excluded at Phase 3 Entry); Part 5 `for` removed; Part 6 now includes prerequisite review words; Part 7 story rebuilt to contain zero r-controlled / blocked patterns; `conceptExamples` made target-only; vocabulary meaning-preview separated from `WordAudit.category`. The lesson now contains **no known gate failures**. **This is the current PR #36 fixture — ignore any older draft that mentions L5, a 25-word warm-up, `for`/`are`, "heart must equal Part 7," or an open kid-label question.**

---

## Daily target (from the real seed — `lib/content/phase3EntrySeed.ts`)

| Field | Value |
|---|---|
| `code` | `a_e` |
| `kidVisibleLabel` | `a_e words` |
| `tutorLabel` | `a_e silent-e pattern` |
| `allowedPatternCodes` | `closed_short_a`, `closed_short_i`, `closed_short_o`, `closed_short_u`, `closed_short_e` |
| `blockedPatternCodes` | `i_e`, `o_e`, `u_e`, `e_e`, `ai`, `ay`, `oa`, `ee` |
| `exampleWords` | cake, game, make, same, tape |
| `exampleNonwords` (seed) | zake, mave, pame, **lathe**, **nape** |

> ⚠️ **Seed nit to fix (bundled into the PR).** Two of the seed's `exampleNonwords` are real English words: **`lathe`** (a machine) and **`nape`** (back of the neck). The pseudoword validator this PR ships must reject real words, so the seed fails its own gate. Replace with clean non-words, e.g. `zake, mave, pame, vade, sape`.

> ✅ **Resolved — kid-facing pattern label stays `a_e words`** (per master spec §5.12: *"Lesson titles are pattern-specific. 'a_e words,' not 'silent-e' (which would overgeneralize to i_e, o_e, u_e). The pattern under instruction today is the title."* §5.12 also lists *"Today: a_e words"* as acceptable kid copy). The kid-view linter **allows `a_e` only when it appears as the `DailyTarget.kidVisibleLabel`/title**, and still rejects phoneme notation (`/ā/`, slashes, macrons), phase/position/framework codes, and design metadata. Not an open question — the canonical spec already decided it; do not re-litigate.

---

## Part 1 — Warm-up (cumulative code review) · 15 words

> Hard rule (§5.6): **zero a_e words.** Warm-up is prerequisite review only — closed-syllable short vowels the student already owns. The new pattern is introduced fresh in Part 2. Master §5.1 envelope: 10–15 items.

**Kid view**
> **Warm-up**
> Let's read some words you already know.
>
> `cat   ran   hand`
> `pin   did   fish`
> `top   hot   dog`
> `bug   run   cup`
> `pet   red   ten`

**Tutor / design layer**
- `partLabel`: "Warm-up"
- `contentJson.warmupWords`: the 15 words above, all tagged `prerequisite` (`closed_short_a/i/o/u/e`); five short-vowel families represented.
- `designNotes`: "Zero `a_e` instances → `LESSON_PART1_NO_TARGET_PATTERN` PASS. Closed-syllable inventory only. Kept to 15 so the warm-up stays quick."

---

## Part 2 — New thing to learn (explicit target instruction)

> §5.1: one concept + 3–5 demonstration examples. Kid view uses **plain language** for the sound — never `/ā/`, never a slash.

**Kid view**
> **New thing to learn: a_e words**
> When a word ends in a quiet **e**, the **a** says its name — **ay**.
> Watch how the quiet e changes the word:
>
> `cap → cape`
> `at → ate`
> `man → mane`
> `tap → tape`
> `hat → hate`
>
> The e at the end is quiet. It does its job from the back of the word.

**Tutor / design layer**
- `partLabel`: "New thing to learn"
- `tutorVisibleCopy.conceptStatement`: "VCe (a_e): silent final ⟨e⟩ marks the preceding ⟨a⟩ as long /eɪ/. Contrast minimal pairs against known closed syllables."
- `contentJson.conceptExamples`: `["cape","ate","mane","tape","hate"]` — **target-pattern (a_e) words only.** `runLessonLinter` intersects this with `warmupWords` to detect today's-target leakage into the warm-up, so it must NOT contain the closed-base contrast words (`cap`, `at`, `man`, `tap`, `hat`).
- `contentJson.demonstrationPairs`: `[["cap","cape"],["at","ate"],["man","mane"],["tap","tape"],["hat","hate"]]` — each pair is closed-base → a_e to make the silent-e job visible. The closed bases live here, not in `conceptExamples`.
- `designNotes`: "Phoneme notation (`/eɪ/`) lives here only. Kid copy uses an em-dash before 'ay', not a slash — the kid-view linter rejects slash notation."

---

## Part 3 — Reading words (word-level decoding, contrastive lines) · 20 real + 8 pseudo

> §5.4 line structure + §5.5 pseudoword constraints. 15–20 real words + 8–10 pseudowords. Pseudowords use **a_e only** and must not be / resemble real words. **L5 inflection line deferred** to a later morphology PR (Track B is out of scope for #36).

**Kid view**
> **Reading words**
>
> **Line 1 — today's pattern**
> `cake  game  make  same  tape`
>
> **Line 2 — quiet e or not?**
> `cap  cape   man  mane   tap  tape   hat  hate`
>
> **Line 3 — words you know, with a few new ones**
> `ran  lake  hand  gave  fast  name  desk`
>
> **Line 4 — read these made-up words**
> `zake  mave  pame  vade  sape  nace  gake  tave`

**Tutor / design layer**
- `partLabel`: "Reading words"
- Real-word count = 20 (L1: 5, L2: 8, L3: 7) → within 15–20. Pseudoword count = 8 → within 8–10.
- Line tags: L1 all `target`; L2 alternating `prerequisite`/`target` minimal pairs; L3 cumulative `prerequisite` + `target` sprinkle (`lake`, `gave`, `name` are target); L4 all `pseudoword` (a_e only).
- `contentJson.pseudowords`: validated — each phonotactically plausible a_e, none a real word or homophone (rejected candidates logged: `kape`≈cape, `drane`≈drain, `brade`≈braid, `nape`/`lathe` = real words).
- Auditor checks: `LESSON_PART3_CONTRASTIVE_STRUCTURE`, `LESSON_PART3_REAL_WORD_COUNT`, `LESSON_PART3_PSEUDOWORD_COUNT`, `LESSON_PART3_PSEUDOWORD_CLEAN` (all BLOCKER).
- `designNotes`: "L2 minimal pairs are load-bearing — they prove the silent-e *job*, not memorization. L4 verifies decoding transfer. Inflection (bake→baked) returns in the Phase 3 Mid / morphology PR."

---

## Part 4 — Tricky words (heart words + vocabulary)

> §5.7: heart words = high-frequency irregular, **previewed before use**. Heart words are tracked in three buckets so we don't re-preview universally-known words like `the`/`a` every lesson (see gate below).

**Kid view**
> **Tricky words**
> These words don't always play by the rules. Let's learn them by heart.
>
> - **said** — we say it "sed."
> - **was** — we say it "wuz."
> - **they** — this one we just know.
>
> **Two words for our story:**
> - **gift** — something you give to someone.
> - **pal** — a friend.

**Tutor / design layer**
- `partLabel`: "Tricky words"
- `contentJson.heartWordsPreviewedThisLesson`: `["said","was","they"]` — newly previewed today.
- `contentJson.heartWordsAssumedKnown`: `["I","a","the","to"]` — canonical HFW assumed mastered from prior lessons; **not** re-previewed.
- `contentJson.vocabulary`: `["gift","pal"]` — **meaning-preview words.** Both are decodable closed syllables, so their `WordAudit.category` stays `prerequisite` (the shared classifier classifies them that way); the "vocabulary" role is a *meaning-preview* flag stored in `contentJson.vocabulary` / `semanticRole`, NOT a `WordAudit.category` override. Do not force decodable words into `WordAudit.category = "vocabulary"`.
- `designNotes`: "Silent-e **exception** words (short-vowel VCe: `have, give, live, come, some, done, gone, love`) must be tagged `heart`, never `target` — the classifier's a_e regex matches `have` and would mis-decode it. None used in this lesson; the generator carries the exception list. `are` and other r-controlled words are excluded entirely at Phase 3 Entry (not used as heart words here)."

---

## Part 5 — Reading sentences (sentence-level application)

> §5.1: 5–8 sentences, 4–12 words each. Only target / prerequisite / previewed-or-assumed-known-heart words. **No r-controlled vowels** at Phase 3 Entry.

**Kid view**
> **Reading sentences**
> 1. Dave made a cake.
> 2. The cake is a gift.
> 3. Jane came to the lake.
> 4. They gave Jane a wave.
> 5. "I made this cake," said Dave.
> 6. Jane is a pal to Dave.

**Tutor / design layer**
- `partLabel`: "Reading sentences"
- Every word audited (one category per token): `target` (made, cake, came, lake, gave, wave, Jane, Dave) / `prerequisite` (is, gift, this, pal) / heart assumed-known (a, the, to, I) / heart previewed (said). Zero `unclassified`, zero blocked, **zero r-controlled** (`for` removed — was the v1 blocker).
- `designNotes`: "Sentence 2 dropped the r-controlled `for` entirely. `to` (sentences 3, 6) is an assumed-known heart word, so it is allowed without re-preview."

---

## Part 6 — Spelling (encoding / dictation)

> §5.1 + acceptance criteria: **≥ 6 dictation words (target + prerequisite review) + ≥ 2 dictation sentences** (`LESSON_PART6_DICTATION_TARGET_REVIEW`).

**Kid view (tutor reads aloud; kid writes)**
> **Spelling**
> Listen, then write each word.
> 1. cake  2. made  3. lake  4. game  5. ran  6. hand
> Now write the sentence you hear:
> 1. Dave made a cake.
> 2. Jane came to the lake.

**Tutor / design layer**
- `partLabel`: "Spelling"
- `contentJson.dictatedWords`: `["cake","made","lake","game","ran","hand"]` — **4 target a_e + 2 prerequisite review** (`ran`, `hand`). The fixture proves target + prerequisite directly; no future swap required.
- `contentJson.dictatedSentences`: `["Dave made a cake.","Jane came to the lake."]` — both target-loaded.
- Re-teach hook (§5.9): if kid omits silent-e (`cake → "cak"`), fire `SPELLING_OMISSION`. Kid-facing re-teach copy: *"You wrote 'cak.' The quiet e helps the a say its name — let's add it back: cake."* (plain spelling, no notation).

---

## Part 7 — Reading a story (controlled connected text · 59 words)

> §5.8: **mechanically audited.** Every word maps to target / prerequisite / previewed-or-assumed heart. Zero unpreviewed non-target words. Phase 3 band = 45–80 words. §5.10: Listen-first vs. Read-on-own.

> **Fixture boundary (important for Codex):** this story represents an **already-approved `Passage` row** in PR #35's pool. The PR #36 generator **selects** it from the approved pool and **re-audits** it against this lesson's daily target. The generator must **not** create or hardcode this passage text during lesson generation.

**Kid view**
> **Reading a story**
> _Choose one:_ **Buddy reads it to you** · **You read it out loud**
>
> **Dave's Cake**
>
> Dave has a cake. The cake is a gift to Jane. Jane came to the lake. Dave gave Jane the cake at the gate. "I made this cake," said Dave. Jane ate the cake. "This cake is the same as that cake," said Jane. They gave a big wave. Dave and Jane had fun. The lake was the best.

**Tutor / design layer — Story Content Audit (59 words)**
- **target (a_e):** Dave×4, cake×7, made, came, gave×2, gate, ate, same, wave, lake×2, Jane×5 → high target density.
- **prerequisite:** has, is, gift, at, this, that, as, big, and, had, fun, best.
- **heart — previewed this lesson (Part 4):** said×2, was, they.
- **heart — assumed known:** I, a, the, to.

> Each token has exactly one `WordAudit.category`. Canonical HFW (`a`, `the`, `to`, `I`) classify as `heart` (assumed-known) by classifier precedence — so they appear **only** in the assumed-known bullet, never also under prerequisite.
- **unclassified:** 0 ✅
- **blocked-pattern violations:** 0 ✅ (no i_e/o_e/u_e/e_e/ai/ay/oa/ee; no r-controlled — `are`, `for`, `day` all kept out)
- `decodabilityScore`: 1.0 → passes phase threshold (0.95).
- **Heart-word gate:** `heartWordsUsedInConnectedText \ heartWordsAssumedKnown = {said, was, they} ⊆ heartWordsPreviewedThisLesson {said, was, they}` ✅
- `connectedTextMode`: tracked `INDEPENDENT` (Read on my own) vs `ASSISTED` (Buddy reads first); never aggregated.

---

## Part 8 — Talk about it (comprehension & language extension)

> §5.1: 3–5 questions, **open-ended, not yes/no** (`LESSON_PART8_OPEN_ENDED`).

**Kid view**
> **Talk about it**
> 1. Why did Dave make the cake?
> 2. What did Jane do when Dave gave her the cake?
> 3. Tell me what happened at the lake, in your own words.
> 4. What is something *you* would make for a pal?

**Tutor / design layer**
- `partLabel`: "Talk about it"
- Q1–Q2 text-based (recall); Q3 retell-for-prosody; Q4 language extension to the student's life.
- `designNotes`: "All open-ended. No yes/no stems (Did/Do/Does/Is/Was/Were/Are/Can/Could/Will/Would/Should/Has/Have/Had/May/Might). Q4 builds expressive language, not decoding."

---

## Mechanical audit summary (every gate PASSES — this is a golden fixture)

| Check | Severity | Result |
|---|---|---|
| 8 parts, prescribed order | BLOCKER | ✅ |
| Daily target narrow (one pattern) | — | ✅ `a_e` only |
| `LESSON_PART1_NO_TARGET_PATTERN` (15 words) | BLOCKER | ✅ zero a_e in warm-up |
| `LESSON_PART2_DEMO_MINIMAL_PAIRS` / no slash notation | BLOCKER | ✅ em-dash, minimal pairs |
| `LESSON_PART3_CONTRASTIVE_STRUCTURE` | BLOCKER | ✅ L1–L4 present |
| `LESSON_PART3_REAL_WORD_COUNT` (15–20) | BLOCKER | ✅ 20 |
| `LESSON_PART3_PSEUDOWORD_COUNT` (8–10) | BLOCKER | ✅ 8 |
| `LESSON_PART3_PSEUDOWORD_CLEAN` | BLOCKER | ✅ a_e only, no real-word homophones |
| `LESSON_HEART_WORDS_PREVIEWED` (bucketed) | WARNING | ✅ used\assumed ⊆ previewed |
| `LESSON_PART5_NO_RCONTROLLED` | BLOCKER | ✅ `for` removed |
| `LESSON_ENCODING_MINIMUM_ITEMS` / `_DICTATION_TARGET_REVIEW` | BLOCKER | ✅ 6 words (4 target + 2 prereq) + 2 sentences |
| `LESSON_PART7_*` (approved, re-audited, decodable) | BLOCKER | ✅ 0 unclassified, 0 blocked, score 1.0 |
| `LESSON_PART8_OPEN_ENDED` | WARNING | ✅ no yes/no |
| `LESSON_TRANSFER_CHAIN_INTACT` (§5.2) | BLOCKER | ✅ read→spell→connected text→discuss |
| Kid-view linter (no notation / phase codes) | BLOCKER | ✅ all kid copy plain-language |

**Sign-off status:** No open product decisions remain. Kid-facing label `a_e words` is resolved per §5.12 (see ✅ note at top). Every part passes its gates. Ready for ChatGPT Pro → Codex once the spec's Part 7 token-categorization and linter tests are in (done in v3 of the spec).
