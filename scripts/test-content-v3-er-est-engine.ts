import assert from "assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditGeneratedLessonDraft, type GeneratedLessonDraft } from "../lib/literacy/lessonAudit";
import type { GeneratedLessonPart } from "../lib/literacy/lessonParts/types";
import {
  decomposeInflectedWord,
  morphologyConfigFromTargetPatternsJson,
  type MorphologyAnalyzerConfig,
} from "../lib/literacy/morphologyAnalyzer";
import { classifyPassageWords, wordMatchesPattern } from "../lib/literacy/passageClassifier";

type CmudictEntry = {
  word?: unknown;
  arpabet?: unknown;
  phonemes_arpabet?: unknown;
};

type CandidateRow = {
  stem: string;
  erForm: string;
  erResult: "KEEP" | "DROP" | "DEFERRED";
  erReason: string;
  estForm: string;
  estResult: "KEEP" | "DROP" | "DEFERRED";
  estReason: string;
};

const STEM_PATTERNS = [
  "team_ow",
  "team_oa",
  "team_ee",
  "team_ea",
  "closed_short_a",
  "closed_short_e",
  "closed_short_i",
  "closed_short_o",
  "closed_short_u",
];

const CANDIDATE_STEMS = ["fast", "tall", "slow", "soft", "damp", "fresh", "thick", "rich", "long", "strong", "young"];
const DEFERRED_STEMS = new Set(["long", "strong", "young"]);

const COMPARE: MorphologyAnalyzerConfig = {
  rule: "compare",
  stemPatterns: STEM_PATTERNS,
  suffixes: ["er", "est"],
  comparativeStems: ["fast", "tall", "slow", "soft", "fresh", "thick", "rich"],
};

const NON_WHITELIST_PROBE: MorphologyAnalyzerConfig = {
  ...COMPARE,
  comparativeStems: [],
};

async function main() {
  const candidateRows = assertCandidateStemSelection();
  const decompositionRows = assertDecompositionMatrix();
  const whitelistRows = assertWhitelistGate();
  const rRows = assertRControlledInvariants();
  const auditRows = assertLessonAuditBehavior();
  const optInRows = assertOptInInvariance();
  assertParser();
  assertOracleIntegrity();

  printTable("candidate | -er | result | reason | -est | result | reason", candidateRows.map((row) => [
    row.stem,
    row.erForm,
    row.erResult,
    row.erReason,
    row.estForm,
    row.estResult,
    row.estReason,
  ]));
  console.log(`FINAL comparativeStems | ${COMPARE.comparativeStems?.join(", ")}`);
  printTable("surface | base | suffix | rule | basePattern | verified", decompositionRows);
  printTable("trap | probe | classifiable | pron+real would pass | whitelisted result", whitelistRows);
  printTable("r-controlled invariant | result | evidence", rRows);
  printTable("lesson audit | check | result | evidence", auditRows);
  printTable("opt-in | target | result", optInRows);
  console.log("long/strong/young | DEFERRED | pron-/g/-insertion; longer/longest pinned null");
  console.log("ORACLE INTEGRITY | PASS | no new caveats, no validator-valid fallback");
  console.log("content-v3 -er/-est engine-design checks passed");
}

function assertCandidateStemSelection(): CandidateRow[] {
  const rows = CANDIDATE_STEMS.map((stem) => {
    const er = evaluateCandidateForm(stem, "er");
    const est = evaluateCandidateForm(stem, "est");
    return {
      stem,
      erForm: `${stem}er`,
      erResult: DEFERRED_STEMS.has(stem) ? "DEFERRED" as const : er.valid ? "KEEP" as const : "DROP" as const,
      erReason: DEFERRED_STEMS.has(stem) ? "pron-/g/-insertion deferred" : er.reason,
      estForm: `${stem}est`,
      estResult: DEFERRED_STEMS.has(stem) ? "DEFERRED" as const : est.valid ? "KEEP" as const : "DROP" as const,
      estReason: DEFERRED_STEMS.has(stem) ? "pron-/g/-insertion deferred" : est.reason,
    };
  });
  const keepers = rows
    .filter((row) => row.erResult === "KEEP" && row.estResult === "KEEP")
    .map((row) => row.stem);
  assert.deepEqual(keepers, COMPARE.comparativeStems);
  for (const stem of DEFERRED_STEMS) {
    const row = rows.find((entry) => entry.stem === stem);
    assert(row);
    assert.equal(row.erResult, "DEFERRED");
    assert.equal(row.estResult, "DEFERRED");
  }
  return rows;
}

