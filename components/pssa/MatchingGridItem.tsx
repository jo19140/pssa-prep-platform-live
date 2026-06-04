"use client";

import { useMemo, useState } from "react";
import type { PssaStudentItemDto } from "@/lib/content/pssaStudentDto";

export type MatchingGridDto = PssaStudentItemDto<"MATCHING_GRID">;
export type MatchingGridResponsePayload = { rowSelections: Record<string, string> };
export type MatchingGridChange = { response: MatchingGridResponsePayload; isComplete: boolean };

type Props = {
  item: MatchingGridDto;
  onChange?: (change: MatchingGridChange) => void;
};

export function isMatchingGridComplete(item: MatchingGridDto, rowSelections: Record<string, string>) {
  return item.responseSpec.rows.every((row) => Boolean(rowSelections[row.rowId]));
}

export function buildMatchingGridResponse(rowSelections: Record<string, string>): MatchingGridResponsePayload {
  return { rowSelections: { ...rowSelections } };
}

export function MatchingGridItem({ item, onChange }: Props) {
  const { responseSpec } = item;
  const [rowSelections, setRowSelections] = useState<Record<string, string>>({});
  const answeredCount = useMemo(() => responseSpec.rows.filter((row) => Boolean(rowSelections[row.rowId])).length, [responseSpec.rows, rowSelections]);
  const isComplete = answeredCount === responseSpec.rows.length;

  function emit(next: Record<string, string>) {
    onChange?.({ response: buildMatchingGridResponse(next), isComplete: isMatchingGridComplete(item, next) });
  }

  function selectCell(rowId: string, columnId: string) {
    const next = { ...rowSelections, [rowId]: columnId };
    setRowSelections(next);
    emit(next);
  }

  function clearRow(rowId: string) {
    const next = { ...rowSelections };
    delete next[rowId];
    setRowSelections(next);
    emit(next);
  }

  function focusCell(rowId: string, columnIndex: number) {
    const target = document.querySelector<HTMLButtonElement>(`[data-pssa-mg-row="${rowId}"][data-pssa-mg-col-index="${columnIndex}"]`);
    target?.focus();
  }

  function onCellKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, rowId: string, columnIndex: number, columnId: string) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(rowId, Math.min(columnIndex + 1, responseSpec.columns.length - 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(rowId, Math.max(columnIndex - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusCell(rowId, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusCell(rowId, responseSpec.columns.length - 1);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      selectCell(rowId, columnId);
    }
  }

  return (
    <section className="space-y-4" aria-label="Matching grid item">
      <div>
        <div className="text-xs font-bold uppercase text-emerald-700">Matching Grid</div>
        <h2 className="mt-1 text-lg font-extrabold leading-snug text-slate-950">{responseSpec.stem}</h2>
        {responseSpec.instructionText ? <p className="mt-2 inline-block border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-900">{responseSpec.instructionText}</p> : null}
      </div>
      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table role="grid" aria-label={responseSpec.stem || "Matching grid"} className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-[42%] border border-slate-200 bg-slate-50 p-3 text-left font-bold text-slate-700">Detail</th>
              {responseSpec.columns.map((column) => (
                <th key={column.columnId} scope="col" className="border border-slate-200 bg-slate-50 p-3 text-center font-bold text-slate-700">{column.label}</th>
              ))}
              <th scope="col" className="w-24 border border-slate-200 bg-slate-50 p-3 text-center font-bold text-slate-700">Clear</th>
            </tr>
          </thead>
          <tbody>
            {responseSpec.rows.map((row) => (
              <tr key={row.rowId}>
                <th scope="row" className="border border-slate-200 p-3 text-left align-middle font-semibold text-slate-950">{row.label}</th>
                {responseSpec.columns.map((column, columnIndex) => {
                  const selected = rowSelections[row.rowId] === column.columnId;
                  return (
                    <td key={column.columnId} className="border border-slate-200 p-2 text-center">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${row.label}: ${column.label}`}
                        data-pssa-mg-row={row.rowId}
                        data-pssa-mg-col-index={columnIndex}
                        onClick={() => selectCell(row.rowId, column.columnId)}
                        onKeyDown={(event) => onCellKeyDown(event, row.rowId, columnIndex, column.columnId)}
                        className={`mx-auto flex h-9 w-9 items-center justify-center border-2 text-sm font-black ${selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-transparent hover:bg-slate-50"}`}
                      >
                        <span className={`block h-3 w-3 rounded-full ${selected ? "bg-white" : "bg-transparent"}`} />
                      </button>
                    </td>
                  );
                })}
                <td className="border border-slate-200 p-2 text-center">
                  <button type="button" onClick={() => clearRow(row.rowId)} className="border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm font-bold text-slate-700" aria-live="polite">
        {isComplete ? `All ${responseSpec.rows.length} rows answered` : `${answeredCount} of ${responseSpec.rows.length} rows answered`}
      </p>
    </section>
  );
}
