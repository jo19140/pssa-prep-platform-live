"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DiagnosticSessionShell } from "@/components/literacy/diagnostic/DiagnosticSessionShell";

type SectionDto = {
  sectionIndex: number;
  sectionType: string;
  label: string;
  estimatedMinutes: number;
  status: string;
  locked: boolean;
  current: boolean;
  answered: number;
  total: number;
  points: number;
  firstPosition: number | null;
  lastPosition: number | null;
};

type PssaState = {
  sessionId: string;
  status: string;
  currentPosition: number;
  currentSectionIndex: number;
  totalPositions: number;
  sections: SectionDto[];
  positions: Array<{ position: number; sectionIndex: number; scoreStatus: string }>;
};

type PssaItemResponse = {
  sessionId: string;
  position: number;
  sectionIndex: number;
  currentSectionIndex: number;
  passages?: Array<{ passageId: string; label?: string; passage: { title?: string; text?: string; passageType?: string } }>;
  item: {
    interactionType: string;
    interactionSubtype: string;
    pointValue: number;
    responseSpec: any;
  };
};

export function PssaSectionedDiagnosticShell({ sessionId, completeOnly = false }: { sessionId: string; completeOnly?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "pssa" | "literacy">("loading");
  const [state, setState] = useState<PssaState | null>(null);
  const [item, setItem] = useState<PssaItemResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (completeOnly) {
      setMode("pssa");
      loadState();
      return;
    }
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, completeOnly]);

  async function loadState() {
    setError("");
    try {
      const response = await fetch(`/api/pssa/session/state?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (!response.ok) {
        setMode("literacy");
        return;
      }
      const json = await response.json();
      setMode("pssa");
      setState(json);
      const currentSection = json.sections?.find((section: SectionDto) => section.current) ?? json.sections?.[0];
      const nextPosition = json.positions?.find((row: any) => row.sectionIndex === currentSection?.sectionIndex && row.scoreStatus === "unanswered")?.position ?? currentSection?.firstPosition ?? json.currentPosition;
      if (!completeOnly && json.status === "in_progress" && nextPosition) await loadItem(nextPosition);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the diagnostic.");
      setMode("literacy");
    }
  }

  async function loadItem(position: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/pssa/session/item?sessionId=${encodeURIComponent(sessionId)}&position=${position}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not load the item.");
      setItem(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the item.");
    } finally {
      setBusy(false);
    }
  }

  async function submitResponse(payload: unknown) {
    if (!item || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pssa/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, position: item.position, responsePayload: payload }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not save the answer.");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the answer.");
    } finally {
      setBusy(false);
    }
  }

  async function sectionAction(action: "review" | "resume" | "end", sectionIndex: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pssa/session/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sectionIndex, action }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not update the section.");
      setState(json);
      const currentSection = json.sections?.find((section: SectionDto) => section.current);
      const nextPosition = json.positions?.find((row: any) => row.sectionIndex === currentSection?.sectionIndex && row.scoreStatus === "unanswered")?.position ?? currentSection?.firstPosition;
      if (nextPosition) await loadItem(nextPosition);
      else setItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the section.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAttempt() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pssa/session/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not submit the diagnostic.");
      setState(json);
      router.replace(`/student/diagnostic/${encodeURIComponent(sessionId)}/complete`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the diagnostic.");
    } finally {
      setBusy(false);
    }
  }

  const currentSection = useMemo(() => state?.sections?.find((section) => section.current), [state]);

  if (mode === "literacy") return <DiagnosticSessionShell sessionId={sessionId} completeOnly={completeOnly} />;
  if (mode === "loading") return <main className="min-h-[calc(100vh-120px)] bg-slate-100 p-6"><div className="mx-auto max-w-5xl rounded bg-white p-6 font-semibold">Loading diagnostic...</div></main>;
  if (completeOnly || state?.status === "submitted") {
    return (
      <main className="min-h-[calc(100vh-120px)] bg-slate-100 p-6">
        <section className="mx-auto max-w-3xl rounded border bg-white p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Diagnostic complete</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Your diagnostic is complete.</h1>
          <p className="mt-3 text-slate-700">Your teacher will review your results.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f2f2ee] p-4 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded border border-slate-300 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sections</p>
          <div className="mt-3 space-y-2">
            {state?.sections?.map((section) => (
              <button
                key={section.sectionIndex}
                type="button"
                disabled={section.locked || section.status === "completed_locked"}
                onClick={() => section.firstPosition && loadItem(section.firstPosition)}
                className={`w-full rounded border px-3 py-2 text-left text-sm font-semibold ${section.current ? "border-blue-700 bg-blue-50" : "border-slate-200 bg-white"} disabled:bg-slate-100 disabled:text-slate-500`}
              >
                <span className="block">{section.label}</span>
                <span className="text-xs font-medium">{section.answered}/{section.total} answered · {section.status.replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded border border-slate-300 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{currentSection?.label ?? "Diagnostic"}</p>
              <h1 className="text-xl font-bold">Standards-aligned diagnostic</h1>
              <p className="text-sm text-slate-600">Untimed · answer, review, then end each section when ready.</p>
            </div>
            {currentSection ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => sectionAction("review", currentSection.sectionIndex)} disabled={busy || currentSection.status === "review"} className="rounded border border-slate-400 px-3 py-2 text-sm font-bold">Review</button>
                <button type="button" onClick={() => sectionAction("end", currentSection.sectionIndex)} disabled={busy} className="rounded bg-slate-950 px-3 py-2 text-sm font-bold text-white">End section</button>
              </div>
            ) : null}
          </header>

          {error ? <div className="m-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div> : null}

          {currentSection?.status === "review" ? (
            <SectionReview state={state} section={currentSection} busy={busy} onResume={() => sectionAction("resume", currentSection.sectionIndex)} onEnd={() => sectionAction("end", currentSection.sectionIndex)} />
          ) : item ? (
            <PssaItemPanel state={state} item={item} busy={busy} onNavigate={loadItem} onSubmit={submitResponse} onSubmitAttempt={submitAttempt} />
          ) : (
            <div className="p-8 text-slate-700">Choose an available item to continue.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionReview({ state, section, busy, onResume, onEnd }: { state: PssaState | null; section: SectionDto; busy: boolean; onResume: () => void; onEnd: () => void }) {
  const rows = state?.positions?.filter((row) => row.sectionIndex === section.sectionIndex) ?? [];
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold">Review {section.label}</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.position} className={`rounded border p-3 text-sm font-semibold ${row.scoreStatus === "unanswered" ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
            Item {row.position}: {row.scoreStatus === "unanswered" ? "Unanswered" : "Answered"}
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button type="button" disabled={busy} onClick={onResume} className="rounded border border-slate-400 px-4 py-2 font-bold">Return to section</button>
        <button type="button" disabled={busy} onClick={onEnd} className="rounded bg-slate-950 px-4 py-2 font-bold text-white">End section</button>
      </div>
    </div>
  );
}

function PssaItemPanel({ state, item, busy, onNavigate, onSubmit, onSubmitAttempt }: { state: PssaState | null; item: PssaItemResponse; busy: boolean; onNavigate: (position: number) => void; onSubmit: (payload: unknown) => void; onSubmitAttempt: () => void }) {
  const currentSection = state?.sections?.find((section) => section.sectionIndex === item.sectionIndex);
  const positions = state?.positions?.filter((row) => row.sectionIndex === item.sectionIndex) ?? [];
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-4">
        {item.passages?.map((row, index) => (
          <article key={`${row.passageId}-${index}`} className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{row.label ?? "Passage"}</p>
            <h2 className="text-lg font-bold">{row.passage.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">{row.passage.text}</p>
          </article>
        ))}
      </div>
      <div className="rounded border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Item {item.position}</p>
        <ItemResponseForm item={item} busy={busy} onSubmit={onSubmit} />
        <div className="mt-6 grid grid-cols-5 gap-2">
          {positions.map((row) => (
            <button key={row.position} type="button" onClick={() => onNavigate(row.position)} className={`rounded border px-2 py-2 text-sm font-bold ${row.position === item.position ? "border-blue-700 bg-blue-50" : "border-slate-300"}`}>
              {row.position}
            </button>
          ))}
        </div>
        {state?.sections?.every((section) => section.status === "completed_locked") ? (
          <button type="button" onClick={onSubmitAttempt} disabled={busy} className="mt-5 w-full rounded bg-emerald-700 px-4 py-3 font-bold text-white">Submit diagnostic</button>
        ) : (
          <p className="mt-5 text-sm text-slate-600">{currentSection?.answered ?? 0}/{currentSection?.total ?? 0} answered in this section</p>
        )}
      </div>
    </div>
  );
}

function ItemResponseForm({ item, busy, onSubmit }: { item: PssaItemResponse; busy: boolean; onSubmit: (payload: unknown) => void }) {
  const spec = item.item.responseSpec;
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [partA, setPartA] = useState<number | null>(null);
  const [partB, setPartB] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [rowSelections, setRowSelections] = useState<Record<string, string>>({});

  if (item.item.interactionType === "SHORT_ANSWER") {
    return <form className="mt-3 space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit({ shortResponse: text }); }}><p className="font-bold">{spec.stem}</p><p className="text-sm text-slate-600">{spec.instructionText}</p><textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-32 w-full rounded border p-3" /><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 font-bold text-white">Save answer</button></form>;
  }
  if (item.item.interactionType === "EBSR") {
    return <div className="mt-3 space-y-4"><p className="font-bold">{spec.partA.prompt}</p><ChoiceButtons choices={spec.partA.choices} selected={partA} onSelect={setPartA} /><p className="font-bold">{spec.partB.instruction}</p><MultiButtons choices={spec.partB.choices} selected={partB} onToggle={(index) => setPartB((prev) => prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index])} /><button disabled={busy || partA == null} onClick={() => onSubmit({ partAIndex: partA, partBIndices: partB })} className="rounded bg-blue-700 px-4 py-2 font-bold text-white">Save answer</button></div>;
  }
  if (item.item.interactionType === "DRAG_DROP") {
    return <div className="mt-3 space-y-3"><p className="font-bold">{spec.prompt}</p>{spec.tokens.map((token: any) => <label key={token.tokenId} className="block text-sm font-semibold">{token.text}<select className="mt-1 w-full rounded border p-2" onChange={(event) => setAssignments((prev) => ({ ...prev, [token.tokenId]: event.target.value }))}><option value="">Choose target</option>{spec.targets.map((target: any) => <option key={target.targetId} value={target.targetId}>{target.label}</option>)}</select></label>)}<button disabled={busy} onClick={() => onSubmit({ assignments })} className="rounded bg-blue-700 px-4 py-2 font-bold text-white">Save answer</button></div>;
  }
  if (item.item.interactionType === "MATCHING_GRID") {
    return <div className="mt-3 space-y-3"><p className="font-bold">{spec.stem}</p>{spec.rows.map((row: any) => <label key={row.rowId} className="block text-sm font-semibold">{row.label}<select className="mt-1 w-full rounded border p-2" onChange={(event) => setRowSelections((prev) => ({ ...prev, [row.rowId]: event.target.value }))}><option value="">Choose column</option>{spec.columns.map((column: any) => <option key={column.columnId} value={column.columnId}>{column.label}</option>)}</select></label>)}<button disabled={busy} onClick={() => onSubmit({ rowSelections })} className="rounded bg-blue-700 px-4 py-2 font-bold text-white">Save answer</button></div>;
  }
  return <div className="mt-3 space-y-3"><p className="font-bold">{spec.prompt}</p><ChoiceButtons choices={spec.choices} selected={selected} onSelect={setSelected} /><button disabled={busy || selected == null} onClick={() => onSubmit({ selectedIndex: selected })} className="rounded bg-blue-700 px-4 py-2 font-bold text-white">Save answer</button></div>;
}

function ChoiceButtons({ choices, selected, onSelect }: { choices: Array<{ text: string }>; selected: number | null; onSelect: (index: number) => void }) {
  return <div className="space-y-2">{choices.map((choice, index) => <button key={`${choice.text}-${index}`} type="button" onClick={() => onSelect(index)} className={`block w-full rounded border p-3 text-left ${selected === index ? "border-blue-700 bg-blue-50" : "border-slate-300"}`}>{choice.text}</button>)}</div>;
}

function MultiButtons({ choices, selected, onToggle }: { choices: Array<{ text: string }>; selected: number[]; onToggle: (index: number) => void }) {
  return <div className="space-y-2">{choices.map((choice, index) => <button key={`${choice.text}-${index}`} type="button" onClick={() => onToggle(index)} className={`block w-full rounded border p-3 text-left ${selected.includes(index) ? "border-blue-700 bg-blue-50" : "border-slate-300"}`}>{choice.text}</button>)}</div>;
}
