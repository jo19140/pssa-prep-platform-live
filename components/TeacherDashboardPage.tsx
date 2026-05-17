"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import TeacherTdaScoringPanel from "@/components/TeacherTdaScoringPanel";
import { TeacherLearningPathPanel } from "@/components/TeacherLearningPathPanel";
import { TeacherResourcesPanel } from "@/components/TeacherResourcesPanel";
import { TeacherClassesPanel } from "@/components/TeacherClassesPanel";

const elaStandards: Record<string, string[]> = {
  "3rd": [
    "CC.1.2.3.A - Main Idea",
    "CC.1.2.3.B / CC.1.3.3.B - Inference",
    "CC.1.2.3.C - Text Structure",
    "CC.1.2.3.D - Vocabulary",
    "CC.1.3.3.A - Theme",
    "CC.1.3.3.B - Text Evidence (Literature)",
    "CC.1.3.3.C - Character",
    "CC.1.3.3.C - Setting",
    "CC.1.3.3.H - Plot Development",
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
    "CC.1.3.4.C - Character",
    "CC.1.3.4.C - Setting",
    "CC.1.3.4.H - Plot Development",
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
    "CC.1.3.5.C - Character",
    "CC.1.3.5.C - Setting",
    "CC.1.3.5.H - Plot Development",
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
    "CC.1.3.6.C - Setting Impact",
    "CC.1.3.6.C - Plot Development",
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
    "CC.1.3.7.C - Setting Analysis",
    "CC.1.3.7.C - Plot Analysis",
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
    "CC.1.3.8.C - Setting Analysis",
    "CC.1.3.8.C - Plot Analysis",
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
  const [activeTab, setActiveTab] = useState<"classes" | "assignments" | "reports" | "grading" | "resources" | "overview" | "generator" | "testDesign" | "tda" | "learning" | "readingCoach" | "import">(() => {
    if (typeof window === "undefined") return "classes";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab === "assignments" || tab === "reports" || tab === "grading" || tab === "resources" ? tab : "classes";
  });
  const [testDesignPurpose, setTestDesignPurpose] = useState("BASELINE_DIAGNOSTIC");
  const [designingTest, setDesigningTest] = useState(false);
  const [testDesignBlueprint, setTestDesignBlueprint] = useState<any>(null);
  const [testDesignMessage, setTestDesignMessage] = useState("");
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

  async function runTestDesignAgent() {
    setDesigningTest(true);
    setTestDesignMessage("");
    setTestDesignBlueprint(null);
    try {
      const res = await fetch("/api/teacher/test-design-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedClassRoomId || undefined,
          gradeLevel,
          purpose: testDesignPurpose,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to design assessment.");
      setTestDesignBlueprint(json.blueprint);
      setTestDesignMessage("Test design blueprint ready for review.");
    } catch (err: any) {
      setTestDesignMessage(err.message || "Failed to design assessment.");
    } finally {
      setDesigningTest(false);
    }
  }

  async function assignDesignedDiagnostic() {
    if (!testDesignBlueprint) return;
    setCreatingDiagnostic(true);
    setTestDesignMessage("");
    try {
      const res = await fetch("/api/teacher/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classRoomId: selectedClassRoomId || undefined,
          gradeLevel: testDesignBlueprint.gradeLevel,
          title: testDesignBlueprint.title.replace(" Design", ""),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to assign designed diagnostic.");
      setTestDesignMessage(`Designed diagnostic assigned with ${json.questionCount} questions across ${json.standardCount} standards.`);
    } catch (err: any) {
      setTestDesignMessage(err.message || "Failed to assign designed diagnostic.");
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

  function setDashboardTab(tab: typeof activeTab) {
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
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
        <TabButton active={activeTab === "classes"} onClick={() => setDashboardTab("classes")}>Classes</TabButton>
        <TabButton active={activeTab === "assignments"} onClick={() => setDashboardTab("assignments")}>Assignments</TabButton>
        <TabButton active={activeTab === "reports"} onClick={() => setDashboardTab("reports")}>Reports</TabButton>
        <TabButton active={activeTab === "grading"} onClick={() => setDashboardTab("grading")}>Grading</TabButton>
        <TabButton active={activeTab === "resources"} onClick={() => setDashboardTab("resources")}>Resources</TabButton>
      </div>

      {activeTab === "assignments" && <TeacherLearningPathPanel mode="assignments" role={data?.teacher?.role} />}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <TeacherLearningPathPanel mode="reports" role={data?.teacher?.role} />
        </div>
      )}
      {activeTab === "grading" && <TeacherTdaScoringPanel />}
      {activeTab === "resources" && <TeacherResourcesPanel />}
      {activeTab === "tda" && <TeacherTdaScoringPanel />}
      {activeTab === "learning" && <TeacherLearningPathPanel mode="assignments" role={data?.teacher?.role} />}
      {activeTab === "classes" && <TeacherClassesPanel />}
      {activeTab === "import" && <TeacherImportStudentsPanel classes={data?.classes || []} />}
      {activeTab === "testDesign" && (
        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Test Design Agent</p>
            <h2 className="text-xl font-bold text-slate-900">Design a Standards-Balanced Assessment</h2>
            <p className="text-sm text-slate-600">The agent creates the blueprint first, then assigns through the existing database-backed diagnostic flow.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
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
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)}>
                {Object.keys(elaStandards).map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Assessment Purpose</span>
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={testDesignPurpose} onChange={(event) => setTestDesignPurpose(event.target.value)}>
                <option value="BASELINE_DIAGNOSTIC">Baseline Diagnostic</option>
                <option value="TARGETED_PRACTICE">Targeted Practice</option>
                <option value="RETEST">Retest</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={runTestDesignAgent} disabled={designingTest} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {designingTest ? "Designing..." : "Design Test Blueprint"}
            </button>
            <button onClick={assignDesignedDiagnostic} disabled={!testDesignBlueprint || creatingDiagnostic || !selectedClassRoomId} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {creatingDiagnostic ? "Assigning..." : "Generate and Assign From Blueprint"}
            </button>
          </div>
          {testDesignMessage ? <p className={`mt-3 text-sm font-semibold ${testDesignMessage.includes("Failed") ? "text-red-600" : "text-green-700"}`}>{testDesignMessage}</p> : null}

          {testDesignBlueprint ? <TestDesignBlueprintView blueprint={testDesignBlueprint} /> : null}
        </section>
      )}
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
          <section className="grid gap-6 lg:grid-cols-4">
            <MetricCard
              title="Diagnostic Average"
              value={formatScoreMetric(data?.overview?.diagnosticAverageScore, data?.overview?.diagnosticCompletedReportCount)}
              subtitle={`${data?.overview?.diagnosticCompletedReportCount || 0} completed current ${pluralize(data?.overview?.diagnosticCompletedReportCount || 0, "diagnostic")}`}
            />
            <MetricCard
              title="Practice Average"
              value={formatScoreMetric(data?.overview?.practiceAverageScore, data?.overview?.practiceCompletedReportCount)}
              subtitle={`${data?.overview?.practiceCompletedReportCount || 0} completed current ${pluralize(data?.overview?.practiceCompletedReportCount || 0, "practice test")}`}
            />
            <MetricCard
              title="Active Sessions"
              value={`${data?.overview?.sessionCount || 0}`}
              subtitle={`${data?.overview?.completedReportCount || 0} latest completed ${pluralize(data?.overview?.completedReportCount || 0, "report")}`}
            />
            <MetricCard title="Students" value={`${data?.overview?.studentCount || 0}`} subtitle={`${data?.teacher?.classCount || 0} class${data?.teacher?.classCount === 1 ? "" : "es"}`} />
          </section>

          <ScoreSourcesPanel sources={data?.overview?.scoreSources} />

          <TeacherLaunchPad
            classCount={data?.teacher?.classCount || data?.classes?.length || 0}
            studentCount={data?.overview?.studentCount || 0}
            onOpenImport={() => setActiveTab("import")}
            onOpenLearning={() => setActiveTab("learning")}
            onOpenTestDesign={() => setActiveTab("testDesign")}
            onOpenGenerator={() => setActiveTab("generator")}
            onOpenReadingCoach={() => setActiveTab("readingCoach")}
            onOpenTda={() => setActiveTab("tda")}
          />

          <TeacherActionOverview insights={data?.actionInsights} onOpenLearning={() => setActiveTab("learning")} />
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

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function formatScoreMetric(score: number | undefined, count: number | undefined) {
  return count ? `${score || 0}%` : "No scores";
}

function pluralize(count: number, word: string) {
  return count === 1 ? word : `${word}s`;
}

function ScoreSourcesPanel({ sources }: { sources?: { diagnostics?: any[]; practice?: any[] } }) {
  const diagnosticRows = sources?.diagnostics || [];
  const practiceRows = sources?.practice || [];
  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Score Sources</p>
        <h2 className="text-xl font-black text-slate-950">What These Averages Are Based On</h2>
        <p className="text-sm text-slate-600">
          These are the latest completed reports for each active student assignment, so repeat attempts do not inflate the totals.
        </p>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ScoreSourceTable title="Diagnostics" rows={diagnosticRows} emptyText="No current diagnostic scores after the reset." />
        <ScoreSourceTable title="Practice Tests" rows={practiceRows} emptyText="No current practice scores yet." />
      </div>
    </section>
  );
}

function ScoreSourceTable({ title, rows, emptyText }: { title: string; rows: any[]; emptyText: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
        <h3 className="font-black text-slate-950">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{rows.length}</span>
      </div>
      {rows.length ? (
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.sessionId} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-bold text-slate-950">{row.studentName}</p>
                <p className="text-slate-600">{row.assessmentTitle}</p>
                <p className="text-xs font-semibold text-slate-400">{row.className || "No class"} • {formatShortDate(row.submittedAt)}</p>
              </div>
              <p className="text-lg font-black text-slate-950">{row.scorePercent}%</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <EmptyAction text={emptyText} />
        </div>
      )}
    </div>
  );
}

function TeacherLaunchPad({
  classCount,
  studentCount,
  onOpenImport,
  onOpenLearning,
  onOpenTestDesign,
  onOpenGenerator,
  onOpenReadingCoach,
  onOpenTda,
}: {
  classCount: number;
  studentCount: number;
  onOpenImport: () => void;
  onOpenLearning: () => void;
  onOpenTestDesign: () => void;
  onOpenGenerator: () => void;
  onOpenReadingCoach: () => void;
  onOpenTda: () => void;
}) {
  const tools: Array<{
    title: string;
    description: string;
    action: string;
    onClick: () => void;
    tone: "blue" | "emerald" | "indigo" | "amber";
  }> = [
    {
      title: "Build the roster",
      description: classCount ? `${classCount} class${classCount === 1 ? "" : "es"} ready. Import or update students before assigning work.` : "Create classes and import students before assigning work.",
      action: "Import Students",
      onClick: onOpenImport,
      tone: "blue",
    },
    {
      title: "Assign skill lessons",
      description: "Preview grade-level lessons, choose targeted practice, and assign individual skills.",
      action: "Open Lesson Library",
      onClick: onOpenLearning,
      tone: "emerald",
    },
    {
      title: "Create a diagnostic",
      description: "Use the PSSA test design agent to build a standards-balanced assessment blueprint.",
      action: "Design Assessment",
      onClick: onOpenTestDesign,
      tone: "indigo",
    },
    {
      title: "Make practice work",
      description: "Generate original PSSA-style passages, questions, and follow-up assignments.",
      action: "Generate Practice",
      onClick: onOpenGenerator,
      tone: "amber",
    },
  ];

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Teacher Tools</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Plan, assign, and follow up</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Start with the roster, assign targeted lessons, then use diagnostics and teacher-guided practice to decide the next instructional move.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          {studentCount} student{studentCount === 1 ? "" : "s"} on the dashboard
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool) => <TeacherToolCard key={tool.title} {...tool} />)}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <TeacherResourceButton
          title="Reading Coach"
          description="Assign short read-aloud fluency checks when students need oral reading practice."
          onClick={onOpenReadingCoach}
        />
        <TeacherResourceButton
          title="TDA Writing Support"
          description="Review student writing with rubric-aligned strengths and next steps."
          onClick={onOpenTda}
        />
        <TeacherResourceButton
          title="PSSA Workflow"
          description="Use diagnostics, lesson paths, mastery checks, and reteaching groups as one cycle."
          onClick={onOpenLearning}
        />
      </div>
    </section>
  );
}

