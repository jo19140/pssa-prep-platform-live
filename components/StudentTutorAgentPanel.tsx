"use client";

import { useEffect, useState } from "react";

const quickPrompts = [
  "Teach me my weakest skill",
  "Create a short practice test",
  "Explain text evidence",
  "Make a mini lesson for today's learning path",
];

export function StudentTutorAgentPanel() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const latest = messages[messages.length - 1];
  const artifacts = latest?.artifacts || {};

  useEffect(() => {
    async function loadAgent() {
      const res = await fetch("/api/student/tutor-agent");
      if (res.ok) {
        const json = await res.json();
        setMemory(json.memory);
        setMessages(json.messages || []);
      }
    }
    loadAgent();
  }, []);

  async function askTutor(nextMessage = message) {
    const clean = nextMessage.trim();
    if (!clean) return;
    setLoading(true);
    setMessage("");
    const optimistic = { id: `local-${Date.now()}`, message: clean, response: "Thinking...", artifacts: null };
    setMessages((prev) => [...prev, optimistic]);
    const res = await fetch("/api/student/tutor-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: clean }),
    });
    const json = await res.json();
    if (res.ok) {
      setMemory(json.memory);
      setMessages((prev) => [...prev.filter((item) => item.id !== optimistic.id), json.message]);
    } else {
      setMessages((prev) => [...prev.filter((item) => item.id !== optimistic.id), { id: `error-${Date.now()}`, message: clean, response: json.error || "The tutor could not answer right now." }]);
    }
    setLoading(false);
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">AI Tutor Agent</p>
          <h3 className="text-xl font-bold text-slate-900">Ask for help, lessons, or practice</h3>
          <p className="mt-1 text-sm text-slate-600">
            {memory?.learnerSummary || "The tutor learns from completed tests, learning paths, and student requests over time."}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          Learns over time
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => askTutor(prompt)}
            disabled={loading}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") askTutor();
          }}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm"
          placeholder="Ask the tutor to explain a skill, make a lesson, or create practice..."
        />
        <button
          onClick={() => askTutor()}
          disabled={loading || !message.trim()}
          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-800 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Ask Tutor"}
        </button>
      </div>

      {latest ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">You asked</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{latest.message}</p>
          <p className="mt-4 text-sm leading-6 text-slate-700">{latest.response}</p>
          <TutorArtifacts artifacts={artifacts} />
        </div>
      ) : null}
    </section>
  );
}

function TutorArtifacts({ artifacts }: { artifacts: any }) {
  const miniLesson = artifacts?.miniLesson;
  const practiceQuestions = artifacts?.practiceQuestions || artifacts?.miniTest || [];
  const tdaFeedback = artifacts?.tdaFeedback;
  const nextSteps = artifacts?.nextSteps || [];
  if (!miniLesson && !practiceQuestions.length && !tdaFeedback && !nextSteps.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {tdaFeedback ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-900">TDA Rubric Help</h4>
            {tdaFeedback.score ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{tdaFeedback.score}/4</span> : null}
            {tdaFeedback.performanceBand ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{tdaFeedback.performanceBand}</span> : null}
          </div>
          <p className="mt-2 text-sm text-slate-700">{tdaFeedback.feedback}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Strengths</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(tdaFeedback.strengths || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Areas for Growth</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(tdaFeedback.areasForGrowth || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </article>
      ) : null}

      {miniLesson ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">{miniLesson.title}</h4>
          <p className="mt-2 text-sm text-slate-700">{miniLesson.explanation}</p>
          <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Example:</span> {miniLesson.workedExample}</p>
        </article>
      ) : null}

      {practiceQuestions.length ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">Practice</h4>
          <div className="mt-3 space-y-3">
            {practiceQuestions.slice(0, 5).map((question: any, index: number) => (
              <details key={`${question.question}-${index}`} className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">{index + 1}. {question.question}</summary>
                {Array.isArray(question.choices) ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{question.choices.map((choice: string) => <li key={choice}>{choice}</li>)}</ul> : null}
                <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Answer:</span> {question.correctAnswer}</p>
                <p className="mt-1 text-sm text-slate-600">{question.explanation}</p>
              </details>
            ))}
          </div>
        </article>
      ) : null}

      {nextSteps.length ? (
        <article className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="font-bold text-slate-900">Next Steps</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {nextSteps.map((step: string) => <li key={step}>{step}</li>)}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
