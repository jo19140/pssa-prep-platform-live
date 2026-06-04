# PSSA DB-5.1 — admin review UI (`/admin/pssa-review`): a thin web wrapper over the proven DB-5 approval

## Scope / boundary (locked)
v1 is intentionally narrow and boring:
```
/admin/pssa-review
admin-only (reuse existing ADMIN role — NO new role)
approve + reject only
read-only structured preview
calls the PROVEN DB-5 approval/reject functions (reuses logic, reimplements none)
no batch UI · no revoke UI · no license-attestation UI · no student-facing route
```
**Out of scope:** dedicated reviewer role, batch approval UI, revoke UI, license attestation UI, any student-facing route or render, form assembly. The selector `getStudentReadyPssaItems` is **not** wired to any student/assignment surface here — DB-5.1 is a reviewer tool only.

## Reuse existing app conventions (do NOT invent)
- **Auth gate:** `middleware.ts` already redirects `/admin/*` when `token.role !== "ADMIN"`. In addition, **every API route must independently enforce** `requireUser(["ADMIN"])` from `@/lib/authz` (returns `{ error }` | `{ user }`) — client-side hiding and middleware alone are NOT security. If not admin → 403.
- **Rate limit:** wrap each route with `consumeRateLimit` + `getClientIp` from `@/lib/rateLimit`, exactly like `app/api/admin/content/diagnostic-items/queue/route.ts`.
- **Service layer:** follow the `lib/content/diagnosticItemReview.ts` pattern — the route is thin, the logic lives in a `lib/content/pssaItemReview.ts` service.
- **CSP/nonce:** middleware sets a strict CSP with per-request nonce; the page must work under it (no inline event handlers without nonce; use the App Router conventions already in the repo). `form-action 'self'`, `frame-ancestors 'none'` already enforced.

## Refactor first: extract the proven DB-5 logic into a server-callable service (thin-wrapper requirement)
The approval/reject predicate + mutation currently live inside the CLI `scripts/content/approve-pssa-items.ts`. **Extract the core into `lib/content/pssaItemReview.ts`** so BOTH the CLI and the API call the IDENTICAL code (no fork, no reimplementation):
- `classifyPssaItemForReview(item)` / `classifyPssaPassageForReview(passage)` — the eligible/already_approved_noop/refused classification (the strict one that uses the full selector predicate via `computeStudentReadyBlockedReason`).
- `approvePssaItem(db, { id, kind, reviewerUserId, reason })`, `rejectPssaItem(db, {...})` — the transactional mutation + `PssaReviewLog` write, returning either the new state or a `{ refused, blockedReason, detail }` result. **Refused must never silently become approved.**
- Reuse `getStudentReadyPssaItems` / `computeStudentReadyBlockedReason` from `lib/pssa-student-ready-selector.ts` unchanged.
The CLI must be refactored to import these and behave **identically** (re-run `npm run test:pssa-db5` + the CLI smoke flow to prove no behavior drift). The shared selector module stays pure/read-only; only the new service writes.

## Routes (App Router, all under `app/api/admin/pssa-review/`)
1. **`GET .../queue`** → `requireUser(["ADMIN"])` + rate limit. Returns `{ counts, passages, items }`:
   - `counts`: `{ pendingPassages, pendingItems, approved, studentReady }` (studentReady via `getStudentReadyPssaItems` length — proves the gate live).
   - For each pending **passage** and **item**: `id`, type/interaction, EC, batchId, pointValue, gradeLevel, current `reviewStatus`/`studentReadyBlockedReason`, a **sanitized `studentPreview`** (see leak rule), a **separate `reviewer` block** (answer key from `correctResponseJson`, rationale, per-gate results), and for items a `passageApproved` flag so the UI can show "passage pending."
   - Support `?grade=3` and a status filter, mirroring the diagnostic-items queue.
