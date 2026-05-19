"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LessonStepPlayer } from "@/components/LessonStepPlayer";

export type LessonPreviewSample = {
  filename: string;
  label: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
  qualityScore: number | null;
  teiTypesUsed: string[];
  lesson: PreviewLesson;
};

type PreviewLesson = {
  gradeLevel?: number;
  standardCode?: string;
  standardLabel?: string;
  skill?: string;
  title?: string;
  whyAssigned?: string;
  hook?: string;
  explanation?: string;
  workedExample?: string;
  commonErrors?: string[];
  sentenceFrames?: string[];
  successCriteria?: string[];
  guidedPractice?: any[];
  independentPractice?: any[];
  exitTicket?: any[];
  masteryCheck?: any[];
  heroResourceLinkId?: string | null;
  resourceTitle?: string | null;
  resourceUrl?: string | null;
  resourceProvider?: string | null;
  resourceDescription?: string | null;
  exemplarsUsed?: string[];
  teiTypesUsed?: string[];
  generatorVersion?: string;
  qualityScore?: number;
  qualityIssues?: string[];
};

const practiceSections = [
  { key: "guidedPractice", title: "Guided Practice", description: "Try these with the lesson ideas close at hand." },
  { key: "independentPractice", title: "Independent Practice", description: "Apply the skill with less support." },
  { key: "exitTicket", title: "Exit Ticket", description: "Check the key takeaway before moving on." },
  { key: "masteryCheck", title: "Mastery Check", description: "Show that the skill is ready for mixed practice." },
] as const;

