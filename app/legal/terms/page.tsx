import { readLegalMarkdown, renderMarkdownLite } from "@/lib/legalContent";

export default async function TermsPage() {
  const blocks = renderMarkdownLite(await readLegalMarkdown("terms"));
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <article className="prose prose-slate max-w-none">
        {blocks.map((block, index) => {
          if (block.type === "h1") return <h1 key={index} className="text-3xl font-black text-slate-950">{block.text}</h1>;
          if (block.type === "h2") return <h2 key={index} className="mt-8 text-xl font-black text-slate-900">{block.text}</h2>;
          return <p key={index} className="mt-4 leading-7 text-slate-700">{block.text}</p>;
        })}
      </article>
    </main>
  );
}
