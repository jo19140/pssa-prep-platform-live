# PSSA Diagnostic — Phase 3: Section-gated delivery EXTENSION
## Extend the existing flat diagnostic player/session flow — do NOT rebuild

Prereqs on main: Phase 1 (PssaFormSection schema + GRADE3_DIAGNOSTIC_BLUEPRINT), Phase 1.5 (39-item pool + 2 TE), Phase 2 (assembleDiagnosticFormFromPool, 7d460bf).
This phase is a SURGICAL section-gating upgrade to delivery that ALREADY EXISTS. It is NOT a from-scratch build.

## What already exists (REUSE — do not duplicate, do not fork)
Verified on main (all flat, zero section-awareness today):
- Session model: PssaFormSession (flat currentPosition), PssaFormResponse (positionSnapshot, responsePayloadJson), PssaFormSessionStatus — prisma/schema.prisma.
- Session logic: lib/content/pssaFormSession.ts.
- Routes: app/api/pssa/session/{launch,state,item,answer,submit}/route.ts.
- Key-free student DTO: lib/content/pssaStudentDto.ts (projectPssaStudentItem, PSSA_STUDENT_DTO_BANNED_KEYS, assertNoBannedKeys).
- Student pages: app/student/diagnostic/page.tsx (landing), app/student/diagnostic/[sessionId]/page.tsx (player), .../complete/page.tsx.
- Scoring-on-submit path (PR-C, pssaScoring.ts).
Hard rule: extend these files. Do NOT create a second player, parallel routes, a new session engine, or a new scoring path.

## UX source of truth
Build to the already-approved DRC-INSIGHT-style mock diagnostic_look_and_feel_mock.html (untimed, tool strip, Review screen showing answered/unanswered/flagged, Review/End-Test, no-return section gate). Do NOT invent a new UI or copy from scratch — match the approved mock.

## What to ADD (the only new work)
1. Section progress state. The session model has no JSON/metadata field, so this needs ONE small additive migration (do NOT STOP on this — it is the expected, approved change). Prefer the minimal shape that fits existing patterns, e.g.:
   - currentSectionIndex Int @default(1) on PssaFormSession, plus per-section status — either a sectionStatusesJson Json? on the session OR a small PssaFormSectionProgress table (sessionId, sectionIndex, status, completedAt). Pick the cleaner one; keep it additive (existing flat sessions unaffected, default to a single implicit section).
   - Section status enum: not_started | in_progress | review | completed_locked. If using a Prisma enum, follow existing project naming/style conventions; if using JSON, validate allowed values in server code.
   - If existing session metadata could already store this safely, use it. STOP only if a broad schema redesign appears necessary (it should not — one additive table/field). Do NOT introduce a broad attempt/session redesign.
2. Section-gated route validation (extend the 5 existing routes). Server-side gating is the source of truth — client-side locking is not enough. Server routes must enforce: cannot fetch a future-section item; cannot answer a locked-section item; cannot answer an omitted candidate; cannot submit before all sections are completed_locked.
   - launch: load/assemble the diagnostic form (consume assembleDiagnosticFormFromPool); initialize section statuses (S1 in_progress, S2/S3 not_started/locked).
   - state: return currentSectionIndex, per-section summaries (counts, status), locked/unlocked — no answer keys.
   - item: return items only from the current unlocked section; reject future-section access and any omitted candidate (syrup_ebsr_01, rabbit_ebsr_01, owls_06, rabbit_sa_01).
   - answer: save only for the current unlocked section; reject locked-section writes; reject malformed EBSR/TE/SA payloads.
   - submit: allow only after all 3 sections are completed_locked; use the existing scoring path.
   - Add a new route/action ONLY if the existing pattern can't cleanly express endSection / reviewSection / resumeSection — prefer extending existing handlers.
3. Player page extension (app/student/diagnostic/[sessionId]/page.tsx — the existing one): section intro screen, in-section item navigation (current section only), section review screen, end-section confirmation + lock, resume into the current section, paired-passage rendering for Section 3 (both owls member passages labeled "Passage 1: Built for the Night" / "Passage 2: The Barn's Best Helper", never split; owls_ebsr_01 can see both). Reuse the existing item renderers (MCQ/EBSR/SHORT_ANSWER/DRAG_DROP/MATCHING_GRID) — do not rewrite them.
4. DTO extension (pssaStudentDto.ts): add section structure (sections[], sectionIndex on items/passages, per-section counts + locked/unlocked, currentSectionIndex) while keeping every existing key-free guarantee — no correct answers, no scoring keys, no TE evidenceQuote/correctColumnId/correctAssignments, no rubrics/score-bands to the student during the test. assertNoBannedKeys must still pass.

## Delivered form contract (must equal the pinned Phase 2 form)
| Section | Content | Items | Points |
|---|---|---|---|
| 1 | Syrup + conv_01–05 | 11 | 15 |
| 2 | Boat | 8 | 13 |
| 3 | Owls paired + Rabbit + conv_06–09 | 16 | 17 |
| Total | 4 passage units, 3 sections | 35 | 45 |
The omitted candidates (syrup_ebsr_01, rabbit_ebsr_01, owls_06, rabbit_sa_01) must never be deliverable.
Consume the assembled form, don't hard-code it. Delivery must drive off the sectioned form data from assembleDiagnosticFormFromPool — rely on sectionIndex, the selected item IDs, the selected passage rows, and section metadata. Do NOT hard-code item IDs in delivery logic (routes/UI) except in tests/assertions for the pinned Grade 3 diagnostic. The player must stay form-driven, not a one-off Grade-3 hard-coded player.

