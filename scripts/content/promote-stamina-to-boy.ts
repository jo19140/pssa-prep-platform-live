import fs from "node:fs";
import path from "node:path";

import { buildPssaResponseSpec } from "../../lib/content/pssaResponseSpec";

type JsonObject = Record<string, any>;

const FILES = [
  "exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/boat_literary_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/owls_paired_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/rabbit_drama_released_length.json",
  "exemplars/pssa_grade3_stamina_pilot/conventions_mc_block.json",
] as const;

const OWLS_06_EXPECTED_ANSWER_CORE = "Owls are helpful hunters because their bodies are built to catch prey and because what they catch helps people. The first passage explains that an owl's forward-facing eyes help it judge distance when it dives, and its offset ears help it locate prey, so it hunts well in the dark. The second passage explains that barn owls catch rodents such as mice and rats that would damage a farmer's grain and crops, so the owls help farmers lose less food.";

const OWLS_06_SUPPORT = [
  {
    supportId: "owls_06_s1",
    supportType: "direct_quote",
    passageSlot: "passage_1",
    quotedSpan: "An owl's eyes are large and face forward, so the bird can judge distance when it dives toward prey.",
    detail: "forward-facing eyes help the owl catch prey",
    connectsToExpectedAnswer: "owls are built to hunt well",
    independentKey: "hunting_ability",
  },
  {
    supportId: "owls_06_s2",
    supportType: "direct_quote",
    passageSlot: "passage_2",
    quotedSpan: "Barn owls hunt mostly small mammals such as mice, voles, and rats.",
    detail: "owls catch rodents that damage crops and grain",
    connectsToExpectedAnswer: "owls help farmers",
    independentKey: "helps_farmers",
  },
];

