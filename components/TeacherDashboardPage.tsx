"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import TeacherTdaScoringPanel from "@/components/TeacherTdaScoringPanel";
import { TeacherLearningPathPanel } from "@/components/TeacherLearningPathPanel";

const elaStandards: Record<string, string[]> = {
  "3rd": [
    "CC.1.2.3.A - Main Idea",
    "CC.1.2.3.B / CC.1.3.3.B - Inference",
    "CC.1.2.3.C - Text Structure",
    "CC.1.2.3.D - Vocabulary",
    "CC.1.3.3.A - Theme",
    "CC.1.3.3.B - Text Evidence (Literature)",
    "CC.1.3.3.C - Character / Plot",
    "CC.1.3.3.D - Vocabulary (Literature)",
    "CC.1.3.3.C / CC.1.2.3.E - Point of View",
    "CC.1.3.3.C - Flashback",
    "CC.1.3.3.F / CC.1.2.3.F - Figurative Language"
  ],
  "4th": [
    "CC.1.2.4.A - Main Idea",
    "CC.1.2.4.B / CC.1.3.4.B - Inference",
    "CC.1.2.4.C - Text Structure",
    "CC.1.2.4.D - Vocabulary",
    "CC.1.3.4.A - Theme",
    "CC.1.3.4.B - Text Evidence (Literature)",
    "CC.1.3.4.C - Character / Plot",
    "CC.1.3.4.D - Vocabulary (Literature)",
    "CC.1.3.4.C - Point of View",
    "CC.1.3.4.E - Flashback",
    "CC.1.3.4.F / CC.1.2.4.F - Figurative Language"
  ],
  "5th": [
    "CC.1.2.5.A - Main Idea",
    "CC.1.2.5.B / CC.1.3.5.B - Inference",
    "CC.1.2.5.C - Text Structure",
    "CC.1.2.5.D - Vocabulary",
    "CC.1.3.5.A - Theme",
    "CC.1.3.5.B - Text Evidence (Literature)",
    "CC.1.3.5.C - Character / Plot",
    "CC.1.3.5.D - Vocabulary (Literature)",
    "CC.1.3.5.C - Point of View",
    "CC.1.3.5.E - Flashback",
    "CC.1.3.5.F / CC.1.2.5.F - Figurative Language"
  ],
  "6th": [
    "CC.1.2.6.A - Main Idea",
    "CC.1.2.6.B / CC.1.3.6.B - Inference",
    "CC.1.2.6.C - Text Structure",
    "CC.1.2.6.D - Vocabulary",
    "CC.1.3.6.A - Theme",
    "CC.1.3.6.B - Text Evidence (Literature)",
    "CC.1.3.6.C - Character / Plot",
    "CC.1.3.6.D - Vocabulary (Literature)",
    "CC.1.3.6.G - Point of View",
    "CC.1.3.6.E - Flashback",
    "CC.1.3.6.F / CC.1.2.6.F - Figurative Language"
  ],
  "7th": [
    "CC.1.2.7.A - Main Idea",
    "CC.1.2.7.B / CC.1.3.7.B - Inference",
    "CC.1.2.7.C - Text Structure",
    "CC.1.2.7.D - Vocabulary",
    "CC.1.3.7.A - Theme",
    "CC.1.3.7.B - Text Evidence (Literature)",
    "CC.1.3.7.C - Character / Plot",
    "CC.1.3.7.D - Vocabulary (Literature)",
    "CC.1.3.7.G - Point of View",
    "CC.1.3.7.E - Flashback",
    "CC.1.3.7.F / CC.1.2.7.F - Figurative Language"
  ],
  "8th": [
    "CC.1.2.8.A - Main Idea",
    "CC.1.2.8.B / CC.1.3.8.B - Inference",
    "CC.1.2.8.C - Text Structure",
    "CC.1.2.8.D - Vocabulary",
    "CC.1.3.8.A - Theme",
    "CC.1.3.8.B - Text Evidence (Literature)",
    "CC.1.3.8.C - Character / Plot",
    "CC.1.3.8.D - Vocabulary (Literature)",
    "CC.1.3.8.G - Point of View",
    "CC.1.3.8.E - Flashback",
    "CC.1.3.8.F / CC.1.2.8.F - Figurative Language"
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
  const [activeTab, setActiveTab] = useState<"overview" | "generator" | "tda" | "learning" | "readingCoach">("overview");
  const [readingCoachAssignments, setReadingCoachAssignments] = useState<any[]>([]);
  const [readingCoachForm, setReadingCoachForm] = useState({
    title: "Reading Coach Fluency Practice",
    gradeLevel: "6",
    expectedText: "Maya stood at the front of the room and reread the first line of her speech. Her hands shook slightly, so she took a deep breath and looked at the note card again.",
  });
  const [assigningReadingCoach, setAssigningReadingCoach] = useState(false);
  const [readingCoachMessage, setReadingCoachMessage] = useState("");

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

  async function loadReadingCoachAssignments() {
    const res = await fetch("/api/teacher/reading-coach");
    const json = await readJson(res);
    if (res.ok) setReadingCoachAssignments(json.assignments || []);
  }

  async function assignReadingCoach() {
    setAssigningReadingCoach(true);
    setReadingCoachMessage("");
    try {
      const res = await fetch("/api/teacher/reading-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedClassRoomId || undefined,
          title: readingCoachForm.title,
          gradeLevel: readingCoachForm.gradeLevel,
          expectedText: readingCoachForm.expectedText,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to assign Reading Coach practice.");
      setReadingCoachMessage("Reading Coach practice assigned to the class.");
      await loadReadingCoachAssignments();
    } catch (err: any) {
      setReadingCoachMessage(err.message || "Failed to assign Reading Coach practice.");
    } finally {
      setAssigningReadingCoach(false);
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
        await loadReadingCoachAssignments();
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
        <TabButton active={activeTab === "readingCoach"} onClick={() => setActiveTab("readingCoach")}>Reading Coach</TabButton>
        <TabButton active={activeTab === "tda"} onClick={() => setActiveTab("tda")}>TDA Scoring</TabButton>
        <TabButton active={activeTab === "learning"} onClick={() => setActiveTab("learning")}>Learning Paths</TabButton>
      </div>

      {activeTab === "tda" && <TeacherTdaScoringPanel />}
      {activeTab === "learning" && <TeacherLearningPathPanel />}
      {activeTab === "readingCoach" && (
        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Reading Coach</p>
            <h2 className="text-xl font-bold text-slate-900">Assign Read-Aloud Practice</h2>
            <p className="text-sm text-slate-600">Students only see Reading Coach when you assign it to their class.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Assign to Class</span>
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={selectedClassRoomId} onChange={(event) => setSelectedClassRoomId(event.target.value)}>
                {data?.classes?.map((classRoom: any) => (
                  <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Grade Level</span>
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={readingCoachForm.gradeLevel} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, gradeLevel: event.target.value })}>
                {[3, 4, 5, 6, 7, 8].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Assignment Title</span>
              <input className="mt-1 w-full rounded border border-slate-300 p-2" value={readingCoachForm.title} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, title: event.target.value })} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Read-Aloud Passage</span>
              <textarea className="mt-1 min-h-36 w-full rounded border border-slate-300 p-3" value={readingCoachForm.expectedText} onChange={(event) => setReadingCoachForm({ ...readingCoachForm, expectedText: event.target.value })} />
            </label>
          </div>

          <button onClick={assignReadingCoach} disabled={assigningReadingCoach || !selectedClassRoomId} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {assigningReadingCoach ? "Assigning..." : "Assign Reading Coach"}
          </button>
          {readingCoachMessage ? <p className={`mt-3 text-sm font-semibold ${readingCoachMessage.includes("Failed") ? "text-red-600" : "text-green-700"}`}>{readingCoachMessage}</p> : null}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Grade</th>
                  <th className="py-2 pr-4">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {readingCoachAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{assignment.title}</td>
                    <td className="py-3 pr-4">{assignment.className}</td>
                    <td className="py-3 pr-4">Grade {assignment.gradeLevel}</td>
                    <td className="py-3 pr-4">{assignment.attemptCount}</td>
                  </tr>
                ))}
                {!readingCoachAssignments.length ? (
                  <tr className="border-t border-slate-100">
                    <td className="py-3 pr-4 text-slate-500" colSpan={4}>No Reading Coach assignments yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}
