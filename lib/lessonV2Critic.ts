import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { LessonV2 } from "@/lib/lessonV2Schema";

export const lessonV2CriticResultSchema = z.object({
  status: z.enum(["PASS", "REVISE"]),
  score: z.number().int().min(0).max(100),
  revisions: z.array(z.object({
    section: z.string(),
    issue: z.string(),
    suggestion: z.string(),
  })),
});

export type LessonV2CriticResult = z.infer<typeof lessonV2CriticResultSchema>;

export async function critiqueLessonV2(openai: OpenAI, lesson: LessonV2, validationIssues: string[] = []): Promise<LessonV2CriticResult> {
  const response = await openai.responses.parse({
    model: process.env.LESSON_V2_CRITIC_MODEL || "gpt-4o",
    temperature: 0,
    max_output_tokens: 1800,
    instructions: [
      "You are a strict PSSA ELA lesson quality reviewer.",
      "Evaluate the draft against: teaching quality, distractor plausibility, rationale specificity, TEI variety, passage uniqueness, and grade-appropriate complexity.",
      "Return PASS only if the lesson is ready for a human teacher review queue with no major content gaps.",
      "If validation issues are provided, include them in your scoring and suggest targeted revisions.",
      "Score 0-100. A score of 85+ should be strong enough for preview, but V2 lessons still enter PENDING_REVIEW later.",
    ].join("\n"),
    input: [
      {
        role: "user",
        content: JSON.stringify({
          validationIssues,
          lesson,
        }),
      },
    ],
    text: { format: zodTextFormat(lessonV2CriticResultSchema, "lesson_v2_critic") },
  });
  return lessonV2CriticResultSchema.parse(response.output_parsed);
}
