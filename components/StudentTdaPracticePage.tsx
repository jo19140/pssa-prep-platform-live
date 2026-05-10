"use client";

import { useMemo, useState } from "react";

export function StudentTdaPracticePage({ onBack }: { onBack: () => void }) {
  const [passage, setPassage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");

  const wordCount = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft]);
  const hasDraft = draft.trim().length >= 40;

  async function askCoach() {
    if (!hasDraft) {
      setError("Write a draft first so the coach can respond to your own thinking.");
      return;
    }

    setLoading(true);
    setError("");
    setFeedback(null);
    const coachingRequest = [
      "TDA writing coach request.",
      "Do not rewrite the student's answer or give a finished response.",
      "Teach the student how to improve their own draft using comments, questions, rubric feedback, and next revision steps.",
      prompt.trim() ? `Prompt: ${prompt.trim()}` : "Prompt: The student did not paste a prompt.",
      passage.trim() ? `Passage or notes: ${passage.trim()}` : "Passage or notes: The student did not paste passage text.",
      `Student draft: ${draft.trim()}`,
    ].join("\n\n");

    const res = await fetch("/api/student/tutor-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: coachingRequest }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "The writing coach could not respond right now.");
      return;
    }

    setFeedback(json.result);
  }

  const tdaFeedback = feedback?.artifacts?.tdaFeedback;
  const nextSteps = feedback?.artifacts?.nextSteps || tdaFeedback?.nextSteps || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">TDA Practice</p>
          <h2 className="text-2xl font-bold text-slate-900">Writing Coach</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Type your own TDA draft. The AI coach gives comments, questions, and revision steps so you improve the writing yourself.
          </p>
        </div>
        <button onClick={onBack} className="w-fit rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
          Back to Dashboard
        </button>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <article className="rounded-3xl bg-white p-6 shadow">
            <label className="text-sm font-bold text-slate-900" htmlFor="tda-prompt">TDA prompt</label>
            <textarea
              id="tda-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 p-4 text-sm leading-6 text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Paste or type the TDA question here..."
            />
          </article>

          <article className="rounded-3xl bg-white p-6 shadow">
            <label className="text-sm font-bold text-slate-900" htmlFor="tda-passage">Passage notes or evidence</label>
            <textarea
              id="tda-passage"
              value={passage}
              onChange={(event) => setPassage(event.target.value)}
              className="mt-2 min-h-32 w-full rounded-2xl border border-slate-300 p-4 text-sm leading-6 text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Paste the passage, key paragraph, or evidence notes. This helps the coach check whether your evidence connects to the text."
            />
          </article>

          <article className="rounded-3xl bg-white p-6 shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-bold text-slate-900" htmlFor="tda-draft">Your TDA draft</label>
              <span className="text-xs font-semibold text-slate-500">{wordCount} words</span>
            </div>
            <textarea
              id="tda-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 min-h-72 w-full rounded-2xl border border-slate-300 p-4 text-sm leading-6 text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
              placeholder="Write your response here. Include a claim, text evidence, and your explanation of how the evidence proves your idea."
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">The coach will comment on your draft. It will not write the final answer for you.</p>
              <button
                onClick={askCoach}
                disabled={loading || !hasDraft}
                className="w-fit rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Reading Draft..." : "Get Coaching Feedback"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl bg-slate-950 p-5 text-white shadow">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">What the coach checks</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
              <li>Claim answers the prompt</li>
              <li>Evidence comes from the text</li>
              <li>Explanation connects evidence to claim</li>
              <li>Organization is clear</li>
              <li>Sentences and conventions support meaning</li>
            </ul>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow">
            <p className="text-sm font-bold text-slate-900">Revision reminder</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Strong TDA writing usually follows this pattern: make a claim, quote or paraphrase evidence, explain why the evidence matters, then connect back to the prompt.
            </p>
          </article>
        </aside>
      </section>

      {feedback ? (
        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">Coach Feedback</h3>
            {tdaFeedback?.score ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{tdaFeedback.score}/4</span> : null}
            {tdaFeedback?.performanceBand ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{tdaFeedback.performanceBand}</span> : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{tdaFeedback?.feedback || feedback.response}</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FeedbackList title="What is working" items={tdaFeedback?.strengths || []} />
            <FeedbackList title="Revise next" items={tdaFeedback?.areasForGrowth || []} />
          </div>

          {nextSteps.length ? (
            <article className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <h4 className="font-bold text-slate-900">Next Revision Steps</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {nextSteps.map((step: string) => <li key={step}>{step}</li>)}
              </ul>
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <h4 className="font-bold text-slate-900">{title}</h4>
      {items.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600">The coach will add notes here after reading your draft.</p>
      )}
    </article>
  );
}
