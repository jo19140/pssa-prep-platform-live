# PR #38 Worked Artifact — Content Parameterization (Phase 3 Entry: i_e / o_e / u_e / e_e)

**Status:** Sign-off artifact for PR #38. Every passage, decoding line, sentence, and dictation set below was validated by running the **real `classifyPassageWords`** (merged `main`) with each target's actual seed `allowed`/`blocked` pattern codes — decodability 1.000, zero unclassified, zero blocked. Each passage **also** passes the full PR #34 `runPassageQualityAudit` quality gate: `uniqueSentenceRatio === 1.0`, zero `repeatedSentences`, zero `repeatedTrigrams`. Approve the content + the architecture, then Codex wires it in.

> **Two things `classifyPassageWords` alone does NOT catch — both verified separately here:** (1) the **quality gate** (repeated trigrams/sentences) — the original o_e passage failed on a repeated `"to the cove"` trigram and was fixed; (2) the **minimal-pair / contrastive-structure** pedagogy of Part 2 demo pairs and Part 3 L2 (a non-minimal pair like `got→note` classifies fine but violates the rule). Both are corrected below, but the Codex spec still mandates running the **full** `auditGeneratedLessonDraft` + spec-conformance stack against all five targets — classifier validation is necessary, not sufficient.

> **Scope.** PR #38 removes the a_e content hardcoding from the lesson-part generators and makes all five Phase 3 Entry targets data-driven, then runs the full PR #36 gate stack + spec-conformance test against all five. It does **not** add review-queue UI or lesson runtime, and does **not** introduce LLM content generation (the per-target content here is the deterministic/mock fixture; real LLM generation is a later spec).

---

## 1. Feasibility finding — all four targets are authorable; e_e is the constrained one

The gating risk was whether decodable, gate-passing content exists for the non-a_e targets. It does. Validated passages:

| Target | Passage words | Decodability | Unique target words | Result |
|---|---:|---:|---:|---|
| i_e | 50 | 1.000 | 9 | ✅ |
| o_e | 56 | 1.000 | 10 | ✅ |
| u_e | 50 | 1.000 | 8 | ✅ |
| e_e | 52 | 1.000 | 7 | ✅ |

**e_e caveat (real, surfaced):** single-syllable e_e words are scarce (`eve, gene, scene, theme, these, Pete, Steve`). e_e content leans on **multisyllable Latinate words** (`compete, complete, delete, concrete, extreme, athlete`) and **names** (`Pete, Steve`), all of which classify correctly as e_e. Clean closed→e_e **minimal pairs are limited to ~3** (`pet→Pete`, `them→theme`, `met→mete`) vs. 4 for the other targets. No mechanical gate requires more, so this is acceptable — but it's a genuine pedagogical constraint worth your eye.

**Authoring constraints discovered (these become hard rules for the content + any future LLM generator):**
1. **Names must match the target or an allowed pattern, never a blocked one.** `Pete` (e_e) is blocked in o_e/u_e lessons — caught by the audit. Use target-matching names per target (`Mike`/i_e, `Rose`+`Cole`/o_e, `June`+`Luke`/u_e, `Pete`+`Steve`/e_e).
2. **No open-syllable function words** (`by, my, you, be, we, he, she, so, no, go, also, too`) — the classifier can't place them; they read as unclassified.
3. **No r-controlled or out-of-inventory digraphs** (`for, are, hear, here, play→ay, day→ay, quit→qu`).
4. **No inflections on target VCe words** (`likes, rides, riding`) — the classifier matches whole tokens; use base forms.

---

## 2. Validated content per target