## Student-facing rules (from the approved mock)
- Untimed; no countdown; no auto-submit on time.
- Sections delivered in order. The UX must support completion across multiple sittings (resume) and must not force the student to finish all sections at once. Do NOT add date-based or "max sections per day" enforcement unless existing scheduling/assignment infrastructure already supports it — if hard day-based gating appears necessary, STOP and report it as a separate product decision.
- Section 3 passage display: S3 contains the owls paired group AND the Rabbit passage. Show the passage unit relevant to the current item (the existing item player's pattern) — do NOT show all three S3 passages at once. For owl items show both owl member passages together (owls_ebsr_01 can access both); for rabbit items show the Rabbit passage; for conventions no passage is required.
- After ending a section it is locked (no edits); the next section unlocks.
- Review screen before ending a section: shows answered / unanswered status; allow ending with blanks after confirmation (blanks scored 0 at final scoring). Flagging scope (lean): the approved mock includes a "flag" status, but for this phase show flagged status ONLY if existing flag support already exists. Do NOT add new flag persistence (no new isFlagged field / migration) in this phase unless explicitly approved — flagging is a fast-follow, not part of the load-bearing section-gating build.
- No official Below Basic/Basic/Proficient/Advanced labels; no score shown before final submit; calm, grade-appropriate copy (no "fail"/"high stakes").
- Completion screen after submit: "Your diagnostic is complete. Your teacher will review your results."

## Non-goals (do NOT do)
Rebuild the session engine; create a second diagnostic player; create parallel launch/state/item/answer/submit routes; change item content, passage text, answer keys, EC metadata, or scoring; change the Phase 2 assembler selection; build score reports / anchor reporting / readiness bands; official PSSA labels; new item authoring; grades 4–8 / TDA / MOY-EOY; commit student-report PDFs or anchor-analysis exports.

## Schema rule
Prefer no schema change. Use existing session metadata if it can safely store section progress. If no existing field can represent section state (confirmed: there is none), allow one small additive session-progress migration limited to section-delivery state (additive only; existing flat sessions unaffected). STOP only if a broad schema redesign appears necessary.

## Tests
Positive: start attempt → S1 unlocked, S2/S3 locked; answer + review S1; end S1 locks it + unlocks S2; cannot edit S1 after lock; cannot open S3 before ending S2; save+resume mid-S2 returns to the right item/section; end S2 unlocks S3; S3 shows owls passages + rabbit; all selected owl items in S3; owls_06 not delivered; answer EBSR/DRAG_DROP/MATCHING_GRID/SHORT_ANSWER/MCQ; review marks answered/unanswered; end S3 → submit allowed; final submit locks attempt + scores via existing path; UI section counts 11/8/16; DTO has no banned keys; attempt survives refresh/resume; flat foundation delivery (if tested) unchanged.
Negative: open S2 before ending S1 → blocked; open S3 before ending S2 → blocked; edit locked S1 → blocked; save response for an item not in the form → rejected; save for an omitted candidate → rejected; submit before all sections completed → rejected; malformed EBSR/TE → rejected; client requests answer keys → not returned; missing sectionIndex on item/passage → delivery validation fails; owls members split across sections → fails.

## Guards / commands
- Scope: extend the named delivery files + the additive session-progress migration + tests + this spec only. STOP-worthy: item fixtures, passage text, pssaScoring.ts scoring changes, Phase 2 assembler selection logic, foundation content, p2-band-7-8-ae-content, tsconfig.tsbuildinfo, student-report data.
- Privacy grep (exclude all three diagnostic specs that contain the command):
  matches="$(git grep -n "PSSA ELA: Anchor Analysis by Student" -- . ':!specs/pssa-diagnostic-phase-1-5-te-items.md' ':!specs/pssa-diagnostic-phase-2-section-aware-assembler.md' ':!specs/pssa-diagnostic-phase-3-section-gated-delivery.md' || true)"
  if test -z "$matches"; then echo "privacy grep clean"; else echo "$matches"; echo "STOP: student-level PSSA report data found in committed files"; exit 1; fi
- Run: npx tsc --noEmit; OPENAI_API_KEY=sk-build-dummy npm run build; npm run test:pssa-content; npm run test:pssa-db6; npm run test:pssa-pr-b; plus any existing diagnostic-delivery / session / DTO / route tests; add a section-gated delivery test command if none exists.

## Stop report
branch; commit SHA; files changed (confirm: extended existing delivery files, did NOT create a parallel player/routes/session/scoring); the additive session-progress migration SQL (additive only) + npx prisma validate result; server-side gating proof (future-section fetch / locked-section answer / omitted-candidate answer / early-submit all rejected at the route); confirm no item/passage/scoring/assembler changes; section flow summary (landing → section intro → in-section nav → review → end-lock → resume → submit); section-gating proof (S1 unlocked / S2-S3 locked at start; ending S1 unlocks S2; ending S2 unlocks S3; locked sections not editable); delivered counts S1 11 / S2 8 / S3 16; owls proof (both passages in S3, all selected owl items in S3, owls_06 not delivered); item-type rendering proof (MCQ/EBSR/SA/DRAG_DROP/MATCHING_GRID); save/resume proof; final submit + attempt lock + scoring via existing path; no banned keys in the student DTO (assertNoBannedKeys passes); flat foundation delivery unchanged; privacy grep clean; tsc/build/test results.
