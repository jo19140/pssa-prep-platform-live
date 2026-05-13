"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DragDropQuestion, EbsrQuestion, HotTextQuestion, McqQuestion, MultiSelectQuestion, Question, ResponseRecord, ShortResponseQuestion, TdaQuestion } from "@/types";

type SubmitPayload = { isCorrect: boolean; scorePointsEarned: number; maxPoints: number; errorPattern: string; answerPayload: Record<string, unknown>; };
type MaskBox = { id: number; x: number; y: number; width: number; height: number; };

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
  const [highlightScope, setHighlightScope] = useState<"word" | "sentence">("sentence");
  const [magnified, setMagnified] = useState(false);
  const [lineGuide, setLineGuide] = useState(false);
  const [masking, setMasking] = useState(false);
  const [maskMenuOpen, setMaskMenuOpen] = useState(false);
  const [maskVisible, setMaskVisible] = useState(true);
  const [maskBoxes, setMaskBoxes] = useState<MaskBox[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSpanIndex, setSelectedSpanIndex] = useState<number | null>(null);
  const [partAIndex, setPartAIndex] = useState<number | null>(null);
  const [partBIndices, setPartBIndices] = useState<number[]>([]);
  const [multiIndices, setMultiIndices] = useState<number[]>([]);
  const [dragMapping, setDragMapping] = useState<Record<string, string>>({});
  const [essayResponse, setEssayResponse] = useState("");
  const [shortResponse, setShortResponse] = useState("");
  const zoomStyle = magnified ? ({ zoom: 1.25 } as CSSProperties) : undefined;

  useEffect(() => {
    const existing = history.find((record) => record.questionId === currentQuestion.id) as any;
    setSelectedIndex(typeof existing?.selectedIndex === "number" ? existing.selectedIndex : null);
    setSelectedSpanIndex(typeof existing?.selectedSpanIndex === "number" ? existing.selectedSpanIndex : null);
    setPartAIndex(typeof existing?.partAIndex === "number" ? existing.partAIndex : null);
    setPartBIndices(Array.isArray(existing?.partBIndices) ? existing.partBIndices : []);
    setMultiIndices(Array.isArray(existing?.selectedIndices) ? existing.selectedIndices : []);
    setEssayResponse(typeof existing?.essay === "string" ? existing.essay : "");
    setShortResponse(typeof existing?.shortResponse === "string" ? existing.shortResponse : "");
    if (currentQuestion.type === "DRAG_DROP") {
      const initial = currentQuestion.dragItems.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = existing?.mapping?.[item.id] || "";
        return acc;
      }, {});
      setDragMapping(initial);
    } else {
      setDragMapping({});
    }
  }, [currentQuestion, history]);

  async function safeSubmit(payload: SubmitPayload) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  function addMaskBox() {
    setMaskVisible(true);
    setMaskBoxes((prev) => [
      ...prev,
      {
        id: Date.now(),
        x: 560 + prev.length * 24,
        y: 150 + prev.length * 24,
        width: 280,
        height: 126,
      },
    ]);
  }

  function toggleMaskingTool() {
    setMasking((prev) => {
      const next = !prev;
      setMaskMenuOpen(next);
      if (next) {
        setMaskVisible(true);
        setMaskBoxes((boxes) => boxes.length ? boxes : [{ id: Date.now(), x: 560, y: 150, width: 280, height: 126 }]);
      }
      return next;
    });
  }

  async function submitMcq(index: number) {
    const q = currentQuestion as McqQuestion;
    setSelectedIndex(index);
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
    setSelectedSpanIndex(index);
    const isCorrect = q.correctSpanIndices.includes(index);
    await safeSubmit({ isCorrect, scorePointsEarned: isCorrect ? 1 : 0, maxPoints: 1, errorPattern: isCorrect ? "none" : "selected_related_sentence_not_best_text_evidence", answerPayload: { selectedSpanIndex: index, correctSpanIndices: q.correctSpanIndices } });
  }

  function toggleMulti(index: number) {
    if (currentQuestion.type === "MULTI_SELECT" && (currentQuestion as any).interactionMode === "CHECK_TABLE") {
      const categoryCount = ((currentQuestion as any).categories || ["Formal Style", "Informal Style"]).length;
      const rowIndex = Math.floor(index / categoryCount);
      setMultiIndices((prev) => prev.includes(index) ? prev.filter((value) => value !== index) : [...prev.filter((value) => Math.floor(value / categoryCount) !== rowIndex), index]);
      return;
    }
    const maxSelections = currentQuestion.type === "MULTI_SELECT" ? currentQuestion.correctIndices.length : 2;
    setMultiIndices((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : prev.length >= maxSelections ? prev : [...prev, index]);
  }

  async function submitMulti() {
    const q = currentQuestion as MultiSelectQuestion;
    if (multiIndices.length !== q.correctIndices.length) return;
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
    await safeSubmit({ isCorrect: false, scorePointsEarned: 0, maxPoints: q.maxScore || 4, errorPattern: "pending_tda_grading", answerPayload: { essay: essayResponse.trim(), prompt: q.prompt, passage: q.passage || "", rubric: q.rubric, gradeLevel: q.gradeLevel || 6 } });
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
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-sm border border-slate-300 bg-white shadow">
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
          <div className="hidden max-w-[calc(100vw-22rem)] flex-wrap items-center justify-end gap-1 overflow-y-auto md:flex">
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
              {activeTool === "Highlighter" ? <ToolButton label={`Highlight ${highlightScope === "word" ? "Words" : "Sentences"}`} active onClick={() => setHighlightScope((value) => value === "word" ? "sentence" : "word")} compact>{highlightScope === "word" ? "W" : "S"}</ToolButton> : null}
              <ToolButton label="Notepad" active={notesOpen} onClick={() => setNotesOpen((value) => !value)} compact><ToolIcon name="notepad" /></ToolButton>
              <ToolButton label={magnified ? "Magnifier On" : "Magnifier"} active={magnified} onClick={() => setMagnified((value) => !value)} compact><ToolIcon name="magnifier" /></ToolButton>
              <ToolButton label="Line Guide" active={lineGuide} onClick={() => setLineGuide((value) => !value)} compact><ToolIcon name="lineGuide" /></ToolButton>
              <ToolButton label="Masking" active={masking} onClick={toggleMaskingTool} compact><ToolIcon name="masking" /></ToolButton>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ToolButton label="Flag Question" active={flaggedQuestionIds.includes(currentQuestion.id)} onClick={onToggleFlag} compact><ToolIcon name="flag" /></ToolButton>
            <ToolButton label="Pause Test" onClick={onPause} compact><ToolIcon name="pause" /></ToolButton>
            <ToolButton label="Review / End Test" onClick={onReview} compact><ToolIcon name="review" /></ToolButton>
          </div>
        </div>
      </header>

      {masking && maskMenuOpen ? (
        <div className="absolute left-[30rem] top-[8.8rem] z-50 w-52 border-2 border-[#0b2a5b] bg-white text-[#0b2a5b] shadow-xl">
          <button type="button" onClick={addMaskBox} className="block w-full border-b border-slate-300 bg-blue-50 px-4 py-3 text-left font-bold hover:bg-blue-100">Add Mask</button>
          <button type="button" onClick={() => setMaskVisible((value) => !value)} className="block w-full px-4 py-3 text-left font-bold hover:bg-blue-50">{maskVisible ? "Hide Masks" : "Show Masks"}</button>
        </div>
      ) : null}

      {masking && maskVisible ? (
        <MaskingLayer
          masks={maskBoxes}
          onChange={setMaskBoxes}
          onRemove={(id) => setMaskBoxes((boxes) => boxes.filter((box) => box.id !== id))}
        />
      ) : null}

      {currentQuestion.passageType === "CONVENTIONS" ? (
        <main className="min-h-[620px] bg-slate-100 p-4">
          <section className="relative max-h-[calc(100vh-15rem)] overflow-y-auto bg-white p-4 lg:p-6">
            {lineGuide ? <div className="pointer-events-none sticky top-1 z-20 h-8 rounded border-2 border-amber-400 bg-amber-100/40" /> : null}
            <div style={zoomStyle} className="mx-auto min-h-[calc(100vh-18rem)] max-w-[calc(100vw-4.5rem)] origin-top-left border-4 border-[#0b2a5b] bg-white p-4 md:p-6">
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
                selectedIndex={selectedIndex}
                selectedSpanIndex={selectedSpanIndex}
              />
            </div>
          </section>
        </main>
      ) : (
      <main className="grid min-h-[620px] bg-slate-100 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.85fr)]">
        <section className={`relative max-h-[calc(100vh-15rem)] overflow-y-auto border-b-4 border-slate-500 bg-white p-4 md:border-b-0 md:border-r-4 lg:p-6 ${activeTool === "Highlighter" ? "cursor-crosshair selection:bg-yellow-300" : ""}`}>
          {lineGuide ? <div className="pointer-events-none sticky top-1 z-20 h-8 rounded border-2 border-amber-400 bg-amber-100/40" /> : null}
          <div style={zoomStyle} className="mx-auto max-w-4xl origin-top-left border-4 border-[#0b2a5b] bg-white p-4">
            <p className="mb-4 text-lg font-bold">Read the following passage.</p>
            <h1 className="text-center text-2xl font-bold text-slate-950">{currentQuestion.passageTitle}</h1>
            <div className="mt-5">
              <PassageDisplay question={currentQuestion} highlighterActive={activeTool === "Highlighter"} highlightScope={highlightScope} highlightedChunks={highlightedChunks} onToggleHighlight={(key) => setHighlightedChunks((prev) => ({ ...prev, [key]: !prev[key] }))} />
            </div>
          </div>
        </section>

        <section className={`relative max-h-[calc(100vh-15rem)] overflow-y-auto bg-white p-4 lg:p-6 ${activeTool === "Highlighter" ? "selection:bg-yellow-300" : ""}`}>
          <div style={zoomStyle} className="min-h-full origin-top-left border-4 border-[#0b2a5b] p-4">
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
              selectedIndex={selectedIndex}
              selectedSpanIndex={selectedSpanIndex}
            />
          </div>
        </section>
      </main>
      )}

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
  selectedIndex,
  selectedSpanIndex,
}: any) {
  const conventionPanel = currentQuestion.passageType === "CONVENTIONS";
  if (currentQuestion.type === "MCQ" || currentQuestion.type === "CONVENTIONS") {
    const q = currentQuestion as McqQuestion;
    const conventionsStimulus = conventionPanel ? getConventionsStimulus(q) : "";
    return <div className={conventionPanel ? "max-w-5xl text-[17px]" : ""}>{conventionPanel ? <PssaPracticeHint>Use the Pointer tool to select your answer.</PssaPracticeHint> : null}{conventionsStimulus ? <ConventionsStimulus text={conventionsStimulus} /> : null}<Prompt>{q.question}</Prompt><ChoiceList choices={q.choices} selectedIndex={selectedIndex} onChoose={submitMcq} disabled={isSubmitting} /></div>;
  }
  if (currentQuestion.type === "EBSR") {
    const q = currentQuestion as EbsrQuestion;
    return <div className="space-y-6"><div><div className="mb-2 font-bold text-slate-900">Part A</div><Prompt>{q.partAQuestion}</Prompt><ChoiceList choices={q.partAChoices} selectedIndex={partAIndex} onChoose={setPartAIndex} /></div><div><div className="mb-2 font-bold text-slate-900">Part B</div><Prompt>{q.partBQuestion}</Prompt><ChoiceList choices={q.partBChoices} selectedIndices={partBIndices} onChoose={togglePartB} /></div><button onClick={submitEbsr} disabled={isSubmitting || partAIndex === null || partBIndices.length !== 2} className="rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit EBSR Response</button></div>;
  }
  if (currentQuestion.type === "HOT_TEXT") {
    const q = currentQuestion as HotTextQuestion;
    if ((q as any).interactionMode === "SUMMARY_HIGHLIGHT") {
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>When you select a sentence below, the sentence will become highlighted. To change your answer, select a different sentence.</PssaPracticeHint><Prompt>{q.hotTextPrompt}</Prompt><p className="mt-5 text-base leading-6">Nora notices that the courtyard exhibit may be damaged by the storm. She wants to protect the class project and feels responsible for what happens next. After the problem is solved, Nora better understands what leadership means.</p><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><div className="space-y-3 text-base leading-6">{q.selectableSpans.map((span, index) => {
        const selected = selectedSpanIndex === index;
        return <button key={index} onClick={() => submitHotText(index)} className={`block w-full rounded px-1 text-left ${selected ? "bg-yellow-300 outline outline-2 outline-[#0b2a5b]" : "hover:bg-yellow-100"}`}>{span}</button>;
      })}</div></PssaToolFrame></div>;
    }
    if ((q as any).interactionMode === "SENTENCE_HIGHLIGHT") {
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>When you select a sentence below, it will become highlighted. Use the selected sentence as your answer.</PssaPracticeHint><Prompt>{q.hotTextPrompt}</Prompt><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><div className="text-base leading-8 md:text-lg">{q.selectableSpans.map((span, index) => {
        const selected = selectedSpanIndex === index;
        return <button key={index} onClick={() => submitHotText(index)} className={`mx-0.5 rounded px-1 text-left ${selected ? "bg-yellow-300 outline outline-2 outline-[#0b2a5b]" : "hover:bg-yellow-100"}`}>({index + 1}) {span}</button>;
      })}</div></PssaToolFrame></div>;
    }
    return <div><Prompt>{q.hotTextPrompt}</Prompt><div className="mt-5 space-y-3">{q.selectableSpans.map((span, index) => {
      const selected = selectedSpanIndex === index;
      return <button key={index} onClick={() => submitHotText(index)} className={`block w-full rounded border-2 p-3 text-left leading-6 hover:border-[#0b2a5b] hover:bg-blue-50 ${selected ? "border-[#0b2a5b] bg-blue-50" : "border-slate-300 bg-white"}`}>{span}</button>;
    })}</div></div>;
  }
  if (currentQuestion.type === "MULTI_SELECT") {
    const q = currentQuestion as MultiSelectQuestion;
    if ((q as any).interactionMode === "SELECT_TO_RESPOND") {
      const requiredSelections = q.correctIndices.length;
      const selectedChoices = multiIndices.map((index: number) => q.choices[index]).filter(Boolean);
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>Select the image below to view the answer choices. Then select your responses into the box. To change an answer, select it again.</PssaPracticeHint><Prompt>{q.question}</Prompt><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><div className="space-y-3">{q.choices.map((choice, index) => {
        const selected = multiIndices.includes(index);
        return <button key={choice} type="button" onClick={() => toggleMulti(index)} className={`block w-full text-left font-bold text-blue-700 ${selected ? "rounded bg-blue-100 p-1 outline outline-2 outline-[#0b2a5b]" : "p-1 hover:underline"}`}>{choice}</button>;
      })}</div><div className="mt-5 min-h-28 border-2 border-slate-950 bg-white p-2 text-sm leading-5">{selectedChoices.length ? selectedChoices.map((choice) => <div key={choice} className="mb-2 rounded bg-blue-50 p-2 font-semibold text-[#0b2a5b]">{choice}</div>) : <span className="text-slate-500">Selected responses will appear here.</span>}</div></PssaToolFrame><button onClick={submitMulti} disabled={isSubmitting || multiIndices.length !== requiredSelections} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Select-to-Respond</button></div>;
    }
    if ((q as any).interactionMode === "CHECK_TABLE") {
      const categories = ((q as any).categories || ["Formal Style", "Informal Style"]) as string[];
      const selectedByRow = (rowIndex: number) => multiIndices.find((value: number) => Math.floor(value / categories.length) === rowIndex);
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>To place a check mark, select an empty box in the table. To erase a check mark you have placed, select it again.</PssaPracticeHint><Prompt>{q.question}</Prompt><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><table className="mt-3 w-full border-collapse text-sm"><thead><tr><th className="border border-slate-950 p-2 text-left"></th>{categories.map((category) => <th key={category} className="border border-slate-950 p-2 text-center font-bold">{category}</th>)}</tr></thead><tbody>{q.choices.map((choice, rowIndex) => <tr key={choice}>{<td className="border border-slate-950 p-2 align-top">{choice}</td>}{categories.map((category, categoryIndex) => {
        const cellIndex = rowIndex * categories.length + categoryIndex;
        const selected = selectedByRow(rowIndex) === cellIndex;
        return <td key={category} className="border border-slate-950 p-2 text-center"><button type="button" onClick={() => toggleMulti(cellIndex)} className={`mx-auto flex h-8 w-8 items-center justify-center rounded border-2 text-lg font-black ${selected ? "border-[#0b2a5b] bg-blue-100 text-[#0b2a5b]" : "border-slate-400 bg-white text-transparent"}`}>X</button></td>;
      })}</tr>)}</tbody></table></PssaToolFrame><button onClick={submitMulti} disabled={isSubmitting || multiIndices.length !== q.choices.length} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Check-Table Response</button></div>;
    }
    const requiredSelections = q.correctIndices.length;
    return <div><Prompt>{q.question}</Prompt><p className="mt-3 text-sm font-semibold text-slate-600">Choose {requiredSelections} answers.</p><ChoiceList choices={q.choices} selectedIndices={multiIndices} onChoose={toggleMulti} /><button onClick={submitMulti} disabled={isSubmitting || multiIndices.length !== requiredSelections} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Multi-Select Response</button></div>;
  }
  if (currentQuestion.type === "DRAG_DROP") {
    const q = currentQuestion as DragDropQuestion;
    if ((q as any).interactionMode === "MATCH_LINES") {
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>Using the Pointer tool, select a title on the left side and then select a detail on the right side. In this practice screen, use each drop-down to show the connection.</PssaPracticeHint><Prompt>{q.dragDropPrompt}</Prompt><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><div className="grid gap-4 md:grid-cols-[1fr_1.4fr]"><div className="space-y-8">{q.categories.map((category) => <div key={category} className="border-2 border-blue-500 bg-white p-2 text-center font-bold">{category}</div>)}</div><div className="space-y-3">{q.dragItems.map((item) => <div key={item.id} className="rounded border border-slate-400 bg-white p-2"><div className="mb-2 text-sm">{item.text}</div><select value={dragMapping[item.id] || ""} onChange={(event) => setDragMapping((prev: Record<string, string>) => ({ ...prev, [item.id]: event.target.value }))} className="w-full rounded border-2 border-slate-500 px-2 py-1"><option value="">Select passage title</option>{q.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>)}</div></div></PssaToolFrame><button onClick={submitDragDrop} disabled={isSubmitting || !dragReady} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Matching Response</button></div>;
    }
    if ((q as any).interactionMode === "INLINE_DROPDOWN") {
      const parts = ((q as any).clozeParts || []) as string[];
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>Use the Pointer tool to open each drop-down list and select your answers.</PssaPracticeHint><Prompt>{q.dragDropPrompt}</Prompt><div className="mt-6 rounded-sm border-2 border-[#0b2a5b] bg-white p-4 text-base leading-8 md:text-lg">{parts.map((part, index) => <span key={index}>{part}{q.dragItems[index] ? <select value={dragMapping[q.dragItems[index].id] || ""} onChange={(event) => setDragMapping((prev: Record<string, string>) => ({ ...prev, [q.dragItems[index].id]: event.target.value }))} className="mx-2 min-w-32 rounded border-2 border-slate-950 bg-white px-2 py-1 align-baseline"><option value=""></option>{q.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select> : null}</span>)}</div><button onClick={submitDragDrop} disabled={isSubmitting || !dragReady} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Drop-Down Response</button></div>;
    }
    if ((q as any).interactionMode === "SENTENCE_BLANK") {
      const selected = dragMapping.blank || "";
      return <div className={conventionPanel ? "max-w-6xl" : ""}><PssaPracticeHint>Move your answer onto the blank line. To change your answer, select a different answer.</PssaPracticeHint><Prompt>{q.dragDropPrompt}</Prompt><PssaToolFrame className={conventionPanel ? "mx-auto max-w-4xl" : ""}><p className="text-base">The sixth-grade basketball team lost the district championship game at the last second.</p><div className="mt-3 min-h-10 border-b-2 border-slate-950 text-center text-base font-bold text-[#0b2a5b]">{selected}</div><div className="mt-8 space-y-3 text-center">{q.categories.map((category) => <button key={category} type="button" onClick={() => setDragMapping({ blank: category })} className={`block w-full font-bold text-blue-700 hover:underline ${selected === category ? "rounded bg-blue-100 py-1" : ""}`}>{category}</button>)}</div></PssaToolFrame><button onClick={submitDragDrop} disabled={isSubmitting || !dragReady} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Blank-Line Response</button></div>;
    }
    return <div><Prompt>{q.dragDropPrompt}</Prompt><div className="mt-5 space-y-4">{q.dragItems.map((item) => <div key={item.id} className="rounded border-2 border-slate-300 p-3"><div className="leading-6">{item.text}</div><select value={dragMapping[item.id] || ""} onChange={(event) => setDragMapping((prev: Record<string, string>) => ({ ...prev, [item.id]: event.target.value }))} className={`mt-3 w-full rounded border px-3 py-2 ${dragMapping[item.id] ? "border-[#0b2a5b] bg-blue-50" : "border-slate-400 bg-white"}`}><option value="" disabled>Select an answer</option>{q.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>)}</div><button onClick={submitDragDrop} disabled={isSubmitting || !dragReady} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Matching Response</button></div>;
  }
  if (currentQuestion.type === "SHORT_RESPONSE") {
    const q = currentQuestion as ShortResponseQuestion;
    return <div><div className="mb-3 text-sm font-bold uppercase text-slate-600">Justify Your Thinking</div><Prompt>{q.prompt}</Prompt><p className="mt-3 text-sm leading-6 text-slate-700">Use clues from the text and explain what you can infer. Include evidence.</p><textarea value={shortResponse} onChange={(event) => setShortResponse(event.target.value)} className="mt-5 h-44 w-full rounded border-2 border-slate-400 p-4 leading-7" placeholder="Write your inference and support it with text evidence." /><button onClick={submitShortResponse} disabled={isSubmitting || shortResponse.trim().length < 8} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit Short Response</button></div>;
  }
  const q = currentQuestion as TdaQuestion;
  return <div><div className="mb-3 text-sm font-bold uppercase text-slate-600">Text-Dependent Analysis</div><Prompt>{q.prompt}</Prompt><p className="mt-3 text-sm leading-6 text-slate-700">{q.rubric}</p><textarea value={essayResponse} onChange={(event) => setEssayResponse(event.target.value)} className="mt-5 h-72 w-full rounded border-2 border-slate-400 p-4 leading-7" placeholder="Type your essay response here. Use evidence from the passage and explain your thinking." /><button onClick={submitTda} disabled={isSubmitting || essayResponse.trim().length < 10} className="mt-5 rounded border-2 border-[#0b2a5b] bg-[#0b2a5b] px-5 py-2 font-bold text-white disabled:border-slate-300 disabled:bg-slate-300">Submit TDA Essay</button></div>;
}

function PassageDisplay({
  question,
  highlighterActive,
  highlightScope,
  highlightedChunks,
  onToggleHighlight,
}: {
  question: Question;
  highlighterActive: boolean;
  highlightScope: "word" | "sentence";
  highlightedChunks: Record<string, boolean>;
  onToggleHighlight: (key: string) => void;
}) {
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
        const content = highlighterActive
          ? <HighlightableParagraph text={part} baseKey={key} scope={highlightScope} highlightedChunks={highlightedChunks} onToggleHighlight={onToggleHighlight} />
          : <p className={`whitespace-pre-wrap rounded px-1 ${highlighted ? "bg-yellow-200" : ""}`}>{part}</p>;
        if (part.startsWith("Text 1:") || part.startsWith("Text 2:")) return <div key={index} className="border-t-2 border-slate-300 pt-4">{content}</div>;
        return <div key={index}>{content}</div>;
      })}
      {question.tableData ? <div className="overflow-x-auto border-2 border-[#0b2a5b] bg-white"><table className="min-w-full text-left text-sm"><caption className="p-3 text-left text-base font-bold">{question.tableData.title}</caption><thead className="bg-slate-100"><tr>{question.tableData.columns.map((column) => <th key={column} className="border-t border-slate-300 p-3 font-bold">{column}</th>)}</tr></thead><tbody>{question.tableData.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-t border-slate-300 p-3">{cell}</td>)}</tr>)}</tbody></table></div> : null}
    </div>
  );
}

function HighlightableParagraph({
  text,
  baseKey,
  scope,
  highlightedChunks,
  onToggleHighlight,
}: {
  text: string;
  baseKey: string;
  scope: "word" | "sentence";
  highlightedChunks: Record<string, boolean>;
  onToggleHighlight: (key: string) => void;
}) {
  const sentences = splitIntoSentences(text);
  return (
    <p className="whitespace-pre-wrap rounded px-1">
      {sentences.map((sentence, sentenceIndex) => {
        const sentenceKey = `${baseKey}-sentence-${sentenceIndex}`;
        const sentenceHighlighted = Boolean(highlightedChunks[sentenceKey]);
        if (scope === "sentence") {
          return (
            <button
              key={sentenceKey}
              type="button"
              onClick={() => onToggleHighlight(sentenceKey)}
              className={`mx-0.5 rounded px-0.5 text-left leading-8 ${sentenceHighlighted ? "bg-yellow-300 outline outline-1 outline-yellow-500" : "hover:bg-yellow-100"}`}
            >
              {sentence}
            </button>
          );
        }

        return (
          <span key={sentenceKey} className={sentenceHighlighted ? "rounded bg-yellow-300" : ""}>
            {splitIntoWords(sentence).map((word, wordIndex) => {
              const wordKey = `${sentenceKey}-word-${wordIndex}`;
              const wordHighlighted = Boolean(highlightedChunks[wordKey]);
              if (!word.trim()) return <span key={wordKey}>{word}</span>;
              return (
                <button
                  key={wordKey}
                  type="button"
                  onClick={() => onToggleHighlight(wordKey)}
                  className={`rounded px-0.5 text-left leading-8 ${wordHighlighted ? "bg-yellow-300 outline outline-1 outline-yellow-500" : "hover:bg-yellow-100"}`}
                >
                  {word}
                </button>
              );
            })}
          </span>
        );
      })}
    </p>
  );
}

function splitIntoSentences(text: string) {
  return text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
}

function splitIntoWords(text: string) {
  return text.split(/(\s+)/);
}

function MaskingLayer({
  masks,
  onChange,
  onRemove,
}: {
  masks: MaskBox[];
  onChange: (masks: MaskBox[]) => void;
  onRemove: (id: number) => void;
}) {
  function updateMask(id: number, patch: Partial<MaskBox>) {
    onChange(masks.map((mask) => mask.id === id ? { ...mask, ...patch } : mask));
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {masks.map((mask, index) => (
        <DraggableMaskBox key={mask.id} label={`Masking ${index + 1}`} mask={mask} onChange={(patch) => updateMask(mask.id, patch)} onRemove={() => onRemove(mask.id)} />
      ))}
    </div>
  );
}

function DraggableMaskBox({
  label,
  mask,
  onChange,
  onRemove,
}: {
  label: string;
  mask: MaskBox;
  onChange: (patch: Partial<MaskBox>) => void;
  onRemove: () => void;
}) {
  const [dragStart, setDragStart] = useState<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ pointerX: number; pointerY: number; width: number; height: number } | null>(null);

  function onDragMove(event: any) {
    if (!dragStart) return;
    onChange({
      x: Math.max(0, dragStart.x + event.clientX - dragStart.pointerX),
      y: Math.max(104, dragStart.y + event.clientY - dragStart.pointerY),
    });
  }

  function onResizeMove(event: any) {
    if (!resizeStart) return;
    onChange({
      width: Math.max(140, resizeStart.width + event.clientX - resizeStart.pointerX),
      height: Math.max(72, resizeStart.height + event.clientY - resizeStart.pointerY),
    });
  }

  return (
    <div
      className="pointer-events-auto absolute overflow-hidden border-2 border-slate-950 bg-black shadow-2xl"
      style={{ left: mask.x, top: mask.y, width: mask.width, height: mask.height }}
      onPointerMove={(event) => {
        onDragMove(event);
        onResizeMove(event);
      }}
      onPointerUp={() => {
        setDragStart(null);
        setResizeStart(null);
      }}
      onPointerCancel={() => {
        setDragStart(null);
        setResizeStart(null);
      }}
    >
      <div
        className="flex h-8 cursor-move items-center justify-between bg-slate-400 px-2 text-sm font-semibold text-slate-800"
        onPointerDown={(event) => {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          setDragStart({ pointerX: event.clientX, pointerY: event.clientY, x: mask.x, y: mask.y });
        }}
      >
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">&lt;&gt;</span>
          <button type="button" onClick={onRemove} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-white">x</button>
        </div>
      </div>
      <div className="h-[calc(100%-2rem)] bg-black" />
      <button
        type="button"
        aria-label="Resize mask"
        className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize border-b-4 border-r-4 border-white/90"
        onPointerDown={(event) => {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          setResizeStart({ pointerX: event.clientX, pointerY: event.clientY, width: mask.width, height: mask.height });
        }}
      />
    </div>
  );
}

