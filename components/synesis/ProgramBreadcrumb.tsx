export function ProgramBreadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
      {["Sý Learning", ...items].map((item, index, all) => (
        <span key={`${item}-${index}`}>
          <span className={index === all.length - 1 ? "font-semibold text-slate-800" : ""}>{item}</span>
          {index < all.length - 1 ? <span className="px-2">›</span> : null}
        </span>
      ))}
    </nav>
  );
}
