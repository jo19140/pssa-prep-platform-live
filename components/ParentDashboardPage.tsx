"use client";

import { useMemo, useState } from "react";
import type { ActiveProduct } from "@/lib/entitlements";
import type { ParentDashboardViewChild, ParentDashboardViewData } from "@/lib/parent/parentDashboardViewModel";
import { normalizeTipKey, parentHelpTipForKey } from "@/lib/content/parentHelpTips";
import { parentFriendlyGrowth, parentFriendlyPerformanceLevel } from "@/lib/parentFriendlyText";
import { normalizeActiveProduct } from "@/components/synesis/ProductSwitcher";

export function ParentDashboardPage({
  initialData,
  activeProduct,
}: {
  initialData: ParentDashboardViewData;
  activeProduct?: string | null;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const normalizedActiveProduct = normalizeActiveProduct(activeProduct);
  const visibleChildren = useMemo(
    () => childrenForProduct(initialData.children, normalizedActiveProduct),
    [initialData.children, normalizedActiveProduct],
  );
  const selectedChild = visibleChildren.find((child) => child.studentId === selectedStudentId) || visibleChildren[0];

  if (!initialData.children.length) {
    return <EmptyState message="No students are linked to this parent account yet." />;
  }
  if (!initialData.products.length) {
    return <EmptyState message="No active Sý Learning products yet." />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Parent dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Learning overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Follow your child&apos;s standards practice, reading support, and recent progress from one place.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {initialData.parent.childCount} linked {initialData.parent.childCount === 1 ? "student" : "students"}
          </div>
        </div>
      </section>

      {visibleChildren.length > 1 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700" htmlFor="parent-dashboard-student">
            Student
          </label>
          <select
            id="parent-dashboard-student"
            value={selectedChild?.studentId ?? ""}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {visibleChildren.map((child) => (
              <option key={child.studentId} value={child.studentId}>
                {child.studentName} {child.grade == null ? "" : `(Grade ${child.grade})`}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {!visibleChildren.length ? (
        <EmptyState message="No students are enrolled in this product yet." />
      ) : selectedChild ? (
        <>
          <Hero child={selectedChild} activeProduct={normalizedActiveProduct} />
          <ProductCards child={selectedChild} />
          <HelpAtHome child={selectedChild} activeProduct={normalizedActiveProduct} />
          <SkillSnapshot child={selectedChild} activeProduct={normalizedActiveProduct} />
          <Actions />
        </>
      ) : null}
    </div>
  );
}

function Hero({ child, activeProduct }: { child: ParentDashboardViewChild; activeProduct: ActiveProduct }) {
  const stateTrackAvailable = child.availability.stateTrack === "ok";
  const readingBuddyAvailable = child.availability.readingBuddy === "ok";
  const heroProduct = activeProduct === "all" ? (stateTrackHasResult(child) ? "state_track" : "reading_buddy") : activeProduct;

  if (heroProduct === "state_track") {
    if (child.availability.stateTrack === "not_entitled") return <HeroShell title="State Track" body="This student is not enrolled in State Track yet." />;
    if (child.availability.stateTrack === "unavailable") return <HeroShell title="State Track" body="State Track results are temporarily unavailable." />;
    if (!stateTrackAvailable || !stateTrackHasResult(child)) return <HeroShell title="State Track" body="No completed State Track result is available yet." />;
    return (
      <HeroShell
        title="State Track"
        body={child.performanceBand ? parentFriendlyPerformanceLevel(child.performanceBand) : "Recent standards practice is ready to review."}
        meta={child.latestAssessment ?? undefined}
        chip={stateTrackGrowthChip(child)}
      />
    );
  }

  if (child.availability.readingBuddy === "not_entitled") return <HeroShell title="Reading Buddy" body="This student is not enrolled in Reading Buddy yet." />;
  if (child.availability.readingBuddy === "unavailable") return <HeroShell title="Reading Buddy" body="Reading Buddy details are temporarily unavailable." />;
  if (!readingBuddyAvailable) return <HeroShell title="Reading Buddy" body="Reading Buddy is ready when this student begins literacy practice." />;

  const focus = readingBuddyFocus(child);
  return (
    <HeroShell
      title="Reading Buddy"
      body={focus ? `${focus.label} is the current reading focus.` : "Reading Buddy is ready for the next literacy practice step."}
      meta={focus?.level ? `${focus.level} evidence` : undefined}
    />
  );
}

function HeroShell({ title, body, meta, chip }: { title: string; body: string; meta?: string; chip?: string | null }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{body}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {meta ? <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{meta}</span> : null}
        {chip ? <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{chip}</span> : null}
      </div>
    </section>
  );
}

function ProductCards({ child }: { child: ParentDashboardViewChild }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Metric title="State Track" value={availabilityLabel(child.availability.stateTrack)} />
      <Metric title="Reading Buddy" value={availabilityLabel(child.availability.readingBuddy)} />
    </section>
  );
}

function HelpAtHome({ child, activeProduct }: { child: ParentDashboardViewChild; activeProduct: ActiveProduct }) {
  const tips = helpTips(child, activeProduct);
  if (!tips.length) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">How you can help at home</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {tips.map((tip) => (
          <article key={tip.key} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">{tip.plainExplanation}</h3>
            <p className="mt-2 text-sm text-slate-700">{tip.atHomeAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SkillSnapshot({ child, activeProduct }: { child: ParentDashboardViewChild; activeProduct: ActiveProduct }) {
  return (
    <section className="space-y-5">
      {activeProduct === "all" || activeProduct === "state_track" ? <StateTrackSection child={child} /> : null}
      {activeProduct === "all" || activeProduct === "reading_buddy" ? <ReadingBuddySection child={child} /> : null}
    </section>
  );
}

function StateTrackSection({ child }: { child: ParentDashboardViewChild }) {
  if (child.availability.stateTrack === "not_entitled") return null;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Latest Score" value={child.latestScore != null ? `${child.latestScore}%` : "N/A"} />
        <Metric title="Performance Level" value={child.performanceBand ? parentFriendlyPerformanceLevel(child.performanceBand) : "N/A"} />
        <Metric title="Growth" value={growthMetric(child.growth)} />
        <Metric title="Latest Assessment" value={child.latestAssessment ?? "N/A"} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Standards Mastery</h2>
        {child.availability.stateTrack === "unavailable" ? (
          <p className="mt-3 text-sm text-slate-600">State Track results are temporarily unavailable.</p>
        ) : child.standardsMastery.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Standard</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3 pr-4">Level</th>
                </tr>
              </thead>
              <tbody>
                {child.standardsMastery.map((row: any) => (
                  <tr key={row.standardCode} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{row.standardCode}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.standardLabel}</td>
                    <td className="py-3 pr-4 text-slate-700">{finiteNumber(row.percentScore) ? `${row.percentScore}%` : "N/A"}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.performanceBand ? parentFriendlyPerformanceLevel(row.performanceBand) : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No completed State Track assessment is available yet.</p>
        )}
      </section>
    </section>
  );
}

function ReadingBuddySection({ child }: { child: ParentDashboardViewChild }) {
  if (child.availability.readingBuddy === "not_entitled") return null;

  const profile = child.readingBuddy as any;
  const strandScores = Array.isArray(profile?.strandScores) ? profile.strandScores : [];
  const focus = readingBuddyFocus(child);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Reading Buddy</h2>
      {child.availability.readingBuddy === "unavailable" ? (
        <p className="mt-3 text-sm text-slate-600">Reading Buddy details are temporarily unavailable.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Metric title="Current Focus" value={focus?.label ?? "Ready to begin"} />
          <Metric title="Evidence Level" value={focus?.level ?? "N/A"} />
          <Metric title="Recent Voice Sessions" value={String(Array.isArray(profile?.voiceSessions) ? profile.voiceSessions.length : 0)} />
        </div>
      )}
      {strandScores.length ? (
        <div className="mt-4 grid gap-2">
          {strandScores.slice(0, 3).map((strand: any) => (
            <div key={strand.strand} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">{titleCase(String(strand.strand).replace(/_/g, " "))}</span>
              {strand.level ? <span className="ml-2 text-slate-500">{titleCase(String(strand.level).replace(/_/g, " "))}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Actions() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
          Message teacher · Coming soon
        </button>
        <button type="button" disabled className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
          Email me this summary · Coming soon
        </button>
      </div>
    </section>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-950">Parent Portal</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </section>
  );
}

function childrenForProduct(children: ParentDashboardViewChild[], activeProduct: ActiveProduct) {
  if (activeProduct === "all") return children;
  return children.filter((child) => child.entitlements.some((product) => product.id === activeProduct));
}

function helpTips(child: ParentDashboardViewChild, activeProduct: ActiveProduct) {
  const candidates: Array<{ key: string | null; source: string }> = [];
  if ((activeProduct === "all" || activeProduct === "state_track") && child.availability.stateTrack === "ok") {
    const weakest = weakestStateTrackRows(child).slice(0, activeProduct === "state_track" ? 2 : 1);
    for (const row of weakest) {
      const stateTrackRow = row as { standardCode?: string; standardLabel?: string };
      candidates.push({
        key: normalizeTipKey(stateTrackRow.standardCode) ?? normalizeTipKey(stateTrackRow.standardLabel),
        source: stateTrackRow.standardCode ?? "state_track",
      });
    }
  }
  if ((activeProduct === "all" || activeProduct === "reading_buddy") && child.availability.readingBuddy === "ok") {
    const focus = readingBuddyFocus(child);
    if (focus) candidates.push({ key: normalizeTipKey(focus.key), source: focus.key });
    if (activeProduct === "reading_buddy") {
      for (const extra of readingBuddyFocusRows(child).slice(1, 2)) candidates.push({ key: normalizeTipKey(extra.key), source: extra.key });
    }
  }

  const seen = new Set<string>();
  return candidates
    .map((candidate) => {
      const key = candidate.key ?? `generic:${candidate.source}`;
      return { key, ...parentHelpTipForKey(candidate.key) };
    })
    .filter((tip) => {
      if (seen.has(tip.key)) return false;
      seen.add(tip.key);
      return true;
    })
    .slice(0, 2);
}

function weakestStateTrackRows(child: ParentDashboardViewChild) {
  return [...child.standardsMastery]
    .filter((row: any) => finiteNumber(row.percentScore))
    .sort((a: any, b: any) => a.percentScore - b.percentScore || String(a.standardCode || "").localeCompare(String(b.standardCode || "")));
}

function readingBuddyFocus(child: ParentDashboardViewChild) {
  return readingBuddyFocusRows(child)[0] ?? null;
}

function readingBuddyFocusRows(child: ParentDashboardViewChild) {
  const profile = child.readingBuddy as any;
  const strandScores = Array.isArray(profile?.strandScores) ? profile.strandScores : [];
  return strandScores.map((strand: any) => ({
    key: String(strand.strand || ""),
    label: titleCase(String(strand.strand || "reading").replace(/_/g, " ")),
    level: strand.level ? titleCase(String(strand.level).replace(/_/g, " ")) : null,
  }));
}

function stateTrackHasResult(child: ParentDashboardViewChild) {
  return child.latestScore != null || child.latestAssessment != null || child.standardsMastery.length > 0;
}

function stateTrackGrowthChip(child: ParentDashboardViewChild) {
  const points = growthPoints(child.growth);
  if (!finiteNumber(child.latestScore) || !finiteNumber(points)) return null;
  const previous = child.latestScore - points;
  if (points > 0 && finiteNumber(previous)) return `up from ${previous}%`;
  if (points <= 0) return parentFriendlyGrowth(points);
  return null;
}

function availabilityLabel(value: ParentDashboardViewChild["availability"]["stateTrack"]) {
  if (value === "ok") return "Available";
  if (value === "unavailable") return "Temporarily unavailable";
  return "Not enrolled";
}

function growthMetric(growth: unknown) {
  const points = growthPoints(growth);
  if (points == null) return "N/A";
  return `${points >= 0 ? "+" : ""}${points}`;
}

function growthPoints(growth: unknown): number | null {
  if (!growth || typeof growth !== "object" || !("growthPoints" in growth)) return null;
  const value = (growth as { growthPoints?: unknown }).growthPoints;
  return typeof value === "number" ? value : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
