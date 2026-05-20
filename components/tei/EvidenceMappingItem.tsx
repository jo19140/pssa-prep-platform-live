"use client";

import { useEffect, useState } from "react";
import { evidenceMappingRecord, normalizeText } from "@/lib/teiScoring";
import { FeedbackPanel, ItemShell, SubmitButton, submitResponse, type TEIItemComponentProps } from "./types";
import type { StudentResponse } from "@/lib/teiScoring";

export function EvidenceMappingItem({ item, itemId, disabled, initialResponse, onSubmit }: TEIItemComponentProps) {
  const [mapping, setMapping] = useState<Record<string, string[]>>(() => initialResponse?.rawResponse?.mapping || {});
  const [response, setResponse] = useState<StudentResponse | null>(initialResponse || null);
  const locked = disabled || Boolean(response);
  const expected = evidenceMappingRecord(item.correctMapping);

  useEffect(() => {
    setResponse(initialResponse || null);
    setMapping(initialResponse?.rawResponse?.mapping || {});
  }, [initialResponse]);

  function toggle(claim: string, evidence: string) {
    if (locked) return;
    setMapping((previous) => {
      const selected = previous[claim] || [];
      const nextSelected = selected.includes(evidence) ? selected.filter((value) => value !== evidence) : [...selected, evidence];
      return { ...previous, [claim]: nextSelected };
    });
  }

  function submit() {
    if (locked) return;
    setResponse(submitResponse(item, itemId, { mapping }, onSubmit));
  }

  return (
    <ItemShell item={item}>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-black text-slate-700">Claim</th>
              {(item.evidenceItems || []).map((evidence: string, index: number) => <th key={evidence} className="min-w-40 px-3 py-3 text-left font-black text-slate-700">Evidence {index + 1}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {(item.claims || []).map((claim: string) => (
              <tr key={claim}>
                <td className="px-3 py-3 align-top font-bold text-slate-900">{claim}</td>
                {(item.evidenceItems || []).map((evidence: string) => {
                  const checked = (mapping[claim] || []).includes(evidence);
                  const shouldBeChecked = (expected[claim] || []).some((value) => normalizeText(value) === normalizeText(evidence));
                  const correct = Boolean(response) && checked && shouldBeChecked;
                  const wrong = Boolean(response) && checked && !shouldBeChecked;
                  return (
                    <td key={`${claim}-${evidence}`} className={`px-3 py-3 align-top ${correct ? "bg-emerald-50" : wrong ? "bg-rose-50" : ""}`}>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1" checked={checked} disabled={locked} onChange={() => toggle(claim, evidence)} />
                        <span className="text-slate-700">{correct ? "✓ " : wrong ? "✗ " : ""}{evidence}</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SubmitButton disabled={disabled} submitted={Boolean(response)} onClick={submit} />
      <FeedbackPanel response={response} />
    </ItemShell>
  );
}
