"use client";

import { useEffect, useState } from "react";

type TeacherClass = {
  id: string;
  name: string;
  grade?: number;
};

type ReadingCoachAssignment = {
  id: string;
  title: string;
  className: string;
  gradeLevel: number | string;
  attemptCount: number;
};

export function TeacherReadingCoachPanel({ classes }: { classes: TeacherClass[] }) {
  const [selectedClassRoomId, setSelectedClassRoomId] = useState(classes[0]?.id || "");
  const [readingCoachAssignments, setReadingCoachAssignments] = useState<ReadingCoachAssignment[]>([]);
  const [readingCoachForm, setReadingCoachForm] = useState({
    title: "Reading Coach Fluency Practice",
    gradeLevel: "6",
    expectedText: "Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.",
  });
  const [assigningReadingCoach, setAssigningReadingCoach] = useState(false);
  const [readingCoachMessage, setReadingCoachMessage] = useState("");

  useEffect(() => {
    loadReadingCoachAssignments();
  }, []);

  useEffect(() => {
    if (!selectedClassRoomId && classes[0]?.id) {
      setSelectedClassRoomId(classes[0].id);
    }
  }, [classes, selectedClassRoomId]);

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
