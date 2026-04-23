"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";

export function ClassGrowthBarChart({ classGrowth }: { classGrowth: any }) {
  const data = [{ name: "Improved", value: classGrowth.improvedCount || 0 }, { name: "Flat", value: classGrowth.flatCount || 0 }, { name: "Declined", value: classGrowth.declinedCount || 0 }];
  return <div className="rounded-3xl bg-white p-6 shadow"><h3 className="text-xl font-bold">Class Growth Distribution</h3><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" /></BarChart></ResponsiveContainer></div></div>;
}

export function StandardsGrowthBarChart({ rows }: { rows: any[] }) {
  const data = rows.map((row) => ({ code: row.standardCode, growth: row.averageGrowth ?? row.averageScore ?? 0 }));
  return <div className="rounded-3xl bg-white p-6 shadow"><h3 className="text-xl font-bold">Standards Growth</h3><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="code" /><YAxis /><Tooltip /><Bar dataKey="growth" /></BarChart></ResponsiveContainer></div></div>;
}

export function StudentTrendLineChart({ title, points }: { title: string; points: { label: string; score: number }[]; }) {
  return <div className="rounded-3xl bg-white p-6 shadow"><h3 className="text-xl font-bold">{title}</h3><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0,100]} /><Tooltip /><Legend /><Line type="monotone" dataKey="score" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div>;
}
