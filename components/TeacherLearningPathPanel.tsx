"use client";

import { useEffect, useMemo, useState } from "react";

export function TeacherLearningPathPanel() {
  const [data, setData] = useState<any>({ lessons: [], resources: [], standardsProgress: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ gradeLevel: "6", standardCode: "", skill: "", title: "", url: "", provider: "", description: "" });

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/teacher/learning-lessons");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function saveResource() {
    setMessage("");
    const res = await fetch("/api/teacher/learning-lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Failed to save resource.");
      return;
    }
    setMessage("Resource saved.");
    setForm({ gradeLevel: "6", standardCode: "", skill: "", title: "", url: "", provider: "", description: "" });
    await loadData();
  }

  const lessonsByStatus = useMemo(() => {
    const rows = data.lessons || [];
    return {
      notStarted: rows.filter((row: any) => row.status === "NOT_STARTED").length,
      inProgress: rows.filter((row: any) => row.status === "IN_PROGRESS").length,
      completed: rows.filter((row: any) => row.status === "COMPLETED").length,
      mastered: rows.filter((row: any) => row.status === "MASTERED").length,
    };
  }, [data.lessons]);

  if (loading) return <section className="rounded-3xl bg-white p-6 shadow">Loading learning pathways...</section>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        <Metric title="Not Started" value={lessonsByStatus.notStarted} />
        <Metric title="In Progress" value={lessonsByStatus.inProgress} />
        <Metric title="Completed" value={lessonsByStatus.completed} />
        <Metric title="Mastered" value={lessonsByStatus.mastered} />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900">Progress by Standard</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Standard</th>
                <th className="py-2 pr-4">Skill</th>
                <th className="py-2 pr-4">Lessons</th>
                <th className="py-2 pr-4">Completed</th>
                <th className="py-2 pr-4">Mastered</th>
              </tr>
            </thead>
            <tbody>
              {(data.standardsProgress || []).map((row: any) => (
                <tr key={`${row.standardCode}-${row.skill}`} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{row.standardCode}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.skill}</td>
                  <td className="py-3 pr-4">{row.lessonCount}</td>
                  <td className="py-3 pr-4">{row.completed}</td>
                  <td className="py-3 pr-4">{row.mastered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900">Student Assigned Lessons</h2>
        <div className="mt-4 grid gap-3">
          {(data.lessons || []).map((lesson: any) => (
            <article key={lesson.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">{lesson.studentName} • Grade {lesson.gradeLevel}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{lesson.standardCode} - {lesson.skill}</h3>
                  <p className="mt-1 text-sm text-slate-600">{lesson.whyAssigned}</p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{formatStatus(lesson.status)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900">Curated Resource Links</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-slate-300 p-3" placeholder="Grade level" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} />
          <input className="rounded-xl border border-slate-300 p-3" placeholder="Standard code" value={form.standardCode} onChange={(e) => setForm({ ...form, standardCode: e.target.value })} />
          <input className="rounded-xl border border-slate-300 p-3" placeholder="Skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
          <input className="rounded-xl border border-slate-300 p-3" placeholder="Resource title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-xl border border-slate-300 p-3" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input className="rounded-xl border border-slate-300 p-3" placeholder="Provider" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <textarea className="rounded-xl border border-slate-300 p-3 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button onClick={saveResource} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add Resource</button>
        {message ? <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}

        <div className="mt-5 grid gap-3">
          {(data.resources || []).map((resource: any) => (
            <article key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Grade {resource.gradeLevel || "Any"} • {resource.standardCode} • {resource.skill}</p>
              <a className="mt-1 block font-bold text-blue-700 underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
              <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
            </article>
          ))}
        </div>
      </section>
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

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
