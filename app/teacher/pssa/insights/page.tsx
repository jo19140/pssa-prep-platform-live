import { Suspense } from "react";
import { TeacherPssaInsightsClient } from "@/components/pssa/TeacherPssaInsightsClient";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";

export default function TeacherPssaInsightsPage() {
  return (
    <SynesisPageShell roles={["TEACHER"]}>
      <Suspense fallback={<main className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-600">Loading diagnostic insights...</main>}>
        <TeacherPssaInsightsClient />
      </Suspense>
    </SynesisPageShell>
  );
}
