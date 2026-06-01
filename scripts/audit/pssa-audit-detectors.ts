import fs from "fs";
import path from "path";
import crypto from "crypto";

export const PSSA_AUDIT_RULE_IDS = [
  "PSSA_MANIFEST_COUNT_MISMATCH",
  "PSSA_ANSWER_POSITION_BIAS",
  "PSSA_DUPLICATE_ITEM_EXACT",
  "PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES",
  "PSSA_DUPLICATE_ITEM_GROUP_TOO_LARGE",
  "PSSA_PASSAGE_REPEATED_PARAGRAPH",
  "PSSA_PASSAGE_REPEATED_SENTENCE",
  "PSSA_PASSAGE_LOW_UNIQUE_SENTENCE_RATIO",
  "PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED",
  "PSSA_MCQ_CORRECT_IS_LONGEST",
  "PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR",
] as const;

type RuleResult = "PASS" | "FAIL" | "SKIP";

export type ManifestValidationInput = {
  manifest: any;
  actual: {
    diagnosticItems: number;
    lessons: number;
    passages: number;
    standards: number;
    studentPreviewEntries: number;
  };
};

export type ManifestValidationRow = {
  fileName: string;
  manifestCount: number | string;
  actualCount: number;
  result: RuleResult;
  notes: string;
};

export type AnswerPositionDistributionRow = {
  groupKey: string;
  totalItems: number;
  index0Count: number;
  index1Count: number;
  index2Count: number;
  index3Count: number;
  dominantIndex: string;
  dominantPct: number;
  result: RuleResult;
  notes: string;
};

export type DuplicateItemReportRow = {
  duplicateGroupId: string;
  ruleId: string;
  itemIds: string;
  count: number;
  gradeLevel: string;
  itemType: string;
  standardCode: string;
  normalizedStem: string;
  normalizedChoices: string;
  sourceType: string;
  severity: "INFO" | "WARNING" | "BLOCKER";
};

export type PassageRepetitionReportRow = {
  passageId: string;
  title: string;
  gradeLevel: number | string;
  wordCount: number;
  paragraphCount: number;
  uniqueParagraphCount: number;
  repeatedParagraphCount: number;
  sentenceCount: number;
  uniqueSentenceCount: number;
  repeatedSentenceCount: number;
  uniqueSentenceRatio: number;
  repeatedBlocks: string;
  result: RuleResult;
  severity: "INFO" | "WARNING" | "BLOCKER";
};

export type LinterReportRow = {
  entityType: string;
  entityId: string;
  source: string;
  ruleId: string;
  severity: string;
  result: RuleResult;
  evidence: string;
};

