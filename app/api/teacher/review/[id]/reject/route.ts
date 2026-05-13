import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rejectLessonReview } from "@/lib/lessonReviewWorkflow";

const schema = z.object({ reviewerNotes: z.string().trim().min(30).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { id } = await params;
  try {
    return NextResponse.json(await rejectLessonReview(id, (session.user as any).id, parsed.data.reviewerNotes));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reject failed." }, { status: 400 });
  }
}