function ChoiceList({ choices, onChoose, disabled, selectedIndex, selectedIndices = [] }: { choices: string[]; onChoose: (index: number) => void; disabled?: boolean; selectedIndex?: number | null; selectedIndices?: number[] }) {
  return <div className="mt-6 space-y-5">{choices.map((choice, index) => {
    const selected = selectedIndex === index || selectedIndices.includes(index);
    return (
      <button key={index} onClick={() => onChoose(index)} disabled={disabled} className={`flex w-full items-start gap-3 rounded border-2 p-3 text-left text-lg leading-6 disabled:opacity-60 ${selected ? "border-[#0b2a5b] bg-blue-50" : "border-transparent hover:border-[#0b2a5b] hover:bg-blue-50"}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold ${selected ? "border-[#0b2a5b] bg-[#0b2a5b] text-white" : "border-slate-950 bg-white text-slate-950"}`}>{String.fromCharCode(97 + index)}</span>
        <span>{choice}</span>
      </button>
    );
  })}</div>;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold leading-7 text-slate-950">{children}</h3>;
}

function ConventionsStimulus({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return (
    <div className="mb-6 mt-5 rounded-sm border-2 border-[#0b2a5b] bg-slate-50 p-4 text-base leading-8 text-slate-950 md:text-lg">
      {paragraphs.map((paragraph, index) => <p key={index} className={index ? "mt-3" : ""}>{paragraph}</p>)}
    </div>
  );
}

function getConventionsStimulus(question: McqQuestion) {
  const genericPassage = "choose the answer that follows the conventions of standard english.";
  const normalizedPassage = normalizeConventionsText(question.passage || "");
  if (normalizedPassage && normalizedPassage !== genericPassage) {
    return question.passage.trim();
  }

  const normalizedPrompt = normalizeConventionsText(question.question);
  if (normalizedPrompt.includes("which revision would most improve the paragraph")) {
    return "The school garden gives students a useful way to learn science outside the classroom. Students measure plant growth each week and compare the results in their notebooks. They also observe how sunlight and water affect different vegetables. The garden has tomatoes, peppers, and beans.";
  }
  if (normalizedPrompt.includes("which revision provides the most specific information")) {
    return "The students did some things with the garden.";
  }
  if (normalizedPrompt.includes("inappropriate shift in pronoun person")) {
    return "When students revise, they should check whether their evidence supports the claim. A writer should reread the draft because you may notice missing details. The class discussed its ideas before writing. Readers can follow an essay when its organization is clear.";
  }
  if (normalizedPrompt.includes("which sentence has a vague pronoun")) {
    return "Maya gave Lena the notes after she finished the summary. Maya finished the summary before lunch. Lena read the notes carefully. The summary included evidence from the passage.";
  }
  if (normalizedPrompt.includes("inappropriate shift in verb tense")) {
    return "Watching her brother play with clay, Nadine realized that she missed being creative. She decided to start activities that required imagination. She begins by keeping a journal filled with story ideas and sketches. She also volunteered to help construct a model for the school play.";
  }
  if (normalizedPrompt.includes("maintaining the style of the paragraph")) {
    return "The team's presentation explained how the river cleanup would protect wildlife and improve the park. Members shared data from water samples, photographs of the shoreline, and a schedule for volunteers. The committee reviewed the plan carefully before deciding what to do next.";
  }
  return "";
}

function normalizeConventionsText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function PssaPracticeHint({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm italic leading-5 text-slate-950">(Practice Hint: {children})</p>;
}

function PssaToolFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-6 overflow-hidden rounded border-2 border-slate-400 bg-white ${className}`}>
      <div className="flex h-9 items-center justify-between bg-slate-400 px-2 text-[#0b2a5b]">
        <div className="flex items-center gap-2 font-black">
          <span aria-hidden>U</span>
          <span aria-hidden>&lt;</span>
          <span aria-hidden>&gt;</span>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b2a5b] text-sm font-black text-white">?</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
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
