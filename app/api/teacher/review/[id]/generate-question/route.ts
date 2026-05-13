import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { practiceSectionToSectionType, validatePracticeQuestion } from "@/lib/lessonReview";

const schema = z.object({
  practiceSection: z.enum(["GUIDED", "INDEPENDENT", "EXIT_TICKET", "MASTERY_CHECK"]),
  topicHint: z.string().trim().min(3).max(300),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;
  const review = await db.lessonReview.findUnique({ where: { id }, include: { lessonCache: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Create one student-safe ELA practice question. Return only JSON with question, choices, correctAnswer, explanation, optional passage, and optional coachHint. correctAnswer must exactly match one choice." },
        { role: "user", content: JSON.stringify({ section: parsed.data.practiceSection, topicHint: parsed.data.topicHint, metadata: review.lessonCache }) },
      ],
    });
    const question = validatePracticeQuestion(JSON.parse(completion.choices[0]?.message?.content || "{}"));
    const moderation = await openai.moderations.create({ input: [JSON.stringify(question)] });
    if (moderation.results.some((item) => item.flagged)) return NextResponse.json({ error: "Generated question was flagged by moderation." }, { status: 400 });
    const instruction = await db.aiEditInstruction.create({
      data: {
        lessonReviewId: id,
        sectionType: "NEW_PRACTICE_QUESTION",
        instructionText: `Generate ${parsed.data.practiceSection} question: ${parsed.data.topicHint}`,
        originalContent: { practiceSection: parsed.data.practiceSection } as Prisma.InputJsonValue,
        revisedContent: { practiceSection: parsed.data.practiceSection, question } as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ instruction, question });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Question generation failed." }, { status: 400 });
  }
}
