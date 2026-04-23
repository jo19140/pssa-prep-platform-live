import { questionBank, skillOrder } from "@/lib/mockData";
import { Question, ResponseRecord } from "@/types";

export function getQuestionForStep(
  step: number,
  previousResult: { skill: string; difficulty: number; isCorrect: boolean; questionType?: string } | null,
  history: ResponseRecord[],
  allowedStandards: string[] = []
): Question {
  const targetSkill = skillOrder[(step - 1) % skillOrder.length];
  let desiredDifficulty = step === 1 ? 2 : 3;
  if (previousResult) desiredDifficulty = previousResult.isCorrect ? Math.min(previousResult.difficulty + 1, 4) : Math.max(previousResult.difficulty - 1, 2);
  let pool = questionBank;
  if (allowedStandards.length) pool = pool.filter((q) => allowedStandards.includes(q.standardCode));
  const usedIds = new Set(history.map((h) => h.questionId));
  return pool.find((q) => q.skill === targetSkill && q.difficulty === desiredDifficulty && !usedIds.has(q.id)) || pool.find((q) => q.skill === targetSkill && !usedIds.has(q.id)) || pool.find((q) => !usedIds.has(q.id)) || questionBank[0];
}
