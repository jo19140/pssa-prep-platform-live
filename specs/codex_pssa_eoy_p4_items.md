# Codex Spec — EOY P4 Item Authoring (Grade 3, drama single "The Borrowed Bike")

**Type:** content authoring (detector-first). **Owner:** Jonathan. **Date:** 2026-06-25.
**Preconditions:** EOY blueprint APPROVED/LOCKED (`specs/pssa_g3_eoy_blueprint_finalization.md`). **P4 passage package APPROVED/LOCKED** (`specs/pssa_g3_eoy_p4_passage_package.md`, **exactly 1,137 words**, drama, `factCheckRequired:false`, 7-item reserved evidence pinned, drama features pinned in §7.2, §9 regression assertions). P1/P2/P3 merged on `origin/main`. **This is the last EOY passage.**
**Single passage (Category A literary drama, four scenes), NO figure, original fiction (`factCheckRequired:false`).** Section **S1**. Hosts **7 items: 6 operational (7 pts) + 1 analytics-only (1 pt)** — the analytic is **AO-6** (A-V.4.1.2, the documented drama deepen exception) from the locked blueprint.

## 0. Scope & guardrails

- Author **one passage (P4) + 7-item set**, file-based (`noDbWrite`), all `reviewStatus=PENDING`/`itemStatus=candidate`.
- Do NOT modify `pssaScoring.ts`, the distractorRole registry (`lib/content/pssaInsightMapping.ts`), delivery, the figure module, schema, or BOY/foundation/MOY/EOY-blueprint/EOY-merged content. Do NOT assemble the form, and **do NOT set `scoringBucket`** (assembly-only; AO-6 becomes `analytics_only` at EOY form assembly).
- **Drama mechanics: mirror `scripts/content/author-pssa-moy-p4.ts` ("The Last Rehearsal") exactly** — the `mcq(...)`/`ebsr(...)` builders, per-choice evidence-tuple shape `[text, role|null, rationale, quotedSpan, evidenceKind, speaker?]`, item-level `evidenceBinding`, EBSR `partA`/`partB`/`correctResponseJson`/`scoringJson.totalPoints:2`. Adapt **only the content** to P4's verified anchors below. NO figure feature, NO `factCheckNotesJson`.
- **No matching grid / SA on P4.** The only multipoint item is the **EBSR** (item 26, 2 pts).
- STOP and report on any schema/scorer/route/player need. Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed (§9).

## 0.1 Source-package preflight (run FIRST — FAIL-CLOSED)

Verify the **committed** P4 package (`git show HEAD:specs/pssa_g3_eoy_p4_passage_package.md`):
- status **APPROVED / LOCKED**; the script (CAST front matter + four `## SCENE` scenes) word count = **1,137** (programmatic, §9 — the exact repo tokenizer, over the author-extracted text);
- **period-free speaker labels**: `MR ALVAREZ:` present; **`MR. ALVAREZ:` absent** (the dotted label would fall through to `stage_direction` under `/^([A-Z][A-Z\s'-]*):\s*(.+)$/`);
- exactly **four** `## SCENE` headings; **no bold** (`**`) in the script;
- the two Scene-2 EBSR lines present **verbatim**: `You were probably showing off, doing wheelies, not even looking.` and `I don't want to hear it. Just go home, Tyler.`;
- the reserved anchors present verbatim: `I saved up two whole summers of chore money for it.` · `cold as ice` · `He swerved so fast that he scraped the whole side.` · `I jumped to conclusions.`;
- §7 reserved-evidence table (7 rows) + §7.1 EBSR shape + §7.2 drama features + §9 regression assertions all present.

If any fails, **STOP**.

## 1. Deliverables

- `scripts/content/author-pssa-eoy-p4.ts` (mirror `author-pssa-moy-p4.ts` — single-passage drama, NO figure, NO fact-checks; passage + 7 items).
- Exemplars under `exemplars/pssa_grade3_eoy_p4/` (backend.json, student_preview.md, reviewer_preview.md, answer_key_and_rubric.md, audit CSV); wire into `scripts/test-pssa-content.ts`.
- `scripts/test-pssa-eoy-p4.ts` (structure + drama-parser + features + reserved-evidence + EBSR-smoke regression; §7).

## 2. Passage authoring (drama)

