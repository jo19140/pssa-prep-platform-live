"use client";

import { useEffect, useMemo, useState } from "react";
import { TeacherLessonPreviewDialog } from "@/components/teacher/TeacherLessonPreviewDialog";
import type { TeacherLessonCategory, TeacherLessonListItem } from "@/lib/teacher/teacherLessonLibraryCore";

type LibraryResponse = {
  lessons: TeacherLessonListItem[];
};

type AssignClassOption = {
  id: string;
  name: string;
  grade: number;
  students: Array<{ id: string; name: string }>;
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
  const [assignLesson, setAssignLesson] = useState<TeacherLessonListItem | null>(null);
  const [classes, setClasses] = useState<AssignClassOption[]>([]);
  const [classRoomId, setClassRoomId] = useState("");
  const [recipientMode, setRecipientMode] = useState<"class" | "selected">("class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [assignStatus, setAssignStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [assignMessage, setAssignMessage] = useState("");

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

  useEffect(() => {
    if (!assignLesson) return;
    let active = true;
    async function loadClasses() {
      try {
        const response = await fetch("/api/teacher/assignments/manual", { cache: "no-store" });
        if (!response.ok) throw new Error("Classes could not be loaded.");
        const data = await response.json();
        if (!active) return;
        const loaded = data.classes ?? [];
        setClasses(loaded);
        setClassRoomId((current) => current || loaded[0]?.id || "");
      } catch {
        if (active) {
          setClasses([]);
          setAssignStatus("error");
          setAssignMessage("Classes could not be loaded.");
        }
      }
    }
    void loadClasses();
    return () => {
      active = false;
    };
  }, [assignLesson]);

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

  const selectedClass = classes.find((classRoom) => classRoom.id === classRoomId);

  function updateMaterialEdit(next: () => void) {
    next();
    setAssignStatus("idle");
    setAssignMessage("");
    setIdempotencyKey(crypto.randomUUID());
  }

  async function submitAssignment() {
    if (!assignLesson || !classRoomId || !dueDate) return;
    setAssignStatus("submitting");
    setAssignMessage("");
    try {
      const response = await fetch("/api/teacher/assignments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: assignLesson.id,
          classRoomId,
          recipientMode,
          studentProfileIds: recipientMode === "selected" ? selectedStudentIds : undefined,
          dueDate,
          idempotencyKey,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Assignment could not be created.");
      setAssignStatus("success");
      setAssignMessage(`Assigned to ${data.results?.length ?? 0} student${(data.results?.length ?? 0) === 1 ? "" : "s"}.`);
      setIdempotencyKey(crypto.randomUUID());
    } catch (caught) {
      setAssignStatus("error");
      setAssignMessage(caught instanceof Error ? caught.message : "Assignment could not be created.");
    }
  }

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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewLessonId(lesson.id)}
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignLesson(lesson);
                        setAssignStatus("idle");
                        setAssignMessage("");
                        setIdempotencyKey(crypto.randomUUID());
                      }}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Assign lesson
                    </button>
                  </div>
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
      {assignLesson ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Assign lesson</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{assignLesson.title}</h3>
              </div>
              <button type="button" onClick={() => setAssignLesson(null)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Class</span>
                <select
                  value={classRoomId}
                  onChange={(event) => updateMaterialEdit(() => {
                    setClassRoomId(event.target.value);
                    setSelectedStudentIds([]);
                  })}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                >
                  {classes.map((classRoom) => (
                    <option key={classRoom.id} value={classRoom.id}>{classRoom.name} · Grade {classRoom.grade}</option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700">Recipients</legend>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={recipientMode === "class"} onChange={() => updateMaterialEdit(() => setRecipientMode("class"))} />
                  Whole class
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={recipientMode === "selected"} onChange={() => updateMaterialEdit(() => setRecipientMode("selected"))} />
                  Small group / individual
                </label>
              </fieldset>

              {recipientMode === "selected" ? (
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-700">Students</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(selectedClass?.students ?? []).map((student) => (
                      <label key={student.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={(event) => updateMaterialEdit(() => {
                            setSelectedStudentIds((current) => event.target.checked
                              ? [...current, student.id]
                              : current.filter((id) => id !== student.id));
                          })}
                        />
                        {student.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="space-y-1 text-sm font-medium text-slate-700">
                <span>Due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => updateMaterialEdit(() => setDueDate(event.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                />
              </label>
            </div>

            {assignMessage ? <p className={`mt-4 text-sm ${assignStatus === "success" ? "text-emerald-700" : "text-rose-700"}`}>{assignMessage}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setAssignLesson(null)} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button
                type="button"
                disabled={assignStatus === "submitting" || !classRoomId || !dueDate || (recipientMode === "selected" && selectedStudentIds.length === 0)}
                onClick={() => void submitAssignment()}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {assignStatus === "submitting" ? "Assigning..." : "Assign lesson"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
