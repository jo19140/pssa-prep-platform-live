"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuddyCharacter, type BuddyState } from "@/components/literacy/BuddyCharacter";
import { TappableItemPractice } from "@/components/literacy/TappableItemPractice";
import { recordLessonPlayerEvent } from "@/app/student/practice/actions";
import { aggregateCoachPartOutcome, type CoachStepOutcomeRecord } from "@/lib/literacy/aggregateCoachPartOutcome";
import { buildCoachLessonSteps, type CoachLessonStep } from "@/lib/literacy/coachLessonSteps";
import { coachStepperCopy } from "@/lib/literacy/coachStepperCopy";
import {
  completeCurrentStep,
  createInitialCoachStepperState,
  currentStepStatus,
  goBack,
  goNext,
  isNextEnabled,
  isReviewMode,
  isSummaryState,
  type CoachStepperState,
  type StepOutcome,
} from "@/lib/literacy/coachStepperState";
import { presentationCopyFor, presentationThemeFor } from "@/lib/literacy/presentationCopy";
import type { PresentationCopy, PresentationTheme } from "@/lib/literacy/presentationCopy";
import {
  buildSpellingLetterTiles,
  createInitialSpellingFlowState,
  spellingFeedbackKind,
  spellingPrimaryActionKey,
  transitionSpellingFlow,
  type SpellingFlowAction,
  type SpellingFlowState,
} from "@/lib/literacy/spellingFlow";
import { buildDemoPairItems, type TappableItem } from "@/lib/literacy/tappableItem";
import { getTtsProvider } from "@/lib/voice/tts";
import type { EnabledLessonPlayerData } from "./lessonPlayerData";

