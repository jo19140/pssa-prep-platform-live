# Codex Spec — Grade-3 EOY Gated E2E Release Check

**Type:** Part A = automated harness (committed test, detector-first); Part B = manual gated checklist (human-run). **Owner:** Jonathan. **Date:** 2026-06-25.
**Preconditions:** the **entire Grade-3 EOY diagnostic is merged on `origin/main` (`158f4c6`)** — P1–P4 + 9 conventions + `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` form assembly. This is the final validation before the EOY form is releasable.

The release check proves the **real assembled EOY form** (45 delivered / 35 operational·45 pts / 10 analytics·16 non-scoring pts) flows through the actual delivery + scoring path correctly, then gates on a human demo + Diagnostic Insights + licensing attestation.

---

# Part A — Automated release harness (Codex authors → independent audit → pinned merge)

## A0. Scope & guardrails

- Author **one new committed test** that assembles the **real** EOY form and drives it through the **real** delivery/scoring functions. No new product code, no schema, no seed of the dev/approval DB.
- Do NOT modify `pssaScoring.ts`, `pssaFormSession.ts`, `pssa-form-assembly.ts`, the registry, delivery routes, schema, or any merged content. If the harness reveals a real bug in those, **STOP and report** (do not patch them inside this tranche).
- **Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.** The harness uses an **in-memory `FixtureDb`** (mirror `scripts/test-pssa-pr-d2-delivery.ts`), NOT the dev Postgres — no DB writes, fully deterministic, no approval-bearing data.
- Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), absolute-path fail-closed. Never `git add -A`.

## A1. Deliverable

- `scripts/test-pssa-eoy-e2e-release.ts` — assembles the real EOY form from the merged exemplars, materializes it into a `FixtureDb` delivery form, and runs the real `launchPssaFormSession` → `answerPssaSessionItem` (×45) → `submitPssaSession` → `getPssaSessionState` path, asserting §A3.
- **Do not add an `npm` script unless `package.json` is first added to §A5.** Prefer running the harness directly with `./node_modules/.bin/tsx scripts/test-pssa-eoy-e2e-release.ts`. **Do not touch `scripts/test-pssa-content.ts` unless a shared wiring hook is genuinely required.** No other files.

## A2. Build the real form into the delivery fixture

