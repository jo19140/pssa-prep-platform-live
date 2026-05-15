"use client";

import { useState } from "react";

const defaultPrompt = "A theme in \"The Portal\" is that self-discovery can be a difficult process. Write an essay analyzing how the narrator demonstrates this theme in the passage. Use evidence from the passage to support your response.";
const defaultPassage = "In \"The Portal,\" Bea runs to a stone wall in the woods after embarrassing herself in class. She asks, \"Why, why, WHY do I always have to be so . . . me.\" Bea calms herself by writing a haiku in invisible ink, but the thought of invisible words makes \"a little sting\" in her heart because no one is there to make her words visible. At the end, Bea tucks the haiku and matches into the Portal because \"even invisible things deserve to have a little hope.\"";

export default function AdminGradeEssayTestPage() {
  const [essay, setEssay] = useState("");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [passage, setPassage] = useState(defaultPassage);
  const [gradeLevel, setGradeLevel] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function gradeEssay() {
    setLoading(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/admin/grade-essay-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay, prompt, passage, gradeLevel }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Unable to grade essay.");
    else setResult(json);
    setLoading(false);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Admin Sandbox</p>
            <h2 className="text-2xl font-bold text-slate-950">Essay Grading Test</h2>
            <p className="mt-1 text-sm text-slate-600">Run one response through the same validity gate, AI grader, and normalizer used by production scoring.</p>
          </div>
          <label className="text-sm font-semibold text-slate-700">
            Grade
            <input
              type="number"
              min={3}
              max={8}
              value={gradeLevel}
              onChange={(event) => setGradeLevel(Number(event.target.value))}
              className="mt-1 block w-24 rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4">
          <TextArea label="Essay" value={essay} onChange={setEssay} rows={8} />
          <TextArea label="Prompt" value={prompt} onChange={setPrompt} rows={4} />
          <TextArea label="Passage" value={passage} onChange={setPassage} rows={7} />
        </div>

        <button
          onClick={gradeEssay}
          disabled={loading || !essay.trim() || !prompt.trim()}
          className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "Grading..." : "Grade"}
        </button>
        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p> : null}
      </div>

      {result ? (
        <pre className="mt-6 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100 shadow">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}

function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm leading-6"
      />
    </label>
  );
}
