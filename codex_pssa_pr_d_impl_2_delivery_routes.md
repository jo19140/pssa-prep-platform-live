# PSSA PR D-impl-2 — PSSA-native delivery routes + session lifecycle (fixture-testable NOW; E2E acceptance GATED)

## Context
Decision of record: `specs/pr-d-form-session-bridge-decision.md` (Option A2, on main). D-impl-1 provides `PssaFormSession`/`PssaFormResponse` (+ the score-contract CHECKs + the partial unique index `PssaFormSession_one_in_progress_per_user_form_idx`). This PR builds the delivery layer on top — the FIRST surface where a student can touch governed PSSA content, so every quarantine and gate from PR B/C/DB-5.1 applies with zero slack.

**E2E gating (Pro-locked):** implementation is built and tested against FIXTURES and/or an assembled-form fixture. End-to-end acceptance against the real dev DB waits for: D-impl-1 merged (done), #4p imported (done), Jonathan's approval pass, and a blueprint-valid assembled form. Do not block the build on those; do not claim E2E done without them.

## Scope / boundary (locked)
1. **Service** `lib/content/pssaFormSession.ts` — session lifecycle + validity + write invariants + scoring integration (pure logic, injectable db).
2. **Routes** under `app/api/pssa/session/`:
   - `POST launch` — privileged: creates a session FOR a named student (`{ userId, formId }`). See launch-grant rules.
   - `GET state` — session owner: sanitized session state + current position.
   - `GET item` — session owner: the projected DTO for one position.
   - `POST answer` — session owner: store + server-score one response.
   - `POST submit` — session owner: finalize totals.
3. **Tests** (`scripts/test-pssa-pr-d2-delivery.ts`, npm `test:pssa-pr-d2`) — service tests + route-shape tests + adversarial leak/authz tests, all fixture-based.

**Explicitly NOT in D-impl-2:** any change to `app/api/student/session`, `app/api/test/*`, `StudentTest.tsx`, `lib/serverScoring.ts` (byte-untouched, `git diff` proves); **no schema changes or migration edits of ANY kind** (see race backstop below); no student-facing UI/page (the player page is a later PR — these are API surfaces); no `Assignment` wiring (PR E′); no `PssaHumanScore`/teacher rubric scoring; no reports/dashboards.

