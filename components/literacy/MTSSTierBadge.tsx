type MTSSTierBadgeProps = {
  tierDisplay: {
    tier: "1" | "2" | "3";
    variant: "CORE" | "SMALL_GROUP" | "WATCH_EVIDENCE" | "INTENSIVE";
    label: string;
    subLabel: string;
  };
};

const variantClasses = {
  CORE: "bg-[#EAF3DE] text-[#173404]",
  SMALL_GROUP: "bg-[#EAF3DE] text-[#173404]",
  WATCH_EVIDENCE: "bg-[#FAEEDA] text-[#412402]",
  INTENSIVE: "bg-[#FAECE7] text-[#4A1B0C]",
} as const;

export function MTSSTierBadge({ tierDisplay }: MTSSTierBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${variantClasses[tierDisplay.variant]}`}>
      {tierDisplay.label} · {tierDisplay.subLabel}
    </span>
  );
}
