"use client";

import { useState } from "react";

const defaultPrompt = "Write an essay analyzing how the character changes over the course of the passage. Use evidence from the passage to support your response.";
const defaultPassage = "Mira did not want to help at the community garden because she thought the work would be boring. At first, she dragged the watering can behind her and watched the older neighbors pull weeds. Then she noticed Mrs. Alvarez saving a row of wilted tomato plants by loosening the dry soil around their roots. Mira tried the same careful motion on a pepper plant. By the end of the morning, she saw that each small task helped the garden survive the heat. When a younger child asked why the plants mattered, Mira explained that the garden gave families fresh food and gave neighbors a place to work together.";

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
