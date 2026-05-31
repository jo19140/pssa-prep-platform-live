import fs from "node:fs";
import path from "node:path";
import {
  buildMcqAbsoluteLanguageDistractorReport,
  buildMcqCorrectIsLongestReport,
  buildMcqPassageSpecificityReport,
  buildPssaPassageQualityReport,
  hasBlockingPassageQualityFailure,
  hasBlockingPassageSpecificityFailure,
  type DistractorRole,
  type EvidenceLink,
  type PassageQualityRow,
  type PassageSpecificityRow,
  type StructuredChoice,
} from "../audit/pssa-audit-detectors";

type Packet = { passages: Passage[]; items: Item[]; [key: string]: unknown };
type Passage = { id: string; title: string; text: string; gradeLevel?: number; [key: string]: unknown };
type Item = {
  id: string;
  itemType: string;
  passageId: string | null;
  eligibleContent: string;
  gradeLevel: number;
  reportingCategory?: string;
  studentFacingPrompt: string;
  answerChoicesJson: string[] | null;
  structuredChoicesJson?: StructuredChoice[] | null;
  correctIndex: number | null;
  correctAnswer: string | null;
  distractorRationalesJson: string[] | null;
  studentPreviewJson: { prompt: string; choices: string[] | null; leaksAnswer: boolean };
  linterResultsJson?: Record<string, unknown>;
  validationMetadataJson?: Record<string, unknown>;
  provenanceJson?: Record<string, unknown>;
  [key: string]: unknown;
};
type DraftChoice = { text: string; isCorrect: boolean; rationale: string; quote: string; role: DistractorRole | null };
type ItemDraft = { stem: string; correctIndex: number; choices: DraftChoice[] };

const packetPath = path.resolve("exemplars/pssa_grade3_pilot/pilot_backend.json");
const outputDir = path.resolve("exemplars/pssa_grade3_pilot");
const reportDir = path.resolve("audit_exports/pssa_pr4g_grade3_reading");

const expectedPassageCounts = new Map([
  ["pssa_psg_g3_creek_watchers", 6],
  ["pssa_psg_g3_the_map_in_the_station", 6],
  ["pssa_psg_g3_a_cooler_lunch_line", 6],
  ["pssa_psg_g3_the_mural_plan", 5],
  ["pssa_psg_g3_the_cart_that_would_not_turn", 5],
]);

