"use client";

import { useEffect, useRef, useState } from "react";

type TutorMode = "dashboard" | "learning-path";

const dashboardQuickPrompts = [
  "What should I work on today?",
  "Explain my progress",
  "Help me prepare for my diagnostic",
  "Create a short practice set",
  "Why was this lesson assigned?",
];

const learningPathQuickPrompts = [
  "Give me a hint",
  "Explain this skill another way",
  "Ask me a guiding question",
  "What evidence should I reread?",
  "Explain the directions",
  "Teach me my weakest skill",
];

export function StudentTutorAgentHelpButton({ mode = "learning-path" }: { mode?: TutorMode } = {}) {
  const [open, setOpen] = useState(false);
  const isDashboard = mode === "dashboard";

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="mb-3 w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-4 py-3 text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-cyan-200">AI Tutor</p>
              <h3 className="text-base font-black">{isDashboard ? "Learning Coach" : "Learning Path Help"}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <StudentTutorAgentPanel compact mode={mode} />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full bg-indigo-700 px-5 py-4 text-sm font-black text-white shadow-2xl ring-4 ring-white/70 transition hover:bg-indigo-800"
      >
        {open ? "Hide Help" : "Ask Tutor"}
      </button>
    </div>
  );
}

export function StudentTutorAgentPanel({ compact = false, mode = "dashboard" }: { compact?: boolean; mode?: TutorMode } = {}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speechStatus, setSpeechStatus] = useState("");
  const [spokenWordIndex, setSpokenWordIndex] = useState(-1);
  const [spokenResponse, setSpokenResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const speechMapRef = useRef<Array<{ index: number; start: number; end: number }>>([]);
  const speechWordCountsRef = useRef({ responseWords: 0, totalWords: 0 });
  const latest = messages[messages.length - 1];
  const artifacts = latest?.artifacts || {};
  const quickPrompts = mode === "learning-path" ? learningPathQuickPrompts : dashboardQuickPrompts;

  useEffect(() => {
    async function loadAgent() {
      const res = await fetch("/api/student/tutor-agent");
      if (res.ok) {
        const json = await res.json();
        setMemory(json.memory);
        setMessages(json.messages || []);
      }
    }
    loadAgent();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      stopAudioPlayback();
    };
  }, []);

  async function askTutor(nextMessage = message) {
    const clean = nextMessage.trim();
    if (!clean) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    stopAudioPlayback();
    setSpeaking(false);
    setSpokenWordIndex(-1);
    setSpokenResponse("");
    setSpeechError("");
    setSpeechStatus("");
    setLoading(true);
    setMessage("");
    const optimistic = { id: `local-${Date.now()}`, message: clean, response: "Thinking...", artifacts: null };
    setMessages((prev) => [...prev, optimistic]);
    const res = await fetch("/api/student/tutor-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean, mode }),
    });
    const json = await res.json();
    if (res.ok) {
      setMemory(json.memory);
      setMessages((prev) => [...prev.filter((item) => item.id !== optimistic.id), json.message]);
    } else {
      setMessages((prev) => [...prev.filter((item) => item.id !== optimistic.id), { id: `error-${Date.now()}`, message: clean, response: json.error || "The tutor could not answer right now." }]);
    }
    setLoading(false);
  }

  function listenToExplanation() {
    setSpeechError("");
    setSpeechStatus("Generating audio...");
    if (!latest) return;

    if (speaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
      stopAudioPlayback();
      utteranceRef.current = null;
      setSpeaking(false);
      setSpokenWordIndex(-1);
      return;
    }

    const text = buildTutorSpeechText(latest).replace(/\s+/g, " ").trim();
    if (!text.trim()) return;
    const responseText = String(latest?.response || "").replace(/\s+/g, " ").trim();
    const speechMap = buildWordBoundaryMap(text);
    speechMapRef.current = speechMap;
    setSpokenResponse(responseText);
    setSpokenWordIndex(-1);
    playGeneratedTutorAudio(text, responseText);
    return;

    window.speechSynthesis.cancel();
    const speakNow = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = chooseReadableVoice(window.speechSynthesis.getVoices());
      if (voice) utterance.voice = voice;
      utterance.rate = 0.82;
      utterance.pitch = 1;
      utterance.volume = 1;
      utteranceRef.current = utterance;
      utterance.onstart = () => {
        setSpeechError("");
        setSpeaking(true);
      };
      utterance.onboundary = (event) => {
        if (event.name && event.name !== "word") return;
        const hit = speechMapRef.current.find((word) => event.charIndex >= word.start && event.charIndex < word.end);
        if (hit) setSpokenWordIndex(hit.index);
      };
      utterance.onend = () => {
        if (utteranceRef.current === utterance) utteranceRef.current = null;
        setSpeaking(false);
        setSpokenWordIndex(-1);
      };
      utterance.onerror = (event) => {
        if (event.error === "canceled" || event.error === "interrupted") return;
        if (utteranceRef.current === utterance) utteranceRef.current = null;
        setSpeaking(false);
        setSpokenWordIndex(-1);
        setSpeechError(`Read aloud did not start (${event.error}). Check your computer volume, then press Listen again.`);
      };
      try {
        setSpeaking(true);
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
        window.setTimeout(() => window.speechSynthesis.resume(), 150);
        window.setTimeout(() => {
          if (!window.speechSynthesis.speaking && utteranceRef.current === utterance) {
            playGeneratedTutorAudio(text, responseText);
          }
        }, 900);
      } catch {
        playGeneratedTutorAudio(text, responseText);
      }
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      speakNow();
    } else {
      setSpeaking(true);
      window.setTimeout(speakNow, 250);
    }
  }

  async function playGeneratedTutorAudio(text: string, responseText: string) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    stopAudioPlayback();
    setSpeechError("");
    setSpeaking(true);
    setSpokenResponse(responseText);
    speechWordCountsRef.current = {
      responseWords: countWords(responseText),
      totalWords: countWords(text),
    };
    try {
      const res = await fetch("/api/student/tutor-agent/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Audio unavailable");
      const blob = await res.blob();
      if (!blob.size) throw new Error("Empty audio");
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setSpeechStatus("Audio ready. If you do not hear it automatically, press Play on the audio bar.");
      window.setTimeout(async () => {
        try {
          await audioRef.current?.play();
        } catch {
          setSpeaking(false);
          setSpeechStatus("Audio ready. Press Play on the audio bar.");
        }
      }, 0);
    } catch {
      stopTimedHighlight();
      setSpeaking(false);
      setSpeechStatus("");
      setSpeechError("Read aloud still could not play. Check Chrome tab mute, system output, and Mac volume.");
    }
  }

  function startTimedHighlight(text: string, durationMs: number) {
    stopTimedHighlight();
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const startedAt = Date.now();
    highlightTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const index = Math.min(words.length - 1, Math.floor((elapsed / durationMs) * words.length));
      setSpokenWordIndex(index);
    }, 140);
  }

  function updateHighlightFromAudio(audio: HTMLAudioElement) {
    const { responseWords, totalWords } = speechWordCountsRef.current;
    if (!responseWords || !totalWords || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const responseDuration = audio.duration * Math.min(1, responseWords / totalWords);
    if (audio.currentTime > responseDuration) {
      setSpokenWordIndex(-1);
      return;
    }
    const index = Math.min(responseWords - 1, Math.floor((audio.currentTime / responseDuration) * responseWords));
    setSpokenWordIndex(index);
  }

  function stopTimedHighlight() {
    if (highlightTimerRef.current) window.clearInterval(highlightTimerRef.current);
    highlightTimerRef.current = null;
    setSpokenWordIndex(-1);
  }

  function stopAudioPlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
    }
    stopTimedHighlight();
  }

  return (
    <section className={compact ? "max-h-[70vh] overflow-y-auto bg-white p-4" : "rounded-3xl bg-white p-6 shadow"}>
      <div className={`flex flex-col gap-2 ${compact ? "" : "sm:flex-row sm:items-start sm:justify-between"}`}>
        <div>
          {!compact ? <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">AI Tutor Agent</p> : null}
          <h3 className={compact ? "text-base font-bold text-slate-900" : "text-xl font-bold text-slate-900"}>
            {compact ? (mode === "learning-path" ? "What part should we unpack?" : "What should we work on?") : "Ask for help, lessons, or practice"}
          </h3>
          {!compact ? (
            <p className="mt-1 text-sm text-slate-600">
              {memory?.learnerSummary || "The tutor learns from completed tests, learning paths, and student requests over time."}
            </p>
          ) : null}
        </div>
        {!compact ? <span className="inline-flex w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          Learns over time
        </span> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(compact ? quickPrompts.slice(0, 3) : quickPrompts).map((prompt) => (
          <button
            key={prompt}
            onClick={() => askTutor(prompt)}
            disabled={loading}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={`mt-4 flex flex-col gap-3 ${compact ? "" : "sm:flex-row"}`}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") askTutor();
          }}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm"
          placeholder={compact ? "Ask for a hint, explanation, or practice..." : "Ask the tutor to explain a skill, make a lesson, or create practice..."}
        />
        <button
          onClick={() => askTutor()}
          disabled={loading || !message.trim()}
          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-800 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask Tutor"}
        </button>
      </div>

      {latest ? (
        <div className={`${compact ? "mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" : "mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"}`}>
          <p className="text-xs font-semibold uppercase text-slate-500">You asked</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{latest.message}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-6 text-slate-700">
              <HighlightedReadAloudText text={latest.response} activeWordIndex={spokenResponse === String(latest.response || "").replace(/\s+/g, " ").trim() ? spokenWordIndex : -1} />
            </p>
            <button
              onClick={listenToExplanation}
              className={`w-fit rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
                speaking ? "bg-slate-900 text-white" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
              }`}
            >
              {speaking ? "Stop Reading" : "Listen"}
            </button>
          </div>
          {audioUrl ? (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-slate-600">Audio player</p>
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                className="w-full"
                onPlay={() => {
                  setSpeaking(true);
                  setSpeechStatus("Reading aloud...");
                }}
                onPause={(event) => {
                  if (!event.currentTarget.ended) setSpeaking(false);
                }}
                onEnded={() => {
                  stopTimedHighlight();
                  setSpeaking(false);
                  setSpeechStatus("");
                }}
                onTimeUpdate={(event) => updateHighlightFromAudio(event.currentTarget)}
                onError={() => {
                  stopTimedHighlight();
                  setSpeaking(false);
                  setSpeechError("Audio was created, but the browser could not play it. Try pressing Play again or refresh the page.");
                }}
              />
            </div>
          ) : null}
          {speechStatus ? <p className="mt-2 text-xs font-semibold text-indigo-700">{speechStatus}</p> : null}
          {speechError ? <p className="mt-2 text-xs font-semibold text-red-600">{speechError}</p> : null}
          <TutorArtifacts artifacts={artifacts} latestIntent={latest.intent} latestMessage={latest.message} />
        </div>
      ) : null}
    </section>
  );
}

function chooseReadableVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang === "en-US" && /Google|Samantha|Alex|Microsoft/i.test(voice.name)) ||
    voices.find((voice) => voice.lang === "en-US") ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
}

