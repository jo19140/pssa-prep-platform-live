"use client";

import { parentFriendlyGrowth, parentFriendlyPerformanceLevel } from "@/lib/parentFriendlyText";

export function StudentReport({ report }: { report: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-emerald-700 p-6 text-white shadow">
        <h2 className="text-3xl font-bold">{report.student.name}</h2>
        <p className="mt-2">{report.assessment.name}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric title="Score" value={`${report.summary.score}%`} />
          <Metric title="Performance" value={report.summary.performance} />
          <Metric title="Growth" value={report.summary.growthLabel || "N/A"} />
          <Metric title="Time" value={report.summary.timeOnTestLabel} />
        </div>
        {report.essayGradingPending ? <p className="mt-4 rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold">Your essay is being graded - usually under a minute.</p> : null}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <h3 className="text-xl font-bold">Growth Summary</h3>
        <p className="mt-4 text-slate-700">{parentFriendlyGrowth(report.growth?.growthPoints ?? null)}</p>
      </div>

      {report.diagnosticPerformance?.length ? (
        <div className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold">Diagnostic Areas</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {report.diagnosticPerformance.map((area: any) => (
              <div key={area.label} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold">{area.label}</p>
                <p className="mt-1 text-sm text-slate-700">{area.earnedPoints}/{area.totalPoints} points - {area.percentScore}% - {area.performanceBand}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {report.essayGradingPending ? (
        <div className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold">TDA Essay Feedback</h3>
          <p className="mt-3 text-sm text-slate-600">Your essay is being graded - usually under a minute.</p>
        </div>
      ) : null}

      {report.essayEvaluations?.length ? (
        <div className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold">TDA Essay Feedback</h3>
          <div className="mt-4 space-y-4">
            {report.essayEvaluations.map((essay: any, index: number) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold">Score: {essay.score}/{essay.maxScore} - {parentFriendlyPerformanceLevel(essay.performanceBand)}</p>
                <p className="mt-2 text-sm text-slate-700">{essay.feedback}</p>
                <FeedbackList title="Strengths" items={essay.strengths || []} />
                <FeedbackList title="Areas for Growth" items={essay.areasForGrowth || []} />
                <p className="mt-3 text-sm font-semibold text-slate-900">Next Steps</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{(essay.nextSteps || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {report.conventionsPerformance ? (
        <div className="rounded-3xl bg-white p-6 shadow">
          <h3 className="text-xl font-bold">Conventions Performance</h3>
          <p className="mt-3 text-slate-700">{report.conventionsPerformance.earnedPoints}/{report.conventionsPerformance.totalPoints} points - {report.conventionsPerformance.percentScore}% - {report.conventionsPerformance.performanceBand}</p>
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow">
        <h3 className="text-xl font-bold">Standards Mastery</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Standard</th>
                <th className="pb-3 pr-4">Description</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3 pr-4">Band</th>
              </tr>
            </thead>
            <tbody>
              {(report.standardsMastery || []).map((row: any) => (
                <tr key={row.standardCode} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-semibold">{row.standardCode}</td>
                  <td className="py-3 pr-4">{row.standardLabel}</td>
                  <td className="py-3 pr-4">{row.percentScore}%</td>
                  <td className="py-3 pr-4">{row.performanceBand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow">
        <h3 className="text-xl font-bold">Question Review</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {(report.questionReview || []).map((item: any) => (
            <div key={item.questionId} className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.skill} - {item.questionType}</div>
              <p className="mt-2 font-semibold">{item.question}</p>
              {item.gradingPending ? <p className="mt-2 text-sm font-semibold text-amber-700">Essay grading in progress</p> : <p className={`mt-2 text-sm font-semibold ${item.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>{item.isCorrect ? "Correct" : "Incorrect"}</p>}
              <p className="mt-1 text-sm text-slate-600">Your answer: {item.studentAnswerLabel}</p>
              <p className="mt-1 text-sm text-slate-600">Correct answer: {item.gradingPending ? "Essay grading in progress" : item.correctAnswerLabel}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-2xl bg-white/15 p-3"><div className="text-xs uppercase tracking-wide text-emerald-100">{title}</div><div className="mt-1 text-xl font-bold text-white">{value}</div></div>;
}

function FeedbackList({ title, items }: { title: string; items: any[] }) {
  return (
    <>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
        {items.map((item, index) => <li key={feedbackKey(item, index)}>{formatFeedbackItem(item)}</li>)}
      </ul>
    </>
  );
}

function formatFeedbackItem(item: any) {
  if (typeof item === "string") return item;
  if (item?.claim) return item.evidence_quote ? `${item.claim} Quote: "${item.evidence_quote}"` : item.claim;
  return String(item || "");
}

function feedbackKey(item: any, index: number) {
  if (typeof item === "string") return item;
  return `${item?.claim || "feedback"}-${index}`;
}
