import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MAPPING_VERSION,
  deriveStudentInsights,
  mapDistractor,
  mappingRegistry,
  roleFamilyOf,
  type PssaInsightForm,
} from "@/lib/content/pssaInsightMapping";

const fixtureDir = path.join(process.cwd(), "exemplars/pssa_grade3_stamina_pilot");
const bannedPhrases = [
  "the student believes",
  "the student cannot",
  "definitely",
  "guessed",
  "Below Basic",
  "Basic",
  "Proficient",
  "Advanced",
];

function collectBankRoles() {
  const roles = new Set<string>();
  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    if (typeof row.distractorRole === "string" && row.distractorRole.length > 0) roles.add(row.distractorRole);
    Object.values(row).forEach(walk);
  }
  for (const file of fs.readdirSync(fixtureDir).filter((name) => name.endsWith(".json")).sort()) {
    walk(JSON.parse(fs.readFileSync(path.join(fixtureDir, file), "utf8")));
  }
  return [...roles].sort();
}

function syntheticItem(id: string, role: string, clusterId = "cluster-a") {
  return {
    itemId: id,
    interactionType: "MCQ",
    correctIndex: 0,
    clusterId,
    structuredChoicesJson: [
      { text: "Correct answer", isCorrect: true, distractorRole: null },
      { text: `Synthetic ${role}`, isCorrect: false, distractorRole: role },
    ],
  };
}

function syntheticForm(items: PssaInsightForm["items"]): PssaInsightForm {
  return {
    formId: "synthetic-form-1",
    formVersion: "synthetic-form-v1",
    items,
  };
}

function attemptFor(itemIds: string[]) {
  return {
    benchmarkSeason: "fall",
    responses: itemIds.map((itemId) => ({ itemId, selectedIndex: 1, isCorrect: false })),
  };
}

function generatedText(insights: ReturnType<typeof deriveStudentInsights>) {
  return insights.flatMap((insight) => [
    insight.interpretation,
    insight.teacherMove,
    insight.recommendedSkill ?? "",
    insight.lessonReference ?? "",
  ]).join("\n");
}

const bankRoles = collectBankRoles();
assert(bankRoles.length > 0, "bank role enumeration must find distractor roles");
for (const role of bankRoles) {
  const entry = mapDistractor(role);
  assert.equal(entry.role, role);
  assert.equal(roleFamilyOf(role), entry.roleFamily);
  assert(entry.interpretation.length > 0, `${role} interpretation must be present`);
  assert(entry.teacherMove.length > 0, `${role} teacher move must be present`);
}

assert.throws(() => mapDistractor("fake_unmapped_role"), /pssa_insight_unmapped_distractor_role:fake_unmapped_role/);
assert.throws(
  () => deriveStudentInsights(
    { benchmarkSeason: "fall", responses: [{ itemId: "fake_1", selectedIndex: 1, isCorrect: false }] },
    syntheticForm([syntheticItem("fake_1", "fake_unmapped_role")]),
  ),
  /pssa_insight_unmapped_distractor_role:fake_unmapped_role/,
  "fake injected role must fail the audit path",
);

const threeItemForm = syntheticForm([
  syntheticItem("i1", "unsupported_inference"),
  syntheticItem("i2", "unsupported_inference"),
  syntheticItem("i3", "unsupported_inference"),
]);

const possible = deriveStudentInsights(attemptFor(["i1"]), threeItemForm);
assert.equal(possible.length, 1);
assert.equal(possible[0].confidence, "possible");
assert.deepEqual(possible[0].evidence.map((row) => row.itemId), ["i1"]);

const likely = deriveStudentInsights(attemptFor(["i1", "i2"]), threeItemForm);
assert.equal(likely.length, 1);
assert.equal(likely[0].confidence, "likely");

const strong = deriveStudentInsights(attemptFor(["i1", "i2", "i3"]), threeItemForm);
assert.equal(strong.length, 1);
assert.equal(strong[0].confidence, "strong_pattern");

const thin = deriveStudentInsights(attemptFor(["i1"]), syntheticForm([
  syntheticItem("i1", "wrong_section", "thin-cluster"),
  syntheticItem("i2", "wrong_section", "thin-cluster"),
]));
assert.equal(thin.length, 1);
assert.equal(thin[0].confidence, "limited_evidence");

const correctOnly = deriveStudentInsights({
  benchmarkSeason: "winter",
  responses: [{ itemId: "i1", selectedIndex: 0, isCorrect: true }],
}, threeItemForm);
assert.deepEqual(correctOnly, [], "correct answers produce zero misconception insights");

const nonMcqOnly = deriveStudentInsights({
  benchmarkSeason: "winter",
  responses: [
    { itemId: "syrup_dd_01", selectedIndex: 1, interactionType: "DRAG_DROP", scoreStatus: "scored" },
    { itemId: "boat_mg_01", selectedIndex: 1, interactionType: "MATCHING_GRID", scoreStatus: "scored" },
    { itemId: "ebsr_1", selectedIndex: 1, interactionType: "EBSR", scoreStatus: "scored" },
    { itemId: "sa_1", interactionType: "SHORT_ANSWER", scoreStatus: "pending_human_scoring" },
  ],
}, syntheticForm([
  { itemId: "syrup_dd_01", interactionType: "DRAG_DROP" },
  { itemId: "boat_mg_01", interactionType: "MATCHING_GRID" },
  { itemId: "ebsr_1", interactionType: "EBSR" },
  { itemId: "sa_1", interactionType: "SHORT_ANSWER" },
]));
assert.deepEqual(nonMcqOnly, [], "TE/SA/EBSR attempts do not produce distractor-based misconception insights");

const deterministicA = deriveStudentInsights(attemptFor(["i1", "i2", "i3"]), threeItemForm);
const deterministicB = deriveStudentInsights(attemptFor(["i1", "i2", "i3"]), threeItemForm);
assert.deepEqual(deterministicA, deterministicB, "same attempt + form + mapping version must be deterministic");
assert.equal(deterministicA[0].mappingVersion, MAPPING_VERSION);
assert.equal(deterministicA[0].benchmarkSeason, "fall");
assert.equal(deterministicA[0].formId, "synthetic-form-1");
assert.equal(deterministicA[0].formVersion, "synthetic-form-v1");

const generated = generatedText([
  ...possible,
  ...likely,
  ...strong,
  ...thin,
  ...deriveStudentInsights({
    benchmarkSeason: "spring",
    responses: [
      { itemId: "c1", selectedIndex: 1, isCorrect: false },
      { itemId: "c2", selectedIndex: 1, isCorrect: false },
      { itemId: "c3", selectedIndex: 1, isCorrect: false },
    ],
  }, syntheticForm([
    syntheticItem("c1", "one_word_misspelled", "conv-cluster"),
    syntheticItem("c2", "two_words_misspelled", "conv-cluster"),
    syntheticItem("c3", "one_word_misspelled", "conv-cluster"),
  ])),
]);
for (const phrase of bannedPhrases) {
  assert.equal(generated.includes(phrase), false, `generated teacher-facing copy must not include banned phrase: ${phrase}`);
}

assert.equal(Object.keys(mappingRegistry).sort().join("\n"), [...new Set(Object.keys(mappingRegistry))].sort().join("\n"), "mapping registry roles must be unique");
console.log("WS3-A bank role coverage:");
for (const role of bankRoles) console.log(`${role} -> ${roleFamilyOf(role)}`);
console.log("PSSA WS3-A insight mapping tests passed.");
