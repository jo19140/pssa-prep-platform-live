import { CONTENT_V3_DAILY_TARGETS } from "@/lib/content/phase3EntrySeed";
import { db } from "@/lib/db";
import { canonicalPseudowordsForTargetPatterns } from "@/lib/literacy/lessonGenerator";

const STUDENT_EMAIL = "grade7-voice-smoke@example.com";
const ANNOTATOR_EMAIL = "voice-annotator-smoke@example.com";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const acceptedPseudowords = acceptedAePseudowords();

  const [student, annotator] = await Promise.all([
    db.user.findUnique({
      where: { email: STUDENT_EMAIL },
      include: { voiceConsent: true, literacyProfile: true },
    }),
    db.user.findUnique({ where: { email: ANNOTATOR_EMAIL } }),
  ]);

  assert(student, `Missing synthetic smoke student ${STUDENT_EMAIL}. Run npm run seed:p4a-voice-smoke first.`);
  assert(student.role === "STUDENT", `${STUDENT_EMAIL} must have role STUDENT.`);
  assert(student.voiceConsent?.trainingCorpusOptedIn === true, "Synthetic smoke student must have trainingCorpusOptedIn=true.");
  assert(annotator, `Missing synthetic smoke annotator ${ANNOTATOR_EMAIL}. Run npm run seed:p4a-voice-smoke first.`);
  assert(annotator.role === "VOICE_ANNOTATOR", `${ANNOTATOR_EMAIL} must have role VOICE_ANNOTATOR.`);

  const literacyProfile = student.literacyProfile;
  if (!literacyProfile) {
    failManualMicStepFirst("No LiteracyProfile exists for the synthetic smoke student.");
  }

  const sessions = await db.voiceSession.findMany({
    where: {
      literacyProfileId: literacyProfile.id,
      retentionTier: "TRAINING",
      sessionType: "PRACTICE",
    },
    include: {
      labeledSegments: {
        where: { labeledAt: null, skippedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const studentPrefix = `voice/${student.id}/`;
  for (const session of sessions) {
    const segment = session.labeledSegments.find((candidate) => {
      const expectedText = candidate.expectedText.trim().toLowerCase();
      return (
        candidate.segmentAudioKey?.startsWith(studentPrefix) === true &&
        candidate.asrTranscript === "" &&
        candidate.labeledAt === null &&
        candidate.skippedAt === null &&
        acceptedPseudowords.has(expectedText) &&
        candidate.phonogramCode === "a_e" &&
        candidate.syllableType === "VCE"
      );
    });
    if (!segment) continue;

    console.log("P4A voice smoke verifier PASS");
    console.log(`Student: ${STUDENT_EMAIL} (${student.id})`);
    console.log(`Annotator: ${ANNOTATOR_EMAIL} (${annotator.id})`);
    console.log(`VoiceSession: ${session.id} retentionTier=${session.retentionTier} sessionType=${session.sessionType}`);
    console.log(`LabeledVoiceSegment: ${segment.id} expectedText=${segment.expectedText}`);
    console.log(`segmentAudioKey: ${segment.segmentAudioKey}`);
    console.log(`Accepted a_e pseudowords: ${Array.from(acceptedPseudowords).join(", ")}`);
    return;
  }

  failManualMicStepFirst(
    `No queued TRAINING pseudoword segment was found for ${STUDENT_EMAIL}. Expected segmentAudioKey prefix ${studentPrefix}.`,
  );
}

function acceptedAePseudowords() {
  const target = CONTENT_V3_DAILY_TARGETS.find((entry) => entry.code === "a_e");
  assert(target, "Missing a_e content-v3 target seed.");
  const targetPatterns = stringArrayFromJson(target.targetPatternsJson, "patterns");
  const pseudowordPatterns = stringArrayFromJson(target.targetPatternsJson, "pseudowordPatterns");
  const patterns = targetPatterns.length ? targetPatterns : [target.code];
  const pseudoPatterns = pseudowordPatterns.length ? pseudowordPatterns : patterns;
  return new Set(
    canonicalPseudowordsForTargetPatterns(
      target.code,
      target.exampleNonwords,
      patterns,
      "P4A voice smoke verifier",
      pseudoPatterns,
    ).map((word) => word.toLowerCase()),
  );
}

function stringArrayFromJson(json: unknown, key: string) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const value = (json as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function failManualMicStepFirst(detail: string): never {
  throw new Error(`${detail} Run the manual mic step first, then rerun npm run test:p4a-voice-smoke.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
