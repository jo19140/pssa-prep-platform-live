# EOY P1 — Passage Package (for review)

**Working title:** How Crayons Are Made
**Category:** B — Informational (single) · **Length:** **712 words** (verified by the repo word-count helper; target 700–725). **Genre:** informational_description (process). **Has a labeled process diagram (figure feature).**
**Status:** **APPROVED / LOCKED (2026-06-23)** — independently audited (712-word count, factual claims source-backed to Crayola + MadeHow, 9 complete fact-check records, figure accessibility pinned, 11-item reserved evidence non-overlapping, EC-skill constructs correct). **Pre-handoff corrections (2026-06-23):** (a) §2 trimmed to **exactly 712** words by the repo helper `(text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g)).length` counting the paragraph text **plus the five stage headings** (the author embeds the headings in `eoyP1PassageText`); (b) all three 3-point matching grids (items 6, 10/AO-9, 11/AO-10) pinned to **exactly 3 scored rows** to satisfy the `pssaScoring.ts` `MATCHING_GRID` contract (`maxPoints === scored cells`, 1 pt/correct row); (c) figure accessible-text field named **`altText`**; (d) figure pinned as **`figureKind:"process"`** — **depends on the process-figure infrastructure prerequisite** (`specs/codex_pssa_process_figure_support.md`) being merged first, since the shared figure contract on `main` is map-only; the `longDescription` is now **generated** (not hand-written). **Section:** S3. **Blueprint:** `specs/pssa_g3_eoy_blueprint_finalization.md` (APPROVED/LOCKED 2026-06-23).

**Hosts (per the locked EOY EC table):**
- **Operational (7 items / 11 pts):** B-K.1.1.1 MCQ (explicit), B-C.2.1.2 MCQ (text features), B-C.3.1.1 MCQ (logical connection), B-V.4.1.1 MCQ (word meaning), B-C.3.1.3 MCQ (info from diagram), **B-K.1.1.2 matching grid (3pt, main idea/details)**, **B-K.1.1.3 SA (3pt, sequence — explain the process)**.
- **Analytics-only (S3):** AO-2 = B-C.2.1.2 MCQ (text features), AO-3 = B-V.4.1.1 MCQ (word meaning), **AO-9 = B-C.3.1.3 matching grid (3pt)** — pair process stages / diagram features to text statements (existing keyboard-operable matching-grid interaction; **no new drag-drop player/route**), **AO-10 = B-V.4.1.1 matching grid (3pt)** — match words to meanings.

> Design intent: a clear **process** text (melt → color → mold → release → wrap/pack) with **headings** and a **labeled stage diagram**, so it supports sequence (B-K.1.1.3), main idea/details (B-K.1.1.2), text features (B-C.2.1.2), cause/effect logical connections (B-C.3.1.1), diagram-to-text (B-C.3.1.3), and several Tier-2 words for context-meaning (B-V.4.1.1). Real manufacturing facts → **`factCheckRequired:true`** with structured https sources (§3). No overlap with BOY or MOY topics.

---

## 1. Topic & title

A factory **process** text describing how a crayon is made, from liquid wax to a wrapped, boxed crayon. Generic (no brand named), Grade-3 simplified, and hedged where steps vary by factory. Title: **How Crayons Are Made.**

---

## 2. Passage

Have you ever wondered how a crayon gets its bright color and smooth shape? Many factory-made crayons begin with **paraffin** wax and powdered pigment. At a factory, machines and workers turn these materials into the crayons you use. Crayons look simple, but making them takes care, heat, and a plan. The trip from wax to crayon happens in just a few steps, and each step has a job to do.

### Melting the Wax

The first step is getting the wax ready. Crayons are made mostly of paraffin wax. Workers heat or keep the wax warm in large metal tanks until it is a clear liquid. In some factories, the wax even arrives in liquid form and must stay warm so it does not **harden**. A solid turns into a liquid when it gets hot enough, the way an ice cube melts in the warm sun. The wax is kept hot so it stays liquid until it is needed. The wax must be fully melted before any color can be added. Once the wax is fully liquid, it is smooth and **runny** and ready to take on color.

### Adding the Color

