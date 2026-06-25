import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDiagnosticGradingCase, assertNoBannedGradingCaseKeys } from "../../lib/teacher/gradingCaseDtoCore";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const mock = read("specs/mockups/teacher-writing-grading-v1.html");
assert.match(mock, /#36-2b LOCKED visual contract/, "locked teacher writing grading mock must be committed");
assert.match(mock, /MOCK ONLY — does not ship/, "mock may contain the preview state bar");

const teacherPage = read("app/teacher/page.tsx");
const gradingTab = read("components/teacher/TeacherGradingTab.tsx");
const reportPanel = read("components/pssa/TeacherPssaInsightsPanel.tsx");
const reportClient = read("components/pssa/TeacherPssaInsightsClient.tsx");
const route = read("app/api/teacher/grading-cases/route.ts");
const dto = read("lib/teacher/gradingCaseDto.ts");
const dtoCore = read("lib/teacher/gradingCaseDtoCore.ts");
const finalizeRoute = read("app/api/teacher/grading-cases/[caseId]/finalize/route.ts");
const studentDto = read("lib/content/pssaStudentDto.ts");
const schema = read("prisma/schema.prisma");

assert.match(teacherPage, /import \{ TeacherGradingTab \}/, "teacher page must import grading tab");
assert.match(teacherPage, /activeTab === "grading"[\s\S]*<TeacherGradingTab \/>/, "grading tab must replace the placeholder");
assert.doesNotMatch(teacherPage, /Coming soon[\s\S]*grading|aria-disabled="true"[\s\S]*grading/, "grading nav must not be disabled");

assert.match(reportClient, /classRoomId=\{selectedClassId\}/, "reports client must pass classRoomId to the panel");
assert.match(reportPanel, /Grade writing responses -&gt;/, "reports panel must add the grading deep-link");
assert.match(reportPanel, /tab: "grading"[\s\S]*classRoomId[\s\S]*formId/, "grading link must carry tab, classRoomId, and formId");

assert.match(route, /statusScope: z\.enum\(\["actionable", "all"\]\)\.default\("actionable"\)/, "GET route must accept statusScope");
assert.match(route, /requireUser\(\["TEACHER"\]\)/, "grading-case route remains teacher-only");
assert.match(route, /Cache-Control", "no-store"/, "grading-case route remains no-store");
assert.match(dto, /statusScope\?: "actionable" \| "all"/, "loader must expose statusScope");
assert.match(dto, /scoreStatus: "pending_human_scoring"/, "actionable scope must keep pending-writing filter");
assert.match(dto, /scoreStatus: "scored"[\s\S]*writingEvaluation: \{ status: \{ in: \["FINALIZED" as const, "NON_SCORABLE" as const\]/, "all scope must add resolved writing responses");
assert.match(dto, /currentFinalAttempt: true/, "loader must include currentFinalAttempt for officialResult");
assert.match(dtoCore, /officialResult: GradingCaseResult \| null/, "DTO must replace finalScore with officialResult");
assert.doesNotMatch(dtoCore, /finalScore/, "finalScore placeholder must be removed");
assert.match(dtoCore, /officialResult:[\s\S]*currentFinalAttempt[\s\S]*reviewedAt/, "officialResult must source from currentFinalAttempt");
assert.match(dtoCore, /gapToNextLevel: null/g, "gapToNextLevel must be allow-listed but null in v1");
assert.match(dtoCore, /validateInstructionalProfile/, "official/draft instructional profile must be validated");
assert.match(dtoCore, /"currentFinalAttemptId"[\s\S]*"reviewedByUserId"[\s\S]*"modelId"/, "banned-key scan must cover final-attempt internals");

assert.match(gradingTab, /fetch\("\/api\/teacher\/classes"/, "cold-open picker must fetch teacher classes");
assert.match(gradingTab, /statusScope: showFinalized \? "all" : "actionable"/, "Show finalized must refetch all scope");
assert.match(gradingTab, /No writing responses to grade for this form\./, "empty queue copy must be present");
assert.match(gradingTab, /role="radiogroup"/, "score control must be an accessible radio group");
assert.match(gradingTab, /No AI draft yet — score manually/, "PENDING must not fabricate a score");
assert.match(gradingTab, /AI draft unavailable — score manually/, "FAILED must not fabricate a score");
assert.doesNotMatch(gradingTab, /Re-run|Preview state|MOCK ONLY/, "preview bar and re-run action must not ship");
assert.match(gradingTab, /expectedConcurrencyToken: selectedCase\.concurrencyToken/, "submit must use server DTO concurrency token");
assert.match(gradingTab, /const baseScore = isResolved \? selectedCase\.officialResult\?\.score : selectedCase\.aiDraft\?\.score/, "resolved submit fallback must prefer official result");
assert.match(gradingTab, /crypto\.randomUUID\(\)/, "submit must use client UUID idempotency key");
assert.match(gradingTab, /idempotency_key_reuse[\s\S]*Review it and submit again/, "409 reuse must map to friendly copy");
assert.match(gradingTab, /stale_grading_case[\s\S]*This response changed since you opened it — reloading/, "409 stale must refetch with friendly copy");
assert.match(gradingTab, /other_requires_teacher_note[\s\S]*Add a note for Other/, "422 Other must map inline");
assert.match(gradingTab, /setSelectedNonScorable\(null\)/, "numeric score must clear non-scorable");
assert.match(gradingTab, /setSelectedScore\(null\)/, "non-scorable must clear numeric score");

assert.match(finalizeRoute, /finalizeDiagnosticWritingCase/, "UI must consume the existing #36-2a finalize route");
assert.doesNotMatch(schema, /teacher_grading_tab_36_2b|GradingTab/, "#36-2b must not change schema");
assert.doesNotMatch(studentDto, /PssaWritingEvaluation|currentFinalAttempt|conditionCode|instructionalProfileJson|teacher-review-v1/, "student-facing DTO must not gain writing score/profile data");

const drafted = buildDiagnosticGradingCase({
  classRoomId: "class-1",
  concurrencyToken: "token-1",
  response: {
    id: "response-1",
    responsePayloadJson: { shortResponse: "The bell helped the family find the dog." },
    maxPoints: 3,
    session: { formId: "form-1", user: { name: "Ava Carter" } },
    formItem: { item: { id: "item-1", interactionType: "SHORT_ANSWER", responseSpecJson: { stem: "Why did the bell help?", instructionText: "Use evidence." } } },
    writingEvaluation: {
      status: "DRAFTED",
      currentInputHash: "hash-1",
      currentDraftAttempt: {
        inputHash: "hash-1",
        score: 2,
        rationale: "Draft rationale",
        instructionalProfileJson: [
          { areaId: "completeness", signal: "clear", observation: "Complete.", responseExcerpt: "bell helped", teachingMove: "Add one more detail." },
        ],
      },
    },
  },
});
assert.equal(drafted.aiDraft?.gapToNextLevel, null);
assert.equal(drafted.officialResult, null);
assert.doesNotThrow(() => assertNoBannedGradingCaseKeys(drafted));

const finalized = buildDiagnosticGradingCase({
  classRoomId: "class-1",
  concurrencyToken: "token-2",
  response: {
    id: "response-2",
    responsePayloadJson: { shortResponse: "The bell helped the family find the dog." },
    maxPoints: 3,
    session: { formId: "form-1", user: { name: "Marcus Rivera" } },
    formItem: { item: { id: "item-1", interactionType: "SHORT_ANSWER", responseSpecJson: { stem: "Why?", instructionText: "Use evidence." } } },
    writingEvaluation: {
      status: "FINALIZED",
      currentInputHash: "hash-2",
      currentDraftAttempt: {
        inputHash: "hash-2",
        score: 1,
        rationale: "Old AI rationale must not be official.",
        instructionalProfileJson: [
          { areaId: "completeness", signal: "needs_support", observation: "AI profile.", responseExcerpt: "bell helped", teachingMove: "AI move." },
        ],
      },
      currentFinalAttempt: {
        inputHash: "hash-2",
        score: 3,
        nonScorableReason: null,
        rationale: "Teacher official rationale.",
        instructionalProfileJson: [
          { areaId: "accuracy", signal: "clear", observation: "Teacher profile.", responseExcerpt: "family find", teachingMove: "Extend the explanation." },
        ],
        reviewedAt: new Date("2026-06-24T12:00:00.000Z"),
      },
    },
  },
});
assert.equal(finalized.officialResult?.score, 3);
assert.equal(finalized.officialResult?.rationale, "Teacher official rationale.");
assert.equal(finalized.officialResult?.gapToNextLevel, null);
assert.equal(finalized.aiDraft, null, "resolved DTO suppresses stale AI draft");
assert.doesNotThrow(() => assertNoBannedGradingCaseKeys(finalized));
assert.throws(() => assertNoBannedGradingCaseKeys({ officialResult: { reviewedByUserId: "secret" } }), /banned key reviewedByUserId/);

console.log("PSSA writing grading UI #36-2b checks passed");
