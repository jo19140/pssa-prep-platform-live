# Codex Spec — Fix assemble CLI to dispatch MOY/EOY to the diagnostic assembler

**Type:** bug fix (CLI assembly dispatch). **Owner:** Jonathan. **Date:** 2026-06-26.
**Goal:** the go-live tranche relaxed the assemble CLI's blueprint allow-list to accept MOY/EOY, but the CLI's assembly call still invokes `assemblePssaFormFromPool`, which is **foundation-only** and throws `Unsupported blueprint: …-g3-eoy-v1`. Route MOY/EOY to the existing EOY/MOY-capable dispatcher `assembleDiagnosticFormFromPool`. BOY foundation must stay byte-identical.

## 0. Root cause (verified in code)

- `scripts/content/lib/pssa-form-assembly.ts`:
  - `assemblePssaFormFromPool` (≈ line 1508) throws `Unsupported blueprint` unless `blueprintVersion === GRADE3_BLUEPRINT.blueprintVersion` (foundation BOY only).
  - `assembleDiagnosticFormFromPool` (≈ line 1412) is the dispatcher: routes `GRADE3_MOY_DIAGNOSTIC_BLUEPRINT` → `assembleMoyDiagnosticFormFromPool`, `GRADE3_EOY_DIAGNOSTIC_BLUEPRINT` → `assembleEoyDiagnosticFormFromPool`, diagnostic-BOY inline; returns the **same `AssemblyResult` type**.
- `scripts/content/assemble-pssa-form.ts` `assemble()` calls `assemblePssaFormFromPool` for both the `result` and the determinism `proof`. That is the only defect. The DB write path (verify snapshots, `decidePssaFormWrite`, `pssaForm.create` reading `result.totalPoints/categoryPoints/contentHash/passages/items`) is identical for both assemblers because the return type is identical.

## 1. Scope & guardrails

- **One production file changes:** `scripts/content/assemble-pssa-form.ts` (assembly dispatch) + the test. Do **NOT** modify `pssa-form-assembly.ts`, scoring, schema, registry, delivery, the seed script, or any content. Do not touch the allow-list (`resolveAllowedGrade3BlueprintVersion`) — it is correct.
- Clean worktree off the **current `origin/main` tip** (re-fetch). Preserve `codex/teacher-lessons-tab-pr1`. Guard+symlink+trap `node_modules`. Never `git add -A`. STOP on any schema need.

## 2. Deliverable A — CLI assembly dispatch (`scripts/content/assemble-pssa-form.ts`)

- Import `assembleDiagnosticFormFromPool` from `./lib/pssa-form-assembly` (alongside the existing `assemblePssaFormFromPool` import).
- Add a tiny **pure exported** helper:
  ```ts
  export function assembleGrade3FormFromPool(input: {
    seed: string; blueprintVersion: string;
    readyItems: PssaAssemblyItem[]; allItems?: PssaAssemblyItem[];
  }): AssemblyResult {
    return input.blueprintVersion === GRADE3_BLUEPRINT.blueprintVersion
      ? assemblePssaFormFromPool(input)
      : assembleDiagnosticFormFromPool(input);
  }
  ```
  (Import the `PssaAssemblyItem` type if needed; `AssemblyResult` is already imported.)
- In `assemble()`, replace **both** `assemblePssaFormFromPool({ … })` calls (the `result` and the `proof`) with `assembleGrade3FormFromPool({ … })`. Change nothing else in `assemble()` or the write path.
- Result: BOY (`…-g3-v1`) still routes to `assemblePssaFormFromPool` (byte-identical); MOY/EOY route to `assembleDiagnosticFormFromPool`. Unknown versions are already rejected upstream by the allow-list, and `assembleDiagnosticFormFromPool` itself rejects truly-unknown diagnostic versions.

## 3. Deliverable B — regression test

Extend `scripts/test-pssa-go-live.ts` (preferred — it already imports the assemble CLI and builds a fixture diagnostic pool) OR add to `scripts/test-pssa-eoy-form-assembly.ts`:

- **Routing (DB-free, the exact regression):** `assembleGrade3FormFromPool({ blueprintVersion: GRADE3_EOY_DIAGNOSTIC_BLUEPRINT.blueprintVersion, seed, readyItems: <foundation pool> })` must **not** throw `Unsupported blueprint` — assert it returns an `AssemblyResult` (it may be `ok:false` with `PINNED_ITEMS_MISSING` when the pool lacks EOY items; that is fine — it proves the call reached the diagnostic assembler). Same for MOY.
- **BOY unchanged:** `assembleGrade3FormFromPool({ blueprintVersion: GRADE3_BLUEPRINT.blueprintVersion, … })` over the foundation pool returns `ok:true` with the pinned BOY foundation contentHash (reuse the existing BOY assertion).
- **Best (preferred if the EOY fixture pool is readily reusable):** reuse the EOY pool builder from `scripts/test-pssa-eoy-form-assembly.ts` to assert `assembleGrade3FormFromPool({ blueprintVersion: EOY, … })` returns `ok:true` with the EOY form's expected delivered item count (45). If that pool is not cheaply reusable here, the routing assertion above is the required minimum and `test-pssa-eoy-form-assembly.ts` continues to cover real EOY assembly.

## 4. Gate battery (fail-closed; local binaries)

```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
./node_modules/.bin/tsx scripts/test-pssa-go-live.ts
./node_modules/.bin/tsx scripts/test-pssa-eoy-form-assembly.ts
./node_modules/.bin/tsx scripts/test-pssa-moy-form-assembly.ts
npm run test:pssa-db6        # BOY foundation byte-identical
echo "all assemble-dispatch fix gates passed"
```

## 5. Acceptance criteria — allowed tracked paths only

```
scripts/content/assemble-pssa-form.ts   (assembly dispatch only; BOY byte-identical)
scripts/test-pssa-go-live.ts            (routing regression)  — and/or
scripts/test-pssa-eoy-form-assembly.ts  (only if the EOY-pool assertion is added here)
specs/codex_pssa_assemble_cli_eoy_dispatch_fix.md
```
Anything else (assembler lib, scoring, schema, delivery, content, seed script, allow-list) → STOP and report. Never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`. Never `git add -A`.

## 6. Process

Clean-worktree flow from `origin/main`; carry+commit this spec; implement A+B; §4 gates; scope-guard to §5; commit (no merge); report branch + tip SHA + file list + gate output. **Independent audit before merge** (Claude: confirm BOY byte-identical via db6, EOY/MOY route without `Unsupported blueprint`, exact-SHA-pinned merge).

## 7. After merge — resume the operational run (no re-import)

The `pssa_eoy_release` dev DB already holds the full import + approvals (`pendingItems=0`). Do **NOT** re-import or re-approve (importer must not re-run on an approval-bearing DB). After this fix is on `origin/main` and pulled into the primary checkout, resume only:
1. `npm run content:assemble-pssa-form -- --grade 3 --blueprint pde-ela-diagnostic-stamina-2025-g3-eoy-v1 --seed g3-eoy-001 --env dev --write` → capture `formId`.
2. `npx tsx scripts/seed-pssa-roster-demo.ts --env dev --formId <formId>`.
3. Hand back the formId + roster output for the in-browser launch/verify.
