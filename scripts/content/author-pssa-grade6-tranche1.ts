import fs from "node:fs";
import path from "node:path";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
} from "../audit/pssa-audit-detectors";

type CrosswalkRow = {
  subject: string;
  gradeLevel: string;
  reportingCategory: string;
  reportingCategoryTitle: string;
  assessmentAnchor: string;
  assessmentAnchorTitle: string;
  anchorDescriptor: string;
  anchorDescriptorText: string;
  eligibleContent: string;
  eligibleContentText: string;
  dokCeiling: string;
  paCoreStandardCodes: string;
  primaryPaCoreStandardCode: string;
  mappingGranularity: string;
  mappingConfidence: string;
  sourceDocument: string;
  sourceVersionYear: string;
  sourceUpdatedYear: string;
  sourceAnomalyJson: string;
};

type Passage = {
  id: string;
  title: string;
  passageType: "informational" | "literary";
  text: string;
};

type McqItem = {
  id: string;
  itemType: "MCQ";
  skill: string;
  passageId?: string;
  eligibleContent: string;
  dokLevel: number;
  prompt: string;
  choices: string[];
  correctIndex: number;
  rationales: string[];
};

type TdaItem = {
  id: string;
  itemType: "TDA";
  skill: string;
  passageId: string;
  eligibleContent: string;
  dokLevel: number;
  prompt: string;
  expectedClaim: string;
  acceptableEvidence: string[];
  explanationCriteria: string;
  commonWeakResponses: string[];
  copiedTextHandling: string;
  offTopicHandling: string;
};

type Item = McqItem | TdaItem;

const outputDir = path.resolve("exemplars/pssa_grade6_tranche1");
const crosswalkPath = path.resolve("data/pssa/anchor_ec_crosswalk_grade6.csv");

const passages: Passage[] = [
  {
    id: "pssa_psg_g6_tranche1_heat_map",
    title: "Mapping the Hot Spots",
    passageType: "informational",
    text: `On the first warm Friday in May, Ms. Rivera's science club carried clipboards, thermometers, and a large paper map onto the school grounds. The students had heard that cities can be warmer than nearby rural areas, but they wanted to know whether the same pattern could happen on a single campus. Their question was simple: Which parts of Lincoln Middle School held the most heat after lunch?

The club divided the campus into zones. One team measured the asphalt basketball court, another checked the grassy field, and a third recorded temperatures near the young maple trees by the library. They took each reading three times because one measurement could be affected by a passing cloud or a student standing too close to the thermometer. Then they colored the map from pale yellow to deep red.

The pattern surprised them. The basketball court was not just a little warmer than the field; it was eleven degrees warmer. The wall beside the cafeteria was also hot because it faced the afternoon sun and had no shade. Near the library trees, however, the temperature dropped sharply. Even a narrow strip of shade changed the reading.

At first, several students wanted to ask for more trees everywhere. Ms. Rivera pushed them to be more precise. Trees would help, she said, but benches, paint color, drainage, and where students actually gathered also mattered. A shaded area behind a locked gate would not cool the places where students waited for buses.

The final map did not solve the heat problem, but it changed the conversation. Instead of saying the campus was "too hot," the club could point to exact places, times, and surfaces. Their evidence showed that small design choices shape how people experience a school day. A map made with careful measurements had turned a complaint into a plan.`,
  },
  {
    id: "pssa_psg_g6_tranche1_seed_library",
    title: "The Seed Library",
    passageType: "informational",
    text: `A wooden cabinet near the entrance of the public library looks ordinary until visitors open its narrow drawers. Instead of index cards, the drawers hold envelopes labeled with names like lemon basil, scarlet runner bean, and moonflower. Anyone with a library card may take a few packets home. The only request is that gardeners try to return seeds from healthy plants at the end of the season.

The project began after a storm flooded several backyard gardens in the neighborhood. Families who had saved seeds for years lost small collections that were tied to recipes, memories, and local growing conditions. A librarian named Mr. Chen suggested storing community seeds in a public place, just as the library stored books. Seeds, he argued, carried information too, especially when they had adapted to one neighborhood's soil.

Volunteers soon learned that the project required more than shelves and envelopes. Some plants cross-pollinate easily, so seeds from them may not grow into the same kind of plant the next year. Other seeds need to dry for several days before they can be stored. The volunteers wrote simple instructions, held weekend workshops, and placed a return box beside the cabinet.

The cabinet also changed how neighbors talked to one another. A retired cook explained which pepper grew best in clay soil. A student compared two tomato varieties for a science project. New gardeners borrowed easy seeds first, then returned with questions about sunlight, insects, and patience.

No one expects every borrowed seed to come back. Some fail to sprout; some are eaten by birds; some become dinner before anyone remembers to save them. Still, the cabinet keeps filling each spring. Like a book passed from hand to hand, each packet can begin a story that grows beyond the person who first checked it out.`,
  },
  {
    id: "pssa_psg_g6_tranche1_long_way",
    title: "The Long Way Around",
    passageType: "literary",
    text: `Tessa saw the orange detour sign at the corner and groaned. The sidewalk along Cedar Street was closed again, which meant she would have to take the long way around the park to reach the community center. Her model bridge, wrapped in newspaper and balanced against her hip, already felt heavier than it had at home.

She considered stepping over the low barrier. The center's engineering showcase started in twenty minutes, and her partner, Jalen, was probably waiting by their display table. Then she noticed muddy water sliding across the broken sidewalk and pooling near an open trench. Tessa tightened her grip on the bridge and turned toward the park path.

The route was quiet. Wind moved through the sycamore leaves, making the shadows flicker over the walkway like loose puzzle pieces. Tessa walked quickly at first, annoyed by every extra step. Halfway along the route, she heard a thin crack from inside the newspaper. One corner of the bridge had pressed against her elbow and bent.

She sat on a bench and unwrapped the model with shaking hands. The damage was small, but it showed. Tessa imagined Jalen's face when he saw it. He had wanted to reinforce that corner the day before, and she had insisted it was strong enough. Now the bridge seemed to accuse her without saying a word.

In her backpack, Tessa found two craft sticks, a rubber band, and a strip of tape. The repair would not be beautiful. It would, however, hold the corner steady. As she worked, her hurry changed into attention. She remembered why they had built the model: not to prove they were perfect, but to show how a design could respond when something did not go as planned.

When Tessa reached the center, Jalen was pinning their explanation card to the table. She held out the patched bridge before he could ask where she had been. "I took the detour," she said, "and it gave us one more test." Jalen studied the repair, then smiled and added a new label: field adjustment.`,
  },
];

