"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import TeacherTdaScoringPanel from "@/components/TeacherTdaScoringPanel";
import { TeacherLearningPathPanel } from "@/components/TeacherLearningPathPanel";

const elaStandards: Record<string, string[]> = {
  "3rd": [
    "CC.1.2.3.A - Main Idea",
    "CC.1.2.3.B - Text Evidence",
    "CC.1.2.3.C - Text Structure",
    "CC.1.2.3.D - Vocabulary",
    "CC.1.3.3.A - Theme",
    "CC.1.3.3.B - Text Evidence (Literature)",
    "CC.1.3.3.C - Character / Plot",
    "CC.1.3.3.D - Vocabulary (Literature)"
  ],
  "4th": [
    "CC.1.2.4.A - Main Idea",
    "CC.1.2.4.B - Text Evidence",
    "CC.1.2.4.C - Text Structure",
    "CC.1.2.4.D - Vocabulary",
    "CC.1.3.4.A - Theme",
    "CC.1.3.4.B - Text Evidence (Literature)",
    "CC.1.3.4.C - Character / Plot",
    "CC.1.3.4.D - Vocabulary (Literature)"
  ],
  "5th": [
    "CC.1.2.5.A - Main Idea",
    "CC.1.2.5.B - Text Evidence",
    "CC.1.2.5.C - Text Structure",
    "CC.1.2.5.D - Vocabulary",
    "CC.1.3.5.A - Theme",
    "CC.1.3.5.B - Text Evidence (Literature)",
    "CC.1.3.5.C - Character / Plot",
    "CC.1.3.5.D - Vocabulary (Literature)"
  ],
  "6th": [
    "CC.1.2.6.A - Main Idea",
    "CC.1.2.6.B - Text Evidence",
    "CC.1.2.6.C - Text Structure",
    "CC.1.2.6.D - Vocabulary",
    "CC.1.3.6.A - Theme",
    "CC.1.3.6.B - Text Evidence (Literature)",
    "CC.1.3.6.C - Character / Plot",
    "CC.1.3.6.D - Vocabulary (Literature)"
  ],
  "7th": [
    "CC.1.2.7.A - Main Idea",
    "CC.1.2.7.B - Text Evidence",
    "CC.1.2.7.C - Text Structure",
    "CC.1.2.7.D - Vocabulary",
    "CC.1.3.7.A - Theme",
    "CC.1.3.7.B - Text Evidence (Literature)",
    "CC.1.3.7.C - Character / Plot",
    "CC.1.3.7.D - Vocabulary (Literature)"
  ],
  "8th": [
    "CC.1.2.8.A - Main Idea",
    "CC.1.2.8.B - Text Evidence",
    "CC.1.2.8.C - Text Structure",
    "CC.1.2.8.D - Vocabulary",
    "CC.1.3.8.A - Theme",
    "CC.1.3.8.B - Text Evidence (Literature)",
    "CC.1.3.8.C - Character / Plot",
    "CC.1.3.8.D - Vocabulary (Literature)"
  ],
};


