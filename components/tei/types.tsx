"use client";

import type { ReactNode } from "react";
import { type StudentResponse, scoreItem } from "@/lib/teiScoring";

export type TEIItemComponentProps = {
  item: any;
  itemId: string;
  disabled?: boolean;
  onSubmit: (response: StudentResponse) => void;
};

export function submitResponse(item: any, itemId: string, rawResponse: any, onSubmit: (response: StudentResponse) => void) {
  const score = scoreItem(item, rawResponse);
  const response: StudentResponse = {
    itemId,
    itemType: item.type,
    rawResponse,
    isCorrect: score.isCorrect,
    partialCreditEarned: score.partialCredit,
    totalPoints: score.totalPoints,
    feedback: score.feedback,
    distractorFeedback: score.distractorFeedback,
  };
  onSubmit(response);
  return response;
}

export function FeedbackPanel({ response }: { response: StudentResponse | null }) {
  if (!response) return null;
  const correctEnough = response.isCorrect || response.partialCreditEarned >= 0.75;
  return (
    <div
      role="status"
      tabIndex={-1}
      className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
        correctEnough ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-rose-300 bg-rose-50 text-rose-950"
      }`}
    >
      <p className="font-black">{correctEnough ? "✓ Strong work" : "✗ Review this part"}</p>
      <p className="mt-1">{response.feedback}</p>
      {response.distractorFeedback ? <p className="mt-2 font-semibold">{response.distractorFeedback}</p> : null}
      <p className="mt-2 text-xs font-black uppercase tracking-wide opacity-75">
        Credit: {Math.round(response.partialCreditEarned * 100)}%
      </p>
    </div>
  );
}

export function ItemShell({
  item,
  children,
}: {
  item: any;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{formatType(item.type)}</p>
          <h4 className="mt-1 text-lg font-black leading-7 text-slate-950">{item.question}</h4>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">1 point</span>
      </div>
      {item.passage ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-800 ring-1 ring-slate-200">{item.passage}</p> : null}
      {item.coachHint ? <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-xs font-bold leading-5 text-cyan-900 ring-1 ring-cyan-100">Hint: {item.coachHint}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SubmitButton({
  disabled,
  submitted,
  onClick,
}: {
  disabled?: boolean;
  submitted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || submitted}
      className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {submitted ? "Submitted" : "Submit answer"}
    </button>
  );
}

export function optionButtonClass(selected: boolean, locked: boolean, correct?: boolean, wrong?: boolean) {
  if (correct) return "border-emerald-500 bg-emerald-100 text-emerald-950";
  if (wrong) return "border-rose-400 bg-rose-100 text-rose-950";
  if (selected) return "border-slate-950 bg-slate-950 text-white";
  return `border-slate-200 bg-white text-slate-800 ${locked ? "" : "hover:border-slate-400 hover:bg-slate-50"}`;
}

function formatType(type: string) {
  return String(type || "Practice").replace(/-/g, " ");
}