## Launch grant (v1, schema-free — the "no open start-by-formId" rule made concrete)
- Students can NEVER create sessions. **Launch authorization (Pro patch 1):** teacher launch must be bound to an existing server-side teacher→student authorization relationship (roster/class membership). If no reliable roster relationship can be enforced in v1, `POST launch` is **ADMIN-only** until PR E′ assignment grants land — teachers must not be able to launch sessions for arbitrary userIds. (Codex: check whether `ClassRoom`/teacher-student linkage supports a reliable check; if yes, TEACHER launch requires it; if no, ship ADMIN-only and say so in the stop-report. The authz test matrix below branches on this choice — implement the matching branch.)
- Launch pins `formContentHashAtStart` only after the full validity check passes. **Validity is checked BEFORE session creation — a non-deliverable form creates NO session row** (launch is the one route where there is no session to invalidate).
- All other routes require `requireUser(["STUDENT","ADMIN"])` AND `session.userId === auth.user.id` (admins may take their own launched sessions for demo purposes; they may not act on another user's session through these routes).
- A student with a `formId` but no launched session gets 404/403 — never a session. One ACTIVE (`in_progress`) session per (userId, formId): re-launch while one is active → 409 with the existing sessionId.
- **DB race backstop (Pro patch 2, resolved state):** D-impl-2 must NOT add or edit schema. The partial unique index `PssaFormSession_one_in_progress_per_user_form_idx` ALREADY EXISTS in the D-impl-1 migration — rely on it as the DB race backstop and handle its constraint violation as the 409 path. (General rule for the record: were it absent, the service would enforce uniqueness transactionally and the stop-report would list the missing DB backstop as a follow-up — that branch does not apply here.)
- PR E′ later replaces manual launch with assignment-driven grants; this surface must not grow student-self-serve behavior in the meantime.

## Route behavior by session status (locked)
- `GET state`: allowed for `in_progress`, `submitted`, and `invalidated_midflight` — returns only safe state.
- `GET item`, `POST answer`, `POST submit`: require `status = in_progress`. After submit → 409. For `invalidated_midflight` → 409 and NEVER expose item DTOs.
- **Submitted sessions are ARCHIVAL (Pro precision note):** for `submitted` sessions, `GET state` returns archival safe state and does not expose item DTOs or accept writes; it must NOT reclassify a completed session as `invalidated_midflight` because content drifted after submission — quarantine policy for completed attempts is a separate, later reporting decision. The validity check's invalidation path applies to `in_progress` sessions only.

## Session validity check (the decision doc's locked list — runs on EVERY route)
A single service function `assertSessionDeliverable(db, session)` enforcing, fail-closed:
1. `form.formStatus === "assembled"`.
2. Current form `contentHash === session.formContentHashAtStart`.
3. Every form member passes the LIVE `getStudentReadyPssaItems` recompute AND the form passes the verify-equivalent snapshot check (item `approvedContentHashSnapshot`, `passageIdSnapshot`, passage approved-hash snapshot, membership/position) — BOTH, never either/or.
4. The requested position/formItem belongs to this form and session.
Failure on an `in_progress` session ⇒ `status = invalidated_midflight` + `invalidatedReason`, block the action, preserve existing responses (never delete, never re-point). Runs at launch (pre-creation), state (in_progress only — see archival rule), item, answer, AND submit. Cache nothing between requests.

## Item delivery (GET item — the leak-critical surface)
- Response body = `projectPssaStudentItem(...)` output (PR B projection, used as-is — no re-implementation, no widening) + `position`, `pointValue`, session progress. NOTHING else: no itemId exposure beyond what the DTO carries, no batch/EC/audit metadata, no `correct*` anywhere.
- Headers: `Cache-Control: no-store, private` (DB-5.1 convention) on every route.
- SHORT_ANSWER delivers its DTO like any type; its answers are stored and held `pending_human_scoring`.

## Answer flow (POST answer)
0. **Request body accepts ONLY `{ sessionId, position, responsePayload }` (Pro patch 3).** The server resolves the formItem strictly from `session.formId + position`. Any client-supplied `itemId`, `formItemId`, `pointsEarned`, `maxPoints`, `scoreStatus`, `detail`, `correct*`, or extra top-level field → 400 rejected. The client never names items.
1. Validity check; session must be `in_progress`.
2. Write invariants (D-impl-1 spec, all three): `response.formItem.formId === session.formId`; `positionSnapshot === formItem.position`; `itemId === formItem.itemId`.
3. Score server-side via `scorePssaItem` (PR C module, used as-is). `invalid_response` results ARE stored (audit trail of malformed STUDENT submissions) with `pointsEarned = 0`.
3a. **Snapshot integrity (Pro patch 4):** after scoring, assert `scoreResult.maxPoints === formItem.pointValue`. Mismatch = item/form drift → fail closed (mark `invalidated_midflight` with an item-integrity reason); NEVER store a score whose maxPoints disagrees with the assembled-form snapshot.
3b. **Item-side scorer throws (Pro patch 5):** if `scorePssaItem` throws (`malformed_item_scoring_data` / `unknown_interaction_type`), do NOT store a response row — that is an item-side failure, not a student error; refuse fail-closed with an item-integrity reason. `invalid_response` rows are reserved for malformed STUDENT payloads returned (not thrown) by PR C.
4. **Answer changes allowed before submit** (DRC-style revisiting): an existing response row for the same formItem is UPDATED (payload + re-scored + `updatedAt`); after submit, all writes refuse (409). The `@@unique([sessionId, formItemId])` constraint is the backstop.
5. Minimal mutation response (DB-5.1 rule): `{ position, scoreStatus, isComplete }` — NO points echo to the student mid-test, NO detail string (branch ids could fingerprint correctness), NO key material. Points are visible only post-submit via state.
6. Same-origin Origin/Referer + `Content-Type: application/json` checks on all POSTs; `consumeRateLimit` + `getClientIp` on every route (DB-5.1 conventions).

## Submit flow (POST submit — totals from FORM SNAPSHOTS, Pro patch 3 of round 2)
Validity check → all positions answered OR explicit `allowIncomplete: true` from the client → compute:
- `totalPoints` = sum of the form's `PssaFormItem.pointValue` SNAPSHOTS (the authoritative session-scoped values — never derived from PR C results or pool rows);
- `earnedPoints` = sum of stored scored `pointsEarned`;
- `pendingHumanPoints` = sum of `maxPoints` over stored `pending_human_scoring` rows ONLY.
For every stored response, `maxPoints` must equal its `formItem.pointValue` (already asserted at answer time — re-assert at submit). Unanswered positions under `allowIncomplete` contribute 0 earned and 0 pending and create NO response row. Then `status = submitted`, `submittedAt = now()`. Post-submit `GET state` may include per-position scoreStatus + earned points (the test is over); it still never includes keys or PR C `detail` internals. **Unanswered positions get a SYNTHETIC display status `unanswered`** — never fabricated `PssaFormResponse` rows, never stored `invalid_response` for positions the student simply skipped.

## Tests (fixture-based; no live DB required)
1. **Leak tests (recursive, the PR B pattern)**: GET item route handler output for all 8 interaction types from realistic fixtures + adversarial planted keys at depth → zero banned keys (reuse the PR B banned list + `/correct/i`); POST answer response → no points/detail/key echo pre-submit.
2. **Authz matrix (Pro patch 1 of round 2 — branches with the launch implementation):**
   - student creating session → 403;
   - student acting on another's session → 403/404;
   - admin launching for a named student → 201;
   - admin acting on another user's owner route → 403;
   - IF roster-bound teacher launch implemented: teacher launching for an authorized roster student → 201; teacher launching for a non-roster student → 403;
   - IF no reliable roster relationship (v1 ADMIN-only): teacher launch → 403;
   - re-launch while active → 409 (and the DB partial-unique backstop path also yields 409 under race).
3. **Validity matrix**: invalidated form, drifted `contentHash`, member leaving the live selector (fixture flips one item to PENDING), foreign formItem, position out of range — each on EVERY active-session route → `invalidated_midflight` or refusal per spec; responses preserved. PLUS: a `submitted` session with post-submission form drift → `GET state` still archival, NOT reclassified.
4. **Answer lifecycle**: store → change before submit (updated + re-scored) → submit → further answer 409; invalid_response stored with 0; CHECK-constraint compatibility (scored/pending/invalid rows all insertable).
5. **Submit math**: totals from `PssaFormItem.pointValue` snapshots; machine-scored totals + pendingHumanPoints with SA in the mix; allowIncomplete semantics (0 earned/0 pending/no rows for skipped).
6. **Scope proof**: `git diff` shows zero changes to legacy routes/player/scorer AND zero schema/migration changes; no imports of `serverScoring` or legacy session code anywhere in the new files.
`tsc` + `build` + ALL existing `test:pssa-*` green.

## Stop — report (for Claude's independent audit)
Service + route file list; the validity-check implementation (single function, call sites at all five routes); the launch authorization choice (roster-bound TEACHER or ADMIN-only) with its evidence; authz matrix output for the implemented branch; leak-test output incl. planted-key results; answer-lifecycle outputs; submit math fixtures (snapshot-sourced totals); minimal-response shapes for each route; archival-state proof for submitted sessions; `git diff --stat`; tsc/build/suite results. Do NOT touch legacy surfaces or schema. Do NOT add student self-launch. Do NOT echo points or `detail` before submit. E2E demo against the real dev DB is NOT part of this stop-report (gated separately).
