import assert from "assert/strict";
import path from "node:path";
import { PHASE_3_TARGETS } from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { deterministicLessonPartRunner } from "../lib/literacy/lessonGenerator";
import { auditPassage } from "../lib/literacy/passageAudit";
import { wordMatchesPattern } from "../lib/literacy/passageClassifier";
import { __setCmudictPhonemePathForTest } from "../lib/literacy/cmudictPhonemes";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";

async function main() {
  assertTeamMatching();
  assertStrictPhonemeLexiconBehavior();
  assertLegacyPhase3PatternBehavior();
  assertPseudowordCandidateDetection();
  await assertPhaseAwareRControlledGate();
  console.log("content-v3 Phase 4 phonics engine foundation checks passed");
}

function assertTeamMatching() {
  for (const word of ["rain", "wait", "mail"]) assert.equal(wordMatchesPattern(word, "team_ai", { strictPhonemeLexicon: true }), true, `${word} should match team_ai`);
  assert.equal(wordMatchesPattern("feet", "team_ee", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("seat", "team_ea", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("boat", "team_oa", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("high", "team_igh", { strictPhonemeLexicon: true }), true);

  for (const word of ["said", "again", "captain", "plaid"]) assert.equal(wordMatchesPattern(word, "team_ai", { strictPhonemeLexicon: true }), false, `${word} is an ai exception`);
  for (const word of ["bread", "head", "dead"]) assert.equal(wordMatchesPattern(word, "team_ea", { strictPhonemeLexicon: true }), false, `${word} is an ea exception`);

  assert.equal(wordMatchesPattern("moon", "team_oo_long", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("moon", "team_oo_short", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("book", "team_oo_short", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("book", "team_oo_long", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("cow", "diph_ow", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("cow", "team_ow", { strictPhonemeLexicon: true }), false);
  assert.equal(wordMatchesPattern("snow", "team_ow", { strictPhonemeLexicon: true }), true);
  assert.equal(wordMatchesPattern("snow", "diph_ow", { strictPhonemeLexicon: true }), false);
}

function assertStrictPhonemeLexiconBehavior() {
  __setCmudictPhonemePathForTest(path.resolve("/private/tmp/definitely-missing-cmudict.json"));
  assert.equal(wordMatchesPattern("rain", "team_ai"), false, "app default should degrade to false when CMUdict is unavailable");
  assert.throws(() => wordMatchesPattern("rain", "team_ai", { strictPhonemeLexicon: true }), /CMUDICT_PHONEME_LEXICON_UNAVAILABLE/);
  assert.equal(wordMatchesPattern("cake", "a_e"), true, "Phase 3 VCe matching is unaffected by missing CMUdict");
  __setCmudictPhonemePathForTest(null);
}

function assertLegacyPhase3PatternBehavior() {
  const fixtureWords = ["said", "again", "captain", "plaid", "rain", "boat", "snow", "cow", "feet", "seat", "high", "pie", "toe", "blue", "new"];
  const blockedCodes = Array.from(new Set(PHASE_3_TARGETS.flatMap((target) => target.blockedPatternCodes)));
  for (const code of blockedCodes) {
    for (const word of fixtureWords) {
      assert.equal(wordMatchesPattern(word, code), legacySnapshotMatch(word, code), `Legacy ${code} behavior changed for ${word}`);
    }
  }
  assert.equal(wordMatchesPattern("said", "ai"), true, "legacy ai remains substring-based for Phase 3 blockers");
  assert.equal(wordMatchesPattern("said", "team_ai", { strictPhonemeLexicon: true }), false, "Phase 4 target ai is phoneme-keyed");
}

function assertPseudowordCandidateDetection() {
  assert.deepEqual(detectPatternCandidates("zow").filter((code) => code === "team_ow" || code === "diph_ow").sort(), ["diph_ow", "team_ow"]);
  assert.deepEqual(detectPatternCandidates("zoop").filter((code) => code === "team_oo_long" || code === "team_oo_short").sort(), ["team_oo_long", "team_oo_short"]);
  assert.equal(validatePseudowordCandidate("zow", "team_ow").valid, true);
  assert.equal(validatePseudowordCandidate("zow", "diph_ow").valid, true);
  assert.equal(validatePseudowordCandidate("zake", "a_e", { strictLexicon: true }).valid, true);
  assert.equal(validatePseudowordCandidate("kape", "a_e").valid, false);
  assert.equal(validatePseudowordCandidate("kape", "a_e").collidesWith, "cape");
}

async function assertPhaseAwareRControlledGate() {
  const draft = await fixtureDraft();
  const part5WithFor = replacePartContent(draft, 5, { sentences: ["The cake is a gift for a pal."] });
  assert(auditGeneratedLessonDraft(part5WithFor).checks.some((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED" && entry.result === "FAIL" && entry.evidence.includes("for")));
  assert.equal(findCheck(part5WithFor, "LESSON_PART5_NO_RCONTROLLED")?.result, "FAIL");

  const rArDraft = {
    ...replacePartContent(draft, 5, { sentences: ["Farm and car sit with her."] }),
    dailyTargetCode: "r_ar",
    targetPattern: "r_ar",
    targetPatterns: ["r_ar"],
  };
  assert(auditGeneratedLessonDraft(rArDraft).checks.some((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED" && entry.result === "FAIL" && entry.evidence.includes("her")), "off-target r-controlled words should still fail under r_ar");

  const cleanRArDraft = {
    ...replacePartContent(draft, 5, { sentences: ["Farm and car can sit on a mat."] }),
    dailyTargetCode: "r_ar",
    targetPattern: "r_ar",
    targetPatterns: ["r_ar"],
  };
  assert.equal(findCheck(cleanRArDraft, "LESSON_PART5_NO_RCONTROLLED")?.result, "PASS", "r_ar target should allow farm/car");
}

function findCheck(draft: GeneratedLessonDraft, ruleId: string) {
  return auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === ruleId);
}

function replacePartContent(draft: GeneratedLessonDraft, partNumber: number, contentJson: Record<string, unknown>): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) => (part.partNumber === partNumber ? { ...part, contentJson: { ...part.contentJson, ...contentJson } } : part)),
  };
}

async function fixtureDraft(): Promise<GeneratedLessonDraft> {
  const phasePosition = { id: "phase-3-entry", phaseNumber: 3, label: "Phase 3 Entry" };
  const dailyTarget = {
    id: "target-a-e",
    code: "a_e",
    kidVisibleLabel: "a_e words",
    tutorLabel: "a_e words",
    targetPatternsJson: { patterns: ["a_e"] },
    allowedPatternCodes: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"],
    blockedPatternCodes: ["i_e", "o_e", "u_e", "e_e", "ai", "ay", "oa", "ee"],
    exampleWords: ["cake", "make", "lake", "game", "name", "tape", "cape", "date"],
    exampleNonwords: ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"],
  };
  const passageText = "Jake made a cake. The cake sat on a plate. Jake gave a slice to Kate.";
  const selectedPassageAudit = auditPassage(passageText, {
    phasePosition,
    dailyTarget,
    heartWords: ["said", "was", "they", "I", "a", "the", "to"],
    vocabularyAllowlist: ["plan", "slice", "Jake", "Kate"],
  });
  const ctx: LessonGeneratorContext = {
    phasePosition,
    dailyTarget,
    targetPattern: "a_e",
    targetPatterns: ["a_e"],
    pseudowordPatterns: ["a_e"],
    targetWords: ["cake", "make", "lake", "game", "name", "tape", "cape", "date"],
    reviewWords: [],
    pseudowords: ["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"],
    heartWordsPreviewedThisLesson: ["said", "was", "they"],
    heartWordsAssumedKnown: ["I", "a", "the", "to"],
    vocabularyWords: ["plan"],
    selectedPassage: {
      id: "passage-a-e",
      text: passageText,
      decodabilityScore: 1,
      contentAuditJson: selectedPassageAudit,
    },
    selectedPassageAudit,
  };
  const result = await deterministicLessonPartRunner(ctx)({
    phasePositionId: ctx.phasePosition.id,
    phaseNumber: ctx.phasePosition.phaseNumber,
    phaseLabel: ctx.phasePosition.label,
    dailyTargetId: ctx.dailyTarget.id,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    targetWords: ctx.targetWords,
    pseudowords: ctx.pseudowords,
    selectedPassageId: ctx.selectedPassage?.id ?? "",
  });
  return {
    phasePositionId: ctx.phasePosition.id,
    dailyTargetId: ctx.dailyTarget.id,
    phaseBand: ctx.phasePosition.phaseNumber,
    dailyTargetCode: ctx.dailyTarget.code,
    targetPattern: ctx.targetPattern,
    targetPatterns: ctx.targetPatterns,
    pseudowordPatterns: ctx.pseudowordPatterns,
    parts: result.parts,
  };
}

function legacySnapshotMatch(word: string, patternCode: string): boolean {
  const normalized = word.toLowerCase();
  const silentE = patternCode.match(/^([aeiou])_e$/);
  if (silentE) {
    const vowel = silentE[1];
    return new RegExp(`^[a-z]*${vowel}[bcdfghjklmnpqrstvwxyz]+e$`).test(normalized);
  }
  if (/^closed_short_[aeiou]$/.test(patternCode)) {
    const vowel = patternCode.at(-1);
    return Boolean(vowel && new RegExp(`^[bcdfghjklmnpqrstvwxyz]*${vowel}[bcdfghjklmnpqrstvwxyz]+$`).test(normalized));
  }
  if (patternCode === "ai" || patternCode === "ay" || patternCode === "oa" || patternCode === "ee" || patternCode === "ea" || patternCode === "igh" || patternCode === "ow" || patternCode === "ue" || patternCode === "ew") {
    return normalized.includes(patternCode);
  }
  return false;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