function buildWordBoundaryMap(text: string) {
  const matches = Array.from(text.matchAll(/\S+/g));
  return matches.map((match, index) => ({
    index,
    start: match.index || 0,
    end: (match.index || 0) + match[0].length,
  }));
}

function estimateSpeechDurationMs(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1800, Math.round((words / 145) * 60_000));
}

function countWords(text: string) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function HighlightedReadAloudText({ text, activeWordIndex }: { text: string; activeWordIndex: number }) {
  const parts = String(text || "").match(/\S+|\s+/g) || [];
  let wordIndex = -1;
  return (
    <>
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) return <span key={`${part}-${index}`}>{part}</span>;
        wordIndex += 1;
        return (
          <span
            key={`${part}-${index}`}
            className={wordIndex === activeWordIndex ? "rounded bg-yellow-200 px-0.5 font-semibold text-slate-950" : ""}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

function buildTutorSpeechText(latest: any) {
  const artifacts = latest?.artifacts || {};
  const miniLesson = artifacts?.miniLesson;
  const nextSteps = Array.isArray(artifacts?.nextSteps) ? artifacts.nextSteps : [];
  const parts = [
    latest?.response,
    miniLesson?.title,
    miniLesson?.explanation,
    miniLesson?.workedExample ? `Example: ${miniLesson.workedExample}` : "",
    nextSteps.length ? `Next steps: ${nextSteps.join(". ")}` : "",
  ];
  return parts.filter((part) => typeof part === "string" && part.trim()).join(". ");
}

function TutorArtifacts({ artifacts, latestIntent, latestMessage }: { artifacts: any; latestIntent?: string; latestMessage?: string }) {
  const miniLesson = artifacts?.miniLesson;
  const practiceQuestions = artifacts?.practiceQuestions || artifacts?.miniTest || [];
  const tdaFeedback = artifacts?.tdaFeedback;
  const nextSteps = artifacts?.nextSteps || [];
  const isTdaMode = latestIntent === "TDA_SUPPORT" || /\btda\b|essay|rubric|writing|draft/i.test(String(latestMessage || ""));
  if (!miniLesson && !practiceQuestions.length && !(tdaFeedback && isTdaMode) && !nextSteps.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {tdaFeedback && isTdaMode ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-amber-200">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-900">TDA Practice Feedback</h4>
            {tdaFeedback.score ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{tdaFeedback.score}/4</span> : null}
            {tdaFeedback.performanceBand ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{tdaFeedback.performanceBand}</span> : null}
          </div>
          <p className="mt-2 text-sm text-slate-700">{tdaFeedback.feedback}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Strengths</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(tdaFeedback.strengths || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Areas for Growth</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(tdaFeedback.areasForGrowth || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </article>
      ) : null}

      {miniLesson ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">{miniLesson.title}</h4>
          <p className="mt-2 text-sm text-slate-700">{miniLesson.explanation}</p>
          <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Example:</span> {miniLesson.workedExample}</p>
        </article>
      ) : null}

      {practiceQuestions.length ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">Practice</h4>
          <div className="mt-3 space-y-3">
            {practiceQuestions.slice(0, 5).map((question: any, index: number) => (
              <details key={`${question.question}-${index}`} className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">{index + 1}. {question.question}</summary>
                {Array.isArray(question.choices) ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{question.choices.map((choice: string) => <li key={choice}>{choice}</li>)}</ul> : null}
                <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Answer:</span> {question.correctAnswer}</p>
                <p className="mt-1 text-sm text-slate-600">{question.explanation}</p>
              </details>
            ))}
          </div>
        </article>
      ) : null}

      {nextSteps.length ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">Next Steps</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {nextSteps.map((step: string) => <li key={step}>{step}</li>)}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
