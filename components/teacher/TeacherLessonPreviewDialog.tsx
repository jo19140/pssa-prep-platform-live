"use client";

import { useEffect, useRef, useState } from "react";
import type { TeacherLessonPreview, TeacherLessonQuestion } from "@/lib/teacher/teacherLessonLibraryCore";

type PreviewResponse = {
  lesson: TeacherLessonPreview;
};

export function TeacherLessonPreviewDialog({
  lessonId,
  open,
  onClose,
}: {
  lessonId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [lesson, setLesson] = useState<TeacherLessonPreview | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async (id: string, signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch(`/api/teacher/learning-lessons/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Lesson preview could not be loaded.");
      const data = await response.json() as PreviewResponse;
      setLesson(data.lesson);
      setStatus("ready");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Lesson preview could not be loaded.");
    }
  };

  useEffect(() => {
    if (!open || !lessonId) {
      setLesson(null);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    void loadPreview(lessonId, controller.signal);
    return () => controller.abort();
  }, [lessonId, open]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-preview-title"
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lesson preview</p>
            <h2 id="lesson-preview-title" className="mt-1 text-xl font-semibold text-slate-950">
              {lesson?.title || "Approved lesson"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          {status === "loading" ? <p className="text-sm text-slate-600">Loading lesson preview...</p> : null}
          {status === "error" ? (
            <div>
              <p className="text-sm text-slate-600">{error || "Lesson preview could not be loaded."}</p>
              {lessonId ? (
                <button
                  type="button"
                  onClick={() => void loadPreview(lessonId)}
                  className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {status === "ready" && lesson ? (
            <>
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-900">Grade</p>
                  <p>{lesson.gradeLevel}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Skill</p>
                  <p>{lesson.skill}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Standards</p>
                  <p>{lesson.standardCodes.join(", ")}</p>
                </div>
              </div>

              {lesson.teacherNote ? (
                <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {lesson.teacherNote}
                </p>
              ) : null}

              <TextSection title="Explanation" text={lesson.lessonExplanation} />
              <TextSection title="Worked example" text={lesson.workedExample} />
              <QuestionSection title="Guided practice" questions={lesson.guidedPractice} />
              <QuestionSection title="Independent practice" questions={lesson.independentPractice} />
              <QuestionSection title="Exit ticket" questions={lesson.exitTicket} />
              <QuestionSection title="Mastery check" questions={lesson.masteryCheck} />
              <TextSection title="Retest recommendation" text={lesson.retestRecommendation} />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TextSection({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</p>
    </section>
  );
}

function QuestionSection({ title, questions }: { title: string; questions: TeacherLessonQuestion[] }) {
  return (
    <section>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 space-y-3">
        {questions.map((question, index) => (
          <article key={`${title}-${index}`} className="rounded-lg border border-slate-200 p-4">
            {question.passage ? <p className="mb-3 whitespace-pre-wrap text-sm text-slate-600">{question.passage}</p> : null}
            <p className="font-semibold text-slate-950">{question.question}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {question.choices.map((choice) => (
                <li key={choice}>{choice}</li>
              ))}
            </ol>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <dt className="font-semibold text-slate-900">Answer key</dt>
                <dd>{question.correctAnswer}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Explanation</dt>
                <dd>{question.explanation}</dd>
              </div>
              {question.coachHint ? (
                <div>
                  <dt className="font-semibold text-slate-900">Hint</dt>
                  <dd>{question.coachHint}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
