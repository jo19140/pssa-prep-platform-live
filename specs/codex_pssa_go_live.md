# Codex Spec — Grade-3 EOY True Go-Live (publish + roster, then human-run release)

**Type:** delivery enablement (small code tranche) + a human-gated release runbook. **Owner:** Jonathan. **Date:** 2026-06-26.
**Goal:** make the assembled Grade-3 EOY form **launchable by a real student** through the actual release path — published assembled form → roster-bound launch → submit → operational-only scoring → Diagnostic Insights — **not** a preview shortcut. The code tranche closes the two gaps that block the real path; the rest is a documented runbook you run against a **fresh disposable dev DB**.

## 0. Scope & guardrails

- **Two committable deliverables only:** (1) teach the assemble CLI to accept the EOY/MOY blueprintVersions; (2) a small, dev-only, env-guarded roster/student seed helper. Plus this spec + a validation test.
- Do NOT modify `pssaScoring.ts`, `pssa-form-assembly.ts` (the assembler library — it already dispatches on `blueprintVersion`), the registry, the figure module, schema, delivery routes, or any merged content/exemplars. The CLI change is **only** relaxing its blueprint allow-list + passing the version through; keep every existing prod-safety guard.
- **Never write to a production or approval-bearing DB.** Preserve the CLI's existing `--env dev` + `DATABASE_URL` prod-detection guards. The roster seed must refuse to run unless `--env dev` and the DB doesn't look production.
- Clean worktree off `origin/main` (preserve `codex/teacher-lessons-tab-pr1`), guard+symlink+trap `node_modules`, local binaries, absolute-path fail-closed. Never `git add -A`. STOP and report on any schema need.

## 1. Deliverable A — assemble CLI accepts EOY/MOY (`scripts/content/assemble-pssa-form.ts`)

Currently the CLI throws unless `--blueprint` equals the BOY blueprintVersion (it imports the BOY const — **use whatever name that existing import already has; do NOT rename any constant**). Change **only** the allow-list:
- **Extract a tiny pure helper** in the CLI, e.g. `resolveAllowedGrade3BlueprintVersion(blueprint: string): string` — returns the version if it matches one of the three known Grade-3 consts (the existing BOY const + `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT` `…moy-v1` + `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` `…eoy-v1`), throws otherwise. The CLI calls this helper where it currently does the BOY-only check. This keeps the accept/reject logic **DB-free and unit-testable** (§3).
- Only **add** the MOY/EOY consts to the allow-list — do not touch the BOY const, its name, or any other CLI logic.
- Pass the chosen `blueprintVersion` through to `assemblePssaFormFromPool({ blueprintVersion, … })` (which already dispatches to the BOY/MOY/EOY path). The pool read (`getStudentReadyPssaItems`) and the `--write` persistence (`pssaForm.create({ formStatus: "assembled", … })`) are unchanged.
- Keep `--grade 3`, `--seed`, `--env dev`, `DATABASE_URL`, and the production-detection guards exactly as they are. BOY behavior must stay byte-identical (a BOY `--blueprint` run produces the same form/contentHash as today).

## 2. Deliverable B — roster/student seed (`scripts/seed-pssa-roster-demo.ts`, new)

A small idempotent, dev-only helper that makes a launchable target for a published form:
- Refuse unless `--env dev` and the DB is not production (mirror the CLI guard).
- **Factor the core as a pure helper** `upsertDemoRoster(db, opts)` and call it from the CLI thin wrapper — so the graph build is **unit-testable against the in-memory `FixtureDb`** (§3) without a real DB.
- `upsertDemoRoster` upserts a demo **teacher** user, a demo **student** user + `StudentProfile`, a `ClassRoom` owned by the teacher, and an `Enrollment` binding the student's profile to that classroom (this is exactly what `canTeacherLaunchForStudent` checks: `enrollment.findFirst({ studentProfileId, classRoom: { teacherId } })`). Idempotent (re-running doesn't duplicate).
- **Login-aware:** use `.test` email addresses for the demo users. **If app login depends on an external auth provider, bind to existing dev-auth users rather than silently creating DB users that cannot log in** — STOP and report if the auth model makes that unclear, rather than seeding unloggable users.
- **Form selection:** accept **`--formId <id>`** and use that. "Latest `PssaForm` with `formStatus:"assembled"` for the EOY blueprintVersion" is a convenience fallback only; **if more than one assembled EOY form exists and no `--formId` is given, STOP and ask for the form id** (do not guess).
- Print the teacher id, student id, student userId, classroom id, and the selected `formId` so the operator can launch.
- **This is NOT** `scripts/seed-pssa-diagnostic-insights-e2e.ts` (which is local-only and must never be staged). This is a clean, committable roster helper.

