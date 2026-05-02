"use client";

import { useRef, useState } from "react";

export function ReadingCoachPanel({
  assignment,
  onComplete,
}: {
  assignment: any;
  onComplete?: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [manualTranscript, setManualTranscript] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError("");
    setResult(null);
    setAudioBlob(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not available in this browser. You can type what you read instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      setStartedAt(Date.now());
      setRecording(true);
      recorder.start();
    } catch (err) {
      setError("Microphone permission was blocked. You can type what you read instead.");
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    setRecording(false);
    if (startedAt) setAudioSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
  }

  async function submitReading() {
    setSaving(true);
    setError("");
    const formData = new FormData();
    formData.append("assignmentId", assignment.assignmentId);
    formData.append("audioSeconds", String(audioSeconds || 0));
    if (manualTranscript.trim()) formData.append("manualTranscript", manualTranscript.trim());
    if (audioBlob) formData.append("audio", audioBlob, "reading.webm");

    const res = await fetch("/api/student/reading-coach", { method: "POST", body: formData });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Reading coach could not save this attempt.");
      return;
    }
    setResult(json);
    onComplete?.();
  }

  const feedback = result?.analysis?.feedback;
  const readingText = assignment.expectedText;

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Reading Coach</p>
          <h3 className="text-xl font-bold text-slate-900">{assignment.title}</h3>
          <p className="mt-1 text-sm text-slate-600">Practice reading fluency, accuracy, phonics patterns, and word sounds. This is instructional support, not diagnosis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Teacher Assigned</span>
          {assignment.statusLabel === "Completed" ? <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-900">Read this passage aloud:</p>
          <p className="mt-3 rounded-xl bg-white p-4 text-lg leading-8 text-slate-900 ring-1 ring-slate-200">{readingText}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!recording ? (
              <button onClick={startRecording} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Stop Recording
              </button>
            )}
            <button
              onClick={submitReading}
              disabled={saving || (!audioBlob && !manualTranscript.trim())}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Checking..." : "Check My Reading"}
            </button>
          </div>
          {audioBlob ? <p className="mt-3 text-sm font-semibold text-emerald-700">Recording ready. Length: about {audioSeconds || "?"} seconds.</p> : null}
          {recording ? <p className="mt-3 text-sm font-semibold text-orange-700">Recording...</p> : null}
          {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-900">Optional typed transcript</span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              value={manualTranscript}
              onChange={(event) => setManualTranscript(event.target.value)}
              placeholder="If recording is unavailable, type what the student read."
            />
          </label>
          {feedback ? (
            <div className="mt-4 rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
              <p className="font-bold text-slate-900">{feedback.summary}</p>
              <p className="mt-2 text-slate-700">{feedback.coachPrompt}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(feedback.focusAreas || []).map((area: string) => (
                  <span key={area} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">{area}</span>
                ))}
              </div>
              {feedback.nextSteps?.length ? (
                <ul className="mt-3 list-disc pl-5 text-slate-700">
                  {feedback.nextSteps.map((step: string) => <li key={step}>{step}</li>)}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">After the student reads, feedback will appear here with next-step practice.</p>
          )}
        </div>
      </div>
    </section>
  );
}
