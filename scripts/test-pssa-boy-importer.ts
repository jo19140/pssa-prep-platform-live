import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import {
  GRADE3_BOY_IMPORT_MANIFEST,
  buildBoyPlan,
  buildEoyPlan,
  buildMoyPlan,
  buildPlan,
  buildPlanForBenchmark,
  stableStringify,
  type ImportPlan,
  type WouldImportItem,
} from "./content/lib/pssa-import-plan";
import { parseArgs } from "./content/write-pssa-items";
import { benchmarkForBatchId, currentPlanSourceCorpusHash } from "../lib/content/pssaItemReview";

const EXPECTED_TYPE_COUNTS: Record<string, number> = {
  MCQ: 29,
  EBSR: 4,
  SHORT_ANSWER: 4,
  MATCHING_GRID: 1,
  DRAG_DROP: 1,
};

const EXPECTED_BATCHES = [
  { streamType: "MCQ reading", batchId: "reading_mcq_grade3_boy", expectedCount: 20 },
  { streamType: "MCQ conventions", batchId: "conventions_grade3_boy", expectedCount: 9 },
  { streamType: "EBSR", batchId: "ebsr_grade3_boy", expectedCount: 4 },
  { streamType: "MATCHING_GRID", batchId: "matching_grid_grade3_boy", expectedCount: 1 },
  { streamType: "DRAG_DROP", batchId: "drag_drop_grade3_boy", expectedCount: 1 },
  { streamType: "SHORT_ANSWER", batchId: "short_answer_grade3_boy", expectedCount: 4 },
];

const BOY_BACKEND_FILES = [
  "exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/rabbit_drama_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json",
];

function countByType(items: WouldImportItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.interactionType] = (counts[item.interactionType] ?? 0) + 1;
  return counts;
}

function countByBatch(items: WouldImportItem[]) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item.batchId] = (counts[item.batchId] ?? 0) + 1;
  return counts;
}

function corpusHashForPlan(plan: ImportPlan) {
  return stableStringify([
    ...plan.passages.map((row) => row.contentHash),
    ...plan.activeItems.map((row) => row.contentHash),
    ...plan.deprecatedItems.map((row) => row.contentHash),
  ].sort());
}

function planSignature(plan: ImportPlan) {
  return stableStringify({
    passages: plan.passages.map((row) => [row.passageId, row.contentHash]).sort(),
    groups: plan.passageGroups.map((row) => [
      row.groupId,
      row.contentHash,
      row.members.map((member) => [member.slot, member.passageId, member.passageContentHashSnapshot]),
    ]).sort(),
    items: plan.activeItems.map((row) => [row.itemId, row.contentHash, row.batchId, row.finalImportEligibility]).sort(),
    deprecated: plan.deprecatedItems.map((row) => [row.itemId, row.contentHash]).sort(),
    supersessions: plan.supersessions.map((row) => [row.oldItemId, row.newItemId, row.reason]).sort(),
    batches: plan.batches.map((row) => [row.batchId, row.streamType, row.itemCount, row.batchResult]).sort(),
    manifest: plan.manifest.map((row) => [row.recordType, row.count, row.expectedCount, row.match]).sort(),
    sourceScanFailures: plan.sourceScanFailures,
    hashStable: plan.hashStable,
  });
}

function failingGates(item: WouldImportItem) {
  return Object.entries(item.gates).filter(([, status]) => status === "FAIL").map(([gate]) => gate);
}

function streamReport(plan: ImportPlan) {
  return EXPECTED_BATCHES.map((row) => {
    const batch = plan.batches.find((candidate) => candidate.batchId === row.batchId);
    const items = plan.activeItems.filter((item) => item.batchId === row.batchId);
    return {
      ...row,
      auditReused: "schema-aware benchmark checks",
      itemLevelResults: true,
      actualCount: items.length,
      batchResult: batch?.batchResult,
      blocked: items.filter((item) => item.finalImportEligibility !== "eligible").map((item) => ({
        itemId: item.itemId,
        failedGates: failingGates(item),
        correctResponseJson: item.correctResponseJson,
        responseSpecJson: item.responseSpecJson,
      })),
      failedGateCount: items.reduce((sum, item) => sum + failingGates(item).length, 0),
    };
  });
}

