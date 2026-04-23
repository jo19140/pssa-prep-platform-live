import { buildStandardsMastery } from "@/lib/standards";
import { buildSkillGrowth } from "@/lib/skillGrowth";
import { buildStandardsGrowth } from "@/lib/standardsGrowth";
import { getPerformanceBand } from "@/lib/performance";
import { formatTime, letter } from "@/lib/utils";

export function buildDetailedReport(student: any, history: any[], path: any[], previousReport: any = null) {
  const total = history.length;
  const totalPoints = history.reduce((sum, h) => sum + (h.maxPoints || 1), 0);
  const earnedPoints = history.reduce((sum, h) => sum + (h.scorePointsEarned || 0), 0);
  const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const performance = getPerformanceBand(score);
  const totalTimeSec = history.reduce((sum, h) => sum + (h.timeSpentSec || 0), 0);
  const skills = ["Inference", "Text Evidence", "Main Idea"].map((skill) => {
    const items = history.filter((h) => h.skill === skill);
    const correct = items.filter((i) => i.isCorrect).length;
    const accuracy = items.length ? Math.round((correct / items.length) * 100) : 0;
    const q = path.find((p) => p?.skill === skill);
    return { skill, standardCode: q?.standardCode || "", standardLabel: q?.standardLabel || "", total: items.length, correct, accuracy, status: accuracy >= 80 ? "Strong" : accuracy >= 60 ? "Developing" : "Needs Work" };
  });
  const standardsMastery = buildStandardsMastery(history);
  const skillGrowth = buildSkillGrowth(skills.map((s) => ({ skill: s.skill, accuracy: s.accuracy })), previousReport?.skillBreakdown?.map((s: any) => ({ skill: s.skill, accuracy: s.accuracy })) || []);
  const standardsGrowth = buildStandardsGrowth(standardsMastery, previousReport?.standardsMastery || []);
  const strongestSkill = [...skills].sort((a, b) => b.accuracy - a.accuracy)[0]?.skill || null;
  const weakestSkill = [...skills].sort((a, b) => a.accuracy - b.accuracy)[0]?.skill || null;
  const questionReview = history.map((entry) => {
    const q = path.find((item) => item.id === entry.questionId);
    return {
      questionId: entry.questionId,
      skill: entry.skill,
      questionType: entry.questionType,
      isCorrect: entry.isCorrect,
      difficultyLabel: entry.difficulty <= 2 ? "Support" : entry.difficulty >= 4 ? "Challenge" : "On Level",
      question: q?.question || q?.partAQuestion || q?.hotTextPrompt || q?.dragDropPrompt || "Question",
      studentAnswerLabel: entry.chosenIndex != null ? letter(entry.chosenIndex) : entry.partAIndex != null ? `Part A: ${letter(entry.partAIndex)}` : entry.selectedIndices ? entry.selectedIndices.map(letter).join(", ") : entry.scorePointsEarned != null ? `${entry.scorePointsEarned}/${entry.maxPoints}` : "Recorded",
      correctAnswerLabel: q?.correctIndex != null ? letter(q.correctIndex) : q?.partACorrectIndex != null ? `Part A: ${letter(q.partACorrectIndex)}` : q?.correctIndices ? q.correctIndices.map(letter).join(", ") : "See response",
      whyScoredThisWay: entry.errorPattern,
      skillTip: q?.skillTip || ""
    };
  });
  return {
    student,
    assessment: { id: "pssa_ela_practice_01", name: "PSSA ELA Practice Test 1", subject: "ELA", dateLabel: new Date().toLocaleDateString() },
    summary: { score, correct: history.filter((h) => h.isCorrect).length, pointsEarned: earnedPoints, totalPoints, questionsAnswered: total, performance, growthLabel: previousReport?.summary?.score != null ? `${score - previousReport.summary.score >= 0 ? "+" : ""}${score - previousReport.summary.score}%` : "N/A", timeOnTestLabel: formatTime(totalTimeSec), strongestSkill, weakestSkill, harderCount: history.filter((h) => h.difficulty >= 4).length, insightLine: `The student is strongest in ${strongestSkill ? strongestSkill.toLowerCase() : "core reading skills"}, but needs more support with ${weakestSkill ? weakestSkill.toLowerCase() : "targeted skills"}.` },
    standardsMastery,
    standardsGrowth,
    skillBreakdown: skills,
    skillGrowth,
    questionTypeBreakdown: aggregateAccuracy(history, (item: any) => item.questionType),
    difficultyBreakdown: aggregateAccuracy(history, (item: any) => item.difficulty <= 2 ? "Support" : item.difficulty >= 4 ? "Challenge" : "On Level"),
    errorPatterns: [],
    questionReview,
    growth: previousReport?.summary?.score != null ? { previousScore: previousReport.summary.score, currentScore: score, growthPoints: score - previousReport.summary.score, previousBand: previousReport.summary.performance, currentBand: performance } : { previousScore: null, currentScore: score, growthPoints: null, previousBand: null, currentBand: performance }
  };
}

function aggregateAccuracy(history: any[], labelFn: (item: any) => string) {
  const groups: Record<string, { label: string; earned: number; total: number }> = {};
  history.forEach((item) => {
    const key = labelFn(item);
    if (!groups[key]) groups[key] = { label: key, earned: 0, total: 0 };
    groups[key].earned += item.scorePointsEarned || 0;
    groups[key].total += item.maxPoints || 1;
  });
  return Object.values(groups).map((group) => ({ ...group, accuracy: group.total ? Math.round((group.earned / group.total) * 100) : 0 }));
}