function evaluateCandidateForm(stem: string, suffix: "er" | "est") {
  const surface = `${stem}${suffix}`;
  const config: MorphologyAnalyzerConfig = { ...COMPARE, comparativeStems: [stem] };
  const analysis = decomposeInflectedWord(surface, config);
  if (analysis?.rule === "compare") return { valid: true, reason: "verified base+allomorph" };
  if (!cmudictPronunciations(stem).length) return { valid: false, reason: "base missing CMUdict" };
  if (!cmudictPronunciations(surface).length) return { valid: false, reason: "surface missing CMUdict" };
  if (!STEM_PATTERNS.some((pattern) => wordMatchesPattern(stem, pattern, { strictPhonemeLexicon: true }))) {
    return { valid: false, reason: "base not in allowed stemPatterns" };
  }
  return { valid: false, reason: "surface pronunciation is not base pronunciation + suffix allomorph" };
}

function assertDecompositionMatrix() {
  const rows: string[][] = [];
  for (const [surface, base, suffix, basePattern] of [
    ["faster", "fast", "er", "closed_short_a"],
    ["fastest", "fast", "est", "closed_short_a"],
    ["taller", "tall", "er", "closed_short_a"],
    ["tallest", "tall", "est", "closed_short_a"],
    ["slower", "slow", "er", "team_ow"],
    ["slowest", "slow", "est", "team_ow"],
    ["softer", "soft", "er", "closed_short_o"],
    ["softest", "soft", "est", "closed_short_o"],
    ["fresher", "fresh", "er", "closed_short_e"],
    ["freshest", "fresh", "est", "closed_short_e"],
    ["thicker", "thick", "er", "closed_short_i"],
    ["thickest", "thick", "est", "closed_short_i"],
    ["richer", "rich", "er", "closed_short_i"],
    ["richest", "rich", "est", "closed_short_i"],
  ] as const) {
    const analysis = decomposeInflectedWord(surface, COMPARE);
    assert(analysis, `${surface} should decompose`);
    assert.equal(analysis.base, base);
    assert.equal(analysis.suffix, suffix);
    assert.equal(analysis.rule, "compare");
    assert.equal(analysis.basePattern, basePattern);
    rows.push([analysis.surface, analysis.base, analysis.suffix, analysis.rule, analysis.basePattern, String(analysis.verified).toUpperCase()]);
  }
  assert.equal(decomposeInflectedWord("longer", { ...COMPARE, comparativeStems: [...COMPARE.comparativeStems!, "long"] }), null);
  assert.equal(decomposeInflectedWord("longest", { ...COMPARE, comparativeStems: [...COMPARE.comparativeStems!, "long"] }), null);
  assert.equal(decomposeInflectedWord("faster", { ...COMPARE, comparativeStems: ["fastest"] }), null, "faster must not depend on fastest");
  assert.equal(decomposeInflectedWord("fastest", { ...COMPARE, comparativeStems: ["fast"] })?.base, "fast", "fastest decomposes independently");
  return rows;
}

function assertWhitelistGate() {
  const traps = [
    "baker",
    "runner",
    "writer",
    "swimmer",
    "teacher",
    "farmer",
    "marker",
    "timer",
    "singer",
    "player",
    "after",
    "water",
    "under",
    "winter",
    "letter",
  ];
  return traps.map((surface) => {
    const stripped = stripCompareSuffix(surface);
    assert(stripped, `${surface} should have an er/est suffix`);
    const nonWhitelisted = decomposeInflectedWord(surface, NON_WHITELIST_PROBE);
    assert.equal(nonWhitelisted, null, `${surface} must be blocked by comparativeStems whitelist`);
    const classifiable = STEM_PATTERNS.some((pattern) => wordMatchesPattern(stripped.base, pattern, { strictPhonemeLexicon: true }));
    const wouldPass = probeWithoutWhitelist(surface, stripped.base, stripped.suffix);
    return [surface, stripped.base, String(classifiable).toUpperCase(), String(wouldPass).toUpperCase(), "NULL"];
  });
}

