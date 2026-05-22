import { db } from "@/lib/db";
import { generateStepAudio as generateSharedStepAudio } from "@/lib/lessonAudio";
import { logAiFailure } from "@/lib/aiTelemetry";

export async function generateStepAudio({
  stepId,
  narrationScript,
  lessonId,
  voice,
}: {
  stepId: string;
  narrationScript: string;
  lessonId?: string;
  voice?: string;
}) {
  try {
    const result = await generateSharedStepAudio({
      lessonId: lessonId || "review",
      stepId,
      narrationScript,
      voice,
    });
    return result.audioUrl;
  } catch (error) {
    logAiFailure({
      scope: "lessonStepAudio.generate",
      error,
      context: { stepId, narrationLength: narrationScript.length },
    });
    return null;
  }
}

export async function regenerateStepAudio(stepId: string) {
  const step = await db.lessonStep.findUnique({ where: { id: stepId } });
  if (!step) throw new Error("Lesson step not found.");
  const audioUrl = await generateStepAudio({ stepId: step.id, lessonId: step.lessonId, narrationScript: step.narrationScript });
  if (audioUrl) {
    await db.lessonStep.update({ where: { id: step.id }, data: { audioUrl } });
  }
  return audioUrl;
}
