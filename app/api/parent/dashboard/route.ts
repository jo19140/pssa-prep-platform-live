import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadParentDashboard } from "@/lib/parent/loadParentDashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dashboard = await loadParentDashboard(String((session.user as any).id));
  if (dashboard.status === "parent_not_found") return NextResponse.json({ error: "Parent profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const children = dashboard.children.map((child) => {
    const stateTrack = child.stateTrack;
    return {
      studentId: stateTrack?.studentId ?? child.studentUserId,
      studentName: stateTrack?.studentName ?? child.name,
      grade: stateTrack?.grade ?? child.grade,
      latestAssessment: stateTrack?.latestAssessment ?? null,
      latestScore: stateTrack?.latestScore ?? null,
      performanceBand: stateTrack?.performanceBand ?? null,
      growth: stateTrack?.growth ?? null,
      standardsMastery: stateTrack?.standardsMastery ?? [],
      standardsGrowth: stateTrack?.standardsGrowth ?? [],
      sessionId: stateTrack?.sessionId ?? null,
      submittedAt: stateTrack?.submittedAt ?? null,
      products: child.entitlements,
      entitlements: child.entitlements,
      availability: child.availability,
      readingBuddy: child.readingBuddy ?? null,
    };
  });

  return NextResponse.json(
    { parent: dashboard.parent, children, products: dashboard.products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
