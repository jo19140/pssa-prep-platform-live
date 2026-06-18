import type { EntitlementInput, Product } from "@/lib/entitlements";
import { childHasReadingBuddy, childHasStateTrack, resolveParentProducts, resolveProducts } from "@/lib/entitlements";

export type SourceAvailability = "ok" | "not_entitled" | "unavailable";

export type ParentIdentity = {
  parentProfileId: string;
};

export type ParentDashboardLinkedChild = EntitlementInput & {
  studentProfileId: string;
  studentUserId: string;
  name: string | null;
  grade: number | null;
};

export type ParentDashboardChild<TStateTrack = unknown, TReadingBuddy = unknown> = {
  studentId: string;
  studentUserId: string;
  name: string;
  grade: number | null;
  entitlements: Product[];
  stateTrack?: TStateTrack | null;
  readingBuddy?: TReadingBuddy | null;
  availability: {
    stateTrack: SourceAvailability;
    readingBuddy: SourceAvailability;
  };
};

export type ParentDashboardLoadResult<TStateTrack = unknown, TReadingBuddy = unknown> =
  | {
      status: "ok";
      parent: { id: string; childCount: number };
      products: Product[];
      children: Array<ParentDashboardChild<TStateTrack, TReadingBuddy>>;
    }
  | { status: "parent_not_found" };

export type ParentDashboardLoaderDeps<TStateTrack, TReadingBuddy> = {
  loadParentIdentity: (userId: string) => Promise<ParentIdentity | null>;
  loadLinkedChildren: (parentProfileId: string) => Promise<readonly ParentDashboardLinkedChild[]>;
  loadStateTrack: (child: ParentDashboardLinkedChild) => Promise<TStateTrack>;
  loadReadingBuddy: (child: ParentDashboardLinkedChild) => Promise<TReadingBuddy>;
};

export function createParentDashboardLoader<TStateTrack = unknown, TReadingBuddy = unknown>({
  loadParentIdentity,
  loadLinkedChildren,
  loadStateTrack,
  loadReadingBuddy,
}: ParentDashboardLoaderDeps<TStateTrack, TReadingBuddy>) {
  return async function loadParentDashboard(userId: string): Promise<ParentDashboardLoadResult<TStateTrack, TReadingBuddy>> {
    const parentIdentity = await loadParentIdentity(userId);
    if (!parentIdentity) return { status: "parent_not_found" };

    const linkedChildren = dedupeChildren(await loadLinkedChildren(parentIdentity.parentProfileId));
    const children = await Promise.all(
      linkedChildren.map(async (child) => {
        const entitlements = resolveProducts(child);
        const stateTrackEntitled = childHasStateTrack(child);
        const readingBuddyEntitled = childHasReadingBuddy(child);
        const dashboardChild: ParentDashboardChild<TStateTrack, TReadingBuddy> = {
          studentId: child.studentProfileId,
          studentUserId: child.studentUserId,
          name: child.name?.trim() || "Student",
          grade: child.grade,
          entitlements,
          availability: {
            stateTrack: stateTrackEntitled ? "ok" : "not_entitled",
            readingBuddy: readingBuddyEntitled ? "ok" : "not_entitled",
          },
        };

        if (stateTrackEntitled) {
          try {
            dashboardChild.stateTrack = await loadStateTrack(child);
          } catch {
            dashboardChild.stateTrack = null;
            dashboardChild.availability.stateTrack = "unavailable";
          }
        }

        if (readingBuddyEntitled) {
          try {
            dashboardChild.readingBuddy = await loadReadingBuddy(child);
          } catch {
            dashboardChild.readingBuddy = null;
            dashboardChild.availability.readingBuddy = "unavailable";
          }
        }

        return dashboardChild;
      }),
    );

    children.sort(compareChildren);

    return {
      status: "ok",
      parent: { id: parentIdentity.parentProfileId, childCount: children.length },
      products: resolveParentProducts(linkedChildren),
      children,
    };
  };
}

function dedupeChildren(children: readonly ParentDashboardLinkedChild[]): ParentDashboardLinkedChild[] {
  const byStudentProfileId = new Map<string, ParentDashboardLinkedChild>();
  for (const child of children) {
    if (!byStudentProfileId.has(child.studentProfileId)) byStudentProfileId.set(child.studentProfileId, child);
  }
  return [...byStudentProfileId.values()];
}

function compareChildren(a: ParentDashboardChild, b: ParentDashboardChild): number {
  const nameCompare = normalizeName(a.name).localeCompare(normalizeName(b.name));
  if (nameCompare !== 0) return nameCompare;
  return a.studentId.localeCompare(b.studentId);
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}