function readJson(file: string): JsonObject {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function writeJson(file: string, value: JsonObject) {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`);
}

function itemId(item: JsonObject) {
  return String(item.id ?? item.itemId ?? "");
}

function interactionType(item: JsonObject) {
  if (item.interactionType) return String(item.interactionType);
  if (item.itemType === "CONVENTIONS") return "MCQ";
  return String(item.itemType ?? "MCQ");
}

function linkedPassageId(item: JsonObject, data: JsonObject): string | null {
  if (item.sourcePassageId) return String(item.sourcePassageId);
  if (item.passageId) return String(item.passageId);
  if (Array.isArray(item.passageIds) && item.passageIds[0]) return String(item.passageIds[0]);
  if (Array.isArray(item.passageLinks) && item.passageLinks[0]?.passageId) return String(item.passageLinks[0].passageId);
  if (item.passageGroupId) {
    const group = (data.passageGroups ?? []).find((row: JsonObject) => row.id === item.passageGroupId);
    const member = group?.members?.[0];
    if (member?.passageId) return String(member.passageId);
    if (member?.passage?.id) return String(member.passage.id);
  }
  return null;
}

function totalPointsFor(item: JsonObject): number {
  const raw = item.pointValue
    ?? item.scoringJson?.totalPoints
    ?? item.scoring?.totalPoints
    ?? item.scoring?.points
    ?? item.scoringRubricJson?.totalPoints
    ?? item.rubric?.totalPoints;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (interactionType(item) === "MCQ" || interactionType(item) === "INLINE_DROPDOWN") return 1;
  throw new Error(`STOP: ${itemId(item)} lacks an authored point value/totalPoints.`);
}

function ensureScoringJson(item: JsonObject, points: number) {
  const existing = item.scoringJson && typeof item.scoringJson === "object" && !Array.isArray(item.scoringJson)
    ? item.scoringJson
    : {};
  item.scoringJson = { ...existing, totalPoints: points };
}

function ensureResponseSpecJson(item: JsonObject) {
  if (item.responseSpecJson !== undefined) return;
  const responseSpec = buildPssaResponseSpec(item);
  if (!responseSpec || typeof responseSpec !== "object") {
    throw new Error(`STOP: ${itemId(item)} could not derive responseSpecJson from authored content.`);
  }
  item.responseSpecJson = responseSpec;
}

function promoteItem(item: JsonObject, data: JsonObject) {
  item.sourceType = "internal_original";
  item.licenseStatus = "cleared_internal_original";
  item.commercialUseAllowed = true;
  item.needsLegalReview = false;
  item.reviewStatus ??= "PENDING";
  item.itemStatus ??= "candidate";

  item.provenanceJson = item.provenanceJson && typeof item.provenanceJson === "object" && !Array.isArray(item.provenanceJson)
    ? item.provenanceJson
    : {};
  item.provenanceJson.benchmarkSeason = "BOY";
  delete item.provenanceJson.fixtureOnly;
  delete item.fixtureOnly;
  delete item.noDbWrite;
  if (item.auditMetadata && typeof item.auditMetadata === "object" && !Array.isArray(item.auditMetadata)) {
    delete item.auditMetadata.noDbWrite;
  }

  const sourcePassageId = linkedPassageId(item, data);
  if (!item.sourcePassageId && sourcePassageId) item.sourcePassageId = sourcePassageId;

  const points = totalPointsFor(item);
  item.pointValue = points;
  ensureScoringJson(item, points);
  ensureResponseSpecJson(item);
}

function verifyOwlsSupport(data: JsonObject) {
  const group = (data.passageGroups ?? []).find((row: JsonObject) => row.id === "pssa_pg_g3_owls_paired_01");
  const bySlot = new Map<string, string>();
  for (const member of group?.members ?? []) {
    if (member.slot && member.passage?.text) bySlot.set(String(member.slot), String(member.passage.text));
  }
  for (const support of OWLS_06_SUPPORT) {
    const text = bySlot.get(support.passageSlot);
    if (!text?.includes(support.quotedSpan)) {
      throw new Error(`STOP: owls_06 quotedSpan is not verbatim in ${support.passageSlot}: ${support.quotedSpan}`);
    }
  }
}

function applyAuthoredFixes(data: JsonObject) {
  const owls06 = (data.items ?? []).find((item: JsonObject) => itemId(item) === "pssa_stamina_item_g3_owls_06");
  if (owls06) {
    verifyOwlsSupport(data);
    owls06.correctResponseJson = {
      expectedAnswerCore: OWLS_06_EXPECTED_ANSWER_CORE,
      acceptableTextSupport: OWLS_06_SUPPORT,
    };
  }

  const rabbit06 = (data.items ?? []).find((item: JsonObject) => itemId(item) === "pssa_stamina_item_g3_rabbit_06");
  if (rabbit06) {
    rabbit06.skill = "theme_central_message";
    rabbit06.comprehensionKind = "synthesis";
    rabbit06.comprehensionKindRationale = "The item asks students to identify the central lesson shown by the turning point in Scene 3.";
    rabbit06.eligibleContent = "E03.A-K.1.1.2";
    rabbit06.assessmentAnchor = "E03.A-K.1";
    rabbit06.reportingCategory = "A";
    rabbit06.studentFacingPrompt = "What lesson is best shown by what happens in Scene 3?";
    rabbit06.answerChoicesJson = [
      "A strong storm can ruin the homes that small animals build.",
      "Sharing what you have can make things better for everyone.",
      "It is best to keep your home to yourself so it stays just right.",
      "An animal with prickles should face toward the wall.",
    ];
    rabbit06.correctIndex = 1;
    rabbit06.structuredChoicesJson = [
      {
        text: "A strong storm can ruin the homes that small animals build.",
        isCorrect: false,
        rationale: "This focuses on the storm, but Scene 3 mainly shows the lesson Rabbit learns about sharing.",
        evidenceLinks: [
          {
            evidenceKind: "stage_direction",
            sceneId: "scene_03",
            lineIndex: 1,
            quotedSpan: "[A loud CRACK of thunder splits the air. The wind screams, and rain pours down in heavy sheets. All four animals go still, listening to the storm. MOUSE freezes in the doorway, too frightened to step outside.]",
          },
        ],
        distractorRole: "wrong_emphasis",
      },
      {
        text: "Sharing what you have can make things better for everyone.",
        isCorrect: true,
        rationale: "Correct: in Scene 3, Rabbit learns that sharing the log helps everyone stay safe and warm.",
        evidenceLinks: [
          {
            evidenceKind: "spoken_line",
            sceneId: "scene_03",
            lineIndex: 4,
            speaker: "RABBIT",
            quotedSpan: "Come here, little one. Do not go out in that. Get into the middle, where it is warmest.",
          },
          {
            evidenceKind: "spoken_line",
            sceneId: "scene_03",
            lineIndex: 11,
            speaker: "RABBIT",
            quotedSpan: "I was so sure that sharing my log would leave me with less. Instead I have a warm tail wrapped around me, a wall of prickles to block the wind, and three good friends I did not have this morning.",
          },
        ],
        distractorRole: null,
      },
      {
        text: "It is best to keep your home to yourself so it stays just right.",
        isCorrect: false,
        rationale: "This is the opposite of the lesson Rabbit learns by the end of Scene 3.",
        evidenceLinks: [
          {
            evidenceKind: "spoken_line",
            sceneId: "scene_01",
            lineIndex: 4,
            speaker: "RABBIT",
            quotedSpan: "My log? Squirrel, this log is exactly the right size for one rabbit.",
          },
        ],
        distractorRole: "opposite_claim",
      },
      {
        text: "An animal with prickles should face toward the wall.",
        isCorrect: false,
        rationale: "This is one helpful action in Scene 3, but it is too narrow to state the lesson of the play.",
        evidenceLinks: [
          {
            evidenceKind: "spoken_line",
            sceneId: "scene_03",
            lineIndex: 7,
            speaker: "HEDGEHOG",
            quotedSpan: "And my back can face the door and block the cold wind from coming in.",
          },
        ],
        distractorRole: "too_narrow",
      },
    ];
    delete rabbit06.responseSpecJson;
  }
}

for (const file of FILES) {
  const data = readJson(file);
  applyAuthoredFixes(data);
  data.productionImportReady = true;
  delete data.fixtureOnly;
  if (Object.prototype.hasOwnProperty.call(data, "noDbWrite")) delete data.noDbWrite;
  for (const item of data.items ?? []) promoteItem(item, data);
  writeJson(file, data);
  console.log(`promoted ${file}: ${(data.items ?? []).length} items`);
}

console.log("Stamina BOY promotion complete.");
