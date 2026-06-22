# Codex Spec — MOY P3 Item Authoring (Grade 3, PAIRED informational "How a Letter Travels" + "A Mail Carrier's Day")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-19.
**Preconditions:** MOY P1 + P2 merged + verified on `main`. P3 passage package APPROVED: `specs/pssa_g3_moy_p3_passage_package.md` (**796 combined words** — Text 1 = 436, Text 2 = 360). Blueprint locked: `specs/pssa_g3_benchmark_blueprint_moy_eoy.md`.
**No figure** — P3 is plain paired informational prose (the figure feature is P1-specific). **This is the first PAIRED unit in the MOY form:** two raw texts, one `PssaPassageGroup`, and the form's only **cross-text** EBSR.

This unit hosts **9 items: 6 operational (7 pts) + 3 analytics-only (4 pts).** `scoringBucket` is assigned **at form assembly, never here** (Phase 4A).

## 0. Scope & guardrails

- Author **one passage GROUP (two passages, P3) + its 9-item set**, file-based only (`noDbWrite`), all `reviewStatus=PENDING` / `itemStatus=candidate`. Nothing approved/student-facing.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry (`mappingRegistry` in `lib/content/pssaInsightMapping.ts`), delivery, the figure module, BOY/foundation/MOY-P1/MOY-P2 content, or schema. Do NOT assemble the form and **do NOT set `scoringBucket`** (assembly-only). P3 only.
- STOP and report if anything needs a DB schema change, if the paired `PssaPassageGroup` / `PssaPassageGroupMember` shape is ambiguous, or if secure-pool tagging is ambiguous.
- Run in a clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), same pattern as P1/P2.

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P3 package in the worktree (`git show HEAD:specs/pssa_g3_moy_p3_passage_package.md`). Each required string is checked **individually** via `require_in_commit` (§9); a single OR-grep is not acceptable. Required:
- status says **APPROVED**; combined passage word count = **796** (Text 1 = 436, Text 2 = 360);
- postal claims **softened/hedged** — the package must contain `avoids claims that every route, vehicle, or facility works exactly the same way` and the hedges `may,` / `can,` / `some routes`; it must **NOT** contain the rejected over-specific strings (`red flag`, `sprayed lines`, `steering wheel on the right`, `tells exactly where`);
- **authoritative fact-check note** present: `checked against authoritative postal-service / postal-history sources` and `Sources are kept in reviewer metadata only`;
- **§7.1 reserved evidence** table present (`Reserved evidence per item (LOCKED`) — difference-in-focus MCQ; shared-idea EBSR with `Part B must use one verbatim excerpt from EACH text`; Text 1 cause/effect MCQ; AO-4 Text 2 route-order EBSR;
- **§7.2 pinned analytics**: AO-1 `The stamp is like a ticket that pays for the trip`; AO-3 `not easy, yet carriers take real pride`; AO-4 route-order → time-saving in Text 2.

If any fails, **STOP** — do not author from a stale/unapproved copy.

## 1. Deliverables

