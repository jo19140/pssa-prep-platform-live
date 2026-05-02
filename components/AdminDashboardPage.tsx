"use client";

import { useEffect, useMemo, useState } from "react";

const elaStandards: Record<string, string[]> = {
  "3rd": [
    "CC.1.2.3.A - Main Idea",
    "CC.1.2.3.B / CC.1.3.3.B - Inference",
    "CC.1.2.3.C - Text Structure",
    "CC.1.2.3.D - Vocabulary",
    "CC.1.3.3.C / CC.1.2.3.E - Point of View",
    "CC.1.3.3.C - Flashback",
    "CC.1.3.3.F / CC.1.2.3.F - Figurative Language",
  ],
  "4th": [
    "CC.1.2.4.A - Main Idea",
    "CC.1.2.4.B / CC.1.3.4.B - Inference",
    "CC.1.2.4.C - Text Structure",
    "CC.1.2.4.D - Vocabulary",
    "CC.1.3.4.C - Point of View",
    "CC.1.3.4.E - Flashback",
    "CC.1.3.4.F / CC.1.2.4.F - Figurative Language",
  ],
  "5th": [
    "CC.1.2.5.A - Main Idea",
    "CC.1.2.5.B / CC.1.3.5.B - Inference",
    "CC.1.2.5.C - Text Structure",
    "CC.1.2.5.D - Vocabulary",
    "CC.1.3.5.C - Point of View",
    "CC.1.3.5.E - Flashback",
    "CC.1.3.5.F / CC.1.2.5.F - Figurative Language",
  ],
  "6th": [
    "CC.1.2.6.A - Main Idea",
    "CC.1.2.6.B / CC.1.3.6.B - Inference",
    "CC.1.2.6.C - Text Structure",
    "CC.1.2.6.D - Vocabulary",
    "CC.1.3.6.G - Point of View",
    "CC.1.3.6.E - Flashback",
    "CC.1.3.6.F / CC.1.2.6.F - Figurative Language",
  ],
  "7th": [
    "CC.1.2.7.A - Main Idea",
    "CC.1.2.7.B / CC.1.3.7.B - Inference",
    "CC.1.2.7.C - Text Structure",
    "CC.1.2.7.D - Vocabulary",
    "CC.1.3.7.G - Point of View",
    "CC.1.3.7.E - Flashback",
    "CC.1.3.7.F / CC.1.2.7.F - Figurative Language",
  ],
  "8th": [
    "CC.1.2.8.A - Main Idea",
    "CC.1.2.8.B / CC.1.3.8.B - Inference",
    "CC.1.2.8.C - Text Structure",
    "CC.1.2.8.D - Vocabulary",
    "CC.1.3.8.G - Point of View",
    "CC.1.3.8.E - Flashback",
    "CC.1.3.8.F / CC.1.2.8.F - Figurative Language",
  ],
};

function skillFromStandard(value: string) {
  return value.split(" - ")[1] || "ELA Skill";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{children}</label>;
}

function StatCard({
  label,
  value,
  accent,
  detail,
}: {
  label: string;
  value: string;
  accent: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-1.5 w-12 rounded-full ${accent}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p>
    </div>
  );
}

function CheckboxPill({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
        checked
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-blue-600"
      />
    </label>
  );
}

