"use client";

import { useRef, useState } from "react";
import { startAudioCapture, stopAudioCapture, type AudioCaptureState } from "@/lib/voice/audioCapture";
import { SILENCE_TIMEOUT_MS } from "./utils";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string; confidence?: number }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type MicResult = {
  transcript: string | null;
  audioConfidence?: number;
  noAttempt?: boolean;
  clientIssue?: "mic_problem";
};

export function MicButton({
  disabled,
  label = "Start talking",
  stopLabel = "I'm done",
  onResult,
}: {
  disabled?: boolean;
  label?: string;
  stopLabel?: string;
  onResult: (result: MicResult) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const captureRef = useRef<AudioCaptureState | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const confidenceRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  async function start() {
    setPermissionError("");
    completedRef.current = false;
    transcriptRef.current = "";
    confidenceRef.current = undefined;
    try {
      captureRef.current = await startAudioCapture(() => undefined);
      const Recognition = getSpeechRecognition();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          const transcripts: string[] = [];
          let confidence: number | undefined;
          for (let i = 0; i < event.results.length; i += 1) {
            const result = event.results[i]?.[0];
            if (result?.transcript) transcripts.push(result.transcript);
            if (typeof result?.confidence === "number") confidence = result.confidence;
          }
          transcriptRef.current = transcripts.join(" ").trim();
          confidenceRef.current = confidence;
        };
        recognition.onerror = () => {
          if (!completedRef.current) finish({ clientIssue: "mic_problem" });
        };
        recognitionRef.current = recognition;
        recognition.start();
      }
      timeoutRef.current = window.setTimeout(() => finish({ noAttempt: true }), SILENCE_TIMEOUT_MS);
      setRecording(true);
    } catch {
      setPermissionError("I couldn't hear you yet. Try your microphone again or tell us there was an audio problem.");
      finish({ clientIssue: "mic_problem" });
    }
  }

  function finish(extra: Partial<MicResult> = {}) {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Browser speech recognition can throw if it already stopped.
    }
    recognitionRef.current = null;
    if (captureRef.current) stopAudioCapture(captureRef.current);
    captureRef.current = null;
    setRecording(false);
    onResult({
      transcript: extra.noAttempt ? null : transcriptRef.current || null,
      audioConfidence: confidenceRef.current,
      ...extra,
    });
  }

  return (
    <div className="space-y-3 text-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (recording ? finish() : start())}
        className={`inline-flex h-20 w-20 items-center justify-center rounded-full border-4 text-sm font-black shadow-sm transition ${
          recording ? "border-amber-200 bg-amber-600 text-white" : "border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
        } disabled:opacity-50`}
        aria-label={recording ? stopLabel : label}
      >
        {recording ? "Stop" : "Mic"}
      </button>
      <p className="text-sm font-semibold text-slate-700">{recording ? stopLabel : label}</p>
      {permissionError ? <p className="text-sm font-semibold text-red-700">{permissionError}</p> : null}
    </div>
  );
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition;
  return candidate || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition || null;
}