- New author script `scripts/content/author-pssa-moy-p3.ts` (mirror `author-pssa-moy-p2.ts`, extended to emit **one `PssaPassageGroup` + two `PssaPassage` members** and **cross-text EBSR**).
- Exemplars under `exemplars/pssa_grade3_moy_p3/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire into `scripts/test-pssa-content.ts`.
- New `scripts/test-pssa-moy-p3.ts` (structure + paired-group + cross-text-EBSR + distractor-quality regression; §7).

## 2. Passage authoring (`PssaPassageGroup` + two `PssaPassage`)

From the approved package (**verbatim text; do not rewrite**). Encode the paired unit using the canonical shape verified in the repo (`exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json`):

**Group (`PssaPassageGroup`):** carries the canonical paired metadata (verified against `owls_paired_released_length.json`).
- `id` = `pssa_pg_g3_moy_p3_mail_paired`; `gradeLevel` 3; `subject` ELA; `groupType` = `paired_informational`; **`genre` = `paired_informational`** (NOT `informational` — the group genre matches the canonical paired contract; the two member passages are individually `informational`); **`staminaBand` = `released_length` lives on the GROUP only** (members do NOT carry `staminaBand` — owls members omit it); `domainVocabularyLoad` = **`medium`**; `title` = "Delivering the Mail" (group title — not student-facing as an item stem); `wordCount` = **796**; `contentHash` computed by the author script.
- Two `members` (`PssaPassageGroupMember`), each with `slot` + `position` + `passageContentHashSnapshot` (and **no** `staminaBand`):
  - `slot` = `passage_1`, `position` 1 → Text 1 passage.
  - `slot` = `passage_2`, `position` 2 → Text 2 passage.

**Text 1 passage (`PssaPassage`):**
- `id` = `pssa_psg_g3_moy_p3_letter_travels`; `title` "How a Letter Travels"; `genre` informational; `text` = the approved **436-word** Text 1 verbatim; `wordCount` 436.

**Text 2 passage (`PssaPassage`):**
- `id` = `pssa_psg_g3_moy_p3_carrier_day`; `title` "A Mail Carrier's Day"; `genre` informational; `text` = the approved **360-word** Text 2 verbatim; `wordCount` 360.

**Both member passages:**
- `genre` = `informational` (each member text individually); the **group** carries `paired_informational` + `staminaBand` + `domainVocabularyLoad` (above). Members do **NOT** carry `staminaBand`.
- **No `textFeaturesJson` figure** (plain prose; no headings/sidebars).
- MOY identity in `provenanceJson` (`benchmarkSeason:"MOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-moy-v1"`, `unit:"P3"`, `passageSlot:"passage_1"`/`"passage_2"`).
- Metadata mirror the delivered stamina passages: `sourceType="internal_original"`, `licenseStatus="cleared_internal_original"`, `commercialUseAllowed=true`, `needsLegalReview=false`; `reviewStatus=PENDING`; `itemStatus=candidate`.
- Non-overlap: distinct from BOY (syrup/junk-boat/owls/hollow-log), MOY P1 (museum, has a figure), MOY P2 (literary "The Stubborn Dough"), foundation.

### 2.1 Structured fact-check metadata (REQUIRED — use the EXISTING `factCheckNotesJson` convention)

**Storage path (existing, do NOT invent a new one):** the records live in the **`PssaPassage.factCheckNotesJson`** array (the established repo field — see `author-pssa-moy-p1.ts`/`author-pssa-moy-p2.ts` and the `evaluatePssaDomainFactCheckRequired` gate in `scripts/content/lib/pssa-stamina-gates.ts`). Set **`factCheckRequired: true`** on both member passages. Because the member passages are `informational` genre, the **`PSSA_DOMAIN_FACT_CHECK_REQUIRED`** gate (run inside `scripts/test-pssa-content.ts`) already fires and **FAILs** unless every record is complete; the prose note in the package is not enough.

**Exact field names the gate validates** (do NOT rename — the gate checks these literal keys and requires `claimSupported === true` and an `https:` `sourceUrl` not containing `...`):

```
{ claimId, claim, sourceTitle, organization, sourceUrl, claimSupported, dateAccessed }
```

Records are **reviewer-only**: `factCheckNotesJson` must never appear in the student preview/DTO. Each member passage carries the records for **its own** claims (Text 1 → the `t1-*` records on `pssa_psg_g3_moy_p3_letter_travels`; Text 2 → the `t2-*` records on `pssa_psg_g3_moy_p3_carrier_day`).

**Pinned records — `dateAccessed: "2026-06-21"`, `claimSupported: true` for all.** Sources are real, official `https:` USPS / Smithsonian National Postal Museum pages (verified 2026-06-21); the author pastes this table verbatim. `claim` wording is phrased to the supported core fact (not the passage's narrative hedges) so `claimSupported:true` is honest.

All sources below were **independently opened and read on 2026-06-21** (not just search snippets); each `claim` is phrased to what that page's body text actually supports.

**Text 1 passage (`pssa_psg_g3_moy_p3_letter_travels`) — 5 records:**

| claimId | claim (supported core) | sourceTitle | organization | sourceUrl |
|---|---|---|---|---|
| `t1-stamp-payment` | A postage stamp is affixed to mail to **prepay the cost of delivery**. | Postage Stamps – The Basics | U.S. Postal Service | `https://faq.usps.com/s/article/Postage-Stamps-The-Basics` |
| `t1-zip-code` | A **ZIP Code's digits identify a geographic area** of the country, narrowing from region to local Post Office. | Introduction of the ZIP Code – U.S. Postal Facts | U.S. Postal Service | `https://facts.usps.com/decoding-the-zip-code/` |
| `t1-sorting-machines` | At modern processing centers **mail is faced, cancelled, and sorted by automated machinery** rather than by hand. | Mail Processing | Smithsonian National Postal Museum | `https://postalmuseum.si.edu/exhibition/about-postal-operations/mail-processing` |
| `t1-air-surface-transport` | Mail **moves through the air and along roads in trucks** (and over the sea) across the postal transportation network. | Core Processes – Systems at Work | Smithsonian National Postal Museum | `https://postalmuseum.si.edu/exhibition/systems-at-work-about-the-exhibition/core-processes` |
| `t1-destination-grouping` | **ZIP+4 and added digits let mail be sorted by destination to a specific street, then to a residence or business** (finer destination-based sorting). | Introduction of the ZIP Code – U.S. Postal Facts | U.S. Postal Service | `https://facts.usps.com/decoding-the-zip-code/` |

**Text 2 passage (`pssa_psg_g3_moy_p3_carrier_day`) — 5 records:**

| claimId | claim (supported core) | sourceTitle | organization | sourceUrl |
|---|---|---|---|---|
| `t2-route-order` | A city carrier's route includes **office duties such as casing mail before street delivery** (office vs. street operations; ~80% of the day on the street). | City Delivery Operations – Nationwide Route Management | USPS Office of Inspector General | `https://www.uspsoig.gov/reports/audit-reports/city-delivery-operations-nationwide-route-management` |
| `t2-satchel` | Carriers **carry mail in a letter-carrier satchel**. | Letter Carrier Satchel | U.S. Postal Service | `https://about.usps.com/who/profile/history/pdf/letter-carrier-satchel.pdf` |
| `t2-vehicle` | City carriers **deliver and collect mail on foot or by vehicle**. | Top Jobs – USPS is Hiring | U.S. Postal Service | `https://about.usps.com/careers/career-opportunities/top-jobs.htm` |
| `t2-scanner-tracking` | Carriers use a **handheld Mobile Delivery Device (MDD) to scan packages and transmit real-time tracking** data. | Mobile Delivery Device Program | USPS Office of Inspector General | `https://www.uspsoig.gov/reports/audit-reports/mobile-delivery-device-program` |
| `t2-all-weather` | City carriers **deliver under varying road and weather conditions** ("in all kinds of weather"). | Top Jobs – USPS is Hiring | U.S. Postal Service | `https://about.usps.com/careers/career-opportunities/top-jobs.htm` |

(`t2-vehicle` and `t2-all-weather` both cite the Top Jobs page, which supports both facts in distinct sentences; the previously combined `t2-satchel-vehicle` record has been **split** so each `sourceUrl` actually supports its `claim`.)