2. **`POST .../approve`** and **`POST .../reject`** → `requireUser(["ADMIN"])` + rate limit. Body `{ id, kind: "item"|"passage", reason }`. Calls the service; on success returns the new state + refreshed `studentReady` count; on refusal returns the blocked reason (HTTP 422) — **does not approve**. Writes `PssaReviewLog` with `reviewerUserId = auth.user.id`, `action`, `notes = reason`. `reason` is **required** (400 if empty).
   - **Mutation CSRF/origin check (PATCH 3):** before mutating, in order: `requireUser(["ADMIN"])`; require same-origin `Origin` (or valid same-origin `Referer`) — reject missing/mismatched origin (unless the existing admin mutation pattern has a documented alternate CSRF protection, in which case match it); require `Content-Type: application/json`; require non-empty `reason`; rate limit; only then call the service. This is a second guardrail on top of auth, not a replacement.
   - **Reject scope (PATCH 4 — reject is NOT a disguised revoke):** in v1, `reject` is allowed only for `PENDING`/`candidate` rows. If the row is already `APPROVED`/`pilot_ready`, return **422** with `"Use CLI revoke; web revoke is out of scope for DB-5.1."` and do NOT clear approval. Web has no revoke action in v1.
   - **Minimal mutation response (PATCH 5):** the approve/reject response body is minimal — `{ id, kind, newReviewStatus, newItemStatus, studentReadyBlockedReason, refreshedStudentReadyCount }` (+ `blockedReason`/`detail` on a 422 refusal). It MUST NOT include the `reviewer` block, answer key, rationale, or gate internals. The client advances by re-fetching `/queue` (which is itself `no-store`) for the next row; the key only ever travels on the admin-gated `/queue` GET, never on a mutation echo.

## Page (`app/admin/pssa-review/page.tsx` + a client review component)
Server component: re-check `requireUser(["ADMIN"])` server-side (defense in depth) and render the shell. A client component fetches `/queue` and renders the mockup-approved layout:
- Header `PSSA review · Grade 3` + an "admin only · server-enforced" indicator.
- Metric cards: pending passages, pending items, approved, **student-ready**.
- A warning banner: items become student-ready only after their linked passage is approved (approve passages first).
- Left queue (passages + item batches with counts); main focused review card per row.
- **Two clearly separated panes:** left **student preview** (from sanitized `studentPreview` — NO answer key), right **reviewer pane** (answer key + rationale + gate results, visually distinct, labeled "reviewer-only").
- Footer per card: required reason input + **Reject** and **Approve** buttons that POST to the routes; on success update counts + advance.
Match the signed-off mockup. Read-only structured preview (plain structured render, not interactive TEI widgets).

## Preview-leak safety (the core risk for this surface)
- The `studentPreview` field returned by `/queue` MUST be built **only** from `studentPreviewJson` (the sanitized preview). It must **never** include `correctResponseJson`, `scoringJson` answer keys, rationale, or gate internals. Verify with a test that the serialized `studentPreview` contains none of the answer-key fields.
- The answer key/rationale live ONLY in the separate `reviewer` block, returned ONLY because the route is `requireUser(["ADMIN"])`. There is no non-admin path that returns either block.
- Document that the eventual student-facing path (future DB) must read **only** `studentPreviewJson` via `getStudentReadyPssaItems` — never the raw item.

### Explicit DTO allowlist (PATCH 2 — never serialize raw Prisma records)
`GET /queue` must build **explicit DTOs**; it must NEVER serialize a raw `PssaItem`/`PssaPassage`, a Prisma `include` tree, or full JSON columns (no `...item` spread). Allowed **item DTO** fields ONLY: `id, kind, interactionType, interactionSubtype, eligibleContent, batchId, pointValue, gradeLevel, reviewStatus, studentReadyBlockedReason, passageApproved, studentPreview, reviewer`. (`studentPreview` derived only from `studentPreviewJson`; `reviewer` may carry key/rationale/gates but only on this admin-only route.) Passage DTO is the analogous minimal set. **Add a test** asserting the serialized `/queue` payload does NOT contain (outside the `reviewer` block): `responseSpecJson`, `correctResponseJson`, `scoringJson`, `provenanceJson`, `sourceCorpusManifestJson`, audit internals, or full Prisma relation objects.

