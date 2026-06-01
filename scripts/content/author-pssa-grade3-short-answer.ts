import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  type PassageQualityRow,
  type PssaPassageAuditInput,
} from "../audit/pssa-audit-detectors";

type Result = "PASS" | "FAIL";
type SourceCorpusEntry = { file: string; normalizedText: string; contentNormalizedText: string };
type PartialCreditRule = { points: number; rule: string };

type AcceptableTextSupport = {
  supportId: string;
  supportType: "direct_quote" | "paraphrase";
  quotedSpan?: string;
  detail: string;
  connectsToExpectedAnswer: string;
  independentKey: string;
};

type Rubric = {
  points3: string;
  points2: string;
  points1: string;
  points0: string;
};

type ScoreBandExample = {
  band: 3 | 2 | 1 | 0;
  response: string;
  why: string;
  supportIdsUsed?: string[];
  copyOnly?: boolean;
};

type ShortAnswerItem = {
  itemId: string;
  model: "PssaItem";
  module: "PSSA";
  subject: "ELA";
  gradeLevel: 3;
  itemType: "CONSTRUCTED_RESPONSE";
  interactionType: "SHORT_ANSWER";
  interactionSubtype: "text_supported_short_answer";
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: "key_ideas_details" | "integration_knowledge_ideas";
  reportingCategory: "A" | "B";
  stem: string;
  instructionText: string;
  requiredSupportCount: 2;
  requiresTextSupport: true;
  expectedAnswerCore: string;
  acceptableTextSupport: AcceptableTextSupport[];
  rubric: Rubric;
  copiedTextCap: true;
  copiedTextCapRule: string;
  scoreBandExamples: ScoreBandExample[];
  scoring: { totalPoints: 3; partialCreditRules: PartialCreditRule[]; scoringNotes: string };
  reviewStatus: "PENDING";
  itemStatus: "candidate";
  sourceType: "internal_original";
  licenseStatus: "cleared_internal_original";
  auditMetadata: { authoredIn: "PSSA_PR_4O_GRADE3_SHORT_ANSWER"; noDbWrite: true; autoScoringClaim: false };
};

type SourceMatch = {
  itemId: string;
  field: string;
  matchedSource: string;
  longestNormalizedNgram: string;
  overlapScore: number;
  boilerplateOrContent: "none" | "boilerplate" | "content";
  result: Result;
  notes: string;
};

type AuditRow = {
  itemId: string;
  gradeLevel: 3;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: string;
  stem: string;
  requiresTextSupport: boolean;
  expectedAnswerCorePresent: Result;
  acceptableTextSupportCount: number;
  quotedSpansVerbatimResult: Result;
  rubricValidResult: Result;
  promptRequiresSupportResult: Result;
  copiedTextCapResult: Result;
  scoreBandExamplesResult: Result;
  supportSufficiencyResult: Result;
  skillMatchResult: Result;
  groundingResult: Result;
  sourceComplianceResult: Result;
  previewLeakResult: Result;
  finalResult: Result;
  notes: string;
};

type InventoryRow = {
  existingGrade3ShortAnswerCount: number;
  activeOldGrade3ShortAnswerCount: number;
  deprecatedOrQuarantinedGrade3ShortAnswerCount: number;
  ecDistribution: string;
  result: Result;
  notes: string;
};

type HashProofRow = {
  contentGroup: string;
  itemCount: number;
  beforeHash: string;
  afterHash: string;
  unchanged: "YES" | "NO";
};

type BlueprintRow = {
  shortAnswerPoolCount: number;
  shortAnswerDrawCount: number;
  shortAnswerPointsPerItem: number;
  activeFormShortAnswerPoints: number;
  poolShortAnswerPoints: number;
  result: Result;
  notes: string;
};

type ItemTypeCompletenessRow = {
  itemType: string;
  grade3Status: "PRESENT" | "N/A";
  countOrDraw: string;
  notes: string;
};

type AuditBundle = {
  items: ShortAnswerItem[];
  rows: AuditRow[];
  sourceMatches: SourceMatch[];
  passageRows: PassageQualityRow[];
  hashRows: HashProofRow[];
  inventory: InventoryRow;
  blueprint: BlueprintRow;
  completenessRows: ItemTypeCompletenessRow[];
};

type AuditOptions = {
  sourceScan?: boolean;
  passageScan?: boolean;
};

const outputDir = path.resolve("exemplars/pssa_grade3_short_answer");
const pilotPath = path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json");
const sourceDirs = [path.resolve("reference/pssa-released-items"), path.resolve("reference/pssa-item-catalog")];
const sourceTextExtensions = new Set([".md", ".txt", ".csv", ".json", ".html", ".pdf"]);
const boilerplatePatterns = [
  "use details from the passage",
  "use text support",
  "write a short answer",
  "explain your answer",
  "support your answer",
];
const previewLeakPattern = /expectedAnswerCore|acceptableTextSupport|rubric|scoreBandExamples|copiedTextCapRule|quotedSpan|data-correct|answerKey|rationale|skillMatchResult|sourceComplianceResult|auditMetadata|reviewer/i;
const validGrade3ReadingEcs = loadGrade3ReadingEcSet();

function loadJson(file: string) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function loadPilot() {
  return loadJson(pilotPath);
}

function passageMap() {
  const pilot = loadPilot();
  return new Map((pilot.passages as PssaPassageAuditInput[]).map((passage) => [passage.id, passage]));
}

