"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuddyCharacter, type BuddyState } from "@/components/literacy/BuddyCharacter";
import { useScoredRealWordController } from "@/components/literacy/useScoredRealWordController";
import { getTtsProvider } from "@/lib/voice/tts";
import { recordLessonPlayerEvent } from "@/app/student/practice/actions";
import { capturePseudowordClip } from "@/lib/voice/captureClient";
import { startClipRecorder, type ClipRecorder } from "@/lib/voice/captureRecorder";
import { entryKey as scoredEntryKey, type ScoredRealWordStatus } from "@/lib/literacy/scoredRealWordController";
import {
  presentationCopyFor,
  presentationThemeFor,
  type PresentationCopy,
  type PresentationTheme,
} from "@/lib/literacy/presentationCopy";
import {
  startVoiceActivity,
  stopVoiceActivity,
  VOICE_ACTIVITY_MAX_LISTEN_MS,
  type VoiceActivityHandle,
} from "@/lib/voice/voiceActivity";
import type { PresentationProfile } from "@/lib/literacy/presentationProfile";
import type { LessonPlayerData, LessonPlayerPart } from "./lessonPlayerData";

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

export function StudentPracticeSession({
  lesson,
  presentationProfile = lesson.presentationProfile,
}: {
  lesson: LessonPlayerData;
  presentationProfile?: PresentationProfile;
}) {
  const copy = presentationCopyFor(presentationProfile);
  const theme = presentationThemeFor(presentationProfile);
  if (lesson.enabled === false) return <DisabledPractice targetCode={lesson.targetCode} reason={lesson.disabledReason} copy={copy} theme={theme} />;
  return <GeneratedLessonPlayer lesson={lesson} copy={copy} theme={theme} />;
}

