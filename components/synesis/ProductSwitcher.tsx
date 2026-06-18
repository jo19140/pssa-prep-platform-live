"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ActiveProduct, Product } from "@/lib/entitlements";

export function ProductSwitcher({
  products,
  activeProduct,
}: {
  products: Product[];
  activeProduct?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (products.length <= 1) return null;

  const normalizedActiveProduct = normalizeActiveProduct(activeProduct);
  const tabs: Array<{ id: ActiveProduct; label: string }> = [
    { id: "all", label: "Overview" },
    ...products.map((product) => ({ id: product.id, label: product.label })),
  ];

  return (
    <nav aria-label="Product navigation" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = normalizedActiveProduct === tab.id;
        return (
          <Link
            key={tab.id}
            href={hrefForProduct(pathname, searchParams, tab.id)}
            aria-current={active ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function normalizeActiveProduct(activeProduct?: string | null): ActiveProduct {
  return activeProduct === "state_track" || activeProduct === "reading_buddy" ? activeProduct : "all";
}

function hrefForProduct(pathname: string, searchParams: URLSearchParams, product: ActiveProduct): string {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set("product", product);
  const queryString = nextSearchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
