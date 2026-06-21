"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherLessonPreviewDialog } from "@/components/teacher/TeacherLessonPreviewDialog";
import type { TeacherLessonCategory, TeacherLessonListItem } from "@/lib/teacher/teacherLessonLibraryCore";

type LibraryResponse = {
  lessons: TeacherLessonListItem[];
};

const CATEGORY_ORDER: TeacherLessonCategory[] = [
  "key_ideas_evidence",
  "craft_structure",
  "vocabulary",
  "conventions",
  "writing",
];

export function TeacherLessonsTab() {
  const [lessons, setLessons] = useState<TeacherLessonListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState("all");
  const [domain, setDomain] = useState("all");
  const [skill, setSkill] = useState("all");
  const [search, setSearch] = useState("");
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const loadLessons = async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/teacher/learning-lessons", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Lesson library could not be loaded.");
      const data = await response.json() as LibraryResponse;
      setLessons(data.lessons ?? []);
      setStatus("ready");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Lesson library could not be loaded.");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadLessons(controller.signal);
    return () => controller.abort();
  }, []);

  const gradeOptions = useMemo(
    () => Array.from(new Set(lessons.map((lesson) => lesson.gradeLevel))).sort((a, b) => a - b),
    [lessons],
  );

  const domainOptions = useMemo(() => {
    const scoped = lessons.filter((lesson) => gradeLevel === "all" || lesson.gradeLevel === Number(gradeLevel));
    return Array.from(new Set(scoped.map((lesson) => lesson.domain).filter(Boolean) as string[])).sort();
  }, [gradeLevel, lessons]);

  const skillOptions = useMemo(() => {
    const scoped = lessons.filter((lesson) => {
      const gradeMatch = gradeLevel === "all" || lesson.gradeLevel === Number(gradeLevel);
      const domainMatch = domain === "all" || lesson.domain === domain;
      return gradeMatch && domainMatch;
    });
    return Array.from(new Set(scoped.map((lesson) => lesson.skill))).sort();
  }, [domain, gradeLevel, lessons]);

  useEffect(() => {
    if (gradeLevel !== "all" && !gradeOptions.includes(Number(gradeLevel))) setGradeLevel("all");
  }, [gradeLevel, gradeOptions]);

  useEffect(() => {
    if (domain !== "all" && !domainOptions.includes(domain)) setDomain("all");
  }, [domain, domainOptions]);

  useEffect(() => {
    if (skill !== "all" && !skillOptions.includes(skill)) setSkill("all");
  }, [skill, skillOptions]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const gradeMatch = gradeLevel === "all" || lesson.gradeLevel === Number(gradeLevel);
      const domainMatch = domain === "all" || lesson.domain === domain;
      const skillMatch = skill === "all" || lesson.skill === skill;
      const searchText = `${lesson.title} ${lesson.skill} ${lesson.standardCodes.join(" ")}`.toLowerCase();
      return gradeMatch && domainMatch && skillMatch && (!query || searchText.includes(query));
    });
  }, [domain, gradeLevel, lessons, search, skill]);

  const groupedLessons = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      label: filteredLessons.find((lesson) => lesson.category === category)?.categoryLabel,
      lessons: filteredLessons.filter((lesson) => lesson.category === category),
    })).filter((group) => group.lessons.length > 0);
  }, [filteredLessons]);

  if (status === "loading") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading approved lessons...
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Lessons</h2>
        <p className="mt-2 text-sm text-slate-600">{error || "Lesson library could not be loaded."}</p>
        <button
          type="button"
          onClick={() => void loadLessons()}
          className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Approved lesson library</h2>
            <p className="mt-1 text-sm text-slate-600">
              Browse approved State Track mini-lessons by grade, domain, skill, and standard.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-600">{filteredLessons.length} lessons</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Grade</span>
            <select
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={String(grade)}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Domain</span>
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All domains</option>
              {domainOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Skill</span>
            <select
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All skills</option>
              {skillOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, skill, standard"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
      </div>

      {groupedLessons.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No approved lessons match these filters.
        </div>
      ) : (
        groupedLessons.map((group) => (
          <section key={group.category} className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{group.label}</h3>
              {group.category === "writing" ? (
                <p className="mt-1 text-xs text-slate-600">Supplemental writing practice.</p>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.lessons.map((lesson) => (
                <article key={lesson.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <span>Grade {lesson.gradeLevel}</span>
                    <span>{lesson.approvalStatus}</span>
                  </div>
                  <h4 className="mt-2 text-lg font-semibold text-slate-950">{lesson.title}</h4>
                  <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-700">Skill</dt>
                      <dd>{lesson.skill}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Standard</dt>
                      <dd>{lesson.standardCodes.join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Category</dt>
                      <dd>{lesson.categoryLabel}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">Domain</dt>
                      <dd>{lesson.domain || "State Track"}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setPreviewLessonId(lesson.id)}
                    className="mt-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Preview
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <TeacherLessonPreviewDialog
        lessonId={previewLessonId}
        open={Boolean(previewLessonId)}
        onClose={() => setPreviewLessonId(null)}
      />
    </section>
  );
}
