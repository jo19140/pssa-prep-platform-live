"use client";

import { useState } from "react";
import type { ClassMisconceptionLabel, ClassReport } from "@/lib/content/pssaClassReport";

type LessonSuggestionCandidate = {
  lessonId: string;
  title: string;
  skill: string;
};

type AssignState = Record<string, {
  status: "submitting" | "success" | "error";
  message: string;
}>;

type AssignRequest = {
  groupId: string;
  lessonId: string;
  dueDate: string;
  studentProfileIds: string[];
};

export function TeacherPssaInsightsPanel({
  report,
  className,
  lessonSuggestions = {},
  suggestionsUnavailable = false,
  assignState = {},
  onAssign,
}: {
  report: ClassReport;
  className?: string;
  lessonSuggestions?: Record<string, LessonSuggestionCandidate[]>;
  suggestionsUnavailable?: boolean;
  assignState?: AssignState;
  onAssign?: (request: AssignRequest) => void | Promise<void>;
}) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [selectedLessonByGroup, setSelectedLessonByGroup] = useState<Record<string, string>>({});
  const [dueDateByGroup, setDueDateByGroup] = useState<Record<string, string>>({});

  if (report.completedStudents === 0) {
    return (
      <section className="rounded-lg border border-orange-100 bg-white p-6 shadow-sm">
        <Header report={report} className={className} />
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          No students have completed this benchmark yet.
        </div>
      </section>
    );
  }

  const actionableRows = report.misconceptionMap.filter((row) => row.classLabel !== "below_threshold");

  return (
    <section className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
      <Header report={report} className={className} />
      {report.topClassInsight ? (
        <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-950">
          {report.topClassInsight}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MetricCard value={`${report.completedStudents}/${report.assignedStudents}`} label="Benchmark completed" />
        <MetricCard value={report.medianOperationalScore == null ? "—" : `${report.medianOperationalScore}/45`} label="Class median score" />
        <MetricCard value={String(report.incompleteStudents)} label="Not completed" />
        <MetricCard value={report.topPriorityCluster ?? "—"} label="Priority cluster" compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Readiness band distribution">
        <BandPill tone="strong" label={`${report.bandDistribution.Strong} Strong`} />
        <BandPill tone="developing" label={`${report.bandDistribution.Developing} Developing`} />
        <BandPill tone="support" label={`${report.bandDistribution["Needs support"]} Needs support`} />
        <BandPill tone="incomplete" label={`${report.bandDistribution.Incomplete} Incomplete`} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Readiness bands are Sý Learning practice levels, not official PSSA proficiency labels.
      </p>
      {report.scoreStatusCounts.provisional > 0 ? (
        <p className="mt-2 text-xs font-medium text-orange-700">
          {report.scoreStatusCounts.provisional} provisional awaiting hand-scoring.
        </p>
      ) : null}

      <div className="mt-7">
        <SectionLabel>Skill clusters</SectionLabel>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.clusterResults.map((cluster) => <ClusterBar key={cluster.cluster} cluster={cluster} />)}
        </div>
      </div>

      <div className="mt-7">
        <SectionLabel>Misconception map</SectionLabel>
        <div className="mt-3 space-y-3">
          {actionableRows.length ? actionableRows.map((row) => (
            <article key={`${row.cluster}:${row.roleFamily}`} className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-950">{row.cluster}</span>
                <Badge label={labelFor(row.classLabel)} />
                <span className="text-xs text-slate-500">{row.studentsAffected} students · {row.sharePct}% · {row.totalResponses} responses</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{row.interpretation}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{row.recommendedAction}</p>
              {row.recommendedSkill ? <p className="mt-1 text-xs text-slate-500">Skill: {row.recommendedSkill}</p> : null}
            </article>
          )) : (
            <EmptyLine>Not enough repeated patterns yet.</EmptyLine>
          )}
        </div>
      </div>

      <div className="mt-7">
        <SectionLabel>Suggested groups</SectionLabel>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {report.suggestedGroups.length ? report.suggestedGroups.map((group) => (
            <article key={group.groupId} className="rounded-md border border-orange-100 bg-orange-50/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{group.label}</h3>
                  <p className="mt-1 text-xs text-slate-600">{group.studentIds.length} students · {group.cluster} · {formatRole(group.roleFamily)}</p>
                </div>
                {(() => {
                  const candidates = lessonSuggestions[group.groupId] ?? [];
                  const selectedLessonId = selectedLessonByGroup[group.groupId] ?? candidates[0]?.lessonId ?? "";
                  const dueDate = dueDateByGroup[group.groupId] ?? "";
                  const groupAssignState = assignState[group.groupId];
                  const assignDisabled = suggestionsUnavailable || candidates.length === 0 || groupAssignState?.status === "submitting";
                  return (
                    <div className="min-w-[180px] text-right">
                      <button
                        type="button"
                        disabled={assignDisabled}
                        className="rounded-md border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setOpenGroupId((current) => current === group.groupId ? null : group.groupId)}
                      >
                        {openGroupId === group.groupId ? "Close" : "Assign"}
                      </button>
                      {suggestionsUnavailable ? (
                        <p className="mt-2 text-left text-xs font-medium text-orange-700">Lesson suggestions unavailable — refresh and try again.</p>
                      ) : candidates[0] ? (
                        <p className="mt-2 text-left text-xs text-slate-600">Recommended: <span className="font-semibold text-slate-800">{candidates[0].title}</span></p>
                      ) : (
                        <p className="mt-2 text-left text-xs text-slate-500">No eligible lesson yet</p>
                      )}
                      {openGroupId === group.groupId && candidates.length > 0 ? (
                        <form
                          className="mt-3 space-y-2 rounded-md border border-orange-100 bg-white p-3 text-left"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!selectedLessonId || !dueDate || !onAssign) return;
                            void onAssign({
                              groupId: group.groupId,
                              lessonId: selectedLessonId,
                              dueDate,
                              studentProfileIds: group.studentIds,
                            });
                          }}
                        >
                          <label className="block text-xs font-semibold text-slate-700">
                            Lesson
                            <select
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                              value={selectedLessonId}
                              onChange={(event) => setSelectedLessonByGroup((current) => ({ ...current, [group.groupId]: event.target.value }))}
                            >
                              {candidates.map((candidate) => (
                                <option key={candidate.lessonId} value={candidate.lessonId}>{candidate.title}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs font-semibold text-slate-700">
                            Due date
                            <input
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                              type="date"
                              value={dueDate}
                              required
                              onChange={(event) => setDueDateByGroup((current) => ({ ...current, [group.groupId]: event.target.value }))}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={!selectedLessonId || !dueDate || groupAssignState?.status === "submitting"}
                            className="w-full rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {groupAssignState?.status === "submitting" ? "Assigning..." : `Assign to ${group.studentIds.length} students`}
                          </button>
                        </form>
                      ) : null}
                      {groupAssignState ? (
                        <p className={`mt-2 text-left text-xs font-medium ${groupAssignState.status === "error" ? "text-red-700" : groupAssignState.status === "success" ? "text-emerald-700" : "text-orange-700"}`}>
                          {groupAssignState.message}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              <p className="mt-3 text-sm text-slate-800">{group.recommendedAction}</p>
              {group.recommendedSkill ? <p className="mt-1 text-xs text-slate-500">Skill: {group.recommendedSkill}</p> : null}
            </article>
          )) : (
            <EmptyLine>No suggested groups yet.</EmptyLine>
          )}
        </div>
      </div>
    </section>
  );
}

function Header({ report, className }: { report: ClassReport; className?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">State test prep · Grade 3 ELA</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">Diagnostic Insights — {report.benchmarkSeason} PSSA Benchmark · Grade 3 ELA</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Scores are teacher-facing only; students never see a score.
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Readiness bands are Sý Learning practice levels, not official PSSA proficiency labels.
        </p>
      </div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {className ?? "Class"} · {report.formVersion ?? report.formId}
      </div>
    </div>
  );
}

function MetricCard({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className={`${compact ? "text-xl" : "text-3xl"} font-semibold text-slate-950`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function ClusterBar({ cluster }: { cluster: ClassReport["clusterResults"][number] }) {
  const percent = cluster.classPercent == null ? null : Math.round(cluster.classPercent * 100);
  const width = percent == null ? 0 : Math.max(4, Math.min(100, percent));
  const verdict = cluster.limitedEvidence ? "Limited evidence" : signalLabel(cluster.signal);
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{cluster.cluster}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cluster.limitedEvidence ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-700"}`}>
          {verdict}
        </span>
      </div>
      <div
        className="mt-3 h-3 rounded-full bg-slate-100"
        role="img"
        aria-label={`${cluster.cluster}: ${cluster.limitedEvidence ? "limited evidence" : `${percent}% class performance`}; ${cluster.usableStudents} of ${cluster.completedStudents} measurable; ${cluster.studentsNeedingSupport} students needing support`}
      >
        {!cluster.limitedEvidence ? <div className="h-3 rounded-full bg-orange-500" style={{ width: `${width}%` }} /> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">{cluster.limitedEvidence || percent == null ? "—" : `${percent}%`}</span>
        <span className="text-xs text-slate-500">{cluster.usableStudents} of {cluster.completedStudents} measurable</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{cluster.studentsNeedingSupport} students needing support</p>
    </article>
  );
}

function BandPill({ label, tone }: { label: string; tone: "strong" | "developing" | "support" | "incomplete" }) {
  const styles = {
    strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    developing: "bg-orange-50 text-orange-700 ring-orange-200",
    support: "bg-rose-50 text-rose-700 ring-rose-200",
    incomplete: "bg-slate-100 text-slate-600 ring-slate-200",
  }[tone];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles}`}>{label}</span>;
}

function Badge({ label }: { label: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{label}</span>;
}

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</h3>;
}

function EmptyLine({ children }: { children: string }) {
  return <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{children}</div>;
}

function labelFor(label: ClassMisconceptionLabel) {
  return label.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function signalLabel(signal: string) {
  if (signal === "needs_support") return "Needs support";
  if (signal === "limited_evidence") return "Limited evidence";
  return signal[0].toUpperCase() + signal.slice(1);
}

function formatRole(role: string) {
  return role.replace(/_/g, " ");
}
