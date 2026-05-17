"use client";

import { useEffect, useMemo, useState } from "react";

const initialForm = {
  url: "",
  title: "",
  provider: "",
  gradeLevel: "",
  standardCode: "",
  skill: "",
  description: "",
  rationale: "",
};

export function TeacherResourcesPanel() {
  const [data, setData] = useState<any>({ resources: [], teacherGrades: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/teacher/learning-lessons");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setData(json);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const resources = useMemo(() => {
    const teacherGrades = new Set((data.teacherGrades || []).map(Number));
    return [...(data.resources || [])].sort((a: any, b: any) => {
      const aMatch = a.gradeLevel != null && teacherGrades.has(Number(a.gradeLevel)) ? 0 : 1;
      const bMatch = b.gradeLevel != null && teacherGrades.has(Number(b.gradeLevel)) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return (a.gradeLevel || 99) - (b.gradeLevel || 99) || String(a.standardCode || "").localeCompare(String(b.standardCode || "")) || String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [data.resources, data.teacherGrades]);

  async function submitSuggestion(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const res = await fetch("/api/teacher/resources/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setMessage(json.error || "Could not submit suggestion.");
      return;
    }
    setForm(initialForm);
    setModalOpen(false);
    setMessage("Thanks — your suggestion is waiting for admin review.");
  }

  if (loading) return <section className="rounded-3xl bg-white p-6 shadow">Loading resources...</section>;

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">Resource Library</p>
          <h2 className="text-xl font-black text-slate-950">Curated Videos and Practice Supports</h2>
          <p className="mt-1 text-sm text-slate-600">
            Showing {resources.length} approved resources. Your class grades appear first when matching resources exist.
          </p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          Suggest a Resource
        </button>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}

      <div className="mt-5 grid gap-3">
        {resources.map((resource: any) => (
          <article key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Grade {resource.gradeLevel || "Any"} • {resource.standardCode} • {resource.skill}</p>
            <a className="mt-1 block font-bold text-blue-700 underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
            <p className="mt-1 text-sm font-semibold text-slate-700">{resource.provider}</p>
            {resource.description ? <p className="mt-1 text-sm text-slate-600">{resource.description}</p> : null}
          </article>
        ))}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4">
          <form onSubmit={submitSuggestion} className="mx-auto mt-10 max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-950">Suggest a Resource</h3>
                <p className="mt-1 text-sm text-slate-600">Suggestions go to admin review before they appear in the shared catalog.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Close</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Input label="URL" value={form.url} onChange={(url) => setForm({ ...form, url })} required />
              <Input label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required maxLength={160} />
              <Input label="Provider name / channel" value={form.provider} onChange={(provider) => setForm({ ...form, provider })} required maxLength={120} />
              <label className="text-sm font-semibold text-slate-700">
                Grade level
                <select value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
                  <option value="">Any</option>
                  {[3, 4, 5, 6, 7, 8].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                </select>
              </label>
              <Input label="Standard code" value={form.standardCode} onChange={(standardCode) => setForm({ ...form, standardCode })} maxLength={80} />
              <Input label="Skill" value={form.skill} onChange={(skill) => setForm({ ...form, skill })} maxLength={120} />
              <TextArea label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} maxLength={1000} />
              <TextArea label="Rationale" value={form.rationale} onChange={(rationale) => setForm({ ...form, rationale })} required maxLength={500} />
            </div>
            <button disabled={submitting} className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit Suggestion"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function Input({ label, value, onChange, required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input required={required} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
    </label>
  );
}

function TextArea({ label, value, onChange, required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number }) {
  return (
    <label className="text-sm font-semibold text-slate-700 md:col-span-2">
      {label}
      <textarea required={required} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2" />
    </label>
  );
}
