import fs from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const route = read("app/api/voice/audio/segment/[id]/route.ts");
const sessionRoute = read("app/api/voice/audio/session/[id]/route.ts");
const page = read("app/admin/voice/labeling/[segmentId]/page.tsx");

assert(route.includes('requireUser(["ADMIN", "VOICE_ANNOTATOR"])'), "segment route must be admin/voice-annotator gated");
assert(route.includes("include: { voiceSession: { include: { literacyProfile: true } } }"), "segment route must load owning session profile");
assert(route.includes("!segment?.segmentAudioKey || segment.voiceSession.audioDeletedAt"), "segment route must 404 when segment audio is missing or session audio is deleted");
assert(route.includes('auth.user!.role === "ADMIN"'), "segment route must allow admins");
assert(route.includes('auth.user!.role === "VOICE_ANNOTATOR"'), "segment route must recognize voice annotators");
assert(route.includes("isVoiceAnnotator && (segment.labeledAt || segment.skippedAt)"), "voice annotators must only access unlabeled/unskipped segments");
assert(!route.includes("labeledByUserId === auth.user!.id"), "segment route must not add a labeledByUserId escape hatch");
assert(route.includes("getVoiceAudioObject(segment.segmentAudioKey, segment.voiceSession.literacyProfile.studentUserId)"), "segment route must read through the private voice store helper with owning student id");
assert(!route.includes("BLOB_READ_WRITE_TOKEN"), "segment route must not use the public blob token");
assert(!route.includes("access: \"public\"") && !route.includes("access: 'public'"), "segment route must not request public blob access");
assert(!route.includes(".url") && !route.includes("downloadUrl"), "segment route must not expose raw blob URLs");
assert(route.includes('accessPurpose: "VOICE_AUDIO_READ"'), "segment route must log successful voice reads");
assert(route.includes("voiceSessionId: segment.voiceSessionId"), "access log must include voiceSessionId");
assert(route.includes("segmentId: segment.id"), "access log must include segmentId");

const getIndex = route.indexOf("getVoiceAudioObject(segment.segmentAudioKey");
const logIndex = route.indexOf("voiceAudioAccessLog.create");
const streamIndex = route.indexOf("return new Response(upstream.stream");
assert(getIndex > -1 && logIndex > getIndex, "access log must be written only after private blob lookup succeeds");
assert(streamIndex > logIndex, "streaming must happen after access logging");

for (const header of ['"content-type": upstream.blob.contentType || "audio/webm"', '"cache-control": "private, max-age=0, no-store"']) {
  assert(route.includes(header), `segment route missing streaming header: ${header}`);
  assert(sessionRoute.includes(header), `session route missing streaming header: ${header}`);
}

assert(page.includes("segment.segmentAudioKey"), "labeling page must prefer segment audio when present");
assert(page.includes("`/api/voice/audio/segment/${segment.id}`"), "labeling page must use the segment audio route");
assert(page.includes("`/api/voice/audio/session/${segment.voiceSessionId}`"), "labeling page must preserve legacy session route fallback");

console.log("voice labeling segment audio checks passed");