From the approved package (**verbatim text; do not rewrite**):
- `id` = `pssa_psg_g3_eoy_p4_borrowed_bike`; `title` "The Borrowed Bike"; gradeLevel 3; subject ELA; `passageType:"literary"`; **`genre:"drama"`**; `staminaBand:"released_length"`.
- **Passage text extraction** (mirror `extractEoyP2PassageText`): `source.split("## 2. Script")[1]` → drop the header-remainder line → `.split("\n---")[0]` (strips the trailing `---` separator) → split lines, `trim`, drop empties, `.replace(/^#{3,}\s+/,"").replace(/\*\*/g,"")` (this **preserves `## SCENE` headings**, which use two `#`) → `join("\n\n")`. Assert the repo tokenizer `(text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) ?? []).length === 1137`; set `wordCount = 1137`.
- **`textFeaturesJson`** (drama features — the drama stamina branch requires `featureRows.length > 0`; package §7.2):
  - **one `cast_list`** with `featureText` = the **exact post-extraction CAST block**, i.e. the double-newline form
    `"CAST OF CHARACTERS\n\nMAYA, a third-grader who owns the bike\n\nTYLER, her friend\n\nMR ALVAREZ, a neighbor"` —
    **assert `passage.text.includes(featureText)` fail-closed** (the line-rejoin makes this the `\n\n` form, NOT single `\n`); derive it programmatically from `passage.text.split("## SCENE 1")[0].trim()` rather than retyping.
  - **four `scene_marker`** features, `sectionId` = `scene_01`/`scene_02`/`scene_03`/`scene_04`; **verify fail-closed** each id ∈ `buildPssaStaminaSectionMap(passage).map(s => s.sectionId)` before pinning; **no `featureText`**.
  - (No `stage_direction` features required; if any are added, each `featureText` MUST be an exact `passage.text` substring.)
- `factCheckRequired:false`; **omit `factCheckNotesJson`** entirely (like MOY P4 / EOY P2).
- EOY identity in `provenanceJson` (`benchmarkSeason:"EOY"`, `blueprintVersion:"pde-ela-diagnostic-stamina-2025-g3-eoy-v1"`, `unit:"P4"`); metadata `internal_original`/`cleared_internal_original`/`commercialUseAllowed:true`/`needsLegalReview:false`; PENDING/candidate.
- Non-overlap: distinct from BOY + all MOY + EOY P1–P3 content (package §8).
- **Every evidence `lineIndex` and `quotedSpan` is derived from `buildPssaDramaLineMap(passage)` on the extracted text — never hand-counted.** The verified line-map coordinates below are the expected values; assert them.

## 3. Item set (7 items) — IDs, types, keys, reserved evidence

Reserved evidence is **LOCKED in package §7 / §7.1** — author to those exact anchors; do not reuse a primary line, vocab phrase, or motivation across selected-response items. **Verified `buildPssaDramaLineMap` coordinates** (on the author-extracted text) are given per item; the `quotedSpan` is matched against the line-map row via `row.text.includes(quotedSpan)` (line-map `text` retains the `SPEAKER:` prefix).

| # | Item ID | EC | Type | Pts | Bucket (assembly) | Key | Reserved evidence (pkg §7) — verified coords |
|---|---|---|---|---|---|---|---|
| 21 | `pssa_item_g3_eoy_p4_mcq_ak111` | A-K.1.1.1 | MCQ | 1 | operational | **C** (2) | Explicit — why the bike matters: `"I saved up two whole summers of chore money for it."` (MAYA, `scene_01`, lineIndex **4**) |
| 22 | `pssa_item_g3_eoy_p4_mcq_ak113` | A-K.1.1.3 | MCQ | 1 | operational | **A** (0) | **Sequence** — order across the four scenes (lend → scratch/confront → reveal → apologize); item-level `evidenceBinding:{evidenceKind:"whole_play_synthesis"}`, `comprehensionKind:"synthesis"`; each choice anchored to a concrete scene line/direction |
| 23 | `pssa_item_g3_eoy_p4_mcq_av411` | A-V.4.1.1 | MCQ | 1 | operational | **D** (3) | Word meaning — **"swerved"** = turned suddenly aside; correct-choice anchor `"He swerved so fast that he scraped the whole side."` (MR ALVAREZ, `scene_03`, lineIndex **5**); item-level `evidenceBinding:{evidenceKind:"quoted_span", targetWordOrPhrase:"swerved"}` |
| 24 | `pssa_item_g3_eoy_p4_mcq_av412` | A-V.4.1.2 | MCQ | 1 | operational | **B** (1) | Figurative — **"cold as ice"** = angry/unkind; anchor MAYA `scene_02` lineIndex **3** (`"her words coming out cold as ice"`); `evidenceBinding:{evidenceKind:"quoted_span", targetWordOrPhrase:"cold as ice"}` |
| 25 | `pssa_item_g3_eoy_p4_mcq_ak112` | A-K.1.1.2 | MCQ | 1 | operational | **C** (2) | **Theme/message (inferred)** — *ask / listen before you jump to conclusions*; item-level `evidenceBinding:{evidenceKind:"whole_play_synthesis"}`, `comprehensionKind:"synthesis"`; each choice anchored to a concrete line |
| 26 | `pssa_item_g3_eoy_p4_ebsr_ak113` | A-K.1.1.3 | **EBSR** | 2 | operational | Part A **A** (0) | Motivation→action — §7.1; Part B = the two `scene_02` MAYA lines, lineIndex **5** + **7** |
| AO-6 | `pssa_item_g3_eoy_p4_mcq_av412_ao6` | A-V.4.1.2 | MCQ | 1 | **analytics_only** | **B** (1) | Figurative ≠ #24 — **"I jumped to conclusions"** = decided without the facts; anchor MAYA `scene_04` lineIndex **5** (`"I jumped to conclusions."`); `evidenceBinding:{evidenceKind:"quoted_span", targetWordOrPhrase:"jumped to conclusions"}`; **line reserved to AO-6 only** |

