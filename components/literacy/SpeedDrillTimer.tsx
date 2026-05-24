"use client";

import { useEffect, useState } from "react";

export function SpeedDrillTimer({ seconds = 60, running }: { seconds?: number; running: boolean }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (!running) return;
    setRemaining(seconds);
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);
  return <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-950 text-2xl font-black text-white">{remaining}</div>;
}
