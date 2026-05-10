"use client";

import { usePathname } from "next/navigation";

export function AppChromeHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/student/learning-path")) return null;

  return (
    <div className="flex justify-between bg-gray-100 p-4">
      <h1 className="font-bold">PSSA Platform</h1>
    </div>
  );
}
