import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  NOT_ENOUGH_LISTENING_READING_EVIDENCE,
  buildAdditionalSupport,
  classifyPattern,
  computeConfidenceLevel,
  interpretListeningVsReading,
} from "../lib/literacy/diagnosticResultsThresholds";
import { buildDiagnosticResults } from "../lib/literacy/diagnosticResults";
import { findDiagnosticResultsCopyIssues, validateDiagnosticResultsCopy } from "../lib/literacy/validateDiagnosticResultsCopy";
import { toParentPayload, toTutorPayload } from "../lib/literacy/diagnosticResultsPayload";
import { lintResultsFile } from "./content/lint-diagnostic-results-copy";

const patternCases = [
  [2, 2, "insufficientEvidence"],
  [2, 3, "developing"],
  [1, 3, "notYetSecure"],
  [3, 4, "developing"],
  [4, 4, "secure"],
  [4, 5, "secure"],
  [3, 5, "developing"],
  [2, 5, "notYetSecure"],
] as const;
for (const [score, total, expected] of patternCases) assert.equal(classifyPattern(score, total), expected);

assert.equal(computeConfidenceLevel({ totalScoredItems: 19, usableAudioFraction: 1, strandsBelowMinimumEvidence: 0, strandsAtMinimumEvidence: 0 }), "low");
assert.equal(computeConfidenceLevel({ totalScoredItems: 35, usableAudioFraction: 0.95, strandsBelowMinimumEvidence: 1, strandsAtMinimumEvidence: 0 }), "medium");
assert.equal(computeConfidenceLevel({ totalScoredItems: 30, usableAudioFraction: 0.9, strandsBelowMinimumEvidence: 0, strandsAtMinimumEvidence: 0 }), "high");

assert.equal(interpretListeningVsReading({ listeningScore: 2, listeningTotal: 2, readingScore: 4, readingTotal: 4 }).interpretation, NOT_ENOUGH_LISTENING_READING_EVIDENCE);
assert.equal(interpretListeningVsReading({ listeningScore: 4, listeningTotal: 4, readingScore: 2, readingTotal: 4 }).gap, 50);
assert.deepEqual(
  buildAdditionalSupport({ confidence: "low", listeningVsReadingGap: 30, strandPriority: [{ strand: "PA" }, { strand: "MORPHOLOGY" }] }),
  [
    "Use the first full lesson cycle to confirm this starting point before making longer-term placement decisions.",
    "Emphasize decoding and connected-text fluency. Use the listen-first scaffold for the lesson passage on the first day.",
    "Add extra phonemic-awareness warm-up before the target instruction.",
  ],
);

const result = buildDiagnosticResults({
  diagnosticSessionId: "123e4567-e89b-12d3-a456-426614174000",
  computedAt: new Date("2026-05-31T12:00:00.000Z"),
  dailyTargets: [
    { code: "a_e", phaseLabel: "Phase 3 Entry", phaseNumber: 3, exampleWords: ["cake", "make"], introductionOrder: 1 },
    { code: "i_e", phaseLabel: "Phase 3 Entry", phaseNumber: 3, exampleWords: ["bike"], introductionOrder: 2 },
  ],
  attempts: [
    { diagnosticItemId: "a1", scored: true, correct: true, item: item("DECODING", "a1", { phaseBand: 3, targetPattern: "a_e", wordType: "real_word", responseMode: "speech_response" }) },
    { diagnosticItemId: "a2", scored: true, correct: true, item: item("DECODING", "a2", { phaseBand: 3, targetPattern: "a_e", wordType: "pseudoword", responseMode: "speech_response" }) },
    { diagnosticItemId: "a3", scored: true, correct: true, item: item("DECODING", "a3", { phaseBand: 3, targetPattern: "a_e", wordType: "real_word", responseMode: "speech_response" }) },
    { diagnosticItemId: "a4", scored: true, correct: true, item: item("DECODING", "a4", { phaseBand: 3, targetPattern: "a_e", wordType: "pseudoword", responseMode: "speech_response" }) },
    { diagnosticItemId: "i1", scored: true, correct: false, item: item("DECODING", "i1", { phaseBand: 3, targetPattern: "i_e", wordType: "real_word", responseMode: "speech_response" }) },
    { diagnosticItemId: "pa1", scored: true, correct: false, item: item("PA", "pa1", { responseMode: "speech_response" }) },
    { diagnosticItemId: "m1", scored: true, correct: true, item: item("MORPHOLOGY", "m1", { responseMode: "selected_choice" }) },
  ],
});
assert.equal(result.resultSchemaVersion, "diagnostic-results-v1");
assert(result.whyThisPlacement.secure.some((entry) => entry.patterns.includes("a_e")));
assert(result.whyThisPlacement.insufficientEvidence.some((entry) => entry.patterns.includes("i_e")));
assert.equal(result.firstLessonRecommendation.dailyTargetCode, "i_e");
assert.equal(result.firstLessonRecommendation.evidence[0]?.pattern, "i_e");
assert(!result.parentFriendlySummary.text.includes("weakness"));

