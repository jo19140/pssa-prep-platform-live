import assert from "node:assert/strict";
import { buildLessonPlayerData, type EnabledLessonPlayerData } from "@/components/literacy/lessonPlayerData";
import { buildCoachLessonSteps, type CoachLessonStep } from "@/lib/literacy/coachLessonSteps";

const PASSAGE_TEXT =
  'Jake had his last race. He came in late. His face felt hot. "Did I mess up?" Jake said. But Jake did not stop. He set his pace. A pal said, "Jake, get set." Jake felt bad, but he ran on. He ran his best lap and did not fade. Jake ran fast in his lane. He made up the gap. At the end, Jake came in. His pals gave him a wave. Jake was brave. He gave his best.';

const EXPECTED_AE_COACH_STEPS: CoachLessonStep[] = [
  { id: "part1:warmup:0", kind: "warmup_word", partNumber: 1, partLocalIndex: 0, partLocalTotal: 15, taskLocalIndex: 0, taskLocalTotal: 15, payload: { word: "cat", sourceIndex: 0 } },
  { id: "part1:warmup:1", kind: "warmup_word", partNumber: 1, partLocalIndex: 1, partLocalTotal: 15, taskLocalIndex: 1, taskLocalTotal: 15, payload: { word: "ran", sourceIndex: 1 } },
  { id: "part1:warmup:2", kind: "warmup_word", partNumber: 1, partLocalIndex: 2, partLocalTotal: 15, taskLocalIndex: 2, taskLocalTotal: 15, payload: { word: "hand", sourceIndex: 2 } },
  { id: "part1:warmup:3", kind: "warmup_word", partNumber: 1, partLocalIndex: 3, partLocalTotal: 15, taskLocalIndex: 3, taskLocalTotal: 15, payload: { word: "pin", sourceIndex: 3 } },
  { id: "part1:warmup:4", kind: "warmup_word", partNumber: 1, partLocalIndex: 4, partLocalTotal: 15, taskLocalIndex: 4, taskLocalTotal: 15, payload: { word: "did", sourceIndex: 4 } },
  { id: "part1:warmup:5", kind: "warmup_word", partNumber: 1, partLocalIndex: 5, partLocalTotal: 15, taskLocalIndex: 5, taskLocalTotal: 15, payload: { word: "fish", sourceIndex: 5 } },
  { id: "part1:warmup:6", kind: "warmup_word", partNumber: 1, partLocalIndex: 6, partLocalTotal: 15, taskLocalIndex: 6, taskLocalTotal: 15, payload: { word: "top", sourceIndex: 6 } },
  { id: "part1:warmup:7", kind: "warmup_word", partNumber: 1, partLocalIndex: 7, partLocalTotal: 15, taskLocalIndex: 7, taskLocalTotal: 15, payload: { word: "hot", sourceIndex: 7 } },
  { id: "part1:warmup:8", kind: "warmup_word", partNumber: 1, partLocalIndex: 8, partLocalTotal: 15, taskLocalIndex: 8, taskLocalTotal: 15, payload: { word: "dog", sourceIndex: 8 } },
  { id: "part1:warmup:9", kind: "warmup_word", partNumber: 1, partLocalIndex: 9, partLocalTotal: 15, taskLocalIndex: 9, taskLocalTotal: 15, payload: { word: "bug", sourceIndex: 9 } },
  { id: "part1:warmup:10", kind: "warmup_word", partNumber: 1, partLocalIndex: 10, partLocalTotal: 15, taskLocalIndex: 10, taskLocalTotal: 15, payload: { word: "run", sourceIndex: 10 } },
  { id: "part1:warmup:11", kind: "warmup_word", partNumber: 1, partLocalIndex: 11, partLocalTotal: 15, taskLocalIndex: 11, taskLocalTotal: 15, payload: { word: "cup", sourceIndex: 11 } },
  { id: "part1:warmup:12", kind: "warmup_word", partNumber: 1, partLocalIndex: 12, partLocalTotal: 15, taskLocalIndex: 12, taskLocalTotal: 15, payload: { word: "pet", sourceIndex: 12 } },
  { id: "part1:warmup:13", kind: "warmup_word", partNumber: 1, partLocalIndex: 13, partLocalTotal: 15, taskLocalIndex: 13, taskLocalTotal: 15, payload: { word: "red", sourceIndex: 13 } },
  { id: "part1:warmup:14", kind: "warmup_word", partNumber: 1, partLocalIndex: 14, partLocalTotal: 15, taskLocalIndex: 14, taskLocalTotal: 15, payload: { word: "ten", sourceIndex: 14 } },
  {
    id: "part2:rule",
    kind: "rule",
    partNumber: 2,
    partLocalIndex: 0,
    partLocalTotal: 6,
    taskLocalIndex: 0,
    taskLocalTotal: 1,
    payload: { statement: "Silent e changes the vowel to its long sound. When a short word adds silent e, the vowel says its name: cap turns into cape. The e stays silent." },
  },
  { id: "part2:demo:0", kind: "demo_pair", partNumber: 2, partLocalIndex: 1, partLocalTotal: 6, taskLocalIndex: 0, taskLocalTotal: 5, payload: { before: "cap", after: "cape", pairIndex: 0 } },
  { id: "part2:demo:1", kind: "demo_pair", partNumber: 2, partLocalIndex: 2, partLocalTotal: 6, taskLocalIndex: 1, taskLocalTotal: 5, payload: { before: "at", after: "ate", pairIndex: 1 } },
  { id: "part2:demo:2", kind: "demo_pair", partNumber: 2, partLocalIndex: 3, partLocalTotal: 6, taskLocalIndex: 2, taskLocalTotal: 5, payload: { before: "man", after: "mane", pairIndex: 2 } },
  { id: "part2:demo:3", kind: "demo_pair", partNumber: 2, partLocalIndex: 4, partLocalTotal: 6, taskLocalIndex: 3, taskLocalTotal: 5, payload: { before: "tap", after: "tape", pairIndex: 3 } },
  { id: "part2:demo:4", kind: "demo_pair", partNumber: 2, partLocalIndex: 5, partLocalTotal: 6, taskLocalIndex: 4, taskLocalTotal: 5, payload: { before: "hat", after: "hate", pairIndex: 4 } },
  { id: "part3:line1:word0", kind: "real_word", partNumber: 3, partLocalIndex: 0, partLocalTotal: 25, taskLocalIndex: 0, taskLocalTotal: 17, payload: { word: "cake", lineNumber: 1, role: "target_real_words", lineWordIndex: 0, realWordIndex: 0 } },
  { id: "part3:line1:word1", kind: "real_word", partNumber: 3, partLocalIndex: 1, partLocalTotal: 25, taskLocalIndex: 1, taskLocalTotal: 17, payload: { word: "game", lineNumber: 1, role: "target_real_words", lineWordIndex: 1, realWordIndex: 1 } },
  { id: "part3:line1:word2", kind: "real_word", partNumber: 3, partLocalIndex: 2, partLocalTotal: 25, taskLocalIndex: 2, taskLocalTotal: 17, payload: { word: "make", lineNumber: 1, role: "target_real_words", lineWordIndex: 2, realWordIndex: 2 } },
  { id: "part3:line1:word3", kind: "real_word", partNumber: 3, partLocalIndex: 3, partLocalTotal: 25, taskLocalIndex: 3, taskLocalTotal: 17, payload: { word: "same", lineNumber: 1, role: "target_real_words", lineWordIndex: 3, realWordIndex: 3 } },
  { id: "part3:line1:word4", kind: "real_word", partNumber: 3, partLocalIndex: 4, partLocalTotal: 25, taskLocalIndex: 4, taskLocalTotal: 17, payload: { word: "tape", lineNumber: 1, role: "target_real_words", lineWordIndex: 4, realWordIndex: 4 } },
  { id: "part3:line2:word0", kind: "real_word", partNumber: 3, partLocalIndex: 5, partLocalTotal: 25, taskLocalIndex: 5, taskLocalTotal: 17, payload: { word: "cap", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 0, realWordIndex: 5 } },
  { id: "part3:line2:word1", kind: "real_word", partNumber: 3, partLocalIndex: 6, partLocalTotal: 25, taskLocalIndex: 6, taskLocalTotal: 17, payload: { word: "cape", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 1, realWordIndex: 6 } },
  { id: "part3:line2:word2", kind: "real_word", partNumber: 3, partLocalIndex: 7, partLocalTotal: 25, taskLocalIndex: 7, taskLocalTotal: 17, payload: { word: "man", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 2, realWordIndex: 7 } },
  { id: "part3:line2:word3", kind: "real_word", partNumber: 3, partLocalIndex: 8, partLocalTotal: 25, taskLocalIndex: 8, taskLocalTotal: 17, payload: { word: "mane", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 3, realWordIndex: 8 } },
  { id: "part3:line2:word4", kind: "real_word", partNumber: 3, partLocalIndex: 9, partLocalTotal: 25, taskLocalIndex: 9, taskLocalTotal: 17, payload: { word: "hat", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 4, realWordIndex: 9 } },
  { id: "part3:line2:word5", kind: "real_word", partNumber: 3, partLocalIndex: 10, partLocalTotal: 25, taskLocalIndex: 10, taskLocalTotal: 17, payload: { word: "hate", lineNumber: 2, role: "contrastive_target_vs_review", lineWordIndex: 5, realWordIndex: 10 } },
  { id: "part3:line3:word0", kind: "real_word", partNumber: 3, partLocalIndex: 11, partLocalTotal: 25, taskLocalIndex: 11, taskLocalTotal: 17, payload: { word: "ran", lineNumber: 3, role: "cumulative_review", lineWordIndex: 0, realWordIndex: 11 } },
  { id: "part3:line3:word1", kind: "real_word", partNumber: 3, partLocalIndex: 12, partLocalTotal: 25, taskLocalIndex: 12, taskLocalTotal: 17, payload: { word: "lake", lineNumber: 3, role: "cumulative_review", lineWordIndex: 1, realWordIndex: 12 } },
  { id: "part3:line3:word2", kind: "real_word", partNumber: 3, partLocalIndex: 13, partLocalTotal: 25, taskLocalIndex: 13, taskLocalTotal: 17, payload: { word: "hand", lineNumber: 3, role: "cumulative_review", lineWordIndex: 2, realWordIndex: 13 } },
  { id: "part3:line3:word3", kind: "real_word", partNumber: 3, partLocalIndex: 14, partLocalTotal: 25, taskLocalIndex: 14, taskLocalTotal: 17, payload: { word: "fast", lineNumber: 3, role: "cumulative_review", lineWordIndex: 3, realWordIndex: 14 } },
  { id: "part3:line3:word4", kind: "real_word", partNumber: 3, partLocalIndex: 15, partLocalTotal: 25, taskLocalIndex: 15, taskLocalTotal: 17, payload: { word: "name", lineNumber: 3, role: "cumulative_review", lineWordIndex: 4, realWordIndex: 15 } },
  { id: "part3:line3:word5", kind: "real_word", partNumber: 3, partLocalIndex: 16, partLocalTotal: 25, taskLocalIndex: 16, taskLocalTotal: 17, payload: { word: "desk", lineNumber: 3, role: "cumulative_review", lineWordIndex: 5, realWordIndex: 16 } },
  { id: "part3:nonsense:0", kind: "nonsense_word", partNumber: 3, partLocalIndex: 17, partLocalTotal: 25, taskLocalIndex: 0, taskLocalTotal: 8, payload: { word: "zake", wordIndex: 0 } },
  { id: "part3:nonsense:1", kind: "nonsense_word", partNumber: 3, partLocalIndex: 18, partLocalTotal: 25, taskLocalIndex: 1, taskLocalTotal: 8, payload: { word: "mave", wordIndex: 1 } },
  { id: "part3:nonsense:2", kind: "nonsense_word", partNumber: 3, partLocalIndex: 19, partLocalTotal: 25, taskLocalIndex: 2, taskLocalTotal: 8, payload: { word: "pame", wordIndex: 2 } },
  { id: "part3:nonsense:3", kind: "nonsense_word", partNumber: 3, partLocalIndex: 20, partLocalTotal: 25, taskLocalIndex: 3, taskLocalTotal: 8, payload: { word: "vade", wordIndex: 3 } },
  { id: "part3:nonsense:4", kind: "nonsense_word", partNumber: 3, partLocalIndex: 21, partLocalTotal: 25, taskLocalIndex: 4, taskLocalTotal: 8, payload: { word: "sape", wordIndex: 4 } },
  { id: "part3:nonsense:5", kind: "nonsense_word", partNumber: 3, partLocalIndex: 22, partLocalTotal: 25, taskLocalIndex: 5, taskLocalTotal: 8, payload: { word: "nace", wordIndex: 5 } },
  { id: "part3:nonsense:6", kind: "nonsense_word", partNumber: 3, partLocalIndex: 23, partLocalTotal: 25, taskLocalIndex: 6, taskLocalTotal: 8, payload: { word: "gake", wordIndex: 6 } },
  { id: "part3:nonsense:7", kind: "nonsense_word", partNumber: 3, partLocalIndex: 24, partLocalTotal: 25, taskLocalIndex: 7, taskLocalTotal: 8, payload: { word: "tave", wordIndex: 7 } },
  { id: "part4:heart:0", kind: "power_word", partNumber: 4, partLocalIndex: 0, partLocalTotal: 11, taskLocalIndex: 0, taskLocalTotal: 11, payload: { word: "said", group: "heart", index: 0 } },
  { id: "part4:heart:1", kind: "power_word", partNumber: 4, partLocalIndex: 1, partLocalTotal: 11, taskLocalIndex: 1, taskLocalTotal: 11, payload: { word: "was", group: "heart", index: 1 } },
  { id: "part4:heart:2", kind: "power_word", partNumber: 4, partLocalIndex: 2, partLocalTotal: 11, taskLocalIndex: 2, taskLocalTotal: 11, payload: { word: "they", group: "heart", index: 2 } },
  { id: "part4:heart:3", kind: "power_word", partNumber: 4, partLocalIndex: 3, partLocalTotal: 11, taskLocalIndex: 3, taskLocalTotal: 11, payload: { word: "I", group: "heart", index: 3 } },
  { id: "part4:heart:4", kind: "power_word", partNumber: 4, partLocalIndex: 4, partLocalTotal: 11, taskLocalIndex: 4, taskLocalTotal: 11, payload: { word: "a", group: "heart", index: 4 } },
  { id: "part4:heart:5", kind: "power_word", partNumber: 4, partLocalIndex: 5, partLocalTotal: 11, taskLocalIndex: 5, taskLocalTotal: 11, payload: { word: "the", group: "heart", index: 5 } },
  { id: "part4:heart:6", kind: "power_word", partNumber: 4, partLocalIndex: 6, partLocalTotal: 11, taskLocalIndex: 6, taskLocalTotal: 11, payload: { word: "to", group: "heart", index: 6 } },
  { id: "part4:heart:7", kind: "power_word", partNumber: 4, partLocalIndex: 7, partLocalTotal: 11, taskLocalIndex: 7, taskLocalTotal: 11, payload: { word: "he", group: "heart", index: 7 } },
  { id: "part4:vocab:0", kind: "power_word", partNumber: 4, partLocalIndex: 8, partLocalTotal: 11, taskLocalIndex: 8, taskLocalTotal: 11, payload: { word: "brave", group: "vocab", index: 0 } },
  { id: "part4:vocab:1", kind: "power_word", partNumber: 4, partLocalIndex: 9, partLocalTotal: 11, taskLocalIndex: 9, taskLocalTotal: 11, payload: { word: "pace", group: "vocab", index: 1 } },
  { id: "part4:vocab:2", kind: "power_word", partNumber: 4, partLocalIndex: 10, partLocalTotal: 11, taskLocalIndex: 10, taskLocalTotal: 11, payload: { word: "gap", group: "vocab", index: 2 } },
  { id: "part5:sentence:0", kind: "sentence", partNumber: 5, partLocalIndex: 0, partLocalTotal: 6, taskLocalIndex: 0, taskLocalTotal: 6, payload: { text: "Jake ran his last race.", index: 0 } },
  { id: "part5:sentence:1", kind: "sentence", partNumber: 5, partLocalIndex: 1, partLocalTotal: 6, taskLocalIndex: 1, taskLocalTotal: 6, payload: { text: "He set a fast pace.", index: 1 } },
  { id: "part5:sentence:2", kind: "sentence", partNumber: 5, partLocalIndex: 2, partLocalTotal: 6, taskLocalIndex: 2, taskLocalTotal: 6, payload: { text: "Jake gave it his best.", index: 2 } },
  { id: "part5:sentence:3", kind: "sentence", partNumber: 5, partLocalIndex: 3, partLocalTotal: 6, taskLocalIndex: 3, taskLocalTotal: 6, payload: { text: "His pals gave a wave.", index: 3 } },
  { id: "part5:sentence:4", kind: "sentence", partNumber: 5, partLocalIndex: 4, partLocalTotal: 6, taskLocalIndex: 4, taskLocalTotal: 6, payload: { text: "Jake was brave.", index: 4 } },
  { id: "part5:sentence:5", kind: "sentence", partNumber: 5, partLocalIndex: 5, partLocalTotal: 6, taskLocalIndex: 5, taskLocalTotal: 6, payload: { text: "He made up the gap.", index: 5 } },
  { id: "part6:spell:0", kind: "spell_word", partNumber: 6, partLocalIndex: 0, partLocalTotal: 6, taskLocalIndex: 0, taskLocalTotal: 6, payload: { word: "cape", index: 0 } },
  { id: "part6:spell:1", kind: "spell_word", partNumber: 6, partLocalIndex: 1, partLocalTotal: 6, taskLocalIndex: 1, taskLocalTotal: 6, payload: { word: "made", index: 1 } },
  { id: "part6:spell:2", kind: "spell_word", partNumber: 6, partLocalIndex: 2, partLocalTotal: 6, taskLocalIndex: 2, taskLocalTotal: 6, payload: { word: "lake", index: 2 } },
  { id: "part6:spell:3", kind: "spell_word", partNumber: 6, partLocalIndex: 3, partLocalTotal: 6, taskLocalIndex: 3, taskLocalTotal: 6, payload: { word: "game", index: 3 } },
  { id: "part6:spell:4", kind: "spell_word", partNumber: 6, partLocalIndex: 4, partLocalTotal: 6, taskLocalIndex: 4, taskLocalTotal: 6, payload: { word: "gave", index: 4 } },
  { id: "part6:spell:5", kind: "spell_word", partNumber: 6, partLocalIndex: 5, partLocalTotal: 6, taskLocalIndex: 5, taskLocalTotal: 6, payload: { word: "brave", index: 5 } },
  { id: "part7:passage", kind: "passage", partNumber: 7, partLocalIndex: 0, partLocalTotal: 1, taskLocalIndex: 0, taskLocalTotal: 1, payload: { title: "Jake at the Race", text: PASSAGE_TEXT, listenFirstAllowed: true, readOnOwnAllowed: true } },
  { id: "part8:question:0", kind: "reflect", partNumber: 8, partLocalIndex: 0, partLocalTotal: 4, taskLocalIndex: 0, taskLocalTotal: 4, payload: { question: "Why did Jake feel he messed up at the start?", questionType: "inference", index: 0 } },
  { id: "part8:question:1", kind: "reflect", partNumber: 8, partLocalIndex: 1, partLocalTotal: 4, taskLocalIndex: 1, taskLocalTotal: 4, payload: { question: "How do you know Jake did not give up?", questionType: "literal", index: 1 } },
  { id: "part8:question:2", kind: "reflect", partNumber: 8, partLocalIndex: 2, partLocalTotal: 4, taskLocalIndex: 2, taskLocalTotal: 4, payload: { question: "Tell what happened at the end, in your own words.", questionType: "retell", index: 2 } },
  { id: "part8:question:3", kind: "reflect", partNumber: 8, partLocalIndex: 3, partLocalTotal: 4, taskLocalIndex: 3, taskLocalTotal: 4, payload: { question: "Tell about a time you kept going after a setback.", questionType: "personal_connection", index: 3 } },
];