function assertBoyPlan(plan: ImportPlan) {
  assert.equal(plan.passages.length, 5);
  assert.deepEqual(plan.passages.map((row) => row.passageId).sort(), [
    "pssa_stamina_psg_g3_boat_literary",
    "pssa_stamina_psg_g3_owls_p1_night",
    "pssa_stamina_psg_g3_owls_p2_barn",
    "pssa_stamina_psg_g3_rabbit_drama",
    "pssa_stamina_psg_g3_syrup_v4",
  ]);
  assert.equal(plan.passageGroups.length, 1);
  assert.equal(plan.passageGroups[0]?.groupId, "pssa_pg_g3_owls_paired_01");
  assert.deepEqual(plan.passageGroups[0]?.members.map((member) => [member.slot, member.passageId]), [
    ["passage_1", "pssa_stamina_psg_g3_owls_p1_night"],
    ["passage_2", "pssa_stamina_psg_g3_owls_p2_barn"],
  ]);
  assert.equal(plan.activeItems.length, 39);
  assert.equal(plan.deprecatedItems.length, 0);
  assert.equal(plan.supersessions.length, 0);
  assert.equal(plan.batches.length, 6);
  assert.equal(plan.sourceScanFailures, 0);
  assert.equal(plan.hashStable, true);
  assert.deepEqual(countByType(plan.activeItems), EXPECTED_TYPE_COUNTS);
  assert.deepEqual(countByBatch(plan.activeItems), {
    reading_mcq_grade3_boy: 20,
    conventions_grade3_boy: 9,
    ebsr_grade3_boy: 4,
    matching_grid_grade3_boy: 1,
    drag_drop_grade3_boy: 1,
    short_answer_grade3_boy: 4,
  });
  assert.equal(plan.manifest.every((row) => row.match), true, "BOY manifest rows must match expected counts");
  assert.equal(plan.batches.every((batch) => batch.batchResult === "PASS"), true, "BOY batch gates must pass");

  const mcqWithoutRawCorrectResponse = plan.activeItems.filter((item) => item.interactionType === "MCQ");
  assert.equal(mcqWithoutRawCorrectResponse.length, 29);
  for (const item of mcqWithoutRawCorrectResponse) {
    assert.equal(item.gates.PSSA_BOY_IMPORT_CORRECT_RESPONSE_VALID, "PASS", `${item.itemId} older MCQ correctIndex shape must validate`);
    assert.equal(typeof (item.correctResponseJson as any).correctIndex, "number", `${item.itemId} must persist derived correctResponseJson.correctIndex`);
  }

  const shortAnswers = plan.activeItems.filter((item) => item.interactionType === "SHORT_ANSWER");
  assert.equal(shortAnswers.length, 4);
  for (const item of shortAnswers) {
    const correct = item.correctResponseJson as any;
    assert.equal(item.gates.PSSA_BOY_IMPORT_CORRECT_RESPONSE_VALID, "PASS", `${item.itemId} older short-answer shape must validate`);
    assert.equal(typeof correct.expectedAnswerCore, "string", `${item.itemId} must retain expectedAnswerCore`);
    assert(Array.isArray(correct.acceptableTextSupport) && correct.acceptableTextSupport.length > 0, `${item.itemId} must retain acceptableTextSupport`);
  }

  for (const item of plan.activeItems) {
    assert.equal(item.ecResolved, true, `${item.itemId} must resolve against the crosswalk`);
    assert.equal(item.finalImportEligibility, "eligible", `${item.itemId} must be import-eligible: ${JSON.stringify({ gates: item.gates, correctResponseJson: item.correctResponseJson, responseSpecJson: item.responseSpecJson })}`);
    assert.deepEqual(item.blockedReasons, [], `${item.itemId} must have no blocked import reasons`);
    assert.deepEqual(failingGates(item), [], `${item.itemId} must have no failing import gates`);
  }
}

