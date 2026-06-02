import assert from "assert/strict";
import {
  createDailyTargetLabelResolver,
  deriveMTSSTier,
  deriveMTSSTierDisplay,
  deriveReadingProfileSummary,
  summarizeCaseloadTierMix,
} from "../lib/literacy/teacherDashboardData";
import type { DiagnosticResultsTutorPayload } from "../lib/literacy/diagnosticResultsPayload";

const FORBIDDEN_TOKENS = [
  "grade level",
  "grade-level",
  "at grade",
  "above grade",
  "below grade",
  "percentile",
  "%",
];

async function main() {
  const highCore = result({ confidenceLevel: "high", priority1: [], interpretation: "Stable diagnostic pattern." });
  assert.equal(deriveMTSSTier(highCore), "1");
  assert.equal(deriveMTSSTierDisplay(highCore)?.variant, "CORE");
  assert.equal(deriveReadingProfileSummary(highCore), "Ready for assigned text with continued small-group support.");

  const decodingGap = result({
    confidenceLevel: "medium",
    listeningScore: 7,
    readingScore: 4,
    priority1: ["DECODING"],
  });
  assert.equal(deriveMTSSTier(decodingGap), "3");
  assert.equal(deriveMTSSTierDisplay(decodingGap)?.variant, "INTENSIVE");
  assert(deriveReadingProfileSummary(decodingGap).includes("decoding load"));
  assert(deriveReadingProfileSummary(decodingGap).includes("listen-first"));

  const highPriorityNoGap = result({ confidenceLevel: "high", priority1: ["DECODING"], listeningScore: 5, readingScore: 5 });
  assert.equal(deriveMTSSTier(highPriorityNoGap), "2");
  assert.equal(deriveMTSSTierDisplay(highPriorityNoGap)?.variant, "SMALL_GROUP");

  const watchEvidence = result({ confidenceLevel: "medium", totalScoredItems: 10, priority1: ["DECODING"] });
  assert.equal(deriveMTSSTier(watchEvidence), "2");
  assert.equal(deriveMTSSTierDisplay(watchEvidence)?.variant, "WATCH_EVIDENCE");

  const moderateNoPriority = result({
    confidenceLevel: "medium",
    priority1: [],
    interpretation: "Use decoding and language evidence to choose the next pattern.",
  });
  assert.equal(deriveMTSSTier(moderateNoPriority), "2");
  assert.equal(deriveMTSSTierDisplay(moderateNoPriority)?.variant, "SMALL_GROUP");
  assert.equal(deriveReadingProfileSummary(moderateNoPriority), "Use decoding and language evidence to choose the next pattern.");

  const limited = result({ totalScoredItems: 7, priority1: ["DECODING"] });
  assert(deriveReadingProfileSummary(limited).startsWith("Limited diagnostic evidence."));

  const emptyPriority = result({ priority1: [], confidenceLevel: "medium", interpretation: "Use recent responses to choose the next pattern." });
  assert.notEqual(deriveReadingProfileSummary(emptyPriority), "Decoding focus; language-comprehension signals look stable.");

  assert.equal(deriveMTSSTier(null), null);
  assert.equal(deriveMTSSTierDisplay(null), null);

  assert.deepEqual(
    summarizeCaseloadTierMix(["1", "2", "2", "3", null, null]),
    { core: 1, smallGroupOrWatch: 2, intensive: 1, awaiting: 2 }
  );

  assert.equal(
    deriveReadingProfileSummary(result({ interpretation: "Student is above grade level on this measure." })),
    "Use diagnostic strand priorities to choose the next small-group focus."
  );
  assert.equal(
    deriveReadingProfileSummary(result({ interpretation: "x".repeat(121) })),
    "Use diagnostic strand priorities to choose the next small-group focus."
  );
  assert.equal(
    deriveReadingProfileSummary(result({ interpretation: "" })),
    "Use diagnostic strand priorities to choose the next small-group focus."
  );

  const representative = [
    highCore,
    decodingGap,
    highPriorityNoGap,
    watchEvidence,
    moderateNoPriority,
    limited,
    emptyPriority,
    result({ priority1: ["VOCABULARY"], confidenceLevel: "high" }),
    result({ confidenceLevel: "low", priority1: [] }),
    result({ confidenceLevel: "low", priority1: [] }),
    result({ priority1: ["COMPREHENSION"], interpretation: "Language comprehension is the first planning focus." }),
  ];
  for (const sample of representative) {
    const lower = deriveReadingProfileSummary(sample).toLowerCase();
    assert.equal(FORBIDDEN_TOKENS.some((token) => lower.includes(token)), false, lower);
  }

  let callCount = 0;
  const resolveDailyTargetLabel = createDailyTargetLabelResolver(async ({ where }) => {
    callCount += 1;
    return { tutorLabel: `Tutor ${where.code}`, kidVisibleLabel: `Kid ${where.code}` };
  });
  assert.equal(await resolveDailyTargetLabel("a_e"), "Tutor a_e");
  assert.equal(await resolveDailyTargetLabel("a_e"), "Tutor a_e");
  assert.equal(callCount, 1);

  console.log("teacher dashboard data checks passed");
}

function result({
  confidenceLevel = "medium",
  totalScoredItems = 16,
  listeningScore = 5,
  readingScore = 5,
  priority1 = [],
  interpretation = "Use diagnostic strand priorities to choose the next pattern.",
}: {
  confidenceLevel?: DiagnosticResultsTutorPayload["confidence"]["level"];
  totalScoredItems?: number;
  listeningScore?: number;
  readingScore?: number;
  priority1?: string[];
  interpretation?: string | null;
} = {}): DiagnosticResultsTutorPayload {
  const priorityStrands = priority1.map((strand) => ({
    strand,
    score: 1,
    scoreOutOf: 4,
    priority: 1 as const,
    label: "Priority 1" as const,
  }));
  const relativeStrands = ["DECODING", "VOCABULARY", "COMPREHENSION"]
    .filter((strand) => !priority1.includes(strand))
    .map((strand) => ({
      strand,
      score: 4,
      scoreOutOf: 4,
      priority: null,
      label: "Relative strength on this diagnostic" as const,
    }));

  return {
    resultSchemaVersion: "diagnostic-results-v1",
    computedAt: "2026-06-01T12:00:00.000Z",
    diagnosticSessionId: "session-1",
    placement: { phase: "Phase 3 Entry", phaseBand: 3, placementBoundary: "Decoding accuracy sets the starting phase." },
    whyThisPlacement: { secure: [], developing: [], notYetSecure: [], insufficientEvidence: [] },
    decodingEvidence: { perPhase: [] },
    strandPriority: [...priorityStrands, ...relativeStrands],
    listeningVsReading: {
      listeningScore,
      listeningTotal: 8,
      readingScore,
      readingTotal: 8,
      interpretation: interpretation ?? "",
      evidence: [],
    },
    confidence: {
      level: confidenceLevel,
      totalScoredItems,
      audioQuality: { usableVoiceAttempts: 0, totalVoiceAttempts: 0, fraction: 1 },
      excludedItemsCount: 0,
      perStrandItemCounts: {},
    },
    firstLessonRecommendation: {
      phase: "Phase 3 Entry",
      dailyTargetCode: "a_e",
      exampleWords: ["cake", "game", "make"],
      reasoning: "Start with a_e.",
      additionalSupport: [],
      evidence: [],
    },
    parentFriendlySummary: { text: "Start with the next pattern.", evidence: [] },
  } as DiagnosticResultsTutorPayload;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
