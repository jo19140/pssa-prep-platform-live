# PR D — form→session bridge decision (decision doc ONLY; no implementation in this PR)

Produced 2026-06-04 from direct schema/flow inspection on main (248cdfe). Question on the table, per the PR B plan §F5 and the roadmap: **how does a governed `PssaForm` become something a student can take — without leaking keys, bypassing DB-5 readiness, corrupting legacy `TestSession` semantics, or creating a second source of truth for item content?**

## Verified facts the decision must respect
1. `TestSession.assessmentId` is a REQUIRED FK (cascade) to `Assessment`; `ResponseRecord` hangs off sessions (`questionId Int` = question number, not FK; carries skill/standard/type/points/errorPattern/answerPayload; `EssayEvaluation` attaches per-ResponseRecord — the existing human-scoring precedent, served by `app/api/admin/grade-essay-test`).
2. **12+ live surfaces read `TestSession` assuming `assessment` is non-null** — parent/teacher/admin dashboards, scheduled reports, `aiJobProcessor` (`response.session.assessment.grade`), tutor-agent, assignments. Making `assessmentId` nullable ripples through all of them.
3. The legacy delivery path (`app/api/student/session`) ships raw key-bearing `questionPayload` (PR B §F2 blocker) and the legacy scorer diverges from canonical PSSA semantics by design (PR C: EBSR A-only = 0 vs legacy 1; no MATCHING_GRID/INLINE_DROPDOWN; SA must be human-scored). Both are quarantined: PSSA must not reuse or "lightly sanitize" them.
4. `PssaForm`/`PssaFormItem`/`PssaFormPassage` (DB-6) snapshot `approvedContentHash` + `passageIdSnapshot` per member; `--verify` flips drifted forms to `invalidated`. Items remain governed by the LIVE `getStudentReadyPssaItems` selector.
5. Every schema change on this track so far has been ADDITIVE-ONLY (DB-1, DB-6); DB-6.5 locked hash stability; PR B/C locked route/scorer quarantine.

## Options

### Option B — materialize `PssaForm` into `Assessment`/`AssessmentQuestion` rows. REJECT.
Buys instant compatibility with assignments/sessions/reports, but:
- `questionPayload` copies are a SECOND SOURCE OF TRUTH for item content — they drift silently from the governed pool; supersession/deprecation/`--verify` invalidation cannot reach them. This re-creates the exact governance failure the whole DB track exists to prevent.
- Delivery would run through the leaking legacy session route and the divergent legacy scorer — or require modifying them, which is quarantined. Either way a locked rule breaks.
- Keys would live in `questionPayload` reachable by the legacy student route. Verdict: rejected on governance, leak, and scoring-semantics grounds simultaneously.

### Option A1 — add nullable `pssaFormId` to `TestSession` (+ CHECK exactly-one-of). REJECT (narrowly).
One session model, no fork — honors the roadmap's letter. But `assessmentId String?` is an ALTER on a hot legacy table, and fact 2 means every consumer that assumes `session.assessment` non-null (dashboards, reports, aiJobProcessor) becomes a latent NPE the moment the first PSSA session row exists. The blast radius is the whole legacy product for the benefit of table-sharing. The CHECK-constraint pattern (DB-1 precedent) makes it *correct*, but correctness here costs a cross-product regression surface PR D has no budget to re-test.

