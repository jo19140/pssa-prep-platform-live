import assert from "assert/strict";
import fs from "node:fs";
import { LESSON_CONTENT_BY_DAILY_TARGET, phase3EntryLessonContentFor } from "../lib/content/phase3EntryLessonContent";
import {
  CONTENT_V3_DAILY_TARGETS,
  PHASE_3_MID_TARGETS,
  PHASE_4_DIPHTHONG_TARGETS,
  PHASE_4_ENTRY_TARGETS,
  PHASE_4_MID_TARGETS,
  PHASE_4_MORPHOLOGY_TARGETS,
  PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS,
  PHASE_4_RCONTROLLED_TARGETS,
  PHASE_4_TEAMS_CLEANUP_TARGETS,
} from "../lib/content/phase3EntrySeed";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import { generateLessonDraft } from "../lib/literacy/lessonGenerator";
import { generatePart2Concept } from "../lib/literacy/lessonParts/part2Concept";
import type { LessonGeneratorContext } from "../lib/literacy/lessonParts/types";
import { decomposeInflectedWord, morphologyConfigFromTargetPatternsJson, type MorphologyAnalyzerConfig } from "../lib/literacy/morphologyAnalyzer";
import { auditPassage } from "../lib/literacy/passageAudit";
import { classifyPassageWords, type WordAuditEntry } from "../lib/literacy/passageClassifier";
import { detectPatternCandidates, validatePseudowordCandidate } from "../lib/literacy/pseudowordValidator";

const TARGET_CODE = "morph_y_to_i";

