"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuddyCharacter, type BuddyState } from "@/components/literacy/BuddyCharacter";
import { browserTts } from "@/lib/voice/tts";
import { recordLessonPlayerEvent } from "@/app/student/practice/actions";
import type { LessonPlayerData, LessonPlayerPart } from "./lessonPlayerData";

const PART_META = [
  { icon: "Fire", short: "Warm", mode: "self-confirm", evidence: "not scored" },
  { icon: "Spark", short: "Rule", mode: "teaching", evidence: "no score" },
  { icon: "Words", short: "Words", mode: "coming soon", evidence: "placeholder" },
  { icon: "Heart", short: "Power", mode: "listen and repeat", evidence: "not scored" },
  { icon: "Read", short: "Sent.", mode: "coming soon", evidence: "placeholder" },
  { icon: "Spell", short: "Spell", mode: "spelling match", evidence: "typed/tile" },
  { icon: "Story", short: "Story", mode: "coming soon", evidence: "placeholder" },
  { icon: "Talk", short: "Talk", mode: "open response", evidence: "no auto-grade" },
];

type CompletedState = Record<number, boolean>;

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

  function emitLessonEvent(input: {
    eventType: "LESSON_STARTED" | "LESSON_STEP_COMPLETED" | "LESSON_COMPLETED";
    sessionId: string;
    partNumber: number | null;
    targetCode: string;
    extra?: Record<string, unknown>;
  }) {
    startTransition(() => {
      void recordLessonPlayerEvent(input);
    });
  }

  async function speak(text = speech) {
    setBuddyState("speaking");
    try {
      await browserTts.speak(text);
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
                  <h2 className="text-3xl font-black tracking-tight">{activePart.partLabel}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{partDescription(activePart)}</p>
                </div>
                <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
                  Part {activePart.partNumber} · {meta.icon}
                </span>
              </div>

              <div className="flex flex-1 flex-col rounded-[26px] border border-[#efe1d2] bg-white p-5">
                <PartRenderer part={activePart} onSpeak={speak} onComplete={completePart} />
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
}: {
  part: LessonPlayerPart;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
}) {
  switch (part.partNumber) {
    case 1:
      return <WarmupPart part={part} onComplete={onComplete} />;
    case 2:
      return <ConceptPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 4:
      return <PowerWordsPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 6:
      return <SpellingPart part={part} onSpeak={onSpeak} onComplete={onComplete} />;
    case 8:
      return <TalkPart part={part} onComplete={onComplete} />;
    default:
      return <PlaceholderPart part={part} />;
  }
}

function WarmupPart({ part, onComplete }: { part: LessonPlayerPart; onComplete: (extra?: Record<string, unknown>) => void }) {
  const words = stringArray(part.contentJson.warmupWords);
  const [readWords, setReadWords] = useState<Record<string, boolean>>({});
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {words.map((word) => (
          <button
            key={word}
            onClick={() => setReadWords((state) => ({ ...state, [word]: !state[word] }))}
            className={`rounded-3xl border-2 px-4 py-6 text-3xl font-black ${readWords[word] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-[#ead9c2] bg-[#fffdf8]"}`}
          >
            {word}
          </button>
        ))}
      </div>
      <button
        onClick={() => onComplete({ selfConfirmedWords: Object.keys(readWords).filter((word) => readWords[word]).length })}
        className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 text-lg font-black text-amber-950"
      >
        I read it
      </button>
    </div>
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
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 text-xl font-black leading-relaxed">{statement}</div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <DemoCard label="Before" word={stringValue(pairs[0]?.closed) || stringValue(pairs[0]?.base) || "cap"} />
        <div className="text-center text-3xl font-black text-amber-700">to</div>
        <DemoCard label="Silent e word" word={stringValue(pairs[0]?.target) || "cape"} />
      </div>
      <div className="flex flex-wrap gap-2">
        {pairs.slice(1).map((pair, index) => (
          <span key={`${pair.target}-${index}`} className="rounded-2xl border border-[#ead9c2] bg-[#fffdf8] px-4 py-3 text-xl font-black">
            {stringValue(pair.closed) || stringValue(pair.base)} to {stringValue(pair.target)}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button onClick={() => onSpeak(statement)} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
          Listen again
        </button>
        <button onClick={() => onComplete({ listenedToRule: true })} className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
          I practiced it
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
  const [recognized, setRecognized] = useState<Record<string, boolean>>({});
  const allWords = [...heartWords.map((word) => ({ word, kind: "Power word" })), ...vocabularyWords.map((word) => ({ word, kind: "Story word" }))];
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        {allWords.map(({ word, kind }) => (
          <button
            key={`${kind}-${word}`}
            onClick={() => setRecognized((state) => ({ ...state, [word]: !state[word] }))}
            className={`rounded-3xl border-2 p-5 text-center ${recognized[word] ? "border-emerald-300 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}
          >
            <span className="block text-3xl font-black">{word}</span>
            <span className="mt-2 inline-block rounded-full bg-white px-2 py-1 text-xs font-black text-rose-700">{kind}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button onClick={() => onSpeak(allWords.map((entry) => entry.word).join(". "))} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
          Hear the words
        </button>
        <button onClick={() => onComplete({ recognizedWords: Object.keys(recognized).filter((word) => recognized[word]).length })} className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
          I know these
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
        <h3 className="mt-2 text-2xl font-black">{stringValue(part.kidVisibleCopy.title) || part.partLabel}</h3>
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

function partDescription(part: LessonPlayerPart) {
  if (part.partNumber === 3 || part.partNumber === 5 || part.partNumber === 7) return "Visible placeholder for a later speech slice.";
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