export function LessonStepper({ lesson }: { lesson: EnabledLessonPlayerData }) {
  const steps = useMemo(() => buildCoachLessonSteps(lesson), [lesson]);
  const copy = coachStepperCopy();
  const presentationCopy = presentationCopyFor(lesson.presentationProfile);
  const theme = presentationThemeFor(lesson.presentationProfile);
  const [state, setState] = useState(() => createInitialCoachStepperState(steps));
  const stateRef = useRef(state);
  const emittedPartsRef = useRef(new Set<number>());
  const completedLessonRef = useRef(false);
  const startedRef = useRef(false);
  const ttsBusyRef = useRef(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [sessionId] = useState(() => `lesson-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [, startTransition] = useTransition();
  const currentStep = steps[state.currentStepIndex] ?? null;
  const summary = isSummaryState(state, steps);
  const reviewMode = isReviewMode(state, steps);
  const nextEnabled = isNextEnabled(state, steps);

  function emitLessonEvent(input: {
    eventType: "LESSON_STARTED" | "LESSON_STEP_COMPLETED" | "LESSON_COMPLETED";
    partNumber: number | null;
    extra?: Record<string, unknown>;
  }) {
    startTransition(() => {
      void recordLessonPlayerEvent({
        ...input,
        sessionId,
        targetCode: lesson.targetCode,
      });
    });
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    emitLessonEvent({ eventType: "LESSON_STARTED", partNumber: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateState(nextState: CoachStepperState) {
    const previousParts = stateRef.current.completedPartNumbers;
    stateRef.current = nextState;
    setState(nextState);
    nextState.completedPartNumbers.forEach((partNumber) => {
      if (previousParts.has(partNumber) || emittedPartsRef.current.has(partNumber)) return;
      emittedPartsRef.current.add(partNumber);
      emitLessonEvent({
        eventType: "LESSON_STEP_COMPLETED",
        partNumber,
        extra: aggregateCoachPartOutcome(partNumber, outcomeRecords(steps, nextState.outcomesByStepId)),
      });
    });
    if (isSummaryState(nextState, steps) && !completedLessonRef.current) {
      completedLessonRef.current = true;
      emitLessonEvent({ eventType: "LESSON_COMPLETED", partNumber: null });
    }
  }

  function complete(outcome: StepOutcome) {
    updateState(completeCurrentStep(stateRef.current, steps, outcome));
  }

  function next() {
    updateState(goNext(stateRef.current, steps));
  }

  function back() {
    updateState(goBack(stateRef.current));
  }

  const speak = useCallback(async (text: string) => {
    if (ttsBusyRef.current) return;
    ttsBusyRef.current = true;
    setTtsBusy(true);
    setBuddyState("speaking");
    try {
      await getTtsProvider().speak(text);
    } catch {
      // Visible text remains the source of truth if TTS is unavailable.
    } finally {
      ttsBusyRef.current = false;
      setTtsBusy(false);
      setBuddyState("idle");
    }
  }, []);

  if (summary) {
    return (
      <main className={theme.layout.page}>
        <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl place-items-center rounded-[32px] border border-[#d9d3c7] bg-white p-8 shadow-sm">
          <div className="max-w-xl text-center">
            <div className="mb-6 flex justify-center">
              <BuddyCharacter state="idle" name={presentationCopy.buddy.name} stateLabels={presentationCopy.buddy.stateLabels} imageAlt={presentationCopy.buddy.imageAlt} />
            </div>
            <p className="text-sm font-black uppercase tracking-wide text-indigo-700">{copy.review.completedLabel}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{copy.summary.title}</h1>
            <p className="mt-4 text-lg font-bold leading-relaxed text-slate-600">{copy.summary.message}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!currentStep) return null;

  const status = currentStepStatus(state, steps);
  const currentDone = state.completedStepIds.has(currentStep.id);
  const progress = (currentStep.partLocalIndex + (currentDone ? 1 : 0)) / currentStep.partLocalTotal;

  return (
    <main className={theme.layout.page}>
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-[#d9d3c7] bg-[#fbfaf7] p-4 shadow-sm lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="space-y-4">
            <BuddyCharacter state={status === "active" ? buddyState : "speaking"} name={presentationCopy.buddy.name} stateLabels={presentationCopy.buddy.stateLabels} imageAlt={presentationCopy.buddy.imageAlt} />
            <div className="rounded-3xl border border-[#ddd6ca] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-indigo-700">{modeTagFor(currentStep, copy)}</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{copy.partNames[currentStep.partNumber as keyof typeof copy.partNames]}</h1>
              <p className="mt-2 text-sm font-bold text-slate-600">
                Part {currentStep.partNumber} of 8 · {taskLabelFor(currentStep, copy)}
              </p>
            </div>
            <PartStrip steps={steps} state={state} currentStep={currentStep} />
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-col rounded-[32px] border border-[#d9d3c7] bg-white shadow-sm">
          <div className="border-b border-[#e6dfd3] p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-indigo-700">
                  {reviewMode ? copy.review.readOnlyLabel : modeTagFor(currentStep, copy)}
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight">{headingFor(currentStep)}</h2>
              </div>
              <div className="min-w-44 rounded-full bg-slate-100 p-1">
                <div className="h-3 rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.max(8, progress * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-28">
            <StepCard
              step={currentStep}
              copy={copy}
              presentationCopy={presentationCopy}
              theme={theme}
              completed={currentDone}
              reviewMode={reviewMode}
              outcome={state.outcomesByStepId[currentStep.id]}
              ttsBusy={ttsBusy}
              onSpeak={speak}
              onComplete={complete}
            />
          </div>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#e6dfd3] bg-white/95 p-4 backdrop-blur">
            <button
              type="button"
              onClick={back}
              disabled={state.currentStepIndex === 0 || ttsBusy}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.actions.back}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!nextEnabled || ttsBusy}
              className="rounded-2xl bg-indigo-600 px-6 py-3 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.actions.next}
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}

function StepCard({
  step,
  copy,
  presentationCopy,
  theme,
  completed,
  reviewMode,
  outcome,
  ttsBusy,
  onSpeak,
  onComplete,
}: {
  step: CoachLessonStep;
  copy: ReturnType<typeof coachStepperCopy>;
  presentationCopy: PresentationCopy;
  theme: PresentationTheme;
  completed: boolean;
  reviewMode: boolean;
  outcome: StepOutcome | undefined;
  ttsBusy: boolean;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const disabled = completed || reviewMode;
  const isLongForm = step.kind === "passage" || step.kind === "reflect";
  const content = (
    <C1CardContent
      step={step}
      copy={copy}
      presentationCopy={presentationCopy}
      theme={theme}
      completed={completed}
      reviewMode={reviewMode}
      outcome={outcome}
      ttsBusy={ttsBusy}
      disabled={disabled}
      onSpeak={onSpeak}
      onComplete={onComplete}
    />
  );
  return (
    <article
      className={`mx-auto flex min-h-[420px] max-w-3xl flex-col overflow-y-auto rounded-[28px] border border-[#ddd6ca] bg-[#fbfaf7] p-6 text-center md:p-10 ${
        isLongForm ? "max-h-[min(48vh,560px)] justify-start" : "max-h-[min(64vh,720px)] justify-center"
      }`}
    >
      {content}
      {usesSpecializedCard(step.kind) || step.kind === "rule" ? null : (
        <div className="mt-8">
          <CompletionControl step={step} copy={copy} disabled={disabled} onComplete={onComplete} />
          {reviewMode ? <p className="mt-3 text-sm font-bold text-slate-500">{copy.review.completedLabel}</p> : null}
        </div>
      )}
    </article>
  );
}

function usesSpecializedCard(kind: CoachLessonStep["kind"]) {
  return kind === "demo_pair" || kind === "power_word" || kind === "spell_word" || kind === "passage" || kind === "reflect";
}

function C1CardContent({
  step,
  copy,
  presentationCopy,
  theme,
  completed,
  reviewMode,
  outcome,
  ttsBusy,
  disabled,
  onSpeak,
  onComplete,
}: {
  step: CoachLessonStep;
  copy: ReturnType<typeof coachStepperCopy>;
  presentationCopy: PresentationCopy;
  theme: PresentationTheme;
  completed: boolean;
  reviewMode: boolean;
  outcome: StepOutcome | undefined;
  ttsBusy: boolean;
  disabled: boolean;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  switch (step.kind) {
    case "demo_pair":
      return <DemoPairCard step={step} copy={copy} presentationCopy={presentationCopy} theme={theme} disabled={disabled || ttsBusy} onSpeak={onSpeak} onComplete={onComplete} />;
    case "power_word":
      return <PowerWordCard step={step} copy={copy} presentationCopy={presentationCopy} disabled={disabled || ttsBusy} onSpeak={onSpeak} onComplete={onComplete} />;
    case "spell_word":
      return <StepperSpellingCard step={step} copy={copy} disabled={disabled || ttsBusy} ttsBusy={ttsBusy} onSpeak={onSpeak} onComplete={onComplete} />;
    case "passage":
      return <PassageCard step={step} copy={copy} disabled={disabled || ttsBusy} ttsBusy={ttsBusy} outcome={outcome} onSpeak={onSpeak} onComplete={onComplete} />;
    case "reflect":
      return <ReflectCard step={step} copy={copy} completed={completed} reviewMode={reviewMode} outcome={outcome} onComplete={onComplete} />;
    default:
      return <CardContent step={step} copy={copy} />;
  }
}

function DemoPairCard({
  step,
  copy,
  presentationCopy,
  theme,
  disabled,
  onSpeak,
  onComplete,
}: {
  step: Extract<CoachLessonStep, { kind: "demo_pair" }>;
  copy: ReturnType<typeof coachStepperCopy>;
  presentationCopy: PresentationCopy;
  theme: PresentationTheme;
  disabled: boolean;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const items = useMemo(
    () =>
      buildDemoPairItems(
        { before: step.payload.before, after: step.payload.after, pairIndex: step.payload.pairIndex },
        { beforeHelper: copy.demoPair.beforeHelper, afterHelper: copy.demoPair.afterHelper },
      ),
    [copy.demoPair.afterHelper, copy.demoPair.beforeHelper, step.payload.after, step.payload.before, step.payload.pairIndex],
  );
  return (
    <TappableItemPractice
      items={items}
      copy={presentationCopy}
      theme={theme}
      onSpeak={onSpeak}
      interactionDisabled={disabled}
      hideCompleteButton
      onAllHeard={() => onComplete({ kind: "heard_marked" })}
    />
  );
}

function PowerWordCard({
  step,
  copy,
  presentationCopy,
  disabled,
  onSpeak,
  onComplete,
}: {
  step: Extract<CoachLessonStep, { kind: "power_word" }>;
  copy: ReturnType<typeof coachStepperCopy>;
  presentationCopy: PresentationCopy;
  disabled: boolean;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const items = useMemo<TappableItem[]>(
    () => [
      {
        id: `power:${step.payload.group}:${step.payload.index}:${step.payload.word}`,
        label: step.payload.word,
        helper: step.payload.group === "heart" ? copy.powerWord.heartHelper : copy.powerWord.vocabHelper,
        utterance: `${step.payload.word}.`,
      },
    ],
    [copy.powerWord.heartHelper, copy.powerWord.vocabHelper, step.payload.group, step.payload.index, step.payload.word],
  );
  return (
    <TappableItemPractice
      items={items}
      copy={presentationCopy}
      onSpeak={onSpeak}
      interactionDisabled={disabled}
      hideCompleteButton
      onAllHeard={() => onComplete({ kind: "heard_marked" })}
    />
  );
}

function StepperSpellingCard({
  step,
  copy,
  disabled,
  ttsBusy,
  onSpeak,
  onComplete,
}: {
  step: Extract<CoachLessonStep, { kind: "spell_word" }>;
  copy: ReturnType<typeof coachStepperCopy>;
  disabled: boolean;
  ttsBusy: boolean;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const words = useMemo(() => [step.payload.word], [step.payload.word]);
  const [flowState, setFlowState] = useState<SpellingFlowState>(() => createInitialSpellingFlowState());
  const flowStateRef = useRef(flowState);

  useEffect(() => {
    const next = createInitialSpellingFlowState();
    flowStateRef.current = next;
    setFlowState(next);
  }, [step.id]);

  const dispatchFlow = useCallback(
    (action: SpellingFlowAction) => {
      if (disabled) return;
      const result = transitionSpellingFlow(flowStateRef.current, action, { words });
      flowStateRef.current = result.state;
      setFlowState(result.state);
      if (result.completion) {
        onComplete({ kind: "checked_marked", correct: result.completion.spellingCorrect === result.completion.spellingTotal });
      }
    },
    [disabled, onComplete, words],
  );

  const feedback = spellingFeedbackKind(flowState);
  const primaryKey = spellingPrimaryActionKey(flowState, true);
  const tiles = buildSpellingLetterTiles(step.payload.word);

  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{copy.taskLabels.spell_word.replace("{n}", String(step.payload.index + 1)).replace("{t}", String(step.taskLocalTotal))}</p>
        <button type="button" disabled={disabled || ttsBusy} onClick={() => void onSpeak(step.payload.word)} className={`${secondaryButtonClass} mt-4`}>
          {copy.spelling.hearButton}
        </button>
      </div>
      <input
        className="mt-6 w-full rounded-3xl border border-slate-300 bg-white p-4 text-center text-4xl font-black tracking-wide outline-none focus:border-indigo-500 disabled:opacity-70"
        value={flowState.answer}
        onChange={(event) => dispatchFlow({ type: "set_answer", answer: event.target.value })}
        readOnly={disabled}
        disabled={disabled}
        aria-label={copy.modeTags.buildIt}
      />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {tiles.map((letter) => (
          <button key={letter} type="button" disabled={disabled} onClick={() => dispatchFlow({ type: "append_letter", letter })} className="h-12 w-12 rounded-2xl border border-slate-300 bg-white text-xl font-black text-slate-800 disabled:opacity-40">
            {letter}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" disabled={disabled} onClick={() => dispatchFlow({ type: "clear" })} className={secondaryButtonClass}>
          {copy.spelling.clearButton}
        </button>
        <button type="button" disabled={disabled} onClick={() => dispatchFlow({ type: "primary" })} className={primaryButtonClass}>
          {copy.spelling[primaryKey]}
        </button>
      </div>
      {feedback ? (
        <p className={`mt-4 text-center text-lg font-black ${feedback === "correct" ? "text-emerald-700" : "text-amber-700"}`}>
          {feedback === "correct" ? copy.spelling.correctFeedback : copy.spelling.retryFeedback}
        </p>
      ) : null}
    </div>
  );
}

function PassageCard({
  step,
  copy,
  disabled,
  ttsBusy,
  outcome,
  onSpeak,
  onComplete,
}: {
  step: Extract<CoachLessonStep, { kind: "passage" }>;
  copy: ReturnType<typeof coachStepperCopy>;
  disabled: boolean;
  ttsBusy: boolean;
  outcome: StepOutcome | undefined;
  onSpeak: (text: string) => Promise<void>;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const [mode, setMode] = useState<"idle" | "listening-first" | "reading">("idle");

  useEffect(() => {
    setMode("idle");
  }, [step.id]);

  async function listenFirst() {
    if (disabled || ttsBusy) return;
    setMode("listening-first");
    await onSpeak(step.payload.text);
    setMode("idle");
  }

  function readOnOwn() {
    if (disabled || ttsBusy) return;
    setMode("reading");
  }

  function doneReading() {
    if (disabled || mode !== "reading") return;
    setMode("idle");
    onComplete({ kind: "read_marked", mode: "read_on_own" });
  }

  const readOnly = outcome?.kind === "read_marked";
  return (
    <div className="text-left">
      <h3 className="text-3xl font-black">{step.payload.title}</h3>
      <p className="mt-5 text-xl font-bold leading-relaxed text-slate-700">{step.payload.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" disabled={disabled || ttsBusy} onClick={() => void listenFirst()} className={secondaryButtonClass}>
          {mode === "listening-first" ? copy.passage.listeningButton : copy.passage.listenFirstButton}
        </button>
        <button type="button" disabled={disabled || ttsBusy || readOnly} onClick={readOnOwn} className={secondaryButtonClass}>
          {copy.passage.readOnOwnButton}
        </button>
        <button type="button" disabled={disabled || mode !== "reading"} onClick={doneReading} className={primaryButtonClass}>
          {copy.passage.doneReadingButton}
        </button>
      </div>
    </div>
  );
}

function ReflectCard({
  step,
  copy,
  completed,
  reviewMode,
  outcome,
  onComplete,
}: {
  step: Extract<CoachLessonStep, { kind: "reflect" }>;
  copy: ReturnType<typeof coachStepperCopy>;
  completed: boolean;
  reviewMode: boolean;
  outcome: StepOutcome | undefined;
  onComplete: (outcome: StepOutcome) => void;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText("");
  }, [step.id]);

  const resolvedText = outcome?.kind === "answered_marked" ? outcome.text ?? "" : text;
  const disabled = completed || reviewMode;
  return (
    <div className="text-left">
      <p className="text-3xl font-black leading-relaxed">{step.payload.question}</p>
      <textarea
        className="mt-6 min-h-36 w-full rounded-3xl border border-slate-300 bg-white p-4 text-lg font-bold outline-none focus:border-indigo-500 disabled:opacity-70"
        aria-label={copy.modeTags.think}
        placeholder={copy.reflect.placeholder}
        value={resolvedText}
        onChange={(event) => setText(event.target.value)}
        readOnly={disabled}
        disabled={disabled}
      />
      <div className="mt-5 text-center">
        <button type="button" disabled={disabled || text.trim().length === 0} onClick={() => onComplete({ kind: "answered_marked", text })} className={primaryButtonClass}>
          {copy.reflect.markAnswered}
        </button>
      </div>
    </div>
  );
}

function CardContent({ step, copy }: { step: CoachLessonStep; copy: ReturnType<typeof coachStepperCopy> }) {
  switch (step.kind) {
    case "warmup_word":
    case "real_word":
    case "nonsense_word":
    case "spell_word":
    case "power_word":
      return <div className="text-6xl font-black tracking-tight md:text-7xl">{step.payload.word}</div>;
    case "rule":
      return <p className="text-2xl font-black leading-relaxed text-slate-800">{step.payload.statement}</p>;
    case "demo_pair":
      return (
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          <WordPanel label={copy.taskLabels.demo_pair.replace("{n}", String(step.payload.pairIndex + 1)).replace("{t}", String(step.taskLocalTotal))} word={step.payload.before} />
          <div className="text-2xl font-black text-indigo-700">→</div>
          <WordPanel label={copy.modeTags.listen} word={step.payload.after} />
        </div>
      );
    case "sentence":
      return <p className="text-3xl font-black leading-relaxed text-slate-900">{step.payload.text}</p>;
    case "passage":
      return (
        <div className="text-left">
          <h3 className="text-3xl font-black">{step.payload.title}</h3>
          <p className="mt-5 text-xl font-bold leading-relaxed text-slate-700">{step.payload.text}</p>
        </div>
      );
    case "reflect":
      return (
        <div className="text-left">
          <p className="text-3xl font-black leading-relaxed">{step.payload.question}</p>
          <textarea
            className="mt-6 min-h-36 w-full rounded-3xl border border-slate-300 bg-white p-4 text-lg font-bold outline-none focus:border-indigo-500"
            aria-label={copy.modeTags.think}
            readOnly
          />
        </div>
      );
  }
}

function WordPanel({ label, word }: { label: string; word: string }) {
  return (
    <div className="rounded-3xl border border-[#ddd6ca] bg-white p-6">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black">{word}</p>
    </div>
  );
}

function CompletionControl({
  step,
  copy,
  disabled,
  onComplete,
}: {
  step: CoachLessonStep;
  copy: ReturnType<typeof coachStepperCopy>;
  disabled: boolean;
  onComplete: (outcome: StepOutcome) => void;
}) {
  if (step.kind === "passage") {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" disabled={disabled} onClick={() => onComplete({ kind: "read_marked" })} className={primaryButtonClass}>
          {copy.modeTags.listen}
        </button>
        <button type="button" disabled={disabled} onClick={() => onComplete({ kind: "read_marked" })} className={secondaryButtonClass}>
          {copy.modeTags.readAloud}
        </button>
      </div>
    );
  }

  const { label, outcome } = completionFor(step, copy);
  return (
    <button type="button" disabled={disabled} onClick={() => onComplete(outcome)} className={primaryButtonClass}>
      {label}
    </button>
  );
}

const primaryButtonClass = "rounded-2xl bg-indigo-600 px-6 py-4 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButtonClass = "rounded-2xl border border-slate-300 bg-white px-6 py-4 font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40";

function completionFor(step: CoachLessonStep, copy: ReturnType<typeof coachStepperCopy>): { label: string; outcome: StepOutcome } {
  switch (step.kind) {
    case "demo_pair":
    case "power_word":
      return { label: copy.actions.markHeard, outcome: { kind: "heard_marked" } };
    case "spell_word":
      return { label: copy.actions.markChecked, outcome: { kind: "checked_marked", correct: false } };
    case "reflect":
      return { label: copy.actions.markAnswered, outcome: { kind: "answered_marked" } };
    case "warmup_word":
    case "real_word":
    case "nonsense_word":
    case "sentence":
    case "passage":
      return { label: copy.actions.markRead, outcome: { kind: "read_marked" } };
    case "rule":
      return { label: copy.actions.next, outcome: { kind: "acknowledged" } };
  }
}

function PartStrip({ steps, state, currentStep }: { steps: CoachLessonStep[]; state: ReturnType<typeof createInitialCoachStepperState>; currentStep: CoachLessonStep }) {
  return (
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
      {Array.from({ length: 8 }, (_, index) => {
        const partNumber = index + 1;
        const partSteps = steps.filter((step) => step.partNumber === partNumber);
        const done = partSteps.filter((step) => state.completedStepIds.has(step.id)).length;
        const active = currentStep.partNumber === partNumber;
        return (
          <div key={partNumber} className={`rounded-2xl border p-2 ${active ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="text-xs font-black text-slate-500">{partNumber}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${partSteps.length ? (done / partSteps.length) * 100 : 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function modeTagFor(step: CoachLessonStep, copy: ReturnType<typeof coachStepperCopy>) {
  switch (step.kind) {
    case "rule":
    case "demo_pair":
    case "power_word":
      return copy.modeTags.listen;
    case "spell_word":
      return copy.modeTags.buildIt;
    case "reflect":
      return copy.modeTags.think;
    default:
      return copy.modeTags.readAloud;
  }
}

function taskLabelFor(step: CoachLessonStep, copy: ReturnType<typeof coachStepperCopy>) {
  if (step.kind === "power_word") {
    return formatTaskLabel(step.payload.group === "heart" ? copy.taskLabels.power_word_heart : copy.taskLabels.power_word_vocab, step.taskLocalIndex + 1, step.taskLocalTotal);
  }
  return formatTaskLabel(copy.taskLabels[step.kind], step.taskLocalIndex + 1, step.taskLocalTotal);
}

function headingFor(step: CoachLessonStep) {
  switch (step.kind) {
    case "demo_pair":
      return `${step.payload.before} → ${step.payload.after}`;
    case "passage":
      return step.payload.title;
    case "reflect":
      return `Question ${step.payload.index + 1}`;
    default:
      return taskDisplay(step);
  }
}

function taskDisplay(step: CoachLessonStep) {
  switch (step.kind) {
    case "warmup_word":
    case "real_word":
    case "nonsense_word":
    case "power_word":
    case "spell_word":
      return step.payload.word;
    case "rule":
      return "Pattern focus";
    case "sentence":
      return `Sentence ${step.payload.index + 1}`;
    case "reflect":
      return `Question ${step.payload.index + 1}`;
    case "passage":
      return step.payload.title;
    case "demo_pair":
      return `${step.payload.before} → ${step.payload.after}`;
  }
}

function formatTaskLabel(template: string, n: number, t: number) {
  return template.replace("{n}", String(n)).replace("{t}", String(t));
}

function outcomeRecords(steps: CoachLessonStep[], outcomesByStepId: Record<string, StepOutcome>): CoachStepOutcomeRecord[] {
  return steps.flatMap((step) => {
    const outcome = outcomesByStepId[step.id];
    return outcome ? [{ step, outcome }] : [];
  });
}
