"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GradingCase, GradingCaseResult, GradingCaseStatus } from "@/lib/teacher/gradingCaseDtoCore";
import type { WritingProfileArea } from "@/lib/content/pssaWritingGrading";

type TeacherClass = {
  id: string;
  name: string;
  grade?: number;
  studentCount?: number;
};

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; cases: GradingCase[] }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" | "submitting" }
  | { status: "error" | "success"; message: string };

const NON_SCORABLE_OPTIONS = [
  { value: "BLANK", label: "Blank" },
  { value: "REFUSAL", label: "Refusal" },
  { value: "OFF_TOPIC", label: "Off-topic" },
  { value: "COPIED", label: "Copied" },
  { value: "OTHER", label: "Other" },
] as const;

type NonScorableReason = typeof NON_SCORABLE_OPTIONS[number]["value"];

export function TeacherGradingTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("classRoomId") ?? "");
  const [formId, setFormId] = useState(searchParams.get("formId") ?? "");
  const [benchmarkSeason, setBenchmarkSeason] = useState(searchParams.get("benchmarkSeason") ?? "BOY");
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get("caseId") ?? "");
  const [showFinalized, setShowFinalized] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedNonScorable, setSelectedNonScorable] = useState<NonScorableReason | null>(null);
  const [teacherNote, setTeacherNote] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const retryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const nextClassId = searchParams.get("classRoomId") ?? "";
    const nextFormId = searchParams.get("formId") ?? "";
    const nextSeason = searchParams.get("benchmarkSeason") ?? "BOY";
    const nextCaseId = searchParams.get("caseId") ?? "";
    setSelectedClassId(nextClassId);
    setFormId(nextFormId);
    setBenchmarkSeason(nextSeason);
    setSelectedCaseId(nextCaseId);
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

  const loadCases = async (options: { preserveSelection?: boolean } = {}) => {
    if (!selectedClassId || !formId) {
      setLoadState({ status: "idle" });
      return;
    }
    setLoadState({ status: "loading" });
    setSubmitState({ status: "idle" });
    const params = new URLSearchParams({
      classRoomId: selectedClassId,
      formId,
      statusScope: showFinalized ? "all" : "actionable",
    });
    try {
      const response = await fetch(`/api/teacher/grading-cases?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 404 ? "You don't have access to this class or form." : "Writing responses could not be loaded.");
      const payload = await response.json() as { cases?: GradingCase[] };
      const loadedCases = payload.cases ?? [];
      setLoadState({ status: "ready", cases: loadedCases });
      if (!options.preserveSelection || !loadedCases.some((item) => item.caseId === selectedCaseId)) {
        const nextCaseId = searchParams.get("caseId") && loadedCases.some((item) => item.caseId === searchParams.get("caseId"))
          ? searchParams.get("caseId") ?? ""
          : loadedCases[0]?.caseId ?? "";
        setSelectedCaseId(nextCaseId);
      }
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "Writing responses could not be loaded." });
    }
  };

  useEffect(() => {
    void loadCases({ preserveSelection: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, formId, showFinalized]);

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId) ?? null, [classes, selectedClassId]);
  const cases = loadState.status === "ready" ? loadState.cases : [];
  const selectedCase = cases.find((item) => item.caseId === selectedCaseId) ?? cases[0] ?? null;
  const activeResult = activeResultForCase(selectedCase);
  const isResolved = selectedCase ? selectedCase.status === "FINALIZED" || selectedCase.status === "NON_SCORABLE" : false;
  const activeScore = selectedScore ?? (isResolved ? selectedCase?.officialResult?.score ?? null : selectedCase?.aiDraft?.score ?? null);
  const scoreOptions = selectedCase ? scoreRange(selectedCase.scale.min, selectedCase.scale.max) : [];
  const changedFromOfficial = isResolved && selectedCase
    ? selectedNonScorable
      ? selectedNonScorable !== selectedCase.officialResult?.nonScorableReason
      : activeScore !== selectedCase.officialResult?.score
    : false;
  const needsOverrideReason = isResolved && changedFromOfficial;
  const canSubmit = Boolean(selectedCase)
    && submitState.status !== "submitting"
    && (selectedScore != null || selectedNonScorable != null || (!isResolved && selectedCase?.aiDraft?.score != null))
    && (!isResolved || changedFromOfficial)
    && (!needsOverrideReason || overrideReason.trim().length > 0)
    && (selectedNonScorable !== "OTHER" || teacherNote.trim().length > 0);

  useEffect(() => {
    setSelectedScore(null);
    setSelectedNonScorable(null);
    setTeacherNote("");
    setOverrideReason("");
    setProfileOpen(false);
    retryKeyRef.current = null;
  }, [selectedCase?.caseId, selectedCase?.concurrencyToken]);

  function updateQuery(next: { classRoomId?: string; formId?: string; benchmarkSeason?: string; caseId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "grading");
    const nextClassId = next.classRoomId ?? selectedClassId;
    const nextFormId = next.formId ?? formId;
    const nextSeason = next.benchmarkSeason ?? benchmarkSeason;
    const nextCaseId = next.caseId ?? selectedCaseId;
    if (nextClassId) params.set("classRoomId", nextClassId);
    else params.delete("classRoomId");
    if (nextFormId) params.set("formId", nextFormId);
    else params.delete("formId");
    if (nextSeason) params.set("benchmarkSeason", nextSeason);
    else params.delete("benchmarkSeason");
    if (nextCaseId) params.set("caseId", nextCaseId);
    else params.delete("caseId");
    router.replace(`/teacher?${params.toString()}`, { scroll: false });
  }

  async function submitDecision() {
    if (!selectedCase) return;
    const idempotencyKey = retryKeyRef.current ?? crypto.randomUUID();
    retryKeyRef.current = idempotencyKey;
    const score = selectedScore ?? selectedCase.aiDraft?.score ?? selectedCase.officialResult?.score ?? null;
    const decision = selectedNonScorable
      ? { kind: "NON_SCORABLE" as const, reason: selectedNonScorable }
      : score != null
        ? { kind: "SCORE" as const, score }
        : null;
    if (!decision) return;
    setSubmitState({ status: "submitting" });
    try {
      const response = await fetch(`/api/teacher/grading-cases/${encodeURIComponent(selectedCase.caseId)}/finalize`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedCase.classRoomId,
          formId: selectedCase.formId,
          expectedConcurrencyToken: selectedCase.concurrencyToken,
          decision,
          overrideReason: needsOverrideReason ? overrideReason : undefined,
          teacherNote: teacherNote || undefined,
          idempotencyKey,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        await handleSubmitError(response.status, payload.error);
        return;
      }
      retryKeyRef.current = null;
      setSubmitState({ status: "success", message: isResolved ? "Official score changed." : "Official score recorded." });
      setShowFinalized(true);
      await loadCases({ preserveSelection: true });
    } catch {
      setSubmitState({ status: "error", message: "Could not save this score. Try again." });
    }
  }

  async function handleSubmitError(status: number, code?: string) {
    if (status === 409 && code === "stale_grading_case") {
      retryKeyRef.current = null;
      setSubmitState({ status: "error", message: "This response changed since you opened it — reloading." });
      await loadCases({ preserveSelection: true });
      return;
    }
    if (status === 409 && code === "idempotency_key_reuse") {
      retryKeyRef.current = crypto.randomUUID();
      setSubmitState({ status: "error", message: "This save request changed. Review it and submit again." });
      return;
    }
    if (status === 404 && code === "grading_case_not_found") {
      retryKeyRef.current = null;
      setSubmitState({ status: "error", message: "This response is no longer available — reloading." });
      await loadCases({ preserveSelection: false });
      return;
    }
    if (status === 403) {
      setSubmitState({ status: "error", message: "You don't have access to this response." });
      return;
    }
    if (status === 400 && code === "override_reason_required") {
      setSubmitState({ status: "error", message: "Add a reason for changing the official score." });
      return;
    }
    if (status === 422 && code === "other_requires_teacher_note") {
      setSubmitState({ status: "error", message: "Add a note for Other." });
      return;
    }
    if (status === 422 && (code === "unsupported_score_mapping" || code === "score_not_integer" || code === "unsupported_non_scorable_reason")) {
      setSubmitState({ status: "error", message: "Check the score or non-scorable reason, then try again." });
      return;
    }
    if (status === 422 || status === 409) {
      setSubmitState({ status: "error", message: "This response can't be graded right now (its content changed) — reload." });
      return;
    }
    setSubmitState({ status: "error", message: "Check this grading decision, then try again." });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Grading</h2>
            <p className="mt-1 text-sm text-slate-600">Review writing responses for a selected diagnostic form.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:min-w-[640px]">
            <label className="text-sm font-medium text-slate-700">
              Class
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={selectedClassId}
                disabled={classesLoading}
                onChange={(event) => updateQuery({ classRoomId: event.target.value, caseId: "" })}
              >
                <option value="">{classesLoading ? "Loading classes..." : "Choose a class"}</option>
                {classes.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>{classRoom.name}{typeof classRoom.grade === "number" ? ` · Grade ${classRoom.grade}` : ""}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Benchmark form ID
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={formId}
                placeholder="Paste formId"
                onChange={(event) => updateQuery({ formId: event.target.value.trim(), caseId: "" })}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Season
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
      </div>

      {classesError ? <StateCard tone="error" title="Classes unavailable" body={classesError} /> : null}
      {!selectedClassId ? <StateCard title="Choose a class." body="Select a class to load writing responses." /> : null}
      {selectedClassId && !formId ? <StateCard title="Choose a benchmark." body="Paste the formId for the diagnostic form you want to grade." /> : null}

      {selectedClassId && formId ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Writing queue</h3>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input type="checkbox" checked={showFinalized} onChange={(event) => setShowFinalized(event.target.checked)} />
                Show finalized
              </label>
            </div>
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              {loadState.status === "ready" ? `${cases.length} responses ${showFinalized ? "in this form" : "need grading"}` : "Loading writing responses"}
            </div>
            {loadState.status === "loading" ? <div className="p-4 text-sm text-slate-600">Loading queue...</div> : null}
            {loadState.status === "error" ? <div className="p-4 text-sm text-red-700">{loadState.message}</div> : null}
            {loadState.status === "ready" && cases.length === 0 ? <div className="p-4 text-sm text-slate-600">No writing responses to grade for this form.</div> : null}
            {cases.map((item) => (
              <button
                key={item.caseId}
                type="button"
                onClick={() => {
                  setSelectedCaseId(item.caseId);
                  updateQuery({ caseId: item.caseId });
                }}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 ${selectedCase?.caseId === item.caseId ? "bg-indigo-50" : "bg-white hover:bg-slate-50"}`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-950">{item.studentName}</span>
                  <span className="block text-xs text-slate-500">{labelForScale(item.scale)} · {shortPrompt(item.prompt)}</span>
                </span>
                <StatusChip status={item.status} caseItem={item} />
              </button>
            ))}
          </aside>

          {selectedCase ? (
            <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{selectedCase.studentName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{labelForScale(selectedCase.scale)} · <StatusText status={selectedCase.status} /></p>
                </div>
                <StatusChip status={selectedCase.status} caseItem={selectedCase} />
              </header>

              <section className="border-b border-slate-200 px-5 py-4">
                <SectionLabel>Prompt</SectionLabel>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{selectedCase.prompt || "No prompt text available."}</div>
                <SectionLabel className="mt-4">Student response</SectionLabel>
                <div className="whitespace-pre-wrap rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-800">{selectedCase.responseText || "No response text."}</div>
              </section>

              <section className="border-b border-slate-200 px-5 py-4">
                {isResolved ? <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Official score recorded.</div> : null}
                <SectionLabel>{isResolved ? "Official Rubric Result" : selectedCase.status === "DRAFTED" ? "Draft Rubric Result" : "Rubric Result"}</SectionLabel>
                {selectedCase.status === "PENDING" ? <p className="text-sm text-slate-600">No AI draft yet — score manually.</p> : null}
                {selectedCase.status === "FAILED" ? <p className="text-sm text-slate-600">AI draft unavailable — score manually.</p> : null}
                {activeResult?.rationale ? (
                  <div className="mt-3 text-sm text-slate-700">
                    <p className="text-xs font-medium text-slate-500">Rubric rationale</p>
                    <p className="mt-1">{activeResult.rationale}</p>
                  </div>
                ) : null}
                <fieldset className="mt-4" aria-label="Rubric score">
                  <legend className="sr-only">Rubric score</legend>
                  <div role="radiogroup" aria-label={`Rubric score, ${selectedCase.scale.min} to ${selectedCase.scale.max}`} className="flex flex-wrap gap-2">
                    {scoreOptions.map((score) => (
                      <label key={score} className={`flex h-14 min-w-[68px] cursor-pointer flex-col items-center justify-center rounded-md border text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-300 ${activeScore === score && !selectedNonScorable ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
                        <input
                          className="sr-only"
                          type="radio"
                          name="writing-score"
                          value={score}
                          checked={activeScore === score && !selectedNonScorable}
                          onChange={() => {
                            setSelectedScore(score);
                            setSelectedNonScorable(null);
                            setTeacherNote("");
                            retryKeyRef.current = null;
                          }}
                        />
                        <span className="text-lg font-semibold">{score}</span>
                        <span className={`text-[11px] ${activeScore === score && !selectedNonScorable ? "text-indigo-100" : "text-slate-500"}`}>{scoreLabel(selectedCase.scale, score)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>

              {activeResult?.instructionalProfile ? (
                <section className="border-b border-slate-200 px-5 py-4">
                  <SectionLabel>Instructional Writing Profile</SectionLabel>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-slate-700">{profileSummary(activeResult.instructionalProfile)}</p>
                    <button type="button" className="text-left text-sm font-semibold text-indigo-700" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
                      {profileOpen ? "Hide evidence & teaching moves" : "Show evidence & teaching moves"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs italic text-slate-500">Separate from the official score; does not change it.</p>
                  {activeResult.gapToNextLevel ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><span className="font-semibold">Gap to the next level:</span> {activeResult.gapToNextLevel}</div> : null}
                  {profileOpen ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {activeResult.instructionalProfile.map((area) => (
                        <div key={area.areaId} className="rounded-md border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{areaLabel(area.areaId)}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{signalLabel(area.signal)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">{area.observation}</p>
                          {area.responseExcerpt ? <p className="mt-2 text-xs text-slate-500">Evidence: “{area.responseExcerpt}”</p> : null}
                          <p className="mt-2 text-xs font-medium text-slate-700">Teaching move: {area.teachingMove}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="border-b border-slate-200 px-5 py-4">
                <SectionLabel>Or mark non-scorable</SectionLabel>
                <p className="mb-2 text-xs text-slate-500">Use only for the student's response itself. Records 0 points with a reason.</p>
                <div className="flex flex-wrap gap-2">
                  {NON_SCORABLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selectedNonScorable === option.value}
                      onClick={() => {
                        setSelectedNonScorable((current) => current === option.value ? null : option.value);
                        setSelectedScore(null);
                        retryKeyRef.current = null;
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selectedNonScorable === option.value ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {selectedNonScorable === "OTHER" ? (
                  <label className="mt-3 block text-sm font-medium text-slate-700">
                    Note for Other
                    <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} />
                  </label>
                ) : null}
              </section>

              {needsOverrideReason ? (
                <section className="border-b border-slate-200 px-5 py-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for changing the official score
                    <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} />
                  </label>
                </section>
              ) : null}

              <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-600">
                  {submitState.status === "error" ? <span className="font-medium text-red-700">{submitState.message}</span> : submitState.status === "success" ? <span className="font-medium text-emerald-700">{submitState.message}</span> : isResolved ? "Change the score or reason, then save an override." : "Confirm the draft or record a manual score."}
                </div>
                <button type="button" disabled={!canSubmit} onClick={() => void submitDecision()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {submitState.status === "submitting" ? "Saving..." : actionLabel(selectedCase, activeScore, selectedNonScorable, changedFromOfficial)}
                </button>
              </footer>
            </article>
          ) : loadState.status === "ready" ? (
            <StateCard title="No writing responses to grade for this form." body="Choose a different form or return after students submit writing responses." />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function activeResultForCase(caseItem: GradingCase | null): GradingCaseResult | null {
  if (!caseItem) return null;
  if (caseItem.status === "FINALIZED" || caseItem.status === "NON_SCORABLE") return caseItem.officialResult;
  if (caseItem.status === "DRAFTED" && caseItem.aiDraft) {
    return {
      score: caseItem.aiDraft.score,
      nonScorableReason: null,
      rationale: caseItem.aiDraft.rationale,
      instructionalProfile: caseItem.aiDraft.instructionalProfile,
      gapToNextLevel: caseItem.aiDraft.gapToNextLevel,
      reviewedAt: null,
    };
  }
  return null;
}

function StateCard({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "error" }) {
  return (
    <section className={`rounded-lg border p-6 shadow-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-800"}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm opacity-80">{body}</p>
    </section>
  );
}

function SectionLabel({ children, className = "" }: { children: string; className?: string }) {
  return <h4 className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ${className}`}>{children}</h4>;
}

function StatusChip({ status, caseItem }: { status: GradingCaseStatus; caseItem: GradingCase }) {
  const styles = {
    PENDING: "bg-slate-100 text-slate-600",
    DRAFTED: "bg-amber-50 text-amber-700",
    FAILED: "bg-red-50 text-red-700",
    FINALIZED: "bg-emerald-50 text-emerald-700",
    NON_SCORABLE: "bg-violet-50 text-violet-700",
  }[status];
  const label = status === "FINALIZED" && caseItem.officialResult?.score != null
    ? `${caseItem.officialResult.score} / ${caseItem.scale.max}`
    : status === "NON_SCORABLE"
      ? nonScorableLabel(caseItem.officialResult?.nonScorableReason)
      : statusLabel(status);
  return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function StatusText({ status }: { status: GradingCaseStatus }) {
  if (status === "PENDING") return <>No AI draft yet — score manually</>;
  if (status === "FAILED") return <>AI draft unavailable — score manually</>;
  if (status === "DRAFTED") return <>Draft suggestion ready</>;
  if (status === "NON_SCORABLE") return <>Official non-scorable decision</>;
  return <>Official score</>;
}

function scoreRange(min: number, max: number) {
  const values = [];
  for (let score = min; score <= max; score += 1) values.push(score);
  return values;
}

function scoreLabel(scale: { min: number; max: number }, score: number) {
  if (scale.min === 0 && scale.max === 3) return ["No credit", "Minimal", "Partial", "Full"][score] ?? String(score);
  return `Level ${score}`;
}

function labelForScale(scale: { min: number; max: number }) {
  return scale.min === 0 && scale.max === 3 ? "Short Response 0-3" : "TDA 1-4";
}

function statusLabel(status: GradingCaseStatus) {
  if (status === "PENDING") return "No draft";
  if (status === "DRAFTED") return "Draft";
  if (status === "FAILED") return "AI unavailable";
  if (status === "NON_SCORABLE") return "Non-scorable";
  return "Finalized";
}

function nonScorableLabel(value: string | null | undefined) {
  return NON_SCORABLE_OPTIONS.find((option) => option.value === value)?.label ?? "Non-scorable";
}

function shortPrompt(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 54 ? `${compact.slice(0, 51)}...` : compact || "Writing response";
}

function profileSummary(profile: WritingProfileArea[]) {
  const counts = profile.reduce((acc, area) => {
    acc[area.signal] = (acc[area.signal] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return `${counts.clear ?? 0} clear · ${counts.emerging ?? 0} emerging · ${counts.needs_support ?? 0} needs support`;
}

function signalLabel(signal: string) {
  return signal.replace(/_/g, " ");
}

function areaLabel(areaId: string) {
  return areaId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function actionLabel(caseItem: GradingCase, score: number | null, nonScorable: string | null, changedFromOfficial: boolean) {
  if (caseItem.status === "FINALIZED" || caseItem.status === "NON_SCORABLE") {
    if (!changedFromOfficial) return "Change official score";
    return nonScorable ? `Save override: ${nonScorableLabel(nonScorable)}` : `Save override to ${score}`;
  }
  if (nonScorable) return `Record ${nonScorableLabel(nonScorable)}`;
  if (caseItem.status === "DRAFTED") return `Confirm score ${score ?? caseItem.aiDraft?.score ?? ""}`;
  return "Record score";
}
