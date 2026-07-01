# Codex Spec — Tracked real-DB PSSA form verification runner (+ BOY step-5 proof)

**Type:** verification tooling (new tracked script). **Owner:** Jonathan. **Date:** 2026-07-01.
**Goal:** Step 5 (launch → answer → submit → score → verify Insights/DOK + role-safe reporting) must be **reproducible from the repo**. Do NOT depend on the absent local `scripts/seed-pssa-diagnostic-insights-e2e.ts`, and do NOT treat a manual browser flow as the only proof. Add a tracked runner that drives a **real Prisma DB** session end-to-end and asserts caller-supplied expected values. First prove the harness on a known MOY/EOY form, then use it as the BOY proof.

## 0. Grounding (verified against main 071ddb61 — use these real names, not placeholders)
- Delivery API in `lib/content/pssaFormSession.ts` (all take `db: PssaDb`, which is the **real Prisma client** — the API routes pass `import { db } from "@/lib/db"`; no adapter/fixture):
  - `launchPssaFormSession(db, { auth, userId, formId })` → `{ sessionId, formId, status, currentPosition, currentSectionIndex }`. **Student launch is forbidden** (`student_launch_forbidden`); launch as the teacher/admin **for** the student `userId`.
  - `getPssaSessionItem(db, { auth, sessionId, position })` → **key-free** student DTO.
  - `answerPssaSessionItem(db, { auth, sessionId, position, responsePayload })` → returns **only** `{ isComplete, position, scoreStatus }` (no key/score-detail material).
  - `submitPssaSession(db, { auth, sessionId, allowIncomplete? })` → `{ status, totalPoints, earnedPoints, pendingHumanPoints, analyticsTotalPoints, analyticsEarnedPoints, analyticsPendingHumanPoints, positions }`. `totalPoints`/`earnedPoints`/`pendingHumanPoints` are the **operational** bucket.
- Correct-answer payloads (mirror `correctPayload` in `scripts/test-pssa-eoy-e2e-release.ts`) — per interaction type from `correctResponseJson`: MCQ `{selectedIndex}`, EBSR `{partAIndex, partBIndices}`, MATCHING_GRID `{rowSelections}`, DRAG_DROP `{assignments}`, INLINE_DROPDOWN `{blankSelections}`, SHORT_ANSWER `{shortResponse:"…"}`.
- Leak API: `PSSA_STUDENT_DTO_BANNED_KEYS` + `assertNoBannedKeys(value)` from `lib/content/pssaStudentDto.ts` (banned set includes `distractorRole`). Also assert the serialized student payload does not match `/scoringBucket|analytics_only|operational|correct|rationale|dok/i`.
- Teacher Insights/DOK: `assembleClassReport(entries, opts)` from `lib/content/pssaClassReportLoader.ts` → `ClassReport` (`byDok`, `byDokCategory`, misconception insights with `distractorRole` evidence). This is the **teacher-only** payload.

## 1. CRITICAL trap — BOY stamina MCQ correct-answer shape
The EOY `correctPayload` reads `item.correctResponseJson.correctIndex`. **BOY stamina MCQ items have NO `correctResponseJson`** — the key is the **top-level `item.correctIndex`** (the older shape the BOY importer added eligibility for). SHORT_ANSWER uses `expectedAnswerCore`/`acceptableTextSupport` and scores `pending_human` regardless of the response. So the runner's payload builder MUST:
- MCQ: `selectedIndex = item.correctResponseJson?.correctIndex ?? item.correctIndex` (fail loudly if neither is an in-range integer).
- SHORT_ANSWER: any non-empty `shortResponse` (it will land `pending_human_scoring`; do not expect it auto-scored).
- Reuse the EOY shapes for EBSR/MG/DD/INLINE_DROPDOWN unchanged.
If this is missed, every BOY MCQ answers `undefined`, earned never reaches 39, and the run fails misleadingly.

## 2. Deliverable — `scripts/verify-pssa-form-realdb.ts` (new, tracked)
Parameterized real-DB runner. **Inputs (CLI flags):** `--formId`, `--env dev` (required; refuse prod-like without `--allow-production`), and expected-value flags: `--expect-delivered`, `--expect-operational-total`, `--expect-earned-autoscored`, `--expect-pending-human`, `--expect-short-answers`, `--expect-analytics` (`none` for BOY; `items:points` for MOY/EOY). Requires `DATABASE_URL`.
Behavior (fixed pipeline; only the numbers are parameterized):
1. **Prisma ledger gate (before anything):** count directories in `prisma/migrations/` vs `SELECT count(*) FROM _prisma_migrations`. If unequal → **STOP** (do not launch). Print both counts.
2. Resolve the assembled form by `--formId`; assert `formStatus==="assembled"`/published-ready and `deliveredItems === --expect-delivered`.
3. Seed/resolve a teacher (admin) auth + a student user (reuse `scripts/seed-pssa-roster-demo.ts` conventions or resolve the already-seeded demo student). Assert **student launch is forbidden**; launch as teacher **for** the student.
4. Walk every section; for each position: fetch the student DTO, run the **role-safe leak assertion** (§3) on it, then `answerPssaSessionItem` with the correct payload (§1). Assert the answer result keys are exactly `{isComplete, position, scoreStatus}`.
5. `submitPssaSession`. Assert: `status==="submitted"`; `totalPoints === --expect-operational-total`; `earnedPoints === --expect-earned-autoscored`; `pendingHumanPoints === --expect-pending-human`; number of SHORT_ANSWER items `=== --expect-short-answers`; **pass condition = `earnedPoints + pendingHumanPoints === totalPoints`** (NEVER `earnedPoints === totalPoints`). If `--expect-analytics none`, assert `analyticsTotalPoints === 0`; else assert it equals the given split.
6. **Teacher Insights/DOK:** build the class report via `assembleClassReport(...)` for this session; assert it is non-empty and exposes teacher-only structure (`byDok`/`byDokCategory` present, and at least the misconception/insight/`distractorRole` evidence surface is populated).
7. Print a PASS/FAIL summary with every asserted value.

