import assert from "assert/strict";
import { PHASE_4_RCONTROLLED_TARGETS } from "../lib/content/phase3EntrySeed";
import { phase3EntryLessonContentFor, type LessonContentByDailyTarget } from "../lib/content/phase3EntryLessonContent";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { assertPhase4LessonContentHasFullAuditPassage, generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { auditPassage } from "../lib/literacy/passageAudit";
import { wordMatchesPattern } from "../lib/literacy/passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";

const BARE_R_CODES = new Set(["ar", "or", "er", "ir", "ur"]);

async function main() {
  const results: Array<{ target: string; status: "PASS" }> = [];
  assertBareRCodeGate();
  assertPhase4LessonContentHasFullAuditPassage("r_controlled_ar", 4, phase3EntryLessonContentFor("r_controlled_ar"));

  for (const target of PHASE_4_RCONTROLLED_TARGETS) {
    assertNoBareRCodes(target);
    const patterns = targetPatternsFor(target);
    const pseudowordPatterns = pseudowordPatternsFor(target, patterns);
    assert(pseudowordPatterns.every((pattern) => patterns.includes(pattern)), `${target.code} pseudowordPatterns must be a subset of patterns`);
    assert.equal(target.exampleNonwords.length, 8, `${target.code} must ship 8 nonwords`);
    for (const word of target.exampleNonwords) {
      const selected = selectPseudowordPattern(word, pseudowordPatterns);
      assert(selected, `${word} should detect to ${pseudowordPatterns.join(", ")}`);
      const validation = validatePseudowordCandidate(word, selected, { strictLexicon: true });
      assert.equal(validation.valid, true, `${word} should validate for ${selected}: ${validation.reason ?? validation.issues.join("; ")}`);
    }

    const ctx = lessonContext(target.code);
    const draft = await generateLessonDraft(ctx, {
      recordDecision: async (_ctx, fn) => (await fn()).output,
    });
    const audit = auditGeneratedLessonDraft(draft);
    assert.equal(audit.canPersist, true, `${target.code}: ${audit.blockers.join("\n")}`);
    assert.equal(namedRAdmissionCheck(draft).result, "PASS", `${target.code} named r-controlled admission gate should pass`);
    assert.equal(audit.checks.find((entry) => entry.ruleId === "LESSON_TARGET_PATTERN_COVERAGE")?.result ?? "PASS", "PASS");
    assert.equal(part7PassageText(draft), phase3EntryLessonContentFor(target.code).fullAuditPassageText, `${target.code} should render the full audit passage in Part 7`);
    assertFullPassageAudit(target.code);
    assertMockPassageIsClassifiedQualityFixture(target.code);
    assertFullPassageStyleConstraints(target.code, phase3EntryLessonContentFor(target.code), patterns);
    assertRControlledTokensMatchDeclaredTargets(target.code, phase3EntryLessonContentFor(target.code), patterns);
    results.push({ target: target.code, status: "PASS" });
  }

  const arDraft = await generatedDraft("r_controlled_ar");
  const orDraft = await generatedDraft("r_controlled_or");
  const erIrUrDraft = await generatedDraft("r_controlled_er_ir_ur");

  assertLegacyGateAdmitsRControlledPseudowords(arDraft);
  assertInjectedRFamilyFails(arDraft, "horn", /Part 5 horn/);
  assertInjectedRFamilyFails(arDraft, "her", /Part 5 her/);
  assertInjectedRFamilyFails(orDraft, "car", /Part 5 car/);
  assertInjectedRFamilyFails(orDraft, "turn", /Part 5 turn/);
  assertInjectedRFamilyFails(erIrUrDraft, "car", /Part 5 car/);
  assertInjectedRFamilyFails(erIrUrDraft, "horn", /Part 5 horn/);
  assertPart2Scoping(arDraft, erIrUrDraft);
  assertCrossFamilyContaminationFails();

  console.log("content-v3 Phase 4 R-Controlled Entry checks passed");
  console.log("target | status");
  console.log("--- | ---");
  for (const result of results) {
    console.log(`${result.target} | ${result.status}`);
  }
  console.log("adversarial | expected failure");
  console.log("--- | ---");
  console.log("bare r codes | PASS");
  console.log("wrong r family in Part 5 | PASS");
  console.log("legacy gate admits r pseudowords | PASS");
  console.log("Part 2 non-target r pair/base | PASS");
  console.log("er/ir/ur passage contaminated with car | PASS");
}

async function generatedDraft(targetCode: string) {
  return generateLessonDraft(lessonContext(targetCode), {
    recordDecision: async (_ctx, fn) => (await fn()).output,
  });
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = PHASE_4_RCONTROLLED_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing Phase 4 R-Controlled target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = { id: "phase-4-rcontrolled", phaseNumber: 4, label: "Phase 4 R-Controlled Entry" };
  const dailyTarget = {
    id: `target-${targetCode}`,
    ...seedTarget,
    targetPatternsJson: seedTarget.targetPatternsJson as any,
  };
  const targetPatterns = targetPatternsFor(seedTarget);
  const pseudowordPatterns = pseudowordPatternsFor(seedTarget, targetPatterns);
  const heartWordsPreviewedThisLesson = content.heartWordsPreviewedThisLesson;
  const heartWordsAssumedKnown = content.heartWordsAssumedKnown;
  const vocabularyWords = content.vocabulary;
  assert(content.fullAuditPassageText, `${targetCode} needs a full audit passage.`);
  const selectedPassageAudit = auditPassage(content.fullAuditPassageText, {
    phasePosition,
    dailyTarget,
    heartWords: [...heartWordsPreviewedThisLesson, ...heartWordsAssumedKnown],
    vocabularyAllowlist: vocabularyWords,
  });
  return {
    phasePosition,
    dailyTarget,
    targetPattern: dailyTarget.code,
    targetPatterns,
    pseudowordPatterns,
    targetWords: dailyTarget.exampleWords.slice(0, 5),
    reviewWords: [],
    pseudowords: dailyTarget.exampleNonwords,
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage: { id: `passage-${targetCode}`, text: content.fullAuditPassageText, contentAuditJson: selectedPassageAudit, decodabilityScore: selectedPassageAudit.decodabilityScore },
    selectedPassageAudit,
  };
}

function assertNoBareRCodes(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const values = metadataCodes(seedTarget);
  const bare = values.filter((value) => BARE_R_CODES.has(value));
  assert.equal(bare.length, 0, `${seedTarget.code} must use registry codes, not bare r codes: ${bare.join(", ")}`);
}

function assertBareRCodeGate() {
  const invalid = {
    code: "invalid_r",
    targetPatternsJson: { patterns: ["ar"], pseudowordPatterns: ["r_ar"], graphemes: ["ar"] },
  };
  assert.throws(() => assertNoBareRCodes(invalid), /registry codes/);
}

function metadataCodes(seedTarget: { targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const values: string[] = [];
  for (const key of ["patterns", "pseudowordPatterns"] as const) {
    const entries = (json as Record<string, unknown>)[key];
    if (Array.isArray(entries)) values.push(...entries.filter((entry): entry is string => typeof entry === "string"));
  }
  return values;
}

function assertLegacyGateAdmitsRControlledPseudowords(draft: GeneratedLessonDraft) {
  const checks = auditGeneratedLessonDraft(draft).checks.filter((entry) => entry.ruleId === "LESSON_PHASE3_NO_RCONTROLLED");
  assert(checks.length > 0, "Expected legacy r-controlled gate checks");
  assert(
    checks.every((entry) => entry.result === "PASS"),
    `R-controlled pseudowords should not trip legacy gate: ${checks.filter((entry) => entry.result === "FAIL").map((entry) => entry.evidence).join("; ")}`,
  );
}

function assertInjectedRFamilyFails(draft: GeneratedLessonDraft, word: string, evidencePattern: RegExp) {
  const mutated = mutatePart5(draft, `${word} was in the path.`);
  const check = namedRAdmissionCheck(mutated);
  assert.equal(check.result, "FAIL", `${word} should fail target-scoped r admission`);
  assert.match(check.evidence ?? "", evidencePattern);
}

function assertPart2Scoping(arDraft: GeneratedLessonDraft, erIrUrDraft: GeneratedLessonDraft) {
  assert.equal(namedRAdmissionCheck(replacePart2Pairs(arDraft, [{ closed: "got", target: "corn" }])).result, "FAIL");
  assert.equal(namedRAdmissionCheck(replacePart2Pairs(erIrUrDraft, [{ closed: "cat", target: "cart" }])).result, "FAIL");
  assert.equal(namedRAdmissionCheck(replacePart2Pairs(arDraft, [{ closed: "car", target: "cart" }])).result, "FAIL");
}

function assertCrossFamilyContaminationFails() {
  const targetCode = "r_controlled_er_ir_ur";
  const ctx = lessonContext(targetCode);
  const content = phase3EntryLessonContentFor(targetCode);
  const contaminated = auditPassage(`${content.fullAuditPassageText} The car is far.`, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  const blockedWords = contaminated.blockedPatternViolations.map((entry) => entry.word.toLowerCase());
  assert(blockedWords.includes("car"), "er/ir/ur contaminated passage should block car/r_ar");
}

function assertFullPassageAudit(targetCode: string) {
  const content = phase3EntryLessonContentFor(targetCode);
  const ctx = lessonContext(targetCode);
  const fullAudit = auditPassage(content.fullAuditPassageText!, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  assert.equal(fullAudit.passesAuditGate, true, `${targetCode} full audit passage should pass production gate: ${JSON.stringify(fullAudit, null, 2)}`);
  assert.equal(fullAudit.quality.passesQualityGate, true, `${targetCode} full audit passage should pass quality gate`);
}

function assertMockPassageIsClassifiedQualityFixture(targetCode: string) {
  const content = phase3EntryLessonContentFor(targetCode);
  const ctx = lessonContext(targetCode);
  const mockAudit = auditPassage(content.mockPassageText, {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...content.heartWordsPreviewedThisLesson, ...content.heartWordsAssumedKnown],
    vocabularyAllowlist: content.vocabulary,
  });
  assert.equal(mockAudit.unclassifiedWords.length, 0, `${targetCode} mock passage should classify all words`);
  assert.equal(mockAudit.blockedPatternViolations.length, 0, `${targetCode} mock passage should have no blocked patterns`);
  assert.equal(mockAudit.quality.passesQualityGate, true, `${targetCode} mock passage should pass quality gate`);
}

function assertFullPassageStyleConstraints(targetCode: string, content: LessonContentByDailyTarget, patterns: string[]) {
  const values = [
    content.fullAuditPassageText || "",
    ...content.sentences,
    ...content.dictatedSentences,
  ];
  const banned = new Set(["we", "he", "she", "me", "be", "go", "so", "by", "my", "no"]);
  for (const value of values) {
    for (const token of value.toLowerCase().match(/[a-z]+/g) ?? []) {
      assert.equal(banned.has(token), false, `${targetCode} should avoid banned open-syllable function word ${token}`);
      const stem = token.replace(/(?:s|es|ed|ing)$/i, "");
      if (stem !== token) {
        const candidates = detectPatternCandidates(stem);
        assert.equal(candidates.some((pattern) => patterns.includes(pattern)), false, `${targetCode} should avoid target-pattern inflection ${token}`);
      }
    }
  }
}

function assertRControlledTokensMatchDeclaredTargets(targetCode: string, content: LessonContentByDailyTarget, patterns: string[]) {
  const text = content.fullAuditPassageText ?? "";
  for (const token of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (!/[aeiou]r/.test(token) && token !== "are" && token !== "for" && token !== "here") continue;
    assert(
      patterns.some((pattern) => wordMatchesPattern(token, pattern, { strictPhonemeLexicon: true })),
      `${targetCode} r-controlled token ${token} should phoneme-match a declared target`,
    );
  }
}

function namedRAdmissionCheck(draft: GeneratedLessonDraft) {
  const found = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === "LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET");
  assert(found, "Missing LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET check");
  return found;
}

function mutatePart5(draft: GeneratedLessonDraft, extraSentence: string): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 5
        ? { ...part, contentJson: { ...part.contentJson, sentences: [...strings(part.contentJson.sentences), extraSentence] } }
        : part,
    ),
  };
}

function replacePart2Pairs(draft: GeneratedLessonDraft, demonstrationPairs: Array<{ closed: string; target: string }>): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) =>
      part.partNumber === 2
        ? { ...part, contentJson: { ...part.contentJson, demonstrationPairs } }
        : part,
    ),
  };
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function targetPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }) {
  const json = seedTarget.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return [seedTarget.code];
}

function pseudowordPatternsFor(seedTarget: { code: string; targetPatternsJson: unknown }, fallback: string[]) {
  const json = seedTarget.targetPatternsJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const patterns = (json as { pseudowordPatterns?: unknown }).pseudowordPatterns;
    if (Array.isArray(patterns) && patterns.every((entry) => typeof entry === "string")) return patterns as string[];
  }
  return fallback;
}

function selectPseudowordPattern(word: string, orderedPatterns: string[]) {
  const candidates = detectPatternCandidates(word);
  return orderedPatterns.find((pattern) => candidates.includes(pattern)) ?? null;
}

function part7PassageText(draft: GeneratedLessonDraft) {
  const part7 = draft.parts.find((part) => part.partNumber === 7);
  return typeof part7?.contentJson.passageText === "string" ? part7.contentJson.passageText : "";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
