"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuddyCharacter, type BuddyState } from "@/components/literacy/BuddyCharacter";
import { getTtsProvider } from "@/lib/voice/tts";
import { recordLessonPlayerEvent } from "@/app/student/practice/actions";
import { startAudioCapture, stopAudioCapture, type AudioCaptureState } from "@/lib/voice/audioCapture";
import {
  startVoiceActivity,
  stopVoiceActivity,
  VOICE_ACTIVITY_MAX_LISTEN_MS,
  type VoiceActivityHandle,
} from "@/lib/voice/voiceActivity";
import type { LessonPlayerData, LessonPlayerPart } from "./lessonPlayerData";

const PART_META = [
  { icon: "Fire", short: "Warm", mode: "listen for attempt", evidence: "heard speech / completion only" },
  { icon: "Spark", short: "Rule", mode: "teaching", evidence: "no score" },
  { icon: "Words", short: "Words", mode: "read and retry", evidence: "speech attempt" },
  { icon: "Heart", short: "Power", mode: "listen and repeat", evidence: "not scored" },
  { icon: "Read", short: "Sent.", mode: "listen and encourage", evidence: "completion only" },
  { icon: "Spell", short: "Spell", mode: "spelling match", evidence: "typed/tile" },
  { icon: "Story", short: "Story", mode: "listen and encourage", evidence: "completion only" },
  { icon: "Talk", short: "Talk", mode: "open response", evidence: "no auto-grade" },
];

const KID_FACING_PART_TITLES: Record<number, string> = {
  1: "Warm-up",
  2: "New thing to learn",
  3: "Read the words",
  4: "Power words",
  5: "Read sentences",
  6: "Spell it",
  7: "Read the story",
  8: "Talk about it",
};

type CompletedState = Record<number, boolean>;
type LessonPlayerEventType =
  | "LESSON_STARTED"
  | "LESSON_STEP_COMPLETED"
  | "LESSON_COMPLETED"
  | "VOICE_WORD_READ"
  | "VOICE_MISCUE_DETECTED";

type LessonPlayerEventInput = {
  eventType: LessonPlayerEventType;
  sessionId: string;
  partNumber: number | null;
  targetCode: string;
  extra?: Record<string, unknown>;
  response?: Record<string, unknown>;
  durationMs?: number;
  immediateOutcome?: string;
};

export function StudentPracticeSession({ lesson }: { lesson: LessonPlayerData }) {
  if (lesson.enabled === false) return <DisabledPractice targetCode={lesson.targetCode} reason={lesson.disabledReason} />;
  return <GeneratedLessonPlayer lesson={lesson} />;
}

