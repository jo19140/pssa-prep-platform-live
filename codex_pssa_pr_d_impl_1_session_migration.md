# PSSA PR D-impl-1 — PssaFormSession + PssaFormResponse migration (additive-only; schema + types test; NO routes, NO services, NO UI)

## Context
Decision of record: `specs/pr-d-form-session-bridge-decision.md` (Option A2, Pro-approved, on main). This PR creates ONLY the session-side tables that PR D-impl-2's delivery routes will use. Implementation of routes, session lifecycle, launch grants, validity checks, scoring calls — ALL D-impl-2. This PR is schema transcription with the track's standing migration discipline (DB-1/DB-6 conventions: cuid ids, fail-closed defaults, indexes, relations both sides, CHECK constraints in raw SQL where Prisma can't express them).

## Scope / boundary (locked)
Three deliverables, nothing else:
1. `prisma/schema.prisma`: 2 models + 2 enums (+ back-relation list fields on `User`, `PssaForm`, `PssaFormItem`, `PssaItem` — relation lists only, zero DDL on those tables).
2. One migration: `CREATE TYPE` ×2, `CREATE TABLE` ×2, indexes, FKs, CHECK constraints. ZERO ALTER/DROP/UPDATE/INSERT on any existing table.
3. `scripts/test-pssa-pr-d1-prisma-types.ts` (npm `test:pssa-pr-d1`) — mirror the `test-pssa-db1-prisma-types.ts` pattern: typed create-inputs compile for both models, enums importable with exact member sets.

**Explicitly NOT in D-impl-1:** any `app/api/**` file; any service/lib code; any change to `TestSession`/`ResponseRecord`/`Assignment` (verified untouched by diff); seeding; backfill; `PssaHumanScore` (explicitly deferred by the decision doc — do not create it "while you're in there").

## Schema (exact — transcribed from the approved decision doc)
```prisma
enum PssaFormSessionStatus {
  in_progress
  submitted
  invalidated_midflight
}

enum PssaFormResponseScoreStatus {
  scored
  pending_human_scoring
  invalid_response
}

model PssaFormSession {
  id                     String                @id @default(cuid())
  userId                 String
  formId                 String
  formContentHashAtStart String
  status                 PssaFormSessionStatus @default(in_progress)
  currentPosition        Int                   @default(1)
  startedAt              DateTime              @default(now())
  submittedAt            DateTime?
  totalPoints            Int?
  earnedPoints           Int?
  pendingHumanPoints     Int?
  invalidatedReason      String?               @db.Text
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt

  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  form      PssaForm           @relation(fields: [formId], references: [id], onDelete: Restrict)
  responses PssaFormResponse[]

  @@index([userId, formId, submittedAt])
  @@index([formId, status])
}

model PssaFormResponse {
  id                  String                      @id @default(cuid())
  sessionId           String
  formItemId          String
  positionSnapshot    Int
  itemId              String
  responsePayloadJson Json
  scoreStatus         PssaFormResponseScoreStatus
  pointsEarned        Int?
  maxPoints           Int
  detail              String
  createdAt           DateTime                    @default(now())
  updatedAt           DateTime                    @updatedAt

  session  PssaFormSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  formItem PssaFormItem    @relation(fields: [formItemId], references: [id], onDelete: Restrict)
  item     PssaItem        @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@unique([sessionId, formItemId])
  @@unique([sessionId, positionSnapshot])
  @@index([sessionId])
  @@index([formItemId])
  @@index([itemId])
}
```

### onDelete semantics (locked — match the table's governance DNA)
- `user → Cascade`: consistent with `TestSession`; student data-deletion rights require it.
- `form → Restrict`: a form with sessions must never be deletable — sessions are audit records of what students saw.
- `formItem → Restrict`, `item → Restrict`: same rationale; `PssaFormItem.itemId` is already `Restrict` in DB-6 (verify, don't change).

### Partial unique index (raw migration SQL only — Prisma can't express partial indexes)
Add a partial unique index enforcing at most one active in-progress session per user/form pair:

```sql
CREATE UNIQUE INDEX "PssaFormSession_one_in_progress_per_user_form_idx"
  ON "PssaFormSession" ("userId", "formId")
  WHERE "status" = 'in_progress';
```

This is a D-impl-1 migration requirement, not D-impl-2 service behavior. Submitted and invalidated sessions may coexist historically; only the active `in_progress` row is unique.

### D-impl-2 write invariants (record here for continuity — NOT implemented in this PR)
PR D-impl-2 enforces at every write: `response.formItem.formId === session.formId`, `positionSnapshot === formItem.position`, **and `itemId === formItem.itemId`**. The denormalized `itemId` is audit-only and must never be allowed to disagree with the selected `PssaFormItem` — without the third invariant the DB could store a response pointing at slot X while audit-labeling itself as item Y. A cross-table CHECK cannot express this cleanly; it belongs in the write service contract.

### CHECK constraints (raw migration SQL only — Prisma can't express; DB-1 precedent; note the squash caveat in a SQL comment)
```sql
ALTER TABLE "PssaFormResponse" ADD CONSTRAINT "PssaFormResponse_score_contract_check"
  CHECK (
    "maxPoints" >= 0
    AND (
      (
        "scoreStatus" = 'scored'
        AND "pointsEarned" IS NOT NULL
        AND "pointsEarned" >= 0
        AND "pointsEarned" <= "maxPoints"
      )
      OR (
        "scoreStatus" = 'pending_human_scoring'
        AND "pointsEarned" IS NULL
      )
      OR (
        "scoreStatus" = 'invalid_response'
        AND "pointsEarned" IS NOT NULL
        AND "pointsEarned" = 0
      )
    )
  );

ALTER TABLE "PssaFormSession" ADD CONSTRAINT "PssaFormSession_totals_check"
  CHECK (
    "currentPosition" >= 1
    AND ("totalPoints" IS NULL OR "totalPoints" >= 0)
    AND ("earnedPoints" IS NULL OR "earnedPoints" >= 0)
    AND ("pendingHumanPoints" IS NULL OR "pendingHumanPoints" >= 0)
    AND ("totalPoints" IS NULL OR "earnedPoints" IS NULL OR "earnedPoints" <= "totalPoints")
    AND ("totalPoints" IS NULL OR "pendingHumanPoints" IS NULL OR "pendingHumanPoints" <= "totalPoints")
  );
```
The response CHECK encodes ALL THREE PR C result states exhaustively: `scored` ⇒ numeric points within `[0, maxPoints]`; `pending_human_scoring` ⇒ `pointsEarned IS NULL`; `invalid_response` ⇒ `pointsEarned IS NOT NULL AND = 0` (the explicit `IS NOT NULL` guards PostgreSQL three-valued logic — `NULL = 0` is UNKNOWN, and CHECK accepts UNKNOWN, so without it an `invalid_response` row with NULL points would slip through). Any other status/points combination is unrepresentable. The session totals CHECK prevents impossible totals without implementing lifecycle behavior.
NOTE: these `ALTER TABLE ... ADD CONSTRAINT` statements target the NEW table created in this same migration — that does not violate additive-only (same rule as DB-6's FK ALTERs).

## Types test (`test:pssa-pr-d1`)
- Import both enums; assert exact member sets (`Object.values(...)` deep-equal).
- Construct `Prisma.PssaFormSessionCreateInput` and `Prisma.PssaFormResponseCreateInput` literals exercising every field (incl. nested connects) — compile-time proof the schema matches this spec.
- Assert fail-closed defaults via the generated types where expressible (status default exists in DMMF or simply document).
- No DB connection — pure types/enums, runnable everywhere.

## Acceptance
`prisma validate` + `prisma generate` green; migration SQL contains ONLY `CREATE TYPE`/`CREATE TABLE`/`CREATE INDEX`/`CREATE UNIQUE INDEX` + FK/CHECK `ALTER`s scoped to the two NEW tables; migration SQL includes the partial unique index `PssaFormSession_one_in_progress_per_user_form_idx` on `("userId", "formId") WHERE "status" = 'in_progress'`; schema diff has ZERO deletions and the only edits to existing models are relation-list lines (`User`, `PssaForm`, `PssaFormItem`, `PssaItem`); `tsc --noEmit` + `build` + ALL existing `test:pssa-*` suites green; `test:pssa-pr-d1` green; `git diff` = schema, migration dir, the new test file, package.json script line.

## Stop — report (for Claude's independent audit)
The full migration SQL; the schema diff; the four relation-list additions; partial unique index text; CHECK constraint text; types-test output; confirmation `migrate deploy` applied clean on the CURRENT dev DB (the rebuilt one — these tables are empty additions, no approvals are touched and the importer is NOT re-run); tsc/build/all-suites results. Do NOT create PssaHumanScore. Do NOT touch TestSession/ResponseRecord/Assignment. Do NOT write any route or service code.