**Honesty constraint (no fabrication):** the author pastes these exact records; if any source later fails to resolve, the author **re-verifies or STOPs** rather than substituting a placeholder. The gate fails closed on any missing field, `claimSupported !== true`, or a non-`https:`/`...`-containing `sourceUrl`. `test-pssa-moy-p3.ts` additionally asserts all **10** `claimId`s are present (**5 on Text 1, 5 on Text 2**), each with all seven keys populated, and that `factCheckNotesJson` does not leak into the student preview/DTO.

## 3. Item set (9 items — 6 operational / 7 pts + 3 analytics-only / 4 pts)

Each item has a **distinct primary evidence target** (§7.1 of the package is LOCKED); reading-MCQ EC repeats ≤2; no form EC > 3. Every item links to `passageGroupId = pssa_pg_g3_moy_p3_mail_paired`; single-text items additionally pin the source `passageId` and (for evidence) the `passageSlot` they draw from.

| # | Item | EC | Type | Pts | Bucket (assembly) | Key | Source text |
|---|---|---|---|---|---|---|---|
| 1 | Text 1 main idea | `E03.B-K.1.1.2` | MCQ | 1 | operational | **C** (2) | Text 1 |
| 2 | Text 2 main idea | `E03.B-K.1.1.2` | MCQ | 1 | operational | **A** (0) | Text 2 |
| 3 | Text 1 sequence / cause-effect | `E03.B-K.1.1.3` | MCQ | 1 | operational | **D** (3) | Text 1 |
| 4 | Text 1 logical connection | `E03.B-C.3.1.1` | MCQ | 1 | operational | **B** (1) | Text 1 |
| 5 | Difference in focus (cross-text) | `E03.B-C.3.1.2` | MCQ | 1 | operational | **C** (2) | both |
| 6 | Shared idea, evidence from both texts | `E03.B-C.3.1.2` | EBSR | 2 | operational | Part A **B** (1) | **both** |
| 7 | AO-1 stamp/ticket comparison | `E03.B-V.4.1.2` | MCQ | 1 | **analytics_only** | **D** (3) | Text 1 |
| 8 | AO-3 carrier-work viewpoint | `E03.B-C.2.1.1` | MCQ | 1 | **analytics_only** | **B** (1) | Text 2 |
| 9 | AO-4 route-order → time-saving | `E03.B-C.3.1.1` | EBSR | 2 | **analytics_only** | Part A **A** (0) | **Text 2 only** |

Operational total = 5 MCQ × 1 + 1 EBSR × 2 = **7 pts** (6 items). Analytics-only = 2 MCQ × 1 + 1 EBSR × 2 = **4 pts** (3 items). The author script assigns **NO** `scoringBucket` — buckets in the table above are the assembly contract, not a field set here.

**Operational MCQ key plan (items 1–5): C, A, D, B, C** → distribution A1 / B1 / C2 / D1, max per-passage share **0.40** (cap met). Analytics MCQ keys (items 7, 8) = **D, B** → across all 7 P3 MCQ: A1 / B2 / C2 / D2, max share ≈0.29. Do not re-shuffle.

**Form-level EC reconciliation (caps respected):**
- `B-K.1.1.2`: P3 ×2 MCQ + P1 ×1 = **3** (cap OK).
- `B-K.1.1.3`: P3 ×1 MCQ + (P1 SA) = **2**.
- `B-C.3.1.2`: P3 MCQ + P3 EBSR = **2** (both on P3; this is the anchor cross-text EC).
- `B-C.3.1.1`: P3 op MCQ (item 4, Text 1) + AO-4 EBSR (item 9, Text 2, analytics) = **2** — distinct texts / distinct evidence (§7.1).
- `B-V.4.1.2` (AO-1) and `B-C.2.1.1` (AO-3): analytics-only, 1 each. Reading-MCQ repeats ≤2 ✓.

### 3.0 Canonical item modeling — passage links, cross-text flags, evidence kind

Use only EXISTING schema/JSON shapes (verified against `owls_paired_released_length.json`, schema lines 631–632, and `PssaItemPassageLink`). Do **NOT** add a new scalar field or imply a schema change.

- **Passage links** = `passageLinks: [{ passageId, role, sortOrder }]` (the canonical `PssaItemPassageLink` shape; `PssaPassageRole` ∈ `primary|secondary|evidence_source`). **Mirror the Owls precedent EXACTLY** (verified in `owls_paired_released_length.json`): **both** cross-text links use `role: "primary"` (do NOT assume one should be `secondary`/`evidence_source`); the cross-text **MCQ** (item 5, like owls items 05/06) carries `sortOrder` `0`=passage_1 / `1`=passage_2; the cross-text **EBSR** (item 6, like owls `ebsr_01`) **omits `sortOrder`** (owls' EBSR links have no `sortOrder` key). Single-text items link to the **one** member they draw from, `role: "primary"`: single-text **MCQ** items (1, 2, 3, 4, 7, 8) carry `sortOrder: 0` (like owls items 01–04); the single-text **EBSR** item 9 **omits `sortOrder`** (like owls' EBSR). **Rule of thumb: MCQ + SHORT_ANSWER links carry `sortOrder`; EBSR links never do.**
- **`isCrossText`** (`Boolean?`, schema line 631): `true` for items 5 & 6; `false` for every single-text item (1,2,3,4,7,8,9 — including AO-4, which lives in the paired group but draws only from Text 2).
- **`requiredEvidenceSlotsJson`** (`Json?`, schema line 632): `["passage_1","passage_2"]` for items 5 & 6 only; omit/`null` for single-text items (mirrors owls, which omits it on single-text items).
- **Evidence kind** = `evidenceBinding.evidenceKind` (authored JSON; `whole_passage_synthesis` is an already-recognized value). Items 1, 2, 5, and **item 6 Part A** are whole-passage synthesis: set `evidenceKind:"whole_passage_synthesis"` with the applicable `passageSlot`(s) and **do NOT fabricate `quotedSpan` character offsets** for them. Specific-evidence items use `quoted_span` (verbatim, anchored) honestly.

