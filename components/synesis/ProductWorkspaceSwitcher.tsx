"use client";

import Link from "next/link";
import React from "react";
import type { Product, ProductId } from "@/lib/entitlements";

export type WorkspaceHrefs = Partial<Record<ProductId, string>>;

export function ProductWorkspaceSwitcher({
  products,
  activeProduct,
  workspaceHrefs,
  ariaLabel = "Product workspaces",
}: {
  products: Product[];
  activeProduct: ProductId;
  workspaceHrefs: WorkspaceHrefs;
  ariaLabel?: string;
}) {
  const navigableProducts = products.filter((product) => isNavigableProduct(product, workspaceHrefs));

  if (navigableProducts.length === 0) return null;
  if (navigableProducts.length === 1) {
    const onlyProduct = navigableProducts[0];
    if (onlyProduct.id === activeProduct) return null;
    return (
      <Link
        href={workspaceHrefFor(onlyProduct.id, workspaceHrefs)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Go to {onlyProduct.label}
      </Link>
    );
  }

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {products.map((product) => {
        if (!isNavigableProduct(product, workspaceHrefs)) {
          return (
            <span
              key={product.id}
              aria-disabled="true"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-400"
            >
              {productLabel(product)} · Coming soon
            </span>
          );
        }

        const active = product.id === activeProduct;
        return (
          <Link
            key={product.id}
            href={workspaceHrefFor(product.id, workspaceHrefs)}
            aria-current={active ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {productLabel(product)}
          </Link>
        );
      })}
    </nav>
  );
}

function isNavigableProduct(product: Product, workspaceHrefs: WorkspaceHrefs): boolean {
  return product.status === "live" && Boolean(workspaceHrefs[product.id]);
}

function workspaceHrefFor(productId: ProductId, workspaceHrefs: WorkspaceHrefs): string {
  return workspaceHrefs[productId] || "/";
}

function productLabel(product: Product): string {
  return product.mascot ? `${product.label} with ${product.mascot}` : product.label;
}
