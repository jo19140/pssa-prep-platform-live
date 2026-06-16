import fs from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const player = read("components/literacy/StudentPracticeSession.tsx");
const route = read("app/api/voice/capture/pseudoword/route.ts");
const storage = read("lib/voice/storage.ts");
const recorder = read("lib/voice/captureRecorder.ts");
const client = read("lib/voice/captureClient.ts");
const voiceActivity = read("lib/voice/voiceActivity.ts");
const practicePage = read("app/student/practice/page.tsx");
const targetPage = read("app/student/practice/[target]/page.tsx");

assert(voiceActivity.includes("readonly stream: MediaStream"), "VAD handle must expose its existing stream");
assert(recorder.includes("new MediaRecorder(stream)"), "clip recorder must record the existing VAD stream");
assert(!recorder.includes("getUserMedia"), "clip recorder must not open a second mic stream");
assert(client.includes('fetch("/api/voice/capture/pseudoword"'), "capture client must post to the pseudoword capture route");
assert(client.includes("catch"), "capture client must be best-effort and swallow failures");

assert(practicePage.includes("trainingCorpusOptedIn"), "practice page must derive capture flag server-side from consent");
assert(targetPage.includes("trainingCorpusOptedIn"), "target page must derive capture flag server-side from consent");
assert(player.includes("trainingCaptureEnabled === true && surface === \"pseudoword\""), "player must only construct recorder for opted-in pseudoword reads");
assert(player.includes("startClipRecorder(handle.stream)"), "player must use the VAD stream for capture");
assert(player.includes("blob = await clipRecorder.stop()"), "player must stop recorder only on VAD-confirmed heardSpeech path");
assert(player.includes("capturePseudowordClip"), "player must fire best-effort capture after VAD confirmation");
assert(!player.includes("VoiceSession"), "player must not write voice sessions directly");
assert(!client.includes("/api/voice/transcribe"), "capture client must not call the transcribe route");

assert(route.includes('requireUser(["STUDENT", "ADMIN"])'), "capture route must require student/admin auth");
assert(route.includes("isSameOrigin(req)"), "capture route must enforce same-origin");
assert(route.includes("trainingCorpusOptedIn !== true"), "capture route must require training consent");
assert(route.includes("resolveTargetStudentUserId"), "capture route must derive target student server-side");
assert(route.includes("canonicalPseudowordsForTargetPatterns"), "capture route must validate expectedText from generated pseudowords");
assert(route.includes("detectPatternCandidates"), "capture route must derive phonogram code server-side");
assert(route.includes("addVoiceAudioObject"), "capture route must use private storage helper directly");
assert(route.includes("deleteVoiceAudioObject(audioStorageKey)"), "capture route must clean uploaded blob on failure");
assert(route.includes('asrTranscript: ""'), "pseudoword segments must not store ASR output");
assert(!route.includes("ModelDecision"), "capture route must not create ModelDecision");
assert(!route.includes("/api/voice/transcribe"), "capture route must never transcribe pseudowords");
assert(!route.includes("process.env.BLOB_READ_WRITE_TOKEN"), "capture route must not use public Blob token");

assert(storage.includes("labeledSegments"), "purge must load labeled segments");
assert(storage.includes("segmentAudioKey"), "purge must delete segment audio keys");
assert(storage.includes("voiceAudioDeletionLog.create"), "purge must log audio deletion");
assert(storage.includes("OR: [{ audioStorageKey: { not: null } }, { labeledSegments: { some: { segmentAudioKey: { not: null } } } }]"), "student purge must include segment-only sessions");

console.log("voice capture layer 2 static invariants: PASS");
