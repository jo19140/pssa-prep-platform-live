"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type DisplayCheck = {
  requirementId: string;
  result: "PASS" | "FAIL" | "NA";
  severity: "BLOCKER" | "WARNING" | "INFO";
  evidence: string;
};

export function PassageReviewWorkspace({ passage }: { passage: any }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editedText, setEditedText] = useState(passage.text || "");
  const [allowlistInput, setAllowlistInput] = useState((passage.vocabularyAllowlist || []).join(", "));
  const [editFailures, setEditFailures] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const firstLook = passage.firstLookOutput;
  const checks = normalizeChecks(firstLook);
  const failedChecks = checks.filter((check) => check.result === "FAIL");
  const passedChecks = checks.filter((check) => check.result === "PASS");
  const naChecks = checks.filter((check) => check.result === "NA");
  const isUnevaluated = passage.firstLookRecommendation === "UNEVALUATED" || passage.firstLookStale || !firstLook;
  const overrideRequiresNotes = passage.firstLookRecommendation === "REJECT" || passage.firstLookRecommendation === "FLAG_FOR_HUMAN";
  const approveDisabled =
    submitting ||
    !passage.canApprove?.approvable ||
    isUnevaluated ||
    (overrideRequiresNotes && reviewNotes.trim().length === 0);
  const band = passage.contentAuditJson?.wordCountBand;
  const liveWordCount = useMemo(() => tokenize(editedText).length, [editedText]);
  const liveBandOk = band ? liveWordCount >= band.min && liveWordCount <= band.max : true;

  function submit(action: "APPROVE" | "REJECT" | "EDIT") {
    setMessage("");
    setEditFailures([]);
    setSubmitting(true);
    void (async () => {
      const body: Record<string, unknown> = { action, reviewNotes };
      if (action === "EDIT") {
        body.editedText = editedText;
        body.editedVocabularyAllowlist = allowlistInput.split(",").map((entry) => entry.trim()).filter(Boolean);
      }
      const response = await fetch(`/api/admin/content/passages/${passage.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      setSubmitting(false);
      if (!response.ok) {
        setMessage(json.error || "Review action failed.");
        if (Array.isArray(json.auditFailures)) setEditFailures(json.auditFailures);
        return;
      }
      setMessage(`Saved ${action.toLowerCase()} review.`);
      setTimeout(() => {
        window.location.href = "/admin/content/passages/queue";
      }, 700);
    })().catch((error) => {
      setSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Review action failed.");
    });
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/admin/content/passages/queue" className="text-sm font-bold text-indigo-700">
              Back to passage queue
            </a>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{passage.titleOrFirstWords}</h1>
            <p className="text-sm text-slate-600">
              {passage.phasePositionLabel} · {passage.dailyTargetCode || "No target"} · Status {passage.reviewStatus}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={recommendationPillClass(passage.firstLookRecommendation)}>{recommendationLabel(passage.firstLookRecommendation)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{recommendationSublabel(passage.firstLookRecommendation)}</span>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)_360px] sm:px-6 lg:px-8">
        <section className="space-y-5">
          <Panel title="Passage text audit">
            <p className="text-sm text-slate-600">Each word is marked by category. Labels are visible text so this is not color-only.</p>
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4 leading-10">
              {wordAuditEntries(passage.contentAuditJson).map((entry, index) => (
                <span
                  key={`${entry.word}-${index}`}
                  tabIndex={0}
                  aria-label={`${entry.word}, ${categoryLabel(entry.category)}${entry.matchedPattern ? `, matched pattern ${entry.matchedPattern}` : ""}`}
                  title={`${categoryLabel(entry.category)}${entry.matchedPattern ? ` · ${entry.matchedPattern}` : ""}${entry.reason ? ` · ${entry.reason}` : ""}`}
                  className={`mr-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-400 ${categoryClass(entry.category)}`}
                >
                  <span className="font-mono text-[10px]">{categoryToken(entry.category)}</span>
                  <span>{entry.word}</span>
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Readonly label="Word count" value={`${passage.wordCount}${passage.wordCountWithinBand ? " [OK]" : " [OUT OF BAND]"}`} />
              <Readonly label="Band" value={band ? `${band.min}-${band.max} words` : "None"} />
              <Readonly label="Decodability" value={`${Math.round(passage.decodabilityScore * 100)}% (threshold ${Math.round((passage.contentAuditJson?.decodabilityThreshold || 0) * 100)}%)`} />
              <Readonly label="Unclassified" value={String(passage.contentAuditJson?.unclassifiedCount ?? 0)} />
            </div>
            <AuditCounts audit={passage.contentAuditJson} />
            <ListBlock title="Blocked-pattern violations" items={(passage.contentAuditJson?.blockedPatternViolations || []).map((entry: any) => `${entry.word} / ${entry.patternCode}`)} empty="None." tone="rose" />
          </Panel>
        </section>

        <section className="space-y-5">
          <Panel title="Quality and originality">
            <QualitySection audit={passage.contentAuditJson} />
            <ListBlock title="Near-duplicate passages" tone="amber" empty="None detected.">
              {passage.nearDuplicatePassages?.map((duplicate: any) => (
                <article key={duplicate.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <a href={`/admin/content/passages/${duplicate.id}`} className="font-black text-amber-900 underline">
                    {duplicate.titleOrFirstWords}
                  </a>
                  <p className="mt-2 text-sm text-slate-700">{duplicate.textSnippet}</p>
                  <p className="mt-1 text-xs font-bold text-amber-900">Similarity {Math.round(duplicate.similarityScore * 100)}%</p>
                </article>
              ))}
            </ListBlock>
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="AI first-look">
            {isUnevaluated ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="font-black text-slate-950">[UNEVALUATED]</p>
                <p className="mt-2 text-sm text-slate-700">
                  {passage.firstLookStale ? "AI first-look is pending re-run after edit." : "AI first-look has not yet run on this passage."} APPROVE is blocked until a fresh first-look exists.
                </p>
              </div>
            ) : (
              <>
                <Checklist title="Checks failed" items={failedChecks} tone="rose" />
                <Checklist title="Checks passed" items={passedChecks} tone="emerald" />
                <Checklist title="Checks not applicable / not assessed" items={naChecks} tone="slate" />
                <ListBlock title="Specific issues" items={(firstLook?.specificIssues || []).map((issue: any) => `${issue.severity || "issue"} · ${issue.location || "artifact"}: ${issue.description || "Needs review"}`)} empty="None reported." tone="amber" />
              </>
            )}
          </Panel>

          <Panel title="Human decision">
            <label className="block text-sm font-bold text-slate-700">
              Review notes
              <textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                className="mt-2 h-32 w-full rounded-md border border-slate-300 p-3 text-sm"
                placeholder="Briefly explain the human decision or edit."
              />
            </label>
            {message ? <p className="mt-3 rounded-md bg-indigo-50 p-3 text-sm font-semibold text-indigo-800">{message}</p> : null}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => submit("APPROVE")}
                disabled={approveDisabled}
                className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Approve as-is
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={submitting}
                className="rounded-md bg-indigo-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save edit decision
              </button>
              <button
                type="button"
                onClick={() => submit("REJECT")}
                disabled={submitting || reviewNotes.trim().length === 0}
                className="rounded-md bg-rose-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reject item
              </button>
            </div>
            {!passage.canApprove?.approvable ? <ListBlock title="Approval blockers" items={passage.canApprove?.blockers || []} tone="rose" /> : null}
            {isUnevaluated ? <p className="mt-3 text-xs font-semibold text-rose-700">Approve is blocked until fresh AI first-look exists.</p> : null}
            {overrideRequiresNotes ? <p className="mt-3 text-xs font-semibold text-amber-700">AI warning override requires review notes.</p> : null}
          </Panel>
        </aside>
      </section>

      {editOpen ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-slate-950/60 p-4">
          <div className="mx-auto max-w-4xl rounded-md bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Edit passage</h2>
                <p className="text-sm text-slate-600">Edits rerun the full audit and exclude this passage from originality matching.</p>
              </div>
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
                Close
              </button>
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Passage text
              <textarea value={editedText} onChange={(event) => setEditedText(event.target.value)} className="mt-2 h-72 w-full rounded-md border border-slate-300 p-3 text-sm" />
            </label>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              Vocabulary allowlist (comma-separated)
              <input value={allowlistInput} onChange={(event) => setAllowlistInput(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm" />
            </label>
            <div className={`mt-4 rounded-md border p-3 text-sm font-bold ${liveBandOk ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
              Live word count: {liveWordCount}{band ? ` / band ${band.min}-${band.max}` : ""}
            </div>
            {editFailures.length ? <ListBlock title="Audit failures" items={editFailures} tone="rose" /> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => submit("EDIT")} disabled={submitting || reviewNotes.trim().length === 0} className="rounded-md bg-indigo-700 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
                Submit edit
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-slate-300 px-5 py-3 text-sm font-black text-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function AuditCounts({ audit }: { audit: any }) {
  const rows = [
    ["Target", audit?.targetWords?.length || 0],
    ["Prerequisite", audit?.prerequisiteWords?.length || 0],
    ["Heart", audit?.heartWords?.length || 0],
    ["Vocabulary", audit?.vocabularyWords?.length || 0],
    ["Unclassified", audit?.unclassifiedWords?.length || 0],
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

function QualitySection({ audit }: { audit: any }) {
  const quality = audit?.quality || {};
  return (
    <div className="space-y-4">
      <Readonly label="Sentence uniqueness" value={`${Math.round((quality.uniqueSentenceRatio || 0) * 100)}% ${quality.uniqueSentenceRatio === 1 ? "[OK]" : "[FAIL]"}`} />
      <Readonly label="Terminal punctuation" value={quality.hasTerminalPunctuation ? "[OK] Present" : "[FAIL] Missing"} />
      <ListBlock title="Repeated trigrams" items={quality.repeatedTrigrams || []} empty="None." tone="rose" />
      <ListBlock title="Repeated sentences" items={quality.repeatedSentences || []} empty="None." tone="rose" />
      <ListBlock title="Padding signals" items={quality.passesQualityGate ? [] : ["[FAIL] One or more quality sub-gates failed."]} empty="No padding signals." tone="amber" />
    </div>
  );
}

function ListBlock({ title, items, empty, tone, children }: { title: string; items?: string[]; empty?: string; tone: "rose" | "amber" | "slate"; children?: ReactNode }) {
  const toneClass = tone === "rose" ? "border-rose-200 bg-rose-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50";
  const hasChildren = Boolean(children);
  return (
    <div className={`mt-4 rounded-md border p-4 ${toneClass}`}>
      <h3 className="font-black text-slate-950">{title}</h3>
      {hasChildren ? <div className="mt-3 space-y-3">{children}</div> : null}
      {!hasChildren && !items?.length ? <p className="mt-2 text-sm text-slate-500">{empty || "None."}</p> : null}
      {!hasChildren && items?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function Checklist({ title, items, tone }: { title: string; items: DisplayCheck[]; tone: "emerald" | "rose" | "slate" }) {
  const toneClass = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50";
  return (
    <section className={`mt-4 rounded-md border p-4 ${toneClass}`}>
      <h3 className="font-black text-slate-950">{title}</h3>
      {!items.length ? <p className="mt-2 text-sm text-slate-500">None reported.</p> : null}
      <ul className="mt-2 space-y-3 text-sm text-slate-700">
        {items.map((item) => (
          <li key={`${title}-${item.requirementId}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-900">{item.requirementId}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-700">{checkStatusLabel(item)}</span>
            </div>
            <p className="mt-1">{item.evidence}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function wordAuditEntries(audit: any) {
  return Array.isArray(audit?.words) ? audit.words : [];
}

function categoryToken(category: string) {
  if (category === "target") return "[T]";
  if (category === "prerequisite") return "[P]";
  if (category === "heart") return "H";
  if (category === "vocabulary") return "[V]";
  return "[?]";
}

function categoryLabel(category: string) {
  if (category === "target") return "target word";
  if (category === "prerequisite") return "prerequisite word";
  if (category === "heart") return "heart word";
  if (category === "vocabulary") return "vocabulary word";
  return "unclassified word";
}

function categoryClass(category: string) {
  if (category === "target") return "border-indigo-300 bg-indigo-50 text-indigo-950";
  if (category === "prerequisite") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (category === "heart") return "border-rose-300 bg-rose-50 text-rose-950";
  if (category === "vocabulary") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-slate-400 bg-slate-100 text-slate-950";
}

function normalizeChecks(firstLook: any): DisplayCheck[] {
  if (!Array.isArray(firstLook?.checks)) return [];
  return firstLook.checks
    .filter((entry: any) => entry && typeof entry === "object")
    .map((entry: any) => ({
      requirementId: typeof entry.requirementId === "string" ? entry.requirementId : "UNKNOWN_CHECK",
      result: entry.result === "PASS" || entry.result === "FAIL" || entry.result === "NA" ? entry.result : "NA",
      severity: entry.severity === "BLOCKER" || entry.severity === "WARNING" || entry.severity === "INFO" ? entry.severity : "WARNING",
      evidence: typeof entry.evidence === "string" ? entry.evidence : "No evidence provided.",
    }));
}

function recommendationPillClass(recommendation: string) {
  if (recommendation === "REJECT") return "rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-800";
  if (recommendation === "APPROVE") return "rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800";
  if (recommendation === "UNEVALUATED") return "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-800";
  return "rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800";
}

function recommendationLabel(recommendation: string) {
  if (recommendation === "FLAG_FOR_HUMAN") return "FLAG FOR HUMAN";
  return recommendation;
}

function recommendationSublabel(recommendation: string) {
  if (recommendation === "APPROVE") return "Auto-approval candidate";
  if (recommendation === "UNEVALUATED") return "Awaiting AI first-look";
  return "Human review required";
}

function checkStatusLabel(check: DisplayCheck) {
  if (check.result === "PASS") return `PASS · ${severityLabel(check.severity)} requirement`;
  if (check.result === "FAIL") return `FAIL · ${check.severity === "BLOCKER" ? "Blocker" : check.severity === "WARNING" ? "Warning" : "Info"}`;
  return `NA · ${severityLabel(check.severity)} requirement`;
}

function severityLabel(severity: string) {
  if (severity === "BLOCKER") return "Blocker-level";
  if (severity === "WARNING") return "Warning-level";
  return "Info-level";
}

function tokenize(text: string) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}
