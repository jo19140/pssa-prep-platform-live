# PSSA DB-2 fix — JSONB comparator causes a false "pending DB actions" on the anomaly rows

## What happened (evidence, not theory)
On the first real `--write` against a fresh dev Postgres, the crosswalk **data committed correctly**: `PssaStandardsCrosswalk = 241`, `PssaCrosswalkPaCoreStandard = 936`, and a second `--write` left the counts unchanged (row-level idempotent). But the loader **threw** `Post-write reconcile plan still has pending DB actions.` and exited non-zero.

A read-only `--db-aware` dry-run against the now-populated DB reported:
- **Crosswalk inserts: 0, updates: 6, noops: 235**
- CC join inserts: 0, removes: 0, **noops: 936**

The 6 "updates" are **exactly** the 6 Grade-8 TDA anomaly rows (`E08.E.1.1.1`–`E08.E.1.1.6`) — the only rows carrying `sourceAnomalyJson`. Every other field round-trips and compares as `noop`.

## Root cause
`sourceAnomalyJson` is a Postgres **JSONB** column. JSONB does **not** preserve object key order — it stores keys sorted by (length, then bytewise). The anomaly object is written with key order `field, sourceValue, correctedValue, reason, humanConfirmed` and read back as `field, reason, sourceValue, humanConfirmed, correctedValue`.

The comparator used by the post-write no-op check compares JSON by **naive string equality**:

```ts
// scripts/content/load-pssa-crosswalk.ts
function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
```

`JSON.stringify` serializes in key order, so two semantically-equal objects with different key order produce different strings → the 6 anomaly rows are perpetually classified as `update` → `buildReconcilePlan` never reports a post-write no-op → the `--write` path throws. The data is fine; **the comparator is wrong.**

## Scope / boundary
**Fix the comparator ONLY.** Do not change: the write/upsert logic, the canonicalization, the validation gates, the schema, the CSV, or any data. No re-import, no migration. This is a verifier bug, not a data bug. Idempotent. `--dry-run` default; `--write` still requires explicit `--env dev`. Commit.

## The fix
Replace naive JSON-string equality with an **order-insensitive structural equality**. Object keys are unordered (sort recursively before comparing); **array order is significant** (JSONB preserves array order — do NOT sort arrays); primitives compare directly; `null`/`undefined` normalize to `null`.

The helper is named `canonicalizeJsonForComparison` (not a generic name) to make explicit that it is **for JSON comparison only** — it must never be used to loosen comparison of non-JSON scalar/text row fields.

```ts
function canonicalizeJsonForComparison(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalizeJsonForComparison); // order preserved
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeJsonForComparison((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value; // string | number | boolean
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(canonicalizeJsonForComparison(a)) ===
    JSON.stringify(canonicalizeJsonForComparison(b))
  );
}
```

`dbRowMatches` already routes `sourceAnomalyJson` through `jsonEqual` and every other field through `===`; leave that structure as-is. **Do not** loosen the `===` comparison for the scalar/text fields — `gradeLevel`/year ints come back as JS numbers and `dokCeiling` as text; those must keep comparing strictly so a real edit is still caught.

## Regression test (must add)
Add a unit test (or a dedicated `--self-test` path) that proves:
1. `jsonEqual({a:1,b:2}, {b:2,a:1}) === true` (key order ignored).
2. `jsonEqual({a:[1,2]}, {a:[2,1]}) === false` (array order respected).
3. `jsonEqual(null, null) === true`; `jsonEqual(null, {}) === false`.
4. A round-trip test using the **actual** anomaly payload (`{"field":"paCoreStandardCodes","sourceValue":"CC.1.4.7.B","correctedValue":"CC.1.4.8.B","reason":"…","humanConfirmed":false}`) re-keyed in JSONB length order compares **equal**.
5. End-to-end: after a `--write`, `buildReconcilePlan` returns `crosswalk.updates.length === 0` for an unchanged CSV (post-write no-op holds).

## Audit the item importer for the same pattern (check; change only if present)
`scripts/content/import-pssa-items.ts` carries JSONB columns (`responseSpecJson`, `correctResponseJson`, `scoringJson`, etc.). Confirm its idempotency/drift detection compares the **stored `contentHash` string** (immune to JSONB key reordering) rather than re-deriving equality from DB-read JSONB. If it anywhere does a naive `JSON.stringify` comparison of a DB-read JSONB value, apply the same `canonicalizeJsonForComparison` fix there. If it only compares `contentHash`, **no change needed** — just report that you verified it. Report it in this form:

```
Item importer JSONB audit:
- responseSpecJson / correctResponseJson / scoringJson idempotency path checked.
- If importer uses contentHash only: no code change needed.
- If importer uses JSON.stringify on DB-read JSONB: same canonical JSON comparator applied.
```

Also: confirm `contentHash` is computed from a **canonical** form of the source (sorted keys), so the hash itself can't drift on JSONB-bearing items. If it isn't, flag it (do not silently change DB-3/DB-4 scope here).

## Verification (operator, disposable dev DB — clean reprove)
After the fix is merged to `main` and pulled, **tear down and reprove from scratch** so the idempotency proof is pristine (not run against a half-flagged DB):
```
# fresh disposable DB
docker rm -f pssa-dev
docker run --name pssa-dev -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=pssa_dev -p 5433:5432 -d postgres:16
# (re-export DATABASE_URL / APP_ENV=dev / NODE_ENV=development in that same shell)
npx prisma migrate deploy
npm run content:load-pssa-crosswalk -- --write --env dev      # expect: 241 / 936, EXIT 0, post-write no-op
npm run content:load-pssa-crosswalk -- --write --env dev      # expect: 0 inserts / 0 updates / 0 removes, counts 241 / 936
```

## Acceptance
- `jsonEqual` is order-insensitive for objects, order-sensitive for arrays; scalar/text/int comparisons unchanged.
- Regression tests added and green; `tsc --noEmit` + `build` green.
- On a fresh disposable DB: first `--write` exits 0 with `241 / 936` and a post-write no-op; second `--write` is `0 / 0 / 0`.
- The 6 anomaly rows report as `noop` on the second pass (verify in `reports/pssa_crosswalk_load_summary.md`: `Crosswalk updates: 0`).
- Item importer JSONB-comparison audit reported (changed only if a naive comparison was found).
- No data, schema, gate, or canonicalization changes; the `sourceAnomalyJson` content is byte-for-byte preserved in the source CSV (we only fixed how equality is *checked*, never how the value is *stored*).

## Stop — report
The diff of `jsonEqual` (+ helper); the regression-test output; the item-importer audit verdict (contentHash-based vs naive, change or no-change); `tsc`/`build` results; and — if you re-ran it — the clean reprove counts. Do **not** approve anything, build the student-ready selector, or touch the item importer's behavior beyond the comparator audit.
