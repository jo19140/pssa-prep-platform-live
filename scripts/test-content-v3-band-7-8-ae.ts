import assert from "assert/strict";
import { buildLessonPlayerData, buildLessonPlayerDraftData } from "../components/literacy/lessonPlayerData";
import { LESSON_CONTENT_BY_DAILY_TARGET, phase3EntryLessonContentFor, type LessonContentByDailyTarget } from "../lib/content/phase3EntryLessonContent";
import { CONTENT_V3_DAILY_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { classifyPassageWords } from "../lib/literacy/passageClassifier";
import { validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";

const K3_AE_SNAPSHOT: LessonContentByDailyTarget = {
  kidRuleStatement: "When we add an e to the end of a word like cap, it makes the a say its name — and the e is silent. Watch: cap turns into cape.",
  reteachPrompt: "The e at the end is silent, and it makes the a say its name. Try again: {word}.",
  demonstrationPairs: [
    { closed: "cap", target: "cape" },
    { closed: "at", target: "ate" },
    { closed: "man", target: "mane" },
    { closed: "tap", target: "tape" },
    { closed: "hat", target: "hate" },
  ],
  contrastiveLine2: ["cap", "cape", "man", "mane", "tap", "tape", "hat", "hate"],
  contrastiveLine3: ["ran", "lake", "hand", "gave", "fast", "name", "desk"],
  sentences: [
    "Dave made a cake.",
    "The cake is a gift.",
    "Jane came to the lake.",
    "They gave Jane a wave.",
    "\"I made this cake,\" said Dave.",
    "Jane is a pal to Dave.",
  ],
  dictatedWords: ["cake", "made", "lake", "game", "ran", "hand"],
  dictatedSentences: ["Dave made a cake.", "Jane came to the lake."],
  comprehensionQuestions: [
    { question: "Why did Dave make the cake?", questionType: "inference" },
    { question: "What did Jane do when Dave gave her the cake?", questionType: "literal" },
    { question: "Tell me what happened at the lake, in your own words.", questionType: "retell" },
    { question: "What is something you would make for a pal?", questionType: "personal_connection" },
  ],
  heartWordsPreviewedThisLesson: ["said", "was", "they"],
  heartWordsAssumedKnown: ["I", "a", "the", "to"],
  vocabulary: ["gift", "pal"],
  mockPassageText: `Dave has a cake. The cake is a gift to Jane. Jane came to the lake. Dave gave Jane the cake at the gate. "I made this cake," said Dave. Jane ate the cake. "This cake is the same as that cake," said Jane. They gave a big wave. Dave and Jane had fun. The lake was the best.`,
  mockPassageTitle: "Dave's Cake",
};

const BAND_7_8_EXPECTED_REAL_WORDS = [
  "cake", "game", "make", "same", "tape",
  "cap", "cape", "man", "mane", "hat", "hate",
  "ran", "lake", "hand", "fast", "name", "desk",
];

async function main() {
  assertK3ResolverRegression();

  const playerData = await buildLessonPlayerData("a_e", { presentationProfile: "BAND_7_8" });
  assert.equal(playerData.enabled, true);
  assert.equal(playerData.presentationProfile, "BAND_7_8");
  assert.equal(playerData.title, "Jake at the Race Lesson");

  const built = await buildLessonPlayerDraftData("a_e", { presentationProfile: "BAND_7_8" });
  assert.equal(built.playerData.enabled, true);
  assert.equal(built.playerData.presentationProfile, "BAND_7_8");
  assert.equal(built.playerData.title, "Jake at the Race Lesson");
  assert(built.draft, "producer path should return a generated draft");
  assert(built.selectedPassageAudit, "producer path should return selectedPassageAudit");

  const part3 = built.playerData.parts.find((part) => part.partNumber === 3);
  assert(part3, "player data should include Part 3");
  const part3Lines = part3.contentJson.contrastiveLines as Array<{ role: string; words: string[] }>;
  console.log("BAND_7_8 produced Part 3 contrastiveLines:");
  for (const line of part3Lines) {
    console.log(`${line.role}: ${line.words.join(" ")}`);
  }
  const producedRealWords = part3Lines
    .filter((line) => line.role !== "target_pseudowords")
    .flatMap((line) => line.words);
  assert.deepEqual(producedRealWords, BAND_7_8_EXPECTED_REAL_WORDS);
  assert.equal(producedRealWords.length, 17);

  const draftAudit = auditGeneratedLessonDraft(built.draft);
  assert.equal(draftAudit.canPersist, true, draftAudit.blockers.join("\n"));
  assert.equal(draftAudit.checks.find((check) => check.ruleId === "LESSON_PART2_DEMO_MODE_VALID")?.result, "PASS");

  assert.equal(built.selectedPassageAudit.passesAuditGate, true);
  assert.equal(built.selectedPassageAudit.decodabilityScore, 1);
  assert.equal(built.selectedPassageAudit.unclassifiedCount, 0);
  assert.equal(built.selectedPassageAudit.blockedPatternViolations.length, 0);
  assert.equal(built.selectedPassageAudit.wordCount, 80);
  assert.deepEqual(built.selectedPassageAudit.quality.repeatedTrigrams, []);

  const pseudoLine = part3Lines.find((line) => line.role === "target_pseudowords");
  assert(pseudoLine, "Part 3 should include pseudowords from the seed");
  for (const word of pseudoLine.words) {
    assert.equal(validatePseudowordCandidate(word, "a_e", { strictLexicon: true }).valid, true, `${word} should stay oracle-clean`);
  }

  const part6 = built.draft.parts.find((part) => part.partNumber === 6);
  assert(part6, "draft should include Part 6");
  const dictationText = [
    ...(part6.contentJson.dictatedWords as string[]),
    ...(part6.contentJson.dictatedSentences as string[]),
  ].join(" ");
  const seed = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === "a_e");
  assert(seed, "a_e seed should exist");
  const dictation = classifyPassageWords(dictationText, {
    targetPatternCodes: ["a_e"],
    allowedPatternCodes: seed.allowedPatternCodes,
    blockedPatternCodes: seed.blockedPatternCodes,
    heartWords: ["said", "was", "they", "I", "a", "the", "to", "he"],
    vocabularyAllowlist: ["brave", "pace", "gap"],
  });
  assert.deepEqual(dictation.unclassifiedWords, []);
  assert.deepEqual(dictation.blockedPatternViolations, []);
  assert.equal(dictation.words.find((entry) => entry.word === "he")?.category, "heart");

  const k3Built = await buildLessonPlayerDraftData("a_e", { presentationProfile: "BAND_K_3" });
  assert(k3Built.draft, "K-3 producer path should return a draft");
  assert.equal(auditGeneratedLessonDraft(k3Built.draft).canPersist, true);
  assert.equal(k3Built.selectedPassageAudit?.passesAuditGate, true);

  console.log("BAND_7_8 a_e producer-path checks passed");
}

function assertK3ResolverRegression() {
  const defaultContent = phase3EntryLessonContentFor("a_e");
  assert.strictEqual(defaultContent, LESSON_CONTENT_BY_DAILY_TARGET.a_e);
  assert.strictEqual(phase3EntryLessonContentFor("a_e", "BAND_K_3"), defaultContent);
  assert.strictEqual(phase3EntryLessonContentFor("a_e", "BAND_4_6"), defaultContent);
  assert.strictEqual(phase3EntryLessonContentFor("a_e", undefined), defaultContent);
  assert.deepEqual(defaultContent, K3_AE_SNAPSHOT);
  assert.deepEqual(defaultContent.heartWordsAssumedKnown, ["I", "a", "the", "to"]);
  assert.deepEqual(phase3EntryLessonContentFor("a_e", "BAND_7_8").heartWordsAssumedKnown, ["I", "a", "the", "to", "he"]);
  assert.notStrictEqual(phase3EntryLessonContentFor("a_e", "BAND_7_8").heartWordsAssumedKnown, defaultContent.heartWordsAssumedKnown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