| # | isCrossText | requiredEvidenceSlotsJson | passageLinks (role=primary) | evidenceKind | passageSlot(s) |
|---|---|---|---|---|---|
| 1 | false | (omit) | passage_1 | `whole_passage_synthesis` | passage_1 |
| 2 | false | (omit) | passage_2 | `whole_passage_synthesis` | passage_2 |
| 3 | false | (omit) | passage_1 | `quoted_span` | passage_1 |
| 4 | false | (omit) | passage_1 | `quoted_span` | passage_1 |
| 5 | **true** | `["passage_1","passage_2"]` | passage_1 + passage_2 | `whole_passage_synthesis` | passage_1 **and** passage_2 |
| 6 | **true** | `["passage_1","passage_2"]` | passage_1 + passage_2 | Part A `whole_passage_synthesis` (both slots); Part B `quoted_span` per choice | both |
| 7 | false | (omit) | passage_1 | `quoted_span` | passage_1 |
| 8 | false | (omit) | passage_2 | `quoted_span` | passage_2 |
| 9 | false | (omit) | passage_2 | Part A `paragraph_synthesis` (passage_2); Part B `quoted_span` | passage_2 |

Items 5 & 6 must **cover BOTH required slots** (links + evidence reference passage_1 and passage_2). Item 9 is single-text (passage_2 only) despite living in the paired group: one link, `isCrossText=false`, no `requiredEvidenceSlotsJson`.

**Slot-token note (RESOLVED):** internal slot tokens are **`passage_1` / `passage_2`** — matching the Owls paired-set precedent, to avoid hidden importer/renderer/reporting assumptions breaking on a second convention. **"Text 1" / "Text 2" survive only as student-facing labels** (passage titles + prompt wording); they are never used as internal slot values. The group member `slot`, each item's `requiredEvidenceSlotsJson`, `evidenceBinding.passageSlot`/`passageSlots`, every `responseSpecJson.partB.choices[].passageSlot`, and the `provenanceJson.passageSlot` MUST all use `passage_1`/`passage_2` and nothing else (asserted in §7, regression #11).

### 3.1 Pinned IDs & deterministic keys

| Slot | Item ID | EC | Type | Key |
|---|---|---|---|---|
| Group | `pssa_pg_g3_moy_p3_mail_paired` | — | paired_informational | — |
| Text 1 | `pssa_psg_g3_moy_p3_letter_travels` | — | informational | — |
| Text 2 | `pssa_psg_g3_moy_p3_carrier_day` | — | informational | — |
| 1 | `pssa_item_g3_moy_p3_mcq_bk112_t1` | B-K.1.1.2 | MCQ | **C** (2) |
| 2 | `pssa_item_g3_moy_p3_mcq_bk112_t2` | B-K.1.1.2 | MCQ | **A** (0) |
| 3 | `pssa_item_g3_moy_p3_mcq_bk113_t1` | B-K.1.1.3 | MCQ | **D** (3) |
| 4 | `pssa_item_g3_moy_p3_mcq_bc311_t1` | B-C.3.1.1 | MCQ | **B** (1) |
| 5 | `pssa_item_g3_moy_p3_mcq_bc312` | B-C.3.1.2 | MCQ | **C** (2) |
| 6 | `pssa_item_g3_moy_p3_ebsr_bc312` | B-C.3.1.2 | EBSR | Part A **B** (1) |
| 7 | `pssa_item_g3_moy_p3_mcq_bv412_ao1` | B-V.4.1.2 | MCQ | **D** (3) |
| 8 | `pssa_item_g3_moy_p3_mcq_bc211_ao3` | B-C.2.1.1 | MCQ | **B** (1) |
| 9 | `pssa_item_g3_moy_p3_ebsr_bc311_ao4` | B-C.3.1.1 | EBSR | Part A **A** (0) |

EBSR Part B is keyed by `correctIndices` (verbatim-excerpt selection), pinned per item in §3.2. Do not re-shuffle any key.

### 3.2 Item constructs (pinned — honor §7.1 / §7.2 of the package)

**Item 1 (`B-K.1.1.2`, Text 1 main idea) — key C.** Stem asks for the BEST main idea of **Text 1**: *a letter takes a long journey through many steps and helpers before it reaches the right home.* Distractors = a true-but-too-narrow detail (ZIP codes are numbers for an area), a wrong-text idea (the carrier's tools/weather — that's Text 2), and an over-broad/off claim (machines have replaced all mail workers).

**Item 2 (`B-K.1.1.2`, Text 2 main idea) — key A.** Stem asks for the BEST main idea of **Text 2**: *a mail carrier's job takes special tools and a careful plan, in every kind of weather.* Distractors = too-narrow (a satchel holds letters and small packages), wrong-text (machines sort thousands of letters an hour — Text 1), off-message (carriers mostly enjoy waving to neighbors).

**Item 3 (`B-K.1.1.3`, Text 1 sequence / cause-effect) — key D.** Pinned to **Text 1's ordered process**: e.g. *what happens to a letter right AFTER it is collected from the mailbox?* → it is brought to a sorting center where machines read the address/ZIP code. Distractors name out-of-order or wrong steps (it flies on an airplane first; the carrier delivers it to the house; the writer adds a stamp). Evidence `passageSlot = passage_1`.