Operational = 5 MCQ×1 + 1 EBSR×2 = **7 pts** (6 items). Analytics = 1 MCQ×1 = **1 pt** (AO-6). **No `scoringBucket` set in authoring.** Operational MCQ keys (21–25) **C, A, D, B, C**; AO-6 **B**; EBSR Part A **A**. Position spread {A:1,B:2,C:2,D:1} — the **batch position-distribution gate must pass**, and **no correct choice may be the longest** of its four (stamina gate-parity finding). Per-form A8/B7/C7/D7 reconciles at assembly. EC repeats within P4: **A-K.1.1.3 ×2** (#22 sequence + #26 motivation→action, distinct facets), **A-V.4.1.2 ×2** (#24 "cold as ice" + AO-6 "jumped to conclusions", distinct phrases, AO-6's line reserved); A-K.1.1.1 / A-V.4.1.1 / A-K.1.1.2 singletons — all ≤3, blueprint-reconciled.

## 4. Drama evidence-link contract (verified against `validateDramaEvidenceLink`)

Every structured MCQ choice (all 4) and every EBSR Part-B option carries a per-choice **evidence link**. For drama:
- **Literal evidence (`spoken_line` / `stage_direction`)** requires **`quotedSpan` (exact `passage.text` substring) + `sceneId` (`/^scene_\d{2}$/`) + integer `lineIndex`**, with **`speaker` for `spoken_line`** and **`speaker` omitted for `stage_direction`**. It **omits** `paragraphIndex`/`sentenceIndex`/char-offsets but **never omits `quotedSpan`**. (The builder mirrors MOY P4: the per-choice tuple supplies `quotedSpan` + `evidenceKind` + optional `speaker`; `sceneId`/`lineIndex` derived from the line map.)
- **`whole_play_synthesis`** (items 22, 25 item-level binding) carries **no literal-location fields** (no `quotedSpan`/`sceneId`/`lineIndex`/`sectionId`/char-offsets — the detector rejects any of them) and pairs with `comprehensionKind:"synthesis"`.
- **`quoted_span`** (items 23, 24, AO-6 item-level vocab binding) names `targetWordOrPhrase`; the per-**choice** evidence links still use `spoken_line`/`stage_direction` exactly as MOY P4's `av411`/`av412` do.
- **Item 23's `swerved` resolves to MR ALVAREZ's `scene_03` line** (not Maya's "He swerved. To miss Sofia." echo at `scene_03` lineIndex 6) — assert the correct-choice link is `sceneId:"scene_03"`, `speaker:"MR ALVAREZ"`, `evidenceKind:"spoken_line"`.

## 5. Answer-choice & distractor quality (blueprint §6.2–6.3 — P1–P4-hardened)

- MCQ distractor rule: 4 choices = 1 correct + 3 incorrect. **Each of the three incorrect choices has a distinct, registered reading `distractorRole`** (∈ `mappingRegistry` reading roles: `unsupported_inference`, `wrong_section`, `opposite_claim`, `plausible_misreading`, `wrong_emphasis`, `too_narrow`), with a truthful role-aligned rationale. **`distractorRole` IS the misconception tag.** **The correct choice carries no `distractorRole`** (`null`, set only on the three incorrect). Balanced length/style; no near-duplicates; correct never the longest.
- **EBSR (item 26)** — mirror MOY P4 `ebsr(...)`: `scoringJson.totalPoints:2` (`partAPoints:1`,`partBPoints:1`,`requirePartACorrectForFullCredit:true`); `correctResponseJson = {partA:{correctIndex:0}, partB:{correctIndices:[…]}}`; `partB.requiredSelectionCount:2`. **Part A** ("Why does Maya tell Tyler to go home before he can explain?") correct = *she has already decided he was careless, so she will not listen*; 3 Part-A distractors each a distinct registered role. **Part B (select 2)** = the two **`scene_02` MAYA** lines **verbatim**: `"You were probably showing off, doing wheelies, not even looking."` (lineIndex **5**, assumed-carelessness motivation) + `"I don't want to hear it. Just go home, Tyler."` (lineIndex **7**, the action). **Plausible-wrong Part-B options:** a `scene_01` lending line (e.g. TYLER lineIndex 5) + a `scene_04` apology line (e.g. MAYA lineIndex 3) — different motivation/time. The two correct Part-B lines must be **disjoint** from the MCQ anchors (#21 chore-money, #23 swerved, #24 cold-as-ice, #25 message, AO-6 jumped-to-conclusions).
- **AO-6 ≠ #24:** both A-V.4.1.2 but **distinct figurative phrases**; AO-6's `"I jumped to conclusions."` line is **reserved to AO-6 only** (no other item may quote it).
- Student preview leak-free (no keys/rationales/`distractorRole`/`correctIndex`); reviewer preview carries keys + rationales.

## 6. Inherited content gates (Rule 0)

Full stack: passage grounding (every choice/stem grounded in the P4 script), `PSSA_ITEM_EC_SKILL_MISMATCH` (#22 = sequence/order NOT motivation; #26 = motivation→action; #23/#24/AO-6 = vocabulary; #25 = central message), drama feature integrity + the drama branch of `evaluatePssaTextFeatureIntegrity`, the drama branch of `evaluatePssaPassageStaminaMetadata` (`featureRows>0`), item-type contracts (MCQ/EBSR), source-compliance no-copy, batch position-distribution. `factCheckRequired:false` → **no** fact-check records expected (drama is original fiction; the informational fact-check gate does not apply). WARN-with-justification ≠ pass.

## 7. Gate battery + regression assertions

```
set -euo pipefail
npx tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
npx tsx scripts/test-pssa-content.ts
npx tsx scripts/test-pssa-eoy-p4.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6        # BOY/foundation + form-assembly regression unaffected by EOY P4 content
echo "all EOY P4 gates passed"
```

**`scripts/test-pssa-eoy-p4.ts` asserts:** (1) 1 passage (`genre:"drama"`, `passageType:"literary"`, `released_length`, `wordCount===1137` via the exact repo helper, `factCheckRequired:false`, **no `factCheckNotesJson`**, no figure feature) + 7 items; types/ECs/points/IDs per §3; op MCQ keys C,A,D,B,C; AO-6 B; EBSR Part A A; no `scoringBucket` on any item. (2) **Drama parser** (`buildPssaDramaLineMap`): **every** colon-labeled character line parses as `spoken_line` (0 misclassified); the parsed speaker set is exactly `{"MAYA","TYLER","MR ALVAREZ"}` (no `"MR. ALVAREZ"`, no empty speaker); 4 `## SCENE` scenes → `scene_01`–`scene_04`. (3) **Drama features**: one `cast_list` whose `featureText` is an exact `passage.text` substring (the `\n\n` CAST block); four `scene_marker` with `sectionId` ∈ the stamina section map; `evaluatePssaPassageStaminaMetadata(passage)==="PASS"` **and** `evaluatePssaTextFeatureIntegrity(passage, p4Items)==="PASS"` (the exported wrapper — the private `evaluateDramaFeatureIntegrity` is **not** importable; it returns `"SKIP"` with no features, so the cast/scene features are what yield `"PASS"`). (4) **Reserved evidence**: item 23's `swerved` correct-choice link = `scene_03`/`MR ALVAREZ`/`spoken_line` (matched via `row.text.includes(quotedSpan)`); item 21 = chore-money MAYA `scene_01` lineIndex 4; item 24 = "cold as ice" MAYA `scene_02` lineIndex 3; AO-6 = "I jumped to conclusions." MAYA `scene_04` lineIndex 5; the AO-6 line is quoted by **no other item**. (5) **EBSR**: `scoringJson.totalPoints===2`; `correctResponseJson.partB.correctIndices` select the two `scene_02` MAYA lines (lineIndex 5 + 7, verbatim); Part-B plausible-wrong are a `scene_01` + a `scene_04` line; the two correct Part-B lines are disjoint from all MCQ anchors. (6) Every MCQ has **exactly 3 distinct registered `distractorRole`s on its 3 incorrect choices, correct choice `distractorRole:null`**; #22 + #25 carry `comprehensionKind:"synthesis"`; no correct choice is the longest of its four. (7) EC-skill-match passes; student DTO/preview leak-free (no keys/rationales/`distractorRole`/`correctIndex`). (8) `scorePssaItem` smoke: a Part-A-correct + both-Part-B-correct response to item 26 returns `{status:"scored", pointsEarned:2, maxPoints:2, detail:"ebsr_full_credit"}`.

## 7.1 Mechanical safeguards
- Author run (`noDbWrite`): `npx tsx scripts/content/author-pssa-eoy-p4.ts` writes ONLY `exemplars/pssa_grade3_eoy_p4/*`.
- Scope guard before + after commit: `git diff --name-only HEAD` / `git diff --name-only origin/main...HEAD` limited to the §8 paths.

## 8. Acceptance criteria — allowed tracked paths only

```
scripts/content/author-pssa-eoy-p4.ts
scripts/test-pssa-eoy-p4.ts
scripts/test-pssa-content.ts            (tranche wiring only)
exemplars/pssa_grade3_eoy_p4/*
specs/codex_pssa_eoy_p4_items.md
specs/pssa_g3_eoy_p4_passage_package.md
```
Anything else (BOY/foundation/MOY/EOY-blueprint, EOY P1–P3, scoring, registry, figure module, schema, delivery) → STOP. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 9. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); carry BOTH P4 docs into the worktree and commit them so §0.1 reads the approved 1,137-word package. Absolute-path, fail-closed (same pattern as the MOY/EOY specs):

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-eoy-p4-items
cd "$PRIMARY"; git fetch origin
if git show-ref --verify --quiet refs/heads/codex/pssa-eoy-p4-items; then echo "STOP: branch exists"; exit 1; fi
test ! -e "$WORKTREE" || { echo "STOP: worktree path exists"; exit 1; }
git worktree add "$WORKTREE" -b codex/pssa-eoy-p4-items origin/main
cd "$WORKTREE"
test "$(git branch --show-current)" = "codex/pssa-eoy-p4-items"
test -z "$(git status --short)"
ln -s "$PRIMARY/node_modules" node_modules    # sibling worktree has no node_modules; symlink + clean up at end
cp "$PRIMARY/specs/pssa_g3_eoy_p4_passage_package.md" "$PRIMARY/specs/codex_pssa_eoy_p4_items.md" specs/
git add specs/pssa_g3_eoy_p4_passage_package.md specs/codex_pssa_eoy_p4_items.md
git diff --name-only HEAD     # expect exactly the 2 spec docs
git commit -m "EOY P4: approved passage package + item-authoring spec"
```

**Committed-source verification (FAIL-CLOSED)** — after both docs committed: assert the package contains `APPROVED / LOCKED`; `MR ALVAREZ:` present and `MR. ALVAREZ:` absent; the two Scene-2 EBSR lines + the four reserved anchors present verbatim; exactly four `## SCENE` headings; no `**` in the script. **Word-count method (temp-file python, not a heredoc pipe; mirror the EOY P1/P2 §9 method):** `git show HEAD:specs/pssa_g3_eoy_p4_passage_package.md` → temp file; slice from `## 2. Script` to the next standalone `---`, drop the header-remainder line, keep scene/speaker/stage lines (strip `#{3,}` and `**`), count with `re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?", region)`; assert `== 1137`. Exactly-two-file commit-set check. STOP on any miss.

Then: preflight (§0.1) → author (passage + 4 drama features + 7 items, every `lineIndex`/`quotedSpan` from `buildPssaDramaLineMap`) → §7 gates → scope guard → commit (no merge) → report. **Independent audit before merge** (Claude runs the pinned-merge: exact audited tip + base SHA pins, exact file-set `diff -u` contract, gates on the merged result, reproducibility regeneration, remote verification before guarded cleanup).