Next comes the color. A worker blends in powdered **pigment**, the material that gives each crayon its shade. Workers add a measured amount of pigment; the amount depends on the shade. Some colors need more pigment and some need less to come out just right. Red powder makes red crayons, and blue powder makes blue. Factories may use one pigment or blend several. The wax is mixed until the pigment spreads **evenly**, so that no part of the batch turns out lighter or darker than the rest. Getting the color even is important, because every crayon from one **batch** should look the same. A single factory can make dozens of different shades this way, from bright red to deep purple.

### Filling the Molds

The colored wax then flows into a **mold**. A mold is a flat metal tray full of crayon-shaped holes. The hot wax is poured carefully so that each hole fills all the way to the top. Cool water runs through pipes around the mold to help the wax harden quickly. As the liquid wax cools, it becomes solid again and keeps the shape of the mold. Because hundreds of holes are filled at the same time, hundreds of crayons can form all at once. The wax usually becomes solid in about four to seven minutes. Cooling the wax quickly lets the factory make many more crayons in a day.

### Pushing Out and Checking

When the crayons are firm, a machine gently pushes them up and out of the mold. Now the factory must make sure each crayon is good enough to sell. Inspectors examine the crayons for breaks, chips, and bubbles. A crayon may have bubbles if the color was not mixed all the way. Any crayon with these problems is pulled out of the line. The rejected crayons are not thrown away, though — they are melted down and **recast** in a brand-new batch. Because the bad crayons are removed at this step, every crayon that keeps moving forward is smooth and whole.

### Wrapping and Packing

The last steps are wrapping and packing. A fast machine wraps a paper label around the middle of each crayon. The label prints the color's name, so you can find the shade you want. Many crayons get a double layer of paper, which makes them stronger so they do not snap as easily. After that, the finished crayons are sorted by color and dropped into boxes. Some boxes hold only a few colors, while others hold every color of the rainbow, with each crayon made the very same way. Once the boxes are full, they are closed up and stacked for shipping. From there, the boxes are sent out for distribution.

So the next time you open a fresh box, remember the journey each crayon took — from melted wax and color powder, to a pool of bright color, to the smooth stick in your hand. A lot of careful steps, and a few very hot machines, go into a tool small enough to fit in your pocket. Each crayon may be small, but many people and machines helped make it.

---

## 3. Source & fact-check notes

Platform-authored; the crayon-making process is **real and factual**, so `factCheckRequired:true` and these **structured `factCheckNotesJson` records** carry into the P1 passage (reviewer-only; `PSSA_DOMAIN_FACT_CHECK_REQUIRED` gate). The text is **generic and hedged** (no brand named in the passage; "many factory-made crayons," "mostly paraffin," "may use one pigment or blend several") so each claim holds across manufacturers. **All sources independently opened/read 2026-06-23; `claimSupported:true`, HTTPS, real — no placeholders.**

| claimId | claim (supported core) | sourceTitle | organization | sourceUrl |
|---|---|---|---|---|
| `t1-paraffin-pigment` | Crayons are made primarily of **paraffin wax and color pigment**. | What is the Crayola Crayons manufacturing process and basic ingredients? | Crayola, LLC | `https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq` |
| `t1-melt-blend` | The process **melts paraffin wax and blends it with color pigments**. | What is the Crayola Crayons manufacturing process and basic ingredients? | Crayola, LLC | `https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq` |
| `t1-premeasured-pigment` | The wax is mixed with **pre-measured amounts** of color pigment; factories use individual pigments or mix several. | Can you provide information about the science of Crayola Crayons? | Crayola, LLC | `https://www.crayola.com/faqs/can-you-provide-information-about-the-science-of-crayola-crayons-faq` |
| `t1-mold-solidify` | The mixture is **poured into molds where it solidifies in about four to seven minutes**. | What is the Crayola Crayons manufacturing process and basic ingredients? | Crayola, LLC | `https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq` |
| `t1-pigment-powder` | Pigments are added in **powdered form** (paraffin will not mix with water). | How crayon is made | Advameg, Inc. (madehow.com) | `https://www.madehow.com/Volume-2/Crayon.html` |
| `t1-paraffin-warm` | Paraffin is **delivered warm/liquid** so it does not harden before use. | How crayon is made | Advameg, Inc. (madehow.com) | `https://www.madehow.com/Volume-2/Crayon.html` |
| `t1-inspect` | After cooling, crayons are **pushed from the molds and inspected for breaks, chips, and bubbles**. | How crayon is made | Advameg, Inc. (madehow.com) | `https://www.madehow.com/Volume-2/Crayon.html` |
| `t1-remelt` | **Rejected crayons are returned for remelting and recasting.** | How crayon is made | Advameg, Inc. (madehow.com) | `https://www.madehow.com/Volume-2/Crayon.html` |
| `t1-wrap-pack` | Passing crayons are **wrapped with paper labels** (often a double wrap for strength), then **filled into boxes** for distribution. | How crayon is made | Advameg, Inc. (madehow.com) | `https://www.madehow.com/Volume-2/Crayon.html` |

