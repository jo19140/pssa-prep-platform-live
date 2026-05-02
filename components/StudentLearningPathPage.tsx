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
  const selectedLesson = useMemo(() => lessons.find((lesson: any) => lesson.id === selectedLessonId) || lessons[0], [lessons, selectedLessonId]);

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
                  <p className="text-xs font-semibold uppercase text-slate-500">Priority {lesson.priority} • {lesson.standardCode}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{lesson.skill}</h3>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">{formatStatus(progress.status || "NOT_STARTED")}</p>
                </button>
              );
            })}
          </aside>

          {selectedLesson ? (
            <LessonDetail lesson={selectedLesson} progress={localProgress[selectedLesson.id] || selectedLesson.progress?.[0] || {}} onUpdateProgress={updateProgress} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function LessonDetail({
  lesson,
  progress,
  onUpdateProgress,
}: {
  lesson: any;
  progress: any;
  onUpdateProgress: (lessonId: string, status: string, masteryScore?: number) => void;
}) {
  const masteryQuestions = Array.isArray(lesson.masteryCheck) ? lesson.masteryCheck : [];
  const deterministicScore = masteryQuestions.length ? 100 : 0;

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{lesson.standardCode}</p>
          <h3 className="text-2xl font-bold text-slate-900">{lesson.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{lesson.whyAssigned}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {formatStatus(progress.status || "NOT_STARTED")}
        </span>
      </div>

      <div className="mt-6 grid gap-4">
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
        <PracticeBlock title="Guided Practice" questions={lesson.guidedPractice} />
        <PracticeBlock title="Independent Practice" questions={lesson.independentPractice} />
        <PracticeBlock title="Exit Ticket" questions={lesson.exitTicket} />
        <PracticeBlock title="Mastery Check" questions={lesson.masteryCheck} />
        <LessonBlock title="Retest Recommendation">{lesson.retestRecommendation}</LessonBlock>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
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
    </section>
  );
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
            <p className="text-sm font-semibold text-slate-900">{index + 1}. {question.question}</p>
            {Array.isArray(question.choices) ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {question.choices.map((choice: string) => <li key={choice}>{choice}</li>)}
              </ul>
            ) : null}
            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-800">Show answer and explanation</summary>
              <p className="mt-2"><span className="font-semibold">Answer:</span> {question.correctAnswer}</p>
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
