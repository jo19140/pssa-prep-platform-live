import fs from "node:fs";
import path from "node:path";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildMcqPassageSpecificityReport,
  hasBlockingPassageSpecificityFailure,
  type DistractorRole,
  type EvidenceLink,
  type StructuredChoice,
} from "../audit/pssa-audit-detectors";

type Packet = {
  passages: Passage[];
  items: Item[];
  [key: string]: unknown;
};

type Passage = {
  id: string;
  title: string;
  text: string;
  [key: string]: unknown;
};

type Item = {
  id: string;
  itemType: string;
  passageId: string | null;
  eligibleContent: string;
  studentFacingPrompt: string;
  answerChoicesJson: string[] | null;
  structuredChoicesJson?: StructuredChoice[] | null;
  correctIndex: number | null;
  correctAnswer: string | null;
  distractorRationalesJson: string[] | null;
  studentPreviewJson: { prompt: string; choices: string[] | null; leaksAnswer: boolean };
  linterResultsJson?: Record<string, unknown>;
  validationMetadataJson?: Record<string, unknown>;
  [key: string]: unknown;
};

type PassageProfile = {
  problem: string;
  subject: string;
  gathered: string;
  noticed: string;
  finalChange: string;
  testedChange: string;
  reflection: string;
};

type DraftChoice = {
  text: string;
  isCorrect: boolean;
  rationale: string;
  quote: string;
  role: DistractorRole | null;
};

const packetPath = path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json");
const outputDir = path.resolve("exemplars/pssa_grade3_pilot");

const profiles: Record<string, PassageProfile> = {
  pssa_psg_g3_creek_watchers: {
    problem: "testing stream water after heavy rain",
    subject: "stream water",
    gathered: "notebooks, a chart, and a route",
    noticed: "plant growth near the water",
    finalChange: "two low-cost stream testing changes",
    testedChange: "test whether the proposed changes actually worked",
    reflection: "reliable evidence and new water questions",
  },
  pssa_psg_g3_the_map_in_the_station: {
    problem: "preserving an old transit map",
    subject: "transit map",
    gathered: "interviews, a chart, and a route",
    noticed: "changes in the town",
    finalChange: "two low-cost map preservation changes",
    testedChange: "test whether the proposed changes actually worked",
    reflection: "reliable evidence and map questions",
  },
  pssa_psg_g3_a_cooler_lunch_line: {
    problem: "redesigning a crowded lunch routine",
    subject: "lunch routine",
    gathered: "timed observations, a chart, and a route",
    noticed: "shared lunch responsibilities",
    finalChange: "two low-cost lunch line changes",
    testedChange: "test whether the proposed changes actually worked",
    reflection: "reliable evidence and lunch questions",
  },
  pssa_psg_g3_the_mural_plan: {
    problem: "planning a hallway mural from local stories",
    subject: "hallway mural",
    gathered: "sketch revisions, a chart, and a route",
    noticed: "community symbols",
    finalChange: "two low-cost mural planning changes",
    testedChange: "test whether the proposed changes actually worked",
    reflection: "reliable evidence and mural questions",
  },
  pssa_psg_g3_the_cart_that_would_not_turn: {
    problem: "improving a supply cart",
    subject: "supply cart",
    gathered: "wheel tests, a chart, and a route",
    noticed: "practical cart adjustments",
    finalChange: "two low-cost cart changes",
    testedChange: "test whether the proposed changes actually worked",
    reflection: "reliable evidence and cart questions",
  },
};

