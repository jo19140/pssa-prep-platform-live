import assert from "node:assert/strict";

import { buildPrebuiltLessonSeeds } from "../lib/prebuiltLessonLibrary";

const TOP_LEVEL_TAGS = new Set([
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
  "writing_tda",
]);

const REPORT_CLUSTER_TAGS = new Set([
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
]);

const EXPECTED_GRADE3_METADATA = new Map([
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
    pssaBridgeTags: ["vocabulary", "phonics", "vowel_patterns", "foundational"],
  }],
  ["Synonyms and Antonyms", {
    standardCodes: ["CC.1.2.3.F", "CC.1.3.3.F"],
    pssaBridgeTags: ["vocabulary", "word_relationships", "synonyms_antonyms", "shades_of_meaning"],
  }],
]);

const WRITING_SKILLS = new Set(["Opinion Reasons", "Paragraph Organization"]);

const seeds = buildPrebuiltLessonSeeds();
const gradeThreeSeeds = seeds.filter((seed) => seed.gradeLevel === 3);
const taggedGradeThreeSeeds = gradeThreeSeeds.filter(
  (seed) => seed.standardCodes !== undefined || seed.pssaBridgeTags !== undefined,
);

assert.equal(taggedGradeThreeSeeds.length, 18, "exactly the 18 Grade 3 scope-sequence lessons should be tagged");
assert.deepEqual(
  taggedGradeThreeSeeds.map((seed) => seed.skill).sort(),
  [...EXPECTED_GRADE3_METADATA.keys()].sort(),
  "tagged Grade 3 lesson list must match the spec exactly",
);

for (const seed of taggedGradeThreeSeeds) {
  const expected = EXPECTED_GRADE3_METADATA.get(seed.skill);
  assert.ok(expected, `unexpected tagged Grade 3 lesson: ${seed.skill}`);
  assert.equal(typeof seed.standardCode, "string", `${seed.skill} must retain standardCode`);
  assert.ok(seed.standardCode.length > 0, `${seed.skill} must retain nonempty standardCode`);
  assert.deepEqual(seed.standardCodes, expected.standardCodes, `${seed.skill} standardCodes mismatch`);
  assert.deepEqual(seed.pssaBridgeTags, expected.pssaBridgeTags, `${seed.skill} pssaBridgeTags mismatch`);
  assert.ok(seed.standardCodes && seed.standardCodes.length > 0, `${seed.skill} needs standardCodes`);
  assert.ok(seed.pssaBridgeTags && seed.pssaBridgeTags.length > 0, `${seed.skill} needs pssaBridgeTags`);

  const topLevelIntersection = seed.pssaBridgeTags.filter((tag) => TOP_LEVEL_TAGS.has(tag));
  assert.equal(topLevelIntersection.length, 1, `${seed.skill} must have exactly one top-level bridge tag`);
  assert.equal(seed.pssaBridgeTags[0], topLevelIntersection[0], `${seed.skill} first tag must be the top-level bridge tag`);

  const reportClusterIntersection = seed.pssaBridgeTags.filter((tag) => REPORT_CLUSTER_TAGS.has(tag));
  if (WRITING_SKILLS.has(seed.skill)) {
    assert.equal(topLevelIntersection[0], "writing_tda", `${seed.skill} must be tagged writing_tda`);
    assert.equal(reportClusterIntersection.length, 0, `${seed.skill} must not carry report-cluster tags`);
  } else {
    assert.equal(reportClusterIntersection.length, 1, `${seed.skill} must carry exactly one report-cluster tag`);
    assert.equal(reportClusterIntersection[0], topLevelIntersection[0], `${seed.skill} report-cluster tag must be top-level`);
  }
}

const untaggedNonTargetGradeThree = gradeThreeSeeds.filter((seed) => !EXPECTED_GRADE3_METADATA.has(seed.skill));
assert.ok(untaggedNonTargetGradeThree.length > 0, "generic Grade 3 core lessons should remain outside this targeted metadata patch");
assert.ok(
  seeds.some((seed) => seed.gradeLevel >= 4 && seed.pssaBridgeTags === undefined && seed.standardCodes === undefined),
  "grades 4-8 must not be required to carry PSSA bridge metadata",
);

console.log("Grade 3 PSSA lesson metadata coverage:");
for (const seed of [...taggedGradeThreeSeeds].sort((a, b) => a.skill.localeCompare(b.skill))) {
  console.log(`${seed.skill} | ${seed.standardCodes?.join(",")} | ${seed.pssaBridgeTags?.join(",")}`);
}
console.log("Grade 3 tagged lessons: 18; top-level tags valid; writing_tda excluded from report clusters; standardCode retained.");
