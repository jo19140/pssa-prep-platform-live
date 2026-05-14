"use client";

import { useEffect, useMemo, useState } from "react";

const TEXT_SECTIONS = [
  ["LESSON_EXPLANATION", "Lesson Explanation"],
  ["WORKED_EXAMPLE", "Worked Example"],
  ["RETEST_RECOMMENDATION", "Retest Recommendation"],
] as const;
const QUESTION_SECTIONS = [
  ["GUIDED_PRACTICE_ITEM", "Guided Practice", "guidedPractice"],
  ["INDEPENDENT_PRACTICE_ITEM", "Independent Practice", "independentPractice"],
  ["EXIT_TICKET_ITEM", "Exit Ticket", "exitTicket"],
  ["MASTERY_CHECK_ITEM", "Mastery Check", "masteryCheck"],
] as const;

export default function TeacherReviewEditorPage({ reviewId }: { reviewId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const content = data?.review?.currentContent || data?.review?.aiOriginalContent;
  const edited = JSON.stringify(data?.review?.currentContent) !== JSON.stringify(data?.review?.aiOriginalContent);

  useEffect(() => { load(); }, [reviewId]);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/teacher/review/${reviewId}`);
    const json = await response.json();
    if (response.ok) setData(json);
    setLoading(false);
  }

  async function manualSave() {
    if (!edit) return;
    const payload = edit.isText ? edit.value : JSON.parse(edit.value);
    const response = await fetch(`/api/teacher/review/${reviewId}/manual-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionType: edit.sectionType, sectionIndex: edit.sectionIndex, newContent: payload }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Edit failed.");
    setData((prev: any) => ({ ...prev, review: { ...prev.review, currentContent: json.currentContent } }));
    setEdit(null);
    setMessage("Manual edit saved.");
  }

  async function requestAiRevision() {
    if (!edit) return;
    const response = await fetch(`/api/teacher/review/${reviewId}/ai-revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionType: edit.sectionType, sectionIndex: edit.sectionIndex, instructionText: edit.instructionText }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "AI revision failed.");
    setAiDraft(json);
  }

  async function keepRevision() {
    if (!aiDraft?.instruction?.id) return;
    const response = await fetch(`/api/teacher/review/${reviewId}/accept-revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiEditInstructionId: aiDraft.instruction.id }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Accept failed.");
    setData((prev: any) => ({ ...prev, review: { ...prev.review, currentContent: json.currentContent } }));
    setEdit(null);
    setAiDraft(null);
    setMessage("AI revision kept.");
  }

  async function generateQuestion(practiceSection: string, topicHint: string) {
    const response = await fetch(`/api/teacher/review/${reviewId}/generate-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceSection, topicHint }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Question generation failed.");
    setEdit({ mode: "ai", sectionType: "NEW_PRACTICE_QUESTION", title: "New Practice Question" });
    setAiDraft({ ...json, revisedContent: json.question });
  }

  async function regenerateStepAudio(stepId: string) {
    const response = await fetch(`/api/teacher/review/${reviewId}/regenerate-step-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Audio regeneration failed.");
    setData((prev: any) => ({
      ...prev,
      review: {
        ...prev.review,
        currentContent: {
          ...content,
          steps: (content.steps || []).map((step: any) => (step.id === stepId ? { ...step, audioUrl: json.audioUrl } : step)),
        },
      },
    }));
    setMessage(json.audioUrl ? "Audio regenerated." : "Audio could not be generated. Check AI health for details.");
  }

  async function approve() {
    const response = await fetch(`/api/teacher/review/${reviewId}/approve`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Approve failed.");
    setMessage("Lesson approved.");
    setTimeout(() => { window.location.href = "/teacher/review"; }, 700);
  }

  async function reject() {
    const response = await fetch(`/api/teacher/review/${reviewId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerNotes: rejectReason }),
    });
    const json = await response.json();
    if (!response.ok) return setMessage(json.error || "Reject failed.");
    setMessage("Lesson rejected.");
    setTimeout(() => { window.location.href = "/teacher/review"; }, 700);
  }

  if (loading) return <div className="mx-auto max-w-7xl p-6">Loading review...</div>;
  if (!data || !content) return <div className="mx-auto max-w-7xl p-6">Review not found.</div>;

  return (
    <section className="mx-auto max-w-7xl pb-28">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-indigo-700">Grade {data.review.lessonCache?.gradeLevel} - {data.review.lessonCache?.standardCode}</p>
            <h2 className="text-2xl font-bold text-slate-950">{data.review.lessonCache?.skill}</h2>
            <p className="text-sm text-slate-600">Common error: {data.review.lessonCache?.commonError || "unknown"} - Cache hits: {data.review.lessonCache?.hitCount || 0}</p>
          </div>
          <a href="/teacher/review" className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900">Back to queue</a>
        </div>
      </div>

      <div className="grid gap-5 px-4 py-6 lg:grid-cols-[1fr_340px] sm:px-6 lg:px-8">
        <div className="space-y-4">
          {TEXT_SECTIONS.map(([sectionType, title]) => (
            <SectionCard key={sectionType} title={title} value={content[fieldForText(sectionType)]} onEdit={() => setEdit({ mode: "manual", isText: true, title, sectionType, value: content[fieldForText(sectionType)] })} onAi={() => setEdit({ mode: "ai", title, sectionType, instructionText: "" })} />
          ))}
          <StepGroup
            steps={content.steps || []}
            onEdit={(sectionType, index, value, title) => setEdit({ mode: "manual", isText: sectionType !== "STEP_CHECK_QUESTION", title, sectionType, sectionIndex: index, value: sectionType === "STEP_CHECK_QUESTION" ? JSON.stringify(value, null, 2) : value })}
            onAi={(sectionType, index, title) => setEdit({ mode: "ai", title, sectionType, sectionIndex: index, instructionText: "" })}
            onRegenerateAudio={regenerateStepAudio}
          />
          {QUESTION_SECTIONS.map(([sectionType, title, field]) => (
            <QuestionGroup key={sectionType} title={title} items={content[field] || []} onEdit={(item, index) => setEdit({ mode: "manual", isText: false, title, sectionType, sectionIndex: index, value: JSON.stringify(item, null, 2) })} onAi={(index) => setEdit({ mode: "ai", title, sectionType, sectionIndex: index, instructionText: "" })} onAdd={(topicHint) => generateQuestion(titleToPracticeSection(title), topicHint)} />
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h3 className="font-bold text-slate-950">Deterministic fallback</h3>
            <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(data.deterministicFallback, null, 2)}</pre>
          </div>
          {message ? <div className="rounded-2xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">{message}</div> : null}
          <div className="rounded-2xl bg-white p-4 shadow">
            <h3 className="font-bold text-slate-950">Reject lesson</h3>
            <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="mt-2 h-28 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Explain what is wrong. Minimum 30 characters." />
            <p className="mt-1 text-xs text-slate-500">{rejectReason.trim().length}/30 characters</p>
          </div>
        </aside>
      </div>

      {edit ? (
        <div className="fixed inset-0 z-20 bg-slate-950/50 p-4">
          <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-950">{edit.mode === "manual" ? "Edit" : "Ask AI to revise"}: {edit.title}</h3>
              <button onClick={() => { setEdit(null); setAiDraft(null); }} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold">Close</button>
            </div>
            {edit.mode === "manual" ? (
              <>
                <textarea value={edit.value} onChange={(event) => setEdit((prev: any) => ({ ...prev, value: event.target.value }))} className="mt-4 h-80 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm" />
                <button onClick={manualSave} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white">Save edit</button>
              </>
            ) : (
              <>
                <textarea value={edit.instructionText} onChange={(event) => setEdit((prev: any) => ({ ...prev, instructionText: event.target.value }))} className="mt-4 h-28 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Tell the AI exactly what to revise." />
                <button onClick={requestAiRevision} disabled={(edit.instructionText || "").trim().length < 10} className="mt-3 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Generate revision</button>
                {aiDraft ? <div className="mt-4 grid gap-3 md:grid-cols-2"><Preview title="Current" value={edit.sectionType === "NEW_PRACTICE_QUESTION" ? null : sectionValue(content, edit)} /><Preview title="Proposed" value={aiDraft.revisedContent} /><button onClick={keepRevision} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Keep</button><button onClick={() => setAiDraft(null)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold">Discard</button></div> : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-4 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-3">
          <button onClick={approve} disabled={edited} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Approve as-is</button>
          <button onClick={approve} disabled={!edited} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Approve with edits</button>
          <button onClick={reject} disabled={rejectReason.trim().length < 30} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Reject</button>
        </div>
      </footer>
    </section>
  );
}

function SectionCard({ title, value, onEdit, onAi }: { title: string; value: string; onEdit: () => void; onAi: () => void }) {
  return <article className="rounded-2xl bg-white p-5 shadow"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-950">{title}</h3><Actions onEdit={onEdit} onAi={onAi} /></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p></article>;
}

function QuestionGroup({ title, items, onEdit, onAi, onAdd }: { title: string; items: any[]; onEdit: (item: any, index: number) => void; onAi: (index: number) => void; onAdd: (topicHint: string) => void }) {
  const [topicHint, setTopicHint] = useState("");
  return <article className="rounded-2xl bg-white p-5 shadow"><h3 className="font-bold text-slate-950">{title}</h3><div className="mt-3 space-y-3">{items.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-slate-900">{item.question}</p><Actions onEdit={() => onEdit(item, index)} onAi={() => onAi(index)} /></div><p className="mt-2 text-sm text-slate-600">Answer: {item.correctAnswer}</p><p className="mt-1 text-sm text-slate-600">{item.explanation}</p></div>)}</div><div className="mt-4 flex gap-2"><input value={topicHint} onChange={(event) => setTopicHint(event.target.value)} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="What kind of question?" /><button onClick={() => onAdd(topicHint)} disabled={topicHint.trim().length < 3} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Add question</button></div></article>;
}

function StepGroup({
  steps,
  onEdit,
  onAi,
  onRegenerateAudio,
}: {
  steps: any[];
  onEdit: (sectionType: string, index: number, value: any, title: string) => void;
  onAi: (sectionType: string, index: number, title: string) => void;
  onRegenerateAudio: (stepId: string) => void;
}) {
  if (!steps.length) return null;
  return (
    <article className="rounded-2xl bg-white p-5 shadow">
      <h3 className="font-bold text-slate-950">Lesson Steps</h3>
      <div className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <div key={`${step.order}-${step.title}`} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
                  Step {step.order} - {step.stepType}
                </p>
                <h4 className="mt-1 font-black text-slate-950">{step.title}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onEdit("STEP_TITLE", index, step.title, "Step title")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">Edit title</button>
                <button onClick={() => onEdit("STEP_BODY", index, step.bodyText, "Step body")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">Edit body</button>
                <button onClick={() => onEdit("STEP_NARRATION", index, step.narrationScript, "Step narration")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">Edit narration</button>
                <button onClick={() => onAi("STEP_BODY", index, "Step body")} className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">Ask AI</button>
                {step.id ? <button onClick={() => onRegenerateAudio(step.id)} className="rounded-lg bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">Regenerate audio</button> : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{step.bodyText}</p>
            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Narration: {step.narrationScript}</p>
            {step.audioUrl ? <audio controls src={step.audioUrl} className="mt-3 w-full" /> : null}
            {step.imageUrl ? <img src={step.imageUrl} alt="" className="mt-3 aspect-video w-full max-w-xl rounded-xl object-cover ring-1 ring-slate-200" /> : null}
            {step.checkQuestion ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-700">
                <p className="font-bold text-slate-950">{step.checkQuestion.question}</p>
                <p className="mt-1">Answer: {step.checkQuestion.choices?.[step.checkQuestion.correctIndex]}</p>
                <button onClick={() => onEdit("STEP_CHECK_QUESTION", index, step.checkQuestion, "Step check question")} className="mt-2 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">Edit check question</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function Actions({ onEdit, onAi }: { onEdit: () => void; onAi: () => void }) {
  return <div className="flex shrink-0 gap-2"><button onClick={onEdit} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">Edit text</button><button onClick={onAi} className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">Ask AI</button></div>;
}

function Preview({ title, value }: { title: string; value: any }) {
  return <div><p className="text-sm font-bold text-slate-900">{title}</p><pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre></div>;
}

function fieldForText(sectionType: string) {
  if (sectionType === "LESSON_EXPLANATION") return "lessonExplanation";
  if (sectionType === "WORKED_EXAMPLE") return "workedExample";
  return "retestRecommendation";
}

function sectionValue(content: any, edit: any) {
  if (edit.sectionType === "LESSON_EXPLANATION") return content.lessonExplanation;
  if (edit.sectionType === "WORKED_EXAMPLE") return content.workedExample;
  if (edit.sectionType === "RETEST_RECOMMENDATION") return content.retestRecommendation;
  const field = edit.sectionType === "GUIDED_PRACTICE_ITEM" ? "guidedPractice" : edit.sectionType === "INDEPENDENT_PRACTICE_ITEM" ? "independentPractice" : edit.sectionType === "EXIT_TICKET_ITEM" ? "exitTicket" : "masteryCheck";
  if (edit.sectionType === "STEP_TITLE") return content.steps?.[edit.sectionIndex]?.title;
  if (edit.sectionType === "STEP_BODY") return content.steps?.[edit.sectionIndex]?.bodyText;
  if (edit.sectionType === "STEP_NARRATION") return content.steps?.[edit.sectionIndex]?.narrationScript;
  if (edit.sectionType === "STEP_CHECK_QUESTION") return content.steps?.[edit.sectionIndex]?.checkQuestion;
  return content[field]?.[edit.sectionIndex];
}

function titleToPracticeSection(title: string) {
  if (title === "Guided Practice") return "GUIDED";
  if (title === "Independent Practice") return "INDEPENDENT";
  if (title === "Exit Ticket") return "EXIT_TICKET";
  return "MASTERY_CHECK";
}
