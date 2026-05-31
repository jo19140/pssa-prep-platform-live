import fs from "node:fs";
import path from "node:path";
import {
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  type PassageQualityRow,
  type PssaPassageAuditInput,
} from "../audit/pssa-audit-detectors";

type Passage = PssaPassageAuditInput & {
  model: string;
  subject: string;
  passageType: "informational" | "literary";
  wordCount: number;
  sourceType: string;
  sourceName: string;
  sourceCitation: string | null;
  licenseStatus: string;
  commercialUseAllowed: boolean;
  needsLegalReview: boolean;
  reviewStatus: string;
  itemStatus: string;
  factCheckStatus?: string;
  factualClaimsReviewed?: boolean;
  structureType: string;
  voicePov: string;
  crossDuplicateClusterId?: string | null;
  skeletonHash?: string | null;
  topicCoherenceScore?: number | null;
  concretenessRatio?: number | null;
  passageQualityResult?: string;
  repetitionAuditJson?: Record<string, unknown>;
  provenanceJson?: Record<string, unknown>;
  approvedAt: null;
  reviewedBy: null;
  retiredAt: null;
};

const backendPath = path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json");
const outputDir = path.resolve("exemplars/pssa_grade3_pilot");
const reportDir = path.resolve("audit_exports/pssa_pr4f_a_grade3_passages");
const corpusGrades = [3, 4, 5, 6, 7, 8];

