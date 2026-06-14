import assert from "assert/strict";
import {
  isVoicedFrame,
  rmsFromFloatBuffer,
  VOICE_ACTIVITY_ABSOLUTE_FLOOR,
  VOICE_ACTIVITY_MIN_VOICED_MS,
  VOICE_ACTIVITY_NOISE_MULTIPLIER,
  VOICE_ACTIVITY_SAMPLE_INTERVAL_MS,
  voicedMsFromFrames,
  type VoiceActivityFrame,
} from "../lib/voice/voiceActivity";

function main() {
  assert.equal(rmsFromFloatBuffer([0, 0, 0, 0]), 0);
  assert(Math.abs(rmsFromFloatBuffer([1, -1, 1, -1]) - 1) < 0.000001);

  const noiseFloor = 0.01;
  assert.equal(isVoicedFrame(0.012, noiseFloor), false, "near-noise frames should not count as voiced");
  assert.equal(isVoicedFrame(Math.max(VOICE_ACTIVITY_ABSOLUTE_FLOOR, noiseFloor * VOICE_ACTIVITY_NOISE_MULTIPLIER), noiseFloor), true);
  assert.equal(isVoicedFrame(0.04, noiseFloor), true, "clear speech-like frames should count as voiced");

  const quietFrames: VoiceActivityFrame[] = Array.from({ length: 20 }, () => ({ rms: 0.011 }));
  assert.equal(voicedMsFromFrames(quietFrames, noiseFloor), 0);

  const voicedFrameCount = Math.ceil(VOICE_ACTIVITY_MIN_VOICED_MS / VOICE_ACTIVITY_SAMPLE_INTERVAL_MS);
  const speechFrames: VoiceActivityFrame[] = Array.from({ length: voicedFrameCount }, () => ({ rms: 0.04 }));
  assert(voicedMsFromFrames(speechFrames, noiseFloor) >= VOICE_ACTIVITY_MIN_VOICED_MS);

  const mixedFrames: VoiceActivityFrame[] = [
    ...Array.from({ length: 4 }, () => ({ rms: 0.011 })),
    ...Array.from({ length: 6 }, () => ({ rms: 0.05 })),
    ...Array.from({ length: 4 }, () => ({ rms: 0.012 })),
  ];
  assert.equal(voicedMsFromFrames(mixedFrames, noiseFloor), 6 * VOICE_ACTIVITY_SAMPLE_INTERVAL_MS);

  console.log("voice activity core checks passed");
}

main();
