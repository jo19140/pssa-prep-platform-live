# PSSA Diagnostic Insights — WS2-R1: Class-report data route
## Wire real sessions → the WS3 engine → a `ClassReport` JSON (the engine's first live data path)

> Tracked spec. Commit to `specs/pssa-ws2r1-class-report-route.md`.
> Builds on WS3-A/B/C (all on main). Gives the reporting engine its first real data source.
> **Backend wiring only — NO UI.** A pure, synthetic-tested assembler + a thin authenticated route. No scoring/schema/engine/item changes.

## Goal
Given a teacher's class + a PSSA form (the fall benchmark), load each rostered student's completed session, run it through the WS3 engine, and return one `ClassReport` (WS3-C) the future Reports panel (WS2-R2) renders.

## Reuse (verified at source — do NOT recompute or modify)
- **Roster:** `ClassRoom` (`teacherId`) → `Enrollment` (`classRoomId`, `studentProfileId`) → `StudentProfile` → `User`. Auth pattern already used in `app/api/teacher/classes/route.ts`: require role `TEACHER`/`ADMIN`, resolve `teacherProfile`, confirm the `ClassRoom.teacherId` belongs to them (else 403).
- **Sessions:** `PssaFormSession` (`userId`, `formId`, `status`, `earnedPoints`, `totalPoints`, `pendingHumanPoints`, `responses: PssaFormResponse[]`). Status: `submitted` = complete; `in_progress` = incomplete; `invalidated_midflight` = ignore.
- **Stored scoring:** use `session.earnedPoints` / `session.totalPoints` / `session.pendingHumanPoints` directly — **do NOT re-score** (`pssaScoring.ts` untouched).
- **Engine (read the exact exported input types — do not guess):** `deriveStudentInsights(attempt, form)`, `buildStudentReport(attempt, form, scoring, insights, opts)`, `buildClassReport(StudentReportInput[], opts)` from the WS3 modules.

## Scope (only these)
1. **NEW pure assembler** `lib/content/pssaClassReportLoader.ts` (synthetic-testable, no DB, no Prisma):
   `assembleClassReport(entries, opts) -> ClassReport`. The **form is passed once** in opts (one class report = one roster + one form), NOT duplicated per session:
   ```ts
   type ClassReportLoaderEntry = { studentId: string; session: LoadedSession | null };
   type LoadedSession = {
     status: "submitted" | "in_progress" | "invalidated_midflight";
     earnedPoints: number | null; totalPoints: number | null; pendingHumanPoints: number | null;
     responses: LoadedResponse[];   // NO formItems here
   };
   assembleClassReport(entries, { form, benchmarkSeason, formId, formVersion }) -> ClassReport
   ```
   For each entry it builds a `StudentReportInput` (`studentId`, `buildStudentReport(...)`), then returns `buildClassReport(inputs, opts)`. `form` must be the exact plain-data shape the WS3 engine expects (read the WS3 input types — do not guess).
2. **NEW thin route** `app/api/teacher/pssa/class-report/route.ts` (**GET only** — read-only report fetch; do NOT add a POST handler): auth + ownership check; load roster (Enrollment → studentProfiles → users); for each, load their `PssaFormSession` for `formId` + responses; load the `PssaForm` items once; call `assembleClassReport`; return the `ClassReport` JSON. Glue only — all aggregation lives in the pure assembler + WS3 engine.
3. **NEW test** for the pure assembler (synthetic data only).
4. Commit this spec.

**DO NOT TOUCH:** `pssaScoring.ts`, `pssaFormSession.ts`, the three WS3 modules, prisma schema, migrations, item content, any UI/component.

## Assembler logic
**Only `submitted` sessions produce a real student report.** This is a teacher-facing *benchmark* report, not a live proctoring view — do NOT run partial `in_progress` responses through the insight engine.

Per roster entry:
- **`submitted` session** → full report from its responses + stored score fields.
- **`in_progress` / no session / invalidated-only** → an **incomplete placeholder**: `attempt.completionStatus = "incomplete"`, `responses = []`, no misconception patterns; the student still counts as *assigned / incomplete*.

**Deterministic session selection (per student, per form):** ignore `invalidated_midflight`; choose the **latest `submitted`** by `submittedAt ?? updatedAt ?? createdAt`; if none submitted → incomplete placeholder (an `in_progress` session must NOT override an existing submitted one).

**Map a submitted `PssaFormSession` → engine inputs:**
- `attempt.responses` ← map each `PssaFormResponse` to the shape the engine reads (itemId; the selected-answer field `selectedIndexOf` consumes — likely from `responsePayloadJson`; correctness; `pointsEarned`/`maxPoints`). **Read the engine's response accessors and map to them; STOP if the engine needs a field the session response cannot supply without a scoring/schema change.**
- `attempt.completionStatus` ← `"complete"`.
- `scoring` ← `{ earnedPoints: session.earnedPoints, totalPoints: session.totalPoints, maxOperationalPoints: 45, pendingHumanPoints: session.pendingHumanPoints ?? 0 }` (stored values; not recomputed).
- `insights` ← `deriveStudentInsights(attempt, form)`.
- `report` ← `buildStudentReport(attempt, form, scoring, insights, { benchmarkSeason })`.