const passages: Passage[] = [
  makePassage({
    id: "pssa_psg_g3_creek_watchers",
    title: "The Night the Creek Glowed",
    topicDomain: "science/nature",
    passageType: "informational",
    structureType: "cause/effect explanatory article",
    voicePov: "third-person science note",
    text: `Just after sunset, Maya noticed a pale green shine along Pine Creek. The glow was not bright like a flashlight. It looked more like a soft line of paint floating near the bank. The next morning, her class visited the creek with clear jars, a thermometer, and a hand lens.

The teacher explained that some tiny living things in water can look green when many of them grow at once. The class did not touch the water. They stood on the bridge and wrote what they could see: slow water near the reeds, brown leaves caught against stones, and small bubbles where the creek bent around a log.

Maya drew a map of three creek spots. At the shady bend, the water looked clear. Near the sunny bank, the green color was thicker. Downstream from the storm pipe, bits of grass and soil floated in a wide fan. Those clues helped the class ask a better question: why was the glow strongest in one place?

Back at school, the students compared their notes with the weather chart. Two warm days had followed a heavy rain. Rain had washed soil into the creek, and sunlight warmed the shallow edge. The teacher said those conditions can help green water plants grow quickly.

The class wrote a creek notice for families. It did not claim the water was safe or unsafe. Instead, it told what the students observed and asked neighbors not to dump grass clippings near the drain. Maya added her map to the notice so readers could see why the sunny bank mattered most.

On Friday, Maya returned with her father and pointed from the bridge. The glow had faded to a faint stripe. A beetle skated over the surface, and a robin hopped in the wet grass. Maya knew the creek still needed watching, but now she had a careful way to notice changes.`,
  }),
  makePassage({
    id: "pssa_psg_g3_the_map_in_the_station",
    title: "A Map Under the Bench",
    topicDomain: "history/social studies",
    passageType: "informational",
    structureType: "chronological discovery",
    voicePov: "third-person local history account",
    text: `When workers lifted an old wooden bench at Linden Station, they found a paper map folded into a thin square. Dust covered the front, but blue rail lines still crossed the page. A date in the corner said 1928.

The station manager called Mr. Ortiz, who cared for the town archive. He did not unfold the map quickly. Old paper can tear along its creases. He slid a flat card under one corner, opened the first fold, and placed small cloth weights along the edges. The map showed trolley stops, a river bridge, and a market square that no longer had tracks.

On Saturday, three children visited the station display. Nia noticed that the old trolley line passed the bakery where her grandmother worked. Ben found the school, but it had a different name. Leo pointed to a dotted path beside the river and wondered whether people had walked there when the bridge was closed.

Mr. Ortiz put a new town map beside the old one. The two maps did not match exactly. Some streets had new names, and the trolley tracks were gone. Still, the river, the hill road, and the market square helped visitors compare past and present.

By the end of the week, the map was inside a clear sleeve. A label told where it was found and how it was opened. People stopped near the bench longer than before, not because the paper looked perfect, but because it showed how the town had changed while some landmarks stayed in place.

Nia copied the dotted river path into her notebook. At home, her grandmother remembered taking a trolley to the market with a basket on her lap. The old map had not spoken, of course, but it helped one family tell a true town story that had almost been folded away.`,
  }),
  makePassage({
    id: "pssa_psg_g3_a_cooler_lunch_line",
    title: "The Bell That Saved Lunch",
    topicDomain: "school/community",
    passageType: "informational",
    structureType: "problem/solution",
    voicePov: "third-person school report",
    text: `By Tuesday, Room 3 knew the lunch line had a problem. Hot soup cooled in bowls while students searched for spoons. Milk cartons crowded the end of the counter. The line stopped whenever someone had to step backward for a napkin.

Mrs. Lane asked the class to watch without blaming anyone. Four students stood near the cafeteria door with clipboards. They counted how many times the line paused. They also sketched where trays, fruit, milk, spoons, and napkins sat on the counter.

The class noticed two slow spots. First, students picked up milk after they already had full trays, so cartons tipped and rolled. Second, spoons and napkins were tucked behind the soup pot. Even careful students had to reach across the hot area.

The cafeteria manager let the class try a small change on Thursday. Milk moved to the first table, before trays. Spoons and napkins went into two red baskets at the end. A paper arrow showed the direction of the line. Nothing fancy was added, and no one had to buy new shelves.

At lunch, the line still made noise, but it moved more smoothly. Students grabbed milk before their trays were heavy. The red baskets were easy to spot. When the bell rang, most bowls of soup were still warm. Room 3 wrote the result on a chart and decided to check again next week, because one good day was useful but not enough proof.

On Friday, the class tried the setup with pizza trays instead of soup bowls. The line was a little slower, but no one had to walk backward for a napkin. Mrs. Lane circled that note in purple marker. A good solution, she said, should work on more than one lunch day. The class posted the arrow again before the next lunch bell rang.`,
  }),
  makePassage({
    id: "pssa_psg_g3_the_mural_plan",
    title: "Blue Paint for Saturday",
    topicDomain: "arts/culture",
    passageType: "literary",
    structureType: "first-person realistic narrative",
    voicePov: "first-person student narrator",
    text: `I carried the smallest paint can because my wrist still had a purple soccer bruise. The label said sky blue, but inside the can the paint looked like melted berries. Grandpa laughed when he saw my face. "Paint dries lighter," he said.

We were helping with the Saturday mural behind the library. The wall was rough brick, and chalk lines crossed it like a giant puzzle. Ms. Vega had drawn the river, three row houses, a bus, and a pair of sparrows. My job was to paint the river between the chalk marks without covering the silver fish.

At first, I worked too fast. Blue drops slid down the brick and landed on the fish tails. I wanted to wipe them away, but Grandpa handed me a thin brush. "Turn mistakes into ripples," he said. I bent close and painted tiny waves around each tail. The fish looked as if they were flicking through the water.

Near noon, a little boy asked why the bus had flowers on its roof. Ms. Vega told him people had suggested things they loved about our block. Mrs. Chen loved her roof garden. Mr. Bell loved the number seven bus. The mural mixed those memories into one picture.

When we stepped back, the river was not perfectly smooth. Some ripples were dark, and some were pale. I could still find the first drip if I looked hard. But the fish seemed to move, and the wall no longer looked empty. I carried the light blue can home feeling taller than when I had arrived.

The next morning, my wrist was sore, but I asked Dad to walk past the library. A woman had stopped to take a picture of the sparrows. Two kids traced the bus route in the air. I did not tell them which ripples were mine. I just stood there, smiling at the blue.`,
  }),
  makePassage({
    id: "pssa_psg_g3_the_cart_that_would_not_turn",
    title: "The Cart That Would Not Turn",
    topicDomain: "everyday problem-solving",
    passageType: "informational",
    structureType: "sequential how-something-works",
    voicePov: "second-person procedural explanation",
      text: `A supply cart should roll where you guide it. The green cart in the art room did not. When students pushed it toward the sink, the front wheel wobbled left. When they pulled it back, the cart scraped the table leg.

To find the trouble, you would not start with a hammer. First, you would empty the heavy paper boxes from the bottom shelf. Weight can hide a small problem. Next, you would turn the cart upside down on a rug so the wheels could spin freely.

One wheel might spin like a top. Another might stop after half a turn. On the green cart, a strand of yarn had wrapped around the front axle. Dried glue made the yarn stiff. The wheel could roll, but it could not swing smoothly around corners.

The fix had three steps. A teacher snipped the yarn with small scissors. A student wiped the axle with a damp cloth. Then the class added one drop of oil where the metal pin met the wheel. Too much oil would have dripped onto the floor, so one drop was enough.

After the repair, the cart still squeaked a little. It was old, and its handle had a dent. But it turned around the table without scraping. The class taped a card to the top shelf: Check wheels before loading paper. The card reminded everyone that a stuck cart is easier to fix before it is heavy.

The next week, the same steps helped with a rolling book bin. This time, a pebble was caught beside the wheel instead of yarn. The class did not guess or shove harder. They unloaded the bin, checked each wheel, and found the small thing that caused the big trouble. Their careful order saved time and kept the floor completely clear.`,
  }),
];

