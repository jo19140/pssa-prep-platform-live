"use client";
import { useEffect, useMemo, useState } from "react";
import { getQuestionForStep } from "@/lib/adaptiveEngine";
import { buildDetailedReport } from "@/lib/reportBuilder";
import { demoStudent, totalSimQuestions } from "@/lib/mockData";
import { StudentTest } from "@/components/StudentTest";
import { StudentReport } from "@/components/StudentReport";
import { StudentAssignmentListPage } from "@/components/StudentAssignmentListPage";
import { LearningPathPanel } from "@/components/LearningPathPanel";
import { StudentLearningPathPage } from "@/components/StudentLearningPathPage";

export function StudentSessionPage() {
  const [sessionPayload, setSessionPayload] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [questionPath, setQuestionPath] = useState([getQuestionForStep(1, null, [])]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "test" | "report" | "learningPath">("list");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [readingCoachAssignments, setReadingCoachAssignments] = useState<any[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<number[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [latestLearningPath, setLatestLearningPath] = useState<any>(null);

  useEffect(() => { loadAssignments(); }, []);

  useEffect(() => {
    if (mode === "test") setQuestionStartedAt(Date.now());
  }, [mode, currentQuestionNumber]);

  async function loadAssignments() {
    try {
      setError("");
      const res = await fetch("/api/student/assignments");
      if (!res.ok) throw new Error("Failed to load assignments.");
      const json = await res.json();
      setAssignments(json.assignments || []);
      setReadingCoachAssignments(json.readingCoachAssignments || []);
      setLatestLearningPath(json.latestLearningPath || null);
    } catch (e) {
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function openAssignment(assignment: any) {
    setLoading(true);
    try {
      setError("");
      const res = await fetch(`/api/student/session?assessmentId=${assignment.assessmentId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to open session.");
      setSessionPayload(json);
      setHistory(normalizeResponses(json.responses || []));
      setFlaggedQuestionIds([]);
      setReviewOpen(false);
      setIsPaused(false);
      const currentNo = json.currentQuestionNo || 1;
      setCurrentQuestionNumber(currentNo);
      const savedQuestions = json.questions || [];
      const path = savedQuestions.length ? savedQuestions : [getQuestionForStep(1, null, [], json.standards || [])];
      if (!savedQuestions.length) {
        for (let i = 1; i < currentNo; i++) {
          const previous = normalizeResponses(json.responses || [])[i - 1];
          path[i] = getQuestionForStep(i + 1, previous ? { skill: previous.skill, difficulty: previous.difficulty, isCorrect: previous.isCorrect, questionType: previous.questionType } : null, normalizeResponses(json.responses || []).slice(0, i), json.standards || []);
        }
      }
      setQuestionPath(path);
      setMode(json.submittedAt || assignment.statusLabel === "Completed" ? "report" : "test");
      if (!json.submittedAt && assignment.statusLabel !== "Completed") setQuestionStartedAt(Date.now());
    } catch {
      setError("Failed to open session.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAnswer(payload: any) {
    if (!sessionPayload) return;
    const currentQuestion = questionPath[currentQuestionNumber - 1];
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
    const answerPayload = { ...payload.answerPayload, passageId: currentQuestion.passageId, passageType: currentQuestion.passageType };
    const nextRecord = { questionId: currentQuestion.id, skill: currentQuestion.skill, standardCode: currentQuestion.standardCode, standardLabel: currentQuestion.standardLabel, questionType: currentQuestion.type, difficulty: currentQuestion.difficulty, isCorrect: payload.isCorrect, scorePointsEarned: payload.scorePointsEarned, maxPoints: payload.maxPoints, errorPattern: payload.errorPattern, timeSpentSec: elapsedSeconds, ...answerPayload };
    const answerRes = await fetch("/api/test/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionPayload.sessionId, questionId: nextRecord.questionId, skill: nextRecord.skill, standardCode: nextRecord.standardCode, standardLabel: nextRecord.standardLabel, questionType: nextRecord.questionType, difficulty: nextRecord.difficulty, isCorrect: nextRecord.isCorrect, scorePointsEarned: nextRecord.scorePointsEarned, maxPoints: nextRecord.maxPoints, errorPattern: nextRecord.errorPattern, timeSpentSec: nextRecord.timeSpentSec, answerPayload, currentQuestionNo: currentQuestionNumber }) });
    if (!answerRes.ok) {
      setError("Failed to save answer.");
      return;
    }
    const updatedHistory = upsertHistory(history, nextRecord);
    setHistory(updatedHistory);
    const nextQuestionNo = Math.min((questionPath.length || totalSimQuestions), currentQuestionNumber + 1);
    const totalQuestions = questionPath.length || totalSimQuestions;
    if (currentQuestionNumber < totalQuestions) {
      if (!sessionPayload.questions?.length) {
        const nextQuestion = getQuestionForStep(nextQuestionNo, { skill: currentQuestion.skill, difficulty: currentQuestion.difficulty, isCorrect: payload.isCorrect, questionType: currentQuestion.type }, updatedHistory, sessionPayload.standards || []);
        setQuestionPath((prev) => { const copy = [...prev]; copy[currentQuestionNumber] = nextQuestion; return copy; });
      }
      setCurrentQuestionNumber(nextQuestionNo);
    } else {
      setReviewOpen(true);
    }
  }

  function goToQuestion(questionNumber: number) {
    const totalQuestions = questionPath.length || totalSimQuestions;
    setCurrentQuestionNumber(Math.min(totalQuestions, Math.max(1, questionNumber)));
    setIsPaused(false);
  }

  function toggleFlag(questionId: number) {
    setFlaggedQuestionIds((prev) => prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]);
  }

  async function submitTestNow() {
    if (!sessionPayload) return;
    const submitRes = await fetch("/api/test/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionPayload.sessionId }) });
    if (!submitRes.ok) {
      setError("Failed to submit test.");
      return;
    }
    const submitJson = await submitRes.json();
    if (submitJson.responses) setHistory(normalizeResponses(submitJson.responses));
    setSessionPayload((prev: any) => ({ ...prev, learningPath: submitJson.learningPath }));
    await loadAssignments();
    setReviewOpen(false);
    setIsPaused(false);
    setMode("report");
  }

  const report = useMemo(() => buildDetailedReport(demoStudent, history, questionPath), [history, questionPath]);
  const backToAssignments = async () => {
    setMode("list");
    setLoading(true);
    await loadAssignments();
  };

  if (loading) return <div className="rounded-3xl bg-white p-6 shadow">Loading...</div>;
  if (error) return <div className="rounded-3xl bg-white p-6 shadow text-rose-600">{error}</div>;
  if (mode === "list") return <StudentAssignmentListPage assignments={assignments} readingCoachAssignments={readingCoachAssignments} latestLearningPath={latestLearningPath} onOpen={openAssignment} onOpenLearningPath={() => setMode("learningPath")} onReadingCoachComplete={loadAssignments} />;
  if (mode === "learningPath") return <StudentLearningPathPage learningPath={latestLearningPath} onBack={backToAssignments} />;
  if (mode === "report") return <div className="space-y-4"><button onClick={backToAssignments} className="rounded-xl bg-slate-200 px-4 py-2">Back to Assignments</button><StudentReport report={report} /><LearningPathPanel learningPath={sessionPayload?.learningPath} /></div>;
  return <div className="space-y-4"><StudentTest currentQuestion={questionPath[currentQuestionNumber - 1]} currentQuestionNumber={currentQuestionNumber} totalQuestions={questionPath.length || totalSimQuestions} history={history} onSubmitAnswer={onSubmitAnswer} onNavigate={goToQuestion} onPause={() => setIsPaused(true)} onReview={() => setReviewOpen(true)} onEndTest={submitTestNow} onToggleFlag={() => toggleFlag(questionPath[currentQuestionNumber - 1].id)} flaggedQuestionIds={flaggedQuestionIds} isPaused={isPaused} onResume={() => setIsPaused(false)} reviewOpen={reviewOpen} onCloseReview={() => setReviewOpen(false)} questionIds={questionPath.map((question) => question.id)} /></div>;
}

function normalizeResponses(responses: any[]) {
  return responses.map((response) => ({ ...response, ...(response.answerPayload || {}) }));
}

function upsertHistory(history: any[], nextRecord: any) {
  const withoutCurrent = history.filter((record) => record.questionId !== nextRecord.questionId);
  return [...withoutCurrent, nextRecord].sort((a, b) => a.questionId - b.questionId);
}