function assertNoFoundationStreamAuditsInBenchmarkPath() {
  const source = fs.readFileSync("scripts/content/lib/pssa-import-plan.ts", "utf8");
  const start = source.indexOf("function buildDiagnosticBenchmarkPlan");
  const end = source.indexOf("export function buildEoyPlan", start);
  assert.notEqual(start, -1, "buildDiagnosticBenchmarkPlan must exist");
  assert.notEqual(end, -1, "buildEoyPlan must follow buildDiagnosticBenchmarkPlan");
  const body = source.slice(start, end);
  for (const forbidden of [
    "manifestConfig.audits",
    "auditGrade3EbsrItems",
    "auditGrade3ConventionsItems",
    "auditGrade3MatchingGridDragDropItems",
    "auditGrade3ShortAnswerItems",
    "auditGrade3TeiItems",
  ]) {
    assert.equal(body.includes(forbidden), false, `diagnostic benchmark build path must not call ${forbidden}`);
  }
  assert.equal(source.includes("withInheritedBenchmarkGovernance"), false, "BOY importer must not inherit governance from passages");
  assert.equal(source.includes("benchmark === \"boy\" ||"), false, "BOY license gate must require its own benchmarkSeason");
  assert.equal(source.includes("buildPssaResponseSpec(item) !== undefined"), false, "benchmark required-fields gate must read item.responseSpecJson");
  assert.match(source, /item\.responseSpecJson !== undefined/);
  assert.match(source, /item\.scoringJson !== undefined/);
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readOriginJson(file: string) {
  return JSON.parse(execFileSync("git", ["show", `b760e34eed8bfc92d481e6e6d94c77c82177436d:${file}`], { encoding: "utf8" }));
}

function allBoyItems() {
  return BOY_BACKEND_FILES.flatMap((file) => (readJson(file).items ?? []).map((item: any) => ({ ...item, __file: file })));
}

function assertPromotionComplete() {
  const items = allBoyItems();
  assert.equal(items.length, 39, "promotion audit must cover all 39 stamina items");
  for (const file of BOY_BACKEND_FILES) {
    const backend = readJson(file);
    assert.equal(backend.productionImportReady, true, `${file} must be productionImportReady`);
    assert.equal(backend.fixtureOnly, undefined, `${file} must not retain a backend-level fixtureOnly flag`);
    assert.equal(backend.noDbWrite, undefined, `${file} must not retain a backend-level noDbWrite flag`);
    assert.equal(JSON.stringify(backend.items ?? []).includes("\"fixtureOnly\":true"), false, `${file} items must not retain fixtureOnly:true`);
    assert.equal(JSON.stringify(backend.items ?? []).includes("\"noDbWrite\":true"), false, `${file} items must not retain noDbWrite:true`);
  }
  for (const item of items) {
    assert.equal(item.sourceType, "internal_original", `${item.id} must carry sourceType`);
    assert.equal(item.licenseStatus, "cleared_internal_original", `${item.id} must carry licenseStatus`);
    assert.equal(item.commercialUseAllowed, true, `${item.id} must allow commercial use`);
    assert.equal(item.needsLegalReview, false, `${item.id} must not need legal review`);
    assert.equal(item.reviewStatus, "PENDING", `${item.id} must carry reviewStatus`);
    assert.equal(item.itemStatus, "candidate", `${item.id} must carry itemStatus`);
    assert.equal(item.provenanceJson?.benchmarkSeason, "BOY", `${item.id} must carry BOY benchmarkSeason`);
    assert.equal(item.fixtureOnly, undefined, `${item.id} must not retain fixtureOnly`);
    assert.equal(item.noDbWrite, undefined, `${item.id} must not retain noDbWrite`);
    assert.equal(typeof item.pointValue, "number", `${item.id} must carry pointValue`);
    assert.equal(typeof item.scoringJson?.totalPoints, "number", `${item.id} must carry scoringJson.totalPoints`);
    assert.equal(item.scoringJson.totalPoints, item.pointValue, `${item.id} points must match scoring total`);
    assert(item.responseSpecJson && typeof item.responseSpecJson === "object", `${item.id} must carry responseSpecJson`);
  }
  const owls06 = items.find((item) => item.id === "pssa_stamina_item_g3_owls_06");
  assert.equal(typeof owls06?.correctResponseJson?.expectedAnswerCore, "string", "owls_06 must carry expectedAnswerCore");
  assert.equal(owls06?.correctResponseJson?.acceptableTextSupport?.length, 2, "owls_06 must carry two support anchors");
  const owlsBackend = readJson("exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json");
  const bySlot = new Map<string, string>();
  for (const member of owlsBackend.passageGroups[0].members) bySlot.set(member.slot, member.passage.text);
  for (const support of owls06.correctResponseJson.acceptableTextSupport) {
    assert.equal(bySlot.get(support.passageSlot)?.includes(support.quotedSpan), true, `${support.supportId} quotedSpan must be verbatim`);
  }
  const rabbit06 = items.find((item) => item.id === "pssa_stamina_item_g3_rabbit_06");
  assert.equal(rabbit06?.eligibleContent, "E03.A-K.1.1.2", "rabbit_06 must be revised to the valid central-message EC");
  assert.equal(rabbit06?.studentFacingPrompt, "What lesson is best shown by what happens in Scene 3?");
  assert.deepEqual(rabbit06?.answerChoicesJson, [
    "A strong storm can ruin the homes that small animals build.",
    "Sharing what you have can make things better for everyone.",
    "It is best to keep your home to yourself so it stays just right.",
    "An animal with prickles should face toward the wall.",
  ]);
  assert.equal(rabbit06?.correctIndex, 1);
}

function pickChoiceShape(choice: any) {
  return {
    text: choice?.text,
    isCorrect: choice?.isCorrect,
    distractorRole: choice?.distractorRole ?? null,
  };
}

function comparableContent(item: any) {
  return {
    studentFacingPrompt: item.studentFacingPrompt,
    stem: item.stem,
    prompt: item.prompt,
    baseTextWithBlanks: item.baseTextWithBlanks,
    answerChoicesJson: item.answerChoicesJson,
    choices: item.choices,
    structuredChoicesJson: Array.isArray(item.structuredChoicesJson) ? item.structuredChoicesJson.map(pickChoiceShape) : item.structuredChoicesJson,
    correctIndex: item.correctIndex,
    correctIndices: item.correctIndices,
    correctCells: item.correctCells,
    correctAssignments: item.correctAssignments,
    blanks: Array.isArray(item.blanks) ? item.blanks.map((blank: any) => ({
      blankId: blank.blankId,
      correctIndex: blank.correctIndex,
      options: blank.options?.map((option: any) => ({ text: option.text, errorPattern: option.errorPattern })),
    })) : item.blanks,
    rows: Array.isArray(item.rows) ? item.rows.map((row: any) => ({
      rowId: row.rowId,
      text: row.text,
      correctColumnId: row.correctColumnId,
    })) : item.rows,
    columns: item.columns,
    tokens: item.tokens,
    targets: item.targets,
  };
}

function normalizeJuneClause(text: string) {
  return text.replace(
    "So when I, June Reyes, signed up for this year's race,",
    "So when I signed up for this year's race,",
  );
}

function normalizeBoatJuneEvidenceShift(value: any) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) normalizeBoatJuneEvidenceShift(entry);
    return;
  }
  if (value.quotedSpan === "So when I, June Reyes, signed up for this year's race, people smiled at me the way you smile at a puppy trying to climb a tall set of stairs.") {
    value.quotedSpan = "So when I signed up for this year's race, people smiled at me the way you smile at a puppy trying to climb a tall set of stairs.";
  }
  for (const key of ["startChar", "endChar"]) {
    if (typeof value[key] === "number" && value[key] > 205) value[key] -= 13;
  }
  for (const child of Object.values(value)) normalizeBoatJuneEvidenceShift(child);
}

