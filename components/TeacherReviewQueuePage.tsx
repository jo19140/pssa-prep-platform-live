"use client";

import { useEffect, useMemo, useState } from "react";

export default function TeacherReviewQueuePage({ role }: { role: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ gradeLevel: "", standardCode: "", skill: "", search: "" });
  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params.toString();
  }, [filters]);

  useEffect(() => { load(); }, [query]);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/teacher/review/queue?${query}`);
    const json = await response.json();
    if (response.ok) {
      setReviews(json.reviews || []);
      setPending(json.pending || 0);
    }
    setLoading(false);
  }

  async function bulkApprove() {
    const ids = reviews.map((review) => review.id);
    if (!ids.length) return;
    await fetch("/api/admin/review/bulk-approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewIds: ids }) });
    await load();
  }

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow md:flex-row md:items-end md:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-4">
          <Input label="Grade" value={filters.gradeLevel} onChange={(value) => setFilters((prev) => ({ ...prev, gradeLevel: value }))} />
          <Input label="Standard" value={filters.standardCode} onChange={(value) => setFilters((prev) => ({ ...prev, standardCode: value }))} />
          <Input label="Skill" value={filters.skill} onChange={(value) => setFilters((prev) => ({ ...prev, skill: value }))} />
          <Input label="Search" value={filters.search} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} />
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">Pending: {pending}</span>
          {role === "ADMIN" ? <button onClick={bulkApprove} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Bulk approve filtered</button> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Standard</th>
              <th className="px-4 py-3">Cache Hits</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="px-4 py-6" colSpan={5}>Loading reviews...</td></tr> : null}
            {!loading && !reviews.length ? <tr><td className="px-4 py-6" colSpan={5}>No pending lesson reviews.</td></tr> : null}
            {reviews.map((review) => (
              <tr key={review.id} onClick={() => { window.location.href = `/teacher/review/${review.id}`; }} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{review.skill}</td>
                <td className="px-4 py-3">{review.standardCode}</td>
                <td className="px-4 py-3">{review.hitCount}</td>
                <td className="px-4 py-3">{ageDays(review.createdAt)} days</td>
                <td className="px-4 py-3">{review.reviewerNotes || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" /></label>;
}

function ageDays(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}
