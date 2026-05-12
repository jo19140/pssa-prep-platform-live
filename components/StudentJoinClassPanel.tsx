"use client";

import { useState } from "react";

export function StudentJoinClassPanel({ onJoined }: { onJoined: () => void }) {
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");

  async function joinClass() {
    setJoining(true);
    setMessage("");
    try {
      const res = await fetch("/api/student/join-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Could not join class.");
      setJoinCode("");
      setMessage(`Joined ${json.classRoom.name}.`);
      onJoined();
    } catch (err: any) {
      setMessage(err.message || "Could not join class.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Join Class</p>
          <h3 className="text-xl font-black text-slate-950">Have a class code?</h3>
          <p className="mt-1 text-sm text-slate-600">Enter the code from your teacher to see your assignments here.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm uppercase tracking-wide"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="PSSA-ABC123"
          />
          <button
            type="button"
            onClick={joinClass}
            disabled={joining || !joinCode.trim()}
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
      </div>
      {message ? <p className={`mt-3 text-sm font-bold ${message.toLowerCase().includes("could") || message.toLowerCase().includes("not") ? "text-rose-600" : "text-emerald-700"}`}>{message}</p> : null}
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