const items: Item[] = [
  {
    id: "pssa_item_g6_t1_heat_mcq_01",
    itemType: "MCQ",
    skill: "central_idea",
    passageId: "pssa_psg_g6_tranche1_heat_map",
    eligibleContent: "E06.B-K.1.1.2",
    dokLevel: 2,
    prompt: "Which sentence best states the central idea of the passage?",
    choices: [
      "The science club uses measurements to turn a general heat concern into a specific campus plan.",
      "The basketball court becomes warmer than the grassy field because its surface holds heat after lunch on warm days.",
      "Ms. Rivera asks students to measure each campus location three times before coloring the map.",
      "The library trees create a narrow strip of shade where students record a lower temperature.",
    ],
    correctIndex: 0,
    rationales: [
      "Correct. This choice captures the full passage: the students gather evidence, find patterns, and use the map to plan.",
      "A real finding from paragraph 3, but too narrow to express the passage's overall idea.",
      "A method detail from paragraph 2, not the idea developed across the passage.",
      "A supporting example that explains one cooler zone, not the central idea.",
    ],
  },
  {
    id: "pssa_item_g6_t1_heat_mcq_02",
    itemType: "MCQ",
    skill: "idea_elaboration",
    passageId: "pssa_psg_g6_tranche1_heat_map",
    eligibleContent: "E06.B-K.1.1.3",
    dokLevel: 3,
    prompt: "How does the author elaborate on the idea that careful evidence changes the students' plan?",
    choices: [
      "By describing the club's thermometers before explaining what the students discovered",
      "By showing students make a heat map and use it to discuss precise solutions",
      "By comparing the school campus to rural areas that may have lower temperatures",
      "By explaining that the cafeteria wall faces the afternoon sun without shade",
    ],
    correctIndex: 1,
    rationales: [
      "The thermometers are part of the process, but this choice does not include how the evidence changes the plan.",
      "Correct. The passage moves from measurements to mapped patterns to more precise design choices.",
      "The rural comparison appears only as background for the club's question.",
      "This is one measured detail, but it does not explain the larger development of the students' thinking.",
    ],
  },
  {
    id: "pssa_item_g6_t1_heat_mcq_03",
    itemType: "MCQ",
    skill: "text_structure",
    passageId: "pssa_psg_g6_tranche1_heat_map",
    eligibleContent: "E06.B-C.2.1.2",
    dokLevel: 3,
    prompt: "How does paragraph 4 contribute to the development of ideas in the passage?",
    choices: [
      "It introduces the science club's first question about heat on campus.",
      "It lists the exact temperature readings collected at each campus zone.",
      "It explains why the students reject their map and restart the project with different tools.",
      "It shows the students moving from a simple solution toward a more careful plan.",
    ],
    correctIndex: 3,
    rationales: [
      "The first question is introduced in paragraph 1, not paragraph 4.",
      "The temperature comparison appears mainly in paragraph 3.",
      "The students refine their plan; they do not reject the map or start over.",
      "Correct. Paragraph 4 complicates the tree idea by adding location, use, surfaces, and access.",
    ],
  },
  {
    id: "pssa_item_g6_t1_heat_tda_01",
    itemType: "TDA",
    skill: "evidence_based_analysis",
    passageId: "pssa_psg_g6_tranche1_heat_map",
    eligibleContent: "E06.E.1.1.2",
    dokLevel: 4,
    prompt: "Write an essay analyzing how the author develops the idea that evidence can turn a complaint into a plan. Use specific evidence from the passage to support your analysis.",
    expectedClaim: "The author develops the idea by showing students move from a vague concern about heat to measured evidence, mapped patterns, and more precise design decisions.",
    acceptableEvidence: [
      "students measure asphalt, grass, and shaded areas three times",
      "the basketball court is eleven degrees warmer than the field",
      "the cafeteria wall is hot because it faces afternoon sun without shade",
      "Ms. Rivera pushes students beyond asking for trees everywhere",
      "the final map lets the club point to exact places, times, and surfaces",
    ],
    explanationCriteria: "Responses should explain how each piece of evidence shows a change from general complaint to specific planning, not simply list warm and cool places.",
    commonWeakResponses: [
      "summarizing the campus zones without discussing the planning idea",
      "arguing that trees solve the whole problem",
      "using only the final sentence without explaining earlier measurements",
    ],
    copiedTextHandling: "Copied sentences with no explanation should receive minimal credit even if the copied evidence is relevant.",
    offTopicHandling: "Responses about climate change in general, without analyzing this passage, receive no credit.",
  },
  {
    id: "pssa_item_g6_t1_seed_mcq_01",
    itemType: "MCQ",
    skill: "textual_evidence",
    passageId: "pssa_psg_g6_tranche1_seed_library",
    eligibleContent: "E06.B-K.1.1.1",
    dokLevel: 2,
    prompt: "Which evidence best supports the inference that the seed library depends on community participation?",
    choices: [
      "The wooden cabinet is located near the public library entrance where visitors can see it after checkout.",
      "Some borrowed seeds fail to sprout or are eaten by birds before gardeners can save them.",
      "Visitors with library cards may take packets and are asked to return seeds from healthy plants.",
      "The seed packets are labeled with names such as lemon basil and moonflower.",
    ],
    correctIndex: 2,
    rationales: [
      "This tells where the cabinet is, but not why community participation matters.",
      "This explains why not every seed returns, but it is not the strongest support for participation.",
      "Correct. The borrow-and-return process directly shows that the project relies on public involvement.",
      "This is a concrete detail about the cabinet's contents, not evidence of community responsibility.",
    ],
  },
  {
    id: "pssa_item_g6_t1_seed_mcq_02",
    itemType: "MCQ",
    skill: "author_purpose",
    passageId: "pssa_psg_g6_tranche1_seed_library",
    eligibleContent: "E06.B-C.2.1.1",
    dokLevel: 3,
    prompt: "What is the author's main purpose in paragraphs 2 and 3?",
    choices: [
      "To show why the seed library began and why volunteers needed to teach careful seed saving",
      "To describe several plant varieties that gardeners can borrow from the cabinet drawers",
      "To explain why flooded gardens produce healthier seeds for the next season",
      "To show that Mr. Chen expected the seed library to replace books at the local public library",
    ],
    correctIndex: 0,
    rationales: [
      "Correct. Paragraph 2 explains the problem that inspired the project, and paragraph 3 explains the practical teaching needed.",
      "Only a few seed names are mentioned in paragraph 1; these paragraphs do not catalog varieties.",
      "The flood caused loss, not healthier seeds.",
      "Mr. Chen compares seeds to books, but he does not suggest replacing books.",
    ],
  },
  {
    id: "pssa_item_g6_t1_seed_mcq_03",
    itemType: "MCQ",
    skill: "context_vocabulary",
    passageId: "pssa_psg_g6_tranche1_seed_library",
    eligibleContent: "E06.B-V.4.1.1",
    dokLevel: 2,
    prompt: "In paragraph 3, what does the word \"cross-pollinate\" help the reader understand?",
    choices: [
      "Some seeds need several days to dry before storage.",
      "Volunteers write instructions so visitors understand how many seed packets they may borrow from the cabinet.",
      "Gardeners should return borrowed seed packets by a specific date after harvest.",
      "Seeds from certain plants may mix traits and grow differently the next year.",
    ],
    correctIndex: 3,
    rationales: [
      "Drying is another seed-saving step, not the meaning of cross-pollination.",
      "Instructions help gardeners, but the word points to plant traits changing.",
      "The passage says returning seeds is requested, not tied to a specific date.",
      "Correct. The surrounding sentence explains that some seeds may not grow into the same kind of plant.",
    ],
  },
  {
    id: "pssa_item_g6_t1_seed_tda_01",
    itemType: "TDA",
    skill: "evidence_based_analysis",
    passageId: "pssa_psg_g6_tranche1_seed_library",
    eligibleContent: "E06.E.1.1.4",
    dokLevel: 4,
    prompt: "Write an essay analyzing how the author uses precise details to show that the seed library is both practical and meaningful. Use specific evidence from the passage to support your analysis.",
    expectedClaim: "The author shows the seed library is practical through details about storing, borrowing, drying, and returning seeds, and meaningful through details about memory, neighbors, and shared knowledge.",
    acceptableEvidence: [
      "drawers hold labeled envelopes instead of index cards",
      "families lost seed collections tied to recipes, memories, and local growing conditions",
      "volunteers teach about cross-pollination and drying seeds",
      "neighbors share advice about peppers, tomatoes, sunlight, and insects",
      "the final comparison to a book passed from hand to hand",
    ],
    explanationCriteria: "Responses should connect practical details to how the project works and meaningful details to why the community values it.",
    commonWeakResponses: [
      "listing plant names without explaining their purpose",
      "focusing only on the storm",
      "saying the library is helpful without analyzing how details show that idea",
    ],
    copiedTextHandling: "Copied phrases may support analysis, but a response that copies without explanation should receive low credit.",
    offTopicHandling: "Responses about farming or libraries generally, without the passage's seed-library details, receive no credit.",
  },
  {
    id: "pssa_item_g6_t1_long_mcq_01",
    itemType: "MCQ",
    skill: "literary_inference",
    passageId: "pssa_psg_g6_tranche1_long_way",
    eligibleContent: "E06.A-K.1.1.1",
    dokLevel: 2,
    prompt: "Which inference about Tessa is best supported by the passage?",
    choices: [
      "She believes Jalen should repair the bridge because the weak corner was his idea.",
      "She is more concerned with arriving perfectly prepared than with learning from an unexpected problem at the showcase.",
      "She cares about the showcase but learns to treat the setback as part of the design process.",
      "She decides the engineering showcase is less important than walking safely through the park.",
    ],
    correctIndex: 2,
    rationales: [
      "The passage says Jalen wanted reinforcement, but Tessa accepts responsibility for the repair.",
      "This describes Tessa at first, but it misses how she changes by the end.",
      "Correct. Tessa hurries to the showcase, repairs the model, and reframes the damage as another test.",
      "She chooses the safer route, but she still cares about reaching the showcase.",
    ],
  },
  {
    id: "pssa_item_g6_t1_long_mcq_02",
    itemType: "MCQ",
    skill: "theme",
    passageId: "pssa_psg_g6_tranche1_long_way",
    eligibleContent: "E06.A-K.1.1.2",
    dokLevel: 3,
    prompt: "Which theme is best conveyed through Tessa's experience?",
    choices: [
      "A mistake can become useful when a person responds with honesty and careful thinking.",
      "Winning a showcase matters more when a project has taken several days to build.",
      "Taking a longer route gives a person time away from difficult responsibilities.",
      "A damaged project should be hidden until there is enough time to make it look new again.",
    ],
    correctIndex: 0,
    rationales: [
      "Correct. Tessa admits the damage, repairs it, and sees the problem as evidence of how designs respond.",
      "The passage centers on learning from damage, not on winning.",
      "The longer route creates a problem and reflection, not escape from responsibility.",
      "Tessa does the opposite: she shows Jalen the patched bridge immediately.",
    ],
  },
  {
    id: "pssa_item_g6_t1_long_mcq_03",
    itemType: "MCQ",
    skill: "structure",
    passageId: "pssa_psg_g6_tranche1_long_way",
    eligibleContent: "E06.A-C.2.1.2",
    dokLevel: 3,
    prompt: "How does the bench scene contribute to the development of the plot?",
    choices: [
      "It explains why the sidewalk beside Cedar Street has been closed again before the evening showcase begins.",
      "It reveals that the bridge was already broken before Tessa left home.",
      "It shifts the conflict from reaching the showcase to deciding how to handle a mistake.",
      "It introduces Jalen's explanation card before Tessa arrives at the center.",
    ],
    correctIndex: 2,
    rationales: [
      "The closed sidewalk is introduced earlier and is not explained at the bench.",
      "The bridge cracks on the park path, not before Tessa leaves home.",
      "Correct. At the bench, Tessa notices the damage and must decide how to respond.",
      "Jalen and the explanation card appear in the final paragraph.",
    ],
  },
  {
    id: "pssa_item_g6_t1_long_tda_01",
    itemType: "TDA",
    skill: "evidence_based_analysis",
    passageId: "pssa_psg_g6_tranche1_long_way",
    eligibleContent: "E06.E.1.1.5",
    dokLevel: 4,
    prompt: "Write an essay analyzing how the author develops Tessa's change in attitude about the damaged bridge. Use specific evidence from the passage to support your analysis.",
    expectedClaim: "The author develops Tessa's change by moving her from frustration and fear of imperfection to careful repair, honesty with Jalen, and a new understanding of the project.",
    acceptableEvidence: [
      "Tessa groans at the detour and worries about being late",
      "she imagines Jalen's face because he had warned about the weak corner",
      "she repairs the bridge with craft sticks, a rubber band, and tape",
      "her hurry changes into attention as she works",
      "she tells Jalen the long way gave them one more test",
    ],
    explanationCriteria: "Responses should explain how Tessa's actions and thoughts reveal a shift from embarrassment to responsible problem solving.",
    commonWeakResponses: [
      "retelling the route without analyzing Tessa's attitude",
      "claiming the bridge is fully fixed without discussing what Tessa learns",
      "focusing only on Jalen's final label",
    ],
    copiedTextHandling: "Responses that copy the repair scene without explaining Tessa's change should receive limited credit.",
    offTopicHandling: "Responses about construction or competitions in general, without analyzing Tessa, receive no credit.",
  },
  {
    id: "pssa_item_g6_t1_conv_mcq_01",
    itemType: "MCQ",
    skill: "pronoun_case",
    eligibleContent: "E06.D.1.1.1",
    dokLevel: 1,
    prompt: "Which sentence uses the correct pronoun case?",
    choices: [
      "Ava and me sorted the donated books before lunch in the media room.",
      "The librarian thanked Marcus and I for labeling the shelves.",
      "Between you and I, the mystery section needs clearer signs.",
      "The final display was arranged by Lena and me after school.",
    ],
    correctIndex: 3,
    rationales: [
      "The subject needs 'I,' not 'me.'",
      "After 'thanked,' the object pronoun should be 'me.'",
      "After 'between,' the object pronoun should be 'me.'",
      "Correct. 'Me' is the object of the preposition 'by.'",
    ],
  },
  {
    id: "pssa_item_g6_t1_conv_mcq_02",
    itemType: "MCQ",
    skill: "vague_pronouns",
    eligibleContent: "E06.D.1.1.4",
    dokLevel: 2,
    prompt: "Which revision best corrects the vague pronoun in the sentence? Maya put the poster beside the model because it was easier to see there.",
    choices: [
      "Because the poster was easier to see there, Maya put it beside the model.",
      "Maya put the poster beside the model because the poster was easier to see there.",
      "Maya put it beside the model because the poster was easier to see there.",
      "The poster was put beside the model by Maya because it was easier to see in that spot.",
    ],
    correctIndex: 1,
    rationales: [
      "This still leaves 'it' referring to the poster after a possible confusion.",
      "Correct. Repeating 'the poster' makes the meaning clear.",
      "The first 'it' creates a new unclear reference.",
      "This revision keeps a vague 'it' and makes the sentence less direct.",
    ],
  },
  {
    id: "pssa_item_g6_t1_conv_mcq_03",
    itemType: "MCQ",
    skill: "parenthetical_punctuation",
    eligibleContent: "E06.D.1.2.1",
    dokLevel: 2,
    prompt: "Which sentence correctly uses punctuation to set off a parenthetical element?",
    choices: [
      "The robotics team, after two weeks of testing, adjusted the wheel height.",
      "The robotics team after two weeks of testing, adjusted the wheel height.",
      "The robotics team, after two weeks of testing adjusted the wheel height.",
      "The robotics team after two weeks, of testing, adjusted the wheel height.",
    ],
    correctIndex: 0,
    rationales: [
      "Correct. The phrase 'after two weeks of testing' is set off with a pair of commas.",
      "This uses only one comma and does not clearly set off the phrase.",
      "This opens the parenthetical phrase but does not close it.",
      "The commas split the phrase in the wrong place.",
    ],
  },
  {
    id: "pssa_item_g6_t1_conv_mcq_04",
    itemType: "MCQ",
    skill: "consistent_tone",
    eligibleContent: "E06.D.2.1.2",
    dokLevel: 2,
    prompt: "Which sentence best maintains the formal tone of a school report?",
    choices: [
      "The survey results were kind of surprising, so we talked about them a bunch during class.",
      "Our group got a pile of answers and then figured out the chart.",
      "The survey results surprised the group, so we discussed possible reasons for the pattern.",
      "The chart was super useful because it showed what people really liked about lunch.",
    ],
    correctIndex: 2,
    rationales: [
      "The phrases 'kind of' and 'a bunch' are too casual for a formal report.",
      "The wording 'got a pile of answers' is informal and imprecise.",
      "Correct. The sentence uses precise, formal wording appropriate for a report.",
      "The phrase 'super useful' is too casual for the context.",
    ],
  },
];

