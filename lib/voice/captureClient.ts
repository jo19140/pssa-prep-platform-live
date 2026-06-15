export type PseudowordClipCaptureInput = {
  blob: Blob;
  voiceSessionId?: string | null;
  lessonTargetCode: string;
  expectedText: string;
  wordIndex: number;
  speakerAgeBand?: string | null;
  clipDurationMs: number;
};

export async function capturePseudowordClip(input: PseudowordClipCaptureInput): Promise<{ voiceSessionId?: string } | null> {
  try {
    const form = new FormData();
    form.set("audio", new File([input.blob], `${input.expectedText}.webm`, { type: input.blob.type || "audio/webm" }));
    if (input.voiceSessionId) form.set("voiceSessionId", input.voiceSessionId);
    form.set("lessonTargetCode", input.lessonTargetCode);
    form.set("expectedText", input.expectedText);
    form.set("wordIndex", String(input.wordIndex));
    form.set("clipDurationMs", String(Math.max(0, Math.round(input.clipDurationMs))));
    if (input.speakerAgeBand) form.set("speakerAgeBand", input.speakerAgeBand);
    const response = await fetch("/api/voice/capture/pseudoword", { method: "POST", body: form });
    if (!response.ok) return null;
    return (await response.json()) as { voiceSessionId?: string };
  } catch {
    return null;
  }
}
