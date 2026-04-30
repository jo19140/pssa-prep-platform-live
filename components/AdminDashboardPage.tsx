"use client";

import { useState } from "react";
const elaStandards: Record<string, string[]> = {
  "3rd": [
    "CC.1.2.3.A - Main Idea",
    "CC.1.2.3.B - Key Details",
    "CC.1.2.3.C - Text Structure",
    "CC.1.2.3.D - Vocabulary",
  ],
  "4th": [
    "CC.1.2.4.A - Main Idea",
    "CC.1.2.4.B - Text Evidence",
    "CC.1.2.4.C - Text Structure",
    "CC.1.2.4.D - Vocabulary",
  ],
  "5th": [
    "CC.1.2.5.A - Main Idea",
    "CC.1.2.5.B - Text Evidence",
    "CC.1.2.5.C - Text Structure",
    "CC.1.2.5.D - Vocabulary",
  ],
  "6th": [
    "CC.1.2.6.A - Main Idea",
    "CC.1.2.6.B - Text Evidence",
    "CC.1.2.6.C - Text Structure",
    "CC.1.2.6.D - Vocabulary",
  ],
  "7th": [
    "CC.1.2.7.A - Main Idea",
    "CC.1.2.7.B - Text Evidence",
    "CC.1.2.7.C - Text Structure",
    "CC.1.2.7.D - Vocabulary",
  ],
  "8th": [
    "CC.1.2.8.A - Main Idea",
    "CC.1.2.8.B - Text Evidence",
    "CC.1.2.8.C - Text Structure",
    "CC.1.2.8.D - Vocabulary",
  ],
};
export default function AdminDashboardPage() {
  const [gradeLevel, setGradeLevel] = useState("6th");
  const [standard, setStandard] = useState("CC.1.2.6.A");
  const [skill, setSkill] = useState("Main Idea");
  const [textType, setTextType] = useState("Informational");
  const [topic, setTopic] = useState("");
  const [passage, setPassage] = useState("");
  const [aiResult, setAIResult] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const [mcCount, setMcCount] = useState("5");
const [includeEBSR, setIncludeEBSR] = useState(true);
const [includeTE, setIncludeTE] = useState(true);
const [includeVocab, setIncludeVocab] = useState(true);
const [includeTDA, setIncludeTDA] = useState(true);
const [passageLength, setPassageLength] = useState("600");
const [difficulty, setDifficulty] = useState("On Grade Level");
const [genre, setGenre] = useState("Nonfiction");

  const gradeOptions = Object.keys(elaStandards || {});

const standardsForGrade = (elaStandards || {})[gradeLevel] || [];
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
      const data = await res.json();
      setAIResult(data.result || data.error);
    } catch (err) {
      setAIResult("Error generating test.");
    }

    setLoadingAI(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-white shadow rounded-lg p-4">
    <p className="text-sm text-gray-500">Teachers</p>
    <p className="text-3xl font-bold">1</p>
  </div>

  <div className="bg-white shadow rounded-lg p-4">
    <p className="text-sm text-gray-500">Students</p>
    <p className="text-3xl font-bold">3</p>
  </div>

  <div className="bg-white shadow rounded-lg p-4">
    <p className="text-sm text-gray-500">Classes</p>
    <p className="text-3xl font-bold">1</p>
  </div>

  <div className="bg-white shadow rounded-lg p-4">
    <p className="text-sm text-gray-500">Assignments</p>
    <p className="text-3xl font-bold">1</p>
  </div>
</div>

      <div className="bg-white shadow p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-semibold">AI PSSA Test Generator</h2>

        {/* Grade Dropdown */}
        <select
          className="w-full border p-2 rounded"
          value={gradeLevel}
          onChange={(e) => {
            const newGrade = e.target.value;
            setGradeLevel(newGrade);
            setStandard(elaStandards[newGrade][0]);
          }}
        >
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>

        {/* Standards Dropdown */}
        <select
          className="w-full border p-2 rounded"
          value={standard}
          onChange={(e) => setStandard(e.target.value)}
        >
          {standardsForGrade.map((std: string) => (
            <option key={std} value={std}>
              {std}
            </option>
          ))}
        </select>

        {/* Skill */}
        <input
          className="w-full border p-2 rounded"
          placeholder="Skill (ex: Main Idea, Theme, Text Evidence)"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />

        {/* Text Type */}
        <select
          className="w-full border p-2 rounded"
          value={textType}
          onChange={(e) => setTextType(e.target.value)}
        >
          <option value="Informational">Informational</option>
          <option value="Literature">Literature</option>
        </select>

        {/* Topic */}
        <input
          className="w-full border p-2 rounded"
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        {/* Passage */}
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Optional: paste a passage here. If blank, AI will generate one."
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
        />

        {/* Button */}
        <div style={{ marginTop: "20px" }}>
  <label>Number of Multiple Choice Questions</label>
  <input
    type="number"
    value={mcCount}
    onChange={(e) => setMcCount(e.target.value)}
    className="w-full border p-2 rounded"
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Include EBSR</label>
  <input
    type="checkbox"
    checked={includeEBSR}
    onChange={(e) => setIncludeEBSR(e.target.checked)}
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Include Technology Enhanced Question</label>
  <input
    type="checkbox"
    checked={includeTE}
    onChange={(e) => setIncludeTE(e.target.checked)}
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Include Vocabulary Question</label>
  <input
    type="checkbox"
    checked={includeVocab}
    onChange={(e) => setIncludeVocab(e.target.checked)}
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Include TDA</label>
  <input
    type="checkbox"
    checked={includeTDA}
    onChange={(e) => setIncludeTDA(e.target.checked)}
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Passage Length (words)</label>
  <input
    type="number"
    value={passageLength}
    onChange={(e) => setPassageLength(e.target.value)}
    className="w-full border p-2 rounded"
  />
</div>

<div style={{ marginTop: "20px" }}>
  <label>Difficulty</label>
  <select
    value={difficulty}
    onChange={(e) => setDifficulty(e.target.value)}
    className="w-full border p-2 rounded"
  >
    <option>Below Grade Level</option>
    <option>On Grade Level</option>
    <option>Above Grade Level</option>
  </select>
</div>

<div style={{ marginTop: "20px" }}>
  <label>Genre</label>
  <select
    value={genre}
    onChange={(e) => setGenre(e.target.value)}
    className="w-full border p-2 rounded"
  >
    <option>Informational</option>
    <option>Fiction</option>
    <option>Poem</option>
  </select>
</div>
        <button
          onClick={generateAITest}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loadingAI ? "Generating..." : "Generate Passage + Questions"}
        </button>

        {/* Output */}
        {aiResult && (
          <div className="mt-6 p-4 border rounded bg-gray-100 whitespace-pre-wrap">
            {aiResult}
          </div>
        )}
      </div>
    </div>
  );
}