const sentenceQuotes = {
  question: "The sixth-period research team began with a question that sounded simple:",
  avoidGuesses: "Their teacher asked them to avoid guesses and collect details that another group could check.",
  notebooks: "By Monday afternoon, the students had notebooks, a shared chart, and a route for gathering observations around the building.",
  scattered: "At first, the notes were scattered.",
  sort: "The class decided to sort the notes by place, time, and cause.",
  structure: "That structure helped them see which details described the problem and which details suggested a possible solution.",
  repeated: "The strongest evidence came from repeated observations.",
  checked: "The team checked the same location during different parts of the day and compared what changed.",
  interviews: "They also interviewed people who used the space often, because a design that looks helpful on paper may not match how people move, wait, or work.",
  modest: "Their final proposal was modest but specific.",
  named: "It named the problem, explained the evidence, and described two changes that could be tested without spending much money.",
  noPerfect: "The proposal did not promise a perfect fix.",
  smallPlan: "Instead, it showed why careful information can make a small plan stronger.",
  research: "By the end of the week, the students understood that research is not a stack of facts.",
  relationships: "It is a way of noticing relationships.",
  usefulPlan: "A useful plan grows when people connect observations, listen to others, and revise an idea before asking the community to trust it.",
  chartSaved: "Their teacher saved the chart so the next class could test whether the proposed changes actually worked.",
  reflection: "The team also wrote a short reflection explaining which evidence felt reliable and which questions still needed another careful look.",
  recommendation: "That reflection helped them separate a useful recommendation from a quick opinion, and it gave the next group a fair place to begin.",
};

main();

function main() {
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as Packet;
  const passageById = new Map(packet.passages.map((passage) => [passage.id, passage]));
  const readingItems = packet.items.filter((item) => item.itemType === "MCQ" && item.passageId);
  readingItems.forEach((item, index) => rewriteReadingItem(item, index, passageById.get(String(item.passageId))));
  const audit = auditGrade3(packet);
  if (audit.failures.length) {
    const blockers = audit.passageRows.filter((row) => row.result === "FAIL").slice(0, 20);
    throw new Error(`Grade 3 rewrite failed gates:\n${audit.failures.map((failure) => `- ${failure}`).join("\n")}\n${JSON.stringify(blockers, null, 2)}`);
  }
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "pilot_student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "pilot_answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "pilot_audit_report.md"), renderAuditReport(packet, audit));
  console.log(JSON.stringify({
    result: "PASS",
    grade: 3,
    rewrittenReadingMcq: readingItems.length,
    passageSpecificityFailures: audit.passageRows.filter((row) => row.result === "FAIL").length,
    correctLongestRate: audit.correctLongestRate,
    answerPositions: audit.answerPositions,
  }, null, 2));
}

function rewriteReadingItem(item: Item, index: number, passage: Passage | undefined) {
  if (!passage || !item.passageId) throw new Error(`Missing passage for ${item.id}`);
  const profile = profiles[item.passageId];
  if (!profile) throw new Error(`Missing Grade 3 rewrite profile for ${item.passageId}`);
  const pattern = index % 7;
  const correctIndex = index % 4;
  const draft = draftItem(pattern, passage, profile, item.eligibleContent);
  const ordered = placeCorrectChoice(draft, correctIndex);
  item.studentFacingPrompt = draft.stem;
  item.structuredChoicesJson = ordered.map((choice) => ({
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationale: choice.rationale,
    evidenceLinks: [evidenceLink(passage.text, choice.quote)],
    distractorRole: choice.role,
  }));
  item.answerChoicesJson = item.structuredChoicesJson.map((choice) => choice.text);
  item.correctIndex = correctIndex;
  item.correctAnswer = item.answerChoicesJson[correctIndex];
  item.distractorRationalesJson = item.structuredChoicesJson.map((choice) => choice.rationale);
  item.studentPreviewJson = { prompt: item.studentFacingPrompt, choices: item.answerChoicesJson, leaksAnswer: false };
  item.validationMetadataJson = {
    ...(item.validationMetadataJson ?? {}),
    structuredChoicesJsonAdded: true,
    answerChoicesJsonDerivedFromStructuredChoices: true,
    grade3PassageGroundingRewrite: "PENDING_HUMAN_REVIEW",
  };
  item.linterResultsJson = { blockers: [], warnings: [], status: "PASS_PENDING_FULL_AUDIT" };
}