`L1` = seed `exampleWords`; `L4` = seed `exampleNonwords` (PR #37, already clean). Heart words: previewed `[said, was, they]`, assumed-known `[I, a, the, to]` (shared canonical set). All other lists below validated against the classifier.

### i_e
- **Demo pairs (closed → i_e):** pin→pine, kit→kite, rid→ride, fin→fine
- **Part 3 L2 (contrast):** pin pine kit kite rid ride fin fine
- **Part 3 L3 (cumulative):** ran lake hand bike fast mine desk
- **Part 5 sentences:** "Mike has a bike." · "The bike is white." · "Mike can ride to the lake." · "Jane has the same bike." · "\"I like this bike,\" said Mike." · "They ride and smile."
- **Part 6 dictation:** bike, ride, fine, mine, ran, hand · "Mike has a bike." · "Jane can ride."
- **Vocabulary (meaning preview):** bike, ride
- **Part 7 passage:** *Mike has a fine bike. The bike is white. Mike can ride the bike. Mike will ride to the lake. Jane came to ride. "I like this bike," said Mike. Jane has a bike of the same size. They ride and smile. It was a fine time at the lake.*

### o_e
- **Demo pairs (closed → o_e):** not→note, rob→robe, cod→code, hop→hope *(was `got→note`; `got→note` is not a minimal pair — `not→note` is)*
- **Part 3 L2:** not note rob robe cod code hop hope
- **Part 3 L3:** ran lake hand home fast mole desk
- **Part 5 sentences:** "Rose has a home." · "The home has a stone gate." · "Rose woke and rode to the cove." · "Cole came to the cove." · "\"I hope to ride,\" said Rose." · "A mole dug a hole."
- **Part 6 dictation:** home, rode, note, hope, ran, hand · "Rose has a home." · "Cole rode to the cove."
- **Vocabulary:** stone, cove
- **Part 7 passage** *(fixed: broke the repeated `"to the cove"` trigram → quality gate passes)*: *Rose has a home. The home has a stone gate. Rose woke and rode to the cove. Cole came to the home. The cove has a big stone. Rose and Cole sat on the stone. A mole dug a hole. "I hope this home is nice," said Rose. It was a fine time at the cove.*

### u_e
- **Demo pairs (closed → u_e):** cub→cube, tub→tube, cut→cute, hug→huge
- **Part 3 L2:** cub cube tub tube cut cute hug huge
- **Part 3 L3:** ran lake ride mule fast home desk
- **Part 5 sentences:** "June has a cute mule." · "The mule is huge." · "June can ride the mule." · "Luke came to hum a tune." · "\"I like this mule,\" said June." · "The mule ate a prune."
- **Part 6 dictation:** mule, tune, cute, cube, ran, hand · "June has a mule." · "Luke can hum a tune."
- **Vocabulary:** mule, flute
- **Part 7 passage:** *June has a cute mule. The mule is huge. June can ride the mule. June will hum a tune. Luke came to the mule. "I like this cute mule," said June. The mule ate a prune. They sat in the shade. Luke has a flute. It was a fine tune.*

### e_e
- **Demo pairs (closed → e_e, limited set):** pet→Pete, them→theme, met→mete
- **Part 3 L2 (6 words — only 3 clean e_e minimal pairs exist; do NOT pad with non-minimal pairs):** pet Pete them theme met mete *(dropped the non-minimal `hem→scheme` filler)*
- **Part 3 L3:** ran lake ride home scene Pete desk
- **Part 5 sentences:** "Pete will compete." · "Steve has these." · "The scene is set." · "Pete and Steve will not stop." · "\"I can compete,\" said Pete." · "They will complete the game."
- **Part 6 dictation:** theme, scene, Pete, these, ran, hand · "Pete will compete." · "Steve has a theme."
- **Vocabulary:** scene, theme
- **Part 7 passage:** *Pete will compete. Steve will compete. Pete has these. Pete has a theme. The scene is set. Pete and Steve will not stop. They will complete the game. Pete will make a plan. Steve will help Pete. "I can compete," said Pete. Steve gave Pete a note. It was a fine scene.*

### Comprehension questions (Part 8, open-ended — not classifier-gated)
- **i_e:** Why does Mike like his bike? · What did Jane do at the lake? · Tell me what happened at the lake in your own words. · What would you ride to a lake?
- **o_e:** Why did Rose go to the cove? · What did the mole do? · Tell me about Rose's home in your own words. · What is a place you would like to visit?
- **u_e:** What can June's mule do? · Why does June like the mule? · Tell me what happened with the mule in your own words. · What instrument would you want to play?
- **e_e:** What are Pete and Steve going to do? · What did Steve give Pete? · Tell me what happened in your own words. · What is something you would like to compete in?

---

## 3. Architecture (the sign-off decision)

Introduce **`lib/content/phase3EntryLessonContent.ts`** — a per-target content map keyed by daily-target code, holding everything above (`demonstrationPairs`, `contrastiveLine2`, `contrastiveLine3`, `sentences`, `dictatedWords`, `dictatedSentences`, `comprehensionQuestions`, `heartWordsPreviewedThisLesson`, `heartWordsAssumedKnown`, `vocabulary`, `mockPassageText`, **`mockPassageTitle`**). Migrate the existing **a_e** content into this map too, so a_e is data-driven on the same path (this is the "remove a_e hardcoding" requirement).

**Per-target passage titles** (kid-visible — store explicitly, do NOT derive ad hoc; each uses only target-pattern words so it's audit-safe):

| Target | `mockPassageTitle` |
|---|---|
| a_e | Dave's Cake *(unchanged — Rule 0)* |
| i_e | Mike's Bike |
| o_e | Rose's Home |
| u_e | June's Mule |
| e_e | Pete and Steve |

The part generators (`part2Concept`, `part3Decoding`, `part4HeartVocab`, `part5Sentences`, `part6Encoding`, `part7ConnectedText`, `part8Comprehension`) and `buildLessonGeneratorContext` read from this map by `ctx.dailyTarget.code` instead of their current hardcoded a_e constants. Part 1 warm-up stays shared/target-agnostic (closed-syllable words never match any X_e pattern, so it's valid for all five). `ensureMockApprovedPassage` seeds an approved mock passage per target from `mockPassageText`.

**Sign-off question for Jonathan:** approve (a) the per-target content above and (b) the content-map architecture (one data module, generators read from it, a_e migrated in). Approve the e_e approach (multisyllable + names, ~3 minimal pairs) specifically. Then the Codex spec is mechanical wiring + per-target seeding + running the gate stack against all five.
