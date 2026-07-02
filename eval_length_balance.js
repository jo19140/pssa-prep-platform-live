#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const EVALUATOR_ID = "pssa-answer-length-balance-v1";

const MOY_BACKENDS = [
  "exemplars/pssa_grade3_moy_p1/backend.json",
  "exemplars/pssa_grade3_moy_p2/backend.json",
  "exemplars/pssa_grade3_moy_p3/backend.json",
  "exemplars/pssa_grade3_moy_p4/backend.json",
];

const MOY_REVIEWER_PREVIEWS = [
  "exemplars/pssa_grade3_moy_p1/reviewer_preview.md",
  "exemplars/pssa_grade3_moy_p2/reviewer_preview.md",
  "exemplars/pssa_grade3_moy_p3/reviewer_preview.md",
  "exemplars/pssa_grade3_moy_p4/reviewer_preview.md",
];

const ITEM_FAMILIES = {
  evidence_detail: [
    "pssa_item_g3_moy_p1_mcq_bk111",
    "pssa_item_g3_moy_p1_mcq_bc211",
    "pssa_item_g3_moy_p1_mcq_bc313",
    "pssa_item_g3_moy_p1_mcq_bc212",
    "pssa_item_g3_moy_p2_mcq_ak111",
    "pssa_item_g3_moy_p2_mcq_ac211",
    "pssa_item_g3_moy_p3_mcq_bk113_t1",
    "pssa_item_g3_moy_p3_mcq_bc311_t1",
    "pssa_item_g3_moy_p3_mcq_bc211_ao3",
    "pssa_item_g3_moy_p4_mcq_ak111",
    "pssa_item_g3_moy_p4_mcq_ak113",
  ],
  vocab_fig: [
    "pssa_item_g3_moy_p1_mcq_bv411",
    "pssa_item_g3_moy_p2_mcq_av411",
    "pssa_item_g3_moy_p2_mcq_av412",
    "pssa_item_g3_moy_p3_mcq_bv412_ao1",
    "pssa_item_g3_moy_p4_mcq_av411",
    "pssa_item_g3_moy_p4_mcq_av412",
    "pssa_item_g3_moy_p4_mcq_av412_ao2",
  ],
  main_idea: [
    "pssa_item_g3_moy_p2_mcq_ak112",
    "pssa_item_g3_moy_p3_mcq_bk112_t1",
    "pssa_item_g3_moy_p3_mcq_bk112_t2",
    "pssa_item_g3_moy_p4_mcq_ak112",
  ],
  paired_synthesis: [
    "pssa_item_g3_moy_p3_mcq_bc312",
  ],
  ebsr_partA: [
    "pssa_item_g3_moy_p3_ebsr_bc312",
    "pssa_item_g3_moy_p3_ebsr_bc311_ao4",
    "pssa_item_g3_moy_p4_ebsr_ak113",
  ],
};

const FAMILY_BY_ITEM = new Map(
  Object.entries(ITEM_FAMILIES).flatMap(([family, ids]) => ids.map((id) => [id, family])),
);

const BANNED_WORDS = ["always", "never", "all", "none", "only", "every", "must", "impossible", "cannot"];

const APPROVED_CHANGED_DISTRACTORS = new Map(Object.entries({
  pssa_item_g3_moy_p1_mcq_bk111: { 1: "wrong_section" },
  pssa_item_g3_moy_p1_mcq_bc313: { 0: "wrong_section", 1: "wrong_emphasis", 3: "opposite_claim" },
  pssa_item_g3_moy_p1_mcq_bv411: { 0: "wrong_section", 1: "wrong_emphasis", 2: "plausible_misreading" },
  pssa_item_g3_moy_p1_mcq_bc212: { 1: "opposite_claim", 2: "wrong_section", 3: "plausible_misreading" },
  pssa_item_g3_moy_p2_mcq_ak111: { 2: "wrong_emphasis" },
  pssa_item_g3_moy_p2_mcq_ac211: { 1: "opposite_claim", 2: "unsupported_inference" },
  pssa_item_g3_moy_p2_mcq_av411: { 1: "plausible_misreading", 3: "wrong_section" },
  pssa_item_g3_moy_p2_mcq_av412: { 0: "wrong_emphasis", 3: "opposite_claim" },
  pssa_item_g3_moy_p3_mcq_bk112_t1: { 1: "wrong_section", 3: "opposite_claim" },
  pssa_item_g3_moy_p3_mcq_bc312: { 0: "opposite_claim" },
  pssa_item_g3_moy_p3_ebsr_bc312: { 0: "wrong_section", 2: "opposite_claim" },
  pssa_item_g3_moy_p3_mcq_bv412_ao1: { 0: "plausible_misreading", 1: "wrong_section", 2: "unsupported_inference" },
  pssa_item_g3_moy_p3_mcq_bc211_ao3: { 3: "wrong_section" },
  pssa_item_g3_moy_p3_ebsr_bc311_ao4: { 2: "unsupported_inference" },
  pssa_item_g3_moy_p4_mcq_ak111: { 0: "unsupported_inference", 2: "plausible_misreading" },
  pssa_item_g3_moy_p4_mcq_ak112: { 3: "wrong_emphasis" },
  pssa_item_g3_moy_p4_mcq_av411: { 0: "opposite_claim", 1: "wrong_emphasis", 3: "plausible_misreading" },
  pssa_item_g3_moy_p4_mcq_av412: { 1: "wrong_section", 2: "unsupported_inference" },
  pssa_item_g3_moy_p4_ebsr_ak113: { 2: "opposite_claim" },
  pssa_item_g3_moy_p4_mcq_av412_ao2: { 2: "wrong_section" },
}));