function draftItem(pattern: number, passage: Passage, profile: PassageProfile, ec: string) {
  const title = passage.title;
  const commonWrong = wrongChoices(profile);
  const drafts = [
    {
      stem: `Why did the team in "${title}" collect details that another group could check?`,
      correct: choice(`The team needed checkable details before making a ${profile.subject} plan.`, true, `Correct: this answers ${ec} by using the teacher's direction and the team's research purpose.`, sentenceQuotes.avoidGuesses, null),
      wrong: [
        commonWrong.chartAlready,
        commonWrong.interviewsTooLate,
        commonWrong.reflectionMain,
      ],
    },
    {
      stem: `What helped the team organize its scattered notes in "${title}"?`,
      correct: choice(`Sorting by place, time, and cause helped the team understand the ${profile.subject} problem.`, true, `Correct: this uses the passage's key detail about how the team organized information for ${ec}.`, sentenceQuotes.sort, null),
      wrong: [
        commonWrong.notebooksSolved,
        commonWrong.peopleUsedSpace,
        commonWrong.finalProposalFirst,
      ],
    },
    {
      stem: `Which detail best supports that the team used more than one kind of evidence in "${title}"?`,
      correct: choice(`The team compared repeated observations and talked with people who used the space.`, true, `Correct: this combines observation and interview evidence, which directly supports the ${ec} skill.`, sentenceQuotes.interviews, null),
      wrong: [
        commonWrong.plantOrTownNarrow,
        commonWrong.noPerfectFix,
        commonWrong.chartForNextClass,
      ],
    },
    {
      stem: `How did the final proposal in "${title}" show careful planning?`,
      correct: choice(`It named the problem, explained evidence, and described two changes to test.`, true, `Correct: this paraphrases the proposal sentence and explains why the plan was careful for ${ec}.`, sentenceQuotes.named, null),
      wrong: [
        commonWrong.notebooksBeginning,
        commonWrong.routeWrong,
        commonWrong.researchFacts,
      ],
    },
    {
      stem: `What lesson about research does "${title}" develop near the end?`,
      correct: choice(`Research means connecting observations, listening, and revising before asking for trust.`, true, `Correct: this states the lesson developed by the final paragraph and matches the ${ec} focus.`, sentenceQuotes.usefulPlan, null),
      wrong: [
        commonWrong.quickOpinion,
        commonWrong.sameLocationNarrow,
        commonWrong.moneyNarrow,
      ],
    },
    {
      stem: `Which sentence from "${title}" shows that the plan still needed to be checked later?`,
      correct: choice(`The teacher saved the chart so another class could test the proposed changes.`, true, `Correct: this identifies the later-check detail and uses text evidence for ${ec}.`, sentenceQuotes.chartSaved, null),
      wrong: [
        commonWrong.modestSpecific,
        commonWrong.notesScattered,
        commonWrong.questionsLookedAgain,
      ],
    },
    {
      stem: `What is the most important reason the short reflection helped the next group in "${title}"?`,
      correct: choice(`It separated a useful recommendation from a quick opinion for the next group.`, true, `Correct: this explains how the reflection helped future work, which is the targeted ${ec} idea.`, sentenceQuotes.recommendation, null),
      wrong: [
        commonWrong.notebooksSolved,
        commonWrong.peopleUsedSpace,
        commonWrong.twoChangesTooNarrow,
      ],
    },
  ];
  return drafts[pattern];
}

