"use client";
import { useEffect, useState } from "react";
import { ClassGrowthBarChart, StandardsGrowthBarChart, StudentTrendLineChart } from "@/components/GrowthCharts";

export function TeacherDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [title, setTitle] = useState("PSSA ELA Practice Test 1");
  const [dueDate, setDueDate] = useState("");
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState("FULL");
  const standardOptions = [{ code: "CC.1.2.6.A", label: "Central Idea" }, { code: "CC.1.2.6.B", label: "Text Evidence and Inference" }];

  async function load() {
    try {
      const params = new URLSearchParams();
      if (selectedClassId) params.set("classId", selectedClassId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/teacher/dashboard${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally { setLoading(false); }
  }

  useEffect(() => { setLoading(true); load(); }, [selectedClassId, startDate, endDate]);

  async function createAssignment() {
    const classRoomId = selectedClassId || data?.classes?.[0]?.id;
    if (!classRoomId) return;
    await fetch("/api/teacher/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classRoomId, title, dueDate, standards: selectedStandards, assignmentType }) });
    await load();
  }

  if (loading) return <div className="rounded-3xl bg-white p-6 shadow">Loading teacher dashboard...</div>;
  if (error) return <div className="rounded-3xl bg-white p-6 shadow text-rose-600">{error}</div>;
  if (!data) return <div className="rounded-3xl bg-white p-6 shadow">No data available.</div>;

  return <div className="grid gap-6 lg:grid-cols-3"><div className="rounded-3xl bg-white p-6 shadow lg:col-span-3"><div className="flex flex-col gap-4 md:flex-row md:items-end"><div className="flex-1"><label className="mb-2 block text-sm font-semibold text-slate-700">Class</label><select value={selectedClassId} onChange={(e)=>setSelectedClassId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3"><option value="">All Classes</option>{data.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name} (Grade {c.grade})</option>)}</select></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Start Date</label><input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3" /></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">End Date</label><input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3" /></div><button onClick={() => { setSelectedClassId(""); setStartDate(""); setEndDate(""); }} className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">Clear Filters</button></div></div>
    <MetricCard title="Average Score" value={`${data.overview.averageScore}%`} /><MetricCard title="Average Growth" value={`${data.classGrowth.averageGrowth >= 0 ? "+" : ""}${data.classGrowth.averageGrowth}`} /><MetricCard title="Students" value={`${data.teacher.studentCount}`} />
    <div className="lg:col-span-3"><ClassGrowthBarChart classGrowth={data.classGrowth} /></div><div className="lg:col-span-3"><StandardsGrowthBarChart rows={data.standardsGrowthSummary} /></div>
    <div className="rounded-3xl bg-white p-6 shadow lg:col-span-3"><h2 className="text-2xl font-bold">Create Assignment</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><input value={title} onChange={(e)=>setTitle(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Assessment title" /><input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3" /><select value={assignmentType} onChange={(e)=>setAssignmentType(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="FULL">Full Test</option><option value="TARGETED">Targeted Standards</option><option value="INTERVENTION">Intervention</option></select><button onClick={createAssignment} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">Create Assignment</button></div><div className="mt-4 grid gap-2 md:grid-cols-2">{standardOptions.map((s) => <label key={s.code} className="flex items-center gap-2"><input type="checkbox" checked={selectedStandards.includes(s.code)} onChange={() => setSelectedStandards((prev) => prev.includes(s.code) ? prev.filter((c) => c !== s.code) : [...prev, s.code])} />{s.code} — {s.label}</label>)}</div></div>
    <div className="rounded-3xl bg-white p-6 shadow lg:col-span-3"><h2 className="text-2xl font-bold">Recent Student Sessions</h2><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-3 pr-4">Student</th><th className="pb-3 pr-4">Assessment</th><th className="pb-3 pr-4">Score</th><th className="pb-3 pr-4">Band</th><th className="pb-3 pr-4">Growth</th></tr></thead><tbody>{data.students?.map((row: any) => <tr key={row.sessionId} className="border-t border-slate-100"><td className="py-3 pr-4">{row.studentName}</td><td className="py-3 pr-4">{row.assessmentTitle}</td><td className="py-3 pr-4">{row.scorePercent ?? "—"}</td><td className="py-3 pr-4">{row.performanceBand ?? "—"}</td><td className="py-3 pr-4">{row.growth?.growthPoints != null ? `${row.growth.growthPoints >= 0 ? "+" : ""}${row.growth.growthPoints}` : "N/A"}</td></tr>)}</tbody></table></div></div>
    <div className="rounded-3xl bg-white p-6 shadow lg:col-span-3"><h2 className="text-2xl font-bold">Standards-Based Support Groups</h2><div className="mt-5 grid gap-4 lg:grid-cols-2">{(data.standardGroups || []).map((group: any) => <div key={group.standardCode} className="rounded-2xl border border-slate-200 p-5"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standard Group</div><h3 className="mt-1 text-lg font-bold">{group.standardCode}</h3><p className="text-sm text-slate-600">{group.standardLabel}</p><div className="mt-4 space-y-2">{group.students.map((student: any) => <div key={`${group.standardCode}-${student.studentId}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{student.studentName}</span><span>{student.percentScore}%</span></div>)}</div></div>)}</div></div>
    <div className="rounded-3xl bg-white p-6 shadow lg:col-span-3"><h2 className="text-2xl font-bold">Student Score Trends</h2><div className="mt-5 grid gap-6 md:grid-cols-2">{(data.studentTrendLines || []).filter((s: any) => s.trend.length > 1).slice(0,4).map((student: any) => <StudentTrendLineChart key={student.studentId} title={student.studentName} points={student.trend} />)}</div></div>
  </div>;
}
function MetricCard({ title, value }: { title: string; value: string }) { return <div className="rounded-3xl bg-white p-6 shadow"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>; }
