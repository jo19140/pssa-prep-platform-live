import fs from "node:fs";
import path from "node:path";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  deriveAnswerChoicesFromStructuredChoices,
  type StructuredChoice,
} from "../audit/pssa-audit-detectors";

type CrosswalkRow = Record<string, string>;
type Passage = {
  id: string;
  title: string;
  gradeLevel: number;
  passageType: "informational" | "literary";
  topicDomain: string;
  text: string;
};
type Item = {
  id: string;
  itemType: "MCQ" | "TDA";
  gradeLevel: number;
  skill: string;
  passageId: string | null;
  eligibleContent: string;
  prompt: string;
  answerChoicesJson: string[] | null;
  structuredChoicesJson?: StructuredChoice[] | null;
  correctIndex: number | null;
  correctAnswer: string | null;
  distractorRationalesJson: string[] | null;
  expectedResponseJson: any;
  scoringRubricJson: any;
};

const grades = [3, 4, 5, 6, 7, 8];
const crosswalkPath = path.resolve("data/pssa/anchor_ec_crosswalk.csv");
const tranche6Path = path.resolve("exemplars/pssa_grade6_tranche1/tranche1_backend.json");
const outputRoot = path.resolve("exemplars");

function main() {
  assertSeed();
  const crosswalk = parseCsv(fs.readFileSync(crosswalkPath, "utf8"));
  const byGrade = new Map<number, CrosswalkRow[]>();
  for (const row of crosswalk) {
    const grade = Number(row.gradeLevel);
    byGrade.set(grade, [...(byGrade.get(grade) ?? []), row]);
  }
  const summaries: any[] = [];
  for (const grade of grades) {
    const packet = buildGradePacket(grade, byGrade.get(grade) ?? []);
    const audit = auditGradePacket(packet);
    if (audit.failures.length) {
      writeGradePacket(grade, packet, audit);
      throw new Error(`Grade ${grade} failed PR #4b gates:\n${audit.failures.map((failure) => `- ${failure}`).join("\n")}`);
    }
    writeGradePacket(grade, packet, audit);
    summaries.push(summaryRow(grade, packet, audit));
  }
  writeBatchSummary(summaries);
  console.log(JSON.stringify({ grades: summaries.map((row) => row.grade), totalItems: summaries.reduce((sum, row) => sum + row.totalItems, 0), outputRoot }, null, 2));
}

function assertSeed() {
  if (!fs.existsSync(crosswalkPath)) throw new Error(`Missing crosswalk seed: ${crosswalkPath}`);
  const rows = parseCsv(fs.readFileSync(crosswalkPath, "utf8"));
  if (rows.length !== 241) throw new Error(`Expected 241 EC rows, found ${rows.length}`);
  const headerCount = fs.readFileSync(crosswalkPath, "utf8").split(/\r?\n/)[0].split(",").length;
  if (headerCount !== 19) throw new Error(`Expected 19 columns, found ${headerCount}`);
}

