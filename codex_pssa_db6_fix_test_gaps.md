# PSSA DB-6 fix — close the write-path test gap + two missing hash tests (same branch, no behavior change)

## Context
DB-6 passed independent audit except for two test gaps. This fix adds NO new behavior. The write-path logic in `scripts/content/assemble-pssa-form.ts` is already correct (assembled→noop, invalidated→refuse, absent→create); the problem is that it lives only in the CLI where tests can't reach it, and two spec-required hash-mutation tests were never written. Scope is strictly: one pure refactor + five tests. Do not touch the migration, schema, gates, selection algorithm, canonical hash builder, reports, or CLI flags.

## Change 1 — extract the write-decision into the lib (pure function, CLI behavior identical)
Add to `scripts/content/lib/pssa-form-assembly.ts`:

```ts
export type ExistingFormLookup = { id: string; formStatus: string } | null;
export type WriteDecision =
  | { action: "create" }
  | { action: "noop"; formId: string }
  | { action: "refuse_invalidated_collision"; formId: string };

export function decidePssaFormWrite(existing: ExistingFormLookup): WriteDecision {
  if (!existing) return { action: "create" };
  if (existing.formStatus === "assembled") return { action: "noop", formId: existing.id };
  if (existing.formStatus === "invalidated") return { action: "refuse_invalidated_collision", formId: existing.id };
  // draft or any unknown status: fail closed — never silently create a duplicate-hash row
  return { action: "refuse_invalidated_collision", formId: existing.id };
}
```

Refactor the CLI's `assemble()` to call `decidePssaFormWrite(existing)` and switch on the result — `noop` → write noop report + return; `refuse_invalidated_collision` → write refused report + throw (keep the existing error message format, including the formId); `create` → existing transaction unchanged. The CLI must behave byte-identically for the existing absent / assembled / invalidated cases. The draft/unknown branch is newly specified fail-closed behavior: a duplicate-hash `draft` row cannot be created over (`@unique` forbids it), must not be no-op'd onto (it is not an assembled form), and must not be reused — refusal is the only safe answer.

## Change 2 — five new tests in `scripts/test-pssa-db6-form-assembly.ts`
Reuse the existing fixtures/`positive` result. No DB required — all pure.

1. **Write decision: create** — `decidePssaFormWrite(null)` → `{ action: "create" }`.
2. **Write decision: noop on assembled** — `decidePssaFormWrite({ id: "f1", formStatus: "assembled" })` → noop with formId `f1`.
3. **Write decision: invalidated-collision refuses** — `decidePssaFormWrite({ id: "f1", formStatus: "invalidated" })` → `refuse_invalidated_collision` (and add the same assert for `formStatus: "draft"` — fail-closed on the unexpected branch).
4. **Hash: item-to-passage regrouping changes contentHash** — take `positive.canonical`, change ONE item's `passageId` to a different passage id from the same canonical (do not reorder anything else), assert `computePssaFormContentHash` differs.
5. **Hash: passage snapshot mutation changes contentHash** — take `positive.canonical`, change ONE passage's `approvedPassageContentHashSnapshot` to `"other"`, assert the hash differs.

## Acceptance
- `npm run test:pssa-db6` green with all new asserts.
- `npx tsc --noEmit` + `npm run build` green.
- `git diff` touches ONLY: `scripts/content/lib/pssa-form-assembly.ts` (added export, no edits to existing functions), `scripts/content/assemble-pssa-form.ts` (decision call replaces inline if/else, transaction and reports unchanged), `scripts/test-pssa-db6-form-assembly.ts` (new tests appended).
- Re-run the dev-DB dry-run once to confirm output is unchanged: still `DB-6 assembly refused: BLUEPRINT_UNSATISFIED` with the same deficit table. No DB is required for the five new unit assertions; the dev-DB dry-run is acceptance-only and must not require fixture mutation or approvals.

## Stop — report
The new function body; the CLI diff hunk showing the switch; the five test asserts + test run output; tsc/build results; the dry-run re-run output. Nothing else.
