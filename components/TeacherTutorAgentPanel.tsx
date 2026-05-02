"use client";

import { useEffect, useState } from "react";

export function TeacherTutorAgentPanel() {
  const [message, setMessage] = useState("");
  const [gradeLevel, setGradeLevel] = useState("6");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const latest = messages[messages.length - 1];

  useEffect(() => {
    async function loadMessages() {
      const res = await fetch("/api/teacher/tutor-agent");
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages || []);
      }
    }
    loadMessages();
  }, []);

  async function askAgent(nextMessage = message) {
    const clean = nextMessage.trim();
    if (!clean) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/teacher/tutor-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean, prompt, gradeLevel }),
    });
    const json = await res.json();
    if (res.ok) setMessages((prev) => [...prev, json.message]);
    setLoading(false);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Teacher AI Agent</p>
          <h2 className="text-xl font-bold text-slate-900">TDA scoring and standards support</h2>
          <p className="mt-1 text-sm text-slate-600">Paste a TDA essay for a PSSA-style rubric review, or ask for standards-aligned lessons and practice ideas.</p>
        </div>
        <button
          onClick={() => askAgent("Help me calibrate TDA scoring using the PSSA 4-point rubric.")}
          disabled={loading}
          className="w-fit rounded-xl bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-60"
        >
          Rubric Calibration
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[120px_1fr]">
        <input className="rounded-xl border border-slate-300 p-3 text-sm" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="Grade" />
        <input className="rounded-xl border border-slate-300 p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Optional TDA prompt" />
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="mt-3 h-32 w-full rounded-xl border border-slate-300 p-3 text-sm"
        placeholder="Paste a student TDA essay, or ask the agent for a lesson/test aligned to a standard..."
      />
      <button onClick={() => askAgent()} disabled={loading || !message.trim()} className="mt-3 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {loading ? "Reviewing..." : "Ask Teacher Agent"}
      </button>

      {latest ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm leading-6 text-slate-700">{latest.response}</p>
          <TeacherArtifacts artifacts={latest.artifacts || {}} />
        </div>
      ) : null}
    </section>
  );
}

function TeacherArtifacts({ artifacts }: { artifacts: any }) {
  const tda = artifacts?.tdaFeedback;
  const questions = artifacts?.practiceQuestions || artifacts?.miniTest || [];
  if (!tda && !questions.length) return null;
  return (
    <div className="mt-4 space-y-4">
      {tda ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Score {tda.score}/4</span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{tda.performanceBand}</span>
            {tda.gradingProvider ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{tda.gradingProvider}</span> : null}
          </div>
          <p className="mt-3 text-sm text-slate-700">{tda.feedback}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <List title="Strengths" items={tda.strengths || []} />
            <List title="Areas for Growth" items={tda.areasForGrowth || []} />
          </div>
        </article>
      ) : null}
      {questions.length ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">Generated Practice</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{questions.slice(0, 5).map((question: any) => <li key={question.question}>{question.question}</li>)}</ul>
        </article>
      ) : null}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
