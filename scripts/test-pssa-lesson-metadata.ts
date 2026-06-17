import assert from "node:assert/strict";

import { buildPrebuiltLessonSeeds } from "../lib/prebuiltLessonLibrary";

const TOP_LEVEL_TAGS = new Set([
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
  "writing_tda",
  "foundational_support",
  "exclude_from_grade3_bridge",
]);

const REPORT_CLUSTER_TAGS = new Set([
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
]);

const EXPECTED_GRADE3_METADATA = new Map([
  ["Main Idea", {
    standardCodes: ["CC.1.2.3.A"],
    pssaBridgeTags: ["key_ideas_evidence", "main_idea", "key_details", "central_idea"],
  }],
  ["Inference", {
    standardCodes: ["CC.1.2.3.B", "CC.1.3.3.B"],
    pssaBridgeTags: ["key_ideas_evidence", "inference", "text_evidence", "prove_answer", "unsupported_inference"],
  }],
  ["Text Evidence", {
    standardCodes: ["CC.1.2.3.B", "CC.1.3.3.B"],
    pssaBridgeTags: ["key_ideas_evidence", "text_evidence", "cite_evidence", "prove_answer"],
  }],
  ["Theme", {
    standardCodes: ["CC.1.3.3.A"],
    pssaBridgeTags: ["key_ideas_evidence", "theme", "central_message", "lesson_moral", "key_details"],
  }],
  ["Point of View", {
    standardCodes: ["CC.1.2.3.D", "CC.1.3.3.D"],
    pssaBridgeTags: ["craft_structure", "point_of_view", "author_point_of_view", "narrator", "speaker"],
  }],
  ["Connotation and Figurative Language", {
    standardCodes: ["CC.1.2.3.F", "CC.1.3.3.F"],
    pssaBridgeTags: ["vocabulary", "figurative_language", "nonliteral_language", "word_meaning", "literal_nonliteral"],
  }],
  ["Pronoun Agreement and Shifts", {
    standardCodes: ["CC.1.4.3.F"],
    pssaBridgeTags: ["exclude_from_grade3_bridge", "pronoun_shift", "grammar"],
  }],
  ["Formal and Informal Style", {
    standardCodes: ["CC.1.4.3.K"],
    pssaBridgeTags: ["exclude_from_grade3_bridge", "style", "language_use"],
  }],
  ["TDA Evidence and Explanation", {
    standardCodes: ["CC.1.4.3.S"],
    pssaBridgeTags: ["writing_tda", "text_dependent_analysis", "text_evidence", "writing"],
  }],
  ["Capitalization and Titles", {
    standardCodes: ["CC.1.4.3.F"],
    pssaBridgeTags: ["conventions", "capitalization", "titles"],
  }],
  ["Commas in a Series", {
    standardCodes: ["CC.1.4.3.F"],
    pssaBridgeTags: ["conventions", "commas", "punctuation", "series_commas"],
  }],
  ["Complete Sentences", {
    standardCodes: ["CC.1.4.3.F"],
    pssaBridgeTags: ["conventions", "sentence_formation", "complete_sentences"],
  }],
  ["Author's Purpose", {
    standardCodes: ["CC.1.2.3.D", "CC.1.2.3.H"],
    pssaBridgeTags: ["craft_structure", "authors_purpose", "point_of_view", "authors_reasons"],
  }],
  ["Cause and Effect", {
    standardCodes: ["CC.1.2.3.C"],
    pssaBridgeTags: ["key_ideas_evidence", "cause_effect", "connections", "sequence"],
  }],
  ["Compare and Contrast", {
    standardCodes: ["CC.1.2.3.I"],
    pssaBridgeTags: ["craft_structure", "compare_contrast", "paired_text"],
  }],
  ["Text Features", {
    standardCodes: ["CC.1.2.3.E", "CC.1.2.3.G"],
    pssaBridgeTags: ["craft_structure", "text_features", "graphics", "search_tools"],
  }],
  ["Character Traits and Actions", {
    standardCodes: ["CC.1.3.3.C"],
    pssaBridgeTags: ["key_ideas_evidence", "character_traits", "character_actions", "sequence"],
  }],
  ["Poetry Lines and Stanzas", {
    standardCodes: ["CC.1.3.3.E"],
    pssaBridgeTags: ["craft_structure", "poetry_structure", "stanzas", "text_parts"],
  }],
  ["Sequence of Events", {
    standardCodes: ["CC.1.3.3.C"],
    pssaBridgeTags: ["key_ideas_evidence", "sequence", "events", "story_events"],
  }],
  ["Story Elements", {
    standardCodes: ["CC.1.3.3.C", "CC.1.3.3.A"],
    pssaBridgeTags: ["key_ideas_evidence", "story_elements", "characters", "plot", "central_message"],
  }],
  ["Opinion Reasons", {
    standardCodes: ["CC.1.4.3.G", "CC.1.4.3.I"],
    pssaBridgeTags: ["writing_tda", "opinion_writing", "opinion_reasons", "writing"],
  }],
  ["Paragraph Organization", {
    standardCodes: ["CC.1.4.3.J"],
    pssaBridgeTags: ["writing_tda", "paragraph_organization", "writing_structure", "writing"],
  }],
  ["Context Clues", {
    standardCodes: ["CC.1.2.3.F", "CC.1.3.3.F"],
    pssaBridgeTags: ["vocabulary", "context_clues", "word_meaning", "literal_nonliteral"],
  }],
  ["Multisyllable Word Parts", {
    standardCodes: ["CC.1.1.3.D"],
    pssaBridgeTags: ["vocabulary", "word_analysis", "multisyllable_words", "foundational"],
  }],
  ["Prefixes and Suffixes", {
    standardCodes: ["CC.1.1.3.D", "CC.1.2.3.F"],
    pssaBridgeTags: ["vocabulary", "prefixes_suffixes", "word_parts", "morphology"],
  }],
  ["Short and Long Vowel Patterns", {
    standardCodes: ["CC.1.1.3.D"],
    pssaBridgeTags: ["foundational_support", "vowel_patterns", "phonics"],
  }],
  ["Synonyms and Antonyms", {
    standardCodes: ["CC.1.2.3.F", "CC.1.3.3.F"],
    pssaBridgeTags: ["vocabulary", "word_relationships", "synonyms_antonyms", "shades_of_meaning"],
  }],
]);

