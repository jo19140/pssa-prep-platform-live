"use client";

import { useEffect, useState } from "react";

export default function StudentPage() {
  const [assignments, setAssignments] = useState([
    {
      id: 1,
      title: "PSSA ELA Practice Test 1",
      status: "completed",
    },
    {
      id: 2,
      title: "PSSA ELA Practice Test 2",
      status: "pending",
    },
  ]);

  const total = assignments.length;
  const completed = assignments.filter(a => a.status === "completed").length;
  const remaining = total - completed;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-6">
        Welcome back 👋
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Total</p>
          <h2 className="text-2xl font-bold">{total}</h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Completed</p>
          <h2 className="text-2xl font-bold text-green-600">
            {completed}
          </h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Remaining</p>
          <h2 className="text-2xl font-bold text-red-500">
            {remaining}
          </h2>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {assignments.map((a) => (
          <div
            key={a.id}
            className="bg-white p-4 rounded-xl shadow flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{a.title}</h3>

              <span
                className={`text-xs px-2 py-1 rounded ${
                  a.status === "completed"
                    ? "bg-green-100 text-green-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {a.status === "completed" ? "Completed" : "Pending"}
              </span>
            </div>

            <button className="bg-black text-white px-4 py-2 rounded-lg">
              {a.status === "completed" ? "Review" : "Start"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}