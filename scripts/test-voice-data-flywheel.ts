import assert from "node:assert/strict";
import fs from "node:fs";
import { computeUncertaintyScore, wordErrorDistance } from "../lib/voice/uncertainty";
import { isMiscueType } from "../lib/voice/miscueTypes";
import { DEFAULT_SERVICE_RETENTION_DAYS } from "../lib/voice/consent";
import { addDays } from "../lib/voice/retention";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.match(schema, /model VoiceConsent[\s\S]*serviceAudioRetained\s+Boolean\s+@default\(true\)/);
assert.match(schema, /model VoiceConsent[\s\S]*trainingCorpusOptedIn\s+Boolean\s+@default\(false\)/);
assert.match(schema, /model VoiceConsent[\s\S]*researchPublicationOptedIn\s+Boolean\s+@default\(false\)/);
assert.match(schema, /model VoiceSession[\s\S]*audioDeletedAt\s+DateTime\?/);
assert.match(schema, /model VoiceAudioDeletionLog/);
assert.doesNotMatch(schema, /race|ethnicity|socioeconomic/i);

assert.equal(DEFAULT_SERVICE_RETENTION_DAYS, 90);
assert.equal(addDays(new Date("2026-01-01T00:00:00Z"), 90).toISOString(), "2026-04-01T00:00:00.000Z");
assert.equal(isMiscueType("EXPECTED_DIALECT_TRANSFER"), true);
assert.equal(isMiscueType("MADE_UP_TAG"), false);
assert.equal(wordErrorDistance("the cat sat", "the cat sat"), 0);
assert.ok(wordErrorDistance("the cat", "the dog") > 0);
assert.ok(computeUncertaintyScore({ asrConfidenceMean: 0.2, expectedText: "the cat sat", asrTranscript: "the dog" }) > 0.5);
assert.ok(computeUncertaintyScore({ asrConfidenceMean: 0.98, expectedText: "the cat sat", asrTranscript: "the cat sat" }) < 0.1);

console.log("voice-data-flywheel checks passed");
