"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { correctMappingRecord } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

const SOURCE_DROP_ID = "__source__";

export function DragDropTableItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => initialResponse?.rawResponse?.mapping || {});
  const [selectedItem, setSelectedItem] = useState("");
  const [isTouch, setIsTouch] = useState(false);
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);
  const expected = correctMappingRecord(item.correctMapping);
  const placedCount = Object.keys(mapping).filter((key) => mapping[key]).length;
  const ready = placedCount === (item.draggableItems || []).length;

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && "ontouchstart" in window);
  }, []);

  useEffect(() => {
    setResponse(initialResponse || null);
    setMapping(initialResponse?.rawResponse?.mapping || {});
  }, [initialResponse]);

  function place(draggable: string, column: string) {
    if (locked) return;
    setMapping((previous) => {
      if (column === SOURCE_DROP_ID) {
        const next = { ...previous };
        delete next[draggable];
        return next;
      }
      return { ...previous, [draggable]: column };
    });
    setSelectedItem("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const draggable = String(event.active.id);
    const column = event.over?.id ? String(event.over.id) : "";
    if (draggable && column) place(draggable, column);
  }

  function submit() {
    if (!ready || locked) return;
    setResponse(submitResponse(item, itemId, { mapping }, onSubmit));
  }

  const unassigned = (item.draggableItems || []).filter((draggable: string) => !mapping[draggable]);

  return (
    <ItemShell item={item}>
      {isTouch ? (
        <TapTable item={item} mapping={mapping} selectedItem={selectedItem} setSelectedItem={setSelectedItem} place={place} locked={locked} response={response} expected={expected} />
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <SourceColumn items={unassigned} locked={locked} />
            <div className="grid gap-3 md:grid-cols-2">
              {(item.columns || []).map((column: string) => (
                <DropColumn key={column} id={column} title={column} items={(item.draggableItems || []).filter((draggable: string) => mapping[draggable] === column)} locked={locked} response={response} expected={expected} mapping={mapping} />
              ))}
            </div>
          </div>
        </DndContext>
      )}
      <SubmitButton disabled={!ready || disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}

function SourceColumn({ items, locked }: { items: string[]; locked: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: SOURCE_DROP_ID, disabled: locked });
  return (
    <div ref={setNodeRef} className={`rounded-2xl p-4 ring-1 ${isOver ? "bg-cyan-50 ring-cyan-300" : "bg-slate-50 ring-slate-200"}`} aria-label="Drop target Drag these">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Drag these</p>
      <div className="mt-3 grid min-h-20 gap-2">
        {items.map((draggable: string) => <DraggableChip key={draggable} id={draggable} disabled={locked} />)}
        {!items.length ? <p className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500">Drop here to remove an item from a column.</p> : null}
      </div>
    </div>
  );
}

function DraggableChip({ id, disabled, className = "", children }: { id: string; disabled?: boolean; className?: string; children?: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, disabled });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={`rounded-xl bg-white px-3 py-2 text-left text-sm font-black text-slate-800 shadow-sm ring-1 ring-slate-200 ${className}`}
      aria-label={`Drag ${id}`}
      {...listeners}
      {...attributes}
    >
      {children || id}
    </button>
  );
}

function DropColumn({ id, title, items, locked, response, expected, mapping }: { id: string; title: string; items: string[]; locked: boolean; response: StudentResponse | null; expected: Record<string, string>; mapping: Record<string, string> }) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: locked });
  return (
    <div ref={setNodeRef} className={`min-h-40 rounded-2xl border-2 border-dashed p-4 ${isOver ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-white"}`} aria-label={`Drop target ${title}`}>
      <p className="text-sm font-black text-slate-950">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((draggable) => {
          const wrong = Boolean(response) && expected[draggable] && mapping[draggable] !== expected[draggable];
          const correct = Boolean(response) && expected[draggable] === mapping[draggable];
          return (
            <DraggableChip key={draggable} id={draggable} disabled={locked} className={`${correct ? "!bg-emerald-100 !text-emerald-950" : wrong ? "!bg-rose-100 !text-rose-950" : "!bg-slate-100 !text-slate-800"}`}>
              {correct ? "✓ " : wrong ? "✗ " : ""}{draggable}
            </DraggableChip>
          );
        })}
      </div>
    </div>
  );
}

function TapTable({ item, mapping, selectedItem, setSelectedItem, place, locked, response, expected }: { item: any; mapping: Record<string, string>; selectedItem: string; setSelectedItem: (value: string) => void; place: (item: string, column: string) => void; locked: boolean; response: StudentResponse | null; expected: Record<string, string> }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Tap an item, then tap a column</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(item.draggableItems || []).map((draggable: string) => (
            <button key={draggable} type="button" disabled={locked} onClick={() => setSelectedItem(draggable)} className={`rounded-xl px-3 py-2 text-sm font-black ${selectedItem === draggable ? "bg-slate-950 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"}`}>
              {draggable}{mapping[draggable] ? ` → ${mapping[draggable]}` : ""}
            </button>
          ))}
        </div>
        {selectedItem && mapping[selectedItem] ? (
          <button type="button" disabled={locked} onClick={() => place(selectedItem, SOURCE_DROP_ID)} className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
            Move selected item back to source
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {(item.columns || []).map((column: string) => (
          <button key={column} type="button" disabled={locked || !selectedItem} onClick={() => place(selectedItem, column)} className="min-h-32 rounded-2xl border border-slate-200 bg-white p-4 text-left disabled:opacity-60">
            <p className="text-sm font-black text-slate-950">{column}</p>
            <div className="mt-3 grid gap-2">
              {(item.draggableItems || []).filter((draggable: string) => mapping[draggable] === column).map((draggable: string) => {
                const correct = Boolean(response) && expected[draggable] === mapping[draggable];
                const wrong = Boolean(response) && expected[draggable] !== mapping[draggable];
                return <span key={draggable} className={`rounded-xl px-3 py-2 text-sm font-bold ${correct ? "bg-emerald-100" : wrong ? "bg-rose-100" : "bg-slate-100"}`}>{correct ? "✓ " : wrong ? "✗ " : ""}{draggable}</span>;
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
