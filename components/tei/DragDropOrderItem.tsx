"use client";

import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function DragDropOrderItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [order, setOrder] = useState<string[]>(() => initialResponse?.rawResponse?.order || item.draggableItems || []);
  const [isTouch, setIsTouch] = useState(false);
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && "ontouchstart" in window);
  }, []);

  useEffect(() => {
    setResponse(initialResponse || null);
    setOrder(initialResponse?.rawResponse?.order || item.draggableItems || []);
  }, [initialResponse, item.draggableItems]);

  function handleDragEnd(event: DragEndEvent) {
    if (locked) return;
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId || activeId === overId) return;
    const oldIndex = order.indexOf(activeId);
    const newIndex = order.indexOf(overId);
    setOrder(arrayMove(order, oldIndex, newIndex));
  }

  function move(index: number, delta: number) {
    const nextIndex = Math.max(0, Math.min(order.length - 1, index + delta));
    if (nextIndex === index) return;
    setOrder((previous) => arrayMove(previous, index, nextIndex));
  }

  function submit() {
    if (locked) return;
    setResponse(submitResponse(item, itemId, { order }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      {isTouch ? (
        <div className="grid gap-2">
          {order.map((entry, index) => <OrderRow key={entry} entry={entry} index={index} locked={locked} response={response} correct={item.correctOrder?.[index]} move={move} />)}
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2">
              {order.map((entry, index) => <SortableOrderRow key={entry} entry={entry} index={index} locked={locked} response={response} correct={item.correctOrder?.[index]} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <SubmitButton disabled={disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}

function SortableOrderRow({ entry, index, locked, response, correct }: { entry: string; index: number; locked: boolean; response: StudentResponse | null; correct?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry, disabled: locked });
  const isCorrect = Boolean(response) && normalizeText(entry) === normalizeText(correct);
  const isWrong = Boolean(response) && !isCorrect;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-xl border px-4 py-3 text-sm font-black ${isCorrect ? "border-emerald-300 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`} {...attributes} {...listeners}>
      <span className="mr-2 text-slate-500">{index + 1}.</span>{isCorrect ? "✓ " : isWrong ? "✗ " : ""}{entry}
    </div>
  );
}

function OrderRow({ entry, index, locked, response, correct, move }: { entry: string; index: number; locked: boolean; response: StudentResponse | null; correct?: string; move: (index: number, delta: number) => void }) {
  const isCorrect = Boolean(response) && normalizeText(entry) === normalizeText(correct);
  const isWrong = Boolean(response) && !isCorrect;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-black ${isCorrect ? "border-emerald-300 bg-emerald-50" : isWrong ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
      <span><span className="mr-2 text-slate-500">{index + 1}.</span>{isCorrect ? "✓ " : isWrong ? "✗ " : ""}{entry}</span>
      <span className="flex gap-1">
        <button type="button" disabled={locked || index === 0} onClick={() => move(index, -1)} className="rounded-lg bg-slate-100 px-2 py-1 disabled:opacity-40" aria-label={`Move ${entry} up`}>Up</button>
        <button type="button" disabled={locked} onClick={() => move(index, 1)} className="rounded-lg bg-slate-100 px-2 py-1 disabled:opacity-40" aria-label={`Move ${entry} down`}>Down</button>
      </span>
    </div>
  );
}