**Literal `factCheckNotesJson` array to paste verbatim** (every record structurally complete — each has all seven keys incl. `claimSupported` and `dateAccessed`; the gate checks every field):

```json
[
  {"claimId":"t1-paraffin-pigment","claim":"Crayons are made primarily of paraffin wax and color pigment.","sourceTitle":"What is the Crayola Crayons manufacturing process and basic ingredients?","organization":"Crayola, LLC","sourceUrl":"https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-melt-blend","claim":"The process melts paraffin wax and blends it with color pigments.","sourceTitle":"What is the Crayola Crayons manufacturing process and basic ingredients?","organization":"Crayola, LLC","sourceUrl":"https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-premeasured-pigment","claim":"The wax is mixed with pre-measured amounts of color pigment; factories use individual pigments or mix several to make many colors.","sourceTitle":"Can you provide information about the science of Crayola Crayons?","organization":"Crayola, LLC","sourceUrl":"https://www.crayola.com/faqs/can-you-provide-information-about-the-science-of-crayola-crayons-faq","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-mold-solidify","claim":"The mixture is poured into molds where it solidifies in about four to seven minutes.","sourceTitle":"What is the Crayola Crayons manufacturing process and basic ingredients?","organization":"Crayola, LLC","sourceUrl":"https://www.crayola.com/faqs/what-is-the-crayola-crayons-manufacturing-process-and-basic-ingredients-faq","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-pigment-powder","claim":"Pigments are added in powdered form because paraffin will not mix with water.","sourceTitle":"How crayon is made","organization":"Advameg, Inc. (madehow.com)","sourceUrl":"https://www.madehow.com/Volume-2/Crayon.html","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-paraffin-warm","claim":"Paraffin is delivered warm/liquid and kept warm so it does not harden before use.","sourceTitle":"How crayon is made","organization":"Advameg, Inc. (madehow.com)","sourceUrl":"https://www.madehow.com/Volume-2/Crayon.html","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-inspect","claim":"After cooling, crayons are pushed from the molds and inspected for breaks, chips, and bubbles (bubbles form from incomplete mixing).","sourceTitle":"How crayon is made","organization":"Advameg, Inc. (madehow.com)","sourceUrl":"https://www.madehow.com/Volume-2/Crayon.html","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-remelt","claim":"Rejected crayons are returned for remelting and recasting.","sourceTitle":"How crayon is made","organization":"Advameg, Inc. (madehow.com)","sourceUrl":"https://www.madehow.com/Volume-2/Crayon.html","claimSupported":true,"dateAccessed":"2026-06-23"},
  {"claimId":"t1-wrap-pack","claim":"Passing crayons are wrapped with paper labels (often a double wrap for strength), then filled into boxes for distribution.","sourceTitle":"How crayon is made","organization":"Advameg, Inc. (madehow.com)","sourceUrl":"https://www.madehow.com/Volume-2/Crayon.html","claimSupported":true,"dateAccessed":"2026-06-23"}
]
```

Author pastes this array verbatim into the P1 passage's `factCheckNotesJson`; the gate fails closed on any missing field / non-HTTPS / `...` placeholder.

### 3.1 Figure (process diagram) — full spec, pinned (reuse the existing `type:"figure"` path; **no new player/route**)