async function main() {
  const band78Data = await requireEnabledData("BAND_7_8");
  assert.equal(band78Data.title, "Jake at the Race Lesson");
  assert.equal(band78Data.presentationProfile, "BAND_7_8");

  const steps = buildCoachLessonSteps(band78Data);
  assert.deepStrictEqual(steps, EXPECTED_AE_COACH_STEPS);
  assertCountSnapshot(steps);
  assertPart3Sequence(band78Data);
  assertQuestionTypes(band78Data);
  assertProgressMetadata(steps);
  assert.equal(steps.at(-1)?.id, "part8:question:3");
  assert.equal(steps.some((step) => (step as { kind: string }).kind === "complete"), false);

  const bandK3Data = await requireEnabledData("BAND_K_3");
  assert.doesNotThrow(() => buildCoachLessonSteps(bandK3Data));

  assertDoesNotMutate(band78Data);
  assertDuplicateWordsRemainDistinct(band78Data);
  assertMalformedCases(band78Data);

  console.log("CoachLessonStep model tests passed.");
}

async function requireEnabledData(presentationProfile: "BAND_7_8" | "BAND_K_3"): Promise<EnabledLessonPlayerData> {
  const data = await buildLessonPlayerData("a_e", { presentationProfile });
  assert.equal(data.enabled, true);
  return data;
}

