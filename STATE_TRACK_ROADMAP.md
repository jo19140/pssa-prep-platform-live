# State Track Roadmap

This document is the canonical source of truth for how Sýnesis Learning's two
product tracks coexist and how unmerged state-track work relates to current
`main`.

**Do not delete, abandon, or treat as superseded any state-track branch.
Read this document before triaging or rebasing them.**

## Tracks

**Reading Buddy — national track.** K–8 literacy intervention. Adaptive,
diagnostic-driven, phase-based decoding system. Currently active. Implementation
is the content-v3 stream (see `specs/content-v3-codex-spec.md`). Shipped through
PR #30 (diagnostic engine) and PR #35 (passage review queue) and PR #36 (lesson
part generators) and continuing.

**PSSA — state track.** Pennsylvania state-testing prep for grades 3–8 ELA.
Item-type contracts, passage gates, EC skill-match, surface shortcut gates,
batch-level audit rules. Currently active on `main` as the PR #4j–#4n stream.

**Both tracks ship in parallel.** Neither is paused. Neither supersedes the
other. Reading Buddy V2 is not PSSA V2 and vice versa.

## Source-of-truth hierarchy

**Canonical (governs):** PR #4j–#4n contracts and gates on `main`.

- Item type contracts: `codex_pssa_pr4j_item_type_contract.md`
- Position-bias / surface-shortcut enforcement: PR #4k fix and §4a of #4j
- Multi-select / hot-text contracts: PR #4l
- Matching-grid / drag-drop contracts: PR #4m
- Inline-dropdown / conventions contracts: PR #4n

**Canonical state-track-relevant product surfaces also live on `main`**
as active product infrastructure. These complement the #4j–#4n contracts
and are subject to the same conformance rules when used for PSSA/state-track
work. Major surfaces include:

- **Test tool (student-facing player + scoring):**
  - `components/StudentTest.tsx`, `StudentAssignmentListPage.tsx`,
    `StudentTdaPracticePage.tsx`
  - `components/AdminGradeEssayTestPage.tsx`,
    `TeacherTdaScoringPanel.tsx`
  - `app/api/test/{start,answer,submit}` and `app/api/tests/create/`
  - `app/admin/grade-test/page.tsx`
  - `app/api/admin/grade-essay-test`,
    `app/api/ai/generate-test`,
    `app/api/teacher/test-design-agent`,
    `app/api/teacher/tda-results`,
    `app/api/{student,teacher}/assignments`

- **Student reports:**
  - `components/StudentReport.tsx`
  - `app/api/jobs/send-scheduled-reports/route.ts`

- **Test mockups:** `docs/mockups/` — student-diagnostic,
  student-practice, parent-dashboard, teacher-caseload,
  teacher-student-detail, speed-drill, voice-diagnostic,
  voice-practice, dialect-onboarding, navigation-ia,
  parent-voice-sessions.

This list is non-exhaustive; new state-track-relevant surfaces continue
to land on `main` as part of the active product. The point is that
"state-track canonical" is **contracts + product code on `main`**, not
just the contract docs.

**Adapts to canonical:** the three state-track archive branches (below).
Archive infrastructure may be reused **only after mapping** to the current
`responseSpec` union, passage gates, EC skill-match, source-scan rules,
surface-shortcut rules, preview safeguards, **and the active product
surfaces above** (test tool, student reports, mockup language).
Archive code does not override contracts or active product surfaces.

## State-track archive branches