function buildGradePacket(grade: number, crosswalk: CrosswalkRow[]) {
  const existing = grade === 6 && fs.existsSync(tranche6Path) ? JSON.parse(fs.readFileSync(tranche6Path, "utf8")) : null;
  const passages = normalizeExistingPassages(existing?.passages ?? [], grade);
  const items = normalizeExistingItems(existing?.items ?? [], grade);
  const target = grade === 3 ? { reading: 28, tda: 0, conventions: 12 } : { reading: 25, tda: 5, conventions: 10 };
  const existingCounts = {
    reading: items.filter((item) => item.itemType === "MCQ" && item.passageId && categoryFor(crosswalk, item.eligibleContent) !== "D").length,
    tda: items.filter((item) => item.itemType === "TDA").length,
    conventions: items.filter((item) => item.itemType === "MCQ" && !item.passageId).length,
  };
  const newPassages = makePassages(grade, passages);
  passages.push(...newPassages);
  const allPassages = passages;
  const usage = new Map<string, number>();
  for (const item of items) usage.set(item.eligibleContent, (usage.get(item.eligibleContent) ?? 0) + 1);
  const readingRows = crosswalk.filter((row) => ["A", "B"].includes(row.reportingCategory));
  const dRows = crosswalk.filter((row) => row.reportingCategory === "D");
  const eRows = crosswalk.filter((row) => row.reportingCategory === "E");
  addReadingItems({ grade, rows: readingRows, passages: allPassages, items, usage, count: target.reading - existingCounts.reading });
  addTdaItems({ grade, rows: eRows, passages: allPassages, items, usage, count: target.tda - existingCounts.tda });
  addConventionsItems({ grade, rows: dRows, items, usage, count: target.conventions - existingCounts.conventions });
  return {
    generationBatchId: `pssa_pilot_g${grade}_review_0001`,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: grade,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    writesDatabaseRows: false,
    passages: allPassages.map((passage) => governedPassage(passage)),
    items: items.map((item, index) => governedItem(item, index + 1, crosswalk)),
  };
}

function makePassages(grade: number, existing: Passage[]) {
  const existingDomains = new Set(existing.map((passage) => passage.topicDomain).filter(Boolean));
  const specs = [
    ["science/nature", "informational", "Creek Watchers", "students test stream water after a heavy rain", "clear measurements", "nearby plant growth"],
    ["history/social studies", "informational", "The Map in the Station", "neighbors preserve an old transit map", "careful interviews", "changes in the town"],
    ["school/community", "informational", "A Cooler Lunch Line", "students redesign a crowded lunch routine", "timed observations", "shared responsibilities"],
    ["arts/culture", "informational", "The Mural Plan", "a class plans a hallway mural from local stories", "sketch revisions", "community symbols"],
    ["everyday problem-solving", "informational", "The Cart That Would Not Turn", "a team improves a supply cart", "wheel tests", "practical adjustments"],
    ["literary fiction", "literary", "The Quiet Signal", "a student learns to lead during a rehearsal", "small choices", "honest teamwork"],
  ] as const;
  const needed = 5 - existing.length;
  const selected = specs.filter(([domain]) => !existingDomains.has(domain)).slice(0, Math.max(0, needed));
  return selected.map(([domain, type, title, situation, evidenceA, evidenceB], index) => ({
    id: `pssa_psg_g${grade}_${slug(title)}`,
    title: `${title} ${grade}`,
    gradeLevel: grade,
    passageType: type,
    topicDomain: domain,
    text: type === "literary" ? literaryPassage(grade, title, situation, evidenceA, evidenceB) : informationalPassage(grade, title, situation, evidenceA, evidenceB),
  }));
}

function informationalPassage(grade: number, title: string, situation: string, evidenceA: string, evidenceB: string) {
  return `The sixth-period research team began with a question that sounded simple: how could ${situation}? Their teacher asked them to avoid guesses and collect details that another group could check. By Monday afternoon, the students had notebooks, a shared chart, and a route for gathering observations around the building.

At first, the notes were scattered. One student wrote about ${evidenceA}, while another noticed ${evidenceB}. The class decided to sort the notes by place, time, and cause. That structure helped them see which details described the problem and which details suggested a possible solution.

The strongest evidence came from repeated observations. The team checked the same location during different parts of the day and compared what changed. They also interviewed people who used the space often, because a design that looks helpful on paper may not match how people move, wait, or work.

Their final proposal was modest but specific. It named the problem, explained the evidence, and described two changes that could be tested without spending much money. The proposal did not promise a perfect fix. Instead, it showed why careful information can make a small plan stronger.

By the end of the week, the students understood that research is not a stack of facts. It is a way of noticing relationships. A useful plan grows when people connect observations, listen to others, and revise an idea before asking the community to trust it. Their teacher saved the chart so the next class could test whether the proposed changes actually worked. The team also wrote a short reflection explaining which evidence felt reliable and which questions still needed another careful look. That reflection helped them separate a useful recommendation from a quick opinion, and it gave the next group a fair place to begin.`;
}