**Item 4 (`B-C.3.1.1`, Text 1 logical connection) — key B.** Pinned to **ONE** Text 1 cause/effect link, distinct from item 3 (§7.1): **destination grouping** — *why is each letter grouped with other letters going to the same place?* → so the mail stays organized and reaches the correct area. **Do NOT also test barcode reading in this item** (one relationship only); **no distractor may restate item 3's "sorting-center" step.** Evidence `passageSlot = passage_1` (`quoted_span` anchored to the destination-grouping sentence).

**Item 5 (`B-C.3.1.2`, difference in focus — cross-text MCQ) — key C.** Pinned to **§7.1 difference-in-focus**: *Text 1 is mainly about the letter's journey through the whole mail system; Text 2 is mainly about one carrier's tools and daily work.* Distractors = reversed focus (Text 1 = the carrier, Text 2 = the system), "same focus" (both are only about sorting machines), and a detail-not-focus claim (both are mainly about ZIP codes). This is a cross-text comparison MCQ (no Part B); it draws on **both** texts.

**Item 6 (`B-C.3.1.2`, shared-idea cross-text EBSR, 2 pts) — Part A key B.** The form's **only cross-text EBSR.** §4 below pins the cross-text Part B contract.
- **Part A** (`responseSpecJson.partA`, 1 correct + 3 distractors, 3 distinct roles): identify the **shared idea** of BOTH texts (§7.1): *careful organization / planning helps each letter reach the correct home.* Distractors = a single-text idea (machines sort many letters quickly — Text 1 only), an opposite claim (the mail system works without any planning), and a too-narrow detail (both texts are about stamps).
- **Part B** (`responseSpecJson.partB`): instruction "Choose **two** sentences — **one from each passage** — that best support the answer to Part A." `requiredSelectionCount = 2`. **Exactly 4 choices: two `passageSlot=passage_1` + two `passageSlot=passage_2`, with one correct and one distractor per passage.** Pinned order `[p1-correct, p1-distractor, p2-correct, p2-distractor]` (p1=`passage_1`, p2=`passage_2`) → **`correctResponseJson.partB.correctIndices = [0, 2]`** (one passage_1 + one passage_2). Each choice is **verbatim** from its named text. Correct evidence targets (pinned verbatim at author time, §9): **passage_1 = the local-post-office re-sort sentence ("When the letters reach the local post office, carriers sort them one more time — now by street and by house number.")** — deliberately **NOT** the destination-grouping sentence, which is item 4's locked primary evidence (the "distinct primary evidence target" rule forbids item 4 and item 6 sharing the same Text 1 sentence); **passage_2 = the carrier's "careful plan" sentence — NOT the route-order/time-saving line** (that line is reserved for AO-4 item 9, so the two EBSRs never share a Text-2 sentence). The author script (and `test-pssa-moy-p3.ts`) must assert: 4 choices, 2-per-slot, one-correct-per-slot, `correctIndices=[0,2]`, **and that item 6's passage_1 correct excerpt is NOT item 4's destination-grouping sentence** (distinct-evidence guard).

**Item 7 (AO-1, `B-V.4.1.2`, analytics) — key D.** Pinned to **§7.2 AO-1**: target = **"The stamp is like a ticket that pays for the trip."** Stem asks what this comparison helps the reader understand → *the stamp is the payment that lets the letter be carried / sent.* Distractors = literal misread (a stamp is an actual paper ticket you tear), wrong relationship (the stamp shows the address), off (the stamp makes the letter travel faster). Evidence `passageSlot = passage_1`.

