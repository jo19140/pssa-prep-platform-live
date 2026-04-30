import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
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
    } = await req.json();

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
    console.error("AI ERROR FULL:", error);
    return NextResponse.json(
      { error: error?.message || "Unknown AI error" },
      { status: 500 }
    );
  }
}