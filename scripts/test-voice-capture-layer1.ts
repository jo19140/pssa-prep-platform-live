import fs from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const storage = read("lib/voice/storage.ts");
const uploadRoute = read("app/api/voice/audio/upload/route.ts");
const sessionRoute = read("app/api/voice/audio/session/[id]/route.ts");
const envExample = read(".env.example");

assert(storage.includes('access: "private"'), "voice storage must use private Blob access");
assert(storage.includes("VOICE_BLOB_READ_WRITE_TOKEN"), "voice storage must use VOICE_BLOB_READ_WRITE_TOKEN");
assert(!storage.includes("process.env.BLOB_READ_WRITE_TOKEN"), "voice storage must not read BLOB_READ_WRITE_TOKEN");
assert(storage.includes("voiceAudioPathnameForStudent"), "storage must expose student pathname ownership check");
assert(storage.includes("getVoiceAudioObject"), "storage must expose private Blob read helper");
assert(storage.includes("get(pathname, { access: \"private\""), "private read helper must use Blob get with private access");

assert(uploadRoute.includes('requireUser(["STUDENT", "ADMIN"])'), "upload route must require student/admin auth");
assert(uploadRoute.includes("isSameOrigin(req)"), "upload route must require same-origin requests");
assert(uploadRoute.includes("trainingCorpusOptedIn !== true"), "upload route must require training consent");
assert(uploadRoute.includes('const retentionTier = "TRAINING"'), "upload route must compute TRAINING retention server-side");
assert(uploadRoute.includes('["audio/mp4", ".mp4"]'), "audio/mp4 must save with .mp4 extension");
assert(uploadRoute.includes('["audio/webm", ".webm"]'), "audio/webm must save with .webm extension");
assert(uploadRoute.includes("voice/${studentUserId}/"), "upload pathname must be student-prefixed");
assert(!uploadRoute.includes("VoiceSession"), "upload route must not create VoiceSession");
assert(!uploadRoute.includes("ModelDecision"), "upload route must not create ModelDecision");
assert(!uploadRoute.includes("transcript"), "upload route must not accept/store transcript text");
assert(!uploadRoute.includes("BLOB_READ_WRITE_TOKEN"), "upload route must not use the public Blob token");

assert(sessionRoute.includes("getVoiceAudioObject(session.audioStorageKey, session.literacyProfile.studentUserId)"), "audio read route must enforce storage-key ownership");
assert(!sessionRoute.includes("fetch(session.audioStorageKey)"), "audio read route must not fetch a raw storage key");
assert(!sessionRoute.includes("expiresInSeconds"), "audio read route must not return playable storage keys");

assert(envExample.includes("VOICE_BLOB_READ_WRITE_TOKEN"), ".env.example must document private voice token");

console.log("voice capture layer 1 static invariants: PASS");