const EXPECTED_TOP_LEVEL_COUNTS = new Map([
  ["key_ideas_evidence", 8],
  ["craft_structure", 5],
  ["vocabulary", 5],
  ["conventions", 3],
  ["foundational_support", 1],
  ["writing_tda", 3],
  ["exclude_from_grade3_bridge", 2],
]);

const WRITING_SKILLS = new Set(["Opinion Reasons", "Paragraph Organization", "TDA Evidence and Explanation"]);
const FOUNDATIONAL_SUPPORT_SKILLS = new Set(["Short and Long Vowel Patterns"]);
const EXCLUDED_BRIDGE_SKILLS = new Set(["Pronoun Agreement and Shifts", "Formal and Informal Style"]);

const seeds = buildPrebuiltLessonSeeds();
const gradeThreeSeeds = seeds.filter((seed) => seed.gradeLevel === 3);

assert.equal(gradeThreeSeeds.length, 27, "real Grade 3 lesson set must be 27");
assert.deepEqual(
  gradeThreeSeeds.map((seed) => seed.skill).sort(),
  [...EXPECTED_GRADE3_METADATA.keys()].sort(),
  "Grade 3 lesson list must match the spec exactly",
);

const topLevelCounts = new Map<string, number>();
let reportEligibleCount = 0;
let excludedCount = 0;

