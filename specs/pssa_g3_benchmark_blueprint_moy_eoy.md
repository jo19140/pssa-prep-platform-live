# Grade 3 PSSA Diagnostic — Benchmark 2 (MOY) & Benchmark 3 (EOY) Blueprint + Content/EC Matrix

**Status:** Blueprint lock (pre-authoring). No passages or items authored in this document.
**Date:** 2026-06-18
**Owner:** Jonathan
**Scope decision:** MOY fully specified now. EOY length/item-load targets documented as **constraints** only — EOY content is **not** authored in this push (author MOY → gate → review → approve → *then* author EOY).
**Predecessor:** Benchmark 1 (BOY) — `pde-ela-diagnostic-stamina-2025-g3-v1`, complete and on `main`.

---

## 0. Purpose & invariants

This blueprint locks the **content requirements** for the two remaining Grade 3 stamina benchmarks before any passage is written. It is the gate that the mock-before-Codex rule requires: author nothing until the EC distribution, point structure, and section plan are settled on paper.

Three invariants hold across all three benchmarks:

1. **The forms are designed for raw-score comparability through a common blueprint.** Operational item structure is held constant (20 reading MCQ + 9 conventions + 2 EBSR + 2 TE + 2 short-answer = 35 items / 45 pts), and only reading load and analytics-only volume escalate. Note the limit: equal point totals and matching blueprints improve comparability, but different secure items may differ in difficulty. **Formal growth claims and shared readiness cut scores require calibration or equating using student-response data** — they do not follow from the matching blueprint alone. This matters here precisely because we (correctly) forbid any repeated passage or item across forms.
2. **No content reuse across benchmarks.** MOY shares no passage or item with BOY. EOY shares no passage or item with BOY *or* MOY. This is product-critical (diagnostic-secure pool) and is enforced as a build constraint, not a soft preference.
3. **Two scoring buckets** (`operational` and `analytics_only`) — see §5. Analytics-only items are graded and reported to teachers but never touch the 45-point operational total or the readiness bands, and are never identified to students during testing.

---

## 1. Baseline — Benchmark 1 (BOY), for reference

| Property | BOY value |
|---|---|
| Blueprint version | `pde-ela-diagnostic-stamina-2025-g3-v1` |
| Candidate pool | 39 items (37 original approved + 2 added TE) |
| Selected (assembled) | 35 items |
| Operational points | 45 |
| Sections | 3 |
| Passage units / raw passages | 4 units / 5 raw |
| Reading words | ~3,119 |
| Analytics-only items | 0 |

MOY and EOY keep the **same 35-item / 45-point operational core** and the **same 4-unit / 5-raw-passage shape**, then add a graded analytics-only layer and escalate reading load.

---

## 2. Operational core (identical for MOY and EOY)

This is the comparability backbone. BOY, MOY, and EOY share the same **35-item / 45-point item-type structure**. MOY and EOY target an **18 / 18 / 9** A/B/D category-point split; **BOY remains within the allowed category ranges (≈ A 19 / B 17 / D 9) but is not category-point-identical.** The item-type mix and total are constant; the A/B point balance is harmonized at MOY/EOY but not retrofitted onto BOY.

| Slot | Items | Pts each | Pts | Notes |
|---|---|---|---|---|
| Reading MCQ (1-pt) | 20 | 1 | 20 | single-answer 4-option |
| Conventions (1-pt) | 9 | 1 | 9 | Category D; **9 standalone conventions items** (matches the locked BOY form design — not in-passage) |
| Multipoint | 4 | 2 or 3 | 10 | **2 EBSR @ 2 pts + 2 TE @ 3 pts.** EBSR and TE are both multipoint but are distinct item types. |
| Short answer | 2 | 3 | 6 | constructed response, 3/2/1/0 rubric |
| **Operational total** | **35** | — | **45** | |

**Category point split (operational):**