const APPROVED_CORRECT_TEXT_CHANGE = new Map([
  ["pssa_item_g3_moy_p2_mcq_av411", new Set([2])],
]);

function parseArgs(argv) {
  const args = { source: "backend", expect: false, format: "text" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") args.source = argv[++i];
    else if (arg === "--form-id") args.formId = argv[++i];
    else if (arg === "--expect") args.expect = true;
    else if (arg === "--format") args.format = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function choicesForItem(item) {
  const responseSpec = item.responseSpecJson?.responseSpecJson ?? item.responseSpecJson;
  if (item.interactionType === "EBSR") {
    const choices = responseSpec?.partA?.choices ?? item.partA?.choices;
    const correctIndex = item.correctResponseJson?.partA?.correctIndex ?? responseSpec?.partA?.correctIndex ?? item.partA?.correctIndex;
    return { choices, correctIndex, itemFamily: "ebsr_partA" };
  }
  const choices = item.answerChoicesJson ?? item.structuredChoicesJson ?? responseSpec?.structuredChoicesJson ?? responseSpec?.choices;
  const correctIndex = item.correctResponseJson?.correctIndex ?? item.correctIndex;
  return { choices, correctIndex, itemFamily: FAMILY_BY_ITEM.get(item.itemId ?? item.id) };
}

function readBackendItems() {
  const rows = [];
  for (const file of MOY_BACKENDS) {
    const packet = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const item of packet.items ?? []) {
      const itemId = item.itemId ?? item.id;
      if (!FAMILY_BY_ITEM.has(itemId)) continue;
      const { choices, correctIndex } = choicesForItem(item);
      if (!Array.isArray(choices) || choices.length !== 4) throw new Error(`${itemId} must have four choices`);
      if (!Number.isInteger(correctIndex)) throw new Error(`${itemId} missing correct index`);
      rows.push({
        itemId,
        stem: item.stem ?? item.studentFacingPrompt ?? item.responseSpecJson?.partA?.prompt,
        family: FAMILY_BY_ITEM.get(itemId),
        correctIndex,
        choices: choices.map(normalizeChoice),
      });
    }
  }
  return sortRows(rows);
}

function normalizeChoice(choice) {
  if (typeof choice === "string") return { text: choice };
  return {
    text: choice.text,
    distractorRole: choice.distractorRole,
  };
}

function parseReviewerLine(line) {
  const match = line.match(/^- ([A-D])(?: \(KEY\))?: (.*?)(?: — .*)?$/);
  if (!match) return null;
  return { letter: match[1], text: match[2], key: line.includes("(KEY)") };
}

function readReviewerItems() {
  const rows = [];
  for (const file of MOY_REVIEWER_PREVIEWS) {
    const text = fs.readFileSync(file, "utf8");
    const sections = text.split(/\n## /).slice(1);
    for (const section of sections) {
      const [itemIdRaw, ...rest] = section.split("\n");
      const itemId = itemIdRaw.trim();
      if (!FAMILY_BY_ITEM.has(itemId)) continue;
      const lines = rest.join("\n").split("\n");
      const partAIndex = lines.findIndex((line) => line.trim() === "Part A:");
      const relevant = partAIndex >= 0 ? lines.slice(partAIndex + 1) : lines;
      const choices = [];
      let correctIndex = -1;
      for (const line of relevant) {
        const parsed = parseReviewerLine(line);
        if (!parsed) {
          if (partAIndex >= 0 && line.startsWith("Part B")) break;
          continue;
        }
        const index = parsed.letter.charCodeAt(0) - 65;
        choices[index] = { text: parsed.text };
        if (parsed.key) correctIndex = index;
        if (choices.filter(Boolean).length === 4) break;
      }
      if (choices.length === 4 && choices.every(Boolean) && correctIndex >= 0) {
        rows.push({
          itemId,
          stem: "",
          family: FAMILY_BY_ITEM.get(itemId),
          correctIndex,
          choices: choices.map(normalizeChoice),
        });
      }
    }
  }
  return sortRows(rows);
}

async function readDbItems(formId) {
  if (!formId) throw new Error("--form-id is required for --source db");
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();
  try {
    const formItems = await db.pssaFormItem.findMany({
      where: { formId },
      orderBy: { position: "asc" },
      include: { item: true },
    });
    const rows = [];
    for (const formItem of formItems) {
      const item = formItem.item;
      if (!FAMILY_BY_ITEM.has(item.id)) continue;
      const { choices, correctIndex } = choicesForItem({ ...item, itemId: item.id });
      if (!Array.isArray(choices) || choices.length !== 4) throw new Error(`${item.id} must have four choices`);
      rows.push({
        itemId: item.id,
        stem: item.studentPreviewJson?.stem ?? "",
        family: FAMILY_BY_ITEM.get(item.id),
        correctIndex,
        choices: choices.map(normalizeChoice),
      });
    }
    return sortRows(rows);
  } finally {
    await db.$disconnect();
  }
}

function sortRows(rows) {
  const order = new Map([...FAMILY_BY_ITEM.keys()].map((id, index) => [id, index]));
  return rows.sort((a, b) => (order.get(a.itemId) ?? 999) - (order.get(b.itemId) ?? 999));
}

function midRanks(lengths) {
  const sorted = lengths.map((length, index) => ({ length, index })).sort((a, b) => b.length - a.length);
  const ranks = Array(lengths.length);
  let ordinal = 1;
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].length === sorted[i].length) j += 1;
    const rank = (ordinal + ordinal + (j - i) - 1) / 2;
    for (let k = i; k < j; k += 1) ranks[sorted[k].index] = rank;
    ordinal += j - i;
    i = j;
  }
  return ranks;
}

