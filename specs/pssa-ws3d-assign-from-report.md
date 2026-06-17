Both prereqs are now merged, so you're clear to run it. Save the spec to specs/pssa-ws3d-assign-from-report.md, then paste this:
textImplement WS3-D: PSSA assign-from-report (the write action).
Single source of truth = specs/pssa-ws3d-assign-from-report.md. Read it fully first. If missing, STOP and report.

Builds on WS2-R1 (report assembler), WS3-D-pre (bridge), the lesson metadata, and StudentLessonProgress. This is a WRITE action + ONE additive migration. It does NOT re-score, re-interpret, or rebuild analytics.

BRANCH: feat/pssa-ws3d-assign-from-report

SCOPE — only these:
1. Additive migration: add `dueDate DateTime?` to StudentLessonProgress (nullable, no backfill).
2. NEW route app/api/teacher/pssa/assign-recommended-lesson/route.ts (POST only).
3. NEW pure helper assembleBridgeLessons(dbLessons, seeds) -> BridgeLesson[] (join by gradeLevel+skill), synthetic-testable, no DB inside.
4. If WS2-R1's report-loading lives inside its route, EXTRACT a shared server-side loader helper and have both call it. Do NOT import one Next route handler from another.
5. NEW tests (synthetic).

DO NOT TOUCH: scoring, WS3 engine modules, the bridge module, item content, report logic, UI. No new assignment model — reuse StudentLessonProgress.

REQUEST (POST):
{ classRoomId, formId, benchmarkSeason, groupId, lessonId, studentProfileIds: string[], dueDate: "YYYY-MM-DD" }
- studentProfileIds must be UNIQUE and a SUBSET of the suggested group's studentIds (v1; no override outside the group).
RESPONSE 200:
{ ok: true, lessonId, dueDate, results: [{ studentProfileId, outcome: "created" | "updated" }] }  // Cache-Control: no-store

SERVER BEHAVIOR (ordered; ALL validation before ANY write):
1. Validate input (zod): non-empty classRoomId/formId/groupId/lessonId; studentProfileIds non-empty, UNIQUE, <= class size; dueDate valid YYYY-MM-DD. Any failure -> 400. Duplicate studentProfileIds -> 400.
2. Auth: unauthenticated -> 401; not TEACHER/ADMIN -> 403; ClassRoom not owned (teacherProfile.id) -> 403; unknown class/form -> 404.
3. Rebuild the ClassReport server-side (reuse the WS2-R1 loader path) for classRoomId+formId. Find suggestedGroups by groupId. If the group is NOT in the current report -> 409 stale_report_group. Capture the group's cluster, roleFamily, and authoritative studentIds.
4. Membership gate (strict, v1): every requested studentProfileId must be enrolled in the class AND in group.studentIds, else -> 400. No override outside the group.
5. Assemble BridgeLesson[] = approved LearningLesson DB rows joined to seed tags (buildPrebuiltLessonSeeds) by gradeLevel+skill. Call suggestLessonsForReport(report, bridgeLessons) with the SAME maxPerGroup the UI uses; take the candidates for groupId.
6. Lesson gate: lessonId must be (a) approved AND (b) one of the bridge candidates for that group, else -> 409 stale_or_invalid_lesson_candidate. No unapproved, non-bridge-eligible, or cross-cluster lesson.
7. Map requested studentProfileId -> userId via StudentProfile.userId. A profile with no linked user -> 400 (not a silent skip).
8. Prefetch existing StudentLessonProgress rows for lessonId + the requested userIds (to report created vs updated). Then, INSIDE ONE TRANSACTION, upsert per userId:
   - not exists -> create { lessonId, userId, dueDate }
   - exists -> update dueDate ONLY; do NOT change status, attempts, responses, mastery, completion, or any timestamp other than the automatic updatedAt.
   Any failure -> roll back ALL writes (no partial assignment).
9. Return the summary with created/updated per student; Cache-Control: no-store.

