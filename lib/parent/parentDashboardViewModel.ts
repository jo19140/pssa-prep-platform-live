import type { ParentDashboardLoadResult, ParentDashboardChild } from "@/lib/parent/parentDashboardLoaderCore";
import type { ParentDashboardStateTrackPayload } from "@/lib/parent/loadParentDashboard";

export type ParentDashboardViewData = {
  parent: { id: string; childCount: number };
  children: ParentDashboardViewChild[];
  products: ParentDashboardChild["entitlements"];
};

export type ParentDashboardViewChild = ParentDashboardStateTrackPayload & {
  products: ParentDashboardChild["entitlements"];
  entitlements: ParentDashboardChild["entitlements"];
  availability: ParentDashboardChild["availability"];
  readingBuddy: unknown;
};

export function toParentDashboardViewData(
  dashboard: Extract<ParentDashboardLoadResult<ParentDashboardStateTrackPayload, unknown>, { status: "ok" }>,
): ParentDashboardViewData {
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

  return { parent: dashboard.parent, children, products: dashboard.products };
}
