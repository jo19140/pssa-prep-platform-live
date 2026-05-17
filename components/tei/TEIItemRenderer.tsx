"use client";

import type { StudentResponse } from "@/lib/teiScoring";
import { itemKey } from "@/lib/teiScoring";
import { DragDropOrderItem } from "./DragDropOrderItem";
import { DragDropTableItem } from "./DragDropTableItem";
import { EvidenceMappingItem } from "./EvidenceMappingItem";
import { HotTextPhraseItem } from "./HotTextPhraseItem";
import { HotTextSentenceItem } from "./HotTextSentenceItem";
import { HotTextWordItem } from "./HotTextWordItem";
import { InlineDropdownItem } from "./InlineDropdownItem";
import { MultiSelectItem } from "./MultiSelectItem";
import { MultipleChoiceItem } from "./MultipleChoiceItem";
import { TwoPartEBSRItem } from "./TwoPartEBSRItem";

export function TEIItemRenderer({
  item,
  index = 0,
  onSubmit,
  disabled = false,
}: {
  item: any;
  index?: number;
  onSubmit: (response: StudentResponse) => void;
  disabled?: boolean;
}) {
  const itemId = itemKey(item, index);
  if (item?.type === "mc" || !item?.type) return <MultipleChoiceItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "inline-dropdown") return <InlineDropdownItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "hot-text-word") return <HotTextWordItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "hot-text-phrase") return <HotTextPhraseItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "hot-text-sentence") return <HotTextSentenceItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "drag-drop-table") return <DragDropTableItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "drag-drop-order") return <DragDropOrderItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "evidence-mapping") return <EvidenceMappingItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "multi-select") return <MultiSelectItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;
  if (item.type === "two-part-ebsr") return <TwoPartEBSRItem item={item} itemId={itemId} onSubmit={onSubmit} disabled={disabled} />;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
      This practice item type is not available yet: {String(item.type)}
    </div>
  );
}