function comparableContentWithAuthorizedJuneShift(item: any) {
  const comparable = comparableContent(item);
  const normalized = structuredClone(comparable);
  normalizeBoatJuneEvidenceShift(normalized);
  return normalized;
}

function assertNoContentDrift() {
  for (const file of BOY_BACKEND_FILES) {
    const before = readOriginJson(file);
    const after = readJson(file);
    const beforePassages = [
      ...(before.passages ?? []),
      ...(before.passageGroups ?? []).flatMap((group: any) => (group.members ?? []).map((member: any) => member.passage).filter(Boolean)),
    ];
    const afterPassages = [
      ...(after.passages ?? []),
      ...(after.passageGroups ?? []).flatMap((group: any) => (group.members ?? []).map((member: any) => member.passage).filter(Boolean)),
    ];
    const afterPassageById = new Map(afterPassages.map((passage: any) => [passage.id, passage]));
    for (const passage of beforePassages) {
      const afterText = afterPassageById.get(passage.id)?.text;
      if (passage.id === "pssa_stamina_psg_g3_boat_literary") {
        assert.equal(normalizeJuneClause(afterText), passage.text, `${passage.id} passage text may only add the authorized June Reyes clause`);
      } else {
        assert.equal(afterText, passage.text, `${passage.id} passage text must not drift`);
      }
    }

    const afterItemById = new Map((after.items ?? []).map((item: any) => [item.id, item]));
    for (const beforeItem of before.items ?? []) {
      const afterItem = afterItemById.get(beforeItem.id) as any;
      assert(afterItem, `${beforeItem.id} must still exist`);
      if (beforeItem.id === "pssa_stamina_item_g3_rabbit_06") {
        assert.equal(beforeItem.eligibleContent, "E03.A-C.2.1.2");
        assert.equal(afterItem.eligibleContent, "E03.A-K.1.1.2");
        assert.deepEqual(comparableContent(afterItem), {
          ...comparableContent(beforeItem),
          studentFacingPrompt: "What lesson is best shown by what happens in Scene 3?",
          answerChoicesJson: [
            "A strong storm can ruin the homes that small animals build.",
            "Sharing what you have can make things better for everyone.",
            "It is best to keep your home to yourself so it stays just right.",
            "An animal with prickles should face toward the wall.",
          ],
          structuredChoicesJson: [
            { text: "A strong storm can ruin the homes that small animals build.", isCorrect: false, distractorRole: "wrong_emphasis" },
            { text: "Sharing what you have can make things better for everyone.", isCorrect: true, distractorRole: null },
            { text: "It is best to keep your home to yourself so it stays just right.", isCorrect: false, distractorRole: "opposite_claim" },
            { text: "An animal with prickles should face toward the wall.", isCorrect: false, distractorRole: "too_narrow" },
          ],
        }, "rabbit_06 must change only by the authorized full item revision");
      } else {
        assert.equal(afterItem.eligibleContent, beforeItem.eligibleContent, `${beforeItem.id} EC must not drift`);
        const afterComparable = file.endsWith("boat_literary_released_length.json")
          ? comparableContentWithAuthorizedJuneShift(afterItem)
          : comparableContent(afterItem);
        assert.deepEqual(afterComparable, comparableContent(beforeItem), `${beforeItem.id} stem/choices/key content must not drift`);
      }
      if (beforeItem.id === "pssa_stamina_item_g3_owls_06") {
        assert.equal(typeof afterItem.correctResponseJson?.expectedAnswerCore, "string");
      } else {
        assert.deepEqual(afterItem.correctResponseJson, beforeItem.correctResponseJson, `${beforeItem.id} correctResponseJson must not drift except owls_06`);
      }
    }
  }
}

