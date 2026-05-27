"use client";

import { useMemo, useState } from "react";

export function DiagnosticItemReviewWorkspace({ item }: { item: any }) {
  const firstLook = item.firstLookReviewModelDecision?.decisionJson || {};
  const [studentPromptJson, setStudentPromptJson] = useState(formatJson(item.studentPromptJson));
  const [stimulusJson, setStimulusJson] = useState(formatJson(item.stimulusJson));
  const [expectedResponseJson, setExpectedResponseJson] = useState(formatJson(item.expectedResponseJson));
  const [scoringRubricJson, setScoringRubricJson] = useState(formatJson(item.scoringRubricJson));
  const [adminReviewJson, setAdminReviewJson] = useState(formatJson(item.adminReviewJson));
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const studentPromptChanged = studentPromptJson !== formatJson(item.studentPromptJson);
  const stimulusChanged = stimulusJson !== formatJson(item.stimulusJson);
  const expectedResponseChanged = expectedResponseJson !== formatJson(item.expectedResponseJson);
  const rubricChanged = scoringRubricJson !== formatJson(item.scoringRubricJson);
  const adminReviewChanged = adminReviewJson !== formatJson(item.adminReviewJson);
  const hasEdits = studentPromptChanged || stimulusChanged || expectedResponseChanged || rubricChanged || adminReviewChanged;
  const recommendation = normalizeRecommendation(firstLook.recommendation);
  const checks = normalizeChecks(firstLook);
  const passedChecks = checks.filter((check) => check.result === "PASS");
  const failedChecks = checks.filter((check) => check.result === "FAIL");
  const checksNa = checks.filter((check) => check.result === "NA");
  const failedBlocker = failedChecks.some((check) => check.severity === "BLOCKER");
  const specificIssues = failedChecks.map((check) => ({
    severity: check.severity === "BLOCKER" ? "major" : check.severity === "WARNING" ? "moderate" : "minor",
    location: check.requirementId,
    description: check.evidence,
  }));
  const kidViewLintViolations = Array.isArray(firstLook.kidViewLintViolations) ? firstLook.kidViewLintViolations : [];
  const canReview = item.reviewStatus === "PENDING";
  const hasFirstLookDecision = Boolean(item.firstLookReviewModelDecisionId);

  const statusLine = useMemo(() => {
    if (!hasFirstLookDecision) return "Missing first-look ModelDecision. This item cannot be reviewed until the AI pre-read is attached.";
    if (!canReview) return `This item is already ${item.reviewStatus}.`;
    return "Human decision required. AI first-look is advisory only.";
  }, [canReview, hasFirstLookDecision, item.reviewStatus]);

  async function submit(action: "APPROVE" | "REJECT" | "EDIT") {
    setMessage("");
    setSubmitting(true);
    const body: Record<string, unknown> = { action, reviewNotes };
    if (action === "EDIT") {
      body.studentPromptJson = studentPromptJson;
      body.stimulusJson = stimulusJson;
      body.expectedResponseJson = expectedResponseJson;
      body.scoringRubricJson = scoringRubricJson || null;
      body.adminReviewJson = adminReviewJson;
    }
    const response = await fetch(`/api/admin/content/diagnostic-items/${item.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setMessage(json.error || "Review failed.");
      return;
    }
    setMessage(`Saved ${action.toLowerCase()} review.`);
    setTimeout(() => {
      window.location.href = "/admin/content/diagnostic-items/queue";
    }, 700);
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/admin/content/diagnostic-items/queue" className="text-sm font-bold text-indigo-700">
              Back to diagnostic queue
            </a>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {item.strand} · {item.itemType}
            </h1>
            <p className="text-sm text-slate-600">
              {item.dailyTarget?.code || "Phase diagnostic"} · Difficulty {item.difficultyBand} · Status {item.reviewStatus}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={recommendationPillClass(recommendation)}>{recommendation.replace(/_/g, " ")}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {recommendation === "APPROVE" ? "Auto-approval candidate" : "Human review required"}
            </span>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] sm:px-6 lg:px-8">
        <div className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">Candidate item</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Readonly label="Item type" value={item.itemType} />
              <Readonly label="Phase position" value={item.phasePosition?.name || "None"} />
            </div>
            <JsonEditor label="Student prompt JSON (kid-visible)" value={studentPromptJson} onChange={setStudentPromptJson} />
            <JsonEditor label="Stimulus JSON (kid-visible/heard)" value={stimulusJson} onChange={setStimulusJson} />
            <JsonEditor label="Expected response JSON (backend only)" value={expectedResponseJson} onChange={setExpectedResponseJson} />
            <JsonEditor label="Scoring rubric JSON" value={scoringRubricJson} onChange={setScoringRubricJson} />
            <JsonEditor label="Admin review JSON (reviewer only)" value={adminReviewJson} onChange={setAdminReviewJson} />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">Student preview</h2>
            <p className="mt-1 text-sm text-slate-600">Rendered from studentPromptJson and stimulusJson only.</p>
            <StudentPreview studentPrompt={item.studentPromptJson} stimulus={item.stimulusJson} />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">AI first-look review</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Checklist title="Checks passed" items={passedChecks} tone="emerald" />
              <Checklist title="Checks failed" items={failedChecks} tone="rose" />
            </div>
            <Checklist title="Checks not applicable / not assessed" items={checksNa} tone="slate" />

            {specificIssues.length ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-950">Specific issues</h3>
                <div className="mt-3 space-y-3">
                  {specificIssues.map((issue: any, index: number) => (
                    <article key={`${issue.location}-${index}`} className="rounded-md bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-700">{issue.severity || "moderate"}</span>
                        <span className="font-bold text-slate-950">{issue.location || "artifact"}</span>
                      </div>
                      <p className="mt-2 text-slate-700">{issue.description || "Review issue needs human inspection."}</p>
                      {issue.suggestedFix ? <p className="mt-2 text-slate-600">Suggested fix: {issue.suggestedFix}</p> : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <Checklist title="Kid-view lint violations" items={kidViewLintViolations} tone="amber" />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">Human decision</h2>
            <p className={`mt-2 text-sm font-semibold ${hasFirstLookDecision && canReview ? "text-slate-600" : "text-rose-700"}`}>{statusLine}</p>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Review notes
              <textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                className="mt-2 h-32 w-full rounded-md border border-slate-300 p-3 text-sm"
                placeholder="Briefly explain the human decision or the edits made."
              />
            </label>
            {message ? <p className="mt-3 rounded-md bg-indigo-50 p-3 text-sm font-semibold text-indigo-800">{message}</p> : null}
            <div className="mt-5 grid gap-2">
              <button
                onClick={() => submit("APPROVE")}
                disabled={!canReview || !hasFirstLookDecision || submitting || hasEdits || failedBlocker}
                title={failedBlocker ? "Blocker present — use Save edit or Reject." : undefined}
                className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve as-is
              </button>
              <button
                onClick={() => submit("EDIT")}
                disabled={!canReview || !hasFirstLookDecision || submitting || !hasEdits}
                className="rounded-md bg-indigo-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save edit decision
              </button>
              <button
                onClick={() => submit("REJECT")}
                disabled={!canReview || !hasFirstLookDecision || submitting}
                className="rounded-md bg-rose-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject item
              </button>
            </div>
            {hasEdits ? <p className="mt-3 text-xs font-semibold text-slate-500">Unsaved edits detected. Approve as-is is disabled until you save or revert them.</p> : null}
            {failedBlocker ? <p className="mt-3 text-xs font-semibold text-rose-700">Blocker present — use Save edit or Reject.</p> : null}
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">Raw first-look JSON</h2>
            <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{formatJson(firstLook)}</pre>
          </section>
        </aside>
      </section>
    </main>
  );
}

function JsonEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-4 block text-sm font-bold text-slate-700">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-72 w-full rounded-md border border-slate-300 p-3 font-mono text-xs" />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{value}</p>
    </div>
  );
}

type DisplayCheck = {
  requirementId: string;
  result: "PASS" | "FAIL" | "NA";
  severity: "BLOCKER" | "WARNING" | "INFO";
  evidence: string;
};

function Checklist({ title, items, tone }: { title: string; items: Array<string | DisplayCheck>; tone: "emerald" | "rose" | "amber" | "slate" }) {
  const toneClass = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50";
  return (
    <section className={`mt-4 rounded-md border p-4 ${toneClass}`}>
      <h3 className="font-black text-slate-950">{title}</h3>
      {!items.length ? <p className="mt-2 text-sm text-slate-500">None reported.</p> : null}
      <ul className="mt-2 space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>
            {typeof item === "string" ? item : (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900">{item.requirementId}</span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-700">{item.severity}</span>
                </div>
                <p className="mt-1">{item.evidence}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudentPreview({ studentPrompt, stimulus }: { studentPrompt: any; stimulus: any }) {
  const prompt = studentPrompt && typeof studentPrompt === "object" ? studentPrompt : {};
  const stim = stimulus && typeof stimulus === "object" ? stimulus : {};
  const choices = Array.isArray(prompt.choices) ? prompt.choices : [];
  return (
    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
      <p className="text-sm font-black uppercase tracking-wide text-indigo-700">Reading Buddy</p>
      {prompt.kidPrompt ? <p className="mt-3 text-xl font-black text-slate-950">{String(prompt.kidPrompt)}</p> : null}
      {prompt.displayText ? <div className="mt-4 rounded-xl bg-white p-5 text-center text-4xl font-black text-slate-950 shadow-sm">{String(prompt.displayText)}</div> : null}
      {stim.audioScript ? (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-700">
          <span className="font-bold text-indigo-700">Audio/TTS stimulus:</span> {String(stim.audioScript)}
        </div>
      ) : null}
      {choices.length ? (
        <div className="mt-4 grid gap-2">
          {choices.map((choice: unknown, index: number) => (
            <div key={`${String(choice)}-${index}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              {String(choice)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function normalizeRecommendation(value: unknown) {
  return value === "APPROVE" || value === "REJECT" || value === "FLAG_FOR_HUMAN" ? value : "FLAG_FOR_HUMAN";
}

function normalizeChecks(firstLook: Record<string, unknown>): DisplayCheck[] {
  if (Array.isArray(firstLook.checks)) {
    return firstLook.checks
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        requirementId: typeof entry.requirementId === "string" ? entry.requirementId : "UNKNOWN_CHECK",
        result: entry.result === "PASS" || entry.result === "FAIL" || entry.result === "NA" ? entry.result : "NA",
        severity: entry.severity === "BLOCKER" || entry.severity === "WARNING" || entry.severity === "INFO" ? entry.severity : "WARNING",
        evidence: typeof entry.evidence === "string" ? entry.evidence : "No evidence provided.",
      }));
  }

  return [];
}

function recommendationPillClass(recommendation: string) {
  if (recommendation === "REJECT") return "rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-800";
  if (recommendation === "APPROVE") return "rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800";
  return "rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800";
}