function assertRControlledInvariants() {
  const rows: string[][] = [];
  for (const [word, pattern] of [["her", "r_er"], ["bird", "r_ir"], ["turn", "r_ur"]] as const) {
    assert.equal(wordMatchesPattern(word, pattern, { strictPhonemeLexicon: true }), true);
    assert.equal(decomposeInflectedWord(word, COMPARE), null);
    rows.push([word, "PASS", `${word} remains bare r-controlled ${pattern}`]);
  }
  return rows;
}

function assertLessonAuditBehavior() {
  const comparePass = auditGeneratedLessonDraft(compareDraft({ sentences: ["The faster fox sat.", "The taller dog ran."], passageText: "The faster fox ran. The tallest dog sat." }));
  assert.equal(rule(comparePass, "LESSON_PHASE3_NO_RCONTROLLED"), "PASS");
  assert.equal(rule(comparePass, "LESSON_PART3_PSEUDOWORD_COUNT"), "PASS");
  assert.equal(rule(comparePass, "LESSON_MORPHOLOGY_TARGET_COVERAGE"), "PASS");

  const compareHer = auditGeneratedLessonDraft(compareDraft({ sentences: ["Her dog was faster.", "The taller dog ran."], passageText: "The faster dog ran. Her cat sat." }));
  assert.equal(rule(compareHer, "LESSON_PHASE3_NO_RCONTROLLED"), "FAIL");

  const compareAfter = auditGeneratedLessonDraft(compareDraft({ sentences: ["The faster dog ran after it.", "The taller dog sat."], passageText: "The fastest dog ran after it." }));
  assert.equal(rule(compareAfter, "LESSON_PHASE3_NO_RCONTROLLED"), "FAIL");

  const noMorph = auditGeneratedLessonDraft(compareDraft({ morphology: undefined, sentences: ["The faster fox sat.", "The taller dog ran."], passageText: "The faster fox ran." }));
  assert.equal(rule(noMorph, "LESSON_PHASE3_NO_RCONTROLLED"), "FAIL");

  const fastestCoverage = auditGeneratedLessonDraft(compareDraft({ sentences: ["The fastest fox ran.", "The taller dog sat."], passageText: "The fastest fox ran. The taller dog sat." }));
  assert.equal(rule(fastestCoverage, "LESSON_MORPHOLOGY_TARGET_COVERAGE"), "PASS");

  return [
    ["compare draft", "LESSON_PHASE3_NO_RCONTROLLED", "PASS", checkEvidence(comparePass, "LESSON_PHASE3_NO_RCONTROLLED")],
    ["compare draft", "LESSON_PART3_PSEUDOWORD_COUNT", "PASS", checkEvidence(comparePass, "LESSON_PART3_PSEUDOWORD_COUNT")],
    ["compare draft", "LESSON_MORPHOLOGY_TARGET_COVERAGE", "PASS", checkEvidence(comparePass, "LESSON_MORPHOLOGY_TARGET_COVERAGE")],
    ["compare + her", "LESSON_PHASE3_NO_RCONTROLLED", "FAIL", checkEvidence(compareHer, "LESSON_PHASE3_NO_RCONTROLLED")],
    ["compare + after", "LESSON_PHASE3_NO_RCONTROLLED", "FAIL", checkEvidence(compareAfter, "LESSON_PHASE3_NO_RCONTROLLED")],
    ["no morphology", "LESSON_PHASE3_NO_RCONTROLLED", "FAIL", checkEvidence(noMorph, "LESSON_PHASE3_NO_RCONTROLLED")],
    ["fastest coverage", "LESSON_MORPHOLOGY_TARGET_COVERAGE", "PASS", checkEvidence(fastestCoverage, "LESSON_MORPHOLOGY_TARGET_COVERAGE")],
  ];
}