function wrongChoices(profile: PassageProfile) {
  return {
    chartAlready: choice(`The shared chart meant the ${profile.subject} answer had already been proven.`, false, "Wrong emphasis: the chart helped collect information, but the passage says the plan still needed testing.", sentenceQuotes.notebooks, "wrong_emphasis"),
    interviewsTooLate: choice(`The interviews mattered because the team had stopped comparing ${profile.subject} observations.`, false, "Plausible misreading: the interviews added evidence; they did not replace observations.", sentenceQuotes.interviews, "plausible_misreading"),
    reflectionMain: choice(`The short reflection was the first step in solving the ${profile.subject} problem.`, false, "Wrong section: the reflection comes near the end after the proposal, not at the start.", sentenceQuotes.reflection, "wrong_section"),
    notebooksSolved: choice(`The notebooks and chart solved the ${profile.subject} problem before sorting began.`, false, "Unsupported inference: notebooks and a chart helped gather notes, but they did not solve the problem.", sentenceQuotes.notebooks, "unsupported_inference"),
    peopleUsedSpace: choice(`Talking with people helped the ${profile.subject} research, but it did not organize the scattered notes.`, false, "Too narrow: interviews were useful evidence, but sorting by place, time, and cause organized the notes.", sentenceQuotes.interviews, "too_narrow"),
    finalProposalFirst: choice(`The final proposal came before the team sorted its ${profile.subject} notes.`, false, "Opposite claim: the passage places sorting before the final proposal.", sentenceQuotes.modest, "opposite_claim"),
    plantOrTownNarrow: choice(`${capitalize(profile.noticed)} gave one useful clue, but it was not the whole evidence set.`, false, "Too narrow: this names one detail from the notes, not the broader mix of observations and interviews.", detailQuote(profile), "too_narrow"),
    noPerfectFix: choice(`The ${profile.subject} proposal avoided a perfect fix, but that does not show several kinds of evidence.`, false, "Wrong emphasis: this detail describes the proposal's limits, not the sources of evidence.", sentenceQuotes.noPerfect, "wrong_emphasis"),
    chartForNextClass: choice(`The saved ${profile.subject} chart helped the next class, but it came after the evidence was gathered.`, false, "Wrong section: this later detail does not show the kinds of evidence used during research.", sentenceQuotes.chartSaved, "wrong_section"),
    notebooksBeginning: choice(`The notebooks and route started the ${profile.subject} work, but they do not describe the final proposal.`, false, "Wrong section: this beginning detail is not the final planning step.", sentenceQuotes.notebooks, "wrong_section"),
    routeWrong: choice(`The route around the building helped ${profile.subject} gathering, not the two tested changes.`, false, "Too narrow: the route was a research tool, not the final proposal.", sentenceQuotes.notebooks, "too_narrow"),
    researchFacts: choice(`The ${profile.subject} research was not a stack of facts, but that lesson comes after the proposal.`, false, "Wrong section: this reflection follows the final plan instead of explaining what the proposal contained.", sentenceQuotes.research, "wrong_section"),
    quickOpinion: choice(`A quick ${profile.subject} opinion was separated from the recommendation, but that is one result of reflection.`, false, "Too narrow: the reflection detail supports the lesson but does not state the full lesson about research.", sentenceQuotes.recommendation, "too_narrow"),
    sameLocationNarrow: choice(`Checking the same ${profile.subject} location showed care, but it leaves out listening and revising.`, false, "Too narrow: this is one research action, not the full lesson near the end.", sentenceQuotes.checked, "too_narrow"),
    moneyNarrow: choice(`Spending little money was part of the ${profile.subject} proposal, not the whole lesson about research.`, false, "Wrong emphasis: low cost is a proposal detail, while the lesson is about connecting observations and revising.", sentenceQuotes.named, "wrong_emphasis"),
    modestSpecific: choice(`The ${profile.subject} proposal was modest and specific, but that does not show the later test.`, false, "Too narrow: this describes the proposal, not the next class checking it.", sentenceQuotes.modest, "too_narrow"),
    notesScattered: choice(`The scattered ${profile.subject} notes show an early problem, not a later check of the plan.`, false, "Wrong section: this happens before sorting and before the final chart is saved.", sentenceQuotes.scattered, "wrong_section"),
    questionsLookedAgain: choice(`The team still had ${profile.subject} questions, but the saved chart names who would test changes.`, false, "Wrong emphasis: this reflection detail is related, but it does not identify the later test as clearly as the chart sentence.", sentenceQuotes.reflection, "wrong_emphasis"),
    twoChangesTooNarrow: choice(`The two ${profile.subject} changes were part of the proposal, but they do not explain why the next group had a fair start.`, false, "Too narrow: the proposal detail is useful, but the reflection explains the fair starting place.", sentenceQuotes.named, "too_narrow"),
  };
}

function choice(text: string, isCorrect: boolean, rationale: string, quote: string, role: DistractorRole | null): DraftChoice {
  return { text, isCorrect, rationale, quote, role };
}

function placeCorrectChoice(draft: { correct: DraftChoice; wrong: DraftChoice[] }, correctIndex: number) {
  const result = [...draft.wrong];
  result.splice(correctIndex, 0, draft.correct);
  return result;
}