These branches contain substantial PSSA infrastructure that was set aside
while the detector-first contract approach (PR #4j onward) took shape. They
are **active future work, not deprecated.**

### `state-track/pssa-v2-lessons-and-tei-player`

32 commits, ~68K insertions vs. `main`. Contents:

- **TEI player components** (`components/tei/*`) — renderers for MCQ,
  multi-select, hot-text (word/phrase/sentence), drag-drop (order/table),
  inline dropdown, two-part EBSR, evidence mapping. Maps directly to the
  item families in PR #4j.
- **V2 lesson generator** (`lib/lessonGeneratorV2.ts`) with PSSA exemplar
  grounding + self-critique (`lib/lessonV2Critic.ts`) + validators
  (`lib/lessonV2Validators.ts`).
- **TEI scoring** (`lib/teiScoring.ts`).
- **Essay grading** (`lib/essayGrader.ts`) — TDA / short-response.
- **PSSA exemplars** (`lib/pssaLessonExemplars.ts`).
- **Audit/regeneration scripts** — distractor pedagogy audit, contamination
  fixes, topic-variety enforcement, prebuilt library regen, lesson visual
  alignment audit, AI image generation pipeline.
- **TTS audio pipeline**, **hero video matching with AI verification**.
- **6 vetted V2 sample lessons** in `audit/v2-samples/`.

### `state-track/pssa-schema-v2`

1 commit. Subset of `pssa-governance-and-tranche1`'s history. Contents:

- 9 PSSA Prisma models: `PssaGenerationBatch`, `PssaPassage`, `PssaItem`,
  `PssaLesson`, `PssaStandardsCrosswalk`, `PssaCrosswalkPaCoreStandard`,
  `PssaLinterRun`, `PssaAuditResult`, `PssaReviewLog`.
- API route additions for serving PSSA items via student test sessions
  (`app/api/student/session/route.ts`).

### `state-track/pssa-governance-and-tranche1`

2 commits (includes `pssa-schema-v2`'s commit). Adds on top:

- **`lib/pssaGovernance.ts`** — `canApprovePssaItem`, `canApprovePssaPassage`,
  `canApprovePssaLesson` data-layer approval helpers. Same pattern as
  `canApprovePassage` shipped on `main` in PR #35.
- **`scripts/audit/export-pssa-audit-bundle.ts`** (1,227 lines) — audit
  export pipeline with student-redaction, metadata completeness reports,
  governance reports.
- **`scripts/content/author-pssa-grade6-tranche1.ts`** (1,005 lines) —
  Grade 6 tranche 1 authoring integrated with MCQ audit detectors.
- **`scripts/content/import-pa-pssa-anchor-ec-crosswalk.ts`** (541 lines) —
  PA anchor / eligible-content crosswalk importer.
- **Migration:** `prisma/migrations/20260530050000_add_governed_pssa_content/migration.sql`
  (385 lines) — schema migration for the 9 Pssa* models above.
- PSSA spec/notes files: PR #2 governance, PR #4 exemplar batch, PR #4n
  inline dropdown conventions, plus `NEXT_STEPS.md`, `pssa_field_mapping.md`,
  `pssa_model_decision_report.md`.

## Legacy content conformance rule

The state-track archive branches contain both **infrastructure** and
**content**. These must be handled differently.

### Legacy PSSA content

Legacy passages, questions, lessons, EBSRs, TEIs, conventions items,
Short Answer prompts, TDA prompts, evidence spans, rationales, and answer
choices are **not active by default**.

They are **reference / quarantined** until they pass the current canonical
gate stack on `main`.

Before any legacy content may become active / student-ready, it must pass,
where applicable:

- passage-quality gates:
  - `PSSA_PASSAGE_CROSS_DUPLICATE`
  - `PSSA_PASSAGE_TEMPLATE_SKELETON`
  - `PSSA_PASSAGE_TOPIC_COHERENCE`
  - `PSSA_PASSAGE_CONCRETENESS`
- `responseSpec` / item-type schema gates
- passage-grounding gates
- evidence-span verbatim gates
- EC skill-match gates
- source-compliance no-copy scan
- answer-position / surface-shortcut distribution gates
- partial-credit / scoring gates
- student-preview leak checks
- reviewer-preview completeness checks
- deprecation / supersession rules for replaced items

Legacy content may be:

1. **Revalidated unchanged** if it passes all current gates;
2. **Repaired and re-audited**;
3. **Re-authored** using the old item only as design reference;
4. **Deprecated / superseded** if replaced by newer content.

**No legacy content may enter student-ready exports, active item counts,
approval queues, or form assembly merely because it existed in an older
branch.**

### Legacy PSSA infrastructure

Legacy infrastructure may be reused, but only after mapping to the
canonical #4j–#4o contracts **and the canonical product surfaces on `main`**.

Infrastructure includes:

- TEI player components
- scoring logic
- schema / migration work
- governance helpers
- audit / export scripts
- generator scaffolding

Infrastructure is evaluated jointly before adoption. **Archive code adapts
to the current contracts and the active product environment; it does not
override them.**

## Integration plan

State-track integration is sequenced as PR A through PR F, plus a parallel
read-only legacy lesson audit. PR A is branch hygiene and documentation.
PRs B–F are a deliberate later sprint, **post-#4o**, that brings archive
infrastructure forward in a controlled order. The legacy lesson audit
spec ships now; the audit itself runs as part of the post-#4o sprint.

### PR A — State-track roadmap + branch preservation (this PR)

- Add this document to `main`.
- Add `specs/pssa-legacy-lesson-audit.md` to `main` (audit spec, read-only,
  detector-first; runner code may be merged separately after audit-of-record
  rerun).
- Rename archive branches to `state-track/*`.
- Push renamed branches to origin; delete old `local-*` names from origin.
- Park the pre-PR-A reconnaissance audit branch (`codex/pssa-legacy-lesson-audit`)
  as `recon/pssa-legacy-lesson-audit-pre-pr-a` — superseded by post-PR-A
  audit-of-record rerun once v2-samples are reachable.

### PR B — TEI player adapter investigation

Compare archive `components/tei/*` to the current `interactionType` /
`interactionSubtype` contract from PR #4j **and** the active player/scoring
surfaces on `main` (`components/StudentTest.tsx`, `StudentTdaPracticePage.tsx`,
`AdminGradeEssayTestPage.tsx`, `TeacherTdaScoringPanel.tsx`, `app/api/test/*`).
Write an adapter plan. **Do not import raw.** Old UI infrastructure may be
reused, but it must render the new `responseSpec` shapes from #4j and integrate
with the active test player / scoring API on `main`. The adapter is not allowed
to revive old item schemas or to fork a parallel player.

Map archive renderers → canonical `responseSpec`:

- MCQ → `responseSpec.MCQ`
- EBSR → `responseSpec.EBSR`
- MULTI_SELECT → `responseSpec.MULTI_SELECT`
- HOT_TEXT (sentence/phrase/word) → `responseSpec.HOT_TEXT`
- DRAG_DROP (category/order/token_placement) → `responseSpec.DRAG_DROP`
- INLINE_DROPDOWN → `responseSpec.INLINE_DROPDOWN`
- MATCHING_GRID → decide whether existing `EvidenceMappingItem` /
  `DragDropTableItem` covers it or needs a new renderer.

### PR C — TEI scoring reconciliation

Adapt `lib/teiScoring.ts` to the gates from #4j–#4n **and the active scoring
surfaces on `main`** (`app/api/test/answer`, `app/api/test/submit`,
`app/api/admin/grade-essay-test`, `app/api/teacher/tda-results`). Old scoring
code may be useful, but it must respect the new scoring / partial-credit gates
and **cannot silently ignore source, skill-match, or shortcut audits**. The
scoring layer is subordinate to the detector layer.

Requirements:

- correct-count matches instruction
- no extra correct options
- partial-credit rules explicit
- no full credit for unsupported evidence
- batch shortcut gates are audit-level, not scoring-only

### PR D — Schema reconciliation

Compare the archive 9-model `Pssa*` Prisma schema against the current
PR #4 `responseSpec` union **and the existing assessment / test-session /
report schema already in `main`**. Decide canonical shape. The canonical item
representation must support the new interaction types, deprecation
statuses, audit fields, and gate results, and must not fork from the
test-session model the live test tool already uses.

**Must complete before PR F** — generator output needs a stable target
schema.

### PR E — Governance reconciliation

Bring forward `canApprovePssaItem`, `canApprovePssaPassage`,
`canApprovePssaLesson`. Wire to the new audit gates and to the active
approval/reporting paths on `main`. **Nothing should be approvable just
because an old governance function says yes.**

Required gate wiring:

- passage-quality gates
- EC skill-match
- source scan
- TEI surface shortcut distribution
- preview leak checks
- deprecation rules for old conventions items

### PR F — Generator reconciliation

Adapt the V2 lesson generator only after PR D (schema) and PR E
(governance) are aligned. **The old generator can be reused only if it
produces passages / questions that pass the new gates and that render in
the active student test player on `main`. The generator is subordinate to
the detectors and to the active product.**

### Parallel workstream — PSSA legacy lesson audit

See `specs/pssa-legacy-lesson-audit.md`. Read-only, detector-first audit
of the V2 lessons in `audit/v2-samples/` and any other available legacy
lesson corpora. **No activation. No import. No approval. No mutation.**
File-only reports.

Spec ships in PR A. Audit run scheduled post-#4o. A pre-PR-A
reconnaissance run on branch `recon/pssa-legacy-lesson-audit-pre-pr-a`
produced provisional reports for 677 lessons (v2-samples missing
because the state-track branches were not yet renamed). Provisional
disposition was unanimous: `REAUTHOR_AGAINST_CANONICAL_CONTRACTS`.
Audit-of-record will rerun post-PR-A with v2-samples included.

## Anti-patterns this document exists to prevent

- Treating `state-track/pssa-v2-lessons-and-tei-player` as Reading Buddy V2
  and abandoning it. **It is PSSA work, not Reading Buddy work.**
- One-shot merging all three branches into `main`. Schema in branches 2/3
  may conflict with current PR #4 contracts.
- Letting archive code override canonical contracts or active product
  surfaces. The contracts and the live product govern.
- Pausing #4n or #4o to reconcile archives. Reconciliation happens post-#4o.
- Activating legacy lessons / passages / items merely because they exist
  in an older branch.
- Trusting "old governance approved it" or "old generator passed its own
  validator" as substitutes for the current detector stack.
- Porting V2 TEI/player/scoring code against the spec docs but ignoring
  the active student test player, scoring routes, reports, or mockup
  surfaces already on `main`.

## Resume conditions

The reconciliation sprint (PR B onward) starts when all three are true:

1. PR #4n (conventions rebuild) merged to `main`.
2. PR #4o (short-answer / constructed-response gates) merged to `main`.
3. Content-v3 lesson engine has shipped at least through PR #36 (lesson
   part generators) on the Reading Buddy national track, so developer
   attention can shift.

Update this document as integration progresses.

---

*Last updated: 2026-06-01. Maintained jointly by both tracks.*