function assertOptInInvariance() {
  const priorTargets = [
    "a_e",
    "i_e",
    "o_e",
    "u_e",
    "e_e",
    "vce_mix_ai",
    "vce_mix_oue",
    "vce_mix_all",
    "team_ai_ay",
    "team_ee_ea",
    "team_oa",
    "team_igh",
    "team_ai",
    "team_ay",
    "team_ee",
    "team_ea",
    "r_controlled_ar",
    "r_controlled_or",
    "r_controlled_er_ir_ur",
    "diph_oi_oy",
    "diph_ou_ow",
    "oo_both",
    "au_aw",
    "team_ow",
    "team_ew",
    "team_ue",
    "morph_drop_e",
    "morph_double",
    "morph_y_to_i",
  ];
  return priorTargets.map((target) => {
    const config = morphologyConfigFromTargetPatternsJson({ morphologyJson: morphologyJsonForTarget(target) });
    assert.notEqual(config?.rule, "compare", `${target} must not opt into compare`);
    return [target, "PASS"];
  });
}

function assertParser() {
  const parsed = morphologyConfigFromTargetPatternsJson({ morphologyJson: COMPARE });
  assert.deepEqual(parsed, COMPARE);
  assert.equal(morphologyConfigFromTargetPatternsJson({ morphologyJson: { ...COMPARE, comparativeStems: undefined } }), undefined);
  assert.equal(morphologyConfigFromTargetPatternsJson({ morphologyJson: { ...COMPARE, suffixes: ["er", "ish"] } }), undefined);
}

function assertOracleIntegrity() {
  const source = fs.readFileSync("scripts/test-content-v3-lesson-spec-conformance.ts", "utf8");
  assert.equal(source.includes("|| validation.valid"), false, "independent CMUdict oracle must not fall back to validatePseudowordCandidate");
  assert.match(source, /\["a_e", new Set\(\["mave", "nace"\]\)\]/);
  assert.match(source, /\["r_controlled_ar", new Set\(\["zarb", "varn"\]\)\]/);
}

function morphologyJsonForTarget(code: string) {
  if (code === "morph_drop_e") return { rule: "drop_e", stemPatterns: ["a_e", "i_e", "o_e", "u_e"], suffixes: ["ing", "ed", "s", "es"] };
  if (code === "morph_double") return { rule: "double", stemPatterns: ["closed_short_a", "closed_short_i", "closed_short_o", "closed_short_u", "closed_short_e"], suffixes: ["ing", "ed", "s", "es"] };
  if (code === "morph_y_to_i") return { rule: "y_to_i", stemPatterns: ["y_long_i"], suffixes: ["ed", "es", "ing"] };
  return undefined;
}

function compareDraft(options: {
  morphology?: MorphologyAnalyzerConfig;
  sentences: string[];
  passageText: string;
}): GeneratedLessonDraft {
  const morphology = "morphology" in options ? options.morphology : COMPARE;
  return {
    phasePositionId: "phase-4-compare-test",
    dailyTargetId: "target-compare-test",
    phaseBand: 4,
    dailyTargetCode: "morph_compare",
    targetPattern: "morph_compare",
    targetPatterns: ["morph_compare"],
    pseudowordPatterns: [],
    morphology,
    parts: [
      part(1, "Cumulative code review", "CUMULATIVE_CODE_REVIEW", { warmupWords: ["cat", "bed", "sit", "hop", "cup"] }, tags(["cat", "bed", "sit", "hop", "cup"])),
      part(2, "Target concept", "EXPLICIT_TARGET_INSTRUCTION", {
        demoMode: "transformation_pairs",
        demonstrationPairs: [
          { base: "fast", target: "faster" },
          { base: "tall", target: "taller" },
          { base: "slow", target: "slowest" },
        ],
        conceptExamples: ["fast", "tall", "slow"],
        morphologyJson: morphology,
      }, tags(["fast", "faster", "tall", "taller", "slow", "slowest"])),
      part(3, "Word-level decoding", "WORD_LEVEL_DECODING", {
        contrastiveLines: [
          { lineNumber: 1, role: "target_real_words", words: ["fast", "faster", "fastest", "tall", "taller", "tallest"] },
          { lineNumber: 2, role: "contrastive_target_vs_review", words: ["slow", "slower", "slowest", "soft", "softer"] },
          { lineNumber: 3, role: "cumulative_review", words: ["fresh", "fresher", "freshest", "rich", "richer"] },
          { lineNumber: 4, role: "target_pseudowords", words: [] },
        ],
      }, tags(["fast", "faster", "fastest", "tall", "taller", "tallest", "slow", "slower", "slowest", "soft", "softer", "fresh", "fresher", "freshest", "rich", "richer"])),
      part(4, "High-utility word / vocabulary", "HFW_VOCAB", { heartWordsPreviewedThisLesson: [], heartWordsAssumedKnown: [] }),
      part(5, "Sentence reading", "SENTENCE_READING", { sentences: options.sentences, unclassifiedWords: [] }, tags(tokenize(options.sentences.join(" ")))),
      part(6, "Encoding / spelling", "ENCODING_SPELLING", {
        dictatedWords: ["faster", "fastest", "taller", "tallest", "slower", "slowest"],
        dictatedSentences: ["The faster fox ran.", "The tallest dog sat."],
      }, tags(["faster", "fastest", "taller", "tallest", "slower", "slowest"])),
      part(7, "Connected text", "CONNECTED_TEXT_READING", { passageText: options.passageText, heartWordsUsedInConnectedText: [] }, tags(tokenize(options.passageText)), { unclassifiedWords: [] }, true, false),
      part(8, "Comprehension", "COMPREHENSION_LANGUAGE_EXTENSION", { questions: [{ question: "What did the fox do?", questionType: "literal" }] }),
    ],
  };
}

