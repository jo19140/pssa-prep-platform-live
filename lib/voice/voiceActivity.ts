export const VOICE_ACTIVITY_SAMPLE_INTERVAL_MS = 50;
export const VOICE_ACTIVITY_CALIBRATION_MS = 350;
export const VOICE_ACTIVITY_MIN_VOICED_MS = 550;
export const VOICE_ACTIVITY_MAX_LISTEN_MS = 6000;
export const VOICE_ACTIVITY_NOISE_MULTIPLIER = 2.0; // tune from real kids
export const VOICE_ACTIVITY_ABSOLUTE_FLOOR = 0.018; // tune from real kids

export type VoiceActivityFrame = {
  rms: number;
  durationMs?: number;
};

export type VoiceActivityHandle = {
  readonly startedAt: number;
  readonly frames: VoiceActivityFrame[];
  get voicedMs(): number;
  heardSpeech: (minMs?: number) => boolean;
  stop: () => void;
};

type MutableVoiceActivityHandle = VoiceActivityHandle & {
  stream: MediaStream;
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  timer: number;
  stopped: boolean;
  noiseFloor: number | null;
  calibrationFrames: number[];
  _voicedMs: number;
};

export function rmsFromFloatBuffer(buffer: Float32Array | number[]) {
  if (buffer.length === 0) return 0;
  let total = 0;
  for (const sample of buffer) total += sample * sample;
  return Math.sqrt(total / buffer.length);
}

export function isVoicedFrame(
  rms: number,
  noiseFloor: number,
  options: { multiplier?: number; absoluteFloor?: number } = {},
) {
  const multiplier = options.multiplier ?? VOICE_ACTIVITY_NOISE_MULTIPLIER;
  const absoluteFloor = options.absoluteFloor ?? VOICE_ACTIVITY_ABSOLUTE_FLOOR;
  return rms >= Math.max(absoluteFloor, noiseFloor * multiplier);
}

export function voicedMsFromFrames(
  frames: VoiceActivityFrame[],
  noiseFloor: number,
  options: { sampleIntervalMs?: number; multiplier?: number; absoluteFloor?: number } = {},
) {
  const sampleIntervalMs = options.sampleIntervalMs ?? VOICE_ACTIVITY_SAMPLE_INTERVAL_MS;
  return frames.reduce((total, frame) => {
    if (!isVoicedFrame(frame.rms, noiseFloor, options)) return total;
    return total + (frame.durationMs ?? sampleIntervalMs);
  }, 0);
}

export async function startVoiceActivity(): Promise<VoiceActivityHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("VOICE_ACTIVITY_UNAVAILABLE");
  }
  const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("VOICE_ACTIVITY_AUDIO_CONTEXT_UNAVAILABLE");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContextCtor();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  const startedAt = Date.now();

  const handle = {
    startedAt,
    frames: [],
    stream,
    audioContext,
    source,
    analyser,
    stopped: false,
    noiseFloor: null,
    calibrationFrames: [],
    _voicedMs: 0,
    get voicedMs() {
      return this._voicedMs;
    },
    heardSpeech(minMs = VOICE_ACTIVITY_MIN_VOICED_MS) {
      return this._voicedMs >= minMs;
    },
    stop() {
      stopVoiceActivity(this);
    },
  } as MutableVoiceActivityHandle;

  handle.timer = window.setInterval(() => {
    if (handle.stopped) return;
    analyser.getFloatTimeDomainData(data);
    const rms = rmsFromFloatBuffer(data);
    handle.frames.push({ rms, durationMs: VOICE_ACTIVITY_SAMPLE_INTERVAL_MS });
    const elapsed = Date.now() - startedAt;
    if (elapsed <= VOICE_ACTIVITY_CALIBRATION_MS) {
      handle.calibrationFrames.push(rms);
      return;
    }
    if (handle.noiseFloor === null) {
      handle.noiseFloor = Math.max(average(handle.calibrationFrames), 0.001);
    }
    if (isVoicedFrame(rms, handle.noiseFloor)) {
      handle._voicedMs += VOICE_ACTIVITY_SAMPLE_INTERVAL_MS;
    }
  }, VOICE_ACTIVITY_SAMPLE_INTERVAL_MS);

  return handle;
}

export function stopVoiceActivity(handle: VoiceActivityHandle | null | undefined) {
  if (!handle) return;
  const mutable = handle as MutableVoiceActivityHandle;
  if (mutable.stopped) return;
  mutable.stopped = true;
  window.clearInterval(mutable.timer);
  try {
    mutable.source.disconnect();
  } catch {
    // Already disconnected.
  }
  for (const track of mutable.stream.getTracks()) track.stop();
  void mutable.audioContext.close().catch(() => undefined);
}

function average(values: number[]) {
  if (values.length === 0) return 0.001;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
