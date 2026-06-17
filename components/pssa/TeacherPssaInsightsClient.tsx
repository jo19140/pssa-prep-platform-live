"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ClassReport } from "@/lib/content/pssaClassReport";
import { TeacherPssaInsightsPanel } from "@/components/pssa/TeacherPssaInsightsPanel";

type TeacherClass = {
  id: string;
  name: string;
  grade?: number;
  studentCount?: number;
};

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; report: ClassReport }
  | { status: "error"; message: string };

type LessonSuggestionCandidate = {
  lessonId: string;
  title: string;
  skill: string;
};

type SuggestionsState =
  | { status: "idle" | "loading"; byGroupId: Record<string, LessonSuggestionCandidate[]> }
  | { status: "ready"; byGroupId: Record<string, LessonSuggestionCandidate[]> }
  | { status: "error"; byGroupId: Record<string, LessonSuggestionCandidate[]>; message: string };

type AssignState = Record<string, {
  status: "submitting" | "success" | "error";
  message: string;
}>;

type AssignRequest = {
  groupId: string;
  lessonId: string;
  dueDate: string;
  studentProfileIds: string[];
};

export function TeacherPssaInsightsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("classRoomId") ?? "");
  const [formId, setFormId] = useState(searchParams.get("formId") ?? "");
  const [benchmarkSeason, setBenchmarkSeason] = useState(searchParams.get("benchmarkSeason") ?? "BOY");
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [suggestionsState, setSuggestionsState] = useState<SuggestionsState>({ status: "idle", byGroupId: {} });
  const [assignState, setAssignState] = useState<AssignState>({});

  useEffect(() => {
    const nextClassId = searchParams.get("classRoomId") ?? "";
    const nextFormId = searchParams.get("formId") ?? "";
    const nextSeason = searchParams.get("benchmarkSeason") ?? "BOY";
    setSelectedClassId(nextClassId);
    setFormId(nextFormId);
    setBenchmarkSeason(nextSeason);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setClassesLoading(true);
    setClassesError(null);
    fetch("/api/teacher/classes", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "You don't have access to this class." : "Could not load classes.");
        return response.json();
      })
      .then((payload) => {
        const loaded = Array.isArray(payload.classes) ? payload.classes : [];
        setClasses(loaded);
        setClassesLoading(false);
        if (!selectedClassId && loaded[0]?.id) updateQuery({ classRoomId: loaded[0].id });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setClassesLoading(false);
        setClassesError(error instanceof Error ? error.message : "Could not load classes.");
      });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClassId || !formId) {
      setLoadState({ status: "idle" });
      setSuggestionsState({ status: "idle", byGroupId: {} });
      return;
    }
    const controller = new AbortController();
    setLoadState({ status: "loading" });
    setSuggestionsState({ status: "loading", byGroupId: {} });
    setAssignState({});
    const params = new URLSearchParams({ classRoomId: selectedClassId, formId, benchmarkSeason });
    fetch(`/api/teacher/pssa/class-report?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 403) throw new Error("You don't have access to this class.");
          if (response.status === 404) throw new Error("We couldn't find that class or benchmark.");
          throw new Error("Diagnostic insights are not available right now.");
        }
        return response.json() as Promise<ClassReport>;
      })
      .then((report) => {
        setLoadState({ status: "ready", report });
        return fetch(`/api/teacher/pssa/lesson-suggestions?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      })
      .then(async (response) => {
        if (!response.ok) throw new Error("Lesson suggestions unavailable — refresh and try again.");
        const payload = await response.json() as {
          groups?: Array<{ groupId: string; candidates?: LessonSuggestionCandidate[] }>;
        };
        setSuggestionsState({ status: "ready", byGroupId: suggestionsByGroup(payload.groups ?? []) });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Diagnostic insights are not available right now.";
        setLoadState((current) => {
          if (current.status === "ready") {
            setSuggestionsState({ status: "error", byGroupId: {}, message: "Lesson suggestions unavailable — refresh and try again." });
            return current;
          }
          setSuggestionsState({ status: "idle", byGroupId: {} });
          return { status: "error", message };
        });
      });
    return () => controller.abort();
  }, [selectedClassId, formId, benchmarkSeason]);

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId) ?? null, [classes, selectedClassId]);

  function updateQuery(next: { classRoomId?: string; formId?: string; benchmarkSeason?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextClassId = next.classRoomId ?? selectedClassId;
    const nextFormId = next.formId ?? formId;
    const nextSeason = next.benchmarkSeason ?? benchmarkSeason;
    if (nextClassId) params.set("classRoomId", nextClassId);
    else params.delete("classRoomId");
    if (nextFormId) params.set("formId", nextFormId);
    else params.delete("formId");
    if (nextSeason) params.set("benchmarkSeason", nextSeason);
    router.replace(`/teacher/pssa/insights?${params.toString()}`, { scroll: false });
  }

  async function assignRecommendedLesson(request: AssignRequest) {
    setAssignState((current) => ({
      ...current,
      [request.groupId]: { status: "submitting", message: "Assigning lesson..." },
    }));
    try {
      const response = await fetch("/api/teacher/pssa/assign-recommended-lesson", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedClassId,
          formId,
          benchmarkSeason,
          groupId: request.groupId,
          lessonId: request.lessonId,
          studentProfileIds: request.studentProfileIds,
          dueDate: request.dueDate,
        }),
      });
      if (!response.ok) {
        const message = response.status === 409
          ? "This report changed — refresh and try again."
          : response.status === 403
            ? "You do not have permission to assign this lesson."
            : response.status === 400
              ? "Check the lesson and due date, then try again."
              : "Could not assign this lesson right now.";
        throw new Error(message);
      }
      const payload = await response.json() as {
        dueDate: string;
        results?: Array<{ outcome: "created" | "updated" }>;
      };
      const results = payload.results ?? [];
      const created = results.filter((row) => row.outcome === "created").length;
      const updated = results.filter((row) => row.outcome === "updated").length;
      setAssignState((current) => ({
        ...current,
        [request.groupId]: {
          status: "success",
          message: `Assigned to ${results.length} students — ${created} new, ${updated} updated, due ${payload.dueDate}.`,
        },
      }));
    } catch (error) {
      setAssignState((current) => ({
        ...current,
        [request.groupId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Could not assign this lesson right now.",
        },
      }));
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-4 rounded-lg border border-orange-100 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">State test prep · Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Diagnostic Insights</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Choose a class and benchmark form to view teacher-facing diagnostic patterns.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:min-w-[640px]">
          <label className="text-sm font-medium text-slate-700">
            Class
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              value={selectedClassId}
              disabled={classesLoading}
              onChange={(event) => updateQuery({ classRoomId: event.target.value })}
            >
              <option value="">{classesLoading ? "Loading classes..." : "Choose a class"}</option>
              {classes.map((classRoom) => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}{typeof classRoom.grade === "number" ? ` · Grade ${classRoom.grade}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Benchmark form ID
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              value={formId}
              placeholder="Paste formId"
              onChange={(event) => updateQuery({ formId: event.target.value.trim() })}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Season
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              value={benchmarkSeason}
              onChange={(event) => updateQuery({ benchmarkSeason: event.target.value })}
            >
              <option value="BOY">BOY</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
              <option value="spring">Spring</option>
            </select>
          </label>
        </div>
      </div>

      {classesError ? <StateCard tone="error" title="Classes unavailable" body={classesError} /> : null}
      {!selectedClassId ? <StateCard title="Choose a class." body="Select a class to load diagnostic insights." /> : null}
      {selectedClassId && !formId ? <StateCard title="Choose a benchmark." body="Paste the formId for the PSSA benchmark you want to review." /> : null}
      {selectedClassId && formId && loadState.status === "loading" ? <LoadingPanel /> : null}
      {selectedClassId && formId && loadState.status === "error" ? <StateCard tone="error" title="Unable to load insights" body={loadState.message} /> : null}
      {selectedClassId && formId && loadState.status === "ready" ? (
        <TeacherPssaInsightsPanel
          report={loadState.report}
          className={selectedClass?.name ?? "Selected class"}
          lessonSuggestions={suggestionsState.byGroupId}
          suggestionsUnavailable={suggestionsState.status === "error"}
          assignState={assignState}
          onAssign={assignRecommendedLesson}
        />
      ) : null}
    </main>
  );
}

function suggestionsByGroup(groups: Array<{ groupId: string; candidates?: LessonSuggestionCandidate[] }>) {
  return Object.fromEntries(groups.map((group) => [group.groupId, group.candidates ?? []]));
}

function LoadingPanel() {
  return (
    <section className="rounded-lg border border-orange-100 bg-white p-6 shadow-sm" aria-label="Loading diagnostic insights">
      <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-md bg-slate-100" />)}
      </div>
    </section>
  );
}

function StateCard({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "error" }) {
  return (
    <section className={`rounded-lg border p-6 shadow-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-800"}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm opacity-80">{body}</p>
    </section>
  );
}
