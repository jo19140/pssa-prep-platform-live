import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { CONTENT_V3_DAILY_TARGETS } from "@/lib/content/phase3EntrySeed";
import { db } from "@/lib/db";
import { ensureLiteracyProfile, canAccessStudent, json } from "@/lib/literacy/profile";
import { canonicalPseudowordsForTargetPatterns } from "@/lib/literacy/lessonGenerator";
import { detectPatternCandidates } from "@/lib/literacy/pseudowordValidator";
import { consumeRateLimit } from "@/lib/rateLimit";
import { addVoiceAudioObject, deleteVoiceAudioObject } from "@/lib/voice/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_AUDIO_MIME_TYPES = new Map([
  ["audio/webm", ".webm"],
  ["audio/mp4", ".mp4"],
  ["audio/mpeg", ".mp3"],
  ["audio/wav", ".wav"],
]);
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_CAPACITY = 60;
const RATE_LIMIT_REFILL_MS = 60_000;
const LABEL_MAX_LENGTH = 80;

export async function POST(req: Request) {
  const auth = await requireUser(["STUDENT", "ADMIN"]);
  if (auth.error) return auth.error;

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data is required." }, { status: 415 });
  }

  const rateLimit = await consumeRateLimit({
    key: `voice-pseudoword-capture:${auth.user!.id}`,
    capacity: RATE_LIMIT_CAPACITY,
    refillIntervalMs: RATE_LIMIT_REFILL_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many voice captures. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } },
    );
  }

  const form = await req.formData();
  const studentUserId = await resolveTargetStudentUserId(form, auth.user!);
  if (!studentUserId) return NextResponse.json({ error: "A valid studentUserId is required." }, { status: 400 });
  if (!(await canAccessStudent(auth.user!, studentUserId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const consent = await db.voiceConsent.findUnique({ where: { studentUserId } });
  if (consent?.trainingCorpusOptedIn !== true) {
    return NextResponse.json({ error: "training_consent_required" }, { status: 403 });
  }

  const lessonTargetCode = labelField(form, "lessonTargetCode");
  const expectedText = labelField(form, "expectedText").toLowerCase();
  const wordIndex = integerField(form, "wordIndex", 0, 1000);
  const clipDurationMs = integerField(form, "clipDurationMs", 0, 60_000);
  const speakerAgeBand = labelField(form, "speakerAgeBand");
  if (!lessonTargetCode || !expectedText) {
    return NextResponse.json({ error: "lessonTargetCode and expectedText are required." }, { status: 400 });
  }
  const validation = validateExpectedPseudoword(lessonTargetCode, expectedText);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "A non-empty audio file is required." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: `Audio file exceeds ${MAX_AUDIO_BYTES} byte limit.` }, { status: 400 });
  }
  const contentType = normalizedMimeType(audio);
  const extension = ALLOWED_AUDIO_MIME_TYPES.get(contentType);
  if (!extension) return NextResponse.json({ error: "Unsupported audio MIME type." }, { status: 400 });

  const pathname = `voice/${studentUserId}/${randomUUID()}${extension}`;
  const { audioStorageKey } = await addVoiceAudioObject(await audio.arrayBuffer(), pathname, contentType);
  try {
    const literacyProfile = await ensureLiteracyProfile(studentUserId);
    const voiceSessionId = labelField(form, "voiceSessionId");
    const session = voiceSessionId
      ? await db.voiceSession.findFirst({
          where: { id: voiceSessionId, literacyProfile: { studentUserId } },
          select: { id: true },
        })
      : await db.voiceSession.create({
          data: {
            literacyProfileId: literacyProfile.id,
            sessionType: "PRACTICE",
            audioStorageKey: null,
            transcriptJson: json({
              mode: "content-v3-pseudoword-capture",
              lessonTargetCode,
              speakerAgeBand: speakerAgeBand || null,
            }),
            retentionTier: "TRAINING",
            deleteAfterDate: null,
          },
          select: { id: true },
        });
    if (!session) {
      await deleteVoiceAudioObject(audioStorageKey);
      return NextResponse.json({ error: "Voice session not found for student." }, { status: 403 });
    }

    await db.labeledVoiceSegment.create({
      data: {
        voiceSessionId: session.id,
        segmentStartMs: 0,
        segmentEndMs: clipDurationMs,
        segmentAudioKey: audioStorageKey,
        expectedText,
        asrTranscript: "",
        humanTranscript: null,
        miscueType: null,
        phonogramCode: validation.phonogramCode,
        syllableType: validation.syllableType,
        routedFromQueue: false,
        isEvalSet: false,
        uncertaintyScore: null,
      },
    });

    return NextResponse.json({ voiceSessionId: session.id });
  } catch (error) {
    await deleteVoiceAudioObject(audioStorageKey).catch(() => undefined);
    console.warn("Pseudoword voice capture failed after upload; uploaded blob was cleaned up.", {
      lessonTargetCode,
      expectedText,
      wordIndex,
      error,
    });
    return NextResponse.json({ error: "Voice capture failed." }, { status: 500 });
  }
}