## 3. Leak check must NOT pass vacuously (role-checked, both payloads)
Fetch **both**:
- **Teacher payload:** the `assembleClassReport` output — assert it **includes** teacher-only fields (item details / rationale / DOK / insight / `distractorRole` evidence). (Proves the teacher path actually carries the sensitive data.)
- **Student payload:** the `getPssaSessionItem` DTO for delivered positions — assert it **is actually retrieved** (non-null) AND `assertNoBannedKeys` passes AND the serialized form matches none of `/scoringBucket|analytics_only|operational|correct|rationale|dok/i`.
A leak assertion that only checks the student side, or that passes because a payload was empty/unfetched, is a FAIL of this spec.

## 4. Harness self-validation before trusting BOY
Before treating the runner as BOY proof, point it once at a **known MOY or EOY** form (fresh MOY/EOY DB or the existing live one, read-appropriate) and confirm it reproduces that form's **already-established** operational outcome (e.g. EOY: delivered 45, operational 45, earned 39, pending 6, analytics 16; MOY: delivered 40, operational 45, earned 39?/pending per its blueprint, analytics 8). If the harness can't reproduce a known-good result, fix the harness before running BOY.

## 5. BOY invocation (the proof) — expected values
```
tsx scripts/verify-pssa-form-realdb.ts --env dev --formId cmr2h0zm00001xnqk5ipk7t3k \
  --expect-delivered 35 --expect-operational-total 45 \
  --expect-earned-autoscored 39 --expect-pending-human 6 \
  --expect-short-answers 2 --expect-analytics none
```
BOY facts (verified against `GRADE3_DIAGNOSTIC_BLUEPRINT`): pool has **39** eligible BOY items; the assembled form delivers **35** (20 reading MCQ + 9 conventions + 2 EBSR + 1 MG + 1 DD + 2 SA); operational total **45**; auto-scored earned **39** (33 auto items); SA pending **6**; **no analytics bucket**; **4 pool items intentionally unselected** by this seed (`syrup_ebsr_01`, `rabbit_ebsr_01` = EBSR overage; `owls_06`, `rabbit_sa_01` = SA overage) — NOT a defect (blueprint budgets 4 multipoint + 2 SA).

## 6. Scope & guardrails
- **New tracked files only:** `scripts/verify-pssa-form-realdb.ts`, this spec. May also add a thin `package.json` script alias (`verify:pssa-form-realdb`). Nothing else.
- **No content changes.** Do NOT touch any BOY/MOY/EOY item content, answer keys, ECs, scoring specs, passage text, the assembler, the importer, scoring, schema, or the student-ready selector. Verification tooling only.
- Do not hardcode BOY-only numbers except in the BOY invocation/config; all expected values are CLI-parameterized.
- Do not expand into MOY/EOY remediation or answer-choice rewriting (separate tranches).
- Base off `origin/main` (071ddb61). Clean worktree; preserve `codex/teacher-lessons-tab-pr1`; guard+symlink+trap `node_modules`; never `git add -A`; never stage `scripts/seed-pssa-diagnostic-insights-e2e.ts` or `wip-dashboards-session-review.md`.

## 7. Gates
```
set -euo pipefail
./node_modules/.bin/tsc --noEmit
OPENAI_API_KEY=sk-build-dummy npm run build
# harness self-validation on a known form (MOY or EOY) BEFORE BOY:
tsx scripts/verify-pssa-form-realdb.ts --env dev --formId <KNOWN_MOY_OR_EOY_FORMID> --expect-… (known values)
# BOY proof:
tsx scripts/verify-pssa-form-realdb.ts --env dev --formId cmr2h0zm00001xnqk5ipk7t3k --expect-delivered 35 --expect-operational-total 45 --expect-earned-autoscored 39 --expect-pending-human 6 --expect-short-answers 2 --expect-analytics none
for t in scripts/test-pssa-*.ts; do echo "== $t =="; ./node_modules/.bin/tsx "$t" || exit 1; done
echo "real-DB verification runner + BOY proof passed"
```

## 8. Process
Clean-worktree flow from `origin/main`; carry+commit this spec; implement §2; run §7 (ledger gate → harness self-validation on a known form → BOY proof → full suite); commit (no merge); report branch + tip SHA + file list + the full BOY PASS summary (all asserted values) + the ledger counts + confirmation no content files changed. **Independent audit before merge** (Claude: re-verify the runner is content-inert, the leak check is role-checked + non-vacuous, the stamina-MCQ payload path is correct, harness self-validated on a known form, BOY assertions match the blueprint, exact-SHA-pinned merge).
