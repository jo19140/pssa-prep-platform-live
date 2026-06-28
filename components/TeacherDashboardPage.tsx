"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

type TeacherToolsTab = "resources" | "readingCoach";

type TeacherClass = {
  id: string;
  name: string;
  grade?: number;
};

type TeacherToolsData = {
  classes: TeacherClass[];
};

const teacherToolsTabs: Array<{ id: TeacherToolsTab; label: string }> = [
  { id: "readingCoach", label: "Reading Coach" },
  { id: "resources", label: "Resources" },
];

export default function TeacherDashboardPage() {
  const [data, setData] = useState<TeacherToolsData>({ classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClassRoomId, setSelectedClassRoomId] = useState("");
  const [activeTab, setActiveTab] = useState<TeacherToolsTab>(() => normalizeTeacherToolsTab(typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab")));
  const [readingCoachAssignments, setReadingCoachAssignments] = useState<any[]>([]);
  const [readingCoachForm, setReadingCoachForm] = useState({
    title: "Reading Coach Fluency Practice",
    gradeLevel: "6",
    expectedText: "Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.",
  });
  const [assigningReadingCoach, setAssigningReadingCoach] = useState(false);
  const [readingCoachMessage, setReadingCoachMessage] = useState("");

  async function loadToolsData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/classes", { cache: "no-store" });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to load teacher tools.");
      const classes = Array.isArray(json.classes) ? json.classes : [];
      setData({ classes });
      setSelectedClassRoomId((current) => current || classes[0]?.id || "");
      await loadReadingCoachAssignments();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadToolsData();
  }, []);

  async function loadReadingCoachAssignments() {
    const res = await fetch("/api/teacher/reading-coach", { cache: "no-store" });
    const json = await readJson(res);
    if (res.ok) setReadingCoachAssignments(json.assignments || []);
  }

  async function assignReadingCoach() {
    setAssigningReadingCoach(true);
    setReadingCoachMessage("");
    try {
      const res = await fetch("/api/teacher/reading-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedClassRoomId || undefined,
          title: readingCoachForm.title,
          gradeLevel: readingCoachForm.gradeLevel,
          expectedText: readingCoachForm.expectedText,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to assign Reading Coach practice.");
      setReadingCoachMessage("Reading Coach practice assigned to the class.");
      await loadReadingCoachAssignments();
    } catch (err: any) {
      setReadingCoachMessage(err.message || "Failed to assign Reading Coach practice.");
    } finally {
      setAssigningReadingCoach(false);
    }
  }

  function setDashboardTab(tab: TeacherToolsTab) {
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">Loading teacher tools...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-950">Teacher Tools</h1>
        <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
        <button type="button" onClick={loadToolsData} className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Teacher Tools</h1>
          <p className="mt-1 text-sm text-slate-600">Utilities that are still available while State Track moves into the shared workspace.</p>
        </div>
        <LogoutButton />
      </div>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" aria-label="Teacher tools">
        {teacherToolsTabs.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setDashboardTab(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </nav>

      {activeTab === "resources" ? <ResourcesMigrationPlaceholder /> : null}
      {activeTab === "readingCoach" ? (
        <ReadingCoachToolsPanel
          classes={data.classes}
          selectedClassRoomId={selectedClassRoomId}
          setSelectedClassRoomId={setSelectedClassRoomId}
          readingCoachAssignments={readingCoachAssignments}
          readingCoachForm={readingCoachForm}
          setReadingCoachForm={setReadingCoachForm}
          assigningReadingCoach={assigningReadingCoach}
          readingCoachMessage={readingCoachMessage}
          assignReadingCoach={assignReadingCoach}
        />
      ) : null}
    </div>
  );
}

function normalizeTeacherToolsTab(raw: string | null | undefined): TeacherToolsTab {
  return raw === "resources" || raw === "readingCoach" ? raw : "readingCoach";
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function ResourcesMigrationPlaceholder() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Resource Library</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">Resources is moving to the new workspace</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        The legacy resource list is temporarily unavailable while it is reconnected to the current lesson-library data model.
      </p>
    </section>
  );
}

function ReadingCoachToolsPanel({
  classes,
  selectedClassRoomId,
  setSelectedClassRoomId,
  readingCoachAssignments,
  readingCoachForm,
  setReadingCoachForm,
  assigningReadingCoach,
  readingCoachMessage,
  assignReadingCoach,
}: {
  classes: TeacherClass[];
  selectedClassRoomId: string;
  setSelectedClassRoomId: (value: string) => void;
  readingCoachAssignments: any[];
  readingCoachForm: { title: string; gradeLevel: string; expectedText: string };
  setReadingCoachForm: (value: { title: string; gradeLevel: string; expectedText: string }) => void;
  assigningReadingCoach: boolean;
  readingCoachMessage: string;
  assignReadingCoach: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Reading Coach</p>
        <h2 className="text-xl font-bold text-slate-900">Assign Read-Aloud Practice</h2>
        <p className="text-sm text-slate-600">Students only see Reading Coach when you assign it to their class.</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Assign to Class</span>
          <select className="mt-1 w-full rounded-md border border-slate-300 p-2" value={selectedClassRoomId} onChange={(event) => setSelectedClassRoomId(event.target.value)}>
            {classes.map((classRoom) => (
              <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Grade Level</span>
          <select className="mt-1 w-full rounded-md border border-slate-300 p-2" value={readingCoachForm.gradeLevel} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, gradeLevel: event.target.value })}>
            {[3, 4, 5, 6, 7, 8].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Assignment Title</span>
          <input className="mt-1 w-full rounded-md border border-slate-300 p-2" value={readingCoachForm.title} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, title: event.target.value })} />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Read-Aloud Passage</span>
          <textarea className="mt-1 min-h-36 w-full rounded-md border border-slate-300 p-3" value={readingCoachForm.expectedText} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, expectedText: event.target.value })} />
        </label>
      </div>

      <button onClick={assignReadingCoach} disabled={assigningReadingCoach || !selectedClassRoomId} className="mt-4 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {assigningReadingCoach ? "Assigning..." : "Assign Reading Coach"}
      </button>
      {readingCoachMessage ? <p className={`mt-3 text-sm font-semibold ${readingCoachMessage.includes("Failed") ? "text-red-600" : "text-green-700"}`}>{readingCoachMessage}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Class</th>
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {readingCoachAssignments.map((assignment) => (
              <tr key={assignment.id} className="border-t border-slate-100">
                <td className="py-3 pr-4 font-semibold text-slate-900">{assignment.title}</td>
                <td className="py-3 pr-4">{assignment.className}</td>
                <td className="py-3 pr-4">Grade {assignment.gradeLevel}</td>
                <td className="py-3 pr-4">{assignment.attemptCount}</td>
              </tr>
            ))}
            {!readingCoachAssignments.length ? (
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-4 text-slate-500" colSpan={4}>No Reading Coach assignments yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
