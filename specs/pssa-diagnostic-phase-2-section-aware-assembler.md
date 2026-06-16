# PSSA Diagnostic — Phase 2: section-aware + passage-group-aware assembler
## Grade 3, 3-section / 3-session, 45-point diagnostic form

Prereqs merged to main: Phase 1 (section schema + GRADE3_DIAGNOSTIC_BLUEPRINT); Phase 1.5 (39-item Grade 3 stamina pool incl. 2 TE 3-point items, 87677ba).
This is ASSEMBLER-ONLY. Do not change item content, passage text, answer keys, EBSR evidence, EC metadata, scoring engine (pssaScoring.ts), schema, migrations, foundation content, or flat assembly behavior.

## Goal
Add a section-aware and passage-group-aware assembler that turns the approved 39-item Grade 3 stamina candidate pool into a deterministic 3-section / 3-session / 45-point diagnostic form. The form SELECTS 35 of the 39 items. Shape: 3 sections; 45 points; 4 reading passage units; 20 reading MCQ; 9 conventions MCQ; 2 EBSR @2pt; 2 TE multipoint @3pt; 2 short-answer @3pt. EBSR stays 2 points; the 3-point items are TE multipoint, not EBSR; platform-authored PSSA-style items, not released-item clones.

## Canonical session contract (the assembler must produce this EXACT pinned form)

### Section 1 — Syrup + conventions  (unit: Syrup single passage)
Selected: syrup_01, syrup_02, syrup_03, syrup_04, syrup_dd_01, syrup_sa_01, conv_01, conv_02, conv_03, conv_04, conv_05
Distribution: reading MCQ 4, conventions 5, EBSR 0, TE 1, SA 1 = 11 items, 15 pts (4 + 5 + 3 + 3).

### Section 2 — Boat  (unit: Boat single passage)
Selected: boat_01, boat_02, boat_03, boat_04, boat_05, boat_ebsr_01, boat_mg_01, boat_sa_01
Distribution: reading MCQ 5, conventions 0, EBSR 1, TE 1, SA 1 = 8 items, 13 pts (5 + 2 + 3 + 3).

### Section 3 — Owls paired + Rabbit + conventions  (units: Owls paired group + Rabbit single passage)
Selected: owls_01, owls_02, owls_03, owls_04, owls_05, owls_ebsr_01, rabbit_01, rabbit_02, rabbit_03, rabbit_04, rabbit_05, rabbit_06, conv_06, conv_07, conv_08, conv_09
Distribution: reading MCQ 11, conventions 4, EBSR 1, TE 0, SA 0 = 16 items, 17 pts (11 + 4 + 2).

### Whole-form totals
Passage units 4; reading MCQ 20; conventions 9; EBSR 2; TE 2; SA 2; student-facing items 35; total 45 (20 + 9 + 6 SA + 4 EBSR + 6 TE).
Selected multipoint: EBSR boat_ebsr_01, owls_ebsr_01; TE syrup_dd_01, boat_mg_01.
Selected SA: syrup_sa_01, boat_sa_01.
Candidate items intentionally NOT selected: syrup_ebsr_01, rabbit_ebsr_01, owls_06, rabbit_sa_01. (The 39-item pool is a candidate pool; the form selects 35.)

## Two new assembler capabilities

### 1. Passage-group awareness
Define a passage UNIT = a single passage OR a paired passage group. The pool has exactly 4 units: Syrup, Boat, Owls paired group, Rabbit.
Owls group: passageGroupId pssa_pg_g3_owls_paired_01; members pssa_stamina_psg_g3_owls_p1_night, pssa_stamina_psg_g3_owls_p2_barn; grouped owl items have passageId:null and classify by passageGroupId; cross-text owl items owls_05, owls_06, owls_ebsr_01.
Rules: owls group counts as 1 reading passage unit (not 2 raw passages); both member passages emitted as PssaFormPassage rows sharing one sectionIndex; every SELECTED owl item shares that sectionIndex; the group is never split; a grouped owl item with passageId:null + valid passageGroupId must NOT trigger missing_primary_passage.
Correction: do NOT require all 7 owl candidates to be selected. Canonical selected owl items: owls_01..05 + owls_ebsr_01. Canonical unselected: owls_06 (Section 3 has 0 short answers; selecting owls_06 would add a 3rd SA and break the 45-pt blueprint).