function detailQuote(profile: PassageProfile) {
  if (profile.noticed.includes("plant")) return "One student wrote about clear measurements, while another noticed nearby plant growth.";
  if (profile.noticed.includes("town")) return "One student wrote about careful interviews, while another noticed changes in the town.";
  if (profile.noticed.includes("responsibilities")) return "One student wrote about timed observations, while another noticed shared responsibilities.";
  if (profile.noticed.includes("symbols")) return "One student wrote about sketch revisions, while another noticed community symbols.";
  return "One student wrote about wheel tests, while another noticed practical adjustments.";
}

function evidenceLink(text: string, quote: string): EvidenceLink {
  const startChar = text.indexOf(quote);
  if (startChar < 0) throw new Error(`Missing quote: ${quote}`);
  const paragraphIndex = text.slice(0, startChar).split(/\n\s*\n/g).length - 1;
  const paragraph = text.split(/\n\s*\n/g)[paragraphIndex];
  const sentenceIndex = splitSentences(paragraph).findIndex((sentence) => sentence.includes(quote));
  if (sentenceIndex < 0) throw new Error(`Missing sentence for quote: ${quote}`);
  return { paragraphIndex, sentenceIndex, quotedSpan: quote, startChar, endChar: startChar + quote.length };
}

function splitSentences(paragraph: string) {
  return (paragraph.match(/[^.!?]+[.!?]+(?:["”])?/g) ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
}

function auditGrade3(packet: Packet) {
  const readingItems = packet.items.filter((item) => item.itemType === "MCQ" && item.passageId);
  const passageRows = buildMcqPassageSpecificityReport(readingItems, packet.passages);
  const lengthRows = buildMcqCorrectIsLongestReport(readingItems);
  const absoluteRows = buildMcqAbsoluteLanguageDistractorReport(readingItems);
  const answerPositions = [0, 0, 0, 0];
  for (const item of readingItems) {
    if (typeof item.correctIndex === "number") answerPositions[item.correctIndex] += 1;
  }
  const failures: string[] = [];
  if (hasBlockingPassageSpecificityFailure(passageRows)) failures.push("passage-specificity gates have blockers");
  if (lengthRows.some((row) => row.result === "FAIL")) failures.push("correct-answer-longest gate has blockers");
  if (absoluteRows.some((row) => row.result === "FAIL")) failures.push("absolute-language distractor gate has blockers");
  if (Math.max(...answerPositions) / readingItems.length > 0.4) failures.push("answer-position distribution exceeds 40%");
  if (new Set(packet.items.map((item) => item.eligibleContent)).size < 20) failures.push("Grade 3 EC coverage below 20 distinct ECs");
  const usage = new Map<string, number>();
  for (const item of readingItems) usage.set(item.eligibleContent, (usage.get(item.eligibleContent) ?? 0) + 1);
  if ([...usage.values()].some((count) => count > 3)) failures.push("Grade 3 EC usage exceeds 3 for an EC");
  return {
    failures,
    passageRows,
    lengthRows,
    absoluteRows,
    answerPositions,
    correctLongestRate: lengthRows.find((row) => row.scope === "batch")?.correctLongestPct ?? 0,
  };
}

function renderStudentPreview(packet: Packet) {
  const lines = ["# PSSA Grade 3 Pilot Student Preview", ""];
  for (const passage of packet.passages) {
    lines.push(`## ${passage.title}`, "", passage.text, "");
    const items = packet.items.filter((item) => item.passageId === passage.id);
    for (const item of items) {
      lines.push(`### ${item.id}`, item.studentFacingPrompt, "");
      if (item.itemType === "MCQ" && item.answerChoicesJson) {
        item.answerChoicesJson.forEach((choice, index) => lines.push(`${"ABCD"[index]}. ${choice}`));
      }
      lines.push("");
    }
  }
  const conventions = packet.items.filter((item) => item.itemType === "MCQ" && !item.passageId);
  if (conventions.length) {
    lines.push("## Conventions", "");
    for (const item of conventions) {
      lines.push(`### ${item.id}`, item.studentFacingPrompt, "");
      item.answerChoicesJson?.forEach((choice, index) => lines.push(`${"ABCD"[index]}. ${choice}`));
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderAnswerKey(packet: Packet) {
  const lines = ["# PSSA Grade 3 Pilot Answer Key and Rationales", ""];
  for (const item of packet.items) {
    if (item.itemType !== "MCQ") continue;
    lines.push(`## ${item.id}`, `- Correct answer: ${"ABCD"[item.correctIndex ?? 0]} — ${item.correctAnswer}`, "");
    item.structuredChoicesJson?.forEach((choice, index) => {
      lines.push(`- ${"ABCD"[index]}. ${choice.text}`);
      lines.push(`  - ${choice.rationale}`);
      lines.push(`  - Role: ${choice.distractorRole ?? "correct"}`);
      lines.push(`  - Evidence: ${choice.evidenceLinks?.map((link) => link.quotedSpan).join(" | ")}`);
    });
    if (!item.structuredChoicesJson) {
      item.answerChoicesJson?.forEach((choice, index) => lines.push(`- ${"ABCD"[index]}. ${choice}`));
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderAuditReport(packet: Packet, audit: ReturnType<typeof auditGrade3>) {
  const readingItems = packet.items.filter((item) => item.itemType === "MCQ" && item.passageId);
  const lines = [
    "# PSSA Grade 3 Pilot Audit Report",
    "",
    "## PR #4d Passage-Grounded Rewrite",
    `- Rewritten reading MCQs: ${readingItems.length}`,
    `- Passage-specificity blocker rows: ${audit.passageRows.filter((row) => row.result === "FAIL").length}`,
    `- Evidence spans found: ${audit.passageRows.some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL") ? "false" : "true"}`,
    `- Same-span reuse blockers: ${audit.passageRows.filter((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_REUSED" && row.result === "FAIL").length}`,
    `- Correct-answer-longest rate: ${Math.round(audit.correctLongestRate * 100)}%`,
    `- Answer-position distribution: A:${audit.answerPositions[0]} B:${audit.answerPositions[1]} C:${audit.answerPositions[2]} D:${audit.answerPositions[3]}`,
    `- Absolute-language distractors: ${audit.absoluteRows.filter((row) => row.result === "FAIL").length}`,
    `- Result: ${audit.failures.length ? "FAIL" : "PASS"}`,
    "",
    "## Distractor Role Counts",
  ];
  const roleCounts = new Map<string, number>();
  for (const item of readingItems) {
    for (const choice of item.structuredChoicesJson ?? []) {
      if (choice.distractorRole) roleCounts.set(choice.distractorRole, (roleCounts.get(choice.distractorRole) ?? 0) + 1);
    }
  }
  for (const [role, count] of [...roleCounts.entries()].sort()) lines.push(`- ${role}: ${count}`);
  lines.push("", "## Per-Item Review Table", "");
  lines.push("| itemId | passageId | eligibleContent | stem | correctIndex | distractorRoles | evidenceSpansFound | singleDefensibleAnswer | passageSpecificity | note |");
  lines.push("|---|---|---|---|---:|---|---|---|---|---|");
  for (const item of readingItems) {
    const rows = audit.passageRows.filter((row) => row.itemId === item.id);
    const spansFound = !rows.some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL");
    const single = !rows.some((row) => row.ruleId === "PSSA_MCQ_SINGLE_DEFENSIBLE_ANSWER" && row.result === "FAIL");
    const specific = !rows.some((row) => row.result === "FAIL");
    const roles = (item.structuredChoicesJson ?? []).map((choice) => choice.distractorRole ?? "correct").join("; ");
    const note = (item.structuredChoicesJson ?? []).find((choice) => choice.isCorrect)?.rationale ?? "";
    lines.push(`| ${item.id} | ${item.passageId} | ${item.eligibleContent} | ${escapeTable(item.studentFacingPrompt)} | ${item.correctIndex} | ${roles} | ${spansFound} | ${single ? "PASS" : "FAIL"} | ${specific ? "PASS" : "FAIL"} | ${escapeTable(note)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeTable(value: string) {
  return value.replace(/\|/g, "\\|");
}
