"use client";

import Link from "next/link";
import React from "react";
import type { Product, ProductId } from "@/lib/entitlements";

export type TeacherWorkspaceProduct = Extract<ProductId, "state_track" | "reading_buddy">;

const WORKSPACE_HREFS: Record<TeacherWorkspaceProduct, string> = {
  state_track: "/teacher",
  reading_buddy: "/teacher/literacy",
};

export function TeacherProductWorkspaceSwitcher({
  products,
  activeProduct,
}: {
  products: Product[];
  activeProduct: TeacherWorkspaceProduct;
}) {
  const liveWorkspaceProducts = products.filter(isLiveWorkspaceProduct);

  if (liveWorkspaceProducts.length === 0) return null;
  if (liveWorkspaceProducts.length === 1) {
    const onlyProduct = liveWorkspaceProducts[0];
    if (onlyProduct.id === activeProduct) return null;
    return (
      <Link
        href={workspaceHrefFor(onlyProduct.id)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Go to {onlyProduct.label}
      </Link>
    );
  }

  return (
    <nav aria-label="Teacher product workspaces" className="flex flex-wrap gap-2">
      {products.map((product) => {
        if (product.status !== "live" || !isWorkspaceProduct(product.id)) {
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
            href={workspaceHrefFor(product.id)}
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

export function workspaceHrefFor(productId: TeacherWorkspaceProduct): string {
  return WORKSPACE_HREFS[productId];
}

function isLiveWorkspaceProduct(product: Product): product is Product & { id: TeacherWorkspaceProduct; status: "live" } {
  return product.status === "live" && isWorkspaceProduct(product.id);
}

function isWorkspaceProduct(productId: ProductId): productId is TeacherWorkspaceProduct {
  return productId === "state_track" || productId === "reading_buddy";
}

function productLabel(product: Product): string {
  return product.mascot ? `${product.label} with ${product.mascot}` : product.label;
}