function assertCountSnapshot(steps: CoachLessonStep[]) {
  assert.deepStrictEqual(countByKind(steps), {
    warmup_word: 15,
    rule: 1,
    demo_pair: 5,
    real_word: 17,
    nonsense_word: 8,
    power_word: 11,
    sentence: 6,
    spell_word: 6,
    passage: 1,
    reflect: 4,
  });
  assert.equal(steps.length, 74);
}

function assertPart3Sequence(data: EnabledLessonPlayerData) {
  const part3 = data.parts[2];
  assert.deepStrictEqual(
    (part3.contentJson.contrastiveLines as Array<{ lineNumber: number; role: string }>).map((line) => ({
      lineNumber: line.lineNumber,
      role: line.role,
    })),
    [
      { lineNumber: 1, role: "target_real_words" },
      { lineNumber: 2, role: "contrastive_target_vs_review" },
      { lineNumber: 3, role: "cumulative_review" },
      { lineNumber: 4, role: "target_pseudowords" },
    ],
  );
}

function assertQuestionTypes(data: EnabledLessonPlayerData) {
  const part8 = data.parts[7];
  assert.deepStrictEqual(part8.contentJson.questionTypes, ["inference", "literal", "retell", "personal_connection"]);
}

function assertProgressMetadata(steps: CoachLessonStep[]) {
  const byPart = new Map<number, CoachLessonStep[]>();
  steps.forEach((step) => {
    byPart.set(step.partNumber, [...(byPart.get(step.partNumber) ?? []), step]);
  });
  byPart.forEach((partSteps) => {
    const partLocalTotal = partSteps[0].partLocalTotal;
    assert.equal(partSteps.length, partLocalTotal);
    partSteps.forEach((step, index) => {
      assert.equal(step.partLocalIndex, index);
      assert.equal(step.partLocalTotal, partLocalTotal);
    });
  });

  assert.deepStrictEqual(
    steps.filter((step) => step.partNumber === 2).map((step) => [step.id, step.partLocalIndex, step.partLocalTotal]),
    [
      ["part2:rule", 0, 6],
      ["part2:demo:0", 1, 6],
      ["part2:demo:1", 2, 6],
      ["part2:demo:2", 3, 6],
      ["part2:demo:3", 4, 6],
      ["part2:demo:4", 5, 6],
    ],
  );
  assert.deepStrictEqual(
    steps.filter((step) => step.partNumber === 3).map((step) => [step.id, step.partLocalIndex, step.partLocalTotal]),
    [
      ...Array.from({ length: 17 }, (_, index) => [steps[21 + index].id, index, 25]),
      ...Array.from({ length: 8 }, (_, index) => [`part3:nonsense:${index}`, 17 + index, 25]),
    ],
  );

  const expectedTaskTotals: Record<CoachLessonStep["kind"], number> = {
    warmup_word: 15,
    rule: 1,
    demo_pair: 5,
    real_word: 17,
    nonsense_word: 8,
    power_word: 11,
    sentence: 6,
    spell_word: 6,
    passage: 1,
    reflect: 4,
  };
  steps.forEach((step) => {
    assert.equal(step.taskLocalTotal, expectedTaskTotals[step.kind]);
  });
}