| Reporting category | Items | Points | PDE range |
|---|---|---|---|
| A — Literature (narrative + drama) | 13 | 18 | 15–21 ✔ |
| B — Informational (single + paired) | 13 | 18 | 15–21 ✔ |
| D — Conventions | 9 | 9 | 9 ✔ |

Multipoint allocation: 1 EBSR (2pt) + 1 TE (3pt) in Category A; 1 EBSR (2pt) + 1 TE (3pt) in Category B. One short-answer in A, one in B. **Every multipoint/TE item must rely only on text(s) within one passage unit assigned to one section. A paired passage group counts as one unit.** (So the paired-informational EBSR legitimately spans P3's two raw texts; what is forbidden is an item depending on texts that sit in *different* sections.)

---

## 3. Benchmark 2 — MOY (mid-year), full specification

### 3.1 Form-level summary

| Property | MOY value |
|---|---|
| Blueprint version | `pde-ela-diagnostic-stamina-2025-g3-moy-v1` |
| Passage units / raw passages | 4 units / 5 raw (paired info = 2 raw) |
| Operational items / points | 35 / 45 |
| Analytics-only items / points | 5 / 8 (reported separately) |
| **Total student-facing items** | **40** |
| Target reading words | 3,380–3,550 (planned **3,465**) |
| Sections | 3 (untimed; multiple sittings supported) |
| Content reuse | none with BOY |

### 3.2 Passage plan

| # | Passage unit | Genre / category | Target words | Planned |
|---|---|---|---|---|
| P1 | Informational single | B | 670–700 | 685 |
| P2 | Literary narrative | A | 860–900 | 880 |
| P3 | Paired informational (2 raw texts) | B | 775–825 combined | 800 |
| P4 | Drama / play | A | 1,075–1,125 | 1,100 |
| | **Total** | | **3,380–3,550** | **3,465** |

Category A reading lives in P2 (narrative) + P4 (drama). Category B reading lives in P1 (info single) + P3 (paired info). The paired unit (P3) is the natural home for the cross-text compare/contrast EC (E03.B-C.3.1.2).

### 3.3 Operational EC distribution — Category A (literary: P2 + P4)

13 items / 18 pts. Reading-MCQ repeats ≤ 2; no EC exceeds 3 across the whole form. Both Category-A multipoint items are **single-passage-unit-valid** (drama EBSR + narrative TE) — see note below.

| EC | Skill | MCQ | Multipoint | SA | EC total |
|---|---|---|---|---|---|
| E03.A-K.1.1.1 | Ask/answer w/ explicit text evidence | 2 | — | — | 2 |
| E03.A-K.1.1.2 | Central message / lesson / moral | 2 | — | 1 SA (3pt) | 3 |
| E03.A-K.1.1.3 | Character traits/motivation → events | 1 | 1 EBSR (2pt, P4 drama) + 1 TE matching grid (3pt, P2 narrative) | — | 3 |
| E03.A-C.2.1.1 | Point of view (1st vs 3rd person) | 1 | — | — | 1 |
| E03.A-V.4.1.1 | Word meaning (context/affix/root) | 2 | — | — | 2 |
| E03.A-V.4.1.2 | Word relationships / nonliteral | 2 | — | — | 2 |
| **A subtotal** | | **10** | **2** | **1** | **13 items / 18 pts** |

> **Cross-text TE conflict resolved (fix #1).** The earlier draft placed a 3-pt matching grid on **E03.A-C.3.1.1** (compare themes/settings/plots), which *requires two literary texts*. But P2 (narrative) and P4 (drama) sit in different, separately-locked sections, so a student cannot hold both texts at once. Per the recommendation, the EC was changed rather than the section layout: the 3-pt TE is now a **single-passage-unit character matching grid on E03.A-K.1.1.3** (match each character to trait/motivation/evidence within P2). The EBSR (also A-K.1.1.3) stays on P4 and probes a different surface (motivation → action), so the two multipoint items remain pedagogically distinct. **E03.A-C.3.1.1 (literary cross-text comparison) is a real Grade 3 literary EC, but it is structurally unassessable in the current 4-unit layout** — it requires two literary texts co-located in *one* section, and both MOY and EOY (as planned) keep the narrative and drama in separate sections. It is therefore **out of scope for this layout** (not "deferred to EOY," which would falsely imply EOY assesses it). It would only become assessable in a future form that co-locates two literary passages in one section. Cross-text comparison is still assessed informationally via E03.B-C.3.1.2 on the paired unit.

### 3.4 Operational EC distribution — Category B (informational: P1 + P3)

13 items / 18 pts.

| EC | Skill | MCQ | Multipoint | SA | EC total |
|---|---|---|---|---|---|
| E03.B-K.1.1.1 | Answer w/ explicit text evidence | 1 | — | — | 1 |
| E03.B-K.1.1.2 | Main idea + key details | 2 | 1 (matching grid, 3pt) | — | 3 |
| E03.B-K.1.1.3 | Sequence / cause-effect relationships | 1 | — | 1 (3pt) | 2 |
| E03.B-C.2.1.1 | Point of view (informational) | 1 | — | — | 1 |
| E03.B-C.2.1.2 | Text features / search tools | 1 | — | — | 1 |
| E03.B-C.3.1.1 | Logical connection sentences/paras | 1 | — | — | 1 |
| E03.B-C.3.1.2 | Compare/contrast two texts (paired) | 1 | 1 (EBSR, 2pt) | — | 2 |
| E03.B-C.3.1.3 | Info from illustrations/maps + words | 1 | — | — | 1 |
| E03.B-V.4.1.1 | Word meaning (informational) | 1 | — | — | 1 |
| **B subtotal** | | **10** | **2** | **1** | **13 items / 18 pts** |

### 3.5 Operational EC distribution — Category D (conventions)

9 items / 9 pts, 9 distinct ECs (no repeats).

| EC | Skill |
|---|---|
| E03.D.1.1.1 | Function of nouns/pronouns/verbs/adj/adv |
| E03.D.1.1.4 | Regular & irregular verbs |
| E03.D.1.1.5 | Simple verb tenses |
| E03.D.1.1.6 | Subject-verb & pronoun-antecedent agreement |
| E03.D.1.1.8 | Coordinating & subordinating conjunctions |
| E03.D.1.2.1 | Capitalize words in titles |
| E03.D.1.2.3 | Commas & quotation marks in dialogue |
| E03.D.1.2.5 | Conventional spelling / suffixes |
| E03.D.2.1.1 | Choose words/phrases for effect |

### 3.6 Analytics-only layer (MOY) — 5 items / 8 pts

Graded, saved, reported to teachers; **excluded** from the 45-pt total and readiness bands; not identified to students. Principle: **expand EC coverage** — target ECs that are light or absent in the operational set, never pile onto already-heavy ECs.

| Item | Type | Pts | EC | Host passage (§3.7 section) | Why (coverage rationale) |
|---|---|---|---|---|---|
| AO-1 | Reading MCQ | 1 | E03.B-V.4.1.2 | **P3** paired info (S2) | Word relationships (info) — **absent** operationally |
| AO-2 | Reading MCQ | 1 | E03.A-V.4.1.2 | **P4** drama (S1) | Figurative / nonliteral language in the drama — a genuine drama fit; **deepening, not expanding** (see note) |
| AO-3 | Reading MCQ | 1 | E03.B-C.2.1.1 | **P3** paired info (S2) | POV (informational) — only 1 operational |
| AO-4 | EBSR | 2 | E03.B-C.3.1.1 | **P3** paired info (S2) | Logical connections — only 1 operational |
| AO-5 | Three-point TE | 3 | E03.B-C.3.1.3 | **P1** info single (S3) | Info from illustration/map + text — only 1 operational; drag-drop matching map/graphic features to text statements |
| **Total** | | **8** | | | 3 MCQ + 1 EBSR + 1 three-pt TE ✔ |

Host-passage bindings are fixed: **AO-1, AO-3, AO-4 → P3** (paired informational, S2); **AO-5 → P1** (informational single, S3); **AO-2 → P4** (drama, S1). Codex must not reassign host passages.

> **AO-2 retarget — verified constraint (fix #2).** The requested target, `E03.A-C.2.1.2`, **does not exist in our authoritative G3 crosswalk** (`data/pssa/anchor_ec_crosswalk.csv`). Grade 3 ELA has **seven** literature ECs — A-K.1.1.1/2/3, **A-C.2.1.1** (POV), **A-C.3.1.1** (cross-text comparison), and A-V.4.1.1/2 — and the only single-text craft EC is A-C.2.1.1 (POV); there is no coded EC for "scene / stage direction contributes to a play" at Grade 3 (that CCSS skill, RL.3.5, is not PA-eligible content). The original concern is valid: **A-C.2.1.1 (first- vs third-person narration) is a poor fit for a play**, so it was removed from the drama-section analytics slot. The two light/absent literary ECs are A-C.2.1.1 (count 1, POV — poor drama fit) and A-C.3.1.1 (count 0, but requires two co-located literary texts → not valid on a single drama). **Neither is a valid drama-section target**, so the analytics layer can only *deepen* an already-used literary EC here. The best genuinely drama-appropriate literary target is **E03.A-V.4.1.2 (figurative / nonliteral language)** — idioms and expressions in a play's dialogue are a natural, commonly-assessed drama skill. This is one **documented exception** to the strict "operational count ≤ 1" rule: A-V.4.1.2 is at operational count 2, so AO-2 deepens rather than broadens. It keeps the analytics distribution at the desired **S1 = 1 / S2 = 3 / S3 = 1** and the delivered section totals unchanged. POV (A-C.2.1.1) remains assessed operationally at count 1 on the narrative (P2), where first-/third-person narration is valid.

The other four analytics-only ECs are at operational count **≤ 1** (B-V.4.1.2 = 0; B-C.2.1.1, B-C.3.1.1, B-C.3.1.3 = 1), so they genuinely broaden coverage. (Earlier fix: AO-5 was retargeted off E03.B-K.1.1.3, which was already at operational count 2.)

### 3.7 Section plan (MOY)

Three sections; untimed. Conventions split across the two passage-bearing "conventions+reading" sections, mirroring BOY's pattern. Operational points sum to 45; analytics-only items are distributed but tracked separately.

> **Sittings (fix #3 — advisory, not enforced).** The form supports multiple sittings. Administering no more than two sections in one day is *recommended*, but **no date-based or maximum-sections-per-day enforcement is part of this blueprint.** Scheduling is left to the administering teacher/school.

| Section | Passage unit(s) | Reading words | Conv (pts) | Op reading items | Op pts (sect) | Analytics-only | SA placement | Multipoint placement |
|---|---|---|---|---|---|---|---|---|
| **S1** — conventions + drama | P4 Drama | ~1,100 | 5 | 6 | 12 | AO-2 | — | A: EBSR (A-K.1.1.3, 2pt) |
| **S2** — literary + paired-info | P2 Narrative + P3 Paired info | ~1,680 | 0 | 13 | 18 | AO-1, AO-3, AO-4 | 1 SA (A: A-K.1.1.2, in P2) | A: TE grid (A-K.1.1.3, 3pt, P2); B: EBSR (B-C.3.1.2, 2pt, P3) |
| **S3** — conventions + info | P1 Info single | ~685 | 4 | 7 | 15 | AO-5 | 1 SA (B: B-K.1.1.3, in P1) | B: TE grid (B-K.1.1.2, 3pt) |
| **Total** | 4 units / 5 raw | **~3,465** | **9** | **26** | **45** | **5** | 2 | 4 |

Per-section operational math: S1 = 5 conv + 5 MCQ + 1 EBSR(2) = **12 pts** · S2 = 10 MCQ + TE(3) + EBSR(2) + 1 SA(3) = **18 pts** · S3 = 4 conv + 5 MCQ + TE(3) + 1 SA(3) = **15 pts**. Operational items: 11 + 13 + 11 = 35 ✔. Operational points: 12 + 18 + 15 = 45 ✔.

**Delivered section totals (operational + analytics-only) — what a student actually sees:**

| Section | Operational items | Analytics-only | **Total items** | Operational pts | Analytics pts |
|---|---:|---:|---:|---:|---:|
| S1 | 11 | 1 | **12** | 12 | 1 |
| S2 | 13 | 3 | **16** | 18 | 4 |
| S3 | 11 | 1 | **12** | 15 | 3 |
| **Total** | **35** | **5** | **40** | **45** | **8** |

> **Approved imbalance.** Section 2 is a deliberate stamina spike — **~1,680 reading words and 16 delivered items**, materially heavier than S1/S3 (~12 items each). This is intentional and **explicitly approved** as the mid-year endurance block, not an artifact to be balanced away. Sitting recommendation (not a blueprint constraint), consistent with **sequential section-gated delivery** (sections must be taken in order S1 → S2 → S3): **Sitting 1 — S1. Sitting 2 begins with S2; S3 follows after a break or in a third sitting.** S2 cannot be isolated after S3, because the gating delivers sections in order.

---

## 4. Benchmark 3 — EOY (end-of-year) — **constraints only (do not author yet)**

EOY is the longest full-rehearsal form. Its structure is locked here so MOY authoring can guarantee non-overlap, but **no EOY passage or item is authored until MOY is approved.** The atomic per-item EC assignment for EOY is finalized at MOY sign-off (so EC choices can be balanced against whatever MOY actually consumes).

> **Framing (fix #7).** EOY's 10 analytics-only items are our **full platform analytics-only load, designed to approximate full PSSA-style seat time** for end-of-year rehearsal. This is a product target — it is **not** a verified count of official PSSA field-test items. The number is chosen to round out EC coverage and build endurance, not to mirror an official field-test volume.

### 4.1 Form-level constraints

| Property | EOY value |
|---|---|
| Blueprint version (planned) | `pde-ela-diagnostic-stamina-2025-g3-eoy-v1` |
| Passage units / raw passages | 4 units / 5 raw |
| Operational items / points | 35 / 45 (**identical core** — comparability) |
| Analytics-only items / points | 10 / 16 (reported separately) |
| **Total student-facing items** | **45** |
| Target reading words | 3,550–3,700 (planned **3,624**) |
| Content reuse | none with BOY **or** MOY |

### 4.2 Passage targets (EOY)

| Passage unit | Category | Target words | Planned |
|---|---|---|---|
| Informational single | B | 700–725 | 712 |
| Literary narrative | A | 900–950 | 925 |
| Paired informational (2 raw) | B | 825–875 combined | 850 |
| Drama / play | A | 1,125–1,150 | 1,137 |
| **Total** | | **3,550–3,700** | **3,624** |

### 4.3 Operational EC distribution (EOY)

Same 35/45 core as §2: 20 MCQ + 9 conventions + 4 multipoint (2×2pt + 2×3pt) + 2 SA; A=13/18, B=13/18, D=9/9; reading-MCQ repeats ≤2; no form EC >3. Atomic EC-by-item table is locked at MOY sign-off to keep the EOY EC profile complementary to (not a clone of) MOY.

### 4.4 Analytics-only layer (EOY) — 10 items / 16 pts

| Mix | Count | Pts |
|---|---|---|
| Reading MCQ | 6 | 6 |
| EBSR | 2 | 4 |
| Three-point TE | 2 | 6 |
| **Total** | **10** | **16** |

Same principle: expand/round out EC coverage (esp. the lightest operational ECs and any A/B vocabulary or craft EC under-sampled at MOY); never overload heavy ECs.

---

## 5. Scoring rule — two buckets

Both buckets are **graded and stored**. They differ only in what they feed.

| | `operational` | `analytics_only` |
|---|---|---|
| Graded | yes | yes |
| Saved & reported to teachers | yes | yes |
| Counts toward 45-pt diagnostic score | **yes** | **no** |
| Feeds readiness / growth bands | **yes** | **no** |
| Identified to students during testing | no | **no** |

Implementation note: `operational` vs `analytics_only` is a **role an item plays within a particular form**, not a permanent property of the bank item. The bank item keeps its content-model tag `exposurePolicy: instructional | diagnostic_secure`; the bucket lives on the **form membership row — `PssaFormItem.scoringBucket: operational | analytics_only`** — so the same secure item could (in principle) be operational on one form and analytics-only on another without re-tagging the bank. Readiness/growth math filters on `PssaFormItem.scoringBucket === "operational"`. Analytics-only results render in a separate, clearly-labeled teacher view — *signal for us and for differentiation*, not part of the comparable score. This is the Phase 4A capability that must exist before MOY can be delivered (BOY has zero analytics-only items, so the bucket has never been exercised).

---

## 6. EC-distribution requirements (acceptance gates for authoring)

These are hard checks the authored forms must pass:

1. **Operational reading-MCQ EC repeats ≤ 2** (preferred). Surfaced per form as a count-by-EC table.
2. **No EC exceeds 3.** At MOY: **operational ECs at 3 = three** (E03.A-K.1.1.2, E03.A-K.1.1.3, E03.B-K.1.1.2). **Delivered ECs at 3 = four** — the same three plus **E03.A-V.4.1.2** (2 operational + 1 analytics-only via AO-2). **None above 3.** Operational and delivered caps are tracked separately; both hold at ≤ 3.
3. **Never mislabel an item to satisfy a gate.** Fix the item to match the EC; never retag the EC to match the item.
4. **Analytics-only items expand coverage** — each analytics-only EC must be at operational count **≤ 1** (lightest operational ECs) or absent operationally. A count of 2 is not eligible **except by an explicit, documented design-review exception** when no light/absent EC in that category is valid for the host passage. (At MOY exactly one such exception exists: AO-2 on E03.A-V.4.1.2 — the only light/absent Grade 3 literary ECs, A-C.2.1.1 and A-C.3.1.1, are not valid on a single drama, so the drama-section literary analytics item can only deepen. No other exception is permitted without the same written justification.)
5. **Every multipoint / TE item is single-passage-unit-valid** — an item may rely only on text(s) within one passage unit assigned to one section; a paired passage group counts as one unit. No item may depend on text in a *different* section (the A-C.3.1.1 cross-text failure mode).
6. **Operational and analytics-only EC distributions reported separately** (the §3.3–3.6 / §4.3–4.4 split).
7. **Item count reported by EC, by reporting category, by passage, and by item type** for each form (the matrices above are the template the authored CSV must reproduce).

### 6.1 Passage-complexity gates (qualitative — not just word count)

Passage progression must measure more than length. Longer passages must remain **Grade 3 appropriate**. Each authored passage is reviewed for:

- vocabulary load
- sentence complexity
- knowledge demands
- text structure
- number of characters / speakers
- qualitative coherence
- readability relative to its genre

**MOY and EOY increase stamina primarily through length and item load, not through an uncontrolled increase in reading difficulty.** A passage that hits its word-count band but spikes in vocabulary or syntactic complexity fails this gate and is revised — word count is necessary but not sufficient.

### 6.2 Answer-choice & distractor quality requirements

Every selected-response item must include answer choices that **diagnose student thinking**, not random or obviously-wrong choices. (BOY already follows this pattern; MOY/EOY must enforce it systematically through metadata and tests.) Every `distractorRole` must be a value in the WS3-A registry — an unregistered role makes the class report throw. See [[reference_distractorrole_registry_invariant]].

**MCQ and conventions**

- Exactly 4 answer choices: 1 correct + 3 plausible distractors.
- Each distractor reflects a *distinct* misconception, e.g.: a true detail that does not answer the question; a detail from the wrong part of the passage; the opposite interpretation; an overly-literal interpretation; an unsupported inference; a vocabulary meaning from the wrong context; a common grammar/punctuation error.
- Each distractor carries: a `distractorRole`; a rationale for why it is wrong; passage evidence when passage-based; a misconception / error-pattern tag.
- Choices are similar in length, grammar, specificity, and style.
- No joke, nonsense, or impossible choices.
- The correct answer is not identifiable by being longer, more detailed, or differently worded.
- Correct-answer positions stay balanced across A/B/C/D (the existing batch position-distribution gate).

**EBSR**

- Part A: 1 correct + 3 plausible distractors.
- Part B evidence choices are all *verbatim* passage excerpts.
- Incorrect Part B choices are: true-but-irrelevant evidence; evidence supporting a Part A distractor; or evidence from the wrong section/passage.
- Part A and Part B distractors align logically.

**Matching-grid & drag-drop**

- Incorrect mappings / placements reflect realistic misunderstandings.
- Each row/token carries a rationale for likely incorrect placements.
- No artificial distractor tokens unless the canonical item format supports them.

**Short answer** (no answer choices) must instead include: a clear 3/2/1/0 rubric; an expected core idea; sample responses at each score level; acceptable evidence examples; and common incomplete/incorrect response patterns.

**Analytics-only items** meet the *same* distractor-quality standards as operational items — they are not lower-quality experimental questions.

### 6.3 Answer-choice gates (machine + human)

- **exact duplicate choices are prohibited.** The semantic **near-duplicate** gate applies to **reading MCQ**. **Conventions** items may use minimal-pair choices when each option differs in the exact convention being tested and carries a distinct error pattern.
- no correct-answer-is-longest giveaway
- no absolute-language giveaway
- no grammar mismatch between stem and options
- every distractor has a unique role and rationale
- every passage-based choice is grounded in the passage
- human review confirms each distractor is plausible but clearly incorrect

---

## 7. Build order (locked)

1. **Lock the MOY + EOY blueprint / content matrices** ← *this document.*
2. **Build Phase 4A** analytics-only scoring + reporting support (`scoringBucket` tag; readiness math filters operational; separate teacher analytics view). Prerequisite for delivering any form with analytics-only items.
3. **Author, gate, review, and approve MOY completely** (detector-first loop: passages → operational items → analytics-only items → assembly → gates → human review → approval).
4. **Only after MOY is approved, author EOY** (atomic EOY EC table finalized first, complementary to MOY).
5. **Do not author both pools simultaneously.**

---

## 8. Verification (this document)

All form-level totals re-checked programmatically after the refinement pass (2026-06-18):

- Operational: 35 items / 45 pts ✔ · Category pts A/B/D = 18/18/9 (sum 45) ✔ · multipoint = 2 EBSR(2pt) + 2 TE(3pt) ✔
- MOY analytics-only: 5 items / 8 pts ✔ · student-facing 40 ✔ · words 3,465 (in 3,380–3,550) ✔
- MOY delivered section totals: S1 12 / S2 16 / S3 12 = 40 ✔
- EOY analytics-only: 10 items / 16 pts ✔ · student-facing 45 ✔ · words 3,624 (in 3,550–3,700) ✔
- MOY operational EC tables sum to 13 (A) + 13 (B) + 9 (D) = 35 ✔; max reading-MCQ EC repeat = 2 ✔; **operational ECs at 3 = three; delivered ECs at 3 = four (adds A-V.4.1.2 via AO-2); none > 3** ✔
- 4 of 5 MOY analytics-only ECs at operational count ≤ 1; 1 documented exception (AO-2 / A-V.4.1.2 — the only light/absent literary ECs aren't drama-section-valid) ✔ · all multipoint/TE single-passage-unit-valid ✔
- EC codes validated against `data/pssa/anchor_ec_crosswalk.csv` via CSV-aware parse (PDE Grade 3 ELA, 2014/2017): **G3 has 7 literature / 10 informational / 16 conventions ECs**; `E03.A-C.2.1.2` confirmed **absent**; `E03.A-C.3.1.1` confirmed **present** (real EC, out of scope for the current layout) ✔

### Changelog (refinement pass 1, 2026-06-18)

1. Resolved the A-C.3.1.1 cross-text TE conflict — 3-pt literary TE moved to single-passage-unit E03.A-K.1.1.3; A-C.3.1.1 ruled **out of scope for this one-literary-text-per-section layout** (see pass 3; not "deferred to EOY").
2. Retargeted AO-5 off E03.B-K.1.1.3 (count 2) → E03.B-C.3.1.3 (count 1).
3. Added delivered section totals (S1 12 / S2 16 / S3 12) and explicitly approved the S2 stamina spike.
4. Softened cross-form comparability to "designed comparability pending calibration/equating."
5. Renamed multipoint to "2 EBSR + 2 TE."
6. Confirmed all 9 conventions items are standalone.
7. Reframed EOY's 10 extras as the full platform analytics-only load (not an official field-test count).
8. Added qualitative passage-complexity gates (§6.1) alongside word-count targets.

### Changelog (refinement pass 2, 2026-06-18)

1. "single-passage-valid" → **"single-passage-unit-valid"** (paired group = one unit) in §2, §6 gate 5, §8 — the paired EBSR legitimately spans P3's two raw texts.
2. AO-2 retargeted off the drama-incompatible E03.A-C.2.1.1 (POV). Requested `E03.A-C.2.1.2` **does not exist** in the G3 crosswalk (verified). Best in-crosswalk drama-valid target = **E03.A-V.4.1.2 (figurative language)**, a documented count-2 deepening exception. Distribution (1/3/1) and delivered totals unchanged; POV stays operational on the narrative. *(Note: this pass originally mis-stated "all 6 literary ECs used operationally"; pass 3 corrected the count to 7 ECs — the operative reason AO-2 deepens is that the light/absent literary ECs A-C.2.1.1 and A-C.3.1.1 aren't drama-section-valid.)*
3. "≤2 sections/day" made **advisory** — no date-based or max-sections-per-day enforcement is part of the blueprint (§3.1, §3.7).

### Changelog (refinement pass 3, 2026-06-18)

1. **Sitting order corrected** to honor sequential section-gating: Sitting 1 = S1; Sitting 2 begins with S2; S3 after a break / in a third sitting (S2 can't be isolated after S3).
2. **EC-at-3 clarified:** operational = three ECs; delivered = four (adds A-V.4.1.2 via AO-2); none > 3.
3. **Crosswalk error corrected (was "six literary ECs"):** CSV-aware re-parse confirms **seven** G3 literary ECs — earlier `awk` mis-split rows with quoted commas and dropped `E03.A-C.3.1.1`. A-C.3.1.1 is a *real* EC but structurally unassessable in the one-literary-text-per-section layout → reframed from "deferred to EOY" to **"out of scope for this layout"** (removes the contradiction). AO-2 deepening rationale corrected accordingly (the light/absent literary ECs simply aren't drama-section-valid).
4. **`scoringBucket` is form-specific** — moved to `PssaFormItem.scoringBucket` (a role within a form), not a permanent bank-item property.
5. **Added §6.2 answer-choice & distractor-quality requirements + §6.3 gates** (every distractor carries a registry `distractorRole` + rationale + misconception tag; analytics-only held to the same bar; SA uses rubric+sample-responses instead of choices). Ties to [[reference_distractorrole_registry_invariant]].

### Changelog (refinement pass 4, 2026-06-18)

1. **Conventions near-duplicate exception** (§6.3) — exact duplicates always prohibited; the semantic near-duplicate gate applies to reading MCQ only; conventions may use intentional minimal-pair choices (each differs in the exact convention + distinct error pattern).
2. **Category-split claim corrected** (§2) — BOY is *not* category-point-identical (≈ A 19 / B 17 / D 9); only the 35-item/45-pt item-type structure is constant. MOY/EOY target the harmonized 18/18/9; BOY stays within ranges.
3. Wording: "never **flagged** to students" → "never **identified** to students" (§0, §3.6), since "flag" also means marking a question for review.