async function main() {
  const ctx = lessonContext(TARGET_CODE);
  const morphology = requiredMorphology(ctx);
  assert.deepEqual(morphology, { rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed", "es", "ing"] });

  const draft = await generateLessonDraft(ctx, { recordDecision: async (_ctx, fn) => (await fn()).output });
  assert.deepEqual(draft.morphology, morphology);
  const draftAudit = auditGeneratedLessonDraft(draft);
  assert.equal(draftAudit.canPersist, true, draftAudit.blockers.join("\n"));
  assert.equal(checkResult(draft, "LESSON_MORPHOLOGY_TARGET_COVERAGE"), "PASS");

  const content = phase3EntryLessonContentFor(TARGET_CODE);
  const fullAudit = auditPassage(content.fullAuditPassageText!, passageContext(ctx));
  const shortAudit = auditPassage(content.mockPassageText, passageContext(ctx));
  assert.equal(fullAudit.passesAuditGate, true, `${TARGET_CODE} full passage must pass audit`);
  assert.equal(shortAudit.unclassifiedWords.length, 0, `${TARGET_CODE} short passage must classify cleanly`);
  assert.equal(shortAudit.blockedPatternViolations.length, 0, `${TARGET_CODE} short passage must have no blocked patterns`);
  assert.equal(shortAudit.quality.passesQualityGate, true, `${TARGET_CODE} short passage must pass quality audit`);
  assertStyleSweep(content);

  const part2 = generatePart2Concept(ctx);
  assert.deepEqual(part2.contentJson.morphologyJson, content.morphologyJson, "Part 2 must mirror content morphologyJson through the real producer path");

  const part7 = draft.parts.find((part) => part.partNumber === 7);
  assert.equal(part7?.contentJson.passageText, content.fullAuditPassageText, "Part 7 must render fullAuditPassageText for Phase 4");

  const pseudowordRows = assertPseudowords(ctx);
  const ruleRows = assertRuleMatrix(ctx, morphology, fullAudit.words);
  const coverageRows = assertDegenerateCoverage(draft);
  const collisionRows = assertIeCollision(morphology);
  const priorRows = await assertPriorTargetsUnchanged();
  assertOracleIntegrity();

  printTable("target | words | decod | unclassified | blocked | trigrams | gate | canPersist | coverage", [[
    TARGET_CODE,
    String(fullAudit.wordCount),
    fullAudit.decodabilityScore.toFixed(3),
    String(fullAudit.unclassifiedCount),
    String(fullAudit.blockedPatternViolations.length),
    String(fullAudit.quality.repeatedTrigrams.length),
    String(fullAudit.passesAuditGate).toUpperCase(),
    String(draftAudit.canPersist).toUpperCase(),
    checkResult(draft, "LESSON_MORPHOLOGY_TARGET_COVERAGE"),
  ]]);
  printTable("target | word | pattern | pronunciation | result", pseudowordRows);
  printTable("context | surface | base | suffix | rule | classification", ruleRows);
  printTable("coverage regression | detail | result", coverageRows);
  printTable("ie collision | context | word | result", collisionRows);
  printTable("producer path | assertion | result", [
    ["Part 2 morphologyJson mirror", JSON.stringify(part2.contentJson.morphologyJson), "PASS"],
    ["Part 7 fullAuditPassageText", content.fullAuditPassageTitle ?? "", "PASS"],
  ]);
  printTable("prior target invariance | probe | result", priorRows);
  console.log("ORACLE INTEGRITY | PASS | zero new caveats, no validator-valid fallback, existing caveats unchanged");
  console.log("content-v3 Phase 4 Morphology y-to-i checks passed");
}

function assertPseudowords(ctx: LessonGeneratorContext) {
  const rows: string[][] = [];
  for (const word of ctx.pseudowords) {
    const pattern = selectPseudowordPattern(word, ctx.pseudowordPatterns);
    assert.equal(pattern, "y_long_i", `${word} must detect y_long_i`);
    const validation = validatePseudowordCandidate(word, pattern, { strictLexicon: true });
    assert.equal(validation.valid, true, `${word} failed: ${validation.reason ?? validation.issues.join(", ")}`);
    rows.push([TARGET_CODE, word, pattern, validation.expectedPronunciation ?? "", "PASS"]);
  }

  const fy = validatePseudowordCandidate("fy", "y_long_i", { strictLexicon: true });
  assert.equal(fy.valid, false, "fy must reject as a homophone collision");
  assert(fy.collidesWith, "fy rejection must name a collision");
  rows.push([TARGET_CODE, "fy", "y_long_i", fy.expectedPronunciation ?? "", `REJECT ${fy.collidesWith}`]);

  const bly = validatePseudowordCandidate("bly", "y_long_i", { strictLexicon: true });
  assert.equal(bly.valid, false, "bly must reject as a raw/direct CMUdict hit");
  assert.equal(bly.collidesWith, "bly");
  rows.push([TARGET_CODE, "bly", "y_long_i", bly.expectedPronunciation ?? "", `REJECT ${bly.collidesWith}`]);
  return rows;
}

function assertRuleMatrix(ctx: LessonGeneratorContext, morphology: MorphologyAnalyzerConfig, passageWords: WordAuditEntry[]) {
  const rows: string[][] = [];
  for (const word of ["cried", "tried", "dried", "flies", "cries", "dries"]) {
    const analysis = decomposeInflectedWord(word, morphology);
    assert(analysis, `${word} must decompose`);
    assert.equal(analysis.rule, "y_to_i");
    const entry = classifiedEntry(word, ctx);
    assert.equal(entry.category, "target");
    assert.equal(entry.morphology?.rule, "y_to_i");
    rows.push(["rule evidence", word, analysis.base, analysis.suffix, analysis.rule, "target"]);
  }
  for (const word of ["crying", "trying", "flying", "drying"]) {
    const analysis = decomposeInflectedWord(word, morphology);
    assert(analysis, `${word} must decompose as keeps-y`);
    assert.equal(analysis.rule, "none");
    const entry = classifiedEntry(word, ctx);
    assert.notEqual(entry.morphology?.rule, "y_to_i");
    rows.push(["keeps-y review", word, analysis.base, analysis.suffix, analysis.rule, entry.category]);
  }

  const expectedPassageMorphology = new Map([
    ["tried", "y_to_i"],
    ["flies", "y_to_i"],
    ["cried", "y_to_i"],
    ["spied", "y_to_i"],
    ["trying", "none"],
    ["dries", "y_to_i"],
  ]);
  for (const [surface, rule] of expectedPassageMorphology) {
    const entries = passageWords.filter((word) => word.word.toLowerCase() === surface);
    assert(entries.length > 0, `Expected ${surface} in full passage audit`);
    assert(entries.some((entry) => entry.morphology?.rule === rule), `${surface} must audit as ${rule}`);
  }
  return rows;
}

function assertDegenerateCoverage(draft: GeneratedLessonDraft) {
  const degenerate = mutateDraftForKeepsYOnly(draft);
  const result = checkResult(degenerate, "LESSON_MORPHOLOGY_TARGET_COVERAGE");
  assert.equal(result, "FAIL", "keeps-y-only evidence must fail morphology coverage");
  return [["keeps-y only", "crying, trying, flying, drying", result]];
}

function assertIeCollision(morphology: MorphologyAnalyzerConfig) {
  const rows: string[][] = [];
  for (const word of ["cried", "flies"]) {
    const inLesson = classifyPassageWords(word, {
      targetPatternCodes: ["y_long_i"],
      allowedPatternCodes: [],
      blockedPatternCodes: ["team_ie_long_i"],
      heartWords: [],
      vocabularyAllowlist: [],
      morphology,
    }).words[0];
    assert.equal(inLesson.category, "target");
    assert.equal(inLesson.matchedPattern, "y_long_i");
    assert.equal(inLesson.morphology?.rule, "y_to_i");
    rows.push(["with y_to_i morphology", word, "target:y_long_i:y_to_i"]);

    const outsideLesson = classifyPassageWords(word, {
      targetPatternCodes: ["team_ie_long_i"],
      allowedPatternCodes: [],
      blockedPatternCodes: [],
      heartWords: [],
      vocabularyAllowlist: [],
    }).words[0];
    assert.equal(outsideLesson.category, "target");
    assert.equal(outsideLesson.matchedPattern, "team_ie_long_i");
    assert.equal(outsideLesson.morphology, undefined);
    rows.push(["without morphology", word, "target:team_ie_long_i"]);
  }
  return rows;
}

async function assertPriorTargetsUnchanged() {
  const priorTargets = CONTENT_V3_DAILY_TARGETS.filter((target) => target.code !== TARGET_CODE);
  assert.equal(priorTargets.length, 28, "Exactly 28 prior targets should remain before morph_y_to_i");
  const rows: string[][] = [];
  for (const target of priorTargets) {
    const draft = await generateLessonDraft(lessonContext(target.code), { recordDecision: async (_ctx, fn) => (await fn()).output });
    if (target.code === "morph_drop_e") {
      assert.equal(draft.morphology?.rule, "drop_e");
    } else if (target.code === "morph_double") {
      assert.equal(draft.morphology?.rule, "double");
    } else {
      assert.equal(draft.morphology, undefined, `${target.code} should not opt into morphology`);
    }
  }
  rows.push(["prior target count", String(priorTargets.length), "PASS"]);
  rows.push(["prior morphology opt-in states", "drop_e/double unchanged; non-morph undefined", "PASS"]);
  return rows;
}

function lessonContext(targetCode: string): LessonGeneratorContext {
  const seedTarget = CONTENT_V3_DAILY_TARGETS.find((target) => target.code === targetCode);
  assert(seedTarget, `Missing content-v3 target ${targetCode}`);
  const content = phase3EntryLessonContentFor(targetCode);
  const phasePosition = phasePositionFor(targetCode);
  const dailyTarget = { id: `target-${targetCode}`, ...seedTarget, targetPatternsJson: seedTarget.targetPatternsJson as any };
  const targetPatterns = targetPatternsFor(seedTarget);
  const pseudowordPatterns = pseudowordPatternsFor(seedTarget, targetPatterns);
  const heartWordsPreviewedThisLesson = content.heartWordsPreviewedThisLesson;
  const heartWordsAssumedKnown = content.heartWordsAssumedKnown;
  const vocabularyWords = content.vocabulary;
  const selectedPassageText = phasePosition.phaseNumber >= 4 ? content.fullAuditPassageText : content.mockPassageText;
  assert(selectedPassageText, `${targetCode} needs fullAuditPassageText for Phase 4+ lesson generation.`);
  const selectedPassageAudit = auditPassage(selectedPassageText, {
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
    reviewWords: content.reviewWords ?? [],
    pseudowords: dailyTarget.exampleNonwords,
    heartWordsPreviewedThisLesson,
    heartWordsAssumedKnown,
    vocabularyWords,
    selectedPassage: { id: `passage-${targetCode}`, text: selectedPassageText, contentAuditJson: selectedPassageAudit, decodabilityScore: selectedPassageAudit.decodabilityScore },
    selectedPassageAudit,
  };
}

function phasePositionFor(targetCode: string) {
  const isMid = PHASE_3_MID_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Entry = PHASE_4_ENTRY_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Mid = PHASE_4_MID_TARGETS.some((target) => target.code === targetCode);
  const isPhase4RControlled = PHASE_4_RCONTROLLED_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Diphthong = PHASE_4_DIPHTHONG_TARGETS.some((target) => target.code === targetCode);
  const isPhase4TeamsCleanup = PHASE_4_TEAMS_CLEANUP_TARGETS.some((target) => target.code === targetCode);
  const isPhase4Morphology = PHASE_4_MORPHOLOGY_TARGETS.some((target) => target.code === targetCode);
  const isPhase4MorphologyYToI = PHASE_4_MORPHOLOGY_Y_TO_I_TARGETS.some((target) => target.code === targetCode);
  const isPhase4 = isPhase4Entry || isPhase4Mid || isPhase4RControlled || isPhase4Diphthong || isPhase4TeamsCleanup || isPhase4Morphology || isPhase4MorphologyYToI;
  return {
    id: isPhase4MorphologyYToI ? "phase-4-morphology-y-to-i" : isPhase4Morphology ? "phase-4-morphology" : isPhase4TeamsCleanup ? "phase-4-teams-cleanup" : isPhase4Diphthong ? "phase-4-diphthong" : isPhase4RControlled ? "phase-4-rcontrolled" : isPhase4Mid ? "phase-4-mid" : isPhase4Entry ? "phase-4-entry" : isMid ? "phase-3-mid" : "phase-3-entry",
    phaseNumber: isPhase4 ? 4 : 3,
    label: isPhase4MorphologyYToI ? "Phase 4 Morphology y to i" : isPhase4Morphology ? "Phase 4 Morphology Entry A" : isPhase4TeamsCleanup ? "Phase 4 Teams Cleanup" : isPhase4Diphthong ? "Phase 4 Diphthong Entry" : isPhase4RControlled ? "Phase 4 R-Controlled Entry" : isPhase4Mid ? "Phase 4 Mid" : isPhase4Entry ? "Phase 4 Entry" : isMid ? "Phase 3 Mid" : "Phase 3 Entry",
  };
}

function passageContext(ctx: LessonGeneratorContext) {
  return {
    phasePosition: ctx.phasePosition,
    dailyTarget: ctx.dailyTarget,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
    vocabularyAllowlist: ctx.vocabularyWords,
  };
}

function requiredMorphology(ctx: LessonGeneratorContext): MorphologyAnalyzerConfig {
  const morphology = morphologyConfigFromTargetPatternsJson(ctx.dailyTarget.targetPatternsJson);
  assert(morphology, `${ctx.dailyTarget.code} requires morphologyJson`);
  return morphology;
}

function classifiedEntry(word: string, ctx: LessonGeneratorContext): WordAuditEntry {
  const result = classifyPassageWords(word, {
    targetPatternCodes: ctx.targetPatterns,
    allowedPatternCodes: ctx.dailyTarget.allowedPatternCodes,
    blockedPatternCodes: ctx.dailyTarget.blockedPatternCodes,
    heartWords: [...ctx.heartWordsPreviewedThisLesson, ...ctx.heartWordsAssumedKnown],
    vocabularyAllowlist: ctx.vocabularyWords,
    morphology: requiredMorphology(ctx),
  });
  assert.equal(result.words.length, 1);
  return result.words[0];
}

function mutateDraftForKeepsYOnly(draft: GeneratedLessonDraft): GeneratedLessonDraft {
  return {
    ...draft,
    parts: draft.parts.map((part) => {
      if (part.partNumber === 2) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            demonstrationPairs: [
              { base: "cry", target: "crying" },
              { base: "try", target: "trying" },
              { base: "fly", target: "flying" },
              { base: "dry", target: "drying" },
            ],
          },
        };
      }
      if (part.partNumber === 3) {
        return {
          ...part,
          contentJson: {
            ...part.contentJson,
            contrastiveLines: [
              { lineNumber: 1, role: "target_real_words", words: ["crying", "trying", "flying", "drying"] },
              { lineNumber: 2, role: "contrastive_target_vs_review", words: ["cry", "try", "fly", "dry"] },
              { lineNumber: 3, role: "cumulative_review", words: ["lake", "hand", "desk"] },
              { lineNumber: 4, role: "target_pseudowords", words: ["cly", "sny", "gly", "zy", "smy", "vry", "zby", "gry"] },
            ],
          },
        };
      }
      if (part.partNumber === 5) {
        return { ...part, contentJson: { ...part.contentJson, sentences: ["Sky is trying to fly.", "The pup is crying."] } };
      }
      if (part.partNumber === 6) {
        return { ...part, contentJson: { ...part.contentJson, dictatedWords: ["crying", "trying", "flying", "drying", "cry", "fly"] } };
      }
      if (part.partNumber === 7) {
        return { ...part, contentJson: { ...part.contentJson, passageText: "Sky is trying. The bug is flying. The kid is crying." } };
      }
      return part;
    }),
  };
}