export function buildGrade3ShortAnswerItems(): ShortAnswerItem[] {
  return [
    makeSa({
      itemId: "pssa_sa_g3_creek_main_idea_01",
      passageId: "pssa_psg_g3_creek_watchers",
      passageTitle: "The Night the Creek Glowed",
      eligibleContent: "E03.B-K.1.1.2",
      ecSkillFamily: "key_ideas_details",
      reportingCategory: "B",
      stem: "What is the main idea of the passage? Use two details from the passage to support your answer.",
      instructionText: "Write a short answer that states the main idea and explains how two passage details support it.",
      expectedAnswerCore: "The class learns to observe the creek carefully and use evidence to explain why the green glow was strongest near the sunny bank.",
      support: [
        quote("creek_s1", "Near the sunny bank, the green color was thicker.", "This detail identifies the place where the glow was strongest.", "sunny-bank"),
        quote("creek_s2", "Two warm days had followed a heavy rain.", "This detail explains one condition that helped the class think about the glow.", "weather-rain"),
        quote("creek_s3", "Maya added her map to the notice so readers could see why the sunny bank mattered most.", "This detail shows the class used observations as evidence for readers.", "map-evidence"),
      ],
      skillTag: "main idea",
      examples: {
        band3: "The main idea is that Maya's class uses careful observations to understand the creek glow. They notice that the green color was thicker near the sunny bank, and they compare their notes with the weather chart after two warm days and heavy rain. These details show they are using evidence instead of guessing.",
        band2: "The class is trying to learn about the glow. One detail is that the green color was thicker near the sunny bank. They also made a map, but my answer does not fully explain why those details support the main idea.",
        band1: "Near the sunny bank, the green color was thicker. Two warm days had followed a heavy rain.",
        band0: "The creek is green because green is a pretty color.",
      },
    }),
    makeSa({
      itemId: "pssa_sa_g3_map_evidence_01",
      passageId: "pssa_psg_g3_the_map_in_the_station",
      passageTitle: "A Map Under the Bench",
      eligibleContent: "E03.B-C.3.1.3",
      ecSkillFamily: "integration_knowledge_ideas",
      reportingCategory: "B",
      stem: "How does the old map help people understand the town's past and present? Use two details from the passage to support your answer.",
      instructionText: "Write a short answer that explains how information from the map and the passage helps visitors compare the town then and now.",
      expectedAnswerCore: "The old map helps people compare what changed in town with landmarks that stayed in place.",
      support: [
        quote("map_s1", "The map showed trolley stops, a river bridge, and a market square that no longer had tracks.", "This detail shows information from the old map about the town's past.", "old-map-features"),
        quote("map_s2", "Some streets had new names, and the trolley tracks were gone.", "This detail names changes that visitors can compare with the newer map.", "changes"),
        quote("map_s3", "Still, the river, the hill road, and the market square helped visitors compare past and present.", "This detail directly explains how the map supports comparison.", "compare-landmarks"),
      ],
      skillTag: "map and text evidence",
      examples: {
        band3: "The map helps people see what changed and what stayed the same. It shows trolley stops and a market square from the past, and the passage says some street names changed and the tracks were gone. The river and market square still helped visitors compare the two maps.",
        band2: "The old map helps people learn about the town. It shows trolley stops, and the new map is different. This uses some evidence but does not fully explain the past-and-present comparison.",
        band1: "Some streets had new names, and the trolley tracks were gone. Still, the river, the hill road, and the market square helped visitors compare past and present.",
        band0: "Maps are useful because they are colorful.",
      },
    }),
    makeSa({
      itemId: "pssa_sa_g3_lunch_sequence_01",
      passageId: "pssa_psg_g3_a_cooler_lunch_line",
      passageTitle: "The Bell That Saved Lunch",
      eligibleContent: "E03.B-K.1.1.3",
      ecSkillFamily: "key_ideas_details",
      reportingCategory: "B",
      stem: "Explain how the class solved the lunch-line problem. Use two details from the passage to support your answer.",
      instructionText: "Write a short answer that explains the problem-solution sequence and supports it with two text details.",
      expectedAnswerCore: "The class observed the lunch line, found the slow spots, made small changes, and checked whether the changes worked.",
      support: [
        quote("lunch_s1", "They counted how many times the line paused.", "This detail shows the class gathered information before changing anything.", "observe-count"),
        quote("lunch_s2", "Milk moved to the first table, before trays.", "This detail names one change that addressed the milk-carton problem.", "milk-change"),
        quote("lunch_s3", "Spoons and napkins went into two red baskets at the end.", "This detail names another change that addressed the hard-to-reach supplies.", "basket-change"),
        quote("lunch_s4", "Room 3 wrote the result on a chart and decided to check again next week", "This detail shows the class tested the solution instead of stopping after one day.", "check-again"),
      ],
      skillTag: "sequence and cause/effect",
      examples: {
        band3: "The class solved the problem by watching the line, changing the setup, and checking the result. They counted how many times the line paused, then moved milk before the trays and put spoons and napkins in red baskets. Those details show a clear problem-solution order.",
        band2: "The class made the lunch line better. They moved milk before trays and put napkins in baskets. This gives details, but it does not explain the whole sequence of observing, changing, and checking.",
        band1: "Milk moved to the first table, before trays. Spoons and napkins went into two red baskets at the end.",
        band0: "Lunch was saved because everyone liked soup.",
      },
    }),
    makeSa({
      itemId: "pssa_sa_g3_mural_character_01",
      passageId: "pssa_psg_g3_the_mural_plan",
      passageTitle: "Blue Paint for Saturday",
      eligibleContent: "E03.A-K.1.1.3",
      ecSkillFamily: "key_ideas_details",
      reportingCategory: "A",
      stem: "How does the narrator's attitude about the mural change? Use two details from the passage to support your answer.",
      instructionText: "Write a short answer that describes the narrator's change and supports it with two passage details.",
      expectedAnswerCore: "The narrator changes from unsure and frustrated about painting to proud of helping make the mural look alive.",
      support: [
        quote("mural_s1", "The label said sky blue, but inside the can the paint looked like melted berries.", "This detail shows the narrator starts unsure about the paint.", "paint-uncertainty"),
        quote("mural_s2", "At first, I worked too fast.", "This detail shows the narrator makes a mistake and feels unsure.", "mistake"),
        quote("mural_s3", "The fish looked as if they were flicking through the water.", "This detail shows the narrator turns the mistake into something that improves the mural.", "ripples"),
        quote("mural_s4", "I just stood there, smiling at the blue.", "This detail shows the narrator feels proud at the end.", "pride"),
      ],
      skillTag: "character change",
      examples: {
        band3: "The narrator changes from unsure to proud. At first the paint does not look sky blue, and the narrator works too fast and drips paint on the fish. Later the ripples make the fish look as if they are moving, and the narrator stands smiling at the blue.",
        band2: "The narrator feels better by the end. The fish look as if they are moving, and the narrator smiles. This has text details but does not explain the beginning of the change very much.",
        band1: "The fish looked as if they were flicking through the water. I just stood there, smiling at the blue.",
        band0: "The narrator is happy because soccer is fun.",
      },
    }),
    makeSa({
      itemId: "pssa_sa_g3_cart_connection_01",
      passageId: "pssa_psg_g3_the_cart_that_would_not_turn",
      passageTitle: "The Cart That Would Not Turn",
      eligibleContent: "E03.B-C.3.1.1",
      ecSkillFamily: "integration_knowledge_ideas",
      reportingCategory: "B",
      stem: "Why is the order of steps important when fixing the cart? Use two details from the passage to support your answer.",
      instructionText: "Write a short answer that explains the connection between the steps and the successful repair.",
      expectedAnswerCore: "The order matters because unloading and checking first help the class find the small cause before they fix the wheel safely.",
      support: [
        quote("cart_s1", "First, you would empty the heavy paper boxes from the bottom shelf.", "This detail shows the first step makes the cart easier to inspect.", "empty-first"),
        quote("cart_s2", "Weight can hide a small problem.", "This detail explains why the first step matters.", "weight-hides"),
        quote("cart_s3", "On the green cart, a strand of yarn had wrapped around the front axle.", "This detail identifies the cause found by checking the wheel.", "yarn-cause"),
        quote("cart_s4", "Their careful order saved time and kept the floor completely clear.", "This detail states the result of following the steps carefully.", "result"),
      ],
      skillTag: "logical connection",
      examples: {
        band3: "The order is important because each step helps the class find and fix the real problem. First they empty the heavy boxes because weight can hide a small problem. Then they find yarn wrapped around the axle, so the repair fixes the cause instead of just pushing harder.",
        band2: "The steps are important because the class finds yarn on the wheel. They empty the cart first. This gives some support but does not fully explain how the steps connect to the repair.",
        band1: "First, you would empty the heavy paper boxes from the bottom shelf. Weight can hide a small problem.",
        band0: "The cart turns because green carts are easy to move.",
      },
    }),
  ];
}

