import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSection, normalizeReviewContent, TEXT_SECTION_TYPES, validateSectionContent } from "@/lib/lessonReview";

const schema = z.object({
  sectionType: z.string().trim().max(80),
  sectionIndex: z.number().int().min(0).optional(),
  instructionText: z.string().trim().min(10).max(500),
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
  const review = await db.lessonReview.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  const content = normalizeReviewContent(review.currentContent || review.aiOriginalContent);
  const original = getSection(content, parsed.data.sectionType, parsed.data.sectionIndex);
  if (original == null) return NextResponse.json({ error: "Section not found." }, { status: 404 });
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_LESSON_MODEL || process.env.OPENAI_LEARNING_PATH_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You revise one section of an ELA lesson. Return only JSON with a revised field in the same JSON shape as the original section. Do not change other sections." },
        { role: "user", content: JSON.stringify({ teacherInstruction: parsed.data.instructionText, originalSection: original }) },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const candidate = raw.revised ?? raw;
    const revised = validateSectionContent(parsed.data.sectionType, normalizeAiRevisionCandidate(parsed.data.sectionType, candidate));
    const moderation = await openai.moderations.create({ input: [JSON.stringify(revised)] });
    if (moderation.results.some((item) => item.flagged)) return NextResponse.json({ error: "AI revision was flagged by moderation." }, { status: 400 });
    const instruction = await db.aiEditInstruction.create({
      data: {
        lessonReviewId: id,
        sectionType: parsed.data.sectionType,
        sectionIndex: parsed.data.sectionIndex,
        instructionText: parsed.data.instructionText,
        originalContent: original as Prisma.InputJsonValue,
        revisedContent: revised as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ instruction, revisedContent: revised });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI revision failed." }, { status: 400 });
  }
}

function normalizeAiRevisionCandidate(sectionType: string, candidate: unknown) {
  if (!TEXT_SECTION_TYPES.has(sectionType)) return candidate;
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object") {
    const source = candidate as Record<string, any>;
    return source.text || source.content?.text || source.lessonExplanation || source.workedExample || source.retestRecommendation || JSON.stringify(candidate);
  }
  return candidate;
}