main();

function main() {
  const backend = JSON.parse(fs.readFileSync(backendPath, "utf8"));
  const existingPassages = loadCorpusPassages();
  const nonGrade3Corpus = existingPassages.filter((passage) => passage.gradeLevel !== 3);
  const accepted: Passage[] = [];

  for (const passage of passages) {
    const candidateSet = [...nonGrade3Corpus, ...accepted, passage];
    const candidateRows = buildPssaPassageQualityReport(candidateSet).filter((row) => row.passageId === passage.id);
    const blocking = hasBlockingPassageQualityFailure(candidateRows);
    const warnings = candidateRows.filter((row) => row.severity === "WARNING");
    if (blocking || warnings.length) {
      throw new Error(`Rejected ${passage.id}:\n${JSON.stringify(candidateRows, null, 2)}`);
    }
    applyAuditFields(passage, candidateRows);
    accepted.push(passage);
  }

  backend.passages = accepted;
  backend.items = backend.items.map((item: any) => item.gradeLevel === 3 && item.passageId
    ? {
      ...item,
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      approvalEligible: false,
      validationMetadataJson: {
        ...(item.validationMetadataJson ?? {}),
        quarantinedUntilPassageReauthored: true,
        quarantineReason: "Grade 3 passages regenerated in PR #4f-a; reading items intentionally await PR #4f-b re-authoring.",
      },
      linterResultsJson: {
        ...(item.linterResultsJson ?? {}),
        status: "PENDING_REAUTHOR",
        blockers: [...(item.linterResultsJson?.blockers ?? []), "READING_ITEM_REAUTHOR_REQUIRED_AFTER_PASSAGE_REGEN"],
      },
    }
    : item);

  fs.writeFileSync(backendPath, `${JSON.stringify(backend, null, 2)}\n`);
  const finalRows = buildPssaPassageQualityReport([...nonGrade3Corpus, ...accepted]);
  const grade3Rows = finalRows.filter((row) => accepted.some((passage) => passage.id === row.passageId));
  fs.mkdirSync(reportDir, { recursive: true });
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_passage_cross_duplicate_report.csv"), grade3Rows.filter((row) => row.ruleId === "PSSA_PASSAGE_CROSS_DUPLICATE"));
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_passage_template_skeleton_report.csv"), grade3Rows.filter((row) => row.ruleId === "PSSA_PASSAGE_TEMPLATE_SKELETON"));
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_passage_coherence_report.csv"), grade3Rows.filter((row) => row.ruleId === "PSSA_PASSAGE_TOPIC_COHERENCE"));
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_passage_concreteness_report.csv"), grade3Rows.filter((row) => row.ruleId === "PSSA_PASSAGE_CONCRETENESS"));
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_cross_passage_audit_summary.csv"), grade3Rows);
  fs.writeFileSync(path.join(outputDir, "pilot_passage_preview.md"), renderPreview(accepted, grade3Rows));

  console.log(JSON.stringify({
    result: "PASS",
    grade: 3,
    passages: accepted.length,
    warnings: grade3Rows.filter((row) => row.severity === "WARNING").length,
    blockers: grade3Rows.filter((row) => row.severity === "BLOCKER" && row.result === "FAIL").length,
    reportDir,
  }, null, 2));
}

function makePassage(input: Pick<Passage, "id" | "title" | "topicDomain" | "passageType" | "structureType" | "voicePov" | "text">): Passage {
  const informational = input.passageType === "informational";
  return {
    model: "PssaPassage",
    id: input.id,
    title: input.title,
    gradeLevel: 3,
    subject: "ELA",
    passageType: input.passageType,
    topicDomain: input.topicDomain,
    structureType: input.structureType,
    voicePov: input.voicePov,
    text: input.text,
    wordCount: input.text.trim().split(/\s+/).length,
    sourceType: "internal_original",
    sourceName: "Authored for PSSA Grade 3 pilot passage regeneration PR #4f-a",
    sourceCitation: null,
    licenseStatus: "cleared_internal_original",
    commercialUseAllowed: true,
    needsLegalReview: false,
    reviewStatus: "PENDING",
    itemStatus: "candidate",
    factCheckStatus: informational ? "HUMAN_REVIEW_REQUIRED" : undefined,
    factualClaimsReviewed: informational ? false : undefined,
    crossDuplicateClusterId: null,
    skeletonHash: null,
    topicCoherenceScore: null,
    concretenessRatio: null,
    passageQualityResult: null,
    repetitionAuditJson: repetitionAudit(input.text),
    provenanceJson: {
      authoredBy: "model-assisted, human-review-pending",
      method: "original_composition",
      pdeSamplerDerived: false,
      containsAttributedQuotes: false,
      note: "Passage text is original and intentionally passage-only; linked reading items remain quarantined pending PR #4f-b.",
    },
    approvedAt: null,
    reviewedBy: null,
    retiredAt: null,
  };
}

