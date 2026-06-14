import { randomUUID } from "crypto";
import { addVoiceAudioObject, deleteVoiceAudioObject, getVoiceAudioObject } from "@/lib/voice/storage";

const contentType = "audio/webm";
const studentUserId = `smoke-student-${randomUUID()}`;
const otherStudentUserId = `smoke-other-${randomUUID()}`;
const pathname = `voice/${studentUserId}/${randomUUID()}.webm`;
const bytes = Buffer.from("voice-blob-smoke-test\n", "utf8");

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function readStream(stream: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function main() {
  assert(process.env.VOICE_BLOB_READ_WRITE_TOKEN, "VOICE_BLOB_READ_WRITE_TOKEN is required for this smoke test.");

  let audioStorageKey = "";
  try {
    const uploaded = await addVoiceAudioObject(bytes, pathname, contentType);
    audioStorageKey = uploaded.audioStorageKey;
    assert(!/^https?:\/\//.test(audioStorageKey), "audioStorageKey must be a private pathname, not a public URL.");
    assert(audioStorageKey.startsWith(`voice/${studentUserId}/`), "audioStorageKey must be scoped to the student pathname.");
    console.log("✓ uploaded to private voice pathname");

    const fetched = await getVoiceAudioObject(audioStorageKey, studentUserId);
    assert(fetched?.statusCode === 200 && fetched.stream, "authorized private read should return a stream.");
    const fetchedBytes = await readStream(fetched.stream);
    assert(fetchedBytes.equals(bytes), "authorized private read should round-trip the uploaded bytes.");
    console.log("✓ authorized private read round-tripped bytes");

    let ownershipBlocked = false;
    try {
      await getVoiceAudioObject(audioStorageKey, otherStudentUserId);
    } catch {
      ownershipBlocked = true;
    }
    assert(ownershipBlocked, "different student should be blocked by the pathname ownership guard.");
    console.log("✓ different student blocked by ownership guard");
  } finally {
    if (audioStorageKey) {
      await deleteVoiceAudioObject(audioStorageKey);
      console.log("✓ deleted private voice object");
    }
  }

  console.log("SMOKE PASSED ✅");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