function GeneratedLessonPlayer({ lesson }: { lesson: LessonPlayerData & { enabled: true } }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<CompletedState>({});
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [speech, setSpeech] = useState(() => speechForPart(lesson.parts[0]));
  const [eventLines, setEventLines] = useState<string[]>([]);
  const [sessionId] = useState(() => `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const startedRef = useRef(false);
  const [, startTransition] = useTransition();
  const activePart = lesson.parts[activeIndex];
  const meta = PART_META[activePart.partNumber - 1] ?? PART_META[0];

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    emitLessonEvent({
      eventType: "LESSON_STARTED",
      sessionId,
      partNumber: null,
      targetCode: lesson.targetCode,
    });
    setEventLines((lines) => [...lines, `LESSON_STARTED · ${lesson.targetCode}`]);
  }, [lesson.targetCode, sessionId]);

  useEffect(() => {
    setSpeech(speechForPart(activePart));
  }, [activePart]);

  function emitLessonEvent(input: LessonPlayerEventInput) {
    startTransition(() => {
      void recordLessonPlayerEvent(input);
    });
  }

  async function speak(text = speech) {
    setBuddyState("speaking");
    try {
      await getTtsProvider().speak(text);
    } catch {
      // Browser speech may be unavailable; the visible text remains the source of truth.
    } finally {
      setBuddyState("idle");
    }
  }

  function selectPart(index: number) {
    setActiveIndex(index);
    setEventLines((lines) => [...lines, `VIEW_PART_${index + 1}`]);
  }

  function completePart(extra?: Record<string, unknown>) {
    const partNumber = activePart.partNumber;
    setCompleted((state) => ({ ...state, [partNumber]: true }));
    emitLessonEvent({
      eventType: "LESSON_STEP_COMPLETED",
      sessionId,
      partNumber,
      targetCode: lesson.targetCode,
      extra,
    });
    setEventLines((lines) => [...lines, `LESSON_STEP_COMPLETED · part=${partNumber}`]);
    if (activeIndex < lesson.parts.length - 1) {
      selectPart(activeIndex + 1);
    } else {
      emitLessonEvent({ eventType: "LESSON_COMPLETED", sessionId, partNumber: null, targetCode: lesson.targetCode });
      setEventLines((lines) => [...lines, "LESSON_COMPLETED"]);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6efe7] px-3 py-4 text-slate-900 md:px-5">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[104px_minmax(0,1fr)_292px]">
        <aside className="rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-3 shadow-xl lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="mb-3 grid place-items-center gap-2 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 text-xl font-black">Rb</div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-900">Reading Buddy</p>
          </div>
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {lesson.parts.map((part, index) => (
              <button
                key={part.partNumber}
                onClick={() => selectPart(index)}
                className={`min-h-14 min-w-16 rounded-2xl border-2 px-2 py-2 text-center shadow-sm transition ${
                  index === activeIndex
                    ? "border-amber-300 bg-amber-100 text-amber-950"
                    : completed[part.partNumber]
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-transparent bg-white text-slate-600"
                }`}
              >
                <span className="block text-[10px] font-black uppercase">{PART_META[index]?.short}</span>
                <span className="block text-lg font-black">{part.partNumber}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-4 shadow-xl md:flex-row md:items-center md:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900">
                Target: {lesson.targetCode} · {lesson.dailyTargetLabel}
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{lesson.title}</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Full 8-part structured literacy lesson · generated content-v3 data</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => speak()} className="rounded-2xl border border-[#e8d9c7] bg-white px-4 py-3 text-sm font-black text-amber-950">
                Replay Harper
              </button>
              <button onClick={() => completePart()} className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-amber-950 shadow">
                Done with this part
              </button>
            </div>
          </div>

          <section className="grid min-h-[650px] overflow-hidden rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 shadow-xl lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="border-b border-[#e8d9c7] bg-[#fff2cf] p-5 text-center lg:border-b-0 lg:border-r">
              <div className="mx-auto mb-4 flex justify-center">
                <BuddyCharacter state={buddyState} name="Harper" />
              </div>
              <div className="rounded-3xl border border-[#f1dfc8] bg-white p-4 text-left text-sm font-extrabold leading-relaxed text-[#4e3b2d]">
                {speech}
              </div>
              <div className="mt-4 rounded-3xl border border-dashed border-[#e6cda9] bg-white p-4 text-left text-xs font-black text-slate-600">
                <div className="flex justify-between py-1"><span>Mode</span><span>{meta.mode}</span></div>
                <div className="flex justify-between py-1"><span>Evidence</span><span>{meta.evidence}</span></div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{kidFacingPartTitle(activePart)}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{partDescription(activePart)}</p>
                </div>
                <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
                  Part {activePart.partNumber} · {meta.icon}
                </span>
              </div>

              <div className="flex flex-1 flex-col rounded-[26px] border border-[#efe1d2] bg-white p-5">
                <PartRenderer
                  part={activePart}
                  onSpeak={speak}
                  onComplete={completePart}
                  onHarperMessage={setSpeech}
                  onBuddyState={setBuddyState}
                  onVoiceEvent={(input) => {
                    emitLessonEvent({ ...input, sessionId, targetCode: lesson.targetCode });
                    setEventLines((lines) => [
                      ...lines,
                      `${input.eventType} · part=${input.partNumber} · ${input.immediateOutcome || "event"}`,
                    ]);
                  }}
                />
              </div>
            </div>
          </section>
        </section>

        <aside className="hidden rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3]/90 p-4 shadow-xl lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:flex-col lg:gap-4">
          <div>
            <h3 className="font-black">Adult controls</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">Support for a parent or tutor nearby.</p>
          </div>
          <div className="rounded-2xl border border-[#efe1d2] bg-white p-3 text-sm font-black">Harper retry only</div>
          <div className="rounded-2xl border border-[#efe1d2] bg-white p-3 text-sm font-black">Assisted mode available later</div>
          <div>
            <h3 className="mb-2 font-black">Evidence preview</h3>
            <pre className="min-h-40 overflow-auto rounded-2xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
              {eventLines.join("\n")}
            </pre>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PartRenderer({
  part,
  onSpeak,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onVoiceEvent,
}: {
  part: LessonPlayerPart;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onVoiceEvent: (input: Omit<LessonPlayerEventInput, "sessionId" | "targetCode">) => void;
}) {
  switch (part.partNumber) {
    case 1:
      return (
        <WarmupPart
          part={part}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 2:
      return <ConceptPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 3:
      return (
        <Part3LiveLoop
          part={part}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
          onVoiceEvent={onVoiceEvent}
        />
      );
    case 4:
      return <PowerWordsPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 5:
      return (
        <SentenceReadingPart
          part={part}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 6:
      return <SpellingPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 7:
      return (
        <StoryReadingPart
          part={part}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 8:
      return <TalkPart part={part} onComplete={onComplete} />;
    default:
      return <PlaceholderPart part={part} />;
  }
}

function WarmupPart({
  part,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
}) {
  const words = stringArray(part.contentJson.warmupWords);
  return (
    <ListenForReadingAttempt
      surface="warmup"
      words={words}
      intro="Tap each word and read it to Harper. Harper will listen for your voice."
      prompt="I'm listening — read it to me."
      encourage="Thanks — I heard you read that!"
      completeLabel="I read the warm-up words"
      completeDisabledLabel="Read each word to Harper first"
      onComplete={onComplete}
      onHarperMessage={onHarperMessage}
      onBuddyState={onBuddyState}
      onSpeak={onSpeak}
    />
  );
}

function ConceptPart({
  part,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
}) {
  const statement = stringValue(part.contentJson.kidRuleStatement) || stringValue(part.kidVisibleCopy.kidRuleStatement);
  const pairs = arrayOfRecords(part.contentJson.demonstrationPairs);
  const pairItems = pairs
    .map((pair, index) => {
      const before = stringValue(pair.closed) || stringValue(pair.base);
      const after = stringValue(pair.target);
      if (!before || !after) return null;
      return {
        id: `${before}-${after}-${index}`,
        label: `${before} → ${after}`,
        helper: index === 0 ? "Main pair" : "Practice pair",
        utterance: `${before}. ${after}.`,
      };
    })
    .filter((item): item is TappableItem => Boolean(item));
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 text-xl font-black leading-relaxed">{statement}</div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <DemoCard label="Before" word={stringValue(pairs[0]?.closed) || stringValue(pairs[0]?.base) || "cap"} />
        <div className="text-center text-3xl font-black text-amber-700">to</div>
        <DemoCard label="Silent e word" word={stringValue(pairs[0]?.target) || "cape"} />
      </div>
      <TappableItemPractice
        items={pairItems}
        onSpeak={onSpeak}
        completeLabel="I practiced it"
        completeDisabledLabel="Tap each pair first"
        onComplete={(heardCount) => onComplete({ listenedToRule: true, heardPairs: heardCount })}
      />
      <div className="flex flex-wrap gap-3">
        <button onClick={() => onSpeak(statement)} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
          Listen again
        </button>
      </div>
    </div>
  );
}

type Part3WordEntry = {
  word: string;
  lineNumber: number;
  lineRole: string;
  index: number;
};

type Part3Status = "pending" | "correct" | "retry" | "reteach" | "assisted" | "unscored";

function Part3LiveLoop({
  part,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
  onVoiceEvent,
}: {
  part: LessonPlayerPart;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
  onVoiceEvent: (input: Omit<LessonPlayerEventInput, "sessionId" | "targetCode">) => void;
}) {
  const lines = useMemo(() => arrayOfRecords(part.contentJson.contrastiveLines), [part.contentJson.contrastiveLines]);
  const realEntries = useMemo<Part3WordEntry[]>(
    () =>
      lines
        .filter((line) => stringValue(line.role) !== "target_pseudowords")
        .flatMap((line) =>
          stringArray(line.words).map((word) => ({
            word,
            lineNumber: Number(line.lineNumber) || 0,
            lineRole: stringValue(line.role) || "word_line",
          })),
        )
        .map((entry, index) => ({ ...entry, index })),
    [lines],
  );
  const pseudowordLine = useMemo(
    () => lines.find((line) => stringValue(line.role) === "target_pseudowords"),
    [lines],
  );
  const pseudowords = stringArray(pseudowordLine?.words);
  const reteachTemplate =
    stringValue(part.contentJson.reteachPrompt) ||
    stringValue(part.kidVisibleCopy.reteachPrompt) ||
    "Look carefully at the word. Try again: {word}.";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, Part3Status>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [technicalFailures, setTechnicalFailures] = useState<Record<string, number>>({});
  const [, setFeedback] = useState("Tap the highlighted word when you are ready. Harper will listen to one word at a time.");
  const [wordFeedback, setWordFeedback] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [pseudowordsConfirmed, setPseudowordsConfirmed] = useState(false);
  const [pseudowordAttemptMeta, setPseudowordAttemptMeta] = useState<Record<string, unknown> | null>(null);
  const captureRef = useRef<AudioCaptureState | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartInFlightRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const currentWord = realEntries[currentIndex];
  const isRateLimited = rateLimitedUntil !== null && Date.now() < rateLimitedUntil;
  const readDisabled = thinking || recordingStartInFlightRef.current || requestInFlightRef.current || isRateLimited || !currentWord;
  const allRealWordsComplete = currentIndex >= realEntries.length;

  useEffect(() => {
    if (!rateLimitedUntil) return;
    const delay = Math.max(0, rateLimitedUntil - Date.now());
    const timer = window.setTimeout(() => setRateLimitedUntil(null), delay);
    return () => window.clearTimeout(timer);
  }, [rateLimitedUntil]);

  useEffect(() => {
    return () => {
      if (captureRef.current) {
        stopAudioCapture(captureRef.current);
        captureRef.current = null;
      }
    };
  }, []);

  async function beginRecording() {
    if (readDisabled || !currentWord) return;
    recordingStartInFlightRef.current = true;
    chunksRef.current = [];
    setShowFallback(false);
    setFeedback(`Read ${currentWord.word}.`);
    setChipFeedback(currentWord, "I'm listening. Tap this word again when you are done.");
    onHarperMessage(`Read ${currentWord.word}.`);
    onBuddyState("listening");
    try {
      captureRef.current = await startAudioCapture((chunk) => {
        chunksRef.current.push(chunk);
      });
      setRecording(true);
    } catch {
      handleTechnicalFailure(currentWord, "I had trouble hearing that. Let's try once more.", "transcribe_error_retry");
    } finally {
      recordingStartInFlightRef.current = false;
    }
  }

  async function stopAndScore() {
    if (!recording || !captureRef.current || !currentWord || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setRecording(false);
    setThinking(true);
    onBuddyState("listening");
    const capture = captureRef.current;
    captureRef.current = null;
    stopAudioCapture(capture);
    await waitForRecorderFlush();
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    if (!blob.size) {
      requestInFlightRef.current = false;
      setThinking(false);
      handleTechnicalFailure(currentWord, "I had trouble hearing that. Let's try once more.", "transcribe_error_retry");
      return;
    }

    const startedAt = Date.now();
    try {
      const form = new FormData();
      form.set("audio", new File([blob], `${currentWord.word}.webm`, { type: blob.type || "audio/webm" }));
      form.set("model", "gpt-4o-transcribe");
      form.set("expectedText", currentWord.word);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form, signal: controller.signal });
      window.clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;

      if (response.status === 429) {
        const retrySeconds = retryAfterSeconds(response.headers.get("Retry-After"));
        const retryUntil = Date.now() + retrySeconds * 1000;
        setRateLimitedUntil(retryUntil);
        setFeedback("Let's take a quick pause. I'll be ready in a moment.");
        setChipFeedback(currentWord, "Let's take a quick pause. Harper will be ready in a moment.");
        onHarperMessage("Let's take a quick pause. I'll be ready in a moment.");
        onVoiceEvent({
          eventType: "VOICE_WORD_READ",
          partNumber: 3,
          immediateOutcome: "transcribe_rate_limited",
          durationMs,
          extra: voiceContext(currentWord, attempts[currentWord.word] || 0, { retryAfterSeconds: retrySeconds }),
          response: { scaffoldStep: "rate_limited", scoringMode: "unscored" },
        });
        return;
      }

      if (!response.ok) {
        handleTechnicalFailure(currentWord, "I had trouble hearing that. Let's try once more.", "transcribe_error_retry", durationMs);
        return;
      }

      const result = (await response.json()) as {
        transcript?: unknown;
        confidenceProxy?: unknown;
        uncertaintyScore?: unknown;
        model?: unknown;
        latencyMs?: unknown;
      };
      const rawTranscript = stringValue(result.transcript);
      if (!rawTranscript.trim()) {
        handleTechnicalFailure(currentWord, "I had trouble hearing that. Let's try once more.", "transcribe_error_retry", durationMs);
        return;
      }

      scoreTranscript(currentWord, rawTranscript, durationMs, {
        confidenceProxy: typeof result.confidenceProxy === "number" ? result.confidenceProxy : null,
        uncertaintyScore: typeof result.uncertaintyScore === "number" ? result.uncertaintyScore : null,
        model: stringValue(result.model) || "gpt-4o-transcribe",
        latencyMs: typeof result.latencyMs === "number" ? result.latencyMs : null,
      });
    } catch {
      handleTechnicalFailure(currentWord, "I had trouble hearing that. Let's try once more.", "transcribe_error_retry");
    } finally {
      requestInFlightRef.current = false;
      setThinking(false);
      onBuddyState("idle");
    }
  }

  function scoreTranscript(
    entry: Part3WordEntry,
    rawTranscript: string,
    durationMs: number,
    metadata: { confidenceProxy: number | null; uncertaintyScore: number | null; model: string; latencyMs: number | null },
  ) {
    const attemptNumber = (attempts[entry.word] || 0) + 1;
    setAttempts((state) => ({ ...state, [entry.word]: attemptNumber }));
    const normalizedTranscript = normalize(rawTranscript);
    const normalizedTarget = normalize(entry.word);
    const lowConfidence = metadata.confidenceProxy !== null && metadata.confidenceProxy < 0.55;
    const baseContext = voiceContext(entry, attemptNumber, metadata);
    const baseResponse = {
      rawTranscript,
      normalizedTranscript,
      scaffoldStep: "speech_match",
      scoringMode: "independent",
      independentScoreEligible: true,
    };

    if (normalizedTranscript === normalizedTarget && !lowConfidence) {
      const message = `Nice reading — that was ${entry.word}!`;
      setStatuses((state) => ({ ...state, [entryKey(entry)]: "correct" }));
      setFeedback(message);
      setChipFeedback(entry, message);
      onHarperMessage(message);
      onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "CORRECT",
        durationMs,
        extra: { ...baseContext, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "correct" },
      });
      advanceFrom(entry);
      return;
    }

    if (attemptNumber <= 1 || lowConfidence) {
      const message = "Read that one more time for me.";
      setStatuses((state) => ({ ...state, [entryKey(entry)]: "retry" }));
      setFeedback(message);
      setChipFeedback(entry, message);
      onHarperMessage(message);
      onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "retry_prompted",
        durationMs,
        extra: { ...baseContext, lowConfidence, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "retry_prompted" },
      });
      return;
    }

    if (attemptNumber === 2) {
      const message = reteachTemplate.replace(/\{word\}/g, entry.word);
      setStatuses((state) => ({ ...state, [entryKey(entry)]: "reteach" }));
      setFeedback(message);
      setChipFeedback(entry, message);
      onHarperMessage(message);
      onVoiceEvent({
        eventType: "VOICE_WORD_READ",
        partNumber: 3,
        immediateOutcome: "retry_prompted",
        durationMs,
        extra: { ...baseContext, expectedText: entry.word },
        response: { ...baseResponse, scaffoldStep: "rule_reteach" },
      });
      onVoiceEvent({
        eventType: "VOICE_MISCUE_DETECTED",
        partNumber: 3,
        immediateOutcome: "INCORRECT",
        extra: { ...baseContext, expectedText: entry.word, feedbackBranch: "rule_reteach" },
        response: { rawTranscript, normalizedTranscript, scaffoldStep: "rule_reteach", scoringMode: "independent" },
      });
      return;
    }

    void assistAndAdvance(entry, durationMs, baseContext, rawTranscript, normalizedTranscript);
  }

  async function assistAndAdvance(
    entry: Part3WordEntry,
    durationMs: number,
    context: Record<string, unknown>,
    rawTranscript: string,
    normalizedTranscript: string,
  ) {
    const message = `Listen: ${entry.word}. Now you try.`;
    setStatuses((state) => ({ ...state, [entryKey(entry)]: "assisted" }));
    setFeedback(message);
    setChipFeedback(entry, message);
    onHarperMessage(message);
    onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "INCORRECT",
      durationMs,
      extra: { ...context, expectedText: entry.word, assisted: true },
      response: {
        rawTranscript,
        normalizedTranscript,
        scaffoldStep: "assisted_advance",
        scoringMode: "assisted",
        independentScoreEligible: false,
      },
    });
    await onSpeak(message);
    advanceFrom(entry);
  }

  function handleTechnicalFailure(entry: Part3WordEntry, message: string, immediateOutcome: string, durationMs?: number) {
    const nextFailures = (technicalFailures[entry.word] || 0) + 1;
    setTechnicalFailures((state) => ({ ...state, [entry.word]: nextFailures }));
    setFeedback(message);
    setChipFeedback(entry, message);
    onHarperMessage(message);
    onBuddyState("idle");
    onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome,
      durationMs,
      extra: voiceContext(entry, attempts[entry.word] || 0, { technicalFailureCount: nextFailures }),
      response: { scaffoldStep: "technical_retry", scoringMode: "unscored" },
    });
    if (nextFailures >= 2) setShowFallback(true);
  }

  function adultSupportAdvance() {
    if (!currentWord) return;
    setStatuses((state) => ({ ...state, [entryKey(currentWord)]: "unscored" }));
    setFeedback("Thanks for reading with your adult. Let's keep going.");
    setChipFeedback(currentWord, "Thanks for reading with your adult. Let's keep going.");
    onHarperMessage("Thanks for reading with your adult. Let's keep going.");
    onVoiceEvent({
      eventType: "VOICE_WORD_READ",
      partNumber: 3,
      immediateOutcome: "SKIPPED",
      extra: voiceContext(currentWord, attempts[currentWord.word] || 0, { fallback: "adult_support" }),
      response: { scaffoldStep: "adult_support_fallback", scoringMode: "unscored", independentScoreEligible: false },
    });
    advanceFrom(currentWord);
  }

  function advanceFrom(entry: Part3WordEntry) {
    setShowFallback(false);
    setCurrentIndex((index) => Math.max(index, entry.index + 1));
  }

  function confirmPseudowords(extra?: Record<string, unknown>) {
    setPseudowordsConfirmed(true);
    setPseudowordAttemptMeta(extra ?? null);
    setFeedback("Nice work with the silly words.");
    onHarperMessage("Nice work with the silly words.");
  }

  function setChipFeedback(entry: Part3WordEntry, message: string) {
    setWordFeedback((state) => ({ ...state, [entryKey(entry)]: message }));
  }

  function wordChipInstruction() {
    if (recording) return "Harper is listening. Tap the word again when you are done.";
    if (thinking) return "Harper is thinking about that word.";
    if (isRateLimited) return "Harper is taking a quick pause before the next try.";
    if (allRealWordsComplete) return "Nice word reading. Now try the silly words with your adult.";
    return "Tap the highlighted word to read it to Harper.";
  }

  function handleWordChipTap(entry: Part3WordEntry) {
    if (recordingStartInFlightRef.current) return;
    if (entry.index !== currentIndex) return;
    if (recording) {
      void stopAndScore();
      return;
    }
    void beginRecording();
  }

  const completedRealCount = Object.values(statuses).filter((status) => ["correct", "assisted", "unscored"].includes(status)).length;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-blue-100 bg-blue-50 p-4 text-base font-black leading-relaxed text-blue-950">
        {wordChipInstruction()}
      </div>
      <div className="grid gap-3">
        {lines.filter((line) => stringValue(line.role) !== "target_pseudowords").map((line) => {
          const role = stringValue(line.role);
          const words = stringArray(line.words);
          return (
            <div key={`${line.lineNumber}-${role}`} className="rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Line {String(line.lineNumber)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => {
                  const realEntry = realEntries.find((entry) => entry.lineNumber === Number(line.lineNumber) && entry.word === word && entry.index >= index);
                  const status = realEntry ? statuses[entryKey(realEntry)] : undefined;
                  const isCurrent = realEntry?.index === currentIndex && !allRealWordsComplete;
                  const processing = Boolean(isCurrent && (recording || thinking || requestInFlightRef.current));
                  const disabled = !realEntry || (!isCurrent && status !== "correct" && status !== "assisted" && status !== "unscored") || (isCurrent && readDisabled && !recording);
                  const chipFeedback = realEntry ? wordFeedback[entryKey(realEntry)] : "";
                  return (
                    <button
                      key={`${role}-${word}-${index}`}
                      onClick={() => realEntry && handleWordChipTap(realEntry)}
                      disabled={disabled}
                      className={`rounded-2xl border-2 px-4 py-3 text-2xl font-black ${
                        status === "correct"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : status === "retry" || status === "reteach"
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : status === "assisted" || status === "unscored"
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : isCurrent
                                ? "border-violet-300 bg-violet-50 text-violet-900"
                                : "border-[#ead9c2] bg-white text-slate-900"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span className="block">{word}</span>
                      {isCurrent ? (
                        <span className="mt-1 block text-xs font-black uppercase tracking-wide">
                          {recording ? "tap when done" : thinking ? "checking" : "tap to read"}
                        </span>
                      ) : null}
                      {processing ? <span className="mt-1 block text-xs font-black text-violet-700">Harper is listening</span> : null}
                      {chipFeedback ? <span className="mt-2 block max-w-[15rem] text-sm font-extrabold normal-case leading-snug">{chipFeedback}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!allRealWordsComplete ? (
        <div className="rounded-3xl border border-[#efe1d2] bg-[#fffdf8] p-4">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">Current word</p>
          <p className="mt-1 text-2xl font-black text-slate-700">Use the highlighted word chip above. The word is the read button.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {showFallback ? (
              <button onClick={adultSupportAdvance} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
                I read it with my adult
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-violet-100 bg-violet-50 p-5">
          <h3 className="text-2xl font-black">Now the silly words</h3>
          <p className="mt-2 font-bold text-violet-900">
            Sound out each silly word and read it to Harper. Harper will listen for your try. She won't say silly words for you; they are just for trying.
          </p>
          <div className="mt-4 rounded-3xl bg-white p-4">
            <ListenForReadingAttempt
              surface="pseudoword"
              words={pseudowords}
              intro="Sound out each silly word and read it to Harper. Harper will listen for your try."
              prompt="I'm listening — sound it out for me."
              encourage="Thanks — I heard your try!"
              completeLabel="We read the silly words"
              completeDisabledLabel="Read each silly word to Harper first"
              onComplete={confirmPseudowords}
              onHarperMessage={onHarperMessage}
              onBuddyState={onBuddyState}
              onSpeak={onSpeak}
              speakEncouragement
            />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-500">
          Real words complete: {completedRealCount}/{realEntries.length}
        </p>
        <button
          onClick={() => onComplete({ realWordsComplete: completedRealCount, pseudowordsConfirmed, pseudowordAttemptMeta })}
          disabled={!allRealWordsComplete || !pseudowordsConfirmed}
          className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done with word lines
        </button>
      </div>
    </div>
  );
}

function PowerWordsPart({
  part,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
}) {
  const heartWords = stringArray(part.contentJson.heartWords);
  const vocabularyWords = arrayOfRecords(part.contentJson.vocabularyWords).map((entry) => stringValue(entry.word)).filter(Boolean);
  const allWords = [...heartWords.map((word) => ({ word, kind: "Power word" })), ...vocabularyWords.map((word) => ({ word, kind: "Story word" }))];
  const wordItems = allWords.map(({ word, kind }) => ({
    id: `${kind}-${word}`,
    label: word,
    helper: kind,
    utterance: `${word}.`,
  }));
  return (
    <div className="flex flex-1 flex-col gap-5">
      <TappableItemPractice
        items={wordItems}
        onSpeak={onSpeak}
        completeLabel="I know these"
        completeDisabledLabel="Tap each word first"
        onComplete={(heardCount) => onComplete({ heardWords: heardCount })}
      />
    </div>
  );
}

type TappableItem = {
  id: string;
  label: string;
  helper: string;
  utterance: string;
};

function TappableItemPractice({
  items,
  onSpeak,
  completeLabel,
  completeDisabledLabel,
  onComplete,
}: {
  items: TappableItem[];
  onSpeak: (text: string) => Promise<void>;
  completeLabel: string;
  completeDisabledLabel: string;
  onComplete: (heardCount: number) => void;
}) {
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const heardCount = items.filter((item) => heard[item.id]).length;
  const allHeard = items.length > 0 && heardCount === items.length;

  async function hearItem(item: TappableItem) {
    setHeard((state) => ({ ...state, [item.id]: true }));
    await onSpeak(item.utterance);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => hearItem(item)}
            className={`rounded-3xl border-2 p-5 text-center transition ${
              heard[item.id] ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-[#ead9c2] bg-[#fffdf8] text-slate-950"
            }`}
          >
            <span className="block text-3xl font-black">{item.label}</span>
            <span className="mt-2 inline-block rounded-full bg-white px-2 py-1 text-xs font-black text-amber-800">
              {heard[item.id] ? "Heard" : item.helper}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#ead9c2] bg-white px-3 py-2 text-xs font-black text-slate-600">
          Heard {heardCount}/{items.length}
        </span>
        <button
          onClick={() => onComplete(heardCount)}
          disabled={!allHeard}
          className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allHeard ? completeLabel : completeDisabledLabel}
        </button>
      </div>
    </div>
  );
}

type ListenAttemptStatus = "idle" | "listening" | "heard" | "tryAgain" | "fallback";

/**
 * Gates on hearing a speech attempt, not correctness. Local VAD cannot tell which word
 * was read, whether it was accurate, or who spoke; it only confirms audible speech.
 */
function ListenForReadingAttempt({
  surface,
  words,
  intro,
  prompt,
  encourage,
  completeLabel,
  completeDisabledLabel,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
  speakEncouragement = true,
}: {
  surface: "warmup" | "pseudoword";
  words: string[];
  intro: string;
  prompt: string;
  encourage: string;
  completeLabel: string;
  completeDisabledLabel: string;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
  speakEncouragement?: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<string, ListenAttemptStatus>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [messageByWord, setMessageByWord] = useState<Record<string, string>>({});
  const [fallbackAccepted, setFallbackAccepted] = useState<Record<string, boolean>>({});
  const [micUnavailable, setMicUnavailable] = useState(false);
  const activeWordRef = useRef<string | null>(null);
  const voiceActivityRef = useRef<VoiceActivityHandle | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const speakPromiseRef = useRef<Promise<void> | null>(null);

  const doneWords = words.filter((word) => statuses[word] === "heard" || fallbackAccepted[word]);
  const allDone = words.length > 0 && doneWords.length === words.length;
  const fallbackWords = words.filter((word) => fallbackAccepted[word]);
  const vadConfirmedWords = words.filter((word) => statuses[word] === "heard" && !fallbackAccepted[word]);

  useEffect(() => {
    return () => {
      stopActiveListening();
      speakPromiseRef.current = null;
      onBuddyState("idle");
    };
  }, [onBuddyState]);

  async function handleWordTap(word: string) {
    if (startingRef.current) return;
    if (fallbackAccepted[word] || statuses[word] === "heard") return;
    if (activeWordRef.current === word && voiceActivityRef.current) {
      await stopEarly(word);
      return;
    }
    if (voiceActivityRef.current) return;
    startingRef.current = true;
    if (speakPromiseRef.current) {
      await speakPromiseRef.current.catch(() => undefined);
      speakPromiseRef.current = null;
    }
    await cooldownAfterSpeech();
    onHarperMessage(prompt);
    onBuddyState("listening");
    setStatuses((state) => ({ ...state, [word]: "listening" }));
    setMessageByWord((state) => ({ ...state, [word]: prompt }));
    setAttempts((state) => ({ ...state, [word]: (state[word] ?? 0) + 1 }));
    activeWordRef.current = word;
    try {
      const handle = await startVoiceActivity();
      voiceActivityRef.current = handle;
      pollTimerRef.current = window.setInterval(() => {
        if (handle.heardSpeech()) void completeHeard(word);
      }, 100);
      timeoutRef.current = window.setTimeout(() => {
        void markTryAgain(word, "I did not hear your voice yet. Try that one again.");
      }, VOICE_ACTIVITY_MAX_LISTEN_MS);
    } catch {
      setMicUnavailable(true);
      showFallback(word, "I could not use the microphone. You can read it with your adult and tap confirm.");
    } finally {
      startingRef.current = false;
    }
  }

  async function stopEarly(word: string) {
    const handle = voiceActivityRef.current;
    if (handle?.heardSpeech()) {
      await completeHeard(word);
    } else {
      await markTryAgain(word, "Try that one again so Harper can hear your voice.");
    }
  }

  async function completeHeard(word: string) {
    stopActiveListening();
    setStatuses((state) => ({ ...state, [word]: "heard" }));
    setMessageByWord((state) => ({ ...state, [word]: encourage }));
    onHarperMessage(encourage);
    onBuddyState("idle");
    if (speakEncouragement) {
      const promise = onSpeak(encourage)
        .catch(() => undefined)
        .finally(() => {
          if (speakPromiseRef.current === promise) speakPromiseRef.current = null;
        });
      speakPromiseRef.current = promise;
      await promise;
    }
  }

  async function markTryAgain(word: string, text: string) {
    stopActiveListening();
    const nextAttempts = (attempts[word] ?? 0) + 1;
    if (nextAttempts >= 3) {
      showFallback(word, "You can read it with your adult and tap confirm.");
      return;
    }
    setStatuses((state) => ({ ...state, [word]: "tryAgain" }));
    setMessageByWord((state) => ({ ...state, [word]: text }));
    onHarperMessage(text);
    onBuddyState("idle");
  }

  function showFallback(word: string, text: string) {
    stopActiveListening();
    setStatuses((state) => ({ ...state, [word]: "fallback" }));
    setMessageByWord((state) => ({ ...state, [word]: text }));
    onHarperMessage(text);
    onBuddyState("idle");
  }

  function acceptFallback(word: string) {
    stopActiveListening();
    setFallbackAccepted((state) => ({ ...state, [word]: true }));
    setStatuses((state) => ({ ...state, [word]: "heard" }));
    setMessageByWord((state) => ({ ...state, [word]: "Thanks for reading it with your adult." }));
  }

  function finish() {
    onComplete({
      surface,
      vadConfirmedWords: vadConfirmedWords.length,
      fallbackWords: fallbackWords.length,
      totalWords: words.length,
    });
  }

  function stopActiveListening() {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    pollTimerRef.current = null;
    timeoutRef.current = null;
    stopVoiceActivity(voiceActivityRef.current);
    voiceActivityRef.current = null;
    activeWordRef.current = null;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-blue-100 bg-blue-50 p-4 text-base font-black leading-relaxed text-blue-950">
        {intro}
        <span className="mt-2 block text-sm font-extrabold text-blue-800">
          Heard {doneWords.length}/{words.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {words.map((word) => {
          const status = statuses[word] ?? "idle";
          const fallbackVisible = status === "fallback" || micUnavailable || (attempts[word] ?? 0) >= 3;
          const listening = status === "listening";
          const done = status === "heard" || fallbackAccepted[word];
          return (
            <div
              key={word}
              className={`rounded-3xl border-2 p-3 ${
                done
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : status === "tryAgain" || status === "fallback"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : listening
                      ? "border-blue-300 bg-blue-50 text-blue-900"
                      : "border-[#ead9c2] bg-[#fffdf8] text-slate-950"
              }`}
            >
              <button
                onClick={() => handleWordTap(word)}
                disabled={done || Boolean(activeWordRef.current && activeWordRef.current !== word)}
                className="w-full rounded-2xl bg-white/70 px-4 py-4 text-center text-3xl font-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="block">{word}</span>
                <span className="mt-1 block text-xs font-black uppercase tracking-wide">
                  {done ? "✓ heard" : listening ? "tap to stop" : status === "tryAgain" ? "try again" : "tap to read"}
                </span>
              </button>
              {messageByWord[word] ? <p className="mt-2 text-sm font-extrabold leading-snug">{messageByWord[word]}</p> : null}
              {fallbackVisible && !done ? (
                <button
                  onClick={() => acceptFallback(word)}
                  className="mt-3 w-full rounded-2xl border border-[#e8d9c7] bg-white px-3 py-2 text-sm font-black"
                >
                  I read it with my adult
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        onClick={finish}
        disabled={!allDone}
        className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 text-lg font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {allDone ? completeLabel : completeDisabledLabel}
      </button>
    </div>
  );
}

function cooldownAfterSpeech() {
  return new Promise((resolve) => window.setTimeout(resolve, 250));
}

function SentenceReadingPart({
  part,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
}) {
  const sentences = stringArray(part.contentJson.sentences);
  const [reading, setReading] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    return () => onBuddyState("idle");
  }, [onBuddyState]);

  function beginReading() {
    setReading(true);
    setFinished(false);
    onBuddyState("listening");
    onHarperMessage("I'm listening. Read each sentence out loud when you are ready.");
  }

  async function finishReading() {
    setFinished(true);
    setReading(false);
    const message = "I loved listening to you read those sentences!";
    onHarperMessage(message);
    await onSpeak(message);
    onComplete({ listenAndEncourage: true, sentenceCount: sentences.length });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid gap-3">
        {sentences.map((sentence, index) => (
          <div key={`${sentence}-${index}`} className="rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Sentence {index + 1}</p>
            <p className="mt-2 text-2xl font-black leading-relaxed text-slate-950">{sentence}</p>
          </div>
        ))}
      </div>
      <div className={`rounded-3xl border-2 p-4 font-black ${reading ? "border-blue-200 bg-blue-50 text-blue-900" : "border-[#efe1d2] bg-white text-slate-700"}`}>
        {reading ? "Harper is listening while you read. Tap done when you finish." : "Tap start when you are ready to read the sentences."}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button onClick={beginReading} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
          Start reading
        </button>
        <button
          onClick={finishReading}
          disabled={!reading && !finished}
          className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done reading
        </button>
      </div>
    </div>
  );
}

function StoryReadingPart({
  part,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
}) {
  const title = stringValue(part.kidVisibleCopy.title) || "Story";
  const passage = stringValue(part.contentJson.passageText) || stringValue(part.kidVisibleCopy.passageText);
  const listenFirstAllowed = part.contentJson.listenFirstAllowed !== false;
  const readOnOwnAllowed = part.contentJson.readOnOwnAllowed !== false;
  const [mode, setMode] = useState<"idle" | "listening-first" | "reading">("idle");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    return () => onBuddyState("idle");
  }, [onBuddyState]);

  async function listenFirst() {
    if (!listenFirstAllowed) return;
    setMode("listening-first");
    setFinished(false);
    onHarperMessage("Listen first. Then you can read it on your own.");
    await onSpeak(passage);
    setMode("idle");
    onHarperMessage("Now you can read the story on your own when you are ready.");
  }

  function readOnOwn() {
    if (!readOnOwnAllowed) return;
    setMode("reading");
    setFinished(false);
    onBuddyState("listening");
    onHarperMessage("I'm listening. Read the story in your own voice.");
  }

  async function finishReading() {
    setFinished(true);
    setMode("idle");
    const message = "I loved listening to you read that!";
    onHarperMessage(message);
    await onSpeak(message);
    onComplete({ listenAndEncourage: true, connectedTextMode: "read_on_own" });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-5">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Story</p>
        <h3 className="mt-2 text-3xl font-black">{title}</h3>
        <p className="mt-4 whitespace-pre-wrap text-xl font-extrabold leading-relaxed text-slate-950">{passage}</p>
      </div>
      <div className={`rounded-3xl border-2 p-4 font-black ${mode === "reading" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-[#efe1d2] bg-white text-slate-700"}`}>
        {mode === "reading" ? "Harper is listening while you read. Tap done when you finish." : "Choose listen first, or read the story on your own."}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button
          onClick={listenFirst}
          disabled={!listenFirstAllowed || mode === "listening-first"}
          className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "listening-first" ? "Listening..." : "Listen first"}
        </button>
        <button
          onClick={readOnOwn}
          disabled={!readOnOwnAllowed}
          className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Read on my own
        </button>
        <button
          onClick={finishReading}
          disabled={mode !== "reading" && !finished}
          className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done reading
        </button>
      </div>
    </div>
  );
}

function SpellingPart({
  part,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
}) {
  const words = stringArray(part.contentJson.dictatedWords);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Record<string, boolean>>({});
  const target = words[index] || "";
  const letters = useMemo(() => letterTiles(target), [target]);
  const isCorrect = normalize(answer) === normalize(target);

  function check() {
    setResults((state) => ({ ...state, [target]: isCorrect }));
    if (index < words.length - 1) {
      setIndex(index + 1);
      setAnswer("");
    } else {
      onComplete({ spellingCorrect: Object.values({ ...results, [target]: isCorrect }).filter(Boolean).length, spellingTotal: words.length });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-blue-100 bg-blue-50 p-5 text-center">
        <p className="font-black text-blue-900">Harper says</p>
        <button onClick={() => onSpeak(target)} className="mt-2 rounded-2xl bg-white px-5 py-4 text-2xl font-black shadow-sm">
          Listen to word {index + 1}
        </button>
      </div>
      <input
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        className="rounded-2xl border-2 border-blue-100 px-4 py-4 text-center text-3xl font-black outline-none focus:border-blue-300"
        placeholder="type the word"
      />
      <div className="flex flex-wrap gap-2">
        {letters.map((letter, letterIndex) => (
          <button
            key={`${letter}-${letterIndex}`}
            onClick={() => setAnswer((value) => value + letter)}
            className="h-14 w-14 rounded-2xl border-2 border-amber-300 bg-amber-50 text-2xl font-black"
          >
            {letter}
          </button>
        ))}
        <button onClick={() => setAnswer("")} className="rounded-2xl border border-[#e8d9c7] bg-white px-4 py-3 font-black">Clear</button>
      </div>
      {answer ? (
        <div className={`rounded-2xl p-4 font-black ${isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {isCorrect ? "That matches." : "Keep building the word you hear."}
        </div>
      ) : null}
      <button onClick={check} className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
        Check spelling
      </button>
    </div>
  );
}

function TalkPart({ part, onComplete }: { part: LessonPlayerPart; onComplete: (extra?: Record<string, unknown>) => void }) {
  const questions = arrayOfRecords(part.contentJson.questions);
  const [responses, setResponses] = useState<Record<number, string>>({});
  return (
    <div className="flex flex-1 flex-col gap-4">
      {questions.map((question, index) => (
        <div key={`${question.question}-${index}`} className="rounded-3xl border-2 border-violet-100 bg-violet-50 p-4">
          <h3 className="text-xl font-black">{stringValue(question.question)}</h3>
          <textarea
            value={responses[index] || ""}
            onChange={(event) => setResponses((state) => ({ ...state, [index]: event.target.value }))}
            className="mt-3 min-h-24 w-full rounded-2xl border-2 border-violet-100 bg-white p-3 text-base font-bold outline-none focus:border-violet-300"
            placeholder="Type a quick note or tell your adult."
          />
        </div>
      ))}
      <button onClick={() => onComplete({ responseCount: Object.values(responses).filter((value) => value.trim()).length })} className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
        I talked about it
      </button>
    </div>
  );
}

function PlaceholderPart({ part }: { part: LessonPlayerPart }) {
  const preview = placeholderPreview(part);
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 text-center">
      <div className="mx-auto max-w-xl rounded-3xl border-2 border-dashed border-[#ead9c2] bg-[#fffdf8] p-6">
        <p className="text-sm font-black uppercase tracking-wide text-slate-500">Coming in the next lesson-player slice</p>
        <h3 className="mt-2 text-2xl font-black">{kidFacingPartTitle(part)}</h3>
        <p className="mt-3 text-base font-bold text-slate-600">{preview}</p>
      </div>
    </div>
  );
}

function DisabledPractice({ targetCode, reason }: { targetCode: string; reason?: string }) {
  return (
    <main className="min-h-screen bg-[#f6efe7] px-4 py-10">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3] p-8 shadow-xl">
        <BuddyCharacter state="idle" name="Harper" />
        <h1 className="mt-6 text-3xl font-black">This lesson is coming soon</h1>
        <p className="mt-3 text-lg font-bold text-slate-600">
          Harper has the first silent-e lesson ready. The {targetCode} lesson will turn on after its kid-facing rule copy is approved.
        </p>
        {reason ? <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">{reason}</p> : null}
      </section>
    </main>
  );
}

function DemoCard({ label, word }: { label: string; word: string }) {
  return (
    <div className="rounded-3xl border-2 border-[#e7d6c1] bg-[#fffdf8] p-6 text-center">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-5xl font-black">{word}</p>
    </div>
  );
}

function speechForPart(part: LessonPlayerPart) {
  if (part.partNumber === 2) return stringValue(part.contentJson.kidRuleStatement) || "Listen to the new thing with Harper.";
  return stringValue(part.kidVisibleCopy.directions) || stringValue(part.kidVisibleCopy.title) || part.partLabel;
}

function kidFacingPartTitle(part: LessonPlayerPart) {
  return KID_FACING_PART_TITLES[part.partNumber] || part.partLabel;
}

function partDescription(part: LessonPlayerPart) {
  if (part.partNumber === 3) return "Read the generated word lines with Harper.";
  if (part.partNumber === 5) return "Read the generated sentences with Harper listening.";
  if (part.partNumber === 7) return "Listen first or read the generated story on your own.";
  return stringValue(part.contentJson.skillFocus).replace(/_/g, " ") || "Generated lesson activity.";
}

function placeholderPreview(part: LessonPlayerPart) {
  if (part.partNumber === 3) {
    const lines = arrayOfRecords(part.contentJson.contrastiveLines);
    return lines.map((line) => stringArray(line.words).join(" ")).filter(Boolean).slice(0, 2).join(" / ");
  }
  if (part.partNumber === 5) return stringArray(part.contentJson.sentences).slice(0, 2).join(" ");
  if (part.partNumber === 7) return stringValue(part.contentJson.passageText).slice(0, 160);
  return "This part is generated and will be wired in a later slice.";
}

function entryKey(entry: Part3WordEntry) {
  return `${entry.lineNumber}:${entry.index}:${entry.word}`;
}

function retryAfterSeconds(value: string | null) {
  if (!value) return 5;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(60, Math.ceil(seconds));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.min(60, Math.max(1, Math.ceil((date - Date.now()) / 1000)));
  return 5;
}

function waitForRecorderFlush() {
  return new Promise((resolve) => window.setTimeout(resolve, 80));
}

function voiceContext(entry: Part3WordEntry, attemptNumber: number, extra?: Record<string, unknown>) {
  return {
    lineRole: entry.lineRole,
    lineNumber: entry.lineNumber,
    wordId: entryKey(entry),
    target: entry.word,
    expectedText: entry.word,
    attemptNumber,
    asrVendor: "openai",
    partNumber: 3,
    PART3_SCORING_MODE: "harper_retry_only",
    ...extra,
  };
}

function letterTiles(word: string) {
  const extras = ["m", "d", "r", "n"];
  return Array.from(new Set([...word.toLowerCase().replace(/[^a-z]/g, "").split(""), ...extras])).sort();
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : [];
}
