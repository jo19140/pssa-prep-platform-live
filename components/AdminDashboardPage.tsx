"use client";
import { useEffect, useState } from "react";
import { ClassGrowthBarChart, StandardsGrowthBarChart } from "@/components/GrowthCharts";

export function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedTeacherView, setSelectedTeacherView] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (selectedGrade) params.set("grade", selectedGrade);
    if (selectedTeacher) params.set("teacherId", selectedTeacher);
    const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }
  useEffect(() => { load(); }, [selectedGrade, selectedTeacher]);
  if (loading) return <div className="rounded-3xl bg-white p-6 shadow">Loading admin dashboard...</div>;
  if (!data) return <div className="rounded-3xl bg-white p-6 shadow">No data available.</div>;
  if (selectedTeacherView) {
    const teacherClasses = [...(data.topClasses || []), ...(data.supportClasses || [])].filter((c: any) => c.teacherName === selectedTeacherView);
    return <div className="space-y-6"><button onClick={() => setSelectedTeacherView(null)} className="rounded-xl bg-slate-200 px-4 py-2">← Back</button><h2 className="text-2xl font-bold">{selectedTeacherView}</h2><div className="grid gap-4 md:grid-cols-2">{teacherClasses.map((c: any) => <div key={c.classId} className="rounded-2xl bg-white p-5 shadow"><div className="font-semibold">{c.className}</div><div className="text-sm text-slate-500">{c.studentCount} students</div><div className="mt-2 text-sm">Score: <strong>{c.averageScore}%</strong></div><div className="text-sm">Growth: <strong>{c.averageGrowth >= 0 ? "+" : ""}{c.averageGrowth}</strong></div></div>)}</div></div>;
  }
  return <div className="grid gap-6 lg:grid-cols-4"><div className="rounded-3xl bg-white p-6 shadow lg:col-span-4"><div className="flex gap-4 flex-wrap"><select value={selectedGrade} onChange={(e)=>setSelectedGrade(e.target.value)} className="rounded-2xl border px-4 py-3"><option value="">All Grades</option>{data.gradeOptions?.map((g: number) => <option key={g} value={g}>Grade {g}</option>)}</select><select value={selectedTeacher} onChange={(e)=>setSelectedTeacher(e.target.value)} className="rounded-2xl border px-4 py-3"><option value="">All Teachers</option>{data.teacherOptions?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><button onClick={() => { setSelectedGrade(""); setSelectedTeacher(""); }} className="rounded-2xl bg-slate-100 px-4 py-3">Clear</button></div></div><Metric title="Teachers" value={data.overview.teachers} /><Metric title="Students" value={data.overview.students} /><Metric title="Classes" value={data.overview.classes} /><Metric title="Assignments" value={data.overview.assignments} /><Metric title="Average Score" value={`${data.overview.averageScore}%`} /><Metric title="Average Growth" value={`${data.overview.averageGrowth >= 0 ? "+" : ""}${data.overview.averageGrowth}`} /><div className="lg:col-span-2"><ClassGrowthBarChart classGrowth={{ averageGrowth: data.overview.averageGrowth, improvedCount: 0, flatCount: 0, declinedCount: 0 }} /></div><div className="lg:col-span-2"><StandardsGrowthBarChart rows={(data.standardsSummary || []).map((s: any) => ({ standardCode: s.standardCode, averageGrowth: s.averageScore - 70, studentCount: s.count }))} /></div><div className="rounded-3xl bg-white p-6 shadow lg:col-span-4"><h2 className="text-2xl font-bold">Teacher Overview</h2><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-slate-500"><tr><th className="pb-3 pr-4">Teacher</th><th className="pb-3 pr-4">Classes</th><th className="pb-3 pr-4">Students</th></tr></thead><tbody>{(data.teachers || []).map((teacher: any) => <tr key={teacher.teacherName} onClick={() => setSelectedTeacherView(teacher.teacherName)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"><td className="py-3 pr-4 font-semibold">{teacher.teacherName}</td><td className="py-3 pr-4">{teacher.classCount}</td><td className="py-3 pr-4">{teacher.studentCount}</td></tr>)}</tbody></table></div></div></div>;
}
function Metric({ title, value }: { title: string; value: string | number }) { return <div className="rounded-3xl bg-white p-6 shadow"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>; }
