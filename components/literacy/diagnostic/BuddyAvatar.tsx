"use client";

import { BuddyCharacter, type BuddyState } from "@/components/literacy/BuddyCharacter";

export function BuddyAvatar({ state = "idle" }: { state?: BuddyState }) {
  return <BuddyCharacter state={state} name="Harper" />;
}

