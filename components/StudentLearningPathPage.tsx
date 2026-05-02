"use client";

import { useMemo, useState } from "react";
import { StudentTutorAgentPanel } from "@/components/StudentTutorAgentPanel";

export function StudentLearningPathPage({
  learningPath,
  onBack,
}: {
  learningPath: any;
  onBack: () => void;
}) {
  const lessons = learningPath?.lessons || [];
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id || "");
  const [localProgress, setLocalProgress] = useState<Record<string, any>>({});
  const [questAttempts, setQuestAttempts] = useState<Record<string, any[]>>(() =>
    Object.fromEntries(lessons.map((lesson: any) => [lesson.id, lesson.questAttempts || []])),
  );
  const selectedLesson = useMemo(
    () => lessons.find((lesson: any) => lesson.id === selectedLessonId) || lessons[0],
    [lessons, selectedLessonId],
  );

  async function updateProgress(lessonId: string, status: string, masteryScore?: number) {
    setLocalProgress((prev) => ({ ...prev, [lessonId]: { ...(prev[lessonId] || {}), status, masteryScore } }));
    const res = await fetch("/api/student/lesson-progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, status, masteryScore }),
    });
    if (res.ok) {
      const json = await res.json();
      setLocalProgress((prev) => ({ ...prev, [lessonId]: json.progress }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Personalized Tutoring</p>
          <h2 className="text-2xl font-bold text-slate-900">My Learning Path</h2>
          <p className="text-sm text-slate-600">Lessons are ordered by the standards that need the most support.</p>
        </div>
        <button onClick={onBack} className="w-fit rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
          Back to Dashboard
        </button>
      </div>

      <StudentTutorAgentPanel />

      {!lessons.length ? (
        <section className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">No lessons yet</h3>
          <p className="mt-2 text-sm text-slate-600">Complete a baseline diagnostic or assessment to generate tutoring lessons.</p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            {lessons.map((lesson: any) => {
              const progress = localProgress[lesson.id] || lesson.progress?.[0] || {};
              const isSelected = selectedLesson?.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLessonId(lesson.id);
                    updateProgress(lesson.id, progress.status === "NOT_STARTED" || !progress.status ? "IN_PROGRESS" : progress.status);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                    isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Priority {lesson.priority} | {lesson.standardCode}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{lesson.skill}</h3>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">{formatStatus(progress.status || "NOT_STARTED")}</p>
                </button>
              );
            })}
          </aside>

          {selectedLesson ? (
            <LessonDetail
              key={selectedLesson.id}
              lesson={selectedLesson}
              progress={localProgress[selectedLesson.id] || selectedLesson.progress?.[0] || {}}
              questAttempts={questAttempts[selectedLesson.id] || []}
              onQuestSaved={(attempt) => setQuestAttempts((prev) => ({ ...prev, [selectedLesson.id]: [attempt, ...(prev[selectedLesson.id] || [])] }))}
              onUpdateProgress={updateProgress}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function LessonDetail({
  lesson,
  progress,
  questAttempts,
  onQuestSaved,
  onUpdateProgress,
}: {
  lesson: any;
  progress: any;
  questAttempts: any[];
  onQuestSaved: (attempt: any) => void;
  onUpdateProgress: (lessonId: string, status: string, masteryScore?: number) => void;
}) {
  const masteryQuestions = Array.isArray(lesson.masteryCheck) ? lesson.masteryCheck : [];
  const deterministicScore = masteryQuestions.length ? 100 : 0;
  const steps = [
    { id: "lesson", label: "Explanation", shortLabel: "Explain" },
    { id: "guided", label: "Guided Practice", shortLabel: "Guided" },
    { id: "independent", label: "Independent Practice", shortLabel: "Practice" },
    { id: "exit", label: "Exit Ticket", shortLabel: "Exit" },
    { id: "mastery", label: "Mastery Check", shortLabel: "Mastery" },
    { id: "world", label: "Learning World", shortLabel: "World" },
  ];
  const [activeStep, setActiveStep] = useState(steps[0].id);
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const isFirstStep = activeIndex <= 0;
  const isLastStep = activeIndex === steps.length - 1;

  function goToStep(index: number) {
    const nextStep = steps[Math.max(0, Math.min(steps.length - 1, index))];
    if (!nextStep) return;
    setActiveStep(nextStep.id);
    if (!progress.status || progress.status === "NOT_STARTED") onUpdateProgress(lesson.id, "IN_PROGRESS");
  }

  return (
    <section className="rounded-3xl bg-white shadow">
      <div className="flex flex-col gap-3 p-6 pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{lesson.standardCode}</p>
          <h3 className="text-2xl font-bold text-slate-900">{lesson.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{lesson.whyAssigned}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {formatStatus(progress.status || "NOT_STARTED")}
        </span>
      </div>

      <div className="mt-6 border-y border-slate-200 bg-slate-50 px-4 py-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                activeStep === step.id
                  ? "border-emerald-400 bg-white text-emerald-800 shadow-sm"
                  : "border-transparent bg-transparent text-slate-600 hover:bg-white"
              }`}
            >
              <span className="hidden lg:inline">
                {index + 1}. {step.label}
              </span>
              <span className="lg:hidden">
                {index + 1}. {step.shortLabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeStep === "lesson" && (
          <div className="grid gap-4">
            <LessonBlock title="Simple Explanation">{lesson.lessonExplanation}</LessonBlock>
            <LessonBlock title="Worked Example">{lesson.workedExample}</LessonBlock>
            <LessonBlock title="Video or Resource">
              {lesson.resourceUrl ? (
                <a className="font-semibold text-blue-700 underline" href={lesson.resourceUrl} target="_blank" rel="noreferrer">
                  {lesson.resourceTitle}
                </a>
              ) : (
                <span className="font-semibold text-amber-700">Teacher resource needed</span>
              )}
              <p className="mt-2 text-sm text-slate-600">{lesson.resourceDescription}</p>
            </LessonBlock>
          </div>
        )}

        {activeStep === "guided" && <PracticeBlock title="Guided Practice" questions={lesson.guidedPractice} />}
        {activeStep === "independent" && <PracticeBlock title="Independent Practice" questions={lesson.independentPractice} />}
        {activeStep === "exit" && <PracticeBlock title="Exit Ticket" questions={lesson.exitTicket} />}
        {activeStep === "mastery" && (
          <div className="grid gap-4">
            <PracticeBlock title="Mastery Check" questions={lesson.masteryCheck} />
            <LessonBlock title="Retest Recommendation">{lesson.retestRecommendation}</LessonBlock>
          </div>
        )}
        {activeStep === "world" && <LearningWorldQuest lesson={lesson} questAttempts={questAttempts} onQuestSaved={onQuestSaved} />}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => goToStep(activeIndex - 1)}
            disabled={isFirstStep}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => goToStep(activeIndex + 1)}
            disabled={isLastStep}
            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => onUpdateProgress(lesson.id, "IN_PROGRESS")} className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
            Mark In Progress
          </button>
          <button onClick={() => onUpdateProgress(lesson.id, "COMPLETED", deterministicScore)} className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
            Complete Lesson
          </button>
          <button onClick={() => onUpdateProgress(lesson.id, "MASTERED", 100)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Mark Mastered
          </button>
        </div>
      </div>
    </section>
  );
}

function LearningWorldQuest({
  lesson,
  questAttempts,
  onQuestSaved,
}: {
  lesson: any;
  questAttempts: any[];
  onQuestSaved: (attempt: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState({ inference: "", evidence: "", explanation: "" });
  const [activeStation, setActiveStation] = useState<"read" | "infer" | "evidence" | "explain">("read");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<any>(questAttempts[0]?.feedback || null);
  const latestAttempt = questAttempts[0];
  const world = worldForSkill(lesson.skill);
  const inferenceOptions = [
    "Maya is nervous about giving her speech.",
    "Maya is excited to leave school early.",
    "Maya forgot to bring her note card.",
  ];
  const evidenceOptions = [
    "Her hands shook slightly, so she took a deep breath.",
    "Maya stood at the front of the room.",
    "She reread the first line of her speech.",
  ];
  const stationIndex = { read: 0, infer: 1, evidence: 2, explain: 3 }[activeStation];

  async function submitQuest() {
    setSaving(true);
    const res = await fetch("/api/student/quest-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, responses }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setFeedback(json.feedback);
      onQuestSaved({ ...json.attempt, feedback: json.feedback });
    }
  }

  return (
    <section className={`rounded-2xl border p-5 ${world.bgClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">PSSA Learning World</p>
          <h4 className="mt-1 text-xl font-bold text-slate-950">{world.name}</h4>
          <p className="mt-2 text-sm text-slate-700">{world.description}</p>
          {latestAttempt ? (
            <p className="mt-2 text-sm font-semibold text-emerald-800">
              Latest quest: {latestAttempt.score}/{latestAttempt.maxScore} | {latestAttempt.xpEarned} XP
            </p>
          ) : null}
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          {open ? "Close Quest" : "Enter Quest"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="relative min-h-[360px] overflow-hidden bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-100 p-5">
            <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-yellow-200/80 blur-sm" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-emerald-200" />
            <div className="absolute bottom-16 left-[-10%] h-28 w-[120%] rounded-[50%] bg-amber-200" />
            <div className="absolute bottom-20 left-[12%] h-16 w-[76%] rounded-full border-8 border-dashed border-amber-700/30" />

            <div className="relative z-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Quest 1</p>
                <h5 className="mt-1 text-2xl font-bold text-slate-950">Find the Evidence</h5>
                <p className="mt-3 text-sm font-semibold text-slate-800">Mission: travel through each station, make an inference, collect evidence, and explain your thinking.</p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    ["read", "Read"],
                    ["infer", "Infer"],
                    ["evidence", "Evidence"],
                    ["explain", "Explain"],
                  ].map(([id, label], index) => (
                    <button
                      key={id}
                      onClick={() => setActiveStation(id as any)}
                      className={`rounded-xl border px-2 py-3 text-xs font-bold ${
                        activeStation === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {index + 1}. {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase text-slate-500">
                    <span>Your station</span>
                    <span>{stationIndex + 1} of 4</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {["Read", "Infer", "Evidence", "Explain"].map((label, index) => (
                      <div key={label} className="flex flex-col items-center gap-1">
                        <span className={`h-3 w-3 rounded-full ${index <= stationIndex ? "bg-slate-950" : "bg-slate-200"}`} />
                        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm leading-6 text-white">
                  Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.
                </div>
                {latestAttempt ? (
                  <div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-semibold text-emerald-900">
                    Latest run: {latestAttempt.score}/{latestAttempt.maxScore} with {latestAttempt.xpEarned} XP
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/95 p-5 shadow">
                {activeStation === "read" && (
                  <GamePanel
                    title="Station 1: Read the Scene"
                    body="Look for clues about Maya. The game is not asking what the text says directly. It is asking what you can figure out from the clues."
                    actionLabel="Go to Inference"
                    onAction={() => setActiveStation("infer")}
                  />
                )}

                {activeStation === "infer" && (
                  <ChoicePanel
                    title="Station 2: Choose the Inference"
                    choices={inferenceOptions}
                    selected={responses.inference}
                    onSelect={(value) => setResponses((prev) => ({ ...prev, inference: value }))}
                    onNext={() => setActiveStation("evidence")}
                  />
                )}

                {activeStation === "evidence" && (
                  <ChoicePanel
                    title="Station 3: Collect the Best Evidence"
                    choices={evidenceOptions}
                    selected={responses.evidence}
                    onSelect={(value) => setResponses((prev) => ({ ...prev, evidence: value }))}
                    onNext={() => setActiveStation("explain")}
                  />
                )}

                {activeStation === "explain" && (
                  <div>
                    <h6 className="text-lg font-bold text-slate-950">Station 4: Explain the Clue</h6>
                    <p className="mt-2 text-sm text-slate-600">Write one sentence that connects the evidence to your inference.</p>
                    <textarea
                      className="mt-4 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      value={responses.explanation}
                      onChange={(event) => setResponses((prev) => ({ ...prev, explanation: event.target.value }))}
                      placeholder="This shows Maya is nervous because..."
                    />
                    <button
                      onClick={submitQuest}
                      disabled={saving}
                      className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Finish Quest and Earn XP"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {feedback ? (
            <div className="border-t border-slate-200 bg-white p-5">
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-slate-700">
                <p className="font-bold text-emerald-900">{feedback.performance}</p>
                <p className="mt-1">{feedback.studentMessage}</p>
                {Array.isArray(feedback.nextSteps) && feedback.nextSteps.length ? (
                  <ul className="mt-2 list-disc pl-5">
                    {feedback.nextSteps.map((step: string) => <li key={step}>{step}</li>)}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function GamePanel({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div>
      <h6 className="text-lg font-bold text-slate-950">{title}</h6>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <button onClick={onAction} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        {actionLabel}
      </button>
    </div>
  );
}

function ChoicePanel({
  title,
  choices,
  selected,
  onSelect,
  onNext,
}: {
  title: string;
  choices: string[];
  selected: string;
  onSelect: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h6 className="text-lg font-bold text-slate-950">{title}</h6>
      <div className="mt-4 grid gap-3">
        {choices.map((choice) => (
          <button
            key={choice}
            onClick={() => onSelect(choice)}
            className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${
              selected === choice ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!selected}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}

function worldForSkill(skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("inference")) return { name: "Inference World", bgClass: "border-emerald-200 bg-emerald-50", description: "Solve clue-based reading quests by proving your thinking with evidence." };
  if (lower.includes("figurative")) return { name: "Figurative Language World", bgClass: "border-fuchsia-200 bg-fuchsia-50", description: "Unlock meanings behind similes, metaphors, idioms, tone, and mood." };
  if (lower.includes("evidence")) return { name: "Text Evidence World", bgClass: "border-blue-200 bg-blue-50", description: "Find the strongest proof and connect it to your answer." };
  if (lower.includes("main idea")) return { name: "Main Idea World", bgClass: "border-amber-200 bg-amber-50", description: "Sort key details and discover what the text is mostly about." };
  return { name: "Reading World", bgClass: "border-slate-200 bg-slate-50", description: "Practice your current PSSA reading skill with short quests." };
}

function LessonBlock({ title, children }: { title: string; children: any }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </article>
  );
}

function PracticeBlock({ title, questions }: { title: string; questions: any[] }) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <div className="mt-3 space-y-4">
        {safeQuestions.map((question, index) => (
          <div key={`${title}-${index}`} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">
              {index + 1}. {question.question}
            </p>
            {Array.isArray(question.choices) ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {question.choices.map((choice: string) => (
                  <li key={choice}>{choice}</li>
                ))}
              </ul>
            ) : null}
            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-800">Show answer and explanation</summary>
              <p className="mt-2">
                <span className="font-semibold">Answer:</span> {question.correctAnswer}
              </p>
              <p className="mt-1">{question.explanation}</p>
            </details>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