const allSecure = buildDiagnosticResults({
  diagnosticSessionId: "session-all-secure",
  dailyTargets: [{ code: "a_e", phaseLabel: "Phase 3 Entry", phaseNumber: 3, exampleWords: ["cake"], introductionOrder: 1 }],
  attempts: Array.from({ length: 4 }, (_, index) => ({
    diagnosticItemId: `a${index}`,
    scored: true,
    correct: true,
    item: item("DECODING", `a${index}`, { phaseBand: 3, targetPattern: "a_e", wordType: "real_word", responseMode: "speech_response" }),
  })),
});
assert.equal(allSecure.firstLessonRecommendation.dailyTargetCode, "a_e");
assert(allSecure.firstLessonRecommendation.reasoning.includes("review and consolidation"));
assert(!allSecure.firstLessonRecommendation.reasoning.includes("Phase 4"));

const parentPayload = toParentPayload(result);
const tutorPayload = toTutorPayload(result);
assert(!("governance" in parentPayload));
assert(!("decodingEvidence" in parentPayload));
assert(!("totalScoredItems" in parentPayload.confidence));
assert("governance" in tutorPayload);
assert("decodingEvidence" in tutorPayload);

assert.throws(() => validateDiagnosticResultsCopy({ parentFriendlySummary: { text: "This is below grade level." } }));
assert.equal(findDiagnosticResultsCopyIssues({ dailyTargetCode: "a_e", phaseCode: "PHASE_3_ENTRY", id: "123e4567-e89b-12d3-a456-426614174000" }).length, 0);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diagnostic-results-lint-"));
const positive = path.join(tmp, "Positive.tsx");
const negative = path.join(tmp, "Negative.tsx");
fs.writeFileSync(positive, `export function Positive(){ return <p>This seems like below grade level work.</p>; }`);
fs.writeFileSync(negative, `import thing from "below grade level";\nconst obj = { note: "could be ignored" };\nexport function Negative(){ return <p>Priority 1 support is ready.</p>; }`);
assert(lintResultsFile(positive).length >= 2);
assert.equal(lintResultsFile(negative).length, 0);

const resultsRoute = fs.readFileSync(path.join(process.cwd(), "app/api/literacy/diagnostic/[sessionId]/results/route.ts"), "utf8");
assert(resultsRoute.includes("toParentPayload"));
assert(resultsRoute.includes("toTutorPayload"));
assert(resultsRoute.includes("return notFound()"));
assert(!resultsRoute.includes("result: session.resultJson"));

const teacherLatest = fs.readFileSync(path.join(process.cwd(), "app/api/teacher/literacy/students/[studentId]/latest-diagnostic/route.ts"), "utf8");
const parentLatest = fs.readFileSync(path.join(process.cwd(), "app/api/parent/literacy/children/[childId]/latest-diagnostic/route.ts"), "utf8");
assert(teacherLatest.includes("result: null"));
assert(parentLatest.includes("result: null"));
assert(teacherLatest.includes("toTutorPayload"));
assert(parentLatest.includes("toParentPayload"));

console.log("Content v3 diagnostic results thresholds, payload split, copy guards, and route source checks pass.");

function item(strand: string, id: string, extra: Record<string, unknown> = {}) {
  return { id, strand, itemType: `${strand}_FIXTURE`, displayMode: "FIXTURE", ...extra };
}