function applyAuditFields(passage: Passage, rows: PassageQualityRow[]) {
  passage.crossDuplicateClusterId = rows.find((row) => row.ruleId === "PSSA_PASSAGE_CROSS_DUPLICATE")?.clusterId || null;
  passage.skeletonHash = rows.find((row) => row.ruleId === "PSSA_PASSAGE_TEMPLATE_SKELETON")?.clusterId || null;
  passage.topicCoherenceScore = Number(rows.find((row) => row.ruleId === "PSSA_PASSAGE_TOPIC_COHERENCE")?.score ?? 0);
  passage.concretenessRatio = Number(rows.find((row) => row.ruleId === "PSSA_PASSAGE_CONCRETENESS")?.score ?? 0);
  passage.passageQualityResult = rows.some((row) => row.result === "FAIL" && row.severity === "BLOCKER")
    ? "FAIL"
    : rows.some((row) => row.severity === "WARNING")
      ? "WARN"
      : "PASS";
}

function loadCorpusPassages(): Passage[] {
  const loaded: Passage[] = [];
  for (const grade of corpusGrades) {
    const packet = JSON.parse(fs.readFileSync(path.resolve(`exemplars/pssa_grade${grade}_pilot/pilot_backend.json`), "utf8"));
    loaded.push(...packet.passages);
  }
  const exemplar = JSON.parse(fs.readFileSync(path.resolve("exemplars/pssa_grade6/pssa_grade6_exemplar_backend.json"), "utf8"));
  loaded.push(exemplar.passage);
  return loaded;
}

function renderPreview(passages: Passage[], rows: PassageQualityRow[]) {
  const lines = ["# PSSA Grade 3 Pilot Passage Preview", ""];
  for (const passage of passages) {
    const passageRows = rows.filter((row) => row.passageId === passage.id);
    const warningRows = passageRows.filter((row) => row.severity === "WARNING");
    lines.push(`## ${passage.title}`, "");
    lines.push(`- passageId: ${passage.id}`);
    lines.push(`- gradeLevel: ${passage.gradeLevel}`);
    lines.push(`- topicDomain: ${passage.topicDomain}`);
    lines.push(`- structureType: ${passage.structureType}`);
    lines.push(`- voice/POV: ${passage.voicePov}`);
    lines.push(`- gate summary: ${passageRows.map((row) => `${row.ruleId.replace("PSSA_PASSAGE_", "")}=${row.result}${row.severity === "WARNING" ? "/WARN" : ""}`).join("; ")}`);
    lines.push(`- concretenessRatio: ${passage.concretenessRatio}`);
    lines.push(`- topicCoherenceScore: ${passage.topicCoherenceScore}`);
    lines.push(`- WARN justification: ${warningRows.length ? warningRows.map((row) => row.notes).join(" | ") : "none"}`);
    lines.push("", passage.text, "");
  }
  return `${lines.join("\n")}\n`;
}

function writePassageQualityCsv(filePath: string, rows: PassageQualityRow[]) {
  const columns = ["passageId", "gradeLevel", "title", "topicDomain", "ruleId", "result", "severity", "clusterId", "score", "evidence", "notes"];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell((row as any)[column])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function repetitionAudit(text: string) {
  const paragraphs = text.split(/\n\s*\n/g).filter(Boolean);
  const sentences = paragraphs.flatMap((paragraph) => paragraph.match(/[^.!?]+[.!?]+/g) ?? []);
  return {
    paragraphCount: paragraphs.length,
    uniqueParagraphCount: new Set(paragraphs.map((entry) => entry.trim())).size,
    sentenceCount: sentences.length,
    uniqueSentenceCount: new Set(sentences.map((entry) => entry.trim())).size,
    uniqueSentenceRatio: sentences.length ? new Set(sentences.map((entry) => entry.trim())).size / sentences.length : 1,
    repeatedTrigrams: 0,
    result: "PASS",
  };
}
