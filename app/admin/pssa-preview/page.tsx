import { redirect } from "next/navigation";
import { InlineDropdownItem } from "@/components/pssa/InlineDropdownItem";
import { MatchingGridItem } from "@/components/pssa/MatchingGridItem";
import { projectPssaStudentItem } from "@/lib/content/pssaStudentDto";
import { requireUser } from "@/lib/authz";
import mgddBackend from "@/exemplars/pssa_grade3_matching_grid_drag_drop/grade3_matching_grid_drag_drop_backend.json";
import conventionsBackend from "@/exemplars/pssa_grade3_conventions/grade3_conventions_backend.json";
import teiBackend from "@/exemplars/pssa_grade3_tei/grade3_tei_backend.json";
import ebsrBackend from "@/exemplars/pssa_grade3_ebsr/grade3_ebsr_backend.json";
import shortAnswerBackend from "@/exemplars/pssa_grade3_short_answer/grade3_short_answer_backend.json";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminPssaPreviewPage() {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) redirect("/dashboard");

  const matchingGrid = projectPssaStudentItem((mgddBackend as any).matchingGridItems[0]);
  const inlineDropdown = projectPssaStudentItem((conventionsBackend as any).items.find((item: any) => item.interactionType === "INLINE_DROPDOWN"));
  const projectedExamples = [
    projectPssaStudentItem((ebsrBackend as any).items[0]),
    projectPssaStudentItem((teiBackend as any).multiSelectItems[0]),
    projectPssaStudentItem((teiBackend as any).hotTextItems[0]),
    projectPssaStudentItem((mgddBackend as any).dragDropItems[0]),
    projectPssaStudentItem((conventionsBackend as any).items.find((item: any) => item.interactionType === "HOT_TEXT")),
    projectPssaStudentItem((shortAnswerBackend as any).items[0]),
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Admin-only fixture preview</p>
          <h1 className="mt-1 text-2xl font-black">PSSA TEI Renderer Preview</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Static Grade 3 fixture data projected through the PR B student-safe DTO. This page does not create sessions, read assignments, evaluate responses, or route students.
          </p>
        </header>

        <section className="border border-slate-200 bg-white p-5">
          <MatchingGridItem item={matchingGrid as any} />
          <details className="mt-6 border-t border-dashed border-slate-300 pt-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Projected MATCHING_GRID DTO</summary>
            <pre className="mt-3 overflow-x-auto bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{JSON.stringify(matchingGrid, null, 2)}</pre>
          </details>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <InlineDropdownItem item={inlineDropdown as any} />
          <details className="mt-6 border-t border-dashed border-slate-300 pt-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Projected INLINE_DROPDOWN DTO</summary>
            <pre className="mt-3 overflow-x-auto bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{JSON.stringify(inlineDropdown, null, 2)}</pre>
          </details>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black">Other Projected Types</h2>
          <p className="mt-1 text-sm text-slate-600">Key-free DTO examples for existing surfaces. Renderer integration into the student shell is intentionally out of scope.</p>
          <pre className="mt-4 max-h-[36rem] overflow-auto bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{JSON.stringify(projectedExamples, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