### 2. Section layer (Phase 1 PssaFormSection schema)
Create 3 PssaFormSection rows; assign sectionIndex to every selected PssaFormItem and PssaFormPassage; include section composition in the sectioned-form contentHash (hasSections=true path); leave flat foundation forms byte-identical. Use GRADE3_DIAGNOSTIC_BLUEPRINT.sections for section count/type/label/estimatedMinutes/per-section passage-unit/conventions/short-answer counts. Do not invent schema fields.

## Unit-to-section assignment policy
Canonical placement (not seed-random): Section 1 = Syrup; Section 2 = Boat; Section 3 = Owls paired group + Rabbit. Seed is used only for ordering/tie-breaking inside this fixed policy, not to change the layout. This preserves the blueprint pattern (units 1/1/2, conventions 5/0/4, short answers 1/1/0) and keeps the cross-text owls group out of the lone reading section (S2).

## Selection policy
The canonical form is PINNED BY ITEM ID above. Treat those 35 items as the selection TARGET and use the existing gate machinery (classifyAssemblyItem, validateSelectedForm) to CONFIRM gate-compliance — do NOT search `combinations` and hope a seed lands on this exact EBSR pair. (The combinatorial search stays for the general/foundation path; the diagnostic path selects to the pinned contract.) Extend additively for: group-aware classification, group-aware primary passage unit, unit-based passage_count, section assignment, and GRADE3_DIAGNOSTIC_BLUEPRINT. Add a new function `assembleDiagnosticFormFromPool(...)` (or a parameterized path) that leaves assemblePssaFormFromPool unchanged.
Each SELECTED item follows its passage unit: single-passage item sectionIndex = its unit's sectionIndex; grouped item sectionIndex = its passageGroupId unit's sectionIndex. Unselected candidate items remain outside the form.

## Validation
Per-section assert exactly:
- S1: units 1 (Syrup), reading 4, conventions 5, EBSR 0, TE 1, SA 1, items 11, points 15.
- S2: units 1 (Boat), reading 5, conventions 0, EBSR 1, TE 1, SA 1, items 8, points 13.
- S3: units 2 (Owls group + Rabbit), reading 11, conventions 4, EBSR 1, TE 0, SA 0, items 16, points 17.
Whole-form assert exactly: total 45; items 35; units 4; reading 20; conventions 9; EBSR 2; TE 2; SA 2; multipoint items 4; multipoint points 10; answer-position A8/B7/C7/D7 for selected single-answer MCQ + conventions.
All existing selected-form gates must pass, now UNIT-aware: total_points, passage_count (counts UNITS; owls group = 1; both members still emitted as rows), reading_1pt count, conventions count, multipoint count, multipoint point variety, multipoint pattern variety, short_answer count, reporting-category ranges, answer-position balance, reading EC repeat limits, no duplicate items, no orphan refs, passage membership, EBSR integrity.

## Reading EC repeat policy
Phase 1.5 intentionally created pool-level EC repeats: E03.B-K.1.1.3 ×3 (syrup_03, syrup_sa_01, syrup_dd_01); E03.A-K.1.1.1 ×3 (boat_05, rabbit_03, boat_mg_01). Allowed at the pool level. The selected form enforces maxReadingEcRepeats=2 per the gate's actual scope. Prior source inspection: reading_ec_variety counts ONLY reading_1pt, so TE/SA should not trip it; CONFIRM in tests. If the pinned form fails maxReadingEcRepeats=2 because the gate counts TE/SA: STOP, report the failing gate, do NOT relax the gate, do NOT change item ECs, do NOT edit content. That is a design decision, not an implementation detail.

## Genre/category balance
Do not add per-section A/B quotas unless the blueprint includes them. Validate categories A/B/D at the full-form level only.

## Determinism
Same seed + pool + blueprint ⇒ byte-stable selected item IDs, section assignment, item order, passage rows, section rows, contentHash, form JSON. Assemble twice, compare JSON+hash, must be identical. No unseeded randomness.

## Flat foundation path must be untouched
Prove: assemblePssaFormFromPool output unchanged for the foundation pool; GRADE3_BLUEPRINT unchanged; DB-6 tests green; foundation probe 7/91/12/12/8 hashStable; flat form contentHash byte-identical. Add the diagnostic assembler as a new function/parameterized path; do not break assemblePssaFormFromPool, DB-6 tests, or PR-B/C/D flows.

