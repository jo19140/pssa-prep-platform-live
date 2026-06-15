import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { canAccessStudent } from "@/lib/literacy/profile";
import { consumeRateLimit } from "@/lib/rateLimit";
import { addVoiceAudioObject } from "@/lib/voice/storage";

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
    key: `voice-audio-upload:${auth.user!.id}`,
    capacity: RATE_LIMIT_CAPACITY,
    refillIntervalMs: RATE_LIMIT_REFILL_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many voice audio uploads. Please wait and try again." },
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
  const retentionTier = "TRAINING";
  void retentionTier;

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

  const metadata = {
    surface: labelField(form, "surface"),
    targetPattern: labelField(form, "targetPattern"),
    speakerAgeBand: labelField(form, "speakerAgeBand"),
  };
  void metadata;

  const pathname = `voice/${studentUserId}/${randomUUID()}${extension}`;
  const { audioStorageKey } = await addVoiceAudioObject(await audio.arrayBuffer(), pathname, contentType);
  return NextResponse.json({ audioStorageKey });
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