function checkResult(draft: GeneratedLessonDraft, ruleId: string) {
  const check = auditGeneratedLessonDraft(draft).checks.find((entry) => entry.ruleId === ruleId);
  assert(check, `Missing ${ruleId}`);
  return check.result;
}

function assertStyleSweep(content: { sentences: string[]; fullAuditPassageText?: string; mockPassageText: string }) {
  const text = [content.sentences.join(" "), content.mockPassageText, content.fullAuditPassageText ?? ""].join(" ").toLowerCase();
  assert(!/\bare\b/.test(text), `${TARGET_CODE} must not use are`);
  for (const banned of ["crys", "flys", "drys"]) {
    assert(!new RegExp(`\\b${banned}\\b`).test(text), `${TARGET_CODE} must not use ${banned}`);
  }
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

function assertOracleIntegrity() {
  const conformanceSource = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  const validatorSource = fs.readFileSync("lib/literacy/pseudowordValidator.ts", "utf8");
  assert.equal(conformanceSource.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.equal(validatorSource.includes("|| validation.valid"), false, "validator must not contain a validator-valid fallback");
  assert.match(conformanceSource, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(conformanceSource, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
}

function printTable(header: string, rows: string[][]) {
  console.log(header);
  console.log(header.split("|").map(() => "---").join("|"));
  for (const row of rows) console.log(row.join(" | "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