function part(
  partNumber: number,
  partLabel: string,
  partType: string,
  contentJson: Record<string, unknown>,
  wordTagsJson: Record<string, unknown> = { words: [] },
  contentAuditJson?: Record<string, unknown>,
  assistedModeAllowed?: boolean,
  independentScoreEligible?: boolean,
): GeneratedLessonPart {
  return {
    partNumber,
    partLabel,
    partType,
    kidVisibleCopy: {},
    tutorVisibleCopy: {},
    contentJson,
    contentAuditJson,
    wordTagsJson,
    scoringRubricJson: {},
    studentDisplayMode: "TEXT",
    responseMode: "speech_response",
    assistedModeAllowed,
    independentScoreEligible,
  };
}

function tags(words: string[]) {
  return { words: words.map((word) => ({ word, tag: "target" })) };
}

function rule(audit: ReturnType<typeof auditGeneratedLessonDraft>, ruleId: string) {
  const checks = audit.checks.filter((check) => check.ruleId === ruleId);
  return checks.some((check) => check.result === "FAIL") ? "FAIL" : checks[0]?.result;
}

function checkEvidence(audit: ReturnType<typeof auditGeneratedLessonDraft>, ruleId: string) {
  const checks = audit.checks.filter((check) => check.ruleId === ruleId);
  return checks.find((check) => check.result === "FAIL")?.evidence ?? checks[0]?.evidence ?? "";
}

function stripCompareSuffix(surface: string) {
  if (surface.endsWith("est") && surface.length > 3) return { base: surface.slice(0, -3), suffix: "est" as const };
  if (surface.endsWith("er") && surface.length > 2) return { base: surface.slice(0, -2), suffix: "er" as const };
  return null;
}

function probeWithoutWhitelist(surface: string, base: string, suffix: "er" | "est") {
  return Boolean(decomposeInflectedWord(surface, { ...COMPARE, comparativeStems: [base], suffixes: [suffix] }));
}

function tokenize(text: string) {
  return text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

function cmudictPronunciations(word: string) {
  const raw = JSON.parse(fs.readFileSync(path.resolve("data/phonogram/cmudict.json"), "utf8")) as CmudictEntry[];
  const values: string[][] = [];
  for (const entry of raw) {
    if (String(entry.word ?? "").toLowerCase() !== word) continue;
    const phonemes = Array.isArray(entry.phonemes_arpabet)
      ? entry.phonemes_arpabet.map((value) => stripStress(String(value))).filter(Boolean)
      : String(entry.arpabet ?? "").trim().split(/\s+/).map(stripStress).filter(Boolean);
    if (phonemes.length) values.push(phonemes);
  }
  return values;
}

function stripStress(token: string) {
  return token.replace(/\d/g, "");
}

function printTable(header: string, rows: string[][]) {
  console.log(header);
  console.log(header.split("|").map(() => "---").join("|"));
  for (const row of rows) console.log(row.join(" | "));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
