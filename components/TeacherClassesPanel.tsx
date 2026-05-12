"use client";

import { useEffect, useState } from "react";

export function TeacherClassesPanel() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "Period 1 ELA", grade: "6" });

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/classes");
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to load classes.");
      setClasses(json.classes || []);
    } catch (err: any) {
      setMessage(err.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }

  async function createClass() {
    setCreating(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, grade: Number(form.grade) }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to create class.");
      setClasses((current) => [...current, json.classRoom].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)));
      setMessage(`${json.classRoom.name} created. Share code ${json.classRoom.joinCode} with students.`);
    } catch (err: any) {
      setMessage(err.message || "Failed to create class.");
    } finally {
      setCreating(false);
    }
  }

  async function updateClassCode(classRoomId: string, action: "regenerate" | "enable" | "disable") {
    setMessage("");
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classRoomId, action }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to update class code.");
      setClasses((current) => current.map((classRoom) => classRoom.id === json.classRoom.id ? json.classRoom : classRoom));
      setMessage(action === "regenerate" ? `New code created: ${json.classRoom.joinCode}` : "Class code updated.");
    } catch (err: any) {
      setMessage(err.message || "Failed to update class code.");
    }
  }

  async function copyCode(joinCode: string) {
    await navigator.clipboard?.writeText(joinCode);
    setMessage(`Copied ${joinCode}`);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Classes & Codes</p>
        <h2 className="text-2xl font-black text-slate-950">Create Classes Students Can Join</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Use this when Google Classroom is blocked or when you want students to enroll themselves. No sample students are added here.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-black text-slate-950">New Class</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_12rem_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Class Name</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Period 1 ELA"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Grade</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={form.grade}
              onChange={(event) => setForm({ ...form, grade: event.target.value })}
            >
              {[3, 4, 5, 6, 7, 8].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={createClass}
            disabled={creating}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Class"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-blue-700">{message}</p> : null}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-950">Your Classes</h3>
          <button type="button" onClick={loadClasses} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading classes...</p>
        ) : classes.length ? (
          <div className="mt-4 grid gap-4">
            {classes.map((classRoom) => (
              <article key={classRoom.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-slate-950">{classRoom.name}</h4>
                    <p className="text-sm text-slate-500">Grade {classRoom.grade} • {classRoom.studentCount} student{classRoom.studentCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${classRoom.joinEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {classRoom.joinEnabled ? "Code active" : "Code disabled"}
                    </span>
                    <span className="rounded-xl bg-slate-950 px-4 py-2 font-mono text-sm font-black text-white">{classRoom.joinCode || "No code"}</span>
                    {classRoom.joinCode ? (
                      <button type="button" onClick={() => copyCode(classRoom.joinCode)} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">
                        Copy
                      </button>
                    ) : null}
                    <button type="button" onClick={() => updateClassCode(classRoom.id, "regenerate")} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
                      New Code
                    </button>
                    <button
                      type="button"
                      onClick={() => updateClassCode(classRoom.id, classRoom.joinEnabled ? "disable" : "enable")}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      {classRoom.joinEnabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No classes yet. Create a class, then share its code with your students.
          </div>
        )}
      </div>
    </section>
  );
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