function TeacherToolCard({
  title,
  description,
  action,
  onClick,
  tone,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
  tone: "blue" | "emerald" | "indigo" | "amber";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-800 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    indigo: "bg-indigo-50 text-indigo-800 ring-indigo-100",
    amber: "bg-amber-50 text-amber-900 ring-amber-100",
  };
  return (
    <div className={`rounded-2xl p-5 ring-1 ${toneClasses[tone]}`}>
      <h3 className="font-black text-slate-950">{title}</h3>
      <p className="mt-2 min-h-16 text-sm text-slate-600">{description}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
      >
        {action}
      </button>
    </div>
  );
}

function TeacherResourceButton({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
    >
      <span className="font-black text-slate-950">{title}</span>
      <span className="mt-1 block text-sm text-slate-600">{description}</span>
    </button>
  );
}

function TeacherImportStudentsPanel({ classes }: { classes: any[] }) {
  const [status, setStatus] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [classRoomId, setClassRoomId] = useState(classes[0]?.id || "");
  const [temporaryPassword, setTemporaryPassword] = useState("Password123!");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStatus() {
      setLoadingStatus(true);
      try {
        const res = await fetch("/api/teacher/google-classroom/status");
        const json = await readJson(res);
        setStatus(json);
        if (json.connected) await loadCourses();
      } catch {
        setMessage("Could not check Google Classroom connection.");
      } finally {
        setLoadingStatus(false);
      }
    }
    loadStatus();
  }, []);

  useEffect(() => {
    if (!classRoomId && classes[0]?.id) {
      setClassRoomId(classes[0].id);
    }
  }, [classes, classRoomId]);

  async function loadCourses() {
    setLoadingCourses(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/google-classroom/courses");
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Failed to load Google Classroom courses.");
      setCourses(json.courses || []);
      setSelectedCourseId(json.courses?.[0]?.id || "");
    } catch (err: any) {
      setMessage(err.message || "Failed to load Google Classroom courses.");
    } finally {
      setLoadingCourses(false);
    }
  }

  async function importRoster() {
    if (!selectedCourseId || !classRoomId) {
      setMessage("Choose a Google course and destination class.");
      return;
    }
    setImporting(true);
    setMessage("");
    try {
      const res = await fetch("/api/teacher/google-classroom/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleCourseId: selectedCourseId, classRoomId, temporaryPassword }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Import failed.");
      setMessage(`Imported ${json.enrolled} students. Created ${json.created}, updated ${json.updated}, skipped ${json.skipped}.`);
    } catch (err: any) {
      setMessage(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const configured = status?.configured;
  const connected = status?.connected;

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student Import</p>
        <h2 className="text-xl font-bold text-slate-900">Import Students From Google Classroom</h2>
        <p className="text-sm text-slate-600">
          Connect a teacher Google Classroom account, choose a Google course, then enroll that roster into one of your PSSA Platform classes.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-bold text-slate-950">Connection</h3>
          {loadingStatus ? (
            <p className="mt-2 text-sm text-slate-500">Checking Google Classroom setup...</p>
          ) : configured ? (
            <div className="mt-3 space-y-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {connected ? "Connected" : "Not connected"}
              </span>
              <div>
                <a
                  href="/api/teacher/google-classroom/connect"
                  className="inline-flex rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
                >
                  {connected ? "Reconnect Google Classroom" : "Connect Google Classroom"}
                </a>
              </div>
              {connected ? (
                <button
                  type="button"
                  onClick={loadCourses}
                  disabled={loadingCourses}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60"
                >
                  {loadingCourses ? "Loading courses..." : "Refresh Courses"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">Google Classroom is not configured yet.</p>
              <p className="mt-2">Add these environment variables, then restart the app:</p>
              <ul className="mt-2 list-disc pl-5">
                {(status?.missing || ["GOOGLE_CLASSROOM_CLIENT_ID", "GOOGLE_CLASSROOM_CLIENT_SECRET"]).map((item: string) => <li key={item}>{item}</li>)}
                <li>Optional: GOOGLE_CLASSROOM_REDIRECT_URI</li>
              </ul>
              <p className="mt-2">The redirect URI should point to <span className="font-mono">/api/teacher/google-classroom/callback</span>.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-950">Roster Import</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Google Classroom Course</span>
              <select
                className="mt-1 w-full rounded border border-slate-300 p-2"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={!connected || !courses.length}
              >
                {!courses.length ? <option value="">No courses loaded</option> : null}
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}{course.section ? ` - ${course.section}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Import Into PSSA Class</span>
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={classRoomId} onChange={(event) => setClassRoomId(event.target.value)}>
                {classes.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>{classRoom.name} - Grade {classRoom.grade}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Temporary Student Password</span>
              <input
                className="mt-1 w-full rounded border border-slate-300 p-2"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                placeholder="At least 8 characters"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Imported students can use this password until a real password setup flow is added.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={importRoster}
            disabled={!connected || !selectedCourseId || !classRoomId || importing}
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Selected Roster"}
          </button>

          {message ? (
            <p className={`mt-3 text-sm font-semibold ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") ? "text-red-600" : "text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TeacherActionOverview({ insights, onOpenLearning }: { insights: any; onOpenLearning: () => void }) {
  const notStarted = insights?.notStarted?.students || [];
  const stuck = insights?.stuck?.students || [];
  const reteachGroups = insights?.reteaching?.groups || [];
  const nextLesson = insights?.nextLesson || null;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow">
        <p className="text-sm font-bold uppercase tracking-wide text-cyan-200">Next Instructional Moves</p>
        <div className="mt-3 grid gap-4 md:grid-cols-4">
          <ActionStat label="Not Started" value={insights?.summary?.notStartedCount || 0} tone="amber" />
          <ActionStat label="May Be Stuck" value={insights?.summary?.stuckCount || 0} tone="rose" />
          <ActionStat label="Reteach Groups" value={reteachGroups.length} tone="blue" />
          <ActionStat label="Next Lesson" value={nextLesson ? "Ready" : "None"} tone="emerald" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <ActionListCard
            title="Who Has Not Started"
            description="Start here for quick reminders or attendance follow-up."
            emptyText="Everyone has started their assigned work."
            rows={notStarted}
            rowRenderer={(row: any) => (
              <>
                <div>
                  <p className="font-bold text-slate-950">{row.studentName}</p>
                  <p className="text-sm text-slate-500">{row.assignmentTitle}</p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  <p>{row.className}</p>
                  <p>{formatShortDate(row.assignedAt)}</p>
                </div>
              </>
            )}
          />

          <ActionListCard
            title="Who May Be Stuck"
            description="Students with unfinished tests or in-progress lessons."
            emptyText="No students are currently stuck in an active activity."
            rows={stuck}
            rowRenderer={(row: any) => (
              <>
                <div>
                  <p className="font-bold text-slate-950">{row.studentName}</p>
                  <p className="text-sm text-slate-500">{row.activityTitle}</p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  <p>{row.detail}</p>
                  <p>Started {formatShortDate(row.startedAt)}</p>
                </div>
              </>
            )}
          />
        </div>

        <div className="space-y-6">
          <NextLessonCard lesson={nextLesson} onOpenLearning={onOpenLearning} />
          <div className="rounded-3xl bg-white p-6 shadow">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Needs Reteaching</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Small Groups by Standard</h2>
              <p className="mt-1 text-sm text-slate-500">Use these groups for a mini-lesson, conference, or targeted assignment.</p>
            </div>
            <div className="mt-4 space-y-3">
              {reteachGroups.length ? reteachGroups.map((group: any) => <ReteachGroupCard key={group.standardCode} group={group} />) : (
                <EmptyAction text="No reteaching groups yet. Completed diagnostics will populate this section." />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionStat({ label, value, tone }: { label: string; value: string | number; tone: "amber" | "rose" | "blue" | "emerald" }) {
  const toneClasses = {
    amber: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
    rose: "bg-rose-400/15 text-rose-100 ring-rose-300/30",
    blue: "bg-blue-400/15 text-blue-100 ring-blue-300/30",
    emerald: "bg-emerald-400/15 text-emerald-100 ring-emerald-300/30",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClasses[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function ActionListCard({
  title,
  description,
  emptyText,
  rows,
  rowRenderer,
}: {
  title: string;
  description: string;
  emptyText: string;
  rows: any[];
  rowRenderer: (row: any) => ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">{rows.length}</span>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {rows.length ? rows.map((row) => (
          <div key={`${title}-${row.studentId}-${row.assignmentTitle || row.activityTitle}`} className="flex items-center justify-between gap-4 py-3">
            {rowRenderer(row)}
          </div>
        )) : <EmptyAction text={emptyText} />}
      </div>
    </div>
  );
}

function NextLessonCard({ lesson, onOpenLearning }: { lesson: any; onOpenLearning: () => void }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow">
      <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">What To Assign Next</p>
      {lesson ? (
        <>
          <h2 className="mt-1 text-xl font-black text-slate-950">{lesson.focus}</h2>
          <p className="mt-2 text-sm text-slate-600">{lesson.recommendation}</p>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-bold">{lesson.standardCode}</p>
            <p>{lesson.activityType} • {lesson.estimatedMinutes} min</p>
            <p className="mt-2">{lesson.students?.length || lesson.groupSize || 0} student{(lesson.students?.length || lesson.groupSize || 0) === 1 ? "" : "s"} in the first group</p>
          </div>
          <button
            type="button"
            onClick={onOpenLearning}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Open Lesson Library
          </button>
        </>
      ) : (
        <EmptyAction text="No lesson recommendation yet. Complete or assign a diagnostic to generate one." />
      )}
    </div>
  );
}

function ReteachGroupCard({ group }: { group: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{group.standardCode}</p>
          <p className="mt-1 text-sm text-slate-600">{group.standardLabel}</p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{group.studentCount}</span>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Students</p>
      <p className="mt-1 text-sm text-slate-700">
        {(group.students || []).map((student: any) => `${student.studentName} (${student.percentScore}%)`).join(", ")}
      </p>
    </div>
  );
}

function EmptyAction({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}

function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TestDesignBlueprintView({ blueprint }: { blueprint: any }) {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{String(blueprint.purpose || "").split("_").join(" ")}</p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">{blueprint.title}</h3>
        <p className="mt-2 text-sm text-slate-700">{blueprint.designSummary}</p>
        <p className="mt-3 text-sm font-semibold text-indigo-900">{blueprint.recommendation}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Official PSSA Design Target</p>
          <h4 className="font-bold text-slate-900">{blueprint.sourceAlignment?.sourceName || "PCS PSSA ELA Test Design"}</h4>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Core Items</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{blueprint.pssaDesign?.totalCoreItems}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Points</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{blueprint.pssaDesign?.totalCorePoints} raw / {blueprint.pssaDesign?.weightedCorePoints} weighted</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Passage Items</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{blueprint.pssaDesign?.passageBasedOnePointItems}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Conventions</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{blueprint.pssaDesign?.standaloneConventionsItems} standalone</p>
          </div>
        </div>
        {blueprint.pssaDesign?.styleReferenceNote ? <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-900">{blueprint.pssaDesign.styleReferenceNote}</p> : null}
        {blueprint.sourceAlignment?.authoritySplit ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
              <p className="font-semibold">Counts + Blueprint Authority</p>
              <p className="mt-1">{blueprint.sourceAlignment.authoritySplit.testCountsAndBlueprint}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-semibold">Sampler Link Use</p>
              <p className="mt-1">{blueprint.sourceAlignment.authoritySplit.samplerLinks}</p>
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(blueprint.pssaDesign?.reportingCategoryTargets || []).map((category: any) => (
            <div key={category.code} className="rounded-xl border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-900">{category.code}: {category.label}</p>
              <p className="text-slate-600">{category.percentOfCore} of core • {category.points} points</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">Generated Questions</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{blueprint.itemPlan?.totalQuestions}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {Object.entries(blueprint.itemPlan?.questionCounts || {}).map(([type, count]) => <p key={type}>{type}: {String(count)}</p>)}
          </div>
          {Object.keys(blueprint.itemPlan?.interactionModeCounts || {}).length ? (
            <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Generated Interaction Modes</p>
              {Object.entries(blueprint.itemPlan?.interactionModeCounts || {}).map(([mode, count]) => <p key={mode}>{mode}: {String(count)}</p>)}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">Standards</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{blueprint.standardsPlan?.totalStandards}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {Object.entries(blueprint.standardsPlan?.strandCoverage || {}).map(([strand, count]) => <p key={strand}>{strand}: {String(count)}</p>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">Checks</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>{blueprint.itemPlan?.includesTda ? "Includes TDA" : "No TDA"}</p>
            <p>{blueprint.itemPlan?.includesShortAnswer ? "Includes short answer" : "No short answer"}</p>
            <p>{blueprint.itemPlan?.includesConventions ? "Includes conventions" : "No conventions"}</p>
            <p>{blueprint.itemPlan?.includesTechnologyEnhanced ? "Includes TE items" : "No TE items"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="font-bold text-slate-900">PSSA Style Analysis</h4>
        <p className="mt-1 text-sm text-slate-600">The agent reviews the wording of questions, text length, and complexity signals before the test is assigned.</p>
        {blueprint.samplerPatternProfile ? (
          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
            <p className="font-semibold">Sampler Pattern Source: {blueprint.samplerPatternProfile.sourceName}</p>
            {blueprint.samplerPatternProfile.intendedUse ? <p className="mt-2 text-blue-900">{blueprint.samplerPatternProfile.intendedUse}</p> : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-semibold">Question Language Patterns</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {(blueprint.samplerPatternProfile.questionLanguagePatterns || []).slice(0, 6).map((pattern: string) => <li key={pattern}>{pattern}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold">Complexity Signals</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {(blueprint.samplerPatternProfile.passageComplexitySignals || []).map((signal: string) => <li key={signal}>{signal}</li>)}
                </ul>
              </div>
            </div>
            {blueprint.samplerPatternProfile.technologyEnhancedPatterns?.length ? (
              <div className="mt-4 rounded-lg bg-white/70 p-3">
                <p className="font-semibold">Technology-Enhanced Patterns</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {blueprint.samplerPatternProfile.technologyEnhancedPatterns.map((pattern: string) => <li key={pattern}>{pattern}</li>)}
                </ul>
              </div>
            ) : null}
            {blueprint.itemPlan?.learnedInteractionPatterns?.length ? (
              <div className="mt-4 rounded-lg bg-white/70 p-3">
                <p className="font-semibold">Learned Release-Item Patterns</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {blueprint.itemPlan.learnedInteractionPatterns.map((pattern: any) => (
                    <li key={pattern.mode}>
                      <span className="font-semibold">{pattern.mode}</span>: {pattern.description}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Overall</p>
            <p className="mt-1 text-slate-700">{blueprint.styleAnalysis?.overallRating}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Cognitive Demand</p>
            <div className="mt-1 space-y-1 text-slate-700">
              {Object.entries(blueprint.styleAnalysis?.questionLanguage?.demandCounts || {}).map(([label, count]) => <p key={label}>{label}: {String(count)}</p>)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Language Moves</p>
            <div className="mt-1 space-y-1 text-slate-700">
              {Object.entries(blueprint.styleAnalysis?.questionLanguage?.languageMoveCounts || {}).slice(0, 6).map(([label, count]) => <p key={label}>{label}: {String(count)}</p>)}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(blueprint.styleAnalysis?.textComplexity?.passages || []).map((passage: any) => (
            <div key={`style-${passage.title}`} className="rounded-xl border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-900">{passage.title}</p>
              <p className="text-slate-600">{passage.actualWordCount}/{passage.wordCountTarget} words • {passage.lengthCheck} • complexity: {passage.complexityRating}</p>
              <p className="mt-1 text-slate-600">{(passage.complexityFeatures || []).join(", ")}</p>
            </div>
          ))}
        </div>
        {blueprint.styleAnalysis?.questionLanguage?.flaggedItems?.length ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Items to Review</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {blueprint.styleAnalysis.questionLanguage.flaggedItems.slice(0, 5).map((item: any) => (
                <li key={item.id}>Q{item.id} ({item.type}, {item.skill}): {item.wordingNotes.join(" ")}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="font-bold text-slate-900">Operational Section Plan</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(blueprint.pssaDesign?.sections || []).map((section: any) => (
            <div key={section.section} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">Section {section.section}</p>
              <p className="mt-1 text-slate-700">{section.emphasis}</p>
              <p className="mt-2 text-slate-600">Items: {section.itemTypes?.join(", ")}</p>
              <p className="text-slate-600">Passages: {section.estimatedPassages} • Time: {section.estimatedMinutes} min</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="font-bold text-slate-900">Passage Plan</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(blueprint.passagePlan || []).map((passage: any) => (
            <div key={passage.title} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{passage.title}</p>
              <p className="text-slate-600">{passage.passageType} • {passage.genre}</p>
              <p className="text-slate-600">Target {passage.wordCountTarget} words • actual {passage.actualWordCount}</p>
              <p className="text-slate-600">{passage.hasTable ? "Includes table/chart" : "No table"} • {passage.hasSections ? "Has sections/headings" : "Continuous text"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <h4 className="font-bold text-slate-900">Quality Guardrails</h4>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {(blueprint.qualityChecks || []).map((check: string) => <li key={check}>{check}</li>)}
        </ul>
      </div>
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