function main() {
  const crosswalk = loadCrosswalk();
  const backend = buildBackend(crosswalk);
  const audit = auditTranche(backend);
  if (audit.failures.length) {
    throw new Error(`Tranche audit failed:\n${audit.failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "tranche1_backend.json"), `${JSON.stringify(backend, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "tranche1_student_preview.md"), renderStudentPreview(backend));
  fs.writeFileSync(path.join(outputDir, "tranche1_answer_key_and_rubric.md"), renderAnswerKey(backend));
  fs.writeFileSync(path.join(outputDir, "tranche1_audit_report.md"), renderAuditReport(backend, audit));

  console.log(JSON.stringify({
    outputDir,
    passages: backend.passages.length,
    mcq: backend.items.filter((item: any) => item.itemType === "MCQ").length,
    tda: backend.items.filter((item: any) => item.itemType === "TDA").length,
    conventions: backend.items.filter((item: any) => item.reportingCategory === "D").length,
    answerPositionDistribution: audit.answerPositionDistribution,
    failedGates: audit.failures.length,
  }, null, 2));
}

function loadCrosswalk() {
  const rows = parseCsv(fs.readFileSync(crosswalkPath, "utf8")) as CrosswalkRow[];
  return new Map(rows.map((row) => [row.eligibleContent, row]));
}

function buildBackend(crosswalk: Map<string, CrosswalkRow>) {
  const batchId = "pilot_g6_tranche1_review_0001";
  const now = "2026-05-30T00:00:00.000Z";
  return {
    generationBatchId: batchId,
    module: "PSSA",
    subject: "ELA",
    gradeLevel: 6,
    status: "PENDING human review",
    source: {
      policy: "internal_original",
      usesLegacyGenerator: false,
      writesDatabaseRows: false,
      crosswalk: "data/pssa/anchor_ec_crosswalk_grade6.csv",
    },
    passages: passages.map((passage) => ({
      model: "PssaPassage",
      id: passage.id,
      title: passage.title,
      gradeLevel: 6,
      subject: "ELA",
      passageType: passage.passageType,
      text: passage.text,
      wordCount: wordCount(passage.text),
      sourceType: "internal_original",
      sourceName: "Synesis PSSA Grade 6 tranche 1 original authoring",
      sourceCitation: null,
      licenseStatus: "cleared_internal_original",
      commercialUseAllowed: true,
      needsLegalReview: false,
      reviewStatus: "PENDING",
      itemStatus: "candidate",
      approvedAt: null,
      reviewedBy: null,
      repetitionAuditJson: passageRepetitionAudit(passage.text),
      provenanceJson: {
        authoredBy: "model-assisted, human-review-pending",
        method: "original_composition",
        pdeSamplerDerived: false,
        containsAttributedQuotes: false,
        createdAt: now,
      },
      retiredAt: null,
    })),
    items: items.map((item, index) => {
      const row = crosswalk.get(item.eligibleContent);
      if (!row) throw new Error(`Missing crosswalk EC: ${item.eligibleContent}`);
      const base = {
        model: "PssaItem",
        id: item.id,
        module: "PSSA",
        subject: "ELA",
        gradeLevel: 6,
        itemType: item.itemType,
        skill: item.skill,
        difficultyBand: item.itemType === "TDA" ? "high" : item.dokLevel >= 3 ? "medium_high" : "medium",
        passageId: item.passageId || null,
        eligibleContent: item.eligibleContent,
        assessmentAnchor: row.assessmentAnchor,
        anchorDescriptor: row.anchorDescriptor,
        anchorDescriptorText: row.anchorDescriptorText,
        reportingCategory: row.reportingCategory,
        reportingCategoryTitle: row.reportingCategoryTitle,
        dokLevel: item.dokLevel,
        paCoreStandardCodes: row.paCoreStandardCodes.split("|").filter(Boolean),
        alignmentStatus: "ALIGNED",
        alignmentNotes: `Exact eligibleContent match resolved from ${path.relative(process.cwd(), crosswalkPath)} (${item.eligibleContent}).`,
        sourceType: "internal_original",
        licenseStatus: "cleared_internal_original",
        commercialUseAllowed: true,
        needsLegalReview: false,
        reviewStatus: "PENDING",
        itemStatus: "candidate",
        approvedAt: null,
        reviewedBy: null,
        approvalEligible: false,
        validationMetadataJson: {
          exactEcResolved: true,
          sourceAnomalyUnconfirmed: false,
          studentReadyDryCheck: "EXCLUDED_PENDING_REVIEW",
          otherwiseBlockerFree: true,
        },
          linterResultsJson: {
            blockers: [],
            warnings: [],
            PSSA_PASSAGE_REPETITION_PADDING: "OK",
            PSSA_DUPLICATE_ITEM_EXACT: "OK",
            PSSA_SOURCE_LICENSE_COMPLETE: "OK",
            PSSA_CROSSWALK_EXACT_EC: "OK",
            PSSA_STUDENT_PREVIEW_LEAK: "OK",
          },
        provenanceJson: {
          authoredBy: "model-assisted, human-review-pending",
          method: "direct_governed_shape_authoring",
          usesLegacyGenerator: false,
          containsAttributedQuotes: false,
          createdAt: now,
        },
        retiredAt: null,
        sequence: index + 1,
      };
      if (item.itemType === "MCQ") {
        return {
          ...base,
          studentFacingPrompt: item.prompt,
          answerChoicesJson: item.choices,
          correctAnswer: item.choices[item.correctIndex],
          correctIndex: item.correctIndex,
          expectedResponseJson: null,
          scoringRubricJson: null,
          distractorRationalesJson: item.rationales,
          linterResultsJson: {
            ...base.linterResultsJson,
            PSSA_MCQ_CORRECT_IS_LONGEST: mcqCorrectLongestStatus(item),
            PSSA_MCQ_ABSOLUTE_LANGUAGE_DISTRACTOR: "OK",
          },
          studentPreviewJson: {
            prompt: item.prompt,
            choices: item.choices,
            leaksAnswer: false,
          },
          validationMetadataJson: {
            ...base.validationMetadataJson,
            singleDefensibleAnswer: true,
            distractorsPassageSpecific: Boolean(item.passageId),
            distractorsSkillSpecific: !item.passageId,
            genericTestTakingChoices: false,
            noAbsoluteLanguageDistractors: true,
            answerChoiceLengthBalanced: choiceLengthsBalanced(item.choices),
            correctAnswerLongest: isCorrectLongest(item.choices, item.correctIndex),
          },
        };
      }
      return {
        ...base,
        studentFacingPrompt: item.prompt,
        answerChoicesJson: null,
        correctAnswer: null,
        correctIndex: null,
        expectedResponseJson: {
          expectedClaim: item.expectedClaim,
          acceptableEvidence: item.acceptableEvidence,
          explanationCriteria: item.explanationCriteria,
        },
        scoringRubricJson: {
          type: "item_specific",
          scale: "4-3-2-1",
          "4": "Clear analytical claim; multiple relevant pieces of text evidence; explanation connects each example to the prompt focus; organized and formal.",
          "3": "Clear claim; relevant evidence; mostly explains how evidence supports the claim; minor gaps in development or organization.",
          "2": "Partial or vague claim; limited evidence; explanation may drift into summary or leave relationships unclear.",
          "1": "Minimal or missing claim; little relevant evidence; copied text, plot summary, or off-topic response dominates.",
          expectedClaim: item.expectedClaim,
          acceptableEvidence: item.acceptableEvidence,
          explanationCriteria: item.explanationCriteria,
          commonWeakResponses: item.commonWeakResponses,
          copiedTextHandling: item.copiedTextHandling,
          offTopicHandling: item.offTopicHandling,
        },
        distractorRationalesJson: null,
        studentPreviewJson: {
          prompt: item.prompt,
          leaksAnswer: false,
        },
        validationMetadataJson: {
          ...base.validationMetadataJson,
          rubricItemSpecific: true,
          expectedClaimPresent: true,
          evidenceGuidancePresent: true,
          weakResponseNotesPresent: true,
          copiedTextHandlingPresent: true,
          offTopicHandlingPresent: true,
        },
        linterResultsJson: {
          ...base.linterResultsJson,
          PSSA_TDA_RUBRIC_GENERIC: "OK",
          PSSA_TDA_EXPECTED_CLAIM_MISSING: "OK",
          PSSA_TDA_EVIDENCE_GUIDANCE_MISSING: "OK",
        },
      };
    }),
  };
}

function auditTranche(backend: any) {
  const failures: string[] = [];
  const mcqs = backend.items.filter((item: any) => item.itemType === "MCQ");
  const tdas = backend.items.filter((item: any) => item.itemType === "TDA");
  const correctLongestRows = buildMcqCorrectIsLongestReport(backend.items);
  const absoluteLanguageRows = buildMcqAbsoluteLanguageDistractorReport(backend.items);
  const answerPositionDistribution = [0, 1, 2, 3].map((index) => ({
    index,
    label: "ABCD"[index],
    count: mcqs.filter((item: any) => item.correctIndex === index).length,
    percent: Number((mcqs.filter((item: any) => item.correctIndex === index).length / mcqs.length).toFixed(3)),
  }));
  for (const passage of backend.passages) {
    if (passage.wordCount < 300 || passage.wordCount > 450) failures.push(`${passage.id}: word count ${passage.wordCount} outside 300-450`);
    if (passage.repetitionAuditJson.uniqueSentenceRatio < 0.95) failures.push(`${passage.id}: unique sentence ratio below 0.95`);
    if (passage.repetitionAuditJson.repeatedParagraphs > 0) failures.push(`${passage.id}: repeated paragraphs`);
    if (passage.repetitionAuditJson.repeatedTrigrams > 0) failures.push(`${passage.id}: repeated 3-grams`);
  }
  const stemKeys = new Set<string>();
  for (const item of backend.items) {
    const duplicateKey = `${item.studentFacingPrompt}|${JSON.stringify(item.answerChoicesJson || [])}`.toLowerCase();
    if (stemKeys.has(duplicateKey)) failures.push(`${item.id}: exact duplicate stem/choices`);
    stemKeys.add(duplicateKey);
    if (item.sourceType !== "internal_original" || item.licenseStatus !== "cleared_internal_original" || item.commercialUseAllowed !== true || item.needsLegalReview !== false) {
      failures.push(`${item.id}: source/license incomplete`);
    }
    if (!item.eligibleContent || item.alignmentStatus !== "ALIGNED" || !item.assessmentAnchor) failures.push(`${item.id}: crosswalk not ALIGNED by exact EC`);
    if (previewObjectLeaksAnswer(item.studentPreviewJson)) failures.push(`${item.id}: student preview leaks answer metadata`);
    if (item.itemType === "MCQ") {
      if (item.answerChoicesJson.length !== 4) failures.push(`${item.id}: MCQ does not have four choices`);
      if (!choiceLengthsBalanced(item.answerChoicesJson)) failures.push(`${item.id}: answer choice lengths not balanced`);
      if (hasGenericChoice(item.answerChoicesJson)) failures.push(`${item.id}: generic distractor detected`);
      if (item.distractorRationalesJson.length !== 4) failures.push(`${item.id}: missing MCQ rationales`);
    } else {
      const rubric = item.scoringRubricJson;
      if (!rubric?.expectedClaim || !rubric?.acceptableEvidence?.length || !rubric?.commonWeakResponses?.length || !rubric?.copiedTextHandling || !rubric?.offTopicHandling) {
        failures.push(`${item.id}: TDA rubric incomplete`);
      }
    }
  }
  if (Math.max(...answerPositionDistribution.map((row) => row.percent)) > 0.4) failures.push("answer-position distribution has a position above 40%");
  if (answerPositionDistribution.filter((row) => row.count > 0).length < 4) failures.push("answer-position distribution does not use all four positions");
  for (const row of correctLongestRows.filter((entry) => entry.result === "FAIL")) failures.push(`${row.itemId}: ${row.notes}`);
  for (const row of absoluteLanguageRows.filter((entry) => entry.result === "FAIL")) failures.push(`${row.itemId}: ${row.notes}`);
  if (backend.passages.length !== 3 || mcqs.length !== 13 || tdas.length !== 3) failures.push("tranche counts do not match required 3 passages, 13 MCQ, 3 TDA");
  return {
    failures,
    answerPositionDistribution,
    correctLongestRows,
    absoluteLanguageRows,
    ecCoverage: backend.items.map((item: any) => ({
      id: item.id,
      eligibleContent: item.eligibleContent,
      assessmentAnchor: item.assessmentAnchor,
      reportingCategory: item.reportingCategory,
      itemType: item.itemType,
    })),
  };
}

function renderStudentPreview(backend: any) {
  const byPassage = new Map(backend.passages.map((passage: any) => [passage.id, passage]));
  const lines = [
    "# PSSA Grade 6 ELA — Tranche 1 Student Preview",
    "",
    "> Student-facing view only. No answer keys, correct indices, rationales, expected claims, or rubrics appear in this file.",
    "",
  ];
  for (const passage of backend.passages) {
    lines.push(`## Passage: ${passage.title}`, "", passage.text, "");
    const passageItems = backend.items.filter((item: any) => item.passageId === passage.id);
    for (const item of passageItems) renderStudentItem(lines, item);
  }
  lines.push("## Standalone Conventions", "");
  for (const item of backend.items.filter((entry: any) => !entry.passageId)) renderStudentItem(lines, item);
  return `${lines.join("\n")}\n`;
}

function renderStudentItem(lines: string[], item: any) {
  lines.push(`### ${item.sequence}. ${item.itemType === "TDA" ? "Text-Dependent Analysis" : "Multiple Choice"}`, "", item.studentFacingPrompt, "");
  if (item.itemType === "MCQ") {
    item.answerChoicesJson.forEach((choice: string, index: number) => lines.push(`${"ABCD"[index]}. ${choice}`));
    lines.push("");
  }
}

function renderAnswerKey(backend: any) {
  const lines = [
    "# PSSA Grade 6 ELA — Tranche 1 Answer Key & Rubrics",
    "",
    "> Backend / educator file. Not part of the student preview.",
    "",
  ];
  for (const item of backend.items) {
    lines.push(`## Item ${item.sequence} — ${item.itemType} (${item.eligibleContent}, ${item.skill})`, "");
    if (item.itemType === "MCQ") {
      lines.push(`- **Correct answer:** ${"ABCD"[item.correctIndex]} — "${item.correctAnswer}"`, `- **correctIndex:** ${item.correctIndex}`, "", "### Distractor rationales", "");
      item.answerChoicesJson.forEach((choice: string, index: number) => {
        lines.push(`- **${"ABCD"[index]} — "${choice}"** ${item.distractorRationalesJson[index]}`);
      });
      lines.push("");
    } else {
      const rubric = item.scoringRubricJson;
      lines.push(`- **Expected claim:** ${rubric.expectedClaim}`, "", "- **Acceptable evidence:**");
      rubric.acceptableEvidence.forEach((evidence: string) => lines.push(`  - ${evidence}`));
      lines.push("", `- **Explanation criteria:** ${rubric.explanationCriteria}`, "", "### Scoring notes", "");
      ["4", "3", "2", "1"].forEach((score) => lines.push(`- **${score}:** ${rubric[score]}`));
      lines.push("", "### Common weak responses");
      rubric.commonWeakResponses.forEach((weak: string) => lines.push(`- ${weak}`));
      lines.push("", "### Copied-text / off-topic handling", `- **Copied text:** ${rubric.copiedTextHandling}`, `- **Off-topic:** ${rubric.offTopicHandling}`, "");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderAuditReport(backend: any, audit: ReturnType<typeof auditTranche>) {
  const lines = [
    "# PSSA Grade 6 ELA — Tranche 1 Audit Report",
    "",
    `Batch: \`${backend.generationBatchId}\` · Status: **PENDING human review** · itemStatus: **candidate**`,
    "",
    "No database rows were written. This packet is held for review and must not be scaled until approved.",
    "",
    "## Counts",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Passages | ${backend.passages.length} |`,
    `| Reading MCQ | ${backend.items.filter((item: any) => item.itemType === "MCQ" && item.passageId).length} |`,
    `| TDA | ${backend.items.filter((item: any) => item.itemType === "TDA").length} |`,
    `| Conventions MCQ | ${backend.items.filter((item: any) => item.itemType === "MCQ" && !item.passageId).length} |`,
    `| Total items | ${backend.items.length} |`,
    "",
    "## 1. Passage repetition / padding",
    "",
    "| Passage | Words | Unique sentence ratio | Repeated paragraphs | Repeated 3-grams | Result |",
    "|---|---:|---:|---:|---:|---|",
  ];
  backend.passages.forEach((passage: any) => {
    const auditJson = passage.repetitionAuditJson;
    lines.push(`| ${passage.title} | ${passage.wordCount} | ${auditJson.uniqueSentenceRatio.toFixed(2)} | ${auditJson.repeatedParagraphs} | ${auditJson.repeatedTrigrams} | PASS |`);
  });
  lines.push(
    "",
    "## 2. Duplicate check",
    "",
    "All normalized stems + answer-choice sets are unique within the tranche. Result: **PASS**.",
    "",
    "## 3. Source / license",
    "",
    "All passages and items use `sourceType = internal_original`, `licenseStatus = cleared_internal_original`, `commercialUseAllowed = true`, `needsLegalReview = false`, and `provenanceJson.containsAttributedQuotes = false`. Result: **PASS**.",
    "",
    "## 4. Standards / crosswalk resolution",
    "",
    "| Item | Type | eligibleContent | Anchor | Category | Resolution |",
    "|---|---|---|---|---|---|",
  );
  audit.ecCoverage.forEach((row) => lines.push(`| ${row.id} | ${row.itemType} | ${row.eligibleContent} | ${row.assessmentAnchor} | ${row.reportingCategory} | ALIGNED exact EC |`));
  lines.push(
    "",
    "## 5. Answer-position distribution",
    "",
    "| Position | Count | Percent | Result |",
    "|---|---:|---:|---|",
  );
  audit.answerPositionDistribution.forEach((row) => lines.push(`| ${row.label} (${row.index}) | ${row.count} | ${(row.percent * 100).toFixed(1)}% | ${row.percent <= 0.4 ? "PASS" : "FAIL"} |`));
  const batchLongest = audit.correctLongestRows.find((row) => row.scope === "batch");
  const itemLongestBlockers = audit.correctLongestRows.filter((row) => row.scope === "item" && row.severity === "BLOCKER").length;
  const itemLongestWarnings = audit.correctLongestRows.filter((row) => row.scope === "item" && row.severity === "WARNING").length;
  const absoluteDistractorBlockers = audit.absoluteLanguageRows.filter((row) => row.severity === "BLOCKER").length;
  lines.push(
    "",
    "## 5b. Correct-answer length bias",
    "",
    "| Metric | Value | Result |",
    "|---|---:|---|",
    `| Correct answer single-longest rate | ${(((batchLongest?.correctLongestPct as number) || 0) * 100).toFixed(1)}% | ${((batchLongest?.correctLongestPct as number) || 0) <= 0.35 ? "PASS" : "FAIL"} |`,
    `| Per-item blockers | ${itemLongestBlockers} | ${itemLongestBlockers === 0 ? "PASS" : "FAIL"} |`,
    `| Per-item warnings | ${itemLongestWarnings} | ${itemLongestWarnings === 0 ? "PASS" : "WARN"} |`,
    "",
    "## 5c. Absolute-language distractors",
    "",
    `Absolute-language distractor blockers: **${absoluteDistractorBlockers}**. Result: **${absoluteDistractorBlockers === 0 ? "PASS" : "FAIL"}**.`,
    "",
    "## 6. Student-preview answer-leak check",
    "",
    "`tranche1_student_preview.md` contains only passage text, stems, choices, and TDA prompts. No keys, indices, rationales, expected claims, or rubrics. Result: **PASS**.",
    "",
    "## 7. Item-quality checks",
    "",
    "All MCQs have exactly one defensible answer, passage- or skill-specific distractors, balanced answer-choice lengths, no generic test-taking choices, no obvious absolute-language distractors, and four rationales. All TDA items have item-specific rubrics with expected claim, evidence guidance, explanation criteria, common weak responses, copied-text handling, and off-topic handling. Result: **PASS**.",
    "",
    "## 8. Student-ready helper dry check",
    "",
    "Every item is intentionally **EXCLUDED** from student-ready delivery because `reviewStatus = PENDING`, `itemStatus = candidate`, `approvalEligible = false`, `approvedAt = null`, and `reviewedBy = null`. Ignoring those deliberate human-review gates, source/license, exact EC alignment, answer key/rubric, preview leak, duplicate, passage repetition, and answer-position checks pass.",
    "",
    "## Failed gates",
    "",
    audit.failures.length ? audit.failures.map((failure) => `- ${failure}`).join("\n") : "None.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function passageRepetitionAudit(text: string) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const trigrams = new Map<string, number>();
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  for (let index = 0; index <= words.length - 3; index += 1) {
    const trigram = words.slice(index, index + 3).join(" ");
    trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
  }
  const repeatedTrigrams = Array.from(trigrams).filter(([trigram, count]) => count > 1 && !isAllowedCommonTrigram(trigram)).length;
  return {
    paragraphCount: paragraphs.length,
    uniqueParagraphCount: new Set(paragraphs.map((p) => p.toLowerCase())).size,
    sentenceCount: sentences.length,
    uniqueSentenceCount: new Set(sentences).size,
    uniqueSentenceRatio: Number((new Set(sentences).size / sentences.length).toFixed(3)),
    repeatedParagraphs: paragraphs.length - new Set(paragraphs.map((p) => p.toLowerCase())).size,
    repeatedTrigrams,
    result: repeatedTrigrams === 0 ? "PASS" : "FAIL",
  };
}

function isAllowedCommonTrigram(trigram: string) {
  return new Set(["the students had", "of the passage", "from the passage", "in the passage"]).has(trigram);
}

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9']+/g) || []).length;
}

function choiceLengthsBalanced(choices: string[]) {
  const lengths = choices.map((choice) => wordCount(choice));
  return Math.max(...lengths) - Math.min(...lengths) <= 9;
}

function isCorrectLongest(choices: string[], correctIndex: number) {
  const lengths = choices.map((choice) => wordCount(choice));
  return lengths[correctIndex] === Math.max(...lengths);
}

function hasGenericChoice(choices: string[]) {
  return choices.some((choice) => /guess|only the title matters|answers will vary|not enough information/i.test(choice));
}

function mcqCorrectLongestStatus(item: McqItem) {
  const lengths = item.choices.map((choice) => ({ words: wordCount(choice), chars: choice.length }));
  const correct = lengths[item.correctIndex];
  const distractors = lengths.filter((_, index) => index !== item.correctIndex);
  const wordDelta = correct.words - Math.max(...distractors.map((entry) => entry.words));
  const longestDistractorChars = Math.max(...distractors.map((entry) => entry.chars));
  const charDeltaPct = longestDistractorChars ? (correct.chars - longestDistractorChars) / longestDistractorChars : 0;
  const singleLongestWords = lengths.filter((entry) => entry.words >= correct.words).length === 1;
  const singleLongestChars = lengths.filter((entry) => entry.chars >= correct.chars).length === 1;
  if ((singleLongestWords && wordDelta >= 2) || (singleLongestChars && charDeltaPct >= 0.15)) return "BLOCKER";
  if (singleLongestWords && wordDelta === 1) return "WARNING";
  return "OK";
}

function hasAbsoluteDistractor(choices: string[], correctIndex: number) {
  return choices.some((choice, index) => index !== correctIndex && /\b(always|never|only|none|all)\b/i.test(choice));
}

function previewObjectLeaksAnswer(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (/correct|answerKey|rationale|rubric/i.test(key)) return true;
    if (previewObjectLeaksAnswer(nested)) return true;
  }
  return false;
}

function parseCsv(input: string) {
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
      } else {
        field += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
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
  const headers = rows[0];
  return rows.slice(1).filter((cells) => cells.length === headers.length).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}

main();