function GeneratedLessonPlayer({
  lesson,
  copy,
  theme,
}: {
  lesson: LessonPlayerData & { enabled: true };
  copy: PresentationCopy;
  theme: PresentationTheme;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<CompletedState>({});
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [speech, setSpeech] = useState(() => speechForPart(lesson.parts[0], copy));
  const [eventLines, setEventLines] = useState<string[]>([]);
  const [sessionId] = useState(() => `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const startedRef = useRef(false);
  const [, startTransition] = useTransition();
  const activePart = lesson.parts[activeIndex];
  const meta = copy.partNav[activePart.partNumber - 1] ?? copy.partNav[0];

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
    setSpeech(speechForPart(activePart, copy));
  }, [activePart, copy]);

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
    <main className={theme.layout.page}>
      <div className={theme.layout.grid}>
        <aside className={theme.shell.rail}>
          <div className="mb-3 grid place-items-center gap-2 text-center">
            <div className={theme.shell.brandBadge}>{copy.shell.brandInitials}</div>
            <p className={theme.shell.brandText}>{copy.shell.brandName}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {lesson.parts.map((part, index) => (
              <button
                key={part.partNumber}
                onClick={() => selectPart(index)}
                className={`min-h-14 min-w-16 rounded-2xl border-2 px-2 py-2 text-center shadow-sm transition ${
                  index === activeIndex
                    ? theme.shell.navActive
                    : completed[part.partNumber]
                      ? theme.shell.navComplete
                      : theme.shell.navIdle
                }`}
              >
                <span className="block text-[10px] font-black uppercase">{copy.partNav[index]?.short}</span>
                <span className="block text-lg font-black">{part.partNumber}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className={theme.shell.header}>
            <div>
              <span className={theme.shell.targetPill}>
                {copy.shell.targetPrefix} {lesson.targetCode} · {lesson.dailyTargetLabel}
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{lesson.title}</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">{copy.shell.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => speak()} className={theme.shell.secondaryButton}>
                {copy.shell.replayHarper}
              </button>
              <button onClick={() => completePart()} className={theme.shell.primaryButton}>
                {copy.shell.doneWithPart}
              </button>
            </div>
          </div>

          <section className={theme.shell.lessonFrame}>
            <div className={theme.shell.buddyPanel}>
              <div className="mx-auto mb-4 flex justify-center">
                <BuddyCharacter state={buddyState} name={copy.buddy.name} stateLabels={copy.buddy.stateLabels} imageAlt={copy.buddy.imageAlt} />
              </div>
              <div className={theme.shell.speechBubble}>
                {speech}
              </div>
              <div className={theme.shell.metaBox}>
                <div className="flex justify-between py-1"><span>{copy.shell.modeLabel}</span><span>{meta.mode}</span></div>
                <div className="flex justify-between py-1"><span>{copy.shell.evidenceLabel}</span><span>{meta.evidence}</span></div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{kidFacingPartTitle(activePart, copy)}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">{partDescription(activePart, copy)}</p>
                </div>
                <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
                  Part {activePart.partNumber} · {meta.icon}
                </span>
              </div>

              <div className={theme.shell.activitySurface}>
                <PartRenderer
                  part={activePart}
                  copy={copy}
                  theme={theme}
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
                  trainingCaptureEnabled={lesson.trainingCaptureEnabled === true}
                  studentUserId={lesson.studentUserId}
                  lessonTargetCode={lesson.targetCode}
                />
              </div>
            </div>
          </section>
        </section>

        {theme.layout.showAdultEvidencePanel ? (
        <aside className={theme.shell.adultPanel}>
          <div>
            <h3 className="font-black">{copy.shell.adultControlsTitle}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">{copy.shell.adultControlsDescription}</p>
          </div>
          <div className="rounded-2xl border border-[#efe1d2] bg-white p-3 text-sm font-black">{copy.shell.adultRetryOnly}</div>
          <div className="rounded-2xl border border-[#efe1d2] bg-white p-3 text-sm font-black">{copy.shell.assistedModeLater}</div>
          <div>
            <h3 className="mb-2 font-black">{copy.shell.evidencePreviewTitle}</h3>
            <pre className="min-h-40 overflow-auto rounded-2xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
              {eventLines.join("\n")}
            </pre>
          </div>
        </aside>
        ) : null}
      </div>
    </main>
  );
}

function PartRenderer({
  part,
  copy,
  theme,
  onSpeak,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onVoiceEvent,
  trainingCaptureEnabled,
  studentUserId,
  lessonTargetCode,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  theme: PresentationTheme;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onVoiceEvent: (input: Omit<LessonPlayerEventInput, "sessionId" | "targetCode">) => void;
  trainingCaptureEnabled?: boolean;
  studentUserId?: string;
  lessonTargetCode: string;
}) {
  switch (part.partNumber) {
    case 1:
      return (
        <WarmupPart
          part={part}
          copy={copy}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 2:
      return <ConceptPart part={part} copy={copy} theme={theme} onSpeak={onSpeak} onComplete={onComplete} />;
    case 3:
      return (
        <Part3LiveLoop
          part={part}
          copy={copy}
          theme={theme}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
          onVoiceEvent={onVoiceEvent}
          trainingCaptureEnabled={trainingCaptureEnabled}
          studentUserId={studentUserId}
          lessonTargetCode={lessonTargetCode}
        />
      );
    case 4:
      return <PowerWordsPart part={part} copy={copy} onSpeak={onSpeak} onComplete={onComplete} />;
    case 5:
      return (
        <SentenceReadingPart
          part={part}
          copy={copy}
          theme={theme}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 6:
      return <SpellingPart part={part} copy={copy} onSpeak={onSpeak} onComplete={onComplete} />;
    case 7:
      return (
        <StoryReadingPart
          part={part}
          copy={copy}
          theme={theme}
          onComplete={onComplete}
          onHarperMessage={onHarperMessage}
          onBuddyState={onBuddyState}
          onSpeak={onSpeak}
        />
      );
    case 8:
      return <TalkPart part={part} copy={copy} onComplete={onComplete} />;
    default:
      return <PlaceholderPart part={part} copy={copy} theme={theme} />;
  }
}

function WarmupPart({
  part,
  copy,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
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
      copy={copy}
      intro={copy.listenAttempt.warmup.intro}
      prompt={copy.listenAttempt.warmup.prompt}
      encourage={copy.listenAttempt.warmup.encourage}
      completeLabel={copy.listenAttempt.warmup.completeLabel}
      completeDisabledLabel={copy.listenAttempt.warmup.completeDisabledLabel}
      onComplete={onComplete}
      onHarperMessage={onHarperMessage}
      onBuddyState={onBuddyState}
      onSpeak={onSpeak}
    />
  );
}

function ConceptPart({
  part,
  copy,
  theme,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  theme: PresentationTheme;
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
        helper: index === 0 ? copy.conceptDemo.mainPair : copy.conceptDemo.practicePair,
        utterance: `${before}. ${after}.`,
      };
    })
    .filter((item): item is TappableItem => Boolean(item));
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className={theme.cards.amberNotice}>{statement}</div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <DemoCard label={copy.conceptDemo.beforeLabel} word={stringValue(pairs[0]?.closed) || stringValue(pairs[0]?.base) || "cap"} theme={theme} />
        <div className="text-center text-3xl font-black text-amber-700">{copy.conceptDemo.arrowLabel}</div>
        <DemoCard label={copy.conceptDemo.afterLabel} word={stringValue(pairs[0]?.target) || "cape"} theme={theme} />
      </div>
      <TappableItemPractice
        items={pairItems}
        copy={copy}
        theme={theme}
        onSpeak={onSpeak}
        completeLabel={copy.conceptDemo.completeLabel}
        completeDisabledLabel={copy.conceptDemo.completeDisabledLabel}
        onComplete={(heardCount) => onComplete({ listenedToRule: true, heardPairs: heardCount })}
      />
      <div className="flex flex-wrap gap-3">
        <button onClick={() => onSpeak(statement)} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
          {copy.conceptDemo.listenAgain}
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

type Part3Status = ScoredRealWordStatus;

function Part3LiveLoop({
  part,
  copy,
  theme,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
  onVoiceEvent,
  trainingCaptureEnabled,
  studentUserId,
  lessonTargetCode,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  theme: PresentationTheme;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
  onVoiceEvent: (input: Omit<LessonPlayerEventInput, "sessionId" | "targetCode">) => void;
  trainingCaptureEnabled?: boolean;
  studentUserId?: string;
  lessonTargetCode: string;
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
    copy.part3.defaultReteachPrompt;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setFeedback] = useState(copy.part3.defaultFeedback);
  const [pseudowordsConfirmed, setPseudowordsConfirmed] = useState(false);
  const [pseudowordAttemptMeta, setPseudowordAttemptMeta] = useState<Record<string, unknown> | null>(null);
  const scoredController = useScoredRealWordController({
    copy: {
      readWord: copy.part3.readWord,
      listeningStop: copy.part3.listeningStop,
      technicalRetry: copy.part3.technicalRetry,
      rateLimitHarper: copy.part3.rateLimitHarper,
      rateLimitChip: copy.part3.rateLimitChip,
      correct: copy.part3.correct,
      retryPrompt: copy.part3.retryPrompt,
      assisted: copy.part3.assisted,
      adultSupportDone: copy.part3.adultSupportDone,
    },
    reteachTemplate,
    onHarperMessage,
    onBuddyState,
    onSpeak,
    onVoiceEvent,
    onWordResolved: (outcome) => {
      setCurrentIndex((index) => Math.max(index, outcome.index + 1));
    },
  });
  const {
    statuses,
    wordFeedback,
    recording,
    thinking,
    recordingStartInFlight,
    requestInFlight,
    rateLimitedUntil,
    showFallback,
  } = scoredController.state;
  const currentWord = realEntries[currentIndex];
  const isRateLimited = rateLimitedUntil !== null && Date.now() < rateLimitedUntil;
  const readDisabled = thinking || recordingStartInFlight || requestInFlight || isRateLimited || !currentWord;
  const allRealWordsComplete = currentIndex >= realEntries.length;

  function adultSupportAdvance() {
    if (!currentWord) return;
    scoredController.adultSupportAdvance(currentWord);
  }

  function confirmPseudowords(extra?: Record<string, unknown>) {
    setPseudowordsConfirmed(true);
    setPseudowordAttemptMeta(extra ?? null);
    setFeedback(copy.listenAttempt.pseudoword.completeMessage);
    onHarperMessage(copy.listenAttempt.pseudoword.completeMessage);
  }

  function wordChipInstruction() {
    if (recording) return copy.part3.currentInstructionListening;
    if (thinking) return copy.part3.currentInstructionThinking;
    if (isRateLimited) return copy.part3.currentInstructionRateLimited;
    if (allRealWordsComplete) return copy.part3.currentInstructionComplete;
    return copy.part3.currentInstructionDefault;
  }

  function handleWordChipTap(entry: Part3WordEntry) {
    if (recordingStartInFlight) return;
    if (entry.index !== currentIndex) return;
    if (recording) {
      void scoredController.stopAndScore(entry);
      return;
    }
    void scoredController.beginRecording(entry, readDisabled);
  }

  const completedRealCount = Object.values(statuses).filter((status) => ["correct", "assisted", "unscored"].includes(status)).length;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className={theme.cards.blueNotice}>
        {wordChipInstruction()}
      </div>
      <div className="grid gap-3">
        {lines.filter((line) => stringValue(line.role) !== "target_pseudowords").map((line) => {
          const role = stringValue(line.role);
          const words = stringArray(line.words);
          return (
            <div key={`${line.lineNumber}-${role}`} className={theme.cards.generatedCard}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {formatCopy(copy.part3.lineLabel, { lineNumber: String(line.lineNumber) })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => {
                  const realEntry = realEntries.find((entry) => entry.lineNumber === Number(line.lineNumber) && entry.word === word && entry.index >= index);
                  const status = realEntry ? statuses[scoredEntryKey(realEntry)] : undefined;
                  const isCurrent = realEntry?.index === currentIndex && !allRealWordsComplete;
                  const processing = Boolean(isCurrent && (recording || thinking || requestInFlight));
                  const disabled = !realEntry || (!isCurrent && status !== "correct" && status !== "assisted" && status !== "unscored") || (isCurrent && readDisabled && !recording);
                  const chipFeedback = realEntry ? wordFeedback[scoredEntryKey(realEntry)] : "";
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
                          {recording ? copy.listenAttempt.tapToStop : thinking ? copy.part3.checkingStatus : copy.part3.tapToReadStatus}
                        </span>
                      ) : null}
                      {processing ? <span className="mt-1 block text-xs font-black text-violet-700">{copy.part3.processingStatus}</span> : null}
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
        <div className={theme.cards.neutralCard}>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">{copy.part3.currentWordLabel}</p>
          <p className="mt-1 text-2xl font-black text-slate-700">{copy.part3.currentWordInstruction}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {showFallback ? (
              <button onClick={adultSupportAdvance} className="rounded-2xl border border-[#e8d9c7] bg-white px-5 py-4 font-black">
                {copy.part3.adultSupportButton}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-violet-100 bg-violet-50 p-5">
          <h3 className="text-2xl font-black">{copy.listenAttempt.pseudoword.title}</h3>
          <p className="mt-2 font-bold text-violet-900">
            {copy.listenAttempt.pseudoword.body}
          </p>
          <div className="mt-4 rounded-3xl bg-white p-4">
            <ListenForReadingAttempt
              surface="pseudoword"
              words={pseudowords}
              copy={copy}
              intro={copy.listenAttempt.pseudoword.intro}
              prompt={copy.listenAttempt.pseudoword.prompt}
              encourage={copy.listenAttempt.pseudoword.encourage}
              completeLabel={copy.listenAttempt.pseudoword.completeLabel}
              completeDisabledLabel={copy.listenAttempt.pseudoword.completeDisabledLabel}
              onComplete={confirmPseudowords}
              onHarperMessage={onHarperMessage}
              onBuddyState={onBuddyState}
              onSpeak={onSpeak}
              speakEncouragement
              trainingCaptureEnabled={trainingCaptureEnabled === true}
              studentUserId={studentUserId}
              lessonTargetCode={lessonTargetCode}
            />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-500">
          {formatCopy(copy.part3.realWordsCompleteLabel, { done: String(completedRealCount), total: String(realEntries.length) })}
        </p>
        <button
          onClick={() => onComplete({ realWordsComplete: completedRealCount, pseudowordsConfirmed, pseudowordAttemptMeta })}
          disabled={!allRealWordsComplete || !pseudowordsConfirmed}
          className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.part3.doneButton}
        </button>
      </div>
    </div>
  );
}

function PowerWordsPart({
  part,
  copy,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (extra?: Record<string, unknown>) => void;
}) {
  const heartWords = stringArray(part.contentJson.heartWords);
  const vocabularyWords = arrayOfRecords(part.contentJson.vocabularyWords).map((entry) => stringValue(entry.word)).filter(Boolean);
  const allWords = [
    ...heartWords.map((word) => ({ word, kind: copy.powerWords.heartKind })),
    ...vocabularyWords.map((word) => ({ word, kind: copy.powerWords.vocabularyKind })),
  ];
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
        copy={copy}
        onSpeak={onSpeak}
        completeLabel={copy.powerWords.completeLabel}
        completeDisabledLabel={copy.powerWords.completeDisabledLabel}
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
  copy,
  theme,
  onSpeak,
  completeLabel,
  completeDisabledLabel,
  onComplete,
}: {
  items: TappableItem[];
  copy: PresentationCopy;
  theme?: PresentationTheme;
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
              {heard[item.id] ? copy.tappablePractice.heardBadge : item.helper}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#ead9c2] bg-white px-3 py-2 text-xs font-black text-slate-600">
          {formatCopy(copy.tappablePractice.heardCounter, { done: String(heardCount), total: String(items.length) })}
        </span>
        <button
          onClick={() => onComplete(heardCount)}
          disabled={!allHeard}
          className={theme?.cards.primaryAction ?? "rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"}
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
  copy,
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
  trainingCaptureEnabled = false,
  studentUserId,
  lessonTargetCode,
}: {
  surface: "warmup" | "pseudoword";
  words: string[];
  copy: PresentationCopy;
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
  trainingCaptureEnabled?: boolean;
  studentUserId?: string;
  lessonTargetCode?: string;
}) {
  const [statuses, setStatuses] = useState<Record<string, ListenAttemptStatus>>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [messageByWord, setMessageByWord] = useState<Record<string, string>>({});
  const [fallbackAccepted, setFallbackAccepted] = useState<Record<string, boolean>>({});
  const [micUnavailable, setMicUnavailable] = useState(false);
  const activeWordRef = useRef<string | null>(null);
  const voiceActivityRef = useRef<VoiceActivityHandle | null>(null);
  const clipRecorderRef = useRef<ClipRecorder | null>(null);
  const listenStartedAtRef = useRef<number | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const speakPromiseRef = useRef<Promise<void> | null>(null);
  const completingRef = useRef(false);

  const doneWords = words.filter((word) => statuses[word] === "heard" || fallbackAccepted[word]);
  const allDone = words.length > 0 && doneWords.length === words.length;
  const fallbackWords = words.filter((word) => fallbackAccepted[word]);
  const vadConfirmedWords = words.filter((word) => statuses[word] === "heard" && !fallbackAccepted[word]);

  useEffect(() => {
    return () => {
      stopActiveListening();
      speakPromiseRef.current = null;
      completingRef.current = false;
      onBuddyState("idle");
    };
  }, [onBuddyState]);

  async function handleWordTap(word: string) {
    if (completingRef.current) return;
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
      listenStartedAtRef.current = Date.now();
      if (trainingCaptureEnabled === true && surface === "pseudoword") {
        clipRecorderRef.current = startClipRecorder(handle.stream);
      }
      pollTimerRef.current = window.setInterval(() => {
        if (handle.heardSpeech()) void completeHeard(word);
      }, 100);
      timeoutRef.current = window.setTimeout(() => {
        void markTryAgain(word, copy.listenAttempt.noVoiceTryAgain);
      }, VOICE_ACTIVITY_MAX_LISTEN_MS);
    } catch {
      setMicUnavailable(true);
      showFallback(word, copy.listenAttempt.micUnavailable);
    } finally {
      startingRef.current = false;
    }
  }

  async function stopEarly(word: string) {
    const handle = voiceActivityRef.current;
    if (handle?.heardSpeech()) {
      await completeHeard(word);
    } else {
      await markTryAgain(word, copy.listenAttempt.stopEarlyTryAgain);
    }
  }

  async function completeHeard(word: string) {
    if (completingRef.current) return;
    completingRef.current = true;
    const clipDurationMs = listenStartedAtRef.current ? Date.now() - listenStartedAtRef.current : 0;
    let blob: Blob | null = null;
    try {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      pollTimerRef.current = null;
      timeoutRef.current = null;

      const clipRecorder = clipRecorderRef.current;
      clipRecorderRef.current = null;
      if (trainingCaptureEnabled === true && surface === "pseudoword" && clipRecorder) {
        try {
          blob = await clipRecorder.stop();
        } catch {
          blob = null;
        }
      }
      stopActiveListening();
    } finally {
      completingRef.current = false;
    }

    if (blob && lessonTargetCode) {
      void capturePseudowordClip({
        blob,
        voiceSessionId: voiceSessionIdRef.current,
        lessonTargetCode,
        expectedText: word,
        wordIndex: words.indexOf(word),
        speakerAgeBand: undefined,
        clipDurationMs,
      }).then((result) => {
        if (result?.voiceSessionId) voiceSessionIdRef.current = result.voiceSessionId;
      });
    }
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
      showFallback(word, copy.listenAttempt.fallbackConfirm);
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
    setMessageByWord((state) => ({ ...state, [word]: copy.listenAttempt.adultSupportThanks }));
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
    if (clipRecorderRef.current) {
      void clipRecorderRef.current.stop();
      clipRecorderRef.current = null;
    }
    listenStartedAtRef.current = null;
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
          {formatCopy(copy.listenAttempt.heardCounter, { done: String(doneWords.length), total: String(words.length) })}
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
                  {done
                    ? copy.listenAttempt.heardStatus
                    : listening
                      ? copy.listenAttempt.tapToStop
                      : status === "tryAgain"
                        ? copy.listenAttempt.tryAgain
                        : copy.listenAttempt.tapToRead}
                </span>
              </button>
              {messageByWord[word] ? <p className="mt-2 text-sm font-extrabold leading-snug">{messageByWord[word]}</p> : null}
              {fallbackVisible && !done ? (
                <button
                  onClick={() => acceptFallback(word)}
                  className="mt-3 w-full rounded-2xl border border-[#e8d9c7] bg-white px-3 py-2 text-sm font-black"
                >
                  {copy.listenAttempt.adultSupport}
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
  copy,
  theme,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  theme: PresentationTheme;
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
    onHarperMessage(copy.sentenceReading.harperListen);
  }

  async function finishReading() {
    setFinished(true);
    setReading(false);
    const message = copy.sentenceReading.harperEncourage;
    onHarperMessage(message);
    await onSpeak(message);
    onComplete({ listenAndEncourage: true, sentenceCount: sentences.length });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="grid gap-3">
        {sentences.map((sentence, index) => (
          <div key={`${sentence}-${index}`} className="rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {formatCopy(copy.sentenceReading.sentenceLabel, { index: String(index + 1) })}
            </p>
            <p className="mt-2 text-2xl font-black leading-relaxed text-slate-950">{sentence}</p>
          </div>
        ))}
      </div>
      <div className={`rounded-3xl border-2 p-4 font-black ${reading ? "border-blue-200 bg-blue-50 text-blue-900" : "border-[#efe1d2] bg-white text-slate-700"}`}>
        {reading ? copy.sentenceReading.readingMessage : copy.sentenceReading.idleMessage}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button onClick={beginReading} className={theme.cards.secondaryAction}>
          {copy.sentenceReading.startButton}
        </button>
        <button
          onClick={finishReading}
          disabled={!reading && !finished}
          className={theme.cards.primaryAction}
        >
          {copy.sentenceReading.doneButton}
        </button>
      </div>
    </div>
  );
}

function StoryReadingPart({
  part,
  copy,
  theme,
  onComplete,
  onHarperMessage,
  onBuddyState,
  onSpeak,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
  theme: PresentationTheme;
  onComplete: (extra?: Record<string, unknown>) => void;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: BuddyState) => void;
  onSpeak: (text: string) => Promise<void>;
}) {
  const title = stringValue(part.kidVisibleCopy.title) || copy.storyReading.defaultTitle;
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
    onHarperMessage(copy.storyReading.listenFirstHarper);
    await onSpeak(passage);
    setMode("idle");
    onHarperMessage(copy.storyReading.afterListenHarper);
  }

  function readOnOwn() {
    if (!readOnOwnAllowed) return;
    setMode("reading");
    setFinished(false);
    onBuddyState("listening");
    onHarperMessage(copy.storyReading.readOnOwnHarper);
  }

  async function finishReading() {
    setFinished(true);
    setMode("idle");
    const message = copy.storyReading.finishEncourage;
    onHarperMessage(message);
    await onSpeak(message);
    onComplete({ listenAndEncourage: true, connectedTextMode: "read_on_own" });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="rounded-3xl border-2 border-[#ead9c2] bg-[#fffdf8] p-5">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{copy.storyReading.storyLabel}</p>
        <h3 className="mt-2 text-3xl font-black">{title}</h3>
        <p className="mt-4 whitespace-pre-wrap text-xl font-extrabold leading-relaxed text-slate-950">{passage}</p>
      </div>
      <div className={`rounded-3xl border-2 p-4 font-black ${mode === "reading" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-[#efe1d2] bg-white text-slate-700"}`}>
        {mode === "reading" ? copy.storyReading.readingMessage : copy.storyReading.idleMessage}
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <button
          onClick={listenFirst}
          disabled={!listenFirstAllowed || mode === "listening-first"}
          className={theme.cards.secondaryAction}
        >
          {mode === "listening-first" ? copy.storyReading.listeningButton : copy.storyReading.listenFirstButton}
        </button>
        <button
          onClick={readOnOwn}
          disabled={!readOnOwnAllowed}
          className={theme.cards.secondaryAction}
        >
          {copy.storyReading.readOnOwnButton}
        </button>
        <button
          onClick={finishReading}
          disabled={mode !== "reading" && !finished}
          className={theme.cards.primaryAction}
        >
          {copy.storyReading.doneButton}
        </button>
      </div>
    </div>
  );
}

function SpellingPart({
  part,
  copy,
  onSpeak,
  onComplete,
}: {
  part: LessonPlayerPart;
  copy: PresentationCopy;
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
        <p className="font-black text-blue-900">{copy.spelling.harperSays}</p>
        <button onClick={() => onSpeak(target)} className="mt-2 rounded-2xl bg-white px-5 py-4 text-2xl font-black shadow-sm">
          {formatCopy(copy.spelling.listenToWord, { index: String(index + 1) })}
        </button>
      </div>
      <input
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        className="rounded-2xl border-2 border-blue-100 px-4 py-4 text-center text-3xl font-black outline-none focus:border-blue-300"
        placeholder={copy.spelling.inputPlaceholder}
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
        <button onClick={() => setAnswer("")} className="rounded-2xl border border-[#e8d9c7] bg-white px-4 py-3 font-black">{copy.spelling.clearButton}</button>
      </div>
      {answer ? (
        <div className={`rounded-2xl p-4 font-black ${isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {isCorrect ? copy.spelling.correctFeedback : copy.spelling.retryFeedback}
        </div>
      ) : null}
      <button onClick={check} className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
        {copy.spelling.checkButton}
      </button>
    </div>
  );
}

function TalkPart({ part, copy, onComplete }: { part: LessonPlayerPart; copy: PresentationCopy; onComplete: (extra?: Record<string, unknown>) => void }) {
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
            placeholder={copy.talk.placeholder}
          />
        </div>
      ))}
      <button onClick={() => onComplete({ responseCount: Object.values(responses).filter((value) => value.trim()).length })} className="mt-auto rounded-2xl bg-amber-300 px-5 py-4 font-black text-amber-950">
        {copy.talk.completeLabel}
      </button>
    </div>
  );
}

function PlaceholderPart({ part, copy, theme }: { part: LessonPlayerPart; copy: PresentationCopy; theme: PresentationTheme }) {
  const preview = placeholderPreview(part, copy);
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 text-center">
      <div className={theme.cards.dashedCard}>
        <p className="text-sm font-black uppercase tracking-wide text-slate-500">{copy.placeholder.badge}</p>
        <h3 className="mt-2 text-2xl font-black">{kidFacingPartTitle(part, copy)}</h3>
        <p className="mt-3 text-base font-bold text-slate-600">{preview}</p>
      </div>
    </div>
  );
}

function DisabledPractice({
  targetCode,
  reason,
  copy,
  theme,
}: {
  targetCode: string;
  reason?: string;
  copy: PresentationCopy;
  theme: PresentationTheme;
}) {
  return (
    <main className={theme.layout.page}>
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#e8d9c7] bg-[#fffaf3] p-8 shadow-xl">
        <BuddyCharacter state="idle" name={copy.buddy.name} stateLabels={copy.buddy.stateLabels} imageAlt={copy.buddy.imageAlt} />
        <h1 className="mt-6 text-3xl font-black">{copy.fallback.disabledTitle}</h1>
        <p className="mt-3 text-lg font-bold text-slate-600">
          {formatCopy(copy.fallback.disabledMessage, { targetCode })}
        </p>
        {reason ? <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">{reason}</p> : null}
      </section>
    </main>
  );
}

function DemoCard({ label, word, theme }: { label: string; word: string; theme: PresentationTheme }) {
  return (
    <div className={theme.cards.demoCard}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-5xl font-black">{word}</p>
    </div>
  );
}

function speechForPart(part: LessonPlayerPart, copy?: PresentationCopy) {
  if (part.partNumber === 2) return stringValue(part.contentJson.kidRuleStatement) || copy?.fallback.part2Speech || "Listen to the new thing with Harper.";
  return stringValue(part.kidVisibleCopy.directions) || stringValue(part.kidVisibleCopy.title) || part.partLabel;
}

function kidFacingPartTitle(part: LessonPlayerPart, copy: PresentationCopy) {
  return copy.partTitles[part.partNumber] || part.partLabel;
}

function partDescription(part: LessonPlayerPart, copy: PresentationCopy) {
  if (part.partNumber === 3) return copy.fallback.part3Description;
  if (part.partNumber === 5) return copy.fallback.part5Description;
  if (part.partNumber === 7) return copy.fallback.part7Description;
  return stringValue(part.contentJson.skillFocus).replace(/_/g, " ") || copy.fallback.defaultDescription;
}

function placeholderPreview(part: LessonPlayerPart, copy: PresentationCopy) {
  if (part.partNumber === 3) {
    const lines = arrayOfRecords(part.contentJson.contrastiveLines);
    return lines.map((line) => stringArray(line.words).join(" ")).filter(Boolean).slice(0, 2).join(" / ");
  }
  if (part.partNumber === 5) return stringArray(part.contentJson.sentences).slice(0, 2).join(" ");
  if (part.partNumber === 7) return stringValue(part.contentJson.passageText).slice(0, 160);
  return copy.placeholder.defaultPreview;
}

function formatCopy(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, "g"), value), template);
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