## Hard constraints
Assembler/form logic only. Do not change item content/passage/keys/EBSR evidence/EC/scoring/pssaScoring.ts/schema/migrations/foundation/flat behavior. Do not commit student report PDFs, anchor-analysis exports, student-level data, p2-band-7-8-ae-content files, or tsconfig.tsbuildinfo churn. If the pool cannot satisfy the blueprint deterministically: STOP, report the failing gate/section, do not relax a gate or edit content/scoring/schema.

## Positive tests
1. Assemble the 39-item pool with a fixed seed. 2. Exactly 3 sections. 3. Canonical layout (S1 Syrup, S2 Boat, S3 Owls group + Rabbit). 4. Selected item IDs by section match the canonical contract exactly. 5. Section totals (11/15, 8/13, 16/17; whole 35/45). 6. Whole-form type counts (20 reading, 9 conv, 2 EBSR, 2 TE, 2 SA). 7. Multipoint composition (2 EBSR, 2 TE, 2-pt + 3-pt variety). 8. Both TE selected (syrup_dd_01, boat_mg_01). 9. Selected EBSRs (boat_ebsr_01, owls_ebsr_01). 10. Selected SA (syrup_sa_01, boat_sa_01). 11. Omitted not selected (syrup_ebsr_01, rabbit_ebsr_01, owls_06, rabbit_sa_01). 12. All selected owl items + both owl passages in one section. 13. Owls group counts as 1 unit. 14. Grouped owl item with passageId:null + valid passageGroupId does not fail missing_primary_passage. 15. Every selected EBSR intact (Part A+B same item & section). 16. No duplicates / no orphans. 17. Determinism: same seed = same IDs/sections/JSON/hash. 18. Flat foundation path output unchanged.

## Negative tests
1. Paired group split (force one owl member into another section) → fail group-integrity. 2. EBSR Part B missing → fail EBSR integrity. 3. Duplicate item id → fail duplicate gate. 4. Impossible section count → explicit section-count error. 5. Missing a 3-pt TE → fail multipoint point-variety. 6. Fifth passage unit → fail passage_count. 7. Grouped item with passageId:null and NO valid passageGroupId fails cleanly; with valid passageGroupId passes primary-unit classification.

## Privacy + scope guards (before commit/push)
matches="$(git grep -n "PSSA ELA: Anchor Analysis by Student" -- . ':!specs/pssa-diagnostic-phase-2-section-aware-assembler.md' || true)"
if test -z "$matches"; then echo "privacy grep clean"; else echo "$matches"; echo "STOP: student-level PSSA report data found in committed files"; exit 1; fi
Scope: git diff --name-only main...HEAD — expect only assembler/form logic + tests + this spec + (optional) regenerated report. STOP-worthy: pssaScoring.ts, schema.prisma, migrations, item fixture content changes, passage text changes, foundation content, p2-band-7-8-ae-content, student data exports, tsconfig.tsbuildinfo.

## Commands
npx tsc --noEmit ; OPENAI_API_KEY=sk-build-dummy npm run build ; npm run test:pssa-content ; npm run test:pssa-db6 ; npm run test:pssa-pr-b ; relevant PR-C/PR-D if part of the form-render/scoring path.

## Stop report
branch; commit SHA; files changed; confirm no content/scoring/schema/foundation changes; confirm no student data committed; assembled form summary (section IDs, labels, sectionType, estimatedMinutes, selected units per section, selected item IDs per section, item-type counts per section, point totals per section); whole-form totals (35 items / 45 pts / 4 units / 20 reading / 9 conv / 2 EBSR / 2 TE / 2 SA); selected multipoint (boat_ebsr_01, owls_ebsr_01, syrup_dd_01, boat_mg_01); selected SA (syrup_sa_01, boat_sa_01); omitted (syrup_ebsr_01, rabbit_ebsr_01, owls_06, rabbit_sa_01); owls group proof (1 unit; both members present; both members + all selected owl items in same section; no missing_primary_passage); per-section sum-check; full-form gate results; determinism hash (two runs equal); flat foundation proof (byte-identical, 7/91/12/12/8 hashStable); test results (tsc, build, test:pssa-content, test:pssa-db6, test:pssa-pr-b, relevant PR-C/PR-D); privacy grep result.