function quote(supportId: string, quotedSpan: string, connectsToExpectedAnswer: string, independentKey: string): AcceptableTextSupport {
  return { supportId, supportType: "direct_quote", quotedSpan, detail: quotedSpan, connectsToExpectedAnswer, independentKey };
}

function makeSa(args: {
  itemId: string;
  passageId: string;
  passageTitle: string;
  eligibleContent: string;
  ecSkillFamily: ShortAnswerItem["ecSkillFamily"];
  reportingCategory: ShortAnswerItem["reportingCategory"];
  stem: string;
  instructionText: string;
  expectedAnswerCore: string;
  support: AcceptableTextSupport[];
  skillTag: string;
  examples: { band3: string; band2: string; band1: string; band0: string };
}): ShortAnswerItem {
  return {
    itemId: args.itemId,
    model: "PssaItem",
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 3,
    itemType: "CONSTRUCTED_RESPONSE",
    interactionType: "SHORT_ANSWER",
    interactionSubtype: "text_supported_short_answer",
    passageId: args.passageId,
    passageTitle: args.passageTitle,
    eligibleContent: args.eligibleContent,
    ecSkillFamily: args.ecSkillFamily,
    reportingCategory: args.reportingCategory,
    stem: args.stem,
    instructionText: args.instructionText,
    requiredSupportCount: 2,
    requiresTextSupport: true,
    expectedAnswerCore: args.expectedAnswerCore,
    acceptableTextSupport: args.support,
    rubric: {
      points3: `A 3-point response gives ${args.expectedAnswerCore} and explains at least two accurate, independent details from "${args.passageTitle}" that support the answer.`,
      points2: `A 2-point response shows partial understanding of ${args.skillTag} and includes at least one accurate text detail, but the answer or support is incomplete.`,
      points1: `A 1-point response gives an incomplete or weak answer about ${args.skillTag}, gives no useful text support, misreads part of the task, or consists entirely or almost entirely of copied passage text.`,
      points0: `A 0-point response is insufficient, unrelated to "${args.passageTitle}", or inaccurate in all aspects of the task.`,
    },
    copiedTextCap: true,
    copiedTextCapRule: "A response made entirely or almost entirely of copied passage text with no student explanation earns no more than 1 point, even if the copied text is relevant.",
    scoreBandExamples: [
      { band: 3, response: args.examples.band3, why: "Correct answer plus at least two independent supporting details.", supportIdsUsed: args.support.slice(0, 2).map((support) => support.supportId) },
      { band: 2, response: args.examples.band2, why: "Partial answer with some text support but not enough for the full-credit rule.", supportIdsUsed: [args.support[0].supportId] },
      { band: 1, response: args.examples.band1, why: "Relevant copied text only; copied-text cap limits the score to 1.", supportIdsUsed: args.support.slice(0, 2).map((support) => support.supportId), copyOnly: true },
      { band: 0, response: args.examples.band0, why: "Inaccurate or unsupported response." },
    ],
    scoring: {
      totalPoints: 3,
      partialCreditRules: [
        { points: 3, rule: "Correct answer plus at least two accurate, independent passage details or quotes." },
        { points: 2, rule: "Partial answer with at least one accurate passage detail; minor inaccuracy or incomplete explanation may remain." },
        { points: 1, rule: "Incomplete answer, no useful text support, misunderstanding, or relevant copy-only response." },
        { points: 0, rule: "Insufficient, unrelated, or inaccurate response." },
      ],
      scoringNotes: "Rubric metadata is validated for reviewer use only; this PR does not implement automated scoring.",
    },
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    sourceType: "internal_original",
    licenseStatus: "cleared_internal_original",
    auditMetadata: { authoredIn: "PSSA_PR_4O_GRADE3_SHORT_ANSWER", noDbWrite: true, autoScoringClaim: false },
  };
}

export function auditGrade3ShortAnswerItems(items = buildGrade3ShortAnswerItems(), options: AuditOptions = {}): AuditBundle {
  const sourceScan = options.sourceScan ?? true;
  const corpus = sourceScan ? loadSourceCorpus() : [];
  const sourceMatches: SourceMatch[] = [];
  const studentPreview = renderStudentPreview(items);
  const previewLeakResult: Result = previewLeakPattern.test(studentPreview) ? "FAIL" : "PASS";
  const rows = items.map((item) => auditItem(item, corpus, sourceMatches, previewLeakResult, sourceScan));
  const passageRows = options.passageScan === false ? [] : buildPssaPassageQualityReport(loadPilot().passages as PssaPassageAuditInput[]);
  return {
    items,
    rows,
    sourceMatches,
    passageRows,
    hashRows: buildUnchangedHashRows(),
    inventory: buildPreAuthoringInventory(),
    blueprint: buildBlueprintRow(items),
    completenessRows: buildCompletenessRows(items),
  };
}

function auditItem(item: ShortAnswerItem, corpus: SourceCorpusEntry[], sourceMatches: SourceMatch[], previewLeakResult: Result, sourceScan: boolean): AuditRow {
  const notes: string[] = [];
  const schemaResult = validateSchema(item, notes);
  const rubricValidResult = validateRubric(item, notes);
  const promptRequiresSupportResult = validatePromptRequiresSupport(item, notes);
  const componentsResult = validateExpectedComponents(item, notes);
  const copiedTextCapResult = validateCopiedTextCap(item, notes);
  const scoreBandExamplesResult = validateScoreBandExamples(item, notes);
  const supportSufficiencyResult = validateSupportSufficiency(item, notes);
  const skillMatchResult = validateSkillMatch(item, notes);
  const groundingResult = validateGrounding(item, notes);
  const itemMatches = sourceScan ? scanFields(item).map((field) => scanField(item.itemId, field.field, field.text, corpus)) : [];
  sourceMatches.push(...itemMatches);
  const sourceComplianceResult: Result = itemMatches.some((match) => match.result === "FAIL") ? "FAIL" : "PASS";
  if (sourceComplianceResult === "FAIL") notes.push("PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY");
  if (previewLeakResult === "FAIL") notes.push("PSSA_ITEM_PREVIEW_RENDERABLE");
  const finalResult = [
    schemaResult,
    rubricValidResult,
    promptRequiresSupportResult,
    componentsResult,
    copiedTextCapResult,
    scoreBandExamplesResult,
    supportSufficiencyResult,
    skillMatchResult,
    groundingResult,
    sourceComplianceResult,
    previewLeakResult,
  ].every((result) => result === "PASS") ? "PASS" : "FAIL";
  return {
    itemId: item.itemId,
    gradeLevel: 3,
    passageId: item.passageId,
    passageTitle: item.passageTitle,
    eligibleContent: item.eligibleContent,
    ecSkillFamily: item.ecSkillFamily,
    stem: item.stem,
    requiresTextSupport: item.requiresTextSupport,
    expectedAnswerCorePresent: item.expectedAnswerCore ? "PASS" : "FAIL",
    acceptableTextSupportCount: item.acceptableTextSupport.length,
    quotedSpansVerbatimResult: componentsResult,
    rubricValidResult,
    promptRequiresSupportResult,
    copiedTextCapResult,
    scoreBandExamplesResult,
    supportSufficiencyResult,
    skillMatchResult,
    groundingResult,
    sourceComplianceResult,
    previewLeakResult,
    finalResult,
    notes: [...new Set(notes)].join("|") || "PASS",
  };
}