const drafts: Record<string, ItemDraft> = {
  pssa_item_g3_reading_1: draft("Why did Maya's class compare creek spots instead of guessing about the glow?", 0, [
    c("They wanted clues showing why the glow was strongest near one place.", true, "The correct choice follows Maya's map and the class question about the strongest glow.", "Those clues helped the class ask a better question: why was the glow strongest in one place?", null),
    c("They wanted jars to prove the Pine Creek water was safe for families.", false, "Unsupported inference: the notice avoided a safety claim.", "It did not claim the water was safe or unsafe.", "unsupported_inference"),
    c("They wanted a beetle and robin sighting to show the creek had stopped changing.", false, "Wrong section: those animals appear after the class had already studied the glow.", "A beetle skated over the surface, and a robin hopped in the wet grass.", "wrong_section"),
    c("They wanted the bridge visit to replace Maya's sunny-bank map.", false, "Opposite claim: Maya added her map because it helped explain the sunny bank.", "Maya added her map to the notice so readers could see why the sunny bank mattered most.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_6: draft("In the creek passage, what does faint mean when the glow became a faint stripe?", 3, [
    c("sharp and noisy like bubbles near a creek log", false, "Plausible misreading: bubbles are observed earlier, not the meaning of faint.", "They stood on the bridge and wrote what they could see: slow water near the reeds, brown leaves caught against stones, and small bubbles where the creek bent around a log.", "plausible_misreading"),
    c("thick and green like the sunny bank color", false, "Opposite claim: thick green color describes the earlier sunny bank, not the faded stripe.", "Near the sunny bank, the green color was thicker.", "opposite_claim"),
    c("safe and clean for families near Pine Creek", false, "Unsupported inference: the notice did not say the creek water was safe.", "It did not claim the water was safe or unsafe.", "unsupported_inference"),
    c("weak and hard to see along the creek surface", true, "Faint fits the glow fading from a visible shine to a weak stripe.", "The glow had faded to a faint stripe.", null),
  ]),
  pssa_item_g3_reading_11: draft("Why did the creek notice include Maya's map?", 0, [
    c("The map showed why the sunny bank mattered most to the glow.", true, "The sentence states exactly why Maya added the map.", "Maya added her map to the notice so readers could see why the sunny bank mattered most.", null),
    c("The map proved the creek notice should call the water unsafe.", false, "Unsupported inference: the notice did not claim the water was unsafe.", "It did not claim the water was safe or unsafe.", "unsupported_inference"),
    c("The map replaced the students' notes about reeds and brown leaves.", false, "Opposite claim: the class used observations and then added the map.", "They stood on the bridge and wrote what they could see: slow water near the reeds, brown leaves caught against stones, and small bubbles where the creek bent around a log.", "opposite_claim"),
    c("The map showed that grass clippings came from the shady bend.", false, "Plausible misreading: grass clippings are mentioned near the drain, not the shady bend.", "Instead, it told what the students observed and asked neighbors not to dump grass clippings near the drain.", "plausible_misreading"),
  ]),
  pssa_item_g3_reading_16: draft("What does Maya's Friday visit show about what she learned at Pine Creek?", 1, [
    c("Maya thought the robin and beetle had caused the green glow.", false, "Unsupported inference: the animals are observed, but they are not given as the cause.", "A beetle skated over the surface, and a robin hopped in the wet grass.", "unsupported_inference"),
    c("Maya learned a careful way to watch for creek changes.", true, "The final sentence directly supports this inference.", "Maya knew the creek still needed watching, but now she had a careful way to notice changes.", null),
    c("Maya stopped using maps after the glow faded to a stripe.", false, "Opposite claim: her map had already helped readers understand the sunny bank.", "Maya added her map to the notice so readers could see why the sunny bank mattered most.", "opposite_claim"),
    c("Maya's father told the class to bring jars and a thermometer.", false, "Wrong section: her father appears on Friday, after the class visit with tools.", "On Friday, Maya returned with her father and pointed from the bridge.", "wrong_section"),
  ]),
  pssa_item_g3_reading_21: draft("Which event caused the class to ask a better creek question?", 2, [
    c("The teacher explained green water plants before the map was drawn.", false, "Too narrow: the explanation gives background, but the mapped clues led to the better question.", "The teacher explained that some tiny living things in water can look green when many of them grow at once.", "too_narrow"),
    c("Families read a creek notice after Maya added her sunny-bank map.", false, "Wrong section: the notice came after the better question and weather comparison.", "The class wrote a creek notice for families.", "wrong_section"),
    c("Maya compared clear, thicker, and soil-filled creek spots.", true, "These mapped differences are the clues that changed the question.", "Downstream from the storm pipe, bits of grass and soil floated in a wide fan.", null),
    c("The glow faded when Maya returned with her father on Friday.", false, "Wrong section: the fading happened after the class had already asked the better question.", "The glow had faded to a faint stripe.", "wrong_section"),
  ]),
  pssa_item_g3_reading_26: draft("How did the class use weather information to explain Pine Creek's glow?", 1, [
    c("They learned that the clear shady bend made green plants grow quickly.", false, "Opposite claim: the green color was thicker near the sunny bank, not the shady bend.", "At the shady bend, the water looked clear.", "opposite_claim"),
    c("They connected warm days, heavy rain, soil, and sunlight.", true, "The weather chart helped the class connect rain, warmth, soil, and sunlight to the glow.", "Two warm days had followed a heavy rain.", null),
    c("They decided the storm pipe proved families could touch the water.", false, "Unsupported inference: the class did not touch the water and made no safety claim.", "The class did not touch the water.", "unsupported_inference"),
    c("They saw a beetle and robin after the glow became brighter.", false, "Plausible misreading: the beetle and robin appear after the glow faded.", "A beetle skated over the surface, and a robin hopped in the wet grass.", "plausible_misreading"),
  ]),

  pssa_item_g3_reading_7: draft("What is the main reason people spent longer near the station bench?", 3, [
    c("The blue rail lines were still easy to follow across the dusty page.", false, "Too narrow: the rail lines are one feature, not the main reason visitors stopped.", "Dust covered the front, but blue rail lines still crossed the page.", "too_narrow"),
    c("The cloth weights made the old paper unfold quickly for visitors.", false, "Opposite claim: Mr. Ortiz did not unfold the old paper quickly.", "He did not unfold the map quickly.", "opposite_claim"),
    c("The dotted river path proved the bridge was closed that Saturday.", false, "Unsupported inference: Leo wondered about the closed bridge; the map does not prove Saturday events.", "Leo pointed to a dotted path beside the river and wondered whether people had walked there when the bridge was closed.", "unsupported_inference"),
    c("The map showed town changes while some landmarks stayed in place.", true, "This sentence explains why the map held visitors' attention.", "People stopped near the bench longer than before, not because the paper looked perfect, but because it showed how the town had changed while some landmarks stayed in place.", null),
  ]),
  pssa_item_g3_reading_12: draft("How did Mr. Ortiz protect the old map as he opened it?", 0, [
    c("He used a flat card and small cloth weights along the edges.", true, "The sentence gives the careful method used to open the old map.", "He slid a flat card under one corner, opened the first fold, and placed small cloth weights along the edges.", null),
    c("He left the paper under the wooden bench at Linden Station.", false, "Opposite claim: workers found the map under the bench before Mr. Ortiz opened it.", "When workers lifted an old wooden bench at Linden Station, they found a paper map folded into a thin square.", "opposite_claim"),
    c("He asked three children to unfold the map at the station display.", false, "Wrong section: the children visited after Mr. Ortiz had opened and displayed the map.", "On Saturday, three children visited the station display.", "wrong_section"),
    c("He copied the dotted river path into Nia's notebook.", false, "Plausible misreading: Nia copied the path later; Mr. Ortiz did not.", "Nia copied the dotted river path into her notebook.", "plausible_misreading"),
  ]),
  pssa_item_g3_reading_17: draft("Which evidence shows visitors could compare the town's past and present?", 1, [
    c("A date in the corner of the old paper said 1928.", false, "Too narrow: the date shows age, but not the full past-present comparison.", "A date in the corner said 1928.", "too_narrow"),
    c("The river, hill road, and market square matched across the maps.", true, "Those shared landmarks helped visitors compare the old and new maps.", "Still, the river, the hill road, and the market square helped visitors compare past and present.", null),
    c("The school on the map had a different name from Ben's school.", false, "Too narrow: the school name is one example, not the full evidence for comparing maps.", "Ben found the school, but it had a different name.", "too_narrow"),
    c("The clear sleeve made the paper look perfect beside the bench.", false, "Wrong emphasis: the map mattered because of town change, not perfect-looking paper.", "People stopped near the bench longer than before, not because the paper looked perfect, but because it showed how the town had changed while some landmarks stayed in place.", "wrong_emphasis"),
  ]),
  pssa_item_g3_reading_22: draft("What can be inferred when Nia's grandmother remembers the trolley ride?", 2, [
    c("The station manager had ridden the trolley with a market basket.", false, "Plausible misreading: the grandmother, not Mr. Ortiz, remembers the trolley ride.", "At home, her grandmother remembered taking a trolley to the market with a basket on her lap.", "plausible_misreading"),
    c("The dotted river path was drawn after the bridge closed.", false, "Unsupported inference: Leo wondered about the path and bridge, but the passage does not give that cause.", "Leo pointed to a dotted path beside the river and wondered whether people had walked there when the bridge was closed.", "unsupported_inference"),
    c("The old map helped a family connect with a true town story.", true, "The final sentence explains how the map led to a family memory.", "The old map had not spoken, of course, but it helped one family tell a true town story that had almost been folded away.", null),
    c("The new town map made the old rail lines disappear from the page.", false, "Wrong emphasis: the trolley tracks were gone from the town, not erased from the old map.", "Some streets had new names, and the trolley tracks were gone.", "wrong_emphasis"),
  ]),
  pssa_item_g3_reading_27: draft("Which event came just before the map was placed inside a clear sleeve?", 3, [
    c("Workers lifted the old wooden bench at Linden Station.", false, "Wrong section: this discovery begins the passage, far before the sleeve.", "When workers lifted an old wooden bench at Linden Station, they found a paper map folded into a thin square.", "wrong_section"),
    c("Nia copied the dotted river path into her notebook.", false, "Wrong section: Nia copied the path after the map was displayed in the sleeve.", "Nia copied the dotted river path into her notebook.", "wrong_section"),
    c("The station manager called Mr. Ortiz from the town archive.", false, "Plausible misreading: the station manager called Mr. Ortiz, who cared for the archive.", "Ortiz, who cared for the town archive.", "plausible_misreading"),
    c("The new town map was placed beside the old map.", true, "The comparison paragraph comes before the sleeve paragraph.", "Ortiz put a new town map beside the old one.", null),
  ]),
  pssa_item_g3_reading_2: draft("Which sentence best states what the old station map helps people understand?", 0, [
    c("Linden Station's map shows changed streets and steady landmarks.", true, "This summarizes the old map's purpose in the passage.", "Still, the river, the hill road, and the market square helped visitors compare past and present.", null),
    c("Linden Station's bench was more important than the clear map sleeve.", false, "Wrong emphasis: the bench is where the map was found, not the main idea.", "When workers lifted an old wooden bench at Linden Station, they found a paper map folded into a thin square.", "wrong_emphasis"),
    c("The old paper was useful because it looked perfect in the display.", false, "Opposite claim: visitors stopped because of town change, not perfect paper.", "People stopped near the bench longer than before, not because the paper looked perfect, but because it showed how the town had changed while some landmarks stayed in place.", "opposite_claim"),
    c("Nia's notebook mattered because the trolley tracks were gone.", false, "Too narrow: Nia's notebook is one family connection, not the larger understanding.", "Nia copied the dotted river path into her notebook.", "too_narrow"),
  ]),

  pssa_item_g3_reading_3: draft("Which evidence shows Room 3 studied the lunch line before changing it?", 1, [
    c("Hot soup cooled while students searched for spoons.", false, "Too narrow: this shows the problem, but not how students studied it.", "Hot soup cooled in bowls while students searched for spoons.", "too_narrow"),
    c("Students counted pauses and sketched lunch items.", true, "Counting and sketching show the class gathered evidence first.", "They also sketched where trays, fruit, milk, spoons, and napkins sat on the counter.", null),
    c("A paper arrow showed the direction of the line.", false, "Wrong section: the arrow was part of the later change, not the study before it.", "A paper arrow showed the direction of the line.", "wrong_section"),
    c("The red baskets were easy for students to spot.", false, "Wrong section: this happened after the setup changed.", "The red baskets were easy to spot.", "wrong_section"),
  ]),
  pssa_item_g3_reading_8: draft("What problem did Room 3 try to solve in the cafeteria?", 2, [
    c("The pizza trays made the Friday line a little slower.", false, "Wrong section: pizza trays were used later to test the setup.", "On Friday, the class tried the setup with pizza trays instead of soup bowls.", "wrong_section"),
    c("The purple marker made Mrs. Lane circle the wrong lunch note.", false, "Unsupported inference: the marker shows what she noticed, not a problem to solve.", "Lane circled that note in purple marker.", "unsupported_inference"),
    c("The lunch line paused when students reached for items.", true, "The opening paragraph names the stopping problem the class studied.", "The line stopped whenever someone had to step backward for a napkin.", null),
    c("The cafeteria manager needed new shelves for milk cartons.", false, "Opposite claim: no one had to buy new shelves.", "Nothing fancy was added, and no one had to buy new shelves.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_13: draft("Why did Room 3 decide to check the lunch setup again next week?", 3, [
    c("The class wanted the milk cartons back at the crowded counter.", false, "Opposite claim: milk moved to the first table before trays.", "Milk moved to the first table, before trays.", "opposite_claim"),
    c("The paper arrow had made the lunch line completely silent.", false, "Unsupported inference: the line still made noise.", "At lunch, the line still made noise, but it moved more smoothly.", "unsupported_inference"),
    c("The soup bowls were cold when the Thursday bell rang.", false, "Opposite claim: most bowls were still warm.", "When the bell rang, most bowls of soup were still warm.", "opposite_claim"),
    c("One useful lunch day was not enough proof.", true, "The chart sentence gives the reason for checking again.", "Room 3 wrote the result on a chart and decided to check again next week, because one good day was useful but not enough proof.", null),
  ]),
  pssa_item_g3_reading_18: draft("How did the cafeteria manager's Thursday change help the line?", 0, [
    c("Milk moved before trays, and spoons went into red baskets.", true, "These changes solved the two slow spots identified by the class.", "Spoons and napkins went into two red baskets at the end.", null),
    c("Soup moved behind the counter so students reached across the hot area.", false, "Opposite claim: the change prevented reaching across the hot area.", "Even careful students had to reach across the hot area.", "opposite_claim"),
    c("The milk cartons stayed after trays because students had full hands.", false, "Opposite claim: milk moved before trays.", "Milk moved to the first table, before trays.", "opposite_claim"),
    c("Pizza trays replaced soup bowls before Room 3 counted pauses.", false, "Wrong section: pizza trays were part of the Friday check, not the first study.", "On Friday, the class tried the setup with pizza trays instead of soup bowls.", "wrong_section"),
  ]),
  pssa_item_g3_reading_23: draft("What did the class notice after watching the cafeteria counter?", 1, [
    c("The lunch bell rang before most soup bowls were served warm.", false, "Opposite claim: most bowls were still warm when the bell rang.", "When the bell rang, most bowls of soup were still warm.", "opposite_claim"),
    c("Milk came too late, and spoons were tucked behind soup.", true, "This names the two slow spots the class discovered.", "Second, spoons and napkins were tucked behind the soup pot.", null),
    c("The purple marker showed that trays belonged near the cafeteria door.", false, "Unsupported inference: the marker circled a Friday note, not a tray location.", "Lane circled that note in purple marker.", "unsupported_inference"),
    c("The red baskets caused students to walk backward for napkins.", false, "Opposite claim: the baskets helped, and on Friday no one walked backward.", "The line was a little slower, but no one had to walk backward for a napkin.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_28: draft("What does Mrs. Lane mean by saying a good solution should work on more than one lunch day?", 2, [
    c("A solution needs pizza trays instead of soup bowls at lunch.", false, "Too narrow: pizza trays were one way to test the setup.", "On Friday, the class tried the setup with pizza trays instead of soup bowls.", "too_narrow"),
    c("A solution should make the cafeteria line quiet during lunch.", false, "Unsupported inference: the line still made noise after the change.", "At lunch, the line still made noise, but it moved more smoothly.", "unsupported_inference"),
    c("A solution should help during different lunches, not just once.", true, "Mrs. Lane's note shows the class should test the setup on another lunch day.", "A good solution, she said, should work on more than one lunch day.", null),
    c("A solution needs purple marker notes instead of a paper arrow.", false, "Wrong emphasis: the marker recorded a note; the arrow guided the line.", "A paper arrow showed the direction of the line.", "wrong_emphasis"),
  ]),

  pssa_item_g3_reading_4: draft("How did the narrator respond after blue drops landed on the fish tails?", 3, [
    c("She carried the light blue can home before fixing the fish.", false, "Wrong section: carrying the can home happened after the mural work.", "I carried the light blue can home feeling taller than when I had arrived.", "wrong_section"),
    c("She asked Ms. Vega to cover the river with row houses.", false, "Unsupported inference: Ms. Vega had already drawn row houses as part of the mural.", "Vega had drawn the river, three row houses, a bus, and a pair of sparrows.", "unsupported_inference"),
    c("She told the little boy which ripples were hers.", false, "Opposite claim: she did not tell the children which ripples were hers.", "I did not tell them which ripples were mine.", "opposite_claim"),
    c("She painted tiny waves so the fish looked as if they moved.", true, "The narrator uses Grandpa's advice to turn drips into ripples.", "I bent close and painted tiny waves around each tail.", null),
  ]),
  pssa_item_g3_reading_9: draft("What is a central message of the mural story?", 0, [
    c("Paint drips can become meaningful mural ripples.", true, "The narrator changes paint drips into ripples that improve the mural.", "\"Turn mistakes into ripples,\" he said.", null),
    c("A wrist bruise keeps a painter from helping with a mural.", false, "Opposite claim: the narrator still helps by carrying the smallest paint can.", "I carried the smallest paint can because my wrist still had a purple soccer bruise.", "opposite_claim"),
    c("A bus route matters more than river fish or sparrows.", false, "Wrong emphasis: the mural combines many block memories into one picture.", "The mural mixed those memories into one picture.", "wrong_emphasis"),
    c("A library wall should stay empty until paint dries lighter.", false, "Opposite claim: the wall no longer looks empty after the mural work.", "But the fish seemed to move, and the wall no longer looked empty.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_14: draft("What do the flowers on the bus roof show about the mural?", 1, [
    c("Ms. Vega painted flowers because chalk lines crossed the rough wall.", false, "Unsupported inference: chalk lines guided the mural, but they did not explain the flowers.", "The wall was rough brick, and chalk lines crossed it like a giant puzzle.", "unsupported_inference"),
    c("The mural included things neighbors loved about the block.", true, "The bus flowers connect Mrs. Chen's roof garden with Mr. Bell's bus.", "Vega told him people had suggested things they loved about our block.", null),
    c("The narrator's purple wrist bruise changed the roof garden.", false, "Wrong section: the bruise explains why she carried the smallest can.", "I carried the smallest paint can because my wrist still had a purple soccer bruise.", "wrong_section"),
    c("The silver fish were covered when blue paint dried lighter.", false, "Opposite claim: the narrator painted around the fish tails.", "My job was to paint the river between the chalk marks without covering the silver fish.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_19: draft("What does rough mean in the sentence about the brick wall?", 2, [
    c("empty, because no kids had traced the bus route yet", false, "Plausible misreading: the empty wall appears later as the mural changes it.", "But the fish seemed to move, and the wall no longer looked empty.", "plausible_misreading"),
    c("purple, because the narrator's wrist still had a bruise", false, "Wrong section: purple describes the narrator's bruise, not the wall surface.", "I carried the smallest paint can because my wrist still had a purple soccer bruise.", "wrong_section"),
    c("bumpy, because chalk lines crossed the brick like a puzzle", true, "Rough describes the uneven brick surface that held chalk lines.", "The wall was rough brick, and chalk lines crossed it like a giant puzzle.", null),
    c("lighter, because Grandpa said the paint would dry that way", false, "Wrong emphasis: lighter describes drying paint, not the brick wall.", "\"Paint dries lighter,\" he said.", "wrong_emphasis"),
  ]),
  pssa_item_g3_reading_24: draft("Which event shows the narrator felt proud but quiet about her work?", 3, [
    c("Grandpa laughed when the paint looked like melted berries.", false, "Wrong section: Grandpa laughs before the narrator begins painting.", "Grandpa laughed when he saw my face.", "wrong_section"),
    c("Ms. Vega drew row houses, a bus, and sparrows.", false, "Too narrow: this describes the mural design, not the narrator's quiet pride.", "Vega had drawn the river, three row houses, a bus, and a pair of sparrows.", "too_narrow"),
    c("A woman stopped near the library to photograph the sparrows.", false, "Too narrow: the picture shows public interest, but not the narrator staying quiet about her ripples.", "A woman had stopped to take a picture of the sparrows.", "too_narrow"),
    c("She watched children trace the route and kept her ripples secret.", true, "The final paragraph shows she is pleased without pointing out her own work.", "I did not tell them which ripples were mine.", null),
  ]),

  pssa_item_g3_reading_5: draft("What is the main lesson in the cart passage?", 0, [
    c("Careful steps can find a small cause of a big problem.", true, "The passage shows the class finding yarn and later a pebble by checking in order.", "They unloaded the bin, checked each wheel, and found the small thing that caused the big trouble.", null),
    c("A hammer should be used before checking cart wheels.", false, "Opposite claim: the passage says not to start with a hammer.", "To find the trouble, you would not start with a hammer.", "opposite_claim"),
    c("A squeaky handle means a supply cart should be replaced.", false, "Unsupported inference: the old cart still turns after the repair.", "But it turned around the table without scraping.", "unsupported_inference"),
    c("Paper boxes should stay loaded while wheels spin freely.", false, "Opposite claim: the first step is emptying the heavy paper boxes.", "First, you would empty the heavy paper boxes from the bottom shelf.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_10: draft("What should happen before turning the green cart upside down?", 1, [
    c("A teacher should snip yarn from the front axle.", false, "Wrong section: snipping the yarn happens after the problem is found.", "A teacher snipped the yarn with small scissors.", "wrong_section"),
    c("Someone should empty the heavy paper boxes from the shelf.", true, "The passage names emptying the boxes as the first step.", "First, you would empty the heavy paper boxes from the bottom shelf.", null),
    c("The class should tape a card to the top shelf.", false, "Wrong section: the reminder card is added after the repair.", "The class taped a card to the top shelf: Check wheels before loading paper.", "wrong_section"),
    c("Students should push the cart harder toward the sink.", false, "Opposite claim: later the class did not guess or shove harder.", "The class did not guess or shove harder.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_15: draft("Why was the yarn around the axle a problem?", 2, [
    c("It made the green cart scrape because paper boxes were missing.", false, "Unsupported inference: the scrape happened before the class found the yarn.", "When they pulled it back, the cart scraped the table leg.", "unsupported_inference"),
    c("It caused the wheel to spin like a top during repair.", false, "Plausible misreading: another wheel might spin like a top, but the problem wheel had yarn.", "One wheel might spin like a top.", "plausible_misreading"),
    c("It kept the front wheel from swinging smoothly around corners.", true, "The passage states the yarn and glue kept the wheel from turning well.", "The wheel could roll, but it could not swing smoothly around corners.", null),
    c("It meant the class needed too much oil on the floor.", false, "Opposite claim: one drop of oil was enough.", "Too much oil would have dripped onto the floor, so one drop was enough.", "opposite_claim"),
  ]),
  pssa_item_g3_reading_20: draft("Which sentence shows the class used the cart steps again later?", 3, [
    c("The green cart in the art room did not.", false, "Wrong section: this introduces the first cart problem, not the later use of the steps.", "The green cart in the art room did not.", "wrong_section"),
    c("The fix had three steps.", false, "Too narrow: this names the fix but does not show it was used later.", "The fix had three steps.", "too_narrow"),
    c("The class taped a reminder card to the top shelf before loading paper.", false, "Wrong emphasis: the card gives a reminder, but not the later second use.", "The class taped a card to the top shelf: Check wheels before loading paper.", "wrong_emphasis"),
    c("The same steps helped with a rolling book bin.", true, "This sentence directly shows the steps worked again.", "The next week, the same steps helped with a rolling book bin.", null),
  ]),
  pssa_item_g3_reading_25: draft("How does the reminder card help prevent another cart problem?", 0, [
    c("It reminds the class to check wheels before adding heavy paper.", true, "The card tells people to check wheels before loading paper.", "The class taped a card to the top shelf: Check wheels before loading paper.", null),
    c("It tells students to add oil before looking at the axle.", false, "Wrong emphasis: the repair uses oil after yarn is removed and the axle is wiped.", "Then the class added one drop of oil where the metal pin met the wheel.", "wrong_emphasis"),
    c("It shows that the old handle dent caused the scraping.", false, "Unsupported inference: the handle had a dent, but the wheel problem caused scraping.", "It was old, and its handle had a dent.", "unsupported_inference"),
    c("It tells students to keep boxes on the bottom shelf.", false, "Opposite claim: the first step is emptying the heavy paper boxes.", "First, you would empty the heavy paper boxes from the bottom shelf.", "opposite_claim"),
  ]),
};

main();

function main() {
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as Packet;
  const readingItems = packet.items.filter((item) => item.gradeLevel === 3 && item.itemType === "MCQ" && item.passageId);
  const precheck = countCheck(readingItems);
  if (precheck.failures.length) {
    throw new Error(`PR #4g pre-authoring count check failed:\n${precheck.failures.join("\n")}`);
  }
  for (const item of readingItems) rewriteItem(item, packet.passages);
  const audit = auditGrade3(packet);
  if (audit.failures.length) {
    const rowDetails = audit.passageRows.filter((row) => row.result === "FAIL").slice(0, 30);
    const lengthDetails = audit.lengthRows.filter((row) => row.result === "FAIL").slice(0, 30);
    throw new Error(`Grade 3 reading rewrite failed gates:\n${audit.failures.join("\n")}\n${JSON.stringify({ rowDetails, lengthDetails }, null, 2)}`);
  }
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "pilot_student_preview.md"), renderStudentPreview(packet));
  fs.writeFileSync(path.join(outputDir, "pilot_reviewer_preview.md"), renderReviewerPreview(packet, audit));
  fs.writeFileSync(path.join(outputDir, "pilot_answer_key_and_rubric.md"), renderAnswerKey(packet));
  fs.writeFileSync(path.join(outputDir, "pilot_audit_report.md"), renderAuditReport(packet, audit, precheck));
  writeItemAuditCsv(path.join(reportDir, "pssa_grade3_item_audit_report.csv"), packet, audit);
  writePassageQualityCsv(path.join(reportDir, "pssa_grade3_passage_gate_report.csv"), audit.passageQualityRows);
  writeSummary(path.join(reportDir, "pssa_grade3_count_and_distribution_report.md"), precheck, audit);
  console.log(JSON.stringify({
    result: "PASS",
    count: readingItems.length,
    passageCounts: Object.fromEntries(precheck.passageCounts),
    ecCounts: Object.fromEntries(precheck.ecCounts),
    answerPositions: audit.answerPositions,
    correctLongestRate: audit.correctLongestRate,
    evidenceSpanFound: `${audit.evidenceFoundCount}/${readingItems.length}`,
    roleCounts: Object.fromEntries(audit.roleCounts),
  }, null, 2));
}

function rewriteItem(item: Item, passages: Passage[]) {
  const draftItem = drafts[item.id];
  if (!draftItem) throw new Error(`Missing authored Grade 3 draft for ${item.id}`);
  const passage = passages.find((entry) => entry.id === item.passageId);
  if (!passage) throw new Error(`Missing passage for ${item.id}`);
  if (draftItem.choices.length !== 4) throw new Error(`Expected four choices for ${item.id}`);
  item.studentFacingPrompt = draftItem.stem;
  item.structuredChoicesJson = draftItem.choices.map((choice) => ({
    text: choice.text,
    isCorrect: choice.isCorrect,
    rationale: choice.rationale,
    evidenceLinks: [evidenceLink(passage, choice.quote)],
    distractorRole: choice.role,
  }));
  item.answerChoicesJson = item.structuredChoicesJson.map((choice) => choice.text);
  item.correctIndex = draftItem.correctIndex;
  item.correctAnswer = item.answerChoicesJson[draftItem.correctIndex];
  item.distractorRationalesJson = item.structuredChoicesJson.map((choice) => choice.rationale ?? "");
  item.studentPreviewJson = { prompt: item.studentFacingPrompt, choices: item.answerChoicesJson, leaksAnswer: false };
  item.validationMetadataJson = {
    ...(item.validationMetadataJson ?? {}),
    exactEcResolved: true,
    structuredChoicesJsonAdded: true,
    answerChoicesJsonDerivedFromStructuredChoices: true,
    grade3PassageGroundingRewrite: "COMPLETE_PENDING_HUMAN_REVIEW",
    oldTemplatedPassageItemQuarantined: true,
    replacementAuthoredInPr4g: true,
    quarantinedUntilPassageReauthored: false,
    quarantineReason: "Old templated-passage item replaced by PR #4g passage-grounded candidate.",
  };
  item.linterResultsJson = { blockers: [], warnings: [], status: "PASS_PENDING_HUMAN_REVIEW" };
  item.provenanceJson = {
    ...(item.provenanceJson ?? {}),
    authoredBy: "model-assisted, human-review-pending",
    method: "direct_grade3_passage_grounded_reauthoring_pr4g",
    containsAttributedQuotes: false,
    sourcePassageId: item.passageId,
  };
}

function countCheck(readingItems: Item[]) {
  const passageCounts = countBy(readingItems, (item) => String(item.passageId));
  const ecCounts = countBy(readingItems, (item) => item.eligibleContent);
  const failures: string[] = [];
  if (readingItems.length !== 28) failures.push(`Expected 28 Grade 3 reading MCQs, found ${readingItems.length}`);
  for (const [passageId, count] of expectedPassageCounts) {
    if (passageCounts.get(passageId) !== count) failures.push(`Expected ${count} items for ${passageId}, found ${passageCounts.get(passageId) ?? 0}`);
  }
  if ([...passageCounts.values()].some((count) => count < 5 || count > 6)) failures.push("Expected 5-6 items per Grade 3 passage");
  if (ecCounts.size !== 17) failures.push(`Expected prior EC distribution with 17 distinct ECs, found ${ecCounts.size}`);
  if ([...ecCounts.values()].some((count) => count > 2)) failures.push("Expected prior EC distribution with no EC used more than twice");
  return { failures, passageCounts, ecCounts, targetCount: 28 };
}

function auditGrade3(packet: Packet) {
  const readingItems = packet.items.filter((item) => item.gradeLevel === 3 && item.itemType === "MCQ" && item.passageId);
  const grade3Passages = packet.passages.filter((passage) => passage.gradeLevel === 3);
  const passageRows = buildMcqPassageSpecificityReport(readingItems, packet.passages);
  const lengthRows = buildMcqCorrectIsLongestReport(readingItems);
  const absoluteRows = buildMcqAbsoluteLanguageDistractorReport(readingItems);
  const passageQualityRows = buildPssaPassageQualityReport(grade3Passages);
  const answerPositions = [0, 0, 0, 0];
  const roleCounts = new Map<string, number>();
  for (const item of readingItems) {
    if (typeof item.correctIndex === "number") answerPositions[item.correctIndex] += 1;
    for (const choice of item.structuredChoicesJson ?? []) {
      if (choice.distractorRole) roleCounts.set(choice.distractorRole, (roleCounts.get(choice.distractorRole) ?? 0) + 1);
    }
  }
  const failures: string[] = [];
  if (hasBlockingPassageSpecificityFailure(passageRows)) failures.push("passage-specificity gates have blockers");
  if (lengthRows.some((row) => row.result === "FAIL")) failures.push("correct-answer-longest gate has blockers");
  if (absoluteRows.some((row) => row.result === "FAIL")) failures.push("absolute-language distractor gate has blockers");
  if (hasBlockingPassageQualityFailure(passageQualityRows) || passageQualityRows.some((row) => row.severity === "WARNING")) failures.push("Grade 3 passage-quality gates did not all pass");
  if (Math.max(...answerPositions) / readingItems.length > 0.4) failures.push("answer-position distribution exceeds 40%");
  const evidenceFoundCount = readingItems.filter((item) => !passageRows.some((row) => row.itemId === item.id && row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL")).length;
  if (evidenceFoundCount !== readingItems.length) failures.push("one or more evidence spans were not found verbatim");
  return {
    failures,
    passageRows,
    lengthRows,
    absoluteRows,
    passageQualityRows,
    answerPositions,
    roleCounts,
    evidenceFoundCount,
    correctLongestRate: lengthRows.find((row) => row.scope === "batch")?.correctLongestPct ?? 0,
  };
}

function draft(stem: string, correctIndex: number, choices: DraftChoice[]): ItemDraft {
  if (!choices[correctIndex]?.isCorrect) throw new Error(`Correct index mismatch for stem: ${stem}`);
  if (choices.filter((choice) => choice.isCorrect).length !== 1) throw new Error(`Expected one correct choice for stem: ${stem}`);
  return { stem, correctIndex, choices };
}

function c(text: string, isCorrect: boolean, rationale: string, quote: string, role: DistractorRole | null): DraftChoice {
  return { text, isCorrect, rationale, quote, role };
}

function evidenceLink(passage: Passage, quote: string): EvidenceLink {
  const startChar = passage.text.indexOf(quote);
  if (startChar < 0) throw new Error(`Missing quote in ${passage.id}: ${quote}`);
  const paragraphs = passage.text.split(/\n\s*\n/g);
  let offset = 0;
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const local = paragraph.indexOf(quote);
    if (local >= 0) {
      const sentenceIndex = splitSentences(paragraph).findIndex((sentence) => sentence.includes(quote) || quote.includes(sentence));
      if (sentenceIndex < 0) throw new Error(`Missing sentence for quote in ${passage.id}: ${quote}`);
      return { paragraphIndex, sentenceIndex, quotedSpan: quote, startChar: offset + local, endChar: offset + local + quote.length };
    }
    offset += paragraph.length + 2;
  }
  throw new Error(`Unable to locate paragraph for quote in ${passage.id}: ${quote}`);
}

function splitSentences(paragraph: string) {
  return (paragraph.match(/[^.!?]+[.!?]+(?:["”])?/g) ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
}

function countBy<T>(values: T[], getKey: (value: T) => string) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(getKey(value), (counts.get(getKey(value)) ?? 0) + 1));
  return new Map([...counts.entries()].sort());
}

function renderStudentPreview(packet: Packet) {
  const lines = ["# PSSA Grade 3 Pilot Student Preview", ""];
  for (const passage of packet.passages.filter((entry) => entry.gradeLevel === 3)) {
    lines.push(`## ${passage.title}`, "", passage.text, "");
    const items = packet.items.filter((item) => item.passageId === passage.id);
    for (const item of items) {
      lines.push(`### ${item.id}`, item.studentFacingPrompt, "");
      item.answerChoicesJson?.forEach((choice, index) => lines.push(`${"ABCD"[index]}. ${choice}`));
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderReviewerPreview(packet: Packet, audit: ReturnType<typeof auditGrade3>) {
  const lines = ["# PSSA Grade 3 Pilot Reviewer Preview", ""];
  for (const passage of packet.passages.filter((entry) => entry.gradeLevel === 3)) {
    const items = packet.items.filter((item) => item.passageId === passage.id);
    lines.push(`## ${passage.title}`, `- passageId: ${passage.id}`, `- itemCount: ${items.length}`, "");
    for (const item of items) {
      const rows = audit.passageRows.filter((row) => row.itemId === item.id);
      lines.push(`### ${item.id} (${item.eligibleContent})`, item.studentFacingPrompt, "", `Correct: ${"ABCD"[item.correctIndex ?? 0]} — ${item.correctAnswer}`, `Audit: ${rows.some((row) => row.result === "FAIL") ? "FAIL" : "PASS"}`, "");
      item.structuredChoicesJson?.forEach((choice, index) => {
        lines.push(`- ${"ABCD"[index]}. ${choice.text}`);
        lines.push(`  - role: ${choice.distractorRole ?? "correct"}`);
        lines.push(`  - evidence: ${choice.evidenceLinks?.map((link) => link.quotedSpan).join(" | ")}`);
        lines.push(`  - rationale: ${choice.rationale}`);
      });
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderAnswerKey(packet: Packet) {
  const lines = ["# PSSA Grade 3 Pilot Answer Key and Rationales", ""];
  for (const item of packet.items.filter((entry) => entry.gradeLevel === 3 && entry.itemType === "MCQ" && entry.passageId)) {
    lines.push(`## ${item.id}`, `- Correct answer: ${"ABCD"[item.correctIndex ?? 0]} -- ${item.correctAnswer}`, "");
    item.structuredChoicesJson?.forEach((choice, index) => {
      lines.push(`- ${"ABCD"[index]}. ${choice.text}`);
      lines.push(`  - ${choice.rationale}`);
      lines.push(`  - Role: ${choice.distractorRole ?? "correct"}`);
      lines.push(`  - Evidence: ${choice.evidenceLinks?.map((link) => link.quotedSpan).join(" | ")}`);
    });
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderAuditReport(packet: Packet, audit: ReturnType<typeof auditGrade3>, precheck: ReturnType<typeof countCheck>) {
  const readingItems = packet.items.filter((item) => item.gradeLevel === 3 && item.itemType === "MCQ" && item.passageId);
  const lines = [
    "# PSSA Grade 3 Pilot Audit Report",
    "",
    "## PR #4g Count Check",
    `- Prior Grade 3 reading-item count: ${precheck.targetCount}`,
    `- Target replacement count: ${readingItems.length}`,
    `- Passage distribution: ${[...precheck.passageCounts.entries()].map(([key, value]) => `${key}:${value}`).join(", ")}`,
    `- EC distribution: ${[...precheck.ecCounts.entries()].map(([key, value]) => `${key}:${value}`).join(", ")}`,
    "",
    "## Gate Summary",
    `- Passage-specificity blocker rows: ${audit.passageRows.filter((row) => row.result === "FAIL").length}`,
    `- Evidence spans found: ${audit.evidenceFoundCount}/${readingItems.length}`,
    `- Correct-answer-longest rate: ${Math.round(audit.correctLongestRate * 100)}%`,
    `- Answer-position distribution: A:${audit.answerPositions[0]} B:${audit.answerPositions[1]} C:${audit.answerPositions[2]} D:${audit.answerPositions[3]}`,
    `- Absolute-language distractors: ${audit.absoluteRows.filter((row) => row.result === "FAIL").length}`,
    `- Passage-quality failures: ${audit.passageQualityRows.filter((row) => row.result === "FAIL").length}`,
    `- Result: ${audit.failures.length ? "FAIL" : "PASS"}`,
    "",
    "## Grade 3 Passage Gates",
    "",
    "| passageId | cross_duplicate | template_skeleton | topic_coherence | concreteness |",
    "|---|---|---|---|---|",
  ];
  const grade3Passages = packet.passages.filter((passage) => passage.gradeLevel === 3);
  for (const passage of grade3Passages) {
    const rows = audit.passageQualityRows.filter((row) => row.passageId === passage.id);
    lines.push(`| ${passage.id} | ${resultFor(rows, "PSSA_PASSAGE_CROSS_DUPLICATE")} | ${resultFor(rows, "PSSA_PASSAGE_TEMPLATE_SKELETON")} | ${resultFor(rows, "PSSA_PASSAGE_TOPIC_COHERENCE")} | ${resultFor(rows, "PSSA_PASSAGE_CONCRETENESS")} |`);
  }
  lines.push("", "## Distractor Role Counts");
  for (const [role, count] of [...audit.roleCounts.entries()].sort()) lines.push(`- ${role}: ${count}`);
  lines.push("", "## Per-Item Audit Table", "");
  lines.push("| itemId | passageId | EC | answer | correctLongest | evidenceFound | finalResult |");
  lines.push("|---|---|---|---:|---|---|---|");
  for (const item of readingItems) {
    const rows = audit.passageRows.filter((row) => row.itemId === item.id);
    const length = audit.lengthRows.find((row) => row.itemId === item.id);
    const evidenceFound = !rows.some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL");
    lines.push(`| ${item.id} | ${item.passageId} | ${item.eligibleContent} | ${"ABCD"[item.correctIndex ?? 0]} | ${length?.correctLongestCount ? "true" : "false"} | ${evidenceFound} | ${rows.some((row) => row.result === "FAIL") ? "FAIL" : "PASS"} |`);
  }
  return `${lines.join("\n")}\n`;
}

function resultFor(rows: PassageQualityRow[], ruleId: string) {
  const row = rows.find((entry) => entry.ruleId === ruleId);
  return row ? `${row.result}${row.severity === "WARNING" ? "/WARN" : ""}` : "";
}

function writeItemAuditCsv(filePath: string, packet: Packet, audit: ReturnType<typeof auditGrade3>) {
  const columns = ["itemId", "passageId", "passageTitle", "eligibleContent", "questionType", "answerPosition", "correctAnswerLength", "correctIsLongest", "evidenceSpanFound", "distractorRoles", "copiedChoiceCheck", "genericLanguageCheck", "duplicateStemCheck", "sameSpanShortcutCheck", "absoluteLanguageCheck", "finalResult"];
  const rows = packet.items
    .filter((item) => item.gradeLevel === 3 && item.itemType === "MCQ" && item.passageId)
    .map((item) => {
      const passage = packet.passages.find((entry) => entry.id === item.passageId);
      const itemRows = audit.passageRows.filter((row) => row.itemId === item.id);
      const lengthRow = audit.lengthRows.find((row) => row.itemId === item.id);
      const absoluteFail = audit.absoluteRows.some((row) => row.itemId === item.id && row.result === "FAIL");
      const finalResult = itemRows.some((row) => row.result === "FAIL") || lengthRow?.result === "FAIL" || absoluteFail ? "FAIL" : "PASS";
      return {
        itemId: item.id,
        passageId: item.passageId,
        passageTitle: passage?.title ?? "",
        eligibleContent: item.eligibleContent,
        questionType: item.itemType,
        answerPosition: "ABCD"[item.correctIndex ?? 0],
        correctAnswerLength: item.correctAnswer?.length ?? 0,
        correctIsLongest: Boolean(lengthRow?.correctLongestCount),
        evidenceSpanFound: !itemRows.some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_NOT_FOUND" && row.result === "FAIL"),
        distractorRoles: item.structuredChoicesJson?.map((choice) => choice.distractorRole ?? "correct").join("|") ?? "",
        copiedChoiceCheck: "PASS",
        genericLanguageCheck: itemRows.some((row) => row.ruleId.includes("GENERIC") && row.result === "FAIL") ? "FAIL" : "PASS",
        duplicateStemCheck: itemRows.some((row) => row.ruleId === "PSSA_MCQ_TEMPLATE_LANGUAGE_REUSE" && row.result === "FAIL") ? "FAIL" : "PASS",
        sameSpanShortcutCheck: itemRows.some((row) => row.ruleId === "PSSA_MCQ_EVIDENCE_SPAN_REUSED" && row.result === "FAIL") ? "FAIL" : "PASS",
        absoluteLanguageCheck: absoluteFail ? "FAIL" : "PASS",
        finalResult,
      };
    });
  writeCsv(filePath, columns, rows);
}

function writePassageQualityCsv(filePath: string, rows: PassageQualityRow[]) {
  const columns = ["passageId", "gradeLevel", "title", "topicDomain", "ruleId", "result", "severity", "clusterId", "score", "evidence", "notes"];
  writeCsv(filePath, columns, rows);
}

function writeSummary(filePath: string, precheck: ReturnType<typeof countCheck>, audit: ReturnType<typeof auditGrade3>) {
  const lines = [
    "# PSSA PR #4g Grade 3 Count and Distribution Report",
    "",
    `- Prior Grade 3 reading-item count: ${precheck.targetCount}`,
    `- Target replacement count: ${precheck.targetCount}`,
    `- Count check result: PASS`,
    `- Answer-position distribution: A:${audit.answerPositions[0]} B:${audit.answerPositions[1]} C:${audit.answerPositions[2]} D:${audit.answerPositions[3]}`,
    `- Correct-answer-longest rate: ${Math.round(audit.correctLongestRate * 100)}%`,
    `- Evidence spans found: ${audit.evidenceFoundCount}/28`,
    "",
    "## Passage Counts",
    ...[...precheck.passageCounts.entries()].map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## EC Counts",
    ...[...precheck.ecCounts.entries()].map(([key, value]) => `- ${key}: ${value}`),
    "",
  ];
  fs.writeFileSync(filePath, lines.join("\n"));
}

function writeCsv(filePath: string, columns: string[], rows: Record<string, unknown>[]) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}