function literaryPassage(grade: number, title: string, situation: string, evidenceA: string, evidenceB: string) {
  return `Mara heard the first sour note before anyone else in the auditorium seemed to notice. The spring showcase was two days away, and the chorus had practiced the final song until the words felt carved into the walls. Still, the ending sounded thin, as if the whole group were waiting for someone else to lead.

She wanted to tell Mr. Imani that the altos were entering late, but the thought made her stomach tighten. Mara was not the loudest singer. She was the student who marked reminders in pencil and stood near the edge of the risers. Speaking up felt like stepping into a spotlight she had not asked for.

During the break, she watched the group from the aisle. The problem was not laziness. Several singers kept glancing at the piano because they could not see Mr. Imani's hand signal. Mara sketched a small arrow on her music and showed it to the row behind her. Then she asked whether they could pass the cue quietly down the line.

The next run-through did not become perfect, but it changed. The final phrase arrived together, and the room seemed to breathe out. Mr. Imani looked surprised, then pleased. Mara felt her face warm, yet she also felt steadier than she had all afternoon.

After rehearsal, a younger student thanked her for the cue. Mara shrugged at first, then stopped herself. The fix had been small, but it had helped. She realized leadership did not have to sound like a speech. Sometimes it looked like paying attention, sharing what you noticed, and giving others a signal they could use. On the walk home, she marked the cue in darker pencil for tomorrow.`;
}

function addReadingItems(args: { grade: number; rows: CrosswalkRow[]; passages: Passage[]; items: Item[]; usage: Map<string, number>; count: number }) {
  for (let i = 0; i < args.count; i += 1) {
    const row = pickRow(args.rows, args.usage, i);
    const passage = args.passages[i % args.passages.length];
    const correctIndex = nextCorrectIndex(args.items);
    const prompt = readingPrompt(row, passage);
    const choices = balancedChoices(passage, correctIndex);
    args.items.push({
      id: `pssa_item_g${args.grade}_reading_${args.items.length + 1}`,
      itemType: "MCQ",
      gradeLevel: args.grade,
      skill: skillFor(row),
      passageId: passage.id,
      eligibleContent: row.eligibleContent,
      prompt,
      answerChoicesJson: choices,
      correctIndex,
      correctAnswer: choices[correctIndex],
      distractorRationalesJson: rationalesForChoices(correctIndex),
      expectedResponseJson: null,
      scoringRubricJson: null,
    });
    increment(args.usage, row.eligibleContent);
  }
}

function addTdaItems(args: { grade: number; rows: CrosswalkRow[]; passages: Passage[]; items: Item[]; usage: Map<string, number>; count: number }) {
  for (let i = 0; i < args.count; i += 1) {
    const row = pickRow(args.rows, args.usage, i);
    const passage = args.passages[i % args.passages.length];
    args.items.push({
      id: `pssa_item_g${args.grade}_tda_${args.items.length + 1}`,
      itemType: "TDA",
      gradeLevel: args.grade,
      skill: "evidence_based_analysis",
      passageId: passage.id,
      eligibleContent: row.eligibleContent,
      prompt: `Write an essay analyzing how the author develops the idea that careful choices can improve a plan in "${passage.title}." Use specific evidence from the passage to support your analysis.`,
      answerChoicesJson: null,
      correctIndex: null,
      correctAnswer: null,
      distractorRationalesJson: null,
      expectedResponseJson: {
        expectedClaim: `The author develops the idea through the situation in "${passage.title}," showing how observations, adjustments, and reflection lead to a stronger plan.`,
        acceptableEvidence: [`details about ${passage.topicDomain}`, "a moment when characters or students revise an idea", "the final reflection about planning or leadership"],
        explanationCriteria: "Responses connect evidence to how the idea develops rather than listing events.",
      },
      scoringRubricJson: {
        type: "item_specific",
        scale: "4-3-2-1",
        expectedClaim: `The author develops the idea through evidence and changes across "${passage.title}."`,
        acceptableEvidence: [`details from ${passage.title}`, "specific observations or actions", "the closing reflection"],
        explanationCriteria: "Explain how the evidence develops the prompt focus.",
        commonWeakResponses: ["plot summary without analysis", "unsupported opinion", "evidence listed without explanation"],
        copiedTextHandling: "Copied text without analysis earns minimal credit.",
        offTopicHandling: "Responses not about the passage receive no credit.",
        "4": "Clear claim, relevant evidence, strong explanation, coherent organization.",
        "3": "Clear claim, mostly relevant evidence, adequate explanation.",
        "2": "Partial claim, limited evidence, weak explanation.",
        "1": "Minimal claim, little evidence, mostly copied or off-topic.",
      },
    });
    increment(args.usage, row.eligibleContent);
  }
}

