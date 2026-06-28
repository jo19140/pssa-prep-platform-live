"use client";

import { useEffect, useState } from "react";

type TeacherClass = {
  id: string;
  name: string;
  grade?: number;
};

export function TeacherImportStudentsPanel() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("Password123!");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClasses();
    loadStatus();
  }, []);

  async function loadClasses() {
    setClassesLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", { cache: "no-store" });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to load classes.");
      const nextClasses = Array.isArray(json.classes) ? json.classes : [];
      setClasses(nextClasses);
      setClassRoomId((current) => current || nextClasses[0]?.id || "");
    } catch (err: any) {
      setMessage(err.message || "Failed to load classes.");
    } finally {
      setClassesLoading(false);
    }
  }

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/teacher/google-classroom/status");
      const json = await readJson(res);
      setStatus(json);
      if (json.connected) await loadCourses();
    } catch {
      setMessage("Could not check Google Classroom connection.");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadCourses() {
    setLoadingCourses(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/google-classroom/courses");
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to load Google Classroom courses.");
      const nextCourses = Array.isArray(json.courses) ? json.courses : [];
      setCourses(nextCourses);
      setSelectedCourseId(nextCourses[0]?.id || "");
    } catch (err: any) {
      setMessage(err.message || "Failed to load Google Classroom courses.");
    } finally {
      setLoadingCourses(false);
    }
  }

  async function importRoster() {
    if (!selectedCourseId || !classRoomId) {
      setMessage("Choose a Google course and destination class.");
      return;
    }
    setImporting(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/google-classroom/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleCourseId: selectedCourseId, classRoomId, temporaryPassword }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Import failed.");
      setMessage(`Imported ${json.enrolled} students. Created ${json.created}, updated ${json.updated}, skipped ${json.skipped}.`);
      await loadClasses();
    } catch (err: any) {
      setMessage(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const configured = status?.configured;
  const connected = status?.connected;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student Import</p>
        <h2 className="text-xl font-bold text-slate-900">Import Students From Google Classroom</h2>
        <p className="text-sm text-slate-600">
          Connect a teacher Google Classroom account, choose a Google course, then enroll that roster into one of your classes.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-bold text-slate-950">Connection</h3>
          {loadingStatus ? (
            <p className="mt-2 text-sm text-slate-500">Checking Google Classroom setup...</p>
          ) : configured ? (
            <div className="mt-3 space-y-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {connected ? "Connected" : "Not connected"}
              </span>
              <div>
                <a
                  href="/api/teacher/google-classroom/connect"
                  className="inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
                >
                  {connected ? "Reconnect Google Classroom" : "Connect Google Classroom"}
                </a>
              </div>
              {connected ? (
                <button
                  type="button"
                  onClick={loadCourses}
                  disabled={loadingCourses}
                  className="rounded-md bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60"
                >
                  {loadingCourses ? "Loading courses..." : "Refresh Courses"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">Google Classroom is not configured yet.</p>
              <p className="mt-2">Add these environment variables, then restart the app:</p>
              <ul className="mt-2 list-disc pl-5">
                {(status?.missing || ["GOOGLE_CLASSROOM_CLIENT_ID", "GOOGLE_CLASSROOM_CLIENT_SECRET"]).map((item: string) => <li key={item}>{item}</li>)}
                <li>Optional: GOOGLE_CLASSROOM_REDIRECT_URI</li>
              </ul>
              <p className="mt-2">The redirect URI should point to <span className="font-mono">/api/teacher/google-classroom/callback</span>.</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="font-bold text-slate-950">Roster Import</h3>
            <button
              type="button"
              onClick={loadClasses}
              disabled={classesLoading}
              className="rounded-md bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              {classesLoading ? "Refreshing..." : "Refresh classes"}
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Google Classroom Course</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={!connected || !courses.length}
              >
                {!courses.length ? <option value="">No courses loaded</option> : null}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}{course.section ? ` - ${course.section}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Import Into Class</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 p-2"
                value={classRoomId}
                onChange={(event) => setClassRoomId(event.target.value)}
                disabled={classesLoading || !classes.length}
              >
                {!classes.length ? <option value="">No classes available</option> : null}
                {classes.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>{classRoom.name} - Grade {classRoom.grade}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Temporary Student Password</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Imported students can use this password until a real password setup flow is added.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={importRoster}
            disabled={!connected || !selectedCourseId || !classRoomId || importing}
            className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Selected Roster"}
          </button>

          {message ? (
            <p className={`mt-3 text-sm font-semibold ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") ? "text-red-600" : "text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
        </div>
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
