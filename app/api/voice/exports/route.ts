import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const batches = await db.trainingCorpusBatch.findMany({ orderBy: { exportedAt: "desc" }, take: 25 });
  return NextResponse.json({ batches });
}
