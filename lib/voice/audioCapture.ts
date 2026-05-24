"use client";

export type AudioCaptureState = {
  stream: MediaStream;
  recorder: MediaRecorder;
};

export async function startAudioCapture(onChunk: (chunk: Blob) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) onChunk(event.data);
  };
  recorder.start();
  return { stream, recorder };
}

export function stopAudioCapture(state: AudioCaptureState) {
  if (state.recorder.state !== "inactive") state.recorder.stop();
  state.stream.getTracks().forEach((track) => track.stop());
}