## 3. Validation (`scripts/test-pssa-go-live.ts`, new — DB-free where possible)

- The CLI accepts each of the three Grade-3 blueprintVersions in its arg-parse/allow-list and rejects an unknown one (assert without a DB write — exercise the validation branch).
- BOY assembly result/contentHash is unchanged vs the current CLI (regression).
- The roster seed builds the `{teacher, student, classRoom, enrollment}` graph such that `canTeacherLaunchForStudent(db, teacherId, studentUserId)` returns true — exercise against the in-memory `FixtureDb` (mirror `test-pssa-pr-d2-delivery.ts`) so no real DB is needed.
- The seed refuses to run when `--env` is not `dev` / the DB looks production.

## 4. Gate battery (local binaries)

```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-go-live.ts
./node_modules/.bin/tsx scripts/test-pssa-pr-d2-delivery.ts   # launch/eligibility regression
npm run test:pssa-db6                                          # BOY assemble byte-identical
echo "all go-live gates passed"
```

## 5. Acceptance criteria — allowed tracked paths only

```
scripts/content/assemble-pssa-form.ts     (blueprint allow-list + pass-through only; BOY byte-identical)
scripts/seed-pssa-roster-demo.ts
scripts/test-pssa-go-live.ts
scripts/test-pssa-content.ts              (tranche wiring only, if needed)
specs/codex_pssa_go_live.md
```
Anything else (assembler lib, scoring, schema, delivery routes, content) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 6. Process

Clean-worktree flow from `origin/main`; guard+symlink+trap `node_modules`; carry this spec in; commit it; implement A+B+validation; §4 gates; scope-guard to §5; commit (no merge); report. **Independent audit before merge** (Claude: confirm BOY byte-identical, the CLI accepts EOY/MOY, the roster seed yields launch-eligibility, regressions green, exact-SHA-pinned merge).

---

## Part B — Human-gated release runbook (you run, after the code merges; against a FRESH DISPOSABLE dev DB)

This is the real gated E2E release check (the Part B from `specs/codex_pssa_eoy_e2e_release_check.md`), now executable end-to-end:

1. **Fresh disposable dev DB.** Point `DATABASE_URL` at a throwaway dev database (never the approval-bearing one — the importer must not run on a DB with approvals). Apply migrations.
2. **Import** the Grade-3 EOY content (passages + items) into that DB via the importer.
3. **Approval pass (the human gate).** Approve the EOY items (PENDING → APPROVED / student-ready). `assemble --write` only selects student-ready items, so nothing publishes until you approve. **This is the licensing/attestation checkpoint** — confirm `internal_original` provenance on all 45 items.
4. **Publish the form:** `tsx scripts/content/assemble-pssa-form.ts --grade 3 --blueprint pde-ela-diagnostic-stamina-2025-g3-eoy-v1 --seed g3-eoy-001 --env dev --write` → one `PssaForm` with `formStatus:"assembled"`.
5. **Seed the roster:** `tsx scripts/seed-pssa-roster-demo.ts --env dev` → note the teacher/student/classroom/formId it prints.
6. **Go live:** start the dev server. As the teacher/admin, launch the form for the student (roster-bound). The student opens `/student/diagnostic/<sessionId>` and takes it (sections S1→S2→S3, analytics beside their host unit), then submits.
7. **Verify the release** against `specs/codex_pssa_eoy_e2e_release_check.md` Part B: operational score out of **45** (the 2 SAs pending teacher scoring), analytics excluded, **Diagnostic Insights renders (now with DOK)**, no student-facing key/bucket/DOK leak.
8. **Sign off:** complete the licensing/attestation, mark the form releasable.

STOP at any step that fails and report the observed vs expected.