### Option A2 — new additive `PssaFormSession` (+ `PssaFormResponse`) + PSSA-native delivery routes. RECOMMEND.
```
PssaFormSession {
  id, userId FK→User, formId FK→PssaForm,
  formContentHashAtStart(String),        // pins the form snapshot the student is taking
  startedAt, submittedAt?, currentPosition(Int),
  totalPoints?, earnedPoints?,           // machine-scored portion
  pendingHumanPoints?,                   // SA max awaiting rubric scoring
  status enum { in_progress | submitted | invalidated_midflight }
}
PssaFormResponse {
  id, sessionId FK→PssaFormSession,
  formItemId FK→PssaFormItem,            // membership-enforcing FK — NOT an arbitrary pool itemId
  positionSnapshot(Int),
  itemId FK→PssaItem,                    // optional denormalized audit field
  responsePayloadJson(Json),             // student payload only — never key data
  scoreStatus enum { scored | pending_human_scoring | invalid_response },
  pointsEarned?, maxPoints(Int), detail(String),   // PR C result fields verbatim
  createdAt, updatedAt,
  @@unique([sessionId, formItemId]), @@unique([sessionId, positionSnapshot])
}
```
PR D-impl-2 enforces at every write: `response.formItem.formId === session.formId` and `positionSnapshot === formItem.position` — far safer than accepting an arbitrary pool `itemId`.
**`PssaHumanScore` is DEFERRED.** PR D-impl-1 creates only the PSSA session and response tables/enums needed to start, answer, and submit machine-scored or pending-human items. SHORT_ANSWER responses remain `pending_human_scoring` with `pendingHumanPoints` until the human-rubric PR (which will mirror the `EssayEvaluation` precedent). No phantom relations.
- **Zero ALTERs on legacy tables** (the track's standing discipline); legacy product untouched and untestable-regression-free.
- Delivery routes are new and PSSA-only (`app/api/pssa/session/*`): start = live selector recompute over every member item + form `--verify`-equivalent check + pin `formContentHashAtStart`; item fetch = PR B projection DTO only; answer = PR C `scorePssaItem` server-side, minimal response (no key echo, mirrors DB-5.1 mutation-response rule); submit = totals + SA rows held `pending_human_scoring`.
- **No open start-by-formId (locked):** a student may not start an arbitrary `PssaForm` by knowing its `formId`. Until assignment wiring lands in PR E′, session start must require an admin/teacher-issued launch grant or equivalent server-side authorization binding the user to the form. PR D-impl-2 must not expose open start-by-formId behavior.
- **Session validity check runs on EVERY route (locked, fail-closed):** every PSSA session route that exposes or accepts item state must verify: form still `formStatus = assembled`; current form `contentHash` equals `formContentHashAtStart`; every form member still passes the live selector AND the form passes the verify-equivalent snapshot check (which includes `contentHash`, item `approvedContentHashSnapshot`, `passageIdSnapshot`, passage approved-hash snapshot, and membership/position checks — live readiness and snapshot integrity are BOTH required, never either/or); the requested position/formItem belongs to this form/session. This check runs at start, item fetch, answer save/score, AND submit — not start-only. Failure marks the session `invalidated_midflight`, blocks further answers, and preserves already-submitted responses for audit; never silently re-point to a newer form. (Consistent with DB-6's snapshot/verify model: stale forms invalidate, never repair.)
- The roadmap's "don't fork the test-session model" warning is honored where it matters — at the REPORTING layer: teacher/parent dashboards gain PSSA awareness later via explicit queries/views over both session tables (a future PR), rather than by overloading the legacy table now. The warning's intent was "no parallel player/schema for the same data"; `PssaFormSession` covers DIFFERENT data (governed forms) with different invariants (hash pinning, fail-closed invalidation) that `TestSession` cannot express.
- Assignment integration (how a teacher assigns a form to a class) is explicitly DEFERRED to PR E′ — pilot delivery can start admin/teacher-launched; `Assignment.assessmentId` is not touched.

## Decision requested
Approve Option A2 + the mid-session invalidation policy + the PR E′ deferral of assignment wiring. Implementation then splits: **PR D-impl-1** (additive migration: 2 tables + enums, `PssaHumanScore` deferred) → **PR D-impl-2** (delivery routes + session lifecycle, inheriting every PR B/C gate: DTO-only, server scoring, live-selector at serve, recursive leak tests on the session item endpoint, per-route auth + rate limit per DB-5.1 conventions, no open start-by-formId) → each spec'd/audited separately.

## Out of scope for all PR D work
Teacher assignment UI, reports/dashboards, TDA, grades 4–8, the conventions-vocab follow-up itself, any legacy route/table/component change.

## SCHEDULING FINDING (discovered writing this doc — affects the whole track's ordering)
**The conventions-vocab follow-up is on the CRITICAL PATH for form assembly, not a deferrable cleanup.** The Grade 3 blueprint requires EXACTLY 9 conventions points; the pool holds exactly 9 conventions items; 4 of them are the serializer-gap items (2 HT + 2 DD). With only 5 usable conventions items, `conventions_1pt = 9` is unsatisfiable — **no valid Grade 3 form can assemble until the follow-up lands** (with its fresh-DB rebuild). Two governance notes:
1. **Approval-pass guard:** nothing in the DB-5 selector checks domain non-emptiness — the 4 items COULD be approved and become student-ready/formable while being unrenderable (PR B empty DTO) and unscorable (PR C thrower). Jonathan's review pass must REJECT or skip these 4 with reason `serializer_gap_pending_vocab_followup` until the follow-up rebuild re-imports them. **The conventions-vocab follow-up MUST add a selector/readiness gate for non-empty machine-scorable response domains: a machine-scored item with missing required responseSpec domains must not be student-ready, even if approval metadata is otherwise valid.**
2. **Revised ordering (parallel-safe split):**
   - PR D decision doc lands now.
   - PR D-impl-1 (additive migration) can proceed in parallel.
   - The conventions-vocab follow-up + fresh-DB rebuild + approval re-pass must land BEFORE PR D-impl-2 can be accepted as end-to-end delivery-ready.
   - PR D-impl-2 may be SPECIFIED in parallel, but its E2E demo requires an assemblable, healthy Grade 3 form (all 9 conventions items).