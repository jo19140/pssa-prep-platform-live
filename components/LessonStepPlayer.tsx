"use client";

import { useMemo, useRef, useState } from "react";
import { TEIItemRenderer } from "@/components/tei/TEIItemRenderer";
import { type StudentResponse, itemKey } from "@/lib/teiScoring";

type Step = {
  id?: string;
  order: number;
  stepType: string;
  title: string;
  bodyText: string;
  narrationScript: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
  heroResource?: HeroResource;
  checkQuestion?: {
    question: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  } | null;
  questions?: any[];
};

type HeroResource = {
  title: string;
  url: string;
  provider: string;
  description?: string | null;
} | null;

export function LessonStepPlayer({
  steps,
  heroResource,
  lessonMetadata,
  onStartPractice,
}: {
  steps: Step[];
  heroResource: HeroResource;
  lessonMetadata: { grade?: number; standardCode?: string; skill?: string; title?: string };
  onStartPractice: () => void;
}) {
  const orderedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedResponses, setSubmittedResponses] = useState<Record<string, StudentResponse>>({});
  const [viewedSteps, setViewedSteps] = useState(() => new Set<number>([0]));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStep = orderedSteps[currentIndex] || orderedSteps[0];
  const isCheck = currentStep?.stepType === "CHECK_QUESTION" && currentStep.checkQuestion;
  const stepQuestions = Array.isArray(currentStep?.questions) ? currentStep.questions : [];
  const questionsComplete = stepQuestions.every((question, index) => submittedResponses[itemKey(question, index)]);
  const canAdvance = (!isCheck || submitted) && (!stepQuestions.length || questionsComplete);
  const progress = orderedSteps.length ? Math.round(((currentIndex + 1) / orderedSteps.length) * 100) : 0;
  const embedUrl = heroResource?.url ? youtubeEmbedUrl(heroResource.url) : "";

  function go(nextIndex: number) {
    const bounded = Math.max(0, Math.min(orderedSteps.length - 1, nextIndex));
    setCurrentIndex(bounded);
    setSelectedChoice(null);
    setSubmitted(false);
    setViewedSteps((previous) => new Set([...previous, bounded]));
    audioRef.current?.pause();
  }

  function handleResponseSubmit(response: StudentResponse) {
    setSubmittedResponses((previous) => ({ ...previous, [response.itemId]: response }));
  }

  if (!currentStep) return null;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-cyan-200 px-3 py-1 text-xs font-black text-slate-950">Grade {lessonMetadata.grade || ""}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">{lessonMetadata.standardCode}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">{lessonMetadata.skill}</span>
            </div>
            <h4 className="mt-3 text-2xl font-black">{lessonMetadata.title || `${lessonMetadata.skill} Lesson`}</h4>
          </div>
          <p className="rounded-full bg-white/10 px-3 py-2 text-sm font-black text-cyan-100">
            Step {currentIndex + 1} of {orderedSteps.length}
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {embedUrl ? (
        <section className="border-b border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Featured Video</p>
          <h5 className="mt-1 text-lg font-black text-slate-950">{heroResource?.title}</h5>
          <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
            <iframe
              src={embedUrl}
              title={heroResource?.title || "Lesson video"}
              className="h-full w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {heroResource?.provider}
            {heroResource?.description ? ` - ${heroResource.description}` : ""}
          </p>
        </section>
      ) : null}

      <section className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{currentStep.stepType.replace(/_/g, " ")}</p>
          <h5 className="mt-2 text-2xl font-black text-slate-950">{currentStep.title}</h5>
          {currentStep.imageUrl ? (
            <img src={currentStep.imageUrl} alt="" className="mt-4 aspect-video w-full rounded-2xl object-cover ring-1 ring-slate-200" />
          ) : null}
          <p className="mt-4 text-lg leading-8 text-slate-800">{currentStep.bodyText}</p>

          {currentStep.heroResource?.url ? (
            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">Hero Video</p>
              <h6 className="mt-1 text-lg font-black text-slate-950">{currentStep.heroResource.title}</h6>
              <p className="mt-1 text-sm font-semibold text-slate-600">{currentStep.heroResource.provider}</p>
              <div className="mt-3 aspect-video overflow-hidden rounded-xl bg-slate-950">
                <iframe
                  src={youtubeEmbedUrl(currentStep.heroResource.url)}
                  title={currentStep.heroResource.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {currentStep.heroResource.description ? (
                <p className="mt-2 text-xs font-semibold text-slate-500">{currentStep.heroResource.description}</p>
              ) : null}
            </div>
          ) : null}

          {currentStep.audioUrl ? (
            <div className="mt-5 rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-cyan-800">Narration</p>
              <audio ref={audioRef} controls preload="metadata" src={currentStep.audioUrl} className="w-full" />
            </div>
          ) : null}

          {isCheck ? (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="font-black text-slate-950">{currentStep.checkQuestion?.question}</p>
              <div className="mt-3 grid gap-2">
                {currentStep.checkQuestion?.choices.map((choice, index) => {
                  const correct = submitted && index === currentStep.checkQuestion?.correctIndex;
                  const missed = submitted && selectedChoice === index && index !== currentStep.checkQuestion?.correctIndex;
                  return (
                    <button
                      type="button"
                      key={choice}
                      disabled={submitted}
                      onClick={() => setSelectedChoice(index)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                        correct
                          ? "border-emerald-500 bg-emerald-100 text-emerald-950"
                          : missed
                            ? "border-rose-400 bg-rose-100 text-rose-950"
                            : selectedChoice === index
                              ? "border-amber-500 bg-white text-slate-950"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {!submitted ? (
                <button
                  type="button"
                  disabled={selectedChoice == null}
                  onClick={() => setSubmitted(true)}
                  className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check answer
                </button>
              ) : (
                <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold leading-6 text-slate-800 ring-1 ring-slate-200">
                  {selectedChoice === currentStep.checkQuestion?.correctIndex ? "Correct. " : "Not quite. "}
                  {currentStep.checkQuestion?.explanation}
                </p>
              )}
            </div>
          ) : null}

          {stepQuestions.length ? (
            <div className="mt-5 grid gap-4">
              {stepQuestions.map((question, index) => {
                const key = itemKey(question, index);
                return (
                  <TEIItemRenderer
                    key={key}
                    item={question}
                    index={index}
                    initialResponse={submittedResponses[key] || null}
                    disabled={Boolean(submittedResponses[key])}
                    onSubmit={handleResponseSubmit}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Lesson Steps</p>
          <div className="mt-3 grid gap-2">
            {orderedSteps.map((step, index) => (
              <button
                type="button"
                key={`${step.order}-${step.title}`}
                onClick={() => go(index)}
                className={`rounded-xl px-3 py-3 text-left text-sm font-black transition ${
                  index === currentIndex ? "bg-slate-950 text-white" : viewedSteps.has(index) ? "bg-emerald-100 text-emerald-950" : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {index + 1}. {step.title}
              </button>
            ))}
          </div>
        </aside>
      </section>

      {!canAdvance && stepQuestions.length ? (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900">
          {(() => {
            const remaining = stepQuestions.filter((question, index) => !submittedResponses[itemKey(question, index)]).length;
            return `Submit ${remaining} more ${remaining === 1 ? "question" : "questions"} on this step before continuing.`;
          })()}
        </div>
      ) : null}
      <footer className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => go(currentIndex - 1)} disabled={currentIndex === 0} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40">
          Previous
        </button>
        <button
          type="button"
          disabled={!canAdvance}
          onClick={() => (currentIndex < orderedSteps.length - 1 ? go(currentIndex + 1) : onStartPractice())}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {currentIndex < orderedSteps.length - 1 ? "Next" : "Start practice"}
        </button>
      </footer>
    </article>
  );
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : parsed.pathname.startsWith("/embed/")
        ? parsed.pathname.split("/embed/")[1]?.split("/")[0]
        : parsed.searchParams.get("v");
    if (!id) return "";
    // Privacy-Enhanced Mode reduces tracking cookies; params reduce recommendations, branding, and overlays.
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3`;
  } catch {
    return "";
  }
}
