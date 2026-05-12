"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { StudentTutorAgentHelpButton } from "@/components/StudentTutorAgentPanel";
import { buildLessonVisualMetadata, sceneForLessonSkill } from "@/lib/lessonVisuals";

export function StudentLearningPathPage({
  learningPath,
  onBack,
}: {
  learningPath: any;
  onBack: () => void;
}) {
  const lessons = learningPath?.lessons || [];
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id || "");
  const [viewMode, setViewMode] = useState<"map" | "player" | "extra">("map");
  const [localProgress, setLocalProgress] = useState<Record<string, any>>({});
  const [questAttempts, setQuestAttempts] = useState<Record<string, any[]>>(() =>
    Object.fromEntries(lessons.map((lesson: any) => [lesson.id, lesson.questAttempts || []])),
  );
  const selectedLesson = useMemo(
    () => lessons.find((lesson: any) => lesson.id === selectedLessonId) || lessons[0],
    [lessons, selectedLessonId],
  );

  async function updateProgress(lessonId: string, status: string, masteryScore?: number, responses: Record<string, any> = {}) {
    setLocalProgress((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] || {}),
        ...responses,
        status,
        ...(masteryScore === undefined ? {} : { masteryScore }),
      },
    }));
    const res = await fetch("/api/student/lesson-progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, status, masteryScore, ...responses }),
    });
    if (res.ok) {
      const json = await res.json();
      setLocalProgress((prev) => ({ ...prev, [lessonId]: json.progress }));
    }
  }

  function openLessonPlayer(lessonId: string) {
    const lesson = lessons.find((item: any) => item.id === lessonId) || lessons[0];
    const progress = localProgress[lessonId] || lesson?.progress?.[0] || {};
    setSelectedLessonId(lessonId);
    setViewMode("player");
    updateProgress(lessonId, progress.status === "NOT_STARTED" || !progress.status ? "IN_PROGRESS" : progress.status);
  }

  function openExtraWork(lessonId: string) {
    setSelectedLessonId(lessonId);
    setViewMode("extra");
  }

  if (lessons.length && selectedLesson && viewMode === "player") {
    return (
      <DedicatedLessonStage
        lesson={selectedLesson}
        lessons={lessons}
        progress={localProgress[selectedLesson.id] || selectedLesson.progress?.[0] || {}}
        questAttempts={questAttempts[selectedLesson.id] || []}
        onSelectLesson={(lessonId) => {
          const lesson = lessons.find((item: any) => item.id === lessonId) || lessons[0];
          const progress = localProgress[lessonId] || lesson?.progress?.[0] || {};
          setSelectedLessonId(lessonId);
          updateProgress(lessonId, progress.status === "NOT_STARTED" || !progress.status ? "IN_PROGRESS" : progress.status);
        }}
        onQuestSaved={(attempt) => setQuestAttempts((prev) => ({ ...prev, [selectedLesson.id]: [attempt, ...(prev[selectedLesson.id] || [])] }))}
        onUpdateProgress={updateProgress}
        onBackToMap={() => setViewMode("map")}
        onOpenExtraWork={() => setViewMode("extra")}
        onBackToDashboard={onBack}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-5 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Personalized Tutoring</p>
          <h2 className="text-2xl font-bold text-slate-900">My Learning Path</h2>
          <p className="text-sm text-slate-600">Lessons are ordered by the standards that need the most support.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lessons.length ? (
            <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`rounded-xl px-3 py-2 text-sm font-black transition ${viewMode === "map" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Lesson Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode("player")}
                className={`rounded-xl px-3 py-2 text-sm font-black transition ${viewMode === "player" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Guided Player
              </button>
              <button
                type="button"
                onClick={() => setViewMode("extra")}
                className={`rounded-xl px-3 py-2 text-sm font-black transition ${viewMode === "extra" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                Extra Work
              </button>
            </div>
          ) : null}
          <button onClick={onBack} className="w-fit rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
            Back to Dashboard
          </button>
        </div>
      </div>

      {!lessons.length ? (
        <section className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold text-slate-900">No lessons yet</h3>
          <p className="mt-2 text-sm text-slate-600">Complete a baseline diagnostic or assessment to generate tutoring lessons.</p>
        </section>
      ) : viewMode === "map" ? (
        <LearningPathMap
          lessons={lessons}
          selectedLessonId={selectedLesson?.id}
          localProgress={localProgress}
          onOpenLesson={openLessonPlayer}
          onOpenExtraWork={openExtraWork}
        />
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
                    if (viewMode === "player") {
                      updateProgress(lesson.id, progress.status === "NOT_STARTED" || !progress.status ? "IN_PROGRESS" : progress.status);
                    }
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
            <StaticLessonWorkbook lesson={selectedLesson} />
          ) : null}
        </div>
      )}
      <StudentTutorAgentHelpButton />
    </div>
  );
}

function DedicatedLessonStage({
  lesson,
  lessons,
  progress,
  questAttempts,
  onSelectLesson,
  onQuestSaved,
  onUpdateProgress,
  onBackToMap,
  onOpenExtraWork,
  onBackToDashboard,
  dashboardLabel = "Dashboard",
  showTutor = true,
}: {
  lesson: any;
  lessons: any[];
  progress: any;
  questAttempts: any[];
  onSelectLesson: (lessonId: string) => void;
  onQuestSaved: (attempt: any) => void;
  onUpdateProgress: (lessonId: string, status: string, masteryScore?: number, responses?: Record<string, any>) => void;
  onBackToMap: () => void;
  onOpenExtraWork: () => void;
  onBackToDashboard: () => void;
  dashboardLabel?: string;
  showTutor?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#030816] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030816]/95 px-4 py-3 shadow-2xl backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Instruction - Level {lesson.gradeLevel || ""}</p>
            <h1 className="truncate text-xl font-black md:text-2xl">{lesson.skill} Instruction</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={lesson.id}
              onChange={(event) => onSelectLesson(event.target.value)}
              className="h-10 max-w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-cyan-300"
            >
              {lessons.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-950 text-white">
                  {item.priority || ""} {item.skill}
                </option>
              ))}
            </select>
            <button type="button" onClick={onBackToMap} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">
              Lesson Map
            </button>
            <button type="button" onClick={onOpenExtraWork} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-200">
              Extra Work
            </button>
            <button type="button" onClick={onBackToDashboard} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-black text-slate-900 hover:bg-white">
              {dashboardLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 md:px-6">
        <LessonDetail
          key={lesson.id}
          lesson={lesson}
          progress={progress}
          questAttempts={questAttempts}
          onQuestSaved={onQuestSaved}
          onUpdateProgress={onUpdateProgress}
          immersive
        />
      </div>
      {showTutor ? <StudentTutorAgentHelpButton /> : null}
    </div>
  );
}

export function StudentLessonPreviewStage({
  lesson,
  lessons,
  onClose,
  onAssign,
  assigning = false,
  canAssign = false,
}: {
  lesson: any;
  lessons?: any[];
  onClose: () => void;
  onAssign?: () => void;
  assigning?: boolean;
  canAssign?: boolean;
}) {
  const lessonList = lessons?.length ? lessons : [lesson];
  const [selectedLessonId, setSelectedLessonId] = useState(lesson.id);
  const selectedLesson = lessonList.find((item: any) => item.id === selectedLessonId) || lesson;
  const [mode, setMode] = useState<"player" | "map" | "extra">("player");

  useEffect(() => {
    setSelectedLessonId(lesson.id);
    setMode("player");
  }, [lesson.id]);

  const previewProgress = useMemo(
    () => ({
      status: "TEACHER_PREVIEW",
      guidedResponses: { completed: true },
      independentResponses: { completed: true },
      exitTicketResponses: { completed: true },
      masteryStatus: "NOT_STARTED",
    }),
    [selectedLesson.id],
  );

  function openPreviewLesson(lessonId: string) {
    setSelectedLessonId(lessonId);
    setMode("player");
  }

  function openPreviewExtraWork(lessonId: string) {
    setSelectedLessonId(lessonId);
    setMode("extra");
  }

  return (
    <div className="relative min-h-screen bg-[#030816]">
      <div className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/90 p-2 shadow-2xl backdrop-blur">
        <span className="px-2 text-xs font-black uppercase tracking-wide text-cyan-200">Teacher Preview</span>
        {onAssign ? (
          <button
            type="button"
            onClick={onAssign}
            disabled={!canAssign || assigning}
            className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-300"
          >
            {assigning ? "Assigning..." : "Assign Lesson"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      {mode === "map" ? (
        <div className="mx-auto w-full max-w-[1600px] px-3 py-24 md:px-6">
          <LearningPathMap
            lessons={lessonList}
            selectedLessonId={selectedLesson.id}
            localProgress={Object.fromEntries(lessonList.map((item: any) => [item.id, previewProgress]))}
            onOpenLesson={openPreviewLesson}
            onOpenExtraWork={openPreviewExtraWork}
          />
        </div>
      ) : mode === "extra" ? (
        <div className="mx-auto w-full max-w-[1600px] px-3 py-24 md:px-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("player")} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">
              Guided Player
            </button>
            <button type="button" onClick={() => setMode("map")} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">
              Lesson Map
            </button>
          </div>
          <StaticLessonWorkbook lesson={selectedLesson} />
        </div>
      ) : (
        <DedicatedLessonStage
          lesson={selectedLesson}
          lessons={lessonList}
          progress={previewProgress}
          questAttempts={[]}
          onSelectLesson={setSelectedLessonId}
          onQuestSaved={() => {}}
          onUpdateProgress={() => {}}
          onBackToMap={() => setMode("map")}
          onOpenExtraWork={() => setMode("extra")}
          onBackToDashboard={onClose}
          dashboardLabel="Close Preview"
          showTutor={false}
        />
      )}
    </div>
  );
}

function LearningPathMap({
  lessons,
  selectedLessonId,
  localProgress,
  onOpenLesson,
  onOpenExtraWork,
}: {
  lessons: any[];
  selectedLessonId?: string;
  localProgress: Record<string, any>;
  onOpenLesson: (lessonId: string) => void;
  onOpenExtraWork: (lessonId: string) => void;
}) {
  const masteredCount = lessons.filter((lesson) => {
    const progress = localProgress[lesson.id] || lesson.progress?.[0] || {};
    return progress.status === "MASTERED" || (progress.masteryScore ?? 0) >= 80;
  }).length;
  const inProgressCount = lessons.filter((lesson) => {
    const progress = localProgress[lesson.id] || lesson.progress?.[0] || {};
    return progress.status === "IN_PROGRESS" || progress.status === "COMPLETED";
  }).length;

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow">
      <div className="bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-200">Learning Path Map</p>
            <h3 className="mt-2 text-3xl font-black">Choose a lesson, then pick the path</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Guided Player is the main lesson. Extra Work keeps the static lesson as a workbook-style review option.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase text-slate-400">Lessons</p>
              <p className="text-2xl font-black">{lessons.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase text-slate-400">Active</p>
              <p className="text-2xl font-black">{inProgressCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs uppercase text-slate-400">Mastered</p>
              <p className="text-2xl font-black">{masteredCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 bg-slate-50 p-5 lg:grid-cols-2">
        {lessons.map((lesson, index) => {
          const progress = localProgress[lesson.id] || lesson.progress?.[0] || {};
          const status = progress.status || "NOT_STARTED";
          const mastered = status === "MASTERED" || (progress.masteryScore ?? 0) >= 80;
          const active = selectedLessonId === lesson.id;
          return (
            <article
              key={lesson.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                active ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Step {lesson.priority || index + 1} • {lesson.standardCode}
                  </p>
                  <h4 className="mt-2 text-xl font-black leading-tight text-slate-950">{lesson.skill}</h4>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{lesson.whyAssigned}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${mastered ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                  {formatStatus(status)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Mode</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{lessonModeLabel(lesson.gradeLevel)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Practice</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{practiceItemCount(lesson)} items</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Gate</p>
                  <p className="mt-1 text-sm font-black text-slate-900">80% mastery</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.id)}
                  className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800"
                >
                  {status === "NOT_STARTED" ? "Start Guided Player" : "Continue Guided Player"}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenExtraWork(lesson.id)}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Open Extra Work
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getLessonImageUrl(lesson: any) {
  const sourcePayload = lesson?.sourcePayload && typeof lesson.sourcePayload === "object" ? lesson.sourcePayload : {};
  const visual = (sourcePayload as any)?.visual && typeof (sourcePayload as any).visual === "object" ? (sourcePayload as any).visual : {};
  return String(lesson?.imageUrl || (sourcePayload as any)?.imageUrl || visual?.imageUrl || "");
}

function StaticLessonWorkbook({ lesson }: { lesson: any }) {
  const lessonImageUrl = getLessonImageUrl(lesson);
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow">
      <div className="bg-slate-950 p-6 text-white">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-200">Extra Work</p>
        <h3 className="mt-2 text-3xl font-black">{lesson.title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Workbook-style review for extra practice. Use this after the guided player, for homework, or when a teacher wants students to do a static lesson.
        </p>
      </div>

      <div className="grid gap-5 bg-slate-50 p-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{lesson.standardCode}</p>
              <h4 className="mt-1 text-xl font-black text-slate-950">Static Lesson Notes</h4>
            </div>
            <ReadAloudButton
              text={`${lesson.lessonExplanation || ""} Worked example. ${lesson.workedExample || ""}`}
              label="Listen"
              className="w-fit rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 hover:bg-amber-200"
            />
          </div>
          {lessonImageUrl ? (
            <figure className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img src={lessonImageUrl} alt={`Lesson visual for ${lesson.title}`} className="h-72 w-full object-cover" />
            </figure>
          ) : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Teach</p>
              <p className="mt-2 text-sm leading-7 text-slate-800">{lesson.lessonExplanation}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Worked Example</p>
              <p className="mt-2 text-sm leading-7 text-slate-800">{lesson.workedExample}</p>
            </div>
          </div>
        </article>

        <ExtraWorkPracticeList title="Guided Practice Review" questions={lesson.guidedPractice} lessonImageUrl={lessonImageUrl} />
        <ExtraWorkPracticeList title="Independent Extra Practice" questions={lesson.independentPractice} lessonImageUrl={lessonImageUrl} />
        <ExtraWorkPracticeList title="Exit Ticket Review" questions={lesson.exitTicket} compact lessonImageUrl={lessonImageUrl} />
        <ExtraWorkPracticeList title="Mastery Check Preview" questions={lesson.masteryCheck} compact lessonImageUrl={lessonImageUrl} />

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">Teacher / Tutor Follow-Up</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-amber-950">{lesson.retestRecommendation}</p>
        </article>
      </div>
    </section>
  );
}

function ExtraWorkPracticeList({ title, questions, compact = false, lessonImageUrl = "" }: { title: string; questions?: any[]; compact?: boolean; lessonImageUrl?: string }) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  if (!safeQuestions.length) return null;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Static Workbook</p>
          <h4 className="text-xl font-black text-slate-950">{title}</h4>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{safeQuestions.length} items</span>
      </div>
      <div className={`mt-4 grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
        {safeQuestions.map((question, index) => (
          <div key={`${title}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-black leading-6 text-slate-950">{index + 1}. {question.question}</p>
              <ReadAloudButton
                text={`${question.passage || ""} ${question.question || ""}`}
                label="Listen"
                className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
              />
            </div>
            {index === 0 && lessonImageUrl ? (
              <figure className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img src={question.imageUrl || question.visual?.imageUrl || lessonImageUrl} alt={`Lesson visual for ${title}`} className="h-44 w-full object-cover" />
              </figure>
            ) : null}
            {question.passage ? <p className="mt-3 text-sm leading-7 text-slate-700">{question.passage}</p> : null}
            {question.coachHint ? (
              <p className="mt-3 rounded-xl bg-white p-3 text-xs font-bold leading-5 text-slate-600 ring-1 ring-slate-200">Hint: {question.coachHint}</p>
            ) : null}
            <div className="mt-3 grid gap-2">
              {(question.choices || []).map((choice: string) => (
                <div key={choice} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  {choice}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function LessonDetail({
  lesson,
  progress,
  questAttempts,
  onQuestSaved,
  onUpdateProgress,
  immersive = false,
}: {
  lesson: any;
  progress: any;
  questAttempts: any[];
  onQuestSaved: (attempt: any) => void;
  onUpdateProgress: (lessonId: string, status: string, masteryScore?: number, responses?: Record<string, any>) => void;
  immersive?: boolean;
}) {
  const steps = [
    { id: "lesson", label: "Explanation", shortLabel: "Explain" },
    { id: "guided", label: "Guided Practice", shortLabel: "Guided" },
    { id: "independent", label: "Independent Practice", shortLabel: "Practice" },
    { id: "exit", label: "Exit Ticket", shortLabel: "Exit" },
    { id: "mastery", label: "Mastery Check", shortLabel: "Mastery" },
    { id: "world", label: "Learning Arcade", shortLabel: "Arcade" },
  ];
  const [activeStep, setActiveStep] = useState(steps[0].id);
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const isFirstStep = activeIndex <= 0;
  const isLastStep = activeIndex === steps.length - 1;
  const guidedComplete = isPracticeComplete(progress.guidedResponses);
  const independentComplete = isPracticeComplete(progress.independentResponses);
  const exitComplete = isPracticeComplete(progress.exitTicketResponses);
  const masteryPassed = progress.status === "MASTERED" || progress.masteryStatus === "MASTERED" || (progress.masteryScore ?? 0) >= 80;
  const masteryAttempted = typeof progress.masteryScore === "number";
  const nextStep = steps[activeIndex + 1];
  const nextStepLocked = nextStep ? !canOpenStep(nextStep.id) : false;

  function goToStep(index: number) {
    const nextStep = steps[Math.max(0, Math.min(steps.length - 1, index))];
    if (!nextStep) return;
    if (!canOpenStep(nextStep.id)) return;
    setActiveStep(nextStep.id);
    if (!progress.status || progress.status === "NOT_STARTED") onUpdateProgress(lesson.id, "IN_PROGRESS");
  }

  function canOpenStep(stepId: string) {
    if (stepId === "lesson" || stepId === "guided") return true;
    if (stepId === "independent") return guidedComplete;
    if (stepId === "exit") return guidedComplete && independentComplete;
    if (stepId === "mastery") return guidedComplete && independentComplete && exitComplete;
    if (stepId === "world") return masteryPassed;
    return false;
  }

  function completeLessonStep() {
    onUpdateProgress(lesson.id, progress.status === "NOT_STARTED" || !progress.status ? "IN_PROGRESS" : progress.status || "IN_PROGRESS");
    setActiveStep("guided");
  }

  function completePractice(stepId: string, answers: Record<string, any>, score?: number, results?: any[]) {
    if (stepId === "guided") {
      onUpdateProgress(lesson.id, "IN_PROGRESS", undefined, { guidedResponses: buildPracticePayload(answers, lesson.guidedPractice, `${lesson.skill} Guided Practice`, results) });
      setActiveStep("independent");
      return;
    }
    if (stepId === "independent") {
      onUpdateProgress(lesson.id, "IN_PROGRESS", undefined, { independentResponses: buildPracticePayload(answers, lesson.independentPractice, `${lesson.skill} Independent Practice`, results) });
      setActiveStep("exit");
      return;
    }
    if (stepId === "exit") {
      onUpdateProgress(lesson.id, "IN_PROGRESS", undefined, { exitTicketResponses: buildPracticePayload(answers, lesson.exitTicket, `${lesson.skill} Exit Ticket`, results) });
      setActiveStep("mastery");
      return;
    }
    if (stepId === "mastery") {
      const masteryResponses = buildPracticePayload(answers, lesson.masteryCheck, `${lesson.skill} Mastery Check`, results);
      const masteryScore = score ?? masteryResponses.score ?? 0;
      onUpdateProgress(lesson.id, masteryScore >= 80 ? "MASTERED" : "COMPLETED", masteryScore, { masteryResponses });
      if (masteryScore >= 80) setActiveStep("world");
    }
  }

  return (
    <section className={`${immersive ? "min-h-[calc(100vh-96px)] overflow-hidden rounded-none bg-white shadow-2xl ring-1 ring-white/10 md:rounded-3xl" : "rounded-3xl bg-white shadow"}`}>
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
          {steps.map((step, index) => {
            const locked = !canOpenStep(step.id);
            const complete = step.id === "guided" ? guidedComplete : step.id === "independent" ? independentComplete : step.id === "exit" ? exitComplete : step.id === "mastery" ? masteryPassed : step.id === "world" ? masteryPassed : false;
            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={locked}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  activeStep === step.id
                    ? "border-emerald-400 bg-white text-emerald-800 shadow-sm"
                    : complete
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
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
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {activeStep === "lesson" && (
          <InstructionPlayer lesson={lesson} onContinue={completeLessonStep} immersive={immersive} />
        )}

        {activeStep === "guided" && <PracticeBlock title="Guided Practice" skill={lesson.skill} questions={lesson.guidedPractice} lessonImageUrl={getLessonImageUrl(lesson)} savedResponses={progress.guidedResponses} onComplete={(answers) => completePractice("guided", answers)} />}
        {activeStep === "independent" && <PracticeBlock title="Independent Practice" skill={lesson.skill} questions={lesson.independentPractice} lessonImageUrl={getLessonImageUrl(lesson)} savedResponses={progress.independentResponses} onComplete={(answers) => completePractice("independent", answers)} />}
        {activeStep === "exit" && <PracticeBlock title="Exit Ticket" skill={lesson.skill} questions={lesson.exitTicket} lessonImageUrl={getLessonImageUrl(lesson)} savedResponses={progress.exitTicketResponses} onComplete={(answers) => completePractice("exit", answers)} />}
        {activeStep === "mastery" && (
          <div className="grid gap-4">
            <PracticeBlock title="Mastery Check" skill={lesson.skill} questions={lesson.masteryCheck} lessonImageUrl={getLessonImageUrl(lesson)} masteryMode onComplete={(answers, score) => completePractice("mastery", answers, score)} />
            {masteryAttempted ? (
              <LessonBlock title="Mastery Result">
                {masteryPassed
                  ? `Score: ${progress.masteryScore}%. Arcade unlocked.`
                  : `Score: ${progress.masteryScore}%. Review the feedback, then try the mastery check again to unlock the arcade.`}
              </LessonBlock>
            ) : null}
            <LessonBlock title="Retest Recommendation">{lesson.retestRecommendation}</LessonBlock>
          </div>
        )}
        {activeStep === "world" && (
          masteryPassed ? (
            <LearningWorldQuest lesson={lesson} questAttempts={questAttempts} onQuestSaved={onQuestSaved} />
          ) : (
            <LessonBlock title="Arcade Locked">Pass the mastery check with 80% or higher to unlock the learning arcade.</LessonBlock>
          )
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600">
          {masteryPassed ? "Arcade unlocked" : "Complete each step in order to unlock the arcade."}
        </p>
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
            disabled={isLastStep || nextStepLocked}
            className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
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
  const [activeGame, setActiveGame] = useState<"shooter" | "evidence" | "car" | "crossing">("shooter");
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
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">PSSA Learning Arcade</p>
          <h4 className="mt-1 text-xl font-bold text-slate-950">PSSA Skill Arcade</h4>
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
          {open ? "Close Arcade" : "Enter Arcade"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              onClick={() => setActiveGame("shooter")}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                activeGame === "shooter" ? "border-cyan-400 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${activeGame === "shooter" ? "text-cyan-200" : "text-cyan-700"}`}>Arcade Game 1</p>
              <h5 className="mt-1 text-lg font-black">Space Skill Shooter</h5>
              <p className={`mt-2 text-sm ${activeGame === "shooter" ? "text-slate-300" : "text-slate-600"}`}>Move, aim, and blast the ship carrying the correct answer.</p>
            </button>
            <button
              onClick={() => setActiveGame("car")}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                activeGame === "car" ? "border-amber-400 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${activeGame === "car" ? "text-amber-200" : "text-amber-700"}`}>Arcade Game 2</p>
              <h5 className="mt-1 text-lg font-black">Skill Speed Rally</h5>
              <p className={`mt-2 text-sm ${activeGame === "car" ? "text-slate-300" : "text-slate-600"}`}>Drive into the lane with the answer that matches the skill.</p>
            </button>
            <button
              onClick={() => setActiveGame("crossing")}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                activeGame === "crossing" ? "border-lime-400 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${activeGame === "crossing" ? "text-lime-200" : "text-lime-700"}`}>Arcade Game 3</p>
              <h5 className="mt-1 text-lg font-black">Reading Road Crossing</h5>
              <p className={`mt-2 text-sm ${activeGame === "crossing" ? "text-slate-300" : "text-slate-600"}`}>Cross the road by stepping on the correct answer path.</p>
            </button>
            <button
              onClick={() => setActiveGame("evidence")}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                activeGame === "evidence" ? "border-emerald-400 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${activeGame === "evidence" ? "text-emerald-200" : "text-emerald-700"}`}>Arcade Game 4</p>
              <h5 className="mt-1 text-lg font-black">Evidence Runner</h5>
              <p className={`mt-2 text-sm ${activeGame === "evidence" ? "text-slate-300" : "text-slate-600"}`}>Travel station to station, collect clues, and finish the evidence mission.</p>
            </button>
          </div>

          {activeGame === "shooter" ? (
            <SpaceShooterGame lesson={lesson} onGameSaved={(attempt) => onQuestSaved({ ...attempt, feedback: attempt.feedback })} />
          ) : activeGame === "car" ? (
            <ArcadeMiniGame lesson={lesson} variant="car" onGameSaved={(attempt) => onQuestSaved({ ...attempt, feedback: attempt.feedback })} />
          ) : activeGame === "crossing" ? (
            <ArcadeMiniGame lesson={lesson} variant="crossing" onGameSaved={(attempt) => onQuestSaved({ ...attempt, feedback: attempt.feedback })} />
          ) : (
            <EvidenceArcadeQuest
              activeStation={activeStation}
              setActiveStation={setActiveStation}
              responses={responses}
              setResponses={setResponses}
              inferenceOptions={inferenceOptions}
              evidenceOptions={evidenceOptions}
              latestAttempt={latestAttempt}
              feedback={feedback}
              saving={saving}
              submitQuest={submitQuest}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}

function EvidenceArcadeQuest({
  activeStation,
  setActiveStation,
  responses,
  setResponses,
  inferenceOptions,
  evidenceOptions,
  latestAttempt,
  feedback,
  saving,
  submitQuest,
}: {
  activeStation: "read" | "infer" | "evidence" | "explain";
  setActiveStation: (station: "read" | "infer" | "evidence" | "explain") => void;
  responses: { inference: string; evidence: string; explanation: string };
  setResponses: (updater: (previous: { inference: string; evidence: string; explanation: string }) => { inference: string; evidence: string; explanation: string }) => void;
  inferenceOptions: string[];
  evidenceOptions: string[];
  latestAttempt: any;
  feedback: any;
  saving: boolean;
  submitQuest: () => void;
}) {
  const stations: Array<{ id: "read" | "infer" | "evidence" | "explain"; label: string; x: string; y: string }> = [
    { id: "read", label: "Read", x: "18%", y: "44%" },
    { id: "infer", label: "Infer", x: "38%", y: "30%" },
    { id: "evidence", label: "Evidence", x: "62%", y: "46%" },
    { id: "explain", label: "Explain", x: "84%", y: "24%" },
  ];
  const stationIndex = stations.findIndex((station) => station.id === activeStation);
  const player = stations[Math.max(0, stationIndex)];

  function StationChoice({
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
        <h6 className="text-xl font-black text-white">{title}</h6>
        <div className="mt-4 grid gap-3">
          {choices.map((choice, index) => {
            const picked = selected === choice;
            return (
              <button
                key={choice}
                onClick={() => onSelect(choice)}
                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left text-sm font-bold transition ${
                  picked ? "border-yellow-200 bg-yellow-300 text-slate-950" : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${picked ? "bg-slate-950 text-yellow-200" : "bg-slate-950/70 text-cyan-200"}`}>
                  {index + 1}
                </span>
                <span>{choice}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onNext}
          disabled={!selected}
          className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_18px_rgba(110,231,183,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run to Next Station
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm ring-1 ring-slate-800">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Evidence Runner</p>
          <h5 className="mt-1 text-2xl font-black">Find the Evidence Arcade</h5>
          <p className="mt-2 text-sm text-slate-300">Move through the stations, collect the strongest clue, and explain your thinking.</p>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-2 text-center text-sm">
          <p className="text-xs uppercase text-slate-400">Station</p>
          <p className="text-xl font-black">{stationIndex + 1}/4</p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_top,#0f766e_0%,#0f172a_42%,#020617_100%)] p-5">
          <div className="absolute left-[7%] top-10 h-1 w-1 rounded-full bg-white" />
          <div className="absolute right-[22%] top-20 h-1.5 w-1.5 rounded-full bg-cyan-200" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-emerald-300/20" />
          <div className="absolute left-[12%] top-[48%] h-2 w-[72%] -rotate-12 rounded-full border-t-8 border-dashed border-yellow-200/40" />

          {stations.map((station, index) => {
            const reached = index <= stationIndex;
            return (
              <button
                key={station.id}
                onClick={() => setActiveStation(station.id)}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-sm font-black shadow-xl transition ${
                  activeStation === station.id
                    ? "border-yellow-200 bg-yellow-300 text-slate-950"
                    : reached
                      ? "border-emerald-200 bg-emerald-400 text-slate-950"
                      : "border-white/20 bg-slate-900 text-white"
                }`}
                style={{ left: station.x, top: station.y }}
              >
                <span className="block text-xs uppercase opacity-75">Station {index + 1}</span>
                {station.label}
              </button>
            );
          })}

          <div
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-500"
            style={{ left: player.x, top: `calc(${player.y} - 70px)` }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-slate-950 text-sm font-black text-white shadow-[0_0_24px_rgba(110,231,183,0.65)]">
              YOU
            </div>
            <div className="h-8 w-2 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]" />
          </div>

          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Scene Text</p>
            <p className="mt-2 text-sm leading-6 text-white">
              Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 p-5">
          {activeStation === "read" && (
            <div>
              <h6 className="text-xl font-black text-white">Station 1: Read the Scene</h6>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Look for clues about Maya. The game is asking what you can figure out from the clues, not only what the sentence says directly.
              </p>
              <button onClick={() => setActiveStation("infer")} className="mt-5 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950">
                Run to Inference
              </button>
            </div>
          )}

          {activeStation === "infer" && (
            <StationChoice
              title="Station 2: Choose the Inference"
              choices={inferenceOptions}
              selected={responses.inference}
              onSelect={(value) => setResponses((previous) => ({ ...previous, inference: value }))}
              onNext={() => setActiveStation("evidence")}
            />
          )}

          {activeStation === "evidence" && (
            <StationChoice
              title="Station 3: Collect the Best Evidence"
              choices={evidenceOptions}
              selected={responses.evidence}
              onSelect={(value) => setResponses((previous) => ({ ...previous, evidence: value }))}
              onNext={() => setActiveStation("explain")}
            />
          )}

          {activeStation === "explain" && (
            <div>
              <h6 className="text-xl font-black text-white">Station 4: Explain the Clue</h6>
              <p className="mt-3 text-sm leading-6 text-slate-300">Finish the mission by explaining how the evidence supports your inference.</p>
              <textarea
                className="mt-4 min-h-32 w-full rounded-2xl border border-white/15 bg-slate-950 p-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
                value={responses.explanation}
                onChange={(event) => setResponses((previous) => ({ ...previous, explanation: event.target.value }))}
                placeholder="This shows Maya is nervous because..."
              />
              <button
                onClick={submitQuest}
                disabled={saving}
                className="mt-4 rounded-xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_18px_rgba(253,224,71,0.45)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Finish Mission and Earn XP"}
              </button>
            </div>
          )}

          {latestAttempt ? (
            <div className="mt-5 rounded-2xl bg-emerald-300/15 p-4 text-sm text-emerald-50 ring-1 ring-emerald-200/20">
              <p className="font-black">Latest run: {latestAttempt.score}/{latestAttempt.maxScore} with {latestAttempt.xpEarned} XP</p>
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-700">
              <p className="font-black text-emerald-900">{feedback.performance}</p>
              <p className="mt-1">{feedback.studentMessage}</p>
              {Array.isArray(feedback.nextSteps) && feedback.nextSteps.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {feedback.nextSteps.map((step: string) => <li key={step}>{step}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ArcadeMiniGame({
  lesson,
  variant,
  onGameSaved,
}: {
  lesson: any;
  variant: "car" | "crossing";
  onGameSaved: (attempt: any) => void;
}) {
  const isCar = variant === "car";
  const rounds = useMemo(() => isCar ? buildCarRallyRounds() : buildRoadCrossingRounds(), [isCar]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedLane, setSelectedLane] = useState(1);
  const [boosting, setBoosting] = useState(false);
  const [status, setStatus] = useState(variant === "car" ? "Pick the synonym or antonym lane. Correct answers make your car faster." : "Choose the safe path with the best theme or main idea answer.");
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<any>(null);
  const round = rounds[roundIndex];
  const finished = roundIndex >= rounds.length;
  const title = isCar ? "Skill Speed Rally" : "Reading Road Crossing";
  const laneCenters = [16.66, 50, 83.33];
  const speedLevel = isCar ? Math.min(4, score + 1) : 1;
  const roadSpeed = `${Math.max(0.38, 1.35 - score * 0.28)}s`;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (finished || selectedId) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedLane((value) => Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedLane((value) => Math.min(2, value + 1));
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        chooseLane();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function moveLane(amount: number) {
    setSelectedLane((value) => Math.max(0, Math.min(2, value + amount)));
  }

  function chooseLane() {
    if (!round) return;
    chooseAnswer(round.options[selectedLane]);
  }

  function chooseAnswer(option: any) {
    if (finished || selectedId) return;
    const correct = option.id === round.correctId;
    setBoosting(true);
    setSelectedId(option.id);
    setAnswers((previous) => [...previous, { prompt: round.prompt, selected: option.label, correctAnswer: round.options.find((item) => item.id === round.correctId)?.label, correct }]);
    if (correct) {
      setScore((value) => value + 1);
      setStatus(isCar ? "Clean lane. Speed increased." : "Safe crossing. You found the strongest theme or main idea path.");
    } else {
      setStatus(isCar ? "Wrong lane. Your speed holds steady. Watch whether the mission asks for synonym or antonym." : "Careful. Pick the path that matches the whole text, not just one detail.");
    }
    window.setTimeout(() => {
      setSelectedId("");
      setBoosting(false);
      setRoundIndex((value) => value + 1);
      setSelectedLane(1);
    }, 850);
  }

  async function saveGame() {
    setSaving(true);
    const res = await fetch("/api/student/quest-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson.id,
        responses: {
          mode: "arcade-mini-game",
          gameType: variant,
          score,
          maxScore: rounds.length,
          answers,
        },
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setSavedFeedback(json.feedback);
      onGameSaved({ ...json.attempt, feedback: json.feedback });
    } else {
      setStatus(json.error || "The game score could not be saved.");
    }
  }

  function resetGame() {
    setRoundIndex(0);
    setScore(0);
    setAnswers([]);
    setSelectedId("");
    setSelectedLane(1);
    setBoosting(false);
    setSavedFeedback(null);
    setStatus(isCar ? "Pick the synonym or antonym lane. Correct answers make your car faster." : "Choose the safe path with the best theme or main idea answer.");
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm ring-1 ring-slate-800">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isCar ? "text-amber-300" : "text-lime-300"}`}>{isCar ? "Car Arcade" : "Road Crossing Arcade"}</p>
          <h5 className="mt-1 text-2xl font-black">{title}</h5>
          <p className="mt-2 text-sm text-slate-300">{isCar ? "Steer into synonym and antonym lanes. Each correct answer increases your speed." : "Cross one road at a time by choosing the best theme or main idea path."}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <p className="text-xs uppercase text-slate-400">Score</p>
            <p className="text-xl font-black">{score}/{rounds.length}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <p className="text-xs uppercase text-slate-400">Round</p>
            <p className="text-xl font-black">{Math.min(roundIndex + 1, rounds.length)}/{rounds.length}</p>
          </div>
          {isCar ? (
            <div className="col-span-2 rounded-xl bg-amber-300 px-4 py-2 text-slate-950">
              <p className="text-xs uppercase opacity-70">Speed</p>
              <p className="text-xl font-black">Level {speedLevel}</p>
            </div>
          ) : null}
        </div>
      </div>

      {!finished ? (
        <div className={`relative min-h-[560px] overflow-hidden p-5 ${isCar ? "bg-[radial-gradient(circle_at_top,#92400e_0%,#0f172a_42%,#020617_100%)]" : "bg-[radial-gradient(circle_at_top,#365314_0%,#0f172a_42%,#020617_100%)]"}`}>
          <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-lg">
            <p className={`text-xs font-semibold uppercase tracking-wide ${isCar ? "text-amber-200" : "text-lime-200"}`}>Mission</p>
            <h6 className="mt-1 text-xl font-black">{round.prompt}</h6>
            <p className="mt-2 text-sm text-slate-300">{status}</p>
          </div>

          {isCar ? (
            <div className="absolute inset-x-5 bottom-5 top-36 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
              <style>{`
                @keyframes rallyRoadRush {
                  from { transform: translateY(-96px); }
                  to { transform: translateY(96px); }
                }
                @keyframes rallyCarHum {
                  0%, 100% { transform: translateX(-50%) translateY(0); }
                  50% { transform: translateX(-50%) translateY(-4px); }
                }
              `}</style>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,1)_0%,rgba(31,41,55,1)_50%,rgba(15,23,42,1)_100%)]" />
              <div className="absolute inset-y-0 left-1/3 w-1 bg-yellow-200/60" />
              <div className="absolute inset-y-0 left-2/3 w-1 bg-yellow-200/60" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((stripe) => (
                <div
                  key={stripe}
                  className="absolute left-[49.5%] h-12 w-2 rounded-full bg-white/50"
                  style={{ top: `${stripe * 15 - 10}%`, animation: `rallyRoadRush ${roadSpeed} linear infinite` }}
                />
              ))}
              <div className="absolute left-3 top-12 h-10 w-7 rounded-lg bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.65)]" style={{ animation: `rallyRoadRush ${roadSpeed} linear infinite` }} />
              <div className="absolute right-4 top-48 h-10 w-7 rounded-lg bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.65)]" style={{ animation: `rallyRoadRush ${roadSpeed} linear infinite` }} />
              <div className="absolute left-[8%] top-32 h-6 w-6 rounded-full bg-red-400/80" style={{ animation: `rallyRoadRush ${roadSpeed} linear infinite` }} />
              <div className="absolute right-[10%] top-72 h-6 w-6 rounded-full bg-red-400/80" style={{ animation: `rallyRoadRush ${roadSpeed} linear infinite` }} />

              <div className="absolute inset-x-4 top-5 grid grid-cols-3 gap-3">
                {round.options.map((option, index) => {
                  const picked = selectedId === option.id;
                  const correct = option.id === round.correctId;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedLane(index)}
                      disabled={!!selectedId}
                      className={`min-h-24 rounded-2xl border p-2 text-sm font-black transition ${
                        selectedLane === index ? "scale-105 border-amber-200 bg-amber-300 text-slate-950" : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                      } ${picked ? (correct ? "ring-4 ring-emerald-300" : "ring-4 ring-rose-300") : ""}`}
                    >
                      <span className="block text-[11px] uppercase opacity-70">Lane {index + 1}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div
                className={`absolute bottom-16 z-20 flex w-20 flex-col items-center transition-all duration-300 ${boosting ? "bottom-44 scale-110" : ""}`}
                style={{ left: `${laneCenters[selectedLane]}%`, animation: `rallyCarHum ${roadSpeed} ease-in-out infinite` }}
              >
                <div className="relative h-16 w-16 rounded-[1.15rem] border-2 border-white bg-gradient-to-b from-red-400 to-red-700 shadow-[0_0_28px_rgba(248,113,113,0.65)]">
                  <div className="absolute left-1/2 top-[-10px] h-7 w-9 -translate-x-1/2 rounded-t-xl bg-cyan-200" />
                  <div className="absolute left-1 top-2 h-5 w-3 rounded bg-yellow-200" />
                  <div className="absolute right-1 top-2 h-5 w-3 rounded bg-yellow-200" />
                  <div className="absolute inset-x-[-8px] bottom-2 flex justify-between">
                    <span className="h-5 w-5 rounded-full border-2 border-slate-400 bg-slate-950" />
                    <span className="h-5 w-5 rounded-full border-2 border-slate-400 bg-slate-950" />
                  </div>
                </div>
                <div className="mt-[-2px] flex gap-6">
                  <span className={`rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)] ${score >= 2 ? "h-14 w-3" : score >= 1 ? "h-10 w-3" : "h-7 w-2"}`} />
                  <span className={`rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)] ${score >= 2 ? "h-14 w-3" : score >= 1 ? "h-10 w-3" : "h-7 w-2"}`} />
                </div>
              </div>

              <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-center gap-3">
                <button onClick={() => moveLane(-1)} disabled={!!selectedId} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/20 disabled:opacity-50">Left</button>
                <button onClick={chooseLane} disabled={!!selectedId} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(252,211,77,0.55)] disabled:opacity-50">Drive</button>
                <button onClick={() => moveLane(1)} disabled={!!selectedId} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/20 disabled:opacity-50">Right</button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-x-5 bottom-5 top-36">
              <div className="absolute inset-0 rounded-3xl bg-slate-900/80">
                {[0, 1, 2, 3].map((lane) => (
                  <div key={lane} className="absolute left-0 right-0 h-1 bg-white/20" style={{ top: `${22 + lane * 20}%` }} />
                ))}
                <div className="absolute left-0 top-[30%] h-10 w-28 animate-pulse rounded-xl bg-red-500/80" />
                <div className="absolute right-0 top-[58%] h-10 w-32 animate-pulse rounded-xl bg-blue-500/80" />
              </div>
              <div className="absolute left-1/2 top-4 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-lime-300 text-xs font-black text-slate-950 shadow-[0_0_24px_rgba(190,242,100,0.7)]">
                START
              </div>
              <div className="absolute bottom-4 left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-emerald-400 text-xs font-black text-slate-950">
                GOAL
              </div>
              <div className="absolute inset-x-0 top-[42%] grid grid-cols-3 gap-3 px-3">
                {round.options.map((option, index) => {
                  const picked = selectedId === option.id;
                  const correct = option.id === round.correctId;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedLane(index)}
                      disabled={!!selectedId}
                      className={`min-h-28 rounded-2xl border p-3 text-center text-sm font-black transition ${
                        picked
                          ? correct
                            ? "border-emerald-200 bg-emerald-300 text-slate-950"
                            : "border-rose-200 bg-rose-300 text-slate-950"
                          : selectedLane === index
                            ? "border-lime-200 bg-lime-300 text-slate-950"
                            : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      <span className="mx-auto mb-3 block h-10 w-14 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(190,242,100,0.7)]" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div
                className={`absolute bottom-24 z-20 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-slate-950 text-xs font-black text-white shadow-[0_0_24px_rgba(190,242,100,0.7)] transition-all duration-300 ${boosting ? "bottom-56 scale-110" : ""}`}
                style={{ left: `${laneCenters[selectedLane]}%` }}
              >
                YOU
              </div>
              <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-center gap-3">
                <button onClick={() => moveLane(-1)} disabled={!!selectedId} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/20 disabled:opacity-50">Left</button>
                <button onClick={chooseLane} disabled={!!selectedId} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(190,242,100,0.55)] disabled:opacity-50">Cross</button>
                <button onClick={() => moveLane(1)} disabled={!!selectedId} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-black text-white ring-1 ring-white/20 disabled:opacity-50">Right</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950 p-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <h6 className="text-2xl font-black">Game Complete</h6>
            <p className="mt-2 text-slate-200">Final score: {score}/{rounds.length}</p>
            {savedFeedback ? (
              <div className="mt-4 rounded-xl bg-emerald-400/15 p-4 text-sm text-emerald-50">
                <p className="font-bold">{savedFeedback.performance}</p>
                <p className="mt-1">{savedFeedback.studentMessage}</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={saveGame} disabled={saving || !!savedFeedback} className={`rounded-xl px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50 ${isCar ? "bg-amber-300" : "bg-lime-300"}`}>
                {saving ? "Saving..." : savedFeedback ? "Score Saved" : "Save XP"}
              </button>
              <button onClick={resetGame} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpaceShooterGame({
  lesson,
  onGameSaved,
}: {
  lesson: any;
  onGameSaved: (attempt: any) => void;
}) {
  const rounds = useMemo(() => buildShooterRounds(lesson.skill), [lesson.skill]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState<any[]>([]);
  const [status, setStatus] = useState("Move your ship under the correct answer and fire.");
  const [playerX, setPlayerX] = useState(50);
  const [laser, setLaser] = useState<{ x: number; targetId: string; correct: boolean } | null>(null);
  const [explosionId, setExplosionId] = useState("");
  const [enemyDrift, setEnemyDrift] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<any>(null);
  const round = rounds[roundIndex];
  const finished = roundIndex >= rounds.length;
  const enemyLanes = [
    { left: 18, top: 36 },
    { left: 50, top: 24 },
    { left: 82, top: 36 },
  ];
  const activeEnemies = round
    ? round.options.map((option, index) => ({
        ...option,
        ...enemyLanes[index % enemyLanes.length],
        drift: Math.sin(enemyDrift / 8 + index) * 5,
      }))
    : [];

  useEffect(() => {
    if (finished) return;
    const intervalId = window.setInterval(() => {
      setEnemyDrift((value) => (value + 1) % 240);
    }, 80);
    return () => window.clearInterval(intervalId);
  }, [finished, roundIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (finished || laser) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePlayer(-12);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePlayer(12);
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        fireLaser();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function movePlayer(amount: number) {
    setPlayerX((value) => Math.max(12, Math.min(88, value + amount)));
  }

  function fireLaser() {
    if (finished || laser || !round) return;
    const target = activeEnemies.reduce((closest, enemy) => {
      const closestDistance = Math.abs(playerX - (closest.left + closest.drift));
      const enemyDistance = Math.abs(playerX - (enemy.left + enemy.drift));
      return enemyDistance < closestDistance ? enemy : closest;
    }, activeEnemies[0]);

    if (!target || Math.abs(playerX - (target.left + target.drift)) > 16) {
      setStatus("Move closer to a ship before firing.");
      return;
    }

    resolveShot(target, target.left + target.drift);
  }

  function resolveShot(option: any, targetX: number) {
    if (finished || laser || !round) return;
    const correct = option.id === round.correctId;
    const nextShots = [...shots, { prompt: round.prompt, selected: option.label, correctAnswer: round.options.find((item) => item.id === round.correctId)?.label, correct }];
    setShots(nextShots);
    setLaser({ x: targetX, targetId: option.id, correct });
    setExplosionId(option.id);
    if (correct) {
      setScore((value) => value + 1);
      setStatus("Direct hit. You found the correct target.");
    } else {
      setStatus("Miss. Read the mission carefully and try the next round.");
    }
    window.setTimeout(() => {
      setLaser(null);
      setExplosionId("");
      setRoundIndex((value) => value + 1);
      setPlayerX(50);
    }, 850);
  }

  async function saveGame() {
    setSaving(true);
    const res = await fetch("/api/student/quest-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson.id,
        responses: {
          mode: "space-shooter",
          gameType: shooterGameType(lesson.skill),
          score,
          maxScore: rounds.length,
          shots,
        },
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setSavedFeedback(json.feedback);
      onGameSaved({ ...json.attempt, feedback: json.feedback });
    } else {
      setStatus(json.error || "The game score could not be saved.");
    }
  }

  function resetGame() {
    setRoundIndex(0);
    setScore(0);
    setShots([]);
    setLaser(null);
    setExplosionId("");
    setPlayerX(50);
    setStatus("Move your ship under the correct answer and fire.");
    setSavedFeedback(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm ring-1 ring-slate-800">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Space Skill Shooter</p>
          <h5 className="mt-1 text-2xl font-bold">Shoot the Correct Ship</h5>
          <p className="mt-2 text-sm text-slate-300">
            {shooterGameType(lesson.skill) === "figurative language"
              ? "Find the ship carrying the correct figurative-language type."
              : "Find the ship carrying the correct synonym or antonym."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-sm">
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <p className="text-xs uppercase text-slate-400">Score</p>
            <p className="text-xl font-bold">{score}/{rounds.length}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <p className="text-xs uppercase text-slate-400">Round</p>
            <p className="text-xl font-bold">{Math.min(roundIndex + 1, rounds.length)}/{rounds.length}</p>
          </div>
        </div>
      </div>

      {!finished ? (
        <div className="relative min-h-[620px] overflow-hidden bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#0f172a_38%,#020617_100%)] p-5">
          <div className="absolute left-[10%] top-12 h-1 w-1 rounded-full bg-white" />
          <div className="absolute left-[28%] top-24 h-1.5 w-1.5 rounded-full bg-cyan-200" />
          <div className="absolute right-[22%] top-16 h-1 w-1 rounded-full bg-white" />
          <div className="absolute right-[8%] top-40 h-1.5 w-1.5 rounded-full bg-yellow-200" />
          <div className="absolute left-[42%] top-56 h-1 w-1 rounded-full bg-white" />
          <div className="absolute right-[38%] top-72 h-1.5 w-1.5 rounded-full bg-cyan-100" />

          <div className="relative z-10 rounded-2xl border border-cyan-300/30 bg-slate-950/75 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Mission Target</p>
            <h6 className="mt-1 text-xl font-bold">{round.prompt}</h6>
            <p className="mt-2 text-sm text-slate-300">{status} Use arrow keys or the controls below.</p>
          </div>

          <div className="absolute inset-x-5 top-40 h-[330px]">
            {activeEnemies.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setPlayerX(Math.max(12, Math.min(88, option.left + option.drift)));
                  setStatus("Target locked. Press Fire Laser.");
                }}
                className={`group absolute w-28 -translate-x-1/2 rounded-2xl border p-2 text-center shadow-xl transition ${
                  explosionId === option.id
                    ? option.id === round.correctId
                      ? "scale-90 border-emerald-300 bg-emerald-500/30"
                      : "scale-90 border-rose-300 bg-rose-500/30"
                    : "border-cyan-300/30 bg-slate-900/90 hover:-translate-y-1 hover:border-cyan-200 hover:bg-slate-800"
                }`}
                style={{ left: `${option.left + option.drift}%`, top: `${option.top}%` }}
                disabled={!!laser}
              >
                <div className="mx-auto flex w-20 flex-col items-center">
                  <div className="flex items-end gap-1">
                    <span className="h-8 w-4 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
                    <span className="h-0 w-0 border-x-[16px] border-b-[28px] border-x-transparent border-b-cyan-300 group-hover:border-b-cyan-100" />
                    <span className="h-8 w-4 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.8)]" />
                  </div>
                  <div className="h-9 w-16 rounded-b-2xl rounded-t-md border border-cyan-200/50 bg-gradient-to-b from-cyan-500 to-blue-700 shadow-lg" />
                  <div className="mt-[-7px] h-3 w-10 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.9)]" />
                </div>
                <p className="mt-2 break-words rounded-lg bg-white px-2 py-1 text-xs font-black leading-tight text-slate-950">{option.label}</p>
                {explosionId === option.id ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-yellow-200 bg-orange-400/40 shadow-[0_0_36px_16px_rgba(251,191,36,0.8)]" />
                ) : null}
              </button>
            ))}
          </div>

          {laser ? (
            <div
              className={`absolute bottom-32 top-40 z-10 w-2 -translate-x-1/2 rounded-full ${
                laser.correct ? "bg-cyan-200 shadow-[0_0_32px_10px_rgba(125,211,252,0.9)]" : "bg-rose-300 shadow-[0_0_32px_10px_rgba(253,164,175,0.9)]"
              }`}
              style={{ left: `${laser.x}%` }}
            />
          ) : null}

          <div className="absolute bottom-20 z-20 flex -translate-x-1/2 flex-col items-center transition-[left] duration-150" style={{ left: `${playerX}%` }}>
            <div className="h-0 w-0 border-x-[24px] border-b-[52px] border-x-transparent border-b-slate-100 shadow-[0_0_24px_rgba(34,211,238,0.5)]" />
            <div className="-mt-3 flex items-end gap-2">
              <span className="h-12 w-5 rounded-t-full bg-cyan-400" />
              <span className="h-10 w-16 rounded-t-3xl border border-cyan-100/70 bg-gradient-to-b from-blue-400 to-slate-800" />
              <span className="h-12 w-5 rounded-t-full bg-cyan-400" />
            </div>
            <div className="-mt-1 flex gap-8">
              <span className="h-8 w-2 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]" />
              <span className="h-8 w-2 rounded-full bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]" />
            </div>
            <p className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">PLAYER</p>
          </div>

          <div className="absolute inset-x-5 bottom-4 z-30 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => movePlayer(-14)} disabled={!!laser} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 disabled:opacity-50">
              Move Left
            </button>
            <button onClick={fireLaser} disabled={!!laser} className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.55)] disabled:opacity-50">
              Fire Laser
            </button>
            <button onClick={() => movePlayer(14)} disabled={!!laser} className="rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 disabled:opacity-50">
              Move Right
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-6">
          <div className="rounded-2xl border border-cyan-300/30 bg-white/10 p-5">
            <h6 className="text-2xl font-bold">Mission Complete</h6>
            <p className="mt-2 text-slate-200">Final score: {score}/{rounds.length}</p>
            {savedFeedback ? (
              <div className="mt-4 rounded-xl bg-emerald-400/15 p-4 text-sm text-emerald-50">
                <p className="font-bold">{savedFeedback.performance}</p>
                <p className="mt-1">{savedFeedback.studentMessage}</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={saveGame} disabled={saving || !!savedFeedback} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
                {saving ? "Saving..." : savedFeedback ? "Score Saved" : "Save XP"}
              </button>
              <button onClick={resetGame} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
  if (lower.includes("setting")) return { name: "Setting Explorer World", bgClass: "border-cyan-200 bg-cyan-50", description: "Explore how time, place, and environment affect characters, mood, plot, and theme." };
  if (lower.includes("plot")) return { name: "Plot Quest World", bgClass: "border-amber-200 bg-amber-50", description: "Track conflict, key events, cause and effect, and resolution." };
  if (lower.includes("evidence")) return { name: "Text Evidence World", bgClass: "border-blue-200 bg-blue-50", description: "Find the strongest proof and connect it to your answer." };
  if (lower.includes("main idea")) return { name: "Main Idea World", bgClass: "border-amber-200 bg-amber-50", description: "Sort key details and discover what the text is mostly about." };
  return { name: "Reading World", bgClass: "border-slate-200 bg-slate-50", description: "Practice your current PSSA reading skill with short quests." };
}

function shooterGameType(skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("figurative") || lower.includes("simile") || lower.includes("metaphor")) return "figurative language";
  return "synonym and antonym";
}

function buildCarRallyRounds() {
  return [
    {
      prompt: "Target word: cautious. Drive into the synonym lane.",
      correctId: "careful",
      options: [
        { id: "reckless", label: "reckless" },
        { id: "careful", label: "careful" },
        { id: "sleepy", label: "sleepy" },
      ],
    },
    {
      prompt: "Target word: ancient. Drive into the antonym lane.",
      correctId: "modern",
      options: [
        { id: "historic", label: "historic" },
        { id: "old", label: "old" },
        { id: "modern", label: "modern" },
      ],
    },
    {
      prompt: "Target word: expand. Drive into the antonym lane.",
      correctId: "shrink",
      options: [
        { id: "stretch", label: "stretch" },
        { id: "shrink", label: "shrink" },
        { id: "grow", label: "grow" },
      ],
    },
    {
      prompt: "Target word: gloomy. Drive into the synonym lane.",
      correctId: "dreary",
      options: [
        { id: "cheerful", label: "cheerful" },
        { id: "bright", label: "bright" },
        { id: "dreary", label: "dreary" },
      ],
    },
  ];
}

function buildRoadCrossingRounds() {
  return [
    {
      prompt: "A story shows a student practicing every day until she finally plays the song well. Choose the theme path.",
      correctId: "practice",
      options: [
        { id: "practice", label: "Practice helps people improve." },
        { id: "music", label: "The story is about a piano." },
        { id: "school", label: "The student goes to school." },
      ],
    },
    {
      prompt: "A passage explains how bees help plants grow by moving pollen from flower to flower. Choose the main idea path.",
      correctId: "pollination",
      options: [
        { id: "honey", label: "Bees make honey." },
        { id: "pollination", label: "Bees help plants reproduce." },
        { id: "flowers", label: "Flowers have colors." },
      ],
    },
    {
      prompt: "A character tells the truth even though it is difficult, and others trust him more afterward. Choose the theme path.",
      correctId: "honesty",
      options: [
        { id: "honesty", label: "Honesty builds trust." },
        { id: "talking", label: "People talk to each other." },
        { id: "mistake", label: "The character makes a mistake." },
      ],
    },
    {
      prompt: "A text describes why recycling saves resources and reduces waste. Choose the main idea path.",
      correctId: "recycling",
      options: [
        { id: "trash", label: "Trash goes in bins." },
        { id: "paper", label: "Paper can be recycled." },
        { id: "recycling", label: "Recycling helps protect resources." },
      ],
    },
  ];
}

function buildArcadeMiniRounds(skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("figurative") || lower.includes("simile") || lower.includes("metaphor") || lower.includes("connotation")) {
    return [
      {
        prompt: "Which phrase is a simile?",
        correctId: "simile",
        options: [
          { id: "literal", label: "The room was quiet." },
          { id: "simile", label: "quiet as snow" },
          { id: "metaphor", label: "Silence was a blanket." },
        ],
      },
      {
        prompt: "Which word has the most positive connotation?",
        correctId: "positive",
        options: [
          { id: "positive", label: "confident" },
          { id: "negative", label: "bossy" },
          { id: "neutral", label: "loud" },
        ],
      },
      {
        prompt: "Which phrase is personification?",
        correctId: "personification",
        options: [
          { id: "personification", label: "The leaves danced." },
          { id: "hyperbole", label: "I ran a million miles." },
          { id: "literal", label: "The leaves fell." },
        ],
      },
    ];
  }

  if (lower.includes("plot") || lower.includes("setting") || lower.includes("flashback")) {
    return [
      {
        prompt: "Which answer explains rising action?",
        correctId: "rising-action",
        options: [
          { id: "setting", label: "Where the story happens" },
          { id: "rising-action", label: "Events that build the conflict" },
          { id: "resolution", label: "How the problem ends" },
        ],
      },
      {
        prompt: "Which answer shows setting affecting a character?",
        correctId: "setting-impact",
        options: [
          { id: "setting-impact", label: "The storm makes Ana hurry home." },
          { id: "theme", label: "The lesson is to be honest." },
          { id: "dialogue", label: "Ana says hello." },
        ],
      },
      {
        prompt: "Why might an author use a flashback?",
        correctId: "flashback",
        options: [
          { id: "flashback", label: "To reveal a past event" },
          { id: "title", label: "To name the story" },
          { id: "summary", label: "To list every detail" },
        ],
      },
    ];
  }

  return [
    {
      prompt: "What can the reader infer about Maya?",
      correctId: "nervous",
      options: [
        { id: "nervous", label: "She feels nervous." },
        { id: "bored", label: "She feels bored." },
        { id: "angry", label: "She feels angry." },
      ],
    },
    {
      prompt: "Which detail best supports that inference?",
      correctId: "hands",
      options: [
        { id: "front", label: "She stood at the front." },
        { id: "hands", label: "Her hands shook." },
        { id: "line", label: "She read a line." },
      ],
    },
    {
      prompt: "Which answer is the main idea of the scene?",
      correctId: "main-idea",
      options: [
        { id: "note-card", label: "Maya has a note card." },
        { id: "main-idea", label: "Maya prepares to speak while nervous." },
        { id: "room", label: "The room has a front." },
      ],
    },
  ];
}

function buildShooterRounds(skill: string) {
  if (shooterGameType(skill) === "figurative language") {
    return [
      {
        prompt: "Shoot the ship carrying a simile.",
        correctId: "simile",
        options: [
          { id: "simile", label: "as bright as a lantern" },
          { id: "metaphor", label: "hope was a lantern" },
          { id: "literal", label: "the lantern was on" },
        ],
      },
      {
        prompt: "Shoot the ship carrying a metaphor.",
        correctId: "metaphor",
        options: [
          { id: "literal", label: "the backpack was heavy" },
          { id: "simile", label: "heavy like a stone" },
          { id: "metaphor", label: "worry was a backpack" },
        ],
      },
      {
        prompt: "Shoot the ship carrying personification.",
        correctId: "personification",
        options: [
          { id: "personification", label: "the wind whispered" },
          { id: "hyperbole", label: "I waited forever" },
          { id: "literal", label: "the wind was cold" },
        ],
      },
      {
        prompt: "Shoot the ship carrying hyperbole.",
        correctId: "hyperbole",
        options: [
          { id: "idiom", label: "break the ice" },
          { id: "literal", label: "the ice cracked" },
          { id: "hyperbole", label: "a million questions" },
        ],
      },
      {
        prompt: "Shoot the ship carrying an idiom.",
        correctId: "idiom",
        options: [
          { id: "idiom", label: "under the weather" },
          { id: "metaphor", label: "the sky was a blanket" },
          { id: "literal", label: "rain fell outside" },
        ],
      },
    ];
  }

  return [
    {
      prompt: "Target word: brave. Shoot the synonym.",
      correctId: "courageous",
      options: [
        { id: "timid", label: "timid" },
        { id: "courageous", label: "courageous" },
        { id: "ordinary", label: "ordinary" },
      ],
    },
    {
      prompt: "Target word: ancient. Shoot the antonym.",
      correctId: "modern",
      options: [
        { id: "old", label: "old" },
        { id: "historic", label: "historic" },
        { id: "modern", label: "modern" },
      ],
    },
    {
      prompt: "Target word: cautious. Shoot the synonym.",
      correctId: "careful",
      options: [
        { id: "careful", label: "careful" },
        { id: "reckless", label: "reckless" },
        { id: "quick", label: "quick" },
      ],
    },
    {
      prompt: "Target word: expand. Shoot the antonym.",
      correctId: "shrink",
      options: [
        { id: "grow", label: "grow" },
        { id: "stretch", label: "stretch" },
        { id: "shrink", label: "shrink" },
      ],
    },
    {
      prompt: "Target word: gloomy. Shoot the synonym.",
      correctId: "dreary",
      options: [
        { id: "cheerful", label: "cheerful" },
        { id: "bright", label: "bright" },
        { id: "dreary", label: "dreary" },
      ],
    },
  ];
}

function LessonBlock({ title, children }: { title: string; children: any }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <div className="mt-2 text-sm leading-6 text-slate-700">{children}</div>
    </article>
  );
}

function ReadAloudButton({
  text,
  label = "Listen",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      stopReadAloud();
    };
  }, []);

  function stopReadAloud() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    setSpeaking(false);
    setLoadingAudio(false);
  }

  async function toggleReadAloud() {
    if (typeof window === "undefined") return;
    if (speaking || loadingAudio) return stopReadAloud();

    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    stopReadAloud();

    setLoadingAudio(true);
    setSpeaking(true);
    try {
      const res = await fetch("/api/student/tutor-agent/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice: "nova" }),
      });
      if (!res.ok) throw new Error("Generated audio unavailable");
      const blob = await res.blob();
      if (!blob.size) throw new Error("Generated audio empty");
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopReadAloud;
      audio.onerror = () => speakWithBrowserVoice(clean);
      setLoadingAudio(false);
      await audio.play();
    } catch {
      speakWithBrowserVoice(clean);
    }
  }

  function speakWithBrowserVoice(clean: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      stopReadAloud();
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const voice = chooseLearningPathVoice(window.speechSynthesis.getVoices());
    if (voice) utterance.voice = voice;
    utterance.rate = 0.82;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setLoadingAudio(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button type="button" onClick={toggleReadAloud} className={className} title={speaking || loadingAudio ? "Stop reading" : label}>
      {loadingAudio ? "Loading..." : speaking ? "Stop" : label}
    </button>
  );
}

function chooseLearningPathVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter((voice) => voice.lang?.startsWith("en"));
  const preferred = [
    /Microsoft Aria/i,
    /Microsoft Jenny/i,
    /Google US English/i,
    /Samantha/i,
    /Alex/i,
    /Ava/i,
    /Susan/i,
    /Victoria/i,
    /Karen/i,
    /Moira/i,
    /Tessa/i,
    /Daniel/i,
  ];

  for (const pattern of preferred) {
    const match = englishVoices.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }

  return englishVoices.find((voice) => voice.lang === "en-US") || englishVoices[0] || voices[0] || null;
}

function KeyIdeasBox({ ideas }: { ideas?: string[] }) {
  if (!ideas?.length) return null;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <p className="text-sm font-black">Key Ideas</p>
        <span className="text-xs font-black text-cyan-200">Support</span>
      </div>
      <div className="grid gap-2 p-4">
        {ideas.map((idea) => (
          <div key={idea} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
            <ReadAloudButton
              text={idea}
              label="Hear"
              className="h-fit rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            />
            <p>{idea}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstructionPlayer({ lesson, onContinue, immersive = false }: { lesson: any; onContinue: () => void; immersive?: boolean }) {
  const deck = useMemo(() => instructionDeckForLesson(lesson), [lesson]);
  const lessonImageUrl = getLessonImageUrl(lesson);
  const [screenIndex, setScreenIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedPhrase, setSelectedPhrase] = useState("");
  const [selectedBreaks, setSelectedBreaks] = useState<Record<string, string>>({});
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [selectedSorts, setSelectedSorts] = useState<Record<string, string>>({});
  const screen = deck.screens[screenIndex] || deck.screens[0];
  const progress = Math.round(((screenIndex + 1) / deck.screens.length) * 100);
  const wordReady = screen.kind !== "word-build" || selectedWord === screen.answer;
  const phraseReady = screen.kind !== "phrase-match" || selectedPhrase === screen.answer;
  const breakReady = screen.kind !== "sentence-break" || screen.parts.every((part) => selectedBreaks[part.id] === part.answer);
  const matchReady = screen.kind !== "question-match" || screen.rows.every((row) => selectedMatches[row.id] === row.answer);
  const sortReady = screen.kind !== "evidence-sort" || screen.cards.every((card) => selectedSorts[card.id] === card.answer);
  const canAdvance = wordReady && phraseReady && breakReady && matchReady && sortReady;

  function advance() {
    if (!canAdvance) return;
    if (screenIndex < deck.screens.length - 1) {
      setScreenIndex((current) => current + 1);
      setSelectedWord("");
      setSelectedPhrase("");
      setSelectedBreaks({});
      setSelectedMatches({});
      setSelectedSorts({});
      return;
    }
    onContinue();
  }

  return (
    <article className={`${immersive ? "overflow-hidden rounded-none border-0 bg-white shadow-none md:rounded-2xl md:border md:border-slate-200" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}`}>
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">Instruction - Level {lesson.gradeLevel || ""}</p>
            <h4 className="mt-1 text-xl font-black">{deck.title}</h4>
          </div>
          <button
            type="button"
            className="w-fit rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white"
            title={deck.glossary.definition}
          >
            Glossary
          </button>
        </div>
        <div className="h-2 bg-white/10">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`${immersive ? "min-h-[calc(100vh-280px)] bg-gradient-to-br from-cyan-50 via-indigo-50 to-amber-50 p-4 md:p-6" : "bg-gradient-to-br from-cyan-50 via-indigo-50 to-amber-50 p-5"}`}>
        <div className={`mx-auto rounded-2xl border-4 border-[#0b2a5b] bg-white p-5 ${immersive ? "max-w-7xl" : "max-w-5xl"}`}>
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0b2a5b] text-sm font-black text-white">A</span>
            <p className="text-base leading-7 text-slate-900">{screen.prompt}</p>
            <ReadAloudButton
              text={screen.prompt}
              label="Listen"
              className="ml-auto shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#0b2a5b] ring-1 ring-slate-200 hover:bg-slate-50"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Model Text</p>
                <ReadAloudButton
                  text={`${deck.passageTitle}. ${deck.passageBefore} ${deck.focusWord} ${deck.passageAfter}. ${deck.glossary.term}: ${deck.glossary.definition}`}
                  label="Listen to text"
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
                />
              </div>
              <h5 className="mt-2 text-xl font-black text-slate-950">{deck.passageTitle}</h5>
              <LessonVisualPanel
                title={deck.passageTitle}
                text={`${deck.passageBefore} ${deck.focusWord} ${deck.passageAfter}`}
                skill={lesson.skill}
                gradeLevel={lesson.gradeLevel}
                imageUrl={lessonImageUrl}
                className="mt-4"
              />
              <p className={`mt-4 text-slate-800 ${immersive ? "text-lg leading-9" : "text-base leading-8"}`}>
                {deck.passageBefore}{" "}
                <span className="rounded bg-yellow-200 px-1 font-bold text-slate-950">{deck.focusWord}</span>{" "}
                {deck.passageAfter}
              </p>
              <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-slate-700 ring-1 ring-cyan-100">
                <span className="font-black text-slate-950">{deck.glossary.term}:</span> {deck.glossary.definition}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
              {screen.kind === "explain" ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Teach</p>
                    <ReadAloudButton
                      text={`${lesson.lessonExplanation} Worked example. ${lesson.workedExample}`}
                      label="Listen"
                      className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-200"
                    />
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-800">{lesson.lessonExplanation}</p>
                  <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                    <p className="font-black text-slate-950">Worked example</p>
                    <p className="mt-1">{lesson.workedExample}</p>
                  </div>
                </div>
              ) : null}

              {screen.kind === "word-build" ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-purple-700">Word Family</p>
                  <div className="mt-5 rounded-xl bg-purple-700 p-4 text-white">
                    <p className="text-sm font-bold">Complete the sentence with a word from the same word family.</p>
                    <p className="mt-4 text-lg font-black leading-8">
                      {screen.sentenceBefore || "The students used details from the passage to"}{" "}
                      <span className="inline-block min-w-32 rounded-lg border-2 border-dashed border-white bg-white/20 px-4 py-2 text-center">
                        {selectedWord || ""}
                      </span>{" "}
                      {screen.sentenceAfter || "their answer."}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {screen.choices.map((choice) => (
                      <button
                        type="button"
                        key={choice}
                        onClick={() => setSelectedWord(choice)}
                        className={`rounded-xl border px-4 py-3 text-sm font-black shadow-sm ${
                          selectedWord === choice ? "border-purple-700 bg-purple-100 text-purple-950" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {screen.kind === "sentence-break" ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-sky-700">Break It Apart</p>
                    <ReadAloudButton
                      text={`${screen.question}. ${screen.parts.map((part) => part.before + " blank " + part.after).join(". ")} Answer bank: ${screen.answerBank.join(", ")}`}
                      label="Listen"
                      className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-black text-sky-800 hover:bg-sky-200"
                    />
                  </div>
                  <p className="mt-3 text-base font-bold text-slate-900">{screen.question}</p>
                  <div className="mt-4 grid gap-3">
                    {screen.parts.map((part) => (
                      <div key={part.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black leading-7 text-slate-900">{part.before}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {screen.answerBank.map((answer) => (
                            <button
                              type="button"
                              key={answer}
                              onClick={() => setSelectedBreaks((previous) => ({ ...previous, [part.id]: answer }))}
                              className={`rounded-lg border px-3 py-2 text-left text-xs font-black leading-5 transition ${
                                selectedBreaks[part.id] === answer
                                  ? "border-sky-700 bg-sky-100 text-sky-950"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                              }`}
                            >
                              {answer}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <KeyIdeasBox ideas={screen.keyIdeas} />
                </div>
              ) : null}

              {screen.kind === "question-match" ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-fuchsia-700">Meaning Match</p>
                    <ReadAloudButton
                      text={`${screen.prompt}. ${screen.rows.map((row) => `${row.prompt} ${row.answer}`).join(". ")}`}
                      label="Listen"
                      className="rounded-lg bg-fuchsia-100 px-3 py-2 text-xs font-black text-fuchsia-800 hover:bg-fuchsia-200"
                    />
                  </div>
                  <p className="mt-3 text-base font-bold text-slate-900">{screen.question}</p>
                  <div className="mt-4 grid gap-3">
                    {screen.rows.map((row) => (
                      <div key={row.id} className="rounded-xl bg-fuchsia-700 p-4 text-sm font-black leading-6 text-white">
                        <p>{row.prompt}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {screen.answerBank.map((answer) => (
                            <button
                              type="button"
                              key={answer}
                              onClick={() => setSelectedMatches((previous) => ({ ...previous, [row.id]: answer }))}
                              className={`rounded-lg border px-3 py-2 text-left text-xs font-black leading-5 transition ${
                                selectedMatches[row.id] === answer
                                  ? "border-white bg-white text-fuchsia-950"
                                  : "border-white/40 bg-white/10 text-white hover:bg-white/20"
                              }`}
                            >
                              {answer}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <KeyIdeasBox ideas={screen.keyIdeas} />
                </div>
              ) : null}

              {screen.kind === "evidence-sort" ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-orange-700">Sort the Evidence</p>
                    <ReadAloudButton
                      text={`${screen.question}. ${screen.cards.map((card) => card.text).join(". ")}`}
                      label="Listen"
                      className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-black text-orange-800 hover:bg-orange-200"
                    />
                  </div>
                  <p className="mt-3 text-base font-bold text-slate-900">{screen.question}</p>
                  <div className="mt-4 grid gap-3">
                    {screen.cards.map((card) => (
                      <div key={card.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm font-bold leading-6 text-slate-900">{card.text}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {screen.labels.map((label) => (
                            <button
                              type="button"
                              key={label}
                              onClick={() => setSelectedSorts((previous) => ({ ...previous, [card.id]: label }))}
                              className={`rounded-lg px-3 py-2 text-xs font-black ring-1 ${
                                selectedSorts[card.id] === label
                                  ? "bg-orange-700 text-white ring-orange-700"
                                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <KeyIdeasBox ideas={screen.keyIdeas} />
                </div>
              ) : null}

              {screen.kind === "phrase-match" ? (
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">Match Meaning</p>
                  <p className="mt-3 text-base font-bold text-slate-900">{screen.question}</p>
                  <div className="mt-4 grid gap-3">
                    {screen.choices.map((choice) => (
                      <button
                        type="button"
                        key={choice}
                        onClick={() => setSelectedPhrase(choice)}
                        className={`rounded-xl border p-4 text-left text-sm font-black leading-6 shadow-sm ${
                          selectedPhrase === choice ? "border-blue-700 bg-blue-100 text-blue-950" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <KeyIdeasBox ideas={screen.keyIdeas} />
                </div>
              ) : null}

              {!canAdvance ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                  Try again. Use the highlighted word and the glossary clue.
                </p>
              ) : screenIndex > 0 ? (
                <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">
                  Nice. That answer matches the clue in the model text.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className={`mx-auto mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between ${immersive ? "max-w-7xl" : "max-w-5xl"}`}>
          <div className="flex items-center gap-2">
            {deck.screens.map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setScreenIndex(index);
                  setSelectedWord("");
                  setSelectedPhrase("");
                  setSelectedBreaks({});
                  setSelectedMatches({});
                  setSelectedSorts({});
                }}
                className={`h-3 rounded-full transition-all ${index === screenIndex ? "w-10 bg-[#0b2a5b]" : index < screenIndex ? "w-3 bg-emerald-500" : "w-3 bg-slate-300"}`}
                aria-label={`Go to instruction screen ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={advance}
            disabled={!canAdvance}
            className="w-fit rounded-xl bg-[#0b2a5b] px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {screenIndex < deck.screens.length - 1 ? "Continue Lesson" : "Start Guided Practice"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PracticeBlock({
  title,
  skill = "",
  questions,
  lessonImageUrl = "",
  savedResponses,
  masteryMode = false,
  onComplete,
}: {
  title: string;
  skill?: string;
  questions: any[];
  lessonImageUrl?: string;
  savedResponses?: any;
  masteryMode?: boolean;
  onComplete: (answers: Record<string, any>, score?: number, results?: any[]) => void;
}) {
  const safeQuestions = useMemo(() => hydratedPracticeQuestions(Array.isArray(questions) ? questions : [], title, skill), [questions, title, skill]);
  const activities = useMemo(
    () => safeQuestions.map((question, index) => buildPracticeActivity(question, index, title, skill, masteryMode)),
    [safeQuestions, title, skill, masteryMode],
  );
  const [answers, setAnswers] = useState<Record<string, any>>(() => savedAnswers(savedResponses, safeQuestions));
  const [submitted, setSubmitted] = useState(Boolean(savedResponses?.completed) && Object.keys(savedAnswers(savedResponses, safeQuestions)).length === safeQuestions.length);
  const answeredCount = activities.filter((activity, index) => isActivityAnswered(activity, answers[String(index)])).length;
  const ready = safeQuestions.length > 0 && answeredCount === safeQuestions.length;
  const results = activities.map((activity, index) => scorePracticeActivity(activity, answers[String(index)]));
  const score = results.length ? Math.round((results.filter((result) => result.correct).length / results.length) * 100) : 0;

  function submitPractice() {
    if (!ready) return;
    setSubmitted(true);
    onComplete(answers, masteryMode ? score : undefined, results);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">{masteryMode ? "Mastery Gate" : "Coached PSSA Mission"}</p>
            <h4 className="mt-1 text-xl font-black">{title}</h4>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/15">
            {answeredCount}/{safeQuestions.length} answered{submitted && masteryMode ? ` | ${score}%` : ""}
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
          {masteryMode
            ? "Prove the skill independently. A score of 80% or higher opens the arcade."
            : "Read, select, sort, match, and explain. Each activity checks a different part of the skill."}
        </p>
      </div>
      <div className="space-y-5 bg-slate-50 p-5">
        {activities.map((activity, index) => (
          <PracticeActivityCard
            key={`${title}-${index}`}
            activity={activity}
            lessonImageUrl={lessonImageUrl}
            answer={answers[String(index)]}
            submitted={submitted}
            masteryMode={masteryMode}
            onAnswer={(value) => {
              if (!submitted || masteryMode) setAnswers((previous) => ({ ...previous, [String(index)]: value }));
              if (submitted && masteryMode) setSubmitted(false);
            }}
          />
        ))}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            {submitted
              ? masteryMode
                ? score >= 80
                  ? "Mastery passed. The arcade is open."
                  : "Score below 80%. Change answers and submit again after reviewing."
                : "Practice complete. Continue to the next tab."
              : "Answer every question to continue."}
          </p>
          <button
            onClick={submitPractice}
            disabled={!ready || (submitted && !masteryMode)}
            className="w-fit rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitted && masteryMode ? "Resubmit Mastery" : submitted ? "Saved" : masteryMode ? "Submit Mastery Check" : "Complete Practice"}
          </button>
        </div>
      </div>
    </article>
  );
}

function LessonVisualPanel({
  title,
  text,
  skill,
  gradeLevel,
  imageUrl,
  visualMetadata,
  className = "",
}: {
  title: string;
  text: string;
  skill?: string;
  gradeLevel?: number;
  imageUrl?: string;
  visualMetadata?: any;
  className?: string;
}) {
  const visual = buildLessonVisual({ title, text, skill, gradeLevel, visualMetadata });

  if (imageUrl) {
    return (
      <figure className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
        <img src={imageUrl} alt={visual.alt} className="h-56 w-full object-cover" />
        <figcaption className="bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{visual.caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className={`overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
      <div className={`relative min-h-56 ${visual.backgroundClass}`}>
        <div className="absolute inset-0 opacity-45" style={visual.patternStyle} />
        <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-4">
          <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <p className={`text-xs font-black uppercase tracking-wide ${visual.accentTextClass}`}>Level {gradeLevel || "ELA"} Visual</p>
            <h5 className="mt-1 max-w-sm text-2xl font-black leading-7 text-slate-950">{visual.headline}</h5>
          </div>
          <div className={`hidden h-16 w-16 rounded-full border-4 border-white shadow-lg sm:block ${visual.badgeClass}`} />
        </div>
        <div className="absolute bottom-5 left-5 right-5 grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl bg-white/92 p-4 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold leading-6 text-slate-800">{visual.caption}</p>
          </div>
          <div className="relative min-h-28 overflow-hidden rounded-2xl bg-white/35 ring-1 ring-white/60">
            {visual.scene === "sequence" ? (
              <SequenceVisual />
            ) : visual.scene === "argument" ? (
              <ArgumentVisual />
            ) : visual.scene === "conventions" ? (
              <ConventionsVisual />
            ) : visual.scene === "evidence" ? (
              <EvidenceVisual />
            ) : visual.scene === "literature" ? (
              <LiteratureVisual />
            ) : visual.scene === "visual-text" ? (
              <VisualTextVisual />
            ) : visual.scene === "vocabulary" ? (
              <VocabularyVisual />
            ) : visual.scene === "compare" ? (
              <CompareVisual />
            ) : visual.scene === "word-parts" ? (
              <WordPartsVisual />
            ) : visual.scene === "summary" ? (
              <SummaryVisual />
            ) : (
              <ReadingVisual />
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}

function SequenceVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 p-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-white text-lg font-black text-slate-950 shadow-sm ring-1 ring-slate-200">
            {index + 1}
          </div>
          {index < 2 ? <div className="h-1 w-7 rounded-full bg-white/80" /> : null}
        </div>
      ))}
    </div>
  );
}

function EvidenceVisual() {
  return (
    <div className="absolute inset-0 p-4">
      <div className="h-full rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="h-3 w-1/2 rounded-full bg-yellow-300" />
        <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-300" />
        <div className="mt-3 h-3 w-3/5 rounded-full bg-slate-300" />
        <div className="absolute bottom-5 right-5 h-10 w-10 rounded-full border-4 border-slate-900 bg-emerald-300" />
      </div>
    </div>
  );
}

function CompareVisual() {
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-3 p-4">
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="h-3 w-2/3 rounded-full bg-indigo-300" />
        <div className="mt-3 h-16 rounded-xl bg-indigo-100" />
      </div>
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="h-3 w-2/3 rounded-full bg-emerald-300" />
        <div className="mt-3 h-16 rounded-xl bg-emerald-100" />
      </div>
    </div>
  );
}

function ArgumentVisual() {
  return (
    <div className="absolute inset-0 grid grid-cols-[0.9fr_1fr] gap-3 p-4">
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Claim</div>
        <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-800" />
        <div className="mt-3 h-2 rounded-full bg-slate-300" />
      </div>
      <div className="grid gap-2">
        <div className="rounded-xl bg-white/90 p-3 shadow-sm">
          <div className="h-3 w-2/3 rounded-full bg-yellow-300" />
          <div className="mt-2 h-2 rounded-full bg-slate-300" />
        </div>
        <div className="rounded-xl bg-white/90 p-3 shadow-sm">
          <div className="h-3 w-1/2 rounded-full bg-emerald-300" />
          <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

function ConventionsVisual() {
  return (
    <div className="absolute inset-0 p-4">
      <div className="h-full rounded-2xl bg-white/92 p-4 shadow-sm">
        <div className="mb-3 flex gap-2">
          {["U", "<", ">"].map((tool) => (
            <span key={tool} className="grid h-6 w-8 place-items-center rounded-md bg-slate-200 text-xs font-black text-slate-800">
              {tool}
            </span>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-3 w-11/12 rounded-full bg-slate-300" />
          <div className="h-3 w-4/5 rounded-full bg-yellow-300" />
          <div className="h-3 w-2/3 rounded-full bg-slate-300" />
        </div>
        <div className="absolute bottom-6 right-6 h-8 w-14 rounded-lg border-2 border-slate-900 bg-white" />
      </div>
    </div>
  );
}

function LiteratureVisual() {
  return (
    <div className="absolute inset-0 grid grid-cols-[0.8fr_1fr] gap-3 p-4">
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="mx-auto h-10 w-10 rounded-full bg-violet-300" />
        <div className="mt-3 h-3 rounded-full bg-slate-800" />
        <div className="mt-2 h-2 rounded-full bg-slate-300" />
      </div>
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="h-3 w-2/3 rounded-full bg-rose-300" />
        <div className="mt-3 h-10 rounded-xl bg-violet-100" />
        <div className="mt-3 h-3 w-3/4 rounded-full bg-emerald-300" />
      </div>
    </div>
  );
}

function VisualTextVisual() {
  return (
    <div className="absolute inset-0 grid grid-cols-[0.9fr_1fr] gap-3 p-4">
      <div className="rounded-2xl bg-white/92 p-3 shadow-sm">
        <div className="h-3 w-2/3 rounded-full bg-slate-800" />
        <div className="mt-3 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className={`h-6 rounded ${index % 2 ? "bg-cyan-100" : "bg-emerald-100"}`} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white/92 p-3 shadow-sm">
        <div className="h-16 rounded-xl bg-sky-100" />
        <div className="mt-3 h-3 w-4/5 rounded-full bg-yellow-300" />
        <div className="mt-2 h-2 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}

function VocabularyVisual() {
  return (
    <div className="absolute inset-0 p-4">
      <div className="grid h-full grid-rows-[auto_1fr] gap-3 rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-slate-900 bg-yellow-200" />
          <div className="h-4 flex-1 rounded-full bg-slate-800" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-indigo-100 p-2">
            <div className="h-3 rounded-full bg-indigo-300" />
            <div className="mt-2 h-2 rounded-full bg-slate-300" />
          </div>
          <div className="rounded-xl bg-emerald-100 p-2">
            <div className="h-3 rounded-full bg-emerald-300" />
            <div className="mt-2 h-2 rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadingVisual() {
  return (
    <div className="absolute inset-0 p-4">
      <div className="mx-auto h-full max-w-44 rounded-2xl bg-white/90 p-4 shadow-sm">
        <div className="h-4 w-1/2 rounded-full bg-slate-800" />
        <div className="mt-5 space-y-2">
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 w-2/3 rounded-full bg-yellow-300" />
        </div>
      </div>
    </div>
  );
}

function WordPartsVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="grid w-full max-w-60 gap-3">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          {["care", "ful", "ly"].map((part, index) => (
            <Fragment key={part}>
              <div className="rounded-xl bg-white/95 px-3 py-2 text-center text-sm font-black text-slate-950 shadow-sm ring-1 ring-white/70">
                {part}
              </div>
              {index < 2 ? <div className="h-1 w-4 rounded-full bg-white/80" /> : null}
            </Fragment>
          ))}
        </div>
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm ring-1 ring-white/70">
          <div className="h-3 w-24 rounded-full bg-emerald-300" />
          <div className="mt-2 h-2 rounded-full bg-slate-300" />
          <div className="mt-2 h-2 w-4/5 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

function SummaryVisual() {
  return (
    <div className="absolute inset-0 grid grid-cols-[1fr_auto_0.9fr] items-center gap-3 p-4">
      <div className="rounded-2xl bg-white/90 p-3 shadow-sm">
        <div className="h-3 w-2/3 rounded-full bg-slate-800" />
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 w-4/5 rounded-full bg-slate-300" />
        </div>
      </div>
      <div className="text-2xl font-black text-white">→</div>
      <div className="rounded-2xl bg-white/95 p-3 shadow-sm">
        <div className="h-3 w-3/4 rounded-full bg-emerald-400" />
        <div className="mt-3 h-2 rounded-full bg-slate-300" />
        <div className="mt-2 h-2 w-5/6 rounded-full bg-slate-300" />
        <div className="mt-3 h-2 w-1/2 rounded-full bg-rose-300 line-through opacity-70" />
      </div>
    </div>
  );
}

function buildLessonVisual({
  title,
  text,
  skill,
  gradeLevel,
  visualMetadata,
}: {
  title: string;
  text: string;
  skill?: string;
  gradeLevel?: number;
  visualMetadata?: any;
}) {
  const skillScene = sceneForLessonSkill(skill);
  const metadataScene = typeof visualMetadata?.scene === "string" ? visualMetadata.scene : "";
  const shouldOverrideMetadata = skillScene !== "reading" && metadataScene !== skillScene;
  const metadata = !shouldOverrideMetadata && visualMetadata && typeof visualMetadata === "object"
    ? visualMetadata
    : buildLessonVisualMetadata({ title, text, skill, gradeLevel });
  const scene = metadata.scene || "reading";
  const visualFocus = metadata.headline || skill || title || "Reading Skill";
  const backgroundClass = scene === "compare"
    ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
    : scene === "argument"
      ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600"
    : scene === "conventions"
      ? "bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500"
    : scene === "sequence"
      ? "bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500"
    : scene === "literature"
      ? "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
    : scene === "visual-text"
      ? "bg-gradient-to-br from-cyan-300 via-emerald-400 to-teal-600"
    : scene === "vocabulary"
      ? "bg-gradient-to-br from-violet-400 via-fuchsia-500 to-rose-500"
      : scene === "word-parts"
        ? "bg-gradient-to-br from-teal-300 via-emerald-400 to-cyan-600"
      : scene === "summary"
        ? "bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500"
      : scene === "evidence"
        ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600"
        : "bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600";
  const accentTextClass = scene === "sequence" || scene === "conventions" ? "text-orange-700" : scene === "compare" || scene === "literature" || scene === "vocabulary" ? "text-indigo-700" : scene === "evidence" || scene === "word-parts" || scene === "argument" || scene === "visual-text" ? "text-emerald-700" : "text-blue-700";
  const badgeClass = scene === "sequence" || scene === "conventions" ? "bg-yellow-300" : scene === "compare" || scene === "literature" || scene === "vocabulary" ? "bg-fuchsia-300" : scene === "evidence" || scene === "word-parts" || scene === "argument" || scene === "visual-text" ? "bg-emerald-300" : "bg-sky-300";

  return {
    scene,
    headline: visualFocus,
    caption: metadata.caption || captionForVisual(scene, visualFocus),
    alt: metadata.alt || `Illustration for ${visualFocus}`,
    backgroundClass,
    accentTextClass,
    badgeClass,
    imagePrompt: metadata.imagePrompt,
    patternStyle: {
      backgroundImage: "radial-gradient(circle at 16px 16px, rgba(255,255,255,0.55) 2px, transparent 2px)",
      backgroundSize: "32px 32px",
    },
  };
}

function captionForVisual(scene: string, visualFocus: string) {
  if (scene === "argument") return `${visualFocus}: connect claim, reason, and evidence without drifting from the point.`;
  if (scene === "compare") return `${visualFocus}: look for how two ideas are alike, different, or organized.`;
  if (scene === "conventions") return `${visualFocus}: inspect the sentence, choose the correct form, and keep the style consistent.`;
  if (scene === "sequence") return `${visualFocus}: track what happens first, next, and as a result.`;
  if (scene === "evidence") return `${visualFocus}: connect the highlighted clue to the answer.`;
  if (scene === "literature") return `${visualFocus}: track characters, choices, conflict, and message across the text.`;
  if (scene === "summary") return `${visualFocus}: keep the central idea and key details, and leave out opinions.`;
  if (scene === "visual-text") return `${visualFocus}: use titles, labels, rows, columns, or images to support the text.`;
  if (scene === "vocabulary") return `${visualFocus}: use context and word parts to determine the precise meaning.`;
  if (scene === "word-parts") return `${visualFocus}: break the long word into meaningful parts, then blend the parts back together.`;
  return `${visualFocus}: use the image to preview the topic before reading.`;
}

type PracticeActivityType = "multiple-choice" | "sentence-select" | "evidence-match" | "evidence-sort" | "word-cloze" | "inline-cloze" | "short-response";

function PracticeActivityCard({
  activity,
  lessonImageUrl = "",
  answer,
  submitted,
  masteryMode,
  onAnswer,
}: {
  activity: any;
  lessonImageUrl?: string;
  answer: any;
  submitted: boolean;
  masteryMode: boolean;
  onAnswer: (value: any) => void;
}) {
  const question = activity.questionData;
  const result = submitted ? scorePracticeActivity(activity, answer) : null;
  const locked = submitted && !masteryMode;

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border-b border-slate-200 bg-amber-50 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Passage Card</p>
            <ReadAloudButton
              text={`${question.passage || ""} ${question.coachHint ? `Coach hint: ${question.coachHint}` : ""}`}
              label="Listen"
              className="rounded-lg bg-white px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
            />
          </div>
          <LessonVisualPanel
            title={question.visualTitle || activity.skill || "Reading Scene"}
            text={question.passage || activity.prompt}
            skill={activity.skill}
            gradeLevel={question.gradeLevel}
            imageUrl={question.imageUrl || question.visual?.imageUrl || lessonImageUrl}
            visualMetadata={question.visual}
            className="mt-4"
          />
          <p className="mt-3 text-base leading-8 text-slate-900">{question.passage}</p>
          {question.coachHint ? (
            <div className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-amber-200">
              Coach hint: {question.coachHint}
            </div>
          ) : null}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Activity {activity.index + 1}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{activity.label}</p>
            </div>
            <ReadAloudButton
              text={activity.listenText}
              label="Listen"
              className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-200"
            />
          </div>
          <p className="mt-3 text-lg font-black leading-7 text-slate-950">{activity.prompt}</p>

          {activity.type === "multiple-choice" ? (
            <MultipleChoiceActivity activity={activity} answer={answer} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : activity.type === "sentence-select" ? (
            <SentenceSelectActivity activity={activity} answer={answer} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : activity.type === "evidence-match" ? (
            <EvidenceMatchActivity activity={activity} answer={answer || {}} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : activity.type === "evidence-sort" ? (
            <EvidenceSortActivity activity={activity} answer={answer || {}} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : activity.type === "word-cloze" ? (
            <WordClozeActivity activity={activity} answer={answer} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : activity.type === "inline-cloze" ? (
            <InlineClozeActivity activity={activity} answer={answer} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          ) : (
            <ShortResponseActivity activity={activity} answer={String(answer || "")} submitted={submitted} locked={locked} onAnswer={onAnswer} />
          )}

          {result ? (
            <div className={`mt-4 rounded-xl p-4 text-sm leading-6 ring-1 ${
              result.correct ? "bg-emerald-50 text-emerald-950 ring-emerald-200" : "bg-amber-50 text-amber-950 ring-amber-200"
            }`}>
              <p className="font-black">{result.correct ? "Good thinking" : "Review the teaching point"}</p>
              <p className="mt-1">{feedbackForActivity(activity)}</p>
              {question.explanation ? <p className="mt-2 text-slate-700">{question.explanation}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MultipleChoiceActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: any; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  const question = activity.questionData;
  return (
    <div className="mt-4 grid gap-3">
      {question.choices.map((choice: string, choiceIndex: number) => {
        const selected = answer === choice;
        const correct = isCorrectAnswer(question, choice);
        return (
          <button
            type="button"
            key={choice}
            onClick={() => onAnswer(choice)}
            disabled={locked}
            className={`group flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold transition disabled:cursor-not-allowed ${
              submitted && correct
                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                : submitted && selected && !correct
                  ? "border-rose-300 bg-rose-50 text-rose-950"
                  : selected
                    ? "border-blue-300 bg-blue-50 text-blue-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-black ${
              submitted && correct
                ? "bg-emerald-600 text-white"
                : submitted && selected && !correct
                  ? "bg-rose-600 text-white"
                  : selected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
            }`}>
              {String.fromCharCode(65 + choiceIndex)}
            </span>
            <span className="leading-6">{choice}</span>
          </button>
        );
      })}
    </div>
  );
}

function SentenceSelectActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: any; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-700">Select the sentence that gives the strongest evidence.</p>
      <div className="mt-3 grid gap-2">
        {activity.sentences.map((sentence: string, sentenceIndex: number) => {
          const selected = Number(answer) === sentenceIndex;
          const correct = sentenceIndex === activity.targetSentenceIndex;
          return (
            <button
              type="button"
              key={`${sentenceIndex}-${sentence}`}
              onClick={() => onAnswer(sentenceIndex)}
              disabled={locked}
              className={`rounded-xl border p-3 text-left text-sm font-bold leading-6 transition disabled:cursor-not-allowed ${
                submitted && correct
                  ? "border-emerald-300 bg-emerald-100 text-emerald-950"
                  : submitted && selected && !correct
                    ? "border-rose-300 bg-rose-50 text-rose-950"
                    : selected
                      ? "border-blue-300 bg-blue-50 text-blue-950"
                      : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span className="mr-2 text-xs font-black uppercase text-slate-500">S{sentenceIndex + 1}</span>
              {sentence}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceMatchActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: Record<string, string>; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  return (
    <div className="mt-4 grid gap-3">
      {activity.cards.map((card: any) => (
        <div key={card.id} className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4">
          <p className="text-sm font-black leading-6 text-slate-900">{card.text}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {activity.labels.map((label: string) => {
              const selected = answer[card.id] === label;
              const correct = card.answer === label;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => onAnswer({ ...answer, [card.id]: label })}
                  disabled={locked}
                  className={`rounded-lg px-3 py-2 text-left text-xs font-black leading-5 ring-1 transition disabled:cursor-not-allowed ${
                    submitted && correct
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : submitted && selected && !correct
                        ? "bg-rose-600 text-white ring-rose-600"
                        : selected
                          ? "bg-fuchsia-700 text-white ring-fuchsia-700"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-fuchsia-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EvidenceSortActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: Record<string, string>; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  return (
    <div className="mt-4">
      <div className="grid gap-3 md:grid-cols-2">
        {activity.labels.map((label: string) => (
          <div key={label} className="rounded-xl bg-slate-100 p-3 text-center text-xs font-black uppercase tracking-wide text-slate-600">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3">
        {activity.cards.map((card: any) => (
          <div key={card.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-bold leading-6 text-slate-900">{card.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {activity.labels.map((label: string) => {
                const selected = answer[card.id] === label;
                const correct = card.answer === label;
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => onAnswer({ ...answer, [card.id]: label })}
                    disabled={locked}
                    className={`rounded-lg px-3 py-2 text-xs font-black ring-1 transition disabled:cursor-not-allowed ${
                      submitted && correct
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : submitted && selected && !correct
                          ? "bg-rose-600 text-white ring-rose-600"
                          : selected
                            ? "bg-orange-700 text-white ring-orange-700"
                            : "bg-white text-slate-700 ring-slate-200 hover:bg-orange-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordClozeActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: any; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  return (
    <div className="mt-4 rounded-2xl bg-purple-700 p-4 text-white">
      <p className="text-sm font-bold">Complete the sentence with the word that best describes strong reading work.</p>
      <p className="mt-4 text-lg font-black leading-8">
        A strong answer is{" "}
        <span className="inline-block min-w-32 rounded-lg border-2 border-dashed border-white bg-white/20 px-4 py-2 text-center">
          {answer || ""}
        </span>{" "}
        by details from the passage.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {activity.choices.map((choice: string) => {
          const selected = answer === choice;
          const correct = choice === activity.correctWord;
          return (
            <button
              type="button"
              key={choice}
              onClick={() => onAnswer(choice)}
              disabled={locked}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-black shadow-sm transition disabled:cursor-not-allowed ${
                submitted && correct
                  ? "border-white bg-emerald-200 text-emerald-950"
                  : submitted && selected && !correct
                    ? "border-white bg-rose-200 text-rose-950"
                    : selected
                      ? "border-white bg-white text-purple-950"
                      : "border-white/30 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineClozeActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: any; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  const cloze = activity.inlineCloze;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">Choose the word or phrase that best completes the passage.</p>
      </div>
      <div className="grid gap-0 xl:grid-cols-[1fr_0.7fr]">
        <div className="min-h-72 bg-white p-5">
          <p className="text-lg font-semibold leading-10 text-slate-950">
            {cloze.before}
            <span className="mx-2 inline-flex min-w-36 flex-col align-middle">
              <span className={`rounded-xl border-2 border-dashed px-4 py-2 text-center text-base font-black ${
                answer
                  ? submitted && answer === cloze.answer
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : submitted
                      ? "border-amber-400 bg-amber-50 text-amber-950"
                      : "border-blue-300 bg-blue-50 text-blue-950"
                  : "border-slate-300 bg-slate-50 text-slate-400"
              }`}>
                {answer || "Choose..."}
              </span>
            </span>
            {cloze.after}
          </p>
        </div>
        <div className="border-t border-slate-200 bg-slate-100 p-5 xl:border-l xl:border-t-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Answer Choices</p>
          <div className="mt-3 grid gap-3">
            {cloze.choices.map((choice: string) => {
              const selected = answer === choice;
              const correct = choice === cloze.answer;
              return (
                <button
                  type="button"
                  key={choice}
                  onClick={() => onAnswer(choice)}
                  disabled={locked}
                  className={`rounded-xl border p-3 text-left text-sm font-black leading-6 transition disabled:cursor-not-allowed ${
                    submitted && correct
                      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
                      : submitted && selected && !correct
                        ? "border-rose-300 bg-rose-50 text-rose-950"
                        : selected
                          ? "border-blue-300 bg-blue-50 text-blue-950"
                          : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortResponseActivity({ activity, answer, submitted, locked, onAnswer }: { activity: any; answer: string; submitted: boolean; locked: boolean; onAnswer: (value: any) => void }) {
  const wordCount = countWords(answer);
  return (
    <div className="mt-4">
      <textarea
        value={answer}
        onChange={(event) => onAnswer(event.target.value)}
        disabled={locked}
        className="min-h-36 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold leading-6 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        placeholder="Explain how the text detail supports your answer. Use your own words."
      />
      <div className="mt-2 flex flex-col gap-2 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{wordCount} words</span>
        <span>Goal: at least 8 words and one clear text detail.</span>
      </div>
    </div>
  );
}

function buildPracticeActivity(question: any, index: number, title: string, skill: string, masteryMode: boolean) {
  const titleText = title.toLowerCase();
  const pattern: PracticeActivityType[] = masteryMode
    ? ["multiple-choice", "sentence-select", "inline-cloze", "evidence-sort", "short-response"]
    : titleText.includes("guided")
      ? ["sentence-select", "inline-cloze", "evidence-match", "evidence-sort", "word-cloze", "short-response"]
      : titleText.includes("independent")
        ? ["evidence-match", "inline-cloze", "sentence-select", "evidence-sort", "short-response"]
        : ["short-response", "inline-cloze", "sentence-select"];
  const explicit = normalizeActivityType(question?.interactionType || question?.activityType || question?.type);
  const type = explicit || pattern[index % pattern.length];
  const prompt = promptForActivity(type, question, skill);
  const sentences = splitSentences(question?.passage || "");
  const targetSentenceIndex = bestEvidenceSentenceIndex(question, sentences);
  const choices = Array.isArray(question?.choices) ? question.choices.filter(Boolean).map(String) : [];
  const cards = choices.length ? choices.slice(0, 4).map((choice: string, choiceIndex: number) => ({
    id: `choice-${choiceIndex}`,
    text: choice,
    answer: isCorrectAnswer(question, choice) ? "Strong support" : "Weak or off-topic",
  })) : [
    { id: "best", text: question?.correctAnswer || "The answer uses several text details.", answer: "Strong support" },
    { id: "weak", text: "A detail that does not connect to the question.", answer: "Weak or off-topic" },
  ];

  return {
    type,
    index,
    skill,
    questionData: question,
    prompt,
    label: labelForActivity(type),
    listenText: `${prompt}. ${question?.passage || ""}`,
    sentences,
    targetSentenceIndex,
    labels: type === "evidence-match" ? ["Strong support", "Weak or off-topic"] : ["Strong support", "Weak or off-topic"],
    cards,
    choices: wordClozeChoices(skill),
    correctWord: "supported",
    inlineCloze: buildInlineCloze(question),
  };
}

function normalizeActivityType(value: string): PracticeActivityType | "" {
  const text = String(value || "").toLowerCase().replace(/_/g, "-");
  if (["multiple-choice", "sentence-select", "evidence-match", "evidence-sort", "word-cloze", "inline-cloze", "short-response"].includes(text)) {
    return text as PracticeActivityType;
  }
  return "";
}

function promptForActivity(type: PracticeActivityType, question: any, skill: string) {
  const questionText = cleanQuestionText(question?.question || "");
  const taskSuffix = questionText ? `: ${questionText}` : ".";
  if (type === "sentence-select") return `Select the sentence that gives the strongest evidence for this question${taskSuffix}`;
  if (type === "evidence-match") return `Mark each answer as strong support or weak/off-topic for this question${taskSuffix}`;
  if (type === "evidence-sort") return `Sort each statement by whether it strongly supports this question${taskSuffix}`;
  if (type === "word-cloze") return "Complete the sentence about how a strong answer works.";
  if (type === "inline-cloze") return `Read the passage and choose the word or phrase that best fits in the blank${taskSuffix}`;
  if (type === "short-response") return `Explain your thinking about ${skill || "the skill"} in your own words.`;
  return cleanQuestionText(question?.question || "Choose the best answer.");
}

function labelForActivity(type: PracticeActivityType) {
  if (type === "sentence-select") return "Select Evidence";
  if (type === "evidence-match") return "Match Support";
  if (type === "evidence-sort") return "Sort Evidence";
  if (type === "word-cloze") return "Complete the Skill Sentence";
  if (type === "inline-cloze") return "Inline Passage Choice";
  if (type === "short-response") return "Explain Your Thinking";
  return "PSSA Choice";
}

function wordClozeChoices(skill: string) {
  const lower = String(skill || "").toLowerCase();
  if (lower.includes("connotation") || lower.includes("context") || lower.includes("vocab")) {
    return ["supported", "guessed", "ignored", "copied"];
  }
  return ["supported", "random", "unrelated", "copied"];
}

function isActivityAnswered(activity: any, answer: any) {
  if (activity.type === "evidence-match" || activity.type === "evidence-sort") {
    return activity.cards.every((card: any) => Boolean(answer?.[card.id]));
  }
  if (activity.type === "short-response") return countWords(String(answer || "")) >= 8;
  if (activity.type === "sentence-select") return answer !== undefined && answer !== null && answer !== "";
  return Boolean(answer);
}

function scorePracticeActivity(activity: any, answer: any) {
  let correct = false;
  if (activity.type === "multiple-choice") {
    correct = isCorrectAnswer(activity.questionData, String(answer || ""));
  } else if (activity.type === "sentence-select") {
    correct = Number(answer) === Number(activity.targetSentenceIndex);
  } else if (activity.type === "evidence-match" || activity.type === "evidence-sort") {
    correct = activity.cards.every((card: any) => answer?.[card.id] === card.answer);
  } else if (activity.type === "word-cloze") {
    correct = String(answer || "").trim().toLowerCase() === activity.correctWord;
  } else if (activity.type === "inline-cloze") {
    correct = normalizeAnswer(answer) === normalizeAnswer(activity.inlineCloze.answer);
  } else if (activity.type === "short-response") {
    correct = countWords(String(answer || "")) >= 8;
  }

  return {
    activityType: activity.type,
    question: activity.prompt,
    selected: answer ?? "",
    correctAnswer: correctAnswerForActivity(activity),
    correct,
  };
}

function correctAnswerForActivity(activity: any) {
  if (activity.type === "sentence-select") return activity.sentences[activity.targetSentenceIndex] || "";
  if (activity.type === "evidence-match" || activity.type === "evidence-sort") {
    return Object.fromEntries(activity.cards.map((card: any) => [card.id, card.answer]));
  }
  if (activity.type === "word-cloze") return activity.correctWord;
  if (activity.type === "inline-cloze") return activity.inlineCloze.answer;
  if (activity.type === "short-response") return "A clear explanation using at least one text detail.";
  return activity.questionData?.correctAnswer || "";
}

function feedbackForActivity(activity: any) {
  if (activity.type === "sentence-select") return "Strong evidence comes from the sentence that most directly proves the answer.";
  if (activity.type === "evidence-match") return "A strong answer is supported by the passage. A weak answer is too narrow, off-topic, or not proven.";
  if (activity.type === "evidence-sort") return "Sorting evidence helps you separate proof from details that do not answer the question.";
  if (activity.type === "word-cloze") return "A reading answer should be supported by details from the text.";
  if (activity.type === "inline-cloze") return "The best word or phrase must fit both the grammar of the sentence and the meaning of the passage.";
  if (activity.type === "short-response") return "Your explanation should connect a text detail to the answer in your own words.";
  return "The best answer matches the skill and is supported by the passage.";
}

function splitSentences(text: string) {
  const sentences = String(text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  return sentences.length ? sentences : [String(text || "Reread the passage and choose the detail that best supports the answer.").trim()];
}

function bestEvidenceSentenceIndex(question: any, sentences: string[]) {
  const keywords = keywordSet(`${question?.correctAnswer || ""} ${question?.explanation || ""} ${question?.question || ""}`);
  let bestIndex = 0;
  let bestScore = -1;
  sentences.forEach((sentence, index) => {
    const sentenceKeywords = keywordSet(sentence);
    const score = [...keywords].filter((keyword) => sentenceKeywords.has(keyword)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function keywordSet(text: string) {
  const stopWords = new Set(["the", "and", "that", "this", "with", "from", "into", "they", "their", "there", "because", "about", "which", "what", "when", "where", "while", "should", "would", "could", "answer", "passage", "question"]);
  return new Set(String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word)));
}

function countWords(text: string) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeAnswer(value: any) {
  return String(value || "").trim().toLowerCase();
}

function buildInlineCloze(question: any) {
  const passage = String(question?.passage || "");
  const answer = String(question?.correctAnswer || "").trim();
  const choices = Array.isArray(question?.choices) && question.choices.length
    ? question.choices.map(String).slice(0, 4)
    : [answer, "a detail from another topic", "an unsupported idea", "a repeated sentence"].filter(Boolean);
  const exactIndex = answer ? passage.toLowerCase().indexOf(answer.toLowerCase()) : -1;
  if (passage && exactIndex >= 0 && answer.length <= 90) {
    return {
      before: passage.slice(0, exactIndex),
      after: passage.slice(exactIndex + answer.length),
      answer,
      choices,
    };
  }

  const sentence = "A strong answer is supported by details from the passage and explains why those details matter.";
  return {
    before: sentence.slice(0, "A strong answer is ".length),
    after: sentence.slice("A strong answer is supported".length),
    answer: "supported",
    choices: ["supported", "guessed", "copied", "unrelated"],
  };
}

function hydratedPracticeQuestions(questions: any[], title: string, skill = "") {
  const minimumCount = title.toLowerCase().includes("guided")
    ? 6
    : title.toLowerCase().includes("independent")
      ? 5
      : title.toLowerCase().includes("mastery")
        ? 5
        : title.toLowerCase().includes("exit")
          ? 3
          : questions.length;
  const expanded = [...questions];
  while (expanded.length < minimumCount) {
    expanded.push({
      generatedPractice: true,
      question: "",
      choices: [],
      correctAnswer: "",
    });
  }
  return enrichPracticeQuestions(expanded, `${skill} ${title}`.trim());
}

function enrichPracticeQuestions(questions: any[], title: string) {
  return questions.map((question, index) => {
    const shouldReplace = shouldUseFallbackPracticeQuestion(question);
    if (question?.passage && !shouldReplace) return question;
    const scenario = fallbackScenarioForQuestion(question, title, index);
    return {
      ...question,
      passage: question?.passage || scenario.passage,
      question: shouldReplace ? scenario.question : question.question,
      choices: shouldReplace ? scenario.choices : question.choices,
      correctAnswer: shouldReplace ? scenario.correctAnswer : question.correctAnswer,
      explanation: shouldReplace ? scenario.explanation : question.explanation,
      coachHint: question?.coachHint || scenario.coachHint,
    };
  });
}

function shouldUseFallbackPracticeQuestion(question: any) {
  if (question?.generatedPractice) return true;
  if (!String(question?.question || "").trim()) return true;
  if (!Array.isArray(question?.choices) || question.choices.length < 2) return true;
  return isGenericPracticeQuestion(question);
}

function isGenericPracticeQuestion(question: any) {
  const text = String(question?.question || "").toLowerCase();
  return text.includes("read a short grade") || text.includes("which answer best shows") || text.includes("original guided practice item");
}

function fallbackScenarioForQuestion(question: any, title: string, index: number) {
  const text = `${title} ${question?.question || ""} ${question?.correctAnswer || ""}`.toLowerCase();
  const scenarios = text.includes("setting") || text.includes("plot") || text.includes("flashback")
    ? plotPracticeScenarios()
    : text.includes("figurative") || text.includes("vocab") || text.includes("connotation")
      ? figurativePracticeScenarios()
      : text.includes("main idea") || text.includes("theme")
        ? mainIdeaPracticeScenarios()
        : evidencePracticeScenarios();
  return scenarios[index % scenarios.length];
}

function evidencePracticeScenarios() {
  return [
    {
      passage: "The recycling club had only one afternoon to prepare for the assembly. Amira checked the facts on each poster, asked two classmates to read them, and replaced a blurry photograph before taping anything to the wall.",
      question: "Which answer is best supported by the passage?",
      choices: [
        "Amira wants the recycling presentation to be accurate and clear.",
        "Amira thinks posters are more important than speeches.",
        "The assembly has already ended.",
        "The classmates refuse to help Amira.",
      ],
      correctAnswer: "Amira wants the recycling presentation to be accurate and clear.",
      explanation: "Amira checks facts, asks classmates to review, and fixes the photograph. Those details prove she cares about accuracy and clarity.",
      coachHint: "Stack the clues. The best answer usually explains several details at once.",
    },
    {
      passage: "When the hallway display fell, Devon picked up the scattered index cards and put them back in order by date. He handed the first card to Ms. Lin and said, 'The timeline still makes sense if we start here.'",
      question: "Which detail best shows Devon understands the timeline?",
      choices: [
        "The hallway display fell.",
        "Devon put the cards back in order by date.",
        "Ms. Lin stood in the hallway.",
        "The cards were made from index paper.",
      ],
      correctAnswer: "Devon put the cards back in order by date.",
      explanation: "Ordering the cards by date directly shows Devon understands how a timeline works.",
      coachHint: "Choose evidence that proves the idea directly, not a detail that only describes the setting.",
    },
  ];
}

function plotPracticeScenarios() {
  return [
    {
      passage: "A sudden snowstorm closed the mountain road before Eli's family reached the cabin. Instead of turning back, they stopped at the visitor center, studied the map, and found a safer route through town.",
      question: "How does the setting affect the plot?",
      choices: [
        "The storm creates a problem and forces the family to change plans.",
        "The cabin is larger than the visitor center.",
        "Eli's family dislikes maps.",
        "The road is always closed in town.",
      ],
      correctAnswer: "The storm creates a problem and forces the family to change plans.",
      explanation: "The snowy setting causes the road closure, which changes what the family does next.",
      coachHint: "Setting is powerful when it causes a character to act or react.",
    },
    {
      passage: "Before the spelling bee began, Mina remembered the night her grandfather taught her to break long words into smaller parts. She whispered the strategy once, then stepped to the microphone.",
      question: "Why does the author include the memory?",
      choices: [
        "To show where Mina learned the strategy she uses now.",
        "To explain that Mina forgot every word.",
        "To describe the microphone.",
        "To show that the spelling bee is over.",
      ],
      correctAnswer: "To show where Mina learned the strategy she uses now.",
      explanation: "The memory explains Mina's present strategy and builds confidence before the event.",
      coachHint: "Ask how the earlier moment helps you understand the present scene.",
    },
  ];
}

function figurativePracticeScenarios() {
  return [
    {
      passage: "The gym buzzed like a beehive before the final game. Players tied shoes, coaches called names, and the crowd's cheers bounced from wall to wall.",
      question: "What does the simile help the reader understand?",
      choices: [
        "The gym is noisy and full of activity.",
        "Real bees are flying around the gym.",
        "The players are afraid of the crowd.",
        "The game has already ended.",
      ],
      correctAnswer: "The gym is noisy and full of activity.",
      explanation: "Comparing the gym to a beehive emphasizes movement, sound, and energy.",
      coachHint: "Translate the comparison into a real feeling or idea.",
    },
    {
      passage: "Talia called the old bench 'weathered' because its paint had faded, the corners were smooth, and rain had darkened the wood.",
      question: "What does weathered mean in the passage?",
      choices: ["worn by age and weather", "newly painted", "kept indoors", "brightly decorated"],
      correctAnswer: "worn by age and weather",
      explanation: "The faded paint, smooth corners, and rain-darkened wood are clues that the bench is worn.",
      coachHint: "Use the surrounding descriptions as context clues.",
    },
  ];
}

function mainIdeaPracticeScenarios() {
  return [
    {
      passage: "Every Friday, students at Hillview sort donated books, repair torn covers, and place new labels on the shelves. By the end of each month, another classroom library is ready for younger readers.",
      question: "What is the main idea of the passage?",
      choices: [
        "Students help build classroom libraries by organizing and repairing donated books.",
        "Friday is the last school day of the week.",
        "Younger readers only like new books.",
        "Labels are hard to place on shelves.",
      ],
      correctAnswer: "Students help build classroom libraries by organizing and repairing donated books.",
      explanation: "This choice covers all the important details about sorting, repairing, labeling, and preparing libraries.",
      coachHint: "The main idea should cover the whole passage.",
    },
    {
      passage: "At the end of the story, Kara admits she lost the class key and helps search for it. Her classmates are upset at first, but they trust her more because she tells the truth.",
      question: "Which theme is best supported by the story events?",
      choices: [
        "Honesty can help rebuild trust.",
        "Keys are easy to replace.",
        "Classrooms should stay locked.",
        "Searching always solves every problem.",
      ],
      correctAnswer: "Honesty can help rebuild trust.",
      explanation: "Kara tells the truth and her classmates trust her more, which supports the theme about honesty.",
      coachHint: "A theme is a lesson from the character's choice and result.",
    },
    {
      passage: "The school newspaper team wanted more students to read each issue. They interviewed classmates about favorite topics, added a sports column, and placed copies near the cafeteria doors. By Friday, every stack of newspapers was gone.",
      question: "What is the main idea of the passage?",
      choices: [
        "The newspaper team made changes that helped more students read the paper.",
        "The cafeteria doors were open on Friday.",
        "Sports are the only topic students like.",
        "The newspaper team stopped interviewing students.",
      ],
      correctAnswer: "The newspaper team made changes that helped more students read the paper.",
      explanation: "The interviewing, new column, better placement, and empty stacks all support the idea that the changes increased readership.",
      coachHint: "Look for the answer that explains the problem, the actions, and the result.",
    },
    {
      passage: "During the science fair, Mateo's group explained their model three different ways. They used a diagram for visual learners, a short demonstration for visitors who wanted to see the process, and a chart for people who asked about results.",
      question: "Which sentence best states the central idea?",
      choices: [
        "Mateo's group used different tools to help visitors understand their project.",
        "The science fair had many visitors.",
        "A chart is always better than a diagram.",
        "Mateo's group did not know how their model worked.",
      ],
      correctAnswer: "Mateo's group used different tools to help visitors understand their project.",
      explanation: "The passage lists several ways the group communicated the same project clearly.",
      coachHint: "The central idea should connect all the examples.",
    },
    {
      passage: "The city park looked different after the volunteers finished. Fresh mulch covered the path, new signs marked the trail, and the benches had been sanded and painted. Families who arrived that afternoon could use the park more safely.",
      question: "Which detail best supports the main idea that volunteers improved the park?",
      choices: [
        "New signs marked the trail.",
        "Families arrived in the afternoon.",
        "The city had a park.",
        "The path was near benches.",
      ],
      correctAnswer: "New signs marked the trail.",
      explanation: "New signs are a specific improvement that supports the larger idea that the park became safer and easier to use.",
      coachHint: "Choose a detail that proves the big idea, not a detail that only tells when or where.",
    },
    {
      passage: "Lena first thought the article was about one rescued turtle. As she reread, she noticed that each paragraph described a different way people protect ocean animals: cleaning beaches, reducing plastic, and helping injured wildlife return to the sea.",
      question: "How does rereading help Lena understand the main idea?",
      choices: [
        "It helps her see that the whole article is about protecting ocean animals.",
        "It proves the article is only about one turtle.",
        "It shows that plastic is never found on beaches.",
        "It makes every paragraph shorter.",
      ],
      correctAnswer: "It helps her see that the whole article is about protecting ocean animals.",
      explanation: "Rereading helps Lena connect multiple details across paragraphs into a broader main idea.",
      coachHint: "For longer texts, connect details across paragraphs instead of stopping after the first example.",
    },
  ];
}

function cleanQuestionText(text: string) {
  return String(text || "")
    .replace(/^With help:\s*/i, "")
    .replace(/\s*\((guided|independent|exit ticket|mastery check)\s*\d+\)\s*$/i, "")
    .trim();
}

function instructionDeckForLesson(lesson: any) {
  const skill = String(lesson?.skill || "text evidence");
  const lower = skill.toLowerCase();
  const isWordParts = isWordPartsSkill(skill);
  const isSummary = isSummarySkill(skill);
  const isVocab = lower.includes("vocab") || lower.includes("connotation") || lower.includes("figurative") || lower.includes("context");
  const isTheme = lower.includes("theme") || lower.includes("main idea");
  const focusWord = isWordParts ? "carefully" : isSummary ? "objective summary" : isVocab ? focusWordForSkill(skill) : isTheme ? "central idea" : "evidence";
  const wordChoices = wordFamilyChoices(focusWord);
  const answer = wordChoices[0];
  const phraseAnswer = isWordParts
    ? "It helps the reader break a long word into meaningful parts."
    : isSummary
      ? "It gives the central idea and key details without personal opinion."
    : isTheme
    ? "It tells what the whole paragraph is mostly about."
    : isVocab
      ? "It tells what the highlighted word means in this passage."
      : "It tells which detail proves the answer.";
  const mainIdeaPassageBefore =
    "During the first month of spring, the school garden was not being used well. Several plant labels were missing, weeds covered the walking path, and the watering schedule changed so often that some seedlings dried out. A sixth-grade science group studied the problem before proposing changes. They divided the garden into sections, created a weekly care chart, and wrote short labels that explained how each plant supported pollinators. By open house night, visitors could follow the path, read the labels, and understand the";
  const mainIdeaPassageAfter =
    "that careful planning helped students turn an overlooked garden into a useful outdoor classroom.";
  const summaryPassageBefore =
    "Each spring, students at Riverbend Middle School test the water in a stream behind the playground. This year, the science club noticed that the water looked cloudy after heavy rain. Instead of guessing at the cause, students collected samples from three places along the stream and compared the results with data from previous years. They found that loose soil from a nearby construction area was washing into the water. The club presented the data to the town council and recommended temporary barriers to hold soil in place. Two weeks later, workers installed the barriers, and the next round of tests showed clearer water. A strong";
  const summaryPassageAfter =
    "would explain that students used data to identify a source of stream pollution and recommend a solution, while leaving out personal opinions about the project.";

  return {
    title: `${skill} Instruction`,
    passageTitle: isWordParts ? "Breaking a Long Word" : isSummary ? "Testing the Stream" : isVocab ? "Making a Difference" : isTheme ? "A Better School Garden" : "The Class Mural",
    focusWord,
    passageBefore: isWordParts
      ? "When Maya saw the word"
      : isSummary
        ? summaryPassageBefore
      : isVocab
      ? "Students studied how one word can change meaning in a sentence. They used context clues to understand"
      : isTheme
        ? mainIdeaPassageBefore
        : "Before choosing an answer, students returned to the paragraph and found",
    passageAfter: isWordParts
      ? "in a science article, she did not guess. She covered the ending, read care, then added ful and ly. Breaking the word into parts helped her understand that the scientist handled the glass with care."
      : isSummary
        ? summaryPassageAfter
      : isVocab
      ? "without guessing from only the first sentence."
      : isTheme
        ? mainIdeaPassageAfter
        : "that supported their thinking.",
    glossary: {
      term: focusWord,
      definition: glossaryDefinitionForSkill(skill, focusWord),
    },
    screens: [
      {
        id: "teach",
        kind: "explain" as const,
        prompt: `Learn the skill: ${skill}. Read the model text, notice the highlighted term, and use the glossary if you need help.`,
      },
      {
        id: "match-meaning",
        kind: "question-match" as const,
        prompt: isWordParts
          ? "Match each part of the long word to the job it does."
          : isSummary
            ? "Match each summary decision to the reason a strong reader would make it."
          : "Match each question to the kind of answer a strong reader should give.",
        question: isWordParts ? "How do the parts of carefully work together?" : isSummary ? "What belongs in an objective summary?" : "What is each question really asking you to prove?",
        answerBank: isWordParts
          ? ["base word", "suffix meaning full of", "suffix meaning in a way"]
          : isSummary
            ? ["central idea", "key detail", "opinion to leave out"]
          : [
              "Main idea",
              "Text evidence",
              "Too narrow",
            ],
        rows: isWordParts
          ? [
              {
                id: "base",
                prompt: "care is the main word. It tells the idea of careful attention.",
                answer: "base word",
              },
              {
                id: "ful",
                prompt: "-ful changes care into careful, meaning full of care.",
                answer: "suffix meaning full of",
              },
              {
                id: "ly",
                prompt: "-ly changes careful into carefully, meaning in a careful way.",
                answer: "suffix meaning in a way",
              },
            ]
          : isSummary
          ? [
              {
                id: "central",
                prompt: "Students used data to find a stream problem and recommend a solution.",
                answer: "central idea",
              },
              {
                id: "detail",
                prompt: "Samples showed soil from a construction area was washing into the stream.",
                answer: "key detail",
              },
              {
                id: "opinion",
                prompt: "The science club did an amazing job and should win an award.",
                answer: "opinion to leave out",
              },
            ]
          : [
              {
                id: "whole",
                prompt: "A question asks what the entire passage is mostly about.",
                answer: "Main idea",
              },
              {
                id: "proof",
                prompt: "A question asks which sentence or detail proves the answer.",
                answer: "Text evidence",
              },
              {
                id: "narrow",
                prompt: "An answer mentions only one small fact and misses the larger point.",
                answer: "Too narrow",
              },
            ],
        keyIdeas: isWordParts
          ? [
              "A long word is easier to read when you cover endings and read one part at a time.",
              "Meaningful parts help with both pronunciation and meaning.",
            ]
          : isSummary
            ? [
                "An objective summary tells the central idea and the most important supporting details.",
                "Leave out opinions, tiny details, and repeated information.",
              ]
          : [
              "A good answer should fit the whole passage or the exact question.",
              "Evidence is stronger when more than one detail points to the same idea.",
            ],
      },
      {
        id: "break",
        kind: "sentence-break" as const,
        prompt: isWordParts
          ? "Break the long word into parts before reading it as one word."
          : isSummary
            ? "Build a short objective summary by choosing the central idea and key details."
          : "Reread one sentence from the passage, then break the sentence into separate ideas.",
        question: isWordParts ? "Which split shows helpful word parts?" : isSummary ? "Which ideas should appear in the summary?" : "Break the model passage into the problem, the response, and the result.",
        answerBank: isWordParts
          ? ["care / ful / ly", "ca / ref / ully", "caref / ul / ly", "carefu / lly"]
          : isSummary
            ? [
                "students tested the stream and found soil runoff",
                "students recommended barriers based on data",
                "the water was cloudy after heavy rain",
                "the club was the best group in school",
              ]
          : [
              "the garden was disorganized and not useful",
              "students made a plan and divided the work",
              "visitors understood the garden as an outdoor classroom",
              "one plant label was missing",
            ],
        parts: isWordParts
          ? [
              { id: "split", before: "Best way to divide carefully", answer: "care / ful / ly", after: "" },
              { id: "bad-split", before: "Split that breaks the base word in the wrong place", answer: "ca / ref / ully", after: "" },
            ]
          : isSummary
          ? [
              { id: "central", before: "Central idea", answer: "students tested the stream and found soil runoff", after: "" },
              { id: "support", before: "Important supporting detail", answer: "students recommended barriers based on data", after: "" },
              { id: "minor", before: "Useful but smaller detail", answer: "the water was cloudy after heavy rain", after: "" },
            ]
          : [
              { id: "problem", before: "Problem in the passage", answer: "the garden was disorganized and not useful", after: "" },
              { id: "response", before: "Student response", answer: "students made a plan and divided the work", after: "" },
              { id: "result", before: "Result that supports the central idea", answer: "visitors understood the garden as an outdoor classroom", after: "" },
            ],
        keyIdeas: isWordParts
          ? [
              "Keep the base word together when you can.",
              "Suffixes such as -ful and -ly often appear at the end of a word.",
            ]
          : isSummary
            ? [
                "A Grade 6 summary may combine information from several sentences.",
                "Do not include praise, blame, or personal reactions in an objective summary.",
              ]
          : [
              "A strong main idea often connects a problem, actions, and a result.",
              "One small fact can support the main idea, but it usually should not be the main idea by itself.",
            ],
      },
      {
        id: "word",
        kind: "word-build" as const,
        prompt: "Complete the sentence by choosing the strongest word from the same skill family.",
        answer,
        choices: wordChoices,
        sentenceBefore: isWordParts ? "Maya read the glass label" : isSummary ? "A strong summary explains the passage" : "The students used details from the passage to",
        sentenceAfter: isWordParts ? "before moving the beaker." : isSummary ? "and without opinion." : "their answer.",
      },
      {
        id: "sort",
        kind: "evidence-sort" as const,
        prompt: isWordParts
          ? "Sort each word. Decide whether the word is split into helpful parts."
          : isSummary
            ? "Sort each statement. Decide whether it belongs in an objective summary."
          : "Sort each statement. Decide whether it is the main idea or a supporting detail.",
        question: isWordParts ? "Which splits help a reader read and understand the word?" : isSummary ? "Which statements should a summary keep or leave out?" : "Which statements are big ideas, and which are details?",
        labels: isWordParts ? ["Helpful split", "Unhelpful split"] : isSummary ? ["Keep in summary", "Leave out"] : ["Main idea", "Supporting detail"],
        cards: isWordParts
          ? [
              {
                id: "carefully",
                text: "care / ful / ly",
                answer: "Helpful split",
              },
              {
                id: "helpful",
                text: "help / ful",
                answer: "Helpful split",
              },
              {
                id: "cover",
                text: "co / ver",
                answer: "Unhelpful split",
              },
            ]
          : isSummary
            ? [
                {
                  id: "keep-central",
                  text: "Students tested a cloudy stream, found soil runoff, and recommended barriers.",
                  answer: "Keep in summary",
                },
                {
                  id: "leave-opinion",
                  text: "The town council was probably embarrassed by the students' discovery.",
                  answer: "Leave out",
                },
                {
                  id: "keep-result",
                  text: "After barriers were installed, later tests showed clearer water.",
                  answer: "Keep in summary",
                },
              ]
          : [
              {
                id: "big",
                text: isTheme
                  ? "A careful student plan turned the garden into a useful outdoor classroom."
                  : "The answer is supported because several details point to the same conclusion.",
                answer: "Main idea",
              },
              {
                id: "detail-1",
                text: "Students divided the garden into sections and created a weekly care chart.",
                answer: "Supporting detail",
              },
              {
                id: "detail-2",
                text: "Visitors could follow the path and read labels during open house.",
                answer: "Supporting detail",
              },
            ],
        keyIdeas: isWordParts
          ? [
              "A helpful split keeps meaningful parts together.",
              "A split is less useful when it separates letters in a way that does not help you read or understand the word.",
            ]
          : isSummary
            ? [
                "Keep details that explain the central idea or show a major result.",
                "Leave out opinions, guesses about feelings, and details that do not change the meaning.",
              ]
          : [
              "A main idea is broad enough to hold the details together.",
              "A supporting detail is smaller. It proves or explains the bigger idea.",
            ],
      },
      {
        id: "phrase",
        kind: "phrase-match" as const,
        prompt: "Match the phrase to what the question is really asking you to do.",
        question: `What does ${focusWord} help a reader do?`,
        answer: phraseAnswer,
        choices: [
          phraseAnswer,
          "It tells the reader to ignore the passage.",
          "It tells only one small detail without explaining why it matters.",
        ],
        keyIdeas: [
          phraseAnswer,
          "A correct answer should restate the idea without changing its meaning.",
        ],
      },
    ],
  };
}

function focusWordForSkill(skill: string) {
  const lower = skill.toLowerCase();
  if (isWordPartsSkill(skill)) return "carefully";
  if (isSummarySkill(skill)) return "objective summary";
  if (lower.includes("connotation")) return "connotation";
  if (lower.includes("figurative")) return "figurative language";
  if (lower.includes("context")) return "context";
  if (lower.includes("inference")) return "infer";
  if (lower.includes("theme")) return "theme";
  if (lower.includes("main idea")) return "main idea";
  if (lower.includes("point of view") || lower === "pov") return "point of view";
  return "evidence";
}

function isWordPartsSkill(skill: string) {
  const lower = skill.toLowerCase();
  return (
    lower.includes("multisyllable") ||
    lower.includes("syllable") ||
    lower.includes("vowel") ||
    lower.includes("prefix") ||
    lower.includes("suffix") ||
    lower.includes("word part")
  );
}

function isSummarySkill(skill: string) {
  const lower = skill.toLowerCase();
  return lower.includes("objective summary") || lower.includes("summar");
}

function wordFamilyChoices(focusWord: string) {
  if (focusWord === "carefully") return ["carefully", "careful", "care"];
  if (focusWord === "objective summary") return ["objectively", "objective", "object"];
  if (focusWord === "infer") return ["support", "supported", "supporting"];
  if (focusWord === "theme") return ["explain", "explained", "explanation"];
  if (focusWord === "main idea") return ["summarize", "summary", "summarized"];
  if (focusWord === "point of view") return ["describe", "description", "described"];
  if (focusWord === "connotation") return ["suggest", "suggestion", "suggested"];
  if (focusWord === "figurative language") return ["compare", "comparison", "compared"];
  if (focusWord === "context") return ["clarify", "clarification", "clarified"];
  return ["support", "supported", "supporting"];
}

function glossaryDefinitionForSkill(skill: string, focusWord: string) {
  const lower = skill.toLowerCase();
  if (isWordPartsSkill(skill)) return "A multisyllable word has more than one syllable. Break it into a base word, syllables, prefixes, or suffixes to read it accurately.";
  if (isSummarySkill(skill)) return "An objective summary briefly tells the central idea and key details without personal opinions or extra minor details.";
  if (lower.includes("inference")) return "An inference is an idea you figure out from clues and evidence in the text.";
  if (lower.includes("theme")) return "Theme is the message or lesson a story suggests through characters, conflict, and ending.";
  if (lower.includes("main idea")) return "Main idea is what a whole paragraph or passage is mostly about.";
  if (lower.includes("point of view") || lower === "pov") return "Point of view is who is telling the story or how the author sees the topic.";
  if (lower.includes("connotation")) return "Connotation is the feeling or idea a word suggests beyond its dictionary meaning.";
  if (lower.includes("figurative")) return "Figurative language uses comparison or nonliteral words to create meaning.";
  if (lower.includes("context")) return "Context is the words and sentences around a term that help explain its meaning.";
  return `${focusWord} means using a text detail to prove or explain an answer.`;
}

function buildPracticePayload(answers: Record<string, any>, questions: any[], title = "Practice", providedResults?: any[]) {
  const safeQuestions = hydratedPracticeQuestions(Array.isArray(questions) ? questions : [], title);
  const activities = safeQuestions.map((question, index) => buildPracticeActivity(question, index, title, "", false));
  const results = Array.isArray(providedResults) && providedResults.length ? providedResults : activities.map((activity, index) => scorePracticeActivity(activity, answers[String(index)]));
  const score = results.length ? Math.round((results.filter((result) => result.correct).length / results.length) * 100) : 0;
  return {
    completed: true,
    score,
    answers: results,
  };
}

function savedAnswers(savedResponses: any, questions: any[] = []) {
  if (!savedResponses || !Array.isArray(savedResponses.answers)) return {};
  return Object.fromEntries(savedResponses.answers.map((answer: any, index: number) => [String(index), answer.selected ?? ""]));
}

function isPracticeComplete(savedResponses: any) {
  return Boolean(savedResponses?.completed);
}

function isCorrectAnswer(question: any, selected: string | undefined) {
  if (!selected) return false;
  const correct = String(question?.correctAnswer || "").trim().toLowerCase();
  const selectedValue = String(selected || "").trim().toLowerCase();
  if (selectedValue === correct) return true;
  if (/^[a-d]$/.test(correct)) {
    const index = correct.charCodeAt(0) - 97;
    return String(question?.choices?.[index] || "").trim().toLowerCase() === selectedValue;
  }
  return false;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function lessonModeLabel(gradeLevel?: number) {
  const grade = Number(gradeLevel || 0);
  if (grade <= 3) return "Visual + Audio";
  if (grade <= 5) return "Guided Reading";
  return "Evidence + Reasoning";
}

function practiceItemCount(lesson: any) {
  return (
    hydratedPracticeQuestions(Array.isArray(lesson.guidedPractice) ? lesson.guidedPractice : [], "Guided Practice").length +
    hydratedPracticeQuestions(Array.isArray(lesson.independentPractice) ? lesson.independentPractice : [], "Independent Practice").length
  );
}