function assertDoesNotMutate(data: EnabledLessonPlayerData) {
  const clone = cloneData(data);
  const before = JSON.stringify(clone);
  deepFreeze(clone);
  assert.doesNotThrow(() => buildCoachLessonSteps(clone));
  assert.equal(JSON.stringify(clone), before);
}

function assertDuplicateWordsRemainDistinct(data: EnabledLessonPlayerData) {
  const clone = cloneData(data);
  const line1 = (clone.parts[2].contentJson.contrastiveLines as any[])[0];
  line1.words.push("cake");
  const duplicateSteps = buildCoachLessonSteps(clone).flatMap((step) =>
    step.kind === "real_word" && step.payload.word === "cake" && step.payload.lineNumber === 1 ? [step] : [],
  );
  assert.deepStrictEqual(
    duplicateSteps.map((step) => [step.id, step.payload.lineWordIndex, step.payload.realWordIndex]),
    [
      ["part3:line1:word0", 0, 0],
      ["part3:line1:word5", 5, 5],
    ],
  );
}

function assertMalformedCases(data: EnabledLessonPlayerData) {
  expectThrow(data, "missing Part 4", (clone) => clone.parts.splice(3, 1));
  expectThrow(data, "duplicate Part 4", (clone) => clone.parts.splice(3, 0, clone.parts[3]));
  expectThrow(data, "reordered parts", (clone) => ([clone.parts[0], clone.parts[1]] = [clone.parts[1], clone.parts[0]]));
  expectThrow(data, "unexpected Part 9", (clone) => clone.parts.push({ ...clone.parts[0], partNumber: 9, partType: "EXTRA" }));
  expectThrow(data, "wrong partType", (clone) => (clone.parts[0].partType = "WRONG"));
  expectThrow(data, "unknown Part 3 role", (clone) => (((clone.parts[2].contentJson.contrastiveLines as any[])[0].role = "unknown")));
  expectThrow(data, "reordered Part 3 role", (clone) => {
    const lines = clone.parts[2].contentJson.contrastiveLines as any[];
    [lines[0], lines[1]] = [lines[1], lines[0]];
  });
  expectThrow(data, "duplicate Part 3 role", (clone) => (((clone.parts[2].contentJson.contrastiveLines as any[])[1].role = "target_real_words")));
  expectThrow(data, "duplicate Part 3 line number", (clone) => (((clone.parts[2].contentJson.contrastiveLines as any[])[1].lineNumber = 1)));
  expectThrow(data, "whitespace-only required string", (clone) => (((clone.parts[0].contentJson.warmupWords as any[])[0] = "   ")));
  expectThrow(data, "mixed string/null array member", (clone) => (((clone.parts[0].contentJson.warmupWords as any[])[1] = null)));
  expectThrow(data, "non-boolean Part 7 flag", (clone) => (clone.parts[6].contentJson.listenFirstAllowed = "true"));
  expectThrow(data, "fractional lineNumber", (clone) => (((clone.parts[2].contentJson.contrastiveLines as any[])[0].lineNumber = 1.5)));
  expectThrow(data, "non-number lineNumber", (clone) => (((clone.parts[2].contentJson.contrastiveLines as any[])[0].lineNumber = "1")));
  expectThrow(data, "missing questionType", (clone) => delete (clone.parts[7].contentJson.questions as any[])[0].questionType);
  expectThrow(data, "questionTypes length mismatch", (clone) => (clone.parts[7].contentJson.questionTypes as any[]).pop());
  expectThrow(data, "questionTypes value mismatch", (clone) => (((clone.parts[7].contentJson.questionTypes as any[])[0] = "literal")));
  expectThrow(data, "missing passage title", (clone) => (clone.parts[6].kidVisibleCopy.title = ""));
  expectThrow(data, "unsupported examples_only demoMode", (clone) => (clone.parts[1].contentJson.demoMode = "examples_only"));
  expectThrow(data, "unsupported transformation_pairs demoMode", (clone) => (clone.parts[1].contentJson.demoMode = "transformation_pairs"));
  expectThrow(data, "empty required array", (clone) => (clone.parts[4].contentJson.sentences = []));
}

function expectThrow(data: EnabledLessonPlayerData, label: string, mutate: (clone: EnabledLessonPlayerData) => void) {
  const clone = cloneData(data);
  mutate(clone);
  assert.throws(() => buildCoachLessonSteps(clone), Error, label);
}

function countByKind(steps: CoachLessonStep[]) {
  return steps.reduce<Record<string, number>>((counts, step) => {
    counts[step.kind] = (counts[step.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function cloneData(data: EnabledLessonPlayerData): EnabledLessonPlayerData {
  return JSON.parse(JSON.stringify(data));
}

function deepFreeze(value: unknown): unknown {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach((entry) => deepFreeze(entry));
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