**Identifiers:** `studentId` in the output = **`StudentProfile.id`** (stable), used for all `studentIds`; **`StudentProfile.userId`** is used only to look up `PssaFormSession.userId`. A `StudentProfile` with no linked `userId` → incomplete placeholder. Never use a display name as `studentId`.

Then `buildClassReport(inputs, { benchmarkSeason, formId, formVersion })`. (All inputs share one `formId` → WS3-C's mixed-form guard is satisfied.)

## Route contract
- Input: `classRoomId` + `formId` (+ optional `benchmarkSeason`, default from form metadata / `"BOY"` for the fall form).
- **Status codes:** missing/malformed `classRoomId`/`formId` → **400**; unauthenticated → **401**; authenticated but not `TEACHER`/`ADMIN` → **403**; class not owned/authorized → **403**; unknown class/form → **404**; happy path → **200** + the `ClassReport` JSON.
- **Auth/ownership:** follow `app/api/teacher/classes/route.ts`. **TEACHER** must own the `ClassRoom` via `teacherProfile.id`. **ADMIN** may bypass ownership ONLY if the repo already has an established app-wide admin cross-teacher pattern; if not clearly present, apply the same ownership check or **STOP** — do NOT invent admin global access.
- **Response headers:** `Cache-Control: no-store` (teacher-facing student-level data; never cached, never persisted).
- Output legitimately includes student-level rows (the requester is the authorized teacher).

## Honesty / privacy
- No re-scoring; band/cluster/misconception logic all come from the WS3 engine unchanged.
- The route returns student-level data **only to the authorized teacher**; **never persist report output to the repo**; **tests use synthetic data only** (no real student rows committed).
- No official PSSA labels (already enforced by the engine).

## Acceptance criteria
1. Pure `assembleClassReport` is **synthetic-tested**: a 5-student roster (3 submitted / 1 in_progress / 1 no-session) → `assigned 5 / completed 3 / incomplete 2`; not-started + invalidated → incomplete placeholders.
2. **`in_progress` → incomplete placeholder, generates NO misconception patterns** (partial responses never enter the insight engine).
3. **Deterministic session selection:** latest `submitted` by `submittedAt ?? updatedAt ?? createdAt`; a submitted session is never overridden by an in_progress one; invalidated ignored.
4. Scoring from **stored** session fields (`earnedPoints`/`totalPoints`/`pendingHumanPoints`); `pssaScoring.ts` not imported or changed.
5. `studentId` = `StudentProfile.id` (stable), used for all output `studentIds`; `StudentProfile.userId` only for session lookup; no-userId profile → incomplete; never a display name.
6. **Response-mapping test:** synthetic `PssaFormResponse`-like rows are mapped into the exact attempt-response shape `deriveStudentInsights`/`buildStudentReport` consume (catches `selectedIndexOf`/payload parsing).
7. All inputs share one `formId` (WS3-C mixed-form guard never trips); benchmarkSeason passed through.
8. Route status codes: 400 (missing/malformed params), 401, 403 (non-teacher + not-owned), 404, 200; `Cache-Control: no-store`; admin access not invented.
9. Engine modules, scoring, schema, DTOs, UI, item content **unchanged** (assembler + route + test + spec only).
10. If the engine needs a response field the session can't supply without scoring/schema changes → **STOP and report**.
11. Tests synthetic-only; no committed student data; no report output persisted.

## Tests
- Synthetic roster (e.g. 5 students: 3 submitted, 1 in_progress, 1 no-session) → assembler returns ClassReport with assigned 5 / completed 3 / incomplete 2; bands + map + groups populate from the engine; determinism.
- Invalidated-only student → incomplete placeholder (assigned, not completed).
- Scoring read from stored fields (assert no call into pssaScoring).
- Route tests **only if** the repo already has an established authenticated route-handler test pattern; otherwise provide manual/source proof in the stop report. Do NOT invent a new auth test framework.
- `npx tsc --noEmit`; PSSA suite (`test:pssa-content`, `test:pssa-db6`, `test:pssa-pr-b`) green; no schema/migration diff.

## Stop report
branch; commit SHA; files changed (confirm: new assembler + route + test + spec only; WS3 engine / scoring / schema / DTO / UI / content untouched); roster→sessions→engine data-flow summary; assigned/completed/incomplete proof on synthetic roster; stored-scoring-not-recomputed proof (no `pssaScoring` import); auth/ownership/status-code proof (400/401/403/404/200); Cache-Control no-store proof; in_progress-no-insights proof; submitted-wins-over-in_progress proof; response-field mapping proof; mixed-form-never-trips note; STOP-trigger check (engine response-field availability); tsc + PSSA suite results; synthetic-only confirmation.