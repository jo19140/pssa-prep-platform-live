"use client";
import { useEffect, useMemo, useState } from "react";
import { getQuestionForStep } from "@/lib/adaptiveEngine";
import { buildDetailedReport } from "@/lib/reportBuilder";
import { demoStudent, totalSimQuestions } from "@/lib/mockData";
import { StudentTest } from "@/components/StudentTest";
import { StudentReport } from "@/components/StudentReport";
import { StudentAssignmentListPage } from "@/components/StudentAssignmentListPage";

export function StudentSessionPage() {
  const [sessionPayload, setSessionPayload] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [questionPath, setQuestionPath] = useState([getQuestionForStep(1, null, [])]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "test" | "report">("list");
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => { loadAssignments(); }, []);

  async function loadAssignments() {
    try {
      const res = await fetch("/api/student/assignments");
      const json = await res.json();
      setAssignments(json.assignments || []);
    } catch (e) {
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function openAssessment(assessmentId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/session?assessmentId=${assessmentId}`);
      const json = await res.json();
      setSessionPayload(json);
      setHistory(json.responses || []);
      const currentNo = json.currentQuestionNo || 1;
      setCurrentQuestionNumber(currentNo);
      const path = [getQuestionForStep(1, null, [], json.standards || [])];
      for (let i = 1; i < currentNo; i++) {
        const previous = (json.responses || [])[i - 1];
        path[i] = getQuestionForStep(i + 1, previous ? { skill: previous.skill, difficulty: previous.difficulty, isCorrect: previous.isCorrect, questionType: previous.questionType } : null, (json.responses || []).slice(0, i), json.standards || []);
      }
      setQuestionPath(path);
      setMode(json.submittedAt ? "report" : "test");
    } catch {
      setError("Failed to open session.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAnswer(payload: any) {
    if (!sessionPayload) return;
    const currentQuestion = questionPath[currentQuestionNumber - 1];
    const nextRecord = { questionId: currentQuestion.id, skill: currentQuestion.skill, standardCode: currentQuestion.standardCode, standardLabel: currentQuestion.standardLabel, questionType: currentQuestion.type, difficulty: currentQuestion.difficulty, isCorrect: payload.isCorrect, scorePointsEarned: payload.scorePointsEarned, maxPoints: payload.maxPoints, errorPattern: payload.errorPattern, timeSpentSec: 60, ...payload.answerPayload };
    await fetch("/api/test/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionPayload.sessionId, questionId: nextRecord.questionId, skill: nextRecord.skill, standardCode: nextRecord.standardCode, standardLabel: nextRecord.standardLabel, questionType: nextRecord.questionType, difficulty: nextRecord.difficulty, isCorrect: nextRecord.isCorrect, scorePointsEarned: nextRecord.scorePointsEarned, maxPoints: nextRecord.maxPoints, errorPattern: nextRecord.errorPattern, timeSpentSec: nextRecord.timeSpentSec, answerPayload: payload.answerPayload }) });
    const updatedHistory = [...history, nextRecord];
    setHistory(updatedHistory);
    const nextQuestionNo = currentQuestionNumber + 1;
    if (nextQuestionNo <= totalSimQuestions) {
      const nextQuestion = getQuestionForStep(nextQuestionNo, { skill: currentQuestion.skill, difficulty: currentQuestion.difficulty, isCorrect: payload.isCorrect, questionType: currentQuestion.type }, updatedHistory, sessionPayload.standards || []);
      setQuestionPath((prev) => { const copy = [...prev]; copy[currentQuestionNumber] = nextQuestion; return copy; });
      setCurrentQuestionNumber(nextQuestionNo);
    } else {
      await fetch("/api/test/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionPayload.sessionId }) });
      setMode("report");
    }
  }

  const report = useMemo(() => buildDetailedReport(demoStudent, history, questionPath), [history, questionPath]);

  if (loading) return <div className="rounded-3xl bg-white p-6 shadow">Loading...</div>;
  if (error) return <div className="rounded-3xl bg-white p-6 shadow text-rose-600">{error}</div>;
  if (mode === "list") return <StudentAssignmentListPage assignments={assignments} onOpen={openAssessment} />;
  if (mode === "report") return <div className="space-y-4"><button onClick={() => setMode("list")} className="rounded-xl bg-slate-200 px-4 py-2">← Back to Assignments</button><StudentReport report={report} /></div>;
  return <div className="space-y-4"><button onClick={() => setMode("list")} className="rounded-xl bg-slate-200 px-4 py-2">← Back to Assignments</button><StudentTest currentQuestion={questionPath[currentQuestionNumber - 1]} currentQuestionNumber={currentQuestionNumber} totalQuestions={totalSimQuestions} history={history} onSubmitAnswer={onSubmitAnswer} /></div>;
}