**Figure fields (generalized shared contract — `figureKind:"process"`):** `type:"figure"`, `figureKind:"process"`, `featureId: "eoy_p1_crayon_process"`, `title: "How a Crayon Is Made"`, `sectionId: "section_0_intro"` (verify fail-closed against `buildPssaStaminaSectionMap`), `assetPath: "/pssa/figures/g3_eoy_p1_crayon_process.svg"`, `assetSha256` (pinned at authoring). A left-to-right 5-stage flow; the five shortened stage labels **correspond one-to-one to the five passage headings** (the label text is shortened, **not identical** to the heading text). `structuredData.stages` = exactly 5 records, each carrying an explicit `order`, a `targetId`, a `label`, and a **pinned `caption`** (functional information the items use, not decoration):

| `order` | `targetId` | Stage label (figure) | ↔ passage heading | Pinned caption |
|---|---|---|---|---|
| 1 | `stage_melt` | Melt the wax | Melting the Wax | "Paraffin wax is heated or kept warm until it is liquid." |
| 2 | `stage_color` | Add the color | Adding the Color | "Powdered pigment is blended in to give the wax its color." |
| 3 | `stage_mold` | Fill the mold | Filling the Molds | "The colored wax is poured into crayon-shaped holes and cooled." |
| 4 | `stage_check` | Push out and check | Pushing Out and Checking | "Hardened crayons are pushed out; broken or chipped ones are removed." |
| 5 | `stage_pack` | Wrap and pack | Wrapping and Packing | "Each crayon gets a paper label, then crayons are sorted and boxed." |

**Accessible equivalent (required):**
- **`altText`** (figure field name; short, literal value): `"Diagram: the five steps of making a crayon, in order — melt the wax, add the color, fill the mold, push out and check, wrap and pack."`
- **`longDescription` (NOT hand-written — generated deterministically by `generatePssaFigureLongDescription(structuredData)`, the process branch).** Setting it to the generator output for the 5 stages above yields **exactly**: `"This diagram shows 5 steps in order. Step 1: Melt the wax. Paraffin wax is heated or kept warm until it is liquid. Step 2: Add the color. Powdered pigment is blended in to give the wax its color. Step 3: Fill the mold. The colored wax is poured into crayon-shaped holes and cooled. Step 4: Push out and check. Hardened crayons are pushed out; broken or chipped ones are removed. Step 5: Wrap and pack. Each crayon gets a paper label, then crayons are sorted and boxed."` (Using the passage together with the long description preserves full answerability without seeing the SVG or color. The validator enforces `longDescription === generatePssaFigureLongDescription(structuredData)`.)
- **Keyboard-operable matching grid** for AO-9 (existing interaction; operable without a mouse; **no drag-drop**).
- **No color-only meaning:** each stage is distinguished by label + position + number + caption, never color alone; **no item answerable solely from color.**
- `assetSha256` + the allowlist-compliant asset pinned at authoring (mirror the MOY P1 figure fixture pattern).

**Distinct figure evidence (operational B-C.3.1.3 MCQ vs. AO-9 grid — reserved separately, see §7):**
- **Operational B-C.3.1.3 MCQ** uses a **passage-only detail that is absent from the captions** — that a **double layer of paper makes a crayon stronger** — and asks which numbered stage shows wrapping (**order 5, `stage_pack`**). The stage-5 caption mentions only the paper label / sorting / boxing, NOT the double-layer-strength fact, so the item is **not answerable from the caption alone** (it requires integrating passage + diagram).
- **AO-9 matching grid** maps **three of the five diagram stages (1, 3, 5)** to distinct non-caption passage statements (§7.1) — a **3-point grid with exactly 3 scored rows** (engine awards 1 point per correct row), a different evidence surface from the MCQ's single fact.

## 4. Section / structure map

Intro (hook + "few steps, each a job" = main idea). **5 headed stages in order:** Melting the Wax → Adding the Color → Filling the Molds → **Pushing Out and Checking** → Wrapping and Packing. Close (recap). Sequence is explicit and ordered (B-K.1.1.3); each stage has a cause/effect sentence (e.g., *cool water → wax hardens*; *color not mixed all the way → bubbles form*) for B-C.3.1.1; headings + diagram for B-C.2.1.2; the 5-stage diagram for B-C.3.1.3. **Stage 4 is named consistently as "Push out and check" (diagram label / `stage_check`) ↔ "Pushing Out and Checking" (heading)** — no "Push out"-only or "Checking"-only variants.

