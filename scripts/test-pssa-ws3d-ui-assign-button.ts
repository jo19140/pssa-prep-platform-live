import assert from "node:assert/strict";
import fs from "node:fs";

const suggestionsRoute = fs.readFileSync("app/api/teacher/pssa/lesson-suggestions/route.ts", "utf8");
const client = fs.readFileSync("components/pssa/TeacherPssaInsightsClient.tsx", "utf8");
const panel = fs.readFileSync("components/pssa/TeacherPssaInsightsPanel.tsx", "utf8");

assert.match(suggestionsRoute, /loadPssaClassReportForTeacher/, "suggestions route must reuse shared report loader");
assert.match(suggestionsRoute, /assembleBridgeLessons/, "suggestions route must reuse bridge lesson assembly");
assert.match(suggestionsRoute, /suggestLessonsForReport\(loaded\.report, bridgeLessons\)/, "suggestions route must use bridge default maxPerGroup");
assert.equal(/class-report\/route|assign-recommended-lesson\/route/.test(suggestionsRoute), false, "suggestions route must not import another route handler");
assert.equal(/maxPerGroup/.test(suggestionsRoute), false, "suggestions route must not hard-code a separate maxPerGroup");
assert.match(suggestionsRoute, /pssaNoStoreHeaders/, "suggestions route must be no-store");
assert.match(suggestionsRoute, /where: \{ reviewStatus: "APPROVED" \}/, "suggestions route must only read approved lessons");
assert.equal(/studentLessonProgress|upsert|create\(|update\(|delete\(/.test(suggestionsRoute), false, "suggestions route must be read-only");

assert.match(client, /fetch\(`\/api\/teacher\/pssa\/class-report/, "client must fetch the report");
assert.match(client, /fetch\(`\/api\/teacher\/pssa\/lesson-suggestions/, "client must fetch lesson suggestions");
assert.match(client, /fetch\("\/api\/teacher\/pssa\/assign-recommended-lesson"/, "client must POST assignment");
assert.match(client, /studentProfileIds: request\.studentProfileIds/, "client must POST group studentProfileIds");
assert.match(client, /This report changed — refresh and try again\./, "client must show stale-report message for 409");
assert.match(client, /Assigned to \$\{results\.length\} students/, "client must summarize created/updated assignment result");
assert.equal(/console\.log|localStorage|sessionStorage/.test(client), false, "client must not log or persist report/suggestion JSON");

assert.equal(/fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(panel), false, "panel must not own network calls");
assert.match(panel, /onAssign\(\{/, "panel must call onAssign");
assert.match(panel, /studentProfileIds: group\.studentIds/, "panel must pass whole group studentProfileIds");
assert.match(panel, /No eligible lesson yet/, "panel must disable no-candidate groups");
assert.match(panel, /Lesson suggestions unavailable — refresh and try again\./, "panel must degrade gracefully when suggestions fail");
assert.match(panel, /Recommended:/, "panel must display recommended lesson title");
assert.equal(/auditWarnings|console\.log|localStorage|sessionStorage/.test(panel), false, "panel must not expose raw audit warnings or persist data");

console.log("PSSA WS3-D UI assign-button source guards passed: helper reuse, maxPerGroup parity, client-owned network, presentational panel, no-store/privacy.");
