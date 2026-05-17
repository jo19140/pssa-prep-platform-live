"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

type SortKey = "className" | "studentName" | "total" | "notStarted" | "inProgress" | "completed" | "mastered";

export function StudentRosterPanel({ lessons, role, focusedStudentName }: { lessons: any[]; role?: string; focusedStudentName?: string | null }) {
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showDemoAccounts, setShowDemoAccounts] = useState(role === "ADMIN");
  const [sortKey, setSortKey] = useState<SortKey>("className");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    setShowDemoAccounts(role === "ADMIN");
  }, [role]);

  const roster = useMemo(() => {
    const byStudent = new Map<string, any>();
    for (const lesson of lessons || []) {
      const key = String(lesson.studentEmail || lesson.studentName || "Unknown Student").toLowerCase();
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          key,
          studentName: lesson.studentName || "Unknown Student",
          studentEmail: lesson.studentEmail || "",
          className: lesson.className || `Grade ${lesson.gradeLevel || "N/A"}`,
          gradeLevel: lesson.gradeLevel,
          lessons: [],
          counts: { notStarted: 0, inProgress: 0, completed: 0, mastered: 0 },
        });
      }
      const row = byStudent.get(key);
      row.lessons.push(lesson);
      const status = normalizeStatus(lesson.status);
      row.counts[status] += 1;
    }
    return Array.from(byStudent.values());
  }, [lessons]);

  const classOptions = useMemo(() => Array.from(new Set(roster.map((row) => row.className))).sort(), [roster]);

  const filteredRoster = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return roster
      .filter((row) => showDemoAccounts || !isDemoStudent(row))
      .filter((row) => classFilter === "all" || row.className === classFilter)
      .filter((row) => !needle || row.studentName.toLowerCase().includes(needle))
      .sort((a, b) => compareRosterRows(a, b, sortKey, sortDirection));
  }, [classFilter, roster, search, showDemoAccounts, sortDirection, sortKey]);

  useEffect(() => {
    if (!focusedStudentName) return;
    const match = roster.find((row) => row.studentName === focusedStudentName);
    if (!match) return;
    setExpandedStudent(match.key);
    window.setTimeout(() => rowRefs.current[match.key]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [focusedStudentName, roster]);

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student Roster</p>
          <h2 className="text-xl font-bold text-slate-900">Assigned Lesson Progress</h2>
          <p className="mt-1 text-sm text-slate-600">One row per student, with drill-down into the lessons they are working through.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_220px_auto]">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="all">All classes</option>
            {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Search student" />
          <label className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={showDemoAccounts} onChange={(event) => setShowDemoAccounts(event.target.checked)} />
            Show demo accounts
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <SortableHeader label="Student" sortKey="studentName" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="Class / Grade" sortKey="className" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="Total" sortKey="total" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="Not Started" sortKey="notStarted" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="In Progress" sortKey="inProgress" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="Completed" sortKey="completed" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
              <SortableHeader label="Mastered" sortKey="mastered" activeKey={sortKey} direction={sortDirection} onSort={updateSort} />
            </tr>
          </thead>
          <tbody>
            {filteredRoster.map((student) => (
              <Fragment key={student.key}>
                <tr
                  ref={(node) => { rowRefs.current[student.key] = node; }}
                  onClick={() => setExpandedStudent((current) => current === student.key ? null : student.key)}
                  className={`cursor-pointer border-t border-slate-100 ${expandedStudent === student.key ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <td className="py-3 pr-4 font-bold text-slate-900">{student.studentName}</td>
                  <td className="py-3 pr-4 text-slate-700">{student.className}</td>
                  <td className="py-3 pr-4 font-semibold">{student.lessons.length}</td>
                  <td className="py-3 pr-4">{student.counts.notStarted}</td>
                  <td className="py-3 pr-4">{student.counts.inProgress}</td>
                  <td className="py-3 pr-4">{student.counts.completed}</td>
                  <td className="py-3 pr-4">{student.counts.mastered}</td>
                </tr>
                {expandedStudent === student.key ? (
                  <tr key={`${student.key}-details`} className="border-t border-blue-100 bg-blue-50/60">
                    <td colSpan={7} className="p-4">
                      <div className="grid gap-3">
                        {student.lessons.map((lesson: any) => <StudentLessonCard key={lesson.id} lesson={lesson} />)}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!filteredRoster.length ? (
              <tr className="border-t border-slate-100">
                <td className="py-5 text-slate-500" colSpan={7}>No students match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: SortKey; activeKey: SortKey; direction: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  const active = sortKey === activeKey;
  return (
    <th className="py-2 pr-4">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 font-bold hover:text-slate-900">
        {label}
        <span className="text-slate-400">{active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}</span>
      </button>
    </th>
  );
}

function StudentLessonCard({ lesson }: { lesson: any }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-bold text-slate-900">{lesson.title || `${lesson.standardCode} - ${lesson.skill}`}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{lesson.standardCode} - {lesson.skill}</p>
          <p className="mt-2 text-sm text-slate-600">{lesson.whyAssigned || "Assigned as part of this student's personalized learning path."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StepPill label="Guided" complete={lesson.guidedComplete} active={lesson.currentStep === "Guided practice"} />
            <StepPill label="Practice" complete={lesson.independentComplete} active={lesson.currentStep === "Independent practice"} />
            <StepPill label="Exit" complete={lesson.exitTicketComplete} active={lesson.currentStep === "Exit ticket"} />
            <StepPill label={lesson.masteryScore == null ? "Mastery" : `Mastery ${lesson.masteryScore}%`} complete={lesson.arcadeUnlocked} active={lesson.currentStep === "Mastery check"} />
            <StepPill label="Arcade" complete={lesson.questAttempts > 0} active={String(lesson.currentStep || "").includes("Arcade")} />
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <StatusBadge status={lesson.status} />
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{lesson.currentStep}</span>
        </div>
      </div>
    </article>
  );
}

function StepPill({ label, complete, active }: { label: string; complete: boolean; active?: boolean }) {
  const className = active
    ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300"
    : complete
      ? "bg-emerald-100 text-emerald-700"
      : "bg-white text-slate-600 ring-1 ring-slate-200";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const className = normalized === "mastered"
    ? "bg-emerald-100 text-emerald-800"
    : normalized === "completed"
      ? "bg-green-100 text-green-800"
      : normalized === "inProgress"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{formatStatus(status)}</span>;
}

function normalizeStatus(status: string): "notStarted" | "inProgress" | "completed" | "mastered" {
  if (status === "MASTERED") return "mastered";
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "inProgress";
  return "notStarted";
}

function compareRosterRows(a: any, b: any, sortKey: SortKey, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const value = (row: any) => {
    if (sortKey === "total") return row.lessons.length;
    if (sortKey in row.counts) return row.counts[sortKey];
    return String(row[sortKey] || "");
  };
  const aValue = value(a);
  const bValue = value(b);
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * multiplier;
  const primary = String(aValue).localeCompare(String(bValue)) * multiplier;
  return primary || a.studentName.localeCompare(b.studentName);
}

function isDemoStudent(row: any) {
  const email = String(row.studentEmail || "").toLowerCase();
  const name = String(row.studentName || "").toLowerCase();
  return /^student\d*@example\.com$/.test(email) || name === "demo student" || name.startsWith("demo ");
}

function formatStatus(status: string) {
  return String(status || "NOT_STARTED").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
