import assert from "node:assert/strict";
import { defaultRetention, DEFAULT_RETENTION_TIER, SERVICE_RETENTION_DAYS } from "../lib/voice/retention";
import { recommendNextLiteracyMove } from "../lib/literacy/autopilot";

const startedAt = new Date("2026-01-01T12:00:00.000Z");
const retention = defaultRetention(startedAt);
assert.equal(retention.retentionTier, DEFAULT_RETENTION_TIER);
assert.equal(retention.retentionTier, "SERVICE");
assert.equal(retention.deleteAfterDate.toISOString(), "2026-04-01T12:00:00.000Z");
assert.equal(
  retention.deleteAfterDate.getTime() - startedAt.getTime(),
  SERVICE_RETENTION_DAYS * 24 * 60 * 60 * 1000
);

const intervention = recommendNextLiteracyMove({
  strandScores: [{ strand: "DECODING", score: 32, level: "NOT_YET", priorityRank: 1 }],
});
assert.equal(intervention.decisionType, "INTERVENTION");
assert.match(intervention.summary, /decoding/);

const promotion = recommendNextLiteracyMove({
  strandScores: [
    { strand: "DECODING", score: 91, level: "MASTERED", priorityRank: 1 },
    { strand: "FLUENCY", score: 88, level: "MASTERED", priorityRank: 2 },
  ],
});
assert.equal(promotion.decisionType, "PROMOTION");

const progressCheck = recommendNextLiteracyMove({ strandScores: [] });
assert.equal(progressCheck.decisionType, "PROGRESS_CHECK");

console.log("reading-buddy-v1 checks passed");