**Item 8 (AO-3, `B-C.2.1.1`, analytics) — key B.** Pinned to **§7.2 AO-3**: the **author's viewpoint in Text 2** that the carrier's job is **demanding but important/worthwhile** ("not easy, yet carriers take real pride"). Distractors = opposite (the author thinks the job is easy), off-target (the author thinks the job is boring/unimportant), and a viewpoint from the wrong text (Text 1's admiration of the sorting machines). Evidence `passageSlot = passage_2`.

**Item 9 (AO-4, `B-C.3.1.1`, analytics EBSR, 2 pts) — Part A key A. Evidence ENTIRELY from Text 2.**
- **Part A** (1 correct + 3 distractors, 3 distinct roles): the **route-order → time-saving** cause/effect in Text 2 (§7.2, distinct from item 4 which uses Text 1): *why does the carrier put the mail in route order before leaving?* → *so they never have to stop and dig for the next house's letters — it saves time on the street.* Distractors = reversed cause/effect, a wrong reason (to make the bag lighter), and an unsupported inference (to memorize every address).
- **Part B**: instruction "Choose **two** sentences from **'A Mail Carrier's Day'** that best support the answer." **Exactly 4 choices, every one `passageSlot = passage_2`, with two correct + two distractors.** Pinned **`correctResponseJson.partB.correctIndices = [1, 3]`** — a **different index-pair pattern** from item 6's `[0, 2]` (required: the two EBSRs must not share a correct-index pattern). The two correct excerpts are the Text 2 **route-order → time-saving** sentences ("puts the mail in order first" line and the "saves time later on the street" line), verbatim, **distinct from item 6's passage_2 line**. `test-pssa-moy-p3.ts` must assert: 4 choices, all `passageSlot=passage_2`, **no** choice text found in Text 1, `correctIndices=[1,3]`, and `correctIndices` pattern ≠ item 6's.

**EBSR Part B ↔ Part A alignment (items 6 and 9):** Part B distractor sentences must correspond to the **Part A misconceptions** (a distractor sentence is one a student who picked a given wrong Part A answer would plausibly choose), not random off-topic lines. Keep each Part B choice verbatim and anchored to a real sentence in the named text.

## 4. Paired-passage & cross-text EBSR contract (NEW for P3 — read carefully)

This is the first unit that exercises the `PssaPassageGroup` path and the cross-text EBSR. Use only the **existing** canonical shape (verified against `owls_paired_released_length.json` and `pssaScoring.ts`); do NOT add new fields or touch scoring.

1. **One group, two members.** Emit exactly one `PssaPassageGroup` (`groupType="paired_informational"`) with two `PssaPassageGroupMember`s (`slot` = `passage_1` / `passage_2`, `position` 1/2, each with `passageContentHashSnapshot`). All 9 items set `passageGroupId = pssa_pg_g3_moy_p3_mail_paired`.
2. **`passageSlot` is preserved on every EBSR Part B choice** (both EBSRs). For item 6 the choices span both slots; for item 9 every choice is `passage_2`.
3. **Pinned Part B populations (§3.2):** Item 6 = **exactly 4 choices** (two per passage, one correct + one distractor per passage), `correctIndices=[0,2]` (one `passage_1` + one `passage_2`). Item 9 (AO-4) = **exactly 4 choices, all `passage_2`**, two correct, `correctIndices=[1,3]`. **The two EBSRs must use different `correctIndices` index-pair patterns** (`[0,2]` ≠ `[1,3]`), and must not share a Text-2 sentence.
4. **All evidence spans verbatim and anchored.** Every Part B choice text must appear **character-for-character** in the named member passage; the author script verifies each excerpt with a substring check against the correct member text and **STOPs** on any miss. Single-text MCQ evidence (`quotedSpan`) likewise must be verbatim from its `passageSlot` text.
5. **EBSR scoring is unchanged.** Use the canonical `responseSpecJson` (`partA`/`partB`) + `correctResponseJson` (`{partA:{correctIndex}, partB:{correctIndices}}`) shape. Do NOT set `partAPoints`/`partBPoints`/`requirePartACorrectForFullCredit` to anything other than what `pssaScoring.ts` already expects for a 2-pt EBSR; if the existing 2-pt EBSR convention is unclear, **STOP** and report rather than inventing values.

## 5. Answer-choice & distractor quality (blueprint §6.2–6.3 — enforced, P1/P2-hardened)

- MCQ: exactly 4 choices (1 correct + 3 distractors). **Each distractor: a DISTINCT misconception, a UNIQUE registered `distractorRole` (no role repeated within an item), a rationale that truthfully matches that role, and a misconception tag.** If two distractors would share a role, minimally revise one choice's **text** so it embodies a genuinely distinct misconception (do not relabel inaccurately).
- **EBSR Part A** (items 6, 9): same rule — 1 correct + **3 distinct registered roles**.
- Every `distractorRole` must be a key in `mappingRegistry` (`lib/content/pssaInsightMapping.ts`). The conventions trap does not apply here (no conventions items); use the reading-EC roles (`wrong_section`, `wrong_emphasis`, `opposite_claim`, `too_narrow`, `plausible_misreading`, `unsupported_inference`).
- Choices balanced in length/grammar/specificity; correct answer not identifiable by length/detail/style; no joke/impossible options; semantic near-duplicate rule applies (no two distractors expressing the same idea — esp. items 3 vs 4 must not share the same Text 1 cause).
- **EBSR Part B distractors aligned to Part A misconceptions** (§3.2); every Part B choice verbatim + `passageSlot`-tagged.
- Student preview leak-free (no keys/rationales/distractorRoles/`correctIndices`/`factCheckNotesJson`); reviewer preview has keys + rationales + fact-check records.

## 6. Inherited content gates (Rule 0)

All items inherit the full stack: passage grounding (every choice/stem grounded in the correct member text — and the **right** text: a Text-1 item may not be answerable only from Text 2), `PSSA_ITEM_EC_SKILL_MISMATCH` (the question tests the skill its EC names — fix the item, never retag the EC; item 5 = compare *difference in focus*, item 6 = *shared idea* with cross-text evidence, item 8 = POV not purpose), source-compliance no-copy scan, item-type contract per interaction type, batch position-distribution gate. WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

Run **fail-closed** (`set -euo pipefail`, newline-separated — never `;`-chained, which ignores exit codes):

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-moy-p3.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected by P3 content
echo "all P3 gates passed"
```

**`scripts/test-pssa-moy-p3.ts` must assert (P3-focused; authored evidence binding, NOT new DB schema — STOP if schema needed):**
1. **Group/stamina (patched):** exactly one `PssaPassageGroup` with `genre="paired_informational"`, `staminaBand="released_length"` **on the group**, `domainVocabularyLoad="medium"`, `wordCount=796`; its **two** members (`slot` passage_1/passage_2, positions 1/2) → Text 1 (436w, genre `informational`) + Text 2 (360w, genre `informational`); **no member carries `staminaBand`**; both members PENDING/candidate, **no figure feature**; **9 items**, all `passageGroupId = pssa_pg_g3_moy_p3_mail_paired`.
2. Item types/ECs/points per §3; operational MCQ keys (items 1–5) = **C,A,D,B,C**; analytics MCQ keys (7,8) = **D,B**; EBSR Part A keys (6,9) = **B,A**. No `scoringBucket` field is set on any item (assembly-only).
3. **Links & cross-text flags (§3.0) — test per item type, do NOT require `sortOrder` globally:** items 5 & 6 have `isCrossText=true`, `requiredEvidenceSlotsJson=["passage_1","passage_2"]`, and `passageLinks` to **both** members; all other items have `isCrossText` false/null, link to their **one** source member, and omit `requiredEvidenceSlotsJson`. Link-shape assertions split by interaction type (mirror Owls): every **MCQ** and **SHORT_ANSWER** link has keys `passageId`+`role`+`sortOrder` (single-text → `sortOrder:0`; item 5 cross-text → `0`/`1`); every **EBSR** link (items 6, 9) has keys `passageId`+`role` **and no `sortOrder` key**. `role` is always `primary`; no new scalar field exists on any item.
4. **Evidence kind (§3.0):** items 1, 2, 5, and item 6 Part A carry `evidenceKind:"whole_passage_synthesis"` (with `passageSlot`(s)) and **no fabricated `quotedSpan` offsets**; items 3/4/7/8 and both EBSR Part B sets use `quoted_span` whose text is verbatim in the named member passage.
5. Every MCQ **and every EBSR Part A** has **3 distinct** `distractorRole` values; every role ∈ `mappingRegistry`; each distractor rationale nonblank and role-aligned.
6. **Cross-text EBSR (item 6):** Part B has **exactly 4 choices** (two `passage_1` + two `passage_2`, one correct per slot); `correctIndices=[0,2]`; every Part B choice text verbatim in its named member; Part B distractors aligned to Part A misconceptions; **item 6's `passage_1` correct excerpt is NOT item 4's destination-grouping sentence** (distinct primary evidence).
7. **AO-4 EBSR (item 9):** Part B has **exactly 4 choices, every `passageSlot=passage_2`**, two correct; `correctIndices=[1,3]`; both excerpts verbatim in Text 2; **no** Part B choice text appears in Text 1; **`correctIndices` pattern ≠ item 6's** (`[1,3]`≠`[0,2]`).
8. Single-text items 1/3/4/7 bind to passage_1; items 2/8 bind to passage_2; item 5 references both. EC-skill-match passes for all reading MCQ; items 3 and 4 (both Text 1) test **different** cause/effect evidence (item 3 = sorting-center step; item 4 = destination grouping — no shared correct idea, and item 4 does not also test barcode reading).
9. **Fact-check records (§2.1):** both passages set `factCheckRequired:true` and carry `factCheckNotesJson` — **5 `t1-*` records on Text 1, 5 `t2-*` records on Text 2** (10 total), each with all seven keys (`claimId/claim/sourceTitle/organization/sourceUrl/claimSupported/dateAccessed`) populated, `claimSupported===true`, `sourceUrl` `https:` and free of `...`. `PSSA_DOMAIN_FACT_CHECK_REQUIRED` (in `test-pssa-content.ts`) must PASS for both passages; none of `factCheckNotesJson` leaks into the student preview/DTO.
10. **Slot-token purity (parsed JSON, NOT grep):** parse the authored backend JSON and assert the set of all internal slot values — every `PssaPassageGroupMember.slot`, every `requiredEvidenceSlotsJson` entry, every `evidenceBinding.passageSlot`/`passageSlots` entry, every `responseSpecJson.partB.choices[].passageSlot`, and every `provenanceJson.passageSlot` — is **exactly `["passage_1","passage_2"]`** (no `text_1`/`text_2`, no stray tokens). Use a JSON walk over parsed objects, not a text grep.
11. Student DTO/preview leak-free (no key/role/`correctIndices`/`factCheckNotesJson` leakage for any item or either EBSR).

Slot-token purity (#10) — implement as a parsed-JSON walk, not a grep, e.g.:

```ts
const ALLOWED_SLOTS = new Set(["passage_1", "passage_2"]);
const SLOT_KEYS = new Set(["slot", "passageSlot", "passageSlots", "requiredEvidenceSlotsJson"]);
const found = new Set<string>();
(function walk(node: unknown, parentKey?: string) {
  if (Array.isArray(node)) { for (const v of node) walk(v, parentKey); return; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) walk(v, k);
    return;
  }
  if (typeof node === "string" && parentKey && SLOT_KEYS.has(parentKey)) found.add(node);
})(backendJson);
assert.deepEqual([...found].sort(), ["passage_1", "passage_2"], "internal slot values must be exactly passage_1/passage_2");
```

## 7.1 Mechanical safeguards (before the stop report)

- Author run (canonical `noDbWrite`): `npx tsx scripts/content/author-pssa-moy-p3.ts` — writes ONLY `exemplars/pssa_grade3_moy_p3/*`, no DB mutation (`backend.json` `noDbWrite:true`/`productionImportReady:false`).
- Scope guard before commit: `git diff --name-only HEAD` (catches staged+unstaged); `git status --short`. Allowed paths only (§8).
- After commit: `git diff --name-only origin/main...HEAD` and `git status --short` — the branch-wide diff must remain limited to the **six allowed path patterns** in §8 (which include both committed spec docs).

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-moy-p3.ts
scripts/test-pssa-moy-p3.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_moy_p3/*
specs/codex_pssa_moy_p3_items.md
specs/pssa_g3_moy_p3_passage_package.md
```
(Six allowed path patterns total — including the passage package committed in §9.) Anything else (BOY/foundation/MOY-P1/MOY-P2, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md` (do not exist in a fresh worktree).

- One paired group (796w; Text 1 436w + Text 2 360w; no figure) + 9 items per §3; EC/type/points/keys exact; 6 operational (7 pts) + 3 analytics (4 pts); **no `scoringBucket` set**; cross-text EBSR one-from-each-text; AO-4 Text-2-only; unique registry-key roles per MCQ/EBSR-Part-A; Part B aligned + verbatim + `passageSlot`-tagged; leak-free; noDbWrite; scope clean; all gates + regression green.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`). Both P3 docs are **new/untracked** in the current working dir (not yet on `main`), so carry BOTH into the worktree and commit them so the §0.1 preflight reads the approved 796-word hedged package (not a stale/over-specific draft):

```
cd /Users/diaz/pssa-prep-platform-live && git fetch origin
git show-ref --verify --quiet refs/heads/codex/pssa-moy-p3-items && { echo "STOP: branch exists"; exit 1; }
test ! -e ../pssa-moy-p3-items || { echo "STOP: worktree path exists"; exit 1; }
git worktree add ../pssa-moy-p3-items -b codex/pssa-moy-p3-items origin/main
cp specs/pssa_g3_moy_p3_passage_package.md specs/codex_pssa_moy_p3_items.md ../pssa-moy-p3-items/specs/
cd ../pssa-moy-p3-items
git add specs/pssa_g3_moy_p3_passage_package.md specs/codex_pssa_moy_p3_items.md
git diff --name-only HEAD     # expect exactly the 2 spec docs
git commit -m "MOY P3: approved paired passage package + item-authoring spec"
```

**Mandatory post-Step-0 committed-source verification (FAIL-CLOSED)** — run after both P3 docs are committed in the clean worktree. A single `grep -E "a|b|c"` only proves *one* string exists; check each required string individually and exit non-zero on any miss:

```
require_in_commit() {
  file="$1"; text="$2"
  if ! git show "HEAD:$file" | grep -qF "$text"; then
    echo "STOP: required committed text missing"; echo "File: $file"; echo "Text: $text"; exit 1
  fi
}

# item spec self-references + key gate strings
require_in_commit specs/codex_pssa_moy_p3_items.md "npm run test:pssa-db6"
require_in_commit specs/codex_pssa_moy_p3_items.md "specs/pssa_g3_moy_p3_passage_package.md"
require_in_commit specs/codex_pssa_moy_p3_items.md "C, A, D, B, C"
require_in_commit specs/codex_pssa_moy_p3_items.md "one correct excerpt from EACH text"
require_in_commit specs/codex_pssa_moy_p3_items.md "ENTIRELY from Text 2"

# approved package preflight strings (hedged + fact-check + pinned constructs)
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "APPROVED"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "checked against authoritative postal-service / postal-history sources"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "Sources are kept in reviewer metadata only"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "The stamp is like a ticket that pays for the trip"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "not easy, yet carriers take real pride"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "Part B must use one verbatim excerpt from EACH text"
# remaining §0.1 strings (hedging statement + hedges + reserved-evidence table)
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "avoids claims that every route, vehicle, or facility works exactly the same way"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "some routes"
require_in_commit specs/pssa_g3_moy_p3_passage_package.md "Reserved evidence per item (LOCKED"

# reject the over-specific postal claims that were removed in revision
for bad in \
  "red flag" \
  "sprayed lines" \
  "steering wheel on the right" \
  "tells exactly where" \
  "right-hand drive" \
  "grouped so none is lost" \
  "so none gets lost"
do
  if git show HEAD:specs/pssa_g3_moy_p3_passage_package.md |
     grep -qF "$bad"; then
    echo "STOP: stale P3 package wording was committed ($bad)"
    exit 1
  fi
done

# ASSERT combined/per-text word counts programmatically (796 / 436 / 360) from the committed package.
# NOTE: dump to a temp file first — a `git show ... | python3 - <<'PY'` pipe does NOT work,
# because the heredoc replaces stdin, so the piped package never reaches Python.
git show HEAD:specs/pssa_g3_moy_p3_passage_package.md > "${TMPDIR:-/tmp}/p3pkg.md"
P3PKG="${TMPDIR:-/tmp}/p3pkg.md" python3 - <<'PY'
import os, re, sys
txt = open(os.environ["P3PKG"]).read()
t1 = txt.split("### Text 1: How a Letter Travels")[1].split("### Text 2:")[0]
t2 = txt.split("### Text 2: A Mail Carrier's Day")[1].split("\n---")[0]
wc = lambda s: len(re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z]+)?", s))
c1, c2 = wc(t1), wc(t2)
exp = {"text1": 436, "text2": 360, "combined": 796}
got = {"text1": c1, "text2": c2, "combined": c1 + c2}
if got != exp:
    print(f"STOP: committed P3 word counts {got} != expected {exp}"); sys.exit(1)
print(f"word counts OK: {got}")
PY

# the documentation commit must contain EXACTLY the two intended files — COMPARE, don't just print:
actual="$(git show --name-only --pretty=format: HEAD | sed '/^$/d' | sort)"
expected="$(printf '%s\n' specs/codex_pssa_moy_p3_items.md specs/pssa_g3_moy_p3_passage_package.md | sort)"
if [ "$actual" != "$expected" ]; then
  echo "STOP: documentation commit file set is not exactly the two spec docs"
  echo "--- actual ---"; printf '%s\n' "$actual"
  echo "--- expected ---"; printf '%s\n' "$expected"
  exit 1
fi

echo "committed-source verification passed"
```

**If any check fails, STOP.** Re-copy both documents from the primary working tree (`/Users/diaz/pssa-prep-platform-live/specs/`), amend the documentation commit, and rerun this verification before authoring.

Then: preflight (§0.1) → author (group + two passages + 9 items) → gates → scope guard → commit (no merge) → report. Independent audit before merge. After merge: `git worktree remove ../pssa-moy-p3-items`.