function validateExpectedPseudoword(lessonTargetCode: string, expectedText: string) {
  const target = CONTENT_V3_DAILY_TARGETS.find((entry) => entry.code === lessonTargetCode);
  if (!target) return { ok: false as const, error: "Unknown lesson target." };
  const targetPatterns = stringArrayFromJson(target.targetPatternsJson, "patterns");
  const pseudowordPatterns = stringArrayFromJson(target.targetPatternsJson, "pseudowordPatterns");
  const patterns = targetPatterns.length ? targetPatterns : [target.code];
  const pseudoPatterns = pseudowordPatterns.length ? pseudowordPatterns : patterns;
  const expectedPseudowords = canonicalPseudowordsForTargetPatterns(
    target.code,
    target.exampleNonwords,
    patterns,
    "content-v3 lesson seed",
    pseudoPatterns,
  ).map((word) => word.toLowerCase());
  if (!expectedPseudowords.includes(expectedText)) {
    return { ok: false as const, error: "Expected text is not a generated pseudoword for this lesson target." };
  }
  const detected = detectPatternCandidates(expectedText);
  const phonogramCode = pseudoPatterns.find((pattern) => detected.includes(pattern)) ?? pseudoPatterns[0] ?? target.code;
  return { ok: true as const, phonogramCode, syllableType: syllableTypeForPattern(phonogramCode) };
}

function syllableTypeForPattern(pattern: string) {
  if (pattern.startsWith("closed_")) return "CLOSED" as const;
  if (pattern.endsWith("_e") || ["a_e", "e_e", "i_e", "o_e", "u_e"].includes(pattern)) return "VCE" as const;
  if (pattern.startsWith("r_")) return "R_CONTROLLED" as const;
  if (pattern.startsWith("team_") || pattern.startsWith("diph_")) return "VOWEL_TEAM" as const;
  return null;
}

async function resolveTargetStudentUserId(form: FormData, user: { id: string; role: string }) {
  if (user.role === "STUDENT") return user.id;
  const studentUserId = labelField(form, "studentUserId");
  if (!studentUserId) return "";
  const student = await db.user.findUnique({ where: { id: studentUserId }, select: { id: true, role: true } });
  return student?.role === "STUDENT" ? student.id : "";
}

function isSameOrigin(req: Request) {
  const expectedOrigin = new URL(req.url).origin;
  const origin = req.headers.get("origin");
  if (origin) return origin === expectedOrigin;
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function normalizedMimeType(file: File) {
  return file.type.split(";")[0]?.trim().toLowerCase();
}

function labelField(form: FormData, key: string) {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, LABEL_MAX_LENGTH);
}

function integerField(form: FormData, key: string, min: number, max: number) {
  const value = Number(labelField(form, key));
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function stringArrayFromJson(json: unknown, key: string) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const value = (json as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
