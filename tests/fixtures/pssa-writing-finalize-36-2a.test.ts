import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260623120000_pssa_writing_finalize_backend/migration.sql");
const service = read("lib/teacher/diagnosticWritingFinalize.ts");
const route = read("app/api/teacher/grading-cases/[caseId]/finalize/route.ts");
const dto = read("lib/teacher/gradingCaseDto.ts");
const dtoCore = read("lib/teacher/gradingCaseDtoCore.ts");
const studentDto = read("lib/content/pssaStudentDto.ts");

assert.match(schema, /conditionCode\s+PssaWritingNonScorableReason\?/, "response conditionCode must be additive and nullable");
assert.match(schema, /model PssaWritingFinalizeReceipt[\s\S]*idempotencyKey\s+String\s+@unique/, "receipt table must have unique idempotencyKey");
assert.match(schema, /model PssaWritingFinalizeReceipt[\s\S]*requestHash\s+String[\s\S]*evaluationId\s+String[\s\S]*teacherUserId\s+String[\s\S]*resultAttemptId\s+String\?/, "receipt table must store request hash, eval, teacher, result attempt");
assert.match(migration, /ALTER TABLE "PssaFormResponse"[\s\S]*ADD COLUMN "conditionCode" "PssaWritingNonScorableReason"/, "migration must add conditionCode only additively");
assert.match(migration, /CREATE TABLE "PssaWritingFinalizeReceipt"/, "migration must add receipt table");
assert.doesNotMatch(migration, /\bDROP\b|ALTER TYPE "PssaFormResponseScoreStatus"/, "migration must not be destructive or alter score status enum");

assert.match(route, /requireUser\(\["TEACHER"\]\)/, "finalize route must be teacher-only");
assert.match(route, /Cache-Control", "no-store"/, "finalize route must be no-store");
assert.match(route, /idempotencyKey: z\.string\(\)/, "route must accept idempotency key");
assert.match(route, /decisionSchema/, "route must validate discriminated SCORE/NON_SCORABLE decisions");

assert.match(service, /Serializable/, "finalize transaction must use serializable isolation");
assert.match(service, /FOR UPDATE/g, "finalize path must lock rows");
assert.match(service, /preparePssaWritingEvaluationForResponse\(tx, input\.responseId\)/, "no-eval case must ensure/create evaluation through #36-1 path");
assert.match(service, /resolveWritingSnapshot\(loaded\)/, "concurrency/input hash must reuse #36-1 snapshot resolver");
assert.match(service, /buildWritingInputState\(loaded, snapshot\)/, "inputHash must reuse #36-1 builder");
assert.match(service, /expectedConcurrencyToken !== actualToken[\s\S]*stale_grading_case/, "fresh stale token must 409");
assert.match(service, /existingReceipt[\s\S]*idempotency_key_reuse[\s\S]*return finalizeResult\("idempotent"/, "same UUID must return existing result or reject changed payload");
assert.match(service, /matchingFinalReceipt[\s\S]*return finalizeResult\("noop"/, "fresh UUID identical to current final must receipt-only no-op");
assert.match(service, /override_reason_required/, "changed final decision must require override reason");
assert.match(service, /const kind = evaluation\.currentFinalAttemptId \? "TEACHER_OVERRIDE" : "TEACHER_FINAL"/, "teacher attempts must distinguish final vs override");
assert.match(service, /scorerVersion: TEACHER_SCORER_VERSION[\s\S]*promptKey: TEACHER_PROMPT_KEY[\s\S]*modelId: null/, "teacher attempt provenance must be honest");
assert.match(service, /scoreStatus: "scored" as const, conditionCode: null/, "SCORE must set scored and clear condition code");
assert.match(service, /pointsEarned: 0, scoreStatus: "scored" as const, conditionCode: decision\.reason/, "NON_SCORABLE must be operational zero with condition code");
assert.match(service, /short_answer[\s\S]*loaded\.maxPoints !== 3|loaded\.maxPoints !== 3[\s\S]*unsupported_score_mapping/i, "short answer must fail closed on maxPoints mismatch");
assert.match(service, /TDA[\s\S]*loaded\.maxPoints !== 4|loaded\.maxPoints !== 4[\s\S]*unsupported_score_mapping/, "TDA must fail closed on maxPoints mismatch");
assert.match(service, /OTHER[\s\S]*other_requires_teacher_note/, "OTHER non-scorable must require teacher note");
assert.match(service, /validateInstructionalProfile/, "matching draft profile must be validated before official carry-forward");
assert.match(service, /summarizePssaResponseBuckets/, "service must reuse bucket summary for derivation proof");
assert.doesNotMatch(service, /pssaFormSession\.update|pendingHumanPoints:\s*|earnedPoints:\s*summary|totalPoints:\s*summary/, "finalize must not write persisted session totals");
assert.doesNotMatch(service, /gradeRecord|learningAssignment/i, "diagnostic finalize must not write gradebook/assignment tables");
assert.doesNotMatch(service, /scoreStatus:\s*"invalid_response"/, "student-content non-scorable must not use invalid_response");

assert.match(dtoCore, /concurrencyToken: string/, "grading case DTO must expose opaque concurrencyToken");
assert.match(dto, /computeDiagnosticWritingConcurrencyToken/, "loader must compute content-sensitive concurrency token");
assert.doesNotMatch(dtoCore, /currentInputHash:\s*input|currentInputHash,/, "DTO must not expose raw currentInputHash");
assert.match(dtoCore, /"currentInputHash"/, "banned-key scan must still reject currentInputHash");
assert.doesNotMatch(studentDto, /PssaWritingEvaluation|currentFinalAttempt|conditionCode|teacher-review-v1/, "student item DTO must not expose writing finalize data");

console.log("PSSA writing finalize #36-2a checks passed");
