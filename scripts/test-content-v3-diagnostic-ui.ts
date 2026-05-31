import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { validateDiagnosticNextResponse } from "../lib/literacy/diagnosticItemDTO";
import { audioProblemPayload, noAttemptPayload, responsePayload } from "../components/literacy/diagnostic/utils";
import { lintFile } from "./content/lint-diagnostic-ui-copy";

const fixtureDir = path.join(process.cwd(), "scripts/test-fixtures/diagnostic");
for (const file of fs.readdirSync(fixtureDir).filter((entry) => entry.endsWith(".json"))) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, file), "utf8"));
  assert.equal(validateDiagnosticNextResponse({ sessionId: "fixture-session", nextItem: fixture }).nextItem?.id, fixture.id);
}

const safeResponse = {
  sessionId: "session-1",
  nextItem: {
    id: "item-1",
    strand: "DECODING",
    itemType: "REAL_WORD_DECODE",
    studentPromptJson: { kidPrompt: "Read this word out loud.", displayText: "bike" },
    displayMode: "TEXT_CARD_ONE_WORD",
    responseMode: "speech_response",
    isPracticeItem: false,
  },
};
assert.equal(validateDiagnosticNextResponse(safeResponse).nextItem?.id, "item-1");

assert.throws(() =>
  validateDiagnosticNextResponse({
    ...safeResponse,
    nextItem: {
      ...safeResponse.nextItem,
      expectedResponseJson: { canonical: "bike" },
    },
  }),
);

const now = Date.now();
const originalDateNow = Date.now;
(Date as any).now = () => now + 1234;
assert.deepEqual(noAttemptPayload({ itemId: "item-1", startedAt: now }), {
  itemId: "item-1",
  attemptType: "no_attempt",
  responseJson: { attemptType: "no_attempt", transcript: null, choice: null },
  responseTimeMs: 1234,
  latency_ms: 1234,
  silenceDurationMs: 10000,
  reason: "frontend_silence_timeout",
});
assert.deepEqual(audioProblemPayload({ itemId: "item-1", startedAt: now, clientIssue: "could_not_hear" }), {
  itemId: "item-1",
  attemptType: "audio_problem",
  responseJson: { attemptType: "audio_problem", transcript: null, choice: null, clientIssue: "could_not_hear" },
  responseTimeMs: 1234,
  latency_ms: 1234,
  clientIssue: "could_not_hear",
  audioConfidence: 0,
});
assert.deepEqual(responsePayload({ itemId: "item-1", startedAt: now, responseJson: { selectedChoice: "very large" } }), {
  itemId: "item-1",
  attemptType: "response",
  responseJson: { selectedChoice: "very large" },
  responseTimeMs: 1234,
  latency_ms: 1234,
  audioConfidence: undefined,
});
(Date as any).now = originalDateNow;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diagnostic-ui-lint-"));
const positive = path.join(tmp, "Positive.tsx");
const negative = path.join(tmp, "Negative.tsx");
fs.writeFileSync(positive, `export function Positive(){ return <p>Phase 3: /s/ has 4 of 10 seconds left. Correct answer!</p>; }`);
fs.writeFileSync(
  negative,
  `import thing from "/api/voice/tts";\n// Phase 3 /s/\nconst obj = { label: "/admin/content", key: "3 of 10" };\nexport function Negative(){ return <button aria-label="Start talking">Go</button>; }`,
);
assert(lintFile(positive).length >= 4);
assert.equal(lintFile(negative).length, 0);

const currentEndpointSource = fs.readFileSync(path.join(process.cwd(), "app/api/literacy/diagnostic/current/route.ts"), "utf8");
assert(!currentEndpointSource.includes(".create("));
assert(!currentEndpointSource.includes(".update("));
assert(currentEndpointSource.includes("selectNextStudentItem"));

const completeEndpointSource = fs.readFileSync(path.join(process.cwd(), "app/api/literacy/diagnostic/[sessionId]/complete/route.ts"), "utf8");
assert(completeEndpointSource.indexOf("if (session.completedAt)") < completeEndpointSource.indexOf("const attempts"));

console.log("Content v3 diagnostic UI DTO, payload, and copy lint fixtures pass.");