export default function AdminDashboardPage() {
  const [gradeLevel, setGradeLevel] = useState("6th");
  const [standard, setStandard] = useState("CC.1.2.6.A - Main Idea");
  const [skill, setSkill] = useState("Main Idea");
  const [textType, setTextType] = useState("Informational");
  const [topic, setTopic] = useState("");
  const [passage, setPassage] = useState("");
  const [aiResult, setAIResult] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [mcCount, setMcCount] = useState("5");
  const [includeEBSR, setIncludeEBSR] = useState(true);
  const [includeTE, setIncludeTE] = useState(true);
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeTDA, setIncludeTDA] = useState(true);
  const [passageLength, setPassageLength] = useState("600");
  const [difficulty, setDifficulty] = useState("On Grade Level");
  const [genre, setGenre] = useState("Nonfiction");

  const gradeOptions = Object.keys(elaStandards);
  const standardsForGrade = elaStandards[gradeLevel] || [];
  const selectedSkill = useMemo(() => skillFromStandard(standard), [standard]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (mounted) setDashboardData(json);
      })
      .catch(() => {
        if (mounted) setDashboardData(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function generateAITest() {
    setLoadingAI(true);
    setAIResult("");

    try {
      const res = await fetch("/api/ai/generate-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gradeLevel,
          standard,
          skill: selectedSkill || skill,
          textType,
          topic,
          passage,
          mcCount,
          includeEBSR,
          includeTE,
          includeVocab,
          includeTDA,
          passageLength,
          difficulty,
          genre,
        }),
      });
      const data = await res.json();
      setAIResult(data.result || data.error);
    } catch (err) {
      setAIResult("Error generating test.");
    }

    setLoadingAI(false);
  }

  function updateGrade(newGrade: string) {
    const firstStandard = elaStandards[newGrade]?.[0] || "";
    setGradeLevel(newGrade);
    setStandard(firstStandard);
    setSkill(skillFromStandard(firstStandard));
  }

  function updateStandard(nextStandard: string) {
    setStandard(nextStandard);
    setSkill(skillFromStandard(nextStandard));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr] lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">Administrator Workspace</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">PSSA Platform Control Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Manage assessments, monitor platform activity, and generate aligned PSSA-style reading practice from one focused dashboard.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-5">
            <p className="text-sm font-semibold text-blue-100">Generator Status</p>
            <p className="mt-3 text-2xl font-bold">Ready</p>
            <p className="mt-2 text-sm text-slate-300">Grades 3-8 standards are loaded for diagnostic and practice generation.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Schools" value={String(dashboardData?.overview?.schools ?? 1)} detail="Roster organizations" accent="bg-blue-500" />
        <StatCard label="Teachers" value={String(dashboardData?.overview?.teachers ?? 1)} detail="Active staff accounts" accent="bg-emerald-500" />
        <StatCard label="Students" value={String(dashboardData?.overview?.students ?? 3)} detail="Rostered learners" accent="bg-amber-500" />
        <StatCard label="Classes" value={String(dashboardData?.overview?.classes ?? 1)} detail="Grade-level groups" accent="bg-rose-500" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">School Roster</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Bethune-Ready K-8 Organization</h2>
            <p className="mt-2 text-sm text-slate-600">Schools contain teachers, classes, enrollments, assignments, and grade-specific reporting.</p>
          </div>
          <p className="text-sm font-semibold text-slate-500">{dashboardData?.overview?.assignments ?? 0} assigned assessment records</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(dashboardData?.schools?.length ? dashboardData.schools : [{ name: "Bethune Elementary", districtName: "Bethune Elementary Pilot", gradeSpan: "K-8", classCount: 6, studentCount: 8, assignmentCount: 1 }]).map((school: any) => (
            <div key={school.id || school.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-bold text-slate-950">{school.name}</p>
              <p className="mt-1 text-sm text-slate-500">{school.districtName || "No district set"} · {school.gradeSpan || "Grade span not set"}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-lg font-bold text-slate-950">{school.classCount}</p>
                  <p className="text-xs text-slate-500">Classes</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-lg font-bold text-slate-950">{school.studentCount}</p>
                  <p className="text-xs text-slate-500">Students</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-3">
                  <p className="text-lg font-bold text-slate-950">{school.assignmentCount}</p>
                  <p className="text-xs text-slate-500">Assigned</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Admin Actions</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Assessment Builder</p>
                <p className="mt-1 text-sm text-slate-600">Create custom PSSA-style practice from a standard, topic, or pasted passage.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Baseline Diagnostics</p>
                <p className="mt-1 text-sm text-slate-600">Use grade-level standards to support diagnostic and learning path setup.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">AI Tutoring Content</p>
                <p className="mt-1 text-sm text-slate-600">Standards, skills, and generated test data feed the student learning pathway.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Selected Skill</h2>
            <p className="mt-3 text-2xl font-bold text-blue-900">{selectedSkill}</p>
            <p className="mt-2 text-sm text-blue-900/75">{standard}</p>
          </div>
        </aside>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">AI PSSA Test Generator</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Build Practice Assessment</h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose a grade, standard, passage setup, and item mix. The skill is pulled from the selected standard automatically.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Grade Level</FieldLabel>
                <select
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={gradeLevel}
                  onChange={(e) => updateGrade(e.target.value)}
                >
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel>Difficulty</FieldLabel>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option>Below Grade Level</option>
                  <option>On Grade Level</option>
                  <option>Above Grade Level</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Standard</FieldLabel>
              <select
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={standard}
                onChange={(e) => updateStandard(e.target.value)}
              >
                {standardsForGrade.map((std) => (
                  <option key={std} value={std}>
                    {std}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Text Type</FieldLabel>
                <select
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={textType}
                  onChange={(e) => setTextType(e.target.value)}
                >
                  <option value="Informational">Informational</option>
                  <option value="Literature">Literature</option>
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel>Genre</FieldLabel>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option>Nonfiction</option>
                  <option>Fiction</option>
                  <option>Poem</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-2">
                <FieldLabel>Topic</FieldLabel>
                <input
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Example: Industrial Revolution"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>Passage Length</FieldLabel>
                <input
                  type="number"
                  value={passageLength}
                  onChange={(e) => setPassageLength(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>Optional Passage</FieldLabel>
              <textarea
                className="min-h-32 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Paste a passage here. If blank, AI will generate one."
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <div className="space-y-2">
                  <FieldLabel>Multiple Choice Count</FieldLabel>
                  <input
                    type="number"
                    value={mcCount}
                    onChange={(e) => setMcCount(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxPill checked={includeEBSR} label="EBSR" onChange={setIncludeEBSR} />
                  <CheckboxPill checked={includeTE} label="Technology Enhanced" onChange={setIncludeTE} />
                  <CheckboxPill checked={includeVocab} label="Vocabulary" onChange={setIncludeVocab} />
                  <CheckboxPill checked={includeTDA} label="TDA Essay" onChange={setIncludeTDA} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Generation keeps the selected standard tag and answer keys in the output.</p>
              <button
                onClick={generateAITest}
                disabled={loadingAI}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAI ? "Generating..." : "Generate Passage + Questions"}
              </button>
            </div>

            {aiResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-inner">
                <pre className="whitespace-pre-wrap font-sans">{aiResult}</pre>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
