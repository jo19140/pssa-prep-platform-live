"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentLessonPreviewStage } from "@/components/StudentLearningPathPage";
import { StandardsProgressPanel } from "@/components/StandardsProgressPanel";
import { StudentRosterPanel } from "@/components/StudentRosterPanel";

export function TeacherLearningPathPanel({ mode = "assignments", role }: { mode?: "assignments" | "reports"; role?: string }) {
  const [data, setData] = useState<any>({ lessons: [], resources: [], standardsProgress: [], libraryLessons: [], classes: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [assignClassRoomId, setAssignClassRoomId] = useState("");
  const [assigningLessonId, setAssigningLessonId] = useState("");
  const [buildingLibrary, setBuildingLibrary] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const [focusedStudentName, setFocusedStudentName] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [libraryFilters, setLibraryFilters] = useState({ show: "all", search: "", domain: "all", grade: "all" });

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/teacher/learning-lessons");
    const json = await res.json();
    setData(json);
    setAssignClassRoomId((current) => current || json.classes?.[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function assignLibraryLessons(lessonIds: string[]) {
    if (!lessonIds.length) return;
    setMessage("");
    setAssigningLessonId(lessonIds.join(","));
    const res = await fetch("/api/teacher/learning-lessons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonIds, classRoomId: assignClassRoomId }),
    });
    const json = await res.json();
    setAssigningLessonId("");
    if (!res.ok) {
      setMessage(json.error || "Failed to assign lesson.");
      return;
    }
    setMessage(`${json.lessonCount || lessonIds.length} lesson${(json.lessonCount || lessonIds.length) === 1 ? "" : "s"} assigned to ${json.assignedCount} student${json.assignedCount === 1 ? "" : "s"}.`);
    setSelectedLessonIds([]);
    await loadData();
  }

  async function buildPrebuiltLibrary() {
    setMessage("");
    setBuildingLibrary(true);
    const res = await fetch("/api/teacher/learning-lessons/prebuilt", { method: "POST" });
    const json = await res.json();
    setBuildingLibrary(false);
    if (!res.ok) {
      setMessage(json.error || "Failed to build prebuilt lessons.");
      return;
    }
    setMessage(`Prebuilt lesson library ready: ${json.created} created, ${json.existing} already existed.`);
    await loadData();
  }

  const defaultClassId = useMemo(() => {
    const lessons = data.lessons || [];
    if (!lessons.length) return "all";
    const latestByClass = new Map<string, number>();
    for (const lesson of lessons) {
      if (!lesson.classId) continue;
      const ts = new Date(lesson.updatedAt || lesson.createdAt || 0).getTime();
      const current = latestByClass.get(lesson.classId) || 0;
      if (ts > current) latestByClass.set(lesson.classId, ts);
    }
    if (!latestByClass.size) return "all";
    return Array.from(latestByClass.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }, [data.lessons]);

  useEffect(() => {
    setClassFilter(defaultClassId);
  }, [defaultClassId]);

  const filteredLessons = useMemo(() => {
    const lessons = data.lessons || [];
    if (classFilter === "all") return lessons;
    return lessons.filter((lesson: any) => lesson.classId === classFilter);
  }, [classFilter, data.lessons]);

  const selectedClassName = useMemo(() => {
    if (classFilter === "all") return "All classes";
    return data.classes?.find((classRoom: any) => classRoom.id === classFilter)?.name || "Selected class";
  }, [classFilter, data.classes]);

  const lessonsByStatus = useMemo(() => {
    const rows = filteredLessons;
    return {
      notStarted: rows.filter((row: any) => row.status === "NOT_STARTED").length,
      inProgress: rows.filter((row: any) => row.status === "IN_PROGRESS").length,
      completed: rows.filter((row: any) => row.status === "COMPLETED").length,
      mastered: rows.filter((row: any) => row.status === "MASTERED").length,
    };
  }, [filteredLessons]);

  const libraryRows = data.libraryLessons || [];
  const libraryDomains = useMemo<string[]>(() => Array.from(new Set<string>(libraryRows.map((lesson: any) => lessonDomain(lesson)).filter(Boolean))).sort(), [libraryRows]);
  const libraryGrades = useMemo<string[]>(() => Array.from(new Set<string>(libraryRows.map((lesson: any) => String(lesson.gradeLevel)).filter(Boolean))).sort((a, b) => Number(a) - Number(b)), [libraryRows]);
  const filteredLibraryLessons = useMemo(() => {
    const search = libraryFilters.search.trim().toLowerCase();
    return libraryRows.filter((lesson: any) => {
      if (libraryFilters.grade !== "all" && String(lesson.gradeLevel) !== libraryFilters.grade) return false;
      if (libraryFilters.domain !== "all" && lessonDomain(lesson) !== libraryFilters.domain) return false;
      if (libraryFilters.show === "ai" && lesson.generatedBy !== "AI_ENRICHED") return false;
      if (libraryFilters.show === "prebuilt" && lesson.generatedBy !== "PREBUILT_AI_LIBRARY") return false;
      if (libraryFilters.show === "assigned" && !lesson.assignedCount) return false;
      if (!search) return true;
      return [lesson.title, lesson.skill, lesson.standardCode, lesson.standardLabel].some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [libraryRows, libraryFilters]);
  const selectedVisibleCount = filteredLibraryLessons.filter((lesson: any) => selectedLessonIds.includes(lesson.id)).length;

  if (loading) return <section className="rounded-3xl bg-white p-6 shadow">Loading learning pathways...</section>;

  return (
    <div className="space-y-6">
      {mode === "reports" ? (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            <Metric title="Not Started" value={lessonsByStatus.notStarted} />
            <Metric title="In Progress" value={lessonsByStatus.inProgress} />
            <Metric title="Completed" value={lessonsByStatus.completed} />
            <Metric title="Mastered" value={lessonsByStatus.mastered} />
          </section>

          <section className="rounded-3xl bg-white p-5 shadow">
            <label className="block max-w-sm text-sm font-semibold text-slate-700">
              Section
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All classes</option>
                {(data.classes || []).map((classRoom: any) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name} - Grade {classRoom.grade}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <StandardsProgressPanel
            classFilter={classFilter}
            lessons={filteredLessons}
            selectedClassName={selectedClassName}
            onStudentSelect={setFocusedStudentName}
          />

          <StudentRosterPanel
            classFilter={classFilter}
            lessons={filteredLessons}
            role={role}
            focusedStudentName={focusedStudentName}
            selectedClassName={selectedClassName}
          />

          <section className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-slate-900">Reading Coach Practice</h2>
            <p className="mt-1 text-sm text-slate-600">Recent read-aloud attempts show instructional focus areas for phonics, fluency, and accuracy practice.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2 pr-4">Accuracy</th>
                    <th className="py-2 pr-4">WPM</th>
                    <th className="py-2 pr-4">Focus Areas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.readingCoachAttempts || []).map((attempt: any) => (
                    <tr key={attempt.id} className="border-t border-slate-100">
                      <td className="py-3 pr-4 font-semibold text-slate-900">{attempt.studentName}</td>
                      <td className="py-3 pr-4">Grade {attempt.gradeLevel}</td>
                      <td className="py-3 pr-4">{attempt.accuracy}%</td>
                      <td className="py-3 pr-4">{attempt.wordsPerMinute ?? "N/A"}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatFocusAreas(attempt.focusAreas)}</td>
                    </tr>
                  ))}
                  {!(data.readingCoachAttempts || []).length ? (
                    <tr className="border-t border-slate-100">
                      <td className="py-3 pr-4 text-slate-500" colSpan={5}>No Reading Coach attempts yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

        </>
      ) : (
        <>

      <section className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Lesson Creator Agent Library</p>
            <h2 className="text-xl font-bold text-slate-900">Create Assignments</h2>
            <p className="mt-1 text-sm text-slate-600">
              The Lesson Creator Agent saves reusable lessons here. Preview or assign lessons to complement class instruction or target specific skills.
            </p>
          </div>
          {role === "ADMIN" ? (
            <button
              type="button"
              onClick={buildPrebuiltLibrary}
              disabled={buildingLibrary}
              className="w-fit rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {buildingLibrary ? "Building Lessons..." : "Build Prebuilt Lessons"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50">
          <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
            <label className="text-sm font-semibold text-slate-700">
              Filter to show
              <select
                value={libraryFilters.show}
                onChange={(event) => setLibraryFilters((current) => ({ ...current, show: event.target.value }))}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Lessons</option>
                <option value="ai">AI Enriched</option>
                <option value="prebuilt">Prebuilt AI Library</option>
                <option value="assigned">Already Assigned</option>
              </select>
            </label>
            <p className="text-sm leading-6 text-slate-600">
              Showing {filteredLibraryLessons.length} of {libraryRows.length}. Select one or more lessons, choose a class, then assign.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={assignClassRoomId}
                onChange={(event) => setAssignClassRoomId(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {(data.classes || []).map((classRoom: any) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.name} - Grade {classRoom.grade}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => assignLibraryLessons(selectedLessonIds)}
                disabled={!assignClassRoomId || !selectedLessonIds.length || Boolean(assigningLessonId)}
                className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {assigningLessonId ? "Assigning..." : `Assign Lessons${selectedLessonIds.length ? ` (${selectedLessonIds.length})` : ""}`}
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_160px]">
            <input
              value={libraryFilters.search}
              onChange={(event) => setLibraryFilters((current) => ({ ...current, search: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Lesson Name"
            />
            <select
              value={libraryFilters.domain}
              onChange={(event) => setLibraryFilters((current) => ({ ...current, domain: event.target.value }))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Domain</option>
              {libraryDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
            </select>
            <select
              value={libraryFilters.grade}
              onChange={(event) => setLibraryFilters((current) => ({ ...current, grade: event.target.value }))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Grade</option>
              {libraryGrades.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto border-t border-slate-200 bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filteredLibraryLessons.length > 0 && selectedVisibleCount === filteredLibraryLessons.length}
                      onChange={(event) => {
                        const visibleIds = filteredLibraryLessons.map((lesson: any) => lesson.id);
                        setSelectedLessonIds((current) => event.target.checked
                          ? Array.from(new Set([...current, ...visibleIds]))
                          : current.filter((id) => !visibleIds.includes(id)));
                      }}
                    />
                  </th>
                  <th className="px-4 py-3">Lesson Name</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLibraryLessons.map((lesson: any) => (
                  <tr key={lesson.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedLessonIds.includes(lesson.id)}
                        onChange={(event) => setSelectedLessonIds((current) => event.target.checked ? [...current, lesson.id] : current.filter((id) => id !== lesson.id))}
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-bold text-blue-700">{lesson.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{lesson.standardCode} • {lesson.skill}</p>
                      <button
                        type="button"
                        onClick={() => setPreviewLesson(lesson)}
                        className="mt-2 text-xs font-bold text-indigo-700 underline"
                      >
                        Preview lesson
                      </button>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">English</td>
                    <td className="px-4 py-4 align-top text-slate-700">{lessonDomain(lesson)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">Grade {lesson.gradeLevel}</td>
                    <td className="px-4 py-4 align-top">
                      <QualityBadge review={lesson.qualityReview} />
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{lesson.assignedCount}</td>
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => assignLibraryLessons([lesson.id])}
                        disabled={!assignClassRoomId || assigningLessonId === lesson.id}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {assigningLessonId === lesson.id ? "Assigning..." : "Assign"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredLibraryLessons.length ? (
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-5 text-slate-500" colSpan={8}>
                      No lessons match these filters yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {previewLesson ? (
        <LessonPreviewModal
          lesson={previewLesson}
          lessons={filteredLibraryLessons}
          onClose={() => setPreviewLesson(null)}
          onAssign={() => assignLibraryLessons([previewLesson.id])}
          assigning={assigningLessonId === previewLesson.id}
          canAssign={Boolean(assignClassRoomId)}
        />
      ) : null}

        </>
      )}

    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function LessonPreviewModal({
  lesson,
  lessons,
  onClose,
  onAssign,
  assigning,
  canAssign,
}: {
  lesson: any;
  lessons: any[];
  onClose: () => void;
  onAssign: () => void;
  assigning: boolean;
  canAssign: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#030816]">
      <StudentLessonPreviewStage
        lesson={lesson}
        lessons={lessons}
        onClose={onClose}
        onAssign={onAssign}
        assigning={assigning}
        canAssign={canAssign}
      />
    </div>
  );
}

function QualityBadge({ review }: { review: any }) {
  const status = review?.status || "Not reviewed";
  const score = typeof review?.score === "number" ? review.score : null;
  const ready = status === "Ready";
  const className = ready
    ? "bg-emerald-100 text-emerald-800"
    : status === "Needs revision"
      ? "bg-amber-100 text-amber-800"
      : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {score == null ? status : `${score}% ${status}`}
    </span>
  );
}

function PreviewQuality({ lesson }: { lesson: any }) {
  const blueprint = lesson.qualityBlueprint;
  const review = lesson.qualityReview;
  return (
    <PreviewBlock title="Quality Blueprint">
      <div className="space-y-3">
        <QualityBadge review={review} />
        {blueprint?.gradeSpecificDemands ? (
          <div className="space-y-2 text-xs text-slate-700">
            <p><span className="font-bold text-slate-950">Text complexity:</span> {blueprint.gradeSpecificDemands.textComplexity}</p>
            <p><span className="font-bold text-slate-950">Evidence:</span> {blueprint.gradeSpecificDemands.evidenceDemand}</p>
            <p><span className="font-bold text-slate-950">Reasoning:</span> {blueprint.gradeSpecificDemands.reasoningDepth}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">This lesson has not been reviewed against the new blueprint yet. Rebuild the prebuilt library to refresh it.</p>
        )}
        {Array.isArray(review?.needsWork) && review.needsWork.length ? (
          <div>
            <p className="text-xs font-black uppercase text-amber-700">Needs Work</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {review.needsWork.slice(0, 5).map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
        {Array.isArray(blueprint?.interactionMix) ? (
          <div>
            <p className="text-xs font-black uppercase text-indigo-700">Expected Activities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {blueprint.interactionMix.map((item: string) => (
                <span key={item} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{item}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PreviewBlock>
  );
}

function PreviewBlock({ title, children }: { title: string; children: any }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
      <h4 className="mb-2 text-base font-black text-slate-950">{title}</h4>
      {children}
    </section>
  );
}

function PreviewPractice({ title, questions, compact = false }: { title: string; questions: any; compact?: boolean }) {
  const rows = Array.isArray(questions) ? questions : [];
  return (
    <PreviewBlock title={title}>
      <div className="space-y-3">
        {rows.slice(0, compact ? 2 : 3).map((question: any, index: number) => (
          <article key={`${title}-${index}`} className="rounded-lg bg-slate-50 p-3">
            {question.passage ? <p className="mb-2 text-xs italic text-slate-600">{question.passage}</p> : null}
            <p className="font-bold text-slate-900">{index + 1}. {question.question}</p>
            {Array.isArray(question.choices) ? (
              <ul className="mt-2 space-y-1">
                {question.choices.map((choice: string) => (
                  <li
                    key={choice}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      choice === question.correctAnswer
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {choice}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Teaching note:</span> {question.explanation}</p>
          </article>
        ))}
        {!rows.length ? <p className="text-slate-500">No practice items saved for this section.</p> : null}
      </div>
    </PreviewBlock>
  );
}

function lessonDomain(lesson: any) {
  const text = `${lesson.skill || ""} ${lesson.standardLabel || ""} ${lesson.standardCode || ""}`.toLowerCase();
  const code = String(lesson.standardCode || "");
  if (code.includes("CC.1.4.") || text.includes("convention") || text.includes("grammar") || text.includes("pronoun")) return "Conventions of Standard English";
  if (code.includes("CC.1.2.")) return "Informational Text";
  if (code.includes("CC.1.3.")) return "Literary Text";
  if (text.includes("tda") || text.includes("writing") || text.includes(".4.")) return "Text-Dependent Analysis";
  if (text.includes("vocab") || text.includes("word") || text.includes("connotation") || text.includes("figurative")) return "Vocabulary";
  if (text.includes("theme") || text.includes("plot") || text.includes("character") || text.includes("point of view")) return "Literary Text";
  if (text.includes("main idea") || text.includes("evidence") || text.includes("inference") || text.includes("informational")) return "Informational Text";
  return "Reading";
}

function formatFocusAreas(focusAreas: unknown) {
  if (!Array.isArray(focusAreas) || focusAreas.length === 0) return "No focus area yet";
  return focusAreas
    .map((area: any) => `${area.label || area.code || "Practice"}${area.description ? `: ${area.description}` : ""}`)
    .slice(0, 3)
    .join("; ");
}
