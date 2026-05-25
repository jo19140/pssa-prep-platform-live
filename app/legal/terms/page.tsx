import { readLegalMarkdown, renderMarkdownLite } from "@/lib/legalContent";
import { SynesisAuthShell } from "@/components/synesis/SynesisAuthShell";

export default async function TermsPage() {
  const blocks = renderMarkdownLite(await readLegalMarkdown("terms"));
  return (
    <SynesisAuthShell maxWidth="max-w-3xl">
      <article className="rounded-3xl border border-synesis-border bg-white/95 p-6 shadow-xl shadow-indigo-100/50">
        {blocks.map((block, index) => {
          if (block.type === "h1") return <h1 key={index} className="text-3xl font-black text-slate-950">{block.text}</h1>;
          if (block.type === "h2") return <h2 key={index} className="mt-8 text-xl font-black text-slate-900">{block.text}</h2>;
          return <p key={index} className="mt-4 leading-7 text-slate-700">{block.text}</p>;
        })}
      </article>
    </SynesisAuthShell>
  );
}