for (const seed of gradeThreeSeeds) {
  const expected = EXPECTED_GRADE3_METADATA.get(seed.skill);
  assert.ok(expected, `unexpected Grade 3 lesson: ${seed.skill}`);
  assert.equal(typeof seed.standardCode, "string", `${seed.skill} must retain standardCode`);
  assert.ok(seed.standardCode.length > 0, `${seed.skill} must retain nonempty standardCode`);
  assert.deepEqual(seed.standardCodes, expected.standardCodes, `${seed.skill} standardCodes mismatch`);
  assert.deepEqual(seed.pssaBridgeTags, expected.pssaBridgeTags, `${seed.skill} pssaBridgeTags mismatch`);
  assert.ok(seed.standardCodes && seed.standardCodes.length > 0, `${seed.skill} needs standardCodes`);
  assert.ok(seed.pssaBridgeTags && seed.pssaBridgeTags.length > 0, `${seed.skill} needs pssaBridgeTags`);

  const topLevelIntersection = seed.pssaBridgeTags.filter((tag) => TOP_LEVEL_TAGS.has(tag));
  assert.equal(topLevelIntersection.length, 1, `${seed.skill} must have exactly one top-level bridge tag`);
  assert.equal(seed.pssaBridgeTags[0], topLevelIntersection[0], `${seed.skill} first tag must be the top-level bridge tag`);
  topLevelCounts.set(topLevelIntersection[0], (topLevelCounts.get(topLevelIntersection[0]) ?? 0) + 1);

  const reportClusterIntersection = seed.pssaBridgeTags.filter((tag) => REPORT_CLUSTER_TAGS.has(tag));
  if (WRITING_SKILLS.has(seed.skill) || FOUNDATIONAL_SUPPORT_SKILLS.has(seed.skill) || EXCLUDED_BRIDGE_SKILLS.has(seed.skill)) {
    excludedCount += 1;
    assert.equal(reportClusterIntersection.length, 0, `${seed.skill} must not carry report-cluster tags`);
  } else {
    reportEligibleCount += 1;
    assert.equal(reportClusterIntersection.length, 1, `${seed.skill} must carry exactly one report-cluster tag`);
    assert.equal(reportClusterIntersection[0], topLevelIntersection[0], `${seed.skill} report-cluster tag must be top-level`);
  }
}

assert.equal(reportEligibleCount, 21, "expected 21 report-eligible Grade 3 lessons");
assert.equal(excludedCount, 6, "expected 6 in-library excluded Grade 3 lessons");
for (const [tag, count] of EXPECTED_TOP_LEVEL_COUNTS) {
  assert.equal(topLevelCounts.get(tag) ?? 0, count, `unexpected top-level count for ${tag}`);
}

const vowelPatterns = gradeThreeSeeds.find((seed) => seed.skill === "Short and Long Vowel Patterns");
assert.deepEqual(vowelPatterns?.pssaBridgeTags, ["foundational_support", "vowel_patterns", "phonics"]);
assert.equal(vowelPatterns?.pssaBridgeTags?.includes("vocabulary"), false, "Short and Long Vowel Patterns must no longer be a vocabulary bridge lesson");

const connotation = gradeThreeSeeds.find((seed) => seed.skill === "Connotation and Figurative Language");
assert.ok(connotation, "missing Connotation and Figurative Language lesson");
assert.equal(connotation.pssaBridgeTags?.includes("connotation"), false, "Connotation bridge tags must not include connotation");

assert.ok(
  seeds.some((seed) => seed.gradeLevel >= 4 && seed.pssaBridgeTags === undefined && seed.standardCodes === undefined),
  "grades 4-8 must not be required to carry PSSA bridge metadata",
);

console.log("Grade 3 PSSA lesson metadata coverage:");
for (const seed of [...gradeThreeSeeds].sort((a, b) => a.skill.localeCompare(b.skill))) {
  const topTag = seed.pssaBridgeTags?.find((tag) => TOP_LEVEL_TAGS.has(tag));
  console.log(`${seed.skill} | ${topTag} | ${seed.standardCodes?.join(",")} | ${seed.pssaBridgeTags?.join(",")}`);
}
console.log("Report-eligible lessons: 21; split key_ideas_evidence=8, craft_structure=5, vocabulary=5, conventions=3.");
console.log("Excluded lessons: 6; split foundational_support=1, writing_tda=3, exclude_from_grade3_bridge=2.");
console.log("Grade 3 lesson metadata audit passed: one top-level tag per lesson, excluded lessons carry no report-cluster tags, standardCode retained.");