export function LessonPreviewClient({
  samples,
  defaultFilename,
}: {
  samples: LessonPreviewSample[];
  defaultFilename: string;
}) {
  const initialFilename = samples.some((sample) => sample.filename === defaultFilename)
    ? defaultFilename
    : samples[0]?.filename || "";
  const [selectedFilename, setSelectedFilename] = useState(initialFilename);
  const [resetVersion, setResetVersion] = useState(0);
  const [completionNotice, setCompletionNotice] = useState("");

  const selectedSample = useMemo(
    () => samples.find((sample) => sample.filename === selectedFilename) || samples[0],
    [samples, selectedFilename],
  );

  const resetResponses = () => {
    setCompletionNotice("");
    setResetVersion((version) => version + 1);
  };

  const selectSample = (filename: string) => {
    setSelectedFilename(filename);
    setCompletionNotice("");
    setResetVersion((version) => version + 1);
  };

  if (!samples.length || !selectedSample) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h1 className="text-2xl font-black">No V2 samples found</h1>
          <p className="mt-2 text-sm font-semibold">
            Expected JSON sample files in <code>audit/v2-samples/</code>.
          </p>
        </div>
      </div>
    );
  }

  const lesson = selectedSample.lesson;
  const heroResource = heroResourceFromLesson(lesson);
  const previewSteps = buildPreviewSteps(lesson, heroResource);

  return (
    <div key={`${selectedSample.filename}-${resetVersion}`} className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">V2 Lesson Preview</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">Student-facing sample lesson</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Local-only preview. Practice responses stay in memory and never write to the database.
            </p>
          </div>
          <button
            type="button"
            onClick={resetResponses}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-800"
          >
            Reset all responses
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {samples.map((sample) => (
            <button
              type="button"
              key={sample.filename}
              onClick={() => selectSample(sample.filename)}
              className={`min-w-[260px] rounded-xl border px-4 py-3 text-left shadow-sm transition ${
                selectedSample.filename === sample.filename
                  ? "border-blue-500 bg-blue-50 text-blue-950"
                  : "border-slate-200 bg-white text-slate-800 hover:border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-wide">Grade {sample.gradeLevel}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700">
                  Q{sample.qualityScore ?? "NA"}
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-black">{sample.skill}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{sample.standardCode}</p>
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Grade {lesson.gradeLevel}</Badge>
              <Badge>{lesson.standardCode}</Badge>
              <Badge>{lesson.generatorVersion || "V2"}</Badge>
              {lesson.heroResourceLinkId ? <Badge>Hero video linked</Badge> : <Badge>No hero video</Badge>}
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950">{lesson.title || lesson.skill}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
              {lesson.standardLabel || selectedSample.skill}
            </p>
            {lesson.whyAssigned ? (
              <p className="mt-4 max-w-3xl rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-950">
                {lesson.whyAssigned}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700 lg:min-w-[240px]">
            <p><span className="font-black text-slate-950">File:</span> {selectedSample.filename}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Score:</span> {lesson.qualityScore ?? selectedSample.qualityScore ?? "NA"}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Steps:</span> {previewSteps.length}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Practice items:</span> {countPracticeItems(lesson)}</p>
          </div>
        </div>
        {selectedSample.teiTypesUsed.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedSample.teiTypesUsed.map((type) => <Badge key={type}>{type}</Badge>)}
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6">
        <SupportLists
          commonErrors={lesson.commonErrors || []}
          sentenceFrames={lesson.sentenceFrames || []}
          successCriteria={lesson.successCriteria || []}
        />
        {completionNotice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-950">
            {completionNotice}
          </div>
        ) : null}
        <section>
          <LessonStepPlayer
            steps={previewSteps}
            heroResource={null}
            lessonMetadata={{
              grade: lesson.gradeLevel,
              standardCode: lesson.standardCode,
              skill: lesson.skill,
              title: lesson.title,
            }}
            onStartPractice={() => setCompletionNotice("Preview complete. Use Reset all responses to take this sample again.")}
          />
        </section>
      </div>
    </div>
  );
}

function SupportLists({
  commonErrors,
  sentenceFrames,
  successCriteria,
}: {
  commonErrors: string[];
  sentenceFrames: string[];
  successCriteria: string[];
}) {
  const cards = [
    { title: "Common Errors", items: commonErrors },
    { title: "Sentence Frames", items: sentenceFrames },
    { title: "Success Criteria", items: successCriteria },
  ].filter((card) => card.items.length);

  if (!cards.length) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">{card.title}</h3>
          <ul className="mt-4 space-y-3">
            {card.items.map((item, index) => (
              <li key={`${card.title}-${index}`} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-700">
      {children}
    </span>
  );
}

function buildPreviewSteps(lesson: PreviewLesson, heroResource: PreviewHeroResource) {
  const steps: Array<{
    order: number;
    stepType: string;
    title: string;
    bodyText: string;
    narrationScript: string;
    heroResource?: PreviewHeroResource;
    questions?: any[];
  }> = [];

  addTextStep(steps, "INTRO", "Hook", lesson.hook);
  addTextStep(steps, "EXPLANATION", "Explanation", lesson.explanation);
  addTextStep(steps, "WORKED_EXAMPLE", "Worked Example", lesson.workedExample);
  if (heroResource?.url) {
    steps.push({
      order: steps.length + 1,
      stepType: "TRANSITION",
      title: "Hero Video",
      bodyText: "Watch this short resource before practice. Use it to hear the skill explained another way, then try the guided questions.",
      narrationScript: "Watch this short resource before practice, then try the guided questions.",
      heroResource,
    });
  }

  for (const section of practiceSections) {
    const items = Array.isArray(lesson[section.key]) ? lesson[section.key] : [];
    if (!items.length) continue;
    steps.push({
      order: steps.length + 1,
      stepType: "CHECK_QUESTION",
      title: section.title,
      bodyText: `${section.description} Submit each item to see local scoring and feedback.`,
      narrationScript: section.description,
      questions: items,
    });
  }

  return steps;
}

function addTextStep(
  steps: Array<{ order: number; stepType: string; title: string; bodyText: string; narrationScript: string; heroResource?: PreviewHeroResource; questions?: any[] }>,
  stepType: string,
  title: string,
  bodyText?: string,
) {
  if (!bodyText) return;
  steps.push({
    order: steps.length + 1,
    stepType,
    title,
    bodyText,
    narrationScript: bodyText.slice(0, 280),
  });
}

type PreviewHeroResource = {
  title: string;
  url: string;
  provider: string;
  description?: string | null;
} | null;

function heroResourceFromLesson(lesson: PreviewLesson): PreviewHeroResource {
  if (!lesson.resourceUrl) return null;
  return {
    title: lesson.resourceTitle || "Lesson video",
    url: lesson.resourceUrl,
    provider: lesson.resourceProvider || "Resource",
    description: lesson.resourceDescription || null,
  };
}

function countPracticeItems(lesson: PreviewLesson) {
  return practiceSections.reduce((sum, section) => {
    const items = Array.isArray(lesson[section.key]) ? lesson[section.key] : [];
    return sum + items.length;
  }, 0);
}
