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
  initialResponse = null,
}: {
  item: any;
  index?: number;
  onSubmit: (response: StudentResponse) => void;
  disabled?: boolean;
  initialResponse?: StudentResponse | null;
}) {
  const itemId = itemKey(item, index);
  const props = { item, itemId, onSubmit, disabled, initialResponse };
  if (item?.type === "mc" || !item?.type) return <MultipleChoiceItem {...props} />;
  if (item.type === "inline-dropdown") return <InlineDropdownItem {...props} />;
  if (item.type === "hot-text-word") return <HotTextWordItem {...props} />;
  if (item.type === "hot-text-phrase") return <HotTextPhraseItem {...props} />;
  if (item.type === "hot-text-sentence") return <HotTextSentenceItem {...props} />;
  if (item.type === "drag-drop-table") return <DragDropTableItem {...props} />;
  if (item.type === "drag-drop-order") return <DragDropOrderItem {...props} />;
  if (item.type === "evidence-mapping") return <EvidenceMappingItem {...props} />;
  if (item.type === "multi-select") return <MultiSelectItem {...props} />;
  if (item.type === "two-part-ebsr") return <TwoPartEBSRItem {...props} />;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
      This practice item type is not available yet: {String(item.type)}
    </div>
  );
}