function logChoose(n, k) {
  let value = 0;
  for (let i = 1; i <= k; i += 1) value += Math.log(n - k + i) - Math.log(i);
  return value;
}

function binomialPmf(n, k, p) {
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function binomialUpper(n, k, p = 0.25) {
  const equal = binomialPmf(n, k, p);
  let greater = 0;
  for (let x = k + 1; x <= n; x += 1) greater += binomialPmf(n, x, p);
  return { exactUpperTail: greater + equal, midP: greater + 0.5 * equal };
}

function analyze(rows) {
  if (rows.length !== 26) throw new Error(`Expected 26 MOY reading single-select sets, got ${rows.length}`);
  const perItem = rows.map((row) => {
    const lengths = row.choices.map((choice) => choice.text.length);
    const ranks = midRanks(lengths);
    const maxDistractorLength = Math.max(...lengths.filter((_, index) => index !== row.correctIndex));
    const keyRank = ranks[row.correctIndex];
    return {
      ...row,
      optionLengths: lengths,
      optionRanks: ranks,
      keyRank,
      strictLongest: lengths[row.correctIndex] > maxDistractorLength,
      keyInTop2: keyRank <= 2,
    };
  });
  const strictLongestCount = perItem.filter((item) => item.strictLongest).length;
  const keyInTop2Count = perItem.filter((item) => item.keyInTop2).length;
  const { exactUpperTail, midP } = binomialUpper(perItem.length, strictLongestCount);
  const family = {};
  for (const [name, ids] of Object.entries(ITEM_FAMILIES)) {
    const subset = perItem.filter((item) => ids.includes(item.itemId));
    family[name] = summarizeSubset(subset);
  }
  return {
    evaluatorId: EVALUATOR_ID,
    aggregate: {
      n: perItem.length,
      strictLongestCount,
      strictLongestRate: strictLongestCount / perItem.length,
      exactUpperTail,
      midP,
      keyInTop2Count,
      keyInTop2Rate: keyInTop2Count / perItem.length,
      preferTwoLongestCue: keyInTop2Count / perItem.length / 2,
      meanKeyRank: mean(perItem.map((item) => item.keyRank)),
    },
    family,
    perItem,
    absoluteLanguage: scanAbsoluteLanguage(perItem),
  };
}

function summarizeSubset(subset) {
  return {
    n: subset.length,
    meanKeyRank: mean(subset.map((item) => item.keyRank)),
    keyInTop2Count: subset.filter((item) => item.keyInTop2).length,
    keyInTop2Rate: subset.filter((item) => item.keyInTop2).length / subset.length,
    strictLongestCount: subset.filter((item) => item.strictLongest).length,
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scanAbsoluteLanguage(perItem) {
  const flags = [];
  for (const item of perItem) {
    const changed = APPROVED_CHANGED_DISTRACTORS.get(item.itemId) ?? {};
    const correctTextChanged = APPROVED_CORRECT_TEXT_CHANGE.get(item.itemId) ?? new Set();
    item.choices.forEach((choice, index) => {
      for (const word of BANNED_WORDS) {
        if (!new RegExp(`\\b${word}\\b`, "i").test(choice.text)) continue;
        flags.push({
          itemId: item.itemId,
          choice: String.fromCharCode(65 + index),
          word,
          editedDistractor: Object.prototype.hasOwnProperty.call(changed, index),
          editedCorrectAnswer: correctTextChanged.has(index),
          correct: index === item.correctIndex,
          text: choice.text,
        });
      }
    });
  }
  return {
    flags,
    editedDistractorFlagCount: flags.filter((flag) => flag.editedDistractor).length,
    uneditedFlagCount: flags.filter((flag) => !flag.editedDistractor && !flag.editedCorrectAnswer).length,
  };
}

function assertExpected(report) {
  const { aggregate, family, absoluteLanguage } = report;
  const close = (actual, expected, tolerance, label) => {
    if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: got ${actual}, expected ${expected}`);
  };
  if (aggregate.strictLongestCount !== 5) throw new Error(`strict-longest count got ${aggregate.strictLongestCount}`);
  if (aggregate.keyInTop2Count !== 14) throw new Error(`key-in-top-2 count got ${aggregate.keyInTop2Count}`);
  close(aggregate.exactUpperTail, 0.81564, 0.00001, "exact upper-tail");
  close(aggregate.midP, 0.73925, 0.00001, "mid-p");
  close(aggregate.preferTwoLongestCue, 0.269, 0.0015, "prefer-two-longest cue");
  close(aggregate.meanKeyRank, 2.38, 0.01, "mean key rank");
  close(family.evidence_detail.meanKeyRank, 2.41, 0.01, "evidence_detail mean rank");
  close(family.vocab_fig.meanKeyRank, 2.43, 0.01, "vocab_fig mean rank");
  close(family.main_idea.meanKeyRank, 2.38, 0.01, "main_idea mean rank");
  close(family.paired_synthesis.meanKeyRank, 2.00, 0.01, "paired_synthesis mean rank");
  close(family.ebsr_partA.meanKeyRank, 2.33, 0.01, "ebsr_partA mean rank");
  if (absoluteLanguage.editedDistractorFlagCount !== 0) throw new Error("edited distractor absolute-language flag found");
}

function printText(report, source) {
  const pct = (value) => `${(value * 100).toFixed(1)}%`;
  console.log(`${report.evaluatorId} source=${source}`);
  console.log(`aggregate strict=${report.aggregate.strictLongestCount}/${report.aggregate.n} (${pct(report.aggregate.strictLongestRate)}) exactUpperTail=${report.aggregate.exactUpperTail.toFixed(5)} midP=${report.aggregate.midP.toFixed(5)} top2=${report.aggregate.keyInTop2Count}/${report.aggregate.n} (${pct(report.aggregate.keyInTop2Rate)}) preferTwoLongest=${pct(report.aggregate.preferTwoLongestCue)} meanKeyRank=${report.aggregate.meanKeyRank.toFixed(2)}`);
  console.log("family,n,meanKeyRank,keyInTop2,strictLongest");
  for (const [family, row] of Object.entries(report.family)) {
    console.log(`${family},${row.n},${row.meanKeyRank.toFixed(2)},${row.keyInTop2Count}/${row.n} (${pct(row.keyInTop2Rate)}),${row.strictLongestCount}`);
  }
  console.log("itemId,family,lengths,keyRank,strictLongest,keyInTop2");
  for (const item of report.perItem) {
    console.log(`${item.itemId},${item.family},${item.optionLengths.join("/")},${item.keyRank},${item.strictLongest},${item.keyInTop2}`);
  }
  console.log(`absoluteLanguage editedDistractorFlags=${report.absoluteLanguage.editedDistractorFlagCount} uneditedFlags=${report.absoluteLanguage.uneditedFlagCount}`);
  for (const flag of report.absoluteLanguage.flags) {
    console.log(`absolute ${flag.editedDistractor ? "EDITED_DISTRACTOR" : flag.editedCorrectAnswer ? "EDITED_CORRECT" : "UNEDITED"} ${flag.itemId} ${flag.choice} ${flag.word}: ${flag.text}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  let rows;
  if (args.source === "backend") rows = readBackendItems();
  else if (args.source === "reviewer") rows = readReviewerItems();
  else if (args.source === "db") rows = await readDbItems(args.formId);
  else throw new Error(`Unsupported --source ${args.source}`);
  const report = analyze(rows);
  if (args.expect) assertExpected(report);
  if (args.format === "json") console.log(JSON.stringify(report, null, 2));
  else printText(report, args.source);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