## 5. Qualitative complexity review

Grade-3 informational: mostly simple/compound sentences; a few cause/effect complex sentences. One clear organizing structure (sequential process). Length comes from added steps/detail, not denser syntax. Domain terms defined or context-supported (*paraffin, pigment, mold, label, batch*). Meets "Grade-3 vocabulary and syntax despite increased length."

## 6. Vocabulary-load review

The text **explicitly defines** *paraffin*, *pigment*, and *mold* — so those are **NOT** valid vocab targets (weak context-clue items). The **five vocab targets are undefined-but-context-supported and all appear in §2**: **harden** (op MCQ — *melting-section* context: "must stay warm so it does not harden"), **batch** (AO-3), **evenly / runny / recast** (AO-10) — five distinct words, no reuse across the three B-V.4.1.1 items. (The inspection wording was trimmed to the source-backed "breaks, chips, and bubbles"; AO-10's third vocab word is *recast*.) No undefined Tier-3 terms.

## 7. EC support + reserved-evidence table (all 11 P1 items — distinct primary evidence)

**Construct corrections:**
- **B-K.1.1.2 (grid)** is a **main-idea / key-detail classification**, NOT stage-to-purpose matching (which would lean toward sequence/logical-relationship): the student classifies each given statement as the passage's **overall main idea** vs a **supporting detail**. This keeps the response surface genuinely on main-idea/detail.
- **The three B-V.4.1.1 items use five distinct target words** — operational MCQ = *harden*; AO-3 = *batch*; AO-10 grid = *evenly / runny / recast* (AO-10 reuses neither *harden* nor *batch*).
- **The two B-C.2.1.2 items use distinct feature functions** — operational = **headings as locators**; AO-2 = **the process diagram/captions as an organizer**.
- **The two B-C.3.1.3 items use distinct figure evidence** — operational MCQ = one single stage fact; AO-9 grid = a **three-stage** (stages 1, 3, 5) stage→statement mapping (§3.1), 3 scored rows.

**Reserved evidence (LOCKED — no two selected-response items reuse the same primary sentence, heading function, diagram fact, or vocabulary word):**

| # | Item | EC | Type | Reserved primary evidence |
|---|---|---|---|---|
| 1 | operational | B-K.1.1.1 | MCQ | Explicit: what is blended in to color the wax → **pigment** ("A worker blends in powdered pigment…"). |
| 2 | operational | B-C.2.1.2 | MCQ | Text feature = **the section headings** help a reader find a particular step (heading-as-locator). |
| 3 | operational | B-C.3.1.1 | MCQ | Cause/effect: **incomplete mixing → bubbles** ("A crayon may have bubbles if the color was not mixed all the way"). |
| 4 | operational | B-V.4.1.1 | MCQ | Word meaning: **"harden"** in the **melting** section ("must stay warm so it does not harden") — distinct context from the molding cooling line. |
| 5 | operational | B-C.3.1.3 | MCQ | **Passage-only detail (absent from the caption) → locate its diagram stage:** the passage says a **double layer of paper makes a crayon stronger** ("Many crayons get a double layer of paper, which makes them stronger…"); the student finds the wrapping stage (**order 5, `stage_pack`**). The stage-5 caption names only the paper label / sorting / boxing — NOT the double-layer-strength fact — so it is **not caption-answerable**; requires integrating passage + diagram. Does not repeat the cooling/hardening construct. |
| 6 | operational | B-K.1.1.2 | matching grid (3pt, **3 scored rows**) | **Main-idea vs supporting-detail classification** — 3 pinned statements in §7.1. |
| 7 | operational | B-K.1.1.3 | SA (3pt) | **Sequence**: explain the ordered steps that turn wax into a wrapped crayon (≥2 details + reasoning, not one copied line). |
| 8 | AO-2 | B-C.2.1.2 | MCQ | Text feature ≠ #2 = **the process diagram/captions** show the steps in order at a glance (diagram-as-organizer). |
| 9 | AO-3 | B-V.4.1.1 | MCQ | Word meaning: **"batch"** (one group of wax made at once) — ≠ #4. |
| 10 | AO-9 | B-C.3.1.3 | matching grid (3pt, **3 scored rows**) | Diagram: match **three of the five stages (1, 3, 5)** to **pinned passage statements (§7.1)** — passage details NOT verbatim in the captions; none reuse items 1–9 reserved evidence. |
| 11 | AO-10 | B-V.4.1.1 | matching grid (3pt, **3 scored rows**) | Word meaning: match **"evenly," "runny," "recast"** to meanings — three words, all ≠ #4 and ≠ #9. |

(Per-item keys finalized at P1 item-authoring; reading-MCQ repeats ≤2; no form EC > 3 — reconciled in the blueprint. The five vocab words and five diagram stages are all present in the §2 passage / §3.1 figure.)

### 7.1 Pinned statements — B-K.1.1.2 grid (item 6) and AO-9 grid (item 10)

> **Grid scoring constraint (engine-pinned).** `pssaScoring.ts` scores a `MATCHING_GRID` by awarding **1 point per correct scored row** and requires **`maxPoints === number of scored cells`** (`matching_grid_full_credit`/`partial`/`zero`). A **3-point grid therefore has exactly 3 scored rows.** Item 6, AO-9, and AO-10 are each pinned to **exactly 3 rows** below.

**B-K.1.1.2 main-idea / supporting-detail grid (item 6)** — **exactly 3 scored rows** (1 main idea + 2 details); classify each statement; none reuses another item's primary evidence:
| Statement | Classify as |
|---|---|
| "Crayons are made from wax and pigment in a few careful steps." | **Main idea** |
| "Workers heat the wax in large metal tanks until it is liquid." | Supporting detail |
| "Crayons solidify in about four to seven minutes." | Supporting detail |

**AO-9 stage→statement grid (item 10)** — **exactly 3 scored rows**: match **three of the five** numbered diagram stages (1, 3, 5) to a **passage statement**. Each statement is a **distinct, non-caption passage detail** (it does **not** paraphrase its stage caption), is disjoint from items 1–9 and AO-10, and requires mapping passage information to the numbered stage:
| Diagram stage | Passage statement (non-caption detail) |
|---|---|
| 1 — Melt the wax (`stage_melt`) | "The wax must be fully melted before any color can be added." |
| 3 — Fill the mold (`stage_mold`) | "Hundreds of crayons form at the same time." |
| 5 — Wrap and pack (`stage_pack`) | "Some boxes hold every color of the rainbow." |

Every grid/AO-9 statement is a real §2 sentence (or faithful summary); none duplicates a caption (verbatim or paraphrase) or another selected-response item's reserved primary evidence. The columns (classification labels for item 6; candidate statements for AO-9; candidate meanings for AO-10) may include additional non-scored distractor options, but the number of **scored rows is exactly 3** in each grid.

## 8. Non-overlap check

- **vs BOY** (syrup-making, junk-boat race, owl hunting/farm, hollow-log storm): different topic, vocabulary, and process. (BOY's syrup is also a "how something is made" process, but maple syrup vs. factory crayons share no content, vocabulary, or setting — fully distinct.)
- **vs MOY** (museum floor-map, bread-baking, mail delivery, school-play): different topic; MOY P1's figure was a **floor-map**, this is a **process flow diagram** — different feature use, no overlap.
- **vs foundation bank:** distinct topic/vocabulary.

---

**Status — LOCKED; blocked on prerequisite.** Item-authoring spec exists (`specs/codex_pssa_eoy_p1_items.md`, 7 operational + 4 S3 analytics). **EOY P1 authoring does not begin until the process-figure infrastructure prerequisite (`specs/codex_pssa_process_figure_support.md`, branch `codex/pssa-process-figure-support`) is implemented, independently audited, and merged** — the shared figure contract on `origin/main` is map-only today. Sequence: revise/implement prerequisite → audit → merge → Codex authors P1 → independent P1 audit → merge. **Carry the figure accessibility + fact-check requirements forward.**
