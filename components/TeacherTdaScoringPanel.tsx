"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { TeacherTutorAgentPanel } from "@/components/TeacherTutorAgentPanel";

type TdaResult = {
  responseRecordId: string;
  studentName: string;
  studentEmail: string;
  classRoomId: string | null;
  className: string;
  assessmentId: string;
  assessmentTitle: string;
  gradeLevel: number;
  prompt: string;
  essay: string;
  aiScore: number;
  teacherScore: number | null;
  displayScore: number;
  maxScore: number;
  performanceBand: string;
  displayBand: string;
  strengths: string[];
  areasForGrowth: string[];
  teacherFriendlyFeedback: string;
  studentFriendlyFeedback: string;
  nextSteps: string[];
  rubricBreakdown: Record<string, string | number>;
  gradingProvider: string;
  needsReview: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export default function TeacherTdaScoringPanel() {
  const [results, setResults] = useState<TdaResult[]>([]);
  const [filters, setFilters] = useState<any>({ classes: [], assessments: [], gradeLevels: [], scoreBands: [] });
  const [selected, setSelected] = useState<TdaResult | null>(null);
  const [classId, setClassId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [scoreBand, setScoreBand] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [teacherScore, setTeacherScore] = useState("3");
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResults();
  }, [classId, assessmentId, gradeLevel, scoreBand]);

  useEffect(() => {
    if (!selected && results.length) setSelected(results[0]);
  }, [results, selected]);

  useEffect(() => {
    if (!selected) return;
    setTeacherScore(String(selected.teacherScore ?? selected.displayScore ?? selected.aiScore ?? 3));
    setTeacherFeedback(selected.teacherFriendlyFeedback || "");
  }, [selected]);

  const summary = useMemo(() => {
    const needsReview = results.filter((item) => item.needsReview).length;
    const reviewed = results.filter((item) => item.teacherScore != null || item.reviewedAt).length;
    const average = results.length ? Math.round((results.reduce((sum, item) => sum + item.displayScore, 0) / results.length) * 10) / 10 : 0;
    return { needsReview, reviewed, average };
  }, [results]);

  async function loadResults() {
    setLoading(true);
    setMessage("");
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (assessmentId) params.set("assessmentId", assessmentId);
    if (gradeLevel) params.set("gradeLevel", gradeLevel);
    if (scoreBand) params.set("scoreBand", scoreBand);

    try {
      const res = await fetch(`/api/teacher/tda-results?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load TDA results.");
      setResults(json.results || []);
      setFilters(json.filters || { classes: [], assessments: [], gradeLevels: [], scoreBands: [] });
      setSelected((current) => {
        if (!current) return json.results?.[0] || null;
        return json.results?.find((item: TdaResult) => item.responseRecordId === current.responseRecordId) || json.results?.[0] || null;
      });
    } catch (err: any) {
      setMessage(err.message || "Failed to load TDA results.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTeacherReview() {
    if (!selected) return;
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/teacher/tda-results", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseRecordId: selected.responseRecordId,
          teacherScore,
          teacherFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save teacher review.");
      setMessage("Teacher review saved.");
      await loadResults();
    } catch (err: any) {
      setMessage(err.message || "Failed to save teacher review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <TeacherTutorAgentPanel />

      <div className="rounded-3xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">TDA Scoring Dashboard</h2>
            <p className="mt-1 text-sm text-slate-600">Review PSSA-style TDA essays, AI/fallback scores, rubric evidence, and teacher overrides.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label="Average" value={`${summary.average}/4`} />
            <Metric label="Needs Review" value={String(summary.needsReview)} />
            <Metric label="Reviewed" value={String(summary.reviewed)} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <SelectFilter label="Class" value={classId} onChange={setClassId} options={filters.classes.map((item: any) => ({ value: item.id, label: item.name }))} />
          <SelectFilter label="Assessment" value={assessmentId} onChange={setAssessmentId} options={filters.assessments.map((item: any) => ({ value: item.id, label: item.title }))} />
          <SelectFilter label="Grade" value={gradeLevel} onChange={setGradeLevel} options={filters.gradeLevels.map((item: number) => ({ value: String(item), label: `Grade ${item}` }))} />
          <SelectFilter label="Score Band" value={scoreBand} onChange={setScoreBand} options={filters.scoreBands.map((item: string) => ({ value: item, label: item }))} />
        </div>

        {message && <p className={`mt-4 text-sm font-semibold ${message.includes("Failed") ? "text-rose-700" : "text-emerald-700"}`}>{message}</p>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.4fr)]">
        <div className="rounded-3xl bg-white p-4 shadow">
          <h3 className="px-2 text-lg font-bold text-slate-900">Submitted Essays</h3>
          {loading ? <p className="p-2 text-sm text-slate-600">Loading TDA results...</p> : null}
          {!loading && !results.length ? <p className="p-2 text-sm text-slate-600">No submitted TDA essays match these filters yet.</p> : null}
          <div className="mt-3 space-y-2">
            {results.map((item) => (
              <button
                key={item.responseRecordId}
                onClick={() => setSelected(item)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selected?.responseRecordId === item.responseRecordId ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.studentName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.assessmentTitle}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{item.displayScore}/4</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{item.className}</Badge>
                  <Badge>Grade {item.gradeLevel}</Badge>
                  <Badge>{item.displayBand}</Badge>
                  {item.needsReview ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Needs Review</span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selected.studentName}</h3>
                  <p className="text-sm text-slate-600">{selected.assessmentTitle} • Grade {selected.gradeLevel} • {selected.className}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>AI: {selected.aiScore}/4</Badge>
                  <Badge>Final: {selected.displayScore}/4</Badge>
                  <Badge>{selected.gradingProvider}</Badge>
                  {selected.needsReview ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Needs Review</span> : null}
                </div>
              </div>

              <Block title="TDA Prompt">
                <p className="text-sm leading-6 text-slate-700">{selected.prompt}</p>
              </Block>

              <Block title="Student Essay">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{selected.essay || "No essay text saved."}</p>
              </Block>

              <div className="grid gap-4 lg:grid-cols-2">
                <ListBlock title="Strengths" items={selected.strengths} />
                <ListBlock title="Areas for Growth" items={selected.areasForGrowth} />
              </div>

              <Block title="Teacher-Friendly Feedback">
                <p className="text-sm leading-6 text-slate-700">{selected.teacherFriendlyFeedback}</p>
              </Block>

              <Block title="Student-Friendly Feedback">
                <p className="text-sm leading-6 text-slate-700">{selected.studentFriendlyFeedback}</p>
              </Block>

              <Block title="Rubric Breakdown">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  {Object.entries(selected.rubricBreakdown || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-semibold text-slate-900">{rubricLabel(key)}</p>
                      <p className="mt-1 text-slate-600">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </Block>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h4 className="font-bold text-slate-900">Teacher Review</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Score</label>
                    <select value={teacherScore} onChange={(event) => setTeacherScore(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2">
                      {[1, 2, 3, 4].map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Additional Feedback</label>
                    <textarea value={teacherFeedback} onChange={(event) => setTeacherFeedback(event.target.value)} className="mt-1 h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="Add feedback for the student or your own scoring notes." />
                  </div>
                </div>
                <button onClick={saveTeacherReview} disabled={saving} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Teacher Review"}</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Select an essay to review scoring details.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2">
        <option value="">All</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 px-4 py-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{children}</span>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><h4 className="font-bold text-slate-900">{title}</h4><div className="mt-3">{children}</div></div>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <Block title={title}>
      <ul className="space-y-2 text-sm text-slate-700">
        {(items.length ? items : ["No rubric notes saved."]).map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </Block>
  );
}

function rubricLabel(key: string) {
  const labels: Record<string, string> = {
    analysisOfText: "Analysis of Text",
    useOfTextEvidence: "Use of Text Evidence",
    explanationOfEvidence: "Explanation of Evidence",
    organization: "Organization",
    languageAndConventions: "Language and Conventions",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}