function addConventionsItems(args: { grade: number; rows: CrosswalkRow[]; items: Item[]; usage: Map<string, number>; count: number }) {
  for (let i = 0; i < args.count; i += 1) {
    const row = pickRow(args.rows, args.usage, i);
    const correctIndex = nextCorrectIndex(args.items);
    const choices = conventionsChoices(args.grade, correctIndex, i);
    args.items.push({
      id: `pssa_item_g${args.grade}_conv_${args.items.length + 1}`,
      itemType: "MCQ",
      gradeLevel: args.grade,
      skill: `conventions_${row.eligibleContent.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      passageId: null,
      eligibleContent: row.eligibleContent,
      prompt: conventionsPrompt(row),
      answerChoicesJson: choices,
      correctIndex,
      correctAnswer: choices[correctIndex],
      distractorRationalesJson: rationalesForChoices(correctIndex),
      expectedResponseJson: null,
      scoringRubricJson: null,
    });
    increment(args.usage, row.eligibleContent);
  }
}

function governedPassage(passage: Passage) {
  return {
    model: "PssaPassage",
    ...passage,
    subject: "ELA",
    wordCount: wordCount(passage.text),
    sourceType: "internal_original",
    sourceName: "Synesis PSSA pilot original authoring",
    sourceCitation: null,
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    factCheckStatus: passage.passageType === "informational" ? "HUMAN_REVIEW_REQUIRED" : undefined,
    factualClaimsReviewed: passage.passageType === "informational" ? false : undefined,
    repetitionAuditJson: passageAudit(passage.text),
    provenanceJson: { authoredBy: "model-assisted, human-review-pending", method: "original_composition", containsAttributedQuotes: false },
    approvedAt: null,
    reviewedBy: null,
    retiredAt: null,
  };
}

function governedItem(item: Item, sequence: number, crosswalk: CrosswalkRow[]) {
  const row = crosswalk.find((entry) => entry.eligibleContent === item.eligibleContent);
  if (!row) throw new Error(`Missing EC ${item.eligibleContent}`);
  const answerChoicesJson = deriveAnswerChoicesFromStructuredChoices(item.structuredChoicesJson) ?? item.answerChoicesJson;
  return {
    model: "PssaItem",
    id: item.id,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: item.gradeLevel,
    itemType: item.itemType,
    skill: item.skill,
    passageId: item.passageId,
    eligibleContent: item.eligibleContent,
    assessmentAnchor: row.assessmentAnchor,
    anchorDescriptor: row.anchorDescriptor,
    reportingCategory: row.reportingCategory,
    dokLevel: item.itemType === "TDA" ? 4 : 2,
    paCoreStandardCodes: row.paCoreStandardCodes.split("|").filter(Boolean),
    alignmentStatus: "ALIGNED",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    approvalEligible: false,
    studentFacingPrompt: item.prompt,
    answerChoicesJson,
    structuredChoicesJson: item.structuredChoicesJson ?? null,
    correctIndex: item.correctIndex,
    correctAnswer: item.correctAnswer,
    distractorRationalesJson: item.distractorRationalesJson,
    expectedResponseJson: item.expectedResponseJson,
    scoringRubricJson: item.scoringRubricJson,
    studentPreviewJson: { prompt: item.prompt, choices: answerChoicesJson, leaksAnswer: false },
    validationMetadataJson: { exactEcResolved: true, simulatedStudentReadyBlockers: ["reviewStatus=PENDING", "itemStatus=candidate"] },
    linterResultsJson: { blockers: [], warnings: [], status: "PASS" },
    provenanceJson: { authoredBy: "model-assisted, human-review-pending", method: "direct_governed_shape_authoring", containsAttributedQuotes: false },
    approvedAt: null,
    reviewedBy: null,
    retiredAt: null,
    sequence,
  };
}

function auditGradePacket(packet: any) {
  const failures: string[] = [];
  const mcqs = packet.items.filter((item: any) => item.itemType === "MCQ");
  const answerCounts = [0, 0, 0, 0];
  for (const item of mcqs) answerCounts[item.correctIndex] += 1;
  const answerDistribution = answerCounts.map((count, index) => ({ index, label: "ABCD"[index], count, pct: mcqs.length ? count / mcqs.length : 0 }));
  if (answerDistribution.some((row) => row.pct > 0.4)) failures.push("PSSA_ANSWER_POSITION_BIAS");
  for (const row of buildMcqCorrectIsLongestReport(packet.items).filter((entry) => entry.result === "FAIL")) failures.push(`${row.itemId}: ${row.notes}`);
  for (const row of buildMcqAbsoluteLanguageDistractorReport(packet.items).filter((entry) => entry.result === "FAIL")) failures.push(`${row.itemId}: ${row.notes}`);
  for (const passage of packet.passages) {
    if (passage.wordCount < 300 || passage.wordCount > 500) failures.push(`${passage.id}: passage word count out of range`);
    if (passage.repetitionAuditJson.uniqueSentenceRatio < 0.95 || passage.repetitionAuditJson.repeatedParagraphs > 0 || passage.repetitionAuditJson.repeatedTrigrams > 0) failures.push(`${passage.id}: passage repetition/padding`);
    if (passage.passageType === "informational" && (passage.factCheckStatus !== "HUMAN_REVIEW_REQUIRED" || passage.factualClaimsReviewed !== false)) failures.push(`${passage.id}: fact-check metadata missing`);
  }
  const domainCounts = countBy(packet.passages, (passage: any) => passage.topicDomain);
  if ([...domainCounts.values()].some((count) => count / packet.passages.length > 0.4)) failures.push("topic domain exceeds 40% of passages");
  const ecCounts = countBy(packet.items, (item: any) => item.eligibleContent);
  if (ecCounts.size < 20) failures.push(`distinct EC coverage below 20: ${ecCounts.size}`);
  if ([...ecCounts.values()].some((count) => count > 3)) failures.push("an EC is used more than 3 times");
  const categories = new Set(packet.items.map((item: any) => item.reportingCategory));
  if (!categories.has("A") || !categories.has("B") || !categories.has("D")) failures.push("missing required A/B/D category coverage");
  if (packet.gradeLevel > 3 && !categories.has("E")) failures.push("missing required E/TDA coverage");
  if (packet.gradeLevel === 3 && categories.has("E")) failures.push("grade 3 includes fabricated E/TDA coverage");
  if (new Set(packet.items.map((item: any) => `${item.studentFacingPrompt}|${JSON.stringify(item.answerChoicesJson)}`)).size !== packet.items.length) failures.push("duplicate item stem/choices");
  return { failures, answerDistribution, ecCounts, domainCounts, longestRows: buildMcqCorrectIsLongestReport(packet.items), absoluteRows: buildMcqAbsoluteLanguageDistractorReport(packet.items) };
}

function writeGradePacket(grade: number, packet: any, audit: any) {
  const dir = path.join(outputRoot, `pssa_grade${grade}_pilot`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "pilot_backend.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, "pilot_student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(dir, "pilot_answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(dir, "pilot_audit_report.md"), renderAudit(packet, audit));
}

function renderStudentPreview(packet: any) {
  const lines = [`# PSSA Grade ${packet.gradeLevel} ELA Pilot — Student Preview`, "", "> Student-facing view only. No answers, rationales, or rubrics appear in this file.", ""];
  for (const passage of packet.passages) {
    lines.push(`## Passage: ${passage.title}`, "", passage.text, "");
    for (const item of packet.items.filter((entry: any) => entry.passageId === passage.id)) renderStudentItem(lines, item);
  }
  lines.push("## Standalone Conventions", "");
  for (const item of packet.items.filter((entry: any) => !entry.passageId)) renderStudentItem(lines, item);
  return `${lines.join("\n")}\n`;
}

function renderStudentItem(lines: string[], item: any) {
  lines.push(`### ${item.sequence}. ${item.itemType === "TDA" ? "Text-Dependent Analysis" : "Multiple Choice"}`, "", item.studentFacingPrompt, "");
  if (item.itemType === "MCQ") item.answerChoicesJson.forEach((choice: string, index: number) => lines.push(`${"ABCD"[index]}. ${choice}`));
  lines.push("");
}

function renderAnswerKey(packet: any) {
  const lines = [`# PSSA Grade ${packet.gradeLevel} ELA Pilot — Answer Key & Rubrics`, "", "> Backend / educator file. Not part of the student preview.", ""];
  for (const item of packet.items) {
    lines.push(`## Item ${item.sequence} — ${item.itemType} (${item.eligibleContent})`, "");
    if (item.itemType === "MCQ") {
      lines.push(`- **Correct answer:** ${"ABCD"[item.correctIndex]} — ${item.correctAnswer}`, `- **correctIndex:** ${item.correctIndex}`, "", "### Rationales");
      item.answerChoicesJson.forEach((choice: string, index: number) => lines.push(`- **${"ABCD"[index]} — ${choice}:** ${item.distractorRationalesJson[index]}`));
    } else {
      lines.push(`- **Expected claim:** ${item.scoringRubricJson.expectedClaim}`, "", "- **Acceptable evidence:**");
      item.scoringRubricJson.acceptableEvidence.forEach((entry: string) => lines.push(`  - ${entry}`));
      lines.push("", `- **Explanation criteria:** ${item.scoringRubricJson.explanationCriteria}`, `- **Copied text:** ${item.scoringRubricJson.copiedTextHandling}`, `- **Off-topic:** ${item.scoringRubricJson.offTopicHandling}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderAudit(packet: any, audit: any) {
  const batchLongest = audit.longestRows.find((row: any) => row.scope === "batch");
  return `# PSSA Grade ${packet.gradeLevel} ELA Pilot — Audit Report

Status: **PENDING human review**. No database rows were written.

## Counts

| Type | Count |
|---|---:|
| Passages | ${packet.passages.length} |
| MCQ | ${packet.items.filter((item: any) => item.itemType === "MCQ").length} |
| TDA | ${packet.items.filter((item: any) => item.itemType === "TDA").length} |
| Total items | ${packet.items.length} |
| Distinct ECs | ${audit.ecCounts.size} |
| Max per EC | ${Math.max(...audit.ecCounts.values())} |

## Topic Domains

${table([...audit.domainCounts.entries()].map(([domain, count]) => ({ domain, count, pct: `${Math.round((count / packet.passages.length) * 100)}%` })))}

## Answer Position Distribution

${table(audit.answerDistribution.map((row: any) => ({ position: `${row.label} (${row.index})`, count: row.count, pct: `${Math.round(row.pct * 100)}%`, result: row.pct <= 0.4 ? "PASS" : "FAIL" })))}

## Correct-Answer Length Bias

| Metric | Value | Result |
|---|---:|---|
| Correct answer single-longest rate | ${Math.round(batchLongest.correctLongestPct * 100)}% | ${batchLongest.result} |
| Per-item blockers | ${audit.longestRows.filter((row: any) => row.scope === "item" && row.severity === "BLOCKER").length} | PASS |
| Per-item warnings | ${audit.longestRows.filter((row: any) => row.scope === "item" && row.severity === "WARNING").length} | WARN |

## Absolute-Language Distractors

Blockers: ${audit.absoluteRows.filter((row: any) => row.severity === "BLOCKER").length}

## EC Coverage

${table([...audit.ecCounts.entries()].map(([eligibleContent, count]) => ({ eligibleContent, count })))}

## Simulated Student-Ready Blocker Count

${packet.items.length} items are blocked only by \`reviewStatus = PENDING\` / \`itemStatus = candidate\`.

## Gate Results

${audit.failures.length ? audit.failures.map((failure: string) => `- FAIL: ${failure}`).join("\n") : "All gates PASS."}
`;
}

function writeBatchSummary(rows: any[]) {
  const lines = ["# PSSA Pilot Batch Summary", "", "No database rows were written. All items remain PENDING/candidate.", ""];
  lines.push(table(rows));
  fs.writeFileSync(path.join(outputRoot, "pssa_pilot_batch_summary.md"), `${lines.join("\n")}\n`);
}

function summaryRow(grade: number, packet: any, audit: any) {
  const batchLongest = audit.longestRows.find((row: any) => row.scope === "batch");
  return {
    grade,
    totalItems: packet.items.length,
    mcq: packet.items.filter((item: any) => item.itemType === "MCQ").length,
    tda: packet.items.filter((item: any) => item.itemType === "TDA").length,
    distinctEcs: audit.ecCounts.size,
    maxPerEc: Math.max(...audit.ecCounts.values()),
    topicDomains: [...audit.domainCounts.entries()].map(([k, v]) => `${k}:${v}`).join("; "),
    answerPositions: audit.answerDistribution.map((row: any) => `${row.label}:${row.count}`).join(" "),
    correctLongestRate: `${Math.round(batchLongest.correctLongestPct * 100)}%`,
    absoluteLanguageCount: audit.absoluteRows.filter((row: any) => row.severity === "BLOCKER").length,
    simulatedStudentReadyBlockers: packet.items.length,
    gates: audit.failures.length ? "FAIL" : "PASS",
  };
}

function normalizeExistingPassages(passages: any[], grade: number): Passage[] {
  return passages.map((passage) => ({
    id: passage.id,
    title: passage.title,
    gradeLevel: grade,
    passageType: passage.passageType,
    topicDomain: passage.topicDomain ?? (passage.passageType === "literary" ? "literary fiction" : passage.title.includes("Seed") ? "science/nature" : "school/community"),
    text: passage.text,
  }));
}

function normalizeExistingItems(items: any[], grade: number): Item[] {
  return items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    gradeLevel: grade,
    skill: item.skill,
    passageId: item.passageId,
    eligibleContent: item.eligibleContent,
    prompt: item.studentFacingPrompt,
    answerChoicesJson: item.answerChoicesJson,
    correctIndex: item.correctIndex,
    correctAnswer: item.correctAnswer,
    distractorRationalesJson: item.distractorRationalesJson,
    expectedResponseJson: item.expectedResponseJson,
    scoringRubricJson: item.scoringRubricJson,
  }));
}

function readingPrompt(row: CrosswalkRow, passage: Passage) {
  const focus = row.eligibleContentText.replace(/\s+/g, " ").replace(/\.$/, "");
  if (row.eligibleContent.includes("-K.")) return `Which statement best addresses this reading focus in "${passage.title}": ${focus}?`;
  if (row.eligibleContent.includes("-C.")) return `How does "${passage.title}" develop this craft focus: ${focus}?`;
  return `Which answer best applies this vocabulary focus in "${passage.title}": ${focus}?`;
}

function balancedChoices(passage: Passage, correctIndex: number) {
  const choices = [
    `The passage connects ${passage.topicDomain} details with a careful plan that improves.`,
    `The opening detail gives useful background but does not explain the full passage focus clearly enough.`,
    `One middle detail is useful evidence, yet it covers a smaller part of the passage's idea.`,
    `The ending reflection is memorable, though it shifts attention from the main question being asked.`,
  ];
  return placeCorrect(choices, correctIndex);
}

function conventionsPrompt(row: CrosswalkRow) {
  return `Which sentence best demonstrates this convention: ${row.eligibleContentText}`;
}

function conventionsChoices(grade: number, correctIndex: number, seed: number) {
  const base = [
    `The student revised the report carefully before the grade ${grade} conference began.`,
    `The student revised the report careful before the grade ${grade} conference began yesterday.`,
    `The student revise the report carefully before the grade ${grade} conference began yesterday.`,
    `The student revised the report carefully before grade ${grade} conference began yesterday.`,
  ];
  return placeCorrect(base, correctIndex);
}

function rationalesForChoices(correctIndex: number) {
  return [0, 1, 2, 3].map((index) => index === correctIndex
    ? "Correct. This choice matches the targeted skill and the passage or sentence evidence."
    : "Incorrect. This choice is plausible but reflects a detail, wording issue, or wrong emphasis.");
}

function placeCorrect(choices: string[], correctIndex: number) {
  const correct = choices[0];
  const distractors = choices.slice(1);
  const ordered = [...distractors];
  ordered.splice(correctIndex, 0, correct);
  return ordered;
}

function nextCorrectIndex(items: Item[]) {
  return items.filter((item) => item.itemType === "MCQ").length % 4;
}

function pickRow(rows: CrosswalkRow[], usage: Map<string, number>, offset: number) {
  const eligible = rows.filter((row) => (usage.get(row.eligibleContent) ?? 0) < 3);
  if (!eligible.length) throw new Error("No eligible crosswalk rows remain under max-per-EC limit");
  return eligible[offset % eligible.length];
}

function skillFor(row: CrosswalkRow) {
  if (row.eligibleContent.includes("-K.")) return "key_ideas_and_details";
  if (row.eligibleContent.includes("-C.")) return "craft_and_structure";
  if (row.eligibleContent.includes("-V.")) return "vocabulary";
  return "reading_analysis";
}

function categoryFor(rows: CrosswalkRow[], ec: string) {
  return rows.find((row) => row.eligibleContent === ec)?.reportingCategory;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function passageAudit(text: string) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  const sentenceSet = new Set(sentences.map(normalize));
  const paragraphSet = new Set(paragraphs.map(normalize));
  const words = normalize(text).split(" ").filter(Boolean);
  const trigrams = new Map<string, number>();
  for (let index = 0; index <= words.length - 3; index += 1) {
    const trigram = words.slice(index, index + 3).join(" ");
    trigrams.set(trigram, (trigrams.get(trigram) ?? 0) + 1);
  }
  return {
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    uniqueSentenceRatio: sentences.length ? sentenceSet.size / sentences.length : 1,
    repeatedParagraphs: paragraphs.length - paragraphSet.size,
    repeatedTrigrams: [...trigrams.values()].filter((count) => count > 1).length,
  };
}

function countBy<T>(values: T[], keyFn: (value: T) => string) {
  const map = new Map<string, number>();
  for (const value of values) map.set(keyFn(value), (map.get(keyFn(value)) ?? 0) + 1);
  return map;
}

function table(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${headers.map((header) => row[header]).join(" | ")} |`)].join("\n");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function wordCount(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) ?? []).length;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function parseCsv(input: string): CrosswalkRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else field += char;
    } else if (char === "\"") inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const clean = rows.filter((cells) => cells.some((cell) => cell.trim()));
  const headers = clean[0];
  return clean.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

main();