export type McqCorrectIsLongestRow = {
  scope: "item" | "batch";
  itemId: string;
  totalMcq: number;
  correctLongestCount: number;
  correctLongestPct: number;
  correctIndex: number | string;
  correctWordLength: number | string;
  longestDistractorWordLength: number | string;
  correctCharLength: number | string;
  longestDistractorCharLength: number | string;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export type McqAbsoluteLanguageRow = {
  itemId: string;
  choiceIndex: number;
  term: string;
  isCorrectChoice: boolean;
  severity: "INFO" | "WARNING" | "BLOCKER";
  result: RuleResult;
  notes: string;
};

export function buildManifestValidationReport({ manifest, actual }: ManifestValidationInput): ManifestValidationRow[] {
  const counts = manifest?.counts ?? {};
  const rows = [
    row("pssa_diagnostic_items.jsonl", manifest.totalDiagnosticItems ?? counts.diagnosticItems, actual.diagnosticItems),
    row("pssa_lessons.jsonl", manifest.totalLessons ?? counts.lessons, actual.lessons),
    row("pssa_passages.jsonl", manifest.totalPassages ?? counts.passages, actual.passages),
    row("pssa_standards_alignment.csv", manifest.totalStandards ?? counts.standardsAlignmentRows, actual.standards),
    row("pssa_student_preview.md", manifest.totalStudentPreviewEntries ?? counts.studentPreviewEntries, actual.studentPreviewEntries),
  ];
  return rows;

  function row(fileName: string, manifestCount: unknown, actualCount: number): ManifestValidationRow {
    const parsed = typeof manifestCount === "number" ? manifestCount : Number(manifestCount);
    const hasCount = Number.isFinite(parsed);
    const result = hasCount && parsed === actualCount ? "PASS" : "FAIL";
    return {
      fileName,
      manifestCount: hasCount ? parsed : "missing",
      actualCount,
      result,
      notes: result === "PASS" ? "Manifest count matches file count." : `PSSA_MANIFEST_COUNT_MISMATCH: manifest=${hasCount ? parsed : "missing"} actual=${actualCount}`,
    };
  }
}

export function buildAnswerPositionDistribution(items: any[]): AnswerPositionDistributionRow[] {
  const selected = items.map(toAuditItem).filter((item) => item.correctIndex !== null && item.choices.length >= 2);
  const rows: AnswerPositionDistributionRow[] = [];
  const overall = selected;
  if (overall.length) rows.push(distributionRow("overall", overall, 0.4, true));

  const parentGroups = groupBy(selected, (item) => `gradeLevel=${item.gradeLevel}|subject=${item.subject}|itemType=${item.itemType}`);
  for (const [key, group] of [...parentGroups.entries()].sort()) {
    rows.push(distributionRow(key, group, 0.5, group.length >= 20));
  }

  const detailedGroups = groupBy(
    selected,
    (item) => `gradeLevel=${item.gradeLevel}|subject=${item.subject}|itemType=${item.itemType}|standardCode=${item.standardCode}|sourceType=${item.sourceType}`,
  );
  for (const [key, group] of [...detailedGroups.entries()].sort()) {
    rows.push(distributionRow(key, group, 0.5, group.length >= 20, group.length < 20 ? "N<20; rolled up into parent grade/itemType group." : undefined));
  }
  return rows;
}

export function buildDuplicateItemReport(items: any[]): DuplicateItemReportRow[] {
  const auditItems = items.map(toAuditItem).filter((item) => item.normalizedStem && item.normalizedChoices.length);
  const rows: DuplicateItemReportRow[] = [];
  const seenGroupKeys = new Set<string>();

  addDuplicateGroups("PSSA_DUPLICATE_ITEM_EXACT", groupBy(auditItems, (item) => exactDuplicateKey(item)), "BLOCKER");
  addDuplicateGroups("PSSA_DUPLICATE_ITEM_WITH_REORDERED_CHOICES", groupBy(auditItems, (item) => reorderedDuplicateKey(item)), "WARNING");
  addDuplicateGroups("PSSA_DUPLICATE_ITEM_GROUP_TOO_LARGE", groupBy(auditItems, (item) => stemOnlyDuplicateKey(item)), "WARNING", 5);

  return rows;

  function addDuplicateGroups(ruleId: string, groups: Map<string, ReturnType<typeof toAuditItem>[]>, severity: DuplicateItemReportRow["severity"], minCount = 2) {
    for (const [key, group] of groups) {
      if (!key || group.length < minCount) continue;
      const uniqueIds = [...new Set(group.map((item) => item.itemId))];
      if (uniqueIds.length < minCount) continue;
      const groupKey = `${ruleId}:${key}`;
      if (seenGroupKeys.has(groupKey)) continue;
      seenGroupKeys.add(groupKey);
      const first = group[0];
      rows.push({
        duplicateGroupId: shortHash(groupKey),
        ruleId,
        itemIds: uniqueIds.join("|"),
        count: uniqueIds.length,
        gradeLevel: uniqueValues(group.map((item) => String(item.gradeLevel))).join("|"),
        itemType: uniqueValues(group.map((item) => item.itemType)).join("|"),
        standardCode: uniqueValues(group.map((item) => item.standardCode)).join("|"),
        normalizedStem: first.normalizedStem.slice(0, 500),
        normalizedChoices: first.normalizedChoices.join(" | ").slice(0, 500),
        sourceType: uniqueValues(group.map((item) => item.sourceType)).join("|"),
        severity,
      });
    }
  }
}

export function buildPassageRepetitionReport(passages: any[]): PassageRepetitionReportRow[] {
  return passages.map((passage) => {
    const text = String(passage.content ?? passage.text ?? "");
    const paragraphs = splitParagraphs(text);
    const sentences = splitSentences(text);
    const paragraphCounts = frequency(paragraphs.map(normalizeText));
    const sentenceCounts = frequency(sentences.map(normalizeText));
    const repeatedParagraphCount = repeatedCount(paragraphCounts);
    const repeatedSentenceCount = repeatedCount(sentenceCounts);
    const repeatedBlocks = repeatedNgramBlocks(text, 10);
    const uniqueSentenceRatio = sentences.length ? round(countOnce(sentenceCounts) / sentences.length) : 1;
    const uniqueParagraphCount = countOnce(paragraphCounts);
    const failures = [
      repeatedParagraphCount > 0 ? "PSSA_PASSAGE_REPEATED_PARAGRAPH" : "",
      repeatedSentenceCount > 0 ? "PSSA_PASSAGE_REPEATED_SENTENCE" : "",
      uniqueSentenceRatio < 0.75 ? "PSSA_PASSAGE_LOW_UNIQUE_SENTENCE_RATIO" : "",
      repeatedBlocks.length > 0 ? "PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED" : "",
    ].filter(Boolean);
    return {
      passageId: String(passage.passageId ?? passage.id ?? ""),
      title: String(passage.title ?? ""),
      gradeLevel: passage.grade ?? passage.gradeLevel ?? "",
      wordCount: wordCount(text),
      paragraphCount: paragraphs.length,
      uniqueParagraphCount,
      repeatedParagraphCount,
      sentenceCount: sentences.length,
      uniqueSentenceCount: countOnce(sentenceCounts),
      repeatedSentenceCount,
      uniqueSentenceRatio,
      repeatedBlocks: repeatedBlocks.join(" | ").slice(0, 1000),
      result: failures.length ? "FAIL" : "PASS",
      severity: failures.includes("PSSA_PASSAGE_REPEATED_PARAGRAPH") || failures.includes("PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED") ? "BLOCKER" : failures.length ? "WARNING" : "INFO",
    };
  });
}

export function buildMcqCorrectIsLongestReport(items: any[], batchThreshold = 0.35): McqCorrectIsLongestRow[] {
  const mcqs = items.map(toAuditItem).filter((item) => item.correctIndex !== null && item.choices.length === 4);
  const rows: McqCorrectIsLongestRow[] = [];
  let blockerCount = 0;
  let warningCount = 0;

  for (const item of mcqs) {
    const lengths = item.choices.map((choice) => ({ words: wordCount(choice), chars: String(choice).length }));
    const correct = lengths[item.correctIndex as number];
    const distractors = lengths.filter((_, index) => index !== item.correctIndex);
    const longestDistractorWords = Math.max(...distractors.map((entry) => entry.words));
    const longestDistractorChars = Math.max(...distractors.map((entry) => entry.chars));
    const correctIsSingleLongestByWords = lengths.filter((entry) => entry.words >= correct.words).length === 1;
    const correctIsSingleLongestByChars = lengths.filter((entry) => entry.chars >= correct.chars).length === 1;
    const wordDelta = correct.words - longestDistractorWords;
    const charDeltaPct = longestDistractorChars ? (correct.chars - longestDistractorChars) / longestDistractorChars : 0;
    const isBlocker = (correctIsSingleLongestByWords && wordDelta >= 2) || (correctIsSingleLongestByChars && charDeltaPct >= 0.15);
    const isWarning = !isBlocker && correctIsSingleLongestByWords && wordDelta === 1;
    if (isBlocker) blockerCount += 1;
    if (isWarning) warningCount += 1;
    rows.push({
      scope: "item",
      itemId: item.itemId,
      totalMcq: 1,
      correctLongestCount: correctIsSingleLongestByWords || correctIsSingleLongestByChars ? 1 : 0,
      correctLongestPct: correctIsSingleLongestByWords || correctIsSingleLongestByChars ? 1 : 0,
      correctIndex: item.correctIndex as number,
      correctWordLength: correct.words,
      longestDistractorWordLength: longestDistractorWords,
      correctCharLength: correct.chars,
      longestDistractorCharLength: longestDistractorChars,
      severity: isBlocker ? "BLOCKER" : isWarning ? "WARNING" : "INFO",
      result: isBlocker ? "FAIL" : "PASS",
      notes: isBlocker
        ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest by ${wordDelta} words and ${Math.round(charDeltaPct * 100)}% chars.`
        : isWarning
          ? "PSSA_MCQ_CORRECT_IS_LONGEST warning: correct choice is single longest by 1 word."
          : "Correct choice length is within threshold.",
    });
  }

  const correctLongestCount = rows.filter((row) => row.correctLongestCount > 0).length;
  const pct = mcqs.length ? round(correctLongestCount / mcqs.length) : 0;
  rows.push({
    scope: "batch",
    itemId: "batch",
    totalMcq: mcqs.length,
    correctLongestCount,
    correctLongestPct: pct,
    correctIndex: "",
    correctWordLength: "",
    longestDistractorWordLength: "",
    correctCharLength: "",
    longestDistractorCharLength: "",
    severity: pct > batchThreshold ? "BLOCKER" : warningCount ? "WARNING" : blockerCount ? "BLOCKER" : "INFO",
    result: pct > batchThreshold ? "FAIL" : "PASS",
    notes: pct > batchThreshold
      ? `PSSA_MCQ_CORRECT_IS_LONGEST: correct choice is longest in ${Math.round(pct * 100)}% of MCQs.`
      : "Batch correct-longest rate within threshold.",
  });
  return rows;
}

export function buildMcqAbsoluteLanguageDistractorReport(items: any[]): McqAbsoluteLanguageRow[] {
  const mcqs = items.map(toAuditItem).filter((item) => item.correctIndex !== null && item.choices.length === 4);
  const rows: McqAbsoluteLanguageRow[] = [];
  for (const item of mcqs) {
    item.choices.forEach((choice, choiceIndex) => {
      for (const term of absoluteLanguageTerms(choice)) {
        const isCorrectChoice = choiceIndex === item.correctIndex;
        rows.push({
          itemId: item.itemId,
          choiceIndex,
          term,
          isCorrectChoice,
          severity: isCorrectChoice ? "WARNING" : "BLOCKER",
          result: isCorrectChoice ? "PASS" : "FAIL",
          notes: isCorrectChoice
            ? `Correct answer contains absolute term "${term}"; flag for human review.`
            : `PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: distractor contains "${term}".`,
        });
      }
    });
  }
  return rows.length ? rows : [{
    itemId: "batch",
    choiceIndex: -1,
    term: "",
    isCorrectChoice: false,
    severity: "INFO",
    result: "PASS",
    notes: "No absolute-language distractors found.",
  }];
}

export function detectorRowsToLinterRows(args: {
  manifestRows: ManifestValidationRow[];
  answerRows: AnswerPositionDistributionRow[];
  duplicateRows: DuplicateItemReportRow[];
  passageRows: PassageRepetitionReportRow[];
}): LinterReportRow[] {
  const rows: LinterReportRow[] = [];
  for (const row of args.manifestRows.filter((entry) => entry.result === "FAIL")) {
    rows.push({ entityType: "manifest", entityId: row.fileName, source: "audit_bundle", ruleId: "PSSA_MANIFEST_COUNT_MISMATCH", severity: "BLOCKER", result: "FAIL", evidence: row.notes });
  }
  for (const row of args.answerRows.filter((entry) => entry.result === "FAIL")) {
    rows.push({ entityType: "diagnostic_item_group", entityId: row.groupKey, source: "audit_bundle", ruleId: "PSSA_ANSWER_POSITION_BIAS", severity: "BLOCKER", result: "FAIL", evidence: row.notes });
  }
  for (const row of args.duplicateRows) {
    rows.push({ entityType: "diagnostic_item_group", entityId: row.duplicateGroupId, source: row.sourceType, ruleId: row.ruleId, severity: row.severity, result: "FAIL", evidence: `count=${row.count}; itemIds=${row.itemIds}` });
  }
  for (const row of args.passageRows.filter((entry) => entry.result === "FAIL")) {
    const evidence = [
      row.repeatedParagraphCount > 0 ? `PSSA_PASSAGE_REPEATED_PARAGRAPH repeatedParagraphCount=${row.repeatedParagraphCount}` : "",
      row.repeatedSentenceCount > 0 ? `PSSA_PASSAGE_REPEATED_SENTENCE repeatedSentenceCount=${row.repeatedSentenceCount}` : "",
      row.uniqueSentenceRatio < 0.75 ? `PSSA_PASSAGE_LOW_UNIQUE_SENTENCE_RATIO uniqueSentenceRatio=${row.uniqueSentenceRatio}` : "",
      row.repeatedBlocks ? `PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED repeatedBlocks=${row.repeatedBlocks}` : "",
    ].filter(Boolean).join("; ");
    rows.push({ entityType: "passage", entityId: row.passageId, source: "audit_bundle", ruleId: firstPassageRule(row), severity: row.severity, result: "FAIL", evidence });
  }
  return rows;
}

export function readJsonl(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function countJsonl(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => line.trim()).length;
}

export function countCsvRows(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter((line) => line.trim());
  return Math.max(0, lines.length - 1);
}

export function countStudentPreviewEntries(markdown: string): number {
  return markdown.split(/\r?\n/).filter((line) => /^### Item\s+\d+/i.test(line.trim())).length;
}

export function writeCsv(filePath: string, rows: Record<string, unknown>[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, toCsv(rows));
}

export function toCsv(rows: Record<string, unknown>[]) {
  const headers = [...rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>())];
  if (!headers.length) return "";
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function distributionRow(groupKey: string, items: ReturnType<typeof toAuditItem>[], threshold: number, evaluate: boolean, skipNote?: string): AnswerPositionDistributionRow {
  const counts = [0, 0, 0, 0];
  for (const item of items) {
    if (item.correctIndex !== null && item.correctIndex >= 0 && item.correctIndex <= 3) counts[item.correctIndex] += 1;
  }
  const dominantCount = Math.max(...counts);
  const dominantIndex = counts.indexOf(dominantCount);
  const dominantPct = items.length ? round(dominantCount / items.length) : 0;
  const result = !evaluate ? "SKIP" : dominantPct > threshold ? "FAIL" : "PASS";
  return {
    groupKey,
    totalItems: items.length,
    index0Count: counts[0],
    index1Count: counts[1],
    index2Count: counts[2],
    index3Count: counts[3],
    dominantIndex: String(dominantIndex),
    dominantPct,
    result,
    notes: skipNote ?? (result === "FAIL" ? `PSSA_ANSWER_POSITION_BIAS: index ${dominantIndex} appears ${Math.round(dominantPct * 100)}% of the time.` : "Distribution within threshold."),
  };
}

function toAuditItem(raw: any) {
  const item = raw.item ?? raw.questionPayload ?? raw;
  const prompt = studentFacingPrompt(item);
  const choices = visibleChoices(item);
  const passageText = String(item.passage ?? raw.passage ?? "");
  const passageId = String(raw.passageId ?? item.passageId ?? "");
  return {
    raw,
    item,
    itemId: String(raw.itemId ?? raw.id ?? item.id ?? ""),
    gradeLevel: raw.grade ?? raw.gradeLevel ?? item.gradeLevel ?? "",
    subject: raw.subject ?? "ELA",
    itemType: raw.questionType ?? raw.itemType ?? item.type ?? "",
    standardCode: raw.standardCode ?? item.standardCode ?? "",
    sourceType: raw.source ?? raw.sourceType ?? "",
    passageId,
    passageHash: passageText ? shortHash(normalizeText(passageText)) : "",
    normalizedStem: normalizeText(prompt),
    normalizedStimulus: normalizeText(passageText || item.passageTitle || raw.passageTitle || ""),
    normalizedChoices: choices.map(normalizeText).filter(Boolean),
    sortedChoices: choices.map(normalizeText).filter(Boolean).sort(),
    correctIndex: typeof item.correctIndex === "number" ? item.correctIndex : null,
    correctAnswer: normalizeText(item.correctAnswer ?? (typeof item.correctIndex === "number" ? choices[item.correctIndex] : "")),
    choices,
  };
}

function studentFacingPrompt(item: any) {
  return String(item?.question ?? item?.studentFacingPrompt ?? item?.partAQuestion ?? item?.prompt ?? item?.hotTextPrompt ?? item?.dragDropPrompt ?? "");
}

function visibleChoices(item: any): string[] {
  if (Array.isArray(item?.choices)) return item.choices.map(String);
  if (Array.isArray(item?.answerChoicesJson)) return item.answerChoicesJson.map(String);
  if (Array.isArray(item?.partAChoices)) return item.partAChoices.map(String);
  if (Array.isArray(item?.selectableSpans)) return item.selectableSpans.map(String);
  if (Array.isArray(item?.dragItems)) return item.dragItems.map((entry: any) => String(entry?.text ?? entry));
  return [];
}

function exactDuplicateKey(item: ReturnType<typeof toAuditItem>) {
  return [item.gradeLevel, item.itemType, item.standardCode, item.passageId || item.passageHash, item.normalizedStem, item.normalizedChoices.join("||")].join("::");
}

function reorderedDuplicateKey(item: ReturnType<typeof toAuditItem>) {
  return [item.gradeLevel, item.itemType, item.standardCode, item.passageId || item.passageHash, item.normalizedStem, item.sortedChoices.join("||")].join("::");
}

function stemOnlyDuplicateKey(item: ReturnType<typeof toAuditItem>) {
  return [item.gradeLevel, item.itemType, item.standardCode, item.normalizedStem].join("::");
}

function firstPassageRule(row: PassageRepetitionReportRow) {
  if (row.repeatedParagraphCount > 0) return "PSSA_PASSAGE_REPEATED_PARAGRAPH";
  if (row.repeatedSentenceCount > 0) return "PSSA_PASSAGE_REPEATED_SENTENCE";
  if (row.uniqueSentenceRatio < 0.75) return "PSSA_PASSAGE_LOW_UNIQUE_SENTENCE_RATIO";
  return "PSSA_PASSAGE_GENERATION_PADDING_SUSPECTED";
}

function splitParagraphs(text: string) {
  return text.split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean);
}

function splitSentences(text: string) {
  return text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/g).map((part) => part.trim()).filter(Boolean);
}

function repeatedNgramBlocks(text: string, size: number) {
  const words = normalizeText(text).split(" ").filter(Boolean);
  const counts = new Map<string, number>();
  for (let index = 0; index <= words.length - size; index += size) {
    const block = words.slice(index, index + size).join(" ");
    counts.set(block, (counts.get(block) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([block, count]) => `${count}x:${block}`);
}

function frequency(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function repeatedCount(counts: Map<string, number>) {
  let total = 0;
  for (const count of counts.values()) if (count > 1) total += count - 1;
  return total;
}

function countOnce(counts: Map<string, number>) {
  return [...counts.keys()].length;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function shortHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function wordCount(value: string) {
  return (value.match(/[A-Za-z0-9']+/g) ?? []).length;
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function absoluteLanguageTerms(value: string) {
  const matches = value.match(/\b(?:never|always|only|every|all|none|must|cannot)\b/gi) ?? [];
  return [...new Set(matches.map((match) => match.toLowerCase()))];
}
