import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { assessEssayValidity, gradeTdaEssay } from "@/lib/essayGrader";

const gradeEssayTestSchema = z.object({
  essay: z.string().trim().min(1).max(12000),
  prompt: z.string().trim().min(1).max(4000),
  passage: z.string().trim().max(20000).optional().default(""),
  gradeLevel: z.coerce.number().int().min(3).max(8).default(6),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = gradeEssayTestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });

  const data = parsed.data as { essay: string; prompt: string; passage: string; gradeLevel: number };
  const validity = assessEssayValidity(data);
  const result = await gradeTdaEssay({
    essay: data.essay,
    prompt: data.prompt,
    passage: data.passage,
    gradeLevel: data.gradeLevel,
    rubric: "",
  });

  return NextResponse.json({ validity, result });
}
