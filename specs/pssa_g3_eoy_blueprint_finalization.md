# Grade 3 PSSA Diagnostic — Benchmark 3 (EOY) Blueprint Finalization (for review)

**Status:** **APPROVED / LOCKED (2026-06-23)** — independently audited (arithmetic, EC counts, delivered caps, item-type mix, conventions crosswalk all PASS). Passage/item authoring may now begin, one unit at a time (author → audit → merge), starting with **P1**. This finalizes the EOY constraints (locked structure-only in `specs/pssa_g3_benchmark_blueprint_moy_eoy.md` §4) now that **MOY is built + merged on `origin/main` (6420cae)**, with the EOY atomic EC-by-item table made **complementary to what MOY actually consumed**.

**Locked EOY form-level constraints (from §4.1, unchanged):** blueprintVersion `pde-ela-diagnostic-stamina-2025-g3-eoy-v1`; 4 passage units / 5 raw passages; **35 operational / 45 pts** (identical comparability core) + **10 analytics-only / 16 pts**; **45 student-facing items**; **3,550–3,700 words (planned 3,624)**; **no content reuse with BOY or MOY.**

---

## 1. Passage themes (proposed — fresh, varied, zero overlap with BOY/MOY)

Avoided: BOY (maple-syrup process, junk-boat race, owl hunting/farm, animals in a hollow log) and MOY (museum floor-map, bread-baking, mail delivery, school-play rehearsal).

