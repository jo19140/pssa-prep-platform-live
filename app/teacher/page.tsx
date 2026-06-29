import Link from "next/link";
import { Suspense } from "react";
import { TeacherPssaInsightsClient } from "@/components/pssa/TeacherPssaInsightsClient";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { TeacherProductWorkspaceSwitcher } from "@/components/synesis/TeacherProductWorkspaceSwitcher";
import { TeacherAssignmentsTab } from "@/components/teacher/TeacherAssignmentsTab";
import { TeacherClassesTab } from "@/components/teacher/TeacherClassesTab";
import { TeacherGradingTab } from "@/components/teacher/TeacherGradingTab";
import { TeacherLessonsTab } from "@/components/teacher/TeacherLessonsTab";
import { TeacherResourcesPanel } from "@/components/TeacherResourcesPanel";
import { loadCurrentTeacherProducts } from "@/lib/teacher/loadCurrentTeacherProducts";

const STATE_TRACK_TABS = ["classes", "lessons", "assignments", "reports", "grading", "resources"] as const;
type StateTrackTab = typeof STATE_TRACK_TABS[number];

export default async function TeacherPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const products = await loadCurrentTeacherProducts();
  const resolvedSearchParams = await searchParams;
  const activeTab = normalizeStateTrackTab(firstValue(resolvedSearchParams?.tab));

  return (
    <SynesisPageShell
      roles={["TEACHER"]}
      variant="product"
      homeHref="/teacher"
      productNavigation={<TeacherProductWorkspaceSwitcher products={products} activeProduct="state_track" />}
    >
      <main className="p-6">
        <section className="mx-auto max-w-7xl space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State Track</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Teacher workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review diagnostic reports and manage your classes, lessons, assignments, grading, and resources.
            </p>
          </div>

          <nav aria-label="State Track sections" className="flex flex-wrap gap-2">
            {STATE_TRACK_TABS.map((tab) => {
              const label = tabLabel(tab);
              const active = activeTab === tab;
              return (
                <Link
                  key={tab}
                  href={hrefForTab(resolvedSearchParams, tab)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {activeTab === "classes" ? (
            <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading classes...</div>}>
              <TeacherClassesTab />
            </Suspense>
          ) : activeTab === "reports" ? (
            <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading diagnostic insights...</div>}>
              <TeacherPssaInsightsClient />
            </Suspense>
          ) : activeTab === "lessons" ? (
            <TeacherLessonsTab />
          ) : activeTab === "assignments" ? (
            <TeacherAssignmentsTab />
          ) : activeTab === "grading" ? (
            <TeacherGradingTab />
          ) : activeTab === "resources" ? (
            <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading resources...</div>}>
              <TeacherResourcesPanel />
            </Suspense>
          ) : null}
        </section>
      </main>
    </SynesisPageShell>
  );
}

function normalizeStateTrackTab(raw: string | null | undefined): StateTrackTab {
  return STATE_TRACK_TABS.includes(raw as StateTrackTab) ? raw as StateTrackTab : "reports";
}

function hrefForTab(searchParams: Record<string, string | string[] | undefined> | undefined, tab: StateTrackTab) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key === "tab" || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  params.set("tab", tab);
  return `/teacher?${params.toString()}`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function tabLabel(tab: StateTrackTab) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}