function assertSelector() {
  assert.equal(parseArgs(["--grade", "3"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "foundation"]).benchmark, "foundation");
  assert.equal(parseArgs(["--grade", "3", "--benchmark=eoy"]).benchmark, "eoy");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "moy"]).benchmark, "moy");
  assert.equal(parseArgs(["--grade", "3", "--benchmark", "boy"]).benchmark, "boy");
  assert.throws(() => parseArgs(["--grade", "3", "--benchmark", "winter"]), /Unsupported --benchmark: winter\..*boy/);

  assert.equal(parseArgs(["--grade", "3", "--benchmark", "boy", "--write", "--env", "dev"]).benchmark, "boy");
  assertBoyPlan(buildPlanForBenchmark({ grade: 3, benchmark: "boy" }));
  assert.throws(() => buildPlanForBenchmark({ grade: 4, benchmark: "boy" }), /No PSSA boy import manifest registered for grade 4\./);
}

function assertNoWriteDryRun() {
  const output = execFileSync("./node_modules/.bin/tsx", [
    "scripts/content/write-pssa-items.ts",
    "--grade",
    "3",
    "--benchmark",
    "boy",
  ], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "" },
  });
  assert.match(output, /PSSA DB-4 dry run complete\./);
  assert.match(output, /Benchmark=boy/);
  assert.match(output, /Passages=5, active=39, deprecated=0, supersessions=0, batches=6/);
  assert.match(output, /Gate failures=0, sourceScanFailures=0, hashStable=true/);
}

const planA = buildBoyPlan();
const planB = buildBoyPlan();
assert.equal(planSignature(planA), planSignature(planB), "BOY plan must be deterministic across two runs");
assertBoyPlan(planA);
assertPromotionComplete();
assertNoContentDrift();
assertNoFoundationStreamAuditsInBenchmarkPath();
assertSelector();
assertNoWriteDryRun();

const boyHash = corpusHashForPlan(planA);
assert.equal(currentPlanSourceCorpusHash(3, "boy"), boyHash, "BOY corpus hash must match the BOY importer's stamped hash recipe");
assert.notEqual(boyHash, corpusHashForPlan(buildPlan(3)), "BOY and foundation corpus hashes should be distinct");
assert.notEqual(boyHash, corpusHashForPlan(buildEoyPlan()), "BOY and EOY corpus hashes should be distinct");
assert.notEqual(boyHash, corpusHashForPlan(buildMoyPlan()), "BOY and MOY corpus hashes should be distinct");
for (const batchId of Object.values(GRADE3_BOY_IMPORT_MANIFEST.batchIds).filter(Boolean)) {
  assert.equal(benchmarkForBatchId(batchId), "boy", `${batchId} must resolve to boy`);
}

console.log("BOY import-eligibility stream report:");
for (const row of streamReport(planA)) console.log(JSON.stringify(row));
console.log("PSSA BOY benchmark importer tests passed.");