| Unit | Category | Genre | Target words | **Proposed theme** | Why it fits / skill hooks |
|---|---|---|---|---|---|
| P1 | B | Informational single | ~712 | **"How Crayons Are Made"** | Factory **process** text → sequence (B-K.1.1.3), a labeled **process diagram** (melt → mold → wrap) for B-C.3.1.3, headings/labels for B-C.2.1.2. Manufacturing topic — unlike any prior nature/civic theme. |
| P2 | A | Literary narrative | ~925 | **"The Broken Vase"** | A child accidentally breaks something and wrestles with whether to confess; chooses honesty. Clear character arc (A-K.1.1.3), inferred message (A-K.1.1.2 = honesty/owning a mistake), third-person narration (A-C.2.1.1 POV), figurative ("his stomach tied in a knot"). Internal/ethical arc — distinct from MOY's patience-baking and BOY's animal stories. |
| P3 | B | Paired informational (2 raw) | ~850 combined | **"Going to School: Then & Now"** — Text 1 *School Long Ago*, Text 2 *School Today* | Same topic, two angles across **time** → genuine compare/contrast (B-C.3.1.2): shared idea (school helps kids learn) vs differences (one-room vs many rooms; slate vs tablet). Temporal sequence (B-K.1.1.3), POV (B-C.2.1.1). History/society topic — no mail/postal echo. |
| P4 | A | Drama / play | ~1,137 | **"The Borrowed Bike"** | A **neighborhood** drama: a child lends a bike to a friend; it comes back scratched, and the owner is upset and assumes the worst — until they talk and learn what really happened (it wasn't the friend's fault). 3–4 differentiated characters; strong for explicit evidence (A-K.1.1.1 = what happened to the bike), motivation→action (A-K.1.1.3 = the owner confronts; the friend explains), inferred message (A-K.1.1.2 = don't jump to conclusions / talk it out), figurative dialogue (A-V.4.1.2, e.g., "steam came out of his ears"). **Non-school, home/neighborhood setting; a communication/assumptions message** — deliberately distinct from MOY's school-based, pre-event, teamwork drama (and from P3's school topic). |

Varied across **topic** (manufacturing / family-ethics / social-history / neighborhood-communication), **setting**, **text structure** (process / narrative arc / paired temporal compare / dialogue-driven play), and **skill opportunities**.

**P1 process-diagram accessibility (required — same figure-feature path as MOY P1's map):** the crayon process diagram must have (a) **readable text labels** on every stage (no decorative-only labels); (b) **meaningful alt text** and a long description conveying the full process in words; (c) **keyboard-accessible interaction** for the B-C.3.1.3 **matching-grid** analytics (AO-9) — operable without a mouse, reusing the existing matching-grid interaction (no new drag-drop player/route); (d) **no color-only meaning** — every distinction encoded by label/shape/position as well as color, and **no item answerable solely from color**. These carry into the P1 passage package and the AO-9 item spec.

---

## 2. Operational core (35 items / 45 pts) — same item-type structure as MOY; EC profile rebalanced

Item-type mix is the **comparability backbone** (constant BOY→MOY→EOY): **20 reading MCQ + 9 conventions + 4 multipoint (2×2pt EBSR + 2×3pt TE) + 2 SA (3pt)**. Category points **A 18 / B 18 / D 9**. Caps: no EC > 3; reading-MCQ repeats ≤ 2.

**P1 — "How Crayons Are Made" (B, info single, S3) — 7 items / 11 pts**
| # | EC | Type | Pts |
|---|---|---|---|
| 1 | B-K.1.1.1 | MCQ | 1 |
| 2 | B-C.2.1.2 | MCQ | 1 |
| 3 | B-C.3.1.1 | MCQ | 1 |
| 4 | B-V.4.1.1 | MCQ | 1 |
| 5 | B-C.3.1.3 | MCQ | 1 |
| 6 | B-K.1.1.2 | matching grid (TE) | 3 |
| 7 | B-K.1.1.3 | SA | 3 |

**P3 — "Going to School: Then & Now" (B, paired, S2) — 6 items / 7 pts**
| # | EC | Type | Pts |
|---|---|---|---|
| 8 | B-K.1.1.2 | MCQ | 1 |
| 9 | B-C.2.1.1 | MCQ | 1 |
| 10 | B-V.4.1.2 | MCQ | 1 |
| 11 | B-K.1.1.3 | MCQ | 1 |
| 12 | B-C.3.1.2 | MCQ | 1 |
| 13 | B-C.3.1.2 | EBSR (cross-text) | 2 |

**P2 — "The Broken Vase" (A, narrative, S2) — 7 items / 11 pts**
| # | EC | Type | Pts |
|---|---|---|---|
| 14 | A-K.1.1.1 | MCQ | 1 |
| 15 | A-C.2.1.1 | MCQ | 1 |
| 16 | A-V.4.1.1 | MCQ | 1 |
| 17 | A-V.4.1.2 | MCQ | 1 |
| 18 | A-K.1.1.2 | MCQ | 1 |
| 19 | A-K.1.1.3 | matching grid (TE) | 3 |
| 20 | A-K.1.1.2 | SA | 3 |

**P4 — "The Borrowed Bike" (A, drama, S1) — 6 items / 7 pts**
| # | EC | Type | Pts |
|---|---|---|---|
| 21 | A-K.1.1.1 | MCQ | 1 |
| 22 | A-K.1.1.3 | MCQ | 1 |
| 23 | A-V.4.1.1 | MCQ | 1 |
| 24 | A-V.4.1.2 | MCQ | 1 |
| 25 | A-K.1.1.2 | MCQ | 1 |
| 26 | A-K.1.1.3 | EBSR (motivation→action) | 2 |

**Conventions (9 items, S1×5 / S3×4) — items 27–35 (atomic; all 9 ECs verified against `data/pssa/anchor_ec_crosswalk.csv`).** Grade 3 has **16** conventions ECs (D.1.1.1–9, D.1.2.1–6, D.2.1.1). MOY used 9 (D.1.1.1/4/5/6/8, D.1.2.1/3/5, D.2.1.1). EOY uses the **7 not used at MOY** + **2 rotated repeats** (marked ↺), split **5 grammar (D.1.1.x) → S1 / 4 mechanics·spelling (D.1.2.x) → S3**:

| # | EC | Convention (crosswalk text) | Section | Status |
|---|---|---|---|---|
| 27 | E03.D.1.1.2 | Form and use regular and irregular plural nouns | S1 | new (MOY-unused) |
| 28 | E03.D.1.1.3 | Use abstract nouns | S1 | new |
| 29 | E03.D.1.1.6 | Subject-verb & pronoun-antecedent agreement | S1 | ↺ rotated repeat |
| 30 | E03.D.1.1.7 | Comparative/superlative adjectives & adverbs | S1 | new |
| 31 | E03.D.1.1.9 | Produce simple, compound, and complex sentences | S1 | new |
| 32 | E03.D.1.2.2 | Use commas in addresses | S3 | new |
| 33 | E03.D.1.2.3 | Commas & quotation marks in dialogue | S3 | ↺ rotated repeat |
| 34 | E03.D.1.2.4 | Form and use possessives | S3 | new |
| 35 | E03.D.1.2.6 | Spelling patterns & generalizations (word families, syllable patterns, ending rules) | S3 | new |

**2 rotated repeats** = D.1.1.6 (agreement) + D.1.2.3 (dialogue punctuation) — both high-frequency core skills re-tested in fresh EOY contexts; the other **7 are MOY-unused**, so EOY conventions coverage is genuinely complementary. (Same registry-exempt `errorPattern` INLINE_DROPDOWN cloze pattern as MOY conventions — NOT new registry roles. `targetConvention`/`targetSubskill` for the 7 new ECs are descriptive free-form values, finalized at conventions item-authoring.)

**Operational EC tally (complementary to MOY):**
- Category A (13): A-K.1.1.1 **2**, A-K.1.1.2 **3** (SA+2 MCQ), A-K.1.1.3 **3** (grid+EBSR+MCQ), A-C.2.1.1 **1**, A-V.4.1.1 **2**, A-V.4.1.2 **2**.
- Category B (13): B-K.1.1.1 **1**, B-K.1.1.2 **2** (grid+MCQ), B-K.1.1.3 **2** (SA+MCQ), B-C.2.1.1 **1**, B-C.2.1.2 **1**, B-C.3.1.1 **1**, B-C.3.1.2 **2** (MCQ+EBSR), B-C.3.1.3 **1**, B-V.4.1.1 **1**, B-V.4.1.2 **1**.
- **Operational ECs at 3 = TWO** (A-K.1.1.2, A-K.1.1.3) — vs MOY's **three**; **Category B has none at 3** (MOY had B-K.1.1.2=3). The literary multipoint ECs (A-K.1.1.2/3) stay heavy because they structurally bear the grid/EBSR/SA — that is the fixed comparability core — but the **B profile is flattened** and **B-V.4.1.2 is now operational** (MOY had it 0-op), so the EOY operational footprint is genuinely complementary, not a clone. Reading-MCQ repeats all ≤ 2.

---

## 3. Analytics-only layer (10 items / 16 pts) — broadens MOY's lightest/absent ECs

Mix per §4.4: **6 reading MCQ + 2 EBSR + 2 three-point TE = 10 / 16.** Rule: each analytics EC at **operational count ≤ 1** (broaden), or a documented deepening exception. A light EC may anchor **two** analytics items (operational count is unchanged) — used once below.

| AO | Type | Pts | EC | Host (section) | Rationale |
|---|---|---|---|---|---|
| AO-1 | MCQ | 1 | B-C.2.1.1 | P3 paired (S2) | POV info — op 1, broaden |
| AO-2 | MCQ | 1 | B-C.2.1.2 | P1 single (S3) | Text features — op 1, broaden |
| AO-3 | MCQ | 1 | B-V.4.1.1 | P1 single (S3) | Word meaning (info) — op 1, broaden |
| AO-4 | MCQ | 1 | B-V.4.1.2 | P3 paired (S2) | Word relationships (info) — op 1, broaden |
| AO-5 | MCQ | 1 | A-C.2.1.1 | **P2 narrative (S2)** | POV (literary) — op 1, **broaden on the narrative** (an EOY improvement: MOY had to *deepen* its drama-section literary analytics because POV is invalid on a play; EOY hosts it on the narrative where first/third-person IS valid) |
| AO-6 | MCQ | 1 | A-V.4.1.2 | P4 drama (S1) | Figurative/nonliteral in the play — op 2, **documented deepen exception** (the **selected best-fit drama-valid deepen target under the one-exception design**; other literary ECs are drama-valid, but this is the chosen deepen; same single exception posture MOY used) |
| AO-7 | EBSR | 2 | B-K.1.1.1 | P3 paired (S2) | Explicit text evidence — op 1, broaden (ideal EBSR construct) |
| AO-8 | EBSR | 2 | B-C.3.1.1 | P3 paired (S2) | Logical connections — op 1, broaden |
| AO-9 | TE (3pt) — matching grid | 3 | B-C.3.1.3 | P1 single (S3) | Info from the diagram + text — **matching grid pairing process stages / diagram features to text statements**, using the **existing keyboard-operable matching-grid interaction** (no new drag-drop player or route) — op 1, broaden |
| AO-10 | TE (3pt) | 3 | B-V.4.1.1 | P1 single (S3) | Word-meaning matching grid (match words to meanings) — op 1; B-V.4.1.1 anchors AO-3 + AO-10 (operational count stays 1) |

**Analytics distribution (by section, items / points):**
- **S1 = 1 item / 1 pt** — AO-6 (1).
- **S2 = 5 items / 7 pts** — AO-1, AO-4, AO-5, AO-7, AO-8 = 1+1+1+2+2.
- **S3 = 4 items / 8 pts** — AO-2, AO-3, AO-9, AO-10 = 1+1+3+3.
- **Total = 10 items / 16 pts** (6×1 + 2×2 + 2×3).

Only **one deepening exception** (AO-6, A-V.4.1.2) — same posture as MOY. Every multipoint/TE analytics is single-passage-unit-valid (within one unit in one section).

**Delivered EC caps:** operational ECs at 3 = {A-K.1.1.2, A-K.1.1.3}. Analytics push two ECs to delivered-3: A-V.4.1.2 (op 2 + AO-6 = 3, the one deepen) and **B-V.4.1.1** (op 1 + AO-3 MCQ + AO-10 grid = 3 — *broadening via two distinct vocab formats*, MCQ vs matching-grid, operational count stays 1, so this is not a deepen exception). **Delivered ECs at 3 = {A-K.1.1.2, A-K.1.1.3, A-V.4.1.2, B-V.4.1.1}; none above 3.** (Operational and delivered caps tracked separately, both ≤ 3.) **Locked:** AO-10 stays on **B-V.4.1.1** (two distinct vocab formats), keeping the deepen-exception count at one (AO-6 only).

---

## 4. Sectioning, word targets, timing

| Section | Content | Delivered | Operational | Analytics | Reading words |
|---|---|---|---|---|---|
| S1 | P4 drama + conventions ×5 + AO-6 | 12 | 11 / 12 pts | 1 / 1 pt | 1,137 |
| S2 | P2 narrative + P3 paired + AO-1/4/5/7/8 | 18 | 13 / 18 pts | 5 / 7 pts | 925 + 850 = 1,775 |
| S3 | P1 info single + conventions ×4 + AO-2/3/9/10 | 15 | 11 / 15 pts | 4 / 8 pts | 712 |
| **Total** | 4 units / 5 raw passages | **45** | **35 / 45** | **10 / 16** | **3,624** |

`sectionType`: S1 conventions_reading, S2 reading, S3 conventions_reading (mirrors MOY field shape). **`estimatedMinutes` = 60 / 80 / 60 (locked)** — S2 heaviest (2 passage units + the paired set + 5 analytics); longer than MOY's 55/70/50 since EOY is the full-rehearsal form. Untimed; max 2 sections/day.

Operational answer-position-eligible items = **20 reading MCQ + 9 conventions = 29**, target distribution **A8 / B7 / C7 / D7** (per-passage key plans assigned at item authoring, ≤ 0.40 share). `scoringBucket` set at assembly only (the 10 AO IDs analytics_only; everything else operational); never on bank items.

---

## 5. Build sequence (after this finalization is approved + audited)

Mirrors the MOY playbook exactly, per unit: passage package → review → item-authoring spec → Codex author → independent audit → temp-worktree merge. Then `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` (`…eoy-v1`) added alongside the BOY + MOY consts in `pssa-form-assembly.ts` (branch on blueprintVersion; BOY + MOY paths byte-identical), with the dual-bucket validation reused. Recommended order: **conventions EC list lock → P1 → P2 → P3 → P4 → conventions items → form assembly** (or any order; non-overlap vs BOY+MOY enforced throughout).

**Decisions locked (this revision):**
- Heavier operational literary weighting on A-K.1.1.2 / A-K.1.1.3 — **approved**; EOY complementarity lives in the flattened B profile + the analytics layer (not a reshuffle of the literary multipoint).
- AO-10 stays on **B-V.4.1.1** (one deepen exception total).
- `estimatedMinutes` = **60 / 80 / 60** (locked).
- Themes **P1, P2, P3 approved**; **P4 replaced** with the non-school "The Borrowed Bike."
- Conventions items 27–35 are now **atomic** (§2), all 9 ECs crosswalk-verified, 5 S1 / 4 S3, with the two rotated repeats marked.

**Do not begin passage/item authoring until this tracked blueprint finalization is approved and independently audited.**
