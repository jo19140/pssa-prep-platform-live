import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  gradeLevel: z.coerce.number().int().min(3).max(8).optional(),
  standardCode: z.string().trim().max(80).optional(),
  skill: z.string().trim().max(160).optional(),
  search: z.string().trim().max(160).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { page, gradeLevel, standardCode, skill, search } = parsed.data;
  const take = 25;
  const where: any = {
    status: "PENDING",
    lessonCache: {
      ...(gradeLevel ? { gradeLevel } : {}),
      ...(standardCode ? { standardCode: { contains: standardCode, mode: "insensitive" } } : {}),
      ...(skill ? { skill: { contains: skill, mode: "insensitive" } } : {}),
      ...(search ? { OR: [{ skill: { contains: search, mode: "insensitive" } }, { standardCode: { contains: search, mode: "insensitive" } }, { commonError: { contains: search, mode: "insensitive" } }] } : {}),
    },
  };
  const [total, reviews] = await Promise.all([
    db.lessonReview.count({ where }),
    db.lessonReview.findMany({
      where,
      include: { lessonCache: true },
      orderBy: [{ lessonCache: { hitCount: "desc" } }, { createdAt: "asc" }],
      take,
      skip: (page - 1) * take,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize: take,
    pending: total,
    reviews: reviews.map((review) => ({
      id: review.id,
      cacheKey: review.lessonCache?.cacheKey,
      gradeLevel: review.lessonCache?.gradeLevel,
      standardCode: review.lessonCache?.standardCode,
      skill: review.lessonCache?.skill,
      commonError: review.lessonCache?.commonError,
      createdAt: review.createdAt,
      hitCount: review.lessonCache?.hitCount || 0,
      reviewerNotes: review.reviewerNotes,
    })),
  });
}