DUE-DATE STORAGE (timezone-safe):
Parse YYYY-MM-DD as a school date and store as UTC noon (e.g. 2026-10-10T12:00:00.000Z) to avoid date drift. Return the original YYYY-MM-DD string in the response.

assembleBridgeLessons CONSTRAINTS:
- Join DB rows x seeds by gradeLevel+skill ONLY if unique. If multiple seeds share a gradeLevel+skill, or DB rows match ambiguously, STOP / surface a deterministic audit error. Do NOT guess.
- Use the existing LearningLesson reviewStatus enum/helper for "approved". If approval semantics are unclear, STOP and report (do not hard-code "APPROVED").
- BridgeLesson = { lessonId, title, skill, gradeLevel, standardCode, standardCodes[], pssaBridgeTags[], reviewStatus }.

GUARDRAILS:
- studentProfileIds subset of group.studentIds; never the whole class implicitly, never arbitrary students.
- Only approved + bridge-eligible lessons assignable (excluded/foundational/writing-tda/unapproved can never be assigned here).
- Idempotent + non-destructive (re-assign updates only dueDate).
- No re-scoring/re-interpretation/report change.
- Tests synthetic-only; never commit student data.

ACCEPTANCE (synthetic):
1. Migration additive (dueDate DateTime?), nullable, no backfill; npx prisma validate clean.
2. Happy path: a subset of a group + approved bridge-candidate lesson + valid dueDate -> StudentLessonProgress upserts for exactly those userIds with dueDate; response lists created/updated.
3. Membership gate: a studentProfileId not in group.studentIds (or not in class) -> 400, nothing written.
4. Lesson gate: unapproved / non-candidate / cross-cluster lesson -> rejected, nothing written.
5. Idempotent: re-run updates dueDate only; existing status/responses/mastery untouched (proven).
6. profileId->userId mapping correct; profile with no user -> 400.
7. Auth/status: 400 / 401 / 403 (non-teacher + not-owner) / 404 (class/form) / 409 (stale group, stale/invalid lesson) / 200; Cache-Control no-store.
8. assembleBridgeLessons: DB x seed join correct; ambiguous join -> STOP/audit error (not a guess); unmatched DB row handled, not crashed.
9. All-or-nothing: a partial failure rolls back ALL writes (transaction).
10. Duplicate studentProfileIds -> 400.
11. Due date stored UTC-noon; response returns original YYYY-MM-DD; no off-by-one drift.
12. No scoring/report/engine/bridge/UI/content change; reuses StudentLessonProgress (no new model); the report loader is a shared helper (no route-from-route import).
13. Tests synthetic-only; route tests only if an existing authed-route test pattern exists, else manual/source proof.

RUN: npx prisma validate; npx tsc --noEmit; the new tests; PSSA suite if relevant; confirm the migration is the ONLY schema delta.

STOP and report if: the spec is missing; reviewStatus approval semantics are unclear; the grade+skill join is ambiguous; the WS2-R1 loader can't be cleanly reused/extracted; any scoring/engine/bridge/report/UI/content change appears necessary.

STOP REPORT: branch + commit SHA; files changed (migration + route + helper + shared loader + tests + spec only); the additive migration SQL + prisma validate; happy-path upsert proof (selected userIds only, dueDate set, created/updated); membership-gate proof (out-of-group rejected, no writes); lesson-gate proof (unapproved/non-candidate/cross-cluster rejected); idempotency proof (progress preserved, only dueDate updated); all-or-nothing rollback proof; profileId->userId proof; UTC-noon date proof; auth/status-code proof (incl. 409s); assembleBridgeLessons join + ambiguity-stop proof; loader-extraction-not-route-import proof; tsc + prisma validate + PSSA suite results; synthetic-only confirmation.
When Codex returns the stop report, paste it and I'll audit at source — the two gates (membership + lesson), transaction rollback, idempotent-only-dueDate, UTC-noon dates, the join-ambiguity stop, and the loader extraction — plus run the assembleBridgeLessons test independently.