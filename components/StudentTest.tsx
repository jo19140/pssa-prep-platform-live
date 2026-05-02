"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragDropQuestion, EbsrQuestion, HotTextQuestion, McqQuestion, MultiSelectQuestion, Question, ResponseRecord, ShortResponseQuestion, TdaQuestion } from "@/types";

type SubmitPayload = { isCorrect: boolean; scorePointsEarned: number; maxPoints: number; errorPattern: string; answerPayload: Record<string, unknown>; };

export function StudentTest({
  currentQuestion,
  currentQuestionNumber,
  totalQuestions,
  history,
  onSubmitAnswer,
  onNavigate,
  onPause,
  onReview,
  onEndTest,
  onToggleFlag,
  flaggedQuestionIds,
  isPaused,
  onResume,
  reviewOpen,
  onCloseReview,
  questionIds,
}: {
  currentQuestion: Question;
  currentQuestionNumber: number;
  totalQuestions: number;
  history: ResponseRecord[];
  onSubmitAnswer: (payload: SubmitPayload) => Promise<void>;
  onNavigate: (questionNumber: number) => void;
  onPause: () => void;
  onReview: () => void;
  onEndTest: () => Promise<void>;
  onToggleFlag: () => void;
  flaggedQuestionIds: number[];
  isPaused: boolean;
  onResume: () => void;
  reviewOpen: boolean;
  onCloseReview: () => void;
  questionIds: number[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTool, setActiveTool] = useState("Pointer");
  const [notesOpen, setNotesOpen] = useState(false);
  const [studentNotes, setStudentNotes] = useState("");
  const [highlightedChunks, setHighlightedChunks] = useState<Record<string, boolean>>({});
  const [magnified, setMagnified] = useState(false);
  const [lineGuide, setLineGuide] = useState(false);
  const [masking, setMasking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [partAIndex, setPartAIndex] = useState<number | null>(null);
  const [partBIndices, setPartBIndices] = useState<number[]>([]);
  const [multiIndices, setMultiIndices] = useState<number[]>([]);
  const [dragMapping, setDragMapping] = useState<Record<string, string>>({});
  const [essayResponse, setEssayResponse] = useState("");
  const [shortResponse, setShortResponse] = useState("");

  useEffect(() => {
    const existing = history.find((record) => record.questionId === currentQuestion.id) as any;
    setPartAIndex(typeof existing?.partAIndex === "number" ? existing.partAIndex : null);
    setPartBIndices(Array.isArray(existing?.partBIndices) ? existing.partBIndices : []);
    setMultiIndices(Array.isArray(existing?.selectedIndices) ? existing.selectedIndices : []);
    setEssayResponse(typeof existing?.essay === "string" ? existing.essay : "");
    setShortResponse(typeof existing?.shortResponse === "string" ? existing.shortResponse : "");
    if (currentQuestion.type === "DRAG_DROP") {
      const initial = currentQuestion.dragItems.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = existing?.mapping?.[item.id] || currentQuestion.categories[0];
        return acc;
      }, {});
      setDragMapping(initial);
    } else {
      setDragMapping({});
    }
  }, [currentQuestion, history]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  async function safeSubmit(payload: SubmitPayload) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  function readTextAloud(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopReadAloud() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  async function submitMcq(index: number) {
    const q = currentQuestion as McqQuestion;
    const isCorrect = index === q.correctIndex;
    await safeSubmit({ isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "general_misread", answerPayload: { selectedIndex: index, correctIndex: q.correctIndex } });
  }

  function togglePartB(index: number) {
    setPartBIndices((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : prev.length >= 2 ? prev : [...prev, index]);
  }

  async function submitEbsr() {
    const q = currentQuestion as EbsrQuestion;
    if (partAIndex === null || partBIndices.length !== 2) return;
    const partACorrect = partAIndex === q.partACorrectIndex;
    const sortedStudent = [...partBIndices].sort((a, b) => a - b);
    const sortedCorrect = [...q.partBCorrectIndices].sort((a, b) => a - b);
    const partBCorrect = JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect);
    const isCorrect = partACorrect && partBCorrect;
    const scorePointsEarned = (partACorrect ? 1 : 0) + (partBCorrect ? 1 : 0);
    const errorPattern = isCorrect ? "none" : partACorrect && !partBCorrect ? "part_a_correct_but_evidence_wrong" : !partACorrect && partBCorrect ? "part_a_wrong_even_with_some_evidence_match" : "ebsr_double_miss_in_claim_and_evidence";
    await safeSubmit({ isCorrect, scorePointsEarned, maxPoints: 2, errorPattern, answerPayload: { partAIndex, partBIndices, partACorrectIndex: q.partACorrectIndex, partBCorrectIndices: q.partBCorrectIndices } });
  }

  async function submitHotText(index: number) {
    const q = currentQuestion as HotTextQuestion;
    const isCorrect = q.correctSpanIndices.includes(index);
    await safeSubmit({ isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "selected_related_sentence_not_best_text_evidence", answerPayload: { selectedSpanIndex: index, correctSpanIndices: q.correctSpanIndices } });
  }

  function toggleMulti(index: number) {
    setMultiIndices((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : prev.length >= 2 ? prev : [...prev, index]);
  }

  async function submitMulti() {
    const q = currentQuestion as MultiSelectQuestion;
    if (multiIndices.length !== 2) return;
    const sortedStudent = [...multiIndices].sort((a, b) => a - b);
    const sortedCorrect = [...q.correctIndices].sort((a, b) => a - b);
    const isCorrect = JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect);
    await safeSubmit({ isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "partial_or_incorrect_multi_select_combination", answerPayload: { selectedIndices: multiIndices, correctIndices: q.correctIndices } });
  }

  const dragReady = useMemo(() => currentQuestion.type === "DRAG_DROP" ? currentQuestion.dragItems.every((item) => Boolean(dragMapping[item.id])) : false, [currentQuestion, dragMapping]);

  async function submitDragDrop() {
    const q = currentQuestion as DragDropQuestion;
    const itemIds = Object.keys(q.correctMapping);
    const correctCount = itemIds.filter((id) => dragMapping[id] === q.correctMapping[id]).length;
    const isCorrect = correctCount === itemIds.length;
    await safeSubmit({ isCorrect, scorePointsEarned: correctCount, maxPoints: itemIds.length, errorPattern: isCorrect ? "none" : correctCount > 0 ? "partially_sorted_drag_drop_categories" : "drag_drop_category_confusion", answerPayload: { mapping: dragMapping, correctMapping: q.correctMapping, correctCount } });
  }

  async function submitTda() {
    const q = currentQuestion as TdaQuestion;
    if (essayResponse.trim().length < 10) return;
    await safeSubmit({ isCorrect: false, scorePointsEarned: 0, maxPoints: q.maxScore || 4, errorPattern: "pending_tda_grading", answerPayload: { essay: essayResponse.trim(), prompt: q.prompt, rubric: q.rubric, gradeLevel: q.gradeLevel || 6 } });
  }

  async function submitShortResponse() {
    const q = currentQuestion as ShortResponseQuestion;
    const response = shortResponse.trim();
    if (response.length < 8) return;
    const lower = response.toLowerCase();
    const evidenceWords = ["because", "text", "passage", "paragraph", "author", "shows", "suggests", "implies", "infer", "clue", "evidence"].filter((word) => lower.includes(word)).length;
    const scorePointsEarned = response.split(/\s+/).length >= 12 && evidenceWords >= 2 ? q.maxScore : evidenceWords >= 1 ? 1 : 0;
    await safeSubmit({
      isCorrect: scorePointsEarned >= q.maxScore,
      scorePointsEarned,
      maxPoints: q.maxScore,
      errorPattern: scorePointsEarned >= q.maxScore ? "inference_justified_with_evidence" : "inference_needs_more_text_evidence",
      answerPayload: { shortResponse: response, sampleAnswer: q.sampleAnswer, prompt: q.prompt },
    });
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-sm border border-slate-300 bg-white shadow">
      <header className="border-b border-slate-300 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-bold leading-tight text-slate-950">Baseline Diagnostic</h2>
            <p className="text-sm text-slate-600">PSSA ELA Practice</p>
          </div>
          <div className="text-center text-xl font-black tracking-tight text-slate-950">PSSA Prep Platform</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="rounded-full border border-slate-300 px-3 py-1">{currentQuestion.type}</span>
            <span className="rounded-full border border-slate-300 px-3 py-1">{currentQuestion.standardCode}</span>
          </div>
        </div>
        <div className="flex items-center justify-between bg-[#0b2a5b] px-4 py-2 text-white">
          <div className="flex items-center gap-2 text-lg font-bold">
            <button onClick={onReview} className="rounded px-2 py-1 text-left hover:bg-[#153b76]">Question: {currentQuestionNumber} ▾</button>
            <span className="text-sm">of {totalQuestions}</span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            {Array.from({ length: totalQuestions }).map((_, index) => {
              const questionId = questionIds[index] || currentQuestion.id;
              const answered = history.some((record) => record.questionId === questionId);
              const active = index === currentQuestionNumber - 1;
              const flagged = flaggedQuestionIds.includes(questionId);
              return <button onClick={() => onNavigate(index + 1)} key={index} className={`flex h-7 min-w-7 items-center justify-center rounded-sm border px-2 text-xs font-bold ${active ? "border-white bg-white text-[#0b2a5b]" : answered ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-blue-200 bg-[#153b76] text-white"}`}>{flagged ? "F" : index + 1}</button>;
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <ToolButton label="Previous Question" onClick={() => onNavigate(currentQuestionNumber - 1)} muted={currentQuestionNumber === 1}>&lt;</ToolButton>
            <ToolButton label="Next Question" onClick={() => onNavigate(currentQuestionNumber + 1)} muted={currentQuestionNumber === totalQuestions}>&gt;</ToolButton>
            <div className="ml-3 flex overflow-hidden rounded border border-[#0b2a5b] bg-white">
              <ToolButton label="Pointer" active={activeTool === "Pointer"} onClick={() => setActiveTool("Pointer")} compact><ToolIcon name="pointer" /></ToolButton>
              <ToolButton label="Highlighter" active={activeTool === "Highlighter"} onClick={() => setActiveTool("Highlighter")} compact><ToolIcon name="highlighter" /></ToolButton>
              <ToolButton label="Notepad" active={notesOpen} onClick={() => setNotesOpen((value) => !value)} compact><ToolIcon name="notepad" /></ToolButton>
              <ToolButton label="Magnifier" active={magnified} onClick={() => setMagnified((value) => !value)} compact><ToolIcon name="magnifier" /></ToolButton>
              <ToolButton label="Line Guide" active={lineGuide} onClick={() => setLineGuide((value) => !value)} compact><ToolIcon name="lineGuide" /></ToolButton>
              <ToolButton label="Masking" active={masking} onClick={() => setMasking((value) => !value)} compact><ToolIcon name="masking" /></ToolButton>
              <ToolButton label="Read Passage" active={isSpeaking} onClick={() => readTextAloud(buildPassageReadAloudText(currentQuestion))} compact><ToolIcon name="speaker" /></ToolButton>
              <ToolButton label="Read Question" active={isSpeaking} onClick={() => readTextAloud(buildQuestionReadAloudText(currentQuestion))} compact><ToolIcon name="questionSpeaker" /></ToolButton>
              <ToolButton label="Stop Read Aloud" onClick={stopReadAloud} compact><ToolIcon name="stopAudio" /></ToolButton>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ToolButton label="Flag Question" active={flaggedQuestionIds.includes(currentQuestion.id)} onClick={onToggleFlag} compact><ToolIcon name="flag" /></ToolButton>
            <ToolButton label="Pause Test" onClick={onPause} compact><ToolIcon name="pause" /></ToolButton>
            <ToolButton label="Review / End Test" onClick={onReview} compact><ToolIcon name="review" /></ToolButton>
          </div>
        </div>
      </header>

      <main className="grid min-h-[620px] bg-slate-100 lg:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.85fr)]">
        <section className={`relative max-h-[calc(100vh-15rem)] overflow-y-auto border-r-4 border-slate-500 bg-white p-4 lg:p-6 ${activeTool === "Highlighter" ? "cursor-crosshair selection:bg-yellow-300" : ""} ${magnified ? "text-xl" : ""}`}>
          {masking ? <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-slate-900/10" /> : null}
          {lineGuide ? <div className="pointer-events-none sticky top-1 z-20 h-8 rounded border-2 border-amber-400 bg-amber-100/40" /> : null}
          <div className="mx-auto max-w-4xl border-4 border-[#0b2a5b] bg-white p-4">
            <p className="mb-4 text-lg font-bold">Read the following passage.</p>
            <h1 className="text-center text-2xl font-bold text-slate-950">{currentQuestion.passageTitle}</h1>
            <div className="mt-5">
              <PassageDisplay question={currentQuestion} highlighterActive={activeTool === "Highlighter"} highlightedChunks={highlightedChunks} onToggleHighlight={(key) => setHighlightedChunks((prev) => ({ ...prev, [key]: !prev[key] }))} />
            </div>
          </div>
        </section>

        <section className={`max-h-[calc(100vh-15rem)] overflow-y-auto bg-white p-4 lg:p-6 ${activeTool === "Highlighter" ? "selection:bg-yellow-300" : ""} ${magnified ? "text-lg" : ""}`}>
          <div className="min-h-full border-4 border-[#0b2a5b] p-4">
            <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>{formatPassageType(currentQuestion.passageType || "Question")}</span>
              <span>{currentQuestion.skill}</span>
            </div>
            <QuestionPanel
              currentQuestion={currentQuestion}
              isSubmitting={isSubmitting}
              partAIndex={partAIndex}
              setPartAIndex={setPartAIndex}
              partBIndices={partBIndices}
              togglePartB={togglePartB}
              submitEbsr={submitEbsr}
              submitHotText={submitHotText}
              multiIndices={multiIndices}
              toggleMulti={toggleMulti}
              submitMulti={submitMulti}
              dragMapping={dragMapping}
              setDragMapping={setDragMapping}
              dragReady={dragReady}
              submitDragDrop={submitDragDrop}
              essayResponse={essayResponse}
              setEssayResponse={setEssayResponse}
              submitTda={submitTda}
              shortResponse={shortResponse}
              setShortResponse={setShortResponse}
              submitShortResponse={submitShortResponse}
              submitMcq={submitMcq}
            />
          </div>
        </section>
      </main>

      {notesOpen ? <div className="fixed bottom-5 right-5 z-40 w-80 rounded border-2 border-[#0b2a5b] bg-yellow-50 p-3 shadow-xl"><div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-slate-950">Notepad</h3><button onClick={() => setNotesOpen(false)} className="font-bold">x</button></div><textarea value={studentNotes} onChange={(event) => setStudentNotes(event.target.value)} className="h-44 w-full rounded border border-slate-400 bg-white p-2 text-sm" placeholder="Type notes for this test. Notes are not submitted." /></div> : null}
      {isPaused ? <Modal title="Test Paused"><p className="text-slate-700">Your answers are saved. Resume when you are ready.</p><div className="mt-5 flex gap-3"><button onClick={onResume} className="rounded bg-[#0b2a5b] px-4 py-2 font-bold text-white">Resume Test</button></div></Modal> : null}
      {reviewOpen ? <ReviewModal totalQuestions={totalQuestions} history={history} flaggedQuestionIds={flaggedQuestionIds} currentQuestionNumber={currentQuestionNumber} questionIds={questionIds} onNavigate={onNavigate} onClose={onCloseReview} onEndTest={onEndTest} /> : null}
    </div>
  );
}

function QuestionPanel({
  currentQuestion,
  isSubmitting,
  partAIndex,
  setPartAIndex,
  partBIndices,
  togglePartB,
  submitEbsr,
  submitHotText,
  multiIndices,
  toggleMulti,
  submitMulti,
  dragMapping,
  setDragMapping,
  dragReady,
  submitDragDrop,
  essayResponse,
  setEssayResponse,
  submitTda,
  shortResponse,
  setShortResponse,
  submitShortResponse,
  submitMcq,
}: any) {
  if (currentQuestion.type === "MCQ" || currentQuestion.type === "CONVENTIONS") {
    const q = currentQuestion as McqQuestion;
    return <div><Prompt>{q.question}</Prompt><ChoiceList choices={q.choices} onChoose={submitMcq} disabled={isSubmitting} /></div>;
  }
  if (currentQuestion.type === "EBSR") {
    const q = currentQuestion as EbsrQuestion;
    return <div className="space-y-6"><div><div className="mb-2 font-bold text-slate-900">Part A</div><Prompt>{q.partAQuestion}</Prompt><ChoiceList choices={q.partAChoices} selectedIndex={partAIndex} onChoose={setPartAIndex} /></div><div><div className="mb-2 font-bold text-slate-900">Part B</div><Prompt>{q.partBQuestion}</Prompt><ChoiceList choices={q.partBChoices} selectedIndices={partBIndices} onChoose={togglePartB} /></div><button onClick={submitEbsr} disabled={isSubmitting || partAIndex === null || partBIndices.length !== 2} className="rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit EBSR Response</button></div>;
  }
  if (currentQuestion.type === "HOT_TEXT") {
    const q = currentQuestion as HotTextQuestion;
    return <div><Prompt>{q.hotTextPrompt}</Prompt><div className="mt-5 space-y-3">{q.selectableSpans.map((span, index) => <button key={index} onClick={() => submitHotText(index)} className="block w-full rounded border-2 border-slate-300 bg-white p-3 text-left leading-6 hover:border-[#0b2a5b] hover:bg-blue-50">{span}</button>)}</div></div>;
  }
  if (currentQuestion.type === "MULTI_SELECT") {
    const q = currentQuestion as MultiSelectQuestion;
    return <div><Prompt>{q.question}</Prompt><ChoiceList choices={q.choices} selectedIndices={multiIndices} onChoose={toggleMulti} /><button onClick={submitMulti} disabled={isSubmitting || multiIndices.length !== 2} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Multi-Select Response</button></div>;
  }
  if (currentQuestion.type === "DRAG_DROP") {
    const q = currentQuestion as DragDropQuestion;
    return <div><Prompt>{q.dragDropPrompt}</Prompt><div className="mt-5 space-y-4">{q.dragItems.map((item) => <div key={item.id} className="rounded border-2 border-slate-300 p-3"><div className="leading-6">{item.text}</div><select value={dragMapping[item.id] || q.categories[0]} onChange={(event) => setDragMapping((prev: Record<string, string>) => ({ ...prev, [item.id]: event.target.value }))} className="mt-3 w-full rounded border border-slate-400 px-3 py-2">{q.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>)}</div><button onClick={submitDragDrop} disabled={isSubmitting || !dragReady} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Drag-and-Drop Response</button></div>;
  }
  if (currentQuestion.type === "SHORT_RESPONSE") {
    const q = currentQuestion as ShortResponseQuestion;
    return <div><div className="mb-3 text-sm font-bold uppercase text-slate-600">Justify Your Thinking</div><Prompt>{q.prompt}</Prompt><p className="mt-3 text-sm leading-6 text-slate-700">Use clues from the text and explain what you can infer. Include evidence.</p><textarea value={shortResponse} onChange={(event) => setShortResponse(event.target.value)} className="mt-5 h-44 w-full rounded border-2 border-slate-400 p-4 leading-7" placeholder="Write your inference and support it with text evidence." /><button onClick={submitShortResponse} disabled={isSubmitting || shortResponse.trim().length < 8} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Short Response</button></div>;
  }
  const q = currentQuestion as TdaQuestion;
  return <div><div className="mb-3 text-sm font-bold uppercase text-slate-600">Text-Dependent Analysis</div><Prompt>{q.prompt}</Prompt><p className="mt-3 text-sm leading-6 text-slate-700">{q.rubric}</p><textarea value={essayResponse} onChange={(event) => setEssayResponse(event.target.value)} className="mt-5 h-72 w-full rounded border-2 border-slate-400 p-4 leading-7" placeholder="Type your essay response here. Use evidence from the passage and explain your thinking." /><button onClick={submitTda} disabled={isSubmitting || essayResponse.trim().length < 10} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit TDA Essay</button></div>;
}

function PassageDisplay({ question, highlighterActive, highlightedChunks, onToggleHighlight }: { question: Question; highlighterActive: boolean; highlightedChunks: Record<string, boolean>; onToggleHighlight: (key: string) => void }) {
  if (question.type === "CONVENTIONS") {
    return <div className="leading-7 text-slate-800">{question.passage}</div>;
  }
  const parts = question.passage.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-4 text-[17px] leading-8 text-slate-950">
      {parts.map((part, index) => {
        const key = `${question.id}-${index}`;
        const highlighted = Boolean(highlightedChunks[key]);
        if (part.startsWith("## ")) return <h2 key={index} className="pt-3 text-xl font-black">{part.replace(/^##\s+/, "")}</h2>;
        const content = <p className={`whitespace-pre-wrap rounded px-1 ${highlighted ? "bg-yellow-200" : ""}`}>{part}</p>;
        if (part.startsWith("Text 1:") || part.startsWith("Text 2:")) return <div key={index} className="border-t-2 border-slate-300 pt-4">{highlighterActive ? <button type="button" onClick={() => onToggleHighlight(key)} className="block w-full text-left">{content}</button> : content}</div>;
        return highlighterActive ? <button key={index} type="button" onClick={() => onToggleHighlight(key)} className="block w-full text-left">{content}</button> : <div key={index}>{content}</div>;
      })}
      {question.tableData ? <div className="overflow-x-auto border-2 border-[#0b2a5b] bg-white"><table className="min-w-full text-left text-sm"><caption className="p-3 text-left text-base font-bold">{question.tableData.title}</caption><thead className="bg-slate-100"><tr>{question.tableData.columns.map((column) => <th key={column} className="border-t border-slate-300 p-3 font-bold">{column}</th>)}</tr></thead><tbody>{question.tableData.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-t border-slate-300 p-3">{cell}</td>)}</tr>)}</tbody></table></div> : null}
    </div>
  );
}

function ChoiceList({ choices, onChoose, disabled, selectedIndex, selectedIndices = [] }: { choices: string[]; onChoose: (index: number) => void; disabled?: boolean; selectedIndex?: number | null; selectedIndices?: number[] }) {
  return <div className="mt-6 space-y-5">{choices.map((choice, index) => { const selected = selectedIndex === index || selectedIndices.includes(index); return <button key={index} onClick={() => onChoose(index)} disabled={disabled} className={`flex w-full items-start gap-3 rounded border-2 p-3 text-left text-lg leading-6 disabled:opacity-60 ${selected ? "border-[#0b2a5b] bg-blue-50" : "border-transparent hover:border-[#0b2a5b] hover:bg-blue-50"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 text-base font-bold">{String.fromCharCode(97 + index)}</span><span>{choice}</span></button>; })}</div>;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold leading-7 text-slate-950">{children}</h3>;
}

function ReviewModal({ totalQuestions, history, flaggedQuestionIds, currentQuestionNumber, questionIds, onNavigate, onClose, onEndTest }: { totalQuestions: number; history: ResponseRecord[]; flaggedQuestionIds: number[]; currentQuestionNumber: number; questionIds: number[]; onNavigate: (questionNumber: number) => void; onClose: () => void; onEndTest: () => Promise<void> }) {
  const answeredIds = new Set(history.map((record) => record.questionId));
  return (
    <Modal title="Review Questions">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const questionNumber = index + 1;
          const questionId = questionIds[index];
          const answered = answeredIds.has(questionId);
          const flagged = flaggedQuestionIds.includes(questionId);
          const active = currentQuestionNumber === questionNumber;
          return <button key={questionNumber} onClick={() => { onNavigate(questionNumber); onClose(); }} className={`rounded border-2 p-3 text-sm font-bold ${active ? "border-[#0b2a5b] bg-blue-50" : answered ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white"}`}>{flagged ? "Flag " : ""}{questionNumber}<span className="block text-xs font-medium">{answered ? "Answered" : "Blank"}</span></button>;
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onClose} className="rounded border-2 border-slate-400 px-4 py-2 font-bold">Return to Test</button>
        <button onClick={onEndTest} className="rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-4 py-2 font-bold text-white">End Test</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-2xl rounded border-4 border-[#0b2a5b] bg-white p-5 shadow-2xl"><h2 className="mb-4 text-2xl font-black text-slate-950">{title}</h2>{children}</div></div>;
}

function ToolButton({ label, children, compact, muted, active, onClick }: { label: string; children?: React.ReactNode; compact?: boolean; muted?: boolean; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} disabled={muted && (label.includes("Previous") || label.includes("Next"))} aria-label={label} title={label} className={`${compact ? "h-10 min-w-10 px-3 text-sm" : "h-12 min-w-14 px-4 text-2xl"} rounded border font-black disabled:opacity-50 ${active ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : muted ? "border-slate-200 bg-slate-200 text-slate-600" : "border-[#0b2a5b] bg-white text-[#0b2a5b]"}`}>{children || label.slice(0, 1)}</button>;
}

function ToolIcon({ name }: { name: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "pointer") return <svg {...common}><path d="M5 3l12 9-5 1 3 6-3 1-3-6-4 4V3z" /></svg>;
  if (name === "highlighter") return <svg {...common}><path d="M4 20h8" /><path d="M14 4l6 6-9 9H5v-6l9-9z" /><path d="M13 5l6 6" /></svg>;
  if (name === "notepad") return <svg {...common}><path d="M7 3h10a2 2 0 012 2v16l-4-3H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M8 8h8M8 12h6" /></svg>;
  if (name === "magnifier") return <svg {...common}><circle cx="10" cy="10" r="5" /><path d="M14 14l5 5" /><path d="M10 7v6M7 10h6" /></svg>;
  if (name === "lineGuide") return <svg {...common}><path d="M4 7h12M4 12h16M4 17h12" /><path d="M19 7l-3 5 3 5" /></svg>;
  if (name === "masking") return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M4 14h16" /></svg>;
  if (name === "flag") return <svg {...common}><path d="M6 21V4" /><path d="M6 4h11l-2 4 2 4H6" /></svg>;
  if (name === "pause") return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>;
  if (name === "speaker") return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a5 5 0 010 6" /><path d="M18 6a9 9 0 010 12" /></svg>;
  if (name === "questionSpeaker") return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9a3 3 0 113 3c-1.4 0-2 .8-2 2" /><path d="M18 19h.01" /></svg>;
  if (name === "stopAudio") return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l4 4M21 9l-4 4" /></svg>;
  return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
}

function formatPassageType(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildPassageReadAloudText(question: Question) {
  const tableText = question.tableData
    ? `Table: ${question.tableData.title}. Columns: ${question.tableData.columns.join(", ")}. Rows: ${question.tableData.rows.map((row) => row.join(", ")).join(". ")}.`
    : "";
  return [question.passageTitle, question.passage, tableText].filter(Boolean).join(". ");
}

function buildQuestionReadAloudText(question: Question) {
  if (question.type === "EBSR") {
    return [
      "Part A.",
      question.partAQuestion,
      readChoices(question.partAChoices),
      "Part B.",
      question.partBQuestion,
      readChoices(question.partBChoices),
    ].join(" ");
  }
  if (question.type === "HOT_TEXT") return [question.hotTextPrompt, "Options.", readChoices(question.selectableSpans)].join(" ");
  if (question.type === "MULTI_SELECT" || question.type === "MCQ" || question.type === "CONVENTIONS") return [question.question, readChoices(question.choices)].join(" ");
  if (question.type === "DRAG_DROP") return [question.dragDropPrompt, "Items.", question.dragItems.map((item) => item.text).join(". "), "Categories.", question.categories.join(", ")].join(" ");
  if (question.type === "SHORT_RESPONSE") return [question.prompt, "Use clues from the text and explain your inference with evidence."].join(" ");
  const tda = question as TdaQuestion;
  return [tda.prompt, tda.rubric].join(" ");
}

function readChoices(choices: string[]) {
  return choices.map((choice, index) => `Choice ${String.fromCharCode(65 + index)}. ${choice}`).join(" ");
}