### Cache / dynamic-rendering safety (PATCH 1 — not optional)
Because `/queue` returns reviewer-only answer keys to an admin browser, nothing may cache it:
- `app/admin/pssa-review/page.tsx` is dynamic / `no-store` (no static generation, no cached fetches).
- Every `/api/admin/pssa-review/*` response sets `Cache-Control: no-store, private`.
- Client fetches to `/queue` use `{ cache: "no-store" }`.
- Do NOT persist queue payloads (or the `reviewer` block) in `localStorage`/`sessionStorage`.

## Security checklist (must all hold)
- Server-side `requireUser(["ADMIN"])` on `page.tsx`, `queue`, `approve`, `reject` (4 independent checks). Non-admin → 403 on APIs, redirect on page. Do not trust middleware alone.
- No answer key, rationale, or gate internals on any non-admin code path.
- `reason` required for every approve/reject; every mutation writes `PssaReviewLog` with `reviewerUserId`.
- Ineligible/refused rows return the blocked reason and DO NOT mutate.
- Rate-limited; same-origin POST (Origin/Referer checked); `Content-Type: application/json`; respects the existing CSP/nonce.
- Approve/reject go through the extracted proven service — the route adds NO approval logic of its own.
- `no-store, private` on all responses; page dynamic; client fetch `no-store`; no client storage of payloads.
- `/queue` returns explicit allowlisted DTOs only — never raw Prisma records or full JSON columns.
- Web `reject` only acts on PENDING/candidate rows; already-approved → 422 (no web revoke).
- Mutation responses are minimal and never include the `reviewer` block / answer key; the key travels only on the admin-gated `/queue` GET.

## Tests
- **Auth:** unauthenticated and non-ADMIN requests to `page`, `queue`, `approve`, `reject` → redirect/403 (no data, no mutation).
- **Leak:** `/queue` response `studentPreview` for every row contains none of `correctResponseJson`/answer-key/rationale/gate fields (assert on serialized payload).
- **Approve:** POST approve on an eligible item → item APPROVED/pilot_ready via the proven service, `PssaReviewLog` row with `reviewerUserId`, `studentReady` count reflects passage-gating (0 if passage still pending; rises once passage approved).
- **Reject:** POST reject → REJECTED, logged, never student-ready.
- **Refusal:** POST approve on an ineligible item (e.g. stale/hash-drift/passage-not-ready synthetic) → 422 with blocked reason, zero mutation.
- **DTO allowlist (PATCH 2):** `/queue` serialized payload contains none of `responseSpecJson`/`correctResponseJson`/`scoringJson`/`provenanceJson`/`sourceCorpusManifestJson`/audit internals/raw relation objects outside the `reviewer` block.
- **Cache (PATCH 1):** `/queue` + mutation responses carry `Cache-Control: no-store, private`.
- **Origin (PATCH 3):** POST approve/reject with missing/cross-origin `Origin` → rejected, zero mutation.
- **Reject scope (PATCH 4):** POST reject on an already-APPROVED row → 422 "use CLI revoke," approval unchanged.
- **Parity:** `npm run test:pssa-db5` still green after the CLI refactor; CLI smoke flow unchanged.
- `tsc --noEmit` + `build` green.

## Acceptance
`/admin/pssa-review` is admin-only (server-enforced 4×), shows pending passages + items with a read-only student preview and a separated reviewer pane, approves/rejects via the **extracted proven DB-5 service** (no reimplemented logic), requires + logs a reason with `reviewerUserId`, refuses ineligible rows with the blocked reason, surfaces passage-gating and a live `studentReady` count, leaks no answer key on any path, and wires NO student-facing route, batch, revoke, or license UI. CLI parity preserved; `tsc`/`build`/tests green.

## Stop — report (for Claude's independent audit)
The new service module + the 3 routes + the page/client component; proof the CLI was refactored to the shared service with unchanged behavior (test output); the 4 server-side ADMIN checks; the leak-test result (student payload has no key); approve/reject/refusal test results; the studentReady-count behavior; `tsc`/`build`. Do NOT add a reviewer role, batch/revoke/license UI, or any student-facing route/selector wiring.