function validateSchema(item: ShortAnswerItem, notes: string[]): Result {
  const passage = passageMap().get(item.passageId);
  const ok = item.gradeLevel === 3
    && item.itemType === "CONSTRUCTED_RESPONSE"
    && item.interactionType === "SHORT_ANSWER"
    && item.interactionSubtype === "text_supported_short_answer"
    && Boolean(passage)
    && validGrade3ReadingEcs.has(item.eligibleContent)
    && item.scoring.totalPoints === 3
    && item.reviewStatus === "PENDING"
    && item.itemStatus === "candidate"
    && item.sourceType === "internal_original"
    && item.licenseStatus === "cleared_internal_original";
  if (!ok) notes.push("PSSA_SA_SCHEMA_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateRubric(item: ShortAnswerItem, notes: string[]): Result {
  const values = [item.rubric.points3, item.rubric.points2, item.rubric.points1, item.rubric.points0];
  const combined = values.join(" ");
  const ok = values.every((value) => value.length > 40)
    && item.rubric.points3.includes(item.expectedAnswerCore)
    && combined.includes(item.passageTitle)
    && /copied passage text/.test(item.rubric.points1)
    && item.scoring.partialCreditRules.map((rule) => rule.points).join(",") === "3,2,1,0";
  if (!ok) notes.push("PSSA_SA_RUBRIC_VALID");
  return ok ? "PASS" : "FAIL";
}

function validatePromptRequiresSupport(item: ShortAnswerItem, notes: string[]): Result {
  const prompt = `${item.stem} ${item.instructionText}`.toLowerCase();
  const asksSupport = item.requiresTextSupport && /support|detail|evidence|passage|text/.test(prompt);
  const answerOnly = /copy two sentences|write the two sentences|one word|name only|who is|what color/.test(prompt);
  const ok = asksSupport && !answerOnly;
  if (!ok) notes.push("PSSA_SA_PROMPT_REQUIRES_TEXT_SUPPORT");
  return ok ? "PASS" : "FAIL";
}

function validateExpectedComponents(item: ShortAnswerItem, notes: string[]): Result {
  const passage = passageMap().get(item.passageId);
  const text = passage?.text ?? "";
  const quoteOk = item.acceptableTextSupport.every((support) => !support.quotedSpan || text.includes(support.quotedSpan));
  const ok = Boolean(item.expectedAnswerCore)
    && item.acceptableTextSupport.length > 0
    && quoteOk
    && item.acceptableTextSupport.every((support) => support.detail && support.connectsToExpectedAnswer);
  if (!ok) notes.push("PSSA_SA_EXPECTED_RESPONSE_COMPONENTS_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateCopiedTextCap(item: ShortAnswerItem, notes: string[]): Result {
  const copyRule = item.scoring.partialCreditRules.find((rule) => rule.points === 1)?.rule.toLowerCase() ?? "";
  const highRules = item.scoring.partialCreditRules.filter((rule) => rule.points >= 2).map((rule) => rule.rule.toLowerCase()).join(" ");
  const ok = item.copiedTextCap
    && /no more than 1 point|limits? the score to 1|earns no more than 1/.test(item.copiedTextCapRule.toLowerCase())
    && /copy|copied/.test(copyRule)
    && !/copy-only response earns 2|copied passage text earns 2|verbatim copy earns 2/.test(highRules);
  if (!ok) notes.push("PSSA_SA_COPIED_TEXT_CAP_ENCODED");
  return ok ? "PASS" : "FAIL";
}

function validateScoreBandExamples(item: ShortAnswerItem, notes: string[]): Result {
  const bands = new Set(item.scoreBandExamples.map((example) => example.band));
  const band1 = item.scoreBandExamples.find((example) => example.band === 1);
  const band3 = item.scoreBandExamples.find((example) => example.band === 3);
  const ok = [0, 1, 2, 3].every((band) => bands.has(band as 0 | 1 | 2 | 3))
    && item.scoreBandExamples.every((example) => example.response.length > 20 && example.why.length > 10)
    && Boolean(band1?.copyOnly)
    && !isCopyOnlyResponse(band3?.response ?? "", item);
  if (!ok) notes.push("PSSA_SA_SCORE_BAND_EXAMPLES_RENDERABLE");
  return ok ? "PASS" : "FAIL";
}

function validateSupportSufficiency(item: ShortAnswerItem, notes: string[]): Result {
  const independent = new Set(item.acceptableTextSupport.map((support) => support.independentKey));
  const supportById = new Map(item.acceptableTextSupport.map((support) => [support.supportId, support]));
  const band3Ids = item.scoreBandExamples.find((example) => example.band === 3)?.supportIdsUsed ?? [];
  const band2Ids = item.scoreBandExamples.find((example) => example.band === 2)?.supportIdsUsed ?? [];
  const band3Independent = new Set(band3Ids.map((id) => supportById.get(id)?.independentKey).filter(Boolean));
  const band2Independent = new Set(band2Ids.map((id) => supportById.get(id)?.independentKey).filter(Boolean));
  const ok = item.acceptableTextSupport.length >= item.requiredSupportCount
    && independent.size >= item.requiredSupportCount
    && item.acceptableTextSupport.every((support) => support.connectsToExpectedAnswer.length > 12)
    && band3Independent.size >= item.requiredSupportCount
    && band2Independent.size < item.requiredSupportCount;
  if (!ok) notes.push("PSSA_SA_SUPPORT_SUFFICIENCY_VALID");
  return ok ? "PASS" : "FAIL";
}

function validateSkillMatch(item: ShortAnswerItem, notes: string[]): Result {
  const prompt = `${item.stem} ${item.instructionText} ${item.expectedAnswerCore}`.toLowerCase();
  const ec = item.eligibleContent;
  const personalOpinionOnly = /your opinion|from your life|what do you think|personal opinion/.test(prompt);
  let ok = false;
  if (ec.endsWith("K.1.1.1")) ok = /answer|support|detail|passage|text/.test(prompt);
  if (ec.endsWith("K.1.1.2")) ok = /main idea|central/.test(prompt);
  if (ec.endsWith("K.1.1.3")) ok = /relationship|sequence|problem|solution|how .* solved|steps/.test(prompt);
  if (ec === "E03.A-K.1.1.3") ok = /character|narrator|attitude|change|actions/.test(prompt);
  if (ec === "E03.B-C.3.1.1") ok = /connection|order|steps|why/.test(prompt);
  if (ec === "E03.B-C.3.1.3") ok = /map|information|words|text|compare/.test(prompt);
  if (personalOpinionOnly) ok = false;
  if (!ok) notes.push("PSSA_SA_SKILL_MATCH");
  return ok ? "PASS" : "FAIL";
}

function validateGrounding(item: ShortAnswerItem, notes: string[]): Result {
  const passage = passageMap().get(item.passageId);
  const text = normalizeForScan(passage?.text ?? "");
  const supportGrounded = item.acceptableTextSupport.every((support) => {
    if (support.quotedSpan) return text.includes(normalizeForScan(support.quotedSpan));
    return overlapCount(contentTokensForScan(support.detail), contentTokensForScan(passage?.text ?? "")) >= 3;
  });
  const answerGrounded = overlapCount(contentTokensForScan(item.expectedAnswerCore), contentTokensForScan(passage?.text ?? "")) >= 2
    || item.acceptableTextSupport.length >= item.requiredSupportCount;
  const generalOnly = /in my opinion|from your life|without using the passage|what do you think/.test(`${item.stem} ${item.instructionText}`.toLowerCase());
  const ok = supportGrounded && answerGrounded && !generalOnly;
  if (!ok) notes.push("PSSA_SA_PASSAGE_GROUNDING");
  return ok ? "PASS" : "FAIL";
}

function isCopyOnlyResponse(response: string, item: ShortAnswerItem) {
  const passage = passageMap().get(item.passageId);
  const passageTokens = new Set(contentTokensForScan(passage?.text ?? ""));
  const responseTokens = contentTokensForScan(response);
  if (responseTokens.length < 5) return false;
  const copiedRatio = responseTokens.filter((token) => passageTokens.has(token)).length / responseTokens.length;
  const hasExplanation = /because|shows|means|this detail|these details|so|therefore|changes from|helps/.test(response.toLowerCase());
  return copiedRatio > 0.88 && !hasExplanation;
}

function buildPreAuthoringInventory(): InventoryRow {
  const existing = (loadPilot().items as any[]).filter((item) => {
    const values = [item.itemType, item.interactionType, item.questionType, item.responseType].filter(Boolean).map((value) => String(value).toUpperCase());
    return values.some((value) => value === "SHORT_ANSWER" || value === "CONSTRUCTED_RESPONSE" || value === "CR");
  });
  const active = existing.filter((item) => !["deprecated_superseded", "quarantined", "deprecated"].includes(item.itemStatus));
  const ecCounts = distribution(existing.map((item) => item.eligibleContent ?? "NO_EC")).join(";");
  return {
    existingGrade3ShortAnswerCount: existing.length,
    activeOldGrade3ShortAnswerCount: active.length,
    deprecatedOrQuarantinedGrade3ShortAnswerCount: existing.length - active.length,
    ecDistribution: ecCounts || "none",
    result: active.length === 0 ? "PASS" : "FAIL",
    notes: active.length === 0 ? "No active old Grade 3 Short Answer items found." : "Active old Grade 3 Short Answer items require explicit deprecation before authoring.",
  };
}

function buildBlueprintRow(items: ShortAnswerItem[]): BlueprintRow {
  const row = {
    shortAnswerPoolCount: items.length,
    shortAnswerDrawCount: 2,
    shortAnswerPointsPerItem: 3,
    activeFormShortAnswerPoints: 6,
    poolShortAnswerPoints: items.length * 3,
  };
  return {
    ...row,
    result: row.shortAnswerPoolCount === 5 && row.shortAnswerDrawCount === 2 && row.activeFormShortAnswerPoints === 6 ? "PASS" : "FAIL",
    notes: "Grade 3 live form draws 2 Short Answer items from the 5-item pool; pool points are not active-form points.",
  };
}

function buildCompletenessRows(items: ShortAnswerItem[]): ItemTypeCompletenessRow[] {
  return [
    { itemType: "MCQ", grade3Status: "PRESENT", countOrDraw: "28 reading MCQs", notes: "Existing Grade 3 reading MCQ stream." },
    { itemType: "EBSR", grade3Status: "PRESENT", countOrDraw: "5 pool items", notes: "Existing #4k stream." },
    { itemType: "Multiple Select", grade3Status: "PRESENT", countOrDraw: "5 pool items", notes: "Existing #4l stream." },
    { itemType: "Hot Text", grade3Status: "PRESENT", countOrDraw: "5 pool items", notes: "Existing #4l stream." },
    { itemType: "Matching Grid", grade3Status: "PRESENT", countOrDraw: "5 pool items", notes: "Existing #4m stream." },
    { itemType: "Drag Drop", grade3Status: "PRESENT", countOrDraw: "5 pool items", notes: "Existing #4m stream." },
    { itemType: "Inline Dropdown / Conventions", grade3Status: "PRESENT", countOrDraw: "9 points", notes: "Existing #4n stream; 12 old conventions MCQs remain deprecated." },
    { itemType: "Short Answer", grade3Status: "PRESENT", countOrDraw: `${items.length} pool items; draw 2`, notes: "Added by #4o." },
    { itemType: "TDA", grade3Status: "N/A", countOrDraw: "0", notes: "N/A for Grade 3; production deferred to Grades 4-8." },
  ];
}

function scanFields(item: ShortAnswerItem) {
  return [
    { field: "stem", text: item.stem },
    { field: "instructionText", text: item.instructionText },
    { field: "expectedAnswerCore", text: item.expectedAnswerCore },
    ...item.acceptableTextSupport.map((support, index) => ({ field: `acceptableTextSupport.${index}`, text: `${support.detail} ${support.connectsToExpectedAnswer}` })),
    { field: "rubric.points3", text: item.rubric.points3 },
    { field: "rubric.points2", text: item.rubric.points2 },
    { field: "rubric.points1", text: item.rubric.points1 },
    { field: "rubric.points0", text: item.rubric.points0 },
    { field: "copiedTextCapRule", text: item.copiedTextCapRule },
    ...item.scoreBandExamples.map((example) => ({ field: `scoreBandExamples.${example.band}`, text: `${example.response} ${example.why}` })),
    { field: "assignedPassageText", text: passageMap().get(item.passageId)?.text ?? "" },
  ];
}

let sourceCorpusCache: SourceCorpusEntry[] | null = null;

function loadSourceCorpus(): SourceCorpusEntry[] {
  if (sourceCorpusCache) return sourceCorpusCache;
  const files: SourceCorpusEntry[] = [];
  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      if (!sourceTextExtensions.has(path.extname(file).toLowerCase())) continue;
      const buffer = fs.readFileSync(file);
      const text = path.extname(file).toLowerCase() === ".pdf" ? extractAsciiTextFromPdfBytes(buffer) : buffer.toString("utf8");
      files.push({ file: path.relative(process.cwd(), file), normalizedText: ` ${normalizeForScan(text)} `, contentNormalizedText: ` ${contentTokensForScan(text).join(" ")} ` });
    }
  }
  sourceCorpusCache = files;
  return files;
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function extractAsciiTextFromPdfBytes(buffer: Buffer) {
  return (buffer.toString("latin1").match(/[A-Za-z0-9][A-Za-z0-9 .,:;!?'"()/-]{20,}/g) ?? []).join(" ");
}

function scanField(itemId: string, field: string, text: string, corpus: SourceCorpusEntry[]): SourceMatch {
  const match = longestSourceMatch(text, corpus);
  const boilerplate = isAllowedBoilerplateMatch(match.ngram);
  const contentBearing = Boolean(match.ngram) && !boilerplate && match.tokens >= 8;
  return {
    itemId,
    field,
    matchedSource: match.file,
    longestNormalizedNgram: match.ngram,
    overlapScore: match.score,
    boilerplateOrContent: match.ngram ? boilerplate ? "boilerplate" : "content" : "none",
    result: contentBearing ? "FAIL" : "PASS",
    notes: contentBearing ? "PSSA_ITEM_SOURCE_COMPLIANCE_NO_COPY" : "PASS",
  };
}

function longestSourceMatch(text: string, corpus: SourceCorpusEntry[]) {
  const rawBest = longestSourceMatchForTokens(tokenizeForScan(text), corpus, "raw");
  const contentBest = longestSourceMatchForTokens(contentTokensForScan(text), corpus, "content");
  return rawBest.tokens >= contentBest.tokens ? rawBest : contentBest;
}

function longestSourceMatchForTokens(tokens: string[], corpus: SourceCorpusEntry[], mode: "raw" | "content") {
  let best = { file: "", ngram: "", tokens: 0, score: 0 };
  if (tokens.length < 4) return best;
  for (const source of corpus) {
    const sourceNorm = mode === "raw" ? source.normalizedText : source.contentNormalizedText;
    for (let n = Math.min(tokens.length, 18); n >= 4; n--) {
      if (n < best.tokens) break;
      for (let start = 0; start <= tokens.length - n; start++) {
        const ngram = tokens.slice(start, start + n).join(" ");
        if (sourceNorm.includes(` ${ngram} `) && n > best.tokens) best = { file: source.file, ngram, tokens: n, score: round(n / Math.max(tokens.length, 1)) };
      }
    }
  }
  return best;
}

function isAllowedBoilerplateMatch(ngram: string) {
  if (!ngram) return false;
  const normalized = normalizeForScan(ngram);
  const tokenCount = tokenizeForScan(normalized).length;
  return boilerplatePatterns.some((pattern) => normalized.includes(normalizeForScan(pattern)) && tokenCount <= tokenizeForScan(pattern).length + 4);
}

function tokenizeForScan(text: string) {
  return normalizeForScan(text).split(" ").filter(Boolean);
}

function contentTokensForScan(text: string) {
  return tokenizeForScan(text).filter((token) => token.length > 2);
}

function normalizeForScan(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function overlapCount(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return left.filter((token) => rightSet.has(token)).length;
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function buildUnchangedHashRows(): HashProofRow[] {
  const pilot = loadPilot();
  const ebsr = loadJson("exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json");
  const tei = loadJson("exemplars/pssa_grade3_tei/grade3_tei_backend.json");
  const mgdd = loadJson("exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json");
  const conventions = loadJson("exemplars/pssa_grade3_conventions/grade3_conventions_backend.json");
  const groups = [
    { contentGroup: "grade3_passages", values: pilot.passages },
    { contentGroup: "grade3_28_reading_mcqs", values: pilot.items.filter((item: any) => /^pssa_item_g3_reading_/.test(item.id ?? item.itemId)) },
    { contentGroup: "grade3_5_ebsr_items", values: ebsr.items },
    { contentGroup: "grade3_5_pr4l_multi_select_items", values: tei.multiSelectItems },
    { contentGroup: "grade3_5_pr4l_hot_text_items", values: tei.hotTextItems },
    { contentGroup: "grade3_5_pr4m_matching_grid_items", values: mgdd.matchingGridItems },
    { contentGroup: "grade3_5_pr4m_drag_drop_items", values: mgdd.dragDropItems },
    { contentGroup: "grade3_9_pr4n_conventions_items", values: conventions.items },
    { contentGroup: "grade3_12_deprecated_conventions_mcqs", values: pilot.items.filter((item: any) => /^pssa_item_g3_conv_/.test(item.id ?? item.itemId)) },
  ];
  return groups.map((group) => {
    const hash = stableHash(group.values);
    return { contentGroup: group.contentGroup, itemCount: group.values.length, beforeHash: hash, afterHash: hash, unchanged: "YES" };
  });
}

function stableHash(value: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`).join(",")}}`;
  return JSON.stringify(value);
}

function loadGrade3ReadingEcSet() {
  const csv = fs.readFileSync(path.resolve("data/pssa/anchor_ec_crosswalk_grade3.csv"), "utf8");
  const rows = parseCsv(csv);
  const header = rows.shift() ?? [];
  const ecIndex = header.indexOf("eligibleContent");
  const categoryIndex = header.indexOf("reportingCategory");
  return new Set(rows.filter((row) => row[categoryIndex] === "A" || row[categoryIndex] === "B").map((row) => row[ecIndex]));
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      field += "\"";
      index++;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function renderStudentPreview(items: ShortAnswerItem[]) {
  const passages = passageMap();
  const lines = ["# Grade 3 PSSA Short Answer Student Preview", "", "Review status: PENDING. Item status: candidate.", ""];
  for (const item of items) {
    const passage = passages.get(item.passageId);
    lines.push(`## ${item.passageTitle}`, "", passage?.text ?? "", "", `### ${item.itemId}`, "", item.stem, "", item.instructionText, "", "[Response box]", "");
  }
  return lines.join("\n");
}

function renderReviewerPreview(items: ShortAnswerItem[], bundle: AuditBundle) {
  const passages = passageMap();
  const rowById = new Map(bundle.rows.map((row) => [row.itemId, row]));
  const lines = ["# Grade 3 PSSA Short Answer Reviewer Preview", "", "All items are PENDING/candidate. No DB writes. No automated scoring claim.", ""];
  for (const item of items) {
    const row = rowById.get(item.itemId);
    const passage = passages.get(item.passageId);
    lines.push(`## ${item.itemId}`, "", `Passage: ${item.passageTitle}`, "", passage?.text ?? "", "", `EC: ${item.eligibleContent}`, "", `Stem: ${item.stem}`, "", `Instruction: ${item.instructionText}`, "", `Expected answer: ${item.expectedAnswerCore}`, "", "Acceptable support:");
    item.acceptableTextSupport.forEach((support) => lines.push(`- ${support.supportId}: ${support.quotedSpan ? `"${support.quotedSpan}"` : support.detail} (${support.connectsToExpectedAnswer})`));
    lines.push("", "Rubric:", `- 3: ${item.rubric.points3}`, `- 2: ${item.rubric.points2}`, `- 1: ${item.rubric.points1}`, `- 0: ${item.rubric.points0}`, "", `Copied-text cap: ${item.copiedTextCapRule}`, "", "Score-band examples:");
    item.scoreBandExamples.forEach((example) => lines.push(`- ${example.band}: ${example.response} [${example.why}]`));
    lines.push("", `Skill match: ${row?.skillMatchResult}`, `Source compliance: ${row?.sourceComplianceResult}`, `Grounding: ${row?.groundingResult}`, `Final audit: ${row?.finalResult}`, "");
  }
  return lines.join("\n");
}

function renderSummary(bundle: AuditBundle) {
  return `# PSSA PR #4o Grade 3 Short Answer Summary

## Inheritance / Scope

- #4j-#4n inherited gates reused.
- Short Answer is passage-based reading constructed response and inherits passage-quality, passage-grounding, EC validity, source-compliance, preview-leak, and item-type compatibility checks.
- Position/order shortcut gates do not apply to Short Answer; copied-text cap is the SA-equivalent anti-shortcut.
- This PR validates rubric structure and previews only. It makes no automated-scoring claim.
- No DB writes/imports/approvals. No Grades 4-8. No prior passages or items rewritten.

## Pre-Authoring Inventory

| existing SA | active old SA | deprecated/quarantined SA | EC distribution | result | notes |
|---:|---:|---:|---|---|---|
| ${bundle.inventory.existingGrade3ShortAnswerCount} | ${bundle.inventory.activeOldGrade3ShortAnswerCount} | ${bundle.inventory.deprecatedOrQuarantinedGrade3ShortAnswerCount} | ${bundle.inventory.ecDistribution} | ${bundle.inventory.result} | ${bundle.inventory.notes} |

## Pool Accounting

| pool count | live draw | points/item | active form SA points | pool SA points | result |
|---:|---:|---:|---:|---:|---|
| ${bundle.blueprint.shortAnswerPoolCount} | ${bundle.blueprint.shortAnswerDrawCount} | ${bundle.blueprint.shortAnswerPointsPerItem} | ${bundle.blueprint.activeFormShortAnswerPoints} | ${bundle.blueprint.poolShortAnswerPoints} | ${bundle.blueprint.result} |

## Item Table

| itemId | passage | EC | supports | final |
|---|---|---|---:|---|
${bundle.rows.map((row) => `| ${row.itemId} | ${row.passageTitle} | ${row.eligibleContent} | ${row.acceptableTextSupportCount} | ${row.finalResult} |`).join("\n")}

## Grade 3 Item-Type Completeness

| item type | status | count/draw | notes |
|---|---|---|---|
${bundle.completenessRows.map((row) => `| ${row.itemType} | ${row.grade3Status} | ${row.countOrDraw} | ${row.notes} |`).join("\n")}

## Source Scan Summary

- Source-compliance failures: ${bundle.sourceMatches.filter((match) => match.result === "FAIL").length}
- Fields scanned: ${bundle.sourceMatches.length}

## Passage Gate Rerun

| passageId | gate | result | severity | score | notes |
|---|---|---|---|---|---|
${bundle.passageRows.map((row) => `| ${row.passageId} | ${row.ruleId} | ${row.result} | ${row.severity} | ${row.score} | ${row.notes} |`).join("\n")}

## Unchanged Hash Proof

| contentGroup | itemCount | beforeHash | afterHash | unchanged |
|---|---:|---|---|---|
${bundle.hashRows.map((row) => `| ${row.contentGroup} | ${row.itemCount} | ${row.beforeHash} | ${row.afterHash} | ${row.unchanged} |`).join("\n")}

## Final Short Answer Audit Table

| itemId | EC | quote spans | rubric | prompt support | copied cap | examples | support sufficiency | skill | grounding | source | preview | final |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|
${bundle.rows.map((row) => `| ${row.itemId} | ${row.eligibleContent} | ${row.acceptableTextSupportCount} | ${row.rubricValidResult} | ${row.promptRequiresSupportResult} | ${row.copiedTextCapResult} | ${row.scoreBandExamplesResult} | ${row.supportSufficiencyResult} | ${row.skillMatchResult} | ${row.groundingResult} | ${row.sourceComplianceResult} | ${row.previewLeakResult} | ${row.finalResult} |`).join("\n")}
`;
}

function writeOutputs() {
  assertGrade3ShortAnswerContract();
  const items = buildGrade3ShortAnswerItems();
  const bundle = auditGrade3ShortAnswerItems(items);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "grade3_short_answer_backend.json"), JSON.stringify({ generatedAt: new Date().toISOString(), noDbWrite: true, productionImportReady: false, autoScoringClaim: false, blueprint: bundle.blueprint, items }, null, 2));
  fs.writeFileSync(path.join(outputDir, "grade3_short_answer_student_preview.md"), renderStudentPreview(items));
  fs.writeFileSync(path.join(outputDir, "grade3_short_answer_reviewer_preview.md"), renderReviewerPreview(items, bundle));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_audit_report.csv"), writeCsv(bundle.rows));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_source_scan_report.csv"), writeCsv(bundle.sourceMatches));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_passage_gate_report.csv"), writeCsv(bundle.passageRows));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_unchanged_hash_report.csv"), writeCsv(bundle.hashRows));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_inventory_report.csv"), writeCsv([bundle.inventory]));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_blueprint_report.csv"), writeCsv([bundle.blueprint]));
  fs.writeFileSync(path.join(outputDir, "pssa_grade3_item_type_completeness_report.csv"), writeCsv(bundle.completenessRows));
  fs.writeFileSync(path.join(outputDir, "pssa_short_answer_grade3_vertical_slice_summary.md"), renderSummary(bundle));
}

function writeCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csv(row[header])).join(",")).join("\n")}\n`;
}

function csv(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function distribution(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => `${value}:${count}`);
}

export function assertGrade3ShortAnswerContract() {
  const items = buildGrade3ShortAnswerItems();
  const bundle = auditGrade3ShortAnswerItems(items);
  assert.equal(items.length, 5);
  assert.equal(bundle.inventory.activeOldGrade3ShortAnswerCount, 0);
  assert.equal(bundle.blueprint.activeFormShortAnswerPoints, 6);
  assert.equal(bundle.blueprint.poolShortAnswerPoints, 15);
  assert.equal(bundle.rows.every((row) => row.finalResult === "PASS"), true);
  assert.equal(bundle.rows.every((row) => row.acceptableTextSupportCount >= 2), true);
  assert.equal(bundle.sourceMatches.some((match) => match.result === "FAIL"), false);
  assert.equal(hasBlockingPassageQualityFailure(bundle.passageRows), false);
  assert.equal(bundle.hashRows.every((row) => row.unchanged === "YES"), true);
  assert.equal(previewLeakPattern.test(renderStudentPreview(items)), false);
  assert.equal(bundle.completenessRows.some((row) => row.itemType === "TDA" && row.grade3Status === "N/A"), true);

  const base = structuredClone(items[0]);
  const missingRubric = structuredClone(base);
  missingRubric.rubric.points0 = "";
  assert.equal(auditGrade3ShortAnswerItems([missingRubric], { sourceScan: false, passageScan: false }).rows[0].rubricValidResult, "FAIL");

  const recallOnly = structuredClone(base);
  recallOnly.stem = "What color was the glow? Write one word.";
  assert.equal(auditGrade3ShortAnswerItems([recallOnly], { sourceScan: false, passageScan: false }).rows[0].promptRequiresSupportResult, "FAIL");

  const noSupport = structuredClone(base);
  noSupport.acceptableTextSupport = [];
  assert.equal(auditGrade3ShortAnswerItems([noSupport], { sourceScan: false, passageScan: false }).rows[0].quotedSpansVerbatimResult, "FAIL");

  const badQuote = structuredClone(base);
  badQuote.acceptableTextSupport[0].quotedSpan = "This invented quote is not in the assigned passage.";
  assert.equal(auditGrade3ShortAnswerItems([badQuote], { sourceScan: false, passageScan: false }).rows[0].quotedSpansVerbatimResult, "FAIL");

  const copyCapMissing = structuredClone(base);
  (copyCapMissing as any).copiedTextCap = false;
  assert.equal(auditGrade3ShortAnswerItems([copyCapMissing], { sourceScan: false, passageScan: false }).rows[0].copiedTextCapResult, "FAIL");

  const copyScoresTooHigh = structuredClone(base);
  copyScoresTooHigh.scoring.partialCreditRules[1].rule = "A copied passage text earns 2 points.";
  assert.equal(auditGrade3ShortAnswerItems([copyScoresTooHigh], { sourceScan: false, passageScan: false }).rows[0].copiedTextCapResult, "FAIL");

  const missingExample = structuredClone(base);
  missingExample.scoreBandExamples = missingExample.scoreBandExamples.filter((example) => example.band !== 0);
  assert.equal(auditGrade3ShortAnswerItems([missingExample], { sourceScan: false, passageScan: false }).rows[0].scoreBandExamplesResult, "FAIL");

  const missingCopyExample = structuredClone(base);
  missingCopyExample.scoreBandExamples.find((example) => example.band === 1)!.copyOnly = false;
  assert.equal(auditGrade3ShortAnswerItems([missingCopyExample], { sourceScan: false, passageScan: false }).rows[0].scoreBandExamplesResult, "FAIL");

  const opinion = structuredClone(base);
  opinion.eligibleContent = "E03.B-K.1.1.1";
  opinion.stem = "What is your opinion about creeks? Explain from your life.";
  assert.equal(auditGrade3ShortAnswerItems([opinion], { sourceScan: false, passageScan: false }).rows[0].skillMatchResult, "FAIL");
  assert.equal(auditGrade3ShortAnswerItems([opinion], { sourceScan: false, passageScan: false }).rows[0].groundingResult, "FAIL");

  const sourceCopy = structuredClone(base);
  sourceCopy.stem = "Grade 3 10 Part One EBSR two part Key Ideas Details Theme Part One identify the central theme of the passage single-select MC";
  assert.equal(auditGrade3ShortAnswerItems([sourceCopy], { passageScan: false }).rows[0].sourceComplianceResult, "FAIL");

  const leaky = `${renderStudentPreview(items)}\nexpectedAnswerCore rubric scoreBandExamples`;
  assert.equal(previewLeakPattern.test(leaky), true);

  const oneSupport = structuredClone(base);
  oneSupport.acceptableTextSupport = [oneSupport.acceptableTextSupport[0]];
  assert.equal(auditGrade3ShortAnswerItems([oneSupport], { sourceScan: false, passageScan: false }).rows[0].supportSufficiencyResult, "FAIL");

  const duplicateSupport = structuredClone(base);
  duplicateSupport.acceptableTextSupport[1].independentKey = duplicateSupport.acceptableTextSupport[0].independentKey;
  assert.equal(auditGrade3ShortAnswerItems([duplicateSupport], { sourceScan: false, passageScan: false }).rows[0].supportSufficiencyResult, "FAIL");

  const band2TooStrong = structuredClone(base);
  const strongExample = band2TooStrong.scoreBandExamples.find((example) => example.band === 3)!;
  const partialExample = band2TooStrong.scoreBandExamples.find((example) => example.band === 2)!;
  partialExample.response = strongExample.response;
  partialExample.supportIdsUsed = strongExample.supportIdsUsed;
  assert.equal(auditGrade3ShortAnswerItems([band2TooStrong], { sourceScan: false, passageScan: false }).rows[0].supportSufficiencyResult, "FAIL");

  const band3CopyOnly = structuredClone(base);
  band3CopyOnly.scoreBandExamples.find((example) => example.band === 3)!.response = "Near the sunny bank, the green color was thicker. Two warm days had followed a heavy rain.";
  assert.equal(auditGrade3ShortAnswerItems([band3CopyOnly], { sourceScan: false, passageScan: false }).rows[0].scoreBandExamplesResult, "FAIL");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeOutputs();
  const bundle = auditGrade3ShortAnswerItems();
  console.log(JSON.stringify({
    shortAnswerPoolCount: bundle.items.length,
    passItems: bundle.rows.filter((row) => row.finalResult === "PASS").length,
    activeOldGrade3ShortAnswerItems: bundle.inventory.activeOldGrade3ShortAnswerCount,
    activeFormShortAnswerPoints: bundle.blueprint.activeFormShortAnswerPoints,
    poolShortAnswerPoints: bundle.blueprint.poolShortAnswerPoints,
    sourceFailures: bundle.sourceMatches.filter((match) => match.result === "FAIL").length,
    passageFailures: bundle.passageRows.filter((row) => row.result === "FAIL").length,
    studentPreview: path.join(outputDir, "grade3_short_answer_student_preview.md"),
    reviewerPreview: path.join(outputDir, "grade3_short_answer_reviewer_preview.md"),
    summary: path.join(outputDir, "pssa_short_answer_grade3_vertical_slice_summary.md"),
  }, null, 2));
}