export default function TeacherDashboardPage() {
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [gradeLevel, setGradeLevel] = useState("6th");
  const [standard, setStandard] = useState("CC.1.2.6.A - Main Idea");
  const [skill, setSkill] = useState("Main Idea");
  const [textType, setTextType] = useState("Informational");
  const [genre, setGenre] = useState("Informational");
  const [topic, setTopic] = useState("");
  const [passage, setPassage] = useState("");
  const [mcCount, setMcCount] = useState("5");
  const [includeEBSR, setIncludeEBSR] = useState(true);
  const [includeTE, setIncludeTE] = useState(true);
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeTDA, setIncludeTDA] = useState(true);
  const [passageLength, setPassageLength] = useState("600");
  const [difficulty, setDifficulty] = useState("On Grade Level");
  const [aiResult, setAIResult] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingTest, setSavingTest] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedClassRoomId, setSelectedClassRoomId] = useState("");
  const [creatingDiagnostic, setCreatingDiagnostic] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "generator" | "tda" | "learning">("overview");

  async function saveTest() {
    if (!aiResult.trim()) {
      setSaveMessage("Generate a test before saving.");
      return;
    }

    setSavingTest(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${gradeLevel} PSSA ELA - ${skill || "Practice Test"}`,
          gradeLevel,
          classRoomId: selectedClassRoomId || undefined,
          standards: [standard],
          assignmentType: "FULL",
          generatedContent: aiResult,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save test.");
      setSaveMessage("Test saved and assigned to students.");
    } catch (err: any) {
      setSaveMessage(err.message || "Failed to save test.");
    } finally {
      setSavingTest(false);
    }
  }
  const standardsForGrade = elaStandards[gradeLevel] || [];

  async function createDiagnosticAssessment() {
    setCreatingDiagnostic(true);
    setDiagnosticMessage("");

    try {
      const res = await fetch("/api/teacher/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classRoomId: selectedClassRoomId || undefined, gradeLevel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create diagnostic.");
      setDiagnosticMessage(`Grade ${json.gradeLevel} diagnostic assigned with ${json.questionCount} questions across ${json.standardCount} standards.`);
    } catch (err: any) {
      setDiagnosticMessage(err.message || "Failed to create diagnostic.");
    } finally {
      setCreatingDiagnostic(false);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/teacher/dashboard");
        if (!res.ok) throw new Error("Failed to load teacher dashboard");
        const json = await res.json();
        setData(json);
        setSelectedClassRoomId(json.classes?.[0]?.id || "");
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function generateTest() {
    setLoadingAI(true);
    setAIResult("");

    try {
      const res = await fetch("/api/ai/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel,
          standard,
          skill,
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

      const json = await res.json();
      setAIResult(json.result || json.error || "No response returned.");
    } catch {
      setAIResult("Error generating test.");
    }

    setLoadingAI(false);
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-6 shadow">Loading teacher dashboard...</div>;
  }

  if (error) {
    return <div className="rounded-3xl bg-white p-6 shadow text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <LogoutButton />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow">
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Overview</TabButton>
        <TabButton active={activeTab === "generator"} onClick={() => setActiveTab("generator")}>Generate Tests</TabButton>
        <TabButton active={activeTab === "tda"} onClick={() => setActiveTab("tda")}>TDA Scoring</TabButton>
        <TabButton active={activeTab === "learning"} onClick={() => setActiveTab("learning")}>Learning Paths</TabButton>
      </div>

      {activeTab === "tda" && <TeacherTdaScoringPanel />}
      {activeTab === "learning" && <TeacherLearningPathPanel />}

      {activeTab === "generator" && (
      <section className="rounded-3xl bg-white p-6 shadow space-y-6">
  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Diagnostic Assessment</h2>
        <p className="mt-1 text-sm text-slate-600">Generate a PSSA-style diagnostic for grades 3-8 with reading, EBSR, technology-enhanced items, TDA, and conventions questions.</p>
      </div>
      <div className="min-w-64">
        <label className="block text-sm font-medium text-slate-700">Assign to Class</label>
        <select
          className="mt-1 w-full rounded border border-slate-300 p-2"
          value={selectedClassRoomId}
          onChange={(e) => setSelectedClassRoomId(e.target.value)}
        >
          {data?.classes?.map((classRoom: any) => (
            <option key={classRoom.id} value={classRoom.id}>
              {classRoom.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={createDiagnosticAssessment}
        disabled={creatingDiagnostic || !selectedClassRoomId}
        className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {creatingDiagnostic ? "Creating..." : "Generate & Assign Diagnostic"}
      </button>
    </div>
    {diagnosticMessage && (
      <p className={`mt-3 text-sm font-medium ${diagnosticMessage.includes("Failed") ? "text-red-600" : "text-green-700"}`}>
        {diagnosticMessage}
      </p>
    )}
  </div>

  <h2 className="text-xl font-bold">AI PSSA Test Generator</h2>

  <div className="rounded-xl border p-4 space-y-3">
    <h3 className="font-semibold">1. Test Setup</h3>

    <label className="block text-sm font-medium">Grade Level</label>
    <select className="w-full border p-2 rounded" value={gradeLevel} onChange={(e) => {
      const newGrade = e.target.value;
      const firstStandard = elaStandards[newGrade]?.[0] || "";
      setGradeLevel(newGrade);
      setStandard(firstStandard);
      setSkill(firstStandard.split(" - ")[1] || "");
    }}>
      {Object.keys(elaStandards).map((grade) => (
        <option key={grade} value={grade}>{grade}</option>
      ))}
    </select>

    <label className="block text-sm font-medium">Standard</label>
    <select className="w-full border p-2 rounded" value={standard} onChange={(e) => {
      setStandard(e.target.value);
      setSkill(e.target.value.split(" - ")[1] || "");
    }}>
      {standardsForGrade.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>

  </div>

  <div className="rounded-xl border p-4 space-y-3">
    <h3 className="font-semibold">2. Passage Settings</h3>

    <label className="block text-sm font-medium">Genre</label>
    <select className="w-full border p-2 rounded" value={genre} onChange={(e) => setGenre(e.target.value)}>
      <option>Nonfiction</option>
      <option>Fiction</option>
      <option>Poem</option>
    </select>

    <label className="block text-sm font-medium">Text Type</label>
    <select className="w-full border p-2 rounded" value={textType} onChange={(e) => setTextType(e.target.value)}>
      <option>Informational</option>
      <option>Literature</option>
    </select>

    <label className="block text-sm font-medium">Topic</label>
    <input className="w-full border p-2 rounded" placeholder="Example: Industrial Revolution" value={topic} onChange={(e) => setTopic(e.target.value)} />

    <label className="block text-sm font-medium">Optional Passage</label>
    <textarea className="w-full border p-2 rounded h-28" placeholder="Paste a passage here, or leave blank for AI to create one." value={passage} onChange={(e) => setPassage(e.target.value)} />

    <label className="block text-sm font-medium">Passage Length / Approx. Lexile</label>
    <input className="w-full border p-2 rounded" type="number" min="200" max="1200" step="50" value={passageLength} onChange={(e) => setPassageLength(e.target.value)} />
  </div>

  <div className="rounded-xl border p-4 space-y-3">
    <h3 className="font-semibold">3. Question Settings</h3>

    <label className="block text-sm font-medium">Number of Multiple Choice Questions</label>
    <input className="w-full border p-2 rounded" type="number" min="1" max="20" value={mcCount} onChange={(e) => setMcCount(e.target.value)} />

    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
      <label><input type="checkbox" checked={includeEBSR} onChange={(e) => setIncludeEBSR(e.target.checked)} /> EBSR</label>
      <label><input type="checkbox" checked={includeTE} onChange={(e) => setIncludeTE(e.target.checked)} /> TE Question</label>
      <label><input type="checkbox" checked={includeVocab} onChange={(e) => setIncludeVocab(e.target.checked)} /> Vocabulary</label>
      <label><input type="checkbox" checked={includeTDA} onChange={(e) => setIncludeTDA(e.target.checked)} /> TDA</label>
    </div>
  </div>

  <div className="rounded-xl border p-4 space-y-3">
    <h3 className="font-semibold">4. Difficulty</h3>

    <label className="block text-sm font-medium">Difficulty Level</label>
    <select className="w-full border p-2 rounded" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
      <option>Below Grade Level</option>
      <option>On Grade Level</option>
      <option>Above Grade Level</option>
      <option>Advanced</option>
    </select>
  </div>

  <button onClick={generateTest} disabled={loadingAI} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
    {loadingAI ? "Generating..." : "Generate Passage + Questions"}
  </button>


  {aiResult && (
  <>
    {data?.classes?.length > 0 && (
      <div className="mt-4 max-w-md">
        <label className="block text-sm font-medium">Assign to Class</label>
        <select
          className="mt-1 w-full border p-2 rounded"
          value={selectedClassRoomId}
          onChange={(e) => setSelectedClassRoomId(e.target.value)}
        >
          {data.classes.map((classRoom: any) => (
            <option key={classRoom.id} value={classRoom.id}>
              {classRoom.name}
            </option>
          ))}
        </select>
      </div>
    )}

    <button
      onClick={saveTest}
      disabled={savingTest}
      className="bg-green-600 text-white px-4 py-2 rounded mt-4 disabled:opacity-50"
    >
      {savingTest ? "Saving..." : "Save and Assign Test"}
    </button>

    {saveMessage && (
      <p className={`mt-3 text-sm font-medium ${saveMessage.includes("Failed") || saveMessage.includes("Generate") ? "text-red-600" : "text-green-700"}`}>
        {saveMessage}
      </p>
    )}

    <pre className="mt-4 p-4 bg-gray-100 rounded text-sm whitespace-pre-wrap">
      {aiResult}
    </pre>
  </>
)}
</section>
      )}

      {activeTab === "overview" && (
        <>
      <section className="grid gap-6 lg:grid-cols-3">
        <MetricCard title="Average Score" value={`${data?.overview?.averageScore || 0}%`} />
        <MetricCard title="Tests Completed" value={`${data?.overview?.completedReportCount || 0}`} />
        <MetricCard title="Students" value={`${data?.overview?.studentCount || 0}`} />
      </section>

      <section className="grid gap-6">
        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold mb-2">Class Growth</h2>
          <p className="text-gray-500 text-sm">Chart area ready. Data points: {data?.classGrowth?.length || 0}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold mb-2">Standards Growth</h2>
          <p className="text-gray-500 text-sm">Chart area ready. Data points: {data?.standardsGrowth?.length || 0}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold mb-2">Student Trend</h2>
          <p className="text-gray-500 text-sm">Chart area ready. Data points: {data?.studentTrend?.length || 0}</p>
        </div>
      </section>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-2xl mt-2">{value}</p>
    </div>
  );
}