1. **Assemble the real EOY form** exactly as `scripts/test-pssa-eoy-form-assembly.ts` does: read the merged backends (`exemplars/pssa_grade3_eoy_{p1,p2,p3,p4,conventions}/backend.json`) into a pool, call `assembleDiagnosticFormFromPool({ blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion, … })`. Assert `result.ok === true` and `result.items.length === 45` before proceeding. **If the pool helper from `scripts/test-pssa-eoy-form-assembly.ts` is not already exported, copy a minimal local backend-reading helper into `scripts/test-pssa-eoy-e2e-release.ts` — do NOT modify the existing form-assembly test only to export a helper.**
2. **Materialize a delivery `form`** (mirror the `FixtureDb` form shape in `test-pssa-pr-d2-delivery.ts`): `form.items[]` each with `id`, `position` (1..45 in the assembled section/delivery order), `pointValue`, **`scoringBucket`** (carried from the assembled result — the 10 AO IDs `analytics_only`, the rest `operational`), `interactionType`, `responseSpecJson`, `correctResponseJson`, `scoringJson`; plus the 3 `sections`. Each item's `pointValue` MUST equal its bank `scoringJson.totalPoints` (the scorer enforces `response_point_snapshot_mismatch`).
3. **Full-credit response per interaction type** (derive from each item's `correctResponseJson`): MCQ `{selectedIndex}`, EBSR `{partAIndex, partBIndices}`, MATCHING_GRID `{rowSelections}` (one correct column per scored row), INLINE_DROPDOWN `{blankSelections}`, SHORT_ANSWER a rubric-bearing text response (will resolve `pending_human_scoring`). Answer all 45 in order, then submit.

## A3. Assertions (operational-only scoring is the headline)

Using the real `submitPssaSession` result + `summarizePssaResponseBuckets` (`lib/content/pssaFormSession.ts`):

- **Operational total = 45** (`totalPoints` sums **operational** items only; analytics excluded — NOT 61).
- **earnedPoints = 39** on a full-credit auto-scored run (45 operational − the two operational SHORT_ANSWER items at 3 pts each = 39 auto), **pendingHumanPoints = 6**. I.e. operational resolves to **45/45** once the 2 SAs are human-scored full credit. **Pin the exact pending-human item IDs** so the harness cannot pass with the wrong pending items (Section 3 hosts the P1 SA, Section 2 hosts the P2 SA):

  ```ts
  pendingHumanItemIds.sort() === [
    "pssa_item_g3_eoy_p1_sa_bk113",
    "pssa_item_g3_eoy_p2_sa_ak112",
  ].sort()
  ```
- **analyticsTotalPoints = 16, analyticsEarnedPoints = 16, analyticsPendingHumanPoints = 0** (the 10 AO items auto-score; none is a SA) — and analytics **never** appears in `totalPoints`/`earnedPoints`.
- **Session lifecycle**: `launch` creates one active session (roster/role guards already covered by pr-d2 — a brief re-assert that a student cannot self-launch and the form `contentHash` is snapshotted is enough); after `submit`, `getPssaSessionState` reports `status === "submitted"`; post-submit `contentHash` drift does not retro-change the archived score (mirror pr-d2's archival assertion).
- **Every-route validity**: each of the 45 `answer` calls returns OK against the correct position/payload. **One negative answer case is enough; prefer an out-of-range item position or an invalid payload shape. Do NOT assert duplicate-answer rejection unless the existing delivery regression already proves duplicate answers are rejected rather than updated** (student-delivery commonly allows changing an answer before submit).
- **Leak-free**: the student-facing session state / item DTO for all 45 items contains **no `scoringBucket`** (or any bucket label), no `correctResponseJson`, no answer key/rationale — matching the form-assembly spec's bucket-leak rule.
- **No bank mutation**: the merged `exemplars/**/backend.json` bytes are unchanged after the run.

## A4. Gate battery (fail-closed; local binaries, not bare npx)

```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-eoy-e2e-release.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-form-assembly.ts   # assembly regression (unchanged)
./node_modules/.bin/tsx scripts/test-pssa-pr-d2-delivery.ts      # delivery regression (unchanged)
npm run test:pssa-pr-c                                           # scoring regression
npm run test:pssa-pr-b                                           # student-DTO leak sweep
npm run test:pssa-db6                                            # form-assembly regression (final pre-release)
echo "all EOY E2E release-harness gates passed"
```

## A5. Acceptance criteria — allowed tracked paths only

```
scripts/test-pssa-eoy-e2e-release.ts
scripts/test-pssa-content.ts            (only if a shared wiring hook is needed; otherwise omit)
specs/codex_pssa_eoy_e2e_release_check.md
```
**Default expected files are exactly `scripts/test-pssa-eoy-e2e-release.ts` and `specs/codex_pssa_eoy_e2e_release_check.md`.** Touch `scripts/test-pssa-content.ts` **only if** a shared wiring hook is genuinely required; **do not touch `package.json`** unless §A5 is amended first. Anything else (product code, scoring, session lib, assembler, schema, delivery routes, merged content/exemplars) → STOP and report. **Never stage** `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## A6. Process

Clean-worktree flow from `origin/main` (preserve `codex/teacher-lessons-tab-pr1`); carry this spec in and commit only the spec, then author the test. Run the gates inside the worktree with the hardened symlink pattern (guard the primary `node_modules`, symlink, trap-cleanup, local binaries):

```bash
set -euo pipefail
PRIMARY=/Users/diaz/pssa-prep-platform-live
WORKTREE=/Users/diaz/pssa-eoy-e2e-release

test -d "$PRIMARY/node_modules" || { echo "STOP: primary node_modules missing"; exit 1; }
test ! -e node_modules && test ! -L node_modules || { echo "STOP: worktree already has node_modules"; exit 1; }
ln -s "$PRIMARY/node_modules" node_modules
cleanup() { test -L "$WORKTREE/node_modules" && rm "$WORKTREE/node_modules" || true; }
trap cleanup EXIT

./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-eoy-e2e-release.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-form-assembly.ts
./node_modules/.bin/tsx scripts/test-pssa-pr-d2-delivery.ts
npm run test:pssa-pr-c
npm run test:pssa-pr-b
npm run test:pssa-db6

cleanup
trap - EXIT
```

Then scope-guard to §A5, commit (no merge), report. Independent audit before merge (Claude: run the harness over the real assembled form, confirm the §A3 numbers incl. the pinned pending-human IDs, assembly/delivery/scoring regressions green, no bank mutation, exact-SHA-pinned merge).

---

# Part B — Manual gated checklist (human-run; no code; do AFTER Part A merges)

Run against the dev app + **a fresh disposable dev DB** (never the approval-bearing DB; importer must not re-run on a DB with approvals). Each step has a pass condition; a failure STOPS the release.

**Setup**
1. Seed the assembled Grade-3 EOY form into a disposable dev DB (the local-only `scripts/seed-pssa-diagnostic-insights-e2e.ts` path, or the standard publish path), targeting `blueprintVersion = pde-ela-diagnostic-stamina-2025-g3-eoy-v1`. **Pass:** one EOY form with 45 items / 3 sections is published and launchable; analytics items carry `scoringBucket = analytics_only`.
2. Bind a test roster + student (roster-bound launch). **Pass:** the student appears on a roster a teacher/admin can launch for.

**Student experience**
3. Launch the form as the real student. **Pass:** sections render in order S1 → S2 → S3 with the locked `estimatedMinutes` 60/80/60; the student cannot self-launch outside a roster-bound assignment.
4. Verify delivery order. **Pass:** each analytics item is delivered **beside its host passage unit** within its section (P4 then AO-6; P2/P3 then AO-1/4/5/7/8; P1 then AO-2/3/9/10) — **never collected at the end**; no item shows a bucket label, key, or rationale to the student.
5. Answer through all 45 items and submit. **Pass:** every item type is answerable; submit succeeds; the student sees a completion state, **not** a score breakdown that reveals analytics.

**Teacher / reporting**
6. Open the teacher view + Diagnostic Insights for the submitted attempt. **Pass:** the **operational** score reads out of **45** (the 2 SAs show as pending teacher scoring, not auto-zero); analytics signals feed the diagnostic report **without** contributing to the score; the Evidence → Interpretation → Action insights render off the existing `distractorRole`/`comprehensionKind` metadata; no student-facing answer/key leak anywhere.
7. (If TDA/SA grading UI applies) confirm the 2 SAs route to the teacher grading surface and, once scored, the operational total resolves to 45/45.

**Release gate**
8. Licensing / attestation sign-off: confirm `internal_original` / `cleared_internal_original` provenance on all 45 items, no third-party content, and complete the launch-checklist licensing attestation. **Pass:** attestation recorded; only then is the EOY form marked releasable.

**STOP** on any failed pass condition and report which step + the observed vs expected.
