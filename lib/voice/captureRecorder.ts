export type ClipRecorder = {
  stop(): Promise<Blob | null>;
};

export function startClipRecorder(stream: MediaStream): ClipRecorder | null {
  if (typeof MediaRecorder === "undefined") return null;
  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream);
  } catch {
    return null;
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  return {
    stop() {
      return new Promise((resolve) => {
        const finish = () => {
          if (!chunks.length) {
            resolve(null);
            return;
          }
          resolve(new Blob(chunks, { type: chunks[0]?.type || recorder.mimeType || "audio/webm" }));
        };
        recorder.onerror = () => resolve(null);
        recorder.onstop = finish;
        try {
          if (recorder.state === "inactive") {
            finish();
          } else {
            recorder.stop();
          }
        } catch {
          resolve(null);
        }
      });
    },
  };
}
