import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateTestSchema = z.object({
  gradeLevel: z.coerce.number().int().min(3).max(8),
  standard: z.string().trim().min(1).max(80),
  skill: z.string().trim().min(1).max(80),
  textType: z.string().trim().max(80).optional().default("ELA"),
  topic: z.string().trim().max(120).optional(),
  passage: z.string().trim().max(8000).optional(),
  mcCount: z.coerce.number().int().min(0).max(20).optional().default(5),
  includeEBSR: z.coerce.boolean().optional().default(false),
  includeTE: z.coerce.boolean().optional().default(false),
  includeVocab: z.coerce.boolean().optional().default(false),
  includeTDA: z.coerce.boolean().optional().default(false),
  passageLength: z.coerce.number().int().min(150).max(2000).optional().default(600),
  difficulty: z.string().trim().max(40).optional().default("grade-level"),
  genre: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ip = getClientIp(req);
    const userId = String((session.user as any).id || "unknown");
    const userLimit = consumeRateLimit({ key: `generate-test:user:${userId}`, capacity: 10, refillIntervalMs: 60 * 60 * 1000 });
    const ipLimit = consumeRateLimit({ key: `generate-test:ip:${ip}`, capacity: 30, refillIntervalMs: 60 * 60 * 1000 });
    if (!userLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many generated-test requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.max(userLimit.retryAfterSec, ipLimit.retryAfterSec)) } },
      );
    }

    const {
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
    } = generateTestSchema.parse(await req.json());

    const passageInstruction = passage
      ? `Use this passage:\n${passage}`
      : `Create an original ${passageLength || "600"} word ${gradeLevel} grade ${genre || textType} passage aligned to ${standard} and ${skill}.`;

    const prompt = `
Create a complete PSSA-style ELA assessment.

Grade: ${gradeLevel}
Standard: ${standard}
Skill: ${skill}
Text Type: ${textType}
Genre: ${genre}
Difficulty: ${difficulty}
Topic: ${topic || "teacher-selected topic"}

${passageInstruction}

Question Settings:
- Multiple-choice questions: ${mcCount || "5"}
- Include EBSR: ${includeEBSR ? "Yes" : "No"}
- Include Technology-Enhanced item: ${includeTE ? "Yes" : "No"}
- Include Vocabulary-in-Context: ${includeVocab ? "Yes" : "No"}
- Include TDA: ${includeTDA ? "Yes" : "No"}

Include:
1. Reading Passage with title
2. Multiple-choice questions
3. EBSR only if selected
4. Technology-enhanced question only if selected
5. Vocabulary question only if selected
6. TDA prompt and 4-point rubric only if selected
7. Answer key
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Pennsylvania PSSA ELA assessment writer. Create original content only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return NextResponse.json({
      result: response.choices[0].message.content,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", issues: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error("AI ERROR FULL:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown AI error" },
      { status: 500 }
    );
  }
}
